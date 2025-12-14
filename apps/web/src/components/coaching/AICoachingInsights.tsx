'use client';

import { Brain, TrendingUp, AlertTriangle, Target, Lightbulb, Award, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { AIInsight } from '@/hooks/useCoaching';

interface AICoachingInsightsProps {
  insights: AIInsight[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function AICoachingInsights({ insights, onRefresh, isLoading }: AICoachingInsightsProps) {
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'strength' | 'improvement' | 'opportunity' | 'warning'>('all');

  const toggleExpanded = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'strength':
        return <Award className="h-5 w-5" />;
      case 'improvement':
        return <Target className="h-5 w-5" />;
      case 'opportunity':
        return <Lightbulb className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'strength':
        return '#22c55e';
      case 'improvement':
        return '#3b82f6';
      case 'opportunity':
        return '#f59e0b';
      case 'warning':
        return '#ef4444';
      default:
        return '#8b5cf6';
    }
  };

  const getPriorityBadgeColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const filteredInsights = insights.filter(insight =>
    filter === 'all' || insight.type === filter
  );

  const insightCounts = {
    strength: insights.filter(i => i.type === 'strength').length,
    improvement: insights.filter(i => i.type === 'improvement').length,
    opportunity: insights.filter(i => i.type === 'opportunity').length,
    warning: insights.filter(i => i.type === 'warning').length
  };

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--ff-purple-500)]/10 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-[var(--ff-purple-500)]" />
            </div>
            <div>
              <CardGlassTitle>AI Coaching Insights</CardGlassTitle>
              <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
                Personalized recommendations based on your performance
              </p>
            </div>
          </div>
          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded-lg hover:bg-[var(--ff-border)] transition-all"
            >
              {isLoading ? 'Analyzing...' : 'Refresh Insights'}
            </Button>
          )}
        </div>
      </CardGlassHeader>
      <CardGlassContent className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 pb-4 border-b border-[var(--ff-border)]">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-[var(--ff-purple-500)] text-white'
                : 'bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] hover:bg-[var(--ff-border)]'
            }`}
          >
            All ({insights.length})
          </button>
          {Object.entries(insightCounts).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              disabled={count === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === type
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : count === 0
                  ? 'bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)] opacity-50 cursor-not-allowed'
                  : 'bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] hover:bg-[var(--ff-border)]'
              }`}
            >
              {type} ({count})
            </button>
          ))}
        </div>

        {/* Insights List */}
        <div className="space-y-3">
          {filteredInsights.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-[var(--ff-text-muted)] mb-3" />
              <p className="text-[var(--ff-text-muted)]">No insights available</p>
              <p className="text-xs text-[var(--ff-text-muted)] mt-1">
                Complete more coaching sessions to generate insights
              </p>
            </div>
          ) : (
            filteredInsights.map((insight) => (
              <div
                key={insight.id}
                className="bg-[var(--ff-bg-dark)] rounded-xl border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/30 transition-all"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpanded(insight.id)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${getInsightColor(insight.type)}20` }}
                      >
                        <div style={{ color: getInsightColor(insight.type) }}>
                          {getInsightIcon(insight.type)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--ff-text-primary)]">
                          {insight.title}
                        </h3>
                        <p className="text-sm text-[var(--ff-text-secondary)] mt-1">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${getPriorityBadgeColor(insight.priority)}20`,
                          color: getPriorityBadgeColor(insight.priority)
                        }}
                      >
                        {insight.priority}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 text-[var(--ff-text-muted)] transition-transform ${
                          expandedInsights.has(insight.id) ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Impact Badge */}
                  {insight.impact && (
                    <div className="flex items-center gap-2 mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500 font-medium">
                        {insight.impact}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Content */}
                {expandedInsights.has(insight.id) && (
                  <div className="px-4 pb-4 border-t border-[var(--ff-border)]">
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-[var(--ff-text-primary)] mb-2">
                        Recommended Actions:
                      </h4>
                      <div className="space-y-2">
                        {insight.actionItems.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-[var(--ff-purple-500)] rounded-full mt-1.5 flex-shrink-0" />
                            <p className="text-sm text-[var(--ff-text-secondary)]">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {insight.metric && (
                      <div className="mt-3 pt-3 border-t border-[var(--ff-border)]">
                        <p className="text-xs text-[var(--ff-text-muted)]">
                          Related Metric: <span className="font-medium">{insight.metric}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {insights.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[var(--ff-border)]">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{insightCounts.strength}</p>
                <p className="text-xs text-[var(--ff-text-muted)]">Strengths</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{insightCounts.improvement}</p>
                <p className="text-xs text-[var(--ff-text-muted)]">Improvements</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{insightCounts.opportunity}</p>
                <p className="text-xs text-[var(--ff-text-muted)]">Opportunities</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{insightCounts.warning}</p>
                <p className="text-xs text-[var(--ff-text-muted)]">Warnings</p>
              </div>
            </div>
          </div>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}