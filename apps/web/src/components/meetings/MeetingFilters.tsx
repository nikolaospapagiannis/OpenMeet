/**
 * MeetingFilters Component
 * Comprehensive filter bar for meetings list
 */

import { useState } from 'react';
import { Filter, X, Clock, FileText, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangeFilter } from './DateRangeFilter';
import { ParticipantFilter } from './ParticipantFilter';
import { SavedFilters } from './SavedFilters';
import { UseMeetingFiltersReturn } from '@/hooks/useMeetingFilters';

interface MeetingFiltersProps {
  filterState: UseMeetingFiltersReturn;
  isExpanded: boolean;
  onToggle: () => void;
  resultCount?: number;
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const PLATFORM_OPTIONS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'webex', label: 'Webex' },
  { value: 'other', label: 'Other' },
];

const DURATION_OPTIONS = [
  { value: '<15', label: '< 15 min' },
  { value: '15-30', label: '15-30 min' },
  { value: '30-60', label: '30-60 min' },
  { value: '>60', label: '> 60 min' },
];

export function MeetingFilters({
  filterState,
  isExpanded,
  onToggle,
  resultCount,
}: MeetingFiltersProps) {
  const {
    filters,
    setFilter,
    clearFilters,
    clearFilter,
    activeFilterCount,
    savedFilters,
    saveCurrentFilters,
    applySavedFilter,
    deleteSavedFilter,
    isFilterActive,
  } = filterState;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle Filters Button */}
        <Button
          variant="outline"
          onClick={onToggle}
          className={`border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600 ${
            isExpanded || hasActiveFilters ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-slate-800/30'
          }`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white rounded-full text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Date Range Filter */}
        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(from, to) => {
            setFilter('dateFrom', from);
            setFilter('dateTo', to);
          }}
          onClear={() => {
            clearFilter('dateFrom');
            clearFilter('dateTo');
          }}
        />

        {/* Participant Filter */}
        <ParticipantFilter
          selectedParticipants={filters.participants}
          onChange={(participants) => setFilter('participants', participants)}
          onClear={() => clearFilter('participants')}
        />

        {/* Saved Filters */}
        <SavedFilters
          savedFilters={savedFilters}
          onApply={applySavedFilter}
          onDelete={deleteSavedFilter}
          onSave={saveCurrentFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            <X className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        )}

        {/* Result Count */}
        {resultCount !== undefined && (
          <div className="ml-auto text-sm text-slate-400">
            {resultCount} {resultCount === 1 ? 'meeting' : 'meetings'} found
          </div>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilter('status', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform Filter */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Platform</label>
              <select
                value={filters.platform || ''}
                onChange={(e) => setFilter('platform', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
              >
                <option value="">All platforms</option>
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Filter */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration
              </label>
              <select
                value={filters.duration || ''}
                onChange={(e) => setFilter('duration', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
              >
                <option value="">Any duration</option>
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Sort by</label>
              <div className="flex gap-2">
                <select
                  value={filters.sortBy || 'createdAt'}
                  onChange={(e) => setFilter('sortBy', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                >
                  <option value="createdAt">Created</option>
                  <option value="scheduledStartAt">Start time</option>
                  <option value="title">Title</option>
                  <option value="durationSeconds">Duration</option>
                </select>
                <select
                  value={filters.sortOrder || 'desc'}
                  onChange={(e) => setFilter('sortOrder', e.target.value as 'asc' | 'desc')}
                  className="w-24 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                >
                  <option value="desc">↓ Desc</option>
                  <option value="asc">↑ Asc</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toggle Filters Row */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex flex-wrap gap-3">
              {/* Has Transcript */}
              <label className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.hasTranscript || false}
                  onChange={(e) => setFilter('hasTranscript', e.target.checked || undefined)}
                  className="rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500/20"
                />
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Has Transcript</span>
              </label>

              {/* Has Recording */}
              <label className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.hasRecording || false}
                  onChange={(e) => setFilter('hasRecording', e.target.checked || undefined)}
                  className="rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500/20"
                />
                <VideoIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Has Recording</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <FilterTag
              label={`Status: ${filters.status}`}
              onRemove={() => clearFilter('status')}
            />
          )}
          {filters.platform && (
            <FilterTag
              label={`Platform: ${filters.platform}`}
              onRemove={() => clearFilter('platform')}
            />
          )}
          {filters.duration && (
            <FilterTag
              label={`Duration: ${filters.duration} min`}
              onRemove={() => clearFilter('duration')}
            />
          )}
          {filters.hasTranscript && (
            <FilterTag
              label="Has Transcript"
              onRemove={() => clearFilter('hasTranscript')}
            />
          )}
          {filters.hasRecording && (
            <FilterTag
              label="Has Recording"
              onRemove={() => clearFilter('hasRecording')}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Filter Tag Component
 */
function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-sm text-purple-300">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="text-purple-400 hover:text-purple-200 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
