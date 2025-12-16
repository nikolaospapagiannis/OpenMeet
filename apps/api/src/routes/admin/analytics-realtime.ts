/**
 * Real-time Analytics API Routes
 * Enterprise-grade real-time analytics endpoints for admin dashboard
 *
 * Endpoints:
 * - GET /api/admin/analytics/realtime/concurrent-users - Current concurrent user stats
 * - GET /api/admin/analytics/realtime/concurrent-users/organization - Org-specific concurrent users
 * - GET /api/admin/analytics/realtime/health - Real-time services health
 * - POST /api/admin/analytics/realtime/events/publish - Publish analytics event (internal)
 */

import { Router, Request, Response } from 'express';
import Redis from 'ioredis';
import winston from 'winston';
import { z } from 'zod';
import { getConcurrentUsersService } from '../../services/ConcurrentUsersService';
import { getAnalyticsEventPublisher, AnalyticsEventType } from '../../services/AnalyticsEventPublisher';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'analytics-realtime-routes' },
  transports: [new winston.transports.Console()],
});

// Request validation schemas
const publishEventSchema = z.object({
  type: z.enum([
    'meeting:started',
    'meeting:ended',
    'meeting:participant_joined',
    'meeting:participant_left',
    'transcription:started',
    'transcription:progress',
    'transcription:completed',
    'transcription:failed',
    'ai:processing_started',
    'ai:processing_completed',
    'ai:insight_generated',
    'user:login',
    'user:logout',
    'user:activity',
    'api:request',
    'api:error',
    'integration:sync_started',
    'integration:sync_completed',
    'integration:error',
    'billing:payment_received',
    'billing:subscription_changed',
    'alert:triggered',
    'system:health_change',
  ] as const),
  data: z.record(z.string(), z.unknown()),
  metadata: z.object({
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

export function createAnalyticsRealtimeRouter(redis: Redis): Router {
  const router = Router();
  const concurrentUsersService = getConcurrentUsersService(redis);
  const analyticsEventPublisher = getAnalyticsEventPublisher(redis);

  /**
   * GET /concurrent-users
   * Get current concurrent user statistics
   * - Regular admins: their organization only
   * - Super admins: global view with breakdown
   */
  router.get('/concurrent-users', async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const isSuperAdmin =
        user.systemRole &&
        ['super_admin', 'platform_admin'].includes(user.systemRole);

      if (isSuperAdmin) {
        // Global stats for super admins
        const globalStats = await concurrentUsersService.getGlobalStats();

        logger.info('Global concurrent users stats retrieved', {
          userId: user.id,
          totalUsers: globalStats.totalUsers,
          organizationCount: globalStats.byOrganization.length,
        });

        return res.json({
          success: true,
          data: {
            type: 'global',
            stats: {
              totalUsers: globalStats.totalUsers,
              organizationCount: globalStats.byOrganization.length,
              serverCount: globalStats.serverCount,
              byOrganization: globalStats.byOrganization.slice(0, 50), // Top 50
            },
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        // Organization-specific stats for regular admins
        if (!user.organizationId) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'NO_ORGANIZATION',
              message: 'User has no associated organization',
            },
          });
        }

        const orgCount = await concurrentUsersService.getOrganizationCount(
          user.organizationId
        );

        logger.info('Organization concurrent users retrieved', {
          userId: user.id,
          organizationId: user.organizationId,
          count: orgCount,
        });

        return res.json({
          success: true,
          data: {
            type: 'organization',
            stats: {
              organizationId: user.organizationId,
              count: orgCount,
            },
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      logger.error('Error retrieving concurrent users:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve concurrent user statistics',
        },
      });
    }
  });

  /**
   * GET /concurrent-users/organization
   * Get concurrent users for a specific organization (super admin only)
   */
  router.get(
    '/concurrent-users/organization/:orgId',
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          });
        }

        const { orgId } = req.params;

        // Check authorization
        const isSuperAdmin =
          user.systemRole &&
          ['super_admin', 'platform_admin'].includes(user.systemRole);

        // Only super admins can view other organizations
        if (!isSuperAdmin && user.organizationId !== orgId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this organization',
            },
          });
        }

        const count = await concurrentUsersService.getOrganizationCount(orgId);
        const users = await concurrentUsersService.getOrganizationUsers(orgId);

        logger.info('Organization concurrent users retrieved', {
          requestedBy: user.id,
          organizationId: orgId,
          count,
          userCount: users.length,
        });

        return res.json({
          success: true,
          data: {
            organizationId: orgId,
            stats: {
              concurrentCount: count,
              uniqueUsers: users.length,
              userIds: users, // Provide user IDs for super admins
            },
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        logger.error('Error retrieving organization concurrent users:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve organization concurrent users',
          },
        });
      }
    }
  );

  /**
   * GET /concurrent-users/user/:userId
   * Check if a specific user is online
   */
  router.get(
    '/concurrent-users/user/:userId',
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          });
        }

        const { userId } = req.params;

        // Check authorization - can check self or if super admin
        const isSuperAdmin =
          user.systemRole &&
          ['super_admin', 'platform_admin'].includes(user.systemRole);

        if (!isSuperAdmin && user.id !== userId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied',
            },
          });
        }

        const isOnline = await concurrentUsersService.isUserOnline(
          userId,
          user.organizationId || ''
        );

        return res.json({
          success: true,
          data: {
            userId,
            isOnline,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        logger.error('Error checking user online status:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to check user online status',
          },
        });
      }
    }
  );

  /**
   * GET /health
   * Get real-time services health status
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Only admins can check service health
      const isAdmin =
        user.systemRole &&
        ['super_admin', 'platform_admin', 'support_admin'].includes(user.systemRole);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        });
      }

      const concurrentUsersHealth = await concurrentUsersService.getHealth();

      // Check Redis connection
      let redisHealthy = false;
      try {
        const pong = await redis.ping();
        redisHealthy = pong === 'PONG';
      } catch {
        redisHealthy = false;
      }

      const overallHealthy = concurrentUsersHealth.healthy && redisHealthy;

      logger.info('Real-time health check', {
        userId: user.id,
        healthy: overallHealthy,
      });

      return res.json({
        success: true,
        data: {
          status: overallHealthy ? 'healthy' : 'degraded',
          services: {
            concurrentUsers: {
              status: concurrentUsersHealth.healthy ? 'healthy' : 'unhealthy',
              details: {
                redis: concurrentUsersHealth.redis,
                totalConnections: concurrentUsersHealth.totalConnections,
                organizationCount: concurrentUsersHealth.organizationCount,
              },
            },
            redis: {
              status: redisHealthy ? 'healthy' : 'unhealthy',
            },
            analyticsPublisher: {
              status: 'healthy', // Publisher is stateless
              channels: {
                global: analyticsEventPublisher.getGlobalChannel(),
              },
            },
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error checking real-time health:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check real-time services health',
        },
      });
    }
  });

  /**
   * POST /events/publish
   * Publish an analytics event (internal/service use)
   * This endpoint is for services to publish events
   */
  router.post('/events/publish', async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Validate request body
      const validation = publishEventSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid event data',
            details: validation.error.flatten(),
          },
        });
      }

      const { type, data, metadata } = validation.data;

      // Publish the event
      if (!user.organizationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User has no associated organization',
          },
        });
      }

      await analyticsEventPublisher.publish(
        user.organizationId,
        type as AnalyticsEventType,
        data,
        {
          ...metadata,
          userId: metadata?.userId || user.id,
        }
      );

      logger.debug('Analytics event published via API', {
        type,
        organizationId: user.organizationId,
        userId: user.id,
      });

      return res.json({
        success: true,
        data: {
          published: true,
          type,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error publishing analytics event:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to publish analytics event',
        },
      });
    }
  });

  /**
   * GET /websocket-info
   * Get WebSocket connection information
   */
  router.get('/websocket-info', async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const isSuperAdmin =
        user.systemRole &&
        ['super_admin', 'platform_admin'].includes(user.systemRole);

      // Determine which namespaces the user can connect to
      const availableNamespaces = [
        {
          namespace: '/admin/concurrent-users',
          description: 'Real-time concurrent user counts',
          events: {
            outgoing: [
              'concurrent-users:init',
              'concurrent-users:update',
              'concurrent-users:global',
            ],
            incoming: ['concurrent-users:get'],
          },
        },
        {
          namespace: '/admin/analytics-stream',
          description: 'Real-time analytics event stream',
          events: {
            outgoing: ['analytics:event', 'analytics:recent', 'analytics:subscribed'],
            incoming: ['analytics:subscribe', 'analytics:get-recent'],
          },
        },
      ];

      return res.json({
        success: true,
        data: {
          namespaces: availableNamespaces,
          authentication: {
            method: 'bearer-token',
            header: 'Authorization',
            format: 'Bearer <jwt-token>',
            alternative: {
              method: 'handshake-auth',
              format: "{ auth: { token: '<jwt-token>' } }",
            },
          },
          features: {
            concurrentUsers: {
              available: true,
              scope: isSuperAdmin ? 'global' : 'organization',
            },
            analyticsStream: {
              available: true,
              scope: isSuperAdmin ? 'global' : 'organization',
            },
          },
          serverInfo: {
            transport: ['websocket', 'polling'],
            pingInterval: 25000,
            pingTimeout: 60000,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting WebSocket info:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get WebSocket information',
        },
      });
    }
  });

  return router;
}

export default createAnalyticsRealtimeRouter;
