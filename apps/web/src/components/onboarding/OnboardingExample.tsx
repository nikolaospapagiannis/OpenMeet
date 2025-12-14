/**
 * Example Integration: How to use the Onboarding System
 *
 * This file demonstrates how to integrate the welcome modal and feature tour
 * into your dashboard or any other page.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { WelcomeModal, FeatureTour, dashboardTourSteps } from '@/components/onboarding';
import { Button } from '@/components/ui/button-v2';
import { Compass } from 'lucide-react';

/**
 * STEP 1: Wrap your app with OnboardingProvider
 *
 * In your layout.tsx or root component:
 *
 * import { OnboardingProvider } from '@/contexts/OnboardingContext';
 *
 * <AuthProvider>
 *   <OnboardingProvider>
 *     <YourApp />
 *   </OnboardingProvider>
 * </AuthProvider>
 */

/**
 * STEP 2: Use the OnboardingWrapper in your dashboard
 *
 * This component handles showing the welcome modal and tour automatically
 */
export function OnboardingWrapper() {
  const { showWelcomeModal, startTour, resetOnboarding } = useOnboarding();
  const [showModal, setShowModal] = useState(false);

  // Check if welcome modal should be shown on mount
  useEffect(() => {
    if (showWelcomeModal()) {
      setShowModal(true);
    }
  }, [showWelcomeModal]);

  const handleStartTour = () => {
    setShowModal(false);
    startTour();
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Welcome Modal */}
      <WelcomeModal
        open={showModal}
        onClose={handleCloseModal}
        onStartTour={handleStartTour}
      />

      {/* Feature Tour */}
      <FeatureTour steps={dashboardTourSteps} />

      {/* Optional: Button to restart tour (e.g., in settings) */}
      <Button
        variant="ghost-glass"
        size="sm"
        onClick={() => {
          resetOnboarding();
          setShowModal(true);
        }}
        className="hidden" // Show this in settings page
      >
        <Compass className="w-4 h-4 mr-2" />
        Restart Tour
      </Button>
    </>
  );
}

/**
 * STEP 3: Add data-tour attributes to your dashboard elements
 *
 * Example Dashboard Component:
 */
export function ExampleDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Add OnboardingWrapper */}
      <OnboardingWrapper />

      {/* Dashboard Overview - Tour Step 1 */}
      <div
        data-tour="dashboard-overview"
        className="mb-6 p-6 bg-slate-900 rounded-xl border border-slate-700"
      >
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Welcome to your meeting intelligence hub</p>
      </div>

      {/* Upload Meeting Button - Tour Step 2 */}
      <Button
        data-tour="upload-meeting"
        variant="gradient-primary"
        size="lg"
      >
        Upload Meeting
      </Button>

      <div className="grid grid-cols-12 gap-6 mt-6">
        {/* Meetings List - Tour Step 3 */}
        <div
          data-tour="meetings-list"
          className="col-span-8 bg-slate-900 rounded-xl border border-slate-700 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Recent Meetings</h2>
          {/* Meeting items here */}
        </div>

        {/* AI Assistant - Tour Step 4 */}
        <div
          data-tour="ai-assistant"
          className="col-span-4 bg-slate-900 rounded-xl border border-slate-700 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">AI Assistant</h2>
          {/* Assistant UI here */}
        </div>
      </div>

      {/* Settings - Tour Step 5 */}
      <div
        data-tour="settings"
        className="fixed bottom-6 right-6"
      >
        <Button variant="ghost-glass" size="icon">
          {/* Settings icon */}
        </Button>
      </div>
    </div>
  );
}

/**
 * STEP 4: Custom Tour Steps (Optional)
 *
 * You can create custom tour steps for different pages:
 */
export const customTourSteps = [
  {
    selector: '[data-tour="custom-element"]',
    title: 'Custom Feature',
    description: 'Description of this feature',
    position: 'bottom' as const,
  },
  // Add more steps...
];

/**
 * STEP 5: Programmatically control the tour
 *
 * Use the useOnboarding hook anywhere in your app:
 *
 * const { startTour, skipTour, completeTour, resetOnboarding } = useOnboarding();
 *
 * // Start the tour manually
 * startTour();
 *
 * // Skip the tour
 * skipTour();
 *
 * // Complete the tour
 * completeTour();
 *
 * // Reset onboarding (e.g., for testing or settings)
 * resetOnboarding();
 */

/**
 * STYLING NOTES:
 *
 * The tour automatically applies these classes to highlighted elements:
 * - .tour-highlight: Added to elements during tour
 * - [data-tour-active="true"]: Attribute for z-index management
 *
 * You can customize the spotlight appearance by adjusting:
 * - highlightPadding: Extra space around the element (default: 4px)
 * - Border color: Change border-teal-500 in FeatureTour.tsx
 * - Shadow: Adjust shadow-[0_0_20px_rgba(20,184,166,0.5)]
 */

/**
 * ACCESSIBILITY:
 *
 * - ESC key closes both modal and tour
 * - Keyboard navigation for tour steps
 * - Focus management for modal
 * - ARIA labels on all interactive elements
 * - Screen reader friendly descriptions
 */

/**
 * USER PREFERENCES:
 *
 * All onboarding state is persisted to the database via:
 * PATCH /api/users/me with { preferences: { onboarding: {...} } }
 *
 * Stored preferences:
 * - welcomeModalShown: boolean
 * - tourCompleted: boolean
 * - tourSkipped: boolean
 * - tourStep: number (current step)
 * - dontShowWelcomeAgain: boolean
 */
