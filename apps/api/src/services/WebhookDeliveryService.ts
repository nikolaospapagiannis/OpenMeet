/**
 * Webhook Delivery Service
 *
 * Real webhook delivery implementation with:
 * - Queue-based delivery (using Bull/Redis)
 * - HMAC-SHA256 signature verification
 * - Exponential backoff retry (3 retries)
 * - Delivery logs and status tracking
 * - Webhook event filtering
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// Initialize Redis for Bull queue
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

interface WebhookEvent {
  event: string;
  data: any;
  organizationId: string;
  timestamp: string;
}

interface WebhookDeliveryJob {
  webhookId: string;
  event: WebhookEvent;
  attempt: number;
}

class WebhookDeliveryService {
  private queue: Queue<WebhookDeliveryJob>;

  constructor() {
    // Create Bull queue for webhook delivery
    this.queue = new Bull<WebhookDeliveryJob>('webhook-delivery', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: 100, // Keep last 100 completed
        removeOnFail: 500, // Keep last 500 failed
      },
    });

    // Process webhook delivery jobs
    this.queue.process(10, this.processWebhookDelivery.bind(this));

    // Event handlers
    this.queue.on('completed', (job) => {
      logger.info('Webhook delivered successfully', {
        jobId: job.id,
        webhookId: job.data.webhookId,
        event: job.data.event.event,
      });
    });

    this.queue.on('failed', (job, err) => {
      logger.error('Webhook delivery failed', {
        jobId: job?.id,
        webhookId: job?.data.webhookId,
        event: job?.data.event.event,
        error: err.message,
        attempts: job?.attemptsMade,
      });
    });

    logger.info('WebhookDeliveryService initialized');
  }

  /**
   * Queue webhook event for delivery
   */
  async queueEvent(
    event: string,
    data: any,
    organizationId: string
  ): Promise<void> {
    try {
      // Find all active webhooks for this organization
      const webhooks = await prisma.webhook.findMany({
        where: {
          organizationId,
          isActive: true,
        },
      });

      if (webhooks.length === 0) {
        logger.debug('No active webhooks for organization', { organizationId, event });
        return;
      }

      const webhookEvent: WebhookEvent = {
        event,
        data,
        organizationId,
        timestamp: new Date().toISOString(),
      };

      // Filter webhooks by subscribed events
      const relevantWebhooks = webhooks.filter(webhook => {
        const events = (webhook.events as string[]) || [];
        return events.includes(event) || events.includes('*');
      });

      logger.info('Queueing webhook event', {
        event,
        organizationId,
        webhookCount: relevantWebhooks.length,
      });

      // Queue delivery for each webhook
      for (const webhook of relevantWebhooks) {
        await this.queue.add({
          webhookId: webhook.id,
          event: webhookEvent,
          attempt: 0,
        });
      }
    } catch (error) {
      logger.error('Error queueing webhook event', { error, event, organizationId });
    }
  }

  /**
   * Process webhook delivery job
   */
  private async processWebhookDelivery(
    job: Job<WebhookDeliveryJob>
  ): Promise<void> {
    const { webhookId, event, attempt } = job.data;

    try {
      // Get webhook configuration
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook || !webhook.isActive) {
        logger.warn('Webhook not found or inactive', { webhookId });
        return;
      }

      // Generate HMAC-SHA256 signature
      const signature = this.generateSignature(event, webhook.secret);

      // Prepare payload
      const payload = {
        id: crypto.randomUUID(),
        event: event.event,
        data: event.data,
        organizationId: event.organizationId,
        timestamp: event.timestamp,
        webhookId: webhook.id,
      };

      // Send webhook
      const startTime = Date.now();
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Event': event.event,
          'User-Agent': 'OpenMeet-AI-Webhook/1.0',
        },
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const responseTime = Date.now() - startTime;

      // Log successful delivery
      await this.logDelivery({
        webhookId,
        event: event.event,
        payload,
        statusCode: response.status,
        responseTime,
        success: true,
        attempt: job.attemptsMade + 1,
      });

      // Update webhook last triggered
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          metadata: {
            ...((webhook.metadata as any) || {}),
            lastSuccessAt: new Date().toISOString(),
            successCount: (((webhook.metadata as any)?.successCount) || 0) + 1,
          } as any,
        },
      });

      logger.info('Webhook delivered', {
        webhookId,
        event: event.event,
        statusCode: response.status,
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      const errorMessage = axiosError.message;

      // Log failed delivery
      await this.logDelivery({
        webhookId,
        event: event.event,
        payload: event,
        statusCode,
        responseTime: 0,
        success: false,
        error: errorMessage,
        attempt: job.attemptsMade + 1,
      });

      // Update webhook metadata
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
      });

      if (webhook) {
        await prisma.webhook.update({
          where: { id: webhookId },
          data: {
            metadata: {
              ...((webhook.metadata as any) || {}),
              lastFailureAt: new Date().toISOString(),
              failureCount: (((webhook.metadata as any)?.failureCount) || 0) + 1,
            } as any,
          },
        });
      }

      logger.error('Webhook delivery failed', {
        webhookId,
        event: event.event,
        error: errorMessage,
        statusCode,
        attempt: job.attemptsMade + 1,
      });

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  private generateSignature(event: WebhookEvent, secret: string): string {
    const payload = JSON.stringify(event);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(
      JSON.parse(payload) as WebhookEvent,
      secret
    );
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Log webhook delivery attempt
   */
  private async logDelivery(log: {
    webhookId: string;
    event: string;
    payload: any;
    statusCode?: number;
    responseTime: number;
    success: boolean;
    error?: string;
    attempt: number;
  }): Promise<void> {
    try {
      await prisma.webhookLog.create({
        data: {
          webhookId: log.webhookId,
          event: log.event,
          payload: log.payload as any,
          statusCode: log.statusCode,
          responseTime: log.responseTime,
          success: log.success,
          error: log.error,
          attempt: log.attempt,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error logging webhook delivery', { error, webhookId: log.webhookId });
    }
  }

  /**
   * Get webhook delivery logs
   */
  async getDeliveryLogs(
    webhookId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const logs = await prisma.webhookLog.findMany({
        where: { webhookId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error('Error getting webhook logs', { error, webhookId });
      return [];
    }
  }

  /**
   * Test webhook by sending test event
   */
  async testWebhook(webhookId: string): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook) {
        return { success: false, error: 'Webhook not found' };
      }

      const testEvent: WebhookEvent = {
        event: 'webhook.test',
        data: {
          message: 'This is a test webhook event',
          webhookId: webhook.id,
        },
        organizationId: webhook.organizationId,
        timestamp: new Date().toISOString(),
      };

      const signature = this.generateSignature(testEvent, webhook.secret);

      const startTime = Date.now();
      const response = await axios.post(webhook.url, testEvent, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Event': 'webhook.test',
          'User-Agent': 'OpenMeet-AI-Webhook/1.0',
        },
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status
      });

      const responseTime = Date.now() - startTime;

      await this.logDelivery({
        webhookId,
        event: 'webhook.test',
        payload: testEvent,
        statusCode: response.status,
        responseTime,
        success: response.status >= 200 && response.status < 300,
        attempt: 1,
      });

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        responseTime,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.message;
      const statusCode = axiosError.response?.status;

      await this.logDelivery({
        webhookId,
        event: 'webhook.test',
        payload: {},
        statusCode,
        responseTime: 0,
        success: false,
        error: errorMessage,
        attempt: 1,
      });

      return {
        success: false,
        statusCode,
        error: errorMessage,
      };
    }
  }

  /**
   * Get webhook delivery statistics
   */
  async getDeliveryStats(
    webhookId: string,
    days: number = 7
  ): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const logs = await prisma.webhookLog.findMany({
        where: {
          webhookId,
          timestamp: { gte: since },
        },
      });

      const totalDeliveries = logs.length;
      const successfulDeliveries = logs.filter(l => l.success).length;
      const failedDeliveries = totalDeliveries - successfulDeliveries;
      const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

      const responseTimes = logs.filter(l => l.success && l.responseTime > 0).map(l => l.responseTime);
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      return {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
        averageResponseTime,
      };
    } catch (error) {
      logger.error('Error getting webhook stats', { error, webhookId });
      return {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        successRate: 0,
        averageResponseTime: 0,
      };
    }
  }
}

export const webhookDeliveryService = new WebhookDeliveryService();
