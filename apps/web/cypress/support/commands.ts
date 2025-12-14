/**
 * Custom Cypress Commands
 */

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string, rememberMe?: boolean): Chainable<void>;
      loginViaApi(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      createMeeting(title: string, description?: string): Chainable<void>;
      uploadFile(fileName: string, fileType?: string): Chainable<void>;
      interceptAPI(method: string, url: string, alias: string, response?: any): Chainable<void>;
      waitForApiResponse(alias: string, timeout?: number): Chainable<void>;
      stubOAuthProvider(provider: 'google' | 'microsoft', success?: boolean): Chainable<void>;
      checkAccessibility(): Chainable<void>;
      getBySel(selector: string): Chainable<JQuery<HTMLElement>>;
      getBySelLike(selector: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

// Login via UI with session caching
Cypress.Commands.add('login', (email: string, password: string, rememberMe = false) => {
  cy.session(
    [email, password, rememberMe],
    () => {
      cy.visit('/login');
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);

      if (rememberMe) {
        cy.get('input[type="checkbox"]').check();
      }

      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard', { timeout: 10000 });
    },
    {
      validate() {
        cy.getCookie('access_token').should('exist');
      },
    }
  );
});

// Login via API for faster test setup
Cypress.Commands.add('loginViaApi', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/auth/login`,
    body: { email, password },
  }).then((response) => {
    cy.setCookie('access_token', response.body.accessToken);
    cy.setCookie('refresh_token', response.body.refreshToken);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
});

// Create meeting command
Cypress.Commands.add('createMeeting', (title: string, description = '') => {
  cy.get('[data-testid="create-meeting-button"]').click();
  cy.get('input[name="title"]').type(title);
  if (description) {
    cy.get('textarea[name="description"]').type(description);
  }
  cy.get('button[type="submit"]').click();
  cy.contains('Meeting created').should('be.visible');
});

// File upload command
Cypress.Commands.add('uploadFile', (fileName: string, fileType = 'audio/mp3') => {
  cy.get('input[type="file"]').selectFile(`cypress/fixtures/${fileName}`, {
    force: true,
    mimeType: fileType,
  });
});

// API interception command
Cypress.Commands.add('interceptAPI', (method: string, url: string, alias: string, response?: any) => {
  if (response) {
    cy.intercept(method, url, response).as(alias);
  } else {
    cy.intercept(method, url).as(alias);
  }
});

// Wait for API response with custom timeout
Cypress.Commands.add('waitForApiResponse', (alias: string, timeout = 10000) => {
  cy.wait(`@${alias}`, { timeout });
});

// Stub OAuth providers
Cypress.Commands.add('stubOAuthProvider', (provider: 'google' | 'microsoft', success = true) => {
  const mockUser = {
    id: 'oauth-user-123',
    email: `test@${provider}.com`,
    firstName: 'OAuth',
    lastName: 'User',
    provider,
  };

  cy.intercept('GET', `/auth/${provider}`, (req) => {
    if (success) {
      req.reply({
        statusCode: 302,
        headers: {
          location: `/auth/${provider}/callback?code=mock-auth-code`,
        },
      });
    } else {
      req.reply({
        statusCode: 401,
        body: { error: 'OAuth authentication failed' },
      });
    }
  }).as(`${provider}OAuth`);

  cy.intercept('GET', `/auth/${provider}/callback*`, {
    statusCode: 200,
    body: {
      user: mockUser,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    },
  }).as(`${provider}Callback`);
});

// Basic accessibility check
Cypress.Commands.add('checkAccessibility', () => {
  cy.get('body').should('be.visible');
  cy.get('[role="main"]').should('exist');
});

// Get by data-testid
Cypress.Commands.add('getBySel', (selector: string) => {
  return cy.get(`[data-testid="${selector}"]`);
});

// Get by partial data-testid match
Cypress.Commands.add('getBySelLike', (selector: string) => {
  return cy.get(`[data-testid*="${selector}"]`);
});

export {};
