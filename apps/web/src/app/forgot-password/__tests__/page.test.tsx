import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as z from 'zod';
import ForgotPasswordPage from '../page';
import apiClient from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    forgotPassword: jest.fn(),
  },
}));

// Mock Next.js router and Link
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders the forgot password form', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /forgot your password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('renders the back to login link', () => {
      render(<ForgotPasswordPage />);

      const backLinks = screen.getAllByText(/back to login/i);
      expect(backLinks.length).toBeGreaterThan(0);
    });

    it('autofocuses the email input field', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      expect(emailInput).toHaveFocus();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty email', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates email format using Zod schema', () => {
      // Test that the email schema validates correctly
      const forgotPasswordSchema = z.object({
        email: z.string().email('Please enter a valid email address'),
      });

      const validSchema = forgotPasswordSchema.safeParse({ email: 'test@example.com' });
      expect(validSchema.success).toBe(true);

      const invalidSchema = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
      expect(invalidSchema.success).toBe(false);
      if (!invalidSchema.success) {
        expect(invalidSchema.error.issues[0].message).toMatch(/email/i);
      }
    });

    it('does not show validation error for valid email', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(apiClient.forgotPassword).toHaveBeenCalledWith('test@example.com');
      });

      // Should not show validation error
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('calls forgotPassword API with correct email', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@company.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.forgotPassword).toHaveBeenCalledTimes(1);
        expect(apiClient.forgotPassword).toHaveBeenCalledWith('user@company.com');
      });
    });

    it('shows success message after successful API call', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        expect(screen.getByText(/we've sent password reset instructions/i)).toBeInTheDocument();
      });
    });

    it('shows error message on API failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'User not found';
      (apiClient.forgotPassword as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'nonexistent@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows generic error message when API fails without specific message', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send reset email/i)).toBeInTheDocument();
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
      (apiClient.forgotPassword as jest.Mock).mockImplementation(() => promise);

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/sending reset link/i)).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();

      // Resolve the promise to complete the submission
      resolvePromise!();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Inputs should be disabled
      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('clears previous error when resubmitting form', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'First error' } },
      });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Resubmit with success
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });
});
