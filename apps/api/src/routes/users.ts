/**
 * User Routes
 * User profile management and settings
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'user-routes' },
  transports: [new winston.transports.Console()],
});

/**
 * GET /users/me
 * Get current authenticated user profile
 */
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Fetch full user data with relationships
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        organization: true,
        sessions: {
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Return user data without sensitive fields
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      organization: user.organization,
      role: user.role,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      preferences: user.preferences,
      metadata: user.metadata,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      activeSessions: user.sessions.length,
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * PATCH /users/me
 * Update current user profile
 */
router.patch(
  '/me',
  authMiddleware,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('avatarUrl').optional().trim(),
    body('preferences').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { firstName, lastName, avatarUrl, preferences } = req.body;

      // Build update data
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (preferences !== undefined) {
        // Merge preferences with existing preferences
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { preferences: true },
        });
        updateData.preferences = {
          ...(user?.preferences as object || {}),
          ...preferences,
        };
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        include: { organization: true },
      });

      // Log profile update
      await prisma.auditLog.create({
        data: {
          organizationId: req.user.organizationId,
          userId: req.user.id,
          action: 'user_profile_updated',
          resourceType: 'user',
          resourceId: req.user.id,
          metadata: { updatedFields: Object.keys(updateData) },
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          avatarUrl: updatedUser.avatarUrl,
          organizationId: updatedUser.organizationId,
          organization: updatedUser.organization,
          role: updatedUser.role,
          preferences: updatedUser.preferences,
        },
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * POST /users/me/change-password
 * Change current user password
 */
router.post(
  '/me/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user || !user.passwordHash) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash },
      });

      // Log password change
      await prisma.auditLog.create({
        data: {
          organizationId: req.user.organizationId,
          userId: req.user.id,
          action: 'user_password_changed',
          resourceType: 'user',
          resourceId: req.user.id,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

/**
 * GET /users/me/sessions
 * Get current user active sessions
 */
router.get('/me/sessions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    res.json({ sessions });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /users/me/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/me/sessions/:sessionId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: req.user.id,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Delete session
    await prisma.session.delete({
      where: { id: sessionId },
    });

    // Log session revocation
    await prisma.auditLog.create({
      data: {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: 'session_revoked',
        resourceType: 'session',
        resourceId: sessionId,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

export default router;
