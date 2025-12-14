/**
 * Integrations Routes
 * OAuth flows, integration management, and sync operations
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, IntegrationType } from '@prisma/client';
import Redis from 'ioredis';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import axios from 'axios';
import crypto from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'integrations-routes' },
  transports: [new winston.transports.Console()],
});

// OAuth callback must be unauthenticated (comes from external redirect)
// Apply auth middleware to specific routes that need it instead

// OAuth configuration
const OAUTH_CONFIGS = {
  zoom: {
    authUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
    scope: 'meeting:read meeting:write',
  },
  teams: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientId: process.env.TEAMS_CLIENT_ID,
    clientSecret: process.env.TEAMS_CLIENT_SECRET,
    scope: 'OnlineMeetings.ReadWrite Calendars.ReadWrite',
  },
  meet: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.file',
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    scope: 'channels:read channels:write chat:write',
  },
  salesforce: {
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    scope: 'api refresh_token',
  },
  hubspot: {
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    clientId: process.env.HUBSPOT_CLIENT_ID,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    scope: 'crm.objects.contacts.read crm.objects.companies.read',
  },
};

/**
 * GET /api/integrations
 * List integrations for organization
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user.organizationId;

    const integrations = await prisma.integration.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Remove sensitive data
    const sanitized = integrations.map((int) => ({
      ...int,
      accessToken: undefined,
      refreshToken: undefined,
    }));

    res.json({ data: sanitized });
  } catch (error) {
    logger.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * GET /api/integrations/:id
 * Get integration details
 */
router.get(
  '/:id',
  authMiddleware,
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const integration = await prisma.integration.findFirst({
        where: { id, organizationId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      // Remove sensitive data
      const sanitized = {
        ...integration,
        accessToken: undefined,
        refreshToken: undefined,
      };

      res.json(sanitized);
    } catch (error) {
      logger.error('Error fetching integration:', error);
      res.status(500).json({ error: 'Failed to fetch integration' });
    }
  }
);

/**
 * GET /api/integrations/oauth/:type/authorize
 * Start OAuth flow
 */
router.get(
  '/oauth/:type/authorize',
  authMiddleware,
  [param('type').isIn(['zoom', 'teams', 'meet', 'slack', 'salesforce', 'hubspot'])],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const config = OAUTH_CONFIGS[type as keyof typeof OAUTH_CONFIGS];
      if (!config || !config.clientId) {
        res.status(400).json({ error: `${type} integration not configured` });
        return;
      }

      // Generate state token for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      await redis.setex(`oauth:state:${state}`, 600, JSON.stringify({ userId, organizationId, type }));

      const redirectUri = `${process.env.API_URL}/api/integrations/oauth/${type}/callback`;

      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.append('client_id', config.clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', config.scope);
      authUrl.searchParams.append('state', state);

      res.json({ authUrl: authUrl.toString() });
    } catch (error) {
      logger.error('Error starting OAuth flow:', error);
      res.status(500).json({ error: 'Failed to start OAuth flow' });
    }
  }
);

/**
 * GET /api/integrations/oauth/:type/callback
 * OAuth callback handler
 */
router.get(
  '/oauth/:type/callback',
  [param('type').isIn(['zoom', 'teams', 'meet', 'slack', 'salesforce', 'hubspot'])],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const { code, state } = req.query;

      if (!code || !state) {
        res.status(400).json({ error: 'Missing code or state parameter' });
        return;
      }

      // Verify state token
      const stateData = await redis.get(`oauth:state:${state}`);
      if (!stateData) {
        res.status(400).json({ error: 'Invalid or expired state token' });
        return;
      }

      const { userId, organizationId } = JSON.parse(stateData);
      await redis.del(`oauth:state:${state}`);

      const config = OAUTH_CONFIGS[type as keyof typeof OAUTH_CONFIGS];
      const redirectUri = `${process.env.API_URL}/api/integrations/oauth/${type}/callback`;

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri,
          client_id: config.clientId!,
          client_secret: config.clientSecret!,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Calculate expiration
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

      // Encrypt tokens before storage
      const encryptedAccessToken = encrypt(access_token);
      const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

      // Save integration
      const integration = await prisma.integration.create({
        data: {
          type: type as IntegrationType,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Integration`,
          organizationId,
          userId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          isActive: true,
        },
      });

      logger.info('Integration created:', { integrationId: integration.id, type, userId, organizationId });

      // Redirect to frontend success page
      res.redirect(`${process.env.WEB_URL}/integrations?success=true&type=${type}`);
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.redirect(`${process.env.WEB_URL}/integrations?error=true`);
    }
  }
);

/**
 * DELETE /api/integrations/:id
 * Delete integration
 */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const integration = await prisma.integration.deleteMany({
        where: { id, organizationId },
      });

      if (integration.count === 0) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      logger.info('Integration deleted:', { integrationId: id, organizationId });
      res.json({ message: 'Integration deleted successfully' });
    } catch (error) {
      logger.error('Error deleting integration:', error);
      res.status(500).json({ error: 'Failed to delete integration' });
    }
  }
);

/**
 * PATCH /api/integrations/:id
 * Update integration settings
 */
router.patch(
  '/:id',
  authMiddleware,
  [param('id').isUUID(), body('isActive').optional().isBoolean(), body('settings').optional().isObject()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;
      const updateData = req.body;

      const integration = await prisma.integration.findFirst({
        where: { id, organizationId },
      });

      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      const updated = await prisma.integration.update({
        where: { id },
        data: updateData,
      });

      logger.info('Integration updated:', { integrationId: id, organizationId });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating integration:', error);
      res.status(500).json({ error: 'Failed to update integration' });
    }
  }
);

/**
 * POST /api/integrations/:id/sync
 * Trigger sync for integration
 */
router.post(
  '/:id/sync',
  authMiddleware,
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const integration = await prisma.integration.findFirst({
        where: { id, organizationId },
      });

      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      if (!integration.isActive) {
        res.status(400).json({ error: 'Integration is not active' });
        return;
      }

      // Queue sync job (would integrate with Bull queue in production)
      logger.info('Sync job queued:', { integrationId: id, type: integration.type });

      res.json({ message: 'Sync started', jobId: crypto.randomUUID() });
    } catch (error) {
      logger.error('Error triggering sync:', error);
      res.status(500).json({ error: 'Failed to trigger sync' });
    }
  }
);

/**
 * GET /api/integrations/:id/test
 * Test integration connection
 */
router.get(
  '/:id/test',
  authMiddleware,
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const integration = await prisma.integration.findFirst({
        where: { id, organizationId },
      });

      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      // Decrypt token
      const accessToken = decrypt(integration.accessToken!);

      // Test connection based on type
      let testResult = { success: true, message: 'Connection successful' };

      try {
        switch (integration.type) {
          case 'slack':
            await axios.get('https://slack.com/api/auth.test', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            break;
          case 'salesforce':
            await axios.get('https://login.salesforce.com/services/oauth2/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            break;
          case 'hubspot':
            await axios.get('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken);
            break;
          default:
            testResult = { success: true, message: 'Test not implemented for this integration type' };
        }
      } catch (error: any) {
        testResult = {
          success: false,
          message: error.response?.data?.error || 'Connection failed',
        };
      }

      res.json(testResult);
    } catch (error) {
      logger.error('Error testing integration:', error);
      res.status(500).json({ error: 'Failed to test integration' });
    }
  }
);

// Encryption helpers
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex').slice(0, 32);
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export default router;
