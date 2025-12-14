/**
 * useIntegrations Hook
 * Manages integration state, OAuth flows, and sync operations
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';

export interface Integration {
  id: string;
  type: string;
  name: string;
  organizationId: string;
  userId: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;
  settings: Record<string, any> | null;
  metadata: Record<string, any> | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'video' | 'calendar' | 'crm' | 'communication' | 'storage' | 'productivity';
  icon: any;
  features: string[];
  setupTime: string;
  requiresOAuth: boolean;
}

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingType, setConnectingType] = useState<string | null>(null);

  // Fetch connected integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/integrations');
      setIntegrations(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch integrations');
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start OAuth flow - opens popup window
  const startOAuthFlow = useCallback(async (type: string): Promise<boolean> => {
    try {
      setConnectingType(type);

      // Get OAuth URL from backend
      const response = await apiClient.get(`/integrations/oauth/${type}/authorize`);
      const { authUrl } = response;

      if (!authUrl) {
        throw new Error('No auth URL returned from server');
      }

      // Open OAuth popup
      const popup = window.open(
        authUrl,
        `oauth-${type}`,
        'width=600,height=700,scrollbars=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Poll for OAuth completion
      return new Promise((resolve, reject) => {
        const pollTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollTimer);
            setConnectingType(null);

            // Check URL params for success/error
            const urlParams = new URLSearchParams(window.location.search);
            const success = urlParams.get('success');
            const error = urlParams.get('error');

            if (success === 'true') {
              // Refresh integrations list
              fetchIntegrations();
              resolve(true);
            } else if (error === 'true') {
              reject(new Error('OAuth authentication failed'));
            } else {
              // User closed popup without completing
              resolve(false);
            }
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          if (!popup.closed) {
            popup.close();
          }
          setConnectingType(null);
          reject(new Error('OAuth flow timeout'));
        }, 5 * 60 * 1000);
      });
    } catch (err: any) {
      setConnectingType(null);
      setError(err.message || 'Failed to start OAuth flow');
      throw err;
    }
  }, [fetchIntegrations]);

  // Disconnect integration
  const disconnectIntegration = useCallback(async (integrationId: string): Promise<void> => {
    try {
      await apiClient.delete(`/integrations/${integrationId}`);
      await fetchIntegrations(); // Refresh list
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect integration');
      throw err;
    }
  }, [fetchIntegrations]);

  // Update integration settings
  const updateIntegrationSettings = useCallback(async (
    integrationId: string,
    settings: Record<string, any>
  ): Promise<void> => {
    try {
      await apiClient.patch(`/integrations/${integrationId}`, { settings });
      await fetchIntegrations(); // Refresh list
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update integration settings');
      throw err;
    }
  }, [fetchIntegrations]);

  // Toggle integration active status
  const toggleIntegrationStatus = useCallback(async (
    integrationId: string,
    isActive: boolean
  ): Promise<void> => {
    try {
      await apiClient.patch(`/integrations/${integrationId}`, { isActive });
      await fetchIntegrations(); // Refresh list
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update integration status');
      throw err;
    }
  }, [fetchIntegrations]);

  // Trigger manual sync
  const syncIntegration = useCallback(async (integrationId: string): Promise<void> => {
    try {
      await apiClient.post(`/integrations/${integrationId}/sync`);
      await fetchIntegrations(); // Refresh list
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync integration');
      throw err;
    }
  }, [fetchIntegrations]);

  // Test integration connection
  const testIntegration = useCallback(async (integrationId: string): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      const response = await apiClient.get(`/integrations/${integrationId}/test`);
      return response;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Connection test failed');
    }
  }, []);

  // Get integration by type
  const getIntegrationByType = useCallback((type: string): Integration | undefined => {
    return integrations.find(int => int.type === type);
  }, [integrations]);

  // Check if integration type is connected
  const isConnected = useCallback((type: string): boolean => {
    return integrations.some(int => int.type === type && int.isActive);
  }, [integrations]);

  // Load integrations on mount
  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return {
    integrations,
    loading,
    error,
    connectingType,
    startOAuthFlow,
    disconnectIntegration,
    updateIntegrationSettings,
    toggleIntegrationStatus,
    syncIntegration,
    testIntegration,
    getIntegrationByType,
    isConnected,
    refetch: fetchIntegrations,
  };
}
