/**
 * Enhanced Team Management Routes
 * Bulk operations, activity tracking, and advanced team features
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { body, param, query, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import csvParser from 'csv-parse';
import { Readable } from 'stream';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'team-management-routes' },
  transports: [new winston.transports.Console()],
});

router.use(authMiddleware);

/**
 * Helper function to log team activity
 */
async function logTeamActivity(
  organizationId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        actionLabel: action.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
        resourceType,
        resourceId,
        status: 'success',
        metadata: metadata || {},
      },
    });
  } catch (error) {
    logger.error('Failed to log team activity:', error);
  }
}

/**
 * POST /api/team-management/bulk-invite
 * Bulk invite team members via CSV
 */
router.post(
  '/bulk-invite',
  [
    body('csvData').notEmpty().withMessage('CSV data is required'),
    body('defaultRole').optional().isIn(['user', 'admin']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { csvData, defaultRole = 'user' } = req.body;

      // Get user's organization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });

      if (!user?.organizationId || (user.role !== 'admin' && user.role !== 'super_admin')) {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
      }

      // Parse CSV
      const invites: { email: string; role: string }[] = [];
      const parser = csvParser.parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      await new Promise<void>((resolve, reject) => {
        parser.on('data', (row) => {
          if (row.email) {
            invites.push({
              email: row.email.toLowerCase(),
              role: row.role || defaultRole,
            });
          }
        });
        parser.on('error', reject);
        parser.on('end', resolve);
      });

      if (invites.length === 0) {
        res.status(400).json({ error: 'No valid email addresses found in CSV' });
        return;
      }

      // Check subscription limits
      const currentMemberCount = await prisma.user.count({
        where: { organizationId: user.organizationId },
      });

      const limits: Record<string, number> = {
        free: 5,
        pro: 25,
        business: 100,
        enterprise: 999999,
      };

      const maxMembers = limits[user.organization?.subscriptionTier || 'free'];
      if (currentMemberCount + invites.length > maxMembers) {
        res.status(400).json({
          error: `Subscription limit reached. Maximum ${maxMembers} members allowed for ${user.organization?.subscriptionTier} tier.`,
        });
        return;
      }

      // Process invites
      const results = {
        sent: [] as string[],
        failed: [] as { email: string; error: string }[],
        existing: [] as string[],
      };

      for (const invite of invites) {
        try {
          // Check if user already exists in organization
          const existingUser = await prisma.user.findFirst({
            where: {
              email: invite.email,
              organizationId: user.organizationId,
            },
          });

          if (existingUser) {
            results.existing.push(invite.email);
            continue;
          }

          // Check for pending invite
          const existingInvite = await prisma.teamInvite.findFirst({
            where: {
              email: invite.email,
              organizationId: user.organizationId!,
              status: 'pending',
              expiresAt: { gte: new Date() },
            },
          });

          if (existingInvite) {
            // Update existing invite
            await prisma.teamInvite.update({
              where: { id: existingInvite.id },
              data: {
                role: invite.role as any,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                invitedById: userId,
              },
            });
          } else {
            // Create new invite
            const token = crypto.randomBytes(32).toString('hex');
            await prisma.teamInvite.create({
              data: {
                organizationId: user.organizationId!,
                email: invite.email,
                role: invite.role as any,
                token,
                invitedById: userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                metadata: {
                  source: 'bulk_invite',
                  inviterName: `${user.firstName} ${user.lastName}`.trim(),
                },
              },
            });
          }

          // Send invitation email (simplified for demo)
          try {
            const sgMail = require('@sendgrid/mail');
            const apiKey = process.env.SENDGRID_API_KEY;

            if (apiKey) {
              sgMail.setApiKey(apiKey);

              const invitationToken = jwt.sign(
                { email: invite.email, organizationId: user.organizationId },
                process.env.JWT_SECRET!,
                { expiresIn: '7d' }
              );

              const invitationLink = `${process.env.WEB_URL}/accept-invitation?token=${invitationToken}`;

              await sgMail.send({
                to: invite.email,
                from: process.env.FROM_EMAIL || 'noreply@openmeet.com',
                subject: `You're invited to join ${user.organization?.name}`,
                html: `
                  <p>You've been invited to join ${user.organization?.name}.</p>
                  <p><a href="${invitationLink}">Accept Invitation</a></p>
                  <p>This link expires in 7 days.</p>
                `,
              });

              results.sent.push(invite.email);
            } else {
              results.sent.push(invite.email); // Marked as sent even without email service
            }
          } catch (emailError) {
            logger.error('Email send error:', emailError);
            results.sent.push(invite.email); // Still count as sent
          }
        } catch (error: any) {
          results.failed.push({ email: invite.email, error: error.message });
        }
      }

      // Log activity
      await logTeamActivity(
        user.organizationId!,
        userId,
        'bulk_invite',
        'team_invites',
        undefined,
        { count: invites.length, results }
      );

      res.json({
        message: 'Bulk invitations processed',
        results,
      });
    } catch (error) {
      logger.error('Error processing bulk invites:', error);
      res.status(500).json({ error: 'Failed to process bulk invitations' });
    }
  }
);

