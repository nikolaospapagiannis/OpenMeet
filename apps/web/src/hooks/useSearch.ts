'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface SearchResult {
  id: string;
  type: 'meeting' | 'transcript' | 'action_item';
  title: string;
  description: string;
  url: string;
  timestamp: Date;
  highlight?: string;
}

interface UseSearchReturn {
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  search: (query: string, filters: string[]) => Promise<void>;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const search = useCallback(async (query: string, filters: string[]) => {
    if (!query.trim() && filters.length === 0) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      // Build query params from filters
      const params = new URLSearchParams();
      if (query) params.set('q', query);

      // Map filter names to API params
      filters.forEach(filter => {
        switch (filter) {
          case 'This Week':
            params.set('dateRange', 'week');
            break;
          case 'Last Month':
            params.set('dateRange', 'month');
            break;
          case 'This Year':
            params.set('dateRange', 'year');
            break;
          case 'Zoom Only':
            params.set('platform', 'zoom');
            break;
          case 'Teams Only':
            params.set('platform', 'teams');
            break;
          case 'Google Meet':
            params.set('platform', 'meet');
            break;
          case 'Transcribed':
            params.set('status', 'transcribed');
            break;
          case 'Not Transcribed':
            params.set('status', 'pending');
            break;
          case 'Analyzed':
            params.set('analyzed', 'true');
            break;
          case 'Pending':
            params.set('analyzed', 'false');
            break;
        }
      });

      const response = await api.get(`/meetings/search?${params.toString()}`);

      if (response.data?.results) {
        setResults(
          response.data.results.map((r: any) => ({
            id: r.id,
            type: r.type || 'meeting',
            title: r.title,
            description: r.description || r.summary || '',
            url: `/meetings/${r.id}`,
            timestamp: new Date(r.scheduledAt || r.createdAt),
            highlight: r.highlight,
          }))
        );
      } else {
        setResults([]);
      }

      // If search is performed, navigate to meetings page with search params
      if (query) {
        router.push(`/meetings?${params.toString()}`);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [router]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
}

export default useSearch;
