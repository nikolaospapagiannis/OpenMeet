/**
 * Admin Overview Routes
 * Platform overview and KPIs for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();

// Get platform overview stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Execute queries in parallel
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      newOrgsThisMonth,
      totalUsers,
      activeUsersToday,
      activeUsersWeek,
      activeUsersMonth,
      newUsersThisMonth,
      subscriptionsByTier,
      meetingsCount,
      meetingsThisMonth,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'active' } }),
      prisma.organization.count({ where: { status: 'suspended' } }),
      prisma.organization.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: { lastLoginAt: { gte: oneDayAgo } },
      }),
      prisma.user.count({
        where: { lastLoginAt: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({
        where: { lastLoginAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.organization.groupBy({
        by: ['tier'],
        _count: true,
      }),
      prisma.meeting.count(),
      prisma.meeting.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Calculate growth rates
    const orgGrowthRate = totalOrganizations > 0
      ? ((newOrgsThisMonth / totalOrganizations) * 100).toFixed(2)
      : 0;

    const userGrowthRate = totalUsers > 0
      ? ((newUsersThisMonth / totalUsers) * 100).toFixed(2)
      : 0;

    // Format subscription tiers
    const tierDistribution = subscriptionsByTier.reduce(
      (acc, { tier, _count }) => {
        acc[tier] = _count;
        return acc;
      },
      {} as Record<string, number>
    );

    res.json({
      success: true,
      data: {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          suspended: suspendedOrganizations,
          newThisMonth: newOrgsThisMonth,
          growthRate: parseFloat(orgGrowthRate as string),
        },
        users: {
          total: totalUsers,
          dau: activeUsersToday,
          wau: activeUsersWeek,
          mau: activeUsersMonth,
          newThisMonth: newUsersThisMonth,
          growthRate: parseFloat(userGrowthRate as string),
        },
        subscriptions: {
          distribution: tierDistribution,
        },
        meetings: {
          total: meetingsCount,
          thisMonth: meetingsThisMonth,
        },
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching overview stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview stats',
    });
  }
});

// Get recent activity
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const recentActivity = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: recentActivity,
    });
  } catch (error) {
    logger.error('Error fetching recent activity', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity',
    });
  }
});

// Get top organizations by usage
router.get('/top-organizations', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const topOrgs = await prisma.organization.findMany({
      take: limit,
      where: { status: 'active' },
      orderBy: { healthScore: 'desc' },
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
          },
        },
      },
    });

    res.json({
      success: true,
      data: topOrgs.map((org) => ({
        ...org,
        userCount: org._count.users,
        meetingCount: org._count.meetings,
        _count: undefined,
      })),
    });
  } catch (error) {
    logger.error('Error fetching top organizations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top organizations',
    });
  }
});

// Get system health
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    // Get recent error counts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const errorCount = await prisma.auditLog.count({
      where: {
        action: { contains: 'error' },
        createdAt: { gte: oneHourAgo },
      },
    });

    res.json({
      success: true,
      data: {
        database: {
          status: 'healthy',
          latencyMs: dbLatency,
        },
        api: {
          status: 'healthy',
          uptime: process.uptime(),
        },
        errors: {
          lastHour: errorCount,
        },
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
      },
    });
  } catch (error) {
    logger.error('Error checking system health', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check system health',
    });
  }
});

export default router;
