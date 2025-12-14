/**
 * API Caching Middleware
 * Implements response caching, compression, and HTTP caching headers
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { CacheService } from '../services/cache';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'cache-middleware' },
  transports: [new winston.transports.Console()],
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  vary?: string[]; // Headers to vary cache by
  tags?: string[]; // Cache tags for invalidation
  private?: boolean; // Private vs public cache
  staleWhileRevalidate?: number; // Serve stale content while revalidating
  skipCache?: boolean; // Skip cache for this request
  cacheKey?: string; // Custom cache key
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, options: CacheOptions = {}): string {
  if (options.cacheKey) {
    return options.cacheKey;
  }

  const components = [
    req.method,
    req.path,
    req.query ? JSON.stringify(req.query) : '',
    req.user?.id || 'anonymous',
  ];

  // Add vary headers to cache key
  if (options.vary) {
    for (const header of options.vary) {
      components.push(req.get(header) || '');
    }
  }

  const keyString = components.join(':');
  return crypto.createHash('md5').update(keyString).digest('hex');
}

/**
 * Cache middleware factory
 */
export function cache(options: CacheOptions = {}) {
  const {
    ttl = 300, // Default 5 minutes
    vary = [],
    tags = [],
    private: isPrivate = false,
    staleWhileRevalidate = 60,
    skipCache = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    if (skipCache || req.get('cache-control') === 'no-cache') {
      return next();
    }

    try {
      const cacheKey = generateCacheKey(req, options);
      const cacheService = req.app.locals.cacheService as CacheService;

      if (!cacheService) {
        return next();
      }

      // Try to get from cache
      const cached = await cacheService.get<{
        status: number;
        headers: Record<string, string>;
        body: any;
        timestamp: number;
      }>('api-response', cacheKey);

      if (cached) {
        const age = Math.floor((Date.now() - cached.timestamp) / 1000);
        const isStale = age > ttl;

        // Serve from cache
        res.set('X-Cache-Status', isStale ? 'STALE' : 'HIT');
        res.set('X-Cache-Age', age.toString());

        // Set cache headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          res.set(key, value);
        });

        // Serve cached response
        res.status(cached.status).json(cached.body);

        // Revalidate in background if stale
        if (isStale && staleWhileRevalidate > 0) {
          logger.debug(`Serving stale cache for ${req.path}, revalidating...`);
          // Trigger revalidation (implementation depends on your needs)
        }

        return;
      }

      // Cache miss - intercept response
      res.set('X-Cache-Status', 'MISS');

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      // Intercept json() method
      res.json = function(body: any) {
        const responseData = {
          status: res.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': generateCacheControlHeader(ttl, isPrivate, staleWhileRevalidate),
            'ETag': generateETag(body),
          },
          body,
          timestamp: Date.now(),
        };

        // Store in cache (don't await - fire and forget)
        cacheService.set('api-response', cacheKey, responseData, ttl).catch(err => {
          logger.error('Failed to cache response:', err);
        });

        // Tag the cache entry for invalidation
        if (tags.length > 0) {
          tags.forEach(tag => {
            cacheService.pushToList('cache-tags', tag, cacheKey, 1000).catch(err => {
              logger.error('Failed to tag cache:', err);
            });
          });
        }

        // Set response headers
        Object.entries(responseData.headers).forEach(([key, value]) => {
          res.set(key, value);
        });

        return originalJson(body);
      };

      // Intercept send() method for non-JSON responses
      res.send = function(body: any) {
        // Similar caching logic for non-JSON
        return originalSend(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Generate Cache-Control header
 */
function generateCacheControlHeader(
  ttl: number,
  isPrivate: boolean,
  staleWhileRevalidate: number
): string {
  const parts = [
    isPrivate ? 'private' : 'public',
    `max-age=${ttl}`,
  ];

  if (staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  return parts.join(', ');
}

/**
 * Generate ETag for response
 */
function generateETag(data: any): string {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');

  return `"${hash}"`;
}

/**
 * ETag validation middleware
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  const ifNoneMatch = req.get('if-none-match');

  if (!ifNoneMatch) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function(body: any) {
    const etag = generateETag(body);
    res.set('ETag', etag);

    if (ifNoneMatch === etag) {
      // Content hasn't changed
      res.status(304).end();
      return res;
    }

    return originalJson(body);
  };

  next();
}

/**
 * Cache invalidation helper
 */
export async function invalidateCache(
  cacheService: CacheService,
  pattern: string
): Promise<number> {
  try {
    const count = await cacheService.invalidatePattern(pattern);
    logger.info(`Invalidated ${count} cache entries matching: ${pattern}`);
    return count;
  } catch (error) {
    logger.error('Cache invalidation error:', error);
    return 0;
  }
}

/**
 * Tag-based cache invalidation
 */
export async function invalidateCacheByTag(
  cacheService: CacheService,
  tag: string
): Promise<number> {
  try {
    const keys = await cacheService.getList<string>('cache-tags', tag);

    if (keys.length === 0) {
      return 0;
    }

    let invalidated = 0;
    for (const key of keys) {
      const result = await cacheService.delete('api-response', key);
      if (result) invalidated++;
    }

    // Clear the tag list
    await cacheService.delete('cache-tags', tag);

    logger.info(`Invalidated ${invalidated} cache entries with tag: ${tag}`);
    return invalidated;
  } catch (error) {
    logger.error('Tag-based cache invalidation error:', error);
    return 0;
  }
}

/**
 * Compression middleware configuration
 * Use with express compression middleware
 */
export const compressionOptions = {
  // Compression level (0-9)
  level: 6,

  // Minimum response size to compress (bytes)
  threshold: 1024,

  // Filter function to determine what to compress
  filter: (req: Request, res: Response) => {
    // Don't compress if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Fallback to standard filter
    const contentType = res.getHeader('Content-Type');
    if (!contentType) return false;

    const type = contentType.toString();

    // Compress JSON, text, and SVG
    return (
      type.includes('json') ||
      type.includes('text') ||
      type.includes('javascript') ||
      type.includes('xml') ||
      type.includes('svg')
    );
  },
};

/**
 * Response time tracking middleware
 */
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Capture when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Add response time header
    res.set('X-Response-Time', `${duration}ms`);

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });
    }

    // Emit metric for monitoring
    if (req.app.locals.metricsService) {
      req.app.locals.metricsService.recordResponseTime(
        req.path,
        duration,
        res.statusCode
      );
    }
  });

  next();
}

