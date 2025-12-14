/**
 * Billing Routes - API Gateway Proxy
 *
 * This module proxies billing requests to the dedicated billing microservice.
 * The billing service handles:
 * - Subscription management (multi-tenant)
 * - Usage-based billing (pay-by-use)
 * - Stripe integration with metering
 * - Invoice management
 */

import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import { createLogger, format, transports } from 'winston';
import { authMiddleware } from '../middleware/auth';
import { getRequiredEnv } from '../config/env';

const router: Router = Router();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'billing-proxy' },
  transports: [new transports.Console()],
});

// Billing service configuration
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:4300';
const BILLING_SERVICE_TIMEOUT = parseInt(process.env.BILLING_SERVICE_TIMEOUT || '30000', 10);

// Create axios instance for billing service
const billingClient = axios.create({
  baseURL: `${BILLING_SERVICE_URL}/api/billing`,
  timeout: BILLING_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Generate internal service token for billing service
 * This is used when the API has validated the user via cookies
 */
function generateInternalToken(user: Request['user']): string {
  if (!user) return '';

  const jwtSecret = getRequiredEnv('JWT_SECRET');
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    jwtSecret,
    { expiresIn: '5m' } // Short-lived token for internal service calls
  );
}

/**
 * Forward request headers to billing service
 */
function getProxyHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};

  // Forward authorization - generate token from validated user if not present
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  } else if (req.user) {
    // User was authenticated via cookies, generate internal token
    const internalToken = generateInternalToken(req.user);
    headers['Authorization'] = `Bearer ${internalToken}`;
  }

  // Forward organization context
  if (req.headers['x-organization-id']) {
    headers['X-Organization-ID'] = req.headers['x-organization-id'] as string;
  } else if (req.user?.organizationId) {
    headers['X-Organization-ID'] = req.user.organizationId;
  }

  // Forward request ID for tracing
  if (req.headers['x-request-id']) {
    headers['X-Request-ID'] = req.headers['x-request-id'] as string;
  }

  // Forward user agent
  if (req.headers['user-agent']) {
    headers['User-Agent'] = req.headers['user-agent'];
  }

  return headers;
}

/**
 * Generic proxy handler
 */
async function proxyRequest(
  req: Request,
  res: Response,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string
): Promise<void> {
  try {
    const headers = getProxyHeaders(req);
    const url = path;

    logger.debug('Proxying billing request', {
      method: method.toUpperCase(),
      path,
      originalUrl: req.originalUrl,
    });

    const response = await billingClient.request({
      method,
      url,
      headers,
      params: req.query,
      data: method !== 'get' ? req.body : undefined,
    });

    // Forward response status and data
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(error, res, req.originalUrl);
  }
}

/**
 * Handle proxy errors
 */
function handleProxyError(error: unknown, res: Response, originalUrl: string): void {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Billing service returned an error
    if (axiosError.response) {
      logger.warn('Billing service error', {
        status: axiosError.response.status,
        data: axiosError.response.data,
        url: originalUrl,
      });

      res.status(axiosError.response.status).json(axiosError.response.data);
      return;
    }

    // Network error or timeout
    if (axiosError.code === 'ECONNREFUSED') {
      logger.error('Billing service unavailable', { url: originalUrl });
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Billing service is temporarily unavailable',
        code: 'BILLING_SERVICE_UNAVAILABLE',
      });
      return;
    }

    if (axiosError.code === 'ECONNABORTED') {
      logger.error('Billing service timeout', { url: originalUrl });
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'Billing service request timed out',
        code: 'BILLING_SERVICE_TIMEOUT',
      });
      return;
    }
  }

  // Unknown error
  logger.error('Unexpected billing proxy error', { error, url: originalUrl });
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
}

// ============================================================================
// Public Routes (no auth required)
// ============================================================================

/**
 * GET /api/billing/plans
 * List available subscription plans
 */
router.get('/plans', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/plans');
});

/**
 * GET /api/billing/plans/:planId
 * Get specific plan details
 */
router.get('/plans/:planId', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', `/plans/${req.params.planId}`);
});

/**
 * GET /api/billing/plans/:planId/compare/:otherPlanId
 * Compare two plans
 */
router.get('/plans/:planId/compare/:otherPlanId', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', `/plans/${req.params.planId}/compare/${req.params.otherPlanId}`);
});

// ============================================================================
// Webhook Route (no auth - uses Stripe signature verification)
// ============================================================================

