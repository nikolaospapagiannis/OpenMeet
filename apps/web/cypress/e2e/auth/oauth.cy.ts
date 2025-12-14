/**
 * E2E Tests - OAuth Authentication Flow
 * Tests for Google and Microsoft OAuth login (stubbed external providers)
 */

import { selectors } from '../../support/selectors';

describe('OAuth Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  describe('Google OAuth Flow', () => {
    it('should display Google OAuth button', () => {
      cy.log('Verifying Google OAuth button');
      cy.get(selectors.auth.googleOAuthButton)
        .should('be.visible')
        .and('contain', 'Google');
    });

    it('should successfully authenticate with Google OAuth', () => {
      cy.log('Testing successful Google OAuth flow');
      cy.stubOAuthProvider('google', true);

      cy.get(selectors.auth.googleOAuthButton).click();
      cy.wait('@googleOAuth');
      cy.wait('@googleCallback');

      cy.url().should('include', '/dashboard');
      cy.getCookie('access_token').should('exist');
    });

    it('should handle Google OAuth authentication failure', () => {
      cy.log('Testing Google OAuth failure');
      cy.stubOAuthProvider('google', false);

      cy.get(selectors.auth.googleOAuthButton).click();
      cy.wait('@googleOAuth');

      cy.contains('OAuth authentication failed').should('be.visible');
    });

    it('should create user session after Google OAuth success', () => {
      cy.log('Verifying user session after Google OAuth');
      cy.stubOAuthProvider('google', true);

      cy.get(selectors.auth.googleOAuthButton).click();
      cy.wait('@googleOAuth');
      cy.wait('@googleCallback');

      cy.window().then((win) => {
        const user = JSON.parse(win.localStorage.getItem('user') || '{}');
        expect(user).to.have.property('email');
        expect(user.provider).to.equal('google');
      });
    });

    it('should redirect to intended page after Google OAuth', () => {
      cy.log('Testing redirect after Google OAuth');
      cy.visit('/meetings');
      cy.url().should('include', '/login');

      cy.stubOAuthProvider('google', true);
      cy.get(selectors.auth.googleOAuthButton).click();
      cy.wait('@googleOAuth');
      cy.wait('@googleCallback');

      cy.url().should('include', '/meetings');
    });
  });

  describe('Microsoft OAuth Flow', () => {
    it('should display Microsoft OAuth button', () => {
      cy.log('Verifying Microsoft OAuth button');
      cy.get(selectors.auth.microsoftOAuthButton)
        .should('be.visible')
        .and('contain', 'Microsoft');
    });

    it('should successfully authenticate with Microsoft OAuth', () => {
      cy.log('Testing successful Microsoft OAuth flow');
      cy.stubOAuthProvider('microsoft', true);

      cy.get(selectors.auth.microsoftOAuthButton).click();
      cy.wait('@microsoftOAuth');
      cy.wait('@microsoftCallback');

      cy.url().should('include', '/dashboard');
      cy.getCookie('access_token').should('exist');
    });

    it('should handle Microsoft OAuth authentication failure', () => {
      cy.log('Testing Microsoft OAuth failure');
      cy.stubOAuthProvider('microsoft', false);

      cy.get(selectors.auth.microsoftOAuthButton).click();
      cy.wait('@microsoftOAuth');

      cy.contains('OAuth authentication failed').should('be.visible');
    });

    it('should create user session after Microsoft OAuth success', () => {
      cy.log('Verifying user session after Microsoft OAuth');
      cy.stubOAuthProvider('microsoft', true);

      cy.get(selectors.auth.microsoftOAuthButton).click();
      cy.wait('@microsoftOAuth');
      cy.wait('@microsoftCallback');

      cy.window().then((win) => {
        const user = JSON.parse(win.localStorage.getItem('user') || '{}');
        expect(user).to.have.property('email');
        expect(user.provider).to.equal('microsoft');
      });
    });
  });

  describe('OAuth Error Scenarios', () => {
    it('should handle OAuth popup blocked', () => {
      cy.log('Testing OAuth popup blocked scenario');
      cy.window().then((win) => {
        cy.stub(win, 'open').returns(null);
      });

      cy.get(selectors.auth.googleOAuthButton).click();
      cy.contains('popup was blocked').should('be.visible');
    });

    it('should handle OAuth timeout', () => {
      cy.log('Testing OAuth timeout');
      cy.intercept('GET', '/auth/google', (req) => {
        req.reply((res) => {
          res.delay = 30000;
          res.send();
        });
      }).as('googleOAuthTimeout');

      cy.get(selectors.auth.googleOAuthButton).click();
      cy.contains('OAuth timeout', { timeout: 35000 }).should('be.visible');
    });

    it('should handle OAuth user cancellation', () => {
      cy.log('Testing OAuth user cancellation');
      cy.intercept('GET', '/auth/google/callback*', {
        statusCode: 401,
        body: {
          error: 'User cancelled OAuth flow',
        },
      }).as('googleCancel');

      cy.stubOAuthProvider('google', true);
      cy.get(selectors.auth.googleOAuthButton).click();

      cy.contains('Authentication cancelled').should('be.visible');
    });
  });

  describe('OAuth Security', () => {
    it('should include state parameter for CSRF protection', () => {
      cy.log('Verifying CSRF protection');
      cy.intercept('GET', '/auth/google', (req) => {
        expect(req.url).to.include('state=');
      }).as('googleOAuthState');

      cy.get(selectors.auth.googleOAuthButton).click();
      cy.wait('@googleOAuthState');
    });

    it('should validate OAuth callback state parameter', () => {
      cy.log('Testing state parameter validation');
      cy.intercept('GET', '/auth/google/callback*', (req) => {
        const url = new URL(req.url);
        const state = url.searchParams.get('state');
        expect(state).to.exist;
      }).as('googleCallbackState');

      cy.stubOAuthProvider('google', true);
      cy.get(selectors.auth.googleOAuthButton).click();
    });
  });

  describe('OAuth Account Linking', () => {
    it('should link OAuth account to existing user', () => {
      cy.log('Testing OAuth account linking');
      cy.login('test@example.com', 'Test123!');
      cy.visit('/settings');

      cy.stubOAuthProvider('google', true);
      cy.get('[data-testid="link-google"]').click();
      cy.wait('@googleOAuth');
      cy.wait('@googleCallback');

      cy.contains('Google account linked').should('be.visible');
    });

    it('should prevent duplicate OAuth account linking', () => {
      cy.log('Testing duplicate OAuth linking prevention');
      cy.login('test@example.com', 'Test123!');
      cy.visit('/settings');

      cy.intercept('POST', `${Cypress.env('API_URL')}/auth/link/google`, {
        statusCode: 409,
        body: {
          error: 'OAuth account already linked',
        },
      }).as('linkDuplicate');

      cy.get('[data-testid="link-google"]').click();
      cy.wait('@linkDuplicate');

      cy.contains('already linked').should('be.visible');
    });
  });
});