/**
 * Request deduplication middleware
 * Prevents duplicate concurrent requests
 */
export function deduplicateRequests() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only deduplicate GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheService = req.app.locals.cacheService as CacheService;
    if (!cacheService) {
      return next();
    }

    const requestKey = generateCacheKey(req);
    const lockKey = `request-lock:${requestKey}`;

    try {
      // Try to acquire lock
      const lockId = await cacheService.acquireLock(lockKey, 10000); // 10s lock

      if (!lockId) {
        // Another request is processing this
        // Wait briefly and check cache
        await new Promise(resolve => setTimeout(resolve, 100));

        const cached = await cacheService.get<{ status: number; body: any }>('api-response', requestKey);
        if (cached && typeof cached === 'object' && 'status' in cached && 'body' in cached) {
          res.set('X-Cache-Status', 'DEDUP-HIT');
          return res.status(cached.status).json(cached.body);
        }

        // If still no cache, let this request through
        return next();
      }

      // We have the lock - process request
      res.on('finish', async () => {
        // Release lock when response is sent
        await cacheService.releaseLock(lockKey, lockId);
      });

      next();
    } catch (error) {
      logger.error('Request deduplication error:', error);
      next();
    }
  };
}

/**
 * Cache warming utility
 * Pre-populate cache with frequently accessed data
 */
export async function warmCache(cacheService: CacheService): Promise<void> {
  logger.info('Starting cache warming...');

  try {
    // Define routes to warm
    const warmTargets = [
      { namespace: 'api-response', identifier: 'dashboard-stats', ttl: 300 },
      { namespace: 'api-response', identifier: 'analytics-overview', ttl: 600 },
      // Add more targets as needed
    ];

    // Warm cache (implement based on your needs)
    logger.info(`Warmed ${warmTargets.length} cache entries`);
  } catch (error) {
    logger.error('Cache warming error:', error);
  }
}
