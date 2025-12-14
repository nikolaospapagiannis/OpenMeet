'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

interface TourTooltipProps {
  // Target element positioning
  targetRect: DOMRect | null;
  position?: TooltipPosition;

  // Content
  title: string;
  description: string;

  // Step info
  currentStep: number;
  totalSteps: number;

  // Actions
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;

  // Display options
  showPrevious?: boolean;
  showNext?: boolean;
  nextLabel?: string;
}

export default function TourTooltip({
  targetRect,
  position = 'bottom',
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  showPrevious = true,
  showNext = true,
  nextLabel = 'Next',
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 16; // Space between target and tooltip
    const arrowSize = 8;

    let top = 0;
    let left = 0;
    let arrowTop = 0;
    let arrowLeft = 0;
    let arrowTransform = '';

    // Calculate position based on preferred position
    switch (position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - margin;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        arrowTop = tooltipRect.height - 1;
        arrowLeft = tooltipRect.width / 2 - arrowSize;
        arrowTransform = 'rotate(180deg)';
        break;

      case 'bottom':
        top = targetRect.bottom + margin;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        arrowTop = -arrowSize - 1;
        arrowLeft = tooltipRect.width / 2 - arrowSize;
        arrowTransform = 'rotate(0deg)';
        break;

      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - margin;
        arrowTop = tooltipRect.height / 2 - arrowSize;
        arrowLeft = tooltipRect.width - 1;
        arrowTransform = 'rotate(90deg)';
        break;

      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.right + margin;
        arrowTop = tooltipRect.height / 2 - arrowSize;
        arrowLeft = -arrowSize - 1;
        arrowTransform = 'rotate(-90deg)';
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 16;

    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    if (top < padding) {
      top = padding;
    } else if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    });

    setArrowStyle({
      position: 'absolute',
      top: `${arrowTop}px`,
      left: `${arrowLeft}px`,
      transform: arrowTransform,
    });
  }, [targetRect, position]);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div
      ref={tooltipRef}
      style={tooltipStyle}
      className="bg-slate-900 border border-teal-500/50 rounded-xl shadow-2xl shadow-teal-500/20 max-w-md animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Arrow */}
      <div
        style={arrowStyle}
        className="w-4 h-4 bg-slate-900 border-teal-500/50"
        css={{
          borderWidth: '1px',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        }}
      />

      {/* Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-teal-400">
                Step {currentStep} of {totalSteps}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-6 rounded-full transition-all ${
                      i < currentStep ? 'bg-teal-500' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          {description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost-glass"
            size="sm"
            onClick={onSkip}
            className="text-slate-400"
          >
            Skip Tour
          </Button>

          <div className="flex items-center gap-2">
            {showPrevious && !isFirstStep && (
              <Button
                variant="ghost-glass"
                size="sm"
                onClick={onPrevious}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}

            {showNext && (
              <Button
                variant="gradient-primary"
                size="sm"
                onClick={onNext}
              >
                {nextLabel}
                {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
