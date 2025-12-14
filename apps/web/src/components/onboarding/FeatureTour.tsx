'use client';

import React, { useEffect, useState } from 'react';
import { useFeatureTour, TourStep } from '@/hooks/useFeatureTour';
import TourTooltip from './TourTooltip';

interface FeatureTourProps {
  steps: TourStep[];
}

export default function FeatureTour({ steps }: FeatureTourProps) {
  const {
    isActive,
    currentStep,
    totalSteps,
    targetRect,
    isWaitingForElement,
    currentStepData,
    nextStep,
    previousStep,
    skipTour,
    closeTour,
  } = useFeatureTour(steps);

  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});

  // Update spotlight position based on target element
  useEffect(() => {
    if (!targetRect) return;

    const padding = currentStepData?.highlightPadding || 4;

    setSpotlightStyle({
      position: 'fixed',
      top: `${targetRect.top - padding}px`,
      left: `${targetRect.left - padding}px`,
      width: `${targetRect.width + padding * 2}px`,
      height: `${targetRect.height + padding * 2}px`,
      pointerEvents: 'none',
      zIndex: 9998,
    });
  }, [targetRect, currentStepData]);

  if (!isActive) return null;

  const isLastStep = currentStep === totalSteps;

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
        style={{ zIndex: 9997 }}
      >
        {/* SVG for spotlight effect */}
        {targetRect && (
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 9997 }}
          >
            <defs>
              <mask id="spotlight-mask">
                {/* White background */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black hole for spotlight */}
                <rect
                  x={targetRect.left - (currentStepData?.highlightPadding || 4)}
                  y={targetRect.top - (currentStepData?.highlightPadding || 4)}
                  width={targetRect.width + (currentStepData?.highlightPadding || 4) * 2}
                  height={targetRect.height + (currentStepData?.highlightPadding || 4) * 2}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            {/* Apply mask to create spotlight effect */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.8)"
              mask="url(#spotlight-mask)"
            />
          </svg>
        )}
      </div>

      {/* Spotlight border/glow */}
      {targetRect && (
        <div
          style={spotlightStyle}
          className="border-2 border-teal-500 rounded-lg shadow-[0_0_20px_rgba(20,184,166,0.5)] animate-in zoom-in-95 duration-300"
        >
          {/* Pulsing animation */}
          <div className="absolute inset-0 border-2 border-teal-400 rounded-lg animate-ping opacity-75" />
        </div>
      )}

      {/* Tooltip */}
      {currentStepData && targetRect && !isWaitingForElement && (
        <TourTooltip
          targetRect={targetRect}
          position={currentStepData.position || 'bottom'}
          title={currentStepData.title}
          description={currentStepData.description}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrevious={previousStep}
          onSkip={skipTour}
          onClose={closeTour}
          showPrevious={currentStep > 1}
          showNext={true}
          nextLabel={isLastStep ? 'Finish' : 'Next'}
        />
      )}

      {/* Waiting message */}
      {isWaitingForElement && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-teal-500/50 rounded-xl shadow-2xl p-6 text-center max-w-md"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
          <p className="text-white font-medium mb-2">
            Waiting for element...
          </p>
          <p className="text-slate-400 text-sm mb-4">
            The tour is waiting for the next element to appear. This might happen after a navigation or data load.
          </p>
          <button
            onClick={skipTour}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Skip Tour
          </button>
        </div>
      )}

      {/* Global CSS for tour highlights */}
      <style jsx global>{`
        [data-tour-active="true"] {
          position: relative;
          z-index: 9999;
        }

        .tour-highlight {
          transition: all 0.3s ease;
        }
      `}</style>
    </>
  );
}

// Predefined tour configurations for common flows

export const dashboardTourSteps: TourStep[] = [
  {
    selector: '[data-tour="dashboard-overview"]',
    title: 'Your Dashboard',
    description: 'This is your main dashboard where you can see all your meetings, analytics, and recent activity at a glance.',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    selector: '[data-tour="upload-meeting"]',
    title: 'Upload Meetings',
    description: 'Click here to record a new meeting, join a live session, or upload an existing recording for transcription and analysis.',
    position: 'bottom',
    highlightPadding: 6,
  },
  {
    selector: '[data-tour="meetings-list"]',
    title: 'Meetings List',
    description: 'Browse all your recorded meetings. Click any meeting to view its transcript, summary, and AI-powered insights.',
    position: 'right',
    highlightPadding: 8,
  },
  {
    selector: '[data-tour="ai-assistant"]',
    title: 'AI Assistant',
    description: 'Ask questions about your meetings, get instant summaries, and discover insights using our AI-powered assistant.',
    position: 'left',
    highlightPadding: 6,
  },
  {
    selector: '[data-tour="settings"]',
    title: 'Settings & More',
    description: 'Access your account settings, team management, integrations, and preferences. You can restart this tour anytime from here!',
    position: 'left',
    highlightPadding: 6,
  },
];
