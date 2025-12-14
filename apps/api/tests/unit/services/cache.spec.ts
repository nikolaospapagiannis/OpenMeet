/**
 * Cache Service Unit Tests
 */

import { CacheService } from '../../../src/services/cache';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    cacheService = new CacheService(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should retrieve value from cache', async () => {
      const key = 'test:key';
      const value = JSON.stringify({ data: 'test data' });
      mockRedis.get.mockResolvedValue(value);

      const result = await cacheService.get(key);

      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toEqual({ data: 'test data' });
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('non:existent');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      await expect(cacheService.get('test:key')).rejects.toThrow();
    });
  });

  describe('set', () => {
    it('should set value in cache with TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 3600;
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(key, value, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      );
    });

    it('should set value without TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      mockRedis.set.mockResolvedValue('OK');

      await cacheService.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value)
      );
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      const key = 'test:key';
      mockRedis.del.mockResolvedValue(1);

      await cacheService.delete(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test:key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.exists('test:key');

      expect(result).toBe(false);
    });
  });

  describe('flush', () => {
    it('should flush all keys', async () => {
      mockRedis.flushall.mockResolvedValue('OK');

      await cacheService.flush();

      expect(mockRedis.flushall).toHaveBeenCalled();
    });
  });
});
