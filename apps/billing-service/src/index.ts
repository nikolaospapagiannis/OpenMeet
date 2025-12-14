/**
 * OpenMeet Billing Microservice
 *
 * Dedicated billing service for:
 * - Subscription management (multi-tenant)
 * - Usage-based billing (pay-by-use)
 * - Stripe integration with metering
 * - Invoice management
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';

// Routes
import subscriptionRoutes from './routes/subscriptions';
import usageRoutes from './routes/usage';
import invoiceRoutes from './routes/invoices';
import webhookRoutes from './routes/webhooks';
import plansRoutes from './routes/plans';

// Middleware
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

// Logger setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'billing-service' },
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

const app: Express = express();
const PORT = parseInt(process.env.BILLING_SERVICE_PORT || process.env.PORT || '4300', 10);

// Trust proxy for accurate IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'js.stripe.com'],
      frameSrc: ["'self'", 'js.stripe.com', 'hooks.stripe.com'],
      connectSrc: ["'self'", 'api.stripe.com'],
    },
  },
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID', 'X-Request-ID'],
}));

// Webhook route needs raw body - must be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Standard middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check (no auth required)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'billing-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Readiness check with Stripe connection test
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-11-17.clover' as const,
    });

    // Verify Stripe connection
    await stripe.balance.retrieve();

    res.json({
      status: 'ready',
      service: 'billing-service',
      stripe: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'billing-service',
      stripe: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Webhook routes (no auth - uses Stripe signature verification)
app.use('/api/billing/webhook', webhookRoutes);

// Plans route (public - no auth required)
app.use('/api/billing/plans', plansRoutes);

// Protected routes - require authentication and tenant context
app.use('/api/billing', authMiddleware, tenantMiddleware);

// API routes
app.use('/api/billing/subscriptions', subscriptionRoutes);
app.use('/api/billing/usage', usageRoutes);
app.use('/api/billing/invoices', invoiceRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested billing endpoint does not exist',
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Give active requests time to complete
  setTimeout(() => {
    logger.info('Shutting down billing service');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  logger.info(`Billing service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API base: http://localhost:${PORT}/api/billing`);
});

export default app;
