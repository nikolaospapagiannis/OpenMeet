/**
 * Admin Authentication Middleware
 * Super Admin Dashboard access control with system-level roles
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, SystemRole } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// System role hierarchy for access control
const ROLE_HIERARCHY: Record<SystemRole, number> = {
  super_admin: 100,
  platform_admin: 80,
  billing_admin: 60,
  support_admin: 40,
  viewer: 20,
};

// Permission mappings for each role
const ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  super_admin: ['*'], // All permissions
  platform_admin: [
    'read:organizations',
    'write:organizations',
    'read:users',
    'write:users',
    'read:analytics',
    'read:infrastructure',
    'write:infrastructure',
    'read:logs',
    'read:alerts',
    'write:alerts',
    'read:feature_flags',
    'write:feature_flags',
  ],
  billing_admin: [
    'read:organizations',
    'read:users',
    'read:subscriptions',
    'write:subscriptions',
    'read:billing',
    'write:billing',
    'read:analytics',
  ],
  support_admin: [
    'read:organizations',
    'read:users',
    'write:users',
    'read:subscriptions',
    'read:logs',
    'read:alerts',
    'impersonate:users',
  ],
  viewer: [
    'read:organizations',
    'read:users',
    'read:subscriptions',
    'read:analytics',
    'read:logs',
  ],
};

/**
 * Check if user has a system admin role
 */
export const adminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get user with system role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        systemRole: true,
        firstName: true,
        lastName: true,
        organizationId: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (!user.systemRole) {
      logger.warn('Admin access denied - no system role', {
        userId,
        email: user.email,
      });
      res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.',
      });
      return;
    }

    // Attach admin info to request
    (req as any).admin = {
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
      permissions: ROLE_PERMISSIONS[user.systemRole],
      roleLevel: ROLE_HIERARCHY[user.systemRole],
    };

    logger.info('Admin access granted', {
      userId,
      email: user.email,
      systemRole: user.systemRole,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Admin auth middleware error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Check if admin has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = (req as any).admin;

    if (!admin) {
      res.status(401).json({
        success: false,
        error: 'Admin authentication required',
      });
      return;
    }

    const hasPermission =
      admin.permissions.includes('*') ||
      admin.permissions.includes(permission);

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: admin.id,
        systemRole: admin.systemRole,
        requiredPermission: permission,
      });
      res.status(403).json({
        success: false,
        error: `Permission denied. Required: ${permission}`,
      });
      return;
    }

    next();
  };
};

/**
 * Check if admin has minimum role level
 */
export const requireRole = (minRole: SystemRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = (req as any).admin;

    if (!admin) {
      res.status(401).json({
        success: false,
        error: 'Admin authentication required',
      });
      return;
    }

    const minLevel = ROLE_HIERARCHY[minRole];
    const userLevel = admin.roleLevel;

    if (userLevel < minLevel) {
      logger.warn('Role level insufficient', {
        userId: admin.id,
        userRole: admin.systemRole,
        requiredRole: minRole,
      });
      res.status(403).json({
        success: false,
        error: `Access denied. Minimum role required: ${minRole}`,
      });
      return;
    }

    next();
  };
};

/**
 * Super admin only middleware
 */
export const superAdminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const admin = (req as any).admin;

  if (!admin || admin.systemRole !== 'super_admin') {
    res.status(403).json({
      success: false,
      error: 'Super admin access required',
    });
    return;
  }

  next();
};

/**
 * Audit log wrapper for admin actions
 */
export const auditAdminAction = (action: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const admin = (req as any).admin;
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = (body: any) => {
      // Log the admin action
      prisma.auditLog
        .create({
          data: {
            userId: admin?.id,
            action,
            entityType: 'admin_action',
            entityId: req.params.id || 'system',
            changes: {
              path: req.path,
              method: req.method,
              body: req.body,
              statusCode: res.statusCode,
              success: body?.success ?? res.statusCode < 400,
            },
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
            organizationId: null,
          },
        })
        .catch((err) => {
          logger.error('Failed to create audit log', { error: err });
        });

      return originalJson(body);
    };

    next();
  };
};

export { ROLE_HIERARCHY, ROLE_PERMISSIONS };
