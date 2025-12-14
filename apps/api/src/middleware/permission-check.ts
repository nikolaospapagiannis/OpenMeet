/**
 * Permission Middleware
 * Express middleware for protecting API routes with fine-grained permissions
 *
 * Usage:
 * - requirePermission('meetings.create') - Single permission
 * - requireAnyPermission(['meetings.create', 'meetings.update']) - Any of the permissions
 * - requireAllPermissions(['meetings.read', 'transcripts.read']) - All permissions
 * - requireResourcePermission('meetings.update', 'meetingId') - Resource-level permission
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import RBACService from '../services/rbac-service';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'permission-middleware' },
  transports: [new winston.transports.Console()],
});

/**
 * Require a single permission
 * Returns 403 if user doesn't have the permission
 */
export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await RBACService.checkPermission(
        req.user.id,
        permissionName,
        undefined,
        undefined,
        req.user.organizationId
      );

      if (!result.granted) {
        // Log failed permission check
        await logPermissionDenied(req, permissionName, result.reason);

        res.status(403).json({
          error: 'Insufficient permissions',
          message: `You do not have permission to perform this action. Required: ${permissionName}`,
          required: permissionName,
        });
        return;
      }

      // Log successful permission check (for compliance)
      if (process.env.LOG_PERMISSION_CHECKS === 'true') {
        await logPermissionGranted(req, permissionName);
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Require ANY of the specified permissions (OR logic)
 * User needs at least one of the permissions to proceed
 */
export const requireAnyPermission = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Check each permission until one is granted
      for (const permissionName of permissionNames) {
        const result = await RBACService.checkPermission(
          req.user.id,
          permissionName,
          undefined,
          undefined,
          req.user.organizationId
        );

        if (result.granted) {
          // At least one permission granted
          if (process.env.LOG_PERMISSION_CHECKS === 'true') {
            await logPermissionGranted(req, permissionName);
          }
          next();
          return;
        }
      }

      // None of the permissions were granted
      await logPermissionDenied(req, permissionNames.join(' OR '), 'User lacks any required permission');

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `You need at least one of these permissions: ${permissionNames.join(', ')}`,
        required: permissionNames,
        logic: 'OR',
      });
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Require ALL of the specified permissions (AND logic)
 * User needs all permissions to proceed
 */
export const requireAllPermissions = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const missingPermissions: string[] = [];

      // Check all permissions
      for (const permissionName of permissionNames) {
        const result = await RBACService.checkPermission(
          req.user.id,
          permissionName,
          undefined,
          undefined,
          req.user.organizationId
        );

        if (!result.granted) {
          missingPermissions.push(permissionName);
        }
      }

      if (missingPermissions.length > 0) {
        await logPermissionDenied(
          req,
          permissionNames.join(' AND '),
          `Missing permissions: ${missingPermissions.join(', ')}`
        );

        res.status(403).json({
          error: 'Insufficient permissions',
          message: `You are missing required permissions: ${missingPermissions.join(', ')}`,
          required: permissionNames,
          missing: missingPermissions,
          logic: 'AND',
        });
        return;
      }

      // All permissions granted
      if (process.env.LOG_PERMISSION_CHECKS === 'true') {
        await logPermissionGranted(req, permissionNames.join(' AND '));
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Require permission on a specific resource
 * Checks both role-based and resource-level permissions
 *
 * @param permissionName - Permission to check (e.g., 'meetings.update')
 * @param resourceIdParam - Parameter name in req.params or req.body containing resource ID
 * @param resourceType - Type of resource (defaults to extracted from permission name)
 */
export const requireResourcePermission = (
  permissionName: string,
  resourceIdParam: string = 'id',
  resourceType?: string
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Get resource ID from params or body
      const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];

      if (!resourceId) {
        res.status(400).json({
          error: 'Bad request',
          message: `Resource ID parameter '${resourceIdParam}' not found`,
        });
        return;
      }

      // Extract resource type from permission name if not provided
      const type = resourceType || permissionName.split('.')[0];

      const result = await RBACService.checkPermission(
        req.user.id,
        permissionName,
        resourceId,
        type,
        req.user.organizationId
      );

      if (!result.granted) {
        await logPermissionDenied(
          req,
          permissionName,
          `${result.reason} (Resource: ${type}:${resourceId})`
        );

        res.status(403).json({
          error: 'Insufficient permissions',
          message: `You do not have permission to perform this action on this resource`,
          required: permissionName,
          resourceType: type,
          resourceId,
        });
        return;
      }

      // Permission granted
      if (process.env.LOG_PERMISSION_CHECKS === 'true') {
        await logPermissionGranted(req, permissionName, resourceId, type);
      }

      next();
    } catch (error) {
      logger.error('Resource permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Check if user owns a resource
 * Useful for allowing users to modify their own content
 */
export const requireResourceOwnership = (
  resourceType: string,
  resourceIdParam: string = 'id',
  userIdField: string = 'userId'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];

      if (!resourceId) {
        res.status(400).json({
          error: 'Bad request',
          message: `Resource ID parameter '${resourceIdParam}' not found`,
        });
        return;
      }

      // Query the resource based on type
      const modelName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
      const model = (prisma as any)[resourceType];

      if (!model) {
        logger.error(`Unknown resource type: ${resourceType}`);
        res.status(500).json({ error: 'Invalid resource type' });
        return;
      }

      const resource = await model.findUnique({
        where: { id: resourceId },
        select: { [userIdField]: true, organizationId: true },
      });

      if (!resource) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      // Check ownership
      if (resource[userIdField] !== req.user.id) {
        await logPermissionDenied(
          req,
          `ownership:${resourceType}`,
          `User ${req.user.id} does not own ${resourceType}:${resourceId}`
        );

        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only modify your own resources',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      res.status(500).json({ error: 'Ownership check failed' });
    }
  };
};

