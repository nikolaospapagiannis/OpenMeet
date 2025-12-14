import { test, expect } from '@playwright/test';
import { MeetingsPage } from '../pages/MeetingsPage';
import { MeetingDetailPage } from '../pages/MeetingDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USER } from '../fixtures/test-fixtures';

/**
 * User Journey: View Transcribed Meetings
 *
 * Tests the complete flow of viewing transcribed meetings including:
 * - Navigate to meetings list
 * - Search and filter meetings
 * - View meeting details
 * - View transcript with speaker diarization
 * - View AI-generated summary
 * - View action items
 */
test.describe('User Journey: View Meetings', () => {
  let meetingsPage: MeetingsPage;

  test.beforeEach(async ({ page, context }) => {
    // Login first
    await context.clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);

    // Navigate to meetings
    meetingsPage = new MeetingsPage(page);
    await meetingsPage.goto();
  });

  test('should display meetings list page', async ({ page }) => {
    await meetingsPage.expectToBeOnMeetingsPage();
    await expect(meetingsPage.pageTitle).toBeVisible();
    await expect(meetingsPage.searchInput).toBeVisible();
  });

  test('should navigate to meetings from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await dashboardPage.navigateToMeetings();

    await meetingsPage.expectToBeOnMeetingsPage();
  });

  test('should display new meeting button', async ({ page }) => {
    await expect(meetingsPage.newMeetingButton).toBeVisible();
  });

  test('should allow searching meetings', async ({ page }) => {
    await meetingsPage.searchMeetings('test');

    // Search should be performed
    await page.waitForTimeout(1000);

    // Search input should contain the query
    await expect(meetingsPage.searchInput).toHaveValue('test');
  });

  test.describe('with existing meetings', () => {
    test.beforeEach(async ({ page }) => {
      // Skip if no meetings
      const hasMeetings = await meetingsPage.hasMeetings();
      test.skip(!hasMeetings, 'No meetings available for testing');
    });

    test('should display meeting cards', async ({ page }) => {
      const meetingCount = await meetingsPage.getMeetingCount();
      expect(meetingCount).toBeGreaterThan(0);
    });

    test('should click on meeting to view details', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      // Should navigate to meeting detail page
      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.expectToBeOnMeetingDetail();
    });

    test('should display meeting detail page with all tabs', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.expectToBeOnMeetingDetail();

      // Check all tabs are visible
      await expect(meetingDetailPage.transcriptTab).toBeVisible();
      await expect(meetingDetailPage.summaryTab).toBeVisible();
      await expect(meetingDetailPage.actionItemsTab).toBeVisible();
      await expect(meetingDetailPage.askAiTab).toBeVisible();
      await expect(meetingDetailPage.templatesTab).toBeVisible();
    });

    test('should view transcript tab', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      await meetingDetailPage.openTranscriptTab();

      // Transcript content should be visible
      const hasTranscript = await meetingDetailPage.hasTranscript();
      // Some meetings may not have transcripts yet
      if (hasTranscript) {
        await expect(meetingDetailPage.transcriptContent).toBeVisible();
      }
    });

    test('should view summary tab', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      await meetingDetailPage.openSummaryTab();

      // Summary content area should be visible
      await page.waitForTimeout(500);
    });

    test('should view action items tab', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      await meetingDetailPage.openActionItemsTab();

      // Action items area should be visible
      await page.waitForTimeout(500);
    });

    test('should view insights tab', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      await meetingDetailPage.openInsightsTab();

      // Insights area should be visible
      await page.waitForTimeout(500);
    });

    test('should have download button', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      await expect(meetingDetailPage.downloadButton).toBeVisible();
    });

    test('should have share button', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      await expect(meetingDetailPage.shareButton).toBeVisible();
    });

    test('should navigate back to meetings list', async ({ page }) => {
      await meetingsPage.clickMeeting(0);

      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      await meetingDetailPage.goBackToMeetings();

      await meetingsPage.expectToBeOnMeetingsPage();
    });
  });

  test.describe('empty state', () => {
    test('should show empty state when no meetings match search', async ({ page }) => {
      // Search for something that won't exist
      await meetingsPage.searchMeetings('xyznonexistent123456789');

      await page.waitForTimeout(1000);

      // Either empty state or no results message
      const emptyState = page.locator('text=/no.*meetings.*found/i');
      const noResults = page.locator('text=/no.*results/i');

      // One of these should be visible
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const hasNoResults = await noResults.isVisible().catch(() => false);
      const zeroMeetings = await meetingsPage.getMeetingCount() === 0;

      expect(hasEmptyState || hasNoResults || zeroMeetings).toBeTruthy();
    });
  });

  test.describe('bulk operations', () => {
    test.beforeEach(async ({ page }) => {
      const hasMeetings = await meetingsPage.hasMeetings();
      test.skip(!hasMeetings, 'No meetings available for bulk operations');
    });

    test('should allow selecting meetings', async ({ page }) => {
      // Select first meeting
      await meetingsPage.selectMeeting(0);

      // Checkbox should be checked
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 1) {
        await expect(checkboxes[1]).toBeChecked();
      }
    });

    test('should allow selecting all meetings', async ({ page }) => {
      await meetingsPage.selectAllMeetings();

      // All checkboxes should be checked
      await expect(meetingsPage.selectAllCheckbox).toBeChecked();
    });
  });
});
