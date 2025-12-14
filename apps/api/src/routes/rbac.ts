/**
 * RBAC Routes
 * Role and Permission Management API
 *
 * Provides endpoints for:
 * - Role management (CRUD)
 * - Permission assignment
 * - User role assignment
 * - Resource-level permissions
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { requirePermission, requireAllPermissions } from '../middleware/permission-check';
import RBACService from '../services/rbac-service';
import { PERMISSIONS, DEFAULT_ROLES, PERMISSION_CATEGORIES } from '../config/permissions';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'rbac-routes' },
  transports: [new winston.transports.Console()],
});

// All routes require authentication
router.use(authMiddleware);

// ========================================
// PERMISSION ENDPOINTS
// ========================================

/**
 * GET /api/rbac/permissions
 * List all available permissions
 */
router.get(
  '/permissions',
  requirePermission('settings.view'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      res.json({
        data: permissions,
        categories: PERMISSION_CATEGORIES,
      });
    } catch (error) {
      logger.error('Error fetching permissions:', error);
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }
);

/**
 * GET /api/rbac/permissions/:id
 * Get a single permission by ID
 */
router.get(
  '/permissions/:id',
  requirePermission('settings.view'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      const permission = await prisma.permission.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!permission) {
        res.status(404).json({ error: 'Permission not found' });
        return;
      }

      res.json(permission);
    } catch (error) {
      logger.error('Error fetching permission:', error);
      res.status(500).json({ error: 'Failed to fetch permission' });
    }
  }
);

// ========================================
// ROLE ENDPOINTS
// ========================================

/**
 * GET /api/rbac/roles
 * List all roles for the organization
 */
router.get(
  '/roles',
  requirePermission('settings.view'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const roles = await RBACService.getOrganizationRoles(organizationId);

      res.json({ data: roles });
    } catch (error) {
      logger.error('Error fetching roles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }
);

/**
 * GET /api/rbac/roles/:id
 * Get a single role by ID
 */
router.get(
  '/roles/:id',
  requirePermission('settings.view'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const role = await prisma.role.findFirst({
        where: {
          id,
          OR: [
            { organizationId },
            { isSystem: true, organizationId: null },
          ],
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              userAssignments: true,
            },
          },
        },
      });

      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      res.json(role);
    } catch (error) {
      logger.error('Error fetching role:', error);
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  }
);

/**
 * POST /api/rbac/roles
 * Create a custom role
 */
router.post(
  '/roles',
  requirePermission('settings.manage'),
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('permissions').isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const { name, description, permissions } = req.body;

      const roleId = await RBACService.createCustomRole(
        organizationId,
        name,
        description,
        permissions,
        userId
      );

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      res.status(201).json(role);
    } catch (error) {
      logger.error('Error creating role:', error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  }
);

/**
 * PATCH /api/rbac/roles/:id
 * Update a custom role
 */
router.patch(
  '/roles/:id',
  requirePermission('settings.manage'),
  [
    param('id').isUUID(),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('permissions').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { name, description, permissions } = req.body;
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      // Check if role exists and is not a system role
      const role = await prisma.role.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      if (role.isSystem) {
        res.status(403).json({ error: 'Cannot modify system roles' });
        return;
      }

      // Update role metadata
      if (name || description) {
        await prisma.role.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description && { description }),
          },
        });
      }

      // Update permissions if provided
      if (permissions) {
        await RBACService.updateRolePermissions(id, permissions, userId, organizationId);
      }

      // Fetch updated role
      const updatedRole = await prisma.role.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      res.json(updatedRole);
    } catch (error) {
      logger.error('Error updating role:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  }
);

/**
 * DELETE /api/rbac/roles/:id
 * Delete a custom role
 */
router.delete(
  '/roles/:id',
  requirePermission('settings.manage'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      await RBACService.deleteRole(id, userId, organizationId);

      res.status(204).send();
    } catch (error: any) {
      logger.error('Error deleting role:', error);
      if (error.message.includes('system role')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete role' });
      }
    }
  }
);

// ========================================
// USER ROLE ASSIGNMENT ENDPOINTS
// ========================================

/**
 * GET /api/rbac/users/:userId/roles
 * Get all roles assigned to a user
 */
router.get(
  '/users/:userId/roles',
  requirePermission('users.read'),
  [param('userId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId } = req.params;
      const organizationId = req.user!.organizationId;

      const roles = await RBACService.getUserRoles(userId, organizationId);

      res.json({ data: roles });
    } catch (error) {
      logger.error('Error fetching user roles:', error);
      res.status(500).json({ error: 'Failed to fetch user roles' });
    }
  }
);

