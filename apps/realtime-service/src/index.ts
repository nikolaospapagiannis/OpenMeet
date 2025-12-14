/**
 * Real-time WebSocket Service
 * Handles live transcription, meeting updates, and real-time collaboration
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { register, Counter, Gauge, Histogram } from 'prom-client';
import * as dotenv from 'dotenv';

dotenv.config();

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Prometheus metrics
const activeConnections = new Gauge({
  name: 'ws_active_connections',
  help: 'Number of active WebSocket connections'
});

// Track active connection count
let activeConnectionCount = 0;

const messagesReceived = new Counter({
  name: 'ws_messages_received_total',
  help: 'Total number of messages received'
});

const messagesSent = new Counter({
  name: 'ws_messages_sent_total',
  help: 'Total number of messages sent'
});

const messageLatency = new Histogram({
  name: 'ws_message_latency_seconds',
  help: 'WebSocket message latency in seconds'
});

// Initialize Express
const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(express.json());

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// User-Socket mapping
const userSockets = new Map<string, Set<string>>();
const socketUsers = new Map<string, string>();

// JWT authentication middleware
io.use(async (socket: Socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    socket.data.userId = decoded.userId;

    logger.info('User authenticated', { userId: decoded.userId, socketId: socket.id });
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    next(new Error('Invalid authentication token'));
  }
});

// Connection handler
io.on('connection', (socket: Socket) => {
  const userId = socket.data.userId;

  activeConnections.inc();
  activeConnectionCount++;
  logger.info('Client connected', { userId, socketId: socket.id });

  // Track user connections
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket.id);
  socketUsers.set(socket.id, userId);

  // Join user's personal room
  socket.join(`user:${userId}`);

  // Meeting events
  socket.on('join-meeting', async (data: { meetingId: string }) => {
    try {
      const { meetingId } = data;

      socket.join(`meeting:${meetingId}`);

      // Store meeting participation in Redis
      await redis.sadd(`meeting:${meetingId}:participants`, userId);
      await redis.setex(`user:${userId}:current-meeting`, 3600, meetingId);

      // Notify other participants
      socket.to(`meeting:${meetingId}`).emit('participant-joined', {
        userId,
        timestamp: new Date().toISOString()
      });

      // Send current meeting state
      const transcriptData = await redis.get(`meeting:${meetingId}:transcript`);
      if (transcriptData) {
        socket.emit('transcript-state', JSON.parse(transcriptData));
      }

      logger.info('User joined meeting', { userId, meetingId });
    } catch (error) {
      logger.error('Error joining meeting', { error, userId });
      socket.emit('error', { message: 'Failed to join meeting' });
    }
  });

  socket.on('leave-meeting', async (data: { meetingId: string }) => {
    try {
      const { meetingId } = data;

      socket.leave(`meeting:${meetingId}`);

      await redis.srem(`meeting:${meetingId}:participants`, userId);
      await redis.del(`user:${userId}:current-meeting`);

      socket.to(`meeting:${meetingId}`).emit('participant-left', {
        userId,
        timestamp: new Date().toISOString()
      });

      logger.info('User left meeting', { userId, meetingId });
    } catch (error) {
      logger.error('Error leaving meeting', { error, userId });
    }
  });

  // Transcription events
  socket.on('transcription-segment', async (data: {
    meetingId: string;
    segment: any;
  }) => {
    const start = Date.now();
    messagesReceived.inc();

    try {
      const { meetingId, segment } = data;

      // Store segment in Redis
      await redis.rpush(
        `meeting:${meetingId}:segments`,
        JSON.stringify(segment)
      );

      // Broadcast to all meeting participants
      io.to(`meeting:${meetingId}`).emit('transcription-update', {
        segment,
        timestamp: new Date().toISOString()
      });

      messagesSent.inc();
      messageLatency.observe((Date.now() - start) / 1000);

      logger.debug('Transcription segment broadcast', { meetingId, segmentId: segment.id });
    } catch (error) {
      logger.error('Error broadcasting transcription', { error });
    }
  });

  // Cursor/typing indicators
  socket.on('cursor-position', (data: {
    meetingId: string;
    position: number;
  }) => {
    messagesReceived.inc();

    socket.to(`meeting:${data.meetingId}`).emit('user-cursor', {
      userId,
      position: data.position,
      timestamp: Date.now()
    });

    messagesSent.inc();
  });

  socket.on('typing-indicator', (data: {
    meetingId: string;
    isTyping: boolean;
  }) => {
    messagesReceived.inc();

    socket.to(`meeting:${data.meetingId}`).emit('user-typing', {
      userId,
      isTyping: data.isTyping
    });

    messagesSent.inc();
  });

  // Comments/annotations
  socket.on('add-comment', async (data: {
    meetingId: string;
    comment: any;
  }) => {
    messagesReceived.inc();

    try {
      const { meetingId, comment } = data;

      const commentWithMeta = {
        ...comment,
        id: `comment_${Date.now()}`,
        userId,
        createdAt: new Date().toISOString()
      };

      await redis.rpush(
        `meeting:${meetingId}:comments`,
        JSON.stringify(commentWithMeta)
      );

      io.to(`meeting:${meetingId}`).emit('comment-added', commentWithMeta);

      messagesSent.inc();
    } catch (error) {
      logger.error('Error adding comment', { error });
    }
  });

  // Recording status
  socket.on('recording-status', (data: {
    meetingId: string;
    status: 'started' | 'paused' | 'stopped';
  }) => {
    messagesReceived.inc();

    io.to(`meeting:${data.meetingId}`).emit('recording-update', {
      status: data.status,
      timestamp: new Date().toISOString()
    });

    messagesSent.inc();
  });

  // Presence heartbeat
  socket.on('heartbeat', async () => {
    await redis.setex(`presence:${userId}`, 60, 'online');
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    activeConnections.dec();
    activeConnectionCount--;

    // Clean up tracking
    const socketSet = userSockets.get(userId);
    if (socketSet) {
      socketSet.delete(socket.id);
      if (socketSet.size === 0) {
        userSockets.delete(userId);
        await redis.del(`presence:${userId}`);
      }
    }
    socketUsers.delete(socket.id);

    // Get current meeting and notify
    const currentMeeting = await redis.get(`user:${userId}:current-meeting`);
    if (currentMeeting) {
      io.to(`meeting:${currentMeeting}`).emit('participant-disconnected', {
        userId,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Client disconnected', { userId, socketId: socket.id });
  });

  // Error handling
  socket.on('error', (error) => {
    logger.error('Socket error', { error, userId, socketId: socket.id });
  });
});

// Redis Pub/Sub for cross-server communication
redisSub.subscribe('broadcast', 'meeting-updates');

redisSub.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);

    switch (channel) {
      case 'broadcast':
        io.emit(data.event, data.payload);
        break;
      case 'meeting-updates':
        io.to(`meeting:${data.meetingId}`).emit(data.event, data.payload);
        break;
    }
  } catch (error) {
    logger.error('Redis message error', { error, channel });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'realtime-service',
    connections: activeConnectionCount,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Broadcast endpoint (for internal services)
app.post('/broadcast', async (req, res) => {
  try {
    const { event, payload, target } = req.body;

    if (target?.meetingId) {
      io.to(`meeting:${target.meetingId}`).emit(event, payload);
    } else if (target?.userId) {
      io.to(`user:${target.userId}`).emit(event, payload);
    } else {
      io.emit(event, payload);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Broadcast error', { error });
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

// Start server
const PORT = process.env.PORT || 3002;

httpServer.listen(PORT, () => {
  logger.info(`Real-time service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing connections...');

  io.close(() => {
    logger.info('WebSocket server closed');
    httpServer.close(() => {
      logger.info('HTTP server closed');
      redis.quit();
      redisSub.quit();
      process.exit(0);
    });
  });
});
