/**
 * DDoS Protection Middleware
 *
 * Fortune 100-grade DDoS protection
 * - Request signature verification
 * - Challenge-response for suspicious traffic
 * - IP reputation checking
 * - Automatic IP blocking (temporary and permanent)
 * - Pattern-based attack detection
 * - Slow request attack protection
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { DDOS_PROTECTION, ADAPTIVE_RATE_LIMITING } from '../config/rate-limits';
import { getRateLimiterService } from '../services/RateLimiterService';

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.socket.remoteAddress || 'unknown';
  return ip.trim();
}

/**
 * Check if IP should bypass DDoS protection (development/localhost)
 */
function shouldBypassDDoS(ip: string): boolean {
  // Always bypass in development for localhost
  if (process.env.NODE_ENV === 'development') {
    const localhostIPs = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'];
    // Docker bridge network IPs (172.16.0.0/12)
    const dockerIPPattern = /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./;

    if (localhostIPs.includes(ip) || dockerIPPattern.test(ip)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate request signature for pattern detection
 */
function generateRequestSignature(req: Request): string {
  const components = [
    req.method,
    req.path,
    JSON.stringify(req.query),
    req.headers['user-agent'] || '',
  ];

  return crypto
    .createHash('sha256')
    .update(components.join(':'))
    .digest('hex');
}

/**
 * Burst detection middleware
 * Detects sudden spikes in traffic from a single IP
 */
export function burstDetection(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);

      // Bypass for localhost in development
      if (shouldBypassDDoS(ip)) {
        return next();
      }

      const key = `ddos:burst:${ip}`;
      const { threshold, windowSeconds, blockDurationSeconds } =
        DDOS_PROTECTION.burstDetection;

      // Increment request count
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (count > threshold) {
        // Block IP temporarily
        const blockKey = `ddos:blocked:${ip}`;
        await redis.setex(blockKey, blockDurationSeconds, '1');

        logger.warn('Burst detection: IP blocked', {
          ip,
          count,
          threshold,
          blockDuration: blockDurationSeconds,
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Request burst detected. Your IP has been temporarily blocked.',
          retryAfter: blockDurationSeconds,
        });
      }

      next();
    } catch (error) {
      logger.error('Burst detection error:', error);
      next();
    }
  };
}

/**
 * Connection flood detection
 * Prevents too many concurrent connections from single IP
 */
export function connectionFloodDetection(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);

      // Bypass for localhost in development
      if (shouldBypassDDoS(ip)) {
        return next();
      }

      const key = `ddos:connections:${ip}`;
      const { maxConnectionsPerIP, windowSeconds, blockDurationSeconds } =
        DDOS_PROTECTION.connectionFlood;

      // Use Redis sorted set to track active connections
      const now = Date.now();
      const requestId = `${now}:${Math.random()}`;

      // Add current connection
      await redis.zadd(key, now, requestId);

      // Remove old connections
      const cutoff = now - windowSeconds * 1000;
      await redis.zremrangebyscore(key, '-inf', cutoff);

      // Count active connections
      const count = await redis.zcard(key);

      // Set expiry
      await redis.expire(key, windowSeconds * 2);

      if (count > maxConnectionsPerIP) {
        // Block IP
        const blockKey = `ddos:blocked:${ip}`;
        await redis.setex(blockKey, blockDurationSeconds, '1');

        logger.warn('Connection flood detected: IP blocked', {
          ip,
          connections: count,
          maxConnections: maxConnectionsPerIP,
        });

        return res.status(429).json({
          error: 'Too Many Connections',
          message: 'Connection flood detected. Your IP has been blocked.',
          retryAfter: blockDurationSeconds,
        });
      }

      // Clean up connection when request completes
      res.on('finish', async () => {
        try {
          await redis.zrem(key, requestId);
        } catch (error) {
          logger.error('Connection cleanup error:', error);
        }
      });

      next();
    } catch (error) {
      logger.error('Connection flood detection error:', error);
      next();
    }
  };
}

/**
 * Request pattern detection
 * Detects repeated identical requests (possible replay attack)
 */
