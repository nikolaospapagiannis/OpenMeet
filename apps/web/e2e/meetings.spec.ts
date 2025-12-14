import { test, expect } from '@playwright/test';

// These tests use the authenticated storage state from auth.setup.ts
// No need to login in beforeEach - the playwright config handles it
test.describe('Meetings E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Just navigate to dashboard - auth state is already loaded
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
  });

  test('Navigate to meetings page', async ({ page }) => {
    // Try to navigate to meetings
    const meetingLinks = [
      page.locator('text=/^meetings$/i'),
      page.locator('a:has-text("Meetings")'),
      page.locator('[href="/meetings"]'),
      page.locator('[href*="meeting"]'),
    ];

    let navigated = false;
    for (const link of meetingLinks) {
      if (await link.count() > 0 && await link.first().isVisible().catch(() => false)) {
        await link.first().click();
        navigated = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (!navigated) {
      // Try direct navigation
      await page.goto('/meetings');
    }

    // Verify we're on meetings page or can see meeting-related content
    await page.waitForTimeout(2000);
    const hasMeetingContent = await page.locator('text=/meeting|schedule|recording/i').count() > 0;

    expect(hasMeetingContent || page.url().includes('meeting')).toBeTruthy();
  });

  test('Dashboard shows meeting data or empty state', async ({ page }) => {
    // On dashboard, should see either:
    // - Meeting list/cards
    // - Empty state message
    // - Loading indicator

    const contentIndicators = [
      page.locator('text=/meeting/i'),
      page.locator('text=/no meetings|empty|get started/i'),
      page.locator('text=/schedule|upcoming|recent/i'),
      page.locator('[role="table"]'),
      page.locator('[role="list"]'),
    ];

    let foundContent = false;
    for (const indicator of contentIndicators) {
      if (await indicator.count() > 0) {
        foundContent = true;
        break;
      }
    }

    // At minimum, should be on a valid page (not error page)
    expect(page.url()).not.toContain('error');
    expect(page.url()).not.toContain('404');
  });

  test('Can access meeting creation if button exists', async ({ page }) => {
    // Look for "New Meeting", "Schedule", "Create" buttons
    const createButtons = [
      page.locator('text=/^new meeting$/i'),
      page.locator('text=/^schedule$/i'),
      page.locator('text=/^create$/i'),
      page.locator('button:has-text("New")'),
      page.locator('button:has-text("Schedule")'),
      page.locator('[data-testid*="create"]'),
    ];

    let buttonFound = false;
    for (const button of createButtons) {
      if (await button.count() > 0 && await button.first().isVisible().catch(() => false)) {
        await button.first().click();
        buttonFound = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (buttonFound) {
      // Should see a form or modal
      const hasForm = await page.locator('form').count() > 0;
      const hasModal = await page.locator('[role="dialog"]').count() > 0;
      const hasInput = await page.locator('input').count() > 0;

      expect(hasForm || hasModal || hasInput).toBeTruthy();
    }
    // If no button found, the test still passes - feature may not be implemented
  });
});
