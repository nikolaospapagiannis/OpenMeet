/**
 * WebSocket Hook for Live Sentiment Analysis
 *
 * Connects to ws://localhost:4100/ws/live-sentiment
 * Receives real-time sentiment updates during meetings
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

export interface SentimentScore {
  overall: number; // -1 to 1
  positive: number;
  negative: number;
  neutral: number;
  compound: number;
}

export interface EmotionScores {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  trust: number;
  anticipation: number;
  disgust: number;
}

export interface SentimentData {
  id: string;
  sessionId: string;
  timestamp: number;
  timestampSeconds: number;
  speaker?: string;
  text: string;
  sentiment: SentimentScore;
  emotions: EmotionScores;
  engagement: number;
  tone: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  triggers?: string[];
}

export interface SentimentAlert {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'negative_trend' | 'sudden_drop' | 'disengagement' | 'anger_detected' | 'concern_raised';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  relatedAnalysis: SentimentData;
  acknowledged: boolean;
}

interface UseLiveSentimentOptions {
  sessionId: string;
  maxDataPoints?: number;
  onAlert?: (alert: SentimentAlert) => void;
}

interface UseLiveSentimentReturn {
  data: SentimentData[];
  alerts: SentimentAlert[];
  speakers: Map<string, SentimentData[]>;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
  acknowledgeAlert: (alertId: string) => void;
  clearData: () => void;
}

export function useLiveSentiment({
  sessionId,
  maxDataPoints = 100,
  onAlert
}: UseLiveSentimentOptions): UseLiveSentimentReturn {
  const [data, setData] = useState<SentimentData[]>([]);
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [speakers, setSpeakers] = useState<Map<string, SentimentData[]>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    try {
      // Create WebSocket connection
      const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4100', {
        path: '/ws/live-sentiment',
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        query: {
          sessionId
        }
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('Connected to sentiment WebSocket');
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from sentiment WebSocket:', reason);
        setIsConnected(false);

        // Auto-reconnect after 3 seconds for unexpected disconnections
        if (reason === 'io server disconnect' || reason === 'transport close') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      });

      socket.on('connect_error', (err) => {
        console.error('Connection error:', err.message);
        setError(`Connection failed: ${err.message}`);
        setIsConnected(false);
      });

      // Sentiment data events
      socket.on('sentiment_update', (sentimentData: SentimentData) => {
        setData(prev => {
          const newData = [...prev, sentimentData];
          // Keep only the last maxDataPoints
          if (newData.length > maxDataPoints) {
            return newData.slice(-maxDataPoints);
          }
          return newData;
        });

        // Update speaker-specific data
        if (sentimentData.speaker) {
          setSpeakers(prev => {
            const speakerData = prev.get(sentimentData.speaker!) || [];
            const updated = [...speakerData, sentimentData];
            const newMap = new Map(prev);
            newMap.set(sentimentData.speaker!, updated.slice(-maxDataPoints));
            return newMap;
          });
        }
      });

      // Alert events
      socket.on('sentiment_alert', (alert: SentimentAlert) => {
        setAlerts(prev => [...prev, alert]);

        // Call the alert callback if provided
        if (onAlert) {
          onAlert(alert);
        }
      });

      // Batch updates for performance
      socket.on('sentiment_batch', (batch: SentimentData[]) => {
        setData(prev => {
          const newData = [...prev, ...batch];
          return newData.slice(-maxDataPoints);
        });

        // Update speakers for batch
        batch.forEach(sentimentData => {
          if (sentimentData.speaker) {
            setSpeakers(prev => {
              const speakerData = prev.get(sentimentData.speaker!) || [];
              const updated = [...speakerData, sentimentData];
              const newMap = new Map(prev);
              newMap.set(sentimentData.speaker!, updated.slice(-maxDataPoints));
              return newMap;
            });
          }
        });
      });

      // Error handling
      socket.on('error', (err: any) => {
        console.error('WebSocket error:', err);
        setError(err.message || 'Unknown WebSocket error');
      });

      // Join the session room
      socket.emit('join_session', { sessionId });

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnected(false);
    }
  }, [sessionId, maxDataPoints, onAlert]);

  const reconnect = useCallback(() => {
    setError(null);
    connect();
  }, [connect]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('acknowledge_alert', { alertId });

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, acknowledged: true }
            : alert
        )
      );
    }
  }, []);

  const clearData = useCallback(() => {
    setData([]);
    setAlerts([]);
    setSpeakers(new Map());
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    data,
    alerts,
    speakers,
    isConnected,
    error,
    reconnect,
    acknowledgeAlert,
    clearData
  };
}