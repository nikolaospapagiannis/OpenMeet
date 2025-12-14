/**
 * Meeting Quality Routes
 * API endpoints for meeting quality scoring and team quality analytics
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { param, query, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permission-check';
import { meetingQualityService } from '../services/ai/MeetingQualityService';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'quality-routes' },
  transports: [new winston.transports.Console()],
});

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/meetings/:id/quality
 * Get quality score for a specific meeting
 */
router.get(
  '/:id/quality',
  requirePermission('meetings.read'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const organizationId = (req as any).user.organizationId;

      // Verify meeting access
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      if (meeting.organizationId !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Get existing quality score
      let qualityScore = await meetingQualityService.getQualityScore(meetingId);

      // If no score exists, generate one
      if (!qualityScore) {
        logger.info('Generating quality score', { meetingId });
        qualityScore = await meetingQualityService.scoreMeeting({
          meetingId,
          organizationId,
          userId: (req as any).user.id
        });
      }

      res.json({
        success: true,
        qualityScore
      });
    } catch (error: any) {
      logger.error('Failed to get quality score', { error: error.message });
      res.status(500).json({
        error: 'Failed to get quality score',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/meetings/:id/quality
 * Generate or regenerate quality score for a meeting
 */
router.post(
  '/:id/quality',
  requirePermission('meetings.update'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      // Verify meeting access
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      if (meeting.organizationId !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Generate quality score
      logger.info('Generating quality score', { meetingId });
      const qualityScore = await meetingQualityService.scoreMeeting({
        meetingId,
        organizationId,
        userId
      });

      res.json({
        success: true,
        qualityScore
      });
    } catch (error: any) {
      logger.error('Failed to generate quality score', { error: error.message });
      res.status(500).json({
        error: 'Failed to generate quality score',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/quality/trends
 * Get quality trends for the organization
 */
router.get(
  '/trends',
  requirePermission('analytics.read'),
  [query('period').optional().isIn(['week', 'month', 'quarter'])],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const period = (req.query.period as 'week' | 'month' | 'quarter') || 'month';

      const trends = await meetingQualityService.getTeamQualityTrends(
        organizationId,
        period
      );

      res.json({
        success: true,
        trends
      });
    } catch (error: any) {
      logger.error('Failed to get quality trends', { error: error.message });
      res.status(500).json({
        error: 'Failed to get quality trends',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/quality/team/:teamId
 * Get quality statistics for a specific team/workspace
 */
router.get(
  '/team/:teamId',
  requirePermission('analytics.read'),
  [
    param('teamId').isUUID(),
    query('period').optional().isIn(['week', 'month', 'quarter']),
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

      const teamId = req.params.teamId;
      const organizationId = (req as any).user.organizationId;
      const period = (req.query.period as 'week' | 'month' | 'quarter') || 'month';

      // Verify team access
      const workspace = await prisma.workspace.findUnique({
        where: { id: teamId }
      });

      if (!workspace) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      if (workspace.organizationId !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Build date range
      const now = new Date();
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(now.getTime() - (period === 'week' ? 7 : period === 'month' ? 30 : 90) * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : now;

      // Get quality scores for team meetings
      const scores = await prisma.qualityScore.findMany({
        where: {
          organizationId,
          meeting: {
            workspaceId: teamId,
            scheduledStartAt: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              scheduledStartAt: true,
              durationSeconds: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate statistics
      const stats = {
        totalMeetings: scores.length,
        averageScore: scores.length > 0
          ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
          : 0,
        averageEngagement: scores.length > 0
          ? scores.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / scores.length
          : 0,
        averageParticipation: scores.length > 0
          ? scores.reduce((sum, s) => sum + (s.participationBalance || 0), 0) / scores.length
          : 0,
        averageProductivity: scores.length > 0
          ? scores.reduce((sum, s) => sum + (s.productivityScore || 0), 0) / scores.length
          : 0,
        topScores: scores
          .sort((a, b) => b.overallScore - a.overallScore)
          .slice(0, 5)
          .map(s => ({
            meetingId: s.meetingId,
            title: s.meeting.title,
            score: s.overallScore,
            date: s.meeting.scheduledStartAt
          })),
        bottomScores: scores
          .sort((a, b) => a.overallScore - b.overallScore)
          .slice(0, 5)
          .map(s => ({
            meetingId: s.meetingId,
            title: s.meeting.title,
            score: s.overallScore,
            date: s.meeting.scheduledStartAt
          })),
        recentScores: scores.slice(0, 10).map(s => ({
          meetingId: s.meetingId,
          title: s.meeting.title,
          score: s.overallScore,
          date: s.meeting.scheduledStartAt,
          factors: s.factors
        }))
      };

      res.json({
        success: true,
        teamId,
        period,
        dateRange: { startDate, endDate },
        stats
      });
    } catch (error: any) {
      logger.error('Failed to get team quality stats', { error: error.message });
      res.status(500).json({
        error: 'Failed to get team quality stats',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/quality/benchmarks
 * Get quality benchmarks and comparisons
 */
router.get(
  '/benchmarks',
  requirePermission('analytics.read'),
  [query('industry').optional().isString()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const industry = req.query.industry as string | undefined;

      const benchmarks = await meetingQualityService.getQualityBenchmarks(
        organizationId,
        industry
      );

      res.json({
        success: true,
        benchmarks
      });
    } catch (error: any) {
      logger.error('Failed to get quality benchmarks', { error: error.message });
      res.status(500).json({
        error: 'Failed to get quality benchmarks',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/quality/recommendations
 * Get personalized quality improvement recommendations
 */
router.get(
  '/recommendations',
  requirePermission('analytics.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;

      // Get recent quality trends
      const trends = await meetingQualityService.getTeamQualityTrends(
        organizationId,
        'month'
      );

      // Get recent quality scores
      const recentScores = await prisma.qualityScore.findMany({
        where: { organizationId },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });

      // Analyze patterns and generate recommendations
      const recommendations: any[] = [];

      if (recentScores.length > 0) {
        // Check participation balance
        const avgParticipation = recentScores.reduce((sum, s) =>
          sum + (s.participationBalance || 0), 0) / recentScores.length;

        if (avgParticipation < 60) {
          recommendations.push({
            category: 'participation',
            priority: 'high',
            title: 'Improve Participation Balance',
            description: 'Recent meetings show unbalanced participation',
            suggestion: 'Use round-robin facilitation or explicitly invite quieter participants to share',
            impact: 'high',
            effort: 'low'
          });
        }

        // Check actionability
        const avgActionability = recentScores.reduce((sum, s) =>
          sum + (s.actionabilityScore || 0), 0) / recentScores.length;

        if (avgActionability < 65) {
          recommendations.push({
            category: 'outcomes',
            priority: 'high',
            title: 'Improve Meeting Outcomes',
            description: 'Meetings need clearer action items and owners',
            suggestion: 'End each meeting with explicit action items, owners, and deadlines',
            impact: 'high',
            effort: 'low'
          });
        }

        // Check time management
        const avgTimeManagement = recentScores.reduce((sum, s) =>
          sum + (s.timeManagementScore || 0), 0) / recentScores.length;

        if (avgTimeManagement < 70) {
          recommendations.push({
            category: 'efficiency',
            priority: 'medium',
            title: 'Better Time Management',
            description: 'Meetings frequently run over time or lack focus',
            suggestion: 'Use structured agendas with time allocations for each topic',
            impact: 'medium',
            effort: 'low'
          });
        }

        // Check engagement
        const avgEngagement = recentScores.reduce((sum, s) =>
          sum + (s.engagementScore || 0), 0) / recentScores.length;

        if (avgEngagement < 65) {
          recommendations.push({
            category: 'engagement',
            priority: 'medium',
            title: 'Increase Engagement',
            description: 'Participants seem disengaged during meetings',
            suggestion: 'Start with check-ins, use interactive formats, reduce meeting frequency',
            impact: 'high',
            effort: 'medium'
          });
        }

        // Check clarity
        const avgClarity = recentScores.reduce((sum, s) =>
          sum + (s.clarityScore || 0), 0) / recentScores.length;

        if (avgClarity < 70) {
          recommendations.push({
            category: 'clarity',
            priority: 'medium',
            title: 'Improve Outcome Clarity',
            description: 'Meeting outcomes and decisions are unclear',
            suggestion: 'Document decisions explicitly and share summary within 24 hours',
            impact: 'high',
            effort: 'low'
          });
        }
      }

      // Add general best practices
      if (trends.averageScore < 75) {
        recommendations.push({
          category: 'general',
          priority: 'medium',
          title: 'Adopt Meeting Best Practices',
          description: 'Overall meeting quality could be improved',
          suggestion: 'Review meeting best practices: clear agendas, time limits, engaged participants',
          impact: 'high',
          effort: 'medium'
        });
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort((a, b) =>
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
      );

      res.json({
        success: true,
        recommendations: recommendations.slice(0, 10), // Top 10 recommendations
        summary: {
          totalRecommendations: recommendations.length,
          highPriority: recommendations.filter(r => r.priority === 'high').length,
          averageQuality: trends.averageScore,
          trend: trends.trend
        }
      });
    } catch (error: any) {
      logger.error('Failed to get recommendations', { error: error.message });
      res.status(500).json({
        error: 'Failed to get recommendations',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/quality/leaderboard
 * Get organization-wide quality leaderboard
 */
router.get(
  '/leaderboard',
  requirePermission('analytics.read'),
  [
    query('period').optional().isIn(['week', 'month', 'quarter']),
    query('groupBy').optional().isIn(['user', 'team', 'meeting_type']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const period = (req.query.period as 'week' | 'month' | 'quarter') || 'month';
      const groupBy = (req.query.groupBy as string) || 'team';
      const limit = parseInt(req.query.limit as string) || 10;

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
      }

      // Get quality scores for period
      const scores = await prisma.qualityScore.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate
          }
        },
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
              userId: true,
              metadata: true
            }
          }
        }
      });

      let leaderboard: any[] = [];

      if (groupBy === 'team') {
        // Group by workspace
        const teamScores = new Map<string, { scores: number[]; workspace: any }>();

        for (const score of scores) {
          if (!score.meeting.workspaceId) continue;

          const existing = teamScores.get(score.meeting.workspaceId) || {
            scores: [],
            workspace: null
          };
          existing.scores.push(score.overallScore);
          teamScores.set(score.meeting.workspaceId, existing);
        }

        // Get workspace details
        const workspaceIds = Array.from(teamScores.keys());
        const workspaces = await prisma.workspace.findMany({
          where: { id: { in: workspaceIds } }
        });

        for (const workspace of workspaces) {
          const data = teamScores.get(workspace.id);
          if (!data) continue;

          leaderboard.push({
            id: workspace.id,
            name: workspace.name,
            averageScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
            meetingCount: data.scores.length,
            type: 'team'
          });
        }
      } else if (groupBy === 'user') {
        // Group by user
        const userScores = new Map<string, number[]>();

        for (const score of scores) {
          if (!score.userId) continue;

          const existing = userScores.get(score.userId) || [];
          existing.push(score.overallScore);
          userScores.set(score.userId, existing);
        }

        for (const [userId, userScoresList] of userScores) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          });

          if (!user) continue;

          leaderboard.push({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            averageScore: userScoresList.reduce((sum, s) => sum + s, 0) / userScoresList.length,
            meetingCount: userScoresList.length,
            type: 'user'
          });
        }
      }

      // Sort by average score
      leaderboard.sort((a, b) => b.averageScore - a.averageScore);
      leaderboard = leaderboard.slice(0, limit);

      // Add ranks
      leaderboard.forEach((item, index) => {
        item.rank = index + 1;
      });

      res.json({
        success: true,
        leaderboard,
        period,
        groupBy
      });
    } catch (error: any) {
      logger.error('Failed to get leaderboard', { error: error.message });
      res.status(500).json({
        error: 'Failed to get leaderboard',
        message: error.message
      });
    }
  }
);

export default router;
