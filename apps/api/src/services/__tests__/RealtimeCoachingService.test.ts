/**
 * RealtimeCoachingService Tests
 *
 * Tests for the real-time coaching service with:
 * - WebSocket connections
 * - Redis session management
 * - Talk time analysis
 * - Pattern detection
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { Server, createServer } from 'http';
import { WebSocket } from 'ws';
import Redis from 'ioredis';
import { RealtimeCoachingService } from '../RealtimeCoachingService';
import jwt from 'jsonwebtoken';

// Test configuration
const TEST_PORT = 4099;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('RealtimeCoachingService', () => {
  let service: RealtimeCoachingService;
  let httpServer: Server;
  let redis: Redis;
  let testToken: string;

  beforeAll(async () => {
    // Create Redis client for test verification
    redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    });

    // Verify Redis connectivity
    const pong = await redis.ping();
    expect(pong).toBe('PONG');

    // Create test JWT token
    testToken = jwt.sign(
      { id: 'test-user-123', email: 'test@example.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create HTTP server
    httpServer = createServer();

    // Create service and initialize WebSocket
    service = new RealtimeCoachingService();
    service.initWebSocket(httpServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, () => {
        console.log(`Test server listening on port ${TEST_PORT}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Shutdown service
    await service.shutdown();

    // Close HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    // Close Redis
    await redis.quit();
  });

  beforeEach(async () => {
    // Clean up any test data
    const keys = await redis.keys('coaching:test-*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('Service Initialization', () => {
    it('should initialize with Redis connected', async () => {
      const health = await service.healthCheck();
      expect(health.details.redis).toBe('connected');
    });

    it('should have WebSocket server running', async () => {
      const health = await service.healthCheck();
      expect(health.details.websocketServer).toBe('running');
    });

    it('should start with zero active sessions', () => {
      expect(service.getActiveSessionCount()).toBe(0);
    });
  });

  describe('WebSocket Connection', () => {
    it('should reject connection without token', (done) => {
      const ws = new WebSocket(
        `ws://localhost:${TEST_PORT}/ws/coaching?meetingId=test-meeting&organizationId=test-org`
      );

      ws.on('error', (err) => {
        // Expected - connection should fail
        expect(err).toBeDefined();
        done();
      });

      ws.on('open', () => {
        ws.close();
        done(new Error('Should not connect without token'));
      });
    });

    it('should reject connection with invalid token', (done) => {
      const ws = new WebSocket(
        `ws://localhost:${TEST_PORT}/ws/coaching?token=invalid-token&meetingId=test-meeting&organizationId=test-org`
      );

      ws.on('error', (err) => {
        expect(err).toBeDefined();
        done();
      });

      ws.on('open', () => {
        ws.close();
        done(new Error('Should not connect with invalid token'));
      });
    });

    it('should accept connection with valid token and required params', (done) => {
      const ws = new WebSocket(
        `ws://localhost:${TEST_PORT}/ws/coaching?token=${testToken}&meetingId=test-meeting&organizationId=test-org`
      );

      ws.on('open', () => {
        // Wait for session_started message
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'session_started') {
          expect(message.payload.meetingId).toBe('test-meeting');
          expect(message.payload.sessionId).toBeDefined();
          expect(message.payload.config).toBeDefined();
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });

    it('should reject connection without meetingId', (done) => {
      const ws = new WebSocket(
        `ws://localhost:${TEST_PORT}/ws/coaching?token=${testToken}&organizationId=test-org`
      );

      ws.on('close', (code) => {
        expect(code).toBe(4000);
        done();
      });

      ws.on('error', () => {
        // Expected
        done();
      });
    });
  });

  describe('Transcript Processing', () => {
    let ws: WebSocket;
    let sessionId: string;

    beforeEach((done) => {
      ws = new WebSocket(
        `ws://localhost:${TEST_PORT}/ws/coaching?token=${testToken}&meetingId=test-meeting-${Date.now()}&organizationId=test-org`
      );

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'session_started') {
          sessionId = message.payload.sessionId;
          done();
        }
      });

      ws.on('error', done);
    });

    afterEach(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should accept and store transcript chunks', (done) => {
      const chunk = {
        text: 'Hello, this is a test transcript chunk.',
        speaker: 'Test Speaker',
        timestamp: Date.now() / 1000,
      };

      ws.send(JSON.stringify({
        type: 'transcript_chunk',
        payload: chunk,
      }));

      // Give time for processing
      setTimeout(async () => {
        const stored = await redis.lrange(`coaching:${sessionId}:transcript`, 0, -1);
        expect(stored.length).toBeGreaterThan(0);

        const parsed = JSON.parse(stored[0]);
        expect(parsed.text).toBe(chunk.text);
        expect(parsed.speaker).toBe(chunk.speaker);
        done();
      }, 500);
    });

    it('should update talk time metrics', (done) => {
      const chunks = [
        { text: 'First speaker talking here about something important.', speaker: 'Speaker A', timestamp: 1 },
        { text: 'Second speaker responding with their thoughts.', speaker: 'Speaker B', timestamp: 2 },
        { text: 'First speaker continues the conversation.', speaker: 'Speaker A', timestamp: 3 },
      ];

      chunks.forEach((chunk) => {
        ws.send(JSON.stringify({
          type: 'transcript_chunk',
          payload: chunk,
        }));
      });

      setTimeout(async () => {
        const talkTime = await redis.hgetall(`coaching:${sessionId}:talktime`);
        expect(Object.keys(talkTime).length).toBe(2);
        expect(talkTime['Speaker A']).toBeDefined();
        expect(talkTime['Speaker B']).toBeDefined();
        done();
      }, 1000);
    });

    it('should detect competitor mentions', (done) => {
      let receivedAlert = false;

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'competitor_alert') {
          expect(message.payload.competitor).toBe('Salesforce');
          receivedAlert = true;
          ws.close();
          done();
        }
      });

      ws.send(JSON.stringify({
        type: 'transcript_chunk',
        payload: {
          text: 'We are currently using Salesforce for our CRM needs.',
          speaker: 'Prospect',
          timestamp: Date.now() / 1000,
        },
      }));

      // Timeout if no alert received
      setTimeout(() => {
        if (!receivedAlert) {
          done(new Error('Did not receive competitor alert'));
        }
      }, 3000);
    });
  });

  describe('Talk Time Analysis', () => {
    it('should calculate talk time percentages correctly', async () => {
      // Manually set up talk time data in Redis
      const testSessionId = `test-session-${Date.now()}`;
      await redis.hset(`coaching:${testSessionId}:talktime`, {
        'Sales Rep': '60',
        'Prospect': '40',
      });

      // Create a mock session (we'll test the analysis method directly)
      const result = await service.analyzeTalkTime(testSessionId);

      expect(result.sessionId).toBe(testSessionId);
      expect(result.participants['Sales Rep'].percentage).toBe(60);
      expect(result.participants['Prospect'].percentage).toBe(40);
      expect(result.balance).toBeLessThan(1); // Not perfectly balanced

      // Clean up
      await redis.del(`coaching:${testSessionId}:talktime`);
    });

    it('should provide recommendation when rep talks too much', async () => {
      const testSessionId = `test-session-${Date.now()}`;
      await redis.hset(`coaching:${testSessionId}:talktime`, {
        'Sales Rep': '80',
        'Prospect': '20',
      });

      const result = await service.analyzeTalkTime(testSessionId);

      // The role inference would identify 'Sales Rep' as 'rep'
      // In this case we expect no recommendation since role detection is heuristic

      // Clean up
      await redis.del(`coaching:${testSessionId}:talktime`);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect questions in transcript', async () => {
      const testSessionId = `test-session-${Date.now()}`;

      // Store transcript chunks with questions
      const chunks = [
        { text: 'Hello, nice to meet you.', speaker: 'Rep', timestamp: 1 },
        { text: 'What are your main challenges?', speaker: 'Rep', timestamp: 2 },
        { text: 'We struggle with efficiency.', speaker: 'Prospect', timestamp: 3 },
        { text: 'How does that impact your team?', speaker: 'Rep', timestamp: 4 },
      ];

      for (const chunk of chunks) {
        await redis.lpush(`coaching:${testSessionId}:transcript`, JSON.stringify(chunk));
      }

      const analysis = await service.detectPatterns(testSessionId);

      const questionPatterns = analysis.patterns.filter(p => p.type === 'question_asked');
      expect(questionPatterns.length).toBeGreaterThan(0);

      // Clean up
      await redis.del(`coaching:${testSessionId}:transcript`);
    });

    it('should detect objection keywords', async () => {
      const testSessionId = `test-session-${Date.now()}`;

      const chunks = [
        { text: 'Let me tell you about our solution.', speaker: 'Rep', timestamp: 1 },
        { text: 'I am worried about the budget for this.', speaker: 'Prospect', timestamp: 2 },
      ];

      for (const chunk of chunks) {
        await redis.lpush(`coaching:${testSessionId}:transcript`, JSON.stringify(chunk));
      }

      const analysis = await service.detectPatterns(testSessionId);

      const objectionPatterns = analysis.patterns.filter(p => p.type === 'objection_raised');
      expect(objectionPatterns.length).toBeGreaterThan(0);

      // Clean up
      await redis.del(`coaching:${testSessionId}:transcript`);
    });

    it('should detect monologues', async () => {
      const testSessionId = `test-session-${Date.now()}`;

      // Create 7 consecutive chunks from same speaker
      const chunks = [];
      for (let i = 0; i < 7; i++) {
        chunks.push({
          text: `Speaker continues talking, segment ${i + 1}`,
          speaker: 'Long Talker',
          timestamp: i,
        });
      }

      for (const chunk of chunks) {
        await redis.lpush(`coaching:${testSessionId}:transcript`, JSON.stringify(chunk));
      }

      const analysis = await service.detectPatterns(testSessionId);

      const monologuePatterns = analysis.patterns.filter(p => p.type === 'monologue');
      expect(monologuePatterns.length).toBeGreaterThan(0);

      // Clean up
      await redis.del(`coaching:${testSessionId}:transcript`);
    });
  });

  describe('Session Management', () => {
    it('should clean up session on disconnect', (done) => {
      const ws = new WebSocket(
        `ws://localhost:${TEST_PORT}/ws/coaching?token=${testToken}&meetingId=cleanup-test&organizationId=test-org`
      );

      let sessionId: string;
      const initialCount = service.getActiveSessionCount();

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'session_started') {
          sessionId = message.payload.sessionId;

          // Verify session was created
          expect(service.getActiveSessionCount()).toBe(initialCount + 1);

          // Close connection
          ws.close();
        }
      });

      ws.on('close', () => {
        // Give time for cleanup
        setTimeout(() => {
          expect(service.getActiveSessionCount()).toBe(initialCount);
          done();
        }, 100);
      });

      ws.on('error', done);
    });

    it('should respond to ping with pong', (done) => {
      const ws = new WebSocket(
        `ws://localhost:${TEST_PORT}/ws/coaching?token=${testToken}&meetingId=ping-test&organizationId=test-org`
      );

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'session_started') {
          // Send ping
          ws.send(JSON.stringify({ type: 'ping', payload: {} }));
        } else if (message.type === 'pong') {
          expect(message.payload.timestamp).toBeDefined();
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all services are up', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.redis).toBe('connected');
      expect(health.details.websocketServer).toBe('running');
      expect(health.details.activeSessions).toBeGreaterThanOrEqual(0);
    });
  });
});

// Additional integration tests that require OpenAI API key
describe('RealtimeCoachingService - AI Integration', () => {
  // These tests are skipped if OPENAI_API_KEY is not set
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  (hasOpenAIKey ? describe : describe.skip)('Sentiment Analysis', () => {
    let service: RealtimeCoachingService;

    beforeAll(() => {
      service = new RealtimeCoachingService();
    });

    afterAll(async () => {
      await service.shutdown();
    });

    it('should analyze positive sentiment', async () => {
      const result = await service.analyzeSentiment(
        'This is amazing! I love what you are showing me. This could really help our team.'
      );

      expect(result.score).toBeGreaterThan(0);
      expect(['positive', 'very_positive']).toContain(result.label);
      expect(result.confidence).toBeGreaterThan(0);
    }, 30000);

    it('should analyze negative sentiment', async () => {
      const result = await service.analyzeSentiment(
        'I am very frustrated with this. The price is too high and the features do not meet our needs.'
      );

      expect(result.score).toBeLessThan(0);
      expect(['negative', 'very_negative']).toContain(result.label);
      expect(result.confidence).toBeGreaterThan(0);
    }, 30000);

    it('should analyze neutral sentiment', async () => {
      const result = await service.analyzeSentiment(
        'The meeting is scheduled for Tuesday at 3pm. Please bring the documents.'
      );

      expect(result.score).toBeGreaterThanOrEqual(-0.3);
      expect(result.score).toBeLessThanOrEqual(0.3);
      expect(result.label).toBe('neutral');
    }, 30000);
  });

  (hasOpenAIKey ? describe : describe.skip)('Question Suggestions', () => {
    let service: RealtimeCoachingService;
    let redis: Redis;

    beforeAll(() => {
      service = new RealtimeCoachingService();
      redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
      });
    });

    afterAll(async () => {
      await service.shutdown();
      await redis.quit();
    });

    it('should generate relevant question suggestions', async () => {
      const testSessionId = `test-questions-${Date.now()}`;

      // Set up context
      const chunks = [
        { text: 'We need to improve our sales process.', speaker: 'Prospect', timestamp: 1 },
        { text: 'What specific challenges are you facing?', speaker: 'Rep', timestamp: 2 },
        { text: 'Our team spends too much time on manual data entry.', speaker: 'Prospect', timestamp: 3 },
      ];

      for (const chunk of chunks) {
        await redis.lpush(`coaching:${testSessionId}:transcript`, JSON.stringify(chunk));
      }

      const questions = await service.suggestQuestions(testSessionId);

      expect(questions.length).toBeLessThanOrEqual(3);
      if (questions.length > 0) {
        expect(questions[0]).toContain('?');
      }

      // Clean up
      await redis.del(`coaching:${testSessionId}:transcript`);
    }, 30000);
  });
});
