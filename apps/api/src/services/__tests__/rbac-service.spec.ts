/**
 * RBAC Service Tests
 * Comprehensive tests for Role-Based Access Control system
 *
 * Tests:
 * - RBAC initialization (permissions and roles)
 * - Permission checking (role-based and resource-level)
 * - Role assignment and revocation
 * - Custom role creation
 * - Resource permissions
 * - Permission caching (Redis)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import RBACService from '../rbac-service';
import Redis from 'ioredis';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://openmeet:password@localhost:5432/openmeet_db',
    },
  },
});

const redis = new Redis({
  host: 'localhost',
  port: 6380,
  password: 'redis123',
});

describe('RBAC Service', () => {
  let testOrg: any;
  let testUser: any;
  let testUser2: any;
  let ownerRole: any;
  let memberRole: any;

  beforeAll(async () => {
    // Wait for database connection
    await prisma.$connect();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Initialize RBAC system (creates permissions and default roles)
    console.log('Initializing RBAC system...');
    await RBACService.initialize();

    // Create test organization
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org-' + Date.now(),
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
      },
    });

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        organizationId: testOrg.id,
        role: 'user',
        emailVerified: true,
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `test-user-2-${Date.now()}@example.com`,
        organizationId: testOrg.id,
        role: 'user',
        emailVerified: true,
      },
    });

    // Get system roles
    ownerRole = await prisma.role.findFirst({
      where: { name: 'Owner', isSystem: true },
    });

    memberRole = await prisma.role.findFirst({
      where: { name: 'Member', isSystem: true },
    });

    console.log('Test setup complete');
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testUser) {
      await prisma.userRoleAssignment.deleteMany({ where: { userId: testUser.id } });
      await prisma.resourcePermission.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }

    if (testUser2) {
      await prisma.userRoleAssignment.deleteMany({ where: { userId: testUser2.id } });
      await prisma.resourcePermission.deleteMany({ where: { userId: testUser2.id } });
      await prisma.user.delete({ where: { id: testUser2.id } });
    }

    if (testOrg) {
      // Delete custom roles for this org
      await prisma.role.deleteMany({ where: { organizationId: testOrg.id } });
      await prisma.organization.delete({ where: { id: testOrg.id } });
    }

    await prisma.$disconnect();
    await redis.quit();
  });

  beforeEach(async () => {
    // Clear Redis cache before each test
    await redis.flushdb();
  });

  describe('Initialization', () => {
    it('should create all system permissions', async () => {
      const permissions = await prisma.permission.findMany({
        where: { isSystem: true },
      });

      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some((p) => p.name === 'meetings.create')).toBe(true);
      expect(permissions.some((p) => p.name === 'meetings.read')).toBe(true);
      expect(permissions.some((p) => p.name === 'billing.manage')).toBe(true);
    });

    it('should create default system roles', async () => {
      const roles = await prisma.role.findMany({
        where: { isSystem: true },
      });

      expect(roles.length).toBeGreaterThanOrEqual(3);
      expect(roles.some((r) => r.name === 'Owner')).toBe(true);
      expect(roles.some((r) => r.name === 'Admin')).toBe(true);
      expect(roles.some((r) => r.name === 'Member')).toBe(true);
      expect(roles.some((r) => r.name === 'Guest')).toBe(true);
    });

    it('should assign permissions to Owner role', async () => {
      const ownerRoleWithPerms = await prisma.role.findFirst({
        where: { name: 'Owner', isSystem: true },
        include: { permissions: true },
      });

      expect(ownerRoleWithPerms).toBeTruthy();
      expect(ownerRoleWithPerms!.permissions.length).toBeGreaterThan(50);
    });

    it('should assign limited permissions to Guest role', async () => {
      const guestRole = await prisma.role.findFirst({
        where: { name: 'Guest', isSystem: true },
        include: { permissions: true },
      });

      expect(guestRole).toBeTruthy();
      expect(guestRole!.permissions.length).toBeLessThan(15);
      expect(guestRole!.permissions.every((p) => p.granted)).toBe(true);
    });
  });

  describe('Role Assignment', () => {
    it('should assign role to user', async () => {
      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );

      const assignments = await prisma.userRoleAssignment.findMany({
        where: { userId: testUser.id, roleId: memberRole!.id },
      });

      expect(assignments.length).toBe(1);
      expect(assignments[0].organizationId).toBe(testOrg.id);
    });

    it('should revoke role from user', async () => {
      // First assign
      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );

      // Then revoke
      await RBACService.revokeRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );

      const assignments = await prisma.userRoleAssignment.findMany({
        where: { userId: testUser.id, roleId: memberRole!.id },
      });

      expect(assignments.length).toBe(0);
    });

    it('should assign role with expiration', async () => {
      const expiresAt = new Date(Date.now() + 86400000); // 24 hours from now

      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id,
        expiresAt
      );

      const assignment = await prisma.userRoleAssignment.findFirst({
        where: { userId: testUser.id, roleId: memberRole!.id },
      });

      expect(assignment).toBeTruthy();
      expect(assignment!.expiresAt).toBeTruthy();
      expect(assignment!.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Permission Checking', () => {
    beforeEach(async () => {
      // Assign Member role to testUser
      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );
    });

    it('should grant permission from role', async () => {
      const result = await RBACService.checkPermission(
        testUser.id,
        'meetings.read',
        undefined,
        undefined,
        testOrg.id
      );

      expect(result.granted).toBe(true);
      expect(result.source).toBe('role');
      expect(result.reason).toContain('Member');
    });

    it('should deny permission not in role', async () => {
      const result = await RBACService.checkPermission(
        testUser.id,
        'billing.manage',
        undefined,
        undefined,
        testOrg.id
      );

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('does not have');
    });

    it('should deny permission for non-existent permission', async () => {
      const result = await RBACService.checkPermission(
        testUser.id,
        'fake.permission',
        undefined,
        undefined,
        testOrg.id
      );

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    it('should cache permission check results', async () => {
      // First check
      const result1 = await RBACService.checkPermission(
        testUser.id,
        'meetings.read',
        undefined,
        undefined,
        testOrg.id
      );

      // Check Redis cache
      const cacheKey = `rbac:user_perms:${testUser.id}:meetings.read`;
      const cached = await redis.get(cacheKey);

      expect(cached).toBeTruthy();
      expect(JSON.parse(cached!).granted).toBe(true);

      // Second check should use cache
      const result2 = await RBACService.checkPermission(
        testUser.id,
        'meetings.read',
        undefined,
        undefined,
        testOrg.id
      );

      expect(result2.granted).toBe(result1.granted);
    });
  });

  describe('Resource-Level Permissions', () => {
    let testMeeting: any;

    beforeEach(async () => {
      // Create test meeting
      testMeeting = await prisma.meeting.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          title: 'Test Meeting',
          status: 'scheduled',
        },
      });

      // Assign Member role
      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );
    });

    afterEach(async () => {
      if (testMeeting) {
        await prisma.meeting.delete({ where: { id: testMeeting.id } });
      }
    });

    it('should grant resource-level permission', async () => {
      await RBACService.grantResourcePermission(
        testUser2.id,
        'meetings.read',
        'meetings',
        testMeeting.id,
        testOrg.id,
        testUser.id
      );

      const resourcePerms = await prisma.resourcePermission.findMany({
        where: {
          userId: testUser2.id,
          resourceId: testMeeting.id,
        },
      });

      expect(resourcePerms.length).toBe(1);
      expect(resourcePerms[0].granted).toBe(true);
    });

    it('should check resource-level permission', async () => {
      // Grant resource permission
      await RBACService.grantResourcePermission(
        testUser2.id,
        'meetings.read',
        'meetings',
        testMeeting.id,
        testOrg.id,
        testUser.id
      );

      // Check permission
      const result = await RBACService.checkPermission(
        testUser2.id,
        'meetings.read',
        testMeeting.id,
        'meetings',
        testOrg.id
      );

      expect(result.granted).toBe(true);
      expect(result.source).toBe('resource');
    });

    it('should revoke resource-level permission', async () => {
      // Grant then revoke
      await RBACService.grantResourcePermission(
        testUser2.id,
        'meetings.read',
        'meetings',
        testMeeting.id,
        testOrg.id,
        testUser.id
      );

      await RBACService.revokeResourcePermission(
        testUser2.id,
        'meetings.read',
        'meetings',
        testMeeting.id,
        testOrg.id,
        testUser.id
      );

      const resourcePerms = await prisma.resourcePermission.findMany({
        where: {
          userId: testUser2.id,
          resourceId: testMeeting.id,
        },
      });

      expect(resourcePerms.length).toBe(0);
    });

    it('should prioritize resource permission over role permission', async () => {
      // User has Member role with meetings.read
      await RBACService.assignRole(
        testUser2.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );

      // But deny at resource level
      const permission = await prisma.permission.findUnique({
        where: { name: 'meetings.read' },
      });

      await prisma.resourcePermission.create({
        data: {
          userId: testUser2.id,
          permissionId: permission!.id,
          resourceType: 'meetings',
          resourceId: testMeeting.id,
          organizationId: testOrg.id,
          granted: false, // DENY
        },
      });

      // Check should deny despite role permission
      const result = await RBACService.checkPermission(
        testUser2.id,
        'meetings.read',
        testMeeting.id,
        'meetings',
        testOrg.id
      );

      expect(result.granted).toBe(false);
      expect(result.source).toBe('resource');
    });
  });

  describe('Custom Roles', () => {
    it('should create custom role', async () => {
      const roleId = await RBACService.createCustomRole(
        testOrg.id,
        'Custom Viewer',
        'Can view meetings and transcripts',
        ['meetings.read', 'transcripts.read', 'comments.read'],
        testUser.id
      );

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: { include: { permission: true } } },
      });

      expect(role).toBeTruthy();
      expect(role!.isCustom).toBe(true);
      expect(role!.isSystem).toBe(false);
      expect(role!.organizationId).toBe(testOrg.id);
      expect(role!.permissions.length).toBe(3);
    });

    it('should update custom role permissions', async () => {
      // Create role
      const roleId = await RBACService.createCustomRole(
        testOrg.id,
        'Custom Editor',
        'Can edit content',
        ['meetings.read', 'meetings.update'],
        testUser.id
      );

      // Update permissions
      await RBACService.updateRolePermissions(
        roleId,
        ['meetings.read', 'meetings.update', 'transcripts.edit'],
        testUser.id,
        testOrg.id
      );

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });

      expect(role!.permissions.length).toBe(3);
    });

    it('should not allow modifying system roles', async () => {
      await expect(
        RBACService.updateRolePermissions(
          ownerRole!.id,
          ['meetings.read'],
          testUser.id,
          testOrg.id
        )
      ).rejects.toThrow('Cannot modify system roles');
    });

    it('should delete custom role', async () => {
      const roleId = await RBACService.createCustomRole(
        testOrg.id,
        'Temporary Role',
        'Will be deleted',
        ['meetings.read'],
        testUser.id
      );

      await RBACService.deleteRole(roleId, testUser.id, testOrg.id);

      const role = await prisma.role.findUnique({ where: { id: roleId } });
      expect(role).toBeNull();
    });

    it('should not allow deleting system roles', async () => {
      await expect(
        RBACService.deleteRole(ownerRole!.id, testUser.id, testOrg.id)
      ).rejects.toThrow('Cannot delete system roles');
    });
  });

  describe('User Permissions', () => {
    beforeEach(async () => {
      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );
    });

    it('should get all user permissions', async () => {
      const permissions = await RBACService.getUserPermissions(
        testUser.id,
        testOrg.id
      );

      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain('meetings.read');
      expect(permissions).toContain('meetings.create');
    });

    it('should get all user roles', async () => {
      const roles = await RBACService.getUserRoles(testUser.id, testOrg.id);

      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0].role.name).toBe('Member');
    });

    it('should get all organization roles', async () => {
      const roles = await RBACService.getOrganizationRoles(testOrg.id);

      expect(roles.length).toBeGreaterThan(0);
      // Should include system roles
      expect(roles.some((r) => r.name === 'Owner')).toBe(true);
      expect(roles.some((r) => r.name === 'Member')).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    beforeEach(async () => {
      // Clear audit logs
      await prisma.auditLog.deleteMany({
        where: { organizationId: testOrg.id },
      });
    });

    it('should log role assignment', async () => {
      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );

      const logs = await prisma.auditLog.findMany({
        where: {
          action: 'role_assigned',
          organizationId: testOrg.id,
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].isSoc2Relevant).toBe(true);
    });

    it('should log role revocation', async () => {
      await RBACService.assignRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );

      await RBACService.revokeRole(
        testUser.id,
        memberRole!.id,
        testOrg.id,
        testUser.id
      );

      const logs = await prisma.auditLog.findMany({
        where: {
          action: 'role_revoked',
          organizationId: testOrg.id,
        },
      });

      expect(logs.length).toBeGreaterThan(0);
    });

    it('should log custom role creation', async () => {
      await RBACService.createCustomRole(
        testOrg.id,
        'Test Role',
        'Test',
        ['meetings.read'],
        testUser.id
      );

      const logs = await prisma.auditLog.findMany({
        where: {
          action: 'role_created',
          organizationId: testOrg.id,
        },
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
