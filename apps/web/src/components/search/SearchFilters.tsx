'use client';

import React, { useState } from 'react';
import { Calendar, Filter, Video, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

export interface FilterState {
  type?: 'all' | 'meeting' | 'transcript' | 'participant' | 'topic';
  dateRange?: 'week' | 'month' | 'year' | 'all';
  platform?: 'zoom' | 'teams' | 'meet' | 'all';
}

export function SearchFilters({ onFilterChange, className }: SearchFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    type: 'all',
    dateRange: 'all',
    platform: 'all',
  });

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const hasActiveFilters = () => {
    return (
      activeFilters.type !== 'all' ||
      activeFilters.dateRange !== 'all' ||
      activeFilters.platform !== 'all'
    );
  };

  const clearAllFilters = () => {
    const defaultFilters: FilterState = {
      type: 'all',
      dateRange: 'all',
      platform: 'all',
    };
    setActiveFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        {hasActiveFilters() && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Type Filters */}
      <div>
        <label className="text-xs text-slate-500 mb-2 block">Type</label>
        <div className="flex flex-wrap gap-2">
          {(['all', 'meeting', 'transcript', 'participant', 'topic'] as const).map((type) => (
            <Badge
              key={type}
              onClick={() => updateFilter('type', type)}
              className={cn(
                'cursor-pointer transition-all duration-200 capitalize',
                activeFilters.type === type
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700 hover:text-white'
              )}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Date Range Filters */}
      <div>
        <label className="text-xs text-slate-500 mb-2 block flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Date Range
        </label>
        <div className="flex flex-wrap gap-2">
          {(['all', 'week', 'month', 'year'] as const).map((range) => (
            <Badge
              key={range}
              onClick={() => updateFilter('dateRange', range)}
              className={cn(
                'cursor-pointer transition-all duration-200 capitalize',
                activeFilters.dateRange === range
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700 hover:text-white'
              )}
            >
              {range === 'all' ? 'All Time' : `This ${range}`}
            </Badge>
          ))}
        </div>
      </div>

      {/* Platform Filters */}
      <div>
        <label className="text-xs text-slate-500 mb-2 block flex items-center gap-1">
          <Video className="w-3 h-3" />
          Platform
        </label>
        <div className="flex flex-wrap gap-2">
          {(['all', 'zoom', 'teams', 'meet'] as const).map((platform) => (
            <Badge
              key={platform}
              onClick={() => updateFilter('platform', platform)}
              className={cn(
                'cursor-pointer transition-all duration-200 capitalize',
                activeFilters.platform === platform
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700 hover:text-white'
              )}
            >
              {platform === 'all' ? 'All Platforms' : platform === 'meet' ? 'Google Meet' : platform}
            </Badge>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Active:</span>
            {activeFilters.type !== 'all' && (
              <Badge
                className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs flex items-center gap-1 cursor-pointer hover:bg-teal-500/10"
                onClick={() => updateFilter('type', 'all')}
              >
                Type: {activeFilters.type}
                <X className="w-3 h-3" />
              </Badge>
            )}
            {activeFilters.dateRange !== 'all' && (
              <Badge
                className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs flex items-center gap-1 cursor-pointer hover:bg-purple-500/10"
                onClick={() => updateFilter('dateRange', 'all')}
              >
                {activeFilters.dateRange === 'week' && 'This Week'}
                {activeFilters.dateRange === 'month' && 'This Month'}
                {activeFilters.dateRange === 'year' && 'This Year'}
                <X className="w-3 h-3" />
              </Badge>
            )}
            {activeFilters.platform !== 'all' && (
              <Badge
                className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs flex items-center gap-1 cursor-pointer hover:bg-blue-500/10"
                onClick={() => updateFilter('platform', 'all')}
              >
                {activeFilters.platform === 'meet' ? 'Google Meet' : activeFilters.platform}
                <X className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
