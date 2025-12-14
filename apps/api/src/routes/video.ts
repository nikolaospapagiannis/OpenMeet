/**
 * Video Intelligence Routes (GAP #3 - Otter Competitor Feature)
 * Video upload, processing, synchronized playback, highlights, and clips
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, VideoProcessingStatus, HighlightType } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/storage';
import { VideoProcessingService } from '../services/VideoProcessingService';
import { authMiddleware } from '../middleware/auth';
import { createModuleLogger } from '../lib/logger';

const router: Router = Router();
const prisma = new PrismaClient();
const logger = createModuleLogger('video-routes');

// Initialize services
const storageService = new StorageService();
const videoProcessingService = new VideoProcessingService(storageService);

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = process.env.VIDEO_UPLOAD_DIR || '/tmp/video-uploads';
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_SIZE || '2147483648'), // 2GB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
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
 * POST /api/video/upload
 * Upload video file to S3 and create video record
 */
router.post(
  '/upload',
  upload.single('video'),
  [
    body('meetingId').optional().isUUID(),
    body('recordingId').optional().isUUID(),
    body('title').optional().trim(),
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
      const { meetingId, recordingId, title } = req.body;

      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      const file = req.file;
      const videoId = uuidv4();

      logger.info('Video upload started:', {
        userId,
        organizationId,
        fileName: file.originalname,
        fileSize: file.size,
      });

      // Upload to S3
      const s3Key = `videos/${organizationId}/${videoId}/${file.originalname}`;
      const fileBuffer = await fs.readFile(file.path);

      await storageService.uploadFile(s3Key, fileBuffer, {
        contentType: file.mimetype,
        metadata: {
          'uploaded-by': userId,
          'original-name': file.originalname,
        },
      });

      const fileUrl = await storageService.generateDownloadUrl(s3Key, 86400 * 365); // 1 year

      // Create video record
      const video = await prisma.video.create({
        data: {
          id: videoId,
          organizationId,
          userId,
          meetingId: meetingId || null,
          recordingId: recordingId || null,
          s3Key,
          s3Bucket: process.env.S3_BUCKET || 'openmeet-storage',
          fileUrl,
          fileName: file.originalname,
          fileSizeBytes: BigInt(file.size),
          processingStatus: 'pending',
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalPath: file.path,
          },
        },
      });

      // Clean up temp file
      await fs.unlink(file.path).catch((err) => logger.warn('Failed to delete temp file:', err));

      // Trigger async video processing
      processVideoAsync(video.id, file.path, organizationId).catch((err) => {
        logger.error('Video processing failed:', err);
      });

      logger.info('Video uploaded successfully:', { videoId: video.id });

      res.status(201).json({
        id: video.id,
        fileName: video.fileName,
        fileUrl: video.fileUrl,
        fileSizeBytes: video.fileSizeBytes.toString(),
        processingStatus: video.processingStatus,
        createdAt: video.createdAt,
      });
    } catch (error) {
      logger.error('Video upload error:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }
);

/**
 * POST /api/video/process
 * Manually trigger video processing
 */
router.post(
  '/process',
  [
    body('videoId').isUUID(),
    body('extractAudio').optional().isBoolean(),
    body('generateThumbnails').optional().isBoolean(),
    body('thumbnailCount').optional().isInt({ min: 1, max: 20 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { videoId, extractAudio = true, generateThumbnails = true, thumbnailCount = 5 } = req.body;

      const video = await prisma.video.findFirst({
        where: { id: videoId, organizationId },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (video.processingStatus === 'processing') {
        res.status(409).json({ error: 'Video is already being processed' });
        return;
      }

      // Update status to processing
      await prisma.video.update({
        where: { id: videoId },
        data: { processingStatus: 'processing', processingProgress: 0 },
      });

      // Download video from S3 to process
      const tempVideoPath = `/tmp/${videoId}.mp4`;
      const videoStream = await storageService.streamFile(video.s3Key);
      const writeStream = require('fs').createWriteStream(tempVideoPath);

      await new Promise((resolve, reject) => {
        videoStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Process video asynchronously
      processVideoWithOptions(videoId, tempVideoPath, organizationId, {
        extractAudio,
        generateThumbnails,
        thumbnailCount,
      }).catch((err) => logger.error('Video processing failed:', err));

      res.json({
        message: 'Video processing started',
        videoId,
        processingStatus: 'processing',
      });
    } catch (error) {
      logger.error('Process video error:', error);
      res.status(500).json({ error: 'Failed to start video processing' });
    }
  }
);

/**
 * GET /api/video/:id
 * Get video metadata and details
 */
router.get(
  '/:id',
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

      const video = await prisma.video.findFirst({
        where: { id, organizationId },
        include: {
          meeting: {
            select: { id: true, title: true, scheduledStartAt: true },
          },
          clips: {
            orderBy: { createdAt: 'desc' },
          },
          highlights: {
            orderBy: { startTimeSeconds: 'asc' },
          },
          screenShares: {
            orderBy: { startTimeSeconds: 'asc' },
          },
        },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      res.json({
        ...video,
        fileSizeBytes: video.fileSizeBytes.toString(),
      });
    } catch (error) {
      logger.error('Get video error:', error);
      res.status(500).json({ error: 'Failed to retrieve video' });
    }
  }
);

/**
 * GET /api/video/:id/playback
 * Get video playback data with synchronized transcript
 */
router.get(
  '/:id/playback',
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

      const video = await prisma.video.findFirst({
        where: { id, organizationId },
        include: {
          meeting: {
            include: {
              transcripts: {
                where: { isFinal: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Get transcript segments from database (if available)
      let transcriptSegments: any[] = [];
      if (video.meeting?.transcripts?.[0]?.mongodbId) {
        try {
          const { transcriptService } = await import('../services/TranscriptService');
          transcriptSegments = await transcriptService.getTranscriptSegments(
            video.meeting.transcripts[0].mongodbId
          );
        } catch (error: any) {
          logger.error('Error fetching transcript segments', { error: error.message, stack: error.stack });
          // Continue without segments
          transcriptSegments = [];
        }
      }

      // Generate WebVTT subtitle file if transcript exists
      let subtitleUrl = null;
      if (transcriptSegments.length > 0) {
        const vttPath = await videoProcessingService.generateWebVTT(transcriptSegments);
        const vttS3Key = `videos/${organizationId}/${id}/subtitles.vtt`;
        subtitleUrl = await videoProcessingService.uploadToStorage(vttPath, vttS3Key, 'text/vtt');
        await videoProcessingService.cleanupFiles([vttPath]);
      }

      res.json({
        videoUrl: video.fileUrl,
        thumbnailUrl: video.thumbnailUrl,
        durationSeconds: video.durationSeconds,
        width: video.width,
        height: video.height,
        transcriptSegments,
        subtitleUrl,
        highlights: await prisma.videoHighlight.findMany({
          where: { videoId: id },
          orderBy: { startTimeSeconds: 'asc' },
        }),
      });
    } catch (error) {
      logger.error('Get playback data error:', error);
      res.status(500).json({ error: 'Failed to retrieve playback data' });
    }
  }
);

/**
 * POST /api/video/:id/highlights
 * Generate AI-powered highlights
 */
router.post(
  '/:id/highlights',
  [
    param('id').isUUID(),
    body('transcriptText').optional().isString(),
    body('autoDetect').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;
      const { transcriptText, autoDetect = true } = req.body;

      const video = await prisma.video.findFirst({
        where: { id, organizationId },
        include: {
          meeting: {
            include: {
              transcripts: {
                where: { isFinal: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Get transcript for AI analysis
      const transcript = transcriptText || video.meeting?.transcripts?.[0];

      if (!transcript) {
        res.status(400).json({ error: 'No transcript available for highlight detection' });
        return;
      }

      // Call AI service to detect highlights
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

      const response = await axios.post(
        `${aiServiceUrl}/api/v1/detect-highlights`,
        {
          text: typeof transcript === 'string' ? transcript : JSON.stringify(transcript),
          videoDuration: video.durationSeconds || 0,
        },
        {
          timeout: 60000,
        }
      );

      const detectedHighlights = response.data.highlights || [];

      // Save highlights to database
      const highlights = await Promise.all(
        detectedHighlights.map((highlight: any) =>
          prisma.videoHighlight.create({
            data: {
              videoId: id,
              highlightType: highlight.type || 'key_moment',
              title: highlight.title,
              description: highlight.description,
              startTimeSeconds: Math.floor(highlight.startTime),
              endTimeSeconds: Math.ceil(highlight.endTime),
              confidence: highlight.confidence || 0.0,
              transcriptText: highlight.text,
              aiDetected: true,
              aiModel: 'gpt-4',
              metadata: {
                keywords: highlight.keywords || [],
                importance: highlight.importance || 'medium',
              },
            },
          })
        )
      );

      logger.info('Highlights generated:', { videoId: id, count: highlights.length });

      res.json({
        videoId: id,
        highlights,
        count: highlights.length,
      });
    } catch (error) {
      logger.error('Generate highlights error:', error);
      res.status(500).json({ error: 'Failed to generate highlights' });
    }
  }
);

/**
 * POST /api/video/:id/clips
 * Create a shareable video clip
 */
router.post(
  '/:id/clips',
  [
    param('id').isUUID(),
    body('startTimeSeconds').isInt({ min: 0 }),
    body('endTimeSeconds').isInt({ min: 0 }),
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('isPublic').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { startTimeSeconds, endTimeSeconds, title, description, isPublic = false } = req.body;

      if (endTimeSeconds <= startTimeSeconds) {
        res.status(400).json({ error: 'End time must be after start time' });
        return;
      }

      const video = await prisma.video.findFirst({
        where: { id, organizationId },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (video.durationSeconds && endTimeSeconds > video.durationSeconds) {
        res.status(400).json({ error: 'End time exceeds video duration' });
        return;
      }

      // Download video from S3
      const tempVideoPath = `/tmp/${id}.mp4`;
      const videoStream = await storageService.streamFile(video.s3Key);
      const writeStream = require('fs').createWriteStream(tempVideoPath);

      await new Promise((resolve, reject) => {
        videoStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Create clip using FFmpeg
      const clipPath = await videoProcessingService.createClip(
        tempVideoPath,
        startTimeSeconds,
        endTimeSeconds
      );

      // Upload clip to S3
      const clipId = uuidv4();
      const clipS3Key = `videos/${organizationId}/${id}/clips/${clipId}.mp4`;
      const clipUrl = await videoProcessingService.uploadToStorage(clipPath, clipS3Key, 'video/mp4');

      // Generate clip thumbnail
      const clipThumbnailPath = await videoProcessingService.generateThumbnails(clipPath, {
        count: 1,
        width: 640,
      });
      const clipThumbnailS3Key = `videos/${organizationId}/${id}/clips/${clipId}_thumb.jpg`;
      const clipThumbnailUrl = await videoProcessingService.uploadToStorage(
        clipThumbnailPath[0],
        clipThumbnailS3Key,
        'image/jpeg'
      );

      // Clean up temp files
      await videoProcessingService.cleanupFiles([tempVideoPath, clipPath, ...clipThumbnailPath]);

      // Create clip record
      const shareToken = isPublic ? uuidv4() : null;

      const clip = await prisma.videoClip.create({
        data: {
          videoId: id,
          userId,
          title: title || `Clip ${startTimeSeconds}s - ${endTimeSeconds}s`,
          description,
          startTimeSeconds,
          endTimeSeconds,
          s3Key: clipS3Key,
          fileUrl: clipUrl,
          thumbnailUrl: clipThumbnailUrl,
          shareToken,
          isPublic,
        },
      });

      logger.info('Video clip created:', { clipId: clip.id, videoId: id });

      res.status(201).json(clip);
    } catch (error) {
      logger.error('Create clip error:', error);
      res.status(500).json({ error: 'Failed to create video clip' });
    }
  }
);

/**
 * GET /api/video/:id/clips
 * List all clips for a video
 */
router.get(
  '/:id/clips',
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

      const video = await prisma.video.findFirst({
        where: { id, organizationId },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      const clips = await prisma.videoClip.findMany({
        where: { videoId: id },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        videoId: id,
        clips,
        count: clips.length,
      });
    } catch (error) {
      logger.error('List clips error:', error);
      res.status(500).json({ error: 'Failed to list clips' });
    }
  }
);

/**
 * POST /api/video/:id/analyze-screens
 * Detect and analyze screen shares
 */
router.post(
  '/:id/analyze-screens',
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

      const video = await prisma.video.findFirst({
        where: { id, organizationId },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Download video from S3
      const tempVideoPath = `/tmp/${id}.mp4`;
      const videoStream = await storageService.streamFile(video.s3Key);
      const writeStream = require('fs').createWriteStream(tempVideoPath);

      await new Promise((resolve, reject) => {
        videoStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Detect screen share segments
      const segments = await videoProcessingService.detectScreenShares(tempVideoPath);

      // Save screen share segments
      const screenShares = await Promise.all(
        segments.map((segment) =>
          prisma.videoScreenShare.create({
            data: {
              videoId: id,
              startTimeSeconds: Math.floor(segment.start),
              endTimeSeconds: Math.ceil(segment.end),
              contentType: 'screen_share',
              confidence: 0.7,
              metadata: {
                detectedAt: new Date().toISOString(),
              },
            },
          })
        )
      );

      // Clean up temp file
      await videoProcessingService.cleanupFiles([tempVideoPath]);

      logger.info('Screen shares detected:', { videoId: id, count: screenShares.length });

      res.json({
        videoId: id,
        screenShares,
        count: screenShares.length,
      });
    } catch (error) {
      logger.error('Analyze screens error:', error);
      res.status(500).json({ error: 'Failed to analyze screen shares' });
    }
  }
);

/**
 * DELETE /api/video/:id
 * Delete a video and all associated data
 */
router.delete(
  '/:id',
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

      const video = await prisma.video.findFirst({
        where: { id, organizationId },
        include: {
          clips: true,
        },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Delete S3 files
      const s3KeysToDelete = [
        video.s3Key,
        video.audioS3Key,
        ...(video.clips.map((c) => c.s3Key).filter(Boolean) as string[]),
      ].filter((key): key is string => key !== null && key !== undefined);

      await storageService.deleteFiles(s3KeysToDelete);

      // Delete from database (cascades to clips, highlights, screen shares)
      await prisma.video.delete({
        where: { id },
      });

      logger.info('Video deleted:', { videoId: id });

      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      logger.error('Delete video error:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  }
);

/**
 * Async video processing function
 */
async function processVideoAsync(
  videoId: string,
  videoPath: string,
  organizationId: string
): Promise<void> {
  try {
    await processVideoWithOptions(videoId, videoPath, organizationId, {
      extractAudio: true,
      generateThumbnails: true,
      thumbnailCount: 5,
    });
  } catch (error) {
    logger.error('Async video processing failed:', { videoId, error });
  }
}

/**
 * Process video with options
 */
async function processVideoWithOptions(
  videoId: string,
  videoPath: string,
  organizationId: string,
  options: {
    extractAudio?: boolean;
    generateThumbnails?: boolean;
    thumbnailCount?: number;
  }
): Promise<void> {
  try {
    const result = await videoProcessingService.processVideo(
      videoPath,
      {
        organizationId,
        videoId,
        ...options,
      },
      async (progress) => {
        // Update progress in database
        await prisma.video.update({
          where: { id: videoId },
          data: {
            processingProgress: progress.progress,
          },
        });
      }
    );

    // Update video with processing results
    await prisma.video.update({
      where: { id: videoId },
      data: {
        processingStatus: 'completed',
        processingProgress: 100,
        durationSeconds: Math.floor(result.metadata.duration),
        width: result.metadata.width,
        height: result.metadata.height,
        fps: Math.floor(result.metadata.fps),
        codec: result.metadata.codec,
        format: result.metadata.format,
        bitrate: BigInt(result.metadata.bitrate),
        audioExtracted: !!result.audio,
        audioS3Key: result.audio?.s3Key,
        thumbnailsGenerated: !!result.thumbnails,
        thumbnailS3Keys: result.thumbnails?.map((t) => t.s3Key) || [],
        thumbnailUrl: result.thumbnails?.[0]?.url,
      },
    });

    logger.info('Video processing completed:', { videoId });
  } catch (error) {
    logger.error('Video processing error:', { videoId, error });

    await prisma.video.update({
      where: { id: videoId },
      data: {
        processingStatus: 'failed',
        processingError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

export default router;
