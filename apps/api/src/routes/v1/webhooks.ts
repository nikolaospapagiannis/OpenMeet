/**
 * Public API v1 - Webhooks Endpoints
 *
 * Provides webhook management:
 * - Create webhook
 * - List webhooks
 * - Get webhook details
 * - Update webhook
 * - Delete webhook
 * - Test webhook
 * - Get webhook logs
 */

import { Router, Response } from 'express';
import { param, query, body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { APIKeyRequest } from '../../middleware/apiKeyAuth';
import { logger } from '../../utils/logger';
import { requireScopes } from '../../middleware/apiKeyAuth';
import { webhookDeliveryService } from '../../services/WebhookDeliveryService';
import * as crypto from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();

// Available webhook events
const WEBHOOK_EVENTS = [
  'meeting.created',
  'meeting.updated',
  'meeting.deleted',
  'meeting.completed',
  'meeting.started',
  'transcript.completed',
  'summary.generated',
  'recording.uploaded',
  'recording.processed',
  'user.created',
  'user.updated',
  '*', // All events
] as const;

/**
 * POST /api/v1/webhooks
 * Create new webhook
 */
router.post(
  '/',
  requireScopes('admin'),
  [
    body('url').isURL().withMessage('Valid URL is required'),
    body('events').isArray({ min: 1 }).withMessage('At least one event is required'),
    body('events.*').isIn(WEBHOOK_EVENTS as any).withMessage('Invalid event type'),
    body('description').optional().isString(),
    body('secret').optional().isString().isLength({ min: 16 }).withMessage('Secret must be at least 16 characters'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { url, events, description, secret } = req.body;

      // Generate secret if not provided
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

      const webhook = await prisma.webhook.create({
        data: {
          url,
          events: events as any,
          description,
          secret: webhookSecret,
          isActive: true,
          organizationId: req.apiKey!.organizationId,
          createdBy: req.apiKey!.userId,
          metadata: {
            createdViaAPI: true,
            apiKeyId: req.apiKey!.id,
          } as any,
        },
      });

      logger.info('Webhook created', {
        webhookId: webhook.id,
        organizationId: req.apiKey!.organizationId,
        events,
      });

      res.status(201).json({
        success: true,
        data: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          description: webhook.description,
          secret: webhookSecret, // Return secret only on creation
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
        },
        message: 'Webhook created successfully. Save the secret - it will not be shown again.',
      });
    } catch (error: any) {
      logger.error('Error creating webhook', { error, organizationId: req.apiKey?.organizationId });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create webhook',
      });
    }
  }
);

/**
 * GET /api/v1/webhooks
 * List all webhooks
 */
router.get(
  '/',
  requireScopes('read'),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const [webhooks, total] = await Promise.all([
        prisma.webhook.findMany({
          where: { organizationId: req.apiKey!.organizationId },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.webhook.count({
          where: { organizationId: req.apiKey!.organizationId },
        }),
      ]);

      res.json({
        success: true,
        data: webhooks.map(w => ({
          id: w.id,
          url: w.url,
          events: w.events,
          description: w.description,
          isActive: w.isActive,
          lastTriggeredAt: w.lastTriggeredAt,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          // Don't return secret
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
          nextOffset: offset + limit < total ? offset + limit : null,
        },
      });
    } catch (error: any) {
      logger.error('Error listing webhooks', { error, organizationId: req.apiKey?.organizationId });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to list webhooks',
      });
    }
  }
);

/**
 * GET /api/v1/webhooks/:id
 * Get webhook details
 */
router.get(
  '/:id',
  requireScopes('read'),
  [param('id').isString().notEmpty().withMessage('Webhook ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      const webhook = await prisma.webhook.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Webhook not found',
        });
      }

      // Get delivery statistics
      const stats = await webhookDeliveryService.getDeliveryStats(webhook.id, 7);

      res.json({
        success: true,
        data: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          description: webhook.description,
          isActive: webhook.isActive,
          lastTriggeredAt: webhook.lastTriggeredAt,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
          statistics: stats,
          // Don't return secret
        },
      });
    } catch (error: any) {
      logger.error('Error getting webhook', { error, webhookId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get webhook',
      });
    }
  }
);

/**
 * PATCH /api/v1/webhooks/:id
 * Update webhook
 */
