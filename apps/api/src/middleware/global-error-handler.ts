/**
 * Global Error Handler Middleware
 * Comprehensive error handling with structured logging and error classification
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { captureException, setContext, addBreadcrumb } from '../lib/error-monitoring';

/**
 * Custom error types
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public errorCode?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any[]) {
    super(400, message, true, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, message, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, true, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, public serviceName?: string) {
    super(502, message, true, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Error response formatter
 */
function formatErrorResponse(err: Error, isDevelopment: boolean) {
  const appError = err as AppError;

  const baseResponse: any = {
    success: false,
    error: {
      message: appError.message || 'An unexpected error occurred',
      code: appError.errorCode || 'INTERNAL_ERROR',
    },
  };

  // Add validation errors if present
  if (err instanceof ValidationError && err.errors) {
    baseResponse.error.validationErrors = err.errors;
  }

  // Add stack trace in development
  if (isDevelopment) {
    baseResponse.error.stack = err.stack;
    baseResponse.error.name = err.name;
  }

  return baseResponse;
}

/**
 * Determine if error is operational (expected) or programming error
 */
function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Determine status code
  const statusCode = (err as AppError).statusCode || 500;

  // Get request logger or fallback to default logger
  const requestLogger = req.logger || logger;

  // Build error context
  const errorContext = {
    error: err.message,
    stack: err.stack,
    statusCode,
    errorCode: (err as AppError).errorCode,
    isOperational: isOperationalError(err),
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: (req as any).user?.id,
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
  };

  // Log error at appropriate level
  if (statusCode >= 500) {
    requestLogger.error('Server error occurred', errorContext);
  } else if (statusCode >= 400) {
    requestLogger.warn('Client error occurred', errorContext);
  }

  // Send error monitoring alert for critical errors
  if (!isOperationalError(err) || statusCode >= 500) {
    // Set context for error monitoring
    setContext('request', {
      path: req.path,
      method: req.method,
      requestId: req.requestId,
      userId: (req as any).user?.id,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    });

    // Add breadcrumb for error tracking
    addBreadcrumb({
      category: 'error',
      message: err.message,
      level: 'error',
      data: {
        statusCode,
        errorCode: (err as AppError).errorCode,
        isOperational: isOperationalError(err),
      },
    });

    // Capture exception in Sentry
    const eventId = captureException(err, {
      ...errorContext,
      critical: true,
    });

    requestLogger.error('Critical error captured in monitoring service', {
      ...errorContext,
      critical: true,
      sentryEventId: eventId,
    });
  }

  // Format and send response
  const errorResponse = formatErrorResponse(err, isDevelopment);
  res.status(statusCode).json(errorResponse);

  // For critical errors, consider graceful shutdown in production
  if (!isOperationalError(err) && process.env.NODE_ENV === 'production') {
    requestLogger.error('Non-operational error detected - may require restart', {
      ...errorContext,
      requiresRestart: true,
    });
  }
}

/**
 * Handle 404 errors (route not found)
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Process uncaught exceptions
 */
export function handleUncaughtException(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception - shutting down gracefully', {
      error: error.message,
      stack: error.stack,
      critical: true,
    });

    // Exit process after logging
    process.exit(1);
  });
}

/**
 * Process unhandled promise rejections
 */
export function handleUnhandledRejection(): void {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection - shutting down gracefully', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      critical: true,
    });

    // Exit process after logging
    process.exit(1);
  });
}

export default globalErrorHandler;
