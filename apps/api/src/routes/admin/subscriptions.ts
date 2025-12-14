/**
 * Admin Subscription Routes
 * Subscription and billing management for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { requirePermission, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// List all subscriptions
router.get(
  '/',
  requirePermission('read:subscriptions'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const status = req.query.status as SubscriptionStatus;
      const tier = req.query.tier as SubscriptionTier;

      const where: any = {};
      if (status) where.status = status;
      if (tier) where.tier = tier;

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        prisma.subscription.count({ where }),
      ]);

      res.json({
        success: true,
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing subscriptions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list subscriptions',
      });
    }
  }
);

// Get subscription stats
router.get(
  '/stats',
  requirePermission('read:subscriptions'),
  async (req: Request, res: Response) => {
    try {
      const [byTier, byStatus, activeSubscriptions] = await Promise.all([
        prisma.organization.groupBy({
          by: ['subscriptionTier'],
          _count: true,
        }),
        prisma.organization.groupBy({
          by: ['subscriptionStatus'],
          _count: true,
        }),
        prisma.subscription.findMany({
          where: { status: 'active' },
          include: {
            plan: {
              select: { pricing: true },
            },
          },
        }),
      ]);

      const tierDistribution = byTier.reduce(
        (acc, { subscriptionTier, _count }) => {
          acc[subscriptionTier] = _count;
          return acc;
        },
        {} as Record<string, number>
      );

      const statusDistribution = byStatus.reduce(
        (acc, { subscriptionStatus, _count }) => {
          acc[subscriptionStatus] = _count;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate MRR from plan pricing
      const mrr = activeSubscriptions.reduce((total, sub) => {
        const pricing = sub.plan?.pricing as { monthly?: number } | null;
        return total + (pricing?.monthly || 0);
      }, 0);

      res.json({
        success: true,
        data: {
          tierDistribution,
          statusDistribution,
          mrr,
          arr: mrr * 12,
          activeCount: activeSubscriptions.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching subscription stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription stats',
      });
    }
  }
);

// Get single subscription
router.get(
  '/:id',
  requirePermission('read:subscriptions'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              stripeCustomerId: true,
            },
          },
        },
      });

      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
        return;
      }

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error('Error fetching subscription', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription',
      });
    }
  }
);

// Update organization subscription tier
router.patch(
  '/organization/:orgId/tier',
  requirePermission('write:subscriptions'),
  auditAdminAction('admin:update_subscription_tier'),
  async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const { tier, expiresAt } = req.body;

      const validTiers: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];
      if (!validTiers.includes(tier)) {
        res.status(400).json({
          success: false,
          error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`,
        });
        return;
      }

      const organization = await prisma.organization.update({
        where: { id: orgId },
        data: {
          subscriptionTier: tier,
          ...(expiresAt && { subscriptionExpiresAt: new Date(expiresAt) }),
        },
      });

      logger.info('Organization subscription tier updated', {
        orgId,
        adminId: (req as any).admin?.id,
        newTier: tier,
      });

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      logger.error('Error updating subscription tier', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription tier',
      });
    }
  }
);

// Update subscription status
router.patch(
  '/:id/status',
  requirePermission('write:subscriptions'),
  auditAdminAction('admin:update_subscription_status'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses: SubscriptionStatus[] = ['active', 'canceled', 'past_due', 'trialing'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const subscription = await prisma.subscription.update({
        where: { id },
        data: { status },
      });

      // Also update organization's subscription status
      if (subscription.organizationId) {
        await prisma.organization.update({
          where: { id: subscription.organizationId },
          data: { subscriptionStatus: status },
        });
      }

      logger.info('Subscription status updated', {
        subscriptionId: id,
        adminId: (req as any).admin?.id,
        newStatus: status,
      });

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error('Error updating subscription status', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription status',
      });
    }
  }
);

// Extend subscription trial
router.post(
  '/organization/:orgId/extend-trial',
  requirePermission('write:subscriptions'),
  auditAdminAction('admin:extend_trial'),
  async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const { days } = req.body;

      if (!days || days < 1 || days > 90) {
        res.status(400).json({
          success: false,
          error: 'Days must be between 1 and 90',
        });
        return;
      }

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { subscription: true },
      });

      if (!org) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      const currentExpiry = org.subscriptionExpiresAt || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + days);

      const organization = await prisma.organization.update({
        where: { id: orgId },
        data: {
          subscriptionExpiresAt: newExpiry,
          subscriptionStatus: 'trialing',
        },
      });

      logger.info('Trial extended', {
        orgId,
        adminId: (req as any).admin?.id,
        daysExtended: days,
        newExpiry,
      });

      res.json({
        success: true,
        data: organization,
        message: `Trial extended by ${days} days`,
      });
    } catch (error) {
      logger.error('Error extending trial', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to extend trial',
      });
    }
  }
);

// Get churn data
router.get(
  '/analytics/churn',
  requirePermission('read:subscriptions'),
  async (req: Request, res: Response) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const [
        cancelledLast30Days,
        cancelledLast90Days,
        totalActive,
      ] = await Promise.all([
        prisma.organization.count({
          where: {
            subscriptionStatus: 'canceled',
            updatedAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.organization.count({
          where: {
            subscriptionStatus: 'canceled',
            updatedAt: { gte: ninetyDaysAgo },
          },
        }),
        prisma.organization.count({
          where: { subscriptionStatus: 'active' },
        }),
      ]);

      const churnRate30Days = totalActive > 0
        ? ((cancelledLast30Days / totalActive) * 100).toFixed(2)
        : 0;

      const churnRate90Days = totalActive > 0
        ? ((cancelledLast90Days / (totalActive + cancelledLast90Days)) * 100).toFixed(2)
        : 0;

      res.json({
        success: true,
        data: {
          cancelledLast30Days,
          cancelledLast90Days,
          totalActive,
          churnRate30Days: parseFloat(churnRate30Days as string),
          churnRate90Days: parseFloat(churnRate90Days as string),
        },
      });
    } catch (error) {
      logger.error('Error fetching churn data', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch churn data',
      });
    }
  }
);

export default router;
