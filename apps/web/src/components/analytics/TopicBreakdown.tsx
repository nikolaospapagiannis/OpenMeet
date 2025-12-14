'use client';

import { useState } from 'react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MessageSquare, Clock, Filter, Hash, TrendingUp } from 'lucide-react';

interface TopicData {
  topic: string;
  count: number;
  duration: number;
  segments: Array<{
    timestamp: number;
    text: string;
  }>;
}

interface TopicBreakdownProps {
  topics: TopicData[];
  onTopicClick?: (topic: string) => void;
}

// Color palette for topics
const TOPIC_COLORS = [
  '#7a5af8', // Purple
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds}s`;
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-2">{data.topic}</p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-300">
            Mentions: <span className="font-semibold">{data.count}</span>
          </p>
          <p className="text-gray-300">
            Time Spent: <span className="font-semibold">{formatDuration(data.duration)}</span>
          </p>
          <p className="text-gray-400">
            Click to filter transcript
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function TopicBreakdown({ topics, onTopicClick }: TopicBreakdownProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cloud' | 'chart'>('cloud');

  // Sort topics by count
  const sortedTopics = [...topics].sort((a, b) => b.count - a.count);

  // Calculate statistics
  const totalMentions = topics.reduce((sum, t) => sum + t.count, 0);
  const totalDuration = topics.reduce((sum, t) => sum + t.duration, 0);
  const topTopic = sortedTopics[0];

  // Prepare data for bar chart
  const chartData = sortedTopics.slice(0, 10).map((topic, index) => ({
    ...topic,
    color: TOPIC_COLORS[index % TOPIC_COLORS.length],
  }));

  // Calculate size for word cloud effect
  const maxCount = Math.max(...topics.map((t) => t.count));
  const getTopicSize = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'text-3xl';
    if (ratio > 0.5) return 'text-2xl';
    if (ratio > 0.3) return 'text-xl';
    if (ratio > 0.15) return 'text-lg';
    return 'text-base';
  };

  const getTopicColor = (index: number) => {
    return TOPIC_COLORS[index % TOPIC_COLORS.length];
  };

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(selectedTopic === topic ? null : topic);
    if (onTopicClick) {
      onTopicClick(topic);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Total Topics</div>
              <div className="text-lg font-bold text-white">{topics.length}</div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Total Mentions</div>
              <div className="text-lg font-bold text-white">{totalMentions}</div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Time Spent</div>
              <div className="text-lg font-bold text-white">
                {formatDuration(totalDuration)}
              </div>
            </div>
          </div>
        </CardGlass>
      </div>

      {/* View Toggle */}
      <CardGlass variant="default" padding="sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">View Mode</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cloud')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'cloud'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Tag Cloud
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'chart'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Bar Chart
            </button>
          </div>
        </div>
      </CardGlass>

      {/* Content based on view mode */}
      {viewMode === 'cloud' ? (
        <CardGlass variant="default" hover>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Topic Cloud</h3>
            </div>
            {onTopicClick && selectedTopic && (
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                Clear Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-center p-8 min-h-[300px]">
            {sortedTopics.map((topic, index) => {
              const isSelected = selectedTopic === topic.topic;
              const sizeClass = getTopicSize(topic.count);
              const color = getTopicColor(index);

              return (
                <button
                  key={topic.topic}
                  onClick={() => handleTopicClick(topic.topic)}
                  className={`
                    ${sizeClass} font-semibold transition-all duration-300 px-3 py-2 rounded-lg
                    ${
                      isSelected
                        ? 'scale-110 opacity-100 bg-white/10 border border-teal-500/50'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }
                  `}
                  style={{ color: isSelected ? '#5eead4' : color }}
                >
                  {topic.topic}
                  <span className="text-xs ml-2 opacity-75">({topic.count})</span>
                </button>
              );
            })}
          </div>
        </CardGlass>
      ) : (
        <CardGlass variant="default" hover>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Topic Frequency</h3>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="topic"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]}
                onClick={(data: any) => data && handleTopicClick(data.topic)}
                cursor="pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={
                      selectedTopic === null || selectedTopic === entry.topic ? 1 : 0.3
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardGlass>
      )}

      {/* Topic Details List */}
      <CardGlass variant="default">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h4 className="font-semibold text-white">Topic Details</h4>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedTopics.map((topic, index) => {
            const isSelected = selectedTopic === topic.topic;
            const color = getTopicColor(index);
            const percentage = ((topic.count / totalMentions) * 100).toFixed(1);

            return (
              <div
                key={topic.topic}
                onClick={() => handleTopicClick(topic.topic)}
                className={`
                  p-4 rounded-lg border transition-all cursor-pointer
                  ${
                    isSelected
                      ? 'bg-gray-800/70 border-teal-500'
                      : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-white">{topic.topic}</span>
                    <Badge variant="secondary" className="text-xs">
                      {percentage}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{topic.count} mentions</span>
                    <span>{formatDuration(topic.duration)}</span>
                  </div>
                </div>

                {/* Show segments when selected */}
                {isSelected && topic.segments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                    <p className="text-xs text-gray-400 font-medium">
                      Key Mentions:
                    </p>
                    {topic.segments.slice(0, 3).map((segment, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-gray-900/50 rounded text-xs text-gray-300"
                      >
                        <span className="text-gray-500">
                          {formatTime(segment.timestamp)}
                        </span>{' '}
                        - {segment.text}
                      </div>
                    ))}
                    {topic.segments.length > 3 && (
                      <p className="text-xs text-gray-500 italic">
                        +{topic.segments.length - 3} more mentions
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardGlass>

      {/* Insights */}
      {topTopic && (
        <CardGlass variant="default">
          <h4 className="font-semibold text-white mb-4">Topic Insights</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5" />
              <p className="text-sm text-purple-300">
                <span className="font-semibold">{topTopic.topic}</span> was the most
                discussed topic with {topTopic.count} mentions
              </p>
            </div>

            {topics.length > 5 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-300">
                  Meeting covered {topics.length} distinct topics showing diverse
                  discussion
                </p>
              </div>
            )}

            {totalDuration > 600 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <Clock className="w-4 h-4 text-teal-400 mt-0.5" />
                <p className="text-sm text-teal-300">
                  Deep discussion with {formatDuration(totalDuration)} total time on
                  topics
                </p>
              </div>
            )}
          </div>
        </CardGlass>
      )}
    </div>
  );
}
