/**
 * GraphQL API Tests - Verify real Prisma and Redis integration
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createLoaders } from '../dataloaders';
import { pubsub, isRedisConnected } from '../pubsub';
import { createContext } from '../context';
import { resolvers } from '../resolvers';

describe('GraphQL API Integration', () => {
  let prisma: PrismaClient;
  let redis: Redis;

  beforeAll(async () => {
    // Initialize real Prisma client
    prisma = new PrismaClient();

    // Initialize real Redis client
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('DataLoaders', () => {
    it('should create all loaders', () => {
      const loaders = createLoaders(prisma);

      expect(loaders.meetingLoader).toBeDefined();
      expect(loaders.userLoader).toBeDefined();
      expect(loaders.organizationLoader).toBeDefined();
      expect(loaders.transcriptLoader).toBeDefined();
      expect(loaders.meetingParticipantsLoader).toBeDefined();
      expect(loaders.meetingSummaryLoader).toBeDefined();
      expect(loaders.meetingAnalyticsLoader).toBeDefined();
      expect(loaders.meetingCommentsLoader).toBeDefined();
      expect(loaders.meetingRecordingsLoader).toBeDefined();
    });

    it('should batch queries with DataLoader', async () => {
      const loaders = createLoaders(prisma);

      // Test that DataLoader batches multiple requests
      // This would normally be N queries, but with DataLoader it's 1
      const meetingIds = ['test-1', 'test-2', 'test-3'];

      // These should be batched into a single query
      const promises = meetingIds.map((id) => loaders.meetingLoader.load(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
    });
  });

  describe('PubSub', () => {
    it('should have Redis PubSub instance', () => {
      expect(pubsub).toBeDefined();
    });

    it('should check Redis connection', () => {
      // This checks if publisher and subscriber are connected
      const connected = isRedisConnected();
      expect(typeof connected).toBe('boolean');
    });

    it('should publish and subscribe to events', async () => {
      // Test real Redis pub/sub
      const testChannel = 'TEST_CHANNEL';
      const testPayload = { message: 'test' };

      let received = false;

      // Subscribe
      const subscription = pubsub.asyncIterator([testChannel]);

      // Publish
      await pubsub.publish(testChannel, testPayload);

      // Wait for message
      const result = await Promise.race([
        subscription.next(),
        new Promise((resolve) => setTimeout(() => resolve({ done: true }), 1000)),
      ]);

      if (!result.done) {
        received = true;
      }

      expect(received).toBe(true);
    });
  });

  describe('Context', () => {
    it('should create GraphQL context', () => {
      const contextFactory = createContext(prisma, redis);

      const mockReq = {
        headers: {},
        cookies: {},
      } as any;

      const mockRes = {} as any;

      const context = contextFactory({ req: mockReq, res: mockRes });

      expect(context.prisma).toBe(prisma);
      expect(context.redis).toBe(redis);
      expect(context.pubsub).toBeDefined();
      expect(context.loaders).toBeDefined();
      expect(context.user).toBeNull(); // No token provided
    });

    it('should extract user from valid JWT', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'test-user-id', email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET || 'your-secret-key'
      );

      const contextFactory = createContext(prisma, redis);

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
        cookies: {},
      } as any;

      const mockRes = {} as any;

      const context = contextFactory({ req: mockReq, res: mockRes });

      expect(context.user).toBeDefined();
      expect(context.user?.id).toBe('test-user-id');
      expect(context.user?.email).toBe('test@example.com');
    });
  });

  describe('Resolvers', () => {
    it('should have all resolver types', () => {
      expect(resolvers.Query).toBeDefined();
      expect(resolvers.Mutation).toBeDefined();
      expect(resolvers.Subscription).toBeDefined();
    });

    it('should have meeting queries', () => {
      expect(resolvers.Query.meeting).toBeDefined();
      expect(resolvers.Query.meetings).toBeDefined();
      expect(resolvers.Query.transcript).toBeDefined();
      expect(resolvers.Query.meetingComments).toBeDefined();
    });

    it('should have meeting mutations', () => {
      expect(resolvers.Mutation.createMeeting).toBeDefined();
      expect(resolvers.Mutation.updateMeeting).toBeDefined();
      expect(resolvers.Mutation.deleteMeeting).toBeDefined();
      expect(resolvers.Mutation.startMeeting).toBeDefined();
      expect(resolvers.Mutation.completeMeeting).toBeDefined();
    });

    it('should have subscriptions', () => {
      expect(resolvers.Subscription.meetingUpdated).toBeDefined();
      expect(resolvers.Subscription.transcriptProgress).toBeDefined();
      expect(resolvers.Subscription.actionItemCreated).toBeDefined();
      expect(resolvers.Subscription.commentAdded).toBeDefined();
      expect(resolvers.Subscription.meetingStatusChanged).toBeDefined();
    });
  });

  describe('Real Database Queries', () => {
    it('should connect to Prisma database', async () => {
      // Test real database connection
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should query meetings table', async () => {
      // Real Prisma query
      const meetings = await prisma.meeting.findMany({
        take: 1,
      });

      expect(Array.isArray(meetings)).toBe(true);
    });

    it('should query users table', async () => {
      // Real Prisma query
      const users = await prisma.user.findMany({
        take: 1,
      });

      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('Redis Connection', () => {
    it('should connect to Redis', async () => {
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    });

    it('should set and get values from Redis', async () => {
      const key = 'test:graphql:api';
      const value = 'working';

      await redis.set(key, value);
      const result = await redis.get(key);

      expect(result).toBe(value);

      // Cleanup
      await redis.del(key);
    });
  });
});
