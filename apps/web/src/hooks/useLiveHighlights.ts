/**
 * Hook for managing live highlights with WebSocket and API integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import wsService from '../services/websocket';

export interface LiveHighlight {
  id: string;
  sessionId: string;
  meetingId: string;
  userId?: string;
  type: 'manual' | 'action_item' | 'decision' | 'question' | 'key_moment';
  title: string;
  description?: string;
  transcriptSnippet?: string;
  timestampSeconds: number;
  tags: string[];
  autoDetected: boolean;
  confidence?: number;
  sharedWith?: string[];
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

interface UseLiveHighlightsOptions {
  meetingId: string;
  autoDetection?: boolean;
}

interface CreateHighlightData {
  category: LiveHighlight['type'];
  text?: string;
  timestamp?: number;
  tags?: string[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export const useLiveHighlights = ({ meetingId, autoDetection = true }: UseLiveHighlightsOptions) => {
  const [highlights, setHighlights] = useState<LiveHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(autoDetection);
  const wsConnectedRef = useRef(false);

  // Get auth token from localStorage
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }, []);

  // Fetch existing highlights
  const fetchHighlights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get<LiveHighlight[]>(
        `${API_BASE_URL}/api/live/highlights/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      setHighlights(response.data);
    } catch (err: any) {
      console.error('Error fetching highlights:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch highlights');
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, getAuthToken]);

  // Create a new highlight
  const createHighlight = useCallback(async (data: CreateHighlightData) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post<LiveHighlight>(
        `${API_BASE_URL}/api/live/highlights`,
        {
          meetingId,
          timestamp: data.timestamp || Date.now() / 1000,
          category: data.category,
          text: data.text || '',
          tags: data.tags || [],
          autoDetected: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      // Add to local state immediately
      setHighlights(prev => [...prev, response.data]);

      // Send via WebSocket for real-time update to other users
      wsService.send('highlight:created', {
        meetingId,
        highlight: response.data,
      });

      return response.data;
    } catch (err: any) {
      console.error('Error creating highlight:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create highlight';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [meetingId, getAuthToken]);

  // Share highlight with team
  const shareHighlight = useCallback(async (highlightId: string, userIds: string[]) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/live/highlights/${highlightId}/share`,
        { userIds },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      // Update local state
      setHighlights(prev => prev.map(h =>
        h.id === highlightId
          ? { ...h, sharedWith: [...(h.sharedWith || []), ...userIds] }
          : h
      ));

      // Send via WebSocket
      wsService.send('highlight:shared', {
        meetingId,
        highlightId,
        userIds,
      });

      return response.data;
    } catch (err: any) {
      console.error('Error sharing highlight:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to share highlight';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [meetingId, getAuthToken]);

  // Delete a highlight
  const deleteHighlight = useCallback(async (highlightId: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await axios.delete(
        `${API_BASE_URL}/api/live/highlights/${highlightId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      // Remove from local state
      setHighlights(prev => prev.filter(h => h.id !== highlightId));

      // Send via WebSocket
      wsService.send('highlight:deleted', {
        meetingId,
        highlightId,
      });
    } catch (err: any) {
      console.error('Error deleting highlight:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete highlight';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [meetingId, getAuthToken]);

  // Toggle auto-detection
  const toggleAutoDetection = useCallback(async (enabled: boolean) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await axios.post(
        `${API_BASE_URL}/api/live/highlights/${meetingId}/auto-detection`,
        { enabled },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      setAutoDetectionEnabled(enabled);

      // Send via WebSocket
      wsService.send('highlight:auto-detection', {
        meetingId,
        enabled,
      });
    } catch (err: any) {
      console.error('Error toggling auto-detection:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to toggle auto-detection';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [meetingId, getAuthToken]);

  // Copy highlight link
  const copyHighlightLink = useCallback((highlightId: string, timestamp: number) => {
    const link = `${window.location.origin}/meetings/${meetingId}?t=${timestamp}&highlight=${highlightId}`;
    navigator.clipboard.writeText(link);
    return link;
  }, [meetingId]);

  // Export highlights
  const exportHighlights = useCallback(async (format: 'json' | 'csv' | 'markdown' = 'json') => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/live/highlights/${meetingId}/export`,
        {
          params: { format },
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          withCredentials: true,
          responseType: format === 'json' ? 'json' : 'blob',
        }
      );

      if (format === 'json') {
        return response.data;
      } else {
        // Download file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `highlights-${meetingId}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Error exporting highlights:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to export highlights';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [meetingId, getAuthToken]);

  // Setup WebSocket listeners
  useEffect(() => {
    // WebSocket event handlers
    const handleHighlightCreated = (data: any) => {
      if (data.meetingId === meetingId && data.highlight) {
        setHighlights(prev => {
          const exists = prev.some(h => h.id === data.highlight.id);
          if (!exists) {
            return [...prev, data.highlight];
          }
          return prev;
        });
      }
    };

    const handleHighlightDeleted = (data: any) => {
      if (data.meetingId === meetingId && data.highlightId) {
        setHighlights(prev => prev.filter(h => h.id !== data.highlightId));
      }
    };

    const handleHighlightShared = (data: any) => {
      if (data.meetingId === meetingId) {
        setHighlights(prev => prev.map(h =>
          h.id === data.highlightId
            ? { ...h, sharedWith: [...(h.sharedWith || []), ...data.userIds] }
            : h
        ));
      }
    };

    const handleAutoDetectedHighlight = (data: any) => {
      if (data.meetingId === meetingId && autoDetectionEnabled) {
        setHighlights(prev => [...prev, data.highlight]);
      }
    };

    const handleConnectionChange = (data: { status: string }) => {
      setIsConnected(data.status === 'connected');
      if (data.status === 'connected' && !wsConnectedRef.current) {
        wsConnectedRef.current = true;
        // Join meeting room for real-time updates
        wsService.send('highlight:join', { meetingId });
      } else if (data.status === 'disconnected') {
        wsConnectedRef.current = false;
      }
    };

    // Register WebSocket listeners
    wsService.on('highlight:created', handleHighlightCreated);
    wsService.on('highlight:deleted', handleHighlightDeleted);
    wsService.on('highlight:shared', handleHighlightShared);
    wsService.on('highlight:auto-detected', handleAutoDetectedHighlight);
    wsService.on('connection', handleConnectionChange);

    // Connect WebSocket if not already connected
    if (!wsService.isConnectedStatus()) {
      wsService.connect();
    } else {
      // Already connected, join room
      wsService.send('highlight:join', { meetingId });
      setIsConnected(true);
      wsConnectedRef.current = true;
    }

    // Fetch initial highlights
    fetchHighlights();

    // Cleanup
    return () => {
      wsService.off('highlight:created', handleHighlightCreated);
      wsService.off('highlight:deleted', handleHighlightDeleted);
      wsService.off('highlight:shared', handleHighlightShared);
      wsService.off('highlight:auto-detected', handleAutoDetectedHighlight);
      wsService.off('connection', handleConnectionChange);

      if (wsConnectedRef.current) {
        wsService.send('highlight:leave', { meetingId });
      }
    };
  }, [meetingId, autoDetectionEnabled, fetchHighlights]);

  return {
    highlights,
    isLoading,
    error,
    isConnected,
    autoDetectionEnabled,
    createHighlight,
    shareHighlight,
    deleteHighlight,
    toggleAutoDetection,
    copyHighlightLink,
    exportHighlights,
    refetch: fetchHighlights,
  };
};

export default useLiveHighlights;