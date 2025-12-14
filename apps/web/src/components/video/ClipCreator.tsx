'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Scissors, Play, Pause, Check, AlertCircle } from 'lucide-react';

interface ClipCreatorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  currentTime: number;
  duration: number;
  onCreateClip: (start: number, end: number, title: string) => Promise<void>;
  onCancel: () => void;
  initialStart?: number | null;
  initialEnd?: number | null;
}

export const ClipCreator: React.FC<ClipCreatorProps> = ({
  videoRef,
  currentTime,
  duration,
  onCreateClip,
  onCancel,
  initialStart,
  initialEnd
}) => {
  const [clipStart, setClipStart] = useState<number>(initialStart ?? currentTime);
  const [clipEnd, setClipEnd] = useState<number>(initialEnd ?? Math.min(currentTime + 30, duration));
  const [clipTitle, setClipTitle] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeString: string): number => {
    const parts = timeString.split(':');
    let seconds = 0;

    if (parts.length === 3) {
      // HH:MM:SS.MS
      seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // MM:SS.MS
      seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    } else {
      // SS.MS
      seconds = parseFloat(parts[0]);
    }

    return Math.max(0, Math.min(duration, seconds));
  };

  const clipDuration = clipEnd - clipStart;

  const handleSetStartTime = () => {
    setClipStart(currentTime);
    if (clipEnd <= currentTime) {
      setClipEnd(Math.min(currentTime + 10, duration));
    }
    setError(null);
  };

  const handleSetEndTime = () => {
    if (currentTime > clipStart) {
      setClipEnd(currentTime);
      setError(null);
    } else {
      setError('End time must be after start time');
    }
  };

  const handlePreviewClip = useCallback(() => {
    if (!videoRef.current) return;

    if (isPreviewing) {
      videoRef.current.pause();
      setIsPreviewing(false);
    } else {
      videoRef.current.currentTime = clipStart;
      videoRef.current.play();
      setIsPreviewing(true);

      // Set up interval to check if we've reached the end of the clip
      const interval = setInterval(() => {
        if (videoRef.current && videoRef.current.currentTime >= clipEnd) {
          videoRef.current.pause();
          videoRef.current.currentTime = clipStart;
          setIsPreviewing(false);
          clearInterval(interval);
        }
      }, 100);

      // Clean up interval if component unmounts or preview stops
      return () => clearInterval(interval);
    }
  }, [clipStart, clipEnd, isPreviewing, videoRef]);

  const handleCreateClip = async () => {
    if (!clipTitle.trim()) {
      setError('Please enter a title for the clip');
      return;
    }

    if (clipEnd <= clipStart) {
      setError('End time must be after start time');
      return;
    }

    if (clipDuration < 1) {
      setError('Clip must be at least 1 second long');
      return;
    }

    if (clipDuration > 300) {
      setError('Clip cannot be longer than 5 minutes');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreateClip(clipStart, clipEnd, clipTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create clip');
      setIsCreating(false);
    }
  };

  // Stop preview when component unmounts
  useEffect(() => {
    return () => {
      if (isPreviewing && videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [isPreviewing, videoRef]);

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6 max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Scissors className="w-6 h-6 text-[var(--ff-purple-500)]" />
            <h2 className="text-xl font-semibold text-white">Create Video Clip</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-[var(--ff-text-muted)]"
            disabled={isCreating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Clip Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
            Clip Title
          </label>
          <input
            type="text"
            value={clipTitle}
            onChange={(e) => setClipTitle(e.target.value)}
            placeholder="Enter a descriptive title..."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)] transition-colors"
            disabled={isCreating}
          />
        </div>

        {/* Time Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
              Start Time
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatTime(clipStart)}
                onChange={(e) => setClipStart(parseTime(e.target.value))}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--ff-purple-500)] transition-colors"
                disabled={isCreating}
              />
              <button
                onClick={handleSetStartTime}
                className="px-3 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] transition-colors disabled:opacity-50"
                disabled={isCreating}
              >
                Current
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
              End Time
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatTime(clipEnd)}
                onChange={(e) => setClipEnd(parseTime(e.target.value))}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--ff-purple-500)] transition-colors"
                disabled={isCreating}
              />
              <button
                onClick={handleSetEndTime}
                className="px-3 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] transition-colors disabled:opacity-50"
                disabled={isCreating}
              >
                Current
              </button>
            </div>
          </div>
        </div>

        {/* Clip Duration */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--ff-text-secondary)]">Clip Duration:</span>
            <span className="text-white font-medium">{formatTime(clipDuration)}</span>
          </div>

          {clipDuration > 60 && (
            <div className="mt-2 text-xs text-yellow-500">
              Note: Longer clips may take more time to process
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePreviewClip}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={isCreating || clipEnd <= clipStart}
          >
            {isPreviewing ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Preview
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Preview Clip
              </>
            )}
          </button>

          <button
            onClick={handleCreateClip}
            className="flex-1 px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={isCreating || !clipTitle.trim() || clipEnd <= clipStart}
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Clip
              </>
            )}
          </button>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-[var(--ff-text-muted)] text-center">
            Tip: Use I to set start point and O to set end point while playing
          </p>
        </div>
      </div>
    </div>
  );
};