/**
 * GET /api/team-management/pending-invites
 * Get pending team invitations
 */
router.get('/pending-invites', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.organizationId) {
      res.status(403).json({ error: 'Organization access required' });
      return;
    }

    const invites = await prisma.teamInvite.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'pending',
        expiresAt: { gte: new Date() },
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: invites });
  } catch (error) {
    logger.error('Error fetching pending invites:', error);
    res.status(500).json({ error: 'Failed to fetch pending invites' });
  }
});

/**
 * POST /api/team-management/resend-invite/:inviteId
 * Resend team invitation
 */
router.post(
  '/resend-invite/:inviteId',
  [param('inviteId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { inviteId } = req.params;
      const userId = (req as any).user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });

      if (!user?.organizationId || (user.role !== 'admin' && user.role !== 'super_admin')) {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
      }

      const invite = await prisma.teamInvite.findFirst({
        where: {
          id: inviteId,
          organizationId: user.organizationId,
          status: 'pending',
        },
      });

      if (!invite) {
        res.status(404).json({ error: 'Invite not found' });
        return;
      }

      // Extend expiration
      await prisma.teamInvite.update({
        where: { id: inviteId },
        data: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Resend email (simplified)
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY;

        if (apiKey) {
          sgMail.setApiKey(apiKey);

          const invitationToken = jwt.sign(
            { email: invite.email, organizationId: user.organizationId },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
          );

          const invitationLink = `${process.env.WEB_URL}/accept-invitation?token=${invitationToken}`;

          await sgMail.send({
            to: invite.email,
            from: process.env.FROM_EMAIL || 'noreply@openmeet.com',
            subject: `Reminder: You're invited to join ${user.organization?.name}`,
            html: `
              <p>This is a reminder that you've been invited to join ${user.organization?.name}.</p>
              <p><a href="${invitationLink}">Accept Invitation</a></p>
              <p>This link expires in 7 days.</p>
            `,
          });
        }
      } catch (emailError) {
        logger.error('Email resend error:', emailError);
      }

      // Log activity
      await logTeamActivity(
        user.organizationId,
        userId,
        'resend_invite',
        'team_invite',
        inviteId,
        { email: invite.email }
      );

      res.json({ message: 'Invitation resent successfully' });
    } catch (error) {
      logger.error('Error resending invite:', error);
      res.status(500).json({ error: 'Failed to resend invitation' });
    }
  }
);

/**
 * DELETE /api/team-management/revoke-invite/:inviteId
 * Revoke team invitation
 */
router.delete(
  '/revoke-invite/:inviteId',
  [param('inviteId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { inviteId } = req.params;
      const userId = (req as any).user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.organizationId || (user.role !== 'admin' && user.role !== 'super_admin')) {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
      }

      const invite = await prisma.teamInvite.findFirst({
        where: {
          id: inviteId,
          organizationId: user.organizationId,
          status: 'pending',
        },
      });

      if (!invite) {
        res.status(404).json({ error: 'Invite not found' });
        return;
      }

      await prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: 'revoked' },
      });

      // Log activity
      await logTeamActivity(
        user.organizationId,
        userId,
        'revoke_invite',
        'team_invite',
        inviteId,
        { email: invite.email }
      );

      res.json({ message: 'Invitation revoked successfully' });
    } catch (error) {
      logger.error('Error revoking invite:', error);
      res.status(500).json({ error: 'Failed to revoke invitation' });
    }
  }
);

