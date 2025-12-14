/**
 * Video Clips Routes - GAP #3: Video Intelligence & Replay
 *
 * Production-ready endpoints for:
 * - Video clip creation from timestamp ranges
 * - Synchronized video + transcript playback
 * - Shareable video clips with context
 * - Slide capture and retrieval
 * - Jump to transcript moments in video
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { videoIntelligenceService } from '../services/VideoIntelligenceService';
import { slideCaptureService } from '../services/SlideCaptureService';
import { VideoProcessingService } from '../services/VideoProcessingService';
import { StorageService } from '../services/storage';
import { logger } from '../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();
const storageService = new StorageService();
const videoProcessingService = new VideoProcessingService(storageService);

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/video/clips/create
 * Create a video clip from timestamp range with optional transcript context
 */
router.post(
  '/create',
  [
    body('meetingId').isUUID().withMessage('Valid meeting ID required'),
    body('startTime').isFloat({ min: 0 }).withMessage('Start time must be a positive number'),
    body('endTime').isFloat({ min: 0 }).withMessage('End time must be a positive number'),
    body('title').optional().isString().trim(),
    body('description').optional().isString().trim(),
    body('includeTranscript').optional().isBoolean(),
    body('isPublic').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = (req as any).user.userId;
      const {
        meetingId,
        startTime,
        endTime,
        title,
        description,
        includeTranscript = true,
        isPublic = false,
      } = req.body;

      // Validate time range
      if (endTime <= startTime) {
        return res.status(400).json({
          success: false,
          error: 'End time must be after start time',
        });
      }

      logger.info('Creating video clip', { meetingId, startTime, endTime, userId });

      // Create clip with context using VideoIntelligenceService
      const clip = await videoIntelligenceService.createClipWithContext(
        meetingId,
        startTime,
        endTime,
        {
          title,
          includeTranscript,
        }
      );

      // Update clip with additional metadata
      await prisma.videoClip.update({
        where: { id: clip.clipId },
        data: {
          description,
          isPublic,
          shareToken: isPublic ? clip.clipId : null,
        },
      });

      logger.info('Video clip created successfully', { clipId: clip.clipId });

      res.status(201).json({
        success: true,
        clip: {
          id: clip.clipId,
          videoUrl: clip.videoUrl,
          shareUrl: clip.shareUrl,
          transcriptSegments: clip.transcriptSegments,
          startTime,
          endTime,
          duration: endTime - startTime,
          title,
          description,
          isPublic,
        },
      });
    } catch (error: any) {
      logger.error('Error creating video clip', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create video clip',
      });
    }
  }
);

/**
 * GET /api/video/clips/:clipId
 * Get detailed information about a specific clip
 */
router.get(
  '/:clipId',
  [
    param('clipId').isString().notEmpty().withMessage('Valid clip ID required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { clipId } = req.params;
      const userId = (req as any).user.userId;

      logger.info('Fetching clip details', { clipId, userId });

      const clip = await prisma.videoClip.findUnique({
        where: { id: clipId },
        include: {
          video: {
            include: {
              meeting: {
                select: {
                  id: true,
                  title: true,
                  scheduledStartAt: true,
                },
              },
            },
          },
        },
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found',
        });
      }

      // Check access permissions (user owns clip or clip is public)
      if (clip.userId !== userId && !clip.isPublic) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Increment view count
      await prisma.videoClip.update({
        where: { id: clipId },
        data: { viewCount: { increment: 1 } },
      });

      // Parse transcript segments if available
      const transcriptSegments = clip.transcriptSegment
        ? JSON.parse(clip.transcriptSegment)
        : null;

      res.json({
        success: true,
        clip: {
          id: clip.id,
          title: clip.title,
          description: clip.description,
          startTime: clip.startTimeSeconds,
          endTime: clip.endTimeSeconds,
          duration: clip.endTimeSeconds - clip.startTimeSeconds,
          videoUrl: clip.fileUrl || clip.video?.fileUrl,
          thumbnailUrl: clip.thumbnailUrl,
          category: clip.category,
          sentiment: clip.sentiment,
          importance: clip.importance,
          keyPhrases: clip.keyPhrases,
          participants: clip.participants,
          transcriptSegments,
          isPublic: clip.isPublic,
          viewCount: clip.viewCount,
          downloadCount: clip.downloadCount,
          meeting: clip.video?.meeting,
          createdAt: clip.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching clip details', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch clip details',
      });
    }
  }
);

