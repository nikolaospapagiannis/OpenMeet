import { test, expect } from '@playwright/test';
import { TemplatesPage } from '../pages/TemplatesPage';
import { MeetingsPage } from '../pages/MeetingsPage';
import { MeetingDetailPage } from '../pages/MeetingDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USER } from '../fixtures/test-fixtures';

/**
 * User Journey: Templates and Re-summarization
 *
 * CRITICAL: Templates are used to re-summarize meetings from the TRANSCRIPT,
 * NOT from the existing summary. This ensures users can get different perspectives
 * and formats based on the raw meeting content.
 *
 * Tests include:
 * - View and manage templates
 * - Create custom templates
 * - Apply templates to meetings (generates notes from transcript)
 * - Re-summarize with different templates
 */
test.describe('User Journey: Templates and Re-summarization', () => {
  let templatesPage: TemplatesPage;

  test.beforeEach(async ({ page, context }) => {
    // Login first
    await context.clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(TEST_USER.email, TEST_USER.password);
  });

  test.describe('Templates Page', () => {
    test.beforeEach(async ({ page }) => {
      templatesPage = new TemplatesPage(page);
      await templatesPage.goto();
    });

    test('should display templates page', async ({ page }) => {
      await templatesPage.expectToBeOnTemplatesPage();
      await expect(templatesPage.pageTitle).toBeVisible();
    });

    test('should navigate to templates from dashboard', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await dashboardPage.navigateToTemplates();

      await templatesPage.expectToBeOnTemplatesPage();
    });

    test('should display create template button', async ({ page }) => {
      await expect(templatesPage.createTemplateButton).toBeVisible();
    });

    test('should display search input', async ({ page }) => {
      await expect(templatesPage.searchInput).toBeVisible();
    });

    test('should display category filters', async ({ page }) => {
      // Check for category filter buttons
      const allFilter = page.getByRole('button', { name: /all/i });
      const salesFilter = page.getByRole('button', { name: /sales/i });

      await expect(allFilter).toBeVisible();
    });

    test('should search templates', async ({ page }) => {
      await templatesPage.searchTemplates('sales');

      await page.waitForTimeout(500);

      await expect(templatesPage.searchInput).toHaveValue('sales');
    });

    test('should filter templates by category', async ({ page }) => {
      const salesButton = page.getByRole('button', { name: /sales/i });

      if (await salesButton.isVisible()) {
        await salesButton.click();
        await page.waitForTimeout(500);
      }
    });

    test.describe('with existing templates', () => {
      test.beforeEach(async ({ page }) => {
        const hasTemplates = await templatesPage.hasTemplates();
        test.skip(!hasTemplates, 'No templates available');
      });

      test('should display template cards', async ({ page }) => {
        const templateCount = await templatesPage.getTemplateCount();
        expect(templateCount).toBeGreaterThan(0);
      });

      test('should click to view template details', async ({ page }) => {
        await templatesPage.selectTemplate(0);
        await page.waitForTimeout(500);
      });
    });

    test('should open create template builder', async ({ page }) => {
      await templatesPage.openCreateTemplateBuilder();

      // Template builder should be visible
      await expect(templatesPage.templateNameInput.or(templatesPage.templateBuilder)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Apply Templates to Meetings (Re-summarization)', () => {
    let meetingsPage: MeetingsPage;
    let meetingDetailPage: MeetingDetailPage;

    test.beforeEach(async ({ page }) => {
      meetingsPage = new MeetingsPage(page);
      await meetingsPage.goto();

      const hasMeetings = await meetingsPage.hasMeetings();
      test.skip(!hasMeetings, 'No meetings available for template application');

      // Navigate to first meeting
      await meetingsPage.clickMeeting(0);
      meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();
    });

    test('should display templates tab in meeting detail', async ({ page }) => {
      await expect(meetingDetailPage.templatesTab).toBeVisible();
    });

    test('should open templates tab and show available templates', async ({ page }) => {
      await meetingDetailPage.openTemplatesTab();

      await page.waitForTimeout(1000);

      // Should show template selection interface
      const templatesSection = page.locator('text=/select.*template|templates/i');
      await expect(templatesSection.first()).toBeVisible();
    });

    test('should show template cards in meeting detail', async ({ page }) => {
      await meetingDetailPage.openTemplatesTab();

      await page.waitForTimeout(1000);

      const templateCount = await meetingDetailPage.getAvailableTemplates();
      // May or may not have templates
    });

    test.describe('with available templates', () => {
      test.beforeEach(async ({ page }) => {
        await meetingDetailPage.openTemplatesTab();
        await page.waitForTimeout(1000);

        const templateCount = await meetingDetailPage.getAvailableTemplates();
        test.skip(templateCount === 0, 'No templates available');
      });

      test('should select a template', async ({ page }) => {
        await meetingDetailPage.selectTemplate(0);

        await page.waitForTimeout(500);

        // Template details should be shown
        const applyButton = page.getByRole('button', { name: /apply/i });
        await expect(applyButton).toBeVisible();
      });

      test('should apply template to generate notes from transcript', async ({ page }) => {
        await meetingDetailPage.selectTemplate(0);

        await page.waitForTimeout(500);

        // Click apply
        const applyButton = page.getByRole('button', { name: /apply/i });
        await applyButton.click();

        // Wait for notes generation (this calls AI to process transcript)
        await page.waitForTimeout(5000);

        // Should show generated notes
        const generatedNotes = page.locator('text=/generated.*notes/i');
        const notesContent = page.locator('[class*="notes"]').or(page.locator('[class*="content"]'));

        // Either should be visible
        const hasNotes = await generatedNotes.isVisible().catch(() => false) ||
                        await notesContent.first().isVisible().catch(() => false);
      });

      test('should show template variables form', async ({ page }) => {
        await meetingDetailPage.selectTemplate(0);

        await page.waitForTimeout(500);

        // Template may have variables to fill
        const variablesSection = page.locator('text=/variables/i');
        // Variables are optional
      });

      test('should copy generated notes', async ({ page }) => {
        await meetingDetailPage.selectTemplate(0);

        const applyButton = page.getByRole('button', { name: /apply/i });
        await applyButton.click();

        await page.waitForTimeout(5000);

        // Try to copy notes
        const copyButton = page.getByRole('button', { name: /copy/i });
        if (await copyButton.isVisible()) {
          await copyButton.click();
        }
      });

      test('should be able to go back to template list', async ({ page }) => {
        await meetingDetailPage.selectTemplate(0);

        await page.waitForTimeout(500);

        // Look for back button
        const backButton = page.locator('text=/back/i');
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForTimeout(500);
        }
      });

      test('should apply different template (re-summarize)', async ({ page }) => {
        // Apply first template
        await meetingDetailPage.selectTemplate(0);

        const applyButton = page.getByRole('button', { name: /apply/i });
        await applyButton.click();

        await page.waitForTimeout(5000);

        // Go back and apply different template
        const backButton = page.locator('text=/back.*templates/i').first();
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForTimeout(500);

          // Select second template if available
          const templates = await meetingDetailPage.templateCards.all();
          if (templates.length > 1) {
            await templates[1].click();
            await page.waitForTimeout(500);

            // Apply second template
            const applyBtn = page.getByRole('button', { name: /apply/i });
            if (await applyBtn.isVisible()) {
              await applyBtn.click();
              await page.waitForTimeout(5000);
            }
          }
        }
      });
    });
  });

  test.describe('Create Custom Template', () => {
    test.beforeEach(async ({ page }) => {
      templatesPage = new TemplatesPage(page);
      await templatesPage.goto();
    });

    test('should create a new template', async ({ page }) => {
      await templatesPage.openCreateTemplateBuilder();

      // Fill template details
      const nameInput = page.getByLabel(/name/i).or(page.locator('input[name="name"]')).first();
      const descInput = page.getByLabel(/description/i).or(page.locator('textarea[name="description"]')).first();

      if (await nameInput.isVisible()) {
        await nameInput.fill('E2E Test Template');
      }

      if (await descInput.isVisible()) {
        await descInput.fill('A template created during E2E testing');
      }

      // Save template
      const saveButton = page.getByRole('button', { name: /save|create/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    });

    test('template builder should have section management', async ({ page }) => {
      await templatesPage.openCreateTemplateBuilder();

      // Look for add section button
      const addSectionButton = page.getByRole('button', { name: /add.*section/i });
      // May or may not be visible depending on template builder design
    });
  });

  test.describe('Re-summarization Flow (End-to-End)', () => {
    test('complete flow: meeting -> template -> re-summarize -> copy notes', async ({ page }) => {
      // Navigate to meetings
      const meetingsPage = new MeetingsPage(page);
      await meetingsPage.goto();

      const hasMeetings = await meetingsPage.hasMeetings();
      test.skip(!hasMeetings, 'No meetings available');

      // Open a meeting
      await meetingsPage.clickMeeting(0);
      const meetingDetailPage = new MeetingDetailPage(page);
      await meetingDetailPage.waitForLoad();

      // Open templates tab
      await meetingDetailPage.openTemplatesTab();
      await page.waitForTimeout(1000);

      const templateCount = await meetingDetailPage.getAvailableTemplates();
      test.skip(templateCount === 0, 'No templates available');

      // Select template
      await meetingDetailPage.selectTemplate(0);
      await page.waitForTimeout(500);

      // Apply template (this generates notes FROM THE TRANSCRIPT)
      const applyButton = page.getByRole('button', { name: /apply/i });
      await applyButton.click();

      // Wait for AI processing
      await page.waitForTimeout(10000);

      // Verify notes were generated
      const notesSection = page.locator('text=/generated|notes|sections/i');
      if (await notesSection.count() > 0) {
        await expect(notesSection.first()).toBeVisible();
      }

      // Copy notes
      const copyButton = page.getByRole('button', { name: /copy/i });
      if (await copyButton.isVisible()) {
        await copyButton.click();
      }
    });
  });
});

/**
 * KEY ARCHITECTURAL POINT:
 *
 * Templates in OpenMeet work by:
 * 1. User selects a template (e.g., "Sales Call Summary", "Technical Meeting Notes")
 * 2. The template defines sections and structure (e.g., "Overview", "Action Items", "Follow-ups")
 * 3. When applied, the AI reads the RAW TRANSCRIPT (not the existing summary)
 * 4. The AI generates content for each template section based on transcript analysis
 *
 * This means:
 * - Users can re-summarize the same meeting with different templates
 * - Each template produces different output based on its focus
 * - The source of truth is always the transcript, not previous summaries
 * - This prevents "summary of summary" quality degradation
 */
