/**
 * Error Monitoring Integration
 * Integrates with Sentry for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Initialize Sentry error monitoring
 */
export function initializeErrorMonitoring(app?: Express): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('Sentry DSN not configured - error monitoring disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',

      // Performance monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

      // Profiling
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),

      integrations: [
        // HTTP instrumentation
        new Sentry.Integrations.Http({ tracing: true }),

        // Express instrumentation
        ...(app ? [
          new Sentry.Integrations.Express({ app }),
          nodeProfilingIntegration(),
        ] : []),
      ],

      // Before send hook - customize error data
      beforeSend(event, hint) {
        // Filter out certain errors
        const error = hint.originalException;

        // Don't send client errors (4xx) to Sentry
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as any).statusCode;
          if (statusCode >= 400 && statusCode < 500) {
            return null;
          }
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        'ECONNRESET',
        'EPIPE',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ValidationError',
        'AuthenticationError',
        'AuthorizationError',
      ],
    });

    logger.info('Error monitoring initialized', {
      environment: process.env.NODE_ENV,
      release: process.env.APP_VERSION,
    });
  } catch (error: any) {
    logger.error('Failed to initialize error monitoring', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Sentry request handler middleware
 */
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Sentry tracing middleware
 */
export function sentryTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

/**
 * Sentry error handler middleware
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      const statusCode = (error as any).statusCode || 500;
      return statusCode >= 500;
    },
  });
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set custom context/tags
 */
export function setContext(name: string, context: Record<string, any>): void {
  Sentry.setContext(name, context);
}

export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  operation: string
): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

/**
 * Wrap async function with error monitoring
 */
export async function withErrorMonitoring<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    captureException(error, context);
    throw error;
  }
}

/**
 * Middleware to set user context from request
 */
export function userContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (user) {
    setUser({
      id: user.id,
      email: user.email,
      username: user.username || user.name,
    });
  }

  res.on('finish', () => {
    // Clear user context after request
    clearUser();
  });

  next();
}

export default {
  initializeErrorMonitoring,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setContext,
  setTag,
  startTransaction,
  withErrorMonitoring,
  userContextMiddleware,
};
