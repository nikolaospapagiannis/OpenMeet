/**
 * IP Management Service
 *
 * Manages IP whitelists and blacklists:
 * - Add/remove IPs to whitelist (bypass rate limits)
 * - Add/remove IPs to blacklist (block completely)
 * - Support for IP ranges (CIDR notation)
 * - Temporary vs permanent blocks
 * - GeoIP blocking
 */

import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface IPListEntry {
  id: string;
  ip: string;
  type: 'whitelist' | 'blacklist';
  reason?: string;
  expiresAt?: Date;
  createdBy?: string;
  createdAt: Date;
  metadata?: any;
}

export interface IPBlock {
  ip: string;
  reason: string;
  blockedAt: Date;
  expiresAt?: Date;
  permanent: boolean;
}

export class IPManagementService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Add IP to whitelist
   */
  async addToWhitelist(
    ip: string,
    options: {
      reason?: string;
      expiresAt?: Date;
      createdBy?: string;
      organizationId?: string;
    }
  ): Promise<void> {
    try {
      // Add to Redis for fast lookup
      const key = `ip:whitelist:${ip}`;
      const data = {
        ip,
        reason: options.reason,
        expiresAt: options.expiresAt?.toISOString(),
        createdBy: options.createdBy,
        createdAt: new Date().toISOString(),
      };

      if (options.expiresAt) {
        const ttl = Math.floor((options.expiresAt.getTime() - Date.now()) / 1000);
        await this.redis.setex(key, ttl, JSON.stringify(data));
      } else {
        await this.redis.set(key, JSON.stringify(data));
      }

      // Also store in Redis set for listing
      await this.redis.sadd('ip:whitelisted', ip);

      logger.info('IP added to whitelist', {
        ip,
        reason: options.reason,
        expiresAt: options.expiresAt,
      });
    } catch (error) {
      logger.error('Add to whitelist error:', error);
      throw error;
    }
  }

  /**
   * Remove IP from whitelist
   */
  async removeFromWhitelist(ip: string): Promise<void> {
    try {
      const key = `ip:whitelist:${ip}`;
      await this.redis.del(key);
      await this.redis.srem('ip:whitelisted', ip);

      logger.info('IP removed from whitelist', { ip });
    } catch (error) {
      logger.error('Remove from whitelist error:', error);
      throw error;
    }
  }

  /**
   * Check if IP is whitelisted
   */
  async isWhitelisted(ip: string): Promise<boolean> {
    try {
      const key = `ip:whitelist:${ip}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Check whitelist error:', error);
      return false;
    }
  }

  /**
   * Add IP to blacklist
   */
  async addToBlacklist(
    ip: string,
    options: {
      reason: string;
      expiresAt?: Date;
      permanent?: boolean;
      createdBy?: string;
      organizationId?: string;
    }
  ): Promise<void> {
    try {
      const key = `ip:blacklist:${ip}`;
      const data: IPBlock = {
        ip,
        reason: options.reason,
        blockedAt: new Date(),
        expiresAt: options.expiresAt,
        permanent: options.permanent || false,
      };

      if (options.expiresAt && !options.permanent) {
        const ttl = Math.floor((options.expiresAt.getTime() - Date.now()) / 1000);
        await this.redis.setex(key, ttl, JSON.stringify(data));
      } else {
        await this.redis.set(key, JSON.stringify(data));
      }

      // Also store in Redis set for listing
      await this.redis.sadd('ip:blacklisted', ip);

      // Store in database for permanent blocks
      if (options.permanent) {
        await this.redis.hset('ip:permanent_blocks', ip, JSON.stringify(data));
      }

      logger.warn('IP added to blacklist', {
        ip,
        reason: options.reason,
        permanent: options.permanent,
        expiresAt: options.expiresAt,
      });
    } catch (error) {
      logger.error('Add to blacklist error:', error);
      throw error;
    }
  }

  /**
   * Remove IP from blacklist
   */
  async removeFromBlacklist(ip: string): Promise<void> {
    try {
      const key = `ip:blacklist:${ip}`;
      await this.redis.del(key);
      await this.redis.srem('ip:blacklisted', ip);
      await this.redis.hdel('ip:permanent_blocks', ip);

      logger.info('IP removed from blacklist', { ip });
    } catch (error) {
      logger.error('Remove from blacklist error:', error);
      throw error;
    }
  }

  /**
   * Check if IP is blacklisted
   */
  async isBlacklisted(ip: string): Promise<{ blocked: boolean; reason?: string; expiresAt?: Date }> {
    try {
      const key = `ip:blacklist:${ip}`;
      const data = await this.redis.get(key);

      if (data) {
        const block: IPBlock = JSON.parse(data);
        return {
          blocked: true,
          reason: block.reason,
          expiresAt: block.expiresAt,
        };
      }

      return { blocked: false };
    } catch (error) {
      logger.error('Check blacklist error:', error);
      return { blocked: false };
    }
  }

  /**
   * Add IP range to whitelist (CIDR notation)
   */
  async addRangeToWhitelist(
    cidr: string,
    options: {
      reason?: string;
      createdBy?: string;
    }
  ): Promise<void> {
    try {
      const key = `ip:whitelist:range:${cidr}`;
      const data = {
        cidr,
        reason: options.reason,
        createdBy: options.createdBy,
        createdAt: new Date().toISOString(),
      };

      await this.redis.set(key, JSON.stringify(data));
      await this.redis.sadd('ip:whitelist:ranges', cidr);

      logger.info('IP range added to whitelist', { cidr, reason: options.reason });
    } catch (error) {
      logger.error('Add range to whitelist error:', error);
      throw error;
    }
  }

  /**
   * Add IP range to blacklist (CIDR notation)
   */
  async addRangeToBlacklist(
    cidr: string,
    options: {
      reason: string;
      createdBy?: string;
    }
  ): Promise<void> {
    try {
      const key = `ip:blacklist:range:${cidr}`;
      const data = {
        cidr,
        reason: options.reason,
        createdBy: options.createdBy,
        createdAt: new Date().toISOString(),
      };

      await this.redis.set(key, JSON.stringify(data));
      await this.redis.sadd('ip:blacklist:ranges', cidr);

      logger.warn('IP range added to blacklist', { cidr, reason: options.reason });
    } catch (error) {
      logger.error('Add range to blacklist error:', error);
      throw error;
    }
  }

  /**
   * Get all whitelisted IPs
   */
  async getWhitelistedIPs(): Promise<string[]> {
    try {
      const ips = await this.redis.smembers('ip:whitelisted');
      return ips;
    } catch (error) {
      logger.error('Get whitelisted IPs error:', error);
      return [];
    }
  }

  /**
   * Get all blacklisted IPs
   */
  async getBlacklistedIPs(): Promise<IPBlock[]> {
    try {
      const ips = await this.redis.smembers('ip:blacklisted');

      const blocks: IPBlock[] = [];
      for (const ip of ips) {
        const key = `ip:blacklist:${ip}`;
        const data = await this.redis.get(key);
        if (data) {
          blocks.push(JSON.parse(data));
        }
      }

      return blocks;
    } catch (error) {
      logger.error('Get blacklisted IPs error:', error);
      return [];
    }
  }

  /**
   * Get blocked IP details
   */
  async getBlockDetails(ip: string): Promise<IPBlock | null> {
    try {
      const key = `ip:blacklist:${ip}`;
      const data = await this.redis.get(key);

      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      logger.error('Get block details error:', error);
      return null;
    }
  }

  /**
   * Temporary block IP
   */
  async temporaryBlock(
    ip: string,
    durationSeconds: number,
    reason: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    await this.addToBlacklist(ip, {
      reason,
      expiresAt,
      permanent: false,
    });
  }

  /**
   * Permanent block IP
   */
  async permanentBlock(ip: string, reason: string): Promise<void> {
    await this.addToBlacklist(ip, {
      reason,
      permanent: true,
    });
  }

  /**
   * Auto-block IP after threshold violations
   */
  async autoBlock(
    ip: string,
    violationType: string,
    threshold: number = 5
  ): Promise<boolean> {
    try {
      const key = `ip:violations:${ip}:${violationType}`;
      const violations = await this.redis.incr(key);

      if (violations === 1) {
        await this.redis.expire(key, 3600); // 1 hour window
      }

      if (violations >= threshold) {
        await this.temporaryBlock(
          ip,
          3600, // 1 hour block
          `Auto-blocked: ${violations} ${violationType} violations`
        );

        logger.warn('IP auto-blocked', {
          ip,
          violationType,
          violations,
          threshold,
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Auto-block error:', error);
      return false;
    }
  }

  /**
   * Clear expired blocks
   */
  async clearExpiredBlocks(): Promise<number> {
    try {
      const ips = await this.redis.smembers('ip:blacklisted');
      let cleared = 0;

      for (const ip of ips) {
        const key = `ip:blacklist:${ip}`;
        const exists = await this.redis.exists(key);

        if (exists === 0) {
          // Expired block
          await this.redis.srem('ip:blacklisted', ip);
          cleared++;
        }
      }

      if (cleared > 0) {
        logger.info('Cleared expired blocks', { count: cleared });
      }

      return cleared;
    } catch (error) {
      logger.error('Clear expired blocks error:', error);
      return 0;
    }
  }

  /**
   * Get IP statistics
   */
  async getIPStats(ip: string) {
    try {
      const [isWhitelisted, blacklistInfo, violations] = await Promise.all([
        this.isWhitelisted(ip),
        this.isBlacklisted(ip),
        this.redis.keys(`ip:violations:${ip}:*`),
      ]);

      const violationCounts: Record<string, number> = {};

      for (const key of violations) {
        const count = await this.redis.get(key);
        const type = key.split(':').pop() || 'unknown';
        violationCounts[type] = parseInt(count || '0', 10);
      }

      return {
        ip,
        isWhitelisted,
        isBlacklisted: blacklistInfo.blocked,
        blacklistReason: blacklistInfo.reason,
        blacklistExpiresAt: blacklistInfo.expiresAt,
        violations: violationCounts,
        totalViolations: Object.values(violationCounts).reduce((a, b) => a + b, 0),
      };
    } catch (error) {
      logger.error('Get IP stats error:', error);
      return {
        ip,
        isWhitelisted: false,
        isBlacklisted: false,
        violations: {},
        totalViolations: 0,
      };
    }
  }

  /**
   * Bulk import IPs to blacklist
   */
  async bulkBlacklist(
    ips: string[],
    reason: string,
    permanent: boolean = false
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const ip of ips) {
      try {
        await this.addToBlacklist(ip, { reason, permanent });
        success++;
      } catch (error) {
        logger.error('Bulk blacklist error for IP', { ip, error });
        failed++;
      }
    }

    logger.info('Bulk blacklist completed', { success, failed, total: ips.length });

    return { success, failed };
  }

  /**
   * Bulk import IPs to whitelist
   */
  async bulkWhitelist(
    ips: string[],
    reason: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const ip of ips) {
      try {
        await this.addToWhitelist(ip, { reason });
        success++;
      } catch (error) {
        logger.error('Bulk whitelist error for IP', { ip, error });
        failed++;
      }
    }

    logger.info('Bulk whitelist completed', { success, failed, total: ips.length });

    return { success, failed };
  }
}

// Export singleton instance
let ipManagementService: IPManagementService | null = null;

export function getIPManagementService(redis: Redis): IPManagementService {
  if (!ipManagementService) {
    ipManagementService = new IPManagementService(redis);
  }
  return ipManagementService;
}
