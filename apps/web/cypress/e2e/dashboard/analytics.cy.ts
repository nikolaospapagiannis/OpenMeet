/**
 * E2E Tests - Dashboard and Analytics
 * Tests for dashboard metrics, charts, and analytics features
 */

import { testUsers } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Dashboard and Analytics', () => {
  beforeEach(() => {
    ApiHelper.setupAllInterceptors();
    cy.login(testUsers.validUser.email, testUsers.validUser.password);
  });

  describe('Dashboard Overview', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
    });

    it('should display dashboard container', () => {
      cy.log('Verifying dashboard display');
      cy.get(selectors.dashboard.container).should('be.visible');
    });

    it('should display welcome message with user name', () => {
      cy.log('Verifying welcome message');
      cy.get(selectors.dashboard.welcomeMessage).should('be.visible')
        .and('contain', 'Welcome');
    });

    it('should display stats cards', () => {
      cy.log('Verifying stats cards');
      cy.get(selectors.dashboard.statsCard).should('have.length.greaterThan', 0);
    });

    it('should display recent meetings section', () => {
      cy.log('Verifying recent meetings');
      cy.get(selectors.dashboard.recentMeetings).should('be.visible');
    });

    it('should display upcoming meetings section', () => {
      cy.log('Verifying upcoming meetings');
      cy.get(selectors.dashboard.upcomingMeetings).should('be.visible');
    });

    it('should display quick actions', () => {
      cy.log('Verifying quick actions');
      cy.get(selectors.dashboard.quickActions).should('be.visible');
    });

    it('should navigate to meetings from quick actions', () => {
      cy.log('Testing quick action navigation');
      cy.get(selectors.dashboard.quickActions).within(() => {
        cy.contains('Upload Meeting').click();
      });
      cy.url().should('include', '/meetings');
    });
  });

  describe('Analytics Page', () => {
    beforeEach(() => {
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');
    });

    it('should display analytics container', () => {
      cy.log('Verifying analytics page');
      cy.get(selectors.analytics.container).should('be.visible');
    });

    it('should display overview metrics', () => {
      cy.log('Verifying overview metrics');
      cy.get(selectors.analytics.overviewCard).should('be.visible');
      cy.get(selectors.analytics.totalMeetings).should('be.visible');
      cy.get(selectors.analytics.totalHours).should('be.visible');
      cy.get(selectors.analytics.avgDuration).should('be.visible');
      cy.get(selectors.analytics.participantCount).should('be.visible');
    });

    it('should display correct metric values', () => {
      cy.log('Verifying metric values');
      cy.get(selectors.analytics.totalMeetings).should('contain', '156');
      cy.get(selectors.analytics.totalHours).should('contain', '234');
      cy.get(selectors.analytics.avgDuration).should('contain', '45');
      cy.get(selectors.analytics.participantCount).should('contain', '23');
    });

    it('should show loading state while fetching analytics', () => {
      cy.log('Testing loading state');
      ApiHelper.mockNetworkDelay('GET', `${Cypress.env('API_URL')}/analytics/overview*`, 2000);

      cy.reload();
      cy.get(selectors.common.loadingOverlay).should('be.visible');
    });
  });

  describe('Charts and Visualizations', () => {
    beforeEach(() => {
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');
    });

    it('should display meetings over time chart', () => {
      cy.log('Verifying time series chart');
      cy.wait('@getMeetingsOverTime');
      cy.get(selectors.analytics.lineChart).should('be.visible');
    });

    it('should display meetings by type chart', () => {
      cy.log('Verifying meetings by type chart');
      cy.wait('@getMeetingsByType');
      cy.get(selectors.analytics.barChart).should('be.visible');
    });

    it('should render chart with correct data points', () => {
      cy.log('Verifying chart data');
      cy.wait('@getMeetingsOverTime');
      cy.get(selectors.analytics.lineChart).within(() => {
        cy.get('[data-testid="chart-data-point"]').should('have.length.greaterThan', 0);
      });
    });

    it('should show tooltips on chart hover', () => {
      cy.log('Testing chart tooltips');
      cy.wait('@getMeetingsOverTime');
      cy.get(selectors.analytics.lineChart).within(() => {
        cy.get('[data-testid="chart-data-point"]').first().trigger('mouseover');
      });
      cy.get('[data-testid="chart-tooltip"]').should('be.visible');
    });

    it('should allow exporting chart data', () => {
      cy.log('Testing chart export');
      cy.get(selectors.analytics.exportButton).click();
      cy.get('[data-testid="export-csv"]').click();
      cy.contains('Data exported').should('be.visible');
    });
  });

  describe('Date Range Filtering', () => {
    beforeEach(() => {
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');
    });

    it('should display date range filter', () => {
      cy.log('Verifying date range filter');
      cy.get(selectors.analytics.dateRangeFilter).should('be.visible');
    });

    it('should filter analytics by last 7 days', () => {
      cy.log('Testing last 7 days filter');
      cy.intercept('GET', `${Cypress.env('API_URL')}/analytics/overview*range=last-7-days*`, {
        statusCode: 200,
        body: {
          totalMeetings: 25,
          totalHours: 38,
          averageDuration: 45,
          participantCount: 12,
        },
      }).as('last7Days');

      cy.get(selectors.analytics.dateRangeFilter).click();
      cy.get('[data-testid="last-7-days"]').click();

      cy.wait('@last7Days');
      cy.get(selectors.analytics.totalMeetings).should('contain', '25');
    });

    it('should filter analytics by last 30 days', () => {
      cy.log('Testing last 30 days filter');
      cy.intercept('GET', `${Cypress.env('API_URL')}/analytics/overview*range=last-30-days*`, {
        statusCode: 200,
        body: {
          totalMeetings: 89,
          totalHours: 134,
          averageDuration: 45,
          participantCount: 18,
        },
      }).as('last30Days');

      cy.get(selectors.analytics.dateRangeFilter).click();
      cy.get('[data-testid="last-30-days"]').click();

      cy.wait('@last30Days');
      cy.get(selectors.analytics.totalMeetings).should('contain', '89');
    });

    it('should filter analytics by custom date range', () => {
      cy.log('Testing custom date range');
      cy.intercept('GET', `${Cypress.env('API_URL')}/analytics/overview*from=*to=*`, {
        statusCode: 200,
        body: {
          totalMeetings: 50,
          totalHours: 75,
          averageDuration: 45,
          participantCount: 15,
        },
      }).as('customRange');

      cy.get(selectors.analytics.dateRangeFilter).click();
      cy.get('[data-testid="custom-range"]').click();
      cy.get('[data-testid="date-from"]').type('2024-01-01');
      cy.get('[data-testid="date-to"]').type('2024-01-31');
      cy.get('[data-testid="apply-date-range"]').click();

      cy.wait('@customRange');
      cy.get(selectors.analytics.totalMeetings).should('contain', '50');
    });

    it('should update charts when date range changes', () => {
      cy.log('Testing chart updates on filter change');
      cy.wait('@getMeetingsOverTime');

      cy.get(selectors.analytics.dateRangeFilter).click();
      cy.get('[data-testid="last-7-days"]').click();

      cy.wait('@getMeetingsOverTime');
      cy.get(selectors.analytics.lineChart).should('be.visible');
    });
  });

  describe('Team Filtering', () => {
    beforeEach(() => {
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');
    });

    it('should display team filter', () => {
      cy.log('Verifying team filter');
      cy.get(selectors.analytics.teamFilter).should('be.visible');
    });

    it('should filter analytics by team', () => {
      cy.log('Testing team filter');
      cy.intercept('GET', `${Cypress.env('API_URL')}/analytics/overview*team=engineering*`, {
        statusCode: 200,
        body: {
          totalMeetings: 78,
          totalHours: 117,
          averageDuration: 45,
          participantCount: 12,
        },
      }).as('engineeringTeam');

      cy.get(selectors.analytics.teamFilter).click();
      cy.get('[data-value="engineering"]').click();

      cy.wait('@engineeringTeam');
      cy.get(selectors.analytics.totalMeetings).should('contain', '78');
    });
  });

  describe('Meeting Type Filtering', () => {
    beforeEach(() => {
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');
    });

    it('should display type filter', () => {
      cy.log('Verifying type filter');
      cy.get(selectors.analytics.typeFilter).should('be.visible');
    });

    it('should filter analytics by meeting type', () => {
      cy.log('Testing type filter');
      cy.intercept('GET', `${Cypress.env('API_URL')}/analytics/overview*type=standup*`, {
        statusCode: 200,
        body: {
          totalMeetings: 45,
          totalHours: 34,
          averageDuration: 30,
          participantCount: 8,
        },
      }).as('standupType');

      cy.get(selectors.analytics.typeFilter).click();
      cy.get('[data-value="standup"]').click();

      cy.wait('@standupType');
      cy.get(selectors.analytics.totalMeetings).should('contain', '45');
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');
    });

    it('should export analytics as CSV', () => {
      cy.log('Testing CSV export');
      cy.intercept('POST', `${Cypress.env('API_URL')}/analytics/export`, {
        statusCode: 200,
        body: {
          downloadUrl: 'https://example.com/export.csv',
        },
      }).as('exportCSV');

      cy.get(selectors.analytics.exportButton).click();
      cy.get('[data-testid="export-csv"]').click();

      cy.wait('@exportCSV');
      cy.contains('Export ready').should('be.visible');
    });

    it('should export analytics as PDF', () => {
      cy.log('Testing PDF export');
      cy.intercept('POST', `${Cypress.env('API_URL')}/analytics/export`, {
        statusCode: 200,
        body: {
          downloadUrl: 'https://example.com/export.pdf',
        },
      }).as('exportPDF');

      cy.get(selectors.analytics.exportButton).click();
      cy.get('[data-testid="export-pdf"]').click();

      cy.wait('@exportPDF');
      cy.contains('Export ready').should('be.visible');
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');
    });

    it('should refresh analytics data periodically', () => {
      cy.log('Testing auto-refresh');
      cy.intercept('GET', `${Cypress.env('API_URL')}/analytics/overview*`, {
        statusCode: 200,
        body: {
          totalMeetings: 157,
          totalHours: 235,
          averageDuration: 45,
          participantCount: 23,
        },
      }).as('refreshedData');

      cy.clock();
      cy.tick(60000);

      cy.wait('@refreshedData');
      cy.get(selectors.analytics.totalMeetings).should('contain', '157');
    });

    it('should allow manual refresh', () => {
      cy.log('Testing manual refresh');
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@getAnalyticsOverview');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.visit('/analytics');
    });

    it('should handle analytics loading errors', () => {
      cy.log('Testing error handling');
      ApiHelper.mockApiError('GET', `${Cypress.env('API_URL')}/analytics/overview*`, 500);

      cy.reload();
      cy.contains('Failed to load analytics').should('be.visible');
    });

    it('should show retry option on error', () => {
      cy.log('Testing retry functionality');
      ApiHelper.mockApiError('GET', `${Cypress.env('API_URL')}/analytics/overview*`, 500);

      cy.reload();
      cy.get('[data-testid="retry-button"]').should('be.visible').click();
    });
  });

  describe('Responsive Charts', () => {
    it('should adjust charts for mobile viewport', () => {
      cy.log('Testing responsive charts');
      cy.viewport('iphone-x');
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');

      cy.get(selectors.analytics.chartContainer).should('be.visible');
    });

    it('should adjust charts for tablet viewport', () => {
      cy.log('Testing tablet viewport');
      cy.viewport('ipad-2');
      cy.visit('/analytics');
      cy.wait('@getAnalyticsOverview');

      cy.get(selectors.analytics.chartContainer).should('be.visible');
    });
  });
});
