/**
 * Usage Routes
 * Pay-by-use metering and usage tracking with Stripe Meters
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, query, validationResult } from 'express-validator';
import { TenantRequest } from '../middleware/tenant';
import * as stripeService from '../services/stripe';
import { STRIPE_METERS } from '../services/stripe';
import { createError } from '../middleware/errorHandler';
import { createLogger, format, transports } from 'winston';

const router: ReturnType<typeof Router> = Router();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'usage-routes' },
  transports: [new transports.Console()],
});

/**
 * Usage event types for pay-by-use billing
 */
export type UsageEventType =
  | 'transcription_minutes'
  | 'ai_tokens'
  | 'storage_gb'
  | 'api_calls';

const USAGE_EVENT_NAMES: Record<UsageEventType, string> = {
  transcription_minutes: 'openmeet_transcription_minutes',
  ai_tokens: 'openmeet_ai_tokens',
  storage_gb: 'openmeet_storage_gb',
  api_calls: 'openmeet_api_calls',
};

/**
 * POST /api/billing/usage/record
 * Record a usage event for metered billing
 */
router.post(
  '/record',
  [
    body('eventType')
      .isIn(['transcription_minutes', 'ai_tokens', 'storage_gb', 'api_calls'])
      .withMessage('Valid event type is required'),
    body('value')
      .isInt({ min: 1 })
      .withMessage('Value must be a positive integer'),
    body('metadata').isObject().optional(),
    body('idempotencyKey').isString().optional(),
  ],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { organizationId, userId } = tenantReq.tenantContext;
      const { eventType, value, metadata = {}, idempotencyKey } = req.body;

      // Get customer for organization
      const customer = await stripeService.getOrCreateCustomer(
        organizationId,
        tenantReq.user?.email || '',
        `Organization ${organizationId}`
      );

      // Get the event name for this usage type
      const eventName = USAGE_EVENT_NAMES[eventType as UsageEventType];

      // Record usage event
      const meterEvent = await stripeService.recordUsage(
        eventName,
        customer.id,
        value,
        {
          organization_id: organizationId,
          user_id: userId,
          idempotency_key: idempotencyKey || '',
          ...metadata,
        }
      );

      logger.info('Recorded usage event', {
        organizationId,
        eventType,
        value,
        customerId: customer.id,
      });

      const evt = meterEvent as any;
      res.status(201).json({
        success: true,
        event: {
          id: evt.identifier,
          type: eventType,
          value,
          timestamp: evt.created,
        },
      });
    } catch (error) {
      logger.error('Failed to record usage', { error });
      throw createError('Failed to record usage event', 500, 'USAGE_RECORD_ERROR');
    }
  }) as RequestHandler
);

/**
 * POST /api/billing/usage/batch
 * Record multiple usage events at once
 */
router.post(
  '/batch',
  [
    body('events')
      .isArray({ min: 1, max: 100 })
      .withMessage('Events array is required (1-100 events)'),
    body('events.*.eventType')
      .isIn(['transcription_minutes', 'ai_tokens', 'storage_gb', 'api_calls'])
      .withMessage('Valid event type is required'),
    body('events.*.value')
      .isInt({ min: 1 })
      .withMessage('Value must be a positive integer'),
    body('events.*.metadata').isObject().optional(),
  ],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { organizationId, userId } = tenantReq.tenantContext;
      const { events } = req.body;

      // Get customer for organization
      const customer = await stripeService.getOrCreateCustomer(
        organizationId,
        tenantReq.user?.email || '',
        `Organization ${organizationId}`
      );

      // Record all events
      const results = await Promise.allSettled(
        events.map(
          async (event: { eventType: UsageEventType; value: number; metadata?: Record<string, string> }) => {
            const eventName = USAGE_EVENT_NAMES[event.eventType];
            return stripeService.recordUsage(
              eventName,
              customer.id,
              event.value,
              {
                organization_id: organizationId,
                user_id: userId,
                ...(event.metadata || {}),
              }
            );
          }
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      logger.info('Recorded batch usage events', {
        organizationId,
        total: events.length,
        successful,
        failed,
      });

      res.status(201).json({
        success: true,
        total: events.length,
        successful,
        failed,
        results: results.map((r, i) => ({
          index: i,
          status: r.status,
          eventType: events[i].eventType,
          value: events[i].value,
        })),
      });
    } catch (error) {
      logger.error('Failed to record batch usage', { error });
      throw createError('Failed to record batch usage', 500, 'BATCH_USAGE_ERROR');
    }
  }) as RequestHandler
);

