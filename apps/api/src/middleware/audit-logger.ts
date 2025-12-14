/**
 * Audit Logger Middleware
 *
 * Automatically captures ALL API requests and logs them to the audit system.
 * This middleware should be applied to ALL routes for complete audit coverage.
 *
 * Features:
 * - Captures request/response details
 * - Sanitizes sensitive data
 * - Tracks request duration
 * - Logs errors and exceptions
 * - Compliance categorization
 */

import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit-service';
import { AuditStatus } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Audit logger middleware - captures ALL API requests
 */
export const auditLogger = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const user = (req as any).user;

    // Capture original res.json to intercept response
    const originalJson = res.json.bind(res);
    let responseBody: any;

    res.json = function (body: any) {
      responseBody = body;
      return originalJson(body);
    };

    // Capture response completion
    const originalEnd = res.end.bind(res);
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;

      // Log the request after it completes (don't await to avoid blocking)
      logRequest(req, res, duration, responseBody, user).catch((error) => {
        logger.error('Failed to log audit entry', { error: error.message, stack: error.stack });
      });

      return originalEnd(...args);
    };

    next();
  };
};

/**
 * Log the request to audit system
 */
async function logRequest(
  req: Request,
  res: Response,
  duration: number,
  responseBody: any,
  user?: any
): Promise<void> {
  // Skip health checks and internal endpoints
  if (shouldSkipLogging(req.path)) {
    return;
  }

  const status = determineStatus(res.statusCode);
  const action = determineAction(req.method, req.path);
  const { resourceType, resourceId } = extractResource(req.path, req.params);

  await AuditService.log({
    userId: user?.id,
    organizationId: user?.organizationId,
    action,
    actionLabel: `${req.method} ${req.path}`,
    resourceType,
    resourceId,
    status,

    // Request details
    method: req.method,
    endpoint: req.path,
    queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
    requestBody: sanitizeRequestBody(req.body, req.path),
    responseStatus: res.statusCode,

    // Network details
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],

    // Metadata
    duration,
    metadata: {
      contentType: req.headers['content-type'],
      acceptLanguage: req.headers['accept-language'],
      referer: req.headers.referer,
    },

    // Risk assessment
    riskLevel: assessRiskLevel(req, res.statusCode, user),

    // Compliance flags
    isGdprRelevant: isGdprRelevant(req.path, req.method),
    isHipaaRelevant: isHipaaRelevant(req.path),
    isSoc2Relevant: true, // All API access is SOC2 relevant
  });
}

/**
 * Determine if request should be logged
 */
function shouldSkipLogging(path: string): boolean {
  const skipPaths = [
    '/health',
    '/ping',
    '/metrics',
    '/favicon.ico',
    '/_next', // Next.js internal
    '/api/health',
  ];

  return skipPaths.some((skipPath) => path.startsWith(skipPath));
}

/**
 * Determine action based on HTTP method and path
 */
function determineAction(method: string, path: string): string {
  // Map HTTP methods to actions
  const methodActionMap: Record<string, string> = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };

  // Check for specific endpoints
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/export')) return 'data_exported';
  if (path.includes('/download')) return 'data_accessed';
  if (path.includes('/upload')) return 'create';
  if (path.includes('/integrate')) return 'integration_connected';

  return methodActionMap[method] || 'api_request';
}

/**
 * Extract resource type and ID from path
 */
function extractResource(path: string, params: any): { resourceType?: string; resourceId?: string } {
  // Common REST patterns: /api/v1/meetings/123
  const segments = path.split('/').filter((s) => s);

  let resourceType: string | undefined;
  let resourceId: string | undefined;

  // Find resource type (usually after 'api' or version)
  const apiIndex = segments.findIndex((s) => s === 'api' || s.startsWith('v'));
  if (apiIndex !== -1 && segments.length > apiIndex + 1) {
    resourceType = segments[apiIndex + 1];

    // Check if next segment is an ID (UUID or number)
    if (segments.length > apiIndex + 2) {
      const potentialId = segments[apiIndex + 2];
      if (isResourceId(potentialId)) {
        resourceId = potentialId;
      }
    }
  }

  // Also check params for common ID fields
  if (!resourceId && params) {
    resourceId = params.id || params.userId || params.meetingId || params.orgId;
  }

  return { resourceType, resourceId };
}

