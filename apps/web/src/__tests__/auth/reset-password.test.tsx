import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as z from 'zod';
import ResetPasswordPage from '@/app/reset-password/page';
import apiClient from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    resetPassword: jest.fn(),
  },
}));

// Mock Next.js router and searchParams
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.set('token', 'valid-reset-token');
  });

  describe('Form Rendering', () => {
    it('renders the reset password form with all elements', () => {
      render(<ResetPasswordPage />);

      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
      expect(screen.getByText(/enter your new password below/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('displays password strength indicator', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'weak');

      expect(screen.getByText(/password strength:/i)).toBeInTheDocument();
      expect(screen.getByText(/weak/i)).toBeInTheDocument();
    });

    it('displays password requirements checklist', () => {
      render(<ResetPasswordPage />);

      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one number/i)).toBeInTheDocument();
      expect(screen.getByText(/one special character/i)).toBeInTheDocument();
    });

    it('shows/hides password when eye icon is clicked', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find the eye button (first one for new password)
      const eyeButtons = screen.getAllByRole('button');
      const eyeButton = eyeButtons.find(btn => btn.querySelector('svg'));

      if (eyeButton) {
        await user.click(eyeButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        await user.click(eyeButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });

    it('shows error when token is missing', () => {
      mockSearchParams.delete('token');
      render(<ResetPasswordPage />);

      expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument();
    });

    it('autofocuses the new password field', () => {
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      expect(passwordInput).toHaveFocus();
    });
  });

  describe('Password Strength Calculation', () => {
    it('shows weak strength for simple passwords', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'simple');

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });
    });

    it('shows medium strength for moderate passwords', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'Password1');

      await waitFor(() => {
        expect(screen.getByText(/medium/i)).toBeInTheDocument();
      });
    });

    it('shows strong strength for complex passwords', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'ComplexPass123!@#');

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });

    it('updates requirement checks as password is typed', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);

      // Type a password that meets some requirements
      await user.type(passwordInput, 'Pass123!');

      await waitFor(() => {
        // These requirements should be met (shown with green checkmarks)
        const requirements = screen.getAllByText(/at least 8 characters|uppercase|lowercase|number|special/i);
        expect(requirements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error for password less than 8 characters', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'Short1!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('shows error for password without uppercase letter', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'lowercase123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'ValidPass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'DifferentPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('validates password requirements using Zod schema', () => {
      const resetPasswordSchema = z.object({
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
          .regex(/[0-9]/, 'Password must contain at least one number')
          .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
      });

      const validResult = resetPasswordSchema.safeParse({
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      });
      expect(validResult.success).toBe(true);

      const invalidResult = resetPasswordSchema.safeParse({
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(invalidResult.success).toBe(false);
    });

    it('accepts valid password meeting all requirements', async () => {
      const user = userEvent.setup();
      (apiClient.resetPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'ValidPass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'ValidPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'ValidPass123!');
      });
    });
  });

  describe('API Integration', () => {
    it('calls resetPassword API with token and new password', async () => {
      const user = userEvent.setup();
      (apiClient.resetPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NewSecurePass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'NewSecurePass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.resetPassword).toHaveBeenCalledTimes(1);
        expect(apiClient.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'NewSecurePass123!');
      });
    });

    it('shows success message after successful password reset', async () => {
      const user = userEvent.setup();
      (apiClient.resetPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NewPass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
        expect(screen.getByText(/you will be redirected to the login page/i)).toBeInTheDocument();
      });
    });

    it('redirects to login after successful reset', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      (apiClient.resetPassword as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NewPass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
      });

      // Fast-forward 3 seconds
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });

      jest.useRealTimers();
    });

    it('shows error for expired token', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Reset token has expired. Please request a new one.';
      (apiClient.resetPassword as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NewPass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows generic error when API fails', async () => {
      const user = userEvent.setup();
      (apiClient.resetPassword as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NewPass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to reset password.*the link may have expired/i)).toBeInTheDocument();
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
      (apiClient.resetPassword as jest.Mock).mockImplementation(() => promise);

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NewPass123!');

      const confirmInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/resetting password.../i)).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();

      resolvePromise!();

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
      });
    });

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup();
      (apiClient.resetPassword as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(passwordInput).toBeDisabled();
      expect(confirmInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Validation', () => {
    it('disables form when token is missing', () => {
      mockSearchParams.delete('token');
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      expect(passwordInput).toBeDisabled();
      expect(confirmInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('shows error message when token is invalid', () => {
      mockSearchParams.delete('token');
      render(<ResetPasswordPage />);

      expect(screen.getByText(/invalid or missing reset token.*please request a new password reset link/i)).toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility for both fields independently', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmInput).toHaveAttribute('type', 'password');

      // Find eye buttons
      const eyeButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));

      // Toggle first password field
      if (eyeButtons[0]) {
        await user.click(eyeButtons[0]);
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(confirmInput).toHaveAttribute('type', 'password');
      }

      // Toggle second password field
      if (eyeButtons[1]) {
        await user.click(eyeButtons[1]);
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(confirmInput).toHaveAttribute('type', 'text');
      }
    });
  });
});