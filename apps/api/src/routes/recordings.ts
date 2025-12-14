/**
 * Recordings Routes
 * Audio/video file upload and transcription management
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, RecordingSource } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/storage';
import { TranscriptionService } from '../services/transcription';
import { QueueService } from '../services/queue';
import { SearchService } from '../services/search';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permission-check';
import { createModuleLogger } from '../lib/logger';

const router: Router = Router();
const prisma = new PrismaClient();
const logger = createModuleLogger('recordings-routes');

// Initialize Redis
const redis = new (require('ioredis'))({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '4002'),
  password: process.env.REDIS_PASSWORD,
});

// Initialize Elasticsearch
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
const elasticsearch = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:4003',
});

// Initialize services
const storageService = new StorageService();
const queueService = new QueueService(redis);
const searchService = new SearchService(elasticsearch);
const transcriptionService = new TranscriptionService(
  storageService,
  queueService,
  searchService
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = process.env.AUDIO_UPLOAD_DIR || '/tmp/audio-uploads';
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: parseInt(process.env.MAX_AUDIO_SIZE || '2147483648'), // 2GB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/x-m4a',
      'audio/m4a',
      'audio/webm',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/recordings/upload
 * Upload audio/video file and trigger transcription
 */
router.post(
  '/upload',
  requirePermission('meetings.create'),
  upload.single('file'),
  [
    body('title').optional().trim(),
    body('language').optional().isString().trim(),
    body('autoTranscribe').optional().isBoolean().toBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { title, language = 'en', autoTranscribe = true } = req.body;

      if (!req.file) {
        res.status(400).json({ error: 'No audio/video file provided' });
        return;
      }

      const file = req.file;
      const recordingId = uuidv4();
      const meetingId = uuidv4();

      logger.info('Audio upload started:', {
        userId,
        organizationId,
        fileName: file.originalname,
        fileSize: file.size,
      });

      // Upload to S3
      const s3Key = `recordings/${organizationId}/${recordingId}/${file.originalname}`;
      const fileBuffer = await fs.readFile(file.path);

      await storageService.uploadFile(s3Key, fileBuffer, {
        contentType: file.mimetype,
        metadata: {
          'uploaded-by': userId,
          'original-name': file.originalname,
        },
      });

      const fileUrl = await storageService.generateDownloadUrl(s3Key, 86400 * 7); // 7 days (S3 v4 max)

      // Create meeting record
      const meeting = await prisma.meeting.create({
        data: {
          id: meetingId,
          organizationId,
          userId,
          title: title || `Uploaded: ${file.originalname}`,
          status: 'completed',
          scheduledStartAt: new Date(),
          actualStartAt: new Date(),
          actualEndAt: new Date(),
          durationSeconds: 0, // Will be updated after transcription
          participantCount: 0,
        },
      });

      // Create recording record
      const recording = await prisma.meetingRecording.create({
        data: {
          id: recordingId,
          meetingId,
          s3Key,
          fileUrl,
          fileSizeBytes: BigInt(file.size),
          durationSeconds: 0, // Will be updated after processing
          transcriptionStatus: 'processing',
          isVideo: file.mimetype.startsWith('video/'),
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalPath: file.path,
            mimetype: file.mimetype,
            fileName: file.originalname,
          },
        },
      });

      // Clean up temp file
      await fs.unlink(file.path).catch((err) => logger.warn('Failed to delete temp file:', err));

      // Trigger transcription if enabled
      if (autoTranscribe) {
        logger.info('Starting transcription for recording', { recordingId });

        transcriptionService.startTranscription({
          recordingId: recording.id,
          meetingId: meeting.id,
          organizationId,
          audioUrl: s3Key, // Use S3 key, not presigned URL
          language: language || 'auto',
          enableDiarization: true,
          enablePunctuation: true,
          enableTimestamps: true,
        }).then(transcriptionId => {
          logger.info('Transcription started successfully:', {
            recordingId,
            transcriptionId,
          });
        }).catch((error) => {
          logger.error('Transcription failed:', error);
          // Update recording status to failed
          prisma.meetingRecording.update({
            where: { id: recordingId },
            data: { transcriptionStatus: 'failed' },
          }).catch(err => logger.error('Failed to update recording status:', err));
        });
      }

      logger.info('Audio uploaded successfully:', { recordingId, meetingId });

      res.status(201).json({
        success: true,
        recording: {
          id: recording.id,
          meetingId: meeting.id,
          fileName: (recording.metadata as any)?.fileName || file.originalname,
          fileUrl: recording.fileUrl,
          fileSizeBytes: recording.fileSizeBytes?.toString() || '0',
          status: recording.transcriptionStatus,
          createdAt: recording.createdAt,
        },
        meeting: {
          id: meeting.id,
          title: meeting.title,
        },
      });
    } catch (error) {
      logger.error('Audio upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload audio file',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/recordings
 * List recordings with pagination - includes both MeetingRecording AND Video tables
 * This unified query ensures all uploaded files are visible regardless of upload endpoint used
 */
router.get(
  '/',
  requirePermission('meetings.read'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['processing', 'completed', 'failed']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const {
        page = 1,
        limit = 20,
        status,
      } = req.query;

      // Query MeetingRecording table
      const recordingWhere: any = {
        meeting: {
          organizationId,
        },
      };
      if (status) recordingWhere.transcriptionStatus = status;

      // Query Video table (for uploads that went through /video/upload)
      const videoWhere: any = {
        organizationId,
      };
      if (status) {
        // Map status to VideoProcessingStatus enum
        const statusMap: Record<string, string> = {
          'processing': 'processing',
          'completed': 'completed',
          'failed': 'failed',
        };
        videoWhere.processingStatus = statusMap[status as string] || status;
      }

      // Fetch from both tables in parallel
      const [recordings, recordingsTotal, videos, videosTotal] = await Promise.all([
        prisma.meetingRecording.findMany({
          where: recordingWhere,
          include: {
            meeting: {
              select: {
                id: true,
                title: true,
                status: true,
                organizationId: true,
              },
            },
            transcripts: {
              select: {
                id: true,
                isFinal: true,
                wordCount: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.meetingRecording.count({ where: recordingWhere }),
        prisma.video.findMany({
          where: videoWhere,
          include: {
            meeting: {
              select: {
                id: true,
                title: true,
                status: true,
                organizationId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.video.count({ where: videoWhere }),
      ]);

      // Normalize Video records to match MeetingRecording format
      const normalizedVideos = videos
        .filter(v => !v.recordingId) // Exclude videos that are linked to recordings (avoid duplicates)
        .map(v => ({
          id: v.id,
          meetingId: v.meetingId,
          s3Key: v.s3Key,
          fileUrl: v.fileUrl,
          fileSizeBytes: v.fileSizeBytes.toString(),
          durationSeconds: v.durationSeconds || 0,
          transcriptionStatus: v.processingStatus === 'completed' ? 'completed' :
                               v.processingStatus === 'failed' ? 'failed' : 'processing',
          isVideo: true,
          quality: 'hd',
          codec: v.codec,
          metadata: v.metadata,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          meeting: v.meeting || {
            id: v.meetingId || v.id,
            title: v.fileName || 'Uploaded Video',
            status: 'completed',
            organizationId: v.organizationId,
          },
          transcripts: [],
          // Mark source for frontend to differentiate if needed
          _source: 'video',
          fileName: v.fileName,
        }));

      // Normalize MeetingRecording records
      const normalizedRecordings = recordings.map(r => ({
        ...r,
        fileSizeBytes: r.fileSizeBytes.toString(),
        _source: 'recording',
        fileName: (r.metadata as any)?.fileName || 'Recording',
      }));

      // Merge and sort by createdAt
      const allItems = [...normalizedRecordings, ...normalizedVideos]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination to merged results
      const total = recordingsTotal + videosTotal - videos.filter(v => v.recordingId).length;
      const paginatedItems = allItems.slice(
        (Number(page) - 1) * Number(limit),
        Number(page) * Number(limit)
      );

      res.json({
        recordings: paginatedItems,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Failed to list recordings:', error);
      res.status(500).json({ error: 'Failed to retrieve recordings' });
    }
  }
);

/**
 * GET /api/recordings/:id
 * Get recording details - checks both MeetingRecording and Video tables
 */
router.get(
  '/:id',
  requirePermission('meetings.read'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      // First try MeetingRecording table
      const recording = await prisma.meetingRecording.findFirst({
        where: {
          id,
          meeting: {
            organizationId,
          },
        },
        include: {
          meeting: true,
          transcripts: true,
        },
      });

      if (recording) {
        res.json({
          ...recording,
          fileSizeBytes: recording.fileSizeBytes.toString(),
          _source: 'recording',
        });
        return;
      }

      // If not found, try Video table
      const video = await prisma.video.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          meeting: true,
        },
      });

      if (video) {
        // Normalize Video to match MeetingRecording format
        res.json({
          id: video.id,
          meetingId: video.meetingId,
          s3Key: video.s3Key,
          fileUrl: video.fileUrl,
          fileSizeBytes: video.fileSizeBytes.toString(),
          durationSeconds: video.durationSeconds || 0,
          transcriptionStatus: video.processingStatus === 'completed' ? 'completed' :
                               video.processingStatus === 'failed' ? 'failed' : 'processing',
          isVideo: true,
          quality: 'hd',
          codec: video.codec,
          metadata: video.metadata,
          createdAt: video.createdAt,
          updatedAt: video.updatedAt,
          meeting: video.meeting || {
            id: video.meetingId || video.id,
            title: video.fileName || 'Uploaded Video',
            status: 'completed',
            organizationId: video.organizationId,
          },
          transcripts: [],
          _source: 'video',
          fileName: video.fileName,
        });
        return;
      }

      res.status(404).json({ error: 'Recording not found' });
    } catch (error) {
      logger.error('Failed to get recording:', error);
      res.status(500).json({ error: 'Failed to retrieve recording' });
    }
  }
);

/**
 * DELETE /api/recordings/:id
 * Delete recording and associated files - handles both MeetingRecording and Video tables
 */
router.delete(
  '/:id',
  requirePermission('meetings.delete'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      // First try MeetingRecording table
      const recording = await prisma.meetingRecording.findFirst({
        where: {
          id,
          meeting: {
            organizationId,
          },
        },
      });

      if (recording) {
        // Delete from S3
        if (recording.s3Key) {
          await storageService.deleteFile(recording.s3Key).catch(err => {
            logger.warn('Failed to delete S3 file:', err);
          });
        }

        // Delete from database
        await prisma.meetingRecording.delete({
          where: { id },
        });

        logger.info('Recording deleted', { id });

        res.json({
          success: true,
          message: 'Recording deleted successfully',
        });
        return;
      }

      // If not found in MeetingRecording, try Video table
      const video = await prisma.video.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (video) {
        // Delete from S3
        if (video.s3Key) {
          await storageService.deleteFile(video.s3Key).catch(err => {
            logger.warn('Failed to delete S3 file:', err);
          });
        }

        // Delete from database
        await prisma.video.delete({
          where: { id },
        });

        logger.info('Video deleted', { id });

        res.json({
          success: true,
          message: 'Recording deleted successfully',
        });
        return;
      }

      res.status(404).json({ error: 'Recording not found' });
    } catch (error) {
      logger.error('Failed to delete recording:', error);
      res.status(500).json({ error: 'Failed to delete recording' });
    }
  }
);

export default router;
