'use client';

import { useEffect, useState } from 'react';
import { Loader2, X, CheckCircle, AlertCircle, FileAudio, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';
import type { UploadProgress as UploadProgressType } from '@/hooks/useFileUpload';

export interface UploadProgressProps {
  file: File;
  progress: UploadProgressType;
  isUploading: boolean;
  error?: string | null;
  onCancel: () => void;
  onRetry?: () => void;
  className?: string;
}

/**
 * Upload progress component showing progress bar, file info, and controls
 */
export function UploadProgress({
  file,
  progress,
  isUploading,
  error,
  onCancel,
  onRetry,
  className,
}: UploadProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time
  useEffect(() => {
    if (!isUploading) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isUploading]);

  /**
   * Format file size to human-readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format time to human-readable format
   */
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  /**
   * Format upload speed
   */
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 KB/s';
    const kbps = bytesPerSecond / 1024;
    if (kbps < 1024) {
      return `${Math.round(kbps)} KB/s`;
    }
    const mbps = kbps / 1024;
    return `${mbps.toFixed(1)} MB/s`;
  };

  const isVideo = file.type.startsWith('video/');
  const isComplete = progress.percentage === 100 && !isUploading;
  const hasError = Boolean(error);

  return (
    <div
      className={cn(
        'w-full rounded-2xl border transition-all duration-300',
        hasError
          ? 'bg-red-500/10 border-red-500/30'
          : isComplete
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-slate-900/50 border-white/10',
        className
      )}
    >
      <div className="p-6 space-y-6">
        {/* File Info Header */}
        <div className="flex items-start gap-4">
          {/* File Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center',
              hasError
                ? 'bg-red-500/20'
                : isComplete
                ? 'bg-green-500/20'
                : 'bg-teal-500/20'
            )}
          >
            {hasError ? (
              <AlertCircle className="w-7 h-7 text-red-400" />
            ) : isComplete ? (
              <CheckCircle className="w-7 h-7 text-green-400" />
            ) : isVideo ? (
              <FileVideo className="w-7 h-7 text-teal-400" />
            ) : (
              <FileAudio className="w-7 h-7 text-teal-400" />
            )}
          </div>

          {/* File Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="text-base font-semibold text-white truncate">
              {file.name}
            </h4>
            <p className="text-sm text-slate-400">
              {formatFileSize(file.size)}
              {isVideo ? ' • Video' : ' • Audio'}
            </p>

            {/* Status Text */}
            {hasError ? (
              <p className="text-sm text-red-400 pt-1">{error}</p>
            ) : isComplete ? (
              <p className="text-sm text-green-400 pt-1">Upload complete</p>
            ) : isUploading ? (
              <p className="text-sm text-teal-400 pt-1">Uploading...</p>
            ) : null}
          </div>

          {/* Cancel Button */}
          {isUploading && !hasError && (
            <Button
              variant="ghost-glass"
              size="icon"
              onClick={onCancel}
              className="flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
              aria-label="Cancel upload"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && !hasError && (
          <div className="space-y-3">
            {/* Progress Bar Container */}
            <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              {/* Background Glow */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 opacity-50"
                style={{ width: `${progress.percentage}%` }}
              />

              {/* Progress Bar */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>

            {/* Progress Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {/* Percentage */}
                <span className="font-semibold text-white">
                  {progress.percentage}%
                </span>

                {/* Uploaded / Total */}
                <span className="text-slate-400">
                  {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-slate-400">
                {/* Upload Speed */}
                {progress.speed > 0 && (
                  <span>{formatSpeed(progress.speed)}</span>
                )}

                {/* Estimated Time Remaining */}
                {progress.estimatedTimeRemaining > 0 && (
                  <span>
                    {formatTime(Math.ceil(progress.estimatedTimeRemaining))} remaining
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Actions */}
        {hasError && onRetry && (
          <div className="flex items-center gap-3">
            <Button
              variant="gradient-primary"
              size="sm"
              onClick={onRetry}
              className="flex-1"
            >
              Retry Upload
            </Button>
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Processing Indicator */}
        {isComplete && !hasError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30">
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">
                Processing recording...
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Transcription will begin shortly
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
