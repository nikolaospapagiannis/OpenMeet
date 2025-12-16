/**
 * WebSocket Setup with Redis Adapter for Horizontal Scaling
 * Enterprise-grade Socket.IO configuration with multi-tenant support
 *
 * Features:
 * - Redis pub/sub adapter for cross-node message distribution
 * - Automatic reconnection with exponential backoff
 * - Graceful fallback to single-node mode if Redis unavailable
 * - Multi-tenant room isolation
 * - JWT authentication with session validation
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { RedisOptions } from 'ioredis';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'websocket-setup' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// Redis adapter state tracking
let redisAdapterEnabled = false;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Get Redis connection configuration from environment variables
 */
function getRedisConfig(): RedisOptions {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for Socket.IO Redis adapter
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries, giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 200, 5000); // Exponential backoff, max 5s
      logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      if (targetErrors.some(e => err.message.includes(e))) {
        logger.warn('Redis reconnectable error detected, attempting reconnection', {
          error: err.message,
        });
        return true;
      }
      return false;
    },
  };
}

/**
 * Create Redis clients for Socket.IO adapter pub/sub
 */
async function createRedisClients(): Promise<{ pub: Redis; sub: Redis } | null> {
  const config = getRedisConfig();

  try {
    const pub = new Redis(config);
    const sub = pub.duplicate();

    // Set up error handlers before connecting
    pub.on('error', (err) => {
      logger.error('Redis pub client error', { error: err.message });
    });

    sub.on('error', (err) => {
      logger.error('Redis sub client error', { error: err.message });
    });

    pub.on('connect', () => {
      logger.info('Redis pub client connected', {
        host: config.host,
        port: config.port,
      });
    });

    sub.on('connect', () => {
      logger.info('Redis sub client connected', {
        host: config.host,
        port: config.port,
      });
    });

    pub.on('reconnecting', () => {
      logger.warn('Redis pub client reconnecting');
    });

    sub.on('reconnecting', () => {
      logger.warn('Redis sub client reconnecting');
    });

    pub.on('close', () => {
      logger.warn('Redis pub client connection closed');
    });

    sub.on('close', () => {
      logger.warn('Redis sub client connection closed');
    });

    // Attempt connection with timeout
    const connectTimeout = 10000; // 10 seconds
    await Promise.race([
      Promise.all([pub.connect(), sub.connect()]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), connectTimeout)
      ),
    ]);

    // Verify connections are working
    await pub.ping();
    await sub.ping();

    logger.info('Redis pub/sub clients connected successfully for Socket.IO adapter', {
      host: config.host,
      port: config.port,
    });

    return { pub, sub };
  } catch (error) {
    logger.error('Failed to create Redis clients for Socket.IO adapter', {
      error: error instanceof Error ? error.message : 'Unknown error',
      host: config.host,
      port: config.port,
    });
    return null;
  }
}

/**
 * Check if Redis adapter is currently enabled
 */
export function isRedisAdapterEnabled(): boolean {
  return redisAdapterEnabled;
}

/**
 * Get Redis adapter status for health checks
 */
export async function getRedisAdapterStatus(): Promise<{
  enabled: boolean;
  pubConnected: boolean;
  subConnected: boolean;
  host: string;
  port: number;
}> {
  const config = getRedisConfig();
  return {
    enabled: redisAdapterEnabled,
    pubConnected: pubClient?.status === 'ready',
    subConnected: subClient?.status === 'ready',
    host: config.host || 'localhost',
    port: config.port || 6379,
  };
}

// Extended Socket interface with auth data
export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    organizationId: string;
    email: string;
    role: string;
    systemRole?: string;
    isSuperAdmin: boolean;
    sessionId?: string;
    eventFilter?: string[]; // Optional filter for analytics stream events
  };
}

// WebSocket namespace types
export type WebSocketNamespace =
  | '/admin/concurrent-users'
  | '/admin/analytics-stream'
  | '/meetings'
  | '/notifications';

/**
 * Create and configure Socket.IO server with Redis adapter
 * Supports graceful fallback to single-node mode if Redis is unavailable
 */
