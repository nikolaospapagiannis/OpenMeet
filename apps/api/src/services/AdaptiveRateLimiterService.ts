/**
 * Adaptive Rate Limiter Service
 *
 * Intelligent rate limiting that adjusts based on user behavior:
 * - Trust score calculation
 * - Automatic limit adjustment for trusted users
 * - Stricter limits for suspicious behavior
 * - Scraper detection and blocking
 * - Credential stuffing detection
 * - Pattern-based attack detection
 */

import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { ADAPTIVE_RATE_LIMITING } from '../config/rate-limits';
import { getRateLimiterService } from './RateLimiterService';

const prisma = new PrismaClient();

export interface TrustScore {
  score: number; // 0-100
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  multiplier: number;
  factors: {
    successfulRequests: number;
    failedRequests: number;
    rateLimitViolations: number;
    accountAge: number;
    verifiedEmail: boolean;
    paidSubscription: boolean;
    apiKeyUsage: number;
  };
}

export class AdaptiveRateLimiterService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Calculate trust score for a user or IP
   */
  async calculateTrustScore(
    identifier: string,
    type: 'user' | 'ip' | 'apikey'
  ): Promise<TrustScore> {
    try {
      const key = `trust:${type}:${identifier}`;

      // Get cached trust score
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      let score = 50; // Start neutral
      const factors: TrustScore['factors'] = {
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitViolations: 0,
        accountAge: 0,
        verifiedEmail: false,
        paidSubscription: false,
        apiKeyUsage: 0,
      };

      // Count successful requests
      const successKey = `metrics:success:${type}:${identifier}`;
      factors.successfulRequests = parseInt(
        (await this.redis.get(successKey)) || '0',
        10
      );
      score += factors.successfulRequests * ADAPTIVE_RATE_LIMITING.trustScore.modifiers.successfulRequests;

      // Count failed requests
      const failureKey = `metrics:failure:${type}:${identifier}`;
      factors.failedRequests = parseInt(
        (await this.redis.get(failureKey)) || '0',
        10
      );
      score += factors.failedRequests * ADAPTIVE_RATE_LIMITING.trustScore.modifiers.failedRequests;

      // Count rate limit violations
      const violationsKey = `metrics:violations:${type}:${identifier}`;
      factors.rateLimitViolations = parseInt(
        (await this.redis.get(violationsKey)) || '0',
        10
      );
      score += factors.rateLimitViolations * ADAPTIVE_RATE_LIMITING.trustScore.modifiers.rateLimitViolations;

      // For users, add account-based factors
      if (type === 'user') {
        const user = await prisma.user.findUnique({
          where: { id: identifier },
          include: { organization: true },
        });

        if (user) {
          // Account age bonus
          const accountAgeDays = Math.floor(
            (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          factors.accountAge = accountAgeDays;
          if (accountAgeDays > 30) {
            score += ADAPTIVE_RATE_LIMITING.trustScore.modifiers.longTermUser;
          }

          // Verified email bonus
          if (user.emailVerified) {
            factors.verifiedEmail = true;
            score += ADAPTIVE_RATE_LIMITING.trustScore.modifiers.verifiedEmail;
          }

          // Paid subscription bonus
          if (user.organization?.subscriptionTier !== 'free') {
            factors.paidSubscription = true;
            score += ADAPTIVE_RATE_LIMITING.trustScore.modifiers.paidSubscription;
          }
        }
      }

      // For API keys, add usage-based factors
      if (type === 'apikey') {
        const apiKey = await prisma.apiKey.findUnique({
          where: { id: identifier },
        });

        if (apiKey) {
          const usageCount = ((apiKey.metadata as any)?.usageCount || 0) as number;
          factors.apiKeyUsage = usageCount;

          if (usageCount > 1000) {
            score += ADAPTIVE_RATE_LIMITING.trustScore.modifiers.apiKeyUsage;
          }
        }
      }

      // Clamp score between 0 and 100
      score = Math.max(0, Math.min(100, score));

      // Determine level and multiplier
      let level: TrustScore['level'];
      let multiplier: number;

      if (score >= 80) {
        level = 'very_high';
        multiplier = ADAPTIVE_RATE_LIMITING.trustScore.multipliers.veryHigh;
      } else if (score >= 60) {
        level = 'high';
        multiplier = ADAPTIVE_RATE_LIMITING.trustScore.multipliers.high;
      } else if (score >= 40) {
        level = 'medium';
        multiplier = ADAPTIVE_RATE_LIMITING.trustScore.multipliers.medium;
      } else if (score >= 20) {
        level = 'low';
        multiplier = ADAPTIVE_RATE_LIMITING.trustScore.multipliers.low;
      } else {
        level = 'very_low';
        multiplier = ADAPTIVE_RATE_LIMITING.trustScore.multipliers.veryLow;
      }

      const trustScore: TrustScore = {
        score,
        level,
        multiplier,
        factors,
      };

      // Cache for 5 minutes
      await this.redis.setex(key, 300, JSON.stringify(trustScore));

      return trustScore;
    } catch (error) {
      logger.error('Trust score calculation error:', error);

      // Return neutral score on error
      return {
        score: 50,
        level: 'medium',
        multiplier: 1.0,
        factors: {
          successfulRequests: 0,
          failedRequests: 0,
          rateLimitViolations: 0,
          accountAge: 0,
          verifiedEmail: false,
          paidSubscription: false,
          apiKeyUsage: 0,
        },
      };
    }
  }

  /**
   * Record successful request
   */
  async recordSuccess(identifier: string, type: 'user' | 'ip' | 'apikey'): Promise<void> {
    try {
      const key = `metrics:success:${type}:${identifier}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 86400); // 24 hour window

      // Invalidate trust score cache
      await this.redis.del(`trust:${type}:${identifier}`);
    } catch (error) {
      logger.error('Record success error:', error);
    }
  }

  /**
   * Record failed request
   */
  async recordFailure(identifier: string, type: 'user' | 'ip' | 'apikey'): Promise<void> {
    try {
      const key = `metrics:failure:${type}:${identifier}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 86400); // 24 hour window

      // Invalidate trust score cache
      await this.redis.del(`trust:${type}:${identifier}`);
    } catch (error) {
      logger.error('Record failure error:', error);
    }
  }

  /**
   * Record rate limit violation
   */
  async recordViolation(identifier: string, type: 'user' | 'ip' | 'apikey'): Promise<void> {
    try {
      const key = `metrics:violations:${type}:${identifier}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 86400); // 24 hour window

      // Invalidate trust score cache
      await this.redis.del(`trust:${type}:${identifier}`);

      logger.warn('Rate limit violation recorded', { identifier, type });
    } catch (error) {
      logger.error('Record violation error:', error);
    }
  }

  /**
   * Detect scraper based on user agent and behavior
   */
  async detectScraper(ip: string, userAgent: string): Promise<boolean> {
    if (!ADAPTIVE_RATE_LIMITING.scraperDetection.enabled) {
      return false;
    }

    const { patterns } = ADAPTIVE_RATE_LIMITING.scraperDetection;

    // Check user agent patterns
    const isScraper = patterns.some((pattern) => pattern.test(userAgent));

    if (isScraper) {
      // Mark IP as scraper
      const key = `scraper:${ip}`;
      await this.redis.setex(key, 3600, '1'); // Mark for 1 hour

      logger.warn('Scraper detected', { ip, userAgent });
    }

    return isScraper;
  }

  /**
   * Check if IP is marked as scraper
   */
  async isScraper(ip: string): Promise<boolean> {
    const key = `scraper:${ip}`;
    const isScraper = await this.redis.get(key);
    return isScraper === '1';
  }

  /**
   * Detect credential stuffing attack
   */
  async detectCredentialStuffing(
    ip: string,
    endpoint: string,
    success: boolean
  ): Promise<boolean> {
    if (!ADAPTIVE_RATE_LIMITING.credentialStuffingDetection.enabled) {
      return false;
    }

    const { monitorEndpoints, failedLoginThreshold, windowSeconds, blockDurationSeconds } =
      ADAPTIVE_RATE_LIMITING.credentialStuffingDetection;

    // Only monitor specific endpoints
    if (!monitorEndpoints.includes(endpoint as "/api/auth/login" | "/api/auth/register")) {
      return false;
    }

    if (!success) {
      const key = `credential_stuffing:${ip}`;
      const failures = await this.redis.incr(key);

      if (failures === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      if (failures >= failedLoginThreshold) {
        // Block IP
        const blockKey = `ddos:blocked:${ip}`;
        await this.redis.setex(blockKey, blockDurationSeconds, '1');

        logger.warn('Credential stuffing attack detected', {
          ip,
          endpoint,
          failures,
          threshold: failedLoginThreshold,
        });

        return true;
      }
    } else {
      // Reset on successful login
      const key = `credential_stuffing:${ip}`;
      await this.redis.del(key);
    }

    return false;
  }

  /**
   * Apply adaptive rate limit based on trust score
   */
  async applyAdaptiveLimit(
    identifier: string,
    type: 'user' | 'ip' | 'apikey',
    baseLimit: number,
    duration: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    try {
      const trustScore = await this.calculateTrustScore(identifier, type);

      // Adjust limit based on trust score
      const adjustedLimit = Math.floor(baseLimit * trustScore.multiplier);

      const rateLimiter = getRateLimiterService(this.redis);
      const result = await rateLimiter.tokenBucket(identifier, {
        points: adjustedLimit,
        duration,
        keyPrefix: `adaptive:${type}`,
      });

      logger.debug('Adaptive rate limit applied', {
        identifier,
        type,
        baseLimit,
        adjustedLimit,
        trustScore: trustScore.score,
        trustLevel: trustScore.level,
        multiplier: trustScore.multiplier,
      });

      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt,
      };
    } catch (error) {
      logger.error('Adaptive rate limit error:', error);

      // Fail open with base limit
      const rateLimiter = getRateLimiterService(this.redis);
      const result = await rateLimiter.tokenBucket(identifier, {
        points: baseLimit,
        duration,
        keyPrefix: `adaptive:${type}`,
      });

      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt,
      };
    }
  }

  /**
   * Get trust score for identifier
   */
  async getTrustScore(
    identifier: string,
    type: 'user' | 'ip' | 'apikey'
  ): Promise<TrustScore> {
    return this.calculateTrustScore(identifier, type);
  }

  /**
   * Reset trust score (admin action)
   */
  async resetTrustScore(identifier: string, type: 'user' | 'ip' | 'apikey'): Promise<void> {
    try {
      // Clear all metrics
      await this.redis.del(`trust:${type}:${identifier}`);
      await this.redis.del(`metrics:success:${type}:${identifier}`);
      await this.redis.del(`metrics:failure:${type}:${identifier}`);
      await this.redis.del(`metrics:violations:${type}:${identifier}`);

      logger.info('Trust score reset', { identifier, type });
    } catch (error) {
      logger.error('Trust score reset error:', error);
    }
  }

  /**
   * Get metrics for identifier
   */
  async getMetrics(identifier: string, type: 'user' | 'ip' | 'apikey') {
    try {
      const [successfulRequests, failedRequests, violations] = await Promise.all([
        this.redis.get(`metrics:success:${type}:${identifier}`),
        this.redis.get(`metrics:failure:${type}:${identifier}`),
        this.redis.get(`metrics:violations:${type}:${identifier}`),
      ]);

      return {
        successfulRequests: parseInt(successfulRequests || '0', 10),
        failedRequests: parseInt(failedRequests || '0', 10),
        violations: parseInt(violations || '0', 10),
      };
    } catch (error) {
      logger.error('Get metrics error:', error);
      return {
        successfulRequests: 0,
        failedRequests: 0,
        violations: 0,
      };
    }
  }
}

// Export singleton instance
let adaptiveRateLimiterService: AdaptiveRateLimiterService | null = null;

export function getAdaptiveRateLimiterService(redis: Redis): AdaptiveRateLimiterService {
  if (!adaptiveRateLimiterService) {
    adaptiveRateLimiterService = new AdaptiveRateLimiterService(redis);
  }
  return adaptiveRateLimiterService;
}