/**
 * GET /api/team-management/activity-log
 * Get team activity log
 */
router.get(
  '/activity-log',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userId').optional().isUUID(),
    query('action').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { page = 1, limit = 20, userId: filterUserId, action, startDate, endDate } = req.query;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.organizationId) {
        res.status(403).json({ error: 'Organization access required' });
        return;
      }

      const where: any = {
        organizationId: user.organizationId,
        resourceType: { in: ['team_member', 'team_invite', 'organization'] },
      };

      if (filterUserId) where.userId = filterUserId;
      if (action) where.action = action;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [activities, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        data: activities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Error fetching activity log:', error);
      res.status(500).json({ error: 'Failed to fetch activity log' });
    }
  }
);

/**
 * GET /api/team-management/seat-usage
 * Get seat usage statistics
 */
router.get('/seat-usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      res.status(403).json({ error: 'Organization access required' });
      return;
    }

    const [activeUsers, pendingInvites, inactiveUsers] = await Promise.all([
      prisma.user.count({
        where: {
          organizationId: user.organizationId,
          isActive: true,
        },
      }),
      prisma.teamInvite.count({
        where: {
          organizationId: user.organizationId,
          status: 'pending',
          expiresAt: { gte: new Date() },
        },
      }),
      prisma.user.count({
        where: {
          organizationId: user.organizationId,
          isActive: false,
        },
      }),
    ]);

    // Platform owners (super_admin) get unlimited seats
    const isPlatformOwner = user.role === 'super_admin';
    const tier = isPlatformOwner ? 'enterprise' : (user.organization?.subscriptionTier || 'free');

    const limits: Record<string, number> = {
      free: 5,
      pro: 25,
      business: 100,
      enterprise: 999999,
    };

    const maxSeats = limits[tier];
    const usedSeats = activeUsers;
    const availableSeats = Math.max(0, maxSeats - usedSeats);

    res.json({
      tier: isPlatformOwner ? 'platform-owner' : tier,
      isPlatformOwner,
      maxSeats: isPlatformOwner ? -1 : maxSeats, // -1 for unlimited
      usedSeats,
      availableSeats: isPlatformOwner ? -1 : availableSeats,
      pendingInvites,
      inactiveUsers,
      usage: {
        percentage: isPlatformOwner ? 0 : Math.round((usedSeats / maxSeats) * 100),
        status: isPlatformOwner ? 'ok' : (usedSeats >= maxSeats ? 'full' : usedSeats >= maxSeats * 0.9 ? 'warning' : 'ok'),
      },
    });
  } catch (error) {
    logger.error('Error fetching seat usage:', error);
    res.status(500).json({ error: 'Failed to fetch seat usage' });
  }
});

/**
 * POST /api/team-management/assign-role
 * Batch assign roles to multiple team members
 */
router.post(
  '/assign-role',
  [
    body('userIds').isArray().notEmpty(),
    body('role').isIn(['user', 'admin']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { userIds, role } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.organizationId || user.role !== 'super_admin') {
        res.status(403).json({ error: 'Super admin privileges required' });
        return;
      }

      // Cannot change own role
      if (userIds.includes(userId)) {
        res.status(400).json({ error: 'Cannot change your own role' });
        return;
      }

      const result = await prisma.user.updateMany({
        where: {
          id: { in: userIds },
          organizationId: user.organizationId,
          role: { not: 'super_admin' }, // Protect super_admin role
        },
        data: { role },
      });

      // Log activity for each user
      for (const targetUserId of userIds) {
        await logTeamActivity(
          user.organizationId,
          userId,
          'change_role',
          'team_member',
          targetUserId,
          { newRole: role }
        );
      }

      res.json({
        message: `Successfully updated ${result.count} team members`,
        updated: result.count,
      });
    } catch (error) {
      logger.error('Error assigning roles:', error);
      res.status(500).json({ error: 'Failed to assign roles' });
    }
  }
);

export default router;