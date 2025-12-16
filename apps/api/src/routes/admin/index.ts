/**
 * Admin Routes Index
 * Main router for Super Admin Dashboard API endpoints
 *
 * Includes enterprise-grade real-time features:
 * - Geographic distribution analytics with GeoIP
 * - Real-time concurrent users monitoring
 * - Live analytics event streaming
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { authMiddleware } from '../../middleware/auth';
import { adminAuthMiddleware } from '../../middleware/admin-auth';
import overviewRoutes from './overview';
import organizationsRoutes from './organizations';
import usersRoutes from './users';
import subscriptionsRoutes from './subscriptions';
import analyticsRoutes from './analytics';
import infrastructureRoutes from './infrastructure';
import logsRoutes from './logs';
import alertsRoutes from './alerts';
import featureFlagsRoutes from './feature-flags';
import supportRoutes from './support';
import apiManagementRoutes from './api-management';
import complianceRoutes from './compliance';
import whiteLabelRoutes from './white-label';
import reportsRoutes from './reports';
import settingsRoutes from './settings';
import aiOperationsRoutes from './ai-operations';
import { createAnalyticsGeoRouter } from './analytics-geo';
import { createAnalyticsRealtimeRouter } from './analytics-realtime';

// Initialize database clients for routes that need them
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '4002'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const router: Router = Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminAuthMiddleware);

// Mount sub-routers
router.use('/overview', overviewRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/users', usersRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/infrastructure', infrastructureRoutes);
router.use('/logs', logsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/feature-flags', featureFlagsRoutes);
router.use('/support', supportRoutes);
router.use('/api-management', apiManagementRoutes);
router.use('/compliance', complianceRoutes);
router.use('/white-label', whiteLabelRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/ai-operations', aiOperationsRoutes);

// Real-time analytics routes (require Redis/Prisma)
router.use('/analytics/geo', createAnalyticsGeoRouter(prisma, redis));
router.use('/analytics/realtime', createAnalyticsRealtimeRouter(redis));

export default router;

// Export Redis instance for WebSocket integration
export { redis as adminRedis, prisma as adminPrisma };