/**
 * GET /api/video/clips/:clipId/share
 * Get shareable link for a clip
 */
router.get(
  '/:clipId/share',
  [
    param('clipId').isString().notEmpty().withMessage('Valid clip ID required'),
    query('expiresIn').optional().isInt({ min: 3600, max: 2592000 }), // 1 hour to 30 days
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { clipId } = req.params;
      const userId = (req as any).user.userId;
      const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string) : undefined;

      logger.info('Generating shareable link', { clipId, userId });

      const clip = await prisma.videoClip.findUnique({
        where: { id: clipId },
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found',
        });
      }

      // Check if user owns the clip
      if (clip.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Generate or retrieve share token
      let shareToken = clip.shareToken;
      if (!shareToken) {
        shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

        await prisma.videoClip.update({
          where: { id: clipId },
          data: {
            shareToken,
            isPublic: true,
          },
        });
      }

      const baseUrl = process.env.FRONTEND_URL || 'https://openmeet.com';
      const shareUrl = `${baseUrl}/share/clip/${shareToken}`;
      const embedCode = `<iframe src="${shareUrl}/embed" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

      // Create shared clip record if expiration is set
      let expiresAt: Date | undefined;
      if (expiresIn) {
        expiresAt = new Date(Date.now() + expiresIn * 1000);

        await prisma.sharedClip.create({
          data: {
            id: shareToken,
            clipId,
            userId,
            includeTranscript: true,
            expiresAt,
          },
        });
      }

      res.json({
        success: true,
        shareUrl,
        embedCode,
        shareToken,
        expiresAt,
        clipId,
      });
    } catch (error: any) {
      logger.error('Error generating shareable link', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate shareable link',
      });
    }
  }
);

/**
 * POST /api/video/sync
 * Get synchronized video + transcript playback data
 */
router.post(
  '/sync',
  [
    body('meetingId').isUUID().withMessage('Valid meeting ID required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingId } = req.body;
      const userId = (req as any).user.userId;

      logger.info('Getting synchronized playback data', { meetingId, userId });

      // Verify user has access to meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: (req as any).user.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Get synchronized playback data
      const playbackData = await videoIntelligenceService.getSynchronizedPlayback(meetingId);

      res.json({
        success: true,
        ...playbackData,
      });
    } catch (error: any) {
      logger.error('Error getting synchronized playback', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get synchronized playback data',
      });
    }
  }
);

/**
 * POST /api/video/jump
 * Jump to a specific transcript moment in video
 */
router.post(
  '/jump',
  [
    body('transcriptId').isUUID().withMessage('Valid transcript ID required'),
    body('searchText').isString().notEmpty().withMessage('Search text required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { transcriptId, searchText } = req.body;
      const userId = (req as any).user.userId;

      logger.info('Jumping to transcript moment', { transcriptId, searchText, userId });

      // Jump to the moment
      const moment = await videoIntelligenceService.jumpToTranscriptMoment(
        transcriptId,
        searchText
      );

      if (!moment) {
        return res.status(404).json({
          success: false,
          error: 'No matching transcript segment found',
        });
      }

      res.json({
        success: true,
        moment,
      });
    } catch (error: any) {
      logger.error('Error jumping to transcript moment', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to jump to transcript moment',
      });
    }
  }
);

/**
 * GET /api/video/slides/:meetingId
 * Get all captured slides for a meeting
 */
router.get(
  '/slides/:meetingId',
  [
    param('meetingId').isUUID().withMessage('Valid meeting ID required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingId } = req.params;
      const userId = (req as any).user.userId;

      logger.info('Fetching slides for meeting', { meetingId, userId });

      // Verify user has access to meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: (req as any).user.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Get slides from SlideCaptureService
      const slides = await slideCaptureService.getSlides(meetingId);

      // Get slide statistics
      const stats = await slideCaptureService.getSlideStats(meetingId);

      res.json({
        success: true,
        slides,
        stats,
        count: slides.length,
      });
    } catch (error: any) {
      logger.error('Error fetching slides', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch slides',
      });
    }
  }
);

/**
 * GET /api/video/slides/:meetingId/:slideNumber
 * Get a specific slide by number
 */
router.get(
  '/slides/:meetingId/:slideNumber',
  [
    param('meetingId').isUUID().withMessage('Valid meeting ID required'),
    param('slideNumber').isInt({ min: 1 }).withMessage('Valid slide number required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingId, slideNumber } = req.params;
      const userId = (req as any).user.userId;

      logger.info('Fetching specific slide', { meetingId, slideNumber, userId });

      // Verify user has access to meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: (req as any).user.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Get slide
      const slide = await slideCaptureService.getSlideByNumber(
        meetingId,
        parseInt(slideNumber)
      );

      if (!slide) {
        return res.status(404).json({
          success: false,
          error: 'Slide not found',
        });
      }

      res.json({
        success: true,
        slide,
      });
    } catch (error: any) {
      logger.error('Error fetching slide', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch slide',
      });
    }
  }
);

/**
 * POST /api/video/slides/search
 * Search slides by text content
 */
router.post(
  '/slides/search',
  [
    body('meetingId').isUUID().withMessage('Valid meeting ID required'),
    body('query').isString().notEmpty().withMessage('Search query required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingId, query } = req.body;
      const userId = (req as any).user.userId;

      logger.info('Searching slides', { meetingId, query, userId });

      // Verify user has access to meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: (req as any).user.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Search slides
      const slides = await slideCaptureService.searchSlides(meetingId, query);

      res.json({
        success: true,
        slides,
        count: slides.length,
        query,
      });
    } catch (error: any) {
      logger.error('Error searching slides', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search slides',
      });
    }
  }
);

/**
 * GET /api/video/slides/:meetingId/summary
 * Get AI-generated summary of slide deck
 */
router.get(
  '/slides/:meetingId/summary',
  [
    param('meetingId').isUUID().withMessage('Valid meeting ID required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingId } = req.params;
      const userId = (req as any).user.userId;

      logger.info('Generating slide deck summary', { meetingId, userId });

      // Verify user has access to meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: (req as any).user.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Generate summary
      const summary = await slideCaptureService.generateSlideDeckSummary(meetingId);

      res.json({
        success: true,
        summary,
        meetingId,
      });
    } catch (error: any) {
      logger.error('Error generating slide deck summary', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate slide deck summary',
      });
    }
  }
);

/**
 * DELETE /api/video/clips/:clipId
 * Delete a video clip
 */
router.delete(
  '/:clipId',
  [
    param('clipId').isString().notEmpty().withMessage('Valid clip ID required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { clipId } = req.params;
      const userId = (req as any).user.userId;

      logger.info('Deleting clip', { clipId, userId });

      const clip = await prisma.videoClip.findUnique({
        where: { id: clipId },
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found',
        });
      }

      // Check if user owns the clip
      if (clip.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Delete clip file from S3 if it exists
      if (clip.s3Key) {
        await storageService.deleteFiles([clip.s3Key]);
      }

      // Delete from database
      await prisma.videoClip.delete({
        where: { id: clipId },
      });

      logger.info('Clip deleted successfully', { clipId });

      res.json({
        success: true,
        message: 'Clip deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting clip', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete clip',
      });
    }
  }
);

/**
 * GET /api/video/clips/meeting/:meetingId
 * List all clips for a specific meeting
 */
router.get(
  '/meeting/:meetingId',
  [
    param('meetingId').isUUID().withMessage('Valid meeting ID required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingId } = req.params;
      const userId = (req as any).user.userId;

      logger.info('Fetching clips for meeting', { meetingId, userId });

      // Verify user has access to meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: (req as any).user.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Get all clips for the meeting
      const clips = await prisma.videoClip.findMany({
        where: { meetingId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        clips,
        count: clips.length,
      });
    } catch (error: any) {
      logger.error('Error fetching clips for meeting', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch clips',
      });
    }
  }
);

export default router;
