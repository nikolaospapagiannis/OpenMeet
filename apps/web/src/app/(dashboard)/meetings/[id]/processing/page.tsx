'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ProcessingProgress } from '@/components/meetings/ProcessingProgress';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { logger } from '@/lib/logger';

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;
  const [showNotification, setShowNotification] = useState(false);
  const [canLeave, setCanLeave] = useState(false);

  // WebSocket hook for real-time processing updates
  const {
    phases,
    currentPhase,
    overallProgress,
    estimatedTimeRemaining,
    error,
    isComplete,
    connectionStatus,
    retry
  } = useProcessingStatus({
    meetingId,
    onComplete: (id) => {
      logger.info('Processing completed, redirecting to meeting', { meetingId: id });
      setShowNotification(true);

      // Show notification for 3 seconds, then redirect
      setTimeout(() => {
        router.push(`/meetings/${id}`);
      }, 3000);
    },
    onError: (err) => {
      logger.error('Processing error occurred', { error: err.message, meetingId });
    },
    onPhaseChange: (phase) => {
      logger.info('Phase changed', { phase, meetingId });
    },
    enablePolling: true, // Fallback polling if WebSocket fails
    pollingInterval: 5000
  });

  // Allow leaving after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanLeave(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Browser notification when complete
  useEffect(() => {
    if (isComplete && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Meeting Processing Complete', {
        body: 'Your meeting has been processed and is ready to view.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      });
    }
  }, [isComplete]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle retry
  const handleRetry = () => {
    retry();
  };

  // Handle navigation back
  const handleGoBack = () => {
    if (canLeave || isComplete || error) {
      router.push('/meetings');
    } else {
      if (confirm('Processing is still in progress. Are you sure you want to leave? You can return to this page later.')) {
        router.push('/meetings');
      }
    }
  };

  // Handle view meeting
  const handleViewMeeting = () => {
    router.push(`/meetings/${meetingId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">
                {canLeave || isComplete || error ? 'Back to Meetings' : 'Leave Processing'}
              </span>
            </button>

            {/* Connection status indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  connectionStatus === 'connected'
                    ? 'bg-teal-500 animate-pulse'
                    : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : connectionStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-xs text-slate-400">
                {connectionStatus === 'connected'
                  ? 'Real-time updates'
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : connectionStatus === 'error'
                  ? 'Using fallback polling'
                  : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <ProcessingProgress
          phases={phases}
          currentPhase={currentPhase}
          overallProgress={overallProgress}
          estimatedTimeRemaining={estimatedTimeRemaining}
          error={error}
          onRetry={handleRetry}
          className="bg-slate-900 rounded-xl p-8 shadow-2xl border border-slate-800"
        />

        {/* Action Buttons */}
        {isComplete && !error && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handleViewMeeting}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors duration-200 shadow-lg shadow-teal-500/20"
            >
              <span>View Meeting</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Info Card */}
        {!isComplete && !error && (
          <div className="mt-8 p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-2">
              Processing Information
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">•</span>
                <span>
                  You can safely leave this page. Processing will continue in the background.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">•</span>
                <span>
                  You will receive a notification when processing is complete.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">•</span>
                <span>
                  Real-time updates are provided via WebSocket with polling fallback.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">•</span>
                <span>
                  Meeting ID: <code className="text-teal-400 font-mono text-xs">{meetingId}</code>
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Technical Details */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-slate-900/30 rounded-lg border border-slate-800/50">
            <details>
              <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                Technical Details (Dev Only)
              </summary>
              <div className="mt-4 space-y-2 text-xs font-mono text-slate-600">
                <div>Meeting ID: {meetingId}</div>
                <div>Connection: {connectionStatus}</div>
                <div>Current Phase: {currentPhase}</div>
                <div>Overall Progress: {overallProgress.toFixed(2)}%</div>
                <div>Complete: {isComplete ? 'Yes' : 'No'}</div>
                <div>Error: {error || 'None'}</div>
                <div>WebSocket URL: {process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002'}</div>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Completion notification toast */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-teal-500/30 rounded-lg shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300 max-w-md">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">
                Processing Complete!
              </h4>
              <p className="text-sm text-slate-400 mb-3">
                Redirecting to your meeting...
              </p>
              <button
                onClick={handleViewMeeting}
                className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
              >
                View now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
