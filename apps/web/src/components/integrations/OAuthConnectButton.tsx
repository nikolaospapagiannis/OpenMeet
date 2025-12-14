/**
 * OAuthConnectButton Component
 * Handles OAuth redirect flow with popup window
 */

'use client';

import { useState } from 'react';
import { Link2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIntegrations } from '@/hooks/useIntegrations';

export interface OAuthConnectButtonProps {
  type: string;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function OAuthConnectButton({
  type,
  label = 'Connect',
  variant = 'default',
  size = 'default',
  className = '',
  onSuccess,
  onError,
}: OAuthConnectButtonProps) {
  const { startOAuthFlow, connectingType } = useIntegrations();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isConnecting = connectingType === type;

  const handleConnect = async () => {
    try {
      setStatus('connecting');
      setErrorMessage('');

      const success = await startOAuthFlow(type);

      if (success) {
        setStatus('success');
        onSuccess?.();

        // Reset status after 2 seconds
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        // User cancelled
        setStatus('idle');
      }
    } catch (error: any) {
      console.error(`OAuth error for ${type}:`, error);
      setStatus('error');
      setErrorMessage(error.message || 'Connection failed');
      onError?.(error);

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 3000);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'connecting':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Connected!
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="h-4 w-4 mr-2" />
            Failed
          </>
        );
      default:
        return (
          <>
            <Link2 className="h-4 w-4 mr-2" />
            {label}
          </>
        );
    }
  };

  return (
    <div className="flex flex-col">
      <Button
        variant={variant}
        size={size}
        onClick={handleConnect}
        disabled={isConnecting || status === 'connecting'}
        className={className}
      >
        {getButtonContent()}
      </Button>
      {errorMessage && (
        <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
