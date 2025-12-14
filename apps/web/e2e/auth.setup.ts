import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Authentication setup for E2E tests
 * This runs before other tests to create authenticated session state
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for login form
  await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });

  // Fill in credentials (from seeded test data)
  await page.getByLabel(/email/i).fill('admin@acme.com');
  await page.getByLabel(/password/i).fill('Demo123456!');

  // Submit form
  await page.locator('button[type="submit"]').filter({ hasText: /sign in|login/i }).click();

  // Wait for authentication to complete
  await page.waitForURL(/\/(dashboard|meetings|home)/i, { timeout: 15000 });

  // Verify we're authenticated
  await expect(page).not.toHaveURL(/\/login/);

  // Save storage state
  await page.context().storageState({ path: authFile });
});
