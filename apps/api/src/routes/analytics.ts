/**
 * Analytics Routes
 * Dashboard analytics, reports, and insights
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { query, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'analytics-routes' },
  transports: [new winston.transports.Console()],
});

router.use(authMiddleware);

/**
 * GET /api/analytics/dashboard
 * Get dashboard overview analytics
 */
router.get(
  '/dashboard',
  [
    query('period').optional().isIn(['day', 'week', 'month', '30days', '90days']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { period = '30days', startDate, endDate } = req.query;

      // Calculate date range
      let start: Date;
      let end: Date = new Date();

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        switch (period) {
          case 'day':
            start = startOfDay(new Date());
            end = endOfDay(new Date());
            break;
          case 'week':
            start = startOfWeek(new Date());
            end = endOfWeek(new Date());
            break;
          case 'month':
            start = startOfMonth(new Date());
            end = endOfMonth(new Date());
            break;
          case '30days':
            start = subDays(new Date(), 30);
            break;
          case '90days':
            start = subDays(new Date(), 90);
            break;
          default:
            start = subDays(new Date(), 30);
        }
      }

      // Check cache
      const cacheKey = `analytics:dashboard:${organizationId}:${start.toISOString()}:${end.toISOString()}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      // Parallel queries for performance
      const [
        totalMeetings,
        completedMeetings,
        totalDuration,
        totalTranscripts,
        totalSummaries,
        totalComments,
        activeUsers,
        meetingsByDay,
        topParticipants,
      ] = await Promise.all([
        // Total meetings
        prisma.meeting.count({
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
          },
        }),

        // Completed meetings
        prisma.meeting.count({
          where: {
            organizationId,
            status: 'completed',
            createdAt: { gte: start, lte: end },
          },
        }),

        // Total duration
        prisma.meeting.aggregate({
          where: {
            organizationId,
            status: 'completed',
            createdAt: { gte: start, lte: end },
          },
          _sum: { durationSeconds: true },
        }),

        // Total transcripts
        prisma.transcript.count({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
        }),

        // Total summaries
        prisma.meetingSummary.count({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
        }),

        // Total comments
        prisma.comment.count({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
        }),

        // Active users
        prisma.user.count({
          where: {
            organizationId,
            lastLoginAt: { gte: start },
          },
        }),

        // Meetings by day (for trend chart)
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "Meeting"
          WHERE organization_id = ${organizationId}
            AND created_at >= ${start}
            AND created_at <= ${end}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `,

        // Top participants (most active)
        prisma.meetingParticipant.groupBy({
          by: ['email'],
          where: {
            meeting: {
              organizationId,
              createdAt: { gte: start, lte: end },
            },
          },
          _count: { id: true },
          _sum: { talkTimeSeconds: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      const analytics = {
        period: { start, end },
        overview: {
          totalMeetings,
          completedMeetings,
          totalDurationMinutes: Math.floor((totalDuration._sum.durationSeconds || 0) / 60),
          totalTranscripts,
          totalSummaries,
          totalComments,
          activeUsers,
          averageMeetingDuration: completedMeetings > 0 ? Math.floor((totalDuration._sum.durationSeconds || 0) / completedMeetings / 60) : 0,
        },
        trends: {
          meetingsByDay: (meetingsByDay as any[]).map((row: any) => ({
            date: row.date,
            count: Number(row.count),
          })),
        },
        topParticipants: topParticipants.map((p) => ({
          email: p.email,
          meetingCount: p._count.id,
          totalTalkTimeMinutes: Math.floor((p._sum.talkTimeSeconds || 0) / 60),
        })),
      };

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(analytics));

      res.json(analytics);
    } catch (error) {
      logger.error('Error fetching dashboard analytics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
    }
  }
);

/**
 * GET /api/analytics/meetings
 * Get meeting analytics
 */
router.get(
  '/meetings',
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [meetingsByStatus, meetingsByPlatform, averageParticipants] = await Promise.all([
        // Meetings by status
        prisma.meeting.groupBy({
          by: ['status'],
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),

        // Meetings by platform
        prisma.meeting.groupBy({
          by: ['platform'],
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),

        // Average participants
        prisma.meeting.aggregate({
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
          },
          _avg: { participantCount: true },
        }),
      ]);

      res.json({
        period: { start, end },
        byStatus: meetingsByStatus.map((m) => ({
          status: m.status,
          count: m._count.id,
        })),
        byPlatform: meetingsByPlatform
          .filter((m) => m.platform)
          .map((m) => ({
            platform: m.platform,
            count: m._count.id,
          })),
        averageParticipants: Math.round(averageParticipants._avg.participantCount || 0),
      });
    } catch (error) {
      logger.error('Error fetching meeting analytics:', error);
      res.status(500).json({ error: 'Failed to fetch meeting analytics' });
    }
  }
);

/**
 * GET /api/analytics/transcripts
 * Get transcript analytics
 */
router.get(
  '/transcripts',
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [totalTranscripts, avgConfidence, totalWords, languageDistribution] = await Promise.all([
        prisma.transcript.count({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
        }),

        prisma.transcript.aggregate({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
          _avg: { confidenceScore: true },
        }),

        prisma.transcript.aggregate({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
          _sum: { wordCount: true },
        }),

        prisma.transcript.groupBy({
          by: ['language'],
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),
      ]);

      res.json({
        period: { start, end },
        totalTranscripts,
        averageConfidence: avgConfidence._avg.confidenceScore || 0,
        totalWords: totalWords._sum.wordCount || 0,
        languageDistribution: languageDistribution.map((l) => ({
          language: l.language,
          count: l._count.id,
        })),
      });
    } catch (error) {
      logger.error('Error fetching transcript analytics:', error);
      res.status(500).json({ error: 'Failed to fetch transcript analytics' });
    }
  }
);

