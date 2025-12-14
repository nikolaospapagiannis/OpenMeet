/**
 * Logger Utility
 * Production-grade Winston logger with ELK integration
 * Outputs structured JSON logs for centralized logging
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Correlation ID storage (AsyncLocalStorage would be better for production)
let currentCorrelationId: string | undefined;

/**
 * Set correlation ID for request tracing
 */
export function setCorrelationId(correlationId?: string): string {
  currentCorrelationId = correlationId || uuidv4();
  return currentCorrelationId;
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string | undefined {
  return currentCorrelationId;
}

/**
 * Custom format to add correlation ID and metadata
 */
const addMetadata = winston.format((info) => {
  // Add correlation ID
  if (currentCorrelationId) {
    info.correlation_id = currentCorrelationId;
  }

  // Add service metadata
  info.service = process.env.SERVICE_NAME || 'api';
  info.version = process.env.APP_VERSION || '1.0.0';
  info.environment = process.env.NODE_ENV || 'development';
  info.hostname = os.hostname();
  info.pid = process.pid;

  // Add Kubernetes metadata if available
  if (process.env.KUBERNETES_SERVICE_HOST) {
    info.kubernetes = {
      namespace: process.env.K8S_NAMESPACE || 'production',
      pod: process.env.K8S_POD_NAME || os.hostname(),
      container: process.env.K8S_CONTAINER_NAME || 'api',
      node: process.env.K8S_NODE_NAME,
    };
  }

  return info;
});

/**
 * Production JSON format for ELK
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  addMetadata(),
  winston.format.json()
);

/**
 * Development format with colors and readability
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, module, correlation_id, ...meta }) => {
    let msg = `${timestamp} [${level}]`;
    if (module) msg += ` [${module}]`;
    if (correlation_id && typeof correlation_id === 'string') msg += ` [${correlation_id.substring(0, 8)}]`;
    msg += ` ${message}`;

    const metaKeys = Object.keys(meta).filter(
      key => !['service', 'version', 'environment', 'hostname', 'pid', 'kubernetes'].includes(key)
    );
    if (metaKeys.length > 0) {
      const filteredMeta = metaKeys.reduce((obj, key) => {
        obj[key] = meta[key];
        return obj;
      }, {} as any);
      msg += ` ${JSON.stringify(filteredMeta)}`;
    }
    return msg;
  })
);

/**
 * TCP transport for Logstash (production only)
 */
const createLogstashTransport = () => {
  const logstashHost = process.env.LOGSTASH_HOST || 'logstash';
  const logstashPort = parseInt(process.env.LOGSTASH_PORT || '5000', 10);

  return new winston.transports.Http({
    host: logstashHost,
    port: logstashPort,
    path: '/',
    format: productionFormat,
    ssl: false,
  });
};

/**
 * Create logger instance
 */
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: isProduction ? productionFormat : developmentFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'api',
  },
  transports: [
    // Console transport - always enabled for stdout (captured by Filebeat)
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Add Logstash transport in production
if (isProduction && process.env.ENABLE_LOGSTASH === 'true') {
  try {
    logger.add(createLogstashTransport());
    logger.info('Logstash transport enabled', {
      host: process.env.LOGSTASH_HOST || 'logstash',
      port: process.env.LOGSTASH_PORT || '5000',
    });
  } catch (error) {
    logger.warn('Failed to enable Logstash transport', { error });
  }
}

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.Console({
    format: productionFormat,
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.Console({
    format: productionFormat,
  })
);

/**
 * Create child logger for specific modules
 */
export function createLogger(moduleName: string, metadata?: Record<string, any>) {
  return logger.child({ module: moduleName, ...metadata });
}

/**
 * Log HTTP request
 */
export function logRequest(req: any, res: any, responseTime: number) {
  const logData = {
    http_method: req.method,
    http_url: req.url,
    http_status: res.statusCode,
    http_user_agent: req.headers['user-agent'],
    client_ip: req.ip || req.connection?.remoteAddress,
    response_time_ms: responseTime,
    correlation_id: getCorrelationId(),
  };

  if (res.statusCode >= 500) {
    logger.error('HTTP request failed', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('HTTP request client error', logData);
  } else {
    logger.info('HTTP request completed', logData);
  }
}

/**
 * Log audit event
 */
export function logAudit(action: string, user: any, resource: any, status: 'success' | 'failure', metadata?: Record<string, any>) {
  logger.info('Audit event', {
    log_type: 'audit',
    action,
    user: {
      id: user?.id,
      email: user?.email,
      role: user?.role,
    },
    resource: {
      type: resource?.type,
      id: resource?.id,
    },
    status,
    correlation_id: getCorrelationId(),
    ...metadata,
  });
}

/**
 * Log security event
 */
export function logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>) {
  logger.warn('Security event', {
    log_type: 'security',
    event,
    severity,
    correlation_id: getCorrelationId(),
    ...metadata,
  });
}

/**
 * Log performance metric
 */
export function logPerformance(operation: string, durationMs: number, metadata?: Record<string, any>) {
  const logData = {
    log_type: 'performance',
    operation,
    duration_ms: durationMs,
    correlation_id: getCorrelationId(),
    ...metadata,
  };

  if (durationMs > 5000) {
    logger.warn('Slow operation detected', logData);
  } else {
    logger.debug('Performance metric', logData);
  }
}

export default logger;
