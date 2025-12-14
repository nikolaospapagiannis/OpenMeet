/**
 * Webhooks Routes
 * Webhook subscription management and event delivery
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import crypto from 'crypto';
import axios from 'axios';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'webhooks-routes' },
  transports: [new winston.transports.Console()],
});

router.use(authMiddleware);

// Available webhook events
const WEBHOOK_EVENTS = [
  'meeting.created',
  'meeting.updated',
  'meeting.deleted',
  'meeting.started',
  'meeting.completed',
  'transcript.created',
  'transcript.updated',
  'summary.created',
  'comment.created',
  'integration.connected',
  'integration.disconnected',
  'user.invited',
  'user.removed',
];

/**
 * GET /api/webhooks
 * List webhooks for organization
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user.organizationId;

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // Remove secrets from response
    const sanitized = webhooks.map((wh) => ({
      ...wh,
      secret: undefined,
    }));

    res.json({ data: sanitized });
  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * GET /api/webhooks/:id
 * Get webhook details
 */
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const webhook = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });

      if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      // Remove secret
      const sanitized = { ...webhook, secret: undefined };

      res.json(sanitized);
    } catch (error) {
      logger.error('Error fetching webhook:', error);
      res.status(500).json({ error: 'Failed to fetch webhook' });
    }
  }
);

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post(
  '/',
  [
    body('url').isURL(),
    body('events').isArray().notEmpty(),
    body('events.*').isIn(WEBHOOK_EVENTS),
    body('secret').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { url, events, secret } = req.body;

      // Generate secret if not provided
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

      const webhook = await prisma.webhook.create({
        data: {
          url,
          events,
          secret: webhookSecret,
          isActive: true,
          organizationId,
        },
      });

      logger.info('Webhook created:', { webhookId: webhook.id, organizationId });

      // Return secret only on creation
      res.status(201).json({
        ...webhook,
        secret: webhookSecret, // Show secret only once
      });
    } catch (error) {
      logger.error('Error creating webhook:', error);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  }
);

/**
 * PATCH /api/webhooks/:id
 * Update webhook
 */
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('url').optional().isURL(),
    body('events').optional().isArray(),
    body('events.*').optional().isIn(WEBHOOK_EVENTS),
    body('isActive').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const webhook = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });

      if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const updated = await prisma.webhook.update({
        where: { id },
        data: req.body,
      });

      logger.info('Webhook updated:', { webhookId: id, organizationId });

      const sanitized = { ...updated, secret: undefined };
      res.json(sanitized);
    } catch (error) {
      logger.error('Error updating webhook:', error);
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  }
);

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const webhook = await prisma.webhook.deleteMany({
        where: { id, organizationId },
      });

      if (webhook.count === 0) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      logger.info('Webhook deleted:', { webhookId: id, organizationId });
      res.json({ message: 'Webhook deleted successfully' });
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }
);

/**
 * POST /api/webhooks/:id/test
 * Test webhook delivery
 */
router.post(
  '/:id/test',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const webhook = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });

      if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      // Send test payload
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook delivery',
          webhookId: webhook.id,
          organizationId,
        },
      };

      const signature = generateSignature(testPayload, webhook.secret!);

      try {
        const response = await axios.post(webhook.url, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-ID': webhook.id,
          },
          timeout: 10000,
        });

        logger.info('Test webhook delivered:', { webhookId: id, status: response.status });

        res.json({
          success: true,
          status: response.status,
          message: 'Test webhook delivered successfully',
        });
      } catch (error: any) {
        logger.error('Test webhook failed:', error);

        // Increment failure count
        await prisma.webhook.update({
          where: { id },
          data: { failureCount: { increment: 1 } },
        });

        res.status(400).json({
          success: false,
          error: error.response?.data || error.message,
          message: 'Test webhook delivery failed',
        });
      }
    } catch (error) {
      logger.error('Error testing webhook:', error);
      res.status(500).json({ error: 'Failed to test webhook' });
    }
  }
);

/**
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery history (from Redis cache)
 */
