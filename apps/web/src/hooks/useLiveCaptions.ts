/**
 * Live Captions WebSocket Hook
 * Real-time WebSocket connection for live captions
 * NO MOCKS - Uses actual WebSocket API
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface CaptionSegment {
  id: string;
  text: string;
  speaker?: string;
  confidence: number;
  timestamp: number;
  isFinal: boolean;
  language?: string;
}

export interface CaptionSettings {
  fontSize: 'small' | 'medium' | 'large';
  backgroundColor: number; // 0-100 opacity
  position: 'top' | 'bottom' | 'custom';
  customPosition?: { x: number; y: number };
  showSpeakers: boolean;
  language: string;
  autoFadeTime: number; // milliseconds
}

interface WebSocketMessage {
  type: 'live_caption' | 'session_started' | 'session_stopped' | 'error' | 'status';
  data?: CaptionSegment;
  error?: string;
  sessionId?: string;
  status?: 'connected' | 'disconnected' | 'reconnecting';
}

interface UseLiveCaptionsOptions {
  meetingId: string;
  wsUrl?: string;
  onError?: (error: Error) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useLiveCaptions({
  meetingId,
  wsUrl = process.env.NEXT_PUBLIC_WS_URL ? `${process.env.NEXT_PUBLIC_WS_URL}/ws/live-captions` : 'ws://localhost:4100/ws/live-captions',
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5
}: UseLiveCaptionsOptions) {
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [currentCaption, setCurrentCaption] = useState<CaptionSegment | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CaptionSettings>({
    fontSize: 'medium',
    backgroundColor: 80,
    position: 'bottom',
    showSpeakers: true,
    language: 'en-US',
    autoFadeTime: 5000
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const captionBufferRef = useRef<CaptionSegment[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    cleanup();
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(`${wsUrl}?meetingId=${meetingId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.info('WebSocket connected to live captions service');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Send initial session start message
        ws.send(JSON.stringify({
          type: 'startSession',
          meetingId,
          language: settings.language
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'live_caption':
              if (message.data) {
                handleNewCaption(message.data);
              }
              break;

            case 'session_started':
              setSessionId(message.sessionId || null);
              logger.info('Caption session started', { sessionId: message.sessionId });
              break;

            case 'session_stopped':
              setSessionId(null);
              logger.info('Caption session stopped');
              break;

            case 'status':
              setConnectionStatus(message.status === 'connected' ? 'connected' : 'disconnected');
              break;

            case 'error':
              logger.error('Caption service error:', message.error);
              if (onError) {
                onError(new Error(message.error || 'Unknown caption error'));
              }
              break;
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setConnectionStatus('error');
        if (onError) {
          onError(new Error('WebSocket connection error'));
        }
      };

      ws.onclose = (event) => {
        logger.info('WebSocket closed', { code: event.code, reason: event.reason });
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          logger.info(`Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      if (onError) {
        onError(error as Error);
      }
    }
  }, [meetingId, wsUrl, settings.language, onError, reconnectInterval, maxReconnectAttempts, cleanup]);

  // Handle new caption
  const handleNewCaption = useCallback((caption: CaptionSegment) => {
    // Add to buffer for smooth display
    captionBufferRef.current.push(caption);

    // Update current caption
    setCurrentCaption(caption);

    // Add to history if final
    if (caption.isFinal) {
      setCaptions(prev => [...prev, caption]);
    }

    // Auto-fade caption after timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    fadeTimeoutRef.current = setTimeout(() => {
      setCurrentCaption(null);
    }, settings.autoFadeTime);
  }, [settings.autoFadeTime]);

  // Send message to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      logger.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Start caption session
  const startSession = useCallback(() => {
    sendMessage({
      type: 'startSession',
      meetingId,
      language: settings.language,
      settings
    });
  }, [meetingId, settings, sendMessage]);

  // Stop caption session
  const stopSession = useCallback(() => {
    sendMessage({
      type: 'stopSession',
      meetingId,
      sessionId
    });
    cleanup();
  }, [meetingId, sessionId, sendMessage, cleanup]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<CaptionSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };

      // Send settings update to server if connected
      if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
        sendMessage({
          type: 'updateSettings',
          sessionId,
          settings: updated
        });
      }

      return updated;
    });
  }, [sessionId, sendMessage]);

  // Export captions to SRT format
  const exportToSRT = useCallback((): string => {
    return captions.map((caption, index) => {
      const startTime = formatSRTTime(caption.timestamp);
      const endTime = formatSRTTime(caption.timestamp + 3000); // 3 second duration

      return `${index + 1}
${startTime} --> ${endTime}
${caption.speaker ? `[${caption.speaker}]: ` : ''}${caption.text}

`;
    }).join('');
  }, [captions]);

  // Export captions to WebVTT format
  const exportToWebVTT = useCallback((): string => {
    let vtt = 'WEBVTT\n\n';

    captions.forEach((caption, index) => {
      const startTime = formatWebVTTTime(caption.timestamp);
      const endTime = formatWebVTTTime(caption.timestamp + 3000);

      vtt += `${index + 1}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      if (caption.speaker) {
        vtt += `<v ${caption.speaker}>${caption.text}</v>\n\n`;
      } else {
        vtt += `${caption.text}\n\n`;
      }
    });

    return vtt;
  }, [captions]);

  // Clear caption history
  const clearHistory = useCallback(() => {
    setCaptions([]);
    captionBufferRef.current = [];
  }, []);

  // Format time for SRT
  function formatSRTTime(ms: number): string {
    const date = new Date(ms);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }

  // Format time for WebVTT
  function formatWebVTTTime(ms: number): string {
    const date = new Date(ms);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  // Connect on mount
  useEffect(() => {
    if (meetingId) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [meetingId, connect, cleanup]);

  return {
    // State
    captions,
    currentCaption,
    connectionStatus,
    sessionId,
    settings,

    // Actions
    connect,
    disconnect: cleanup,
    startSession,
    stopSession,
    updateSettings,
    clearHistory,
    sendMessage,

    // Export functions
    exportToSRT,
    exportToWebVTT,

    // Utilities
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error'
  };
}