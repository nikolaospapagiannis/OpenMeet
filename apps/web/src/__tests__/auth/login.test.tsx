import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as z from 'zod';
import LoginPage from '@/app/login/page';
import { useAuth } from '@/contexts/AuthContext';

// Mock the API client
vi.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    login: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    default: function Link({ children, href }: { children: React.ReactNode; href: string }) {
      return <a href={href}>{children}</a>;
    }
  };
});

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      login: mockLogin,
    });
  });

  describe('Form Rendering', () => {
    it('renders the login form with all required fields', () => {
      render(<LoginPage />);

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument();
      expect(screen.getByText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it('renders social login buttons', () => {
      render(<LoginPage />);

      expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
      expect(screen.getByText(/sign in with microsoft/i)).toBeInTheDocument();
    });

    it('renders the sign up link', () => {
      render(<LoginPage />);

      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/sign up for free/i)).toBeInTheDocument();
    });

    it('renders testimonial section on large screens', () => {
      render(<LoginPage />);

      expect(screen.getByText(/sarah chen/i)).toBeInTheDocument();
      expect(screen.getByText(/vp of sales/i)).toBeInTheDocument();
    });

    it('email input has correct type and placeholder', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'name@company.com');
    });

    it('password input has correct type and placeholder', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty email', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'notanemail');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for short password', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, '12345');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('validates email and password using Zod schema', () => {
      const loginSchema = z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
      });

      const validResult = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(validResult.success).toBe(true);

      const invalidEmailResult = loginSchema.safeParse({
        email: 'invalid',
        password: 'password123',
      });
      expect(invalidEmailResult.success).toBe(false);

      const invalidPasswordResult = loginSchema.safeParse({
        email: 'user@example.com',
        password: '12345',
      });
      expect(invalidPasswordResult.success).toBe(false);
    });

    it('does not show validation errors for valid inputs', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ success: true });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@example.com');

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      expect(screen.queryByText(/invalid email address/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/password must be at least 6 characters/i)).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('calls login with correct credentials', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ success: true });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@company.com');

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'securepassword');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockLogin).toHaveBeenCalledWith('user@company.com', 'securepassword');
      });
    });

    it('navigates to dashboard on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ success: true });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@example.com');

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows error message on login failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@example.com');

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows generic error message when API fails without specific message', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Network error'));
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@example.com');

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
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
      mockLogin.mockImplementation(() => promise);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@example.com');

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();

      resolvePromise!();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Social Login', () => {
    it('redirects to Google OAuth when clicking Google sign in', () => {
      delete (window as any).location;
      (window as any).location = { href: vi.fn() };

      render(<LoginPage />);

      const googleButton = screen.getByText(/sign in with google/i);
      fireEvent.click(googleButton);

      expect(window.location.href).toBe('/api/auth/google');
    });

    it('redirects to Microsoft OAuth when clicking Microsoft sign in', () => {
      delete (window as any).location;
      (window as any).location = { href: vi.fn() };

      render(<LoginPage />);

      const microsoftButton = screen.getByText(/sign in with microsoft/i);
      fireEvent.click(microsoftButton);

      expect(window.location.href).toBe('/api/auth/microsoft');
    });
  });

  describe('Error State Management', () => {
    it('clears previous error when resubmitting form', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce({
        response: { data: { message: 'First error' } },
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      mockLogin.mockResolvedValueOnce({ success: true });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });
});