/**
 * UsageHistory Component
 * Historical usage chart with time period selection
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Calendar, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

export type TimePeriod = 'hour' | 'day' | 'week' | 'month';
export type ChartType = 'area' | 'line' | 'bar';

interface UsageDataPoint {
  timestamp: string;
  apiCalls: number;
  storage: number;
  transcriptionMinutes: number;
  limit: number;
}

interface UsageHistoryProps {
  data?: UsageDataPoint[];
  period?: TimePeriod;
  chartType?: ChartType;
  onPeriodChange?: (period: TimePeriod) => void;
  className?: string;
  showLegend?: boolean;
  height?: number;
}

export function UsageHistory({
  data = generateMockData('day'),
  period = 'day',
  chartType = 'area',
  onPeriodChange,
  className,
  showLegend = true,
  height = 300,
}: UsageHistoryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(period);
  const [selectedChart, setSelectedChart] = useState<ChartType>(chartType);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'apiCalls' | 'storage' | 'transcription'>('all');

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const formatXAxis = (value: string) => {
    const date = new Date(value);
    switch (selectedPeriod) {
      case 'hour':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case 'day':
        return date.toLocaleTimeString('en-US', { hour: '2-digit' });
      case 'week':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case 'month':
        return date.toLocaleDateString('en-US', { day: '2-digit' });
      default:
        return value;
    }
  };

  const formatTooltip = (value: number, name: string) => {
    switch (name) {
      case 'apiCalls':
        return [`${value.toLocaleString()} calls`, 'API Calls'];
      case 'storage':
        return [`${(value / 1024).toFixed(2)} GB`, 'Storage'];
      case 'transcriptionMinutes':
        return [`${value.toLocaleString()} min`, 'Transcription'];
      case 'limit':
        return [`${value.toLocaleString()}`, 'Limit'];
      default:
        return [value.toLocaleString(), name];
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg p-3">
        <p className="text-xs text-slate-400 mb-2">
          {new Date(label).toLocaleString()}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-300">{formatTooltip(entry.value, entry.dataKey)[1]}:</span>
            <span className="text-white font-medium">
              {formatTooltip(entry.value, entry.dataKey)[0]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, bottom: 0, left: 0 },
    };

    const getStrokeColor = (metric: string) => {
      const colors = {
        apiCalls: '#14b8a6', // teal-500
        storage: '#a78bfa', // purple-400
        transcriptionMinutes: '#67e8f9', // cyan-300
        limit: '#ef4444', // red-500
      };
      return colors[metric as keyof typeof colors] || '#64748b';
    };

    const renderMetric = (metric: string, color: string) => {
      if (selectedMetric !== 'all' && selectedMetric !== metric) return null;

      switch (selectedChart) {
        case 'area':
          return (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          );
        case 'line':
          return (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          );
        case 'bar':
          return (
            <Bar
              key={metric}
              dataKey={metric}
              fill={color}
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
            />
          );
        default:
          return null;
      }
    };

    const ChartComponent = selectedChart === 'bar' ? BarChart : selectedChart === 'line' ? LineChart : AreaChart;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatXAxis}
            stroke="#64748b"
            fontSize={12}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}

          {/* Reference line for limit */}
          {selectedMetric === 'apiCalls' && (
            <ReferenceLine
              y={data[0]?.limit || 0}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ value: 'Limit', fill: '#ef4444', fontSize: 10 }}
            />
          )}

          {renderMetric('apiCalls', getStrokeColor('apiCalls'))}
          {renderMetric('storage', getStrokeColor('storage'))}
          {renderMetric('transcriptionMinutes', getStrokeColor('transcriptionMinutes'))}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <CardGlass variant="default" hover className={className}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h3 className="text-xl font-semibold text-white">Usage History</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric selector */}
            <div className="flex items-center rounded-lg bg-slate-800/50 p-1">
              <Button
                variant={selectedMetric === 'all' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMetric('all')}
                className="px-3 py-1"
              >
                All
              </Button>
              <Button
                variant={selectedMetric === 'apiCalls' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMetric('apiCalls')}
                className="px-3 py-1"
              >
                API
              </Button>
              <Button
                variant={selectedMetric === 'storage' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMetric('storage')}
                className="px-3 py-1"
              >
                Storage
              </Button>
              <Button
                variant={selectedMetric === 'transcription' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMetric('transcription')}
                className="px-3 py-1"
              >
                Transcription
              </Button>
            </div>

            {/* Chart type selector */}
            <div className="flex items-center rounded-lg bg-slate-800/50 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChart('area')}
                className={cn(
                  'px-2 py-1',
                  selectedChart === 'area' && 'bg-slate-700 text-white'
                )}
                title="Area Chart"
              >
                <Activity className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChart('line')}
                className={cn(
                  'px-2 py-1',
                  selectedChart === 'line' && 'bg-slate-700 text-white'
                )}
                title="Line Chart"
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChart('bar')}
                className={cn(
                  'px-2 py-1',
                  selectedChart === 'bar' && 'bg-slate-700 text-white'
                )}
                title="Bar Chart"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Period selector */}
            <div className="flex items-center rounded-lg bg-slate-800/50 p-1">
              <Button
                variant={selectedPeriod === 'hour' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => handlePeriodChange('hour')}
                className="px-3 py-1"
              >
                1H
              </Button>
              <Button
                variant={selectedPeriod === 'day' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => handlePeriodChange('day')}
                className="px-3 py-1"
              >
                24H
              </Button>
              <Button
                variant={selectedPeriod === 'week' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => handlePeriodChange('week')}
                className="px-3 py-1"
              >
                7D
              </Button>
              <Button
                variant={selectedPeriod === 'month' ? 'gradient-primary' : 'ghost'}
                size="sm"
                onClick={() => handlePeriodChange('month')}
                className="px-3 py-1"
              >
                30D
              </Button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-4">
          {renderChart()}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <p className="text-xs text-slate-500">Total API Calls</p>
            <p className="text-xl font-bold text-teal-400">
              {data.reduce((sum, d) => sum + d.apiCalls, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Storage Used</p>
            <p className="text-xl font-bold text-purple-400">
              {(data.reduce((sum, d) => sum + d.storage, 0) / 1024).toFixed(1)} GB
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Transcription Minutes</p>
            <p className="text-xl font-bold text-cyan-400">
              {data.reduce((sum, d) => sum + d.transcriptionMinutes, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </CardGlass>
  );
}

// Mock data generator for demonstration
function generateMockData(period: TimePeriod): UsageDataPoint[] {
  const data: UsageDataPoint[] = [];
  const now = new Date();
  let points = 24;
  let interval = 60 * 60 * 1000; // 1 hour

  switch (period) {
    case 'hour':
      points = 60;
      interval = 60 * 1000; // 1 minute
      break;
    case 'day':
      points = 24;
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case 'week':
      points = 7;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
    case 'month':
      points = 30;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
  }

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * interval);
    data.push({
      timestamp: timestamp.toISOString(),
      apiCalls: Math.floor(Math.random() * 5000 + 2000),
      storage: Math.floor(Math.random() * 10000 + 5000),
      transcriptionMinutes: Math.floor(Math.random() * 200 + 50),
      limit: 10000,
    });
  }

  return data;
}