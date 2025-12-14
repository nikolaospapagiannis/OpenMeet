'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Calendar,
  Filter,
  Download,
  ChevronDown
} from 'lucide-react';
import { TeamQualityData } from '@/hooks/useQuality';

interface TeamQualityTrendsProps {
  teams: TeamQualityData[];
  period: 'week' | 'month' | 'quarter' | 'year';
  onTeamSelect?: (teamId: string) => void;
  onPeriodChange?: (period: 'week' | 'month' | 'quarter' | 'year') => void;
}

export default function TeamQualityTrends({
  teams,
  period,
  onTeamSelect,
  onPeriodChange
}: TeamQualityTrendsProps) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    teams.slice(0, 5).map(t => t.teamId)
  );
  const [viewMode, setViewMode] = useState<'comparison' | 'individual' | 'ranking'>('comparison');

  // Prepare trend data for charts
  const prepareTrendData = () => {
    const dateMap = new Map<string, any>();

    selectedTeams.forEach(teamId => {
      const team = teams.find(t => t.teamId === teamId);
      if (!team) return;

      team.recentScores.forEach(score => {
        const dateStr = new Date(score.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });

        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { date: dateStr });
        }

        const entry = dateMap.get(dateStr);
        entry[team.teamName] = score.score;
      });
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const trendData = prepareTrendData();

  // Prepare ranking data
  const rankingData = [...teams]
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 10)
    .map((team, idx) => ({
      rank: idx + 1,
      name: team.teamName,
      score: team.averageScore,
      trend: team.trend,
      meetings: team.meetingCount,
      improvement: team.trend === 'improving' ? '+' : team.trend === 'declining' ? '-' : ''
    }));

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return '#10B981'; // green
    if (score >= 80) return '#3B82F6'; // blue
    if (score >= 70) return '#F59E0B'; // yellow
    if (score >= 60) return '#FB923C'; // orange
    return '#EF4444'; // red
  };

  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // yellow
    '#EF4444', // red
    '#06B6D4', // cyan
    '#EC4899', // pink
    '#F97316', // orange
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Quality Trends</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track and compare quality scores across teams
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => onPeriodChange?.(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center space-x-6 mb-6 border-b border-gray-200">
        {[
          { id: 'comparison', label: 'Team Comparison', icon: Users },
          { id: 'individual', label: 'Individual Teams', icon: Filter },
          { id: 'ranking', label: 'Team Rankings', icon: Award }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`flex items-center space-x-2 pb-3 border-b-2 transition-colors ${
              viewMode === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Comparison View */}
      {viewMode === 'comparison' && (
        <div className="space-y-6">
          {/* Team Selector */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Select Teams to Compare</h3>
              <span className="text-xs text-gray-500">
                {selectedTeams.length} of {teams.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {teams.map((team, idx) => (
                <button
                  key={team.teamId}
                  onClick={() => handleTeamToggle(team.teamId)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTeams.includes(team.teamId)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: selectedTeams.includes(team.teamId) ? colors[idx % colors.length] : undefined
                  }}
                >
                  {team.teamName}
                </button>
              ))}
            </div>
          </div>

          {/* Comparison Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Score Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {selectedTeams.map((teamId, idx) => {
                  const team = teams.find(t => t.teamId === teamId);
                  if (!team) return null;
                  return (
                    <Line
                      key={teamId}
                      type="monotone"
                      dataKey={team.teamName}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedTeams.slice(0, 3).map((teamId, idx) => {
              const team = teams.find(t => t.teamId === teamId);
              if (!team) return null;
              return (
                <div
                  key={teamId}
                  className="p-4 rounded-lg border-2"
                  style={{
                    borderColor: `${colors[idx % colors.length]}33`,
                    backgroundColor: `${colors[idx % colors.length]}08`
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{team.teamName}</h4>
                    {getTrendIcon(team.trend)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold" style={{ color: colors[idx % colors.length] }}>
                        {team.averageScore.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500">/100</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>{team.memberCount} members • {team.meetingCount} meetings</div>
                      <div className="text-green-600">Best: {team.topFactors.join(', ')}</div>
                      <div className="text-red-600">Improve: {team.bottomFactors.join(', ')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Teams View */}
      {viewMode === 'individual' && (
        <div className="space-y-4">
          {teams.slice(0, 5).map((team, idx) => (
            <div
              key={team.teamId}
              className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onTeamSelect?.(team.teamId)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  >
                    {team.teamName.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                    <p className="text-sm text-gray-600">
                      {team.memberCount} members • {team.meetingCount} meetings this {period}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold" style={{ color: getGradeColor(team.averageScore) }}>
                        {team.averageScore.toFixed(1)}
                      </span>
                      {getTrendIcon(team.trend)}
                    </div>
                    <div className="text-xs text-gray-500">avg score</div>
                  </div>
                </div>
              </div>

              {/* Mini Chart */}
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={team.recentScores.map(s => ({
                    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    score: s.score
                  }))}>
                    <defs>
                      <linearGradient id={`gradient-${team.teamId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke={colors[idx % colors.length]}
                      fill={`url(#gradient-${team.teamId})`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Factors */}
              <div className="flex items-center justify-between mt-3 text-xs">
                <div className="text-green-600">
                  <strong>Strengths:</strong> {team.topFactors.join(', ')}
                </div>
                <div className="text-red-600">
                  <strong>Improve:</strong> {team.bottomFactors.join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rankings View */}
      {viewMode === 'ranking' && (
        <div className="space-y-6">
          {/* Top Teams */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Rankings</h3>
            <div className="space-y-3">
              {rankingData.map((team, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx < 3 ? 'bg-white shadow-sm' : 'bg-white/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                      idx === 1 ? 'bg-gray-300 text-gray-700' :
                      idx === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {team.rank}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{team.name}</h4>
                      <p className="text-xs text-gray-600">{team.meetings} meetings</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: getGradeColor(team.score) }}>
                        {team.score.toFixed(1)}
                      </div>
                    </div>
                    {getTrendIcon(team.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="score" fill="#3B82F6">
                  {rankingData.map((entry, index) => (
                    <Bar key={`cell-${index}`} fill={getGradeColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}