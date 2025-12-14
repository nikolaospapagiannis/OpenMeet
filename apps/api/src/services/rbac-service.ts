/**
 * RBAC Service
 * Comprehensive Role-Based Access Control service for permission management
 *
 * Features:
 * - Permission checking (user-level and resource-level)
 * - Role assignment and management
 * - Custom role creation
 * - Permission caching for performance
 * - Audit logging for all permission changes
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import winston from 'winston';
import { PERMISSIONS, DEFAULT_ROLES, PermissionDefinition, RoleDefinition } from '../config/permissions';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'rbac-service' },
  transports: [new winston.transports.Console()],
});

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = {
  USER_PERMISSIONS: 'rbac:user_perms:',
  ROLE_PERMISSIONS: 'rbac:role_perms:',
  RESOURCE_PERMISSIONS: 'rbac:resource_perms:',
};

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  source?: 'role' | 'resource' | 'direct';
}

export class RBACService {
  /**
   * Initialize RBAC system - Create default permissions and roles
   * Should be run on application startup
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing RBAC system...');

      // Create all system permissions
      for (const permDef of PERMISSIONS) {
        await prisma.permission.upsert({
          where: { name: permDef.name },
          create: {
            name: permDef.name,
            resource: permDef.resource,
            action: permDef.action,
            description: permDef.description,
            category: permDef.category,
            isSystem: permDef.isSystem,
          },
          update: {
            description: permDef.description,
            category: permDef.category,
          },
        });
      }

      logger.info(`Created/updated ${PERMISSIONS.length} permissions`);

      // Create default system roles
      for (const roleDef of DEFAULT_ROLES) {
        // Check if system role exists (system roles have null organizationId)
        let role = await prisma.role.findFirst({
          where: {
            name: roleDef.name,
            organizationId: null,
            isSystem: true,
          },
        });

        if (role) {
          // Update existing role
          role = await prisma.role.update({
            where: { id: role.id },
            data: {
              description: roleDef.description,
              priority: roleDef.priority,
            },
          });
        } else {
          // Create new role
          role = await prisma.role.create({
            data: {
              organizationId: null, // System roles have no organization
              name: roleDef.name,
              description: roleDef.description,
              isSystem: roleDef.isSystem,
              isCustom: roleDef.isCustom,
              priority: roleDef.priority,
            },
          });
        }

        // Assign permissions to role
        for (const permissionName of roleDef.permissions) {
          const permission = await prisma.permission.findUnique({
            where: { name: permissionName },
          });

          if (permission) {
            await prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: role.id,
                  permissionId: permission.id,
                },
              },
              create: {
                roleId: role.id,
                permissionId: permission.id,
                granted: true,
              },
              update: {
                granted: true,
              },
            });
          }
        }

        logger.info(`Created/updated role: ${roleDef.name} with ${roleDef.permissions.length} permissions`);
      }

      logger.info('RBAC initialization complete');
    } catch (error) {
      logger.error('RBAC initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has a specific permission
   * Checks role-based permissions and resource-level overrides
   */
  static async checkPermission(
    userId: string,
    permissionName: string,
    resourceId?: string,
    resourceType?: string,
    organizationId?: string
  ): Promise<PermissionCheckResult> {
    try {
      // Check cache first
      const cacheKey = resourceId
        ? `${CACHE_PREFIX.RESOURCE_PERMISSIONS}${userId}:${permissionName}:${resourceType}:${resourceId}`
        : `${CACHE_PREFIX.USER_PERMISSIONS}${userId}:${permissionName}`;

      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get permission definition
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (!permission) {
        const result: PermissionCheckResult = {
          granted: false,
          reason: `Permission '${permissionName}' does not exist`,
        };
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
        return result;
      }

      // Check resource-level permission override first
      if (resourceId && resourceType) {
        const resourcePerm = await prisma.resourcePermission.findFirst({
          where: {
            userId,
            permissionId: permission.id,
            resourceType,
            resourceId,
          },
        });

        if (resourcePerm) {
          const result: PermissionCheckResult = {
            granted: resourcePerm.granted,
            reason: resourcePerm.granted
              ? 'Granted via resource-level permission'
              : 'Denied via resource-level permission',
            source: 'resource',
          };
          await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
          return result;
        }
      }

      // Check role-based permissions
      // Include system roles (NULL organizationId) and org-specific roles
      const userRoles = await prisma.userRoleAssignment.findMany({
        where: {
          userId,
          AND: [
            organizationId
              ? { OR: [{ organizationId: null }, { organizationId }] }
              : {},
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
        include: {
          role: {
            include: {
              permissions: {
                where: {
                  permissionId: permission.id,
                },
              },
            },
          },
        },
        orderBy: {
          role: {
            priority: 'desc', // Highest priority first
          },
        },
      });

      // Check if any role grants this permission
      for (const userRole of userRoles) {
        const rolePermission = userRole.role.permissions[0];
        if (rolePermission && rolePermission.granted) {
          const result: PermissionCheckResult = {
            granted: true,
            reason: `Granted via role '${userRole.role.name}'`,
            source: 'role',
          };
          await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
          return result;
        }
      }

      // No permission found
      const result: PermissionCheckResult = {
        granted: false,
        reason: 'User does not have required permission',
      };
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('Permission check failed:', error);
      return {
        granted: false,
        reason: 'Permission check failed due to error',
      };
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: string, organizationId?: string): Promise<string[]> {
    try {
      const cacheKey = `${CACHE_PREFIX.USER_PERMISSIONS}${userId}:all`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Include system roles (NULL organizationId) and org-specific roles
      const userRoles = await prisma.userRoleAssignment.findMany({
        where: {
          userId,
          AND: [
            organizationId
              ? { OR: [{ organizationId: null }, { organizationId }] }
              : {},
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
        include: {
          role: {
            include: {
              permissions: {
                where: { granted: true },
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // Collect all unique permissions
      const permissionSet = new Set<string>();
      for (const userRole of userRoles) {
        for (const rolePerm of userRole.role.permissions) {
          permissionSet.add(rolePerm.permission.name);
        }
      }

      const permissions = Array.from(permissionSet);
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));
      return permissions;
    } catch (error) {
      logger.error('Get user permissions failed:', error);
      return [];
    }
  }

  /**
   * Assign a role to a user
   */
  static async assignRole(
    userId: string,
    roleId: string,
    organizationId: string,
    assignedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    try {
      await prisma.userRoleAssignment.create({
        data: {
          userId,
          roleId,
          organizationId,
          assignedBy,
          expiresAt,
        },
      });

      // Clear cache
      await this.clearUserCache(userId);

      // Audit log
      await this.logAudit({
        userId: assignedBy,
        organizationId,
        action: 'role_assigned',
        resourceType: 'user_role',
        resourceId: userId,
        metadata: {
          roleId,
          targetUserId: userId,
          expiresAt,
        },
      });

      logger.info(`Role ${roleId} assigned to user ${userId}`);
    } catch (error) {
      logger.error('Assign role failed:', error);
      throw error;
    }
  }

  /**
   * Revoke a role from a user
   */
  static async revokeRole(
    userId: string,
    roleId: string,
    organizationId: string,
    revokedBy: string
  ): Promise<void> {
    try {
      await prisma.userRoleAssignment.deleteMany({
        where: {
          userId,
          roleId,
          organizationId,
        },
      });

      // Clear cache
      await this.clearUserCache(userId);

      // Audit log
      await this.logAudit({
        userId: revokedBy,
        organizationId,
        action: 'role_revoked',
        resourceType: 'user_role',
        resourceId: userId,
        metadata: {
          roleId,
          targetUserId: userId,
        },
      });

      logger.info(`Role ${roleId} revoked from user ${userId}`);
    } catch (error) {
      logger.error('Revoke role failed:', error);
      throw error;
    }
  }

  /**
   * Create a custom role for an organization
   */
  static async createCustomRole(
    organizationId: string,
    name: string,
    description: string,
    permissionNames: string[],
    createdBy: string
  ): Promise<string> {
    try {
      // Create role
      const role = await prisma.role.create({
        data: {
          organizationId,
          name,
          description,
          isSystem: false,
          isCustom: true,
          priority: 50, // Default priority for custom roles
        },
      });

      // Assign permissions
      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName },
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
              granted: true,
            },
          });
        }
      }

      // Audit log
      await this.logAudit({
        userId: createdBy,
        organizationId,
        action: 'role_created',
        resourceType: 'role',
        resourceId: role.id,
        metadata: {
          name,
          permissions: permissionNames,
        },
      });

      logger.info(`Custom role '${name}' created for organization ${organizationId}`);
      return role.id;
    } catch (error) {
      logger.error('Create custom role failed:', error);
      throw error;
    }
  }

  /**
   * Update role permissions
   */
  static async updateRolePermissions(
    roleId: string,
    permissionNames: string[],
    updatedBy: string,
    organizationId?: string
  ): Promise<void> {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystem) {
        throw new Error('Cannot modify system roles');
      }

      // Remove all existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      // Add new permissions
      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName },
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              roleId,
              permissionId: permission.id,
              granted: true,
            },
          });
        }
      }

      // Clear cache for all users with this role
      const usersWithRole = await prisma.userRoleAssignment.findMany({
        where: { roleId },
        select: { userId: true },
      });

      for (const { userId } of usersWithRole) {
        await this.clearUserCache(userId);
      }

      // Audit log
      await this.logAudit({
        userId: updatedBy,
        organizationId: organizationId || role.organizationId,
        action: 'role_updated',
        resourceType: 'role',
        resourceId: roleId,
        metadata: {
          permissions: permissionNames,
        },
      });

      logger.info(`Role ${roleId} permissions updated`);
    } catch (error) {
      logger.error('Update role permissions failed:', error);
      throw error;
    }
  }

  /**
   * Delete a custom role
   */
  static async deleteRole(roleId: string, deletedBy: string, organizationId?: string): Promise<void> {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystem) {
        throw new Error('Cannot delete system roles');
      }

      // Clear cache for all users with this role
      const usersWithRole = await prisma.userRoleAssignment.findMany({
        where: { roleId },
        select: { userId: true },
      });

      for (const { userId } of usersWithRole) {
        await this.clearUserCache(userId);
      }

      // Delete role (cascade will handle permissions and assignments)
      await prisma.role.delete({
        where: { id: roleId },
      });

      // Audit log
      await this.logAudit({
        userId: deletedBy,
        organizationId: organizationId || role.organizationId,
        action: 'role_deleted',
        resourceType: 'role',
        resourceId: roleId,
        metadata: {
          name: role.name,
        },
      });

      logger.info(`Role ${roleId} deleted`);
    } catch (error) {
      logger.error('Delete role failed:', error);
      throw error;
    }
  }

  /**
   * Grant resource-level permission to a user
   */
  static async grantResourcePermission(
    userId: string,
    permissionName: string,
    resourceType: string,
    resourceId: string,
    organizationId: string,
    grantedBy: string
  ): Promise<void> {
    try {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (!permission) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      await prisma.resourcePermission.upsert({
        where: {
          userId_permissionId_resourceType_resourceId: {
            userId,
            permissionId: permission.id,
            resourceType,
            resourceId,
          },
        },
        create: {
          userId,
          permissionId: permission.id,
          resourceType,
          resourceId,
          organizationId,
          granted: true,
        },
        update: {
          granted: true,
        },
      });

      // Clear cache
      await this.clearUserCache(userId);

      // Audit log
      await this.logAudit({
        userId: grantedBy,
        organizationId,
        action: 'resource_permission_granted',
        resourceType: 'resource_permission',
        resourceId: `${resourceType}:${resourceId}`,
        metadata: {
          targetUserId: userId,
          permission: permissionName,
          resourceType,
          resourceId,
        },
      });

      logger.info(`Resource permission ${permissionName} granted to user ${userId}`);
    } catch (error) {
      logger.error('Grant resource permission failed:', error);
      throw error;
    }
  }

  /**
   * Revoke resource-level permission from a user
   */
  static async revokeResourcePermission(
    userId: string,
    permissionName: string,
    resourceType: string,
    resourceId: string,
    organizationId: string,
    revokedBy: string
  ): Promise<void> {
    try {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (!permission) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      await prisma.resourcePermission.deleteMany({
        where: {
          userId,
          permissionId: permission.id,
          resourceType,
          resourceId,
        },
      });

      // Clear cache
      await this.clearUserCache(userId);

      // Audit log
      await this.logAudit({
        userId: revokedBy,
        organizationId,
        action: 'resource_permission_revoked',
        resourceType: 'resource_permission',
        resourceId: `${resourceType}:${resourceId}`,
        metadata: {
          targetUserId: userId,
          permission: permissionName,
          resourceType,
          resourceId,
        },
      });

      logger.info(`Resource permission ${permissionName} revoked from user ${userId}`);
    } catch (error) {
      logger.error('Revoke resource permission failed:', error);
      throw error;
    }
  }

  /**
   * Get all roles for a user
   */
  static async getUserRoles(userId: string, organizationId?: string) {
    // Include system roles (NULL organizationId) and org-specific roles
    return prisma.userRoleAssignment.findMany({
      where: {
        userId,
        AND: [
          organizationId
            ? { OR: [{ organizationId: null }, { organizationId }] }
            : {},
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all roles in an organization
   */
  static async getOrganizationRoles(organizationId: string) {
    return prisma.role.findMany({
      where: {
        OR: [
          { organizationId },
          { isSystem: true, organizationId: null }, // Include system roles
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
      orderBy: {
        priority: 'desc',
      },
    });
  }

  /**
   * Clear user permission cache
   */
  private static async clearUserCache(userId: string): Promise<void> {
    const pattern = `${CACHE_PREFIX.USER_PERMISSIONS}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    const resourcePattern = `${CACHE_PREFIX.RESOURCE_PERMISSIONS}${userId}:*`;
    const resourceKeys = await redis.keys(resourcePattern);
    if (resourceKeys.length > 0) {
      await redis.del(...resourceKeys);
    }
  }

  /**
   * Log audit event
   */
  private static async logAudit(data: {
    userId: string;
    organizationId?: string | null;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          action: data.action,
          actionLabel: data.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          status: 'success',
          metadata: data.metadata || {},
          isSoc2Relevant: true, // RBAC changes are always SOC2 relevant
        },
      });
    } catch (error) {
      logger.error('Audit logging failed:', error);
    }
  }
}

export default RBACService;
