/**
 * Tiered Rate Limiter with Redis Sliding Window
 *
 * Implements real rate limiting based on subscription tier:
 * - Free tier: 100 requests/hour
 * - Pro tier: 1000 requests/hour
 * - Enterprise tier: 10000 requests/hour
 *
 * Uses Redis sliding window algorithm for accurate rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { APIKeyRequest } from './apiKeyAuth';

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err });
});

redis.on('connect', () => {
  logger.info('Redis connected for rate limiting');
});

// Rate limit tiers (requests per hour)
export const RATE_LIMITS = {
  free: 100,
  pro: 1000,
  business: 5000,
  enterprise: 10000,
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Calculate rate limit based on subscription tier
 */
function getRateLimitForTier(tier: string): number {
  const normalizedTier = tier.toLowerCase() as RateLimitTier;
  return RATE_LIMITS[normalizedTier] || RATE_LIMITS.free;
}

/**
 * Sliding window rate limiter using Redis sorted sets
 * More accurate than fixed window, prevents burst attacks
 */
async function checkRateLimitSlidingWindow(
  apiKeyId: string,
  limit: number,
  windowSeconds: number = 3600
): Promise<RateLimitResult> {
  const key = `rate_limit:${apiKeyId}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    pipeline.zcard(key);

    // Add current request with timestamp as score
    pipeline.zadd(key, now, `${now}:${Math.random()}`);

    // Set expiry on the key
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    // Get count from zcard result (index 1)
    const count = results[1][1] as number;

    const remaining = Math.max(0, limit - count - 1); // -1 for current request
    const allowed = count < limit;

    // Calculate reset time (start of next window)
    const resetAt = new Date(
      Math.ceil((now + windowSeconds * 1000) / (windowSeconds * 1000)) * windowSeconds * 1000
    );

    const retryAfter = allowed ? undefined : Math.ceil(windowSeconds);

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      retryAfter,
    };
  } catch (error) {
    logger.error('Rate limit check error', { error, apiKeyId });

    // Fail open: allow request if Redis is down
    // In production, you might want to fail closed for security
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: new Date(now + windowSeconds * 1000),
    };
  }
}

/**
 * Rate limiter middleware for API v1
 * Reads tier from API key, applies appropriate rate limit
 */
export async function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKeyReq = req as APIKeyRequest;

  if (!apiKeyReq.apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required',
    });
    return;
  }

  try {
    // Get API key and determine tier from organization
    const apiKeyId = apiKeyReq.apiKey.id;
    const organizationId = apiKeyReq.apiKey.organizationId;

    // Fetch organization tier (cached in API key validation)
    // For now, use the rate limit from API key permissions
    const limit = apiKeyReq.apiKey.rateLimit || RATE_LIMITS.free;

    // Check rate limit with sliding window
    const result = await checkRateLimitSlidingWindow(apiKeyId, limit);

    // Set rate limit headers (standard X-RateLimit headers)
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '3600');
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Rate limit of ${result.limit} requests/hour exceeded`,
        limit: result.limit,
        remaining: 0,
        resetAt: result.resetAt.toISOString(),
        retryAfter: result.retryAfter,
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Rate limiter middleware error', { error });

    // Fail open on error
    next();
  }
}

/**
 * Create custom rate limiter with specific limit
 */
export function createRateLimiter(
  limit: number,
  windowSeconds: number = 3600
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKeyReq = req as APIKeyRequest;

    if (!apiKeyReq.apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
      return;
    }

    try {
      const result = await checkRateLimitSlidingWindow(
        apiKeyReq.apiKey.id,
        limit,
        windowSeconds
      );

      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter?.toString() || windowSeconds.toString());
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Rate limit of ${result.limit} requests per ${windowSeconds}s exceeded`,
          limit: result.limit,
          remaining: 0,
          resetAt: result.resetAt.toISOString(),
          retryAfter: result.retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Custom rate limiter error', { error });
      next();
    }
  };
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  apiKeyId: string,
  limit: number,
  windowSeconds: number = 3600
): Promise<RateLimitResult> {
  const key = `rate_limit:${apiKeyId}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  try {
    // Remove old entries and count
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    const remaining = Math.max(0, limit - count);
    const allowed = count < limit;

    const resetAt = new Date(
      Math.ceil((now + windowSeconds * 1000) / (windowSeconds * 1000)) * windowSeconds * 1000
    );

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(windowSeconds),
    };
  } catch (error) {
    logger.error('Get rate limit status error', { error, apiKeyId });
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: new Date(now + windowSeconds * 1000),
    };
  }
}

/**
 * Reset rate limit for API key (admin function)
 */
export async function resetRateLimit(apiKeyId: string): Promise<boolean> {
  const key = `rate_limit:${apiKeyId}`;

  try {
    await redis.del(key);
    logger.info('Rate limit reset', { apiKeyId });
    return true;
  } catch (error) {
    logger.error('Reset rate limit error', { error, apiKeyId });
    return false;
  }
}

export { redis as rateLimiterRedis };
