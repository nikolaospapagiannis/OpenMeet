import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for Registration Page
 * URL: /register
 */
export class RegisterPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly organizationInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly googleSignUpButton: Locator;
  readonly microsoftSignUpButton: Locator;
  readonly signInLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByLabel(/first.*name/i).or(page.locator('#firstName'));
    this.lastNameInput = page.getByLabel(/last.*name/i).or(page.locator('#lastName'));
    this.emailInput = page.getByLabel(/email/i).or(page.locator('#email'));
    this.passwordInput = page.locator('#password').or(page.getByLabel(/^password$/i));
    this.confirmPasswordInput = page.locator('#confirmPassword').or(page.getByLabel(/confirm.*password/i));
    this.organizationInput = page.getByLabel(/organization/i).or(page.locator('#organizationName'));
    this.termsCheckbox = page.locator('input[type="checkbox"]');
    this.submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|register|create.*account/i });
    this.googleSignUpButton = page.getByRole('button', { name: /google/i });
    this.microsoftSignUpButton = page.getByRole('button', { name: /microsoft/i });
    this.signInLink = page.getByRole('link', { name: /sign in/i });
    this.errorMessage = page.locator('.text-red-400, [class*="error"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
  }

  async fillRegistrationForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName?: string;
  }): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);

    // Fill both password fields
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);

    if (data.organizationName) {
      await this.organizationInput.fill(data.organizationName);
    }

    // Accept terms
    await this.termsCheckbox.check();
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName?: string;
  }): Promise<void> {
    await this.fillRegistrationForm(data);
    await this.submitButton.click();
  }

  async registerAndWaitForVerification(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName?: string;
  }): Promise<void> {
    await this.register(data);
    // Wait for redirect to verification page or success message
    await this.page.waitForURL(/\/(verify-email|dashboard|success)/i, { timeout: 15000 });
  }

  async expectErrorMessage(): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
  }

  async expectToBeOnRegisterPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/register/);
    await expect(this.emailInput).toBeVisible();
  }

  async expectPasswordMismatchError(): Promise<void> {
    const mismatchError = this.page.locator('text=/passwords.*don.*t.*match/i');
    await expect(mismatchError.or(this.errorMessage)).toBeVisible({ timeout: 5000 });
  }
}
