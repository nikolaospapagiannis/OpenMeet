'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Download } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { PerformanceTrend, CoachingMetrics } from '@/hooks/useCoaching';

interface PerformanceTrendsProps {
  trends: PerformanceTrend[];
  metrics?: Partial<CoachingMetrics>;
  onMetricChange?: (metric: keyof CoachingMetrics) => void;
  onPeriodChange?: (days: number) => void;
  isLoading?: boolean;
}

const METRIC_OPTIONS: { value: keyof CoachingMetrics; label: string; unit: string; color: string }[] = [
  { value: 'talkToListenRatio', label: 'Talk-to-Listen Ratio', unit: '%', color: '#8b5cf6' },
  { value: 'questionCount', label: 'Questions Asked', unit: '', color: '#3b82f6' },
  { value: 'engagementScore', label: 'Engagement Score', unit: '%', color: '#22c55e' },
  { value: 'averageResponseTime', label: 'Response Time', unit: 's', color: '#f59e0b' },
  { value: 'interruptionCount', label: 'Interruptions', unit: '', color: '#ef4444' },
  { value: 'fillerWordsCount', label: 'Filler Words', unit: '', color: '#ec4899' },
  { value: 'pace', label: 'Speaking Pace', unit: 'wpm', color: '#06b6d4' },
  { value: 'clarity', label: 'Clarity Score', unit: '%', color: '#10b981' }
];

const PERIOD_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' }
];

