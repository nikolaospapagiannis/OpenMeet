/**
 * Admin User Routes
 * User management for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, SystemRole } from '@prisma/client';
import { requirePermission, requireRole, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';
import bcrypt from 'bcryptjs';

const router: Router = Router();
const prisma = new PrismaClient();

// List all users with pagination and filters
router.get(
  '/',
  requirePermission('read:users'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const organizationId = req.query.organizationId as string;
      const role = req.query.role as string;
      const systemRole = req.query.systemRole as SystemRole;
      const isActive = req.query.isActive === 'true';
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where: any = {};
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (organizationId) where.organizationId = organizationId;
      if (role) where.role = role;
      if (systemRole) where.systemRole = systemRole;
      if (req.query.isActive !== undefined) where.isActive = isActive;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
            systemRole: true,
            isActive: true,
            emailVerified: true,
            mfaEnabled: true,
            lastLoginAt: true,
            loginCount: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing users', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list users',
      });
    }
  }
);

// Get single user
router.get(
  '/:id',
  requirePermission('read:users'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          systemRole: true,
          isActive: true,
          emailVerified: true,
          mfaEnabled: true,
          lastLoginAt: true,
          loginCount: true,
          oauthProvider: true,
          preferences: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              tier: true,
            },
          },
          sessions: {
            select: {
              id: true,
              deviceInfo: true,
              ipAddress: true,
              createdAt: true,
              expiresAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              meetings: true,
              auditLogs: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error fetching user', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
      });
    }
  }
);

// Update user
router.patch(
  '/:id',
  requirePermission('write:users'),
  auditAdminAction('admin:update_user'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        role,
        isActive,
        emailVerified,
        organizationId,
      } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
          ...(emailVerified !== undefined && { emailVerified }),
          ...(organizationId !== undefined && { organizationId }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
        },
      });

      logger.info('User updated by admin', {
        userId: id,
        adminId: (req as any).admin?.id,
        changes: req.body,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error updating user', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
    }
  }
);

// Update user system role (super_admin only)
router.patch(
  '/:id/system-role',
  requireRole('super_admin'),
  auditAdminAction('admin:update_user_system_role'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { systemRole } = req.body;

      // Validate system role
      const validRoles: SystemRole[] = [
        'super_admin',
        'platform_admin',
        'billing_admin',
        'support_admin',
        'viewer',
      ];

      if (systemRole && !validRoles.includes(systemRole)) {
        res.status(400).json({
          success: false,
          error: `Invalid system role. Must be one of: ${validRoles.join(', ')}`,
        });
        return;
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          systemRole: systemRole || null,
        },
        select: {
          id: true,
          email: true,
          systemRole: true,
        },
      });

      logger.warn('User system role updated by admin', {
        userId: id,
        adminId: (req as any).admin?.id,
        newRole: systemRole,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error updating user system role', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update user system role',
      });
    }
  }
);

// Reset user password
router.post(
  '/:id/reset-password',
  requirePermission('write:users'),
  auditAdminAction('admin:reset_user_password'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters',
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: hashedPassword,
        },
      });

      // Invalidate all sessions
      await prisma.session.deleteMany({
        where: { userId: id },
      });

      logger.warn('User password reset by admin', {
        userId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Password reset successfully. All sessions have been invalidated.',
      });
    } catch (error) {
      logger.error('Error resetting user password', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  }
);

// Disable/Enable user MFA
router.post(
  '/:id/mfa',
  requirePermission('write:users'),
  auditAdminAction('admin:toggle_user_mfa'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const updateData: any = {
        mfaEnabled: enabled,
        isMfaEnabled: enabled,
      };

      if (!enabled) {
        updateData.mfaSecret = null;
        updateData.mfaBackupCodes = [];
      }

      await prisma.user.update({
        where: { id },
        data: updateData,
      });

      logger.info('User MFA toggled by admin', {
        userId: id,
        adminId: (req as any).admin?.id,
        enabled,
      });

      res.json({
        success: true,
        message: enabled ? 'MFA enabled' : 'MFA disabled',
      });
    } catch (error) {
      logger.error('Error toggling user MFA', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to toggle MFA',
      });
    }
  }
);

// Revoke all user sessions
router.post(
  '/:id/revoke-sessions',
  requirePermission('write:users'),
  auditAdminAction('admin:revoke_user_sessions'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await prisma.session.deleteMany({
        where: { userId: id },
      });

      logger.info('User sessions revoked by admin', {
        userId: id,
        adminId: (req as any).admin?.id,
        sessionCount: result.count,
      });

      res.json({
        success: true,
        message: `${result.count} session(s) revoked`,
      });
    } catch (error) {
      logger.error('Error revoking user sessions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to revoke sessions',
      });
    }
  }
);

// Get user activity log
router.get(
  '/:id/activity',
  requirePermission('read:users'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditLog.count({ where: { userId: id } }),
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: {
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Error fetching user activity', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user activity',
      });
    }
  }
);

// Get admin users (users with system roles)
router.get(
  '/system/admins',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const admins = await prisma.user.findMany({
        where: {
          systemRole: { not: null },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          systemRole: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: admins,
      });
    } catch (error) {
      logger.error('Error fetching admin users', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin users',
      });
    }
  }
);

export default router;