/**
 * POST /api/rbac/users/:userId/roles
 * Assign a role to a user
 */
router.post(
  '/users/:userId/roles',
  requirePermission('users.manage_roles'),
  [
    param('userId').isUUID(),
    body('roleId').isUUID(),
    body('expiresAt').optional().isISO8601(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId } = req.params;
      const { roleId, expiresAt } = req.body;
      const organizationId = req.user!.organizationId;
      const assignedBy = req.user!.id;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      await RBACService.assignRole(
        userId,
        roleId,
        organizationId,
        assignedBy,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.status(201).json({ message: 'Role assigned successfully' });
    } catch (error) {
      logger.error('Error assigning role:', error);
      res.status(500).json({ error: 'Failed to assign role' });
    }
  }
);

/**
 * DELETE /api/rbac/users/:userId/roles/:roleId
 * Revoke a role from a user
 */
router.delete(
  '/users/:userId/roles/:roleId',
  requirePermission('users.manage_roles'),
  [param('userId').isUUID(), param('roleId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId, roleId } = req.params;
      const organizationId = req.user!.organizationId;
      const revokedBy = req.user!.id;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      await RBACService.revokeRole(userId, roleId, organizationId, revokedBy);

      res.status(204).send();
    } catch (error) {
      logger.error('Error revoking role:', error);
      res.status(500).json({ error: 'Failed to revoke role' });
    }
  }
);

/**
 * GET /api/rbac/users/:userId/permissions
 * Get all permissions for a user (computed from roles)
 */
router.get(
  '/users/:userId/permissions',
  requirePermission('users.read'),
  [param('userId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId } = req.params;
      const organizationId = req.user!.organizationId;

      const permissions = await RBACService.getUserPermissions(userId, organizationId);

      res.json({ data: permissions });
    } catch (error) {
      logger.error('Error fetching user permissions:', error);
      res.status(500).json({ error: 'Failed to fetch user permissions' });
    }
  }
);

// ========================================
// RESOURCE PERMISSION ENDPOINTS
// ========================================

/**
 * POST /api/rbac/resource-permissions
 * Grant resource-level permission to a user
 */
router.post(
  '/resource-permissions',
  requirePermission('users.manage_roles'),
  [
    body('userId').isUUID(),
    body('permission').notEmpty().trim(),
    body('resourceType').notEmpty().trim(),
    body('resourceId').notEmpty().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId, permission, resourceType, resourceId } = req.body;
      const organizationId = req.user!.organizationId;
      const grantedBy = req.user!.id;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      await RBACService.grantResourcePermission(
        userId,
        permission,
        resourceType,
        resourceId,
        organizationId,
        grantedBy
      );

      res.status(201).json({ message: 'Resource permission granted successfully' });
    } catch (error: any) {
      logger.error('Error granting resource permission:', error);
      res.status(500).json({ error: error.message || 'Failed to grant resource permission' });
    }
  }
);

/**
 * DELETE /api/rbac/resource-permissions
 * Revoke resource-level permission from a user
 */
router.delete(
  '/resource-permissions',
  requirePermission('users.manage_roles'),
  [
    body('userId').isUUID(),
    body('permission').notEmpty().trim(),
    body('resourceType').notEmpty().trim(),
    body('resourceId').notEmpty().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId, permission, resourceType, resourceId } = req.body;
      const organizationId = req.user!.organizationId;
      const revokedBy = req.user!.id;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      await RBACService.revokeResourcePermission(
        userId,
        permission,
        resourceType,
        resourceId,
        organizationId,
        revokedBy
      );

      res.status(204).send();
    } catch (error: any) {
      logger.error('Error revoking resource permission:', error);
      res.status(500).json({ error: error.message || 'Failed to revoke resource permission' });
    }
  }
);

// ========================================
// PERMISSION CHECK ENDPOINTS (for debugging/testing)
// ========================================

/**
 * POST /api/rbac/check-permission
 * Check if a user has a specific permission
 */
router.post(
  '/check-permission',
  requirePermission('settings.view'),
  [
    body('userId').optional().isUUID(),
    body('permission').notEmpty().trim(),
    body('resourceId').optional().trim(),
    body('resourceType').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId, permission, resourceId, resourceType } = req.body;
      const organizationId = req.user!.organizationId;

      // Default to current user if not specified
      const targetUserId = userId || req.user!.id;

      const result = await RBACService.checkPermission(
        targetUserId,
        permission,
        resourceId,
        resourceType,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error checking permission:', error);
      res.status(500).json({ error: 'Failed to check permission' });
    }
  }
);

export default router;
