'use client';

/**
 * Organization Quality Dashboard Page
 * Shows organization-wide meeting quality metrics and trends with enhanced analytics
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Filter, Download, Settings, HelpCircle } from 'lucide-react';
import { useQuality } from '@/hooks/useQuality';
import QualityScoreCard from '@/components/quality/QualityScoreCard';
import QualityBreakdown from '@/components/quality/QualityBreakdown';
import TeamQualityTrends from '@/components/quality/TeamQualityTrends';
import QualityBenchmarks from '@/components/quality/QualityBenchmarks';
import ImprovementSuggestions from '@/components/quality/ImprovementSuggestions';
import TeamQualityDashboard from '@/components/quality/TeamQualityDashboard';

type Period = 'week' | 'month' | 'quarter' | 'year';
type ViewMode = 'overview' | 'breakdown' | 'teams' | 'benchmarks' | 'suggestions';

export default function QualityDashboardPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedIndustry, setSelectedIndustry] = useState('Technology');
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    qualityScore,
    benchmarks: qualityBenchmarks,
    suggestions,
    teamData,
    analytics,
    fetchQualityScore,
    fetchBenchmarks,
    fetchSuggestions,
    fetchTeamData,
    applySuggestion,
    exportReport
  } = useQuality();

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load trends
      const trendsRes = await fetch(`/api/quality/trends?period=${period}`);
      if (!trendsRes.ok) throw new Error('Failed to load trends');
      const trendsData = await trendsRes.json();
      setTrends(trendsData.trends);

      // Load benchmarks
      const benchmarksRes = await fetch('/api/quality/benchmarks');
      if (benchmarksRes.ok) {
        const benchmarksData = await benchmarksRes.json();
        setBenchmarks(benchmarksData.benchmarks);
      }

      // Load recommendations
      const recsRes = await fetch('/api/quality/recommendations');
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setRecommendations(recsData.recommendations || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
            <div className="h-96 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Data</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meeting Quality Dashboard</h1>
              <p className="text-gray-600">Track and improve meeting effectiveness across your organization</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Period Selector */}
            <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
              {(['week', 'month', 'quarter', 'year'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Export Button */}
            <button
              onClick={() => exportReport('pdf')}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              title="Export Report"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>

            {/* Settings Button */}
            <button
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center space-x-1 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'breakdown', label: 'Factor Analysis', icon: Filter },
            { id: 'teams', label: 'Team Performance', icon: TrendingUp },
            { id: 'benchmarks', label: 'Industry Compare', icon: Calendar },
            { id: 'suggestions', label: 'AI Suggestions', icon: HelpCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content based on view mode */}
        {viewMode === 'overview' && (
          <>
            {/* Quality Score Card and Summary */}
            {qualityScore && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <QualityScoreCard
                    score={qualityScore}
                    showDetails={true}
                    onDetailsClick={() => setViewMode('breakdown')}
                  />
                </div>
                <div className="lg:col-span-2">
                  {trends && (
                    <TeamQualityDashboard
                      trends={trends}
                      period={period}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setViewMode('breakdown')}
                  className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <Filter className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Analyze Factors</div>
                    <div className="text-sm text-gray-600">Deep dive into quality metrics</div>
                  </div>
                </button>

                <button
                  onClick={() => setViewMode('teams')}
                  className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Team Performance</div>
                    <div className="text-sm text-gray-600">Compare team quality scores</div>
                  </div>
                </button>

                <button
                  onClick={() => setViewMode('suggestions')}
                  className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Get Suggestions</div>
                    <div className="text-sm text-gray-600">AI-powered improvement tips</div>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Factor Breakdown View */}
        {viewMode === 'breakdown' && qualityScore && (
          <QualityBreakdown
            factors={qualityScore.factors}
            showComparison={true}
            benchmarkData={qualityBenchmarks?.comparison.map(c => ({
              name: c.factor,
              score: c.industryAverage,
              weight: 0.2,
              trend: 'stable' as const,
              description: ''
            }))}
            onFactorClick={(factor) => {
              // Handle factor click - could open detailed view or filter suggestions
              console.log('Factor clicked:', factor);
            }}
          />
        )}

        {/* Team Performance View */}
        {viewMode === 'teams' && teamData && (
          <TeamQualityTrends
            teams={teamData}
            period={period}
            onTeamSelect={(teamId) => {
              // Handle team selection - could navigate to team details
              console.log('Team selected:', teamId);
            }}
            onPeriodChange={setPeriod}
          />
        )}

        {/* Industry Benchmarks View */}
        {viewMode === 'benchmarks' && qualityBenchmarks && qualityScore && (
          <QualityBenchmarks
            benchmarks={qualityBenchmarks}
            currentScore={qualityScore.overall}
            onIndustryChange={(industry) => {
              setSelectedIndustry(industry);
              fetchBenchmarks(industry);
            }}
          />
        )}

        {/* AI Suggestions View */}
        {viewMode === 'suggestions' && suggestions && (
          <ImprovementSuggestions
            suggestions={suggestions}
            onApplySuggestion={applySuggestion}
            onViewResource={(resource) => {
              // Handle resource view - could open in modal or new tab
              if (resource.url) {
                window.open(resource.url, '_blank');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
