'use client';

import React, { useState, useEffect } from 'react';
import { Link2, TrendingUp, Users, Calendar, Info } from 'lucide-react';
import apiClient from '@/lib/api';

interface Correlation {
  topic: string;
  topicId: string;
  correlationScore: number;
  coOccurrences: number;
  meetings: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface TopicCorrelationProps {
  topicId: string;
  topicName: string;
  onTopicClick?: (topicId: string, topicName: string) => void;
}

export default function TopicCorrelation({
  topicId,
  topicName,
  onTopicClick
}: TopicCorrelationProps) {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [minScore, setMinScore] = useState(0.3);

  useEffect(() => {
    fetchCorrelations();
  }, [topicId]);

  const fetchCorrelations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getTopicCorrelations(topicId);
      setCorrelations(response.correlations);
    } catch (error) {
      console.error('Error fetching correlations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCorrelationStrength = (score: number) => {
    if (score >= 0.8) return { label: 'Very Strong', color: 'text-green-500', bg: 'bg-green-500/20' };
    if (score >= 0.6) return { label: 'Strong', color: 'text-blue-500', bg: 'bg-blue-500/20' };
    if (score >= 0.4) return { label: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    return { label: 'Weak', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  const filteredCorrelations = correlations.filter(c => c.correlationScore >= minScore);

  const renderGraph = () => {
    // Simplified network graph visualization
    const maxScore = Math.max(...correlations.map(c => c.correlationScore));
    const centerX = 200;
    const centerY = 200;
    const radius = 150;

    return (
      <svg width="400" height="400" className="mx-auto">
        {/* Center node (current topic) */}
        <circle
          cx={centerX}
          cy={centerY}
          r="40"
          fill="var(--ff-purple-500)"
          opacity="0.2"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r="30"
          fill="var(--ff-purple-500)"
          opacity="0.5"
        />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="600"
        >
          {topicName.length > 10 ? topicName.slice(0, 10) + '...' : topicName}
        </text>

        {/* Related topics */}
        {filteredCorrelations.slice(0, 8).map((correlation, index) => {
          const angle = (index / 8) * 2 * Math.PI;
          const distance = radius * (1 - correlation.correlationScore * 0.3);
          const x = centerX + distance * Math.cos(angle);
          const y = centerY + distance * Math.sin(angle);
          const nodeRadius = 15 + correlation.correlationScore * 15;
          const strength = getCorrelationStrength(correlation.correlationScore);

          return (
            <g key={correlation.topicId}>
              {/* Connection line */}
              <line
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="var(--ff-border)"
                strokeWidth={correlation.correlationScore * 3}
                opacity={0.3}
              />

              {/* Node */}
              <circle
                cx={x}
                cy={y}
                r={nodeRadius}
                fill="var(--ff-bg-layer)"
                stroke="var(--ff-purple-500)"
                strokeWidth="2"
                opacity={0.8}
                className="cursor-pointer hover:opacity-100 transition-opacity"
                onClick={() => onTopicClick?.(correlation.topicId, correlation.topic)}
              />

              {/* Label */}
              <text
                x={x}
                y={y + nodeRadius + 15}
                textAnchor="middle"
                fill="var(--ff-text-secondary)"
                fontSize="10"
              >
                {correlation.topic.length > 12
                  ? correlation.topic.slice(0, 12) + '...'
                  : correlation.topic}
              </text>

              {/* Score */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="11"
                fontWeight="600"
              >
                {Math.round(correlation.correlationScore * 100)}%
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="card-ff">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="heading-s text-white">Topic Correlations</h2>
          <p className="text-sm text-gray-400 mt-1">
            Topics that frequently appear together with "{topicName}"
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'graph'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Graph
            </button>
          </div>

          {/* Min Score Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Min Score:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-white font-medium">
              {Math.round(minScore * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ff-purple-500)]"></div>
        </div>
      ) : filteredCorrelations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {correlations.length === 0
            ? 'No correlations found for this topic'
            : `No correlations above ${Math.round(minScore * 100)}% threshold`
          }
        </div>
      ) : viewMode === 'graph' ? (
        <div className="py-8">
          {renderGraph()}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-8 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
              <span className="text-gray-400">Very Strong (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500/20"></div>
              <span className="text-gray-400">Strong (60-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
              <span className="text-gray-400">Moderate (40-59%)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCorrelations.map((correlation) => {
            const strength = getCorrelationStrength(correlation.correlationScore);

            return (
              <div
                key={correlation.topicId}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/50 transition-all cursor-pointer group"
                onClick={() => onTopicClick?.(correlation.topicId, correlation.topic)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Link2 size={18} className="text-[var(--ff-purple-500)]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white group-hover:text-[var(--ff-purple-500)] transition-colors">
                      {correlation.topic}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {correlation.coOccurrences} co-occurrences
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {correlation.meetings} meetings
                      </span>
                      {correlation.trend === 'increasing' && (
                        <span className="flex items-center gap-1 text-green-500">
                          <TrendingUp size={12} />
                          Growing
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Correlation Score Bar */}
                  <div className="w-32">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Correlation</span>
                      <span className={`text-xs font-medium ${strength.color}`}>
                        {Math.round(correlation.correlationScore * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] transition-all"
                        style={{ width: `${correlation.correlationScore * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Strength Badge */}
                  <span className={`px-2 py-1 text-xs font-medium rounded ${strength.bg} ${strength.color}`}>
                    {strength.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex gap-3">
          <Info className="text-blue-400 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="text-blue-400 font-medium mb-1">How correlation works</p>
            <p className="text-gray-300">
              Correlation scores indicate how often topics appear together in meetings.
              A score of 100% means they always appear together, while 0% means they never do.
              Topics with high correlation might be related concepts or frequently discussed together.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}