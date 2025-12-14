/**
 * Prometheus Metrics Middleware
 * Exposes performance metrics for load testing monitoring
 */

import { Request, Response, NextFunction, Router } from 'express';
import promClient from 'prom-client';

// Create a Registry
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'openmeet_',
});

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
  registers: [register],
});

export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpActiveConnections = new promClient.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

export const websocketActiveConnections = new promClient.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of database queries in milliseconds',
  labelNames: ['operation', 'table'],
  buckets: [0.1, 1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

export const dbQueriesTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

export const cacheHitsTotal = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMissesTotal = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

export const queueJobsProcessed = new promClient.Counter({
  name: 'queue_jobs_processed_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

export const queueJobDuration = new promClient.Histogram({
  name: 'queue_job_duration_ms',
  help: 'Duration of queue job processing in milliseconds',
  labelNames: ['queue', 'job_type'],
  buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
  registers: [register],
});

export const apiErrorsTotal = new promClient.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['error_type', 'route'],
  registers: [register],
});

export const authAttemptsTotal = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'],
  registers: [register],
});

export const uploadSizeBytes = new promClient.Histogram({
  name: 'upload_size_bytes',
  help: 'Size of file uploads in bytes',
  labelNames: ['file_type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
  registers: [register],
});

export const transcriptionDuration = new promClient.Histogram({
  name: 'transcription_duration_ms',
  help: 'Duration of transcription processing',
  labelNames: ['provider'],
  buckets: [1000, 5000, 10000, 30000, 60000, 120000, 300000],
  registers: [register],
});

/**
 * Prometheus metrics middleware
 * Tracks all HTTP requests
 */
export function prometheusMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  // Increment active connections
  httpActiveConnections.inc();

  // On response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration
    );

    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });

    // Decrement active connections
    httpActiveConnections.dec();
  });

  next();
}

/**
 * Metrics endpoint
 */
export const metricsRouter = Router();

metricsRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
});

/**
 * Custom metrics recording utilities
 */
export class MetricsService {
  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean) {
    dbQueryDuration.observe({ operation, table }, duration);
    dbQueriesTotal.inc({ operation, table, status: success ? 'success' : 'error' });
  }

  recordCacheHit(cacheType: string) {
    cacheHitsTotal.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType: string) {
    cacheMissesTotal.inc({ cache_type: cacheType });
  }

  recordQueueJob(queue: string, jobType: string, duration: number, status: string) {
    queueJobDuration.observe({ queue, job_type: jobType }, duration);
    queueJobsProcessed.inc({ queue, status });
  }

  recordError(errorType: string, route: string) {
    apiErrorsTotal.inc({ error_type: errorType, route });
  }

  recordAuthAttempt(method: string, success: boolean) {
    authAttemptsTotal.inc({ method, status: success ? 'success' : 'failure' });
  }

  recordUpload(fileType: string, sizeBytes: number) {
    uploadSizeBytes.observe({ file_type: fileType }, sizeBytes);
  }

  recordTranscription(provider: string, duration: number) {
    transcriptionDuration.observe({ provider }, duration);
  }

  recordResponseTime(path: string, duration: number, statusCode: number) {
    httpRequestDuration.observe(
      {
        method: 'GET',
        route: path,
        status_code: statusCode.toString(),
      },
      duration
    );
  }

  recordWebSocketConnection(delta: number) {
    if (delta > 0) {
      websocketActiveConnections.inc(delta);
    } else {
      websocketActiveConnections.dec(Math.abs(delta));
    }
  }
}

export const metricsService = new MetricsService();
