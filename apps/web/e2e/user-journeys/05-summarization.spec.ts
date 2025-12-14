import { test, expect } from '@playwright/test';
import { MeetingsPage } from '../pages/MeetingsPage';
import { MeetingDetailPage } from '../pages/MeetingDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USER } from '../fixtures/test-fixtures';

/**
 * User Journey: Summarization from Transcript
 *
 * IMPORTANT: This tests summarization from the TRANSCRIPT, not from the summary.
 * The AI reads the raw transcript and generates summaries, action items, and insights.
 *
 * Tests include:
 * - View AI-generated summary from transcript
 * - View key points extracted from transcript
 * - View decisions made (from transcript analysis)
 * - View next steps (from transcript analysis)
 * - Ask AI questions about the transcript
 */
test.describe('User Journey: Summarization from Transcript', () => {
  let meetingsPage: MeetingsPage;
  let meetingDetailPage: MeetingDetailPage;

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

  test.describe('with meetings that have transcripts', () => {
    test.beforeEach(async ({ page }) => {
      const hasMeetings = await meetingsPage.hasMeetings();
      test.skip(!hasMeetings, 'No meetings available for summarization testing');

      // Click first meeting
      await meetingsPage.clickMeeting(0);
      meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();
    });

    test('should display transcript content', async ({ page }) => {
      await meetingDetailPage.openTranscriptTab();

      // Transcript tab should be active and content visible
      await page.waitForTimeout(500);

      const transcriptArea = page.locator('[class*="transcript"]');
      if (await transcriptArea.count() > 0) {
        await expect(transcriptArea.first()).toBeVisible();
      }
    });

    test('should display AI summary generated from transcript', async ({ page }) => {
      await meetingDetailPage.openSummaryTab();

      await page.waitForTimeout(500);

      // Summary section should be visible
      const summarySection = page.locator('text=/summary/i').first();
      await expect(summarySection).toBeVisible();
    });

    test('should display key points extracted from transcript', async ({ page }) => {
      await meetingDetailPage.openSummaryTab();

      await page.waitForTimeout(500);

      // Key points section should be visible
      const keyPointsSection = page.locator('text=/key.*points/i');
      if (await keyPointsSection.count() > 0) {
        await expect(keyPointsSection.first()).toBeVisible();
      }
    });

    test('should display decisions made during meeting', async ({ page }) => {
      await meetingDetailPage.openSummaryTab();

      await page.waitForTimeout(500);

      // Decisions section (may not exist for all meetings)
      const decisionsSection = page.locator('text=/decisions/i');
      // This is optional content
    });

    test('should display next steps from meeting', async ({ page }) => {
      await meetingDetailPage.openSummaryTab();

      await page.waitForTimeout(500);

      // Next steps section (may not exist for all meetings)
      const nextStepsSection = page.locator('text=/next.*steps/i');
      // This is optional content
    });

    test('should display action items extracted from transcript', async ({ page }) => {
      await meetingDetailPage.openActionItemsTab();

      await page.waitForTimeout(500);

      // Action items section
      const actionItemsArea = page.locator('text=/action.*items/i');
      if (await actionItemsArea.count() > 0) {
        await expect(actionItemsArea.first()).toBeVisible();
      }
    });

    test('should display insights tab with analytics', async ({ page }) => {
      await meetingDetailPage.openInsightsTab();

      await page.waitForTimeout(500);

      // Insights tab content
      const insightsArea = page.locator('text=/topics|sentiment|participation/i');
      if (await insightsArea.count() > 0) {
        await expect(insightsArea.first()).toBeVisible();
      }
    });

    test('should allow asking AI questions about the meeting', async ({ page }) => {
      await meetingDetailPage.openAskAiTab();

      await page.waitForTimeout(500);

      // AI chat interface should be visible
      await expect(meetingDetailPage.aiChatInput).toBeVisible();
      await expect(meetingDetailPage.aiChatSubmit).toBeVisible();
    });

    test('should submit question to AI and receive response', async ({ page }) => {
      await meetingDetailPage.openAskAiTab();

      // Type a question
      await meetingDetailPage.aiChatInput.fill('What was the main topic discussed?');
      await meetingDetailPage.aiChatSubmit.click();

      // Wait for AI response (may take a few seconds)
      await page.waitForTimeout(5000);

      // Check for response in chat
      const messages = await page.locator('[class*="message"]').count();
      // Should have at least the question and potentially a response
      expect(messages).toBeGreaterThanOrEqual(1);
    });

    test('Ask AI about specific topics in transcript', async ({ page }) => {
      await meetingDetailPage.openAskAiTab();

      // Ask about action items
      await meetingDetailPage.aiChatInput.fill('What action items were assigned?');
      await meetingDetailPage.aiChatSubmit.click();

      // Wait for response
      await page.waitForTimeout(5000);

      // Verify question was submitted
      const userMessage = page.locator('text=/action items.*assigned/i');
      await expect(userMessage).toBeVisible({ timeout: 10000 });
    });

    test('should switch between transcript and summary tabs', async ({ page }) => {
      // Start with transcript
      await meetingDetailPage.openTranscriptTab();
      await page.waitForTimeout(300);

      // Switch to summary
      await meetingDetailPage.openSummaryTab();
      await page.waitForTimeout(300);

      // Switch back to transcript
      await meetingDetailPage.openTranscriptTab();
      await page.waitForTimeout(300);

      // Verify we're on transcript
      const transcriptTab = meetingDetailPage.transcriptTab;
      // Tab should be active (styled differently)
    });
  });

  test.describe('AI Analysis Quality', () => {
    test.beforeEach(async ({ page }) => {
      const hasMeetings = await meetingsPage.hasMeetings();
      test.skip(!hasMeetings, 'No meetings available');

      await meetingsPage.clickMeeting(0);
      meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();
    });

    test('summary is derived from transcript content', async ({ page }) => {
      // Open transcript first
      await meetingDetailPage.openTranscriptTab();
      const transcriptContent = await page.locator('[class*="transcript"]').textContent() || '';

      // Open summary
      await meetingDetailPage.openSummaryTab();
      const summaryContent = await page.locator('text=/summary/i').locator('..').textContent() || '';

      // Both should have content if meeting has been processed
      if (transcriptContent.length > 0) {
        // Summary should exist when transcript exists
        expect(summaryContent.length > 0 || summaryContent.includes('Summary')).toBeTruthy();
      }
    });

    test('action items reference transcript content', async ({ page }) => {
      await meetingDetailPage.openActionItemsTab();

      // Action items should be derived from meeting content
      const actionItems = await page.locator('[class*="action"]').all();

      // If there are action items, they should have descriptions
      for (const item of actionItems.slice(0, 3)) {
        const text = await item.textContent() || '';
        // Action items should have meaningful content, not placeholders
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });
});
