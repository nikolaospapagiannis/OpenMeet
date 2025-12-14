/**
 * Microsoft Teams Integration Routes
 *
 * Handles Teams bot messages, installation, and API endpoints
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { teamsIntegrationService } from '../../services/TeamsIntegrationService';
import { logger } from '../../utils/logger';
import { authenticateToken } from '../../middleware/auth';

const router: express.Router = express.Router();
const prisma = new PrismaClient();

/**
 * Teams bot messages endpoint
 * POST /api/integrations/teams/messages
 */
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const adapter = (teamsIntegrationService as any).adapter;

    await adapter.processActivity(req, res, async (context: any) => {
      const activityType = context.activity.type;

      switch (activityType) {
        case 'message':
          await teamsIntegrationService.handleMessage(context);
          break;

        case 'installationUpdate':
          if (context.activity.action === 'add') {
            await teamsIntegrationService.handleInstallation(context);
          } else if (context.activity.action === 'remove') {
            const teamId = context.activity.conversation?.id;
            if (teamId) {
              await teamsIntegrationService.uninstallFromTeam(teamId);
            }
          }
          break;

        case 'conversationUpdate':
          // Handle member added/removed
          break;

        default:
          logger.debug('Unhandled activity type', { activityType });
      }
    });
  } catch (error) {
    logger.error('Error processing Teams message', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Teams installations
 * GET /api/integrations/teams/installations
 */
router.get('/installations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.organizationId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required',
      });
    }

    const installations = await prisma.teamsInstallation.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        teamId: true,
        teamName: true,
        installedAt: true,
        settings: true,
      },
    });

    res.json({
      success: true,
      installations,
    });
  } catch (error) {
    logger.error('Error getting Teams installations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get installations',
    });
  }
});

/**
 * Send activity notification
 * POST /api/integrations/teams/notifications/activity
 */
router.post(
  '/notifications/activity',
  authenticateToken,
  [
    body('userId').isString().notEmpty(),
    body('tenantId').isString().notEmpty(),
    body('title').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('activityType').isString().notEmpty(),
    body('url').optional().isURL(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { userId, tenantId, title, description, activityType, url } = req.body;

      await teamsIntegrationService.sendActivityNotification(userId, tenantId, {
        title,
        description,
        activityType,
        url,
      });

      res.json({
        success: true,
        message: 'Activity notification sent',
      });
    } catch (error) {
      logger.error('Error sending activity notification', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
      });
    }
  }
);

/**
 * Post meeting summary to Teams channel
 * POST /api/integrations/teams/meetings/:meetingId/summary
 */
router.post(
  '/meetings/:meetingId/summary',
  authenticateToken,
  [
    body('conversationId').isString().notEmpty(),
    body('serviceUrl').isURL(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingId } = req.params;
      const { conversationId, serviceUrl } = req.body;

      await teamsIntegrationService.postMeetingSummary(
        meetingId,
        conversationId,
        serviceUrl
      );

      res.json({
        success: true,
        message: 'Summary posted to Teams',
      });
    } catch (error) {
      logger.error('Error posting summary to Teams', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to post summary',
      });
    }
  }
);

/**
 * Uninstall from team
 * DELETE /api/integrations/teams/installations/:teamId
 */
router.delete(
  '/installations/:teamId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const orgId = (req as any).user?.organizationId;

      // Verify ownership
      const installation = await prisma.teamsInstallation.findFirst({
        where: {
          teamId,
          organizationId: orgId,
        },
      });

      if (!installation) {
        return res.status(404).json({
          success: false,
          error: 'Installation not found',
        });
      }

      await teamsIntegrationService.uninstallFromTeam(teamId);

      res.json({
        success: true,
        message: 'Uninstalled from team',
      });
    } catch (error) {
      logger.error('Error uninstalling from team', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to uninstall',
      });
    }
  }
);

/**
 * Get Teams manifest
 * GET /api/integrations/teams/manifest
 */
router.get('/manifest', (req: Request, res: Response) => {
  const manifest = {
    $schema: 'https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json',
    manifestVersion: '1.14',
    version: '1.0.0',
    id: process.env.TEAMS_APP_ID,
    packageName: 'ai.openmeet.teams',
    developer: {
      name: 'OpenMeet',
      websiteUrl: process.env.FRONTEND_URL,
      privacyUrl: `${process.env.FRONTEND_URL}/privacy`,
      termsOfUseUrl: `${process.env.FRONTEND_URL}/terms`,
    },
    icons: {
      color: 'assets/color-icon.png',
      outline: 'assets/outline-icon.png',
    },
    name: {
      short: 'OpenMeet',
      full: 'OpenMeet Meeting Assistant',
    },
    description: {
      short: 'AI-powered meeting notes and transcription',
      full: 'OpenMeet helps your team transcribe, summarize, search, and analyze voice conversations. Automatically record and transcribe meetings, capture action items, and get AI-powered insights.',
    },
    accentColor: '#6366F1',
    bots: [
      {
        botId: process.env.TEAMS_APP_ID,
        scopes: ['personal', 'team', 'groupchat'],
        supportsFiles: false,
        isNotificationOnly: false,
        commandLists: [
          {
            scopes: ['personal', 'team', 'groupchat'],
            commands: [
              {
                title: 'join',
                description: 'Join the current Teams meeting',
              },
              {
                title: 'summary',
                description: 'Get meeting summaries',
              },
              {
                title: 'ask',
                description: 'Ask AI about your meetings',
              },
              {
                title: 'schedule',
                description: 'Schedule a new meeting',
              },
              {
                title: 'help',
                description: 'Show help and available commands',
              },
            ],
          },
        ],
      },
    ],
    permissions: ['identity', 'messageTeamMembers'],
    validDomains: [
      new URL(process.env.FRONTEND_URL || 'https://openmeet.com').hostname,
      new URL(process.env.API_URL || 'https://api.openmeet.com').hostname,
    ],
    webApplicationInfo: {
      id: process.env.TEAMS_APP_ID,
      resource: process.env.TEAMS_APP_RESOURCE || process.env.FRONTEND_URL,
    },
  };

  res.json(manifest);
});

export default router;
