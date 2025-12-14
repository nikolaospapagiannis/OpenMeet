/**
 * E2E Tests - Integration Management
 * Tests for connecting and managing third-party integrations
 */

import { testUsers, testIntegrations } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Integration Management', () => {
  beforeEach(() => {
    ApiHelper.setupAllInterceptors();
    cy.login(testUsers.validUser.email, testUsers.validUser.password);
    cy.visit('/integrations');
    cy.wait('@getIntegrations');
  });

  describe('Integrations Page Display', () => {
    it('should display integrations page', () => {
      cy.log('Verifying integrations page');
      cy.get(selectors.integrations.container).should('be.visible');
    });

    it('should display available integrations', () => {
      cy.log('Verifying integration cards');
      cy.get(selectors.integrations.integrationCard).should('have.length.greaterThan', 0);
    });

    it('should display integration names and logos', () => {
      cy.log('Verifying integration information');
      cy.get(selectors.integrations.integrationCard).first().within(() => {
        cy.get(selectors.integrations.integrationName).should('be.visible');
        cy.get('[data-testid="integration-logo"]').should('be.visible');
      });
    });

    it('should display connection status', () => {
      cy.log('Verifying connection status');
      cy.get(selectors.integrations.integrationStatus).should('exist');
    });
  });

  describe('Zoom Integration', () => {
    it('should display Zoom integration card', () => {
      cy.log('Verifying Zoom integration');
      cy.contains(testIntegrations.zoom.name).should('be.visible');
    });

    it('should open Zoom connection modal', () => {
      cy.log('Testing Zoom connection modal');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.get('[data-testid="integration-modal"]').should('be.visible');
    });

    it('should connect Zoom integration with API credentials', () => {
      cy.log('Testing Zoom connection');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.get(selectors.integrations.apiKeyInput).type(testIntegrations.zoom.credentials.apiKey);
      cy.get(selectors.integrations.apiSecretInput).type(testIntegrations.zoom.credentials.apiSecret);
      cy.get(selectors.integrations.saveButton).click();

      cy.wait('@connectIntegration');
      cy.contains('Integration connected successfully').should('be.visible');
    });

    it('should validate API credentials', () => {
      cy.log('Testing credentials validation');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.get(selectors.integrations.saveButton).click();
      cy.contains('API key is required').should('be.visible');
    });

    it('should test Zoom connection', () => {
      cy.log('Testing connection test');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.testButton).click();

      cy.wait('@testIntegration');
      cy.contains('Integration test successful').should('be.visible');
    });

    it('should disconnect Zoom integration', () => {
      cy.log('Testing Zoom disconnection');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.disconnectButton).click();

      cy.get(selectors.common.confirmButton).click();
      cy.wait('@disconnectIntegration');
      cy.contains('Integration disconnected').should('be.visible');
    });
  });

  describe('Slack Integration', () => {
    it('should display Slack integration card', () => {
      cy.log('Verifying Slack integration');
      cy.contains(testIntegrations.slack.name).should('be.visible');
    });

    it('should connect Slack via OAuth', () => {
      cy.log('Testing Slack OAuth connection');
      cy.intercept('GET', '/integrations/slack/oauth', {
        statusCode: 302,
        headers: {
          location: 'https://slack.com/oauth/authorize?client_id=test',
        },
      }).as('slackOAuth');

      cy.intercept('GET', '/integrations/slack/callback*', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Slack connected successfully',
        },
      }).as('slackCallback');

      cy.contains(testIntegrations.slack.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.wait('@slackOAuth');
      cy.wait('@slackCallback');
      cy.contains('Slack connected').should('be.visible');
    });

    it('should configure Slack notification settings', () => {
      cy.log('Testing Slack settings');
      cy.contains(testIntegrations.slack.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.configureButton).click();

      cy.get('[data-testid="slack-channel-select"]').click();
      cy.get('[data-value="general"]').click();
      cy.get('[data-testid="save-settings"]').click();

      cy.contains('Settings saved').should('be.visible');
    });

    it('should send test notification to Slack', () => {
      cy.log('Testing Slack notification');
      cy.contains(testIntegrations.slack.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.testButton).click();

      cy.wait('@testIntegration');
      cy.contains('Test message sent').should('be.visible');
    });
  });

  describe('Google Calendar Integration', () => {
    it('should display Google Calendar integration card', () => {
      cy.log('Verifying Google Calendar integration');
      cy.contains(testIntegrations.calendar.name).should('be.visible');
    });

    it('should connect Google Calendar via OAuth', () => {
      cy.log('Testing Google Calendar OAuth');
      cy.intercept('GET', '/integrations/calendar/oauth', {
        statusCode: 302,
        headers: {
          location: 'https://accounts.google.com/oauth',
        },
      }).as('calendarOAuth');

      cy.intercept('GET', '/integrations/calendar/callback*', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Calendar connected successfully',
        },
      }).as('calendarCallback');

      cy.contains(testIntegrations.calendar.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.wait('@calendarOAuth');
      cy.wait('@calendarCallback');
      cy.contains('Calendar connected').should('be.visible');
    });

    it('should sync calendar events', () => {
      cy.log('Testing calendar sync');
      cy.contains(testIntegrations.calendar.name).parents(selectors.integrations.integrationCard)
        .find('[data-testid="sync-button"]').click();

      cy.intercept('POST', `${Cypress.env('API_URL')}/integrations/calendar/sync`, {
        statusCode: 200,
        body: {
          synced: 10,
          message: 'Calendar synced successfully',
        },
      }).as('calendarSync');

      cy.wait('@calendarSync');
      cy.contains('10 events synced').should('be.visible');
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle connection errors', () => {
      cy.log('Testing connection error handling');
      ApiHelper.mockApiError('POST', `${Cypress.env('API_URL')}/integrations/*/connect`, 400, 'Invalid credentials');

      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.get(selectors.integrations.apiKeyInput).type('invalid-key');
      cy.get(selectors.integrations.apiSecretInput).type('invalid-secret');
      cy.get(selectors.integrations.saveButton).click();

      cy.contains('Invalid credentials').should('be.visible');
    });

    it('should handle OAuth errors', () => {
      cy.log('Testing OAuth error handling');
      cy.intercept('GET', '/integrations/slack/callback*', {
        statusCode: 401,
        body: {
          error: 'OAuth authentication failed',
        },
      }).as('oauthError');

      cy.contains(testIntegrations.slack.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.contains('OAuth authentication failed').should('be.visible');
    });

    it('should handle network errors', () => {
      cy.log('Testing network error handling');
      ApiHelper.mockApiError('POST', `${Cypress.env('API_URL')}/integrations/*/connect`, 500);

      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find(selectors.integrations.connectButton).click();

      cy.get(selectors.integrations.apiKeyInput).type('test-key');
      cy.get(selectors.integrations.apiSecretInput).type('test-secret');
      cy.get(selectors.integrations.saveButton).click();

      cy.contains('An error occurred').should('be.visible');
    });
  });

  describe('Integration Webhooks', () => {
    it('should display webhook URL for integration', () => {
      cy.log('Testing webhook display');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find('[data-testid="view-webhook"]').click();

      cy.get('[data-testid="webhook-url"]').should('be.visible');
    });

    it('should copy webhook URL', () => {
      cy.log('Testing webhook URL copy');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find('[data-testid="view-webhook"]').click();

      cy.get('[data-testid="copy-webhook"]').click();
      cy.contains('Webhook URL copied').should('be.visible');
    });

    it('should regenerate webhook secret', () => {
      cy.log('Testing webhook secret regeneration');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find('[data-testid="view-webhook"]').click();

      cy.get('[data-testid="regenerate-secret"]').click();
      cy.get(selectors.common.confirmButton).click();
      cy.contains('Secret regenerated').should('be.visible');
    });
  });

  describe('Integration Permissions', () => {
    it('should display required permissions', () => {
      cy.log('Testing permissions display');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find('[data-testid="view-permissions"]').click();

      cy.get('[data-testid="permissions-list"]').should('be.visible');
    });

    it('should allow granting specific permissions', () => {
      cy.log('Testing permission management');
      cy.contains(testIntegrations.zoom.name).parents(selectors.integrations.integrationCard)
        .find('[data-testid="view-permissions"]').click();

      cy.get('[data-testid="permission-checkbox"]').first().check();
      cy.get('[data-testid="save-permissions"]').click();
      cy.contains('Permissions updated').should('be.visible');
    });
  });
});
