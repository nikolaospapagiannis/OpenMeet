/**
 * Frontend Global Error Handler
 * Centralized error handling for API calls, network errors, and auth errors
 */

import axios, { AxiosError } from 'axios';
import { errorMonitoring } from './error-monitoring';

/**
 * Custom error classes
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorCode?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public errors?: any[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Handle API errors and convert to appropriate error types
 */
export function handleAPIError(error: any): never {
  // Network error (no response from server)
  if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
    errorMonitoring.captureError(new NetworkError(), {
      type: 'network_error',
      originalError: error.message,
    });
    throw new NetworkError('Unable to connect to server. Please check your connection.');
  }

  const { status, data } = error.response;

  // Authentication error (401)
  if (status === 401) {
    const authError = new AuthenticationError(
      data?.error?.message || 'Please log in to continue'
    );
    errorMonitoring.captureError(authError, { type: 'auth_error', status });

    // Redirect to login if needed
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      // Store current path for redirect after login
      sessionStorage.setItem('redirect_after_login', window.location.pathname);
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }

    throw authError;
  }

  // Authorization error (403)
  if (status === 403) {
    const authzError = new AuthorizationError(
      data?.error?.message || 'You do not have permission to access this resource'
    );
    errorMonitoring.captureError(authzError, { type: 'authz_error', status });
    throw authzError;
  }

  // Validation error (400)
  if (status === 400) {
    const validationError = new ValidationError(
      data?.error?.message || 'Invalid request',
      data?.error?.validationErrors
    );
    // Don't log validation errors to monitoring (they're expected)
    throw validationError;
  }

  // Not found (404)
  if (status === 404) {
    const notFoundError = new APIError(
      404,
      data?.error?.message || 'Resource not found',
      'NOT_FOUND'
    );
    // Don't log 404s to monitoring
    throw notFoundError;
  }

  // Rate limit (429)
  if (status === 429) {
    const rateLimitError = new APIError(
      429,
      data?.error?.message || 'Too many requests. Please try again later.',
      'RATE_LIMIT'
    );
    errorMonitoring.captureError(rateLimitError, { type: 'rate_limit', status });
    throw rateLimitError;
  }

  // Server error (5xx)
  if (status >= 500) {
    const serverError = new APIError(
      status,
      data?.error?.message || 'Server error occurred. Please try again.',
      data?.error?.code || 'SERVER_ERROR',
      data?.error
    );
    errorMonitoring.captureError(serverError, {
      type: 'server_error',
      status,
      errorCode: serverError.errorCode,
    });
    throw serverError;
  }

  // Generic API error
  const apiError = new APIError(
    status,
    data?.error?.message || 'An error occurred',
    data?.error?.code,
    data?.error
  );
  errorMonitoring.captureError(apiError, { type: 'api_error', status });
  throw apiError;
}

/**
 * Setup Axios interceptors for global error handling
 */
export function setupAxiosInterceptors() {
  // Request interceptor - add auth token
  axios.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request ID for tracing
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      config.headers['X-Request-ID'] = requestId;

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors
  axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      return Promise.reject(handleAPIError(error));
    }
  );
}

/**
 * Safe async wrapper - catches and handles errors
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  options?: {
    onError?: (error: Error) => void;
    defaultValue?: T;
    logToMonitoring?: boolean;
  }
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error: any) {
    if (options?.onError) {
      options.onError(error);
    }

    if (options?.logToMonitoring !== false) {
      errorMonitoring.captureError(error);
    }

    return options?.defaultValue;
  }
}

/**
 * Display user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof AuthenticationError) {
    return 'Please log in to continue';
  }

  if (error instanceof AuthorizationError) {
    return 'You do not have permission to perform this action';
  }

  if (error instanceof NetworkError) {
    return 'Network connection error. Please check your internet connection.';
  }

  if (error instanceof APIError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof APIError) {
    // Retry on 5xx errors and rate limits (after delay)
    return error.statusCode >= 500 || error.statusCode === 429;
  }

  return false;
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if not retryable or max retries reached
      if (!isRetryableError(error) || attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export default {
  handleAPIError,
  setupAxiosInterceptors,
  safeAsync,
  getErrorMessage,
  isRetryableError,
  retryAsync,
  APIError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
};
