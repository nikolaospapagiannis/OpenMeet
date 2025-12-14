/**
 * E2E Tests - Meeting Search and Filtering
 * Tests for searching, filtering, and sorting meetings
 */

import { testUsers } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Meeting Search and Filtering', () => {
  beforeEach(() => {
    ApiHelper.setupAllInterceptors();
    cy.login(testUsers.validUser.email, testUsers.validUser.password);
    cy.visit('/meetings');
    cy.wait('@getMeetings');
  });

  describe('Search Functionality', () => {
    it('should display search input', () => {
      cy.log('Verifying search input');
      cy.get(selectors.meetings.searchInput).should('be.visible');
    });

    it('should search meetings by title', () => {
      cy.log('Testing search by title');
      ApiHelper.setupSearchInterceptors();

      cy.get(selectors.meetings.searchInput).type('Team Sync');
      cy.wait('@search');

      cy.get(selectors.meetings.card).should('contain', 'Team Sync');
    });

    it('should show no results message when search has no matches', () => {
      cy.log('Testing no results');
      cy.intercept('GET', `${Cypress.env('API_URL')}/search*`, {
        statusCode: 200,
        body: { results: [], total: 0 },
      }).as('noResults');

      cy.get(selectors.meetings.searchInput).type('NonexistentMeeting');
      cy.wait('@noResults');

      cy.contains('No meetings found').should('be.visible');
    });

    it('should debounce search input', () => {
      cy.log('Testing search debounce');
      ApiHelper.setupSearchInterceptors();

      cy.get(selectors.meetings.searchInput).type('a');
      cy.get(selectors.meetings.searchInput).type('b');
      cy.get(selectors.meetings.searchInput).type('c');

      cy.wait(600);
      cy.get('@search.all').should('have.length', 1);
    });

    it('should clear search results', () => {
      cy.log('Testing clear search');
      ApiHelper.setupSearchInterceptors();

      cy.get(selectors.meetings.searchInput).type('Test');
      cy.wait('@search');

      cy.get('[data-testid="clear-search"]').click();
      cy.get(selectors.meetings.searchInput).should('have.value', '');
      cy.wait('@getMeetings');
    });

    it('should maintain search query in URL', () => {
      cy.log('Testing URL query persistence');
      cy.get(selectors.meetings.searchInput).type('Team Sync');
      cy.url().should('include', 'q=Team+Sync');
    });

    it('should restore search from URL on page load', () => {
      cy.log('Testing search restoration from URL');
      cy.visit('/meetings?q=Team+Sync');
      cy.get(selectors.meetings.searchInput).should('have.value', 'Team Sync');
    });
  });

  describe('Status Filtering', () => {
    it('should display status filter dropdown', () => {
      cy.log('Verifying status filter');
      cy.get(selectors.meetings.statusFilter).should('be.visible');
    });

    it('should filter meetings by completed status', () => {
      cy.log('Testing filter by completed');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*status=completed*`, {
        statusCode: 200,
        body: {
          meetings: [
            { id: '1', title: 'Completed Meeting', status: 'completed' },
          ],
          total: 1,
        },
      }).as('completedMeetings');

      cy.get(selectors.meetings.statusFilter).click();
      cy.get('[data-value="completed"]').click();

      cy.wait('@completedMeetings');
      cy.url().should('include', 'status=completed');
      cy.get(selectors.meetings.statusBadge).should('contain', 'Completed');
    });

    it('should filter meetings by processing status', () => {
      cy.log('Testing filter by processing');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*status=processing*`, {
        statusCode: 200,
        body: {
          meetings: [
            { id: '1', title: 'Processing Meeting', status: 'processing' },
          ],
          total: 1,
        },
      }).as('processingMeetings');

      cy.get(selectors.meetings.statusFilter).click();
      cy.get('[data-value="processing"]').click();

      cy.wait('@processingMeetings');
      cy.url().should('include', 'status=processing');
      cy.get(selectors.meetings.statusBadge).should('contain', 'Processing');
    });

    it('should clear status filter', () => {
      cy.log('Testing clear status filter');
      cy.get(selectors.meetings.statusFilter).click();
      cy.get('[data-value="completed"]').click();
      cy.url().should('include', 'status=completed');

      cy.get(selectors.meetings.statusFilter).click();
      cy.get('[data-value="all"]').click();

      cy.url().should('not.include', 'status=');
    });
  });

  describe('Date Filtering', () => {
    it('should display date range filter', () => {
      cy.log('Verifying date filter');
      cy.get(selectors.meetings.dateFilter).should('be.visible');
    });

    it('should filter meetings by date range', () => {
      cy.log('Testing date range filter');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*from=*to=*`, {
        statusCode: 200,
        body: {
          meetings: [
            { id: '1', title: 'Recent Meeting', createdAt: '2024-01-01T10:00:00Z' },
          ],
          total: 1,
        },
      }).as('dateFiltered');

      cy.get(selectors.meetings.dateFilter).click();
      cy.get('[data-testid="date-from"]').type('2024-01-01');
      cy.get('[data-testid="date-to"]').type('2024-01-31');
      cy.get('[data-testid="apply-date-filter"]').click();

      cy.wait('@dateFiltered');
      cy.url().should('include', 'from=2024-01-01');
    });

    it('should provide quick date range options', () => {
      cy.log('Testing quick date ranges');
      cy.get(selectors.meetings.dateFilter).click();

      cy.get('[data-testid="last-7-days"]').should('be.visible');
      cy.get('[data-testid="last-30-days"]').should('be.visible');
      cy.get('[data-testid="last-90-days"]').should('be.visible');

      cy.get('[data-testid="last-7-days"]').click();
      cy.url().should('include', 'range=last-7-days');
    });
  });

  describe('Sorting', () => {
    it('should display sort dropdown', () => {
      cy.log('Verifying sort dropdown');
      cy.get(selectors.meetings.sortDropdown).should('be.visible');
    });

    it('should sort meetings by date (newest first)', () => {
      cy.log('Testing sort by newest');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*sort=createdAt&order=desc*`, {
        statusCode: 200,
        body: {
          meetings: [
            { id: '1', title: 'Newest Meeting', createdAt: '2024-01-03T10:00:00Z' },
            { id: '2', title: 'Older Meeting', createdAt: '2024-01-01T10:00:00Z' },
          ],
          total: 2,
        },
      }).as('sortedNewest');

      cy.get(selectors.meetings.sortDropdown).click();
      cy.get('[data-value="newest"]').click();

      cy.wait('@sortedNewest');
      cy.url().should('include', 'sort=createdAt');
    });

    it('should sort meetings by date (oldest first)', () => {
      cy.log('Testing sort by oldest');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*sort=createdAt&order=asc*`, {
        statusCode: 200,
        body: {
          meetings: [
            { id: '1', title: 'Oldest Meeting', createdAt: '2024-01-01T10:00:00Z' },
            { id: '2', title: 'Newer Meeting', createdAt: '2024-01-03T10:00:00Z' },
          ],
          total: 2,
        },
      }).as('sortedOldest');

      cy.get(selectors.meetings.sortDropdown).click();
      cy.get('[data-value="oldest"]').click();

      cy.wait('@sortedOldest');
    });

    it('should sort meetings by title', () => {
      cy.log('Testing sort by title');
      cy.get(selectors.meetings.sortDropdown).click();
      cy.get('[data-value="title"]').click();

      cy.url().should('include', 'sort=title');
    });

    it('should sort meetings by duration', () => {
      cy.log('Testing sort by duration');
      cy.get(selectors.meetings.sortDropdown).click();
      cy.get('[data-value="duration"]').click();

      cy.url().should('include', 'sort=duration');
    });
  });

  describe('Combined Filters', () => {
    it('should apply multiple filters simultaneously', () => {
      cy.log('Testing combined filters');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*status=completed*range=last-7-days*`, {
        statusCode: 200,
        body: {
          meetings: [
            { id: '1', title: 'Filtered Meeting', status: 'completed' },
          ],
          total: 1,
        },
      }).as('combinedFilters');

      cy.get(selectors.meetings.statusFilter).click();
      cy.get('[data-value="completed"]').click();

      cy.get(selectors.meetings.dateFilter).click();
      cy.get('[data-testid="last-7-days"]').click();

      cy.wait('@combinedFilters');
      cy.url().should('include', 'status=completed');
      cy.url().should('include', 'range=last-7-days');
    });

    it('should clear all filters', () => {
      cy.log('Testing clear all filters');
      cy.get(selectors.meetings.statusFilter).click();
      cy.get('[data-value="completed"]').click();

      cy.get('[data-testid="clear-all-filters"]').click();
      cy.url().should('not.include', 'status=');
      cy.url().should('not.include', 'range=');
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', () => {
      cy.log('Verifying pagination');
      cy.get(selectors.meetings.paginationNext).should('be.visible');
    });

    it('should navigate to next page', () => {
      cy.log('Testing next page');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*page=2*`, {
        statusCode: 200,
        body: {
          meetings: [
            { id: '4', title: 'Page 2 Meeting' },
          ],
          total: 25,
          page: 2,
          pageSize: 10,
        },
      }).as('page2');

      cy.get(selectors.meetings.paginationNext).click();
      cy.wait('@page2');
      cy.url().should('include', 'page=2');
    });

    it('should navigate to previous page', () => {
      cy.log('Testing previous page');
      cy.visit('/meetings?page=2');
      cy.wait('@getMeetings');

      cy.get(selectors.meetings.paginationPrev).click();
      cy.url().should('not.include', 'page=');
    });

    it('should disable previous button on first page', () => {
      cy.log('Testing disabled previous button');
      cy.get(selectors.meetings.paginationPrev).should('be.disabled');
    });
  });

  describe('Advanced Search', () => {
    it('should open advanced search modal', () => {
      cy.log('Testing advanced search');
      cy.get('[data-testid="advanced-search"]').click();
      cy.get('[data-testid="advanced-search-modal"]').should('be.visible');
    });

    it('should search by participant', () => {
      cy.log('Testing search by participant');
      cy.get('[data-testid="advanced-search"]').click();
      cy.get('[data-testid="participant-search"]').type('john@example.com');
      cy.get('[data-testid="apply-advanced-search"]').click();

      cy.url().should('include', 'participant=john');
    });

    it('should search by tags', () => {
      cy.log('Testing search by tags');
      cy.get('[data-testid="advanced-search"]').click();
      cy.get('[data-testid="tags-input"]').type('important');
      cy.get('[data-testid="apply-advanced-search"]').click();

      cy.url().should('include', 'tags=important');
    });
  });
});
