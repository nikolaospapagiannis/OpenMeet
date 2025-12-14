'use client';

import React, { useState, useEffect } from 'react';
import { AIInsight, Deal } from '@/hooks/useRevenueIntelligence';
import { formatDistanceToNow } from 'date-fns';

interface NextStepsAIProps {
  insights: AIInsight[];
  deals?: Deal[];
  onInsightAction?: (insight: AIInsight, action: string) => void;
  onRefresh?: () => void;
}

const INSIGHT_ICONS = {
  next_step: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  risk: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  opportunity: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  coaching: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

const PRIORITY_COLORS = {
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
};

const INSIGHT_COLORS = {
  next_step: 'bg-blue-500',
  risk: 'bg-red-500',
  opportunity: 'bg-green-500',
  coaching: 'bg-purple-500',
};

export function NextStepsAI({ insights, deals, onInsightAction, onRefresh }: NextStepsAIProps) {
  const [filter, setFilter] = useState<AIInsight['type'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<AIInsight['priority'] | 'all'>('all');
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter insights
  const filteredInsights = insights.filter(insight => {
    if (dismissedInsights.has(insight.id)) return false;
    if (filter !== 'all' && insight.type !== filter) return false;
    if (priorityFilter !== 'all' && insight.priority !== priorityFilter) return false;
    return true;
  });

  // Group insights by type
  const groupedInsights = filteredInsights.reduce((acc, insight) => {
    if (!acc[insight.type]) acc[insight.type] = [];
    acc[insight.type].push(insight);
    return acc;
  }, {} as Record<AIInsight['type'], AIInsight[]>);

  const toggleExpanded = (id: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDismiss = (id: string) => {
    setDismissedInsights(prev => new Set(prev).add(id));
  };

  const handleAction = (insight: AIInsight, action: string) => {
    if (action === 'dismiss') {
      handleDismiss(insight.id);
    } else {
      onInsightAction?.(insight, action);
    }
  };

  const handleRefresh = async () => {
    setIsGenerating(true);
    await onRefresh?.();
    setTimeout(() => setIsGenerating(false), 2000);
  };

  // Find deal name for insights with dealId
  const getDealName = (dealId?: string) => {
    if (!dealId || !deals) return null;
    const deal = deals.find(d => d.id === dealId);
    return deal?.name || null;
  };

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">AI-Powered Next Steps</h3>
          <p className="text-sm text-gray-400">
            {filteredInsights.length} actionable insights generated
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Types</option>
            <option value="next_step">Next Steps</option>
            <option value="risk">Risks</option>
            <option value="opportunity">Opportunities</option>
            <option value="coaching">Coaching</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid gap-4">
        {filteredInsights.map(insight => {
          const isExpanded = expandedInsights.has(insight.id);
          const dealName = getDealName(insight.dealId);

          return (
            <div
              key={insight.id}
              className={`rounded-lg border transition-all ${
                insight.priority === 'high'
                  ? 'border-red-500/30 bg-red-500/5'
                  : insight.priority === 'medium'
                  ? 'border-yellow-500/30 bg-yellow-500/5'
                  : 'border-gray-700 bg-gray-900/50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${INSIGHT_COLORS[insight.type]} text-white`}>
                    {INSIGHT_ICONS[insight.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{insight.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[insight.priority]}`}>
                            {insight.priority}
                          </span>
                        </div>
                        {dealName && (
                          <p className="text-xs text-gray-500">Related to: {dealName}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleDismiss(insight.id)}
                        className="text-gray-500 hover:text-gray-400 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <p className={`text-sm text-gray-300 mb-3 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {insight.description}
                    </p>

                    {/* Recommendation Box */}
                    <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-purple-400 font-medium mb-1">Recommended Action:</p>
                      <p className="text-sm text-white">{insight.recommendation}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {insight.type === 'next_step' && (
                        <>
                          <button
                            onClick={() => handleAction(insight, 'schedule')}
                            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Schedule Meeting
                          </button>
                          <button
                            onClick={() => handleAction(insight, 'email')}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Draft Email
                          </button>
                        </>
                      )}

                      {insight.type === 'risk' && (
                        <>
                          <button
                            onClick={() => handleAction(insight, 'mitigate')}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Create Mitigation Plan
                          </button>
                          <button
                            onClick={() => handleAction(insight, 'alert')}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Alert Team
                          </button>
                        </>
                      )}

                      {insight.type === 'opportunity' && (
                        <>
                          <button
                            onClick={() => handleAction(insight, 'pursue')}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Pursue Opportunity
                          </button>
                          <button
                            onClick={() => handleAction(insight, 'analyze')}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Deep Analysis
                          </button>
                        </>
                      )}

                      {insight.type === 'coaching' && (
                        <>
                          <button
                            onClick={() => handleAction(insight, 'learn')}
                            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            View Resources
                          </button>
                          <button
                            onClick={() => handleAction(insight, 'practice')}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Practice Session
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => toggleExpanded(insight.id)}
                        className="ml-auto text-gray-500 hover:text-gray-400 text-xs"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredInsights.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-gray-500 mb-2">No insights available</p>
          <p className="text-sm text-gray-600">AI will generate insights as more data becomes available</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Generate Insights
          </button>
        </div>
      )}
    </div>
  );
}