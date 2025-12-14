# Onboarding System

A comprehensive onboarding system with a welcome modal and interactive feature tour for OpenMeet.

## Features

- **Welcome Modal**: Personalized greeting with feature overview slides
- **Interactive Tour**: Tooltip-based tour with spotlight effect highlighting UI elements
- **User Preferences**: Persistent state tracking via database
- **Non-intrusive Design**: Skip anytime, restart from settings
- **Mobile-friendly**: Responsive design for all screen sizes
- **Keyboard Accessible**: ESC to close, keyboard navigation
- **Spotlight Effect**: Smooth animations and visual focus on tour elements

## Components

### 1. OnboardingContext

Context provider that manages onboarding state and persistence.

```tsx
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';

// Wrap your app
<OnboardingProvider>
  <YourApp />
</OnboardingProvider>

// Use in components
const {
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
  currentTourStep,
} = useOnboarding();
```

**Persisted State:**
- `welcomeModalShown`: Whether the welcome modal has been displayed
- `tourCompleted`: Whether the user completed the tour
- `tourSkipped`: Whether the user skipped the tour
- `tourStep`: Current step in the tour (0-indexed)
- `dontShowWelcomeAgain`: User opted out of seeing welcome modal

### 2. WelcomeModal

Multi-slide welcome modal with personalized greeting.

```tsx
import { WelcomeModal } from '@/components/onboarding';

<WelcomeModal
  open={showModal}
  onClose={handleCloseModal}
  onStartTour={handleStartTour}
/>
```

**Props:**
- `open`: boolean - Controls modal visibility
- `onClose`: () => void - Called when modal is closed
- `onStartTour`: () => void - Called when "Take the Tour" is clicked

**Features:**
- 4 slides with icons and descriptions
- Progress dots navigation
- "Don't show again" checkbox
- Personalized greeting using user's first name
- Skip or take tour options

### 3. FeatureTour

Interactive tour with spotlight effect and tooltips.

```tsx
import { FeatureTour, dashboardTourSteps } from '@/components/onboarding';

<FeatureTour steps={dashboardTourSteps} />
```

**Props:**
- `steps`: TourStep[] - Array of tour steps (see below)

**Features:**
- Spotlight effect with SVG mask
- Animated border and glow on highlighted elements
- Auto-scrolls to elements
- Waits for elements to appear in DOM
- Handles dynamic content

### 4. TourTooltip

Positioned tooltip that appears next to highlighted elements.

```tsx
import { TourTooltip } from '@/components/onboarding';

<TourTooltip
  targetRect={elementRect}
  position="bottom"
  title="Step Title"
  description="Step description"
  currentStep={1}
  totalSteps={5}
  onNext={handleNext}
  onPrevious={handlePrevious}
  onSkip={handleSkip}
  onClose={handleClose}
/>
```

**Props:**
- `targetRect`: DOMRect | null - Position of the target element
- `position`: 'top' | 'right' | 'bottom' | 'left' - Tooltip position
- `title`: string - Step title
- `description`: string - Step description
- `currentStep`: number - Current step (1-indexed)
- `totalSteps`: number - Total number of steps
- `onNext`: () => void - Next button handler
- `onPrevious`: () => void - Previous button handler
- `onSkip`: () => void - Skip tour handler
- `onClose`: () => void - Close tour handler
- `showPrevious`: boolean - Show previous button (optional)
- `showNext`: boolean - Show next button (optional)
- `nextLabel`: string - Custom label for next button (optional)

### 5. useFeatureTour Hook

Custom hook that manages tour state and element tracking.

```tsx
import { useFeatureTour, TourStep } from '@/hooks/useFeatureTour';

const steps: TourStep[] = [
  {
    selector: '[data-tour="dashboard"]',
    title: 'Dashboard',
    description: 'Your main dashboard',
    position: 'bottom',
  },
];

const {
  isActive,
  currentStep,
  totalSteps,
  targetElement,
  targetRect,
  isWaitingForElement,
  currentStepData,
  nextStep,
  previousStep,
  skipTour,
  closeTour,
} = useFeatureTour(steps);
```

**TourStep Interface:**
```typescript
interface TourStep {
  selector: string;                    // CSS selector for target element
  title: string;                       // Step title
  description: string;                 // Step description
  position?: 'top' | 'right' | 'bottom' | 'left';
  beforeStep?: () => void | Promise<void>;  // Execute before showing step
  afterStep?: () => void | Promise<void>;   // Execute after leaving step
  waitForElement?: boolean;            // Wait for element in DOM (default: true)
  highlightPadding?: number;           // Extra padding around highlight (default: 4)
}
```

## Integration Guide

### Step 1: Add OnboardingProvider

Wrap your app with the `OnboardingProvider` in your root layout:

```tsx
// app/layout.tsx
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <OnboardingProvider>
            {children}
          </OnboardingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Step 2: Add Tour Markers to Your UI

Add `data-tour` attributes to elements you want to highlight:

```tsx
// Dashboard component
<div data-tour="dashboard-overview" className="...">
  Dashboard Overview
</div>

<button data-tour="upload-meeting" className="...">
  Upload Meeting
</button>

<div data-tour="meetings-list" className="...">
  Meetings List
</div>
```

### Step 3: Create Tour Steps

Define your tour steps:

```tsx
// tourSteps.ts
import { TourStep } from '@/hooks/useFeatureTour';

