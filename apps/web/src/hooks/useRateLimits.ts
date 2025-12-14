/**
 * useRateLimits Hook
 * Hook for managing rate limits data and state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface RateLimitData {
  apiCalls: {
    current: number;
    limit: number;
    resetAt: Date;
  };
  storage: {
    current: number; // in MB
    limit: number; // in MB
  };
  transcription: {
    current: number; // in minutes
    limit: number; // in minutes
    resetAt: Date;
  };
}

export interface RateLimitHistory {
  timestamp: Date;
  apiCalls: number;
  storage: number;
  transcriptionMinutes: number;
}

export interface UseRateLimitsOptions {
  refreshInterval?: number; // in milliseconds
  enableAutoRefresh?: boolean;
}

export interface UseRateLimitsReturn {
  // Current data
  data: RateLimitData | null;
  history: RateLimitHistory[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;

  // Computed values
  percentages: {
    apiCalls: number;
    storage: number;
    transcription: number;
  };

  // Alert states
  alerts: {
    apiCalls: 'safe' | 'warning' | 'critical' | 'exceeded';
    storage: 'safe' | 'warning' | 'critical' | 'exceeded';
    transcription: 'safe' | 'warning' | 'critical' | 'exceeded';
  };

  // Time until reset
  resetTimes: {
    apiCalls: string;
    transcription: string;
  };

  // Actions
  refresh: () => Promise<void>;
  reset: () => void;
}

// Mock data generator for demonstration
function generateMockData(): RateLimitData {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    apiCalls: {
      current: Math.floor(Math.random() * 8000) + 2000,
      limit: 10000,
      resetAt: tomorrow,
    },
    storage: {
      current: Math.floor(Math.random() * 4000) + 1000, // MB
      limit: 5120, // 5GB in MB
    },
    transcription: {
      current: Math.floor(Math.random() * 400) + 100,
      limit: 500,
      resetAt: tomorrow,
    },
  };
}

function generateMockHistory(): RateLimitHistory[] {
  const history: RateLimitHistory[] = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - i);

    history.push({
      timestamp,
      apiCalls: Math.floor(Math.random() * 500) + 100,
      storage: Math.floor(Math.random() * 200) + 50,
      transcriptionMinutes: Math.floor(Math.random() * 20) + 5,
    });
  }

  return history;
}

export function useRateLimits(
  options: UseRateLimitsOptions = {}
): UseRateLimitsReturn {
  const {
    refreshInterval = 30000, // 30 seconds default
    enableAutoRefresh = true,
  } = options;

  const [data, setData] = useState<RateLimitData | null>(null);
  const [history, setHistory] = useState<RateLimitHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch rate limit data
  const fetchData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // In a real application, this would be an API call
      const mockData = generateMockData();
      const mockHistory = generateMockHistory();

      setData(mockData);
      setHistory(mockHistory);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch rate limits'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Calculate percentages
  const percentages = useMemo(() => {
    if (!data) {
      return { apiCalls: 0, storage: 0, transcription: 0 };
    }

    return {
      apiCalls: Math.round((data.apiCalls.current / data.apiCalls.limit) * 100),
      storage: Math.round((data.storage.current / data.storage.limit) * 100),
      transcription: Math.round((data.transcription.current / data.transcription.limit) * 100),
    };
  }, [data]);

  // Determine alert states
  const alerts = useMemo(() => {
    const getAlertLevel = (percentage: number): 'safe' | 'warning' | 'critical' | 'exceeded' => {
      if (percentage >= 100) return 'exceeded';
      if (percentage >= 90) return 'critical';
      if (percentage >= 80) return 'warning';
      return 'safe';
    };

    return {
      apiCalls: getAlertLevel(percentages.apiCalls),
      storage: getAlertLevel(percentages.storage),
      transcription: getAlertLevel(percentages.transcription),
    };
  }, [percentages]);

  // Calculate time until reset
  const resetTimes = useMemo(() => {
    if (!data) {
      return { apiCalls: '', transcription: '' };
    }

    const formatTimeUntil = (resetAt: Date): string => {
      const now = new Date();
      const diff = resetAt.getTime() - now.getTime();

      if (diff <= 0) return 'Resetting...';

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    return {
      apiCalls: formatTimeUntil(data.apiCalls.resetAt),
      transcription: formatTimeUntil(data.transcription.resetAt),
    };
  }, [data]);

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Reset function
  const reset = useCallback(() => {
    setData(null);
    setHistory([]);
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!enableAutoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enableAutoRefresh, refreshInterval, fetchData]);

  return {
    data,
    history,
    isLoading,
    isRefreshing,
    error,
    percentages,
    alerts,
    resetTimes,
    refresh,
    reset,
  };
}

// Additional utility hooks

/**
 * Hook for monitoring a specific resource
 */
export function useResourceLimit(
  resource: 'apiCalls' | 'storage' | 'transcription'
) {
  const { data, percentages, alerts } = useRateLimits();

  return {
    current: data?.[resource]?.current ?? 0,
    limit: data?.[resource]?.limit ?? 0,
    percentage: percentages[resource],
    alert: alerts[resource],
    isNearLimit: percentages[resource] >= 80,
    hasExceeded: percentages[resource] >= 100,
  };
}

/**
 * Hook for getting upgrade recommendations
 */
export function useUpgradeRecommendation() {
  const { percentages, alerts } = useRateLimits();

  const shouldUpgrade = useMemo(() => {
    return Object.values(alerts).some(alert =>
      alert === 'critical' || alert === 'exceeded'
    );
  }, [alerts]);

  const criticalResources = useMemo(() => {
    return Object.entries(alerts)
      .filter(([_, alert]) => alert === 'critical' || alert === 'exceeded')
      .map(([resource]) => resource);
  }, [alerts]);

  const recommendedPlan = useMemo(() => {
    const maxPercentage = Math.max(...Object.values(percentages));

    if (maxPercentage >= 90) {
      return {
        name: 'Professional',
        price: 99,
        benefits: [
          '5x more API calls',
          '4x more storage',
          '4x more transcription minutes',
          'Priority support',
        ],
      };
    } else if (maxPercentage >= 70) {
      return {
        name: 'Starter',
        price: 29,
        benefits: [
          '2x more API calls',
          '2x more storage',
          '2x more transcription minutes',
          'Email support',
        ],
      };
    }

    return null;
  }, [percentages]);

  return {
    shouldUpgrade,
    criticalResources,
    recommendedPlan,
  };
}