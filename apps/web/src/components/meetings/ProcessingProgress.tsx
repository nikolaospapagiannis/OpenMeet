'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { ProcessingPhase, ProcessingPhaseData, PhaseStatus } from './ProcessingPhase';
import { cn } from '@/lib/utils';

export interface ProcessingProgressProps {
  phases: ProcessingPhaseData[];
  currentPhase: string;
  overallProgress: number;
  estimatedTimeRemaining?: number;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function ProcessingProgress({
  phases,
  currentPhase,
  overallProgress,
  estimatedTimeRemaining,
  error,
  onRetry,
  className
}: ProcessingProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Calculate stats
  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const totalPhases = phases.length;
  const hasError = phases.some(p => p.status === 'error') || !!error;
  const isComplete = completedPhases === totalPhases && !hasError;

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format estimated time remaining
  const formatEstimatedTime = (): string => {
    if (!estimatedTimeRemaining) return 'Calculating...';
    if (estimatedTimeRemaining < 60) return `${estimatedTimeRemaining}s remaining`;
    const mins = Math.floor(estimatedTimeRemaining / 60);
    const secs = estimatedTimeRemaining % 60;
    return `${mins}m ${secs}s remaining`;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Header Section */}
      <div className="mb-8">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {hasError ? (
              <AlertCircle className="w-6 h-6 text-red-400" />
            ) : isComplete ? (
              <CheckCircle2 className="w-6 h-6 text-teal-400" />
            ) : (
              <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
            )}

            <h2
              className={cn(
                "text-xl font-bold transition-colors duration-300",
                hasError && "text-red-400",
                !hasError && isComplete && "text-teal-400",
                !hasError && !isComplete && "text-white"
              )}
            >
              {hasError
                ? 'Processing Error'
                : isComplete
                ? 'Processing Complete'
                : 'Processing Meeting'}
            </h2>
          </div>

          {/* Time display */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
            {!isComplete && !hasError && estimatedTimeRemaining !== undefined && (
              <div className="text-teal-400 font-medium">
                {formatEstimatedTime()}
              </div>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="relative">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400">
              Phase {completedPhases + (hasError ? 0 : 1)} of {totalPhases}
            </span>
            <span
              className={cn(
                "font-semibold",
                hasError && "text-red-400",
                !hasError && isComplete && "text-teal-400",
                !hasError && !isComplete && "text-white"
              )}
            >
              {Math.round(overallProgress)}%
            </span>
          </div>

          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out relative",
                hasError && "bg-gradient-to-r from-red-500 to-orange-500",
                !hasError && isComplete && "bg-gradient-to-r from-teal-500 to-cyan-500",
                !hasError && !isComplete && "bg-gradient-to-r from-teal-500 to-cyan-500"
              )}
              style={{ width: `${overallProgress}%` }}
            >
              {/* Glow effect */}
              <div
                className={cn(
                  "absolute inset-0 blur-sm opacity-50",
                  hasError && "bg-gradient-to-r from-red-500 to-orange-500",
                  !hasError && "bg-gradient-to-r from-teal-500 to-cyan-500"
                )}
              />

              {/* Shimmer animation for active progress */}
              {!isComplete && !hasError && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300 mb-1">Processing Failed</p>
                <p className="text-sm text-red-400/80">{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-3 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors duration-200"
                  >
                    Retry Processing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {isComplete && !hasError && (
          <div className="mt-4 p-4 rounded-lg bg-teal-500/10 border border-teal-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-teal-300">
                  Meeting processed successfully in {formatTime(elapsedTime)}
                </p>
                <p className="text-sm text-teal-400/60 mt-0.5">
                  Redirecting to meeting details...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phases List */}
      <div className="space-y-0">
        {phases.map((phase, index) => (
          <ProcessingPhase
            key={phase.id}
            phase={phase}
            index={index}
            isFirst={index === 0}
            isLast={index === phases.length - 1}
          />
        ))}
      </div>

      {/* Processing Stats Footer */}
      {!hasError && !isComplete && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white mb-1">
                {completedPhases}
              </div>
              <div className="text-xs text-slate-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-400 mb-1">
                {phases.filter(p => p.status === 'in_progress').length}
              </div>
              <div className="text-xs text-slate-400">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-500 mb-1">
                {phases.filter(p => p.status === 'pending').length}
              </div>
              <div className="text-xs text-slate-400">Pending</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
