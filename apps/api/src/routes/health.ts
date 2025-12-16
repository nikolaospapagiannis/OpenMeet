/**
 * Health Check Routes
 * Provides comprehensive health and readiness endpoints for monitoring
 */

import { Router, Request, Response } from 'express';
import { HealthChecker } from '../lib/health-checker';
import { logger } from '../lib/logger';

const router: Router = Router();

// Initialize health checker (will be configured with dependencies in index.ts)
let healthChecker: HealthChecker;

export function initializeHealthChecker(checker: HealthChecker): void {
  healthChecker = checker;
}

/**
 * GET /health
 * Comprehensive health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = await healthChecker.checkHealth();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * GET /health/live
 * Kubernetes liveness probe - simple check if app is running
 */
router.get('/live', (req: Request, res: Response) => {
  const health = healthChecker.checkLiveness();
  res.status(200).json(health);
});

/**
 * GET /health/ready
 * Kubernetes readiness probe - checks if app can handle traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const health = await healthChecker.checkReadiness();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error('Readiness check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
      message: error.message,
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with all information (internal use only)
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const health = await healthChecker.checkHealth();

    res.status(200).json({
      ...health,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memory: process.memoryUsage(),
    });
  } catch (error: any) {
    logger.error('Detailed health check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
