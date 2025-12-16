/**
 * Admin Infrastructure Routes
 * Infrastructure monitoring for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';
import { getQueueService, getRedis } from '../../services/registry';
import { JobType } from '../../services/queue';
import os from 'os';

const router: Router = Router();
const prisma = new PrismaClient();

// Get system health overview
router.get(
  '/health',
  requirePermission('read:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();

      // Check database
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;

      // Get system info
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
      };

      // Process info
      const processInfo = {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
      };

      res.json({
        success: true,
        data: {
          status: 'healthy',
          services: {
            api: {
              status: 'healthy',
              responseTime: Date.now() - startTime,
            },
            database: {
              status: dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'degraded' : 'unhealthy',
              latencyMs: dbLatency,
            },
          },
          system: systemInfo,
          process: processInfo,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching infrastructure health', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch infrastructure health',
      });
    }
  }
);

// Get database stats
router.get(
  '/database',
  requirePermission('read:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      // Get table sizes
      const tableSizes = await prisma.$queryRaw`
        SELECT
          relname as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) as total_size,
          pg_total_relation_size(relid) as size_bytes,
          n_live_tup as row_count
        FROM pg_catalog.pg_statio_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 20
      ` as any[];

      // Get database size
      const dbSize = await prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      ` as { size: string }[];

      // Get connection count
      const connections = await prisma.$queryRaw`
        SELECT count(*) as count FROM pg_stat_activity
      ` as { count: bigint }[];

      res.json({
        success: true,
        data: {
          databaseSize: dbSize[0]?.size || 'unknown',
          activeConnections: Number(connections[0]?.count || 0),
          tables: tableSizes.map((t) => ({
            name: t.table_name,
            size: t.total_size,
            sizeBytes: Number(t.size_bytes),
            rowCount: Number(t.row_count),
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching database stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch database stats',
      });
    }
  }
);

// Get API metrics
router.get(
  '/api-metrics',
  requirePermission('read:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get request counts from audit logs
      const [requestsLastHour, requestsLastDay, errorCount] = await Promise.all([
        prisma.auditLog.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        prisma.auditLog.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        prisma.auditLog.count({
          where: {
            createdAt: { gte: oneDayAgo },
            action: { contains: 'error' },
          },
        }),
      ]);

      // Get endpoint distribution
      const endpointDistribution = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { createdAt: { gte: oneDayAgo } },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      });

      res.json({
        success: true,
        data: {
          requestsLastHour,
          requestsLastDay,
          errorCount,
          errorRate: requestsLastDay > 0
            ? ((errorCount / requestsLastDay) * 100).toFixed(2)
            : 0,
          topEndpoints: endpointDistribution.map((e) => ({
            action: e.action,
            count: e._count,
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching API metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch API metrics',
      });
    }
  }
);

// Get storage metrics
router.get(
  '/storage',
  requirePermission('read:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      // Get storage usage by organization
      const storageByOrg = await prisma.usageMetric.groupBy({
        by: ['organizationId'],
        where: { metricType: 'storage' },
        _sum: { metricValue: true },
        orderBy: { _sum: { metricValue: 'desc' } },
        take: 10,
      });

      // Get total storage
      const totalStorage = await prisma.usageMetric.aggregate({
        where: { metricType: 'storage' },
        _sum: { metricValue: true },
      });

      // Get organizations for the top storage users
      const orgIds = storageByOrg.map((s) => s.organizationId);
      const organizations = await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true, slug: true },
      });

      const orgMap = new Map(organizations.map((o) => [o.id, o]));

      res.json({
        success: true,
        data: {
          totalStorageBytes: Number(totalStorage._sum.metricValue || 0),
          topStorageUsers: storageByOrg.map((s) => ({
            organization: orgMap.get(s.organizationId),
            storageBytes: Number(s._sum.metricValue || 0),
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching storage metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch storage metrics',
      });
    }
  }
);

// Get job queue status - Real Bull queue integration
router.get(
  '/queues',
  requirePermission('read:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      const queueService = getQueueService();
      const allStats = await queueService.getAllQueueStats();

      // Map queue stats to response format
      const queues = Array.from(allStats.entries())
        .filter(([_, stats]) => stats !== null)
        .map(([jobType, stats]) => ({
          name: jobType,
          waiting: stats!.waiting,
          active: stats!.active,
          completed: stats!.completed,
          failed: stats!.failed,
          delayed: stats!.delayed,
          paused: stats!.paused,
        }));

      // Get Redis connection status
      const redis = getRedis();
      let redisStatus = 'disconnected';
      try {
        const ping = await redis.ping();
        redisStatus = ping === 'PONG' ? 'connected' : 'disconnected';
      } catch {
        redisStatus = 'error';
      }

      // Get health check for all queues
      const healthCheck = await queueService.healthCheck();

      res.json({
        success: true,
        data: {
          queues,
          redis: {
            status: redisStatus,
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          health: {
            overall: healthCheck.healthy,
            queues: Object.fromEntries(healthCheck.queues),
          },
          status: 'connected',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching queue status', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue status',
      });
    }
  }
);

// Pause a specific queue
router.post(
  '/queues/:queueName/pause',
  requirePermission('write:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const jobType = queueName as JobType;

      if (!Object.values(JobType).includes(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid queue name. Valid queues: ${Object.values(JobType).join(', ')}`,
        });
        return;
      }

      const queueService = getQueueService();
      const success = await queueService.pauseQueue(jobType);

      if (success) {
        logger.info('Queue paused by admin', { queue: queueName, adminId: (req as any).admin?.id });
        res.json({
          success: true,
          message: `Queue ${queueName} paused`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to pause queue',
        });
      }
    } catch (error) {
      logger.error('Error pausing queue', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to pause queue',
      });
    }
  }
);

// Resume a specific queue
router.post(
  '/queues/:queueName/resume',
  requirePermission('write:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const jobType = queueName as JobType;

      if (!Object.values(JobType).includes(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid queue name. Valid queues: ${Object.values(JobType).join(', ')}`,
        });
        return;
      }

      const queueService = getQueueService();
      const success = await queueService.resumeQueue(jobType);

      if (success) {
        logger.info('Queue resumed by admin', { queue: queueName, adminId: (req as any).admin?.id });
        res.json({
          success: true,
          message: `Queue ${queueName} resumed`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to resume queue',
        });
      }
    } catch (error) {
      logger.error('Error resuming queue', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to resume queue',
      });
    }
  }
);

// Clean completed jobs from a queue
router.post(
  '/queues/:queueName/clean',
  requirePermission('write:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { grace } = req.body; // Grace period in milliseconds
      const jobType = queueName as JobType;

      if (!Object.values(JobType).includes(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid queue name. Valid queues: ${Object.values(JobType).join(', ')}`,
        });
        return;
      }

      const queueService = getQueueService();
      const cleaned = await queueService.cleanQueue(jobType, grace || 3600000);

      logger.info('Queue cleaned by admin', {
        queue: queueName,
        jobsRemoved: cleaned,
        adminId: (req as any).admin?.id
      });

      res.json({
        success: true,
        data: { cleaned },
        message: `Removed ${cleaned} completed jobs from ${queueName}`,
      });
    } catch (error) {
      logger.error('Error cleaning queue', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to clean queue',
      });
    }
  }
);

// Process dead letter queue
router.post(
  '/queues/:queueName/process-dlq',
  requirePermission('write:infrastructure'),
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const jobType = queueName as JobType;

      if (!Object.values(JobType).includes(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid queue name. Valid queues: ${Object.values(JobType).join(', ')}`,
        });
        return;
      }

      const queueService = getQueueService();
      const processed = await queueService.processDeadLetterQueue(jobType);

      logger.info('DLQ processed by admin', {
        queue: queueName,
        jobsProcessed: processed,
        adminId: (req as any).admin?.id
      });

      res.json({
        success: true,
        data: { processed },
        message: `Processed ${processed} jobs from dead letter queue`,
      });
    } catch (error) {
      logger.error('Error processing DLQ', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to process dead letter queue',
      });
    }
  }
);

export default router;
