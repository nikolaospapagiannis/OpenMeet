'use client';

import React, { useState, useMemo } from 'react';
import { CompetitorMention } from '@/hooks/useRevenueIntelligence';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface CompetitorMentionsProps {
  competitors: CompetitorMention[];
  onCompetitorClick?: (competitor: CompetitorMention) => void;
}

const SENTIMENT_CONFIG = {
  positive: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  neutral: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  },
  negative: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
  },
};

export function CompetitorMentions({ competitors, onCompetitorClick }: CompetitorMentionsProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'mentions' | 'recent' | 'sentiment'>('mentions');

  // Sort competitors based on selected criteria
  const sortedCompetitors = useMemo(() => {
    const sorted = [...competitors];

    switch (sortBy) {
      case 'mentions':
        return sorted.sort((a, b) => b.count - a.count);
      case 'recent':
        return sorted.sort((a, b) =>
          new Date(b.lastMentioned).getTime() - new Date(a.lastMentioned).getTime()
        );
      case 'sentiment':
        const sentimentOrder = { negative: 0, neutral: 1, positive: 2 };
        return sorted.sort((a, b) =>
          sentimentOrder[a.sentiment] - sentimentOrder[b.sentiment]
        );
      default:
        return sorted;
    }
  }, [competitors, sortBy]);

  // Calculate total mentions and sentiment distribution
  const stats = useMemo(() => {
    const total = competitors.reduce((sum, c) => sum + c.count, 0);
    const bysentiment = competitors.reduce((acc, c) => {
      acc[c.sentiment] = (acc[c.sentiment] || 0) + c.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      positive: bysentiment.positive || 0,
      neutral: bysentiment.neutral || 0,
      negative: bysentiment.negative || 0,
    };
  }, [competitors]);

  const handleCompetitorClick = (competitor: CompetitorMention) => {
    setSelectedCompetitor(competitor.competitor === selectedCompetitor ? null : competitor.competitor);
    onCompetitorClick?.(competitor);
  };

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Competitor Analysis</h3>
          <p className="text-sm text-gray-400">
            Tracking {competitors.length} competitors across {stats.total} mentions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="mentions">Most Mentions</option>
            <option value="recent">Most Recent</option>
            <option value="sentiment">By Sentiment</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Sentiment Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-3 rounded-lg border ${SENTIMENT_CONFIG.positive.borderColor} ${SENTIMENT_CONFIG.positive.bgColor}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${SENTIMENT_CONFIG.positive.color}`}>Positive</span>
            {SENTIMENT_CONFIG.positive.icon}
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.positive}</p>
          <p className="text-xs text-gray-500">
            {stats.total > 0 ? `${Math.round((stats.positive / stats.total) * 100)}%` : '0%'}
          </p>
        </div>

        <div className={`p-3 rounded-lg border ${SENTIMENT_CONFIG.neutral.borderColor} ${SENTIMENT_CONFIG.neutral.bgColor}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${SENTIMENT_CONFIG.neutral.color}`}>Neutral</span>
            {SENTIMENT_CONFIG.neutral.icon}
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.neutral}</p>
          <p className="text-xs text-gray-500">
            {stats.total > 0 ? `${Math.round((stats.neutral / stats.total) * 100)}%` : '0%'}
          </p>
        </div>

        <div className={`p-3 rounded-lg border ${SENTIMENT_CONFIG.negative.borderColor} ${SENTIMENT_CONFIG.negative.bgColor}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${SENTIMENT_CONFIG.negative.color}`}>Negative</span>
            {SENTIMENT_CONFIG.negative.icon}
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.negative}</p>
          <p className="text-xs text-gray-500">
            {stats.total > 0 ? `${Math.round((stats.negative / stats.total) * 100)}%` : '0%'}
          </p>
        </div>
      </div>

      {/* Competitors List/Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCompetitors.map(competitor => {
            const config = SENTIMENT_CONFIG[competitor.sentiment];
            const isSelected = selectedCompetitor === competitor.competitor;

            return (
              <div
                key={competitor.competitor}
                onClick={() => handleCompetitorClick(competitor)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : `${config.borderColor} hover:border-purple-500/50 bg-gray-900/50`
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-white">{competitor.competitor}</h4>
                  <div className={`p-1.5 rounded-lg ${config.bgColor} ${config.color}`}>
                    {config.icon}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Mentions</span>
                    <span className="text-lg font-bold text-white">{competitor.count}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Sentiment</span>
                    <span className={`text-sm font-medium ${config.color}`}>
                      {competitor.sentiment}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      Last mentioned {formatDistanceToNow(parseISO(competitor.lastMentioned), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {isSelected && competitor.context.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">Recent context:</p>
                    <div className="space-y-1">
                      {competitor.context.slice(0, 2).map((ctx, idx) => (
                        <p key={idx} className="text-xs text-gray-400 line-clamp-2">
                          "{ctx}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCompetitors.map(competitor => {
            const config = SENTIMENT_CONFIG[competitor.sentiment];
            const isSelected = selectedCompetitor === competitor.competitor;

            return (
              <div
                key={competitor.competitor}
                onClick={() => handleCompetitorClick(competitor)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : `border-gray-700 hover:border-purple-500/50 bg-gray-900/50`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">{competitor.competitor}</h4>
                      <p className="text-xs text-gray-500">
                        {competitor.count} mentions • Last: {formatDistanceToNow(parseISO(competitor.lastMentioned), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-medium ${config.color}`}>
                      {competitor.sentiment}
                    </span>
                  </div>
                </div>

                {isSelected && competitor.context.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 ml-14">
                    <p className="text-xs text-gray-500 mb-2">Recent mentions:</p>
                    <div className="space-y-1">
                      {competitor.context.map((ctx, idx) => (
                        <p key={idx} className="text-xs text-gray-400">
                          • "{ctx}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {competitors.length === 0 && (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 21a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
          <p className="text-gray-500">No competitor mentions detected</p>
          <p className="text-sm text-gray-600 mt-1">Competitors will appear here when mentioned in meetings</p>
        </div>
      )}
    </div>
  );
}