export function PerformanceTrends({
  trends,
  metrics,
  onMetricChange,
  onPeriodChange,
  isLoading
}: PerformanceTrendsProps) {
  const [selectedMetric, setSelectedMetric] = useState<keyof CoachingMetrics>('talkToListenRatio');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  const currentMetricConfig = METRIC_OPTIONS.find(m => m.value === selectedMetric);

  const handleMetricChange = (metric: keyof CoachingMetrics) => {
    setSelectedMetric(metric);
    onMetricChange?.(metric);
  };

  const handlePeriodChange = (days: number) => {
    setSelectedPeriod(days);
    onPeriodChange?.(days);
  };

  const formatValue = (value: number): string => {
    if (!currentMetricConfig) return String(value);
    if (currentMetricConfig.unit === '%') return `${value.toFixed(1)}%`;
    if (currentMetricConfig.unit === 's') return `${value.toFixed(1)}s`;
    if (currentMetricConfig.unit === 'wpm') return `${value.toFixed(0)} wpm`;
    return String(value.toFixed(0));
  };

  const calculateTrend = (): { direction: 'up' | 'down' | 'stable'; percentage: number } => {
    if (trends.length < 2) return { direction: 'stable', percentage: 0 };

    const recent = trends.slice(-7).reduce((sum, t) => sum + t.value, 0) / Math.min(7, trends.length);
    const previous = trends.slice(-14, -7).reduce((sum, t) => sum + t.value, 0) / Math.min(7, trends.slice(-14, -7).length);

    if (previous === 0) return { direction: 'stable', percentage: 0 };

    const change = ((recent - previous) / previous) * 100;
    const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';

    return { direction, percentage: Math.abs(change) };
  };

  const trend = calculateTrend();
  const averageValue = trends.reduce((sum, t) => sum + t.value, 0) / (trends.length || 1);

  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-[var(--ff-text-muted)]" />;
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-[var(--ff-bg-layer)] p-3 rounded-lg border border-[var(--ff-border)] shadow-lg">
          <p className="text-xs text-[var(--ff-text-muted)] mb-1">{label}</p>
          <p className="text-sm font-medium text-[var(--ff-text-primary)]">
            {formatValue(payload[0].value)}
          </p>
          {payload[0].payload.target && (
            <p className="text-xs text-[var(--ff-purple-500)] mt-1">
              Target: {formatValue(payload[0].payload.target)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardGlassTitle>Performance Trends</CardGlassTitle>
            <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
              Track your progress over time
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex bg-[var(--ff-bg-dark)] rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  chartType === 'line'
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-secondary)]'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  chartType === 'area'
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-secondary)]'
                }`}
              >
                Area
              </button>
            </div>
            <Button className="p-2 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded-lg hover:bg-[var(--ff-border)]">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardGlassHeader>
      <CardGlassContent className="space-y-4">
        {/* Metric Selector */}
        <div className="grid grid-cols-4 gap-2">
          {METRIC_OPTIONS.map((metric) => (
            <button
              key={metric.value}
              onClick={() => handleMetricChange(metric.value)}
              className={`p-3 rounded-lg border transition-all ${
                selectedMetric === metric.value
                  ? 'bg-[var(--ff-purple-500)]/10 border-[var(--ff-purple-500)] text-[var(--ff-text-primary)]'
                  : 'bg-[var(--ff-bg-dark)] border-[var(--ff-border)] text-[var(--ff-text-secondary)] hover:border-[var(--ff-purple-500)]/30'
              }`}
            >
              <p className="text-xs font-medium">{metric.label}</p>
              {metrics && metrics[metric.value] !== undefined && (
                <p className="text-lg font-bold mt-1" style={{ color: metric.color }}>
                  {formatValue(metrics[metric.value] as number)}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period.value
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] hover:bg-[var(--ff-border)]'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className="text-sm text-[var(--ff-text-secondary)]">
              {trend.percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-[var(--ff-text-muted)]">{trend.direction}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 -mx-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--ff-purple-500)] border-r-transparent mb-2" />
                <p className="text-sm text-[var(--ff-text-muted)]">Loading trends...</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentMetricConfig?.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={currentMetricConfig?.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--ff-text-muted)"
                    fontSize={11}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="var(--ff-text-muted)"
                    fontSize={11}
                    tickFormatter={(value) => formatValue(value)}
                  />
                  <Tooltip content={customTooltip} />
                  <ReferenceLine
                    y={averageValue}
                    stroke="var(--ff-text-muted)"
                    strokeDasharray="3 3"
                    label={{ value: "Average", position: "left", fill: "var(--ff-text-muted)", fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={currentMetricConfig?.color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                  {trends[0]?.target && (
                    <ReferenceLine
                      y={trends[0].target}
                      stroke="var(--ff-purple-500)"
                      strokeDasharray="5 5"
                      label={{ value: "Target", position: "left", fill: "var(--ff-purple-500)", fontSize: 10 }}
                    />
                  )}
                </AreaChart>
              ) : (
                <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--ff-text-muted)"
                    fontSize={11}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="var(--ff-text-muted)"
                    fontSize={11}
                    tickFormatter={(value) => formatValue(value)}
                  />
                  <Tooltip content={customTooltip} />
                  <ReferenceLine
                    y={averageValue}
                    stroke="var(--ff-text-muted)"
                    strokeDasharray="3 3"
                    label={{ value: "Average", position: "left", fill: "var(--ff-text-muted)", fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={currentMetricConfig?.color}
                    strokeWidth={2}
                    dot={{ fill: currentMetricConfig?.color, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  {trends[0]?.target && (
                    <ReferenceLine
                      y={trends[0].target}
                      stroke="var(--ff-purple-500)"
                      strokeDasharray="5 5"
                      label={{ value: "Target", position: "left", fill: "var(--ff-purple-500)", fontSize: 10 }}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[var(--ff-border)]">
          <div>
            <p className="text-xs text-[var(--ff-text-muted)] mb-1">Current</p>
            <p className="text-lg font-bold" style={{ color: currentMetricConfig?.color }}>
              {trends.length > 0 ? formatValue(trends[trends.length - 1].value) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--ff-text-muted)] mb-1">Average</p>
            <p className="text-lg font-bold text-[var(--ff-text-primary)]">
              {formatValue(averageValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--ff-text-muted)] mb-1">Best</p>
            <p className="text-lg font-bold text-green-500">
              {trends.length > 0 ? formatValue(Math.max(...trends.map(t => t.value))) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--ff-text-muted)] mb-1">Target</p>
            <p className="text-lg font-bold text-[var(--ff-purple-500)]">
              {trends[0]?.target ? formatValue(trends[0].target) : 'Not set'}
            </p>
          </div>
        </div>
      </CardGlassContent>
    </CardGlass>
  );
}