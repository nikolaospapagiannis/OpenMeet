/**
 * Admin WebSocket Hook
 * Enterprise-grade WebSocket connection management for admin dashboard
 *
 * Features:
 * - Namespace-based Socket.IO connections
 * - Automatic reconnection with exponential backoff
 * - Multi-tenant organization isolation
 * - Token-based authentication
 * - Connection state management
 * - Error handling and logging
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

// Create child logger for WebSocket operations
const wsLogger = logger.child('WebSocket');

// WebSocket connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

// Configuration for the WebSocket connection
export interface WebSocketConfig {
  namespace: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

// Return type for the hook
export interface UseAdminWebSocketReturn<T = unknown> {
  socket: Socket | null;
  connectionState: ConnectionState;
  lastMessage: T | null;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  off: (event: string, callback?: (data: unknown) => void) => void;
  isConnected: boolean;
  reconnectAttempts: number;
}

// Default configuration
const DEFAULT_CONFIG: Partial<WebSocketConfig> = {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
};

/**
 * Custom hook for managing Socket.IO WebSocket connections
 * Provides enterprise-grade connection management with automatic reconnection
 */
export function useAdminWebSocket<T = unknown>(
  config: WebSocketConfig,
  authToken?: string
): UseAdminWebSocketReturn<T> {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const eventHandlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Get the WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL ||
                    process.env.NEXT_PUBLIC_API_URL ||
                    'http://localhost:4100';
    return `${baseUrl}${mergedConfig.namespace}`;
  }, [mergedConfig.namespace]);

  // Connect to the WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnectionState('connecting');
    setError(null);

    const url = getWebSocketUrl();

    // Create Socket.IO connection with authentication
    socketRef.current = io(url, {
      auth: authToken ? { token: authToken } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: mergedConfig.reconnectionAttempts,
      reconnectionDelay: mergedConfig.reconnectionDelay,
      reconnectionDelayMax: mergedConfig.reconnectionDelayMax,
      timeout: mergedConfig.timeout,
      autoConnect: true,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      setConnectionState('connected');
      setReconnectAttempts(0);
      setError(null);
      wsLogger.info(`Connected to ${mergedConfig.namespace}`, { namespace: mergedConfig.namespace });
    });

    socket.on('disconnect', (reason) => {
      setConnectionState('disconnected');
      wsLogger.info(`Disconnected from ${mergedConfig.namespace}`, { namespace: mergedConfig.namespace, reason });
    });

    socket.on('connect_error', (err) => {
      setConnectionState('error');
      setError(new Error(`Connection error: ${err.message}`));
      wsLogger.error(`Connection error on ${mergedConfig.namespace}`, err, { namespace: mergedConfig.namespace });
    });

    socket.on('reconnect_attempt', (attempt) => {
      setConnectionState('reconnecting');
      setReconnectAttempts(attempt);
      wsLogger.info(`Reconnection attempt ${attempt} for ${mergedConfig.namespace}`, { namespace: mergedConfig.namespace, attempt });
    });

    socket.on('reconnect', (attemptNumber) => {
      setConnectionState('connected');
      setReconnectAttempts(0);
      wsLogger.info(`Reconnected to ${mergedConfig.namespace} after ${attemptNumber} attempts`, { namespace: mergedConfig.namespace, attemptNumber });
    });

    socket.on('reconnect_error', (err) => {
      setError(new Error(`Reconnection error: ${err.message}`));
      wsLogger.error(`Reconnection error on ${mergedConfig.namespace}`, err, { namespace: mergedConfig.namespace });
    });

    socket.on('reconnect_failed', () => {
      setConnectionState('error');
      setError(new Error('Failed to reconnect after maximum attempts'));
      wsLogger.error(`Reconnection failed for ${mergedConfig.namespace}`, undefined, { namespace: mergedConfig.namespace });
    });

    // Re-register any existing event handlers
    eventHandlersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket.on(event, handler);
      });
    });
  }, [authToken, getWebSocketUrl, mergedConfig]);

  // Disconnect from the WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionState('disconnected');
      wsLogger.info(`Manually disconnected from ${mergedConfig.namespace}`, { namespace: mergedConfig.namespace });
    }
  }, [mergedConfig.namespace]);

  // Emit an event
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      wsLogger.warn(`Cannot emit '${event}': Not connected`, { event });
    }
  }, []);

  // Subscribe to an event
  const on = useCallback((event: string, callback: (data: unknown) => void) => {
    // Track handler
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(callback);

    // Wrap callback to update lastMessage
    const wrappedCallback = (data: unknown) => {
      setLastMessage(data as T);
      callback(data);
    };

    // Register with socket if connected
    if (socketRef.current) {
      socketRef.current.on(event, wrappedCallback);
    }
  }, []);

  // Unsubscribe from an event
  const off = useCallback((event: string, callback?: (data: unknown) => void) => {
    if (callback) {
      eventHandlersRef.current.get(event)?.delete(callback);
      socketRef.current?.off(event, callback);
    } else {
      eventHandlersRef.current.delete(event);
      socketRef.current?.off(event);
    }
  }, []);

  // Auto-connect on mount if configured
  useEffect(() => {
    if (mergedConfig.autoConnect && authToken) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [mergedConfig.autoConnect, authToken, connect, disconnect]);

  return {
    socket: socketRef.current,
    connectionState,
    lastMessage,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected: connectionState === 'connected',
    reconnectAttempts,
  };
}

/**
 * Hook for concurrent users WebSocket namespace
 */
export function useConcurrentUsersSocket(authToken?: string) {
  return useAdminWebSocket<{
    type: 'global' | 'organization';
    totalUsers?: number;
    organizationId?: string;
    count?: number;
    byOrganization?: Array<{ organizationId: string; count: number }>;
    serverCount?: number;
    timestamp: string;
  }>({
    namespace: '/admin/concurrent-users',
    autoConnect: true,
  }, authToken);
}

/**
 * Hook for analytics stream WebSocket namespace
 */
export function useAnalyticsStreamSocket(authToken?: string) {
  return useAdminWebSocket<{
    id: string;
    type: string;
    organizationId: string;
    data: Record<string, unknown>;
    timestamp: string;
    _channel?: string;
  }>({
    namespace: '/admin/analytics-stream',
    autoConnect: true,
  }, authToken);
}

export default useAdminWebSocket;
