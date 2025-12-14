import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VerifyEmailPage from '@/app/verify-email/page';
import apiClient from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    verifyEmail: jest.fn(),
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

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.set('token', 'valid-verification-token');
  });

  describe('Initial Rendering', () => {
    it('shows verifying state on mount with token', async () => {
      (apiClient.verifyEmail as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep in verifying state
      );
      render(<VerifyEmailPage />);

      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait while we verify your email address/i)).toBeInTheDocument();
    });

    it('displays OpenMeet logo', () => {
      render(<VerifyEmailPage />);
      expect(screen.getByText(/nebula ai/i)).toBeInTheDocument();
    });

    it('shows loading spinner in verifying state', () => {
      (apiClient.verifyEmail as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Keep in verifying state
      );
      render(<VerifyEmailPage />);

      // Look for the loading spinner (Loader2 component with animate-spin)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('calls verifyEmail API on mount when token is present', async () => {
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(apiClient.verifyEmail).toHaveBeenCalledWith('valid-verification-token');
      });
    });

    it('does not call API when token is missing', () => {
      mockSearchParams.delete('token');
      render(<VerifyEmailPage />);

      expect(apiClient.verifyEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/verification token is missing/i)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('shows success message when email is verified', async () => {
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument();
        expect(screen.getByText(/your email has been successfully verified/i)).toBeInTheDocument();
        expect(screen.getByText(/redirecting you to login/i)).toBeInTheDocument();
      });
    });

    it('displays success icon in success state', async () => {
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument();
      });

      // Check for success icon container with green background
      const successIcon = document.querySelector('.bg-green-500\\/10');
      expect(successIcon).toBeInTheDocument();
    });

    it('redirects to login with verified flag after success', async () => {
      jest.useFakeTimers();
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument();
      });

      // Fast-forward 3 seconds
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?verified=true');
      });

      jest.useRealTimers();
    });

    it('shows loading spinner while redirecting', async () => {
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument();
      });

      // Should show a small loading spinner in success state
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows expired state for expired tokens', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Token has expired' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/link expired/i)).toBeInTheDocument();
        expect(screen.getByText(/this verification link has expired/i)).toBeInTheDocument();
        expect(screen.getByText(/request new link/i)).toBeInTheDocument();
      });
    });

    it('shows already verified state', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Email already verified' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/already verified/i)).toBeInTheDocument();
        expect(screen.getByText(/your email has already been verified/i)).toBeInTheDocument();
        expect(screen.getByText(/go to login/i)).toBeInTheDocument();
      });
    });

    it('shows generic error state for other errors', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Database connection failed' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
    });

    it('shows default error message when no error message provided', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });
    });

    it('handles invalid token format', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Invalid token format' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/link expired/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links', () => {
    it('shows request new link button for expired tokens', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Token expired' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const newLinkButton = screen.getByText(/request new link/i);
        expect(newLinkButton).toBeInTheDocument();
        expect(newLinkButton.closest('a')).toHaveAttribute('href', '/verify-email/pending');
      });
    });

    it('shows go to login button for already verified emails', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Email already verified' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const loginButton = screen.getByText(/go to login/i);
        expect(loginButton).toBeInTheDocument();
        expect(loginButton.closest('a')).toHaveAttribute('href', '/login');
      });
    });

    it('shows back to login link for generic errors', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Unknown error' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        const backToLogin = screen.getByText(/back to login/i);
        expect(backToLogin).toBeInTheDocument();
        expect(backToLogin.closest('a')).toHaveAttribute('href', '/login');
      });
    });

    it('shows contact support link in footer for successful verification', async () => {
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument();
      });

      const supportLink = screen.getByText(/contact support/i);
      expect(supportLink).toBeInTheDocument();
      expect(supportLink.closest('a')).toHaveAttribute('href', '/contact');
    });
  });

  describe('Icon States', () => {
    it('displays orange mail icon for expired state', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Token expired' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/link expired/i)).toBeInTheDocument();
      });

      // Check for orange background icon container
      const orangeIcon = document.querySelector('.bg-orange-500\\/10');
      expect(orangeIcon).toBeInTheDocument();
    });

    it('displays blue check icon for already verified state', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Email already verified' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/already verified/i)).toBeInTheDocument();
      });

      // Check for blue background icon container
      const blueIcon = document.querySelector('.bg-blue-500\\/10');
      expect(blueIcon).toBeInTheDocument();
    });

    it('displays red X icon for error state', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Verification failed' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });

      // Check for red background icon container
      const redIcon = document.querySelector('.bg-red-500\\/10');
      expect(redIcon).toBeInTheDocument();
    });
  });

  describe('Token Handling', () => {
    it('handles empty token parameter', () => {
      mockSearchParams.set('token', '');
      render(<VerifyEmailPage />);

      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/verification token is missing/i)).toBeInTheDocument();
    });

    it('handles special characters in token', async () => {
      mockSearchParams.set('token', 'token-with-special-chars!@#$%');
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(apiClient.verifyEmail).toHaveBeenCalledWith('token-with-special-chars!@#$%');
      });
    });

    it('handles very long tokens', async () => {
      const longToken = 'a'.repeat(500);
      mockSearchParams.set('token', longToken);
      (apiClient.verifyEmail as jest.Mock).mockResolvedValueOnce({ success: true });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(apiClient.verifyEmail).toHaveBeenCalledWith(longToken);
      });
    });
  });

  describe('API Error Handling', () => {
    it('handles network errors gracefully', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });
    });

    it('handles timeout errors', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'Request timeout',
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });
    });

    it('handles 500 server errors', async () => {
      (apiClient.verifyEmail as jest.Mock).mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Internal server error' } },
      });
      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
        expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
      });
    });
  });
});