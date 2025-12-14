/**
 * Request Logger Middleware
 * Logs all HTTP requests with correlation IDs and performance metrics
 */

import { Request, Response, NextFunction } from 'express';
import { generateRequestId, createRequestLogger } from '../lib/logger';

// Extend Express Request to include requestId and logger
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: ReturnType<typeof createRequestLogger>;
      startTime: number;
    }
  }
}

/**
 * Middleware to add request ID and logger to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract request ID from header
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();

  // Attach request ID to request object
  req.requestId = requestId;

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', requestId);

  // Extract user ID if authenticated
  const userId = (req as any).user?.id;

  // Create request-specific logger
  req.logger = createRequestLogger(requestId, userId);

  // Track request start time
  req.startTime = Date.now();

  next();
}

/**
 * Middleware to log HTTP requests and responses
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const { method, originalUrl, ip, headers } = req;

  // Log incoming request
  req.logger.http('Incoming request', {
    method,
    url: originalUrl,
    ip: ip || headers['x-forwarded-for'] || headers['x-real-ip'],
    userAgent: headers['user-agent'],
    referer: headers['referer'],
  });

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (data: any): Response {
    responseBody = data;
    return originalSend.call(this, data);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const { statusCode } = res;

    const logData = {
      method,
      url: originalUrl,
      statusCode,
      duration,
      contentLength: res.get('content-length'),
    };

    // Log at appropriate level based on status code
    if (statusCode >= 500) {
      req.logger.error('Request completed with server error', logData);
    } else if (statusCode >= 400) {
      req.logger.warn('Request completed with client error', logData);
    } else {
      req.logger.http('Request completed successfully', logData);
    }

    // Performance warning for slow requests
    if (duration > 5000) {
      req.logger.warn('Slow request detected', {
        ...logData,
        threshold: 5000,
      });
    }
  });

  // Log errors
  res.on('error', (error) => {
    req.logger.error('Response error', {
      error: error.message,
      stack: error.stack,
      method,
      url: originalUrl,
    });
  });

  next();
}

/**
 * Combined middleware for request tracking and logging
 */
export function requestTracking() {
  return [requestIdMiddleware, requestLogger];
}

export default requestTracking;
