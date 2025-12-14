import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as z from 'zod';
import RegisterPage from '@/app/register/page';
import { useAuth } from '@/contexts/AuthContext';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('RegisterPage', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
    });
  });

  describe('Form Rendering', () => {
    it('renders the registration form with all required fields', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('heading', { name: /get started free/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('renders social signup buttons', () => {
      render(<RegisterPage />);

      expect(screen.getByText(/sign up with google/i)).toBeInTheDocument();
      expect(screen.getByText(/sign up with microsoft/i)).toBeInTheDocument();
    });

    it('renders terms and privacy policy checkboxes and links', () => {
      render(<RegisterPage />);

      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders sign in link for existing users', () => {
      render(<RegisterPage />);

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it('renders social proof section on large screens', () => {
      render(<RegisterPage />);

      expect(screen.getByText(/join 800,000\+ companies/i)).toBeInTheDocument();
      expect(screen.getByText(/trusted by top teams/i)).toBeInTheDocument();
      expect(screen.getByText(/enterprise-grade security/i)).toBeInTheDocument();
      expect(screen.getByText(/start in seconds/i)).toBeInTheDocument();
    });

    it('organization name field is marked as optional', () => {
      render(<RegisterPage />);

      const orgLabel = screen.getByText(/organization name/i);
      expect(orgLabel.textContent).toContain('optional');
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for short first name', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'A');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for short last name', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(lastNameInput, 'B');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/last name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'notanemail');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for weak password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'weak');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for password without required characters', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain lowercase, uppercase, number, and special character/i)).toBeInTheDocument();
      });
    });

    it('shows validation error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'Password123!');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'DifferentPassword123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('validates registration form using Zod schema', () => {
      const registerSchema = z.object({
        firstName: z.string().min(2, 'First name must be at least 2 characters'),
        lastName: z.string().min(2, 'Last name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
            'Password must contain lowercase, uppercase, number, and special character'),
        confirmPassword: z.string(),
        organizationName: z.string().optional(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
      });

      const validResult = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(validResult.success).toBe(true);

      const invalidResult = registerSchema.safeParse({
        firstName: 'J',
        lastName: 'D',
        email: 'invalid',
        password: 'weak',
        confirmPassword: 'different',
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('API Integration', () => {
    it('calls register with correct user data', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ success: true });
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@company.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Acme Corp');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1);
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'john@company.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          organizationName: 'Acme Corp',
        });
      });
    });

    it('navigates to email verification page on successful registration', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ success: true });
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/verify-email/pending?email=' + encodeURIComponent('john@example.com')
        );
      });
    });

    it('shows error message on registration failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already exists';
      mockRegister.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows generic error message when API fails without specific message', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce(new Error('Network error'));
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create account/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while submitting', async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockRegister.mockImplementation(() => promise);

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creating account.../i)).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();

      resolvePromise!();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it('disables all form inputs during submission', async () => {
      const user = userEvent.setup();
      mockRegister.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<RegisterPage />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/work email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const orgInput = screen.getByLabelText(/organization name/i);

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(firstNameInput).toBeDisabled();
      expect(lastNameInput).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(orgInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });
  });

  describe('Social Registration', () => {
    it('redirects to Google OAuth when clicking Google sign up', () => {
      delete (window as any).location;
      (window as any).location = { href: jest.fn() };

      render(<RegisterPage />);

      const googleButton = screen.getByText(/sign up with google/i);
      fireEvent.click(googleButton);

      expect(window.location.href).toBe('/api/auth/google');
    });

    it('redirects to Microsoft OAuth when clicking Microsoft sign up', () => {
      delete (window as any).location;
      (window as any).location = { href: jest.fn() };

      render(<RegisterPage />);

      const microsoftButton = screen.getByText(/sign up with microsoft/i);
      fireEvent.click(microsoftButton);

      expect(window.location.href).toBe('/api/auth/microsoft');
    });
  });

  describe('Optional Fields', () => {
    it('allows submission without organization name', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ success: true });
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      // Don't fill in organization name
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          organizationName: '',
        });
      });
    });
  });
});