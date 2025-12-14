/**
 * Loading Page Component
 * Full page loading state
 */

'use client';

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingPageProps {
  text?: string;
  showLogo?: boolean;
}

export function LoadingPage({ text = 'Loading...', showLogo = true }: LoadingPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {showLogo && (
        <div className="mb-8">
          {/* Replace with your actual logo */}
          <div className="text-3xl font-bold text-primary">OpenMeet</div>
        </div>
      )}
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export default LoadingPage;
