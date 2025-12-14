import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for Meeting Detail Page
 * URL: /meetings/[id]
 *
 * This page has tabs:
 * - transcript: View full transcript
 * - summary: AI-generated summary
 * - action-items: Action items from meeting
 * - ask-ai: Ask questions about the meeting
 * - templates: Apply templates to re-summarize from transcript
 * - insights: Analytics and insights
 */
export class MeetingDetailPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  readonly downloadButton: Locator;
  readonly shareButton: Locator;

  // Tabs
  readonly transcriptTab: Locator;
  readonly summaryTab: Locator;
  readonly actionItemsTab: Locator;
  readonly askAiTab: Locator;
  readonly templatesTab: Locator;
  readonly insightsTab: Locator;

  // Transcript content
  readonly transcriptContent: Locator;
  readonly transcriptSegments: Locator;

  // Summary content
  readonly summaryText: Locator;
  readonly keyPointsList: Locator;
  readonly decisionsList: Locator;
  readonly nextStepsList: Locator;

  // Action items
  readonly actionItemsList: Locator;
  readonly actionItemCheckboxes: Locator;

  // Ask AI
  readonly aiChatInput: Locator;
  readonly aiChatSubmit: Locator;
  readonly aiChatMessages: Locator;

  // Templates
  readonly templatesList: Locator;
  readonly templateCards: Locator;
  readonly applyTemplateButton: Locator;
  readonly appliedNotes: Locator;
  readonly copyNotesButton: Locator;

  // Insights
  readonly topicsList: Locator;
  readonly sentimentDisplay: Locator;
  readonly participationChart: Locator;

  // Video player
  readonly videoPlayer: Locator;

  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1').first();
    this.backButton = page.locator('text=/back.*meetings/i');
    this.downloadButton = page.getByRole('button', { name: /download/i });
    this.shareButton = page.getByRole('button', { name: /share/i });

    // Tabs
    this.transcriptTab = page.getByRole('button', { name: /transcript/i });
    this.summaryTab = page.getByRole('button', { name: /summary/i });
    this.actionItemsTab = page.getByRole('button', { name: /action.*items/i });
    this.askAiTab = page.getByRole('button', { name: /ask.*ai/i });
    this.templatesTab = page.getByRole('button', { name: /templates/i });
    this.insightsTab = page.getByRole('button', { name: /insights/i });

    // Content areas
    this.transcriptContent = page.locator('[class*="transcript"]').or(page.locator('text=/speaker/i').first());
    this.transcriptSegments = page.locator('[class*="segment"]').or(page.locator('[data-speaker]'));

    this.summaryText = page.locator('text=/summary/i').locator('..').locator('p').first();
    this.keyPointsList = page.locator('text=/key.*points/i').locator('..').locator('ul, li');
    this.decisionsList = page.locator('text=/decisions/i').locator('..').locator('ul, li');
    this.nextStepsList = page.locator('text=/next.*steps/i').locator('..').locator('ul, li');

    this.actionItemsList = page.locator('[class*="action-item"]').or(page.locator('input[type="checkbox"]').locator('..'));
    this.actionItemCheckboxes = page.locator('input[type="checkbox"]');

    this.aiChatInput = page.getByPlaceholder(/ask.*question/i);
    this.aiChatSubmit = page.getByRole('button', { name: /ask/i });
    this.aiChatMessages = page.locator('[class*="message"]').or(page.locator('[role="log"]'));

    this.templatesList = page.locator('[class*="template"]');
    this.templateCards = page.locator('button').filter({ hasText: /template/i });
    this.applyTemplateButton = page.getByRole('button', { name: /apply.*template/i });
    this.appliedNotes = page.locator('text=/generated.*notes/i').locator('..');
    this.copyNotesButton = page.getByRole('button', { name: /copy.*notes/i });

    this.topicsList = page.locator('text=/topics.*discussed/i').locator('..').locator('div');
    this.sentimentDisplay = page.locator('text=/sentiment/i').locator('..');
    this.participationChart = page.locator('text=/participation/i').locator('..');

    this.videoPlayer = page.locator('video').or(page.locator('[class*="player"]'));
    this.loadingSpinner = page.locator('.animate-spin, [class*="loading"]');
  }

  async goto(meetingId: string): Promise<void> {
    await this.page.goto(`/meetings/${meetingId}`);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await expect(this.pageTitle).toBeVisible({ timeout: 15000 });
  }

  async expectToBeOnMeetingDetail(): Promise<void> {
    await expect(this.page).toHaveURL(/\/meetings\/[^/]+$/i);
    await this.waitForLoad();
  }

  // Tab navigation
  async openTranscriptTab(): Promise<void> {
    await this.transcriptTab.click();
    await this.page.waitForTimeout(500);
  }

  async openSummaryTab(): Promise<void> {
    await this.summaryTab.click();
    await this.page.waitForTimeout(500);
  }

  async openActionItemsTab(): Promise<void> {
    await this.actionItemsTab.click();
    await this.page.waitForTimeout(500);
  }

  async openAskAiTab(): Promise<void> {
    await this.askAiTab.click();
    await this.page.waitForTimeout(500);
  }

  async openTemplatesTab(): Promise<void> {
    await this.templatesTab.click();
    await this.page.waitForTimeout(500);
  }

  async openInsightsTab(): Promise<void> {
    await this.insightsTab.click();
    await this.page.waitForTimeout(500);
  }

  // Transcript operations
  async hasTranscript(): Promise<boolean> {
    const segments = await this.transcriptSegments.count();
    return segments > 0;
  }

  async getTranscriptText(): Promise<string> {
    await this.openTranscriptTab();
    return await this.transcriptContent.textContent() || '';
  }

  // Summary operations
  async hasSummary(): Promise<boolean> {
    await this.openSummaryTab();
    return await this.summaryText.isVisible().catch(() => false);
  }

  async getSummaryText(): Promise<string> {
    await this.openSummaryTab();
    return await this.summaryText.textContent() || '';
  }

  // AI Chat operations
  async askAiQuestion(question: string): Promise<string> {
    await this.openAskAiTab();
    await this.aiChatInput.fill(question);
    await this.aiChatSubmit.click();
    // Wait for response
    await this.page.waitForTimeout(3000);
    const messages = await this.aiChatMessages.all();
    if (messages.length > 0) {
      return await messages[messages.length - 1].textContent() || '';
    }
    return '';
  }

  // Template operations - KEY FEATURE: re-summarize from transcript
  async getAvailableTemplates(): Promise<number> {
    await this.openTemplatesTab();
    await this.page.waitForTimeout(1000);
    const templates = await this.templateCards.count();
    return templates;
  }

  async selectTemplate(index: number = 0): Promise<void> {
    await this.openTemplatesTab();
    await this.page.waitForTimeout(1000);
    const templates = await this.templateCards.all();
    if (templates.length > index) {
      await templates[index].click();
    }
  }

  async applySelectedTemplate(): Promise<void> {
    await this.applyTemplateButton.click();
    // Wait for template application
    await this.page.waitForTimeout(3000);
    await expect(this.appliedNotes).toBeVisible({ timeout: 30000 });
  }

  async applyTemplateToMeeting(templateIndex: number = 0): Promise<string> {
    await this.selectTemplate(templateIndex);
    await this.applySelectedTemplate();
    // Get the generated notes
    const notes = await this.appliedNotes.textContent() || '';
    return notes;
  }

  async copyGeneratedNotes(): Promise<void> {
    await this.copyNotesButton.click();
  }

  // Download operations
  async downloadTranscript(): Promise<void> {
    await this.downloadButton.click();
  }

  // Share operations
  async shareMeeting(): Promise<void> {
    await this.shareButton.click();
  }

  // Back navigation
  async goBackToMeetings(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL(/\/meetings$/i, { timeout: 10000 });
  }
}
