'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Extend Session type for accessToken
interface ExtendedSession {
  accessToken?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
}

export interface QualityFactor {
  name: string;
  score: number;
  weight: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  benchmarkScore?: number;
}

export interface QualityScore {
  overall: number;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
  lastUpdated: Date;
  factors: QualityFactor[];
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface QualityBenchmark {
  industry: string;
  averageScore: number;
  percentile: number;
  topPerformers: {
    company: string;
    score: number;
  }[];
  comparison: {
    factor: string;
    yourScore: number;
    industryAverage: number;
    difference: number;
  }[];
}

export interface ImprovementSuggestion {
  id: string;
  title: string;
  description: string;
  factor: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  estimatedImprovement: number;
  actionItems: string[];
  resources: {
    title: string;
    url: string;
    type: 'article' | 'video' | 'template' | 'guide';
  }[];
}

export interface TeamQualityData {
  teamId: string;
  teamName: string;
  averageScore: number;
  trend: 'improving' | 'declining' | 'stable';
  memberCount: number;
  meetingCount: number;
  topFactors: string[];
  bottomFactors: string[];
  recentScores: {
    date: Date;
    score: number;
  }[];
}

export interface QualityAnalytics {
  totalMeetings: number;
  analyzedMeetings: number;
  averageScore: number;
  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  factorPerformance: {
    factor: string;
    averageScore: number;
    trend: 'up' | 'down' | 'stable';
    improvementRate: number;
  }[];
  timeAnalysis: {
    period: string;
    averageScore: number;
    meetingCount: number;
    topFactor: string;
    bottomFactor: string;
  }[];
}

export function useQuality() {
  const { data: session } = useSession();
  const extendedSession = session as ExtendedSession | null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [benchmarks, setBenchmarks] = useState<QualityBenchmark | null>(null);
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [teamData, setTeamData] = useState<TeamQualityData[]>([]);
  const [analytics, setAnalytics] = useState<QualityAnalytics | null>(null);

  // Fetch overall quality score
  const fetchQualityScore = useCallback(async (meetingId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = meetingId
        ? `/api/quality/score?meetingId=${meetingId}`
        : '/api/quality/score';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quality score');
      }

      const data = await response.json();
      setQualityScore(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching quality score:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken]);

  // Fetch industry benchmarks
  const fetchBenchmarks = useCallback(async (industry?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = industry
        ? `/api/quality/benchmarks?industry=${industry}`
        : '/api/quality/benchmarks';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch benchmarks');
      }

      const data = await response.json();
      setBenchmarks(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching benchmarks:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken]);

  // Fetch improvement suggestions
  const fetchSuggestions = useCallback(async (factorFilter?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = factorFilter
        ? `/api/quality/suggestions?factor=${factorFilter}`
        : '/api/quality/suggestions';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      return data.suggestions;
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching suggestions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken]);

  // Fetch team quality data
  const fetchTeamData = useCallback(async (period: 'week' | 'month' | 'quarter' = 'month') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quality/teams?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team data');
      }

      const data = await response.json();
      setTeamData(data.teams || []);
      return data.teams;
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching team data:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (period: 'week' | 'month' | 'quarter' | 'year' = 'month') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quality/analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken]);

  // Calculate quality score for a meeting
  const calculateQualityScore = useCallback(async (meetingData: {
    audioQuality: number;
    engagement: number;
    structure: number;
    fillerWords: number;
    clarity: number;
    pacing: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/quality/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate quality score');
      }

      const data = await response.json();
      return data.score;
    } catch (err: any) {
      setError(err.message);
      console.error('Error calculating quality score:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken]);

  // Apply improvement suggestion
  const applySuggestion = useCallback(async (suggestionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quality/suggestions/${suggestionId}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to apply suggestion');
      }

      const data = await response.json();

      // Refresh suggestions
      await fetchSuggestions();

      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error applying suggestion:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken, fetchSuggestions]);

  // Export quality report
  const exportReport = useCallback(async (format: 'pdf' | 'csv' | 'json' = 'pdf') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quality/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${extendedSession?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quality-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error exporting report:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [extendedSession?.accessToken]);

  // Initial data fetch
  useEffect(() => {
    if (extendedSession?.accessToken) {
      fetchQualityScore();
      fetchBenchmarks();
      fetchSuggestions();
      fetchTeamData();
      fetchAnalytics();
    }
  }, [extendedSession?.accessToken]);

  return {
    // State
    loading,
    error,
    qualityScore,
    benchmarks,
    suggestions,
    teamData,
    analytics,

    // Actions
    fetchQualityScore,
    fetchBenchmarks,
    fetchSuggestions,
    fetchTeamData,
    fetchAnalytics,
    calculateQualityScore,
    applySuggestion,
    exportReport,

    // Helpers
    getGrade: (score: number): string => {
      if (score >= 95) return 'A+';
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    },

    getGradeColor: (grade: string): string => {
      switch (grade) {
        case 'A+':
        case 'A':
          return 'text-green-600 bg-green-50';
        case 'B':
          return 'text-blue-600 bg-blue-50';
        case 'C':
          return 'text-yellow-600 bg-yellow-50';
        case 'D':
          return 'text-orange-600 bg-orange-50';
        case 'F':
          return 'text-red-600 bg-red-50';
        default:
          return 'text-gray-600 bg-gray-50';
      }
    },

    getTrendIcon: (trend: 'up' | 'down' | 'stable' | 'improving' | 'declining'): string => {
      switch (trend) {
        case 'up':
        case 'improving':
          return '↑';
        case 'down':
        case 'declining':
          return '↓';
        default:
          return '→';
      }
    },

    getTrendColor: (trend: 'up' | 'down' | 'stable' | 'improving' | 'declining'): string => {
      switch (trend) {
        case 'up':
        case 'improving':
          return 'text-green-600';
        case 'down':
        case 'declining':
          return 'text-red-600';
        default:
          return 'text-gray-600';
      }
    },
  };
}