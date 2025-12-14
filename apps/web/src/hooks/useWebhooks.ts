import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  failureCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  webhookId: string;
  event: string;
  status?: number;
  error?: string;
  timestamp: string;
  success: boolean;
}

export interface WebhookEvent {
  name: string;
  description: string;
}

export interface TestWebhookResult {
  success: boolean;
  status?: number;
  message: string;
  error?: string;
}

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [availableEvents, setAvailableEvents] = useState<WebhookEvent[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/webhooks');
      setWebhooks(response.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch webhooks';
      setError(errorMessage);
      console.error('Error fetching webhooks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch available webhook events
  const fetchAvailableEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/webhooks/available/events');
      setAvailableEvents(response.events || []);
    } catch (err: any) {
      // Set default events if API fails
      const defaultEvents: WebhookEvent[] = [
        // Meeting events
        { name: 'meeting.created', description: 'Triggered when a new meeting is scheduled' },
        { name: 'meeting.updated', description: 'Triggered when meeting details are updated' },
        { name: 'meeting.deleted', description: 'Triggered when a meeting is cancelled' },
        { name: 'meeting.started', description: 'Triggered when a meeting starts' },
        { name: 'meeting.completed', description: 'Triggered when a meeting ends' },
        // Transcript events
        { name: 'transcript.created', description: 'Triggered when a transcript is generated' },
        { name: 'transcript.updated', description: 'Triggered when a transcript is updated' },
        { name: 'transcript.ready', description: 'Triggered when a transcript is ready for download' },
        // Summary events
        { name: 'summary.created', description: 'Triggered when an AI summary is generated' },
        // Comment events
        { name: 'comment.created', description: 'Triggered when a comment is added' },
        // Integration events
        { name: 'integration.connected', description: 'Triggered when an integration is connected' },
        { name: 'integration.disconnected', description: 'Triggered when an integration is disconnected' },
        // Team events
        { name: 'user.invited', description: 'Triggered when a user is invited to the team' },
        { name: 'user.removed', description: 'Triggered when a user is removed from the team' },
      ];
      setAvailableEvents(defaultEvents);
      console.log('Using default webhook events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new webhook
  const createWebhook = useCallback(async (url: string, events: string[], secret?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.post('/webhooks', { url, events, secret });
      await fetchWebhooks();
      return { success: true, data: response };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create webhook';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWebhooks]);

  // Update webhook
  const updateWebhook = useCallback(async (id: string, updates: { url?: string; events?: string[]; isActive?: boolean }) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.patch(`/webhooks/${id}`, updates);
      await fetchWebhooks();
      return { success: true, data: response };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update webhook';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWebhooks]);

  // Delete webhook
  const deleteWebhook = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.delete(`/webhooks/${id}`);
      await fetchWebhooks();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete webhook';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWebhooks]);

  // Test webhook
  const testWebhook = useCallback(async (id: string): Promise<TestWebhookResult> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.post(`/webhooks/${id}/test`);
      return response as TestWebhookResult;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to test webhook';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        message: err.response?.data?.message || 'Test webhook delivery failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch webhook deliveries
  const fetchDeliveries = useCallback(async (webhookId: string, limit: number = 50) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/webhooks/${webhookId}/deliveries`, {
        params: { limit }
      });
      setDeliveries(response.data || []);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch deliveries';
      setError(errorMessage);
      console.error('Error fetching deliveries:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Regenerate webhook secret
  const regenerateSecret = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.post(`/webhooks/${id}/regenerate-secret`);
      await fetchWebhooks();
      return { success: true, secret: response.secret };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to regenerate secret';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWebhooks]);

  // Retry failed delivery
  const retryDelivery = useCallback(async (webhookId: string, deliveryId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // This would need a backend endpoint to retry specific deliveries
      // For now, we'll test the webhook which sends a test payload
      const result = await testWebhook(webhookId);
      if (result.success) {
        await fetchDeliveries(webhookId);
      }
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to retry delivery';
      setError(errorMessage);
      return { success: false, error: errorMessage, message: 'Retry failed' };
    } finally {
      setIsLoading(false);
    }
  }, [testWebhook, fetchDeliveries]);

  // Initial load
  useEffect(() => {
    fetchWebhooks();
    fetchAvailableEvents();
  }, [fetchWebhooks, fetchAvailableEvents]);

  return {
    // Data
    webhooks,
    availableEvents,
    deliveries,
    isLoading,
    error,

    // Actions
    fetchWebhooks,
    fetchAvailableEvents,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    fetchDeliveries,
    regenerateSecret,
    retryDelivery,
  };
}