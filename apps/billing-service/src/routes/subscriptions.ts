/**
 * Subscription Routes
 * Multi-tenant subscription management with Stripe
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, validationResult } from 'express-validator';
import { TenantRequest, requireBillingPermission } from '../middleware/tenant';
import * as stripeService from '../services/stripe';
import { createError } from '../middleware/errorHandler';
import { createLogger, format, transports } from 'winston';

const router: ReturnType<typeof Router> = Router();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'subscription-routes' },
  transports: [new transports.Console()],
});

/**
 * GET /api/billing/subscriptions
 * Get current subscription for organization
 */
router.get('/', (async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantReq = req as TenantRequest;
    const { organizationId, userRole } = tenantReq.tenantContext;

    // Super admins (platform owners) have unlimited enterprise access
    if (userRole === 'super_admin') {
      res.json({
        subscription: {
          id: 'platform-owner',
          status: 'active',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
        },
        plan: {
          id: 'enterprise-unlimited',
          productId: 'platform-owner',
          nickname: 'Enterprise (Platform Owner)',
          amount: 0,
          currency: 'usd',
          interval: 'month',
        },
        tier: 'enterprise',
        customerId: 'platform-owner',
        isPlatformOwner: true,
        message: 'Platform owner - unlimited access',
      });
      return;
    }

    // Get or create customer
    const customer = await stripeService.getOrCreateCustomer(
      organizationId,
      tenantReq.user?.email || '',
      `Organization ${organizationId}`
    );

    // Get active subscriptions
    const subscriptions = await stripeService.stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
      expand: ['data.default_payment_method'],
    });

    // Get the active or most recent subscription
    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === 'active' || sub.status === 'trialing'
    ) || subscriptions.data[0];

    if (!activeSubscription) {
      res.json({
        subscription: null,
        tier: 'free',
        status: 'none',
        message: 'No active subscription',
      });
      return;
    }

    // Extract plan details - use any to handle Stripe type variations
    const sub = activeSubscription as any;
    const planItem = sub.items?.data?.[0];
    const price = planItem?.price;

    res.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
        trialStart: sub.trial_start
          ? new Date(sub.trial_start * 1000).toISOString()
          : null,
        trialEnd: sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
      },
      plan: price
        ? {
            id: price.id,
            productId: price.product,
            nickname: price.nickname,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval,
          }
        : null,
      tier: sub.metadata?.tier || 'pro',
      customerId: customer.id,
    });
  } catch (error) {
    const tenantReq = req as TenantRequest;
    logger.error('Failed to get subscription', { error, organizationId: tenantReq.tenantContext?.organizationId });
    throw createError('Failed to retrieve subscription', 500, 'SUBSCRIPTION_FETCH_ERROR');
  }
}) as RequestHandler);

/**
 * POST /api/billing/subscriptions
 * Create new subscription
 */
router.post(
  '/',
  requireBillingPermission as RequestHandler,
  [
    body('priceId').isString().notEmpty().withMessage('Price ID is required'),
    body('email').isEmail().optional(),
    body('trialDays').isInt({ min: 0, max: 30 }).optional(),
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
      const { priceId, email, trialDays } = req.body;

      // Get or create customer
      const customer = await stripeService.getOrCreateCustomer(
        organizationId,
        email || tenantReq.user?.email || '',
        `Organization ${organizationId}`,
        { created_by: userId }
      );

      // Create subscription
      const subscription = await stripeService.createSubscription(customer.id, priceId, {
        trialDays,
        metadata: {
          organization_id: organizationId,
          created_by: userId,
        },
      });

      // Extract client secret for payment if needed
      const sub = subscription as any;
      const invoice = sub.latest_invoice;
      const paymentIntent = invoice?.payment_intent;

      res.status(201).json({
        subscription: {
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        },
        clientSecret: paymentIntent?.client_secret || null,
        customerId: customer.id,
      });
    } catch (error) {
      const tenantReq = req as TenantRequest;
      logger.error('Failed to create subscription', { error, organizationId: tenantReq.tenantContext?.organizationId });
      throw createError('Failed to create subscription', 500, 'SUBSCRIPTION_CREATE_ERROR');
    }
  }) as RequestHandler
);

/**
 * PUT /api/billing/subscriptions/:subscriptionId
 * Update subscription (change plan)
 */
