/**
 * Meetings Routes
 * Meeting CRUD operations, filtering, search, and management
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, MeetingStatus, RecordingSource } from '@prisma/client';
import Redis from 'ioredis';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { requirePermission, requireResourcePermission, requireAnyPermission } from '../middleware/permission-check';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { talkPatternAnalysisService } from '../services/TalkPatternAnalysisService';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const elasticsearch = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'meetings-routes' },
  transports: [new winston.transports.Console()],
});

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/meetings
 * List meetings with filtering, pagination, and search
 */
router.get(
  '/',
  requirePermission('meetings.read'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'failed', 'processing']),
    query('workspaceId').optional().isUUID(),
    query('search').optional().trim(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('sortBy').optional().isIn(['createdAt', 'scheduledStartAt', 'title', 'durationSeconds']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
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
      const {
        page = 1,
        limit = 20,
        status,
        workspaceId,
        search,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      // Build where clause
      const where: any = {
        organizationId,
      };

      if (status) where.status = status as MeetingStatus;
      if (workspaceId) where.workspaceId = workspaceId as string;
      if (startDate || endDate) {
        where.scheduledStartAt = {};
        if (startDate) where.scheduledStartAt.gte = new Date(startDate as string);
        if (endDate) where.scheduledStartAt.lte = new Date(endDate as string);
      }

      // Handle search with Elasticsearch if provided
      let meetingIds: string[] | undefined;
      if (search && typeof search === 'string') {
        try {
          const searchResult = await elasticsearch.search({
            index: 'meetings',
            body: {
              query: {
                bool: {
                  must: [
                    {
                      multi_match: {
                        query: search,
                        fields: ['title^3', 'description^2', 'participants.name'],
                        fuzziness: 'AUTO',
                      },
                    },
                    { term: { organizationId } },
                  ],
                },
              },
              _source: ['id'],
              size: 1000,
            },
          });

          meetingIds = (searchResult.hits.hits as any[]).map((hit: any) => hit._source.id);
          if (meetingIds.length === 0) {
            res.json({ data: [], total: 0, page: Number(page), limit: Number(limit) });
            return;
          }
          where.id = { in: meetingIds };
        } catch (error) {
          logger.warn('Elasticsearch search failed, falling back to database:', error);
          // Fallback to database search
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }
      }

      // Get total count
      const total = await prisma.meeting.count({ where });

      // Get meetings
      const meetings = await prisma.meeting.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
          },
          workspace: {
            select: { id: true, name: true },
          },
          participants: {
            select: { id: true, name: true, email: true, role: true, talkTimeSeconds: true },
          },
          _count: {
            select: {
              transcripts: true,
              summaries: true,
              comments: true,
              soundbites: true,
            },
          },
        },
      });

      res.json({
        data: meetings,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      logger.error('Error fetching meetings:', error);
      res.status(500).json({ error: 'Failed to fetch meetings' });
    }
  }
);

/**
 * GET /api/meetings/:id
 * Get a single meeting by ID
 */
