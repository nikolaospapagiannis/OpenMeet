/**
 * Public API v1 - Main Router
 *
 * Enterprise REST API for developers
 * - API key authentication (required for all routes)
 * - Tiered rate limiting with Redis sliding window
 * - OpenAPI 3.0 documentation
 * - Comprehensive error handling
 *
 * Base path: /api/v1
 */

import { Router, Request, Response } from 'express';
import { apiKeyAuthMiddleware } from '../../middleware/apiKeyAuth';
import { rateLimiterMiddleware } from '../../middleware/rateLimiter';
import { logger } from '../../utils/logger';

// Import route modules
import meetingsRouter from './meetings';
import usersRouter from './users';
import webhooksRouter from './webhooks';

const router: Router = Router();

/**
 * API v1 root - API information
 * GET /api/v1
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    version: '1.0.0',
    name: 'OpenMeet Public API',
    documentation: '/api/v1/docs',
    endpoints: {
      meetings: '/api/v1/meetings',
      users: '/api/v1/users',
      webhooks: '/api/v1/webhooks',
    },
    authentication: {
      type: 'API Key',
      header: 'Authorization: Bearer YOUR_API_KEY',
    },
    rateLimits: {
      free: '100 requests/hour',
      pro: '1000 requests/hour',
      business: '5000 requests/hour',
      enterprise: '10000 requests/hour',
    },
  });
});

/**
 * Health check endpoint (no auth required)
 * GET /api/v1/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * Apply API key authentication to all routes below
 */
router.use(apiKeyAuthMiddleware);

/**
 * Apply rate limiting to all authenticated routes
 */
router.use(rateLimiterMiddleware);

/**
 * Mount resource routers
 */
router.use('/meetings', meetingsRouter);
router.use('/users', usersRouter);
router.use('/webhooks', webhooksRouter);

/**
 * 404 handler for unknown v1 endpoints
 */
router.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Endpoint ${req.originalUrl} not found`,
    documentation: '/api/v1/docs',
  });
});

/**
 * Error handler for v1 API
 */
router.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('API v1 error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Internal server error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default router;
