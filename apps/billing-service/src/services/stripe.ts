/**
 * Stripe Service
 * Core Stripe integration with multi-tenant support
 */

import Stripe from 'stripe';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'stripe-service' },
  transports: [new transports.Console()],
});

// Initialize Stripe with latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover' as const,
  typescript: true,
  maxNetworkRetries: 3,
});

/**
 * Stripe Price IDs mapped from environment variables
 */
export const STRIPE_PRICES = {
  // Subscription plans
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
  enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',

  // Usage-based metered prices
  transcription_minutes: process.env.STRIPE_PRICE_TRANSCRIPTION_MINUTES || '',
  ai_tokens: process.env.STRIPE_PRICE_AI_TOKENS || '',
  storage_gb: process.env.STRIPE_PRICE_STORAGE_GB || '',
  api_calls: process.env.STRIPE_PRICE_API_CALLS || '',
};

/**
 * Stripe Meter IDs for usage-based billing
 */
export const STRIPE_METERS = {
  transcription_minutes: process.env.STRIPE_METER_TRANSCRIPTION_MINUTES || '',
  ai_tokens: process.env.STRIPE_METER_AI_TOKENS || '',
  storage_gb: process.env.STRIPE_METER_STORAGE_GB || '',
  api_calls: process.env.STRIPE_METER_API_CALLS || '',
};

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateCustomer(
  organizationId: string,
  email: string,
  name: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Customer> {
  // Search for existing customer by organization ID
  const existingCustomers = await stripe.customers.search({
    query: `metadata['organization_id']:'${organizationId}'`,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    logger.debug('Found existing customer', {
      organizationId,
      customerId: existingCustomers.data[0].id,
    });
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organization_id: organizationId,
      ...metadata,
    },
  });

  logger.info('Created new Stripe customer', {
    organizationId,
    customerId: customer.id,
  });

  return customer;
}

/**
 * Create a subscription for an organization
 */
export async function createSubscription(
  customerId: string,
  priceId: string,
  options: {
    trialDays?: number;
    metadata?: Record<string, string>;
    coupon?: string;
  } = {}
): Promise<Stripe.Subscription> {
  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: options.trialDays,
    metadata: options.metadata,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  };

  // Add discount/coupon if provided
  if (options.coupon) {
    subscriptionParams.discounts = [{ coupon: options.coupon }];
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);

  logger.info('Created subscription', {
    customerId,
    subscriptionId: subscription.id,
    priceId,
  });

  return subscription;
}

/**
 * Update subscription plan
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string,
  prorate: boolean = true
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: prorate ? 'create_prorations' : 'none',
  });

  logger.info('Updated subscription', {
    subscriptionId,
    newPriceId,
    prorate,
  });

  return updated;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info('Scheduled subscription cancellation', { subscriptionId });
    return subscription;
  }

  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  logger.info('Cancelled subscription immediately', { subscriptionId });
  return subscription;
}

/**
 * Record usage for metered billing
 * Uses Stripe Meters API for accurate usage tracking
 */
export async function recordUsage(
  meterEventName: string,
  customerId: string,
  value: number,
  metadata: Record<string, string> = {}
): Promise<Stripe.Billing.MeterEvent> {
  const meterEvent = await stripe.billing.meterEvents.create({
    event_name: meterEventName,
    payload: {
      stripe_customer_id: customerId,
      value: value.toString(),
      ...metadata,
    },
  });

  logger.debug('Recorded usage event', {
    meterEventName,
    customerId,
    value,
  });

  return meterEvent;
}

/**
 * Get usage summary for a customer
 */
export async function getUsageSummary(
  meterId: string,
  customerId: string,
  startTime: number,
  endTime: number
): Promise<Stripe.Billing.MeterEventSummary[]> {
  const summaries = await stripe.billing.meters.listEventSummaries(meterId, {
    customer: customerId,
    start_time: startTime,
    end_time: endTime,
  });

  return summaries.data;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  options: {
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    subscription_data: {
      trial_period_days: options.trialDays,
      metadata: options.metadata,
    },
    allow_promotion_codes: true,
  });

  logger.info('Created checkout session', {
    customerId,
    sessionId: session.id,
    priceId,
  });

  return session;
}

/**
 * Create a billing portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  logger.info('Created billing portal session', {
    customerId,
    sessionId: session.id,
  });

  return session;
}

/**
 * Create a setup intent for adding payment methods
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });

  return setupIntent;
}

/**
 * List customer invoices
 */
export async function listInvoices(
  customerId: string,
  options: {
    limit?: number;
    startingAfter?: string;
    status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  } = {}
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: options.limit || 10,
    starting_after: options.startingAfter,
    status: options.status,
  });

  return invoices.data;
}

/**
 * Create invoice preview
 */
export async function previewInvoice(
  subscriptionId: string
): Promise<Stripe.Invoice> {
  const invoice = await stripe.invoices.createPreview({
    subscription: subscriptionId,
  });

  return invoice;
}

/**
 * Get upcoming invoice preview
 * Uses createPreview API (replaces deprecated upcoming/retrieveUpcoming)
 */
export async function getUpcomingInvoice(
  customerId: string
): Promise<Stripe.Invoice | null> {
  try {
    const invoice = await stripe.invoices.createPreview({
      customer: customerId,
    });
    return invoice;
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    // No upcoming invoice if customer has no active subscriptions
    if (stripeError.code === 'invoice_upcoming_none' ||
        stripeError.code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get customer by ID
 */
export async function getCustomer(
  customerId: string
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return stripe.customers.retrieve(customerId);
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * List customer payment methods
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * Delete payment method
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
}

export { stripe };