/**
 * GET /api/billing/usage
 * Get usage summary for current billing period
 */
router.get(
  '/',
  [
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional(),
    query('eventType')
      .isIn(['transcription_minutes', 'ai_tokens', 'storage_gb', 'api_calls', 'all'])
      .optional(),
  ],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { organizationId, userRole } = tenantReq.tenantContext;
      const { startDate, endDate, eventType = 'all' } = req.query;

      // Calculate time range (default: current month)
      const now = new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : now;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Super admins (platform owners) have unlimited usage
      if (userRole === 'super_admin') {
        res.json({
          organizationId,
          period: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          // Frontend-expected format
          usage: {
            meetingsRecorded: 0,
            meetingsLimit: -1,
            storageUsedMB: 0,
            storageLimitMB: -1,
            aiMinutesUsed: 0,
            aiMinutesLimit: -1,
            periodStart: start.toISOString(),
            periodEnd: nextMonth.toISOString(),
          },
          // Detailed format
          detailed: {
            transcription_minutes: { total: 0, summaries: [] },
            ai_tokens: { total: 0, summaries: [] },
            storage_gb: { total: 0, summaries: [] },
            api_calls: { total: 0, summaries: [] },
          },
          tier: 'enterprise',
          unlimited: true,
          isPlatformOwner: true,
        });
        return;
      }

      // Get customer for organization
      const customer = await stripeService.getOrCreateCustomer(
        organizationId,
        tenantReq.user?.email || '',
        `Organization ${organizationId}`
      );

      // Get usage for each meter
      const usageTypes = eventType === 'all'
        ? (['transcription_minutes', 'ai_tokens', 'storage_gb', 'api_calls'] as UsageEventType[])
        : [eventType as UsageEventType];

      const usageSummary: Record<string, { total: number; summaries: any[] }> = {};

      for (const type of usageTypes) {
        const meterId = STRIPE_METERS[type];
        if (!meterId) {
          usageSummary[type] = { total: 0, summaries: [] };
          continue;
        }

        try {
          const summaries = await stripeService.getUsageSummary(
            meterId,
            customer.id,
            Math.floor(start.getTime() / 1000),
            Math.floor(end.getTime() / 1000)
          );

          const total = summaries.reduce((sum, s: any) => sum + (s.aggregated_value || 0), 0);
          usageSummary[type] = { total, summaries };
        } catch (err) {
          logger.warn(`Failed to get usage for ${type}`, { error: err });
          usageSummary[type] = { total: 0, summaries: [] };
        }
      }

      // Get subscription tier for limits
      const subscriptions = await stripeService.stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });
      const sub = subscriptions.data[0] as any;
      const tier = sub?.metadata?.tier || 'free';

      // Define limits per tier
      const TIER_LIMITS: Record<string, { meetingsLimit: number; storageLimitMB: number; aiMinutesLimit: number }> = {
        free: { meetingsLimit: 5, storageLimitMB: 500, aiMinutesLimit: 60 },
        pro: { meetingsLimit: -1, storageLimitMB: 10240, aiMinutesLimit: 600 },
        business: { meetingsLimit: -1, storageLimitMB: 102400, aiMinutesLimit: 3000 },
        enterprise: { meetingsLimit: -1, storageLimitMB: -1, aiMinutesLimit: -1 },
      };
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      res.json({
        organizationId,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        // Frontend-expected format
        usage: {
          meetingsRecorded: usageSummary.api_calls?.total || 0,
          meetingsLimit: limits.meetingsLimit,
          storageUsedMB: (usageSummary.storage_gb?.total || 0) * 1024,
          storageLimitMB: limits.storageLimitMB,
          aiMinutesUsed: usageSummary.transcription_minutes?.total || 0,
          aiMinutesLimit: limits.aiMinutesLimit,
          periodStart: start.toISOString(),
          periodEnd: nextMonth.toISOString(),
        },
        // Detailed format
        detailed: usageSummary,
        tier,
        unlimited: tier === 'enterprise',
      });
    } catch (error) {
      logger.error('Failed to get usage summary', { error });
      throw createError('Failed to retrieve usage', 500, 'USAGE_FETCH_ERROR');
    }
  }) as RequestHandler
);

/**
 * GET /api/billing/usage/limits
 * Get usage limits for current plan
 */
