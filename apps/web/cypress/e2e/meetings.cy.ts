/**
 * E2E Tests - Meetings Management
 */

describe('Meetings', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'Test123!');
    cy.visit('/meetings');
  });

  describe('Meeting List', () => {
    it('should display meetings list', () => {
      cy.get('[data-testid="meetings-list"]').should('be.visible');
    });

    it('should filter meetings by status', () => {
      cy.get('[data-testid="status-filter"]').click();
      cy.get('[data-value="completed"]').click();

      cy.url().should('include', 'status=completed');
      cy.get('[data-testid="meeting-card"]').each(($el) => {
        cy.wrap($el).find('[data-testid="status-badge"]').should('contain', 'Completed');
      });
    });

    it('should search meetings', () => {
      cy.get('input[placeholder="Search meetings"]').type('Team Sync');
      cy.wait(500); // Debounce

      cy.get('[data-testid="meeting-card"]').should('have.length.greaterThan', 0);
      cy.get('[data-testid="meeting-card"]').first().should('contain', 'Team Sync');
    });

    it('should navigate to meeting details', () => {
      cy.get('[data-testid="meeting-card"]').first().click();

      cy.url().should('include', '/meetings/');
      cy.get('[data-testid="meeting-title"]').should('be.visible');
    });
  });

  describe('Create Meeting', () => {
    it('should open create meeting modal', () => {
      cy.get('[data-testid="create-meeting-button"]').click();
      cy.get('[data-testid="meeting-form"]').should('be.visible');
    });

    it('should create new meeting', () => {
      cy.get('[data-testid="create-meeting-button"]').click();

      cy.get('input[name="title"]').type('Test Meeting');
      cy.get('textarea[name="description"]').type('This is a test meeting');
      cy.get('input[name="scheduledAt"]').type('2024-12-31T10:00');
      cy.get('button[type="submit"]').click();

      cy.contains('Meeting created').should('be.visible');
      cy.get('[data-testid="meeting-card"]').first().should('contain', 'Test Meeting');
    });

    it('should validate required fields', () => {
      cy.get('[data-testid="create-meeting-button"]').click();
      cy.get('button[type="submit"]').click();

      cy.contains('Title is required').should('be.visible');
    });
  });

  describe('Meeting Details', () => {
    beforeEach(() => {
      cy.get('[data-testid="meeting-card"]').first().click();
    });

    it('should display meeting information', () => {
      cy.get('[data-testid="meeting-title"]').should('be.visible');
      cy.get('[data-testid="meeting-description"]').should('be.visible');
      cy.get('[data-testid="participants-list"]').should('be.visible');
    });

    it('should display transcript', () => {
      cy.get('[data-testid="transcript-tab"]').click();
      cy.get('[data-testid="transcript-content"]').should('be.visible');
    });

    it('should display summary', () => {
      cy.get('[data-testid="summary-tab"]').click();
      cy.get('[data-testid="summary-overview"]').should('be.visible');
      cy.get('[data-testid="action-items"]').should('be.visible');
    });

    it('should add comment', () => {
      cy.get('[data-testid="comments-tab"]').click();
      cy.get('textarea[placeholder="Add a comment"]').type('This is a test comment');
      cy.get('[data-testid="add-comment-button"]').click();

      cy.contains('This is a test comment').should('be.visible');
    });
  });

  describe('Upload Recording', () => {
    it('should upload audio file', () => {
      cy.get('[data-testid="upload-button"]').click();
      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-audio.mp3', { force: true });

      cy.contains('Processing').should('be.visible');
    });
  });
});
