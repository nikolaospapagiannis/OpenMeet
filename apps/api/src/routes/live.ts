/**
 * Live Features Routes
 * REST API endpoints for live transcription, bookmarks, and AI assistance
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import axios from 'axios';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'live-routes' },
  transports: [new winston.transports.Console()],
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Rate limiting for live endpoints
const liveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many live requests, please try again later',
});

/**
 * POST /api/live/sessions
 * Create a new live session
 */
router.post(
  '/sessions',
  liveLimiter,
  [
    body('meetingId').isUUID().withMessage('Valid meeting ID required'),
    body('language').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { meetingId, language } = req.body;
      const user = (req as any).user;

      // Verify meeting exists and user has access
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: user.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Create live session
      const liveSession = await prisma.liveSession.create({
        data: {
          meetingId,
          status: 'active',
          language: language || 'en',
          participantCount: 0,
          websocketClients: [],
        },
      });

      // Update meeting status
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'in_progress' },
      });

      logger.info(`Live session created: ${liveSession.id} for meeting ${meetingId}`);

      res.status(201).json({
        success: true,
        liveSession: {
          id: liveSession.id,
          meetingId: liveSession.meetingId,
          status: liveSession.status,
          language: liveSession.language,
          startedAt: liveSession.startedAt,
        },
      });
    } catch (error) {
      logger.error('Error creating live session:', error);
      res.status(500).json({ error: 'Failed to create live session' });
    }
  }
);

/**
 * GET /api/live/sessions/:sessionId
 * Get live session details
 */
router.get(
  '/sessions/:sessionId',
  [param('sessionId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          bookmarks: {
            orderBy: { timestampSeconds: 'asc' },
            take: 50,
          },
          insights: {
            orderBy: { timestampSeconds: 'desc' },
            take: 20,
          },
          reactions: {
            orderBy: { timestampSeconds: 'desc' },
            take: 50,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      res.json({
        success: true,
        liveSession,
      });
    } catch (error) {
      logger.error('Error fetching live session:', error);
      res.status(500).json({ error: 'Failed to fetch live session' });
    }
  }
);

/**
 * PATCH /api/live/sessions/:sessionId/status
 * Update live session status (pause, resume, complete)
 */
router.patch(
  '/sessions/:sessionId/status',
  [
    param('sessionId').isUUID(),
    body('status').isIn(['active', 'paused', 'completed']),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const { status } = req.body;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const updateData: any = { status };
      if (status === 'completed') {
        updateData.endedAt = new Date();
      }

      const updatedSession = await prisma.liveSession.update({
        where: { id: sessionId },
        data: updateData,
      });

      logger.info(`Live session ${sessionId} status updated to ${status}`);

      res.json({
        success: true,
        liveSession: updatedSession,
      });
    } catch (error) {
      logger.error('Error updating live session:', error);
      res.status(500).json({ error: 'Failed to update live session' });
    }
  }
);

/**
 * POST /api/live/:sessionId/bookmarks
 * Create a live bookmark
 */
router.post(
  '/:sessionId/bookmarks',
  liveLimiter,
  [
    param('sessionId').isUUID(),
    body('title').isString().notEmpty(),
    body('description').optional().isString(),
    body('type').optional().isIn(['manual', 'action_item', 'decision', 'question', 'key_moment']),
    body('timestampSeconds').isFloat({ min: 0 }),
    body('tags').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const { title, description, type, timestampSeconds, tags } = req.body;
      const user = (req as any).user;

      // Verify session exists
      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      // Create bookmark
      const bookmark = await prisma.liveBookmark.create({
        data: {
          liveSessionId: sessionId,
          meetingId: liveSession.meetingId,
          userId: user.id,
          type: type || 'manual',
          title,
          description,
          timestampSeconds,
          autoDetected: false,
          tags: tags || [],
        },
      });

      logger.info(`Bookmark created for session ${sessionId} at ${timestampSeconds}s`);

      res.status(201).json({
        success: true,
        bookmark,
      });
    } catch (error) {
      logger.error('Error creating bookmark:', error);
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  }
);

/**
 * GET /api/live/:sessionId/bookmarks
 * Get all bookmarks for a live session
 */
router.get(
  '/:sessionId/bookmarks',
  [param('sessionId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const bookmarks = await prisma.liveBookmark.findMany({
        where: { liveSessionId: sessionId },
        orderBy: { timestampSeconds: 'asc' },
      });

      res.json({
        success: true,
        bookmarks,
        count: bookmarks.length,
      });
    } catch (error) {
      logger.error('Error fetching bookmarks:', error);
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  }
);

/**
 * POST /api/live/:sessionId/suggest
 * Get live AI suggestions and insights
 */
