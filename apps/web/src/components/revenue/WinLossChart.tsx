'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Target, Users } from 'lucide-react';

interface WinLossChartProps {
  data: any;
}

const WIN_REASONS_COLORS = ['#22c55e', '#10b981', '#059669', '#047857', '#065f46'];
const LOSS_REASONS_COLORS = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];

export function WinLossChart({ data }: WinLossChartProps) {
  const processedData = useMemo(() => {
    if (!data) {
      // Demo data if no real data
      return {
        winRate: 32.5,
        totalWins: 24,
        totalLosses: 50,
        avgWonDealSize: 85000,
        avgLostDealSize: 45000,
        winReasons: [
          { name: 'Product Fit', value: 35, count: 8 },
          { name: 'Pricing', value: 25, count: 6 },
          { name: 'Relationship', value: 20, count: 5 },
          { name: 'Features', value: 15, count: 3 },
          { name: 'Support', value: 5, count: 2 },
        ],
        lossReasons: [
          { name: 'Pricing', value: 30, count: 15 },
          { name: 'Competition', value: 25, count: 12 },
          { name: 'Features Gap', value: 20, count: 10 },
          { name: 'Timing', value: 15, count: 8 },
          { name: 'Budget', value: 10, count: 5 },
        ],
        competitorAnalysis: [
          { name: 'Gong', wins: 5, losses: 12 },
          { name: 'Chorus', wins: 3, losses: 8 },
          { name: 'Revenue.io', wins: 8, losses: 4 },
          { name: 'No Competition', wins: 8, losses: 0 },
        ],
      };
    }

    // Transform real API data
    const winRate = data.winRate || 0;
    const totalWins = data.totalWins || 0;
    const totalLosses = data.totalLosses || 0;
    const avgWonDealSize = data.avgWonDealSize || 0;
    const avgLostDealSize = data.avgLostDealSize || 0;

    const winReasons = data.winReasons?.slice(0, 5) || [];
    const lossReasons = data.lossReasons?.slice(0, 5) || [];
    const competitorAnalysis = data.competitorAnalysis || [];

    return {
      winRate,
      totalWins,
      totalLosses,
      avgWonDealSize,
      avgLostDealSize,
      winReasons,
      lossReasons,
      competitorAnalysis,
    };
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-gray-300">
              {entry.name}: <span className="text-white font-medium">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Win Rate Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Win Rate</h3>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white">{processedData.winRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {processedData.totalWins} won / {processedData.totalWins + processedData.totalLosses} closed
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Avg Deal Size</h3>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-green-500">Won</p>
              <p className="text-lg font-bold text-white">{formatCurrency(processedData.avgWonDealSize)}</p>
            </div>
            <div className="text-gray-600">vs</div>
            <div>
              <p className="text-sm text-red-500">Lost</p>
              <p className="text-lg font-bold text-white">{formatCurrency(processedData.avgLostDealSize)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Win/Loss Reasons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Win Reasons */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">Top Win Reasons</h4>
          <div className="space-y-2">
            {processedData.winReasons.map((reason: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: WIN_REASONS_COLORS[index] }}
                  />
                  <span className="text-sm text-gray-300">{reason.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${reason.value}%`,
                        backgroundColor: WIN_REASONS_COLORS[index]
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{reason.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loss Reasons */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">Top Loss Reasons</h4>
          <div className="space-y-2">
            {processedData.lossReasons.map((reason: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: LOSS_REASONS_COLORS[index] }}
                  />
                  <span className="text-sm text-gray-300">{reason.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${reason.value}%`,
                        backgroundColor: LOSS_REASONS_COLORS[index]
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{reason.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitor Analysis */}
      {processedData.competitorAnalysis.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">Competitor Impact</h4>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.competitorAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="wins" fill="#22c55e" name="Wins" />
                <Bar dataKey="losses" fill="#ef4444" name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}