/**
 * Public API v1
 *
 * Public REST API for developers
 * Competitive Feature: Matches Fathom Public API
 *
 * Authentication: API Key (Bearer token)
 * Rate Limiting: Per API key
 * Scopes: read, write, delete, admin
 */

import { Router, Request, Response } from 'express';
import { param, query, body, validationResult } from 'express-validator';
import { apiKeyAuthMiddleware, requireScopes, APIKeyRequest } from '../middleware/apiKeyAuth';
import { PrismaClient } from '@prisma/client';
import { aiQueryService } from '../services/AIQueryService';
import { logger } from '../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();

// Apply API key authentication to all routes
router.use(apiKeyAuthMiddleware);

/**
 * GET /v1/meetings
 * List all meetings for organization
 */
router.get(
  '/meetings',
  requireScopes('read'),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;

      const where: any = {
        organizationId: req.apiKey!.organizationId,
      };

      if (status) {
        where.status = status;
      }

      const meetings = await prisma.meeting.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: true,
          summaries: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const total = await prisma.meeting.count({ where });

      res.json({
        success: true,
        meetings: meetings.map(m => ({
          id: m.id,
          title: m.title,
          status: m.status,
          scheduledStartAt: m.scheduledStartAt,
          actualStartAt: m.actualStartAt,
          actualEndAt: m.actualEndAt,
          durationSeconds: m.durationSeconds || m.duration,
          participants: m.participants.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
          })),
          summary: m.summaries[0] ? {
            content: m.summaries[0].overview,
            keyPoints: m.summaries[0].keyPoints,
            actionItems: m.summaries[0].actionItems,
          } : null,
          createdAt: m.createdAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error: any) {
      logger.error('Error listing meetings', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list meetings',
      });
    }
  }
);

/**
 * GET /v1/meetings/:id
 * Get specific meeting details
 */
router.get(
  '/meetings/:id',
  requireScopes('read'),
  [param('id').isString().notEmpty()],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const meeting = await prisma.meeting.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
        include: {
          participants: true,
          summaries: true,
          analytics: true,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        meeting: {
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
          metadata: meeting.metadata,
          createdAt: meeting.createdAt,
          updatedAt: meeting.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error getting meeting', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get meeting',
      });
    }
  }
);

/**
 * GET /v1/meetings/:id/transcript
 * Get meeting transcript
 */
router.get(
  '/meetings/:id/transcript',
  requireScopes('read'),
  [param('id').isString().notEmpty()],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const meeting = await prisma.meeting.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
        });
      }

      // Get the latest transcript for the meeting
      const transcript = await prisma.transcript.findFirst({
        where: {
          meetingId: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!transcript || !transcript.mongodbId) {
        return res.status(404).json({
          success: false,
          error: 'Transcript not available',
        });
      }

      // Import Transcript service
      const { transcriptService } = await import('../services/TranscriptService');

      const segments = await transcriptService.getTranscriptSegments(transcript.mongodbId);
      const text = segments.map(s => s.text).join(' ');

      res.json({
        success: true,
        transcript: {
          meetingId: id,
          transcriptId: transcript.id,
          text: text,
          segments: segments.map(s => ({
            speaker: s.speaker,
            text: s.text,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Error getting transcript', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get transcript',
      });
    }
  }
);

/**
 * POST /v1/ai/ask
 * Ask AI question across all meetings
 */
router.post(
  '/ai/ask',
  requireScopes('read'),
  [body('question').isString().notEmpty()],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { question } = req.body;

      const answer = await aiQueryService.askQuestion(
        req.apiKey!.userId,
        question
      );

      res.json({
        success: true,
        question,
        answer,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error answering AI question', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to answer question',
      });
    }
  }
);

/**
 * POST /v1/ai/super-summary
 * Generate super summary across meetings
 */
router.post(
  '/ai/super-summary',
  requireScopes('read'),
  [
    body('timeframe').optional().isString(),
    body('meetingTypes').optional().isArray(),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Convert timeframe to dateFrom/dateTo
      const timeframe = req.body.timeframe || '30d';
      const days = parseInt(timeframe.replace('d', ''), 10) || 30;
      const dateTo = new Date();
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const criteria = {
        dateFrom,
        dateTo,
        keywords: req.body.keywords,
        tags: req.body.meetingTypes ? [req.body.meetingTypes].flat() : undefined,
      };

      const summary = await aiQueryService.generateSuperSummary(
        req.apiKey!.userId,
        criteria
      );

      res.json({
        success: true,
        summary,
        criteria,
      });
    } catch (error: any) {
      logger.error('Error generating super summary', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate summary',
      });
    }
  }
);

/**
 * POST /v1/meetings
 * Create new meeting
 */
router.post(
  '/meetings',
  requireScopes('write'),
  [
    body('title').isString().notEmpty(),
    body('scheduledStartAt').isISO8601(),
    body('participants').optional().isArray(),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, scheduledStartAt, participants, description } = req.body;

      const meeting = await prisma.meeting.create({
        data: {
          title,
          description,
          scheduledStartAt: new Date(scheduledStartAt),
          status: 'scheduled',
          organizationId: req.apiKey!.organizationId,
          userId: req.apiKey!.userId,
          createdBy: req.apiKey!.userId,
        },
      });

      res.status(201).json({
        success: true,
        meeting: {
          id: meeting.id,
          title: meeting.title,
          status: meeting.status,
          scheduledStartAt: meeting.scheduledStartAt,
          createdAt: meeting.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('Error creating meeting', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create meeting',
      });
    }
  }
);

/**
 * DELETE /v1/meetings/:id
 * Delete meeting
 */
router.delete(
  '/meetings/:id',
  requireScopes('delete'),
  [param('id').isString().notEmpty()],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      await prisma.meeting.delete({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      res.json({
        success: true,
        message: 'Meeting deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting meeting', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete meeting',
      });
    }
  }
);

/**
 * GET /v1/analytics/overview
 * Get organization analytics
 */
router.get(
  '/analytics/overview',
  requireScopes('read'),
  [query('days').optional().isInt({ min: 1, max: 365 })],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const totalMeetings = await prisma.meeting.count({
        where: {
          organizationId: req.apiKey!.organizationId,
          createdAt: { gte: since },
        },
      });

      const completedMeetings = await prisma.meeting.count({
        where: {
          organizationId: req.apiKey!.organizationId,
          status: 'completed',
          createdAt: { gte: since },
        },
      });

      const totalDuration = await prisma.meeting.aggregate({
        where: {
          organizationId: req.apiKey!.organizationId,
          status: 'completed',
          createdAt: { gte: since },
        },
        _sum: {
          durationSeconds: true,
        },
      });

      res.json({
        success: true,
        analytics: {
          period: `Last ${days} days`,
          totalMeetings,
          completedMeetings,
          totalDurationHours: Math.round((totalDuration._sum.durationSeconds || 0) / 3600),
          averageDurationMinutes: completedMeetings > 0
            ? Math.round((totalDuration._sum.durationSeconds || 0) / completedMeetings / 60)
            : 0,
        },
      });
    } catch (error: any) {
      logger.error('Error getting analytics', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get analytics',
      });
    }
  }
);

export default router;
