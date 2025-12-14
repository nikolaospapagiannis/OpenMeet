'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Activity, Layers } from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { format, parseISO } from 'date-fns';

interface MeetingTrend {
  date: string;
  count: number;
}

interface MeetingVolumeChartProps {
  data: MeetingTrend[];
  loading?: boolean;
}

type ChartType = 'area' | 'bar' | 'line';

export function MeetingVolumeChart({ data, loading }: MeetingVolumeChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');

  // Calculate statistics
  const totalMeetings = data.reduce((sum, d) => sum + d.count, 0);
  const avgMeetingsPerDay = data.length > 0 ? (totalMeetings / data.length).toFixed(1) : '0';
  const maxMeetings = Math.max(...data.map(d => d.count), 0);
  const minMeetings = Math.min(...data.map(d => d.count), 0);

  // Calculate trend (comparing last 7 days to previous 7 days)
  const lastWeek = data.slice(-7);
  const previousWeek = data.slice(-14, -7);
  const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.count, 0);
  const previousWeekTotal = previousWeek.reduce((sum, d) => sum + d.count, 0);
  const trendPercentage = previousWeekTotal > 0
    ? ((lastWeekTotal - previousWeekTotal) / previousWeekTotal * 100).toFixed(1)
    : '0';
  const isUpward = parseFloat(trendPercentage) >= 0;

  // Format data for chart
  const chartData = data.map(item => ({
    ...item,
    date: format(parseISO(item.date), 'MMM dd'),
    fullDate: item.date,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{label}</p>
          <p className="text-sm text-gray-300">
            Meetings: <span className="font-semibold text-blue-400">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 5, left: 0, bottom: 5 },
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
              animationDuration={800}
            />
          </LineChart>
        );

      case 'area':
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMeetings)"
              animationDuration={800}
            />
          </AreaChart>
        );
    }
  };

  return (
    <CardGlass padding="none">
      <CardGlassHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardGlassTitle>Meeting Volume</CardGlassTitle>
            <p className="text-sm text-slate-400 mt-1">Daily meeting activity over time</p>
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 bg-[#0a0a1a] border border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'area' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Area Chart"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'bar' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'line' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Line Chart"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardGlassHeader>

      <CardGlassContent className="p-6 pt-0">
        {/* Statistics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">Total</p>
            <p className="text-lg font-bold text-white">{totalMeetings}</p>
          </div>
          <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">Daily Avg</p>
            <p className="text-lg font-bold text-white">{avgMeetingsPerDay}</p>
          </div>
          <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">Peak Day</p>
            <p className="text-lg font-bold text-white">{maxMeetings}</p>
          </div>
          <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">Trend</p>
            <div className="flex items-center gap-1">
              {isUpward ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <p className={`text-lg font-bold ${isUpward ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.abs(parseFloat(trendPercentage))}%
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-64 flex items-center justify-center bg-[#0a0a1a]/50 rounded-lg border-2 border-dashed border-[#1e293b]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p className="text-slate-300">Loading chart data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center bg-[#0a0a1a]/50 rounded-lg border-2 border-dashed border-[#1e293b]">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-300">No data available</p>
              <p className="text-sm text-slate-500">Start recording meetings to see trends</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}

        {/* Insights */}
        {data.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Insights</p>
            <div className="space-y-2">
              {parseFloat(trendPercentage) > 10 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                  <p className="text-sm text-emerald-300">
                    Meeting activity increased by {trendPercentage}% compared to last week
                  </p>
                </div>
              )}
              {parseFloat(trendPercentage) < -10 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                  <p className="text-sm text-amber-300">
                    Meeting activity decreased by {Math.abs(parseFloat(trendPercentage))}% compared to last week
                  </p>
                </div>
              )}
              {maxMeetings > parseFloat(avgMeetingsPerDay) * 2 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <p className="text-sm text-blue-300">
                    Peak day had {maxMeetings} meetings, {((maxMeetings / parseFloat(avgMeetingsPerDay) - 1) * 100).toFixed(0)}% above average
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}