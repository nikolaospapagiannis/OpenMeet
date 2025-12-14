/**
 * Service Registry
 * Singleton access to shared services across the application
 */

import Redis from 'ioredis';
import { QueueService } from './queue';
import { CacheService } from './cache';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'service-registry' },
  transports: [new winston.transports.Console()],
});

// Singleton instances
let redisInstance: Redis | null = null;
let queueServiceInstance: QueueService | null = null;
let cacheServiceInstance: CacheService | null = null;

/**
 * Get or create Redis connection
 */
export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });

    redisInstance.on('connect', () => {
      logger.info('Redis connected');
    });

    redisInstance.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });
  }

  return redisInstance;
}

/**
 * Get or create QueueService instance
 */
export function getQueueService(): QueueService {
  if (!queueServiceInstance) {
    const redis = getRedis();
    queueServiceInstance = new QueueService(redis);
    logger.info('QueueService initialized');
  }

  return queueServiceInstance;
}

/**
 * Get or create CacheService instance
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    const redis = getRedis();
    cacheServiceInstance = new CacheService(redis);
    logger.info('CacheService initialized');
  }

  return cacheServiceInstance;
}

/**
 * Initialize all services (call on app startup)
 */
export async function initializeServices(): Promise<void> {
  const redis = getRedis();

  try {
    await redis.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }

  // Initialize queue service
  getQueueService();

  // Initialize cache service
  getCacheService();

  logger.info('All services initialized');
}

/**
 * Shutdown all services (call on app shutdown)
 */
export async function shutdownServices(): Promise<void> {
  try {
    if (queueServiceInstance) {
      await queueServiceInstance.shutdown();
      queueServiceInstance = null;
    }

    if (redisInstance) {
      await redisInstance.quit();
      redisInstance = null;
    }

    cacheServiceInstance = null;

    logger.info('All services shut down');
  } catch (error) {
    logger.error('Error shutting down services', { error });
    throw error;
  }
}