export const dashboardTourSteps: TourStep[] = [
  {
    selector: '[data-tour="dashboard-overview"]',
    title: 'Your Dashboard',
    description: 'This is your main dashboard...',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    selector: '[data-tour="upload-meeting"]',
    title: 'Upload Meetings',
    description: 'Click here to upload...',
    position: 'bottom',
  },
  // ... more steps
];
```

### Step 4: Add Onboarding to Dashboard

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { WelcomeModal, FeatureTour } from '@/components/onboarding';
import { dashboardTourSteps } from './tourSteps';

export default function Dashboard() {
  const { showWelcomeModal, startTour } = useOnboarding();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (showWelcomeModal()) {
      setShowModal(true);
    }
  }, [showWelcomeModal]);

  const handleStartTour = () => {
    setShowModal(false);
    startTour();
  };

  return (
    <>
      <WelcomeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onStartTour={handleStartTour}
      />
      <FeatureTour steps={dashboardTourSteps} />

      {/* Your dashboard content */}
      <div data-tour="dashboard-overview">
        Dashboard
      </div>
    </>
  );
}
```

### Step 5: Add Restart Tour Button (Settings)

```tsx
// Settings page
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button-v2';
import { Compass } from 'lucide-react';

export default function Settings() {
  const { resetOnboarding, startTour } = useOnboarding();

  const handleRestartTour = async () => {
    await resetOnboarding();
    startTour();
  };

  return (
    <div>
      <Button onClick={handleRestartTour}>
        <Compass className="w-4 h-4 mr-2" />
        Restart Tour
      </Button>
    </div>
  );
}
```

## Advanced Usage

### Dynamic Content

The tour automatically waits for elements to appear in the DOM:

```tsx
{
  selector: '[data-tour="dynamic-element"]',
  title: 'Dynamic Content',
  description: 'This element loads after navigation',
  waitForElement: true, // Default: true
  beforeStep: async () => {
    // Navigate or load data before showing this step
    router.push('/meetings');
  },
}
```

### Custom Positioning

Adjust tooltip position and highlight padding:

```tsx
{
  selector: '[data-tour="element"]',
  title: 'Custom Position',
  description: 'Tooltip positioned on the left',
  position: 'left', // 'top' | 'right' | 'bottom' | 'left'
  highlightPadding: 12, // Extra padding around highlight
}
```

### Before/After Callbacks

Execute code before or after each step:

```tsx
{
  selector: '[data-tour="sidebar"]',
  title: 'Sidebar',
  description: 'Open the sidebar',
  beforeStep: () => {
    // Open sidebar before showing this step
    setSidebarOpen(true);
  },
  afterStep: () => {
    // Close sidebar after this step
    setSidebarOpen(false);
  },
}
```

## Database Schema

The onboarding state is stored in the `users` table `preferences` JSON field:

```json
{
  "preferences": {
    "onboarding": {
      "welcomeModalShown": true,
      "tourCompleted": false,
      "tourSkipped": false,
      "tourStep": 2,
      "dontShowWelcomeAgain": false
    }
  }
}
```

## API Endpoints

### Get User Preferences

```
GET /api/users/me
```

Returns user data including preferences.

### Update User Preferences

```
PATCH /api/users/me
Content-Type: application/json

{
  "preferences": {
    "onboarding": {
      "tourCompleted": true
    }
  }
}
```

Preferences are merged with existing preferences.

## Styling

### Custom Spotlight Colors

Edit `FeatureTour.tsx`:

```tsx
// Change border color
className="border-2 border-teal-500 rounded-lg"
// to
className="border-2 border-purple-500 rounded-lg"

// Change glow
shadow-[0_0_20px_rgba(20,184,166,0.5)]
// to
shadow-[0_0_20px_rgba(168,85,247,0.5)]
```

### Custom Tooltip Styles

Edit `TourTooltip.tsx`:

```tsx
className="bg-slate-900 border border-teal-500/50"
// Customize background and border colors
```

## Accessibility

- **Keyboard Navigation**: ESC closes modal and tour
- **ARIA Labels**: All interactive elements have labels
- **Focus Management**: Modal traps focus, tour preserves focus
- **Screen Reader**: Descriptive text for all actions
- **High Contrast**: Border highlights visible on all backgrounds

## Mobile Support

- Responsive tooltip positioning
- Touch-friendly button sizes
- Adjusted padding for smaller screens
- Viewport-aware positioning (keeps tooltips on screen)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

## Troubleshooting

### Tour doesn't start
- Ensure `OnboardingProvider` wraps your app
- Check that `data-tour` attributes match your selectors
- Verify elements are visible when tour starts

### Elements not highlighted
- Confirm `data-tour` attribute is on the correct element
- Check if element is hidden or not in viewport
- Try increasing `highlightPadding` for better visibility

### Preferences not saving
- Check network tab for API errors
- Verify authentication is working
- Ensure database has `preferences` JSON column

### Tooltip positioning issues
- Try different `position` values
- Increase margin in `TourTooltip.tsx`
- Check for parent elements with `overflow: hidden`

## Files Created

```
apps/web/src/
├── contexts/
│   └── OnboardingContext.tsx          # State management and persistence
├── components/
│   ├── ui/
│   │   └── dialog.tsx                 # Reusable dialog component
│   └── onboarding/
│       ├── index.ts                   # Barrel exports
│       ├── WelcomeModal.tsx          # Welcome modal with slides
│       ├── FeatureTour.tsx           # Tour with spotlight effect
│       ├── TourTooltip.tsx           # Positioned tooltip component
│       ├── OnboardingExample.tsx      # Integration examples
│       └── README.md                  # This file
└── hooks/
    └── useFeatureTour.ts             # Tour state management hook
```

## License

Part of the OpenMeet project.
