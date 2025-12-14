import { Page, Locator, expect } from '@playwright/test';
import path from 'path';

/**
 * Page Object for Uploads Page
 * URL: /uploads
 */
export class UploadsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly uploadArea: Locator;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly recentUploadsList: Locator;
  readonly uploadItems: Locator;
  readonly emptyState: Locator;
  readonly refreshButton: Locator;
  readonly loadingSpinner: Locator;
  readonly processingIndicator: Locator;
  readonly completedIndicator: Locator;
  readonly failedIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1').filter({ hasText: /upload/i });
    this.uploadArea = page.locator('[class*="upload"]').or(page.locator('[class*="dropzone"]'));
    this.fileInput = page.locator('input[type="file"]');
    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.recentUploadsList = page.locator('text=/recent.*uploads/i').locator('..');
    this.uploadItems = page.locator('[class*="recording"]').or(page.locator('[class*="upload-item"]'));
    this.emptyState = page.locator('text=/no.*uploads.*yet/i');
    this.refreshButton = page.getByRole('button', { name: /refresh/i }).or(page.locator('[class*="refresh"]'));
    this.loadingSpinner = page.locator('.animate-spin, [class*="loading"]');
    this.processingIndicator = page.locator('text=/processing/i');
    this.completedIndicator = page.locator('text=/completed/i');
    this.failedIndicator = page.locator('text=/failed/i');
  }

  async goto(): Promise<void> {
    await this.page.goto('/uploads');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await expect(this.pageTitle).toBeVisible({ timeout: 15000 });
  }

  async expectToBeOnUploadsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/uploads/i);
    await this.waitForLoad();
  }

  /**
   * Upload a file to the uploads page
   * Uses Playwright's file input handling
   */
  async uploadFile(filePath: string): Promise<void> {
    // Set file on the hidden file input
    await this.fileInput.setInputFiles(filePath);

    // Wait for upload to start
    await this.page.waitForTimeout(1000);

    // Wait for the file to appear in uploads list
    await expect(this.uploadItems.first()).toBeVisible({ timeout: 30000 });
  }

  /**
   * Upload a file and wait for transcription to complete
   * This tests the full upload → transcription pipeline
   */
  async uploadFileAndWaitForProcessing(filePath: string, timeoutMs: number = 300000): Promise<void> {
    await this.uploadFile(filePath);

    // Wait for processing to start
    await expect(this.processingIndicator.first()).toBeVisible({ timeout: 30000 }).catch(() => {});

    // Wait for processing to complete (this can take a while for large files)
    await expect(this.completedIndicator.first()).toBeVisible({ timeout: timeoutMs });
  }

  async getUploadCount(): Promise<number> {
    const items = await this.uploadItems.all();
    return items.length;
  }

  async hasUploads(): Promise<boolean> {
    const count = await this.getUploadCount();
    return count > 0;
  }

  async refreshUploads(): Promise<void> {
    await this.refreshButton.click();
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }

  async getUploadStatus(index: number = 0): Promise<'processing' | 'completed' | 'failed' | 'unknown'> {
    const items = await this.uploadItems.all();
    if (items.length <= index) return 'unknown';

    const item = items[index];
    const text = await item.textContent() || '';

    if (text.toLowerCase().includes('completed')) return 'completed';
    if (text.toLowerCase().includes('processing')) return 'processing';
    if (text.toLowerCase().includes('failed')) return 'failed';
    return 'unknown';
  }

  async waitForUploadToComplete(index: number = 0, timeoutMs: number = 300000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      await this.refreshUploads();
      const status = await this.getUploadStatus(index);

      if (status === 'completed') return true;
      if (status === 'failed') return false;

      await this.page.waitForTimeout(5000); // Check every 5 seconds
    }

    return false;
  }
}
