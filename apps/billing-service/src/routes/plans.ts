/**
 * Plans Routes
 * Subscription plan listing (public endpoint)
 */

import { Router, Request, Response } from 'express';
import { createLogger, format, transports } from 'winston';

const router: ReturnType<typeof Router> = Router();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'plans-routes' },
  transports: [new transports.Console()],
});

/**
 * Available subscription plans
 */
const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    description: 'Get started with basic features',
    price: 0,
    priceAnnual: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      '5 meeting recordings/month',
      'Basic transcription',
      '60 minutes of AI transcription',
      '1 GB storage',
      'Email support',
    ],
    limits: {
      meetingsPerMonth: 5,
      transcriptionMinutes: 60,
      aiTokens: 10000,
      storageGb: 1,
      apiCalls: 1000,
      teamMembers: 1,
    },
    popular: false,
    stripePriceId: null,
    stripePriceIdAnnual: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 'pro',
    description: 'Perfect for professionals and small teams',
    price: 1900, // $19.00
    priceAnnual: 15900, // $159.00 (save 2 months)
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited meetings',
      'Advanced AI transcription',
      '600 minutes of AI transcription/month',
      '50 GB storage',
      'Custom vocabulary',
      'Priority support',
      'Team collaboration (up to 5)',
      'API access',
    ],
    limits: {
      meetingsPerMonth: -1, // Unlimited
      transcriptionMinutes: 600,
      aiTokens: 100000,
      storageGb: 50,
      apiCalls: 10000,
      teamMembers: 5,
    },
    popular: true,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_YEARLY || null,
  },
  {
    id: 'business',
    name: 'Business',
    tier: 'business',
    description: 'For growing teams with advanced needs',
    price: 4900, // $49.00
    priceAnnual: 41900, // $419.00 (save 2 months)
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Pro',
      '3000 minutes of AI transcription/month',
      '200 GB storage',
      'Advanced analytics',
      'Custom integrations',
      'SSO (SAML/OIDC)',
      'Team collaboration (up to 25)',
      'Dedicated support',
      'Custom branding',
    ],
    limits: {
      meetingsPerMonth: -1,
      transcriptionMinutes: 3000,
      aiTokens: 500000,
      storageGb: 200,
      apiCalls: 100000,
      teamMembers: 25,
    },
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_YEARLY || null,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    description: 'Custom solutions for large organizations',
    price: -1, // Custom pricing
    priceAnnual: -1,
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Business',
      'Unlimited transcription',
      'Unlimited storage',
      'Unlimited team members',
      'Custom AI models',
      'On-premise deployment option',
      'SLA guarantee',
      'Dedicated success manager',
      'Custom integrations',
      'Advanced security & compliance',
    ],
    limits: {
      meetingsPerMonth: -1,
      transcriptionMinutes: -1,
      aiTokens: -1,
      storageGb: -1,
      apiCalls: -1,
      teamMembers: -1,
    },
    popular: false,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || null,
  },
];

/**
 * Usage-based pricing add-ons
 */
const USAGE_ADDONS = [
  {
    id: 'transcription_minutes',
    name: 'Additional Transcription Minutes',
    description: 'Pay-as-you-go transcription beyond your plan limits',
    unitPrice: 4, // $0.04 per minute
    unit: 'minute',
    stripePriceId: process.env.STRIPE_PRICE_TRANSCRIPTION_MINUTES || null,
  },
  {
    id: 'ai_tokens',
    name: 'Additional AI Tokens',
    description: 'Extra AI processing capacity',
    unitPrice: 1, // $0.01 per 100 tokens
    unit: '100 tokens',
    stripePriceId: process.env.STRIPE_PRICE_AI_TOKENS || null,
  },
  {
    id: 'storage_gb',
    name: 'Additional Storage',
    description: 'Extra storage space for recordings',
    unitPrice: 200, // $2.00 per GB/month
    unit: 'GB/month',
    stripePriceId: process.env.STRIPE_PRICE_STORAGE_GB || null,
  },
  {
    id: 'api_calls',
    name: 'Additional API Calls',
    description: 'Extra API call quota',
    unitPrice: 1, // $0.01 per 10 calls
    unit: '10 calls',
    stripePriceId: process.env.STRIPE_PRICE_API_CALLS || null,
  },
];

/**
 * GET /api/billing/plans
 * List all available subscription plans
 */
router.get('/', (_req: Request, res: Response): void => {
  logger.debug('Fetching plans');

  res.json({
    plans: SUBSCRIPTION_PLANS.map((plan) => ({
      ...plan,
      // Don't expose Stripe price IDs to client
      stripePriceId: plan.stripePriceId ? true : false,
      stripePriceIdAnnual: plan.stripePriceIdAnnual ? true : false,
    })),
    usageAddons: USAGE_ADDONS.map((addon) => ({
      ...addon,
      stripePriceId: addon.stripePriceId ? true : false,
    })),
  });
});

/**
 * GET /api/billing/plans/:planId
 * Get specific plan details
 */
router.get('/:planId', (req: Request, res: Response): void => {
  const { planId } = req.params;

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);

  if (!plan) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Plan not found',
    });
    return;
  }

  res.json({
    plan: {
      ...plan,
      stripePriceId: plan.stripePriceId ? true : false,
      stripePriceIdAnnual: plan.stripePriceIdAnnual ? true : false,
    },
  });
});

/**
 * GET /api/billing/plans/:planId/compare/:otherPlanId
 * Compare two plans
 */
router.get('/:planId/compare/:otherPlanId', (req: Request, res: Response): void => {
  const { planId, otherPlanId } = req.params;

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  const otherPlan = SUBSCRIPTION_PLANS.find((p) => p.id === otherPlanId);

  if (!plan || !otherPlan) {
    res.status(404).json({
      error: 'Not Found',
      message: 'One or both plans not found',
    });
    return;
  }

  // Calculate feature differences
  const uniqueToFirst = plan.features.filter((f) => !otherPlan.features.includes(f));
  const uniqueToSecond = otherPlan.features.filter((f) => !plan.features.includes(f));
  const common = plan.features.filter((f) => otherPlan.features.includes(f));

  res.json({
    comparison: {
      plans: [
        { id: plan.id, name: plan.name, price: plan.price },
        { id: otherPlan.id, name: otherPlan.name, price: otherPlan.price },
      ],
      priceDifference: otherPlan.price - plan.price,
      features: {
        common,
        uniqueToFirst,
        uniqueToSecond,
      },
      limits: {
        [plan.id]: plan.limits,
        [otherPlan.id]: otherPlan.limits,
      },
    },
  });
});

export default router;
