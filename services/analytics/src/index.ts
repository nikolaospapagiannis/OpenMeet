/**
 * Analytics Service
 * Business intelligence, reporting, and data aggregation
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import Bull from 'bull';
import winston from 'winston';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const analyticsQueue = new Bull('analytics', process.env.REDIS_URL || 'redis://localhost:6379');

app.use(express.json());

// Dashboard analytics
app.get('/api/analytics/dashboard/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Check cache
    const cacheKey = `analytics:dashboard:${organizationId}:${format(start, 'yyyy-MM-dd')}:${format(end, 'yyyy-MM-dd')}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Parallel queries for better performance
    const [
      totalMeetings,
      totalTranscriptionMinutes,
      activeUsers,
      meetingsByStatus,
      meetingTrends
    ] = await Promise.all([
      prisma.meeting.count({
        where: { organizationId, createdAt: { gte: start, lte: end } }
      }),
      prisma.meeting.aggregate({
        where: { organizationId, createdAt: { gte: start, lte: end } },
        _sum: { durationSeconds: true }
      }),
      prisma.user.count({
        where: {
          organizationId,
          lastLoginAt: { gte: subDays(new Date(), 30) }
        }
      }),
      prisma.meeting.groupBy({
        by: ['status'],
        where: { organizationId, createdAt: { gte: start, lte: end } },
        _count: true
      }),
      getMeetingTrends(organizationId, start, end)
    ]);

    const analytics = {
      totalMeetings,
      totalMinutes: Math.floor((totalTranscriptionMinutes._sum.durationSeconds || 0) / 60),
      activeUsers,
      meetingsByStatus: meetingsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      trends: meetingTrends
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(analytics));

    res.json(analytics);
  } catch (error: any) {
    logger.error('Dashboard analytics failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Speaker analytics
app.get('/api/analytics/speakers/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const participants = await prisma.meetingParticipant.findMany({
      where: { meetingId },
      select: {
        name: true,
        email: true,
        talkTimeSeconds: true,
        joinedAt: true,
        leftAt: true
      }
    });

    const totalTalkTime = participants.reduce((sum, p) => sum + p.talkTimeSeconds, 0);

    const analytics = participants.map(p => ({
      ...p,
      talkTimePercentage: totalTalkTime > 0 ? (p.talkTimeSeconds / totalTalkTime) * 100 : 0,
      duration: p.leftAt && p.joinedAt
        ? Math.floor((p.leftAt.getTime() - p.joinedAt.getTime()) / 1000)
        : 0
    }));

    res.json({ participants: analytics, totalTalkTime });
  } catch (error: any) {
    logger.error('Speaker analytics failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get speaker analytics' });
  }
});

// Organization analytics
app.get('/api/analytics/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    const [
      userCount,
      meetingCount,
      storageUsed,
      integrationCount,
      topUsers
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.meeting.count({ where: { organizationId } }),
      getStorageUsed(organizationId),
      prisma.integration.count({ where: { organizationId } }),
      getTopUsers(organizationId)
    ]);

    res.json({
      users: userCount,
      meetings: meetingCount,
      storageGB: storageUsed,
      integrations: integrationCount,
      topUsers
    });
  } catch (error: any) {
    logger.error('Organization analytics failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get organization analytics' });
  }
});

// Usage analytics
app.get('/api/analytics/usage/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { period = '30d' } = req.query;

    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);

    const usage = await prisma.usageMetric.groupBy({
      by: ['metricType'],
      where: {
        organizationId,
        timestamp: { gte: startDate }
      },
      _sum: { quantity: true }
    });

    const formattedUsage = usage.reduce((acc, item) => {
      acc[item.metricType] = item._sum.quantity || 0;
      return acc;
    }, {} as Record<string, number>);

    res.json({ usage: formattedUsage, period: `${days}d` });
  } catch (error: any) {
    logger.error('Usage analytics failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get usage analytics' });
  }
});

// Track event
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { userId, organizationId, event, properties } = req.body;

    await analyticsQueue.add('track-event', {
      userId,
      organizationId,
      event,
      properties,
      timestamp: new Date()
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Event tracking failed', { error: error.message });
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Helper functions
async function getMeetingTrends(organizationId: string, start: Date, end: Date) {
  const meetings = await prisma.meeting.findMany({
    where: {
      organizationId,
      createdAt: { gte: start, lte: end }
    },
    select: { createdAt: true, durationSeconds: true }
  });

  const trendMap = new Map<string, { count: number; totalDuration: number }>();

  meetings.forEach(meeting => {
    const day = format(meeting.createdAt, 'yyyy-MM-dd');
    const existing = trendMap.get(day) || { count: 0, totalDuration: 0 };
    trendMap.set(day, {
      count: existing.count + 1,
      totalDuration: existing.totalDuration + (meeting.durationSeconds || 0)
    });
  });

  return Array.from(trendMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    avgDuration: data.count > 0 ? Math.floor(data.totalDuration / data.count / 60) : 0
  }));
}

async function getStorageUsed(organizationId: string): Promise<number> {
  const recordings = await prisma.meetingRecording.aggregate({
    where: {
      meeting: { organizationId }
    },
    _sum: { fileSizeBytes: true }
  });

  const bytes = Number(recordings._sum.fileSizeBytes || 0);
  return parseFloat((bytes / 1024 / 1024 / 1024).toFixed(2)); // GB
}

async function getTopUsers(organizationId: string, limit = 5) {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      _count: { select: { meetings: true } }
    },
    orderBy: { meetings: { _count: 'desc' } },
    take: limit
  });

  return users.map(u => ({
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    meetingCount: u._count.meetings
  }));
}

// Process analytics queue
analyticsQueue.process('track-event', async (job) => {
  const { userId, organizationId, event, properties, timestamp } = job.data;

  logger.info('Tracking event', { userId, event });

  // Store in database or send to external analytics service
  await prisma.auditLog.create({
    data: {
      userId,
      organizationId,
      action: event,
      resourceType: 'analytics',
      metadata: properties,
      createdAt: timestamp
    }
  });
});

// Aggregate daily analytics (cron job)
async function aggregateDailyAnalytics() {
  logger.info('Aggregating daily analytics');

  const yesterday = subDays(new Date(), 1);
  const start = startOfDay(yesterday);
  const end = endOfDay(yesterday);

  const organizations = await prisma.organization.findMany({
    select: { id: true }
  });

  for (const org of organizations) {
    await analyticsQueue.add('aggregate-org', {
      organizationId: org.id,
      start,
      end
    });
  }
}

// Run daily aggregation
setInterval(aggregateDailyAnalytics, 24 * 60 * 60 * 1000);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'analytics' });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  logger.info(`Analytics service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await redis.quit();
  await analyticsQueue.close();
  process.exit(0);
});
