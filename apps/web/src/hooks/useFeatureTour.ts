'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';

export interface TourStep {
  // Element targeting
  selector: string; // CSS selector for the target element

  // Content
  title: string;
  description: string;

  // Positioning
  position?: 'top' | 'right' | 'bottom' | 'left';

  // Behavior
  beforeStep?: () => void | Promise<void>; // Execute before showing this step
  afterStep?: () => void | Promise<void>; // Execute after leaving this step
  waitForElement?: boolean; // Wait for element to appear in DOM (default: true)
  highlightPadding?: number; // Extra padding around highlight (default: 4)
}

export function useFeatureTour(steps: TourStep[]) {
  const { isTourActive, currentTourStep, setTourStep, completeTour, skipTour } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isWaitingForElement, setIsWaitingForElement] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Get current step data
  const currentStepData = steps[currentStep];
  const totalSteps = steps.length;
  const isActive = isTourActive && currentStep < totalSteps;

  // Find and track target element
  const findTargetElement = useCallback(() => {
    if (!currentStepData) return null;

    const element = document.querySelector(currentStepData.selector) as HTMLElement;
    return element;
  }, [currentStepData]);

  // Update target element and rect
  const updateTargetElement = useCallback(() => {
    const element = findTargetElement();

    if (element) {
      setTargetElement(element);
      setTargetRect(element.getBoundingClientRect());
      setIsWaitingForElement(false);

      // Add highlight class
      element.classList.add('tour-highlight');
      element.setAttribute('data-tour-active', 'true');

      return true;
    } else {
      setTargetElement(null);
      setTargetRect(null);

      if (currentStepData?.waitForElement !== false) {
        setIsWaitingForElement(true);
      }

      return false;
    }
  }, [findTargetElement, currentStepData]);

  // Setup observers for element changes
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    // Try to find element immediately
    const found = updateTargetElement();

    // If element not found and we should wait for it, setup mutation observer
    if (!found && currentStepData.waitForElement !== false) {
      observerRef.current = new MutationObserver(() => {
        updateTargetElement();
      });

      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // Setup resize observer to update position on layout changes
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      if (targetElement) {
        setTargetRect(targetElement.getBoundingClientRect());
      }
    });

    if (targetElement) {
      resizeObserverRef.current.observe(targetElement);
    }

    // Update on scroll and resize
    const handleUpdate = () => {
      if (targetElement) {
        setTargetRect(targetElement.getBoundingClientRect());
      }
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isActive, currentStepData, updateTargetElement, targetElement]);

  // Execute before/after step callbacks
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const runBeforeStep = async () => {
      if (currentStepData.beforeStep) {
        await currentStepData.beforeStep();
      }
    };

    runBeforeStep();

    return () => {
      // Cleanup highlight on previous element
      if (targetElement) {
        targetElement.classList.remove('tour-highlight');
        targetElement.removeAttribute('data-tour-active');
      }

      if (currentStepData.afterStep) {
        currentStepData.afterStep();
      }
    };
  }, [currentStep, isActive, currentStepData, targetElement]);

  // Navigate to next step
  const nextStep = useCallback(async () => {
    if (currentStep < totalSteps - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      await setTourStep(nextStepIndex);
    } else {
      // Tour completed
      await completeTour();

      // Cleanup
      if (targetElement) {
        targetElement.classList.remove('tour-highlight');
        targetElement.removeAttribute('data-tour-active');
      }
    }
  }, [currentStep, totalSteps, setTourStep, completeTour, targetElement]);

  // Navigate to previous step
  const previousStep = useCallback(async () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      await setTourStep(prevStepIndex);
    }
  }, [currentStep, setTourStep]);

  // Skip tour
  const handleSkipTour = useCallback(async () => {
    await skipTour();

    // Cleanup
    if (targetElement) {
      targetElement.classList.remove('tour-highlight');
      targetElement.removeAttribute('data-tour-active');
    }
  }, [skipTour, targetElement]);

  // Close tour (same as skip)
  const closeTour = useCallback(() => {
    handleSkipTour();
  }, [handleSkipTour]);

  // Reset to step 0 when tour becomes active
  useEffect(() => {
    if (isTourActive && currentTourStep === 0) {
      setCurrentStep(0);
    }
  }, [isTourActive, currentTourStep]);

  return {
    // State
    isActive,
    currentStep: currentStep + 1, // 1-indexed for display
    totalSteps,
    targetElement,
    targetRect,
    isWaitingForElement,
    currentStepData,

    // Actions
    nextStep,
    previousStep,
    skipTour: handleSkipTour,
    closeTour,
  };
}
