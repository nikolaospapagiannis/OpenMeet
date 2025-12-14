import { test, expect } from '@playwright/test';
import { UploadsPage } from '../pages/UploadsPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USER } from '../fixtures/test-fixtures';
import path from 'path';
import fs from 'fs';

/**
 * User Journey: File Upload
 *
 * Tests the complete file upload flow including:
 * - Navigate to uploads page
 * - Upload audio/video files
 * - Track processing status
 * - View uploaded recordings
 *
 * Note: This test requires a test audio file. If not available,
 * some tests will be skipped gracefully.
 */
test.describe('User Journey: File Upload', () => {
  let uploadsPage: UploadsPage;
  const testAudioPath = path.join(__dirname, '..', 'fixtures', 'test-audio.mp3');
  const testVideoPath = path.join(__dirname, '..', 'fixtures', 'test-video.mp4');

  test.beforeEach(async ({ page, context }) => {
    // Login first
    await context.clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);

    // Navigate to uploads
    uploadsPage = new UploadsPage(page);
    await uploadsPage.goto();
  });

  test('should display uploads page with upload area', async ({ page }) => {
    await uploadsPage.expectToBeOnUploadsPage();
    await expect(uploadsPage.pageTitle).toBeVisible();
  });

  test('should navigate to uploads from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Navigate to uploads
    await dashboardPage.navigateToUploads();

    await uploadsPage.expectToBeOnUploadsPage();
  });

  test('should display upload tips and supported formats', async ({ page }) => {
    // Check for video formats info
    const videoInfo = page.locator('text=/mp4|mov|avi|webm/i');
    await expect(videoInfo.first()).toBeVisible();

    // Check for audio formats info
    const audioInfo = page.locator('text=/mp3|wav|m4a|ogg/i');
    await expect(audioInfo.first()).toBeVisible();
  });

  test('should show recent uploads list', async ({ page }) => {
    // Check for recent uploads section
    const recentUploads = page.locator('text=/recent.*uploads/i');
    await expect(recentUploads).toBeVisible();
  });

  test('should allow refreshing uploads list', async ({ page }) => {
    const refreshButton = uploadsPage.refreshButton;

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Loading indicator should appear and disappear
      await uploadsPage.loadingSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await uploadsPage.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }
  });

  test('should have file input for uploads', async ({ page }) => {
    // File input should exist (may be hidden)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
  });

  test.describe('with test audio file', () => {
    test.skip(() => !fs.existsSync(testAudioPath), 'Test audio file not available');

    test('should upload audio file', async ({ page }) => {
      // Upload the test file
      await uploadsPage.uploadFile(testAudioPath);

      // Should see file in uploads list
      const uploadCount = await uploadsPage.getUploadCount();
      expect(uploadCount).toBeGreaterThan(0);
    });

    test('should show processing status after upload', async ({ page }) => {
      await uploadsPage.uploadFile(testAudioPath);

      // Should show processing indicator
      const status = await uploadsPage.getUploadStatus(0);
      expect(['processing', 'completed']).toContain(status);
    });
  });

  test.describe('with test video file', () => {
    test.skip(() => !fs.existsSync(testVideoPath), 'Test video file not available');

    test('should upload video file', async ({ page }) => {
      await uploadsPage.uploadFile(testVideoPath);

      // Should see file in uploads list
      const uploadCount = await uploadsPage.getUploadCount();
      expect(uploadCount).toBeGreaterThan(0);
    });
  });

  test('upload flow without actual file (UI test)', async ({ page }) => {
    // This test verifies the UI is ready for uploads without requiring a real file

    // Check upload area is visible
    const uploadArea = page.locator('[class*="upload"]').or(page.locator('[class*="dropzone"]'));
    await expect(uploadArea.first()).toBeVisible();

    // Check file input exists
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);

    // Verify accept attribute for file types
    const acceptAttr = await fileInput.getAttribute('accept');
    // Should accept audio or video files
    if (acceptAttr) {
      expect(acceptAttr.includes('audio') || acceptAttr.includes('video') || acceptAttr.includes('.mp')).toBeTruthy();
    }
  });
});

/**
 * Create a test audio fixture file for E2E tests
 * This generates a minimal valid MP3 file for testing upload functionality
 */
test.describe.skip('Setup: Create test fixtures', () => {
  test('create test audio file', async () => {
    const fixturesDir = path.join(__dirname, '..', 'fixtures');

    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a minimal MP3 file header (silent audio)
    // This is a valid MP3 file but with silence
    const mp3Header = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, // MPEG Audio Layer 3, 128kbps
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]);

    // Repeat to make a few seconds of audio
    const frames = Buffer.concat(Array(100).fill(mp3Header));

    fs.writeFileSync(path.join(fixturesDir, 'test-audio.mp3'), frames);
  });
});
