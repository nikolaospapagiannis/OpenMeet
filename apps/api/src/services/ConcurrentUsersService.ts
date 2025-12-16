/**
 * Concurrent Users Service - Enterprise-Grade Real-time User Tracking
 *
 * Uses Redis for distributed state management across multiple server instances.
 * Provides multi-tenant isolation with organization-scoped tracking.
 *
 * Features:
 * - Redis-based distributed counting (survives restarts)
 * - Organization-level isolation (multi-tenant)
 * - Automatic cleanup with TTL
 * - Real-time broadcasting via Socket.IO
 * - Super admin global view
 */

import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'concurrent-users-service' },
  transports: [new winston.transports.Console()],
});

// Keys for Redis
const KEYS = {
  // Set of active users per organization: concurrent:users:{orgId}
  orgUsers: (orgId: string) => `concurrent:users:${orgId}`,
  // Hash of socket to user mapping: concurrent:sockets
  socketMap: 'concurrent:sockets',
  // Hash of user to org mapping: concurrent:user-org
  userOrgMap: 'concurrent:user-org',
  // Sorted set for all orgs with counts (for super admin): concurrent:org-counts
  orgCounts: 'concurrent:org-counts',
};

// TTL for cleanup (in seconds)
const DEFAULT_TTL = 3600; // 1 hour

// Interface for concurrent user data
export interface ConcurrentUserData {
  userId: string;
  organizationId: string;
  socketId: string;
  connectedAt: Date;
}

// Interface for organization stats
export interface OrganizationConcurrentStats {
  organizationId: string;
  organizationName?: string;
  count: number;
}

// Interface for global stats (super admin)
export interface GlobalConcurrentStats {
  totalUsers: number;
  byOrganization: OrganizationConcurrentStats[];
  serverCount: number;
}

class ConcurrentUsersService {
  private redis: Redis;
  private io: SocketIOServer | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private broadcastIntervalMs = 5000; // Broadcast every 5 seconds

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Initialize service with Socket.IO server for broadcasting
   */
  initialize(io: SocketIOServer): void {
    this.io = io;

    // Start periodic broadcast to all connected clients
    this.startBroadcasting();

    logger.info('ConcurrentUsersService initialized with Socket.IO broadcasting');
  }

  /**
   * Register a user connection
   */
  async registerConnection(
    userId: string,
    organizationId: string,
    socketId: string
  ): Promise<number> {
    const pipeline = this.redis.pipeline();

    // Add user to organization set
    const orgKey = KEYS.orgUsers(organizationId);
    pipeline.sadd(orgKey, `${userId}:${socketId}`);
    pipeline.expire(orgKey, DEFAULT_TTL);

    // Map socket to user for cleanup
    pipeline.hset(KEYS.socketMap, socketId, `${userId}:${organizationId}`);

    // Map user to org
    pipeline.hset(KEYS.userOrgMap, userId, organizationId);

    // Update org count in sorted set (for super admin queries)
    pipeline.zincrby(KEYS.orgCounts, 1, organizationId);

    await pipeline.exec();

    // Get current count for organization
    const count = await this.getOrganizationCount(organizationId);

    // Broadcast update to organization
    this.broadcastToOrganization(organizationId, count);

    logger.debug('User connection registered', {
      userId,
      organizationId,
      socketId,
      newCount: count,
    });

    return count;
  }

  /**
   * Unregister a user connection
   */
  async unregisterConnection(socketId: string): Promise<void> {
    // Get user info from socket map
    const userInfo = await this.redis.hget(KEYS.socketMap, socketId);

    if (!userInfo) {
      logger.debug('Socket not found in map, already cleaned up', { socketId });
      return;
    }

    const [userId, organizationId] = userInfo.split(':');

    const pipeline = this.redis.pipeline();

    // Remove from organization set
    const orgKey = KEYS.orgUsers(organizationId);
    pipeline.srem(orgKey, `${userId}:${socketId}`);

    // Remove socket mapping
    pipeline.hdel(KEYS.socketMap, socketId);

    // Decrement org count (but not below 0)
    // We need to check the count after removal to update sorted set
    await pipeline.exec();

    // Update org count in sorted set
    const newCount = await this.getOrganizationCount(organizationId);
    await this.redis.zadd(KEYS.orgCounts, newCount, organizationId);

    // Broadcast update to organization
    this.broadcastToOrganization(organizationId, newCount);

    logger.debug('User connection unregistered', {
      userId,
      organizationId,
      socketId,
      newCount,
    });
  }

  /**
   * Get concurrent user count for an organization
   */
  async getOrganizationCount(organizationId: string): Promise<number> {
    const orgKey = KEYS.orgUsers(organizationId);
    return await this.redis.scard(orgKey);
  }

  /**
   * Get total concurrent users across all organizations
   */
  async getGlobalCount(): Promise<number> {
    // Get all organization keys
    const keys = await this.redis.keys('concurrent:users:*');

    if (keys.length === 0) {
      return 0;
    }

    // Sum up all organization counts
    let total = 0;
    for (const key of keys) {
      const count = await this.redis.scard(key);
      total += count;
    }

    return total;
  }

