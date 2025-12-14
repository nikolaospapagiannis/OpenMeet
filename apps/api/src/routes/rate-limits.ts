/**
 * Rate Limits API Routes
 *
 * Endpoints for managing and monitoring rate limits
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getRateLimitMonitorService } from '../services/RateLimitMonitorService';
import { getIPManagementService } from '../services/IPManagementService';
import { getAdaptiveRateLimiterService } from '../services/AdaptiveRateLimiterService';
import { getRateLimiterService } from '../services/RateLimiterService';
import { getRateLimitForTier } from '../config/rate-limits';
import { redis } from '../index';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/rate-limits/metrics
 * Get current rate limit metrics
 */
router.get('/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const monitorService = getRateLimitMonitorService(redis);
    const metrics = await monitorService.getMetrics();

    res.json(metrics);
  } catch (error) {
    logger.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/rate-limits/status
 * Get current user's rate limit status
 */
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const rateLimiter = getRateLimiterService(redis);

    // Get user's organization subscription tier
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { subscriptionTier: true },
    });

    const tier = organization?.subscriptionTier || 'free';
    const tierLimits = getRateLimitForTier(tier);

    // Get current usage
    const result = await rateLimiter.get(`user:${user.id}`, {
      points: tierLimits.requestsPerMinute,
      duration: 60,
      keyPrefix: 'user',
    });

    res.json({
      limit: tierLimits.requestsPerMinute,
      remaining: result.remaining,
      resetAt: result.resetAt,
      tier,
    });
  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * GET /api/rate-limits/alerts
 * Get recent rate limit alerts
 */
router.get('/alerts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const monitorService = getRateLimitMonitorService(redis);
    const alerts = await monitorService.getAlerts(10);

    res.json(alerts);
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * GET /api/rate-limits/dashboard
 * Get all dashboard data in one request
 */
router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const monitorService = getRateLimitMonitorService(redis);
    const dashboard = await monitorService.getDashboardData();

    res.json(dashboard);
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/rate-limits/time-series
 * Get time-series data for charts
 */
router.get('/time-series', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { type = 'hits', interval = 60, duration = 24 } = req.query;
    const monitorService = getRateLimitMonitorService(redis);

    const data = await monitorService.getTimeSeries(
      type as 'hits' | 'blocks',
      parseInt(interval as string, 10),
      parseInt(duration as string, 10)
    );

    res.json(data);
  } catch (error) {
    logger.error('Get time series error:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

/**
 * GET /api/rate-limits/blocked-ips
 * Get list of blocked IPs
 */
router.get('/blocked-ips', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ipManagement = getIPManagementService(redis);
    const blockedIPs = await ipManagement.getBlacklistedIPs();

    res.json(blockedIPs);
  } catch (error) {
    logger.error('Get blocked IPs error:', error);
    res.status(500).json({ error: 'Failed to fetch blocked IPs' });
  }
});

/**
 * POST /api/rate-limits/unblock/:ip
 * Unblock an IP address
 */
router.post('/unblock/:ip', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { ip } = req.params;
    const ipManagement = getIPManagementService(redis);

    await ipManagement.removeFromBlacklist(ip);

    logger.info('IP unblocked via API', {
      ip,
      userId: (req as any).user.id,
    });

    res.json({ success: true, message: 'IP unblocked successfully' });
  } catch (error) {
    logger.error('Unblock IP error:', error);
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

/**
 * POST /api/rate-limits/block-ip
 * Block an IP address
 */
router.post('/block-ip', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { ip, reason, duration } = req.body;
    const ipManagement = getIPManagementService(redis);

    if (duration) {
      await ipManagement.temporaryBlock(ip, duration, reason);
    } else {
      await ipManagement.permanentBlock(ip, reason);
    }

    logger.info('IP blocked via API', {
      ip,
      reason,
      duration,
      userId: (req as any).user.id,
    });

    res.json({ success: true, message: 'IP blocked successfully' });
  } catch (error) {
    logger.error('Block IP error:', error);
    res.status(500).json({ error: 'Failed to block IP' });
  }
});

/**
 * GET /api/rate-limits/trust-score/:identifier
 * Get trust score for identifier
 */
router.get('/trust-score/:identifier', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const { type = 'user' } = req.query;

    const adaptiveService = getAdaptiveRateLimiterService(redis);
    const trustScore = await adaptiveService.getTrustScore(
      identifier,
      type as 'user' | 'ip' | 'apikey'
    );

    res.json(trustScore);
  } catch (error) {
    logger.error('Get trust score error:', error);
    res.status(500).json({ error: 'Failed to fetch trust score' });
  }
});

/**
 * GET /api/rate-limits/ip-stats/:ip
 * Get statistics for specific IP
 */
router.get('/ip-stats/:ip', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { ip } = req.params;
    const ipManagement = getIPManagementService(redis);

    const stats = await ipManagement.getIPStats(ip);

    res.json(stats);
  } catch (error) {
    logger.error('Get IP stats error:', error);
    res.status(500).json({ error: 'Failed to fetch IP stats' });
  }
});

/**
 * GET /api/rate-limits/prometheus
 * Export Prometheus metrics
 */
router.get('/prometheus', async (req: Request, res: Response) => {
  try {
    const monitorService = getRateLimitMonitorService(redis);
    const metrics = await monitorService.exportPrometheusMetrics();

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Export Prometheus metrics error:', error);
    res.status(500).send('Failed to export metrics');
  }
});

export default router;
