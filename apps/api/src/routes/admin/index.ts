/**
 * Admin Routes Index
 * Main router for Super Admin Dashboard API endpoints
 */

import { Router } from 'express';
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

const router = Router();

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

export default router;
