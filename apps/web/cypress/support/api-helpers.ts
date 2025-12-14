/**
 * API Helper Functions
 * Utilities for mocking and intercepting API calls
 */

import { apiResponses, mockTranscript, mockAnalytics } from './test-data';

export class ApiHelper {
  private static baseUrl = Cypress.env('API_URL');

  /**
   * Setup authentication interceptors
   */
  static setupAuthInterceptors() {
    // Login endpoint
    cy.intercept('POST', `${this.baseUrl}/auth/login`, (req) => {
      const { email, password } = req.body;
      if (email === 'test@example.com' && password === 'Test123!') {
        req.reply(apiResponses.loginSuccess);
      } else {
        req.reply(apiResponses.loginFailure);
      }
    }).as('login');

    // Register endpoint
    cy.intercept('POST', `${this.baseUrl}/auth/register`, {
      statusCode: 201,
      body: {
        user: {
          id: 'new-user-123',
          email: req => req.body.email,
        },
        message: 'User registered successfully',
      },
    }).as('register');

    // Logout endpoint
    cy.intercept('POST', `${this.baseUrl}/auth/logout`, {
      statusCode: 200,
      body: { message: 'Logged out successfully' },
    }).as('logout');

    // Refresh token endpoint
    cy.intercept('POST', `${this.baseUrl}/auth/refresh`, {
      statusCode: 200,
      body: {
        accessToken: 'new-access-token',
      },
    }).as('refreshToken');
  }

  /**
   * Setup meeting-related interceptors
   */
  static setupMeetingInterceptors() {
    // Get meetings list
    cy.intercept('GET', `${this.baseUrl}/meetings*`, apiResponses.meetingsList).as('getMeetings');

    // Get single meeting
    cy.intercept('GET', `${this.baseUrl}/meetings/*`, {
      statusCode: 200,
      body: {
        id: 'meeting-123',
        title: 'Test Meeting',
        description: 'This is a test meeting',
        status: 'completed',
        participants: ['test@example.com'],
        transcript: mockTranscript,
        createdAt: '2024-01-01T10:00:00Z',
      },
    }).as('getMeeting');

    // Create meeting
    cy.intercept('POST', `${this.baseUrl}/meetings`, apiResponses.meetingCreate).as('createMeeting');

    // Update meeting
    cy.intercept('PATCH', `${this.baseUrl}/meetings/*`, {
      statusCode: 200,
      body: { message: 'Meeting updated successfully' },
    }).as('updateMeeting');

    // Delete meeting
    cy.intercept('DELETE', `${this.baseUrl}/meetings/*`, {
      statusCode: 204,
    }).as('deleteMeeting');

    // Upload recording
    cy.intercept('POST', `${this.baseUrl}/meetings/upload`, {
      statusCode: 200,
      body: {
        id: 'upload-123',
        status: 'processing',
        message: 'File uploaded successfully',
      },
    }).as('uploadRecording');

    // Get transcript
    cy.intercept('GET', `${this.baseUrl}/meetings/*/transcript`, {
      statusCode: 200,
      body: mockTranscript,
    }).as('getTranscript');
  }

  /**
   * Setup analytics interceptors
   */
  static setupAnalyticsInterceptors() {
    cy.intercept('GET', `${this.baseUrl}/analytics/overview*`, {
      statusCode: 200,
      body: mockAnalytics.overview,
    }).as('getAnalyticsOverview');

    cy.intercept('GET', `${this.baseUrl}/analytics/meetings-over-time*`, {
      statusCode: 200,
      body: mockAnalytics.charts.meetingsOverTime,
    }).as('getMeetingsOverTime');

    cy.intercept('GET', `${this.baseUrl}/analytics/meetings-by-type*`, {
      statusCode: 200,
      body: mockAnalytics.charts.meetingsByType,
    }).as('getMeetingsByType');
  }

  /**
   * Setup integration interceptors
   */
  static setupIntegrationInterceptors() {
    // Get integrations
    cy.intercept('GET', `${this.baseUrl}/integrations`, {
      statusCode: 200,
      body: {
        integrations: [
          { id: 'zoom', name: 'Zoom', connected: true, type: 'video_conferencing' },
          { id: 'slack', name: 'Slack', connected: false, type: 'messaging' },
          { id: 'calendar', name: 'Google Calendar', connected: true, type: 'calendar' },
        ],
      },
    }).as('getIntegrations');

    // Connect integration
    cy.intercept('POST', `${this.baseUrl}/integrations/*/connect`, {
      statusCode: 200,
      body: {
        message: 'Integration connected successfully',
        connected: true,
      },
    }).as('connectIntegration');

    // Disconnect integration
    cy.intercept('POST', `${this.baseUrl}/integrations/*/disconnect`, {
      statusCode: 200,
      body: {
        message: 'Integration disconnected successfully',
        connected: false,
      },
    }).as('disconnectIntegration');

    // Test integration
    cy.intercept('POST', `${this.baseUrl}/integrations/*/test`, {
      statusCode: 200,
      body: {
        success: true,
        message: 'Integration test successful',
      },
    }).as('testIntegration');
  }

  /**
   * Setup search interceptors
   */
  static setupSearchInterceptors() {
    cy.intercept('GET', `${this.baseUrl}/search*`, (req) => {
      const query = new URL(req.url).searchParams.get('q');
      req.reply({
        statusCode: 200,
        body: {
          results: [
            {
              id: 'result-1',
              type: 'meeting',
              title: `Meeting matching ${query}`,
              snippet: `This meeting contains ${query}`,
            },
          ],
          total: 1,
        },
      });
    }).as('search');
  }

  /**
   * Setup all common interceptors
   */
  static setupAllInterceptors() {
    this.setupAuthInterceptors();
    this.setupMeetingInterceptors();
    this.setupAnalyticsInterceptors();
    this.setupIntegrationInterceptors();
    this.setupSearchInterceptors();
  }

  /**
   * Mock API error
   */
  static mockApiError(method: string, url: string, statusCode = 500, message = 'Internal server error') {
    cy.intercept(method, url, {
      statusCode,
      body: {
        error: message,
        statusCode,
      },
    });
  }

  /**
   * Mock network delay
   */
  static mockNetworkDelay(method: string, url: string, delay = 3000) {
    cy.intercept(method, url, (req) => {
      req.reply((res) => {
        res.delay = delay;
        res.send();
      });
    });
  }

  /**
   * Mock rate limit error
   */
  static mockRateLimitError(method: string, url: string) {
    cy.intercept(method, url, {
      statusCode: 429,
      body: {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: 60,
      },
    });
  }

  /**
   * Verify API call was made
   */
  static verifyApiCall(alias: string, expectedBody?: any) {
    cy.wait(`@${alias}`).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204]);
      if (expectedBody) {
        expect(interception.request.body).to.deep.include(expectedBody);
      }
    });
  }

  /**
   * Wait for multiple API calls
   */
  static waitForMultipleApiCalls(aliases: string[]) {
    aliases.forEach((alias) => {
      cy.wait(`@${alias}`);
    });
  }
}

export default ApiHelper;
