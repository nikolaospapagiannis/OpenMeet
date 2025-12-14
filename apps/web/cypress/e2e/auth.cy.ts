/**
 * E2E Tests - Authentication Flow
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Registration', () => {
    it('should display registration form', () => {
      cy.visit('/register');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('input[name="firstName"]').should('be.visible');
      cy.get('input[name="lastName"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should validate email format', () => {
      cy.visit('/register');
      cy.get('input[name="email"]').type('invalid-email');
      cy.get('input[name="password"]').type('Password123!');
      cy.get('input[name="firstName"]').type('John');
      cy.get('input[name="lastName"]').type('Doe');
      cy.get('button[type="submit"]').click();
      cy.contains('Invalid email').should('be.visible');
    });

    it('should validate password strength', () => {
      cy.visit('/register');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('weak');
      cy.get('button[type="submit"]').click();
      cy.contains('Password must be').should('be.visible');
    });

    it('should register new user successfully', () => {
      cy.visit('/register');
      const timestamp = Date.now();
      cy.get('input[name="email"]').type(`test${timestamp}@example.com`);
      cy.get('input[name="password"]').type('SecurePassword123!');
      cy.get('input[name="firstName"]').type('Test');
      cy.get('input[name="lastName"]').type('User');
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/dashboard');
    });
  });

  describe('Login', () => {
    it('should display login form', () => {
      cy.visit('/login');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      cy.get('input[name="email"]').type('wrong@example.com');
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      cy.contains('Invalid credentials').should('be.visible');
    });

    it('should login successfully with valid credentials', () => {
      cy.visit('/login');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('Test123!');
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/dashboard');
      cy.contains('Welcome').should('be.visible');
    });

    it('should remember user session', () => {
      cy.visit('/login');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('Test123!');
      cy.get('input[type="checkbox"]').check(); // Remember me
      cy.get('button[type="submit"]').click();

      cy.getCookie('refresh_token').should('exist');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.login('test@example.com', 'Test123!'); // Custom command
    });

    it('should logout successfully', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.url().should('include', '/login');
      cy.getCookie('access_token').should('not.exist');
    });
  });

  describe('Password Reset', () => {
    it('should request password reset', () => {
      cy.visit('/forgot-password');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();

      cy.contains('reset email sent').should('be.visible');
    });
  });
});