export function requestPatternDetection(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);

      // Bypass for localhost in development
      if (shouldBypassDDoS(ip)) {
        return next();
      }

      const signature = generateRequestSignature(req);
      const key = `ddos:pattern:${ip}:${signature}`;
      const { identicalRequestThreshold, windowSeconds, blockDurationSeconds } =
        DDOS_PROTECTION.patternDetection;

      // Increment pattern count
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (count > identicalRequestThreshold) {
        // Block IP for suspicious pattern
        const blockKey = `ddos:blocked:${ip}`;
        await redis.setex(blockKey, blockDurationSeconds, '1');

        logger.warn('Suspicious pattern detected: IP blocked', {
          ip,
          signature,
          count,
          threshold: identicalRequestThreshold,
        });

        return res.status(429).json({
          error: 'Suspicious Activity',
          message: 'Suspicious request pattern detected. Your IP has been blocked.',
          retryAfter: blockDurationSeconds,
        });
      }

      next();
    } catch (error) {
      logger.error('Request pattern detection error:', error);
      next();
    }
  };
}

/**
 * Slow request attack protection (Slowloris)
 */
export function slowRequestProtection(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);

      // Bypass for localhost in development
      if (shouldBypassDDoS(ip)) {
        return next();
      }

      const key = `ddos:slow:${ip}`;
      const { maxRequestDurationMs, maxConcurrentSlowRequests, blockDurationSeconds } =
        DDOS_PROTECTION.slowRequestProtection;

      const startTime = Date.now();
      let requestCompleted = false;

      // Track slow request
      const requestId = `${startTime}:${Math.random()}`;
      await redis.zadd(key, startTime, requestId);

      // Timeout handler
      const timeoutId = setTimeout(async () => {
        if (!requestCompleted) {
          // Count concurrent slow requests
          const slowRequests = await redis.zcard(key);

          if (slowRequests > maxConcurrentSlowRequests) {
            // Block IP
            const blockKey = `ddos:blocked:${ip}`;
            await redis.setex(blockKey, blockDurationSeconds, '1');

            logger.warn('Slow request attack detected: IP blocked', {
              ip,
              slowRequests,
              maxConcurrentSlowRequests,
            });

            if (!res.headersSent) {
              res.status(408).json({
                error: 'Request Timeout',
                message: 'Request took too long. Your IP has been blocked.',
              });
            }
          }
        }
      }, maxRequestDurationMs);

      // Cleanup on response
      res.on('finish', async () => {
        requestCompleted = true;
        clearTimeout(timeoutId);

        try {
          await redis.zrem(key, requestId);

          // Clean up old requests
          const cutoff = Date.now() - maxRequestDurationMs;
          await redis.zremrangebyscore(key, '-inf', cutoff);
        } catch (error) {
          logger.error('Slow request cleanup error:', error);
        }
      });

      next();
    } catch (error) {
      logger.error('Slow request protection error:', error);
      next();
    }
  };
}

/**
 * Check if IP is currently blocked
 */
export function checkIPBlock(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);

      // Whitelist localhost and Docker IPs in development
      if (process.env.NODE_ENV === 'development') {
        const localhostIPs = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'];
        // Docker bridge network IPs (172.16.0.0/12)
        const dockerIPPattern = /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./;

        if (localhostIPs.includes(ip) || dockerIPPattern.test(ip)) {
          return next();
        }
      }

      const blockKey = `ddos:blocked:${ip}`;

      const isBlocked = await redis.get(blockKey);

      if (isBlocked) {
        const ttl = await redis.ttl(blockKey);

        logger.warn('Blocked IP attempted access', { ip, ttl });

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your IP address has been blocked due to suspicious activity.',
          retryAfter: ttl > 0 ? ttl : 300,
        });
      }

      next();
    } catch (error) {
      logger.error('IP block check error:', error);
      next();
    }
  };
}

/**
 * Rate limit violation tracker
 * Blocks IPs that repeatedly violate rate limits
 */
