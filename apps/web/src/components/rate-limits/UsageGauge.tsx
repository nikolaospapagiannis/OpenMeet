/**
 * UsageGauge Component
 * Circular progress indicator for rate limit usage visualization
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface UsageGaugeProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
  colorScheme?: 'default' | 'warning' | 'danger' | 'success';
}

export function UsageGauge({
  label,
  current,
  limit,
  unit = '',
  size = 'md',
  showPercentage = true,
  className,
  colorScheme = 'default',
}: UsageGaugeProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isOverLimit = current > limit;

  // Determine color based on usage percentage
  const getColor = () => {
    if (colorScheme !== 'default') {
      const colors = {
        warning: 'text-amber-400',
        danger: 'text-rose-400',
        success: 'text-emerald-400',
      };
      return colors[colorScheme as keyof typeof colors];
    }

    if (isOverLimit) return 'text-rose-500';
    if (percentage >= 90) return 'text-rose-400';
    if (percentage >= 75) return 'text-amber-400';
    if (percentage >= 50) return 'text-cyan-400';
    return 'text-teal-400';
  };

  const getStrokeColor = () => {
    if (colorScheme !== 'default') {
      const colors = {
        warning: 'stroke-amber-400',
        danger: 'stroke-rose-400',
        success: 'stroke-emerald-400',
      };
      return colors[colorScheme as keyof typeof colors];
    }

    if (isOverLimit) return 'stroke-rose-500';
    if (percentage >= 90) return 'stroke-rose-400';
    if (percentage >= 75) return 'stroke-amber-400';
    if (percentage >= 50) return 'stroke-cyan-400';
    return 'stroke-teal-400';
  };

  const sizes = {
    sm: { width: 80, height: 80, strokeWidth: 6, fontSize: 'text-xs' },
    md: { width: 120, height: 120, strokeWidth: 8, fontSize: 'text-sm' },
    lg: { width: 160, height: 160, strokeWidth: 10, fontSize: 'text-base' },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (Math.min(width, height) - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative">
        <svg
          width={width}
          height={height}
          className="transform -rotate-90"
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-800"
          />

          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className={cn('transition-all duration-500', getStrokeColor())}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage ? (
            <>
              <span className={cn('font-bold', fontSize, getColor())}>
                {isOverLimit ? '100+' : percentage.toFixed(0)}%
              </span>
              <span className={cn('text-slate-500', fontSize === 'text-xs' ? 'text-[10px]' : 'text-xs')}>
                {formatValue(current)}/{formatValue(limit)}
              </span>
            </>
          ) : (
            <>
              <span className={cn('font-bold', fontSize, getColor())}>
                {formatValue(current)}
              </span>
              <span className={cn('text-slate-500', fontSize === 'text-xs' ? 'text-[10px]' : 'text-xs')}>
                of {formatValue(limit)}
              </span>
            </>
          )}
          {unit && (
            <span className={cn('text-slate-600', fontSize === 'text-xs' ? 'text-[10px]' : 'text-xs')}>
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="mt-3 text-center">
        <p className={cn('font-medium text-white', fontSize)}>
          {label}
        </p>
        {isOverLimit && (
          <p className="text-xs text-rose-400 mt-1">Over limit!</p>
        )}
      </div>
    </div>
  );
}