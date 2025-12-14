/**
 * Google Meet Integration Routes
 * OAuth flows and integration management for Google Meet
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, IntegrationType } from '@prisma/client';
import winston from 'winston';
import { authMiddleware } from '../../middleware/auth';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'meet-integration-routes' },
  transports: [new winston.transports.Console()],
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.WEB_URL || 'http://localhost:3000';

/**
 * POST /api/integrations/meet/save
 * Save Google Meet integration (called by web app after OAuth - NO AUTH REQUIRED)
 * This endpoint validates userId from the request body (which comes from the OAuth state)
 */
router.post('/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, accessToken, refreshToken, expiresIn, email, name } = req.body;

    if (!userId || !accessToken) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid user' });
      return;
    }

    const existingIntegration = await prisma.integration.findFirst({
      where: {
        userId,
        type: 'google_meet' as IntegrationType,
      },
    });

    if (existingIntegration) {
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          isActive: true,
          accessToken,
          refreshToken: refreshToken || existingIntegration.refreshToken,
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
          metadata: { email, name },
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          userId,
          organizationId: user.organizationId || '',
          type: 'google_meet' as IntegrationType,
          name: 'Google Meet',
          isActive: true,
          accessToken,
          refreshToken,
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
          metadata: { email, name },
        },
      });
    }

    logger.info('Google Meet integration saved for user ' + userId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Save Meet integration error:', error);
    res.status(500).json({ error: 'Failed to save integration' });
  }
});

// Auth middleware for remaining routes
router.use(authMiddleware);

/**
 * GET /api/integrations/meet/status
 * Get Google Meet integration status for user
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const integration = await prisma.integration.findFirst({
      where: {
        userId,
        type: 'google_meet' as IntegrationType,
      },
    });

    // Return format expected by frontend: { status: 'connected', ... }
    if (integration) {
      res.json({
        connected: true,
        status: 'connected',
        id: integration.id,
        type: integration.type,
        isActive: integration.isActive,
        updatedAt: integration.updatedAt,
        createdAt: integration.createdAt,
        connectedAt: integration.createdAt,
        metadata: integration.metadata || {},
        integration: {
          id: integration.id,
          type: integration.type,
          isActive: integration.isActive,
        },
      });
    } else {
      res.json({
        connected: false,
        status: 'disconnected',
        integration: null,
      });
    }
  } catch (error) {
    logger.error('Get Meet status error:', error);
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
});

/**
 * GET /api/integrations/meet/oauth/initiate
 * Initiate Google Meet OAuth flow
 */
router.get('/oauth/initiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      res.status(500).json({ error: 'Google OAuth not configured' });
      return;
    }

    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const redirectUri = `${APP_URL}/api/integrations/meet/oauth/callback`;

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    logger.error('Initiate OAuth error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

/**
 * DELETE /api/integrations/meet/disconnect
 * Disconnect Google Meet integration
 */
router.delete('/disconnect', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await prisma.integration.deleteMany({
      where: {
        userId,
        type: 'google_meet' as IntegrationType,
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Disconnect Meet error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

export default router;
