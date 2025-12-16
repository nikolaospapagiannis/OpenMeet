/**
 * Admin Realtime WebSocket Handler
 * Enterprise-grade real-time features for admin dashboard
 *
 * Namespaces:
 * - /admin/concurrent-users: Real-time concurrent user counts
 * - /admin/analytics-stream: Real-time analytics event stream
 *
 * Features:
 * - Multi-tenant organization isolation
 * - Super admin global view
 * - Redis pub/sub for scalability
 * - Automatic reconnection handling
 */

import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import Redis from 'ioredis';
import winston from 'winston';
import { getConcurrentUsersService, ConcurrentUsersService } from '../services/ConcurrentUsersService';
import { AuthenticatedSocket, setupNamespaceWithIsolation } from './setup';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'admin-realtime-handler' },
  transports: [new winston.transports.Console()],
});

/**
 * Admin Realtime Handler
 * Manages WebSocket connections for admin real-time features
 */
export class AdminRealtimeHandler {
  private io: SocketIOServer;
  private redis: Redis;
  private concurrentUsersService: ConcurrentUsersService;
  private analyticsSubscribers: Map<string, Redis> = new Map();

  constructor(io: SocketIOServer, redis: Redis) {
    this.io = io;
    this.redis = redis;
    this.concurrentUsersService = getConcurrentUsersService(redis);

    this.setupConcurrentUsersNamespace();
    this.setupAnalyticsStreamNamespace();

    logger.info('AdminRealtimeHandler initialized');
  }

  /**
   * Setup /admin/concurrent-users namespace
   */
  private setupConcurrentUsersNamespace(): void {
    const namespace = '/admin/concurrent-users';

    setupNamespaceWithIsolation(this.io, namespace, (socket: AuthenticatedSocket) => {
      this.handleConcurrentUsersConnection(socket);
    });

    // Initialize the concurrent users service with the namespace
    this.concurrentUsersService.initialize(this.io);

    logger.info('Concurrent users namespace setup complete', { namespace });
  }

