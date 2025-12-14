'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle, Circle, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  description?: string;
  error?: string;
}

interface ProgressTrackerProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  variant?: 'default' | 'compact';
  error?: string;
  onStepClick?: (stepIndex: number) => void;
}

export function ProgressTracker({
  steps,
  currentStep,
  className,
  variant = 'default',
  error,
  onStepClick
}: ProgressTrackerProps) {
  const isCompact = variant === 'compact';
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hasError = error || steps.some(s => s.error);

  // Focus current step when it changes
  useEffect(() => {
    if (stepsRef.current[currentStep]) {
      stepsRef.current[currentStep]?.focus();
    }
  }, [currentStep]);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (!onStepClick) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        if (idx < steps.length - 1) {
          stepsRef.current[idx + 1]?.focus();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        if (idx > 0) {
          stepsRef.current[idx - 1]?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (idx < currentStep) {
          onStepClick(idx);
        }
        break;
      case 'Home':
        e.preventDefault();
        stepsRef.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        stepsRef.current[steps.length - 1]?.focus();
        break;
    }
  };

  return (
    <div className={cn("relative", className)} role="group" aria-label="Progress tracker">
      {/* Global Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Progress Line */}
      <div className={cn(
        "absolute left-0 right-0 h-0.5 bg-slate-800/50",
        isCompact ? "top-4" : "top-5"
      )}>
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out relative",
            hasError
              ? "bg-gradient-to-r from-red-500 to-orange-500"
              : "bg-gradient-to-r from-teal-500 to-cyan-500"
          )}
          style={{ width: `${(currentStep / Math.max(steps.length - 1, 1)) * 100}%` }}
        >
          {/* Animated glow */}
          <div className={cn(
            "absolute inset-0 blur-sm opacity-50",
            hasError
              ? "bg-gradient-to-r from-red-500 to-orange-500"
              : "bg-gradient-to-r from-teal-500 to-cyan-500"
          )} />
        </div>
      </div>

      {/* Steps */}
      <div
        className={cn(
          "relative flex",
          isCompact ? "gap-2" : "justify-between"
        )}
        role="list"
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isUpcoming = idx > currentStep;
          const stepHasError = step.error || (isCurrent && error);
          const isClickable = onStepClick && idx < currentStep;

          return (
            <div
              key={idx}
              ref={(el) => { stepsRef.current[idx] = el; }}
              role="listitem"
              tabIndex={onStepClick ? 0 : -1}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Step ${idx + 1}: ${step.label}${isCompleted ? ', completed' : isCurrent ? ', in progress' : ', upcoming'}${stepHasError ? `, error: ${step.error || error}` : ''}`}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onClick={() => isClickable && onStepClick(idx)}
              className={cn(
                "flex flex-col items-center transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 rounded-lg p-1",
                isCompact ? "flex-1" : "max-w-[140px]",
                isClickable && "cursor-pointer hover:scale-105"
              )}
            >
              {/* Step Circle */}
              <div className={cn(
                "relative rounded-full flex items-center justify-center mb-3 transition-all duration-300 z-10",
                isCompact ? "w-8 h-8" : "w-10 h-10",
                stepHasError && "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500 shadow-lg shadow-red-500/30",
                !stepHasError && isCompleted && "bg-gradient-to-br from-teal-500 to-cyan-500 border-2 border-teal-400 shadow-lg shadow-teal-500/30",
                !stepHasError && isCurrent && "bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border-2 border-teal-500 scale-110 shadow-lg shadow-teal-500/20 animate-pulse",
                !stepHasError && isUpcoming && "bg-slate-800/50 border-2 border-slate-700"
              )}>
                {stepHasError ? (
                  <XCircle className={cn(
                    "text-red-400",
                    isCompact ? "w-4 h-4" : "w-5 h-5"
                  )} />
                ) : isCompleted ? (
                  <CheckCircle className={cn(
                    "text-white",
                    isCompact ? "w-4 h-4" : "w-5 h-5"
                  )} />
                ) : isCurrent ? (
                  <Loader2 className={cn(
                    "text-teal-400 animate-spin",
                    isCompact ? "w-4 h-4" : "w-5 h-5"
                  )} />
                ) : (
                  <Circle className={cn(
                    "text-slate-600",
                    isCompact ? "w-3 h-3" : "w-4 h-4"
                  )} />
                )}

                {/* Ripple effect for current step */}
                {isCurrent && !stepHasError && (
                  <div className="absolute inset-0 rounded-full border-2 border-teal-500 animate-ping opacity-20" />
                )}
              </div>

              {/* Step Label */}
              {!isCompact && (
                <div className="text-center">
                  <div className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    stepHasError && "text-red-400",
                    !stepHasError && isCompleted && "text-teal-400",
                    !stepHasError && isCurrent && "text-white font-semibold",
                    !stepHasError && isUpcoming && "text-slate-500"
                  )}>
                    {step.label}
                  </div>
                  {(step.description || step.error) && (
                    <div className={cn(
                      "text-xs mt-1 transition-colors duration-300",
                      stepHasError && "text-red-400/80",
                      !stepHasError && isCompleted && "text-teal-500/60",
                      !stepHasError && isCurrent && "text-slate-400",
                      !stepHasError && isUpcoming && "text-slate-600"
                    )}>
                      {step.error || step.description}
                    </div>
                  )}
                </div>
              )}

              {/* Compact: Step number */}
              {isCompact && (
                <div className={cn(
                  "text-xs mt-1 font-medium transition-colors duration-300",
                  stepHasError && "text-red-400",
                  !stepHasError && isCompleted && "text-teal-400",
                  !stepHasError && isCurrent && "text-white",
                  !stepHasError && isUpcoming && "text-slate-500"
                )}>
                  {idx + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact: Current step label below */}
      {isCompact && (
        <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={cn(
            "text-sm font-semibold mb-1",
            steps[currentStep]?.error || error ? "text-red-400" : "text-white"
          )}>
            {steps[currentStep]?.label}
          </div>
          {(steps[currentStep]?.description || steps[currentStep]?.error) && (
            <div className={cn(
              "text-xs",
              steps[currentStep]?.error ? "text-red-400/80" : "text-slate-400"
            )}>
              {steps[currentStep]?.error || steps[currentStep]?.description}
            </div>
          )}
        </div>
      )}

      {/* Progress percentage */}
      <div className="mt-4 text-center">
        <div className={cn(
          "text-xs",
          hasError ? "text-red-400" : "text-slate-500"
        )}>
          Step {currentStep + 1} of {steps.length}
          <span className="mx-2">|</span>
          {Math.round((currentStep / Math.max(steps.length - 1, 1)) * 100)}% Complete
        </div>
      </div>
    </div>
  );
}
