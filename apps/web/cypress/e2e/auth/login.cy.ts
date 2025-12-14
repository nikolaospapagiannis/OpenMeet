/**
 * E2E Tests - Login Flow
 * Comprehensive tests for user authentication and login functionality
 */

import { testUsers, validationMessages } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Login Flow', () => {
  beforeEach(() => {
    ApiHelper.setupAuthInterceptors();
    cy.visit('/login');
  });

  describe('Login Page Display', () => {
    it('should display login form with all required elements', () => {
      cy.log('Verifying login form elements');
      cy.get(selectors.auth.emailInput).should('be.visible');
      cy.get(selectors.auth.passwordInput).should('be.visible');
      cy.get(selectors.auth.submitButton).should('be.visible');
      cy.get(selectors.auth.rememberMeCheckbox).should('exist');
    });

    it('should display OAuth login options', () => {
      cy.log('Verifying OAuth buttons');
      cy.get(selectors.auth.googleOAuthButton).should('be.visible');
      cy.get(selectors.auth.microsoftOAuthButton).should('be.visible');
    });

    it('should display link to registration page', () => {
      cy.log('Verifying registration link');
      cy.contains('Sign up').should('be.visible').and('have.attr', 'href', '/register');
    });

    it('should display forgot password link', () => {
      cy.log('Verifying forgot password link');
      cy.contains('Forgot password').should('be.visible');
    });
  });

  describe('Login Validation', () => {
    it('should show error for empty email', () => {
      cy.log('Testing empty email validation');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();
      cy.contains(validationMessages.email.required).should('be.visible');
    });

    it('should show error for invalid email format', () => {
      cy.log('Testing invalid email format');
      cy.get(selectors.auth.emailInput).type('invalid-email');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();
      cy.contains(validationMessages.email.invalid).should('be.visible');
    });

    it('should show error for empty password', () => {
      cy.log('Testing empty password validation');
      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.submitButton).click();
      cy.contains(validationMessages.password.required).should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.log('Testing invalid credentials');
      cy.get(selectors.auth.emailInput).type(testUsers.invalidUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.invalidUser.password);
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@login');
      cy.contains('Invalid credentials').should('be.visible');
    });
  });

  describe('Successful Login', () => {
    it('should login successfully with valid credentials', () => {
      cy.log('Testing successful login');
      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.validUser.password);
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@login');
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome').should('be.visible');
    });

    it('should set authentication cookies on successful login', () => {
      cy.log('Verifying authentication cookies');
      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.validUser.password);
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@login');
      cy.getCookie('access_token').should('exist');
    });

    it('should persist session when remember me is checked', () => {
      cy.log('Testing remember me functionality');
      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.validUser.password);
      cy.get(selectors.auth.rememberMeCheckbox).check();
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@login');
      cy.getCookie('refresh_token').should('exist');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      cy.log('Testing password visibility toggle');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.passwordInput).should('have.attr', 'type', 'password');

      cy.get('[data-testid="toggle-password"]').click();
      cy.get(selectors.auth.passwordInput).should('have.attr', 'type', 'text');

      cy.get('[data-testid="toggle-password"]').click();
      cy.get(selectors.auth.passwordInput).should('have.attr', 'type', 'password');
    });
  });

  describe('Login Loading State', () => {
    it('should show loading state during login', () => {
      cy.log('Testing loading state');
      ApiHelper.mockNetworkDelay('POST', `${Cypress.env('API_URL')}/auth/login`, 2000);

      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.validUser.password);
      cy.get(selectors.auth.submitButton).click();

      cy.get(selectors.auth.submitButton).should('be.disabled');
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
    });
  });

  describe('Login Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.log('Testing network error handling');
      ApiHelper.mockApiError('POST', `${Cypress.env('API_URL')}/auth/login`, 500);

      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.validUser.password);
      cy.get(selectors.auth.submitButton).click();

      cy.contains('An error occurred').should('be.visible');
    });

    it('should handle rate limit errors', () => {
      cy.log('Testing rate limit handling');
      ApiHelper.mockRateLimitError('POST', `${Cypress.env('API_URL')}/auth/login`);

      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.validUser.password);
      cy.get(selectors.auth.submitButton).click();

      cy.contains('Too many login attempts').should('be.visible');
    });
  });

  describe('Redirect After Login', () => {
    it('should redirect to intended page after login', () => {
      cy.log('Testing redirect to intended page');
      cy.visit('/meetings');
      cy.url().should('include', '/login');

      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.passwordInput).type(testUsers.validUser.password);
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@login');
      cy.url().should('include', '/meetings');
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility attributes', () => {
      cy.log('Testing accessibility');
      cy.get(selectors.auth.emailInput).should('have.attr', 'aria-label');
      cy.get(selectors.auth.passwordInput).should('have.attr', 'aria-label');
      cy.get(selectors.auth.submitButton).should('have.attr', 'aria-label');
    });
  });
});
