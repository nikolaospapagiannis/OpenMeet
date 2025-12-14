'use client';

import { Users, Trophy, Target, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';
import { PeerComparison as PeerComparisonType } from '@/hooks/useCoaching';
import { useState } from 'react';

interface PeerComparisonProps {
  comparisons: PeerComparisonType[];
  isAnonymous?: boolean;
  teamSize?: number;
}

export function PeerComparison({ comparisons, isAnonymous = true, teamSize = 12 }: PeerComparisonProps) {
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  const [showDetails, setShowDetails] = useState(false);

  const getPerformanceColor = (percentile: number): string => {
    if (percentile >= 75) return '#22c55e';
    if (percentile >= 50) return '#3b82f6';
    if (percentile >= 25) return '#f59e0b';
    return '#ef4444';
  };

  const getPerformanceLabel = (percentile: number): string => {
    if (percentile >= 75) return 'Top Performer';
    if (percentile >= 50) return 'Above Average';
    if (percentile >= 25) return 'Below Average';
    return 'Needs Improvement';
  };

  const barChartData = comparisons.map(comp => ({
    metric: comp.metric,
    You: comp.yourScore,
    'Team Avg': comp.teamAverage,
    'Top 10%': comp.topPerformer
  }));

  const radarChartData = comparisons.map(comp => ({
    metric: comp.metric.replace(/([A-Z])/g, ' $1').trim(),
    You: (comp.yourScore / comp.topPerformer) * 100,
    'Team Avg': (comp.teamAverage / comp.topPerformer) * 100,
    fullMark: 100
  }));

  const overallPercentile = comparisons.reduce((sum, comp) => sum + comp.percentile, 0) / comparisons.length;

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-[var(--ff-bg-layer)] p-3 rounded-lg border border-[var(--ff-border)] shadow-lg">
          <p className="text-xs text-[var(--ff-text-muted)] mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-xs" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="text-xs font-medium text-[var(--ff-text-primary)]">
                {entry.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--ff-purple-500)]/10 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-[var(--ff-purple-500)]" />
            </div>
            <div>
              <CardGlassTitle>Team Comparison</CardGlassTitle>
              <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
                {isAnonymous ? 'Anonymous' : ''} comparison with {teamSize} team members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[var(--ff-bg-dark)] rounded-lg p-1">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  chartType === 'bar'
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-secondary)]'
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('radar')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  chartType === 'radar'
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-secondary)]'
                }`}
              >
                Radar
              </button>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded-lg hover:bg-[var(--ff-border)] transition-all"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardGlassHeader>
      <CardGlassContent className="space-y-4">
        {/* Overall Performance Badge */}
        <div className="bg-[var(--ff-bg-dark)] rounded-xl p-4 border border-[var(--ff-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--ff-text-muted)] mb-1">Your Overall Ranking</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" style={{ color: getPerformanceColor(overallPercentile) }} />
                  <span className="text-2xl font-bold text-[var(--ff-text-primary)]">
                    {Math.round(overallPercentile)}th
                  </span>
                  <span className="text-sm text-[var(--ff-text-muted)]">percentile</span>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${getPerformanceColor(overallPercentile)}20`,
                    color: getPerformanceColor(overallPercentile)
                  }}
                >
                  {getPerformanceLabel(overallPercentile)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--ff-text-muted)]">Better than</p>
              <p className="text-xl font-bold text-[var(--ff-purple-500)]">
                {Math.round(overallPercentile)}%
              </p>
              <p className="text-xs text-[var(--ff-text-muted)]">of team</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 -mx-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />
                <XAxis
                  dataKey="metric"
                  stroke="var(--ff-text-muted)"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="var(--ff-text-muted)" fontSize={11} />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="You" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Team Avg" fill="#6b7280" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Top 10%" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <RadarChart data={radarChartData}>
                <PolarGrid stroke="var(--ff-border)" />
                <PolarAngleAxis
                  dataKey="metric"
                  stroke="var(--ff-text-muted)"
                  fontSize={11}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  stroke="var(--ff-text-muted)"
                  fontSize={11}
                />
                <Radar
                  name="You"
                  dataKey="You"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Team Avg"
                  dataKey="Team Avg"
                  stroke="#6b7280"
                  fill="#6b7280"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Individual Metrics */}
        {showDetails && (
          <div className="space-y-3 pt-4 border-t border-[var(--ff-border)]">
            <h3 className="text-sm font-semibold text-[var(--ff-text-primary)] mb-3">
              Detailed Comparison
            </h3>
            {comparisons.map((comparison, idx) => (
              <div
                key={idx}
                className="bg-[var(--ff-bg-dark)] rounded-lg p-3 border border-[var(--ff-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--ff-text-primary)]">
                    {comparison.metric}
                  </p>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3" style={{ color: getPerformanceColor(comparison.percentile) }} />
                    <span
                      className="text-xs font-medium"
                      style={{ color: getPerformanceColor(comparison.percentile) }}
                    >
                      {comparison.percentile}th percentile
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-6 bg-[var(--ff-bg-layer)] rounded-full overflow-hidden">
                  {/* Team Average Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-500 z-10"
                    style={{ left: `${(comparison.teamAverage / comparison.topPerformer) * 100}%` }}
                  />
                  {/* Your Score Bar */}
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(comparison.yourScore / comparison.topPerformer) * 100}%`,
                      backgroundColor: getPerformanceColor(comparison.percentile)
                    }}
                  />
                  {/* Top Performer Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-10"
                    style={{ left: '100%' }}
                  />
                </div>

                {/* Values */}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-[var(--ff-text-muted)]">
                    You: <span className="font-medium text-[var(--ff-text-primary)]">{comparison.yourScore.toFixed(1)}</span>
                  </span>
                  <span className="text-[var(--ff-text-muted)]">
                    Avg: <span className="font-medium">{comparison.teamAverage.toFixed(1)}</span>
                  </span>
                  <span className="text-[var(--ff-text-muted)]">
                    Top: <span className="font-medium text-green-500">{comparison.topPerformer.toFixed(1)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Notice */}
        {isAnonymous && (
          <div className="mt-4 p-3 bg-[var(--ff-purple-500)]/5 rounded-lg border border-[var(--ff-purple-500)]/20">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-[var(--ff-purple-500)] mt-0.5" />
              <div>
                <p className="text-xs text-[var(--ff-text-secondary)]">
                  All comparisons are anonymized to protect team member privacy.
                </p>
                <p className="text-xs text-[var(--ff-text-muted)] mt-1">
                  Metrics are aggregated from the last 30 days of performance data.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}