'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '@/lib/api';

interface OnboardingState {
  welcomeModalShown: boolean;
  tourCompleted: boolean;
  tourSkipped: boolean;
  tourStep: number;
  dontShowWelcomeAgain: boolean;
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  isLoading: boolean;
  showWelcomeModal: () => boolean;
  hideWelcomeModal: (dontShowAgain: boolean) => Promise<void>;
  startTour: () => Promise<void>;
  skipTour: () => Promise<void>;
  completeTour: () => Promise<void>;
  setTourStep: (step: number) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  isTourActive: boolean;
  currentTourStep: number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const DEFAULT_STATE: OnboardingState = {
  welcomeModalShown: false,
  tourCompleted: false,
  tourSkipped: false,
  tourStep: 0,
  dontShowWelcomeAgain: false,
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isTourActive, setIsTourActive] = useState(false);

  // Load onboarding state from user preferences
  useEffect(() => {
    if (isAuthenticated && user) {
      loadOnboardingState();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadOnboardingState = async () => {
    try {
      const currentUser = await apiClient.getCurrentUser();
      const preferences = currentUser.preferences || {};
      const onboarding = preferences.onboarding || {};

      setOnboardingState({
        welcomeModalShown: onboarding.welcomeModalShown || false,
        tourCompleted: onboarding.tourCompleted || false,
        tourSkipped: onboarding.tourSkipped || false,
        tourStep: onboarding.tourStep || 0,
        dontShowWelcomeAgain: onboarding.dontShowWelcomeAgain || false,
      });
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
      setOnboardingState(DEFAULT_STATE);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOnboardingState = async (updates: Partial<OnboardingState>) => {
    const newState = { ...onboardingState, ...updates };
    setOnboardingState(newState);

    try {
      await apiClient.patch('/users/me', {
        preferences: {
          onboarding: newState,
        },
      });
    } catch (error) {
      console.error('Failed to update onboarding state:', error);
    }
  };

  const showWelcomeModal = (): boolean => {
    // Show welcome modal if:
    // 1. User hasn't seen it before
    // 2. User hasn't opted out with "don't show again"
    // 3. Tour isn't already completed
    return (
      !onboardingState.welcomeModalShown &&
      !onboardingState.dontShowWelcomeAgain &&
      !onboardingState.tourCompleted
    );
  };

  const hideWelcomeModal = async (dontShowAgain: boolean) => {
    await updateOnboardingState({
      welcomeModalShown: true,
      dontShowWelcomeAgain: dontShowAgain,
    });
  };

  const startTour = async () => {
    setIsTourActive(true);
    await updateOnboardingState({
      welcomeModalShown: true,
      tourStep: 0,
      tourSkipped: false,
    });
  };

  const skipTour = async () => {
    setIsTourActive(false);
    await updateOnboardingState({
      tourSkipped: true,
      tourStep: 0,
    });
  };

  const completeTour = async () => {
    setIsTourActive(false);
    await updateOnboardingState({
      tourCompleted: true,
      tourStep: 0,
    });
  };

  const setTourStep = async (step: number) => {
    await updateOnboardingState({
      tourStep: step,
    });
  };

  const resetOnboarding = async () => {
    setIsTourActive(false);
    await updateOnboardingState(DEFAULT_STATE);
  };

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        isLoading,
        showWelcomeModal,
        hideWelcomeModal,
        startTour,
        skipTour,
        completeTour,
        setTourStep,
        resetOnboarding,
        isTourActive,
        currentTourStep: onboardingState.tourStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
