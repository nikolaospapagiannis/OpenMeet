'use client';

import * as React from 'react';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
  scrollbarSize?: 'thin' | 'normal' | 'hidden';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      children,
      className = '',
      orientation = 'vertical',
      scrollbarSize = 'thin',
      ...props
    },
    ref
  ) => {
    const scrollbarClasses = {
      thin: 'scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500',
      normal: 'scrollbar scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500',
      hidden: 'scrollbar-none',
    };

    const overflowClasses = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    };

    return (
      <div
        ref={ref}
        className={`relative ${overflowClasses[orientation]} ${scrollbarClasses[scrollbarSize]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className = '', orientation = 'vertical', ...props }, ref) => {
    const orientationClasses = {
      vertical: 'h-full w-2.5 border-l border-l-transparent p-[1px]',
      horizontal: 'h-2.5 flex-col border-t border-t-transparent p-[1px]',
    };

    return (
      <div
        ref={ref}
        className={`flex touch-none select-none transition-colors ${orientationClasses[orientation]} ${className}`}
        {...props}
      />
    );
  }
);

ScrollBar.displayName = 'ScrollBar';

export { ScrollArea, ScrollBar };
