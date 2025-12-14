import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for Dashboard Page
 * URL: /dashboard
 */
export class DashboardPage {
  readonly page: Page;
  readonly mainContent: Locator;
  readonly welcomeMessage: Locator;
  readonly recentMeetingsSection: Locator;
  readonly quickActionsSection: Locator;
  readonly uploadButton: Locator;
  readonly newMeetingButton: Locator;
  readonly meetingsNavLink: Locator;
  readonly templatesNavLink: Locator;
  readonly uploadsNavLink: Locator;
  readonly settingsNavLink: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainContent = page.locator('main').or(page.locator('[role="main"]'));
    this.welcomeMessage = page.locator('text=/welcome|hello|dashboard/i').first();
    this.recentMeetingsSection = page.locator('text=/recent.*meetings|latest.*meetings/i');
    this.quickActionsSection = page.locator('text=/quick.*actions|get.*started/i');
    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.newMeetingButton = page.getByRole('button', { name: /new.*meeting/i });
    this.meetingsNavLink = page.getByRole('link', { name: /meetings/i }).first();
    this.templatesNavLink = page.getByRole('link', { name: /templates/i }).first();
    this.uploadsNavLink = page.getByRole('link', { name: /upload/i }).first();
    this.settingsNavLink = page.getByRole('link', { name: /settings/i }).first();
    this.userMenu = page.locator('[data-testid="user-menu"]')
      .or(page.locator('[aria-label*="user" i]'))
      .or(page.locator('[aria-label*="profile" i]'));
    this.logoutButton = page.getByRole('button', { name: /logout|sign.*out/i })
      .or(page.getByRole('link', { name: /logout|sign.*out/i }));
    this.loadingSpinner = page.locator('.animate-spin, [class*="loading"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    // Wait for loading to finish
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    // Wait for main content
    await expect(this.mainContent).toBeVisible({ timeout: 15000 });
  }

  async expectToBeOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(dashboard|home)/i);
    await this.waitForLoad();
  }

  async navigateToMeetings(): Promise<void> {
    await this.meetingsNavLink.click();
    await this.page.waitForURL(/\/meetings/i, { timeout: 10000 });
  }

  async navigateToTemplates(): Promise<void> {
    await this.templatesNavLink.click();
    await this.page.waitForURL(/\/templates/i, { timeout: 10000 });
  }

  async navigateToUploads(): Promise<void> {
    await this.uploadsNavLink.click();
    await this.page.waitForURL(/\/uploads/i, { timeout: 10000 });
  }

  async navigateToSettings(): Promise<void> {
    await this.settingsNavLink.click();
    await this.page.waitForURL(/\/settings/i, { timeout: 10000 });
  }

  async openUserMenu(): Promise<void> {
    if (await this.userMenu.count() > 0) {
      await this.userMenu.first().click();
      await this.page.waitForTimeout(500);
    }
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    if (await this.logoutButton.isVisible()) {
      await this.logoutButton.click();
      await this.page.waitForURL(/\/(login|\/)/i, { timeout: 10000 });
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const cookies = await this.page.context().cookies();
    return cookies.some(c => c.name === 'access_token' || c.name === 'refresh_token');
  }
}
