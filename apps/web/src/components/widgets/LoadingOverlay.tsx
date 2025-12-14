'use client';

import { useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
  className?: string;
  variant?: 'default' | 'minimal' | 'detailed';
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  cancelable?: boolean;
}

export function LoadingOverlay({
  message = "Loading...",
  progress,
  className,
  variant = 'default',
  error,
  onCancel,
  onRetry,
  cancelable = false
}: LoadingOverlayProps) {
  // Handle Escape key to cancel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && cancelable && onCancel) {
      onCancel();
    }
  }, [cancelable, onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Trap focus within overlay
  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement;
    return () => {
      previousActiveElement?.focus();
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-slate-950/90 backdrop-blur-xl",
        "animate-in fade-in duration-300",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label={error ? "Error" : message}
      aria-busy={!error}
    >
      <div className="flex flex-col items-center gap-6 max-w-md px-6">
        {/* Cancel button (top right) */}
        {cancelable && onCancel && !error && (
          <Button
            variant="ghost-glass"
            size="icon"
            className="absolute top-6 right-6 h-10 w-10"
            onClick={onCancel}
            aria-label="Cancel (Escape)"
          >
            <X className="w-5 h-5" />
          </Button>
        )}

        {/* Error State */}
        {error ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <div className="flex gap-3">
              {onRetry && (
                <Button
                  variant="gradient-primary"
                  onClick={onRetry}
                  className="min-w-[100px]"
                >
                  Try Again
                </Button>
              )}
              {onCancel && (
                <Button
                  variant="ghost-glass"
                  onClick={onCancel}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Spinner */}
            <div className="relative">
              {/* Outer ring */}
              <div className="w-24 h-24 rounded-full border-4 border-slate-800" />

              {/* Spinning gradient ring */}
              <div className="absolute inset-0">
                <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-teal-500 border-r-cyan-500 animate-spin" />
              </div>

              {/* Inner glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 blur-xl" />
                <Loader2 className="absolute w-10 h-10 text-teal-400 animate-spin" />
              </div>

              {/* Pulsing rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-2 border-teal-500/30 animate-ping" />
                <div
                  className="absolute w-32 h-32 rounded-full border-2 border-cyan-500/20 animate-ping"
                  style={{ animationDelay: '0.5s' }}
                />
              </div>
            </div>

            {/* Message */}
            {variant !== 'minimal' && (
              <div className="text-center space-y-3 w-full">
                <h3 className="text-lg font-semibold text-white">
                  {message}
                </h3>

                {/* Progress bar */}
                {progress !== undefined && (
                  <div className="space-y-2">
                    <div className="w-full h-2 rounded-full bg-slate-800/50 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out relative"
                        style={{ width: `${progress}%` }}
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        {/* Animated shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </div>
                    </div>
                    <div className="text-sm text-slate-400">
                      {Math.round(progress)}%
                    </div>
                  </div>
                )}

                {/* Loading dots */}
                {variant === 'detailed' && progress === undefined && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                )}

                {/* Cancel hint */}
                {cancelable && onCancel && (
                  <p className="text-xs text-slate-500 mt-4">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Esc</kbd> to cancel
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