  /**
   * Get breakdown by organization (for super admin)
   */
  async getByOrganization(limit = 100): Promise<OrganizationConcurrentStats[]> {
    // Get top organizations by count from sorted set
    const results = await this.redis.zrevrangebyscore(
      KEYS.orgCounts,
      '+inf',
      1, // Only orgs with at least 1 user
      'WITHSCORES',
      'LIMIT',
      0,
      limit * 2 // Get double to account for withscores format
    );

    const stats: OrganizationConcurrentStats[] = [];

    // Parse results (alternating: orgId, score, orgId, score...)
    for (let i = 0; i < results.length; i += 2) {
      const organizationId = results[i];
      const count = parseInt(results[i + 1], 10);

      if (count > 0) {
        stats.push({
          organizationId,
          count,
        });
      }
    }

    return stats;
  }

  /**
   * Get global stats for super admin dashboard
   */
  async getGlobalStats(): Promise<GlobalConcurrentStats> {
    const [totalUsers, byOrganization] = await Promise.all([
      this.getGlobalCount(),
      this.getByOrganization(50), // Top 50 orgs
    ]);

    return {
      totalUsers,
      byOrganization,
      serverCount: 1, // With Redis adapter, this would be tracked differently
    };
  }

  /**
   * Get list of connected users for an organization
   */
  async getOrganizationUsers(organizationId: string): Promise<string[]> {
    const orgKey = KEYS.orgUsers(organizationId);
    const members = await this.redis.smembers(orgKey);

    // Extract just the userId (format is userId:socketId)
    const userIds = new Set<string>();
    for (const member of members) {
      const userId = member.split(':')[0];
      userIds.add(userId);
    }

    return Array.from(userIds);
  }

  /**
   * Check if a specific user is online in an organization
   */
  async isUserOnline(userId: string, organizationId: string): Promise<boolean> {
    const orgKey = KEYS.orgUsers(organizationId);
    const members = await this.redis.smembers(orgKey);

    return members.some((m) => m.startsWith(`${userId}:`));
  }

  /**
   * Broadcast concurrent users update to an organization
   */
  private broadcastToOrganization(organizationId: string, count: number): void {
    if (!this.io) {
      return;
    }

    // Emit to organization room
    this.io
      .of('/admin/concurrent-users')
      .to(`org:${organizationId}`)
      .emit('concurrent-users:update', {
        organizationId,
        count,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Broadcast global stats to super admins
   */
  private async broadcastToAdmins(): Promise<void> {
    if (!this.io) {
      return;
    }

    const stats = await this.getGlobalStats();

    // Emit to admin global room
    this.io
      .of('/admin/concurrent-users')
      .to('admin:global')
      .emit('concurrent-users:global', {
        ...stats,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Start periodic broadcasting of stats
   */
  private startBroadcasting(): void {
    // Clear existing interval if any
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }

    // Broadcast global stats periodically to super admins
    this.broadcastInterval = setInterval(async () => {
      try {
        await this.broadcastToAdmins();
      } catch (error) {
        logger.error('Error broadcasting concurrent users stats:', error);
      }
    }, this.broadcastIntervalMs);

    logger.info('Started concurrent users broadcasting', {
      intervalMs: this.broadcastIntervalMs,
    });
  }

  /**
   * Stop broadcasting (for graceful shutdown)
   */
  stopBroadcasting(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
      logger.info('Stopped concurrent users broadcasting');
    }
  }

  /**
   * Cleanup stale connections (run periodically)
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    // Get all socket mappings
    const sockets = await this.redis.hgetall(KEYS.socketMap);

    for (const [socketId, userInfo] of Object.entries(sockets)) {
      const [, organizationId] = userInfo.split(':');
      const orgKey = KEYS.orgUsers(organizationId);

      // Check if the org set still exists (might have expired)
      const exists = await this.redis.exists(orgKey);

      if (!exists) {
        // Clean up orphaned socket mapping
        await this.redis.hdel(KEYS.socketMap, socketId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up stale socket mappings', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    healthy: boolean;
    redis: boolean;
    totalConnections: number;
    organizationCount: number;
  }> {
    try {
      const [ping, totalConnections, orgKeys] = await Promise.all([
        this.redis.ping(),
        this.getGlobalCount(),
        this.redis.keys('concurrent:users:*'),
      ]);

      return {
        healthy: ping === 'PONG',
        redis: ping === 'PONG',
        totalConnections,
        organizationCount: orgKeys.length,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        healthy: false,
        redis: false,
        totalConnections: 0,
        organizationCount: 0,
      };
    }
  }
}

// Singleton instance
let concurrentUsersServiceInstance: ConcurrentUsersService | null = null;

export function getConcurrentUsersService(redis: Redis): ConcurrentUsersService {
  if (!concurrentUsersServiceInstance) {
    concurrentUsersServiceInstance = new ConcurrentUsersService(redis);
  }
  return concurrentUsersServiceInstance;
}

export { ConcurrentUsersService };
export default ConcurrentUsersService;
