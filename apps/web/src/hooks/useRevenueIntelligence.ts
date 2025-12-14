import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface Deal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expectedCloseDate: string;
  owner: string;
  lastActivity: string;
  healthScore: number;
  nextSteps: string[];
  competitors: string[];
  timeline: ActivityEntry[];
  objections: string[];
  engagementLevel: 'high' | 'medium' | 'low';
  crmSynced: boolean;
  daysInStage: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ActivityEntry {
  id: string;
  date: string;
  type: 'meeting' | 'email' | 'call' | 'note' | 'competitor_mention' | 'objection';
  description: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  participants?: string[];
}

export interface CompetitorMention {
  competitor: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  lastMentioned: string;
  context: string[];
}

export interface AIInsight {
  id: string;
  type: 'next_step' | 'risk' | 'opportunity' | 'coaching';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  dealId?: string;
}

export interface PipelineStage {
  name: string;
  value: number;
  count: number;
  avgDaysInStage: number;
  conversionRate: number;
}

export function useRevenueIntelligence() {
  const { data: session } = useSession();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorMention[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all revenue intelligence data
  const fetchRevenueData = useCallback(async () => {
    if (!session?.user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get token from localStorage as fallback
      const token = (session.user as any).accessToken || localStorage.getItem('authToken') || '';
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Parallel fetch all data
      const [dealsRes, insightsRes, competitorsRes, pipelineRes] = await Promise.all([
        fetch('/api/revenue/deals-enhanced', { headers }),
        fetch('/api/revenue/ai-insights', { headers }),
        fetch('/api/revenue/competitive-intelligence', { headers }),
        fetch('/api/revenue/pipeline', { headers })
      ]);

      if (!dealsRes.ok || !insightsRes.ok || !competitorsRes.ok || !pipelineRes.ok) {
        throw new Error('Failed to fetch revenue data');
      }

      const [dealsData, insightsData, competitorsData, pipelineData] = await Promise.all([
        dealsRes.json(),
        insightsRes.json(),
        competitorsRes.json(),
        pipelineRes.json()
      ]);

      setDeals(dealsData.data || []);
      setInsights(insightsData.data || []);
      setCompetitors(competitorsData.data || []);
      setPipeline(pipelineData.data || []);

    } catch (err) {
      console.error('Failed to fetch revenue intelligence:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Update deal stage (for drag and drop)
  const updateDealStage = useCallback(async (dealId: string, newStage: Deal['stage']) => {
    if (!session?.user) return;

    try {
      const token = (session.user as any).accessToken || localStorage.getItem('authToken') || '';
      const response = await fetch(`/api/revenue/deals/${dealId}/stage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stage: newStage })
      });

      if (!response.ok) {
        throw new Error('Failed to update deal stage');
      }

      // Update local state optimistically
      setDeals(prev => prev.map(deal =>
        deal.id === dealId ? { ...deal, stage: newStage } : deal
      ));

      // Refresh insights after stage change
      const insightsRes = await fetch('/api/revenue/ai-insights', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData.data || []);
      }

    } catch (err) {
      console.error('Failed to update deal stage:', err);
      // Revert on error
      fetchRevenueData();
    }
  }, [session, fetchRevenueData]);

  // Get AI recommendations for a specific deal
  const getDealRecommendations = useCallback(async (dealId: string) => {
    if (!session?.user) return [];

    try {
      const token = (session.user as any).accessToken || localStorage.getItem('authToken') || '';
      const response = await fetch(`/api/revenue/deals/${dealId}/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      return data.recommendations || [];
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      return [];
    }
  }, [session]);

  // Calculate deal health score
  const calculateHealthScore = useCallback((deal: Deal): number => {
    let score = 100;

    // Reduce score based on days in stage
    if (deal.daysInStage > 30) score -= 20;
    if (deal.daysInStage > 60) score -= 20;

    // Engagement level impact
    if (deal.engagementLevel === 'low') score -= 30;
    else if (deal.engagementLevel === 'medium') score -= 10;

    // Competitor mentions impact
    if (deal.competitors.length > 2) score -= 15;

    // Objections impact
    if (deal.objections.length > 3) score -= 20;

    // Sentiment impact
    if (deal.sentiment === 'negative') score -= 25;
    else if (deal.sentiment === 'neutral') score -= 10;

    // Close date approaching
    const daysToClose = Math.floor((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToClose < 7 && deal.stage !== 'negotiation') score -= 20;

    return Math.max(0, Math.min(100, score));
  }, []);

  // Get competitor sentiment analysis
  const getCompetitorSentiment = useCallback((competitorName: string, dealId?: string) => {
    const relevantCompetitors = dealId
      ? competitors.filter(c => c.competitor === competitorName)
      : competitors.filter(c => c.competitor === competitorName);

    if (relevantCompetitors.length === 0) {
      return { sentiment: 'neutral', count: 0 };
    }

    const totalCount = relevantCompetitors.reduce((sum, c) => sum + c.count, 0);
    const avgSentiment = relevantCompetitors.reduce((acc, c) => {
      const sentimentScore = c.sentiment === 'positive' ? 1 : c.sentiment === 'negative' ? -1 : 0;
      return acc + (sentimentScore * c.count);
    }, 0) / totalCount;

    return {
      sentiment: avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral',
      count: totalCount
    };
  }, [competitors]);

  // Initial fetch
  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchRevenueData, 30000);
    return () => clearInterval(interval);
  }, [fetchRevenueData]);

  return {
    deals,
    insights,
    competitors,
    pipeline,
    isLoading,
    error,
    updateDealStage,
    getDealRecommendations,
    calculateHealthScore,
    getCompetitorSentiment,
    refresh: fetchRevenueData
  };
}