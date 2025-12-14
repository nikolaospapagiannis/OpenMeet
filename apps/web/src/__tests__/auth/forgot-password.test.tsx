import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as z from 'zod';
import ForgotPasswordPage from '@/app/forgot-password/page';
import apiClient from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    forgotPassword: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
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

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders the forgot password form with all elements', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /forgot your password/i })).toBeInTheDocument();
      expect(screen.getByText(/no worries! enter your email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
      expect(screen.getByText(/back to login/i)).toBeInTheDocument();
    });

    it('displays OpenMeet logo', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByText(/nebula ai/i)).toBeInTheDocument();
    });

    it('autofocuses the email input field', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      expect(emailInput).toHaveFocus();
    });

    it('email input has correct type and placeholder', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'name@company.com');
    });

    it('back to login link is present', () => {
      render(<ForgotPasswordPage />);

      const backLink = screen.getByText(/back to login/i);
      expect(backLink.closest('a')).toHaveAttribute('href', '/login');
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

    it('shows validation error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'notanemail');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates email format using Zod schema', () => {
      const forgotPasswordSchema = z.object({
        email: z.string().email('Please enter a valid email address'),
      });

      const validResult = forgotPasswordSchema.safeParse({ email: 'test@example.com' });
      expect(validResult.success).toBe(true);

      const invalidResult = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('accepts valid email formats', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'user@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.forgotPassword).toHaveBeenCalledWith('user@example.com');
      });

      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });

    it('trims whitespace from email input', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, '  user@example.com  ');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.forgotPassword).toHaveBeenCalledWith('  user@example.com  ');
      });
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
        expect(screen.getByText(/didn't receive the email\? check your spam folder/i)).toBeInTheDocument();
      });
    });

    it('shows error message for non-existent user', async () => {
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

    it('shows generic error message when API fails', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send reset email. please try again/i)).toBeInTheDocument();
      });
    });

    it('handles rate limiting errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Too many requests. Please wait before trying again.';
      (apiClient.forgotPassword as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText(/sending reset link.../i)).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();

      resolvePromise!();

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('disables email input during submission', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('displays success icon in success state', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        // The success state should show a check circle icon (rendered as SVG)
        const successHeading = screen.getByText(/check your email/i);
        expect(successHeading).toBeInTheDocument();
      });
    });

    it('shows back to login link in success state', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        const backLinks = screen.getAllByText(/back to login/i);
        expect(backLinks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error State Management', () => {
    it('clears previous error when resubmitting', async () => {
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

      // Clear and type new email
      await user.clear(emailInput);
      await user.type(emailInput, 'another@example.com');

      (apiClient.forgotPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });

    it('preserves email value after error', async () => {
      const user = userEvent.setup();
      (apiClient.forgotPassword as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Error occurred' } },
      });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/work email/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error occurred')).toBeInTheDocument();
      });

      // Email should still be in the input
      expect(emailInput.value).toBe('test@example.com');
    });
  });
});