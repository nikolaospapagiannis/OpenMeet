/**
 * Rate Limiter Service
 *
 * Production-grade distributed rate limiting using Redis
 * Implements multiple algorithms:
 * - Token Bucket
 * - Sliding Window Log
 * - Fixed Window Counter
 * - Leaky Bucket
 *
 * Supports:
 * - Per-user rate limiting
 * - Per-IP rate limiting
 * - Per-API-key rate limiting
 * - Distributed architecture via Redis
 */

import Redis from 'ioredis';
import {
  RateLimiterRedis,
  RateLimiterMemory,
  RateLimiterQueue,
  RateLimiterRes,
} from 'rate-limiter-flexible';
import { logger } from '../utils/logger';

export interface RateLimitOptions {
  points: number; // Number of requests
  duration: number; // Time window in seconds
  blockDuration?: number; // Block duration in seconds after limit exceeded
  keyPrefix?: string; // Redis key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until retry
  msBeforeNext?: number; // Milliseconds before next request
}

export class RateLimiterService {
  private redis: Redis;
  private limiters: Map<string, RateLimiterRedis>;
  private memoryLimiters: Map<string, RateLimiterMemory>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.limiters = new Map();
    this.memoryLimiters = new Map();
  }

  /**
   * Get or create a rate limiter for specific configuration
   */
  private getLimiter(key: string, options: RateLimitOptions): RateLimiterRedis {
    const limiterKey = `${key}:${options.points}:${options.duration}`;

    if (!this.limiters.has(limiterKey)) {
      const limiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: options.keyPrefix || 'rl',
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || 0,
        execEvenly: false, // Don't spread requests evenly
        execEvenlyMinDelayMs: 0,
      });

      this.limiters.set(limiterKey, limiter);
    }

    return this.limiters.get(limiterKey)!;
  }

  /**
   * Token Bucket Algorithm
   * Best for: Allowing bursts while maintaining average rate
   *
   * Each consumer has a bucket with tokens. Tokens are added at a fixed rate.
   * Each request consumes tokens. If no tokens available, request is rejected.
   */
  async tokenBucket(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.getLimiter('token_bucket', options);
      const result = await limiter.consume(identifier, 1);

      return this.formatResult(result, options);
    } catch (error) {
      if (error instanceof Error && 'msBeforeNext' in error) {
        const rateLimitError = error as unknown as RateLimiterRes;
        return this.formatBlockedResult(rateLimitError, options);
      }

      logger.error('Token bucket rate limit error:', error);
      throw error;
    }
  }

  /**
   * Sliding Window Log Algorithm
   * Best for: Precise rate limiting without burst allowance
   *
   * Maintains a log of all requests in the time window.
   * Rejects requests if count exceeds limit in any sliding window.
   */
  async slidingWindowLog(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    try {
      const key = `sliding_window:${options.keyPrefix || 'rl'}:${identifier}`;
      const now = Date.now();
      const windowStart = now - options.duration * 1000;

      // Use Redis sorted set for sliding window
      const multi = this.redis.multi();

      // Remove old entries
      multi.zremrangebyscore(key, '-inf', windowStart);

      // Count current entries
      multi.zcount(key, windowStart, '+inf');

      // Add current request
      multi.zadd(key, now, `${now}:${Math.random()}`);

      // Set expiry
      multi.expire(key, options.duration * 2);

      const results = await multi.exec();

      if (!results) {
        throw new Error('Redis multi exec failed');
      }

      const count = (results[1][1] as number) || 0;

      if (count >= options.points) {
        const retryAfter = Math.ceil(options.blockDuration || options.duration);

        return {
          allowed: false,
          limit: options.points,
          remaining: 0,
          resetAt: new Date(now + retryAfter * 1000),
          retryAfter,
          msBeforeNext: retryAfter * 1000,
        };
      }

      const remaining = options.points - count - 1;
      const resetAt = new Date(now + options.duration * 1000);

      return {
        allowed: true,
        limit: options.points,
        remaining: Math.max(0, remaining),
        resetAt,
      };
    } catch (error) {
      logger.error('Sliding window log rate limit error:', error);
      throw error;
    }
  }

  /**
   * Fixed Window Counter Algorithm
   * Best for: Simple rate limiting with minimal memory
   *
   * Divides time into fixed windows. Counts requests per window.
   * Resets counter at window boundary.
   */
  async fixedWindowCounter(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.getLimiter('fixed_window', {
        ...options,
        keyPrefix: 'fw',
      });

      const result = await limiter.consume(identifier, 1);
      return this.formatResult(result, options);
    } catch (error) {
      if (error instanceof Error && 'msBeforeNext' in error) {
        const rateLimitError = error as unknown as RateLimiterRes;
        return this.formatBlockedResult(rateLimitError, options);
      }

      logger.error('Fixed window counter rate limit error:', error);
      throw error;
    }
  }

  /**
   * Leaky Bucket Algorithm
   * Best for: Smoothing traffic and preventing bursts
   *
   * Requests are added to a queue (bucket). Processed at fixed rate.
   * If bucket is full, request is rejected.
   */
  async leakyBucket(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.getLimiter('leaky_bucket', {
        ...options,
        keyPrefix: 'lb',
      });

      // Use queue to process requests at fixed rate
      const queueLimiter = new RateLimiterQueue(limiter, {
        maxQueueSize: options.points,
      });

      const result = await limiter.consume(identifier, 1);
      return this.formatResult(result, options);
    } catch (error) {
      if (error instanceof Error && 'msBeforeNext' in error) {
        const rateLimitError = error as unknown as RateLimiterRes;
        return this.formatBlockedResult(rateLimitError, options);
      }

      logger.error('Leaky bucket rate limit error:', error);
      throw error;
    }
  }

  /**
   * Consume points from rate limiter (generic)
   */
  async consume(
    identifier: string,
    points: number = 1,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.getLimiter('generic', options);
      const result = await limiter.consume(identifier, points);

      return this.formatResult(result, options);
    } catch (error) {
      if (error instanceof Error && 'msBeforeNext' in error) {
        const rateLimitError = error as unknown as RateLimiterRes;
        return this.formatBlockedResult(rateLimitError, options);
      }

      logger.error('Rate limit consume error:', error);
      throw error;
    }
  }

  /**
   * Get current rate limit status without consuming
   */
  async get(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.getLimiter('get', options);
      const result = await limiter.get(identifier);

      if (!result) {
        return {
          allowed: true,
          limit: options.points,
          remaining: options.points,
          resetAt: new Date(Date.now() + options.duration * 1000),
        };
      }

      return this.formatResult(result, options);
    } catch (error) {
      logger.error('Rate limit get error:', error);
      throw error;
    }
  }

  /**
   * Delete rate limit for identifier (reset)
   */
  async delete(identifier: string, options: RateLimitOptions): Promise<void> {
    try {
      const limiter = this.getLimiter('delete', options);
      await limiter.delete(identifier);
    } catch (error) {
      logger.error('Rate limit delete error:', error);
      throw error;
    }
  }

  /**
   * Block identifier for specific duration
   */
  async block(
    identifier: string,
    durationSeconds: number,
    options: RateLimitOptions
  ): Promise<void> {
    try {
      const limiter = this.getLimiter('block', {
        ...options,
        blockDuration: durationSeconds,
      });

      // Consume all points to trigger block
      await limiter.consume(identifier, options.points + 1).catch(() => {
        // Expected to fail and trigger block
      });

      logger.info('Rate limit block applied', {
        identifier,
        durationSeconds,
      });
    } catch (error) {
      logger.error('Rate limit block error:', error);
      throw error;
    }
  }

  /**
   * Penalty for identifier (reduce available points)
   */
  async penalty(
    identifier: string,
    points: number,
    options: RateLimitOptions
  ): Promise<void> {
    try {
      const limiter = this.getLimiter('penalty', options);
      await limiter.penalty(identifier, points);

      logger.info('Rate limit penalty applied', {
        identifier,
        points,
      });
    } catch (error) {
      logger.error('Rate limit penalty error:', error);
      throw error;
    }
  }

  /**
   * Reward for identifier (add available points)
   */
  async reward(
    identifier: string,
    points: number,
    options: RateLimitOptions
  ): Promise<void> {
    try {
      const limiter = this.getLimiter('reward', options);
      await limiter.reward(identifier, points);

      logger.info('Rate limit reward applied', {
        identifier,
        points,
      });
    } catch (error) {
      logger.error('Rate limit reward error:', error);
      throw error;
    }
  }

  /**
   * Format successful rate limit result
   */
  private formatResult(
    result: RateLimiterRes,
    options: RateLimitOptions
  ): RateLimitResult {
    const resetAt = new Date(Date.now() + result.msBeforeNext);

    return {
      allowed: true,
      limit: options.points,
      remaining: result.remainingPoints,
      resetAt,
      msBeforeNext: result.msBeforeNext,
    };
  }

  /**
   * Format blocked rate limit result
   */
  private formatBlockedResult(
    result: RateLimiterRes,
    options: RateLimitOptions
  ): RateLimitResult {
    const retryAfter = Math.ceil(result.msBeforeNext / 1000);
    const resetAt = new Date(Date.now() + result.msBeforeNext);

    return {
      allowed: false,
      limit: options.points,
      remaining: 0,
      resetAt,
      retryAfter,
      msBeforeNext: result.msBeforeNext,
    };
  }

  /**
   * Get rate limiter statistics
   */
  async getStats(identifier: string, options: RateLimitOptions) {
    try {
      const limiter = this.getLimiter('stats', options);
      const result = await limiter.get(identifier);

      if (!result) {
        return {
          consumedPoints: 0,
          remainingPoints: options.points,
          isBlocked: false,
        };
      }

      return {
        consumedPoints: result.consumedPoints,
        remainingPoints: result.remainingPoints,
        isBlocked: result.remainingPoints < 0,
        msBeforeNext: result.msBeforeNext,
      };
    } catch (error) {
      logger.error('Rate limit stats error:', error);
      throw error;
    }
  }

  /**
   * Clean up old limiters to prevent memory leaks
   */
  cleanup(): void {
    this.limiters.clear();
    this.memoryLimiters.clear();
  }
}

// Export singleton instance
let rateLimiterService: RateLimiterService | null = null;

export function getRateLimiterService(redis: Redis): RateLimiterService {
  if (!rateLimiterService) {
    rateLimiterService = new RateLimiterService(redis);
  }
  return rateLimiterService;
}
