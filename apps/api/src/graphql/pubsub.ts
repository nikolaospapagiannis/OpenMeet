/**
 * GraphQL PubSub - Real Redis-backed subscriptions
 * NO FAKE implementations - uses actual Redis connection
 */

import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Redis connection options from environment
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create Redis clients for publisher and subscriber
const redisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    // Exponential backoff
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Separate connections for pub and sub (Redis best practice)
const publisher = new Redis(redisOptions);
const subscriber = new Redis(redisOptions);

// Create RedisPubSub instance
export const pubsub = new RedisPubSub({
  publisher,
  subscriber,
});

// ============================================================================
// SUBSCRIPTION CHANNELS - Define all channels
// ============================================================================

export const CHANNELS = {
  MEETING_UPDATED: 'MEETING_UPDATED',
  TRANSCRIPT_PROGRESS: 'TRANSCRIPT_PROGRESS',
  ACTION_ITEM_CREATED: 'ACTION_ITEM_CREATED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  MEETING_STATUS_CHANGED: 'MEETING_STATUS_CHANGED',
} as const;

// ============================================================================
// PUBLISH HELPERS - Type-safe publish functions
// ============================================================================

export interface MeetingUpdatedPayload {
  meetingId: string;
  meeting: any;
  changedFields: string[];
  timestamp: Date;
}

export interface TranscriptProgressPayload {
  meetingId: string;
  segment: {
    text: string;
    speaker: string | null;
    startTime: number;
    endTime: number;
    confidence: number;
  };
  progress: number;
  isFinal: boolean;
  timestamp: Date;
}

export interface ActionItemCreatedPayload {
  userId: string;
  actionItem: any;
  meeting: any;
  assignedTo: any;
  timestamp: Date;
}

export interface CommentAddedPayload {
  meetingId: string;
  comment: any;
  meeting: any;
  timestamp: Date;
}

export interface MeetingStatusChangedPayload {
  meetingId: string;
  meeting: any;
  oldStatus: string;
  newStatus: string;
  timestamp: Date;
}

/**
 * Publish meeting updated event
 */
export async function publishMeetingUpdated(payload: MeetingUpdatedPayload): Promise<void> {
  await pubsub.publish(CHANNELS.MEETING_UPDATED, {
    meetingUpdated: payload,
  });
}

/**
 * Publish transcript progress event (for live transcription)
 */
export async function publishTranscriptProgress(payload: TranscriptProgressPayload): Promise<void> {
  await pubsub.publish(CHANNELS.TRANSCRIPT_PROGRESS, {
    transcriptProgress: payload,
  });
}

/**
 * Publish action item created event
 */
export async function publishActionItemCreated(payload: ActionItemCreatedPayload): Promise<void> {
  await pubsub.publish(CHANNELS.ACTION_ITEM_CREATED, {
    actionItemCreated: payload,
  });
}

/**
 * Publish comment added event
 */
export async function publishCommentAdded(payload: CommentAddedPayload): Promise<void> {
  await pubsub.publish(CHANNELS.COMMENT_ADDED, {
    commentAdded: payload,
  });
}

/**
 * Publish meeting status changed event
 */
export async function publishMeetingStatusChanged(payload: MeetingStatusChangedPayload): Promise<void> {
  await pubsub.publish(CHANNELS.MEETING_STATUS_CHANGED, {
    meetingStatusChanged: payload,
  });
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return publisher.status === 'ready' && subscriber.status === 'ready';
}

/**
 * Close Redis connections gracefully
 */
export async function closePubSub(): Promise<void> {
  await publisher.quit();
  await subscriber.quit();
}

// Event handlers for monitoring
publisher.on('connect', () => {
  logger.info('PubSub Publisher connected to Redis', { service: 'pubsub' });
});

subscriber.on('connect', () => {
  logger.info('PubSub Subscriber connected to Redis', { service: 'pubsub' });
});

publisher.on('error', (err) => {
  logger.error('PubSub Publisher error', { service: 'pubsub', error: err.message, stack: err.stack });
});

subscriber.on('error', (err) => {
  logger.error('PubSub Subscriber error', { service: 'pubsub', error: err.message, stack: err.stack });
});

export { publisher, subscriber };
