/**
 * Rate Limiting Middleware
 *
 * Fortune 100-grade rate limiting middleware
 * - Per-user rate limiting
 * - Per-IP rate limiting
 * - Per-API-key rate limiting
 * - Endpoint-specific rate limiting
 * - Returns proper 429 responses with Retry-After headers
 */

import { Request, Response, NextFunction } from 'express';
import { getRateLimiterService, RateLimitOptions } from '../services/RateLimiterService';
import {
  getRateLimitForTier,
  getEndpointRateLimit,
  isIPWhitelisted,
  isIPBlacklisted,
} from '../config/rate-limits';
import { logger } from '../utils/logger';
import { redis } from '../index';
import { PrismaClient, SubscriptionTier } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.socket.remoteAddress || 'unknown';

  return ip.trim();
}

/**
 * Send rate limit exceeded response
 */
function sendRateLimitResponse(
  res: Response,
  result: any,
  identifier: string,
  limitType: string
): void {
  const retryAfter = result.retryAfter || Math.ceil((result.msBeforeNext || 0) / 1000);

  res.set({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': result.resetAt.toISOString(),
    'Retry-After': retryAfter.toString(),
  });

  res.status(429).json({
    error: 'Too Many Requests',
    message: `Rate limit exceeded for ${limitType}. Please try again in ${retryAfter} seconds.`,
    limit: result.limit,
    remaining: 0,
    resetAt: result.resetAt,
    retryAfter,
    identifier: identifier.substring(0, 8) + '***', // Partial identifier for security
  });

  logger.warn('Rate limit exceeded', {
    limitType,
    identifier,
    retryAfter,
    endpoint: res.req.path,
  });
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(res: Response, result: any): void {
  res.set({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  });
}

/**
 * Check if user should bypass rate limiting based on role or subscription tier
 */
function shouldBypassRateLimit(user: any, organization: any): boolean {
  // Admin and superadmin users bypass rate limiting
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    logger.debug('Rate limit bypassed for admin user', { userId: user.id, role: user.role });
    return true;
  }
  // Enterprise and business tier users bypass most limits
  if (organization?.subscriptionTier === 'enterprise' || organization?.subscriptionTier === 'business') {
    logger.debug('Rate limit bypassed for premium tier', {
      userId: user?.id,
      tier: organization.subscriptionTier
    });
    return true;
  }
  return false;
}

/**
 * Rate limit by user ID
 */
