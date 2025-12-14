/**
 * Public API v1 - Meetings Endpoints
 *
 * Provides comprehensive meeting management:
 * - List meetings with pagination, filters, sorting
 * - Get single meeting details
 * - Create meeting (upload audio URL)
 * - Delete meeting
 * - Get transcript
 * - Get AI summary
 */

import { Router, Response } from 'express';
import { param, query, body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { APIKeyRequest } from '../../middleware/apiKeyAuth';
import { logger } from '../../utils/logger';
import { requireScopes } from '../../middleware/apiKeyAuth';

const router: Router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/meetings
 * List meetings with pagination, filtering, and sorting
 */
router.get(
  '/',
  requireScopes('read'),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
    query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'failed', 'processing']),
    query('sortBy').optional().isIn(['createdAt', 'scheduledStartAt', 'actualStartAt', 'title', 'duration']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('startDate').optional().isISO8601().withMessage('startDate must be ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('endDate must be ISO 8601 format'),
    query('search').optional().isString().withMessage('search must be a string'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const where: any = {
        organizationId: req.apiKey!.organizationId,
      };

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.scheduledStartAt = {};
        if (startDate) where.scheduledStartAt.gte = startDate;
        if (endDate) where.scheduledStartAt.lte = endDate;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [meetings, total] = await Promise.all([
        prisma.meeting.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { [sortBy]: sortOrder },
          include: {
            participants: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            summaries: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                overview: true,
                keyPoints: true,
                actionItems: true,
                decisions: true,
              },
            },
          },
        }),
        prisma.meeting.count({ where }),
      ]);

      res.json({
        success: true,
        data: meetings.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          status: m.status,
          scheduledStartAt: m.scheduledStartAt,
          actualStartAt: m.actualStartAt,
          actualEndAt: m.actualEndAt,
          durationSeconds: m.durationSeconds || m.duration,
          participants: m.participants,
          summary: m.summaries[0] || null,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
          nextOffset: offset + limit < total ? offset + limit : null,
        },
      });
    } catch (error: any) {
      logger.error('Error listing meetings', { error, organizationId: req.apiKey?.organizationId });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to list meetings',
      });
    }
  }
);

/**
 * GET /api/v1/meetings/:id
 * Get detailed meeting information
 */
router.get(
  '/:id',
  requireScopes('read'),
  [param('id').isString().notEmpty().withMessage('Meeting ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      const meeting = await prisma.meeting.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
        include: {
          participants: true,
          summaries: {
            orderBy: { createdAt: 'desc' },
          },
          analytics: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        data: {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          status: meeting.status,
          scheduledStartAt: meeting.scheduledStartAt,
          actualStartAt: meeting.actualStartAt,
          actualEndAt: meeting.actualEndAt,
          durationSeconds: meeting.durationSeconds || meeting.duration,
          participants: meeting.participants,
          summaries: meeting.summaries,
          analytics: meeting.analytics[0] || null,
          tags: (meeting.metadata as any)?.tags || [],
          metadata: meeting.metadata,
          createdAt: meeting.createdAt,
          updatedAt: meeting.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error getting meeting', { error, meetingId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get meeting',
      });
    }
  }
);

/**
 * POST /api/v1/meetings
 * Create new meeting with optional audio upload URL
 */
router.post(
  '/',
  requireScopes('write'),
  [
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('scheduledStartAt').optional().isISO8601().withMessage('scheduledStartAt must be ISO 8601'),
    body('description').optional().isString(),
    body('audioUrl').optional().isURL().withMessage('audioUrl must be valid URL'),
    body('participants').optional().isArray().withMessage('participants must be an array'),
    body('metadata').optional().isObject().withMessage('metadata must be an object'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { title, scheduledStartAt, description, audioUrl, participants, metadata } = req.body;

      const meeting = await prisma.meeting.create({
        data: {
          title,
          description,
          scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : new Date(),
          status: audioUrl ? 'processing' : 'scheduled',
          organizationId: req.apiKey!.organizationId,
          userId: req.apiKey!.userId,
          createdBy: req.apiKey!.userId,
          metadata: {
            ...(metadata || {}),
            source: 'api',
            audioUrl,
            apiKeyId: req.apiKey!.id,
          } as any,
        },
      });

      // If audio URL provided, queue for processing
      if (audioUrl) {
        // Import queue service dynamically to avoid circular deps
        const { QueueService, JobType } = await import('../../services/queue');
        const Redis = (await import('ioredis')).default;
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        });
        const queueService = new QueueService(redis);
        await queueService.addJob(JobType.TRANSCRIPTION, {
          type: JobType.TRANSCRIPTION,
          payload: { audioUrl },
          meetingId: meeting.id,
          organizationId: req.apiKey!.organizationId,
          userId: req.apiKey!.userId,
        });

        logger.info('Audio upload queued for processing', {
          meetingId: meeting.id,
          audioUrl,
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          status: meeting.status,
          scheduledStartAt: meeting.scheduledStartAt,
          createdAt: meeting.createdAt,
        },
        message: audioUrl ? 'Meeting created and audio queued for processing' : 'Meeting created',
      });
    } catch (error: any) {
      logger.error('Error creating meeting', { error, organizationId: req.apiKey?.organizationId });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create meeting',
      });
    }
  }
);

