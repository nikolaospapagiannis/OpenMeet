/**
 * Admin Organization Routes
 * Organization management for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, OrgStatus, OrgTier } from '@prisma/client';
import { requirePermission, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// List all organizations with pagination and filters
router.get(
  '/',
  requirePermission('read:organizations'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as OrgStatus;
      const tier = req.query.tier as OrgTier;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { domain: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (status) where.status = status;
      if (tier) where.tier = tier;

      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                users: true,
                meetings: true,
              },
            },
            subscription: {
              select: {
                id: true,
                status: true,
                currentPeriodEnd: true,
              },
            },
          },
        }),
        prisma.organization.count({ where }),
      ]);

      res.json({
        success: true,
        data: organizations.map((org) => ({
          ...org,
          userCount: org._count.users,
          meetingCount: org._count.meetings,
          _count: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing organizations', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list organizations',
      });
    }
  }
);

// Get single organization
router.get(
  '/:id',
  requirePermission('read:organizations'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          subscription: true,
          _count: {
            select: {
              meetings: true,
              apiKeys: true,
              integrations: true,
            },
          },
        },
      });

      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      logger.error('Error fetching organization', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization',
      });
    }
  }
);

// Create organization
router.post(
  '/',
  requirePermission('write:organizations'),
  auditAdminAction('admin:create_organization'),
  async (req: Request, res: Response) => {
    try {
      const { name, slug, domain, tier, settings, quotas, features } = req.body;

      // Validate slug uniqueness
      const existingOrg = await prisma.organization.findUnique({
        where: { slug },
      });

      if (existingOrg) {
        res.status(400).json({
          success: false,
          error: 'Organization with this slug already exists',
        });
        return;
      }

      const organization = await prisma.organization.create({
        data: {
          name,
          slug,
          domain,
          tier: tier || 'free',
          settings: settings || {},
          quotas: quotas || {},
          features: features || {},
          status: 'active',
        },
      });

      logger.info('Organization created by admin', {
        orgId: organization.id,
        adminId: (req as any).admin?.id,
      });

      res.status(201).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      logger.error('Error creating organization', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create organization',
      });
    }
  }
);

// Update organization
router.patch(
  '/:id',
  requirePermission('write:organizations'),
  auditAdminAction('admin:update_organization'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, domain, tier, status, settings, quotas, features, healthScore } = req.body;

      const organization = await prisma.organization.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(domain !== undefined && { domain }),
          ...(tier && { tier }),
          ...(status && { status }),
          ...(settings && { settings }),
          ...(quotas && { quotas }),
          ...(features && { features }),
          ...(healthScore !== undefined && { healthScore }),
        },
      });

      logger.info('Organization updated by admin', {
        orgId: id,
        adminId: (req as any).admin?.id,
        changes: req.body,
      });

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      logger.error('Error updating organization', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update organization',
      });
    }
  }
);

// Suspend organization
router.post(
  '/:id/suspend',
  requirePermission('write:organizations'),
  auditAdminAction('admin:suspend_organization'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const organization = await prisma.organization.update({
        where: { id },
        data: {
          status: 'suspended',
          suspendedAt: new Date(),
          suspendedReason: reason,
        },
      });

      logger.warn('Organization suspended by admin', {
        orgId: id,
        adminId: (req as any).admin?.id,
        reason,
      });

      res.json({
        success: true,
        data: organization,
        message: 'Organization suspended successfully',
      });
    } catch (error) {
      logger.error('Error suspending organization', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to suspend organization',
      });
    }
  }
);

// Reactivate organization
router.post(
  '/:id/reactivate',
  requirePermission('write:organizations'),
  auditAdminAction('admin:reactivate_organization'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const organization = await prisma.organization.update({
        where: { id },
        data: {
          status: 'active',
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      logger.info('Organization reactivated by admin', {
        orgId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: organization,
        message: 'Organization reactivated successfully',
      });
    } catch (error) {
      logger.error('Error reactivating organization', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate organization',
      });
    }
  }
);

// Delete organization
router.delete(
  '/:id',
  requirePermission('write:organizations'),
  auditAdminAction('admin:delete_organization'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { confirm } = req.query;

      if (confirm !== 'true') {
        res.status(400).json({
          success: false,
          error: 'Deletion requires confirmation. Add ?confirm=true to proceed.',
        });
        return;
      }

      // Soft delete by setting status to cancelled
      const organization = await prisma.organization.update({
        where: { id },
        data: {
          status: 'cancelled',
          suspendedAt: new Date(),
          suspendedReason: 'Deleted by admin',
        },
      });

      logger.warn('Organization deleted by admin', {
        orgId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Organization deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting organization', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete organization',
      });
    }
  }
);

// Get organization usage stats
router.get(
  '/:id/usage',
  requirePermission('read:organizations'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [meetingsCount, usersCount, storageUsed, apiCalls] = await Promise.all([
        prisma.meeting.count({
          where: { organizationId: id, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.user.count({
          where: { organizationId: id },
        }),
        prisma.usageMetric.aggregate({
          where: { organizationId: id, metricType: 'storage' },
          _sum: { metricValue: true },
        }),
        prisma.usageMetric.aggregate({
          where: { organizationId: id, metricType: 'api_calls', createdAt: { gte: thirtyDaysAgo } },
          _sum: { metricValue: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          meetingsLast30Days: meetingsCount,
          totalUsers: usersCount,
          storageUsedBytes: Number(storageUsed._sum.metricValue || 0),
          apiCallsLast30Days: Number(apiCalls._sum.metricValue || 0),
        },
      });
    } catch (error) {
      logger.error('Error fetching organization usage', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization usage',
      });
    }
  }
);

export default router;
