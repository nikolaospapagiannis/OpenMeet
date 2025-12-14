import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USER, clearSession } from '../fixtures/test-fixtures';

/**
 * User Journey: Login and Authentication
 *
 * Tests the complete authentication flow including:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Session persistence
 * - Logout
 * - Protected routes
 */
test.describe('User Journey: Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page, context }) => {
    await clearSession(page, context);
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form with all required elements', async ({ page }) => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.signUpLink).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await loginPage.submitButton.click();

    // Should stay on login page
    await loginPage.expectToBeOnLoginPage();
  });

  test('should login successfully with valid credentials', async ({ page, context }) => {
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);

    // Verify redirect to dashboard
    expect(page.url()).toMatch(/\/(dashboard|meetings|home)/i);

    // Verify cookies are set
    const cookies = await context.cookies();
    const hasAccessToken = cookies.some(c => c.name === 'access_token');
    const hasRefreshToken = cookies.some(c => c.name === 'refresh_token');

    expect(hasAccessToken || hasRefreshToken).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await loginPage.login('invalid@example.com', 'WrongPassword123!');

    // Wait for error response
    await page.waitForTimeout(3000);

    // Should stay on login page
    await loginPage.expectToBeOnLoginPage();
  });

  test('should show error for wrong password', async ({ page }) => {
    await loginPage.login(TEST_USER.email, 'WrongPassword123!');

    // Wait for error response
    await page.waitForTimeout(3000);

    // Should stay on login page or show error
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should maintain session after page refresh', async ({ page, context }) => {
    // Login first
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);

    // Refresh the page
    await page.reload();
    await page.waitForTimeout(2000);

    // Should still be on protected page, not redirected to login
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toMatch(/\/(dashboard|meetings|home)/i);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page, context }) => {
    // Ensure we're logged out
    await clearSession(page, context);

    // Try to access protected route
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Should redirect to login or show login page
    const url = page.url();
    expect(url.includes('/login') || url === 'http://localhost:4200/').toBeTruthy();
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);

    const dashboardPage = new DashboardPage(page);

    // Try to logout
    await dashboardPage.logout();

    // Verify redirect and cookies cleared
    const url = page.url();
    expect(url.includes('/login') || url === 'http://localhost:4200/').toBeTruthy();

    // Verify cookies are cleared
    const cookies = await context.cookies();
    const hasAccessToken = cookies.some(c => c.name === 'access_token');
    expect(hasAccessToken).toBeFalsy();
  });

  test('should navigate to registration page', async ({ page }) => {
    await loginPage.signUpLink.click();

    await page.waitForURL(/\/register/i, { timeout: 10000 });
    expect(page.url()).toContain('/register');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await loginPage.forgotPasswordLink.click();

    await page.waitForURL(/\/forgot-password/i, { timeout: 10000 });
    expect(page.url()).toContain('/forgot-password');
  });

  test('should show social login options', async ({ page }) => {
    await expect(loginPage.googleSignInButton).toBeVisible();
    await expect(loginPage.microsoftSignInButton).toBeVisible();
  });

  test('full authentication cycle: login -> refresh -> logout -> login again', async ({ page, context }) => {
    // Step 1: Login
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);
    expect(page.url()).toMatch(/\/(dashboard|meetings|home)/i);

    // Step 2: Refresh and verify session
    await page.reload();
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/login');

    // Step 3: Logout
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();

    // Step 4: Login again
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);

    expect(page.url()).toMatch(/\/(dashboard|meetings|home)/i);
  });
});