/**
 * Check if string looks like a resource ID
 */
function isResourceId(str: string): boolean {
  // UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(str)) return true;

  // Numeric ID
  if (/^\d+$/.test(str)) return true;

  return false;
}

/**
 * Determine audit status from HTTP status code
 */
function determineStatus(statusCode: number): AuditStatus {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 400 && statusCode < 500) return 'failure';
  if (statusCode >= 500) return 'error';
  return 'pending';
}

/**
 * Sanitize request body to remove sensitive fields
 */
function sanitizeRequestBody(body: any, path: string): any {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
    'mfaSecret',
    'privateKey',
  ];

  const sanitize = (obj: any): any => {
    const sanitized = { ...obj };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitize(sanitized[key]);
      }
    }
    return sanitized;
  };

  return sanitize(body);
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  // Check various headers for the real IP (in case behind proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Assess risk level of request
 */
function assessRiskLevel(
  req: Request,
  statusCode: number,
  user?: any
): 'low' | 'medium' | 'high' | 'critical' {
  // Failed authentication
  if (req.path.includes('login') && statusCode >= 400) {
    return 'medium';
  }

  // Unauthorized access
  if (statusCode === 401 || statusCode === 403) {
    return 'high';
  }

  // Data export/delete operations
  if (req.method === 'DELETE' || req.path.includes('export')) {
    return 'high';
  }

  // Admin operations without auth
  if (req.path.includes('admin') && !user) {
    return 'critical';
  }

  // Permission changes
  if (req.path.includes('permission') || req.path.includes('role')) {
    return 'high';
  }

  // Integration operations
  if (req.path.includes('integration') || req.path.includes('webhook')) {
    return 'medium';
  }

  return 'low';
}

/**
 * Check if request is GDPR relevant
 */
function isGdprRelevant(path: string, method: string): boolean {
  const gdprPaths = [
    '/users',
    '/profile',
    '/account',
    '/personal',
    '/contact',
    '/participants',
    '/attendees',
  ];

  // Reading/writing personal data
  if (gdprPaths.some((p) => path.includes(p))) {
    return true;
  }

  // Data export requests
  if (path.includes('export') || path.includes('download')) {
    return true;
  }

  // Data deletion
  if (method === 'DELETE' && gdprPaths.some((p) => path.includes(p))) {
    return true;
  }

  return false;
}

/**
 * Check if request is HIPAA relevant
 */
function isHipaaRelevant(path: string): boolean {
  // Customize based on your PHI data endpoints
  const hipaaMarkers = ['/medical', '/health', '/patient', '/phi'];
  return hipaaMarkers.some((marker) => path.includes(marker));
}

/**
 * Middleware specifically for tracking failed login attempts
 */
export const trackFailedLogins = () => {
  const failedAttempts = new Map<string, number>();
  const THRESHOLD = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode === 401 && req.path.includes('login')) {
        const ip = getClientIp(req);
        const attempts = (failedAttempts.get(ip) || 0) + 1;
        failedAttempts.set(ip, attempts);

        // Alert on suspicious activity
        if (attempts >= THRESHOLD) {
          AuditService.logSuspiciousActivity(
            undefined,
            undefined,
            'multiple_failed_logins',
            ip,
            { attempts, threshold: THRESHOLD }
          ).catch((error) => {
            logger.error('Failed to log suspicious activity', { error: error.message, stack: error.stack });
          });

          // Clear after window
          setTimeout(() => failedAttempts.delete(ip), WINDOW_MS);
        }
      }

      return originalJson(body);
    };

    next();
  };
};

export default auditLogger;