/**
 * Require user to be in the same organization as the resource
 */
export const requireSameOrganization = (
  resourceType: string,
  resourceIdParam: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.organizationId) {
        res.status(401).json({ error: 'Not authenticated or no organization' });
        return;
      }

      const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];

      if (!resourceId) {
        res.status(400).json({
          error: 'Bad request',
          message: `Resource ID parameter '${resourceIdParam}' not found`,
        });
        return;
      }

      const model = (prisma as any)[resourceType];

      if (!model) {
        logger.error(`Unknown resource type: ${resourceType}`);
        res.status(500).json({ error: 'Invalid resource type' });
        return;
      }

      const resource = await model.findUnique({
        where: { id: resourceId },
        select: { organizationId: true },
      });

      if (!resource) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      if (resource.organizationId !== req.user.organizationId) {
        await logPermissionDenied(
          req,
          `organization:${resourceType}`,
          `Resource belongs to different organization`
        );

        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access resources in your organization',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Organization check error:', error);
      res.status(500).json({ error: 'Organization check failed' });
    }
  };
};

/**
 * Combine multiple permission checks with AND logic
 */
export const combinePermissions = (...middlewares: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let index = 0;

    const runNext = async (): Promise<void> => {
      if (index >= middlewares.length) {
        next();
        return;
      }

      const middleware = middlewares[index++];
      await middleware(req, res, runNext);
    };

    await runNext();
  };
};

/**
 * Log permission granted (for compliance)
 */
async function logPermissionGranted(
  req: Request,
  permission: string,
  resourceId?: string,
  resourceType?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        action: 'permission_check',
        actionLabel: 'Permission Check Granted',
        resourceType: resourceType || 'permission',
        resourceId: resourceId,
        status: 'success',
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          permission,
          granted: true,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to log permission granted:', error);
  }
}

/**
 * Log permission denied (for security and compliance)
 */
async function logPermissionDenied(
  req: Request,
  permission: string,
  reason?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        action: 'permission_denied',
        actionLabel: 'Permission Denied',
        resourceType: 'permission',
        status: 'failure',
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        riskLevel: 'medium', // Failed permission checks are security events
        metadata: {
          permission,
          granted: false,
          reason,
        },
        isSoc2Relevant: true,
      },
    });
  } catch (error) {
    logger.error('Failed to log permission denied:', error);
  }
}

// Export all middleware functions
export default {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireResourcePermission,
  requireResourceOwnership,
  requireSameOrganization,
  combinePermissions,
};
