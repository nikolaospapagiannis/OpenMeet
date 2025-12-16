'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, Users, BarChart3, PieChart, Calendar } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface TopicInsight {
  topicId: string;
  topicName: string;
  totalMentions: number;
  uniqueSpeakers: number;
  averageSentiment: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercent: number;
  peakHour: string;
  peakDay: string;
  correlatedTopics: Array<{
    topicId: string;
    topicName: string;
    correlation: number;
  }>;
  speakerDistribution: Array<{
    speaker: string;
    mentions: number;
    sentiment: number;
  }>;
  timeDistribution: Array<{
    time: string;
    mentions: number;
  }>;
  sentimentTrend: Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
  }>;
}

interface TopicInsightsProps {
  topicIds: string[];
  dateRange?: { start: Date; end: Date };
  onDrillDown?: (insight: string, data: any) => void;
}

export default function TopicInsights({
  topicIds,
  dateRange,
  onDrillDown
}: TopicInsightsProps) {
  const [insights, setInsights] = useState<TopicInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'mentions' | 'sentiment' | 'speakers' | 'correlation'>('mentions');
  const [compareMode, setCompareMode] = useState(false);

  // Mock data generation for demonstration
  useEffect(() => {
    const generateInsights = () => {
      const mockInsights: TopicInsight[] = topicIds.map((topicId, index) => ({
        topicId,
        topicName: `Topic ${index + 1}`,
        totalMentions: Math.floor(Math.random() * 500) + 100,
        uniqueSpeakers: Math.floor(Math.random() * 20) + 5,
        averageSentiment: Math.random() * 2 - 1, // -1 to 1
        trendDirection: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
        trendPercent: Math.random() * 50 - 25,
        peakHour: `${Math.floor(Math.random() * 12) + 1}:00 PM`,
        peakDay: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][Math.floor(Math.random() * 5)],
        correlatedTopics: Array(3).fill(null).map((_, i) => ({
          topicId: `corr-${i}`,
          topicName: `Related Topic ${i + 1}`,
          correlation: Math.random()
        })),
        speakerDistribution: Array(5).fill(null).map((_, i) => ({
          speaker: `Speaker ${i + 1}`,
          mentions: Math.floor(Math.random() * 50) + 10,
          sentiment: Math.random() * 2 - 1
        })),
        timeDistribution: Array(24).fill(null).map((_, hour) => ({
          time: `${hour}:00`,
          mentions: Math.floor(Math.random() * 20)
        })),
        sentimentTrend: Array(7).fill(null).map((_, day) => ({
          date: new Date(Date.now() - (6 - day) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          positive: Math.floor(Math.random() * 30) + 10,
          negative: Math.floor(Math.random() * 20) + 5,
          neutral: Math.floor(Math.random() * 25) + 10
        }))
      }));

      setInsights(mockInsights);
      setLoading(false);
    };

    generateInsights();
  }, [topicIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading insights...</div>
      </div>
    );
  }

  const primaryInsight = insights[0];
  if (!primaryInsight) return null;

  // Prepare data for radar chart (topic comparison)
  const radarData = insights.map(insight => ({
    metric: insight.topicName,
    mentions: (insight.totalMentions / 500) * 100,
    sentiment: ((insight.averageSentiment + 1) / 2) * 100,
    speakers: (insight.uniqueSpeakers / 20) * 100,
    trend: ((insight.trendPercent + 50) / 100) * 100
  }));

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 p-2 rounded shadow-lg border border-gray-700">
          <p className="text-white text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="topic-insights space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="card-ff cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => onDrillDown?.('mentions', primaryInsight)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Mentions</span>
            <Activity size={18} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{primaryInsight.totalMentions}</p>
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            primaryInsight.trendDirection === 'up' ? 'text-green-400' :
            primaryInsight.trendDirection === 'down' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {primaryInsight.trendDirection === 'up' ? <TrendingUp size={14} /> :
             primaryInsight.trendDirection === 'down' ? <TrendingDown size={14} /> : null}
            {Math.abs(primaryInsight.trendPercent).toFixed(1)}%
          </div>
        </div>

        <div className="card-ff">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Unique Speakers</span>
            <Users size={18} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{primaryInsight.uniqueSpeakers}</p>
          <p className="text-sm text-gray-400 mt-2">Active participants</p>
        </div>

        <div className="card-ff">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg Sentiment</span>
            <BarChart3 size={18} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {primaryInsight.averageSentiment > 0 ? '+' : ''}{(primaryInsight.averageSentiment * 100).toFixed(0)}%
          </p>
          <div className="w-full h-2 bg-gray-700 rounded-full mt-2">
            <div
              className={`h-full rounded-full ${
                primaryInsight.averageSentiment > 0 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.abs(primaryInsight.averageSentiment) * 50 + 50}%` }}
            />
          </div>
        </div>

        <div className="card-ff">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Peak Activity</span>
            <Clock size={18} className="text-orange-400" />
          </div>
          <p className="text-lg font-semibold text-white">{primaryInsight.peakHour}</p>
          <p className="text-sm text-gray-400 mt-1">{primaryInsight.peakDay}</p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['mentions', 'sentiment', 'speakers', 'correlation'] as const).map(metric => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-3 py-1 text-sm rounded-lg capitalize transition-colors ${
                selectedMetric === metric
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {metric}
            </button>
          ))}
        </div>
        {insights.length > 1 && (
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`button-secondary text-sm ${compareMode ? 'bg-purple-500/20' : ''}`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Topics'}
          </button>
        )}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Distribution */}
        {selectedMetric === 'mentions' && (
          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Mention Distribution (24h)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={primaryInsight.timeDistribution}>
                <defs>
                  <linearGradient id="colorMentions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mentions" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorMentions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sentiment Trend */}
        {selectedMetric === 'sentiment' && (
          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Sentiment Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={primaryInsight.sentimentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} />
                <Line type="monotone" dataKey="neutral" stroke="#6B7280" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Speaker Distribution */}
        {selectedMetric === 'speakers' && (
          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Speaker Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={primaryInsight.speakerDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="speaker" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mentions" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Correlation Analysis */}
        {selectedMetric === 'correlation' && (
          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Topic Correlations</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={primaryInsight.correlatedTopics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.topicName || entry.name || 'Topic'}: ${((entry.correlation || entry.value || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="correlation"
                >
                  {primaryInsight.correlatedTopics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Topic Comparison Radar */}
        {compareMode && insights.length > 1 && (
          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Topic Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={[
                { metric: 'Mentions', ...Object.fromEntries(insights.map(i => [i.topicName, (i.totalMentions / 500) * 100])) },
                { metric: 'Sentiment', ...Object.fromEntries(insights.map(i => [i.topicName, ((i.averageSentiment + 1) / 2) * 100])) },
                { metric: 'Speakers', ...Object.fromEntries(insights.map(i => [i.topicName, (i.uniqueSpeakers / 20) * 100])) },
                { metric: 'Trend', ...Object.fromEntries(insights.map(i => [i.topicName, ((i.trendPercent + 50) / 100) * 100])) }
              ]}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                <PolarRadiusAxis stroke="#9CA3AF" />
                {insights.map((insight, index) => (
                  <Radar
                    key={insight.topicId}
                    name={insight.topicName}
                    dataKey={insight.topicName}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-ff">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Top Correlated Topics</h4>
          <div className="space-y-2">
            {primaryInsight.correlatedTopics.map((topic, index) => (
              <div
                key={topic.topicId}
                className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-2 rounded"
                onClick={() => onDrillDown?.('correlation', topic)}
              >
                <span className="text-white text-sm">{topic.topicName}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topic.correlation * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                  <span className="text-gray-400 text-xs">
                    {(topic.correlation * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-ff">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Top Speakers</h4>
          <div className="space-y-2">
            {primaryInsight.speakerDistribution.slice(0, 3).map((speaker, index) => (
              <div key={speaker.speaker} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                    ['from-purple-500 to-pink-500', 'from-blue-500 to-teal-500', 'from-green-500 to-emerald-500'][index]
                  } flex items-center justify-center text-white text-xs font-medium`}>
                    {speaker.speaker.charAt(0)}
                  </div>
                  <span className="text-white text-sm">{speaker.speaker}</span>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{speaker.mentions}</p>
                  <p className={`text-xs ${speaker.sentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {speaker.sentiment > 0 ? '+' : ''}{(speaker.sentiment * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-ff">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Activity Patterns</h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Most Active Hour</p>
              <p className="text-white font-medium">{primaryInsight.peakHour}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Most Active Day</p>
              <p className="text-white font-medium">{primaryInsight.peakDay}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Avg. Mentions/Day</p>
              <p className="text-white font-medium">
                {Math.floor(primaryInsight.totalMentions / 7)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}