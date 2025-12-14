'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSearchContext, SearchResult } from '@/contexts/SearchContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface SearchFilters {
  type?: 'all' | 'meeting' | 'transcript' | 'participant' | 'topic';
  dateRange?: 'week' | 'month' | 'year' | 'all';
  platform?: 'zoom' | 'teams' | 'meet' | 'all';
}

export function useGlobalSearch() {
  const router = useRouter();
  const {
    isOpen,
    query,
    results,
    isSearching,
    recentSearches,
    openSearch,
    closeSearch,
    setQuery,
    setResults,
    setIsSearching,
    addRecentSearch,
    clearRecentSearches,
  } = useSearchContext();

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string, filters: SearchFilters = {}) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }

      // Create new abort controller
      abortController.current = new AbortController();

      try {
        setIsSearching(true);

        // Build query params
        const params: any = {
          query: searchQuery,
          limit: 50,
        };

        // Add date range filter
        if (filters.dateRange && filters.dateRange !== 'all') {
          const now = new Date();
          if (filters.dateRange === 'week') {
            params.startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
          } else if (filters.dateRange === 'month') {
            params.startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
          } else if (filters.dateRange === 'year') {
            params.startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
          }
        }

        // Call the intelligence search endpoint
        const response = await api.post(
          '/intelligence/search',
          params,
          { signal: abortController.current.signal }
        );

        if (response.data) {
          // Transform API results to SearchResult format
          const transformedResults: SearchResult[] = [];

          // Process transcript results
          if (response.data.transcripts) {
            response.data.transcripts.forEach((t: any) => {
              transformedResults.push({
                type: 'transcript',
                id: t.transcriptId || t.meetingId,
                title: t.meetingTitle || `Transcript at ${formatTime(t.startTime)}`,
                description: t.text || '',
                url: `/meetings/${t.meetingId}?t=${t.startTime}`,
                timestamp: t.createdAt ? new Date(t.createdAt) : undefined,
                highlights: t.highlights || [],
                metadata: {
                  speaker: t.speaker,
                  meetingTitle: t.meetingTitle,
                  startTime: t.startTime,
                  endTime: t.endTime,
                },
              });
            });
          }

          // Process meeting results
          if (response.data.meetings) {
            response.data.meetings.forEach((m: any) => {
              transformedResults.push({
                type: 'meeting',
                id: m.meetingId || m.id,
                title: m.title,
                description: m.description || m.summary || '',
                url: `/meetings/${m.meetingId || m.id}`,
                timestamp: m.scheduledAt ? new Date(m.scheduledAt) : undefined,
                highlights: [
                  ...(m.highlights?.title || []),
                  ...(m.highlights?.description || []),
                ],
                metadata: {
                  platform: m.platform,
                  participantCount: m.participantCount,
                },
              });
            });
          }

          // Apply type filter if specified
          let filteredResults = transformedResults;
          if (filters.type && filters.type !== 'all') {
            filteredResults = transformedResults.filter((r) => r.type === filters.type);
          }

          // Apply platform filter if specified
          if (filters.platform && filters.platform !== 'all') {
            filteredResults = filteredResults.filter(
              (r) => r.metadata?.platform?.toLowerCase() === filters.platform
            );
          }

          setResults(filteredResults);
        }
      } catch (error: any) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          // Request was cancelled, ignore
          return;
        }
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [setResults, setIsSearching]
  );

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim()) {
      debounceTimer.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, performSearch, setResults]);

  // Navigate to result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      addRecentSearch(query);
      closeSearch();
      router.push(result.url);
    },
    [query, addRecentSearch, closeSearch, router]
  );

  // Search with filters
  const searchWithFilters = useCallback(
    (filters: SearchFilters) => {
      if (query.trim()) {
        performSearch(query, filters);
      }
    },
    [query, performSearch]
  );

  // Use recent search
  const useRecentSearch = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
      performSearch(recentQuery);
    },
    [setQuery, performSearch]
  );

  return {
    isOpen,
    query,
    results,
    isSearching,
    recentSearches,
    openSearch,
    closeSearch,
    setQuery,
    navigateToResult,
    searchWithFilters,
    useRecentSearch,
    clearRecentSearches,
  };
}

// Helper function to format time in seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
