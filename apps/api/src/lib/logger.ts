/**
 * Enhanced Structured Logger
 * Production-grade logging with request correlation, context tracking, and multiple transports
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, requestId, userId, module, ...meta }) => {
    let msg = `${timestamp} [${level}]`;

    if (requestId && typeof requestId === 'string') msg += ` [req:${requestId.substring(0, 8)}]`;
    if (userId) msg += ` [user:${userId}]`;
    if (module) msg += ` [${module}]`;

    msg += ` ${message}`;

    const metaKeys = Object.keys(meta).filter(
      key => !['timestamp', 'level', 'message', 'service'].includes(key)
    );

    if (metaKeys.length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  })
);

// Production format (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create base logger
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  defaultMeta: {
    service: 'openmeet-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: prodFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: prodFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // HTTP request log file
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      level: 'http',
      format: prodFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: prodFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: prodFormat,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  baseLogger.add(
    new winston.transports.Console({
      format: devFormat,
    })
  );
} else {
  // In production, still log to console but with JSON format
  baseLogger.add(
    new winston.transports.Console({
      format: prodFormat,
    })
  );
}

/**
 * Enhanced logger with context support
 */
export class Logger {
  private logger: winston.Logger;
  private context: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.logger = baseLogger;
    this.context = context;
  }

  private log(level: string, message: string, meta: Record<string, any> = {}) {
    this.logger.log(level, message, { ...this.context, ...meta });
  }

  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  http(message: string, meta?: Record<string, any>) {
    this.log('http', message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  // Create child logger with additional context
  child(context: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...context });
  }

  // Add context to current logger
  withContext(context: Record<string, any>): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }
}

// Create default logger instance
export const logger = new Logger();

// Create module-specific loggers
export function createModuleLogger(moduleName: string): Logger {
  return new Logger({ module: moduleName });
}

// Create request-specific logger
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return new Logger({
    requestId,
    ...(userId && { userId })
  });
}

// Generate request ID
export function generateRequestId(): string {
  return uuidv4();
}

export default logger;
