/**
 * Admin Routes Integration Tests
 * REAL integration tests that verify Super Admin Dashboard API endpoints
 * NO MOCKS for business logic - uses actual database and middleware
 */

import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient, SystemRole, OrgTier, OrgStatus, SubscriptionStatus } from '@prisma/client';
import adminRouter from '../index';
import jwt from 'jsonwebtoken';

// REAL database connection - NO MOCKS
const prisma = new PrismaClient();

// Helper to create test JWT token
function createTestToken(user: { id: string; email: string; systemRole?: SystemRole | null }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
      role: 'admin',
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

describe('Admin Routes Integration Tests', () => {
  let app: Express;
  let superAdminUser: any;
  let regularUser: any;
  let testOrganization: any;
  let superAdminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    // Setup Express app with real admin routes
    app = express();
    app.use(express.json());

    // Mock auth middleware to attach user to request
    app.use((req: any, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
          req.user = {
            id: decoded.id,
            email: decoded.email,
            organizationId: decoded.organizationId,
            role: decoded.role,
          };
        } catch (err) {
          // Invalid token
        }
      }
      next();
    });

    app.use('/admin', adminRouter);

    // Create test users in REAL database
    const testEmail = `super-admin-${Date.now()}@test.com`;
    const regularEmail = `regular-user-${Date.now()}@test.com`;

    // Create test organization
    testOrganization = await prisma.organization.create({
      data: {
        name: `Test Org ${Date.now()}`,
        slug: `test-org-${Date.now()}`,
        tier: 'pro' as OrgTier,
        status: 'active' as OrgStatus,
        settings: {},
        quotas: {},
        features: {},
      },
    });

    // Create super admin user
    superAdminUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hashed-password',
        firstName: 'Super',
        lastName: 'Admin',
        systemRole: 'super_admin' as SystemRole,
        organizationId: testOrganization.id,
        emailVerified: true,
      },
    });

    // Create regular user (no system role)
    regularUser = await prisma.user.create({
      data: {
        email: regularEmail,
        passwordHash: 'hashed-password',
        firstName: 'Regular',
        lastName: 'User',
        systemRole: null,
        organizationId: testOrganization.id,
        emailVerified: true,
      },
    });

    // Generate JWT tokens
    superAdminToken = createTestToken({
      id: superAdminUser.id,
      email: superAdminUser.email,
      systemRole: 'super_admin',
    });

    regularUserToken = createTestToken({
      id: regularUser.id,
      email: regularUser.email,
      systemRole: null,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: {
        id: { in: [superAdminUser.id, regularUser.id] },
      },
    });

    await prisma.organization.deleteMany({
      where: { id: testOrganization.id },
    });

    await prisma.$disconnect();
  });

  describe('Admin Authentication Middleware', () => {
    it('should block access without authentication', async () => {
      const response = await request(app)
        .get('/admin/organizations')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should block access for non-admin users', async () => {
      const response = await request(app)
        .get('/admin/organizations')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin privileges required');
    });

    it('should allow access for super admin users', async () => {
      const response = await request(app)
        .get('/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /admin/organizations', () => {
    it('should return list of organizations with real database data', async () => {
      const response = await request(app)
        .get('/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify pagination
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.total).toBeGreaterThan(0);

      // Verify organization data structure
      const org = response.body.data[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('tier');
      expect(org).toHaveProperty('status');
      expect(org).toHaveProperty('userCount');
    });

    it('should support search filtering', async () => {
      const response = await request(app)
        .get('/admin/organizations?search=' + testOrganization.name.substring(0, 10))
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/admin/organizations?page=1&limit=5')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /admin/users', () => {
    it('should return list of users with real database data', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify user data structure
      const user = response.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('organization');
    });

    it('should filter by organization', async () => {
      const response = await request(app)
        .get(`/admin/users?organizationId=${testOrganization.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // Our test users

      // All users should belong to test organization
      response.body.data.forEach((user: any) => {
        expect(user.organization.id).toBe(testOrganization.id);
      });
    });

    it('should filter by system role', async () => {
      const response = await request(app)
        .get('/admin/users?systemRole=super_admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // All returned users should be super admins
      response.body.data.forEach((user: any) => {
        expect(user.systemRole).toBe('super_admin');
      });
    });
  });

  describe('GET /admin/subscriptions', () => {
    let testSubscription: any;

    beforeAll(async () => {
      // Create a test subscription
      testSubscription = await prisma.subscription.create({
        data: {
          organizationId: testOrganization.id,
          tier: 'pro',
          status: 'active' as SubscriptionStatus,
          amount: 9900, // $99.00
          currency: 'USD',
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });

    afterAll(async () => {
      if (testSubscription) {
        await prisma.subscription.delete({
          where: { id: testSubscription.id },
        });
      }
    });

    it('should return list of subscriptions with real database data', async () => {
      const response = await request(app)
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify subscription data structure
      const subscription = response.body.data.find((s: any) => s.id === testSubscription.id);
      expect(subscription).toBeDefined();
      expect(subscription).toHaveProperty('tier');
      expect(subscription).toHaveProperty('status');
      expect(subscription).toHaveProperty('amount');
      expect(subscription).toHaveProperty('organization');
      expect(subscription.organization.id).toBe(testOrganization.id);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/admin/subscriptions?status=active')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // All subscriptions should be active
      response.body.data.forEach((sub: any) => {
        expect(sub.status).toBe('active');
      });
    });

    it('should filter by tier', async () => {
      const response = await request(app)
        .get('/admin/subscriptions?tier=pro')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // All subscriptions should be pro tier
      response.body.data.forEach((sub: any) => {
        expect(sub.tier).toBe('pro');
      });
    });
  });

  describe('POST /admin/organizations', () => {
    it('should create a new organization', async () => {
      const newOrgData = {
        name: `Created Org ${Date.now()}`,
        slug: `created-org-${Date.now()}`,
        domain: 'created.example.com',
        tier: 'business',
        settings: { feature_x: true },
        quotas: { max_users: 100 },
        features: { analytics: true },
      };

      const response = await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(newOrgData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(newOrgData.name);
      expect(response.body.data.slug).toBe(newOrgData.slug);
      expect(response.body.data.tier).toBe(newOrgData.tier);

      // Cleanup
      await prisma.organization.delete({
        where: { id: response.body.data.id },
      });
    });

    it('should reject duplicate slug', async () => {
      const response = await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Test',
          slug: testOrganization.slug, // Using existing slug
          tier: 'free',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PATCH /admin/users/:id/system-role', () => {
    it('should update user system role', async () => {
      const response = await request(app)
        .patch(`/admin/users/${regularUser.id}/system-role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ systemRole: 'viewer' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.systemRole).toBe('viewer');

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: regularUser.id },
      });
      expect(updatedUser?.systemRole).toBe('viewer');

      // Cleanup - reset to null
      await prisma.user.update({
        where: { id: regularUser.id },
        data: { systemRole: null },
      });
    });

    it('should reject invalid system role', async () => {
      const response = await request(app)
        .patch(`/admin/users/${regularUser.id}/system-role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ systemRole: 'invalid_role' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid system role');
    });
  });

  describe('Permission-based Access Control', () => {
    let viewerUser: any;
    let viewerToken: string;

    beforeAll(async () => {
      // Create viewer user
      viewerUser = await prisma.user.create({
        data: {
          email: `viewer-${Date.now()}@test.com`,
          passwordHash: 'hashed',
          firstName: 'Viewer',
          lastName: 'User',
          systemRole: 'viewer' as SystemRole,
          organizationId: testOrganization.id,
          emailVerified: true,
        },
      });

      viewerToken = createTestToken({
        id: viewerUser.id,
        email: viewerUser.email,
        systemRole: 'viewer',
      });
    });

    afterAll(async () => {
      if (viewerUser) {
        await prisma.user.delete({
          where: { id: viewerUser.id },
        });
      }
    });

    it('viewer should be able to read organizations', async () => {
      const response = await request(app)
        .get('/admin/organizations')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('viewer should NOT be able to create organizations', async () => {
      const response = await request(app)
        .post('/admin/organizations')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Test',
          slug: 'test-' + Date.now(),
          tier: 'free',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Permission denied');
    });
  });
});
