'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { MessageSquare, Mic, Clock, Users, Activity, TrendingUp } from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';

interface EngagementData {
  totalComments: number;
  totalSoundbites: number;
  mostCommentedMeetings: Array<{
    id: string;
    title: string;
    commentCount: number;
  }>;
  mostClippedMeetings: Array<{
    id: string;
    title: string;
    clipCount: number;
  }>;
}

interface EngagementMetricsProps {
  data: EngagementData | null;
  loading?: boolean;
}

type ViewMode = 'radar' | 'pie' | 'list';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export function EngagementMetrics({ data, loading }: EngagementMetricsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');

  // Calculate engagement scores
  const engagementScores = data ? [
    {
      metric: 'Comments',
      value: Math.min((data.totalComments / 100) * 100, 100),
      actual: data.totalComments,
      icon: MessageSquare,
      color: '#3b82f6',
    },
    {
      metric: 'Soundbites',
      value: Math.min((data.totalSoundbites / 50) * 100, 100),
      actual: data.totalSoundbites,
      icon: Mic,
      color: '#8b5cf6',
    },
    {
      metric: 'Meeting Activity',
      value: Math.min(((data.mostCommentedMeetings.length + data.mostClippedMeetings.length) / 20) * 100, 100),
      actual: data.mostCommentedMeetings.length + data.mostClippedMeetings.length,
      icon: Activity,
      color: '#10b981',
    },
    {
      metric: 'Participation',
      value: 75, // Mock value - would be calculated from actual participation data
      actual: 75,
      icon: Users,
      color: '#f59e0b',
    },
    {
      metric: 'Duration',
      value: 85, // Mock value - would be calculated from meeting duration data
      actual: 85,
      icon: Clock,
      color: '#ef4444',
    },
    {
      metric: 'Growth',
      value: 65, // Mock value - would be calculated from growth trends
      actual: 65,
      icon: TrendingUp,
      color: '#06b6d4',
    },
  ] : [];

  const overallScore = engagementScores.length > 0
    ? Math.round(engagementScores.reduce((sum, s) => sum + s.value, 0) / engagementScores.length)
    : 0;

  const getScoreLabel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-400' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-400' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const scoreInfo = getScoreLabel(overallScore);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{data.metric}</p>
          <p className="text-sm text-gray-300">
            Score: <span className="font-semibold">{data.value.toFixed(0)}%</span>
          </p>
          <p className="text-xs text-gray-400">
            Actual: {data.actual}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (!data) {
      return (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-300">No engagement data available</p>
          <p className="text-sm text-slate-500">Engagement metrics will appear here</p>
        </div>
      );
    }

    switch (viewMode) {
      case 'radar':
        return (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={engagementScores}>
                <PolarGrid
                  gridType="polygon"
                  radialLines={true}
                  stroke="#1e293b"
                />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Radar
                  name="Engagement"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              {engagementScores.map((score) => {
                const Icon = score.icon;
                return (
                  <div
                    key={score.metric}
                    className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{ color: score.color }} />
                      <span className="text-xs text-slate-400">{score.metric}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-white">
                        {score.value.toFixed(0)}
                      </span>
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );

      case 'pie':
        return (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementScores}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.metric}: ${entry.value.toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {engagementScores.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </>
        );

      case 'list':
        return (
          <div className="space-y-4">
            {/* Most Commented Meetings */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Most Commented Meetings
              </h4>
              <div className="space-y-2">
                {data.mostCommentedMeetings.length > 0 ? (
                  data.mostCommentedMeetings.map((meeting, index) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-3 bg-[#0a0a1a]/50 rounded-lg border border-slate-800"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium truncate">
                          {meeting.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">{meeting.commentCount}</span>
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No commented meetings yet</p>
                )}
              </div>
            </div>

            {/* Most Clipped Meetings */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-400" />
                Most Clipped Meetings
              </h4>
              <div className="space-y-2">
                {data.mostClippedMeetings.length > 0 ? (
                  data.mostClippedMeetings.map((meeting, index) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-3 bg-[#0a0a1a]/50 rounded-lg border border-slate-800"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium truncate">
                          {meeting.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">{meeting.clipCount}</span>
                        <Mic className="w-3 h-3 text-slate-500" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No clipped meetings yet</p>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <CardGlass padding="none">
      <CardGlassHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardGlassTitle>Engagement Metrics</CardGlassTitle>
            <p className="text-sm text-slate-400 mt-1">Overall engagement and activity scores</p>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-[#0a0a1a] border border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('radar')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'radar' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Radar
            </button>
            <button
              onClick={() => setViewMode('pie')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'pie' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pie
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </CardGlassHeader>

      <CardGlassContent className="p-6 pt-0">
        {/* Overall Score */}
        {data && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Overall Engagement Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{overallScore}</span>
                  <span className="text-sm text-slate-400">/ 100</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium ${scoreInfo.color}`}>
                  {scoreInfo.label}
                </span>
                <div className="mt-2 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-8 rounded ${
                        i < Math.floor(overallScore / 20)
                          ? 'bg-gradient-to-t from-blue-500 to-purple-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p className="text-slate-300">Loading engagement data...</p>
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </CardGlassContent>
    </CardGlass>
  );
}