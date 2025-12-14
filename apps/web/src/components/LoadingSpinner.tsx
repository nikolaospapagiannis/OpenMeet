/**
 * Loading Spinner Component
 * Reusable loading spinner for async operations
 */

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function LoadingSpinner({
  size = 'md',
  text,
  className = '',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && <p className="mt-3 text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Inline loading spinner (for buttons, etc.)
 */
export function InlineSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <Loader2
      className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} animate-spin ${className}`}
    />
  );
}

/**
 * Button loading spinner
 */
export function ButtonSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

export default LoadingSpinner;
