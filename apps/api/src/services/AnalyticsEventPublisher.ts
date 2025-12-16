/**
 * Analytics Event Publisher - Enterprise-Grade Real-time Analytics Streaming
 *
 * Publishes analytics events to Redis pub/sub for real-time dashboard updates.
 * Supports multi-tenant isolation with organization-scoped channels.
 *
 * Features:
 * - Redis pub/sub for event distribution
 * - Organization-level channel isolation (multi-tenant)
 * - Event type categorization
 * - Automatic event enrichment with timestamps
 * - Super admin global channel
 */

import Redis from 'ioredis';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'analytics-event-publisher' },
  transports: [new winston.transports.Console()],
});

// Channel naming conventions
const CHANNELS = {
  // Organization-specific channel
  organization: (orgId: string) => `analytics:${orgId}`,
  // Global channel for super admins
  global: 'analytics:global',
};

// Event types
export type AnalyticsEventType =
  | 'meeting:started'
  | 'meeting:ended'
  | 'meeting:participant_joined'
  | 'meeting:participant_left'
  | 'transcription:started'
  | 'transcription:progress'
  | 'transcription:completed'
  | 'transcription:failed'
  | 'ai:processing_started'
  | 'ai:processing_completed'
  | 'ai:insight_generated'
  | 'user:login'
  | 'user:logout'
  | 'user:activity'
  | 'api:request'
  | 'api:error'
  | 'integration:sync_started'
  | 'integration:sync_completed'
  | 'integration:error'
  | 'billing:payment_received'
  | 'billing:subscription_changed'
  | 'alert:triggered'
  | 'system:health_change';

// Base event interface
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  organizationId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    source?: string;
  };
}

// Meeting events
export interface MeetingStartedEvent {
  meetingId: string;
  title: string;
  participantCount: number;
  scheduledDuration?: number;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

export interface MeetingEndedEvent {
  meetingId: string;
  duration: number;
  participantCount: number;
  transcriptionStatus: string;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

// Transcription events
export interface TranscriptionProgressEvent {
  meetingId: string;
  progress: number;
  stage: 'uploading' | 'processing' | 'transcribing' | 'analyzing';
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

// AI events
export interface AIInsightEvent {
  meetingId: string;
  insightType: string;
  summary?: string;
  actionItemCount?: number;
  sentiment?: string;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

// User activity event
export interface UserActivityEvent {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

class AnalyticsEventPublisher {
  private redis: Redis;
  private eventCounter = 0;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    this.eventCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.eventCounter.toString(36).padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 6);
    return `evt_${timestamp}_${counter}_${random}`;
  }

  /**
   * Publish event to organization channel
   */
  async publish(
    organizationId: string,
    type: AnalyticsEventType,
    data: Record<string, unknown>,
    metadata?: AnalyticsEvent['metadata']
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      organizationId,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    // Publish to organization channel
    const orgChannel = CHANNELS.organization(organizationId);
    await this.redis.publish(orgChannel, JSON.stringify(event));

    // Also publish to global channel (for super admins)
    await this.redis.publish(CHANNELS.global, JSON.stringify(event));

    logger.debug('Analytics event published', {
      eventId: event.id,
      type,
      organizationId,
      channel: orgChannel,
    });
  }

  /**
   * Meeting started event
   */
  async publishMeetingStarted(
    organizationId: string,
    data: MeetingStartedEvent,
    userId?: string
  ): Promise<void> {
    await this.publish(organizationId, 'meeting:started', data, { userId });
  }

  /**
   * Meeting ended event
   */
  async publishMeetingEnded(
    organizationId: string,
    data: MeetingEndedEvent,
    userId?: string
  ): Promise<void> {
    await this.publish(organizationId, 'meeting:ended', data, { userId });
  }

  /**
   * Participant joined event
   */
  async publishParticipantJoined(
    organizationId: string,
    meetingId: string,
    participantName: string,
    participantCount: number
  ): Promise<void> {
    await this.publish(organizationId, 'meeting:participant_joined', {
      meetingId,
      participantName,
      participantCount,
    });
  }

  /**
   * Participant left event
   */
  async publishParticipantLeft(
    organizationId: string,
    meetingId: string,
    participantName: string,
    participantCount: number
  ): Promise<void> {
    await this.publish(organizationId, 'meeting:participant_left', {
      meetingId,
      participantName,
      participantCount,
    });
  }

  /**
   * Transcription progress event
   */
  async publishTranscriptionProgress(
    organizationId: string,
    data: TranscriptionProgressEvent
  ): Promise<void> {
    await this.publish(organizationId, 'transcription:progress', data);
  }

  /**
   * Transcription completed event
   */
  async publishTranscriptionCompleted(
    organizationId: string,
    meetingId: string,
    wordCount: number,
    duration: number
  ): Promise<void> {
    await this.publish(organizationId, 'transcription:completed', {
      meetingId,
      wordCount,
      duration,
    });
  }

  /**
   * Transcription failed event
   */
  async publishTranscriptionFailed(
    organizationId: string,
    meetingId: string,
    error: string
  ): Promise<void> {
    await this.publish(organizationId, 'transcription:failed', {
      meetingId,
      error,
    });
  }