router.get(
  '/:id',
  requireResourcePermission('meetings.read', 'id', 'meeting'),
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

      // Check cache first
      const cacheKey = `meeting:${id}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const meeting = await prisma.meeting.findFirst({
        where: { id, organizationId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
          },
          workspace: true,
          participants: {
            orderBy: { talkTimeSeconds: 'desc' },
          },
          recordings: {
            select: {
              id: true,
              fileUrl: true,
              durationSeconds: true,
              format: true,
              isVideo: true,
              transcriptionStatus: true,
              createdAt: true,
            },
          },
          transcripts: {
            where: { isFinal: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          summaries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          analytics: true,
          comments: {
            where: { parentCommentId: null },
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
              replies: {
                include: {
                  user: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          soundbites: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(meeting));

      res.json(meeting);
    } catch (error) {
      logger.error('Error fetching meeting:', error);
      res.status(500).json({ error: 'Failed to fetch meeting' });
    }
  }
);

/**
 * POST /api/meetings
 * Create a new meeting
 */
router.post(
  '/',
  requirePermission('meetings.create'),
  [
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
    body('scheduledStartAt').optional().isISO8601(),
    body('scheduledEndAt').optional().isISO8601(),
    body('workspaceId').optional().isUUID(),
    body('platform').optional().isIn(['zoom', 'teams', 'meet', 'webex', 'other']),
    body('meetingUrl').optional().isURL(),
    body('recordingSource').optional().isIn(['bot', 'extension', 'upload', 'api', 'mobile']),
    body('participants').optional().isArray(),
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
      const {
        title,
        description,
        scheduledStartAt,
        scheduledEndAt,
        workspaceId,
        platform,
        meetingUrl,
        recordingSource,
        participants,
      } = req.body;

      const meeting = await prisma.meeting.create({
        data: {
          title,
          description,
          scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
          scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : null,
          status: 'scheduled',
          platform,
          meetingUrl,
          recordingSource: recordingSource as RecordingSource,
          organizationId,
          userId,
          workspaceId,
          participants: participants
            ? {
                create: participants.map((p: any) => ({
                  email: p.email,
                  name: p.name,
                  role: p.role || 'participant',
                })),
              }
            : undefined,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          participants: true,
        },
      });

      // Index in Elasticsearch
      try {
        await elasticsearch.index({
          index: 'meetings',
          id: meeting.id,
          document: {
            id: meeting.id,
            title: meeting.title,
            description: meeting.description,
            organizationId: meeting.organizationId,
            userId: meeting.userId,
            status: meeting.status,
            scheduledStartAt: meeting.scheduledStartAt,
            participants: meeting.participants,
            createdAt: meeting.createdAt,
          },
        });
      } catch (error) {
        logger.warn('Failed to index meeting in Elasticsearch:', error);
      }

      logger.info('Meeting created:', { meetingId: meeting.id, userId, organizationId });
      res.status(201).json(meeting);
    } catch (error) {
      logger.error('Error creating meeting:', error);
      res.status(500).json({ error: 'Failed to create meeting' });
    }
  }
);

/**
 * PATCH /api/meetings/:id
 * Update a meeting
 */
router.patch(
  '/:id',
  requireResourcePermission('meetings.update', 'id', 'meeting'),
  [
    param('id').isUUID(),
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'failed', 'processing']),
    body('scheduledStartAt').optional().isISO8601(),
    body('scheduledEndAt').optional().isISO8601(),
    body('actualStartAt').optional().isISO8601(),
    body('actualEndAt').optional().isISO8601(),
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
      const updateData = req.body;

      // Convert date strings to Date objects
      if (updateData.scheduledStartAt) updateData.scheduledStartAt = new Date(updateData.scheduledStartAt);
      if (updateData.scheduledEndAt) updateData.scheduledEndAt = new Date(updateData.scheduledEndAt);
      if (updateData.actualStartAt) updateData.actualStartAt = new Date(updateData.actualStartAt);
      if (updateData.actualEndAt) updateData.actualEndAt = new Date(updateData.actualEndAt);

      // Calculate duration if both start and end times are present
      if (updateData.actualStartAt && updateData.actualEndAt) {
        const start = new Date(updateData.actualStartAt);
        const end = new Date(updateData.actualEndAt);
        updateData.durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      }

      const meeting = await prisma.meeting.updateMany({
        where: { id, organizationId },
        data: updateData,
      });

      if (meeting.count === 0) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Invalidate cache
      await redis.del(`meeting:${id}`);

      // Update Elasticsearch
      try {
        await elasticsearch.update({
          index: 'meetings',
          id,
          doc: updateData,
        });
      } catch (error) {
        logger.warn('Failed to update meeting in Elasticsearch:', error);
      }

      // Fetch updated meeting
      const updatedMeeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          participants: true,
        },
      });

      logger.info('Meeting updated:', { meetingId: id, organizationId });
      res.json(updatedMeeting);
    } catch (error) {
      logger.error('Error updating meeting:', error);
      res.status(500).json({ error: 'Failed to update meeting' });
    }
  }
);

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 */
router.delete(
  '/:id',
  requireResourcePermission('meetings.delete', 'id', 'meeting'),
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

      const meeting = await prisma.meeting.deleteMany({
        where: { id, organizationId },
      });

      if (meeting.count === 0) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Invalidate cache
      await redis.del(`meeting:${id}`);

      // Delete from Elasticsearch
      try {
        await elasticsearch.delete({
          index: 'meetings',
          id,
        });
      } catch (error) {
        logger.warn('Failed to delete meeting from Elasticsearch:', error);
      }

      logger.info('Meeting deleted:', { meetingId: id, organizationId });
      res.json({ message: 'Meeting deleted successfully' });
    } catch (error) {
      logger.error('Error deleting meeting:', error);
      res.status(500).json({ error: 'Failed to delete meeting' });
    }
  }
);

/**
 * POST /api/meetings/:id/start
 * Start a meeting (update status to in_progress)
 */
router.post(
  '/:id/start',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const meeting = await prisma.meeting.updateMany({
        where: { id, organizationId, status: 'scheduled' },
        data: {
          status: 'in_progress',
          actualStartAt: new Date(),
        },
      });

      if (meeting.count === 0) {
        res.status(404).json({ error: 'Meeting not found or already started' });
        return;
      }

      await redis.del(`meeting:${id}`);

      logger.info('Meeting started:', { meetingId: id, organizationId });
      res.json({ message: 'Meeting started successfully' });
    } catch (error) {
      logger.error('Error starting meeting:', error);
      res.status(500).json({ error: 'Failed to start meeting' });
    }
  }
);

/**
 * POST /api/meetings/:id/complete
 * Complete a meeting (update status to completed)
 */
router.post(
  '/:id/complete',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const existingMeeting = await prisma.meeting.findFirst({
        where: { id, organizationId },
      });

      if (!existingMeeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      const actualEndAt = new Date();
      const durationSeconds = existingMeeting.actualStartAt
        ? Math.floor((actualEndAt.getTime() - existingMeeting.actualStartAt.getTime()) / 1000)
        : null;

      const meeting = await prisma.meeting.update({
        where: { id },
        data: {
          status: 'completed',
          actualEndAt,
          durationSeconds,
        },
      });

      await redis.del(`meeting:${id}`);

      logger.info('Meeting completed:', { meetingId: id, organizationId, durationSeconds });
      res.json(meeting);
    } catch (error) {
      logger.error('Error completing meeting:', error);
      res.status(500).json({ error: 'Failed to complete meeting' });
    }
  }
);

/**
 * GET /api/meetings/:id/talk-patterns
 * Get talk pattern analysis for a meeting
 */
router.get(
  '/:id/talk-patterns',
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

      // Verify meeting access
      const meeting = await prisma.meeting.findFirst({
        where: { id, organizationId },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Check if analysis exists
      let analysis = await talkPatternAnalysisService.getAnalysisResults(id);

      if (!analysis) {
        // Trigger new analysis
        try {
          analysis = await talkPatternAnalysisService.analyzeMeeting(id);
        } catch (error: any) {
          logger.error('Error analyzing talk patterns:', error);
          res.status(500).json({
            error: 'Failed to analyze talk patterns',
            details: error.message
          });
          return;
        }
      }

      res.json(analysis);
    } catch (error) {
      logger.error('Error getting talk patterns:', error);
      res.status(500).json({ error: 'Failed to get talk patterns' });
    }
  }
);

/**
 * GET /api/meetings/:id/speaker-metrics
 * Get speaker metrics breakdown for a meeting
 */
router.get(
  '/:id/speaker-metrics',
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

      // Verify meeting access
      const meeting = await prisma.meeting.findFirst({
        where: { id, organizationId },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Get analysis
      let analysis = await talkPatternAnalysisService.getAnalysisResults(id);

      if (!analysis) {
        // Trigger new analysis
        try {
          analysis = await talkPatternAnalysisService.analyzeMeeting(id);
        } catch (error: any) {
          logger.error('Error analyzing speaker metrics:', error);
          res.status(500).json({
            error: 'Failed to analyze speaker metrics',
            details: error.message
          });
          return;
        }
      }

      // Return just speaker metrics
      res.json({
        meetingId: id,
        speakerMetrics: analysis.speakerMetrics || [],
        overallMetrics: analysis.overallMetrics,
        analysisTimestamp: analysis.analysisTimestamp,
      });
    } catch (error) {
      logger.error('Error getting speaker metrics:', error);
      res.status(500).json({ error: 'Failed to get speaker metrics' });
    }
  }
);

/**
 * POST /api/meetings/:id/analyze-talk-patterns
 * Trigger talk pattern analysis for a meeting
 */
router.post(
  '/:id/analyze-talk-patterns',
  requirePermission('meetings.write'),
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

      // Verify meeting access
      const meeting = await prisma.meeting.findFirst({
        where: { id, organizationId, status: 'completed' },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found or not completed' });
        return;
      }

      // Trigger analysis
      const analysis = await talkPatternAnalysisService.analyzeMeeting(id);

      logger.info('Talk pattern analysis triggered:', { meetingId: id, organizationId });
      res.json(analysis);
    } catch (error: any) {
      logger.error('Error triggering talk pattern analysis:', error);
      res.status(500).json({
        error: 'Failed to analyze talk patterns',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/meetings/participants/search
 * Search for participants across meetings
 */
router.get(
  '/participants/search',
  requirePermission('meetings.read'),
  [
    query('q').notEmpty().trim(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { q, limit = 10 } = req.query;
      const searchQuery = q as string;

      // Search participants by name or email
      const participants = await prisma.meetingParticipant.findMany({
        where: {
          meeting: { organizationId },
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        distinct: ['email'], // Ensure unique participants
        take: Number(limit),
      });

      res.json({ data: participants });
    } catch (error) {
      logger.error('Error searching participants:', error);
      res.status(500).json({ error: 'Failed to search participants' });
    }
  }
);

/**
 * POST /api/meetings/participants/batch
 * Get participant details by IDs
 */
router.post(
  '/participants/batch',
  requirePermission('meetings.read'),
  [body('ids').isArray()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { ids } = req.body;

      const participants = await prisma.meetingParticipant.findMany({
        where: {
          id: { in: ids },
          meeting: { organizationId },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      res.json({ data: participants });
    } catch (error) {
      logger.error('Error fetching participants:', error);
      res.status(500).json({ error: 'Failed to fetch participants' });
    }
  }
);

export default router;
