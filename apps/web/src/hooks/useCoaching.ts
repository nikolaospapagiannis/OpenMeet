'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface CoachingMetrics {
  talkToListenRatio: number;
  questionCount: number;
  openEndedQuestions: number;
  closedQuestions: number;
  interruptionCount: number;
  averageResponseTime: number;
  longestMonologue: number;
  engagementScore: number;
  sentimentTrend: 'improving' | 'declining' | 'stable';
  fillerWordsCount?: number;
  pace?: number;
  clarity?: number;
}

export interface CoachingGoal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  metric: keyof CoachingMetrics;
  deadline: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceTrend {
  date: string;
  metric: string;
  value: number;
  target?: number;
}

export interface PeerComparison {
  metric: string;
  yourScore: number;
  teamAverage: number;
  topPerformer: number;
  percentile: number;
}

export interface AIInsight {
  id: string;
  type: 'strength' | 'improvement' | 'opportunity' | 'warning';
  title: string;
  description: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
  metric?: keyof CoachingMetrics;
  impact?: string;
}

export interface CoachingSession {
  id: string;
  meetingId: string;
  date: string;
  overallScore: number;
  metrics: CoachingMetrics;
  insights: AIInsight[];
  improvements: string[];
  strengths: string[];
}

interface UseCoachingReturn {
  // Data
  sessions: CoachingSession[];
  currentMetrics: CoachingMetrics | null;
  goals: CoachingGoal[];
  trends: PerformanceTrend[];
  peerComparisons: PeerComparison[];
  aiInsights: AIInsight[];

  // Loading states
  isLoading: boolean;
  isLoadingGoals: boolean;
  isLoadingTrends: boolean;

  // Error states
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  fetchGoals: () => Promise<void>;
  fetchTrends: (metric: keyof CoachingMetrics, days?: number) => Promise<void>;
  fetchPeerComparisons: () => Promise<void>;
  generateAIInsights: (sessionId?: string) => Promise<void>;
  createGoal: (goal: Partial<CoachingGoal>) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<CoachingGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  evaluateScorecard: (meetingId: string, scorecardId: string) => Promise<any>;
}

