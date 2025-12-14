'use client';

import { useState, useEffect } from 'react';
import { PipelineFunnel } from '@/components/revenue/PipelineFunnel';
import { DealTable } from '@/components/revenue/DealTable';
import { WinLossChart } from '@/components/revenue/WinLossChart';
import { DealDetailPanel } from '@/components/revenue/DealDetailPanel';
import { RevenueKPICards } from '@/components/revenue/RevenueKPICards';
import { PipelineKanban } from '@/components/revenue/PipelineKanban';
import { DealTimeline } from '@/components/revenue/DealTimeline';
import { CompetitorMentions } from '@/components/revenue/CompetitorMentions';
import { NextStepsAI } from '@/components/revenue/NextStepsAI';
import { DealHealthScore } from '@/components/revenue/DealHealthScore';
import { useRevenueIntelligence } from '@/hooks/useRevenueIntelligence';

type ViewMode = 'overview' | 'pipeline' | 'intelligence' | 'timeline';

export default function RevenueDashboard() {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [dealsData, setDealsData] = useState<any[]>([]);
  const [winLossData, setWinLossData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the new revenue intelligence hook
  const {
    deals,
    insights,
    competitors,
    pipeline,
    updateDealStage,
    getDealRecommendations,
    calculateHealthScore,
    getCompetitorSentiment,
    refresh: refreshIntelligence,
    isLoading: intelligenceLoading,
    error: intelligenceError,
  } = useRevenueIntelligence();

  // Fetch legacy revenue data on mount
  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get auth token from localStorage or session
        const token = localStorage.getItem('authToken') || '';

        // Fetch pipeline metrics
        const pipelineResponse = await fetch('/api/revenue/pipeline', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!pipelineResponse.ok) {
          throw new Error(`Pipeline fetch failed: ${pipelineResponse.status}`);
        }

        const pipelineResult = await pipelineResponse.json();
        setPipelineData(pipelineResult.data || pipelineResult);

        // Fetch deals list
        const dealsResponse = await fetch('/api/revenue/deals', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!dealsResponse.ok) {
          throw new Error(`Deals fetch failed: ${dealsResponse.status}`);
        }

        const dealsResult = await dealsResponse.json();
        setDealsData(dealsResult.data || dealsResult);

        // Fetch win-loss analysis
        const winLossResponse = await fetch('/api/revenue/win-loss-analysis', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!winLossResponse.ok) {
          throw new Error(`Win-loss fetch failed: ${winLossResponse.status}`);
        }

        const winLossResult = await winLossResponse.json();
        setWinLossData(winLossResult.data || winLossResult);

      } catch (err) {
        console.error('Failed to fetch revenue data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load revenue data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  // Handle deal selection
  const handleDealSelect = (dealId: string) => {
    setSelectedDealId(dealId === selectedDealId ? null : dealId);
  };

  // Handle deal stage update from Kanban
  const handleDealMove = async (dealId: string, newStage: any) => {
    await updateDealStage(dealId, newStage);
  };

  // Get selected deal
  const selectedDeal = deals.find(d => d.id === selectedDealId) || null;

  if (isLoading || intelligenceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading revenue intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || intelligenceError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-red-400 mb-2">Failed to load revenue data</p>
          <p className="text-gray-500 text-sm">{error || intelligenceError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header with View Switcher */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Revenue Intelligence</h1>
              <p className="text-gray-400">Real-time pipeline insights and AI-powered deal analytics</p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'overview'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'pipeline'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Pipeline Board
              </button>
              <button
                onClick={() => setViewMode('intelligence')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'intelligence'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                AI Intelligence
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Activity Timeline
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards - Always visible */}
        <RevenueKPICards
          pipelineData={pipelineData}
          winLossData={winLossData}
          dealsData={dealsData}
        />

        {/* View-based Content */}
        {viewMode === 'overview' && (
          <>
            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pipeline Funnel */}
              <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Pipeline Overview</h2>
                <PipelineFunnel data={pipelineData} />
              </div>

              {/* Win/Loss Analysis */}
              <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Win/Loss Analysis</h2>
                <WinLossChart data={winLossData} />
              </div>
            </div>

            {/* Deals Table and Detail Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Active Deals</h2>
                  <DealTable
                    deals={dealsData}
                    onDealSelect={handleDealSelect}
                    selectedDealId={selectedDealId}
                  />
                </div>
              </div>

              {/* Deal Detail Panel */}
              {selectedDealId && (
                <div className="lg:col-span-1">
                  <DealDetailPanel dealId={selectedDealId} />
                </div>
              )}
            </div>
          </>
        )}

        {viewMode === 'pipeline' && (
          <div className="space-y-6">
            {/* Pipeline Kanban Board */}
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Pipeline Kanban Board</h2>
                <p className="text-sm text-gray-400">Drag deals to update stages</p>
              </div>
              <PipelineKanban
                deals={deals}
                onDealMove={handleDealMove}
                onDealSelect={handleDealSelect}
              />
            </div>

            {/* Deal Health Score for Selected Deal */}
            {selectedDeal && (
              <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Deal Health Analysis</h2>
                <DealHealthScore deal={selectedDeal} detailed={true} />
              </div>
            )}
          </div>
        )}

        {viewMode === 'intelligence' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI-Powered Next Steps */}
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <NextStepsAI
                insights={insights}
                deals={deals}
                onRefresh={refreshIntelligence}
              />
            </div>

            {/* Competitor Intelligence */}
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <CompetitorMentions competitors={competitors} />
            </div>

            {/* Deal Health Scores Overview */}
            <div className="lg:col-span-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Deal Health Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.slice(0, 6).map(deal => (
                  <div key={deal.id} className="cursor-pointer" onClick={() => handleDealSelect(deal.id)}>
                    <DealHealthScore deal={deal} detailed={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Deal Activity Timeline */}
            <div className="lg:col-span-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">
                {selectedDeal ? `${selectedDeal.name} Timeline` : 'Activity Timeline'}
              </h2>
              <DealTimeline
                activities={selectedDeal?.timeline || deals.flatMap(d => d.timeline).sort((a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).slice(0, 20)}
              />
            </div>

            {/* Deal List for Timeline */}
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Select Deal</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {deals.map(deal => (
                  <div
                    key={deal.id}
                    onClick={() => handleDealSelect(deal.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedDealId === deal.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 hover:border-purple-500/50 bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-white">{deal.name}</h4>
                      <span className={`text-xs font-medium ${
                        deal.healthScore > 70 ? 'text-green-400' :
                        deal.healthScore > 40 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {deal.healthScore}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{deal.company}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">${(deal.value / 1000).toFixed(0)}k</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        deal.stage === 'closed-won' ? 'bg-green-500/20 text-green-400' :
                        deal.stage === 'closed-lost' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {deal.stage.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}