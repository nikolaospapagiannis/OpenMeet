/**
 * useMeetingFilters Hook
 * Manages meeting filter state with URL sync and persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface MeetingFilters {
  search?: string;
  status?: string;
  platform?: string;
  dateFrom?: string;
  dateTo?: string;
  hasTranscript?: boolean;
  hasRecording?: boolean;
  participants?: string[];
  duration?: string; // <15, 15-30, 30-60, >60
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: MeetingFilters;
  createdAt: string;
}

export interface UseMeetingFiltersReturn {
  filters: MeetingFilters;
  setFilter: (key: keyof MeetingFilters, value: any) => void;
  setFilters: (filters: MeetingFilters) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof MeetingFilters) => void;
  activeFilterCount: number;
  savedFilters: SavedFilter[];
  saveCurrentFilters: (name: string) => void;
  applySavedFilter: (filterId: string) => void;
  deleteSavedFilter: (filterId: string) => void;
  isFilterActive: (key: keyof MeetingFilters) => boolean;
}

const SAVED_FILTERS_KEY = 'openmeet_saved_meeting_filters';
const LAST_FILTERS_KEY = 'openmeet_last_meeting_filters';

/**
 * Custom hook for managing meeting filters with URL sync and persistence
 */
export function useMeetingFilters(): UseMeetingFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL or localStorage
  const [filters, setFiltersState] = useState<MeetingFilters>(() => {
    if (typeof window === 'undefined') return {};

    // First check URL params
    const urlFilters: MeetingFilters = {};
    searchParams.forEach((value, key) => {
      if (key === 'hasTranscript' || key === 'hasRecording') {
        urlFilters[key] = value === 'true';
      } else if (key === 'participants') {
        urlFilters[key] = value.split(',');
      } else {
        urlFilters[key as keyof MeetingFilters] = value as any;
      }
    });

    // If URL has filters, use them
    if (Object.keys(urlFilters).length > 0) {
      return urlFilters;
    }

    // Otherwise, try to restore last filters
    try {
      const saved = localStorage.getItem(LAST_FILTERS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(SAVED_FILTERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync filters to URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else {
          params.set(key, String(value));
        }
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Only update if URL changed
    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }

    // Save to localStorage
    try {
      localStorage.setItem(LAST_FILTERS_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, [filters, pathname, router]);

  // Set a single filter
  const setFilter = useCallback((key: keyof MeetingFilters, value: any) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: MeetingFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  // Clear a single filter
  const clearFilter = useCallback((key: keyof MeetingFilters) => {
    setFiltersState((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Check if a filter is active
  const isFilterActive = useCallback(
    (key: keyof MeetingFilters) => {
      const value = filters[key];
      return value !== undefined && value !== null && value !== '';
    },
    [filters]
  );

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    // Don't count search, sortBy, sortOrder as "active filters" for the badge
    if (key === 'search' || key === 'sortBy' || key === 'sortOrder') return false;
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  // Save current filters as a preset
  const saveCurrentFilters = useCallback(
    (name: string) => {
      const newFilter: SavedFilter = {
        id: `filter_${Date.now()}`,
        name,
        filters: { ...filters },
        createdAt: new Date().toISOString(),
      };

      const updated = [...savedFilters, newFilter];
      setSavedFilters(updated);

      try {
        localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save filter preset:', error);
      }
    },
    [filters, savedFilters]
  );

  // Apply a saved filter
  const applySavedFilter = useCallback(
    (filterId: string) => {
      const savedFilter = savedFilters.find((f) => f.id === filterId);
      if (savedFilter) {
        setFiltersState(savedFilter.filters);
      }
    },
    [savedFilters]
  );

  // Delete a saved filter
  const deleteSavedFilter = useCallback(
    (filterId: string) => {
      const updated = savedFilters.filter((f) => f.id !== filterId);
      setSavedFilters(updated);

      try {
        localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to delete filter preset:', error);
      }
    },
    [savedFilters]
  );

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    activeFilterCount,
    savedFilters,
    saveCurrentFilters,
    applySavedFilter,
    deleteSavedFilter,
    isFilterActive,
  };
}
