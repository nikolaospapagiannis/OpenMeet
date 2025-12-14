import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for Meetings List Page
 * URL: /meetings
 */
export class MeetingsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly newMeetingButton: Locator;
  readonly meetingsList: Locator;
  readonly meetingCards: Locator;
  readonly emptyState: Locator;
  readonly filterButton: Locator;
  readonly selectAllCheckbox: Locator;
  readonly bulkDeleteButton: Locator;
  readonly exportButton: Locator;
  readonly loadingSpinner: Locator;
  readonly paginationNext: Locator;
  readonly paginationPrev: Locator;
  readonly totalCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1').filter({ hasText: /meetings/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.newMeetingButton = page.getByRole('button', { name: /new.*meeting/i });
    this.meetingsList = page.locator('[class*="meeting"]').or(page.locator('.space-y-2'));
    this.meetingCards = page.locator('[class*="meeting"]').or(page.locator('.border-\\[\\#1e293b\\]'));
    this.emptyState = page.locator('text=/no.*meetings.*found/i');
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.selectAllCheckbox = page.locator('input[type="checkbox"]').first();
    this.bulkDeleteButton = page.getByRole('button', { name: /delete/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.loadingSpinner = page.locator('.animate-spin, [class*="loading"]');
    this.paginationNext = page.getByRole('button', { name: /next/i });
    this.paginationPrev = page.getByRole('button', { name: /previous/i });
    this.totalCount = page.locator('text=/\\d+.*total.*meetings/i');
  }

  async goto(): Promise<void> {
    await this.page.goto('/meetings');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    // Wait for either meetings list or empty state
    await Promise.race([
      expect(this.meetingsList.first()).toBeVisible({ timeout: 15000 }),
      expect(this.emptyState).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {
      // Page might have other content
    });
  }

  async expectToBeOnMeetingsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/meetings/i);
    await this.waitForLoad();
  }

  async searchMeetings(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async clickNewMeeting(): Promise<void> {
    await this.newMeetingButton.click();
    await this.page.waitForURL(/\/meetings\/new/i, { timeout: 10000 });
  }

  async clickMeeting(index: number = 0): Promise<void> {
    const meetings = await this.meetingCards.all();
    if (meetings.length > index) {
      await meetings[index].click();
      await this.page.waitForURL(/\/meetings\/[^/]+$/i, { timeout: 10000 });
    }
  }

  async getMeetingCount(): Promise<number> {
    const meetings = await this.meetingCards.all();
    return meetings.length;
  }

  async hasMeetings(): Promise<boolean> {
    const count = await this.getMeetingCount();
    return count > 0;
  }

  async selectMeeting(index: number = 0): Promise<void> {
    const checkboxes = await this.page.locator('input[type="checkbox"]').all();
    if (checkboxes.length > index + 1) { // +1 because first is select-all
      await checkboxes[index + 1].check();
    }
  }

  async selectAllMeetings(): Promise<void> {
    await this.selectAllCheckbox.check();
  }

  async deletSelectedMeetings(): Promise<void> {
    await this.bulkDeleteButton.click();
    // Confirm dialog
    await this.page.getByRole('button', { name: /confirm|yes|ok/i }).click().catch(() => {});
  }
}
