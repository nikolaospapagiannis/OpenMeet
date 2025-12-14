/**
 * Frontend Error Monitoring
 * Client-side error tracking and reporting
 */

import axios from 'axios';

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  additionalContext?: Record<string, any>;
}

class ErrorMonitoring {
  private apiEndpoint: string;
  private sessionId: string;
  private userId?: string;
  private enabled: boolean;

  constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
    this.sessionId = this.generateSessionId();
    this.enabled = process.env.NODE_ENV === 'production';
  }

  /**
   * Initialize error monitoring
   */
  init() {
    if (!this.enabled) {
      console.log('Error monitoring disabled in development');
      return;
    }

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        type: 'unhandled_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'unhandled_rejection',
        promise: event.promise.toString(),
      });
    });
  }

  /**
   * Set user context
   */
  setUser(userId: string) {
    this.userId = userId;
  }

  /**
   * Clear user context
   */
  clearUser() {
    this.userId = undefined;
  }

  /**
   * Capture error
   */
  captureError(error: Error, context?: Record<string, any>) {
    const errorReport: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      additionalContext: context,
    };

    // Log to console in development
    if (!this.enabled) {
      console.error('Error captured:', errorReport);
      return;
    }

    // Send to backend
    this.sendErrorReport(errorReport);
  }

  /**
   * Capture React error boundary error
   */
  captureReactError(error: Error, errorInfo: any) {
    this.captureError(error, {
      type: 'react_error_boundary',
      componentStack: errorInfo.componentStack,
    });
  }

  /**
   * Capture API error
   */
  captureAPIError(error: any, endpoint: string, method: string) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'API Error';

    this.captureError(new Error(errorMessage), {
      type: 'api_error',
      endpoint,
      method,
      statusCode: error.response?.status,
      responseData: error.response?.data,
    });
  }

  /**
   * Send error report to backend
   */
  private async sendErrorReport(errorReport: ErrorReport) {
    try {
      await axios.post(`${this.apiEndpoint}/api/errors/client`, errorReport, {
        timeout: 5000,
      });
    } catch (err) {
      // Silently fail - don't create error loops
      console.error('Failed to send error report:', err);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const stored = sessionStorage.getItem('session_id');
    if (stored) {
      return stored;
    }

    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', newId);
    return newId;
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    // Store breadcrumbs in memory or localStorage
    const breadcrumbs = this.getBreadcrumbs();
    breadcrumbs.push({
      message,
      category,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 breadcrumbs
    if (breadcrumbs.length > 50) {
      breadcrumbs.shift();
    }

    sessionStorage.setItem('error_breadcrumbs', JSON.stringify(breadcrumbs));
  }

  /**
   * Get breadcrumbs
   */
  private getBreadcrumbs(): any[] {
    try {
      const stored = sessionStorage.getItem('error_breadcrumbs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoring();

export default errorMonitoring;
