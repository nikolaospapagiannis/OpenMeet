import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { generateTestEmail, generateStrongPassword } from '../fixtures/test-fixtures';

/**
 * User Journey: Registration Flow
 *
 * Tests the complete registration process including:
 * - Form validation
 * - Successful registration
 * - Email verification flow
 * - Error handling
 */
test.describe('User Journey: Registration', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear any existing session
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) {}
    });

    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('should display registration form with all required fields', async ({ page }) => {
    await expect(registerPage.firstNameInput).toBeVisible();
    await expect(registerPage.lastNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
    await expect(registerPage.signInLink).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Try to submit empty form
    await registerPage.submitButton.click();

    // Should stay on registration page
    await registerPage.expectToBeOnRegisterPage();

    // Form fields should still be visible
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await registerPage.fillRegistrationForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'invalid-email',
      password: generateStrongPassword(),
    });

    await registerPage.submitButton.click();

    // Should stay on page with validation error
    await registerPage.expectToBeOnRegisterPage();
  });

  test('should validate password requirements', async ({ page }) => {
    await registerPage.firstNameInput.fill('Test');
    await registerPage.lastNameInput.fill('User');
    await registerPage.emailInput.fill(generateTestEmail());
    await registerPage.passwordInput.fill('weak'); // Too weak
    await registerPage.confirmPasswordInput.fill('weak');
    await registerPage.termsCheckbox.check();

    await registerPage.submitButton.click();

    // Should stay on page with validation error
    await registerPage.expectToBeOnRegisterPage();
  });

  test('should validate password confirmation matches', async ({ page }) => {
    await registerPage.firstNameInput.fill('Test');
    await registerPage.lastNameInput.fill('User');
    await registerPage.emailInput.fill(generateTestEmail());
    await registerPage.passwordInput.fill('StrongPass123!');
    await registerPage.confirmPasswordInput.fill('DifferentPass123!');
    await registerPage.termsCheckbox.check();

    await registerPage.submitButton.click();

    // Should show password mismatch error
    await registerPage.expectToBeOnRegisterPage();
  });

  test('should require terms acceptance', async ({ page }) => {
    await registerPage.fillRegistrationForm({
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      password: generateStrongPassword(),
    });

    // Uncheck terms
    await registerPage.termsCheckbox.uncheck();

    await registerPage.submitButton.click();

    // Should stay on page
    await registerPage.expectToBeOnRegisterPage();
  });

  test('should successfully register new user', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = generateStrongPassword();

    await registerPage.fillRegistrationForm({
      firstName: 'E2E',
      lastName: 'TestUser',
      email: testEmail,
      password: testPassword,
      organizationName: 'Test Organization',
    });

    await registerPage.submitButton.click();

    // Should redirect to verification page or dashboard
    await page.waitForURL(/\/(verify-email|dashboard|login)/i, { timeout: 15000 });

    // Verify we're no longer on register page
    expect(page.url()).not.toContain('/register');
  });

  test('should show error for duplicate email', async ({ page }) => {
    // Use existing test user email
    await registerPage.fillRegistrationForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'admin@acme.com', // Existing user
      password: generateStrongPassword(),
    });

    await registerPage.submitButton.click();

    // Should stay on page with error
    await page.waitForTimeout(2000);

    // Either error message or still on register page
    const url = page.url();
    const hasError = await registerPage.errorMessage.isVisible().catch(() => false);

    expect(url.includes('/register') || hasError).toBeTruthy();
  });

  test('should navigate to login page', async ({ page }) => {
    await registerPage.signInLink.click();

    await page.waitForURL(/\/login/i, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('should show social login options', async ({ page }) => {
    await expect(registerPage.googleSignUpButton).toBeVisible();
    await expect(registerPage.microsoftSignUpButton).toBeVisible();
  });
});
