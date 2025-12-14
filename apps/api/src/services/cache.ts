/**
 * Cache Service
 * Redis-based caching with TTL and invalidation
 */

import Redis from 'ioredis';
import winston from 'winston';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'cache-service' },
  transports: [new winston.transports.Console()],
});

export class CacheService {
  private redis: Redis;
  private defaultTTL: number;

  constructor(redis: Redis, defaultTTL: number = 3600) {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key with namespace
   */
  private generateKey(namespace: string, identifier: string): string {
    return `cache:${namespace}:${identifier}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(namespace: string, identifier: string): Promise<T | null> {
    try {
      const key = this.generateKey(namespace, identifier);
      const value = await this.redis.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(
    namespace: string,
    identifier: string,
    value: T,
    ttl?: number
  ): Promise<boolean> {
    try {
      const key = this.generateKey(namespace, identifier);
      const serialized = JSON.stringify(value);
      const expiryTime = ttl || this.defaultTTL;

      await this.redis.set(key, serialized, 'EX', expiryTime);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(namespace: string, identifier: string): Promise<boolean> {
    try {
      const key = this.generateKey(namespace, identifier);
      const result = await this.redis.del(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries for a namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    try {
      const pattern = `cache:${namespace}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      
      return keys.length;
    } catch (error) {
      logger.error('Cache clear namespace error:', error);
      return 0;
    }
  }

  /**
   * Implement cache-aside pattern
   */
  async getOrSet<T>(
    namespace: string,
    identifier: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(namespace, identifier);
      if (cached !== null) {
        return cached;
      }

      // Fetch fresh data
      const freshData = await fetchFunction();
      
      // Store in cache
      await this.set(namespace, identifier, freshData, ttl);
      
      return freshData;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      throw error;
    }
  }

  /**
   * Invalidate related cache entries
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(`cache:${pattern}`);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      
      return keys.length;
    } catch (error) {
      logger.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  /**
   * Implement distributed locking
   */
  async acquireLock(
    resource: string,
    ttl: number = 10000
  ): Promise<string | null> {
    try {
      const lockId = crypto.randomBytes(16).toString('hex');
      const key = `lock:${resource}`;
      
      const result = await this.redis.set(
        key,
        lockId,
        'PX',
        ttl,
        'NX'
      );

      return result === 'OK' ? lockId : null;
    } catch (error) {
      logger.error('Lock acquisition error:', error);
      return null;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(resource: string, lockId: string): Promise<boolean> {
    try {
      const key = `lock:${resource}`;
      const currentLockId = await this.redis.get(key);
      
      if (currentLockId === lockId) {
        await this.redis.del(key);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Lock release error:', error);
      return false;
    }
  }

  /**
   * Implement rate limiting
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    try {
      const key = `rate:${identifier}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      
      const ttl = await this.redis.ttl(key);
      const remaining = Math.max(0, limit - current);
      
      return {
        allowed: current <= limit,
        remaining,
        resetIn: ttl > 0 ? ttl : windowSeconds,
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit, resetIn: 0 };
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache<T>(
    items: Array<{ namespace: string; identifier: string; data: T }>,
    ttl?: number
  ): Promise<number> {
    try {
      const pipeline = this.redis.pipeline();
      
      items.forEach(item => {
        const key = this.generateKey(item.namespace, item.identifier);
        const serialized = JSON.stringify(item.data);
        const expiryTime = ttl || this.defaultTTL;
        pipeline.set(key, serialized, 'EX', expiryTime);
      });
      
      await pipeline.exec();
      return items.length;
    } catch (error) {
      logger.error('Cache warming error:', error);
      return 0;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(
    namespace: string,
    identifiers: string[]
  ): Promise<Map<string, T | null>> {
    try {
      const keys = identifiers.map(id => this.generateKey(namespace, id));
      const values = await this.redis.mget(...keys);
      
      const result = new Map<string, T | null>();
      
      identifiers.forEach((id, index) => {
        const value = values[index];
        if (value) {
          result.set(id, JSON.parse(value) as T);
        } else {
          result.set(id, null);
        }
      });
      
      return result;
    } catch (error) {
      logger.error('Cache mget error:', error);
      return new Map();
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(
    namespace: string,
    items: Map<string, T>,
    ttl?: number
  ): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      const expiryTime = ttl || this.defaultTTL;
      
      items.forEach((value, identifier) => {
        const key = this.generateKey(namespace, identifier);
        const serialized = JSON.stringify(value);
        pipeline.set(key, serialized, 'EX', expiryTime);
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Increment counter in cache
   */
  async increment(
    namespace: string,
    identifier: string,
    amount: number = 1
  ): Promise<number> {
    try {
      const key = this.generateKey(namespace, identifier);
      const result = await this.redis.incrby(key, amount);
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Add item to cached list
   */
  async pushToList(
    namespace: string,
    identifier: string,
    value: any,
    maxSize?: number
  ): Promise<boolean> {
    try {
      const key = this.generateKey(namespace, identifier);
      const serialized = JSON.stringify(value);
      
      await this.redis.lpush(key, serialized);
      
      if (maxSize) {
        await this.redis.ltrim(key, 0, maxSize - 1);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache push to list error:', error);
      return false;
    }
  }

  /**
   * Get list from cache
   */
  async getList<T>(
    namespace: string,
    identifier: string,
    start: number = 0,
    stop: number = -1
  ): Promise<T[]> {
    try {
      const key = this.generateKey(namespace, identifier);
      const values = await this.redis.lrange(key, start, stop);
      
      return values.map(v => JSON.parse(v) as T);
    } catch (error) {
      logger.error('Cache get list error:', error);
      return [];
    }
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Cache health check error:', error);
      return false;
    }
  }
}