router.get('/limits', (async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantReq = req as TenantRequest;
    const { organizationId, userRole } = tenantReq.tenantContext;

    // Define limits per tier
    const TIER_LIMITS: Record<string, Record<string, number>> = {
      free: {
        transcription_minutes: 60,
        ai_tokens: 10000,
        storage_gb: 1,
        api_calls: 1000,
        meetingsLimit: 5,
        storageLimitMB: 500,
        aiMinutesLimit: 60,
      },
      pro: {
        transcription_minutes: 600,
        ai_tokens: 100000,
        storage_gb: 50,
        api_calls: 10000,
        meetingsLimit: -1,
        storageLimitMB: 10240,
        aiMinutesLimit: 600,
      },
      business: {
        transcription_minutes: 3000,
        ai_tokens: 500000,
        storage_gb: 200,
        api_calls: 100000,
        meetingsLimit: -1,
        storageLimitMB: 102400,
        aiMinutesLimit: 3000,
      },
      enterprise: {
        transcription_minutes: -1, // Unlimited
        ai_tokens: -1,
        storage_gb: -1,
        api_calls: -1,
        meetingsLimit: -1,
        storageLimitMB: -1,
        aiMinutesLimit: -1,
      },
    };

    // Super admins (platform owners) have unlimited enterprise access
    if (userRole === 'super_admin') {
      res.json({
        tier: 'enterprise',
        limits: TIER_LIMITS.enterprise,
        unlimited: true,
        isPlatformOwner: true,
        subscription: {
          id: 'platform-owner',
          status: 'active',
        },
      });
      return;
    }

    // Get customer and subscription
    const customer = await stripeService.getOrCreateCustomer(
      organizationId,
      tenantReq.user?.email || '',
      `Organization ${organizationId}`
    );

    const subscriptions = await stripeService.stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    const sub = subscription as any;
    const tier = sub?.metadata?.tier || 'free';

    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    res.json({
      tier,
      limits,
      unlimited: tier === 'enterprise',
      subscription: subscription
        ? {
            id: sub.id,
            status: sub.status,
          }
        : null,
    });
  } catch (error) {
    logger.error('Failed to get usage limits', { error });
    throw createError('Failed to retrieve usage limits', 500, 'LIMITS_FETCH_ERROR');
  }
}) as RequestHandler);

/**
 * GET /api/billing/usage/overage
 * Check if organization has exceeded usage limits
 */
router.get('/overage', (async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantReq = req as TenantRequest;
    const { organizationId } = tenantReq.tenantContext;

    // Get customer
    const customer = await stripeService.getOrCreateCustomer(
      organizationId,
      tenantReq.user?.email || '',
      `Organization ${organizationId}`
    );

    // Get subscription and tier
    const subscriptions = await stripeService.stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    const sub = subscription as any;
    const tier = sub?.metadata?.tier || 'free';

    // Get current usage
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageTypes: UsageEventType[] = ['transcription_minutes', 'ai_tokens', 'storage_gb', 'api_calls'];
    const overages: Record<string, { used: number; limit: number; overage: number; percentage: number }> = {};

    const TIER_LIMITS: Record<string, Record<string, number>> = {
      free: { transcription_minutes: 60, ai_tokens: 10000, storage_gb: 1, api_calls: 1000 },
      pro: { transcription_minutes: 600, ai_tokens: 100000, storage_gb: 50, api_calls: 10000 },
      business: { transcription_minutes: 3000, ai_tokens: 500000, storage_gb: 200, api_calls: 100000 },
      enterprise: { transcription_minutes: -1, ai_tokens: -1, storage_gb: -1, api_calls: -1 },
    };

    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    for (const type of usageTypes) {
      const meterId = STRIPE_METERS[type];
      const limit = limits[type];

      let used = 0;
      if (meterId) {
        try {
          const summaries = await stripeService.getUsageSummary(
            meterId,
            customer.id,
            Math.floor(start.getTime() / 1000),
            Math.floor(now.getTime() / 1000)
          );
          used = summaries.reduce((sum, s: any) => sum + (s.aggregated_value || 0), 0);
        } catch (err) {
          logger.warn(`Failed to get usage for ${type}`, { error: err });
        }
      }

      const overage = limit === -1 ? 0 : Math.max(0, used - limit);
      const percentage = limit === -1 ? 0 : limit > 0 ? (used / limit) * 100 : 100;

      overages[type] = {
        used,
        limit: limit === -1 ? Infinity : limit,
        overage,
        percentage: Math.round(percentage * 100) / 100,
      };
    }

    const hasOverage = Object.values(overages).some((o) => o.overage > 0);

    res.json({
      tier,
      hasOverage,
      overages,
      period: {
        start: start.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to check overage', { error });
    throw createError('Failed to check usage overage', 500, 'OVERAGE_CHECK_ERROR');
  }
}) as RequestHandler);

export default router;
