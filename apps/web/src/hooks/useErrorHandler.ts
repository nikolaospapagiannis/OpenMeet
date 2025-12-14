/**
 * useErrorHandler Hook
 * React hook for handling errors in functional components
 */

'use client';

import { useCallback, useState } from 'react';
import { errorMonitoring } from '../lib/error-monitoring';

interface UseErrorHandlerOptions {
  onError?: (error: Error) => void;
  logToMonitoring?: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { onError, logToMonitoring = true } = options;
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback(
    (error: Error | any, context?: Record<string, any>) => {
      // Convert to Error if not already
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Set error state
      setError(errorObj);

      // Call custom error handler
      if (onError) {
        onError(errorObj);
      }

      // Log to monitoring service
      if (logToMonitoring) {
        errorMonitoring.captureError(errorObj, context);
      }
    },
    [onError, logToMonitoring]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    resetError,
    hasError: error !== null,
  };
}

/**
 * useAsyncError Hook
 * Handle errors from async operations
 */
export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeAsync = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options?: {
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
        context?: Record<string, any>;
      }
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFn();

        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (options?.onError) {
          options.onError(error);
        }

        // Log to monitoring
        errorMonitoring.captureError(error, options?.context);

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    executeAsync,
    clearError,
    hasError: error !== null,
  };
}

/**
 * useAPIError Hook
 * Handle API-specific errors
 */
export function useAPIError() {
  const [error, setError] = useState<Error | null>(null);

  const handleAPIError = useCallback(
    (error: any, endpoint: string, method: string = 'GET') => {
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'API request failed';

      const errorObj = new Error(errorMessage);
      setError(errorObj);

      // Log to monitoring with API context
      errorMonitoring.captureAPIError(error, endpoint, method);
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleAPIError,
    clearError,
    hasError: error !== null,
    isNetworkError: error?.message?.includes('Network Error'),
    isAuthError:
      error?.message?.includes('401') || error?.message?.includes('Unauthorized'),
    isNotFoundError:
      error?.message?.includes('404') || error?.message?.includes('Not Found'),
  };
}

export default useErrorHandler;
