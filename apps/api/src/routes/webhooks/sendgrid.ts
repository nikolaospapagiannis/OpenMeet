/**
 * SendGrid Webhook Handler
 * Processes email delivery events from SendGrid
 */

import { Request, Response } from 'express';
import winston from 'winston';
import crypto from 'crypto';
import { emailService } from '../../services/email';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'sendgrid-webhook' },
  transports: [new winston.transports.Console()],
});

/**
 * Verify SendGrid webhook signature
 */
function verifyWebhookSignature(
  publicKey: string,
  payload: string | Buffer,
  signature: string,
  timestamp: string
): boolean {
  try {
    const timestampPayload = timestamp + payload;
    const encoded = crypto
      .createHmac('sha256', publicKey)
      .update(timestampPayload)
      .digest('base64');

    return encoded === signature;
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Handle SendGrid webhook events
 */
export async function handleSendGridWebhook(req: Request, res: Response) {
  try {
    // Verify webhook signature if configured
    const webhookKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

    if (webhookKey) {
      const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

      if (!signature || !timestamp) {
        logger.warn('Missing webhook signature or timestamp');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const isValid = verifyWebhookSignature(
        webhookKey,
        JSON.stringify(req.body),
        signature,
        timestamp
      );

      if (!isValid) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Check timestamp to prevent replay attacks (within 5 minutes)
      const currentTime = Date.now();
      const webhookTime = parseInt(timestamp) * 1000;

      if (Math.abs(currentTime - webhookTime) > 300000) {
        logger.warn('Webhook timestamp too old');
        return res.status(401).json({ error: 'Timestamp expired' });
      }
    }

    // Process events
    const events = Array.isArray(req.body) ? req.body : [req.body];

    logger.info('Processing SendGrid webhook events', {
      eventCount: events.length,
    });

    // Process each event asynchronously
    const processingPromises = events.map(async (event) => {
      try {
        await emailService.processWebhookEvent(event);
      } catch (error) {
        logger.error('Failed to process webhook event', {
          event,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Wait for all events to be processed
    await Promise.all(processingPromises);

    // Respond immediately to SendGrid
    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(req: Request, res: Response) {
  try {
    const { organizationId } = req.query;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await emailService.getEmailStatistics(
      organizationId as string,
      startDate,
      endDate
    );

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get webhook stats:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    const health = await emailService.healthCheck();

    const isHealthy = health.sendgrid && health.database && health.redis;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      services: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}