/**
 * Live Transcription WebSocket Hook
 * Real-time WebSocket connection for live transcription with participants and bookmarks
 * NO MOCKS - Uses actual WebSocket service
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import wsService from '@/services/websocket';
import { logger } from '@/lib/logger';

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime?: number;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  talkTimeSeconds: number;
  joinedAt: number;
}

export interface LiveBookmark {
  id: string;
  title: string;
  description?: string;
  type: 'manual' | 'action_item' | 'decision' | 'question' | 'key_moment';
  timestampSeconds: number;
  userId: string;
  createdAt: string;
  tags?: string[];
}

export interface LiveSessionStatus {
  sessionId: string;
  meetingId: string;
  status: 'active' | 'paused' | 'completed';
  startedAt: number;
  participantCount: number;
  language: string;
}

interface UseLiveTranscriptionOptions {
  sessionId: string;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
}

export function useLiveTranscription({
  sessionId,
  autoConnect = true,
  onError
}: UseLiveTranscriptionOptions) {
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<TranscriptSegment | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bookmarks, setBookmarks] = useState<LiveBookmark[]>([]);
  const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [newContentAvailable, setNewContentAvailable] = useState(false);

  const isConnectedRef = useRef(false);
  const sessionIdRef = useRef(sessionId);

  // Update session ID ref when it changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Handle new transcript segment
  const handleTranscriptSegment = useCallback((segment: TranscriptSegment) => {
    logger.info('New transcript segment received:', segment);

    // Update current segment if not final
    if (!segment.isFinal) {
      setCurrentSegment(segment);
    } else {
      // Add final segment to transcripts
      setTranscripts(prev => {
        // Check if segment already exists (prevent duplicates)
        const exists = prev.some(t => t.id === segment.id);
        if (exists) {
          return prev.map(t => t.id === segment.id ? segment : t);
        }
        return [...prev, segment];
      });
      setCurrentSegment(null);

      // Show new content indicator if not scrolled to bottom
      if (!isScrolledToBottom) {
        setNewContentAvailable(true);
      }
    }
  }, [isScrolledToBottom]);

  // Handle participant joined
  const handleParticipantJoined = useCallback((data: any) => {
    logger.info('Participant joined:', data);
    const participant: Participant = {
      id: data.participantId || data.id,
      name: data.name || data.participantName || 'Unknown',
      email: data.email,
      avatar: data.avatar,
      isSpeaking: false,
      isMuted: data.isMuted || false,
      talkTimeSeconds: 0,
      joinedAt: Date.now()
    };

    setParticipants(prev => {
      // Check if already exists
      const exists = prev.some(p => p.id === participant.id);
      if (exists) return prev;
      return [...prev, participant];
    });

    // Update participant count
    setSessionStatus(prev => prev ? {
      ...prev,
      participantCount: (prev.participantCount || 0) + 1
    } : null);
  }, []);

  // Handle participant left
  const handleParticipantLeft = useCallback((data: any) => {
    logger.info('Participant left:', data);
    const participantId = data.participantId || data.id;

    setParticipants(prev => prev.filter(p => p.id !== participantId));

    // Update participant count
    setSessionStatus(prev => prev ? {
      ...prev,
      participantCount: Math.max(0, (prev.participantCount || 0) - 1)
    } : null);
  }, []);

  // Handle bookmark created
  const handleBookmarkCreated = useCallback((bookmark: LiveBookmark) => {
    logger.info('Bookmark created:', bookmark);
    setBookmarks(prev => {
      // Check if already exists
      const exists = prev.some(b => b.id === bookmark.id);
      if (exists) return prev;
      return [...prev, bookmark].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    });
  }, []);

  // Handle participant speaking update
  const handleParticipantSpeaking = useCallback((data: any) => {
    const { participantId, isSpeaking, speaker } = data;

    setParticipants(prev => prev.map(p => {
      if (p.id === participantId || p.name === speaker) {
        return { ...p, isSpeaking };
      }
      return { ...p, isSpeaking: false }; // Only one person speaks at a time
    }));
  }, []);

  // Handle session status update
  const handleSessionUpdate = useCallback((data: any) => {
    logger.info('Session status update:', data);
    setSessionStatus(prev => ({
      ...prev,
      ...data
    }));
  }, []);

  // Handle connection status
  const handleConnectionChange = useCallback((data: { status: string }) => {
    logger.info('Connection status changed:', data.status);
    if (data.status === 'connected') {
      setConnectionStatus('connected');
    } else if (data.status === 'disconnected') {
      setConnectionStatus('disconnected');
    }
  }, []);

  // Handle errors
  const handleError = useCallback((error: any) => {
    logger.error('WebSocket error:', error);
    setConnectionStatus('error');
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [onError]);

  // Connect to WebSocket and join session room
  const connect = useCallback(() => {
    if (isConnectedRef.current) {
      logger.info('Already connected to WebSocket');
      return;
    }

    setConnectionStatus('connecting');
    logger.info('Connecting to live transcription session:', sessionIdRef.current);

    // Connect to WebSocket service
    wsService.connect();

    // Set up event listeners
    wsService.on('connection', handleConnectionChange);
    wsService.on('error', handleError);
    wsService.on('transcript:segment', handleTranscriptSegment);
    wsService.on('user:joined', handleParticipantJoined);
    wsService.on('user:left', handleParticipantLeft);
    wsService.on('transcript:speaker', handleParticipantSpeaking);
    wsService.on('meeting:update', handleSessionUpdate);

    // Join the live session room
    wsService.send('live:join', { sessionId: sessionIdRef.current });

    isConnectedRef.current = true;
    setConnectionStatus('connected');
  }, [
    handleConnectionChange,
    handleError,
    handleTranscriptSegment,
    handleParticipantJoined,
    handleParticipantLeft,
    handleParticipantSpeaking,
    handleSessionUpdate
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (!isConnectedRef.current) return;

    logger.info('Disconnecting from live transcription session');

    // Leave the session room
    wsService.send('live:leave', { sessionId: sessionIdRef.current });

    // Remove event listeners
    wsService.off('connection', handleConnectionChange);
    wsService.off('error', handleError);
    wsService.off('transcript:segment', handleTranscriptSegment);
    wsService.off('user:joined', handleParticipantJoined);
    wsService.off('user:left', handleParticipantLeft);
    wsService.off('transcript:speaker', handleParticipantSpeaking);
    wsService.off('meeting:update', handleSessionUpdate);

    isConnectedRef.current = false;
    setConnectionStatus('disconnected');
  }, [
    handleConnectionChange,
    handleError,
    handleTranscriptSegment,
    handleParticipantJoined,
    handleParticipantLeft,
    handleParticipantSpeaking,
    handleSessionUpdate
  ]);

  // Create bookmark
  const createBookmark = useCallback(async (
    title: string,
    description?: string,
    type: LiveBookmark['type'] = 'manual',
    tags?: string[]
  ): Promise<LiveBookmark | null> => {
    try {
      const timestampSeconds = transcripts.length > 0
        ? transcripts[transcripts.length - 1].endTime || transcripts[transcripts.length - 1].startTime
        : 0;

      // Send bookmark creation through WebSocket for real-time sync
      wsService.send('bookmark:create', {
        sessionId: sessionIdRef.current,
        title,
        description,
        type,
        timestampSeconds,
        tags
      });

      // Also persist via API
      const response = await fetch(`/api/live/${sessionIdRef.current}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type,
          timestampSeconds,
          tags
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create bookmark');
      }

      const data = await response.json();
      const bookmark = data.bookmark;

      // Add to local state
      handleBookmarkCreated(bookmark);

      return bookmark;
    } catch (error) {
      logger.error('Error creating bookmark:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to create bookmark'));
      }
      return null;
    }
  }, [transcripts, handleBookmarkCreated, onError]);

  // Update session status (pause/resume/complete)
  const updateSessionStatus = useCallback(async (status: 'active' | 'paused' | 'completed') => {
    try {
      wsService.send('session:status', {
        sessionId: sessionIdRef.current,
        status
      });

      // Also update via API
      const response = await fetch(`/api/live/sessions/${sessionIdRef.current}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update session status');
      }

      setSessionStatus(prev => prev ? { ...prev, status } : null);

      // If completing session, disconnect
      if (status === 'completed') {
        disconnect();
      }
    } catch (error) {
      logger.error('Error updating session status:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to update session status'));
      }
    }
  }, [disconnect, onError]);

  // Scroll to bottom handler
  const scrollToBottom = useCallback(() => {
    setIsScrolledToBottom(true);
    setNewContentAvailable(false);
  }, []);

  // Mark scroll position
  const setScrollPosition = useCallback((isAtBottom: boolean) => {
    setIsScrolledToBottom(isAtBottom);
    if (isAtBottom) {
      setNewContentAvailable(false);
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (isConnectedRef.current) {
        disconnect();
      }
    };
  }, [sessionId, autoConnect, connect, disconnect]);

  return {
    // State
    transcripts,
    currentSegment,
    participants,
    bookmarks,
    sessionStatus,
    connectionStatus,
    isScrolledToBottom,
    newContentAvailable,

    // Actions
    connect,
    disconnect,
    createBookmark,
    updateSessionStatus,
    scrollToBottom,
    setScrollPosition,

    // Computed
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
    totalTranscriptText: transcripts.map(t => t.text).join(' ')
  };
}
