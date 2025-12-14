/**
 * Organizations Routes
 * Organization management, settings, member management, and billing
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import Redis from 'ioredis';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
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
  defaultMeta: { service: 'organizations-routes' },
  transports: [new winston.transports.Console()],
});

router.use(authMiddleware);

/**
 * GET /api/organizations
 * List organizations for current user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const organizations = await prisma.organization.findMany({
      where: {
        users: {
          some: { id: userId },
        },
      },
      include: {
        _count: {
          select: {
            users: true,
            meetings: true,
            workspaces: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: organizations });
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

/**
 * GET /api/organizations/:id
 * Get organization details
 */
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = (req as any).user.id;

      // Check cache
      const cacheKey = `organization:${id}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const organization = await prisma.organization.findFirst({
        where: {
          id,
          users: {
            some: { id: userId },
          },
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              role: true,
              isActive: true,
            },
          },
          workspaces: {
            include: {
              _count: {
                select: { meetings: true, members: true },
              },
            },
          },
          _count: {
            select: {
              meetings: true,
              integrations: true,
              webhooks: true,
              apiKeys: true,
            },
          },
        },
      });

      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(organization));

      res.json(organization);
    } catch (error) {
      logger.error('Error fetching organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  }
);

/**
 * POST /api/organizations
 * Create a new organization
 */
router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('slug').optional().trim().matches(/^[a-z0-9-]+$/),
    body('domain').optional().trim().isURL(),
    body('subscriptionTier').optional().isIn(['free', 'pro', 'business', 'enterprise']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { name, slug, domain, subscriptionTier } = req.body;

      // Generate slug if not provided
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomBytes(4).toString('hex');

      // Check slug uniqueness
      const existing = await prisma.organization.findUnique({
        where: { slug: finalSlug },
      });

      if (existing) {
        res.status(400).json({ error: 'Organization slug already exists' });
        return;
      }

      const organization = await prisma.organization.create({
        data: {
          name,
          slug: finalSlug,
          domain,
          subscriptionTier: (subscriptionTier as SubscriptionTier) || 'free',
          subscriptionStatus: 'active',
          users: {
            connect: { id: userId },
          },
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update user's organizationId
      await prisma.user.update({
        where: { id: userId },
        data: { organizationId: organization.id },
      });

      logger.info('Organization created:', { organizationId: organization.id, userId });
      res.status(201).json(organization);
    } catch (error) {
      logger.error('Error creating organization:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

/**
 * PATCH /api/organizations/:id
 * Update organization
 */
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim(),
    body('domain').optional().trim(),
    body('logoUrl').optional().isURL(),
    body('subscriptionTier').optional().isIn(['free', 'pro', 'business', 'enterprise']),
    body('subscriptionStatus').optional().isIn(['active', 'canceled', 'past_due', 'trialing']),
    body('settings').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = (req as any).user.id;

      // Verify user belongs to organization and has admin role
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.organizationId !== id || user?.role === 'user') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const organization = await prisma.organization.update({
        where: { id },
        data: req.body,
      });

      // Invalidate cache
      await redis.del(`organization:${id}`);

      logger.info('Organization updated:', { organizationId: id, userId });
      res.json(organization);
    } catch (error) {
      logger.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

/**
 * DELETE /api/organizations/:id
 * Delete organization
 */
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = (req as any).user.id;

      // Verify user is super_admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.organizationId !== id || user?.role !== 'super_admin') {
        res.status(403).json({ error: 'Only super admins can delete organizations' });
        return;
      }

      await prisma.organization.delete({ where: { id } });

      // Invalidate cache
      await redis.del(`organization:${id}`);

      logger.info('Organization deleted:', { organizationId: id, userId });
      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      logger.error('Error deleting organization:', error);
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  }
);

/**
 * GET /api/organizations/:id/members
 * Get organization members
 */
router.get(
  '/:id/members',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      // Verify access
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.organizationId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const members = await prisma.user.findMany({
        where: { organizationId: id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ data: members });
    } catch (error) {
      logger.error('Error fetching members:', error);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  }
);

/**
 * POST /api/organizations/:id/members
 * Invite member to organization
 */
router.post(
  '/:id/members',
  [
    param('id').isUUID(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['user', 'admin']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { email, role = 'user' } = req.body;
      const userId = (req as any).user.id;

      // Verify user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.organizationId !== id || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
        res.status(403).json({ error: 'Only admins can invite members' });
        return;
      }

      // Check if user already exists
      let invitedUser = await prisma.user.findUnique({
        where: { email },
      });

      if (invitedUser) {
        // Update existing user
        invitedUser = await prisma.user.update({
          where: { email },
          data: { organizationId: id, role },
        });
      } else {
        // Create new user (invitation)
        invitedUser = await prisma.user.create({
          data: {
            email,
            organizationId: id,
            role,
            isActive: false, // Will be activated when they set password
          },
        });

        // Send invitation email via SendGrid
        try {
          // Fetch organization details
          const organization = await prisma.organization.findUnique({
            where: { id },
            select: { name: true },
          });

          const sgMail = require('@sendgrid/mail');
          const apiKey = process.env.SENDGRID_API_KEY;

          if (apiKey && organization) {
            sgMail.setApiKey(apiKey);

            // Generate invitation token (valid for 7 days)
            const jwt = require('jsonwebtoken');
            const invitationToken = jwt.sign(
              { email, organizationId: id, invitedUserId: invitedUser.id },
              process.env.JWT_SECRET!,
              { expiresIn: '7d' }
            );

            const invitationLink = `${process.env.WEB_URL}/accept-invitation?token=${invitationToken}`;

            const msg = {
              to: email,
              from: process.env.FROM_EMAIL || 'noreply@openmeet.com',
              subject: `You've been invited to join ${organization.name} on OpenMeet`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>You've been invited!</h2>
                  <p>You've been invited to join <strong>${organization.name}</strong> on OpenMeet.</p>
                  <p>Click the button below to accept the invitation and set up your account:</p>
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${invitationLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                      Accept Invitation
                    </a>
                  </p>
                  <p style="color: #666; font-size: 12px;">
                    This invitation link will expire in 7 days.<br>
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>
              `,
            };

            await sgMail.send(msg);

            // Log notification to database
            await prisma.notification.create({
              data: {
                userId: invitedUser.id,
                type: 'email',
                status: 'sent',
                channel: 'email',
                recipient: email,
                subject: msg.subject,
                content: `Invitation to join ${organization.name}`,
                metadata: {
                  invitationToken,
                  organizationId: id,
                },
              },
            });

            logger.info('Invitation email sent successfully', { email });
          } else {
            logger.warn('SENDGRID_API_KEY not configured, invitation email not sent');
          }
        } catch (emailError) {
          logger.error('Error sending invitation email:', emailError);
          // Don't fail the invitation if email fails
        }
      }

      // Invalidate cache
      await redis.del(`organization:${id}`);

      logger.info('Member invited:', { organizationId: id, invitedEmail: email, invitedBy: userId });
      res.status(201).json(invitedUser);
    } catch (error) {
      logger.error('Error inviting member:', error);
      res.status(500).json({ error: 'Failed to invite member' });
    }
  }
);

/**
 * PATCH /api/organizations/:id/members/:memberId
 * Update member role
 */
router.patch(
  '/:id/members/:memberId',
  [
    param('id').isUUID(),
    param('memberId').isUUID(),
    body('role').isIn(['user', 'admin', 'super_admin']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id, memberId } = req.params;
      const { role } = req.body;
      const userId = (req as any).user.id;

      // Verify user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.organizationId !== id || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
        res.status(403).json({ error: 'Only admins can update member roles' });
        return;
      }

      // Cannot change own role
      if (memberId === userId) {
        res.status(400).json({ error: 'Cannot change your own role' });
        return;
      }

      const member = await prisma.user.update({
        where: { id: memberId, organizationId: id },
        data: { role },
      });

      logger.info('Member role updated:', { organizationId: id, memberId, newRole: role, updatedBy: userId });
      res.json(member);
    } catch (error) {
      logger.error('Error updating member role:', error);
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }
);

/**
 * DELETE /api/organizations/:id/members/:memberId
 * Remove member from organization
 */
router.delete(
  '/:id/members/:memberId',
  [param('id').isUUID(), param('memberId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id, memberId } = req.params;
      const userId = (req as any).user.id;

      // Verify user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.organizationId !== id || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
        res.status(403).json({ error: 'Only admins can remove members' });
        return;
      }

      // Cannot remove self
      if (memberId === userId) {
        res.status(400).json({ error: 'Cannot remove yourself from the organization' });
        return;
      }

      await prisma.user.update({
        where: { id: memberId, organizationId: id },
        data: { organizationId: null },
      });

      logger.info('Member removed:', { organizationId: id, memberId, removedBy: userId });
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      logger.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
);

/**
 * GET /api/organizations/:id/usage
 * Get organization usage statistics
 */
router.get(
  '/:id/usage',
  [param('id').isUUID(), query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      const userId = (req as any).user.id;

      // Verify access
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.organizationId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get usage metrics
      const [totalMeetings, totalTranscriptionMinutes, totalStorageBytes, activeUsers] = await Promise.all([
        prisma.meeting.count({
          where: {
            organizationId: id,
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.meeting.aggregate({
          where: {
            organizationId: id,
            createdAt: { gte: start, lte: end },
          },
          _sum: { durationSeconds: true },
        }),
        prisma.meetingRecording.aggregate({
          where: {
            meeting: {
              organizationId: id,
              createdAt: { gte: start, lte: end },
            },
          },
          _sum: { fileSizeBytes: true },
        }),
        prisma.user.count({
          where: {
            organizationId: id,
            lastLoginAt: { gte: start },
          },
        }),
      ]);

      const transcriptionMinutes = Math.floor((totalTranscriptionMinutes._sum.durationSeconds || 0) / 60);
      const storageGB = Number(((totalStorageBytes._sum.fileSizeBytes || BigInt(0)) / BigInt(1024 * 1024 * 1024)).toString());

      res.json({
        period: { start, end },
        metrics: {
          totalMeetings,
          transcriptionMinutes,
          storageGB,
          activeUsers,
        },
      });
    } catch (error) {
      logger.error('Error fetching usage:', error);
      res.status(500).json({ error: 'Failed to fetch usage statistics' });
    }
  }
);

export default router;
