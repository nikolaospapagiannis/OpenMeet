/**
 * Authentication Hook
 * Provides access to authentication state and token for API/WebSocket calls
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

// Create child logger for Auth operations
const authLogger = logger.child('Auth');

interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  systemRole?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

interface UseAuthReturn extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  getAuthHeaders: () => Record<string, string>;
}

/**
 * Custom hook for authentication management
 * Provides user state, token management, and auth utilities
 */
export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    isSuperAdmin: false,
  });

  // Check if user is super admin
  const checkSuperAdmin = (user: User | null): boolean => {
    if (!user?.systemRole) return false;
    return ['super_admin', 'platform_admin'].includes(user.systemRole);
  };

  // Load initial auth state
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        // Try to get stored token
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser) as User;

          // Validate token is still valid
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const validatedUser = data.data?.user || user;

            setAuthState({
              user: validatedUser,
              token: storedToken,
              isAuthenticated: true,
              isLoading: false,
              isSuperAdmin: checkSuperAdmin(validatedUser),
            });
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              isSuperAdmin: false,
            });
          }
        } else {
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isSuperAdmin: false,
          });
        }
      } catch (error) {
        authLogger.error('Error loading auth state', error);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isSuperAdmin: false,
        });
      }
    };

    loadAuthState();
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const { token, user } = data.data;

        // Store auth data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));

        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          isSuperAdmin: checkSuperAdmin(user),
        });

        return true;
      }

      return false;
    } catch (error) {
      authLogger.error('Login error', error);
      return false;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout endpoint
      if (authState.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authState.token}`,
          },
        });
      }
    } catch (error) {
      authLogger.error('Logout error', error);
    } finally {
      // Clear storage and state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isSuperAdmin: false,
      });
    }
  }, [authState.token]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: authState.token ? {
          'Authorization': `Bearer ${authState.token}`,
        } : {},
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const newToken = data.data?.token;

        if (newToken) {
          localStorage.setItem('auth_token', newToken);
          setAuthState(prev => ({
            ...prev,
            token: newToken,
          }));
          return newToken;
        }
      }

      return null;
    } catch (error) {
      authLogger.error('Token refresh error', error);
      return null;
    }
  }, [authState.token]);

  // Get auth headers for API calls
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (authState.token) {
      return {
        'Authorization': `Bearer ${authState.token}`,
      };
    }
    return {};
  }, [authState.token]);

  return {
    ...authState,
    login,
    logout,
    refreshToken,
    getAuthHeaders,
  };
}

export default useAuth;