  /**
   * AI processing started event
   */
  async publishAIProcessingStarted(
    organizationId: string,
    meetingId: string,
    processingType: string
  ): Promise<void> {
    await this.publish(organizationId, 'ai:processing_started', {
      meetingId,
      processingType,
    });
  }

  /**
   * AI processing completed event
   */
  async publishAIProcessingCompleted(
    organizationId: string,
    meetingId: string,
    processingType: string,
    tokensUsed?: number
  ): Promise<void> {
    await this.publish(organizationId, 'ai:processing_completed', {
      meetingId,
      processingType,
      tokensUsed,
    });
  }

  /**
   * AI insight generated event
   */
  async publishAIInsight(
    organizationId: string,
    data: AIInsightEvent
  ): Promise<void> {
    await this.publish(organizationId, 'ai:insight_generated', data);
  }

  /**
   * User activity event
   */
  async publishUserActivity(
    organizationId: string,
    data: UserActivityEvent
  ): Promise<void> {
    await this.publish(organizationId, 'user:activity', data, {
      userId: data.userId,
    });
  }

  /**
   * User login event
   */
  async publishUserLogin(
    organizationId: string,
    userId: string,
    method: string
  ): Promise<void> {
    await this.publish(
      organizationId,
      'user:login',
      { method },
      { userId }
    );
  }

  /**
   * User logout event
   */
  async publishUserLogout(
    organizationId: string,
    userId: string
  ): Promise<void> {
    await this.publish(organizationId, 'user:logout', {}, { userId });
  }

  /**
   * API request event (for monitoring)
   */
  async publishAPIRequest(
    organizationId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    latencyMs: number,
    userId?: string
  ): Promise<void> {
    await this.publish(
      organizationId,
      'api:request',
      {
        endpoint,
        method,
        statusCode,
        latencyMs,
      },
      { userId }
    );
  }

  /**
   * API error event
   */
  async publishAPIError(
    organizationId: string,
    endpoint: string,
    method: string,
    error: string,
    statusCode: number,
    userId?: string
  ): Promise<void> {
    await this.publish(
      organizationId,
      'api:error',
      {
        endpoint,
        method,
        error,
        statusCode,
      },
      { userId }
    );
  }

  /**
   * Integration sync started event
   */
  async publishIntegrationSyncStarted(
    organizationId: string,
    integrationType: string,
    integrationId: string
  ): Promise<void> {
    await this.publish(organizationId, 'integration:sync_started', {
      integrationType,
      integrationId,
    });
  }

  /**
   * Integration sync completed event
   */
  async publishIntegrationSyncCompleted(
    organizationId: string,
    integrationType: string,
    integrationId: string,
    recordsProcessed: number
  ): Promise<void> {
    await this.publish(organizationId, 'integration:sync_completed', {
      integrationType,
      integrationId,
      recordsProcessed,
    });
  }

  /**
   * Integration error event
   */
  async publishIntegrationError(
    organizationId: string,
    integrationType: string,
    integrationId: string,
    error: string
  ): Promise<void> {
    await this.publish(organizationId, 'integration:error', {
      integrationType,
      integrationId,
      error,
    });
  }

  /**
   * Billing payment received event
   */
  async publishPaymentReceived(
    organizationId: string,
    amount: number,
    currency: string,
    paymentId: string
  ): Promise<void> {
    await this.publish(organizationId, 'billing:payment_received', {
      amount,
      currency,
      paymentId,
    });
  }

  /**
   * Subscription changed event
   */
  async publishSubscriptionChanged(
    organizationId: string,
    previousTier: string,
    newTier: string,
    changeType: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate'
  ): Promise<void> {
    await this.publish(organizationId, 'billing:subscription_changed', {
      previousTier,
      newTier,
      changeType,
    });
  }

  /**
   * Alert triggered event
   */
  async publishAlertTriggered(
    organizationId: string,
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(organizationId, 'alert:triggered', {
      alertType,
      severity,
      message,
      details,
    });
  }

  /**
   * System health change event (super admin)
   */
  async publishSystemHealthChange(
    service: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    details?: Record<string, unknown>
  ): Promise<void> {
    // Publish to global channel only (system-wide event)
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: 'system:health_change',
      organizationId: 'system',
      timestamp: new Date().toISOString(),
      data: {
        service,
        status,
        details,
      },
    };

    await this.redis.publish(CHANNELS.global, JSON.stringify(event));

    logger.debug('System health event published', {
      eventId: event.id,
      service,
      status,
    });
  }

  /**
   * Get channel name for organization
   */
  getOrganizationChannel(organizationId: string): string {
    return CHANNELS.organization(organizationId);
  }

  /**
   * Get global channel name
   */
  getGlobalChannel(): string {
    return CHANNELS.global;
  }
}

// Singleton instance
let analyticsEventPublisherInstance: AnalyticsEventPublisher | null = null;

export function getAnalyticsEventPublisher(redis: Redis): AnalyticsEventPublisher {
  if (!analyticsEventPublisherInstance) {
    analyticsEventPublisherInstance = new AnalyticsEventPublisher(redis);
  }
  return analyticsEventPublisherInstance;
}

export { AnalyticsEventPublisher };
export default AnalyticsEventPublisher;