export async function createWebSocketServer(httpServer: HTTPServer): Promise<SocketIOServer> {
  // Create Socket.IO server first (works without Redis)
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
      credentials: true,
    },
    // Connection settings for reliability
    pingTimeout: 60000,
    pingInterval: 25000,
    // Transports - prefer WebSocket for real-time, with polling fallback
    transports: ['websocket', 'polling'],
    // Allow upgrades from polling to websocket
    allowUpgrades: true,
    // Connection state recovery for reconnections
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // Attempt to connect Redis adapter for horizontal scaling
  const redisClients = await createRedisClients();

  if (redisClients) {
    try {
      // Store references for cleanup and status checks
      pubClient = redisClients.pub;
      subClient = redisClients.sub;

      // Attach Redis adapter for horizontal scaling
      io.adapter(createAdapter(pubClient, subClient));
      redisAdapterEnabled = true;

      logger.info('Socket.IO Redis adapter configured for horizontal scaling', {
        mode: 'clustered',
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
      });
    } catch (adapterError) {
      logger.error('Failed to attach Redis adapter, falling back to single-node mode', {
        error: adapterError instanceof Error ? adapterError.message : 'Unknown error',
      });
      redisAdapterEnabled = false;

      // Clean up Redis clients on adapter failure
      await cleanupRedisClients();
    }
  } else {
    logger.warn('Redis unavailable, Socket.IO running in single-node mode', {
      mode: 'single-node',
      warning: 'Horizontal scaling not available - WebSocket messages will not be distributed across nodes',
    });
    redisAdapterEnabled = false;
  }

  // Global authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        userId: string;
        organizationId: string;
        email: string;
        role: string;
        systemRole?: string;
      };

      // Validate session is still active (anti-hijacking)
      if (decoded.userId) {
        const activeSession = await prisma.session.findFirst({
          where: {
            userId: decoded.userId,
            expiresAt: { gt: new Date() },
          },
        });

        if (!activeSession) {
          return next(new Error('Session expired or revoked'));
        }
      }

      // Determine if super admin
      const isSuperAdmin = decoded.systemRole &&
        ['super_admin', 'platform_admin'].includes(decoded.systemRole);

      // Attach auth data to socket
      const authSocket = socket as AuthenticatedSocket;
      authSocket.data = {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        email: decoded.email,
        role: decoded.role,
        systemRole: decoded.systemRole,
        isSuperAdmin: !!isSuperAdmin,
      };

      logger.debug('Socket authenticated', {
        socketId: socket.id,
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        isSuperAdmin,
      });

      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  // Global connection handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    logger.info('Socket connected', {
      socketId: socket.id,
      userId: authSocket.data?.userId,
      organizationId: authSocket.data?.organizationId,
    });

    // Auto-join organization room for isolation
    if (authSocket.data?.organizationId) {
      socket.join(`org:${authSocket.data.organizationId}`);
    }

    // Super admins can optionally join a global admin room
    if (authSocket.data?.isSuperAdmin) {
      socket.join('admin:global');
    }

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: authSocket.data?.userId,
        reason,
      });
    });

    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: authSocket.data?.userId,
        error: error.message,
      });
    });
  });

  return io;
}

/**
 * Setup namespace with organization-based room isolation
 */
export function setupNamespaceWithIsolation(
  io: SocketIOServer,
  namespace: string,
  connectionHandler: (socket: AuthenticatedSocket) => void
): void {
  const nsp = io.of(namespace);

  // Namespace-level auth middleware (inherits from main io)
  nsp.use(async (socket: Socket, next) => {
    const authSocket = socket as AuthenticatedSocket;

    // Verify socket has auth data (should be set by main middleware)
    if (!authSocket.data?.userId) {
      return next(new Error('Authentication required'));
    }

    next();
  });

  nsp.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    // Auto-join organization room
    if (authSocket.data?.organizationId) {
      socket.join(`org:${authSocket.data.organizationId}`);
    }

    // Super admins join global admin room
    if (authSocket.data?.isSuperAdmin) {
      socket.join('admin:global');
    }

    logger.debug(`Socket connected to ${namespace}`, {
      socketId: socket.id,
      userId: authSocket.data?.userId,
      organizationId: authSocket.data?.organizationId,
    });

    connectionHandler(authSocket);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected from ${namespace}`, {
        socketId: socket.id,
        userId: authSocket.data?.userId,
      });
    });
  });
}

/**
 * Emit to organization room only (multi-tenant isolation)
 */
export function emitToOrganization(
  io: SocketIOServer,
  organizationId: string,
  event: string,
  data: unknown,
  namespace?: string
): void {
  const target = namespace ? io.of(namespace) : io;
  target.to(`org:${organizationId}`).emit(event, data);

  logger.debug('Emitted to organization', {
    organizationId,
    event,
    namespace: namespace || 'default',
  });
}

/**
 * Emit to all super admins (global admin room)
 */
export function emitToAdmins(
  io: SocketIOServer,
  event: string,
  data: unknown,
  namespace?: string
): void {
  const target = namespace ? io.of(namespace) : io;
  target.to('admin:global').emit(event, data);

  logger.debug('Emitted to admins', { event, namespace: namespace || 'default' });
}

/**
 * Get connected socket count for an organization
 */
export async function getOrganizationSocketCount(
  io: SocketIOServer,
  organizationId: string,
  namespace?: string
): Promise<number> {
  const target = namespace ? io.of(namespace) : io;
  const sockets = await target.in(`org:${organizationId}`).fetchSockets();
  return sockets.length;
}

/**
 * Get total connected socket count across all organizations
 */
export async function getTotalSocketCount(
  io: SocketIOServer,
  namespace?: string
): Promise<number> {
  const target = namespace ? io.of(namespace) : io;
  const sockets = await target.fetchSockets();
  return sockets.length;
}

/**
 * Cleanup Redis clients for graceful shutdown
 */
async function cleanupRedisClients(): Promise<void> {
  try {
    if (pubClient) {
      await pubClient.quit();
      pubClient = null;
    }
    if (subClient) {
      await subClient.quit();
      subClient = null;
    }
    redisAdapterEnabled = false;
    logger.info('Redis adapter clients cleaned up');
  } catch (error) {
    logger.error('Error cleaning up Redis clients', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Graceful shutdown of WebSocket server and Redis adapter
 */
export async function shutdownWebSocketServer(io: SocketIOServer): Promise<void> {
  logger.info('Shutting down WebSocket server...');

  // Close all socket connections gracefully
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    socket.disconnect(true);
  }

  // Cleanup Redis adapter clients
  await cleanupRedisClients();

  // Close Socket.IO server
  io.close();

  logger.info('WebSocket server shutdown complete');
}

export default {
  createWebSocketServer,
  setupNamespaceWithIsolation,
  emitToOrganization,
  emitToAdmins,
  getOrganizationSocketCount,
  getTotalSocketCount,
  shutdownWebSocketServer,
  isRedisAdapterEnabled,
  getRedisAdapterStatus,
};
