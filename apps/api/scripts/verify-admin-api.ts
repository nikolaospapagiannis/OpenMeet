#!/usr/bin/env ts-node
/**
 * Super Admin API Manual Verification Script
 *
 * This script makes REAL HTTP requests to verify admin endpoints are working
 * Run with: npx ts-node scripts/verify-admin-api.ts
 *
 * Prerequisites:
 * - API server must be running on PORT (default 4000)
 * - Database must be connected
 * - At least one super admin user must exist
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient, SystemRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const prisma = new PrismaClient();

// Results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: any) {
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${name} - ${message}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
  results.push({ name, passed, message, details });
}

async function createTestToken(): Promise<{ token: string; userId: string }> {
  // Find or create super admin user
  let superAdmin = await prisma.user.findFirst({
    where: { systemRole: 'super_admin' },
  });

  if (!superAdmin) {
    console.log('⚠️  No super admin found. Creating test super admin...');

    // Find or create test organization
    let testOrg = await prisma.organization.findFirst({
      where: { slug: 'test-admin-verification' },
    });

    if (!testOrg) {
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Admin Verification Org',
          slug: 'test-admin-verification',
          tier: 'enterprise',
          status: 'active',
          settings: {},
          quotas: {},
          features: {},
        },
      });
    }

    superAdmin = await prisma.user.create({
      data: {
        email: `verify-admin-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        firstName: 'Verification',
        lastName: 'Admin',
        systemRole: 'super_admin' as SystemRole,
        organizationId: testOrg.id,
        emailVerified: true,
      },
    });

    console.log(`   Created super admin: ${superAdmin.email}`);
  }

  const token = jwt.sign(
    {
      id: superAdmin.id,
      email: superAdmin.email,
      systemRole: superAdmin.systemRole,
      role: 'admin',
      sessionId: 'verification-session',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { token, userId: superAdmin.id };
}

async function verifyHealthCheck(client: AxiosInstance): Promise<void> {
  try {
    const response = await client.get('/health');
    const healthy = response.status === 200 && response.data.status === 'healthy';
    logTest(
      'Health Check',
      healthy,
      healthy ? `API healthy - ${response.data.version}` : 'API unhealthy',
      response.data.services
    );
  } catch (error: any) {
    logTest('Health Check', false, `Failed: ${error.message}`);
  }
}

async function verifyDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const orgCount = await prisma.organization.count();
    const userCount = await prisma.user.count();
    logTest(
      'Database Connection',
      true,
      `Connected - ${orgCount} orgs, ${userCount} users`,
      { organizations: orgCount, users: userCount }
    );
  } catch (error: any) {
    logTest('Database Connection', false, `Failed: ${error.message}`);
  }
}

async function verifyAdminAuth(client: AxiosInstance, token: string): Promise<void> {
  // Test without token
  try {
    await client.get('/api/admin/organizations');
    logTest('Admin Auth Middleware', false, 'Should reject requests without token');
  } catch (error: any) {
    const blocked = error.response?.status === 401;
    logTest(
      'Admin Auth Middleware',
      blocked,
      blocked ? '403 for non-admin (correct)' : `Unexpected status: ${error.response?.status}`
    );
  }

  // Test with token
  try {
    const response = await client.get('/api/admin/organizations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    logTest(
      'Admin Auth Middleware',
      response.status === 200,
      'Authenticated access allowed',
      { dataReceived: !!response.data }
    );
  } catch (error: any) {
    logTest('Admin Auth Middleware', false, `Failed: ${error.message}`);
  }
}

async function verifyOrganizationsEndpoint(client: AxiosInstance, token: string): Promise<void> {
  try {
    const response = await client.get('/api/admin/organizations', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const success = response.status === 200 &&
                   response.data.success &&
                   Array.isArray(response.data.data);

    logTest(
      'GET /admin/organizations',
      success,
      success
        ? `200 OK (${response.data.data.length} orgs returned)`
        : 'Failed to return organizations',
      {
        count: response.data.data?.length,
        hasPagination: !!response.data.pagination,
        sampleOrg: response.data.data?.[0]
          ? {
              id: response.data.data[0].id,
              name: response.data.data[0].name,
              tier: response.data.data[0].tier,
            }
          : null,
      }
    );
  } catch (error: any) {
    logTest('GET /admin/organizations', false, `Failed: ${error.message}`);
  }
}

async function verifyUsersEndpoint(client: AxiosInstance, token: string): Promise<void> {
  try {
    const response = await client.get('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const success = response.status === 200 &&
                   response.data.success &&
                   Array.isArray(response.data.data);

    logTest(
      'GET /admin/users',
      success,
      success
        ? `200 OK (${response.data.data.length} users returned)`
        : 'Failed to return users',
      {
        count: response.data.data?.length,
        hasPagination: !!response.data.pagination,
        sampleUser: response.data.data?.[0]
          ? {
              id: response.data.data[0].id,
              email: response.data.data[0].email,
              systemRole: response.data.data[0].systemRole,
            }
          : null,
      }
    );
  } catch (error: any) {
    logTest('GET /admin/users', false, `Failed: ${error.message}`);
  }
}

async function verifySubscriptionsEndpoint(client: AxiosInstance, token: string): Promise<void> {
  try {
    const response = await client.get('/api/admin/subscriptions', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const success = response.status === 200 &&
                   response.data.success &&
                   Array.isArray(response.data.data);

    logTest(
      'GET /admin/subscriptions',
      success,
      success
        ? `200 OK (${response.data.data.length} subs returned)`
        : 'Failed to return subscriptions',
      {
        count: response.data.data?.length,
        hasPagination: !!response.data.pagination,
      }
    );
  } catch (error: any) {
    logTest('GET /admin/subscriptions', false, `Failed: ${error.message}`);
  }
}

async function verifyCreateOrganization(client: AxiosInstance, token: string): Promise<void> {
  const testOrgData = {
    name: `Verification Org ${Date.now()}`,
    slug: `verify-org-${Date.now()}`,
    domain: 'verify.example.com',
    tier: 'pro',
  };

  try {
    const response = await client.post('/api/admin/organizations', testOrgData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const success = response.status === 201 && response.data.success;

    logTest(
      'POST /admin/organizations',
      success,
      success ? 'Organization created successfully' : 'Failed to create organization',
      { createdOrg: response.data.data }
    );

    // Cleanup - delete created org
    if (success && response.data.data?.id) {
      await prisma.organization.delete({
        where: { id: response.data.data.id },
      });
    }
  } catch (error: any) {
    logTest('POST /admin/organizations', false, `Failed: ${error.response?.data?.error || error.message}`);
  }
}

async function verifyUpdateUserRole(client: AxiosInstance, token: string, userId: string): Promise<void> {
  // Create a test user
  let testUser: any;
  try {
    const testOrg = await prisma.organization.findFirst();
    if (!testOrg) {
      logTest('PATCH /admin/users/:id/system-role', false, 'No organization found for test user');
      return;
    }

    testUser = await prisma.user.create({
      data: {
        email: `role-test-${Date.now()}@test.com`,
        passwordHash: 'test',
        firstName: 'Role',
        lastName: 'Test',
        systemRole: null,
        organizationId: testOrg.id,
        emailVerified: true,
      },
    });

    const response = await client.patch(
      `/api/admin/users/${testUser.id}/system-role`,
      { systemRole: 'viewer' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const success = response.status === 200 &&
                   response.data.success &&
                   response.data.data.systemRole === 'viewer';

    logTest(
      'PATCH /admin/users/:id/system-role',
      success,
      success ? 'User role updated successfully' : 'Failed to update role',
      { updatedUser: response.data.data }
    );
  } catch (error: any) {
    logTest('PATCH /admin/users/:id/system-role', false, `Failed: ${error.response?.data?.error || error.message}`);
  } finally {
    // Cleanup
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  }
}

async function verifyPermissionDenial(client: AxiosInstance): Promise<void> {
  // Create a non-admin user token
  const testOrg = await prisma.organization.findFirst();
  if (!testOrg) {
    logTest('Permission Denial Check', false, 'No organization found');
    return;
  }

  let testUser: any;
  try {
    testUser = await prisma.user.create({
      data: {
        email: `non-admin-${Date.now()}@test.com`,
        passwordHash: 'test',
        firstName: 'Non',
        lastName: 'Admin',
        systemRole: null, // No system role
        organizationId: testOrg.id,
        emailVerified: true,
      },
    });

    const nonAdminToken = jwt.sign(
      {
        id: testUser.id,
        email: testUser.email,
        systemRole: null,
        role: 'user',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Try to access admin endpoint
    try {
      await client.get('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${nonAdminToken}` },
      });
      logTest('Permission Denial Check', false, 'Non-admin was allowed access (security issue!)');
    } catch (error: any) {
      const blocked = error.response?.status === 403;
      logTest(
        'Permission Denial Check',
        blocked,
        blocked ? '403 for non-admin user (correct)' : `Unexpected status: ${error.response?.status}`
      );
    }
  } finally {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  }
}

async function main() {
  console.log('\n=== SUPER ADMIN API VERIFICATION ===\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const client = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    validateStatus: () => true, // Don't throw on any status
  });

  // Step 1: Verify infrastructure
  console.log('--- Infrastructure Checks ---');
  await verifyHealthCheck(client);
  await verifyDatabaseConnection();

  // Step 2: Create test token
  console.log('\n--- Authentication Setup ---');
  const { token, userId } = await createTestToken();
  console.log(`✓ Test token created for user: ${userId}\n`);

  // Step 3: Verify auth middleware
  console.log('--- Admin Authentication ---');
  await verifyAdminAuth(client, token);
  await verifyPermissionDenial(client);

  // Step 4: Verify read endpoints
  console.log('\n--- Read Endpoints ---');
  await verifyOrganizationsEndpoint(client, token);
  await verifyUsersEndpoint(client, token);
  await verifySubscriptionsEndpoint(client, token);

  // Step 5: Verify write endpoints
  console.log('\n--- Write Endpoints ---');
  await verifyCreateOrganization(client, token);
  await verifyUpdateUserRole(client, token, userId);

  // Summary
  console.log('\n=== VERIFICATION SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
    console.log();
  }

  await prisma.$disconnect();

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run verification
main().catch((error) => {
  console.error('\n❌ VERIFICATION SCRIPT ERROR:', error);
  prisma.$disconnect();
  process.exit(1);
});
