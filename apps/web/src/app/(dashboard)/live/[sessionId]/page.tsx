/**
 * Live Session Page
 * Real-time meeting transcription view with WebSocket integration
 * Shows live transcript, participants, controls, and bookmarks
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Wifi,
  WifiOff,
  ArrowLeft,
  Loader2
} from 'lucide-react';

import { useLiveTranscription } from '@/hooks/useLiveTranscription';
import LiveTranscriptPanel from '@/components/live/LiveTranscriptPanel';
import LiveControls from '@/components/live/LiveControls';
import LiveBookmarkButton from '@/components/live/LiveBookmarkButton';
import ParticipantsList from '@/components/live/ParticipantsList';

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize live transcription hook with WebSocket connection
  const {
    transcripts,
    currentSegment,
    participants,
    bookmarks,
    sessionStatus,
    connectionStatus,
    isScrolledToBottom,
    newContentAvailable,
    isConnected,
    connect,
    disconnect,
    createBookmark,
    updateSessionStatus,
    scrollToBottom,
    setScrollPosition
  } = useLiveTranscription({
    sessionId,
    autoConnect: true,
    onError: (err) => {
      console.error('Live transcription error:', err);
      setError(err.message || 'An error occurred with the live session');
    }
  });

  // Fetch initial session data
  useEffect(() => {
    async function fetchSessionData() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/live/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Live session not found');
          }
          throw new Error('Failed to load session');
        }

        const data = await response.json();

        // Session data loaded successfully
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        setIsLoading(false);
      }
    }

    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Handle pause
  const handlePause = async () => {
    await updateSessionStatus('paused');
  };

  // Handle resume
  const handleResume = async () => {
    await updateSessionStatus('active');
  };

  // Handle end session
  const handleEnd = async () => {
    await updateSessionStatus('completed');
    // Redirect to meeting details after ending
    if (sessionStatus?.meetingId) {
      router.push(`/dashboard/meetings/${sessionStatus.meetingId}`);
    } else {
      router.push('/dashboard');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (sessionStatus?.meetingId) {
      router.push(`/dashboard/meetings/${sessionStatus.meetingId}`);
    } else {
      router.push('/dashboard');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading live session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !sessionStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Error Loading Session</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Meeting</span>
            </button>

            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnected</span>
                  <button
                    onClick={connect}
                    className="ml-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Reconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Session Title */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Live Transcription
            </h1>
            {sessionStatus && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Session ID: {sessionId.slice(0, 8)}...
              </p>
            )}
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 w-full">
              <LiveControls
                sessionStatus={sessionStatus}
                isConnected={isConnected}
                onPause={handlePause}
                onResume={handleResume}
                onEnd={handleEnd}
              />
            </div>
            <LiveBookmarkButton
              bookmarks={bookmarks}
              onCreateBookmark={createBookmark}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Transcript (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[calc(100vh-16rem)] overflow-hidden">
              <LiveTranscriptPanel
                transcripts={transcripts}
                currentSegment={currentSegment}
                isScrolledToBottom={isScrolledToBottom}
                newContentAvailable={newContentAvailable}
                onScrollPositionChange={setScrollPosition}
                onScrollToBottom={scrollToBottom}
                className="h-full"
              />
            </div>
          </div>

          {/* Right Column: Participants (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <ParticipantsList
                participants={participants}
                defaultExpanded={true}
              />

              {/* Session Info Card */}
              {sessionStatus && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Session Info
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className={`font-medium capitalize ${
                        sessionStatus.status === 'active' ? 'text-green-600 dark:text-green-400' :
                        sessionStatus.status === 'paused' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {sessionStatus.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Language:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {sessionStatus.language.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Segments:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {transcripts.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Bookmarks:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {bookmarks.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Card */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
                  Keyboard Shortcuts
                </h4>
                <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                  <div className="flex justify-between">
                    <span>Create bookmark</span>
                    <kbd className="px-2 py-0.5 bg-blue-200 dark:bg-blue-900 rounded font-mono">B</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && sessionStatus && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">Error</p>
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
