/**
 * Live Controls Component
 * Controls for pause/resume transcription, end session, share link, and settings
 */

'use client';

import React, { useState } from 'react';
import {
  Pause,
  Play,
  Square,
  Share2,
  Settings,
  Copy,
  Check,
  Globe,
  AlertCircle
} from 'lucide-react';
import { LiveSessionStatus } from '@/hooks/useLiveTranscription';

interface LiveControlsProps {
  sessionStatus: LiveSessionStatus | null;
  isConnected: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export default function LiveControls({
  sessionStatus,
  isConnected,
  onPause,
  onResume,
  onEnd,
  onSettingsClick,
  className = ''
}: LiveControlsProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const isPaused = sessionStatus?.status === 'paused';
  const isActive = sessionStatus?.status === 'active';

  // Generate share link
  const getShareLink = (): string => {
    if (typeof window === 'undefined' || !sessionStatus) return '';
    return `${window.location.origin}/live/${sessionStatus.sessionId}`;
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareLink());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  // Handle end session with confirmation
  const handleEndSession = () => {
    setShowEndConfirm(false);
    onEnd();
  };

  // Format session duration
  const formatDuration = (startedAt: number): string => {
    const duration = Date.now() - startedAt;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const [duration, setDuration] = React.useState('0:00');

  // Update duration every second
  React.useEffect(() => {
    if (!sessionStatus?.startedAt || sessionStatus.status !== 'active') return;

    const interval = setInterval(() => {
      setDuration(formatDuration(sessionStatus.startedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStatus?.startedAt, sessionStatus?.status]);

  return (
    <>
      <div className={`flex items-center justify-between gap-4 ${className}`}>
        {/* Left Section: Status & Duration */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {/* Session Duration */}
          {sessionStatus && isActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                {duration}
              </span>
            </div>
          )}

          {/* Participant Count */}
          {sessionStatus && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Globe className="w-4 h-4" />
              <span>{sessionStatus.participantCount || 0} participant{sessionStatus.participantCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Right Section: Controls */}
        <div className="flex items-center gap-2">
          {/* Pause/Resume Button */}
          {isActive && (
            <button
              onClick={isPaused ? onResume : onPause}
              disabled={!isConnected}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
              title={isPaused ? 'Resume transcription' : 'Pause transcription'}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              )}
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={() => setShowShareDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                     transition-all duration-200
                     bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                     text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md"
            title="Share live session"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          {/* Settings Button */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg transition-all duration-200
                       bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                       text-gray-700 dark:text-gray-300"
              title="Session settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* End Session Button */}
          <button
            onClick={() => setShowEndConfirm(true)}
            disabled={!isConnected}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                     bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
            title="End session"
          >
            <Square className="w-4 h-4" />
            End
          </button>
        </div>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Share Live Session
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share this link with participants to let them view the live transcription in real-time.
            </p>

            {/* Share Link Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={getShareLink()}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                         transition-all duration-200
                         bg-blue-600 hover:bg-blue-700 text-white"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Anyone with this link can view the live session. Only share with trusted participants.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowShareDialog(false)}
              className="w-full px-4 py-2 rounded-lg font-medium text-sm
                       bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                       text-gray-900 dark:text-gray-100 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* End Session Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              End Live Session?
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will stop the live transcription and end the session for all participants.
              You can still access the transcript and recordings afterward.
            </p>

            {/* Confirm Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-sm
                         bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                         text-gray-900 dark:text-gray-100 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-sm
                         bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