router.put(
  '/:subscriptionId',
  requireBillingPermission as RequestHandler,
  [
    param('subscriptionId').isString().notEmpty(),
    body('priceId').isString().notEmpty().withMessage('New price ID is required'),
    body('prorate').isBoolean().optional(),
  ],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { subscriptionId } = req.params;
      const { priceId, prorate = true } = req.body;

      // Verify subscription belongs to organization
      const subscription = await stripeService.getSubscription(subscriptionId);
      const sub = subscription as any;
      const customer = await stripeService.getCustomer(sub.customer);

      if ('deleted' in customer && customer.deleted) {
        throw createError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      const cust = customer as any;
      if (cust.metadata?.organization_id !== tenantReq.tenantContext.organizationId) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      // Update subscription
      const updated = await stripeService.updateSubscription(subscriptionId, priceId, prorate);
      const upd = updated as any;

      res.json({
        subscription: {
          id: upd.id,
          status: upd.status,
          currentPeriodEnd: upd.current_period_end
            ? new Date(upd.current_period_end * 1000).toISOString()
            : null,
        },
        message: 'Subscription updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update subscription', { error });
      throw createError('Failed to update subscription', 500, 'SUBSCRIPTION_UPDATE_ERROR');
    }
  }) as RequestHandler
);

/**
 * DELETE /api/billing/subscriptions/:subscriptionId
 * Cancel subscription
 */
router.delete(
  '/:subscriptionId',
  requireBillingPermission as RequestHandler,
  [
    param('subscriptionId').isString().notEmpty(),
    body('immediate').isBoolean().optional(),
  ],
  (async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantReq = req as TenantRequest;
      const { subscriptionId } = req.params;
      const { immediate = false } = req.body;

      // Verify subscription belongs to organization
      const subscription = await stripeService.getSubscription(subscriptionId);
      const sub = subscription as any;
      const customer = await stripeService.getCustomer(sub.customer);

      if ('deleted' in customer && customer.deleted) {
        throw createError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      const cust = customer as any;
      if (cust.metadata?.organization_id !== tenantReq.tenantContext.organizationId) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      // Cancel subscription
      const cancelled = await stripeService.cancelSubscription(subscriptionId, !immediate);
      const canc = cancelled as any;

      res.json({
        subscription: {
          id: canc.id,
          status: canc.status,
          cancelAtPeriodEnd: canc.cancel_at_period_end,
          canceledAt: canc.canceled_at
            ? new Date(canc.canceled_at * 1000).toISOString()
            : null,
        },
        message: immediate
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at end of billing period',
      });
    } catch (error) {
      logger.error('Failed to cancel subscription', { error });
      throw createError('Failed to cancel subscription', 500, 'SUBSCRIPTION_CANCEL_ERROR');
    }
  }) as RequestHandler
);

/**
 * POST /api/billing/subscriptions/checkout
 * Create Stripe Checkout session
 */
router.post(
  '/checkout',
  requireBillingPermission as RequestHandler,
  [
    body('priceId').isString().notEmpty().withMessage('Price ID is required'),
    body('successUrl').isURL().withMessage('Success URL is required'),
    body('cancelUrl').isURL().withMessage('Cancel URL is required'),
    body('trialDays').isInt({ min: 0, max: 30 }).optional(),
  ],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { organizationId } = tenantReq.tenantContext;
      const { priceId, successUrl, cancelUrl, trialDays } = req.body;

      // Get or create customer
      const customer = await stripeService.getOrCreateCustomer(
        organizationId,
        tenantReq.user?.email || '',
        `Organization ${organizationId}`
      );

      // Create checkout session
      const session = await stripeService.createCheckoutSession(customer.id, priceId, {
        successUrl,
        cancelUrl,
        trialDays,
        metadata: { organization_id: organizationId },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      logger.error('Failed to create checkout session', { error });
      throw createError('Failed to create checkout session', 500, 'CHECKOUT_ERROR');
    }
  }) as RequestHandler
);

/**
 * POST /api/billing/subscriptions/portal
 * Create Stripe Billing Portal session
 */
router.post(
  '/portal',
  [body('returnUrl').isURL().withMessage('Return URL is required')],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { organizationId } = tenantReq.tenantContext;
      const { returnUrl } = req.body;

      // Get customer
      const customer = await stripeService.getOrCreateCustomer(
        organizationId,
        tenantReq.user?.email || '',
        `Organization ${organizationId}`
      );

      // Create portal session
      const session = await stripeService.createPortalSession(customer.id, returnUrl);

      res.json({
        url: session.url,
      });
    } catch (error) {
      logger.error('Failed to create portal session', { error });
      throw createError('Failed to create portal session', 500, 'PORTAL_ERROR');
    }
  }) as RequestHandler
);

export default router;