/**
 * GET /api/analytics/users
 * Get user analytics
 */
router.get(
  '/users',
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [totalUsers, activeUsers, usersByRole, newUsers] = await Promise.all([
        prisma.user.count({ where: { organizationId } }),

        prisma.user.count({
          where: {
            organizationId,
            lastLoginAt: { gte: start },
          },
        }),

        prisma.user.groupBy({
          by: ['role'],
          where: { organizationId },
          _count: { id: true },
        }),

        prisma.user.count({
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
          },
        }),
      ]);

      res.json({
        period: { start, end },
        totalUsers,
        activeUsers,
        byRole: usersByRole.map((u) => ({
          role: u.role,
          count: u._count.id,
        })),
        newUsers,
        activityRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) + '%' : '0%',
      });
    } catch (error) {
      logger.error('Error fetching user analytics:', error);
      res.status(500).json({ error: 'Failed to fetch user analytics' });
    }
  }
);

/**
 * GET /api/analytics/engagement
 * Get engagement analytics
 */
router.get(
  '/engagement',
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [totalComments, totalSoundbites, commentsByMeeting, soundbitesByMeeting] = await Promise.all([
        prisma.comment.count({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
        }),

        prisma.soundbite.count({
          where: {
            meeting: { organizationId },
            createdAt: { gte: start, lte: end },
          },
        }),

        prisma.meeting.findMany({
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            title: true,
            _count: { select: { comments: true } },
          },
          orderBy: { comments: { _count: 'desc' } },
          take: 10,
        }),

        prisma.meeting.findMany({
          where: {
            organizationId,
            createdAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            title: true,
            _count: { select: { soundbites: true } },
          },
          orderBy: { soundbites: { _count: 'desc' } },
          take: 10,
        }),
      ]);

      res.json({
        period: { start, end },
        totalComments,
        totalSoundbites,
        mostCommentedMeetings: commentsByMeeting.map((m) => ({
          id: m.id,
          title: m.title,
          commentCount: m._count.comments,
        })),
        mostClippedMeetings: soundbitesByMeeting.map((m) => ({
          id: m.id,
          title: m.title,
          clipCount: m._count.soundbites,
        })),
      });
    } catch (error) {
      logger.error('Error fetching engagement analytics:', error);
      res.status(500).json({ error: 'Failed to fetch engagement analytics' });
    }
  }
);

/**
 * GET /api/analytics/speaker/:participantId
 * Get speaker analytics for a specific participant
 */
router.get(
  '/speaker/:email',
  [param('email').isEmail(), query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      const organizationId = (req as any).user.organizationId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [participantStats, meetingsAttended] = await Promise.all([
        prisma.meetingParticipant.aggregate({
          where: {
            email,
            meeting: {
              organizationId,
              createdAt: { gte: start, lte: end },
            },
          },
          _count: { id: true },
          _sum: { talkTimeSeconds: true },
          _avg: { talkTimeSeconds: true },
        }),

        prisma.meetingParticipant.findMany({
          where: {
            email,
            meeting: {
              organizationId,
              createdAt: { gte: start, lte: end },
            },
          },
          include: {
            meeting: {
              select: {
                id: true,
                title: true,
                scheduledStartAt: true,
                durationSeconds: true,
              },
            },
          },
          orderBy: { meeting: { scheduledStartAt: 'desc' } },
          take: 20,
        }),
      ]);

      res.json({
        period: { start, end },
        email,
        statistics: {
          meetingsAttended: participantStats._count.id,
          totalTalkTimeMinutes: Math.floor((participantStats._sum.talkTimeSeconds || 0) / 60),
          averageTalkTimeMinutes: Math.floor((participantStats._avg.talkTimeSeconds || 0) / 60),
        },
        recentMeetings: meetingsAttended.map((p) => ({
          meetingId: p.meeting.id,
          title: p.meeting.title,
          date: p.meeting.scheduledStartAt,
          talkTimeMinutes: Math.floor(p.talkTimeSeconds / 60),
          talkTimePercentage:
            p.meeting.durationSeconds > 0 ? ((p.talkTimeSeconds / p.meeting.durationSeconds) * 100).toFixed(1) + '%' : '0%',
        })),
      });
    } catch (error) {
      logger.error('Error fetching speaker analytics:', error);
      res.status(500).json({ error: 'Failed to fetch speaker analytics' });
    }
  }
);

export default router;