export function rateLimitByUser(
  options?: Partial<RateLimitOptions>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        // No user, skip this middleware (will be caught by auth middleware)
        return next();
      }

      // Get user's subscription tier
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { subscriptionTier: true },
      });

      // Check if user should bypass rate limiting
      if (shouldBypassRateLimit(user, organization)) {
        // Set unlimited headers for bypassed users
        res.set({
          'X-RateLimit-Limit': 'unlimited',
          'X-RateLimit-Remaining': 'unlimited',
          'X-RateLimit-Bypass': 'true',
        });
        return next();
      }

      const rateLimiter = getRateLimiterService(redis);
      const tier = organization?.subscriptionTier || SubscriptionTier.free;
      const tierLimits = getRateLimitForTier(tier);

      const rateLimitOptions: RateLimitOptions = {
        points: options?.points || tierLimits.requestsPerMinute,
        duration: options?.duration || 60,
        blockDuration: options?.blockDuration || 300,
        keyPrefix: 'user',
      };

      const identifier = `user:${user.id}`;
      const result = await rateLimiter.tokenBucket(identifier, rateLimitOptions);

      if (!result.allowed) {
        return sendRateLimitResponse(res, result, identifier, 'user');
      }

      setRateLimitHeaders(res, result);
      next();
    } catch (error) {
      logger.error('Rate limit by user error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIP(
  options?: Partial<RateLimitOptions>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);

      // Check whitelist
      if (isIPWhitelisted(ip)) {
        logger.debug('IP whitelisted, bypassing rate limit', { ip });
        return next();
      }

      // Check blacklist
      if (isIPBlacklisted(ip)) {
        logger.warn('Blacklisted IP blocked', { ip });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your IP address has been blocked',
        });
      }

      const rateLimiter = getRateLimiterService(redis);

      const rateLimitOptions: RateLimitOptions = {
        points: options?.points || 1000,
        duration: options?.duration || 60,
        blockDuration: options?.blockDuration || 300,
        keyPrefix: 'ip',
      };

      const identifier = `ip:${ip}`;
      const result = await rateLimiter.tokenBucket(identifier, rateLimitOptions);

      if (!result.allowed) {
        return sendRateLimitResponse(res, result, identifier, 'IP address');
      }

      setRateLimitHeaders(res, result);
      next();
    } catch (error) {
      logger.error('Rate limit by IP error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Rate limit by API key
 */
export function rateLimitByAPIKey(
  options?: Partial<RateLimitOptions>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = (req as any).apiKey;

      if (!apiKey) {
        // No API key, skip this middleware
        return next();
      }

      const rateLimiter = getRateLimiterService(redis);

      // Get API key's rate limit from permissions
      const permissions = apiKey.permissions as any;
      const apiKeyRateLimit = permissions?.rateLimit || 1000;

      const rateLimitOptions: RateLimitOptions = {
        points: options?.points || apiKeyRateLimit,
        duration: options?.duration || 3600, // 1 hour
        blockDuration: options?.blockDuration || 3600,
        keyPrefix: 'apikey',
      };

      const identifier = `apikey:${apiKey.id}`;
      const result = await rateLimiter.tokenBucket(identifier, rateLimitOptions);

      if (!result.allowed) {
        return sendRateLimitResponse(res, result, identifier, 'API key');
      }

      setRateLimitHeaders(res, result);
      next();
    } catch (error) {
      logger.error('Rate limit by API key error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Rate limit by endpoint (path-specific limits)
 */
export function rateLimitByEndpoint(
  customLimit?: number,
  customWindow?: number
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const endpoint = req.path;
      const rateLimiter = getRateLimiterService(redis);

      // Get endpoint-specific limit or use custom
      const endpointLimit = getEndpointRateLimit(endpoint);

      const rateLimitOptions: RateLimitOptions = {
        points: customLimit || endpointLimit?.points || 100,
        duration: customWindow || endpointLimit?.duration || 60,
        blockDuration: endpointLimit?.blockDuration || 300,
        keyPrefix: 'endpoint',
      };

      // Use IP as identifier for endpoint-specific limits
      const ip = getClientIP(req);
      const identifier = `endpoint:${endpoint}:${ip}`;

      const result = await rateLimiter.fixedWindowCounter(identifier, rateLimitOptions);

      if (!result.allowed) {
        return sendRateLimitResponse(
          res,
          result,
          identifier,
          `endpoint ${endpoint}`
        );
      }

      setRateLimitHeaders(res, result);
      next();
    } catch (error) {
      logger.error('Rate limit by endpoint error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Combined rate limiting middleware
 * Applies multiple rate limit strategies
 */
export function combinedRateLimiting(
  options?: {
    byUser?: boolean;
    byIP?: boolean;
    byAPIKey?: boolean;
    byEndpoint?: boolean;
  }
) {
  const opts = {
    byUser: true,
    byIP: true,
    byAPIKey: true,
    byEndpoint: true,
    ...options,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    const middlewares = [];

    if (opts.byIP) {
      middlewares.push(rateLimitByIP());
    }

    if (opts.byUser) {
      middlewares.push(rateLimitByUser());
    }

    if (opts.byAPIKey) {
      middlewares.push(rateLimitByAPIKey());
    }

    if (opts.byEndpoint) {
      middlewares.push(rateLimitByEndpoint());
    }

    // Execute middlewares in sequence
    let index = 0;

    const executeNext = (err?: any) => {
      if (err) {
        return next(err);
      }

      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, executeNext);
    };

    executeNext();
  };
}

/**
 * Sliding window rate limiter
 */
export function slidingWindowRateLimit(
  points: number,
  durationSeconds: number
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);
      const rateLimiter = getRateLimiterService(redis);

      const rateLimitOptions: RateLimitOptions = {
        points,
        duration: durationSeconds,
        blockDuration: durationSeconds,
        keyPrefix: 'sliding',
      };

      const identifier = `sliding:${ip}:${req.path}`;
      const result = await rateLimiter.slidingWindowLog(identifier, rateLimitOptions);

      if (!result.allowed) {
        return sendRateLimitResponse(res, result, identifier, 'sliding window');
      }

      setRateLimitHeaders(res, result);
      next();
    } catch (error) {
      logger.error('Sliding window rate limit error:', error);
      // Fail open
      next();
    }
  };
}

/**
 * Burst protection middleware
 */
export function burstProtection(
  maxBurst: number,
  windowSeconds: number = 1
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);
      const rateLimiter = getRateLimiterService(redis);

      const rateLimitOptions: RateLimitOptions = {
        points: maxBurst,
        duration: windowSeconds,
        blockDuration: 300, // 5 minute block
        keyPrefix: 'burst',
      };

      const identifier = `burst:${ip}`;
      const result = await rateLimiter.tokenBucket(identifier, rateLimitOptions);

      if (!result.allowed) {
        logger.warn('Burst protection triggered', { ip, maxBurst, windowSeconds });
        return sendRateLimitResponse(res, result, identifier, 'burst protection');
      }

      next();
    } catch (error) {
      logger.error('Burst protection error:', error);
      // Fail open
      next();
    }
  };
}
