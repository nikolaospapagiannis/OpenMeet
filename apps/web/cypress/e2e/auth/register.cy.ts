/**
 * E2E Tests - Registration Flow
 * Comprehensive tests for user registration functionality
 */

import { testUsers, validationMessages } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Registration Flow', () => {
  beforeEach(() => {
    ApiHelper.setupAuthInterceptors();
    cy.visit('/register');
  });

  describe('Registration Form Display', () => {
    it('should display registration form with all required fields', () => {
      cy.log('Verifying registration form elements');
      cy.get(selectors.auth.firstNameInput).should('be.visible');
      cy.get(selectors.auth.lastNameInput).should('be.visible');
      cy.get(selectors.auth.emailInput).should('be.visible');
      cy.get(selectors.auth.passwordInput).should('be.visible');
      cy.get(selectors.auth.submitButton).should('be.visible');
    });

    it('should display link to login page', () => {
      cy.log('Verifying login link');
      cy.contains('Sign in').should('be.visible').and('have.attr', 'href', '/login');
    });

    it('should display terms and privacy policy links', () => {
      cy.log('Verifying legal links');
      cy.contains('Terms of Service').should('be.visible');
      cy.contains('Privacy Policy').should('be.visible');
    });
  });

  describe('Email Validation', () => {
    it('should show error for empty email', () => {
      cy.log('Testing empty email validation');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();
      cy.contains(validationMessages.email.required).should('be.visible');
    });

    it('should show error for invalid email format', () => {
      cy.log('Testing invalid email format');
      cy.get(selectors.auth.emailInput).type('invalid-email');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();
      cy.contains(validationMessages.email.invalid).should('be.visible');
    });

    it('should show error for already registered email', () => {
      cy.log('Testing duplicate email');
      cy.intercept('POST', `${Cypress.env('API_URL')}/auth/register`, {
        statusCode: 409,
        body: {
          error: 'Email already registered',
        },
      }).as('registerDuplicate');

      cy.get(selectors.auth.emailInput).type(testUsers.validUser.email);
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@registerDuplicate');
      cy.contains('Email already registered').should('be.visible');
    });
  });

  describe('Password Strength Validation', () => {
    it('should reject weak passwords', () => {
      cy.log('Testing weak password rejection');
      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('weak');
      cy.get(selectors.auth.submitButton).click();
      cy.contains(validationMessages.password.weak).should('be.visible');
    });

    it('should require minimum password length', () => {
      cy.log('Testing password minimum length');
      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('short');
      cy.get(selectors.auth.submitButton).click();
      cy.contains(validationMessages.password.minLength).should('be.visible');
    });

    it('should display password strength indicator', () => {
      cy.log('Testing password strength indicator');
      cy.get(selectors.auth.passwordInput).type('weak');
      cy.get('[data-testid="password-strength"]').should('contain', 'Weak');

      cy.get(selectors.auth.passwordInput).clear().type('Medium123');
      cy.get('[data-testid="password-strength"]').should('contain', 'Medium');

      cy.get(selectors.auth.passwordInput).clear().type('Strong123!@#');
      cy.get('[data-testid="password-strength"]').should('contain', 'Strong');
    });

    it('should accept strong passwords', () => {
      cy.log('Testing strong password acceptance');
      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('StrongPassword123!');
      cy.get(selectors.auth.submitButton).click();
      cy.get('[data-testid="password-strength"]').should('contain', 'Strong');
    });
  });

  describe('Name Validation', () => {
    it('should require first name', () => {
      cy.log('Testing first name required');
      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();
      cy.contains('First name is required').should('be.visible');
    });

    it('should require last name', () => {
      cy.log('Testing last name required');
      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();
      cy.contains('Last name is required').should('be.visible');
    });
  });

  describe('Successful Registration', () => {
    it('should register new user successfully', () => {
      cy.log('Testing successful registration');
      const timestamp = Date.now();
      cy.get(selectors.auth.emailInput).type(`test${timestamp}@example.com`);
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('SecurePassword123!');
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@register');
      cy.url().should('include', '/dashboard');
    });

    it('should show success message after registration', () => {
      cy.log('Testing success message');
      const timestamp = Date.now();
      cy.get(selectors.auth.emailInput).type(`test${timestamp}@example.com`);
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('SecurePassword123!');
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@register');
      cy.contains('Registration successful').should('be.visible');
    });

    it('should automatically log in after registration', () => {
      cy.log('Testing auto-login after registration');
      const timestamp = Date.now();
      cy.get(selectors.auth.emailInput).type(`test${timestamp}@example.com`);
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('SecurePassword123!');
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@register');
      cy.getCookie('access_token').should('exist');
    });
  });

  describe('Loading State', () => {
    it('should show loading state during registration', () => {
      cy.log('Testing loading state');
      ApiHelper.mockNetworkDelay('POST', `${Cypress.env('API_URL')}/auth/register`, 2000);

      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();

      cy.get(selectors.auth.submitButton).should('be.disabled');
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.log('Testing network error handling');
      ApiHelper.mockApiError('POST', `${Cypress.env('API_URL')}/auth/register`, 500);

      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();

      cy.contains('An error occurred').should('be.visible');
    });
  });

  describe('Terms Acceptance', () => {
    it('should require terms acceptance', () => {
      cy.log('Testing terms acceptance requirement');
      cy.get(selectors.auth.emailInput).type('test@example.com');
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get(selectors.auth.submitButton).click();

      cy.contains('You must accept the terms').should('be.visible');
    });

    it('should allow registration when terms are accepted', () => {
      cy.log('Testing registration with terms accepted');
      const timestamp = Date.now();
      cy.get(selectors.auth.emailInput).type(`test${timestamp}@example.com`);
      cy.get(selectors.auth.firstNameInput).type('John');
      cy.get(selectors.auth.lastNameInput).type('Doe');
      cy.get(selectors.auth.passwordInput).type('Test123!');
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get(selectors.auth.submitButton).click();

      cy.wait('@register');
      cy.url().should('include', '/dashboard');
    });
  });
});
