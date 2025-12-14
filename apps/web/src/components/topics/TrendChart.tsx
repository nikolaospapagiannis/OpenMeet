'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  Bar
} from 'recharts';
import { Calendar, Download, Maximize2 } from 'lucide-react';
import apiClient from '@/lib/api';

interface TrendData {
  date: string;
  [key: string]: number | string; // Dynamic keys for multiple topics
}

interface TrendChartProps {
  topicIds: string[];
  topicNames: Map<string, string>;
  period: '7d' | '30d' | '90d' | 'custom';
  customDateRange?: { start: Date; end: Date };
  onPeriodChange: (period: '7d' | '30d' | '90d' | 'custom') => void;
  height?: number;
}

const CHART_COLORS = [
  '#7a5af8', // Purple (primary)
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316'  // Orange
];

export default function TrendChart({
  topicIds,
  topicNames,
  period,
  customDateRange,
  onPeriodChange,
  height = 400
}: TrendChartProps) {
  const [chartData, setChartData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'composed'>('line');
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    if (topicIds.length > 0) {
      fetchTrendData();
    }
  }, [topicIds, period, customDateRange]);

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      // Fetch trends for all selected topics
      const promises = topicIds.map(id =>
        apiClient.getTopicTrends(id, {
          period,
          ...(period === 'custom' && customDateRange ? {
            startDate: customDateRange.start.toISOString(),
            endDate: customDateRange.end.toISOString()
          } : {})
        })
      );

      const results = await Promise.all(promises);

      // Combine all trend data into a single dataset
      const dataMap = new Map<string, any>();

      results.forEach((result, index) => {
        const topicId = topicIds[index];
        const topicName = topicNames.get(topicId) || topicId;

        result.mentions.forEach((mention: any) => {
          const date = new Date(mention.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });

          if (!dataMap.has(date)) {
            dataMap.set(date, { date });
          }

          const entry = dataMap.get(date);
          entry[topicName] = mention.count;
        });
      });

      // Convert map to array and sort by date
      const sortedData = Array.from(dataMap.values()).sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

      setChartData(sortedData);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-400">{entry.dataKey}:</span>
              <span className="text-white font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const exportData = () => {
    const csv = [
      ['Date', ...Array.from(topicNames.values())].join(','),
      ...chartData.map(row => {
        const values = ['Date', ...Array.from(topicNames.values())].map(
          key => row[key] || 0
        );
        return values.join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topic-trends-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <AreaChart data={chartData}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />
          )}
          <XAxis
            dataKey="date"
            stroke="var(--ff-text-muted)"
            tick={{ fill: 'var(--ff-text-muted)', fontSize: 12 }}
          />
          <YAxis
            stroke="var(--ff-text-muted)"
            tick={{ fill: 'var(--ff-text-muted)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: 'var(--ff-text-secondary)' }}
            iconType="rect"
          />
          {Array.from(topicNames.entries()).map(([id, name], index) => (
            <Area
              key={id}
              type="monotone"
              dataKey={name}
              stackId="1"
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );
    } else if (chartType === 'composed') {
      return (
        <ComposedChart data={chartData}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />
          )}
          <XAxis
            dataKey="date"
            stroke="var(--ff-text-muted)"
            tick={{ fill: 'var(--ff-text-muted)', fontSize: 12 }}
          />
          <YAxis
            stroke="var(--ff-text-muted)"
            tick={{ fill: 'var(--ff-text-muted)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: 'var(--ff-text-secondary)' }}
            iconType="rect"
          />
          {Array.from(topicNames.entries()).map(([id, name], index) => {
            if (index === 0) {
              return (
                <Bar
                  key={id}
                  dataKey={name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  opacity={0.7}
                />
              );
            }
            return (
              <Line
                key={id}
                type="monotone"
                dataKey={name}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 3 }}
                activeDot={{ r: 5 }}
              />
            );
          })}
        </ComposedChart>
      );
    }

    // Default line chart
    return (
      <LineChart data={chartData}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />
        )}
        <XAxis
          dataKey="date"
          stroke="var(--ff-text-muted)"
          tick={{ fill: 'var(--ff-text-muted)', fontSize: 12 }}
        />
        <YAxis
          stroke="var(--ff-text-muted)"
          tick={{ fill: 'var(--ff-text-muted)', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: 'var(--ff-text-secondary)' }}
          iconType="line"
        />
        {Array.from(topicNames.entries()).map(([id, name], index) => (
          <Line
            key={id}
            type="monotone"
            dataKey={name}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <div className="card-ff">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-s text-white">Trend Analysis</h2>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p as '7d' | '30d' | '90d')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  period === p
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === '7d' ? 'Week' : p === '30d' ? 'Month' : 'Quarter'}
              </button>
            ))}
            <button
              onClick={() => onPeriodChange('custom')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1 ${
                period === 'custom'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar size={14} />
              Custom
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                chartType === 'line'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                chartType === 'area'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('composed')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                chartType === 'composed'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Mixed
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="button-secondary button-small"
          >
            Grid {showGrid ? 'Off' : 'On'}
          </button>
          <button
            onClick={exportData}
            className="button-secondary button-small flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ff-purple-500)]"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            {topicIds.length === 0
              ? 'Select topics to view trends'
              : 'No trend data available for selected topics'
            }
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      {/* Trend Summary */}
      {!loading && chartData.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--ff-border)] grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from(topicNames.entries()).slice(0, 3).map(([id, name]) => {
            const data = chartData.map(d => Number(d[name] || 0));
            const trend = data[data.length - 1] > data[0] ? 'increasing' :
                         data[data.length - 1] < data[0] ? 'decreasing' : 'stable';
            const changePercent = data[0] === 0 ? 100 :
              Math.round(((data[data.length - 1] - data[0]) / data[0]) * 100);

            return (
              <div key={id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{name}</p>
                  <p className="text-lg font-medium text-white mt-1">
                    {data.reduce((a, b) => a + b, 0)} mentions
                  </p>
                </div>
                <div className={`text-sm font-medium ${
                  trend === 'increasing' ? 'text-green-500' :
                  trend === 'decreasing' ? 'text-red-500' :
                  'text-gray-400'
                }`}>
                  {changePercent > 0 ? '+' : ''}{changePercent}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}