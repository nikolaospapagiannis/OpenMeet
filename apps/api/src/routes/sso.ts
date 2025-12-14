/**
 * SSO/SAML Authentication Routes
 *
 * Enterprise single sign-on endpoints
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ssoService } from '../services/SSOService';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router: express.Router = express.Router();

/**
 * Configure SAML for organization
 * POST /api/sso/saml/configure
 */
router.post(
  '/saml/configure',
  authenticateToken,
  [
    body('provider').isIn(['okta', 'azure_ad', 'onelogin', 'google', 'custom']),
    body('entityId').isString().notEmpty(),
    body('ssoUrl').isURL(),
    body('sloUrl').optional().isURL(),
    body('certificate').isString().notEmpty(),
    body('attributeMapping').optional().isObject(),
    body('enforceSSO').optional().isBoolean(),
    body('jitProvisioning').optional().isBoolean(),
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

      const organizationId = (req as any).user?.organizationId;
      const userRole = (req as any).user?.role;

      // Only admins can configure SAML
      if (userRole !== 'admin' && userRole !== 'owner') {
        return res.status(403).json({
          success: false,
          error: 'Only organization admins can configure SSO',
        });
      }

      const config = await ssoService.configureSAML(organizationId, req.body);

      res.json({
        success: true,
        config: {
          id: config.id,
          provider: config.provider,
          entityId: config.entityId,
          ssoUrl: config.ssoUrl,
          enforceSSO: config.enforceSSO,
          jitProvisioning: config.jitProvisioning,
          isActive: config.isActive,
        },
      });
    } catch (error) {
      logger.error('Error configuring SAML', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to configure SAML',
      });
    }
  }
);

/**
 * Get SAML configuration
 * GET /api/sso/saml/config
 */
router.get('/saml/config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;

    const config = await ssoService.getSAMLConfig(organizationId);

    if (!config) {
      return res.json({
        success: true,
        config: null,
      });
    }

    res.json({
      success: true,
      config: {
        id: config.id,
        provider: config.provider,
        entityId: config.entityId,
        ssoUrl: config.ssoUrl,
        enforceSSO: config.enforceSSO,
        jitProvisioning: config.jitProvisioning,
        isActive: config.isActive,
        // Don't expose certificate
      },
    });
  } catch (error) {
    logger.error('Error getting SAML config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get SAML configuration',
    });
  }
});

/**
 * Initiate SAML login
 * GET /api/sso/saml/login/:organizationId
 */
router.get('/saml/login/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { relayState } = req.query;

    const loginUrl = await ssoService.getLoginUrl(
      organizationId,
      relayState as string
    );

    // Redirect to IdP
    res.redirect(loginUrl);
  } catch (error) {
    logger.error('Error initiating SAML login', { error });
    res.status(500).send('Failed to initiate SSO login');
  }
});

/**
 * SAML Assertion Consumer Service (ACS)
 * POST /api/sso/saml/acs/:organizationId
 */
router.post('/saml/acs/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { SAMLResponse, RelayState } = req.body;

    if (!SAMLResponse) {
      return res.status(400).send('SAML response missing');
    }

    // Process assertion
    const result = await ssoService.processAssertion(organizationId, SAMLResponse);

    // Set token cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    // Redirect to app (or relay state)
    const redirectUrl = RelayState || `${process.env.FRONTEND_URL}/dashboard`;
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Error processing SAML assertion', { error });
    res.status(500).send('SSO authentication failed');
  }
});

/**
 * Initiate SAML logout
 * GET /api/sso/saml/logout
 */
router.get('/saml/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;
    const ssoSessionId = (req as any).user?.ssoSessionId;

    if (!ssoSessionId) {
      // Not an SSO session
      res.clearCookie('auth_token');
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    // Get SSO session details
    const sessions = await ssoService.getUserSessions((req as any).user?.userId);
    const session = sessions.find(s => s.id === ssoSessionId);

    if (!session) {
      res.clearCookie('auth_token');
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    // Get logout URL
    const logoutUrl = await ssoService.getLogoutUrl(
      organizationId,
      session.nameId,
      session.sessionIndex
    );

    // End session
    await ssoService.endSession(ssoSessionId);

    // Clear cookie
    res.clearCookie('auth_token');

    // Redirect to IdP logout
    res.redirect(logoutUrl);
  } catch (error) {
    logger.error('Error initiating SAML logout', { error });
    res.clearCookie('auth_token');
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  }
});

/**
 * SAML Single Logout Service (SLS)
 * POST /api/sso/saml/sls/:organizationId
 */
router.post('/saml/sls/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { SAMLResponse } = req.body;

    await ssoService.processLogoutResponse(organizationId, SAMLResponse);

    res.redirect(`${process.env.FRONTEND_URL}/login`);
  } catch (error) {
    logger.error('Error processing SAML logout', { error });
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  }
});

/**
 * Get SAML metadata
 * GET /api/sso/saml/metadata/:organizationId
 */
router.get('/saml/metadata/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const metadata = await ssoService.getMetadata(organizationId);

    res.header('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    logger.error('Error getting SAML metadata', { error });
    res.status(500).send('Failed to get metadata');
  }
});

/**
 * Get user SSO sessions
 * GET /api/sso/sessions
 */
router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const sessions = await ssoService.getUserSessions(userId);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        provider: s.provider,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    logger.error('Error getting SSO sessions', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
    });
  }
});

/**
 * End SSO session
 * DELETE /api/sso/sessions/:sessionId
 */
router.delete(
  '/sessions/:sessionId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      // Verify session belongs to user
      const sessions = await ssoService.getUserSessions(userId);
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      await ssoService.endSession(sessionId);

      res.json({
        success: true,
        message: 'Session ended',
      });
    } catch (error) {
      logger.error('Error ending SSO session', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to end session',
      });
    }
  }
);

/**
 * Get SSO statistics
 * GET /api/sso/stats
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;

    const stats = await ssoService.getSSOStats(organizationId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting SSO stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

/**
 * Disable SAML
 * POST /api/sso/saml/disable
 */
router.post('/saml/disable', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;
    const userRole = (req as any).user?.role;

    // Only admins can disable SAML
    if (userRole !== 'admin' && userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Only organization admins can disable SSO',
      });
    }

    await ssoService.disableSAML(organizationId);

    res.json({
      success: true,
      message: 'SAML disabled',
    });
  } catch (error) {
    logger.error('Error disabling SAML', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to disable SAML',
    });
  }
});

export default router;