  /**
   * Handle concurrent users connection
   */
  private async handleConcurrentUsersConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId, organizationId, isSuperAdmin } = socket.data;

    logger.debug('Concurrent users connection', {
      socketId: socket.id,
      userId,
      organizationId,
      isSuperAdmin,
    });

    // Register connection
    const count = await this.concurrentUsersService.registerConnection(
      userId,
      organizationId,
      socket.id
    );

    // Send initial count to the connecting client
    if (isSuperAdmin) {
      const globalStats = await this.concurrentUsersService.getGlobalStats();
      socket.emit('concurrent-users:init', {
        type: 'global',
        ...globalStats,
        timestamp: new Date().toISOString(),
      });
    } else {
      socket.emit('concurrent-users:init', {
        type: 'organization',
        organizationId,
        count,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle request for current stats
    socket.on('concurrent-users:get', async () => {
      if (isSuperAdmin) {
        const globalStats = await this.concurrentUsersService.getGlobalStats();
        socket.emit('concurrent-users:global', {
          ...globalStats,
          timestamp: new Date().toISOString(),
        });
      } else {
        const orgCount = await this.concurrentUsersService.getOrganizationCount(organizationId);
        socket.emit('concurrent-users:update', {
          organizationId,
          count: orgCount,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      await this.concurrentUsersService.unregisterConnection(socket.id);

      logger.debug('Concurrent users disconnection', {
        socketId: socket.id,
        userId,
        organizationId,
      });
    });
  }

  /**
   * Setup /admin/analytics-stream namespace
   */
  private setupAnalyticsStreamNamespace(): void {
    const namespace = '/admin/analytics-stream';

    setupNamespaceWithIsolation(this.io, namespace, (socket: AuthenticatedSocket) => {
      this.handleAnalyticsStreamConnection(socket);
    });

    logger.info('Analytics stream namespace setup complete', { namespace });
  }

  /**
   * Handle analytics stream connection
   */
  private async handleAnalyticsStreamConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId, organizationId, isSuperAdmin } = socket.data;

    logger.debug('Analytics stream connection', {
      socketId: socket.id,
      userId,
      organizationId,
      isSuperAdmin,
    });

    // Create a dedicated Redis subscriber for this socket
    const subscriber = this.redis.duplicate();
    this.analyticsSubscribers.set(socket.id, subscriber);

    // Subscribe to appropriate channels
    if (isSuperAdmin) {
      // Super admin: subscribe to global channel (receives all events)
      await subscriber.subscribe('analytics:global');
      logger.debug('Subscribed to global analytics channel', { socketId: socket.id });
    } else {
      // Regular admin: subscribe only to their organization's channel
      await subscriber.subscribe(`analytics:${organizationId}`);
      logger.debug('Subscribed to organization analytics channel', {
        socketId: socket.id,
        organizationId,
      });
    }

    // Forward Redis messages to WebSocket
    subscriber.on('message', (channel: string, message: string) => {
      try {
        const event = JSON.parse(message);

        // For super admins, include the source channel
        if (isSuperAdmin) {
          event._channel = channel;
        }

        socket.emit('analytics:event', event);
      } catch (error) {
        logger.error('Failed to parse analytics event', { channel, error });
      }
    });

    // Handle subscription to specific event types
    socket.on('analytics:subscribe', async (eventTypes: string[]) => {
      // Store filter preferences (client-side filtering for simplicity)
      socket.data.eventFilter = eventTypes;
      socket.emit('analytics:subscribed', { eventTypes });
    });

    // Handle request to get recent events (from cache if available)
    socket.on('analytics:get-recent', async (limit: number = 50) => {
      // This would typically fetch from a Redis list of recent events
      // For now, we just acknowledge the request
      socket.emit('analytics:recent', {
        events: [],
        message: 'Real-time events will appear here',
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const sub = this.analyticsSubscribers.get(socket.id);
      if (sub) {
        try {
          await sub.unsubscribe();
          await sub.quit();
        } catch (error) {
          logger.error('Error cleaning up subscriber', { socketId: socket.id, error });
        }
        this.analyticsSubscribers.delete(socket.id);
      }

      logger.debug('Analytics stream disconnection', {
        socketId: socket.id,
        userId,
        organizationId,
      });
    });
  }

  /**
   * Get active connection counts
   */
  async getConnectionStats(): Promise<{
    concurrentUsers: {
      total: number;
      byOrganization: number;
    };
    analyticsStream: {
      total: number;
      globalSubscribers: number;
    };
  }> {
    const concurrentUsersNsp = this.io.of('/admin/concurrent-users');
    const analyticsStreamNsp = this.io.of('/admin/analytics-stream');

    const [cuSockets, asSockets] = await Promise.all([
      concurrentUsersNsp.fetchSockets(),
      analyticsStreamNsp.fetchSockets(),
    ]);

    return {
      concurrentUsers: {
        total: cuSockets.length,
        byOrganization: new Set(cuSockets.map((s) => (s as unknown as AuthenticatedSocket).data?.organizationId)).size,
      },
      analyticsStream: {
        total: asSockets.length,
        globalSubscribers: asSockets.filter((s) => (s as unknown as AuthenticatedSocket).data?.isSuperAdmin).length,
      },
    };
  }

  /**
   * Broadcast message to all connections in an organization
   */
  async broadcastToOrganization(
    organizationId: string,
    event: string,
    data: unknown,
    namespace?: string
  ): Promise<void> {
    const nsp = namespace ? this.io.of(namespace) : this.io;
    nsp.to(`org:${organizationId}`).emit(event, data);
  }

  /**
   * Broadcast message to all super admins
   */
  async broadcastToAdmins(
    event: string,
    data: unknown,
    namespace?: string
  ): Promise<void> {
    const nsp = namespace ? this.io.of(namespace) : this.io;
    nsp.to('admin:global').emit(event, data);
  }

  /**
   * Cleanup all subscribers on shutdown
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up AdminRealtimeHandler...');

    // Stop concurrent users broadcasting
    this.concurrentUsersService.stopBroadcasting();

    // Close all analytics subscribers
    for (const [socketId, subscriber] of this.analyticsSubscribers) {
      try {
        await subscriber.unsubscribe();
        await subscriber.quit();
      } catch (error) {
        logger.error('Error closing subscriber', { socketId, error });
      }
    }
    this.analyticsSubscribers.clear();

    logger.info('AdminRealtimeHandler cleanup complete');
  }
}

// Factory function
export function createAdminRealtimeHandler(
  io: SocketIOServer,
  redis: Redis
): AdminRealtimeHandler {
  return new AdminRealtimeHandler(io, redis);
}

export default AdminRealtimeHandler;