router.get(
  '/:id/deliveries',
  [param('id').isUUID(), query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;
      const organizationId = (req as any).user.organizationId;

      // Verify webhook belongs to organization
      const webhook = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });

      if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      // Get delivery history from Redis (last 100 deliveries cached)
      const deliveries = await redis.lrange(`webhook:${id}:deliveries`, 0, Number(limit) - 1);
      const parsed = deliveries.map((d) => JSON.parse(d));

      res.json({ data: parsed, total: parsed.length });
    } catch (error) {
      logger.error('Error fetching webhook deliveries:', error);
      res.status(500).json({ error: 'Failed to fetch webhook deliveries' });
    }
  }
);

/**
 * POST /api/webhooks/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post(
  '/:id/regenerate-secret',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const webhook = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });

      if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const newSecret = crypto.randomBytes(32).toString('hex');

      await prisma.webhook.update({
        where: { id },
        data: { secret: newSecret },
      });

      logger.info('Webhook secret regenerated:', { webhookId: id, organizationId });

      res.json({ secret: newSecret });
    } catch (error) {
      logger.error('Error regenerating webhook secret:', error);
      res.status(500).json({ error: 'Failed to regenerate webhook secret' });
    }
  }
);

/**
 * GET /api/webhooks/events
 * List available webhook events
 */
router.get('/available/events', async (req: Request, res: Response): Promise<void> => {
  res.json({
    events: WEBHOOK_EVENTS.map((event) => ({
      name: event,
      description: getEventDescription(event),
    })),
  });
});

// Helper functions
function generateSignature(payload: any, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

function getEventDescription(event: string): string {
  const descriptions: Record<string, string> = {
    'meeting.created': 'Triggered when a new meeting is created',
    'meeting.updated': 'Triggered when a meeting is updated',
    'meeting.deleted': 'Triggered when a meeting is deleted',
    'meeting.started': 'Triggered when a meeting starts',
    'meeting.completed': 'Triggered when a meeting is completed',
    'transcript.created': 'Triggered when a transcript is created',
    'transcript.updated': 'Triggered when a transcript is updated',
    'summary.created': 'Triggered when a summary is generated',
    'comment.created': 'Triggered when a comment is added',
    'integration.connected': 'Triggered when an integration is connected',
    'integration.disconnected': 'Triggered when an integration is disconnected',
    'user.invited': 'Triggered when a user is invited to the organization',
    'user.removed': 'Triggered when a user is removed from the organization',
  };
  return descriptions[event] || 'No description available';
}

/**
 * Webhook delivery function (used by other services)
 * This would be called from other parts of the application when events occur
 */
export async function deliverWebhook(organizationId: string, event: string, data: any): Promise<void> {
  try {
    // Find all active webhooks for this organization that subscribe to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        organizationId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    for (const webhook of webhooks) {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const signature = generateSignature(payload, webhook.secret!);

      try {
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-ID': webhook.id,
            'X-Webhook-Event': event,
          },
          timeout: 10000,
        });

        // Log successful delivery
        const deliveryRecord = {
          webhookId: webhook.id,
          event,
          status: response.status,
          timestamp: new Date().toISOString(),
          success: true,
        };

        await redis.lpush(`webhook:${webhook.id}:deliveries`, JSON.stringify(deliveryRecord));
        await redis.ltrim(`webhook:${webhook.id}:deliveries`, 0, 99); // Keep last 100

        // Update lastTriggeredAt and reset failure count
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: 0,
          },
        });

        logger.info('Webhook delivered:', { webhookId: webhook.id, event, status: response.status });
      } catch (error: any) {
        // Log failed delivery
        const deliveryRecord = {
          webhookId: webhook.id,
          event,
          error: error.message,
          timestamp: new Date().toISOString(),
          success: false,
        };

        await redis.lpush(`webhook:${webhook.id}:deliveries`, JSON.stringify(deliveryRecord));
        await redis.ltrim(`webhook:${webhook.id}:deliveries`, 0, 99);

        // Increment failure count
        const updated = await prisma.webhook.update({
          where: { id: webhook.id },
          data: { failureCount: { increment: 1 } },
        });

        // Disable webhook after 10 consecutive failures
        if (updated.failureCount >= 10) {
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: { isActive: false },
          });
          logger.warn('Webhook disabled due to excessive failures:', { webhookId: webhook.id });
        }

        logger.error('Webhook delivery failed:', { webhookId: webhook.id, event, error: error.message });
      }
    }
  } catch (error) {
    logger.error('Error delivering webhooks:', error);
  }
}

export default router;
