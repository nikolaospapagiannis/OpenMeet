/**
 * OpenMeet - API Server
 * Production-ready Express + GraphQL API
 */

import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Validate environment configuration (will throw if required vars are missing)
import './config/env';

import express, { Express } from 'express';
import { createServer } from 'http';
import { ApolloServer } from 'apollo-server-express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import amqp from 'amqplib';
import winston from 'winston';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { validateRequest } from './middleware/validation';
import {
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  strictCorsOptions,
  sqlInjectionProtection,
  xssProtection,
  securityHeaders,
  apiKeyRotation,
} from './middleware/security';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import meetingRoutes from './routes/meetings';
import recordingsRoutes from './routes/recordings';
import transcriptionRoutes from './routes/transcriptions';
import organizationRoutes from './routes/organizations';
import integrationRoutes from './routes/integrations';
import webhookRoutes from './routes/webhooks';
import analyticsRoutes from './routes/analytics';
import billingRoutes from './routes/billing';
import intelligenceRoutes from './routes/intelligence';
import revenueRoutes from './routes/revenue';
import videoRoutes from './routes/video';
import videoClipsRoutes from './routes/video-clips';
import liveRoutes from './routes/live';
import liveFeaturesRoutes from './routes/live-features';
// import aiAdvancedRoutes from './routes/ai-advanced'; // Temporarily disabled
import aiQueryRoutes from './routes/ai-query';
import videoIntelligenceRoutes from './routes/video-intelligence';
import developerRoutes from './routes/developer';
import publicAPIv1Routes from './routes/public-api-v1';
import apiV1Router from './routes/v1';
import slackIntegrationRoutes from './routes/integrations/slack';
import teamsIntegrationRoutes from './routes/integrations/teams';
import chromeExtensionRoutes from './routes/chrome-extension';
import ssoRoutes from './routes/sso';
import rateLimitsRoutes from './routes/rate-limits';
import scimRoutes from './routes/scim';
import notificationsRoutes from './routes/notifications';
import meetIntegrationRoutes from './routes/integrations/meet';
import coachingRoutes from './routes/coaching';
import templatesRoutes from './routes/templates';
import sharingRoutes from './routes/sharing';
import teamManagementRoutes from './routes/team-management';
import aiAppsRoutes from './routes/ai-apps';
import adminRoutes from './routes/admin';

// Import GraphQL schema
import { typeDefs } from './graphql/schema';
import resolvers from './graphql/resolvers';

// Import services
import { CacheService } from './services/cache';
import { QueueService } from './services/queue';
import { StorageService } from './services/storage';
import { EmailService } from './services/email';
import { SmsService } from './services/sms';
import { SearchService } from './services/search';

// Import rate limiting and DDoS protection
import { ddosProtection } from './middleware/ddos-protection';
import { combinedRateLimiting, rateLimitByEndpoint } from './middleware/rate-limit';
import { getRateLimitMonitorService } from './services/RateLimitMonitorService';

// Import WebSocket handlers
import { LiveMeetingHandler } from './websocket/LiveMeetingHandler';
import { createAdminRealtimeHandler, AdminRealtimeHandler } from './websocket/AdminRealtimeHandler';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Initialize database clients
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '4002'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
});

const elasticsearch = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:4003',
});

// Initialize services
const cacheService = new CacheService(redis);
const queueService = new QueueService(redis);
const storageService = new StorageService();
const emailService = new EmailService();
const smsService = new SmsService();
const searchService = new SearchService(elasticsearch);

// Create Express app
const app: Express = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

// Comprehensive Security Middleware Stack
app.use(helmetConfig);
app.use(securityHeaders);
app.use(sqlInjectionProtection);
app.use(xssProtection);

// Strict CORS configuration
app.use(cors(strictCorsOptions));

