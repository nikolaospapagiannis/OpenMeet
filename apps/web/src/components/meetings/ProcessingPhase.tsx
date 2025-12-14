'use client';

import { CheckCircle, Circle, Loader2, AlertCircle, Upload, FileSearch, FileAudio, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'error';

export interface ProcessingPhaseData {
  id: string;
  name: string;
  description: string;
  status: PhaseStatus;
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface ProcessingPhaseProps {
  phase: ProcessingPhaseData;
  index: number;
  isFirst?: boolean;
  isLast?: boolean;
}

const PHASE_ICONS = {
  uploading: Upload,
  analyzing: FileSearch,
  transcribing: FileAudio,
  diarizing: Users,
  summarizing: FileText,
};

export function ProcessingPhase({ phase, index, isFirst, isLast }: ProcessingPhaseProps) {
  const isPending = phase.status === 'pending';
  const isInProgress = phase.status === 'in_progress';
  const isCompleted = phase.status === 'completed';
  const hasError = phase.status === 'error';

  // Get phase-specific icon
  const PhaseIcon = PHASE_ICONS[phase.id.toLowerCase() as keyof typeof PHASE_ICONS] || Circle;

  // Calculate time elapsed
  const getTimeElapsed = (): string => {
    if (!phase.startTime) return '';
    const endTime = phase.endTime || Date.now();
    const elapsed = Math.floor((endTime - phase.startTime) / 1000);

    if (elapsed < 60) return `${elapsed}s`;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 transition-all duration-300",
        "focus-within:ring-2 focus-within:ring-teal-500/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 rounded-lg p-3",
        !isLast && "pb-6"
      )}
    >
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[22px] top-[52px] bottom-0 w-0.5">
          <div
            className={cn(
              "h-full transition-all duration-500",
              hasError && "bg-gradient-to-b from-red-500/30 to-slate-800/50",
              !hasError && isCompleted && "bg-gradient-to-b from-teal-500 to-teal-500/30",
              !hasError && isInProgress && "bg-gradient-to-b from-teal-500 via-teal-500/50 to-slate-800/50",
              !hasError && isPending && "bg-slate-800/50"
            )}
          />
        </div>
      )}

      {/* Phase icon */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "relative rounded-full flex items-center justify-center transition-all duration-300 z-10",
            "w-11 h-11",
            hasError && "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500 shadow-lg shadow-red-500/30",
            !hasError && isCompleted && "bg-gradient-to-br from-teal-500 to-cyan-500 border-2 border-teal-400 shadow-lg shadow-teal-500/30",
            !hasError && isInProgress && "bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border-2 border-teal-500 scale-110 shadow-lg shadow-teal-500/20",
            !hasError && isPending && "bg-slate-800/50 border-2 border-slate-700"
          )}
        >
          {hasError ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : isCompleted ? (
            <CheckCircle className="w-5 h-5 text-white" />
          ) : isInProgress ? (
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
          ) : (
            <PhaseIcon className="w-5 h-5 text-slate-600" />
          )}

          {/* Ripple effect for current phase */}
          {isInProgress && !hasError && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-teal-500 animate-ping opacity-20" />
              <div className="absolute inset-0 rounded-full bg-teal-500/10 animate-pulse" />
            </>
          )}
        </div>

        {/* Phase index badge */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
            "border-2 border-slate-950 transition-all duration-300",
            hasError && "bg-red-500 text-white",
            !hasError && isCompleted && "bg-teal-500 text-white",
            !hasError && isInProgress && "bg-teal-500 text-white",
            !hasError && isPending && "bg-slate-700 text-slate-400"
          )}
        >
          {index + 1}
        </div>
      </div>

      {/* Phase content */}
      <div className="flex-1 min-w-0 pt-1">
        {/* Phase name and status */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3
            className={cn(
              "text-sm font-semibold transition-colors duration-300",
              hasError && "text-red-400",
              !hasError && isCompleted && "text-teal-400",
              !hasError && isInProgress && "text-white",
              !hasError && isPending && "text-slate-500"
            )}
          >
            {phase.name}
          </h3>

          {/* Time elapsed */}
          {(isInProgress || isCompleted) && (
            <span
              className={cn(
                "text-xs font-medium transition-colors duration-300",
                hasError && "text-red-400/60",
                !hasError && isCompleted && "text-teal-500/60",
                !hasError && isInProgress && "text-teal-400",
                !hasError && isPending && "text-slate-600"
              )}
            >
              {getTimeElapsed()}
            </span>
          )}
        </div>

        {/* Phase description */}
        <p
          className={cn(
            "text-xs transition-colors duration-300 mb-2",
            hasError && "text-red-400/80",
            !hasError && isCompleted && "text-slate-400",
            !hasError && isInProgress && "text-slate-300",
            !hasError && isPending && "text-slate-600"
          )}
        >
          {phase.error || phase.description}
        </p>

        {/* Progress bar for active phase */}
        {isInProgress && !hasError && (
          <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300 ease-out"
              style={{ width: `${phase.progress}%` }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
        )}

        {/* Error details */}
        {hasError && phase.error && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-300">{phase.error}</p>
          </div>
        )}

        {/* Completion checkmark animation */}
        {isCompleted && (
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-teal-400/80">Complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
