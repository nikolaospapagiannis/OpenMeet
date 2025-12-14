'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  BrandingConfig,
  defaultBranding,
  applyBranding,
  loadBranding,
} from '../lib/theme';

interface ThemeContextValue {
  branding: BrandingConfig;
  loading: boolean;
  error: Error | null;
  updateBranding: (config: Partial<BrandingConfig>) => Promise<void>;
  refreshBranding: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialBranding?: BrandingConfig;
}

export function ThemeProvider({ children, initialBranding }: ThemeProviderProps) {
  const [branding, setBranding] = useState<BrandingConfig>(
    initialBranding || defaultBranding
  );
  const [loading, setLoading] = useState(!initialBranding);
  const [error, setError] = useState<Error | null>(null);

  // Load branding on mount
  useEffect(() => {
    if (!initialBranding) {
      refreshBranding();
    }
  }, []);

  // Apply branding whenever it changes
  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  const refreshBranding = async () => {
    try {
      setLoading(true);
      setError(null);

      const config = await loadBranding();
      setBranding(config);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load branding'));
      console.error('Error loading branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateBranding = async (updates: Partial<BrandingConfig>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/whitelabel/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update branding');
      }

      const updatedConfig = await response.json();
      setBranding(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update branding'));
      console.error('Error updating branding:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: ThemeContextValue = {
    branding,
    loading,
    error,
    updateBranding,
    refreshBranding,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Hook for accessing branding in components
export function useBranding() {
  const { branding } = useTheme();
  return branding;
}

// Hook for loading state
export function useThemeLoading() {
  const { loading } = useTheme();
  return loading;
}

// Hook for error state
export function useThemeError() {
  const { error } = useTheme();
  return error;
}
