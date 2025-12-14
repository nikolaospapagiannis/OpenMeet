import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

// Test configuration
const API_URL = process.env.E2E_API_URL || 'http://localhost:4100';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4200';

// Test user credentials (seeded in database)
export const TEST_USER = {
  email: 'admin@acme.com',
  password: 'Demo123456!',
  firstName: 'Admin',
  lastName: 'User',
};

// Interface for API client
interface ApiClient {
  get: (endpoint: string) => Promise<any>;
  post: (endpoint: string, data?: any) => Promise<any>;
  delete: (endpoint: string) => Promise<any>;
  uploadFile: (endpoint: string, filePath: string, fieldName: string) => Promise<any>;
}

// Extended test fixture types
interface TestFixtures {
  authenticatedPage: Page;
  apiClient: ApiClient;
  testData: {
    user: typeof TEST_USER;
    apiUrl: string;
    baseUrl: string;
  };
}

// Create authenticated page fixture
export const test = base.extend<TestFixtures>({
  // Authenticated page fixture - logs in and maintains session
  authenticatedPage: async ({ page, context }, use) => {
    // Navigate to login
    await page.goto('/login');

    // Fill login form
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Submit form
    await page.locator('button[type="submit"]').filter({ hasText: /sign in|login/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|meetings|home)/i, { timeout: 15000 });

    // Verify authentication succeeded
    const cookies = await context.cookies();
    const hasAuth = cookies.some(c => c.name === 'access_token' || c.name === 'refresh_token');
    if (!hasAuth) {
      throw new Error('Authentication failed - no auth cookies set');
    }

    // Use the authenticated page
    await use(page);
  },

  // API client for direct API calls in tests
  apiClient: async ({ context }, use) => {
    let authToken: string | null = null;

    // Try to get auth token from cookies
    const cookies = await context.cookies();
    const accessCookie = cookies.find(c => c.name === 'access_token');
    if (accessCookie) {
      authToken = accessCookie.value;
    }

    const client: ApiClient = {
      get: async (endpoint: string) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
        });
        return response.json();
      },

      post: async (endpoint: string, data?: any) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        return response.json();
      },

      delete: async (endpoint: string) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
        });
        return response.json();
      },

      uploadFile: async (endpoint: string, filePath: string, fieldName: string) => {
        const fs = await import('fs');
        const FormData = (await import('form-data')).default;

        const formData = new FormData();
        formData.append(fieldName, fs.createReadStream(filePath));

        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...formData.getHeaders?.() || {},
          },
          body: formData as any,
        });
        return response.json();
      },
    };

    await use(client);
  },

  // Test data fixture
  testData: async ({}, use) => {
    await use({
      user: TEST_USER,
      apiUrl: API_URL,
      baseUrl: BASE_URL,
    });
  },
});

// Re-export expect
export { expect };

// Helper functions for common test operations
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp): Promise<any> {
  const response = await page.waitForResponse(
    (res) => {
      const url = res.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 30000 }
  );
  return response.json();
}

export async function clearSession(page: Page, context: BrowserContext): Promise<void> {
  await context.clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Ignore storage errors
    }
  });
}

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.locator('button[type="submit"]').filter({ hasText: /sign in|login/i }).click();
  await page.waitForURL(/\/(dashboard|meetings|home)/i, { timeout: 15000 });
}

export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `e2e-test-${timestamp}-${random}@example.com`;
}

export function generateStrongPassword(): string {
  return `Test${Date.now()}!Aa`;
}
