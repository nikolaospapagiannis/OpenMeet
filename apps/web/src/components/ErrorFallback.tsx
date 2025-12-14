/**
 * Error Fallback Component
 * Customizable error fallback UI for error boundaries
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home, Mail } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  showDetails?: boolean;
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showRefreshButton?: boolean;
  showContactSupport?: boolean;
}

export function ErrorFallback({
  error,
  resetError,
  showDetails = process.env.NODE_ENV === 'development',
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again.',
  showHomeButton = true,
  showRefreshButton = true,
  showContactSupport = false,
}: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive flex-shrink-0" />
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        </div>

        <div className="space-y-4">
          <p className="text-muted-foreground">{message}</p>

          {showDetails && error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Error details
              </summary>
              <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-48">
                <p className="font-bold text-destructive mb-2">{error.message}</p>
                {error.stack && (
                  <pre className="whitespace-pre-wrap text-xs">{error.stack}</pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col space-y-2 pt-2">
            {showRefreshButton && resetError && (
              <button
                onClick={resetError}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            )}

            {showHomeButton && (
              <button
                onClick={() => (window.location.href = '/')}
                className="flex items-center justify-center space-x-2 px-4 py-2 border rounded-md hover:bg-accent transition"
              >
                <Home className="h-4 w-4" />
                <span>Go to Home</span>
              </button>
            )}

            {showContactSupport && (
              <button
                onClick={() => (window.location.href = '/support')}
                className="flex items-center justify-center space-x-2 px-4 py-2 border rounded-md hover:bg-accent transition"
              >
                <Mail className="h-4 w-4" />
                <span>Contact Support</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal error fallback for inline errors
 */
export function MinimalErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError?: () => void;
}) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-destructive">{error.message}</p>
          {resetError && (
            <button
              onClick={resetError}
              className="text-xs text-destructive underline hover:no-underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorFallback;
