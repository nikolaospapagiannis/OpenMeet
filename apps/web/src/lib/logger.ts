/**
 * Frontend Logger Utility
 * Enterprise-grade structured logging for client-side applications
 *
 * Features:
 * - Log levels with filtering (debug, info, warn, error)
 * - Structured metadata support
 * - Component/context tagging
 * - Production error tracking integration (Sentry-ready)
 * - Development console formatting
 * - Timestamp inclusion
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  component?: string;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
  error?: Error;
}

// Error tracking integration interface (Sentry-compatible)
interface ErrorTracker {
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level: string, context?: Record<string, unknown>) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
}

// Error tracking service instance - initialized via initializeErrorTracking()
let errorTracker: ErrorTracker | null = null;

/**
 * Initialize error tracking service (call this in app initialization)
 * @example
 * // In _app.tsx or layout.tsx
 * import * as Sentry from '@sentry/nextjs';
 * initializeErrorTracking({
 *   captureException: Sentry.captureException,
 *   captureMessage: Sentry.captureMessage,
 *   setUser: Sentry.setUser,
 *   setContext: Sentry.setContext,
 * });
 */
export function initializeErrorTracking(tracker: ErrorTracker): void {
  errorTracker = tracker;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';
  private logLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';
  private defaultMetadata: LogMetadata = {};

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private levelColors: Record<LogLevel, string> = {
    debug: '#9E9E9E',
    info: '#2196F3',
    warn: '#FF9800',
    error: '#F44336',
  };

  private shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false;
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = this.formatTimestamp();
    const component = metadata?.component ? `[${metadata.component}]` : '';
    return `${timestamp} [${level.toUpperCase()}]${component} ${message}`;
  }

  private formatMetadataForConsole(metadata?: LogMetadata): string {
    if (!metadata || Object.keys(metadata).length === 0) return '';
    const { component, ...rest } = metadata;
    if (Object.keys(rest).length === 0) return '';
    return JSON.stringify(rest, null, 2);
  }

  private sendToErrorTracker(entry: LogEntry): void {
    if (!errorTracker) return;

    try {
      if (entry.error) {
        errorTracker.captureException(entry.error, {
          level: entry.level,
          extra: entry.metadata,
        });
      } else if (entry.level === 'error' || entry.level === 'warn') {
        errorTracker.captureMessage(entry.message, entry.level, {
          extra: entry.metadata,
        });
      }
    } catch {
      // Silently fail if error tracking fails
    }
  }

  /**
   * Set default metadata to include in all log entries
   */
  setDefaultMetadata(metadata: LogMetadata): void {
    this.defaultMetadata = { ...this.defaultMetadata, ...metadata };
    if (errorTracker && metadata.userId) {
      errorTracker.setUser({ id: metadata.userId });
    }
  }

  /**
   * Clear default metadata
   */
  clearDefaultMetadata(): void {
    this.defaultMetadata = {};
    if (errorTracker) {
      errorTracker.setUser(null);
    }
  }

  /**
   * Create a child logger with preset component context
   */
  child(component: string): ChildLogger {
    return new ChildLogger(this, component);
  }

  /**
   * Log debug level message
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog('debug')) return;

    const mergedMetadata = { ...this.defaultMetadata, ...metadata };
    const formattedMessage = this.formatMessage('debug', message, mergedMetadata);
    const metadataStr = this.formatMetadataForConsole(mergedMetadata);

    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug(
        `%c${formattedMessage}`,
        `color: ${this.levelColors.debug}`,
        metadataStr ? `\n${metadataStr}` : ''
      );
    }
  }

  /**
   * Log info level message
   */
  info(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog('info')) return;

    const mergedMetadata = { ...this.defaultMetadata, ...metadata };
    const formattedMessage = this.formatMessage('info', message, mergedMetadata);
    const metadataStr = this.formatMetadataForConsole(mergedMetadata);

    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.info(
        `%c${formattedMessage}`,
        `color: ${this.levelColors.info}`,
        metadataStr ? `\n${metadataStr}` : ''
      );
    }
  }

  /**
   * Log warn level message
   */
  warn(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog('warn')) return;

    const mergedMetadata = { ...this.defaultMetadata, ...metadata };
    const formattedMessage = this.formatMessage('warn', message, mergedMetadata);
    const metadataStr = this.formatMetadataForConsole(mergedMetadata);

    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: this.formatTimestamp(),
      metadata: mergedMetadata,
    };

    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.warn(
        `%c${formattedMessage}`,
        `color: ${this.levelColors.warn}`,
        metadataStr ? `\n${metadataStr}` : ''
      );
    }

    this.sendToErrorTracker(entry);
  }

  /**
   * Log error level message
   */
  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    if (!this.shouldLog('error')) return;

    const mergedMetadata = { ...this.defaultMetadata, ...metadata };
    const formattedMessage = this.formatMessage('error', message, mergedMetadata);
    const metadataStr = this.formatMetadataForConsole(mergedMetadata);

    const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;

    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: this.formatTimestamp(),
      metadata: mergedMetadata,
      error: errorObj,
    };

    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.error(
        `%c${formattedMessage}`,
        `color: ${this.levelColors.error}`,
        metadataStr ? `\n${metadataStr}` : '',
        errorObj ? `\n${errorObj.stack || errorObj.message}` : ''
      );
    }

    this.sendToErrorTracker(entry);
  }
}

/**
 * Child logger with preset component context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private component: string
  ) {}

  debug(message: string, metadata?: Omit<LogMetadata, 'component'>): void {
    this.parent.debug(message, { ...metadata, component: this.component });
  }

  info(message: string, metadata?: Omit<LogMetadata, 'component'>): void {
    this.parent.info(message, { ...metadata, component: this.component });
  }

  warn(message: string, metadata?: Omit<LogMetadata, 'component'>): void {
    this.parent.warn(message, { ...metadata, component: this.component });
  }

  error(message: string, error?: Error | unknown, metadata?: Omit<LogMetadata, 'component'>): void {
    this.parent.error(message, error, { ...metadata, component: this.component });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { ErrorTracker, ChildLogger };