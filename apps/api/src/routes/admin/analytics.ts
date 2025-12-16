/**
 * Admin Analytics Routes
 * Platform analytics and BI for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();

// Get platform-wide analytics
router.get(
  '/platform',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get current period stats
      const [
        newOrgs,
        newUsers,
        newMeetings,
        activeUsers,
      ] = await Promise.all([
        prisma.organization.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.user.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.meeting.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.user.count({
          where: { lastLoginAt: { gte: thirtyDaysAgo } },
        }),
      ]);

      // Get previous period stats for comparison
      const [
        prevNewOrgs,
        prevNewUsers,
        prevNewMeetings,
      ] = await Promise.all([
        prisma.organization.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
        prisma.meeting.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
      ]);

      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat((((current - previous) / previous) * 100).toFixed(2));
      };

      res.json({
        success: true,
        data: {
          current: {
            newOrganizations: newOrgs,
            newUsers,
            newMeetings,
            activeUsers,
          },
          growth: {
            organizations: calculateGrowth(newOrgs, prevNewOrgs),
            users: calculateGrowth(newUsers, prevNewUsers),
            meetings: calculateGrowth(newMeetings, prevNewMeetings),
          },
          period: {
            start: thirtyDaysAgo.toISOString(),
            end: now.toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching platform analytics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch platform analytics',
      });
    }
  }
);

// Get usage trends over time
router.get(
  '/trends',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Get daily user signups
      const userSignups = await prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "User"
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ` as { date: Date; count: bigint }[];

      // Get daily meetings
      const meetings = await prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "Meeting"
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ` as { date: Date; count: bigint }[];

      // Get daily active users
      const activeUsers = await prisma.$queryRaw`
        SELECT DATE(last_login_at) as date, COUNT(DISTINCT id) as count
        FROM "User"
        WHERE last_login_at >= ${startDate}
        GROUP BY DATE(last_login_at)
        ORDER BY date ASC
      ` as { date: Date; count: bigint }[];

      res.json({
        success: true,
        data: {
          userSignups: userSignups.map((r) => ({
            date: r.date,
            count: Number(r.count),
          })),
          meetings: meetings.map((r) => ({
            date: r.date,
            count: Number(r.count),
          })),
          activeUsers: activeUsers.map((r) => ({
            date: r.date,
            count: Number(r.count),
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching trends', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trends',
      });
    }
  }
);

// Get feature usage analytics
router.get(
  '/feature-usage',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get meeting feature usage
      const [
        totalMeetings,
        meetingsWithTranscripts,
        meetingsWithSummaries,
        meetingsWithActionItems,
      ] = await Promise.all([
        prisma.meeting.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.meeting.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            transcripts: { some: {} },
          },
        }),
        prisma.meeting.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            summaries: { some: {} },
          },
        }),
        prisma.meeting.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            summaries: { some: { actionItems: { not: { equals: '[]' } } } },
          },
        }),
      ]);

      // Get integration usage
      const integrationUsage = await prisma.integration.groupBy({
        by: ['type'],
        _count: true,
        where: { isActive: true },
      });

      res.json({
        success: true,
        data: {
          meetings: {
            total: totalMeetings,
            withTranscripts: meetingsWithTranscripts,
            withSummaries: meetingsWithSummaries,
            withActionItems: meetingsWithActionItems,
            transcriptRate: totalMeetings > 0
              ? ((meetingsWithTranscripts / totalMeetings) * 100).toFixed(2)
              : 0,
            summaryRate: totalMeetings > 0
              ? ((meetingsWithSummaries / totalMeetings) * 100).toFixed(2)
              : 0,
          },
          integrations: integrationUsage.map((i) => ({
            type: i.type,
            count: i._count,
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching feature usage', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feature usage',
      });
    }
  }
);

// Get organization engagement scores
router.get(
  '/engagement',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const organizations = await prisma.organization.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          name: true,
          slug: true,
          tier: true,
          healthScore: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              meetings: true,
              integrations: true,
            },
          },
        },
        orderBy: { healthScore: 'desc' },
        take: limit,
      });

      res.json({
        success: true,
        data: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          tier: org.tier,
          healthScore: org.healthScore,
          userCount: org._count.users,
          meetingCount: org._count.meetings,
          integrationCount: org._count.integrations,
          createdAt: org.createdAt,
        })),
      });
    } catch (error) {
      logger.error('Error fetching engagement scores', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch engagement scores',
      });
    }
  }
);

// Get cohort analysis
router.get(
  '/cohorts',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const cohorts: any[] = [];

      for (let i = 0; i < months; i++) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - i - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        const [created, stillActive] = await Promise.all([
          prisma.organization.count({
            where: {
              createdAt: {
                gte: startDate,
                lt: endDate,
              },
            },
          }),
          prisma.organization.count({
            where: {
              createdAt: {
                gte: startDate,
                lt: endDate,
              },
              status: 'active',
            },
          }),
        ]);

        cohorts.push({
          month: startDate.toISOString().slice(0, 7),
          created,
          stillActive,
          retentionRate: created > 0
            ? ((stillActive / created) * 100).toFixed(2)
            : 0,
        });
      }

      res.json({
        success: true,
        data: cohorts.reverse(),
      });
    } catch (error) {
      logger.error('Error fetching cohort analysis', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cohort analysis',
      });
    }
  }
);

export default router;