/**
 * DELETE /api/v1/meetings/:id
 * Delete a meeting
 */
router.delete(
  '/:id',
  requireScopes('delete'),
  [param('id').isString().notEmpty().withMessage('Meeting ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      // Check if meeting exists and belongs to organization
      const meeting = await prisma.meeting.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Meeting not found',
        });
      }

      // Soft delete or hard delete based on policy
      await prisma.meeting.update({
        where: { id },
        data: {
          status: 'cancelled',
          metadata: {
            ...(meeting.metadata as any),
            deletedAt: new Date().toISOString(),
            deletedBy: req.apiKey!.userId,
          } as any,
        },
      });

      logger.info('Meeting deleted', { meetingId: id, organizationId: req.apiKey!.organizationId });

      res.json({
        success: true,
        message: 'Meeting deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting meeting', { error, meetingId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete meeting',
      });
    }
  }
);

/**
 * GET /api/v1/meetings/:id/transcript
 * Get meeting transcript with speaker diarization
 */
router.get(
  '/:id/transcript',
  requireScopes('read'),
  [
    param('id').isString().notEmpty().withMessage('Meeting ID is required'),
    query('format').optional().isIn(['json', 'text', 'vtt', 'srt']).withMessage('Invalid format'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const format = (req.query.format as string) || 'json';

      // Check if meeting exists
      const meeting = await prisma.meeting.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Meeting not found',
        });
      }

      // Get transcript
      const transcript = await prisma.transcript.findFirst({
        where: { meetingId: id },
        orderBy: { createdAt: 'desc' },
      });

      if (!transcript || !transcript.mongodbId) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Transcript not available',
        });
      }

      // Fetch segments from database
      const { transcriptService } = await import('../../services/TranscriptService');
      const segments = await transcriptService.getTranscriptSegments(transcript.mongodbId);

      // Format response based on requested format
      if (format === 'text') {
        const text = segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
        res.setHeader('Content-Type', 'text/plain');
        return res.send(text);
      }

      if (format === 'vtt') {
        const vtt = generateWebVTT(segments);
        res.setHeader('Content-Type', 'text/vtt');
        return res.send(vtt);
      }

      if (format === 'srt') {
        const srt = generateSRT(segments);
        res.setHeader('Content-Type', 'text/plain');
        return res.send(srt);
      }

      // Default JSON format
      res.json({
        success: true,
        data: {
          meetingId: id,
          transcriptId: transcript.id,
          language: transcript.language,
          confidence: transcript.confidenceScore,
          segments: segments.map(s => ({
            speaker: s.speaker,
            speakerId: s.speakerId,
            text: s.text,
            startTime: s.startTime,
            endTime: s.endTime,
            confidence: s.confidence,
          })),
          fullText: segments.map(s => s.text).join(' '),
          wordCount: segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0),
        },
      });
    } catch (error: any) {
      logger.error('Error getting transcript', { error, meetingId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get transcript',
      });
    }
  }
);

/**
 * GET /api/v1/meetings/:id/summary
 * Get AI-generated meeting summary
 */
router.get(
  '/:id/summary',
  requireScopes('read'),
  [param('id').isString().notEmpty().withMessage('Meeting ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      // Check if meeting exists
      const meeting = await prisma.meeting.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
        include: {
          summaries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Meeting not found',
        });
      }

      const summary = meeting.summaries[0];

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Summary not available. Meeting may not be processed yet.',
        });
      }

      res.json({
        success: true,
        data: {
          meetingId: id,
          summaryId: summary.id,
          overview: summary.overview,
          keyPoints: summary.keyPoints,
          actionItems: summary.actionItems,
          topics: (summary.metadata as any)?.topics || [],
          decisions: summary.decisions,
          questions: summary.questions,
          sentiment: (summary.metadata as any)?.sentiment || null,
          createdAt: summary.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('Error getting summary', { error, meetingId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get summary',
      });
    }
  }
);

/**
 * Helper: Generate WebVTT format
 */
function generateWebVTT(segments: any[]): string {
  let vtt = 'WEBVTT\n\n';
  segments.forEach((seg, idx) => {
    vtt += `${idx + 1}\n`;
    vtt += `${formatTime(seg.startTime)} --> ${formatTime(seg.endTime)}\n`;
    vtt += `<v ${seg.speaker}>${seg.text}</v>\n\n`;
  });
  return vtt;
}

/**
 * Helper: Generate SRT format
 */
function generateSRT(segments: any[]): string {
  let srt = '';
  segments.forEach((seg, idx) => {
    srt += `${idx + 1}\n`;
    srt += `${formatTimeSRT(seg.startTime)} --> ${formatTimeSRT(seg.endTime)}\n`;
    srt += `${seg.speaker}: ${seg.text}\n\n`;
  });
  return srt;
}

/**
 * Helper: Format time for WebVTT (HH:MM:SS.mmm)
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
}

/**
 * Helper: Format time for SRT (HH:MM:SS,mmm)
 */
function formatTimeSRT(seconds: number): string {
  return formatTime(seconds).replace('.', ',');
}

/**
 * Helper: Pad number with zeros
 */
function pad(num: number, size: number): string {
  let s = num.toString();
  while (s.length < size) s = '0' + s;
  return s;
}

export default router;