router.post(
  '/:sessionId/suggest',
  liveLimiter,
  [
    param('sessionId').isUUID(),
    body('analysisTypes').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { analysisTypes } = req.body;
      const user = (req as any).user;

      // Get live session
      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
        include: {
          transcriptSegments: {
            where: { isFinal: true },
            orderBy: { startTime: 'desc' },
            take: 50, // Last 50 segments for context
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      // Build context from recent transcripts
      const context = liveSession.transcriptSegments
        .map(seg => `${seg.speaker || 'Unknown'}: ${seg.text}`)
        .reverse()
        .join('\n');

      // Call AI service for live analysis
      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/api/v1/live-analyze`,
        {
          liveSessionId: sessionId,
          meetingId: liveSession.meetingId,
          context,
          analysisTypes: analysisTypes || ['action_items', 'questions', 'decisions', 'tone_analysis'],
        },
        {
          timeout: 30000,
        }
      );

      const insights = aiResponse.data;

      // Save insights to database
      const savedInsights = [];

      for (const actionItem of insights.actionItems || []) {
        const insight = await prisma.liveInsight.create({
          data: {
            liveSessionId: sessionId,
            insightType: 'action_item',
            content: actionItem.content || actionItem.task || actionItem,
            confidence: actionItem.confidence || 0.8,
            timestampSeconds: Date.now() / 1000,
            speaker: actionItem.speaker,
            metadata: actionItem,
          },
        });
        savedInsights.push(insight);
      }

      for (const question of insights.questions || []) {
        const insight = await prisma.liveInsight.create({
          data: {
            liveSessionId: sessionId,
            insightType: 'question',
            content: question.content || question,
            confidence: question.confidence || 0.8,
            timestampSeconds: Date.now() / 1000,
            speaker: question.speaker,
            metadata: question,
          },
        });
        savedInsights.push(insight);
      }

      logger.info(`Generated ${savedInsights.length} AI insights for session ${sessionId}`);

      res.json({
        success: true,
        insights: {
          actionItems: insights.actionItems || [],
          questions: insights.questions || [],
          decisions: insights.decisions || [],
          toneAnalysis: insights.toneAnalysis || {},
          speakingTime: insights.speakingTime || {},
          keywords: insights.keywords || [],
        },
        savedCount: savedInsights.length,
      });
    } catch (error: any) {
      logger.error('Error getting AI suggestions:', error);
      res.status(500).json({
        error: 'Failed to get AI suggestions',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/live/:sessionId/insights
 * Get all AI insights for a live session
 */
router.get(
  '/:sessionId/insights',
  [
    param('sessionId').isUUID(),
    query('type').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { type } = req.query;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const where: any = { liveSessionId: sessionId };
      if (type) {
        where.insightType = type;
      }

      const insights = await prisma.liveInsight.findMany({
        where,
        orderBy: { timestampSeconds: 'desc' },
      });

      res.json({
        success: true,
        insights,
        count: insights.length,
      });
    } catch (error) {
      logger.error('Error fetching insights:', error);
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  }
);

/**
 * GET /api/live/:sessionId/transcripts
 * Get live transcript segments
 */
router.get(
  '/:sessionId/transcripts',
  [
    param('sessionId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const [segments, totalCount] = await Promise.all([
        prisma.liveTranscriptSegment.findMany({
          where: { liveSessionId: sessionId },
          orderBy: { startTime: 'asc' },
          skip: offset,
          take: limit,
        }),
        prisma.liveTranscriptSegment.count({
          where: { liveSessionId: sessionId },
        }),
      ]);

      res.json({
        success: true,
        segments,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      });
    } catch (error) {
      logger.error('Error fetching transcripts:', error);
      res.status(500).json({ error: 'Failed to fetch transcripts' });
    }
  }
);

/**
 * GET /api/live/:sessionId/reactions
 * Get reactions for a live session
 */
router.get(
  '/:sessionId/reactions',
  [param('sessionId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const reactions = await prisma.liveReaction.findMany({
        where: { liveSessionId: sessionId },
        orderBy: { timestampSeconds: 'desc' },
        take: 100,
      });

      res.json({
        success: true,
        reactions,
        count: reactions.length,
      });
    } catch (error) {
      logger.error('Error fetching reactions:', error);
      res.status(500).json({ error: 'Failed to fetch reactions' });
    }
  }
);

/**
 * GET /api/live/:meetingId/active-session
 * Get active live session for a meeting
 */
router.get(
  '/:meetingId/active-session',
  [param('meetingId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { meetingId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          meetingId,
          status: { in: ['active', 'paused'] },
          meeting: {
            organizationId: user.organizationId,
          },
        },
        include: {
          bookmarks: {
            take: 10,
            orderBy: { timestampSeconds: 'desc' },
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'No active live session found' });
      }

      res.json({
        success: true,
        liveSession,
      });
    } catch (error) {
      logger.error('Error fetching active session:', error);
      res.status(500).json({ error: 'Failed to fetch active session' });
    }
  }
);

export default router;
