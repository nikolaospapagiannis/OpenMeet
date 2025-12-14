/**
 * Webhook Routes
 * Stripe webhook handling for subscription and payment events
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import * as stripeService from '../services/stripe';
import { createLogger, format, transports } from 'winston';

const router: ReturnType<typeof Router> = Router();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'webhook-routes' },
  transports: [new transports.Console()],
});

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripeService.verifyWebhookSignature(
      req.body as Buffer,
      sig,
      webhookSecret
    );
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err });
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  logger.info(`Received webhook: ${event.type}`, { eventId: event.id });

  try {
    switch (event.type) {
      // Subscription lifecycle events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      // Payment events
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.upcoming':
        await handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
        break;

      // Payment method events
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      // Customer events
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      default:
        // Handle additional event types including billing meter events
        if (event.type.startsWith('billing.meter.')) {
          logger.debug(`Billing meter event: ${event.type}`, { data: event.data.object });
        } else {
          logger.debug(`Unhandled event type: ${event.type}`);
        }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', { error, eventType: event.type });
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const organizationId = subscription.metadata?.organization_id;

  logger.info('Subscription created', {
    subscriptionId: subscription.id,
    customerId,
    organizationId,
    status: subscription.status,
  });

  // Here you would typically:
  // 1. Update your database with the new subscription
  // 2. Provision resources for the organization
  // 3. Send welcome email
  // 4. Update feature flags based on plan

  // Example: Update organization subscription status
  // await prisma.organization.update({
  //   where: { id: organizationId },
  //   data: {
  //     stripeSubscriptionId: subscription.id,
  //     subscriptionStatus: subscription.status,
  //     subscriptionTier: subscription.metadata?.tier || 'pro',
  //   },
  // });
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organization_id;

  logger.info('Subscription updated', {
    subscriptionId: subscription.id,
    organizationId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  // Update database with new subscription status
  // Handle plan upgrades/downgrades
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organization_id;

  logger.info('Subscription deleted', {
    subscriptionId: subscription.id,
    organizationId,
  });

  // Downgrade organization to free tier
  // Revoke premium features
  // Send cancellation confirmation email
}

/**
 * Handle trial ending soon event
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organization_id;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  logger.info('Trial will end soon', {
    subscriptionId: subscription.id,
    organizationId,
    trialEnd: trialEnd?.toISOString(),
  });

  // Send reminder email about trial ending
  // Prompt user to add payment method
}

/**
 * Handle invoice paid event
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as any;
  const customerId = inv.customer as string;
  const subscriptionId = inv.subscription as string;

  logger.info('Invoice paid', {
    invoiceId: inv.id,
    customerId,
    subscriptionId,
    amount: inv.amount_paid,
    currency: inv.currency,
  });

  // Update payment records
  // Send receipt email
  // Record payment in audit log
}

/**
 * Handle invoice payment failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as any;
  const customerId = inv.customer as string;
  const subscriptionId = inv.subscription as string;

  logger.warn('Invoice payment failed', {
    invoiceId: inv.id,
    customerId,
    subscriptionId,
    amount: inv.amount_due,
    attemptCount: inv.attempt_count,
  });

  // Send payment failure notification
  // Update subscription status
  // Consider grace period before downgrade
}

/**
 * Handle upcoming invoice event
 */
async function handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  logger.info('Invoice upcoming', {
    customerId,
    amount: invoice.amount_due,
    dueDate: invoice.due_date
      ? new Date(invoice.due_date * 1000).toISOString()
      : null,
  });

  // Send upcoming payment notification
  // Allow customer to review before charging
}

/**
 * Handle payment method attached event
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  const customerId = paymentMethod.customer as string;

  logger.info('Payment method attached', {
    paymentMethodId: paymentMethod.id,
    customerId,
    type: paymentMethod.type,
  });
}

/**
 * Handle payment method detached event
 */
async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  logger.info('Payment method detached', {
    paymentMethodId: paymentMethod.id,
    type: paymentMethod.type,
  });
}

/**
 * Handle customer created event
 */
async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  const organizationId = customer.metadata?.organization_id;

  logger.info('Customer created', {
    customerId: customer.id,
    organizationId,
    email: customer.email,
  });

  // Link Stripe customer to organization in database
}

/**
 * Handle customer updated event
 */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  logger.info('Customer updated', {
    customerId: customer.id,
    email: customer.email,
  });
}

export default router;
