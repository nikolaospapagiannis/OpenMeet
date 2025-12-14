/**
 * Slack Integration Routes
 *
 * Handles Slack OAuth, slash commands, and events
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { slackBotService } from '../../services/SlackBotService';
import { logger } from '../../utils/logger';
import { authenticateToken } from '../../middleware/auth';

const router: express.Router = express.Router();
const prisma = new PrismaClient();

/**
 * OAuth installation callback
 * GET /api/integrations/slack/oauth/callback?code=xxx
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code',
      });
    }

    const workspace = await slackBotService.handleOAuthCallback(code);

    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL}/integrations/slack/success?workspace=${workspace.id}`);
  } catch (error) {
    logger.error('Slack OAuth error', { error });
    res.redirect(`${process.env.FRONTEND_URL}/integrations/slack/error`);
  }
});

/**
 * Handle slash commands
 * POST /api/integrations/slack/commands
 */
router.post('/commands', async (req: Request, res: Response) => {
  try {
    // Verify Slack request signature
    if (!verifySlackSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const command = {
      command: req.body.command,
      text: req.body.text,
      userId: req.body.user_id,
      userName: req.body.user_name,
      channelId: req.body.channel_id,
      channelName: req.body.channel_name,
      teamId: req.body.team_id,
      teamDomain: req.body.team_domain,
      triggerId: req.body.trigger_id,
      responseUrl: req.body.response_url,
    };

    // Handle command asynchronously to avoid timeout
    const response = await slackBotService.handleCommand(command);

    res.json(response);
  } catch (error) {
    logger.error('Error handling Slack command', { error });
    res.json({
      response_type: 'ephemeral',
      text: 'Sorry, something went wrong.',
    });
  }
});

/**
 * Handle Slack events
 * POST /api/integrations/slack/events
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    // Verify Slack request signature
    if (!verifySlackSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, challenge, event } = req.body;

    // URL verification challenge
    if (type === 'url_verification') {
      return res.json({ challenge });
    }

    // Handle events
    if (type === 'event_callback') {
      // Process event asynchronously
      processSlackEvent(event);
      return res.json({ ok: true });
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Error handling Slack event', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle interactive components (buttons, modals, etc.)
 * POST /api/integrations/slack/interactions
 */
router.post('/interactions', async (req: Request, res: Response) => {
  try {
    // Verify Slack request signature
    if (!verifySlackSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(req.body.payload);

    // Handle different interaction types
    switch (payload.type) {
      case 'block_actions':
        await handleBlockActions(payload);
        break;

      case 'view_submission':
        await handleViewSubmission(payload);
        break;

      default:
        logger.warn('Unknown interaction type', { type: payload.type });
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Error handling Slack interaction', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get workspace configuration
 * GET /api/integrations/slack/workspaces
 */
router.get('/workspaces', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.organizationId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required',
      });
    }

    const workspaces = await prisma.slackWorkspace.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
      select: {
        id: true,
        teamName: true,
        installedAt: true,
        settings: true,
        metadata: true,
      },
    });

    res.json({
      success: true,
      workspaces,
    });
  } catch (error) {
    logger.error('Error getting Slack workspaces', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get workspaces',
    });
  }
});

/**
 * Update workspace settings
 * PUT /api/integrations/slack/workspaces/:id
 */
router.put(
  '/workspaces/:id',
  authenticateToken,
  [
    body('defaultChannel').optional().isString(),
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

      const { id } = req.params;
      const { defaultChannel } = req.body;
      const orgId = (req as any).user?.organizationId;

      // Verify ownership
      const workspace = await prisma.slackWorkspace.findFirst({
        where: {
          id,
          organizationId: orgId,
        },
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
        });
      }

      // Update settings with defaultChannel in settings JSON
      const currentSettings = (workspace.settings as any) || {};
      const updated = await prisma.slackWorkspace.update({
        where: { id },
        data: {
          settings: {
            ...currentSettings,
            defaultChannel,
          },
        },
      });

      res.json({
        success: true,
        workspace: updated,
      });
    } catch (error) {
      logger.error('Error updating Slack workspace', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update workspace',
      });
    }
  }
);

/**
 * Uninstall workspace
 * DELETE /api/integrations/slack/workspaces/:id
 */
router.delete('/workspaces/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId;

    // Verify ownership
    const workspace = await prisma.slackWorkspace.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    await slackBotService.uninstallWorkspace(workspace.teamId);

    res.json({
      success: true,
      message: 'Workspace uninstalled',
    });
  } catch (error) {
    logger.error('Error uninstalling Slack workspace', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to uninstall workspace',
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify Slack request signature
 */
function verifySlackSignature(req: Request): boolean {
  const crypto = require('crypto');
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

  if (!slackSigningSecret) {
    logger.warn('SLACK_SIGNING_SECRET not configured');
    return false;
  }

  const slackSignature = req.headers['x-slack-signature'] as string;
  const slackTimestamp = req.headers['x-slack-request-timestamp'] as string;

  if (!slackSignature || !slackTimestamp) {
    return false;
  }

  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(slackTimestamp)) > 60 * 5) {
    return false; // Request too old
  }

  // Compute signature
  // Note: req.rawBody should be set by middleware
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const sigBasestring = `v0:${slackTimestamp}:${rawBody}`;
  const mySignature = `v0=${crypto
    .createHmac('sha256', slackSigningSecret)
    .update(sigBasestring)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(slackSignature)
  );
}

/**
 * Process Slack events asynchronously
 */
async function processSlackEvent(event: any): Promise<void> {
  try {
    logger.info('Processing Slack event', { type: event.type });

    // Handle different event types
    switch (event.type) {
      case 'app_uninstalled':
        await slackBotService.uninstallWorkspace(event.team_id);
        break;

      case 'message':
        // Handle message events if needed
        break;

      default:
        logger.debug('Unhandled event type', { type: event.type });
    }
  } catch (error) {
    logger.error('Error processing Slack event', { error });
  }
}

/**
 * Handle block actions (button clicks, etc.)
 */
async function handleBlockActions(payload: any): Promise<void> {
  try {
    const action = payload.actions[0];

    if (action.action_id === 'get_summary') {
      const meetingId = action.value;
      // Handle get summary button click
      logger.info('Get summary button clicked', { meetingId });
    }
  } catch (error) {
    logger.error('Error handling block actions', { error });
  }
}

/**
 * Handle modal submissions
 */
async function handleViewSubmission(payload: any): Promise<void> {
  try {
    logger.info('View submission received', { callbackId: payload.view.callback_id });
  } catch (error) {
    logger.error('Error handling view submission', { error });
  }
}

export default router;