// API Key Rotation Check
app.use(apiKeyRotation({
  rotationDays: 90,
  warningDays: 75,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// DDoS protection (must come early)
app.use(ddosProtection(redis));

// Combined rate limiting (IP, user, API key)
app.use('/api', combinedRateLimiting());

// Endpoint-specific rate limiting for auth endpoints (strict)
app.use('/api/auth/login', rateLimitByEndpoint(5, 900)); // 5 per 15 min
app.use('/api/auth/register', rateLimitByEndpoint(3, 3600)); // 3 per hour
app.use('/api/auth/forgot-password', rateLimitByEndpoint(3, 3600));
app.use('/api/auth/reset-password', rateLimitByEndpoint(5, 3600));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connectivity
    const redisPing = await redis.ping();

    // Check Elasticsearch connectivity
    const esHealth = await elasticsearch.cluster.health();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
        elasticsearch: esHealth.status,
      },
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes); // Auth handled per-route
app.use('/api/meetings', authMiddleware, meetingRoutes);
app.use('/api/recordings', recordingsRoutes);
app.use('/api/transcriptions', authMiddleware, transcriptionRoutes);
app.use('/api/organizations', authMiddleware, organizationRoutes);
app.use('/api/team-management', authMiddleware, teamManagementRoutes);
// Specific integration routes BEFORE general route (meet has public /save endpoint)
app.use('/api/integrations/meet', meetIntegrationRoutes);
app.use('/api/integrations/slack', slackIntegrationRoutes);
app.use('/api/integrations/teams', teamsIntegrationRoutes);
app.use('/api/integrations', integrationRoutes); // Auth handled per-route for OAuth callback support
app.use('/api/webhooks', authMiddleware, webhookRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/billing', authMiddleware, billingRoutes);
app.use('/api/intelligence', authMiddleware, intelligenceRoutes);
app.use('/api/revenue', authMiddleware, revenueRoutes);
app.use('/api/video', authMiddleware, videoRoutes);
app.use('/api/video/clips', authMiddleware, videoClipsRoutes);
app.use('/api/live', authMiddleware, liveRoutes);
app.use('/api/live-features', authMiddleware, liveFeaturesRoutes);
// app.use('/api/ai-advanced', authMiddleware, aiAdvancedRoutes); // Temporarily disabled
app.use('/api/ai', authMiddleware, aiQueryRoutes); // AI query and conversation endpoints
app.use('/api/video-intelligence', authMiddleware, videoIntelligenceRoutes);
app.use('/api/developer', developerRoutes);
app.use('/v1', publicAPIv1Routes); // Legacy public API (deprecated)
app.use('/api/v1', apiV1Router); // Public API v1 with API key auth
app.use('/api/notifications', notificationsRoutes);
app.use('/api/extension', chromeExtensionRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/rate-limits', rateLimitsRoutes);
app.use('/api/coaching', authMiddleware, coachingRoutes);
app.use('/api/templates', authMiddleware, templatesRoutes);
app.use('/api/ai-apps', aiAppsRoutes); // AI Apps marketplace (auth handled per-route)
app.use('/api', sharingRoutes); // Sharing routes (includes both authenticated and public endpoints)
app.use('/scim', scimRoutes); // SCIM 2.0 provisioning endpoints (no /api prefix per spec)
app.use('/api/admin', adminRoutes); // Super Admin Dashboard routes (auth handled internally)

// GraphQL setup
async function setupGraphQL() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      req,
      prisma,
      redis,
      services: {
        cache: cacheService,
        queue: queueService,
        storage: storageService,
        email: emailService,
        sms: smsService,
        search: searchService,
      },
      user: (req as any).user,
    }),
    introspection: process.env.NODE_ENV !== 'production',
    cache: 'bounded',
    csrfPrevention: true,
    formatError: (err) => {
      logger.error('GraphQL error:', err);
      return err;
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ 
    app,
    path: '/graphql',
    cors: false, // We handle CORS at the app level
  });

  return apolloServer;
}

// Initialize Live Meeting Handler for WebSocket management
const liveMeetingHandler = new LiveMeetingHandler(io);

// Initialize Admin Realtime Handler for enterprise admin dashboard features
// Provides: concurrent users tracking, analytics streaming, geographic data
let adminRealtimeHandler: AdminRealtimeHandler | null = null;
try {
  adminRealtimeHandler = createAdminRealtimeHandler(io, redis);
  logger.info('Admin realtime WebSocket handler initialized');
} catch (error) {
  logger.error('Failed to initialize admin realtime handler:', error);
}

// Initialize Live Collaboration Service for real-time features
// DISABLED: WebSocket constructor issue in production - needs fix
// import { liveCollaborationService } from './services/LiveCollaborationService';
// liveCollaborationService.initializeWebSocket(httpServer);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join-meeting', async (meetingId: string) => {
    socket.join(`meeting:${meetingId}`);
    logger.info(`Socket ${socket.id} joined meeting ${meetingId}`);
  });

  socket.on('leave-meeting', async (meetingId: string) => {
    socket.leave(`meeting:${meetingId}`);
    logger.info(`Socket ${socket.id} left meeting ${meetingId}`);
  });

  socket.on('transcription-update', async (data) => {
    // Broadcast transcription updates to meeting participants
    io.to(`meeting:${data.meetingId}`).emit('transcription', data);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

logger.info('Live meeting WebSocket handler initialized');

// Error handling middleware (must be last)
app.use(errorHandler);

// MongoDB connection removed - now using PostgreSQL with pgvector for all data storage

// RabbitMQ connection
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();
    
    // Setup queues
    await channel.assertQueue('transcription-queue', { durable: true });
    await channel.assertQueue('summary-queue', { durable: true });
    await channel.assertQueue('analytics-queue', { durable: true });
    await channel.assertQueue('notification-queue', { durable: true });
    
    logger.info('RabbitMQ connected and queues initialized');
    
    return { connection, channel };
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
    throw error;
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Starting graceful shutdown...');

  // Cleanup admin realtime handler (WebSocket subscribers)
  if (adminRealtimeHandler) {
    await adminRealtimeHandler.cleanup();
    logger.info('Admin realtime handler cleaned up');
  }

  // Close server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  await prisma.$disconnect();
  redis.disconnect();

  // Exit process
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer() {
  try {
    // Connect to databases and services
    await connectRabbitMQ();
    
    // Setup GraphQL
    const apolloServer = await setupGraphQL();
    
    // Start listening
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server ready at http://localhost:${PORT}`);
      logger.info(`🚀 GraphQL ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
      logger.info(`🚀 WebSocket ready at ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { app, httpServer, prisma, redis };

// Start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