router.patch(
  '/:id',
  requireScopes('admin'),
  [
    param('id').isString().notEmpty().withMessage('Webhook ID is required'),
    body('url').optional().isURL().withMessage('Valid URL is required'),
    body('events').optional().isArray({ min: 1 }).withMessage('At least one event is required'),
    body('events.*').optional().isIn(WEBHOOK_EVENTS as any).withMessage('Invalid event type'),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { url, events, description, isActive } = req.body;

      // Check if webhook exists
      const existingWebhook = await prisma.webhook.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!existingWebhook) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Webhook not found',
        });
      }

      // Prepare update data
      const updateData: any = {};
      if (url !== undefined) updateData.url = url;
      if (events !== undefined) updateData.events = events;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;

      const webhook = await prisma.webhook.update({
        where: { id },
        data: updateData,
      });

      logger.info('Webhook updated', {
        webhookId: webhook.id,
        organizationId: req.apiKey!.organizationId,
      });

      res.json({
        success: true,
        data: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          description: webhook.description,
          isActive: webhook.isActive,
          updatedAt: webhook.updatedAt,
        },
        message: 'Webhook updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating webhook', { error, webhookId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update webhook',
      });
    }
  }
);

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
router.delete(
  '/:id',
  requireScopes('admin'),
  [param('id').isString().notEmpty().withMessage('Webhook ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      // Check if webhook exists
      const webhook = await prisma.webhook.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Webhook not found',
        });
      }

      await prisma.webhook.delete({
        where: { id },
      });

      logger.info('Webhook deleted', {
        webhookId: id,
        organizationId: req.apiKey!.organizationId,
      });

      res.json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting webhook', { error, webhookId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete webhook',
      });
    }
  }
);

/**
 * POST /api/v1/webhooks/:id/test
 * Test webhook by sending a test event
 */
router.post(
  '/:id/test',
  requireScopes('admin'),
  [param('id').isString().notEmpty().withMessage('Webhook ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      // Check if webhook exists
      const webhook = await prisma.webhook.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Webhook not found',
        });
      }

      // Test the webhook
      const result = await webhookDeliveryService.testWebhook(webhook.id);

      logger.info('Webhook tested', {
        webhookId: webhook.id,
        success: result.success,
        statusCode: result.statusCode,
      });

      res.json({
        success: true,
        data: {
          success: result.success,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          error: result.error,
        },
        message: result.success ? 'Webhook test successful' : 'Webhook test failed',
      });
    } catch (error: any) {
      logger.error('Error testing webhook', { error, webhookId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to test webhook',
      });
    }
  }
);

/**
 * GET /api/v1/webhooks/:id/logs
 * Get webhook delivery logs
 */
router.get(
  '/:id/logs',
  requireScopes('read'),
  [
    param('id').isString().notEmpty().withMessage('Webhook ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      // Check if webhook exists
      const webhook = await prisma.webhook.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Webhook not found',
        });
      }

      const logs = await webhookDeliveryService.getDeliveryLogs(webhook.id, limit);

      res.json({
        success: true,
        data: logs.map(log => ({
          id: log.id,
          event: log.event,
          statusCode: log.statusCode,
          responseTime: log.responseTime,
          success: log.success,
          error: log.error,
          attempt: log.attempt,
          timestamp: log.timestamp,
        })),
      });
    } catch (error: any) {
      logger.error('Error getting webhook logs', { error, webhookId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get webhook logs',
      });
    }
  }
);

/**
 * POST /api/v1/webhooks/:id/rotate-secret
 * Rotate webhook secret
 */
router.post(
  '/:id/rotate-secret',
  requireScopes('admin'),
  [param('id').isString().notEmpty().withMessage('Webhook ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      // Check if webhook exists
      const webhook = await prisma.webhook.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Webhook not found',
        });
      }

      // Generate new secret
      const newSecret = crypto.randomBytes(32).toString('hex');

      await prisma.webhook.update({
        where: { id },
        data: { secret: newSecret },
      });

      logger.info('Webhook secret rotated', {
        webhookId: id,
        organizationId: req.apiKey!.organizationId,
      });

      res.json({
        success: true,
        data: {
          secret: newSecret,
        },
        message: 'Secret rotated successfully. Save the new secret - it will not be shown again.',
      });
    } catch (error: any) {
      logger.error('Error rotating webhook secret', { error, webhookId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to rotate webhook secret',
      });
    }
  }
);

export default router;
