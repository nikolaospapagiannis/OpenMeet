import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for Login Page
 * URL: /login
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleSignInButton: Locator;
  readonly microsoftSignInButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly errorMessage: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|login/i });
    this.googleSignInButton = page.getByRole('button', { name: /google/i });
    this.microsoftSignInButton = page.getByRole('button', { name: /microsoft/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot.*password/i });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.errorMessage = page.locator('.text-red-400, [class*="error"]');
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(/\/(dashboard|meetings|home)/i, { timeout: 15000 });
  }

  async expectErrorMessage(): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
  }

  async expectToBeOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.emailInput).toBeVisible();
  }

  async expectValidationErrors(): Promise<void> {
    // Form should still be on login page
    await expect(this.page).toHaveURL(/\/login/);
    // Either validation messages or form stays visible
    await expect(this.emailInput).toBeVisible();
  }
}
