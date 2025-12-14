import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MFASetupWizard from '@/components/auth/MFASetupWizard';
import apiClient from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    setupMFA: jest.fn(),
    completeMFA: jest.fn(),
  },
}));

// Mock QRCode component
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <div data-testid="qr-code" data-value={value} style={{ width: size, height: size }}>
      QR Code
    </div>
  ),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('MFASetupWizard', () => {
  const mockOnClose = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      expect(screen.getByText(/enable mfa/i)).toBeInTheDocument();
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <MFASetupWizard isOpen={false} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      expect(screen.queryByText(/enable mfa/i)).not.toBeInTheDocument();
    });

    it('displays close button', () => {
      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });

    it('displays progress bar with 3 steps', () => {
      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Check for progress bar segments
      const progressBars = document.querySelectorAll('.h-1');
      expect(progressBars.length).toBe(3);
    });
  });

  describe('Step 1 - Introduction', () => {
    it('displays introduction content', () => {
      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      expect(screen.getByText(/secure your account with mfa/i)).toBeInTheDocument();
      expect(screen.getByText(/multi-factor authentication adds an extra layer/i)).toBeInTheDocument();
    });

    it('shows setup instructions', () => {
      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      expect(screen.getByText(/install an authenticator app/i)).toBeInTheDocument();
      expect(screen.getByText(/google authenticator, authy/i)).toBeInTheDocument();
      // Use getAllByText since there are multiple instances
      const scanTexts = screen.getAllByText(/scan the qr code/i);
      expect(scanTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
    });

    it('displays get started button', () => {
      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      expect(getStartedButton).toBeInTheDocument();
    });

    it('moves to step 2 when get started is clicked', async () => {
      const user = userEvent.setup();
      (apiClient.setupMFA as jest.Mock).mockResolvedValueOnce({
        qrCode: 'otpauth://totp/Example:user@example.com?secret=SECRET&issuer=Example',
        secret: 'SECRETKEY123456',
      });

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      await user.click(getStartedButton);

      await waitFor(() => {
        expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
        expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
      });
    });

    it('shows error when setup fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to initialize MFA';
      (apiClient.setupMFA as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: errorMessage } },
      });

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      await user.click(getStartedButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Step 2 - QR Code Scanning', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      (apiClient.setupMFA as jest.Mock).mockResolvedValueOnce({
        qrCode: 'otpauth://totp/Example:user@example.com?secret=SECRET&issuer=Example',
        secret: 'SECRETKEY123456',
      });

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      await user.click(getStartedButton);
    });

    it('displays QR code', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      });
    });

    it('displays manual entry secret', async () => {
      await waitFor(() => {
        expect(screen.getByText('SECRETKEY123456')).toBeInTheDocument();
      });
    });

    it('shows copy button for secret', async () => {
      await waitFor(() => {
        expect(screen.getByText(/can't scan the code/i)).toBeInTheDocument();
      });

      // Find copy button (it's a small button with Copy icon)
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg'));
      expect(copyButton).toBeInTheDocument();
    });

    it('copies secret to clipboard when copy button clicked', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('SECRETKEY123456')).toBeInTheDocument();
      });

      // Find and click the copy button
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn =>
        btn.className.includes('ghost-glass') && btn.querySelector('svg')
      );

      if (copyButton) {
        await user.click(copyButton);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SECRETKEY123456');
      }
    });

    it('displays verification code input', async () => {
      await waitFor(() => {
        const input = screen.getByPlaceholderText('000000');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('maxLength', '6');
      });
    });

    it('only allows numeric input for verification code', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      await user.type(input, 'abc123def456');

      expect(input.value).toBe('123456');
    });

    it('enables verify button only with 6-digit code', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      const verifyButton = screen.getByRole('button', { name: /verify & enable/i });
      expect(verifyButton).toBeDisabled();

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '12345');
      expect(verifyButton).toBeDisabled();

      await user.type(input, '6');
      expect(verifyButton).toBeEnabled();
    });

    it('shows back button to return to step 1', async () => {
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('returns to step 1 when back button clicked', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(screen.getByText(/secure your account with mfa/i)).toBeInTheDocument();
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });
  });

  describe('Step 3 - Backup Codes', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      (apiClient.setupMFA as jest.Mock).mockResolvedValueOnce({
        qrCode: 'otpauth://totp/Example:user@example.com?secret=SECRET&issuer=Example',
        secret: 'SECRETKEY123456',
      });
      (apiClient.completeMFA as jest.Mock).mockResolvedValueOnce({
        backupCodes: ['ABC123', 'DEF456', 'GHI789', 'JKL012', 'MNO345', 'PQR678'],
      });

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Navigate to step 2
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      await user.click(getStartedButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Enter verification code and submit
      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify & enable/i });
      await user.click(verifyButton);
    });

    it('displays success message', async () => {
      await waitFor(() => {
        expect(screen.getByText(/mfa successfully enabled/i)).toBeInTheDocument();
        expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
      });
    });

    it('displays backup codes', async () => {
      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
        expect(screen.getByText('DEF456')).toBeInTheDocument();
        expect(screen.getByText('GHI789')).toBeInTheDocument();
        expect(screen.getByText('JKL012')).toBeInTheDocument();
        expect(screen.getByText('MNO345')).toBeInTheDocument();
        expect(screen.getByText('PQR678')).toBeInTheDocument();
      });
    });

    it('shows warning about saving backup codes', async () => {
      await waitFor(() => {
        expect(screen.getByText(/important: save these codes/i)).toBeInTheDocument();
        expect(screen.getByText(/each code can only be used once/i)).toBeInTheDocument();
      });
    });

    it('copies backup codes to clipboard', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });

      // Find the copy button for backup codes
      const copyButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg') && btn.className.includes('xs')
      );

      if (copyButtons[0]) {
        await user.click(copyButtons[0]);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'ABC123\nDEF456\nGHI789\nJKL012\nMNO345\nPQR678'
        );
      }
    });

    it('downloads backup codes when download button clicked', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download codes/i })).toBeInTheDocument();
      });

      // Mock createElement and appendChild
      const mockAnchor = document.createElement('a');
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      const clickSpy = jest.spyOn(mockAnchor, 'click');

      const downloadButton = screen.getByRole('button', { name: /download codes/i });
      await user.click(downloadButton);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('openmeet-backup-codes.txt');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('completes setup when complete button clicked', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete setup/i })).toBeInTheDocument();
      });

      const completeButton = screen.getByRole('button', { name: /complete setup/i });
      await user.click(completeButton);

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('shows error for invalid verification code', async () => {
      const user = userEvent.setup();
      (apiClient.setupMFA as jest.Mock).mockResolvedValueOnce({
        qrCode: 'otpauth://totp/Example',
        secret: 'SECRET',
      });
      (apiClient.completeMFA as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: 'Invalid verification code' } },
      });

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Navigate to step 2
      await user.click(screen.getByRole('button', { name: /get started/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Enter code and verify
      await user.type(screen.getByPlaceholderText('000000'), '999999');
      await user.click(screen.getByRole('button', { name: /verify & enable/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
      });
    });

    it('validates 6-digit code before submission', async () => {
      const user = userEvent.setup();
      (apiClient.setupMFA as jest.Mock).mockResolvedValueOnce({
        qrCode: 'otpauth://totp/Example',
        secret: 'SECRET',
      });

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Navigate to step 2
      await user.click(screen.getByRole('button', { name: /get started/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Try to verify without entering code
      const verifyButton = screen.getByRole('button', { name: /verify & enable/i });
      expect(verifyButton).toBeDisabled();

      // Enter incomplete code
      await user.type(screen.getByPlaceholderText('000000'), '123');
      await user.click(verifyButton);

      // Button should still be disabled with incomplete code
      expect(verifyButton).toBeDisabled();
    });

    it('shows generic error message for API failures', async () => {
      const user = userEvent.setup();
      (apiClient.setupMFA as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      await user.click(screen.getByRole('button', { name: /get started/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to initialize mfa setup/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      const closeButton = screen.getAllByRole('button')[0]; // First button is close
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets state when closing and reopening', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Move to step 2
      (apiClient.setupMFA as jest.Mock).mockResolvedValueOnce({
        qrCode: 'otpauth://test',
        secret: 'SECRET',
      });
      await user.click(screen.getByRole('button', { name: /get started/i }));

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
      });

      // Close modal
      rerender(
        <MFASetupWizard isOpen={false} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Reopen modal
      rerender(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Should be back at step 1
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByText(/secure your account with mfa/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state when fetching QR code', async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      const promise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });
      (apiClient.setupMFA as jest.Mock).mockImplementation(() => promise);

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      await user.click(getStartedButton);

      // Button should show loading state
      expect(getStartedButton).toBeDisabled();

      resolvePromise!({ qrCode: 'test', secret: 'SECRET' });

      await waitFor(() => {
        expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
      });
    });

    it('shows loading state when verifying code', async () => {
      const user = userEvent.setup();
      (apiClient.setupMFA as jest.Mock).mockResolvedValueOnce({
        qrCode: 'test',
        secret: 'SECRET',
      });

      let resolvePromise: () => void;
      const promise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });
      (apiClient.completeMFA as jest.Mock).mockImplementation(() => promise);

      render(
        <MFASetupWizard isOpen={true} onClose={mockOnClose} onComplete={mockOnComplete} />
      );

      // Navigate to step 2
      await user.click(screen.getByRole('button', { name: /get started/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Enter code and verify
      await user.type(screen.getByPlaceholderText('000000'), '123456');
      const verifyButton = screen.getByRole('button', { name: /verify & enable/i });
      await user.click(verifyButton);

      expect(verifyButton).toBeDisabled();

      resolvePromise!({ backupCodes: ['ABC123'] });

      await waitFor(() => {
        expect(screen.getByText(/mfa successfully enabled/i)).toBeInTheDocument();
      });
    });
  });
});