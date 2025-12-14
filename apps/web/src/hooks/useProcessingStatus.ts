/**
 * Processing Status WebSocket Hook
 * Real-time WebSocket connection for meeting processing updates
 * NO MOCKS - Uses actual Socket.IO WebSocket API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';
import { ProcessingPhaseData, PhaseStatus } from '@/components/meetings/ProcessingPhase';

export interface ProcessingStatusUpdate {
  phase: string;
  progress: number;
  message?: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

interface UseProcessingStatusOptions {
  meetingId: string;
  wsUrl?: string;
  onComplete?: (meetingId: string) => void;
  onError?: (error: Error) => void;
  onPhaseChange?: (phase: string) => void;
  enablePolling?: boolean;
  pollingInterval?: number;
}

interface ProcessingState {
  phases: ProcessingPhaseData[];
  currentPhase: string;
  overallProgress: number;
  estimatedTimeRemaining?: number;
  error?: string;
  isComplete: boolean;
}

// Define processing phases with their progress ranges
const PROCESSING_PHASES = [
  {
    id: 'uploading',
    name: 'Uploading',
    description: 'Uploading file to storage',
    progressRange: [0, 20]
  },
  {
    id: 'analyzing',
    name: 'Analyzing',
    description: 'Analyzing audio/video content',
    progressRange: [20, 35]
  },
  {
    id: 'transcribing',
    name: 'Transcribing',
    description: 'Converting speech to text',
    progressRange: [35, 70]
  },
  {
    id: 'diarizing',
    name: 'Diarizing',
    description: 'Identifying speakers',
    progressRange: [70, 85]
  },
  {
    id: 'summarizing',
    name: 'Summarizing',
    description: 'Generating AI summary',
    progressRange: [85, 100]
  }
];

export function useProcessingStatus({
  meetingId,
  wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
  onComplete,
  onError,
  onPhaseChange,
  enablePolling = true,
  pollingInterval = 5000
}: UseProcessingStatusOptions) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [processingState, setProcessingState] = useState<ProcessingState>({
    phases: PROCESSING_PHASES.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: 'pending' as PhaseStatus,
      progress: 0
    })),
    currentPhase: 'uploading',
    overallProgress: 0,
    isComplete: false
  });

  const socketRef = useRef<Socket | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Get auth token
  const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  };

  // Update phase status based on progress
  const updatePhaseStatus = useCallback((update: ProcessingStatusUpdate) => {
    setProcessingState(prev => {
      const newPhases = [...prev.phases];
      const phaseIndex = newPhases.findIndex(p => p.id === update.phase);

      if (phaseIndex === -1) return prev;

      // Update current phase
      newPhases[phaseIndex] = {
        ...newPhases[phaseIndex],
        status: update.error ? 'error' : update.progress >= 100 ? 'completed' : 'in_progress',
        progress: update.progress,
        error: update.error,
        startTime: newPhases[phaseIndex].startTime || Date.now(),
        endTime: update.progress >= 100 ? Date.now() : undefined
      };

      // Mark previous phases as completed
      for (let i = 0; i < phaseIndex; i++) {
        if (newPhases[i].status !== 'completed' && newPhases[i].status !== 'error') {
          newPhases[i].status = 'completed';
          newPhases[i].progress = 100;
          newPhases[i].endTime = newPhases[i].endTime || Date.now();
        }
      }

      // Calculate overall progress based on phase ranges
      const phaseConfig = PROCESSING_PHASES.find(p => p.id === update.phase);
      let overallProgress = 0;

      if (phaseConfig) {
        const [min, max] = phaseConfig.progressRange;
        const phaseProgress = (update.progress / 100) * (max - min);
        overallProgress = min + phaseProgress;
      }

      const isComplete = update.phase === 'summarizing' && update.progress >= 100;

      return {
        phases: newPhases,
        currentPhase: update.phase,
        overallProgress: Math.min(100, overallProgress),
        estimatedTimeRemaining: update.estimatedTimeRemaining,
        error: update.error,
        isComplete
      };
    });

    // Call phase change callback
    if (onPhaseChange && prev.currentPhase !== update.phase) {
      onPhaseChange(update.phase);
    }

    // Call completion callback
    if (update.phase === 'summarizing' && update.progress >= 100 && !update.error) {
      logger.info('Processing completed', { meetingId });
      if (onComplete) {
        onComplete(meetingId);
      }
    }

    // Call error callback
    if (update.error && onError) {
      onError(new Error(update.error));
    }
  }, [meetingId, onComplete, onError, onPhaseChange]);

  // Polling fallback
  const pollProcessingStatus = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100'}/api/meetings/${meetingId}/processing-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch processing status');
      }

      const data = await response.json();

      if (data.status) {
        updatePhaseStatus({
          phase: data.currentPhase || 'uploading',
          progress: data.phaseProgress || 0,
          message: data.message,
          error: data.error,
          estimatedTimeRemaining: data.estimatedTimeRemaining
        });
      }
    } catch (error) {
      logger.error('Polling error:', error);
    }
  }, [meetingId, updatePhaseStatus]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!enablePolling) return;

    // Clear existing timer
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    // Poll immediately, then at intervals
    pollProcessingStatus();
    pollingTimerRef.current = setInterval(pollProcessingStatus, pollingInterval);
  }, [enablePolling, pollingInterval, pollProcessingStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnectionStatus('connecting');
    logger.info('Connecting to WebSocket for processing updates', { meetingId });

    try {
      const socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 3000,
        auth: {
          token: getAuthToken()
        }
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        logger.info('WebSocket connected for processing updates');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Subscribe to meeting processing events
        socket.emit('subscribe-processing', { meetingId });

        // Stop polling when WebSocket is connected
        stopPolling();
      });

      socket.on('disconnect', (reason) => {
        logger.info('WebSocket disconnected', { reason });
        setConnectionStatus('disconnected');

        // Start polling fallback
        if (reason !== 'io client disconnect') {
          startPolling();
        }
      });

      socket.on('error', (error) => {
        logger.error('WebSocket error', { error });
        setConnectionStatus('error');

        // Start polling fallback
        startPolling();
      });

      // Processing update events
      socket.on(`meeting:${meetingId}:processing`, (data: ProcessingStatusUpdate) => {
        logger.debug('Processing update received', data);
        updatePhaseStatus(data);
      });

      socket.on(`meeting:${meetingId}:processing:phase`, (data: { phase: string; status: PhaseStatus }) => {
        logger.debug('Phase change received', data);
        if (onPhaseChange) {
          onPhaseChange(data.phase);
        }
      });

      socket.on(`meeting:${meetingId}:processing:complete`, () => {
        logger.info('Processing completed notification received');
        if (onComplete) {
          onComplete(meetingId);
        }
      });

      socket.on(`meeting:${meetingId}:processing:error`, (data: { error: string }) => {
        logger.error('Processing error received', data);
        setProcessingState(prev => ({
          ...prev,
          error: data.error
        }));
        if (onError) {
          onError(new Error(data.error));
        }
      });

    } catch (error) {
      logger.error('Failed to connect to WebSocket', { error });
      setConnectionStatus('error');
      if (onError) {
        onError(error as Error);
      }

      // Start polling fallback
      startPolling();
    }
  }, [meetingId, wsUrl, onComplete, onError, onPhaseChange, updatePhaseStatus, startPolling, stopPolling]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe-processing', { meetingId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopPolling();
    setConnectionStatus('disconnected');
  }, [meetingId, stopPolling]);

  // Retry processing
  const retry = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100'}/api/meetings/${meetingId}/retry-processing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retry processing');
      }

      // Reset state
      setProcessingState({
        phases: PROCESSING_PHASES.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: 'pending' as PhaseStatus,
          progress: 0
        })),
        currentPhase: 'uploading',
        overallProgress: 0,
        isComplete: false
      });

      // Reconnect
      connect();
    } catch (error) {
      logger.error('Failed to retry processing', { error });
      if (onError) {
        onError(error as Error);
      }
    }
  }, [meetingId, connect, onError]);

  // Connect on mount
  useEffect(() => {
    if (meetingId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [meetingId, connect, disconnect]);

  return {
    // State
    ...processingState,
    connectionStatus,

    // Actions
    connect,
    disconnect,
    retry,

    // Utilities
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error' || !!processingState.error
  };
}