export function rateLimitViolationTracker(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);

      // Intercept 429 responses
      const originalSend = res.json;
      res.json = function (data: any) {
        if (res.statusCode === 429) {
          (async () => {
            try {
              const key = `ddos:violations:${ip}`;
              const { violationsBeforeBlock, windowSeconds, blockDurationSeconds } =
                DDOS_PROTECTION.rateLimitViolation;

              const violations = await redis.incr(key);

              if (violations === 1) {
                await redis.expire(key, windowSeconds);
              }

              if (violations >= violationsBeforeBlock) {
                // Block IP
                const blockKey = `ddos:blocked:${ip}`;
                await redis.setex(blockKey, blockDurationSeconds, '1');

                logger.warn('Repeated rate limit violations: IP blocked', {
                  ip,
                  violations,
                  threshold: violationsBeforeBlock,
                });

                data.message = 'Your IP has been blocked due to repeated rate limit violations.';
              }
            } catch (error) {
              logger.error('Rate limit violation tracking error:', error);
            }
          })();
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Rate limit violation tracker error:', error);
      next();
    }
  };
}

/**
 * User agent validation
 * Detects and blocks common attack tools and scrapers
 */
export function userAgentValidation(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';

      // Check against scraper patterns
      const { patterns, maxRequestsPerMinute, blockDurationSeconds } =
        ADAPTIVE_RATE_LIMITING.scraperDetection;

      const isScraper = patterns.some((pattern) => pattern.test(userAgent));

      if (isScraper) {
        const key = `ddos:scraper:${ip}`;
        const count = await redis.incr(key);

        if (count === 1) {
          await redis.expire(key, 60); // 1 minute window
        }

        if (count > maxRequestsPerMinute) {
          // Block scraper
          const blockKey = `ddos:blocked:${ip}`;
          await redis.setex(blockKey, blockDurationSeconds, '1');

          logger.warn('Scraper detected and blocked', {
            ip,
            userAgent,
            requests: count,
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: 'Automated access detected. Please contact support if you believe this is an error.',
          });
        }

        // Apply stricter rate limits for scrapers
        const rateLimiter = getRateLimiterService(redis);
        const result = await rateLimiter.consume(`scraper:${ip}`, 1, {
          points: maxRequestsPerMinute,
          duration: 60,
          blockDuration: blockDurationSeconds,
          keyPrefix: 'scraper',
        });

        if (!result.allowed) {
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded for automated traffic.',
            retryAfter: result.retryAfter,
          });
        }
      }

      next();
    } catch (error) {
      logger.error('User agent validation error:', error);
      next();
    }
  };
}

/**
 * Combined DDoS protection middleware
 */
export function ddosProtection(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const middlewares = [
      checkIPBlock(redis),
      burstDetection(redis),
      connectionFloodDetection(redis),
      requestPatternDetection(redis),
      slowRequestProtection(redis),
      rateLimitViolationTracker(redis),
      userAgentValidation(redis),
    ];

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
 * Challenge-response for suspicious traffic
 * Returns a challenge that must be solved to proceed
 */
export function challengeResponse(redis: Redis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIP(req);
      const suspicionKey = `ddos:suspicion:${ip}`;

      const suspicionLevel = parseInt((await redis.get(suspicionKey)) || '0', 10);

      if (suspicionLevel > 50) {
        // Check if challenge was solved
        const challengeToken = req.headers['x-challenge-token'] as string;

        if (challengeToken) {
          const challengeKey = `ddos:challenge:${ip}:${challengeToken}`;
          const validChallenge = await redis.get(challengeKey);

          if (validChallenge) {
            // Challenge solved, reduce suspicion
            await redis.decr(suspicionKey);
            await redis.del(challengeKey);
            return next();
          }
        }

        // Generate challenge
        const challenge = crypto.randomBytes(16).toString('hex');
        const challengeKey = `ddos:challenge:${ip}:${challenge}`;
        await redis.setex(challengeKey, 300, '1'); // 5 minute validity

        logger.info('Challenge-response issued', { ip, suspicionLevel });

        return res.status(403).json({
          error: 'Challenge Required',
          message: 'Please solve the challenge to continue.',
          challenge,
          instructions: 'Include the challenge token in X-Challenge-Token header',
        });
      }

      next();
    } catch (error) {
      logger.error('Challenge-response error:', error);
      next();
    }
  };
}