export function useCoaching(): UseCoachingReturn {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<CoachingMetrics | null>(null);
  const [goals, setGoals] = useState<CoachingGoal[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [peerComparisons, setPeerComparisons] = useState<PeerComparison[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch coaching sessions
  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get('/api/coaching/sessions');
      setSessions(response.data);

      // Set current metrics from most recent session
      if (response.data.length > 0) {
        setCurrentMetrics(response.data[0].metrics);
      }
    } catch (err: any) {
      console.error('Failed to fetch coaching sessions:', err);
      setError(err.message || 'Failed to load coaching sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch goals
  const fetchGoals = useCallback(async () => {
    try {
      setIsLoadingGoals(true);
      const response = await apiClient.get('/api/coaching/goals');
      setGoals(response.data);
    } catch (err: any) {
      console.error('Failed to fetch goals:', err);
      setError(err.message || 'Failed to load goals');
    } finally {
      setIsLoadingGoals(false);
    }
  }, []);

  // Fetch performance trends
  const fetchTrends = useCallback(async (metric: keyof CoachingMetrics, days = 30) => {
    try {
      setIsLoadingTrends(true);
      const response = await apiClient.get(`/api/coaching/trends`, {
        params: { metric, days }
      });
      setTrends(response.data);
    } catch (err: any) {
      console.error('Failed to fetch trends:', err);
      setError(err.message || 'Failed to load trends');
    } finally {
      setIsLoadingTrends(false);
    }
  }, []);

  // Fetch peer comparisons
  const fetchPeerComparisons = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/coaching/peer-comparison');
      setPeerComparisons(response.data);
    } catch (err: any) {
      console.error('Failed to fetch peer comparisons:', err);
      // Don't set error for peer comparisons as it's optional
    }
  }, []);

  // Generate AI insights
  const generateAIInsights = useCallback(async (sessionId?: string) => {
    try {
      setIsLoading(true);
      const endpoint = sessionId
        ? `/api/coaching/insights/${sessionId}`
        : '/api/coaching/insights';

      const response = await apiClient.get(endpoint);
      setAIInsights(response.data);
    } catch (err: any) {
      console.error('Failed to generate AI insights:', err);
      setError(err.message || 'Failed to generate insights');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new goal
  const createGoal = useCallback(async (goal: Partial<CoachingGoal>) => {
    try {
      const response = await apiClient.post('/api/coaching/goals', goal);
      setGoals(prev => [...prev, response.data]);
    } catch (err: any) {
      console.error('Failed to create goal:', err);
      throw err;
    }
  }, []);

  // Update an existing goal
  const updateGoal = useCallback(async (goalId: string, updates: Partial<CoachingGoal>) => {
    try {
      const response = await apiClient.put(`/api/coaching/goals/${goalId}`, updates);
      setGoals(prev => prev.map(g => g.id === goalId ? response.data : g));
    } catch (err: any) {
      console.error('Failed to update goal:', err);
      throw err;
    }
  }, []);

  // Delete a goal
  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      await apiClient.delete(`/api/coaching/goals/${goalId}`);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err: any) {
      console.error('Failed to delete goal:', err);
      throw err;
    }
  }, []);

  // Evaluate scorecard for a meeting
  const evaluateScorecard = useCallback(async (meetingId: string, scorecardId: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post(`/api/coaching/score/${meetingId}`, {
        scorecardId
      });

      // Refresh sessions after evaluation
      await fetchSessions();

      return response.data;
    } catch (err: any) {
      console.error('Failed to evaluate scorecard:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessions]);

  // Generate mock data for development
  useEffect(() => {
    // Mock AI insights for demonstration
    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'improvement',
        title: 'Reduce Talk Time',
        description: 'Your talk-to-listen ratio is 65%, above the ideal range of 40-50%',
        actionItems: [
          'Ask more open-ended questions',
          'Pause after asking questions to allow response time',
          'Practice the 3-second rule before speaking'
        ],
        priority: 'high',
        metric: 'talkToListenRatio',
        impact: 'Can improve engagement by 25%'
      },
      {
        id: '2',
        type: 'strength',
        title: 'Excellent Question Quality',
        description: 'You\'re asking 70% open-ended questions, well above the 50% benchmark',
        actionItems: ['Continue this approach', 'Share techniques with team'],
        priority: 'low',
        metric: 'openEndedQuestions',
        impact: 'Maintains high discovery quality'
      },
      {
        id: '3',
        type: 'opportunity',
        title: 'Sentiment Improvement Detected',
        description: 'Customer sentiment consistently improves throughout your calls',
        actionItems: [
          'Document your approach for team training',
          'Focus on replicating successful patterns'
        ],
        priority: 'medium',
        metric: 'sentimentTrend',
        impact: 'Increases close rate by 15%'
      }
    ];

    // Mock peer comparisons
    const mockComparisons: PeerComparison[] = [
      {
        metric: 'Talk-to-Listen Ratio',
        yourScore: 65,
        teamAverage: 55,
        topPerformer: 45,
        percentile: 40
      },
      {
        metric: 'Questions per Call',
        yourScore: 12,
        teamAverage: 8,
        topPerformer: 15,
        percentile: 75
      },
      {
        metric: 'Engagement Score',
        yourScore: 78,
        teamAverage: 72,
        topPerformer: 92,
        percentile: 65
      },
      {
        metric: 'Response Time',
        yourScore: 2.5,
        teamAverage: 3.2,
        topPerformer: 1.8,
        percentile: 70
      }
    ];

    // Mock trends data
    const mockTrends: PerformanceTrend[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      mockTrends.push({
        date: date.toISOString().split('T')[0],
        metric: 'talkToListenRatio',
        value: 45 + Math.random() * 25,
        target: 50
      });
    }

    // Mock goals
    const mockGoals: CoachingGoal[] = [
      {
        id: '1',
        name: 'Improve Talk-to-Listen Ratio',
        description: 'Reduce talking time to below 50% on all calls',
        targetValue: 50,
        currentValue: 65,
        metric: 'talkToListenRatio',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Increase Question Count',
        description: 'Ask at least 15 questions per discovery call',
        targetValue: 15,
        currentValue: 12,
        metric: 'questionCount',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Set mock data
    setAIInsights(mockInsights);
    setPeerComparisons(mockComparisons);
    setTrends(mockTrends);
    setGoals(mockGoals);
  }, []);

  return {
    sessions,
    currentMetrics,
    goals,
    trends,
    peerComparisons,
    aiInsights,
    isLoading,
    isLoadingGoals,
    isLoadingTrends,
    error,
    fetchSessions,
    fetchGoals,
    fetchTrends,
    fetchPeerComparisons,
    generateAIInsights,
    createGoal,
    updateGoal,
    deleteGoal,
    evaluateScorecard
  };
}