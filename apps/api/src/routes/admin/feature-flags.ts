/**
 * Admin Feature Flags Routes
 * Feature flag management for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();

// Feature flag entity type for storage in metadata
const FEATURE_FLAG_ENTITY = 'feature_flag';

// Get all feature flags
router.get(
  '/',
  requirePermission('read:feature_flags'),
  async (req: Request, res: Response) => {
    try {
      // Get global feature flags from system settings
      const flags = await prisma.auditLog.findMany({
        where: {
          entityType: FEATURE_FLAG_ENTITY,
          action: { startsWith: 'feature_flag:' },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['entityId'],
      });

      const featureFlags = flags.map((log) => {
        const changes = log.changes as any;
        return {
          id: log.entityId,
          name: changes?.name || log.entityId,
          description: changes?.description || '',
          enabled: changes?.enabled ?? false,
          percentage: changes?.percentage ?? 100,
          targetOrganizations: changes?.targetOrganizations || [],
          targetUsers: changes?.targetUsers || [],
          conditions: changes?.conditions || {},
          createdAt: log.createdAt,
          updatedAt: log.createdAt,
        };
      });

      res.json({
        success: true,
        data: featureFlags,
      });
    } catch (error) {
      logger.error('Error fetching feature flags', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feature flags',
      });
    }
  }
);

// Get single feature flag
router.get(
  '/:id',
  requirePermission('read:feature_flags'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const flag = await prisma.auditLog.findFirst({
        where: {
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!flag) {
        res.status(404).json({
          success: false,
          error: 'Feature flag not found',
        });
        return;
      }

      const changes = flag.changes as any;

      res.json({
        success: true,
        data: {
          id: flag.entityId,
          name: changes?.name || flag.entityId,
          description: changes?.description || '',
          enabled: changes?.enabled ?? false,
          percentage: changes?.percentage ?? 100,
          targetOrganizations: changes?.targetOrganizations || [],
          targetUsers: changes?.targetUsers || [],
          conditions: changes?.conditions || {},
          createdAt: flag.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error fetching feature flag', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feature flag',
      });
    }
  }
);

// Create feature flag
router.post(
  '/',
  requirePermission('write:feature_flags'),
  auditAdminAction('admin:create_feature_flag'),
  async (req: Request, res: Response) => {
    try {
      const {
        id,
        name,
        description,
        enabled,
        percentage,
        targetOrganizations,
        targetUsers,
        conditions,
      } = req.body;

      if (!id || !name) {
        res.status(400).json({
          success: false,
          error: 'id and name are required',
        });
        return;
      }

      // Check if flag already exists
      const existing = await prisma.auditLog.findFirst({
        where: {
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
        },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          error: 'Feature flag with this id already exists',
        });
        return;
      }

      // Create feature flag
      const flag = await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: `feature_flag:create`,
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
          changes: {
            name,
            description: description || '',
            enabled: enabled ?? false,
            percentage: percentage ?? 100,
            targetOrganizations: targetOrganizations || [],
            targetUsers: targetUsers || [],
            conditions: conditions || {},
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('Feature flag created', {
        flagId: id,
        adminId: (req as any).admin?.id,
      });

      res.status(201).json({
        success: true,
        data: {
          id,
          name,
          description: description || '',
          enabled: enabled ?? false,
          percentage: percentage ?? 100,
          targetOrganizations: targetOrganizations || [],
          targetUsers: targetUsers || [],
          conditions: conditions || {},
          createdAt: flag.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error creating feature flag', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create feature flag',
      });
    }
  }
);

// Update feature flag
router.patch(
  '/:id',
  requirePermission('write:feature_flags'),
  auditAdminAction('admin:update_feature_flag'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        enabled,
        percentage,
        targetOrganizations,
        targetUsers,
        conditions,
      } = req.body;

      // Get current flag state
      const currentFlag = await prisma.auditLog.findFirst({
        where: {
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!currentFlag) {
        res.status(404).json({
          success: false,
          error: 'Feature flag not found',
        });
        return;
      }

      const currentChanges = currentFlag.changes as any;

      // Create new state
      const newState = {
        name: name ?? currentChanges?.name,
        description: description ?? currentChanges?.description,
        enabled: enabled ?? currentChanges?.enabled,
        percentage: percentage ?? currentChanges?.percentage,
        targetOrganizations: targetOrganizations ?? currentChanges?.targetOrganizations,
        targetUsers: targetUsers ?? currentChanges?.targetUsers,
        conditions: conditions ?? currentChanges?.conditions,
      };

      // Create update log
      const flag = await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: `feature_flag:update`,
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
          changes: newState,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('Feature flag updated', {
        flagId: id,
        adminId: (req as any).admin?.id,
        changes: req.body,
      });

      res.json({
        success: true,
        data: {
          id,
          ...newState,
          updatedAt: flag.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error updating feature flag', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update feature flag',
      });
    }
  }
);

// Toggle feature flag
router.post(
  '/:id/toggle',
  requirePermission('write:feature_flags'),
  auditAdminAction('admin:toggle_feature_flag'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get current flag state
      const currentFlag = await prisma.auditLog.findFirst({
        where: {
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!currentFlag) {
        res.status(404).json({
          success: false,
          error: 'Feature flag not found',
        });
        return;
      }

      const currentChanges = currentFlag.changes as any;
      const newEnabled = !currentChanges?.enabled;

      // Create toggle log
      await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: `feature_flag:toggle`,
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
          changes: {
            ...currentChanges,
            enabled: newEnabled,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('Feature flag toggled', {
        flagId: id,
        adminId: (req as any).admin?.id,
        newState: newEnabled,
      });

      res.json({
        success: true,
        data: {
          id,
          enabled: newEnabled,
        },
        message: `Feature flag ${newEnabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      logger.error('Error toggling feature flag', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to toggle feature flag',
      });
    }
  }
);

// Delete feature flag
router.delete(
  '/:id',
  requirePermission('write:feature_flags'),
  auditAdminAction('admin:delete_feature_flag'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Delete all logs for this flag
      const result = await prisma.auditLog.deleteMany({
        where: {
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
        },
      });

      if (result.count === 0) {
        res.status(404).json({
          success: false,
          error: 'Feature flag not found',
        });
        return;
      }

      logger.info('Feature flag deleted', {
        flagId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Feature flag deleted',
      });
    } catch (error) {
      logger.error('Error deleting feature flag', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete feature flag',
      });
    }
  }
);

// Check feature flag for organization
router.get(
  '/:id/check',
  requirePermission('read:feature_flags'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const organizationId = req.query.organizationId as string | undefined;
      const userId = req.query.userId as string | undefined;

      const flag = await prisma.auditLog.findFirst({
        where: {
          entityType: FEATURE_FLAG_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!flag) {
        res.json({
          success: true,
          data: {
            id,
            enabled: false,
            reason: 'flag_not_found',
          },
        });
        return;
      }

      const changes = flag.changes as any;

      // Check if globally disabled
      if (!changes?.enabled) {
        res.json({
          success: true,
          data: {
            id,
            enabled: false,
            reason: 'globally_disabled',
          },
        });
        return;
      }

      // Check organization targeting
      if (
        changes?.targetOrganizations?.length > 0 &&
        organizationId &&
        !changes.targetOrganizations.includes(organizationId)
      ) {
        res.json({
          success: true,
          data: {
            id,
            enabled: false,
            reason: 'organization_not_targeted',
          },
        });
        return;
      }

      // Check user targeting
      if (
        changes?.targetUsers?.length > 0 &&
        userId &&
        !changes.targetUsers.includes(userId)
      ) {
        res.json({
          success: true,
          data: {
            id,
            enabled: false,
            reason: 'user_not_targeted',
          },
        });
        return;
      }

      // Check percentage rollout
      if (changes?.percentage < 100) {
        const hash = (organizationId || userId || 'default').split('').reduce(
          (acc, char) => acc + char.charCodeAt(0),
          0
        );
        const bucket = hash % 100;

        if (bucket >= changes.percentage) {
          res.json({
            success: true,
            data: {
              id,
              enabled: false,
              reason: 'percentage_rollout',
            },
          });
          return;
        }
      }

      res.json({
        success: true,
        data: {
          id,
          enabled: true,
          reason: 'all_checks_passed',
        },
      });
    } catch (error) {
      logger.error('Error checking feature flag', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to check feature flag',
      });
    }
  }
);

// Update organization features
router.patch(
  '/organization/:orgId',
  requirePermission('write:feature_flags'),
  auditAdminAction('admin:update_org_features'),
  async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const { features } = req.body;

      if (!features || typeof features !== 'object') {
        res.status(400).json({
          success: false,
          error: 'features object is required',
        });
        return;
      }

      const organization = await prisma.organization.update({
        where: { id: orgId },
        data: { features },
      });

      logger.info('Organization features updated', {
        orgId,
        adminId: (req as any).admin?.id,
        features,
      });

      res.json({
        success: true,
        data: {
          id: organization.id,
          features: organization.features,
        },
      });
    } catch (error) {
      logger.error('Error updating organization features', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update organization features',
      });
    }
  }
);

export default router;