/**
 * POST /api/billing/webhook
 * Stripe webhook endpoint - proxied with raw body
 */
router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const response = await axios.post(
        `${BILLING_SERVICE_URL}/api/billing/webhook`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': req.headers['stripe-signature'] || '',
          },
          timeout: BILLING_SERVICE_TIMEOUT,
        }
      );

      res.status(response.status).json(response.data);
    } catch (error) {
      handleProxyError(error, res, req.originalUrl);
    }
  }
);

// ============================================================================
// Protected Routes (require authentication)
// ============================================================================

// Apply auth middleware to all remaining routes
router.use(authMiddleware);

// ----------------------------------------------------------------------------
// Subscription Routes
// ----------------------------------------------------------------------------

/**
 * GET /api/billing/subscriptions
 * Get current subscription for organization
 */
router.get('/subscriptions', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/subscriptions');
});

/**
 * POST /api/billing/subscriptions
 * Create new subscription
 */
router.post('/subscriptions', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'post', '/subscriptions');
});

/**
 * PUT /api/billing/subscriptions/:subscriptionId
 * Update subscription (change plan)
 */
router.put('/subscriptions/:subscriptionId', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'put', `/subscriptions/${req.params.subscriptionId}`);
});

/**
 * DELETE /api/billing/subscriptions/:subscriptionId
 * Cancel subscription
 */
router.delete('/subscriptions/:subscriptionId', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'delete', `/subscriptions/${req.params.subscriptionId}`);
});

/**
 * POST /api/billing/subscriptions/checkout
 * Create Stripe Checkout session
 */
router.post('/subscriptions/checkout', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'post', '/subscriptions/checkout');
});

/**
 * POST /api/billing/subscriptions/portal
 * Create Stripe Billing Portal session
 */
router.post('/subscriptions/portal', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'post', '/subscriptions/portal');
});

// ----------------------------------------------------------------------------
// Usage Routes (Pay-by-Use)
// ----------------------------------------------------------------------------

/**
 * GET /api/billing/usage
 * Get usage summary for current billing period
 */
router.get('/usage', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/usage');
});

/**
 * POST /api/billing/usage/record
 * Record a usage event for metered billing
 */
router.post('/usage/record', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'post', '/usage/record');
});

/**
 * POST /api/billing/usage/batch
 * Record multiple usage events at once
 */
router.post('/usage/batch', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'post', '/usage/batch');
});

/**
 * GET /api/billing/usage/limits
 * Get usage limits for current plan
 */
router.get('/usage/limits', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/usage/limits');
});

/**
 * GET /api/billing/usage/overage
 * Check if organization has exceeded usage limits
 */
router.get('/usage/overage', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/usage/overage');
});

// ----------------------------------------------------------------------------
// Invoice Routes
// ----------------------------------------------------------------------------

/**
 * GET /api/billing/invoices
 * List invoices for organization
 */
router.get('/invoices', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/invoices');
});

/**
 * GET /api/billing/invoices/upcoming
 * Get upcoming invoice preview
 */
router.get('/invoices/upcoming', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/invoices/upcoming');
});

/**
 * GET /api/billing/invoices/:invoiceId
 * Get specific invoice
 */
router.get('/invoices/:invoiceId', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', `/invoices/${req.params.invoiceId}`);
});

// ----------------------------------------------------------------------------
// Legacy/Compatibility Routes
// ----------------------------------------------------------------------------

/**
 * GET /api/billing/subscription (legacy - singular)
 * Redirect to new endpoint
 */
router.get('/subscription', async (req: Request, res: Response): Promise<void> => {
  await proxyRequest(req, res, 'get', '/subscriptions');
});

/**
 * GET /api/billing/payment-methods
 * Get payment methods (handled by billing portal)
 */
router.get('/payment-methods', async (_req: Request, res: Response): Promise<void> => {
  res.json({
    message: 'Use the billing portal for payment method management',
    portalEndpoint: '/api/billing/subscriptions/portal',
  });
});

/**
 * POST /api/billing/setup-intent
 * Create setup intent for adding payment methods
 */
router.post('/setup-intent', async (_req: Request, res: Response): Promise<void> => {
  // This could be proxied or handled directly
  // For now, suggest using the billing portal
  res.json({
    message: 'Use the billing portal for adding payment methods',
    portalEndpoint: '/api/billing/subscriptions/portal',
  });
});

export default router;
