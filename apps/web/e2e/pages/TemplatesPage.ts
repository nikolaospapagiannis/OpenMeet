import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for Templates Page
 * URL: /templates
 */
export class TemplatesPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly createTemplateButton: Locator;
  readonly templateGallery: Locator;
  readonly templateCards: Locator;
  readonly categoryFilters: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;

  // Template builder
  readonly templateBuilder: Locator;
  readonly templateNameInput: Locator;
  readonly templateDescriptionInput: Locator;
  readonly templateCategorySelect: Locator;
  readonly addSectionButton: Locator;
  readonly sectionTitleInputs: Locator;
  readonly sectionContentInputs: Locator;
  readonly saveTemplateButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1').filter({ hasText: /templates/i });
    this.searchInput = page.getByPlaceholder(/search.*templates/i);
    this.createTemplateButton = page.getByRole('button', { name: /create.*template/i });
    this.templateGallery = page.locator('[class*="template-gallery"]').or(page.locator('.grid'));
    this.templateCards = page.locator('[class*="template"]').filter({ has: page.locator('h4, h3') });
    this.categoryFilters = page.getByRole('button').filter({ hasText: /sales|customer|internal|interview|project|custom|all/i });
    this.emptyState = page.locator('text=/no.*templates.*found/i');
    this.loadingSpinner = page.locator('.animate-spin, [class*="loading"]');

    // Template builder elements
    this.templateBuilder = page.locator('[class*="template-builder"]').or(page.locator('form'));
    this.templateNameInput = page.getByLabel(/name/i).or(page.getByPlaceholder(/template.*name/i));
    this.templateDescriptionInput = page.getByLabel(/description/i).or(page.getByPlaceholder(/description/i));
    this.templateCategorySelect = page.locator('select').or(page.getByLabel(/category/i));
    this.addSectionButton = page.getByRole('button', { name: /add.*section/i });
    this.sectionTitleInputs = page.locator('input[name*="section"]').or(page.getByPlaceholder(/section.*title/i));
    this.sectionContentInputs = page.locator('textarea[name*="content"]').or(page.getByPlaceholder(/section.*content/i));
    this.saveTemplateButton = page.getByRole('button', { name: /save|create/i });
    this.cancelButton = page.getByRole('button', { name: /cancel|close/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/templates');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await expect(this.pageTitle).toBeVisible({ timeout: 15000 });
  }

  async expectToBeOnTemplatesPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/templates/i);
    await this.waitForLoad();
  }

  async searchTemplates(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async filterByCategory(category: string): Promise<void> {
    const categoryButton = this.page.getByRole('button', { name: new RegExp(category, 'i') });
    await categoryButton.click();
    await this.page.waitForTimeout(500);
  }

  async getTemplateCount(): Promise<number> {
    const templates = await this.templateCards.all();
    return templates.length;
  }

  async hasTemplates(): Promise<boolean> {
    const count = await this.getTemplateCount();
    return count > 0;
  }

  async openCreateTemplateBuilder(): Promise<void> {
    await this.createTemplateButton.click();
    await expect(this.templateBuilder.or(this.templateNameInput)).toBeVisible({ timeout: 10000 });
  }

  async createTemplate(data: {
    name: string;
    description: string;
    category?: string;
    sections: { title: string; content: string }[];
  }): Promise<void> {
    await this.openCreateTemplateBuilder();

    // Fill basic info
    await this.templateNameInput.fill(data.name);
    await this.templateDescriptionInput.fill(data.description);

    if (data.category) {
      await this.templateCategorySelect.selectOption({ label: data.category }).catch(() => {
        // If not a select, try clicking button with category
        this.page.getByRole('button', { name: new RegExp(data.category!, 'i') }).click();
      });
    }

    // Add sections
    for (const section of data.sections) {
      await this.addSectionButton.click();
      const titles = await this.sectionTitleInputs.all();
      const contents = await this.sectionContentInputs.all();
      if (titles.length > 0) {
        await titles[titles.length - 1].fill(section.title);
      }
      if (contents.length > 0) {
        await contents[contents.length - 1].fill(section.content);
      }
    }

    // Save template
    await this.saveTemplateButton.click();
    await this.page.waitForTimeout(2000);
  }

  async selectTemplate(index: number = 0): Promise<void> {
    const templates = await this.templateCards.all();
    if (templates.length > index) {
      await templates[index].click();
    }
  }

  async editTemplate(index: number = 0): Promise<void> {
    const templates = await this.templateCards.all();
    if (templates.length > index) {
      // Hover to show edit button
      await templates[index].hover();
      const editButton = templates[index].getByRole('button', { name: /edit/i });
      await editButton.click();
      await expect(this.templateBuilder.or(this.templateNameInput)).toBeVisible({ timeout: 10000 });
    }
  }

  async deleteTemplate(index: number = 0): Promise<void> {
    const templates = await this.templateCards.all();
    if (templates.length > index) {
      await templates[index].hover();
      const deleteButton = templates[index].getByRole('button', { name: /delete/i });
      await deleteButton.click();
      // Confirm deletion
      await this.page.getByRole('button', { name: /confirm|yes|ok/i }).click().catch(() => {});
    }
  }

  async duplicateTemplate(index: number = 0): Promise<void> {
    const templates = await this.templateCards.all();
    if (templates.length > index) {
      await templates[index].hover();
      const duplicateButton = templates[index].getByRole('button', { name: /duplicate|copy/i });
      await duplicateButton.click();
      await this.page.waitForTimeout(1000);
    }
  }
}
