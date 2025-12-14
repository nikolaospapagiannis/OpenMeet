/**
 * Developer Platform Routes
 *
 * Public API & Developer Platform
 * Competitive Feature: Matches Fathom's Public API
 *
 * Features:
 * - API key management
 * - Webhook configuration
 * - Usage statistics
 * - Developer documentation
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { apiKeyService } from '../services/APIKeyService';
import { logger } from '../utils/logger';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/developer/api-keys
 * Generate new API key
 */
router.post(
  '/api-keys',
  [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('scopes').optional().isArray(),
    body('expiresInDays').optional().isInt({ min: 1, max: 365 }),
    body('rateLimit').optional().isInt({ min: 100, max: 10000 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, scopes, expiresInDays, rateLimit } = req.body;
      const userId = (req as any).user.userId;
      const organizationId = (req as any).user.organizationId;

      const result = await apiKeyService.generateAPIKey(
        organizationId,
        userId,
        {
          name,
          scopes,
          expiresInDays,
          rateLimit,
        }
      );

      res.json({
        success: true,
        apiKey: {
          id: result.apiKey.id,
          key: result.plainKey, // Shown only once!
          name: result.apiKey.name,
          scopes: result.apiKey.scopes,
          expiresAt: result.apiKey.expiresAt,
          rateLimit: result.apiKey.rateLimit,
          createdAt: result.apiKey.createdAt,
        },
        warning: 'Store this API key securely. It will not be shown again.',
      });
    } catch (error: any) {
      logger.error('Error creating API key', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create API key',
      });
    }
  }
);

/**
 * GET /api/developer/api-keys
 * List all API keys for organization
 */
router.get('/api-keys', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.userId;

    const apiKeys = await apiKeyService.listAPIKeys(organizationId, userId);

    // Don't send hashed keys - only metadata
    const safeApiKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
      createdAt: key.createdAt,
      keyPreview: `ff_****${key.id.slice(-4)}`, // Show last 4 chars of ID
    }));

    res.json({
      success: true,
      apiKeys: safeApiKeys,
      count: safeApiKeys.length,
    });
  } catch (error: any) {
    logger.error('Error listing API keys', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list API keys',
    });
  }
});

/**
 * GET /api/developer/api-keys/:id/usage
 * Get usage statistics for specific API key
 */
router.get(
  '/api-keys/:id/usage',
  [
    param('id').isString().notEmpty(),
    query('days').optional().isInt({ min: 1, max: 365 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await apiKeyService.getUsageStats(id, days);

      res.json({
        success: true,
        stats: {
          ...stats,
          period: `Last ${days} days`,
        },
      });
    } catch (error: any) {
      logger.error('Error getting API key usage', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get usage statistics',
      });
    }
  }
);

/**
 * POST /api/developer/api-keys/:id/rotate
 * Rotate API key (generate new, revoke old)
 */
router.post(
  '/api-keys/:id/rotate',
  [param('id').isString().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = (req as any).user.userId;
      const organizationId = (req as any).user.organizationId;

      const result = await apiKeyService.rotateAPIKey(id, organizationId, userId);

      res.json({
        success: true,
        apiKey: {
          id: result.apiKey.id,
          key: result.plainKey, // Shown only once!
          name: result.apiKey.name,
          scopes: result.apiKey.scopes,
          expiresAt: result.apiKey.expiresAt,
          rateLimit: result.apiKey.rateLimit,
          createdAt: result.apiKey.createdAt,
        },
        warning: 'Store this new API key securely. The old key has been revoked.',
      });
    } catch (error: any) {
      logger.error('Error rotating API key', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to rotate API key',
      });
    }
  }
);

/**
 * DELETE /api/developer/api-keys/:id
 * Revoke API key
 */
router.delete(
  '/api-keys/:id',
  [param('id').isString().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      await apiKeyService.revokeAPIKey(id, organizationId);

      res.json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error: any) {
      logger.error('Error revoking API key', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to revoke API key',
      });
    }
  }
);

/**
 * GET /api/developer/docs
 * Get API documentation
 */
router.get('/docs', async (req: Request, res: Response) => {
  res.json({
    success: true,
    documentation: {
      version: '1.0.0',
      baseUrl: process.env.API_URL || 'https://api.openmeet.com',
      authentication: {
        type: 'API Key',
        header: 'Authorization: Bearer YOUR_API_KEY',
        example: 'curl -H "Authorization: Bearer nb_abc123..." https://api.openmeet.com/v1/meetings',
      },
      endpoints: {
        meetings: {
          list: 'GET /v1/meetings',
          get: 'GET /v1/meetings/:id',
          create: 'POST /v1/meetings',
          update: 'PUT /v1/meetings/:id',
          delete: 'DELETE /v1/meetings/:id',
        },
        transcripts: {
          get: 'GET /v1/meetings/:id/transcript',
          search: 'POST /v1/transcripts/search',
        },
        aiQuery: {
          ask: 'POST /v1/ai/ask',
          superSummary: 'POST /v1/ai/super-summary',
        },
        analytics: {
          meetings: 'GET /v1/analytics/meetings',
          speakers: 'GET /v1/analytics/speakers',
        },
      },
      scopes: {
        read: 'Read access to meetings, transcripts, and analytics',
        write: 'Create and update meetings',
        delete: 'Delete meetings and data',
        admin: 'Full administrative access',
      },
      rateLimits: {
        default: '1000 requests/hour',
        premium: '5000 requests/hour',
        enterprise: '10000 requests/hour',
      },
      webhooks: {
        events: [
          'meeting.created',
          'meeting.completed',
          'transcript.ready',
          'summary.generated',
        ],
        format: {
          event: 'meeting.completed',
          timestamp: '2025-11-14T12:00:00Z',
          data: {
            meetingId: 'meeting_123',
            // ... event-specific data
          },
        },
      },
    },
  });
});

export default router;
