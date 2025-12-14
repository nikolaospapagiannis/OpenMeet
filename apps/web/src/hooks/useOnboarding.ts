import { useState, useEffect } from 'react';
import axios from 'axios';

export interface OnboardingData {
  role?: string;
  teamSize?: string;
  goals?: string[];
  interestedIntegrations?: string[];
  onboardingCompleted?: boolean;
}

export interface OnboardingState {
  data: OnboardingData;
  isLoading: boolean;
  error: string | null;
  currentStep: number;
  totalSteps: number;
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    data: {},
    isLoading: false,
    error: null,
    currentStep: 1,
    totalSteps: 4,
  });

  // Load onboarding data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('onboarding_progress');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState((prev) => ({
          ...prev,
          data: parsed.data || {},
          currentStep: parsed.currentStep || 1,
        }));
      } catch (error) {
        console.error('Failed to parse onboarding progress:', error);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  const saveToLocalStorage = (data: OnboardingData, step: number) => {
    localStorage.setItem(
      'onboarding_progress',
      JSON.stringify({ data, currentStep: step })
    );
  };

  // Update onboarding data
  const updateData = (updates: Partial<OnboardingData>) => {
    setState((prev) => {
      const newData = { ...prev.data, ...updates };
      saveToLocalStorage(newData, prev.currentStep);
      return {
        ...prev,
        data: newData,
      };
    });
  };

  // Go to next step
  const nextStep = () => {
    setState((prev) => {
      const newStep = Math.min(prev.currentStep + 1, prev.totalSteps);
      saveToLocalStorage(prev.data, newStep);
      return {
        ...prev,
        currentStep: newStep,
      };
    });
  };

  // Go to previous step
  const previousStep = () => {
    setState((prev) => {
      const newStep = Math.max(prev.currentStep - 1, 1);
      saveToLocalStorage(prev.data, newStep);
      return {
        ...prev,
        currentStep: newStep,
      };
    });
  };

  // Go to specific step
  const goToStep = (step: number) => {
    setState((prev) => {
      const newStep = Math.max(1, Math.min(step, prev.totalSteps));
      saveToLocalStorage(prev.data, newStep);
      return {
        ...prev,
        currentStep: newStep,
      };
    });
  };

  // Save to API and complete onboarding
  const completeOnboarding = async (skipToEnd = false) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const dataToSave = skipToEnd
        ? { onboardingCompleted: true }
        : { ...state.data, onboardingCompleted: true };

      // Save to API
      await axios.patch(
        '/api/users/me',
        {
          preferences: dataToSave,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Clear localStorage
      localStorage.removeItem('onboarding_progress');

      setState((prev) => ({
        ...prev,
        data: dataToSave,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 'Failed to save onboarding data';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return false;
    }
  };

  // Check if onboarding is completed
  const isOnboardingCompleted = async () => {
    try {
      const response = await axios.get('/api/users/me');
      const preferences = response.data.preferences as OnboardingData;
      return preferences?.onboardingCompleted === true;
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  };

  // Calculate progress percentage
  const progressPercentage = (state.currentStep / state.totalSteps) * 100;

  return {
    ...state,
    progressPercentage,
    updateData,
    nextStep,
    previousStep,
    goToStep,
    completeOnboarding,
    isOnboardingCompleted,
  };
}
