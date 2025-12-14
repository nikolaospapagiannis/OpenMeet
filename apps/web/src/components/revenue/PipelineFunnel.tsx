'use client';

import { useMemo } from 'react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineFunnelProps {
  data: any;
}

const STAGE_COLORS = {
  DISCOVERY: '#8b5cf6',      // Purple
  QUALIFICATION: '#6366f1',  // Indigo
  PROPOSAL: '#3b82f6',        // Blue
  NEGOTIATION: '#06b6d4',     // Cyan
  CLOSED_WON: '#22c55e',      // Green
  CLOSED_LOST: '#ef4444',     // Red
};

const STAGE_LABELS = {
  DISCOVERY: 'Discovery',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

export function PipelineFunnel({ data }: PipelineFunnelProps) {
  const funnelData = useMemo(() => {
    if (!data || !data.stageBreakdown) {
      // Use demo data if no real data
      return [
        { name: 'Discovery', value: 45, deals: 45, amount: 2250000 },
        { name: 'Qualification', value: 32, deals: 32, amount: 1920000 },
        { name: 'Proposal', value: 24, deals: 24, amount: 1680000 },
        { name: 'Negotiation', value: 18, deals: 18, amount: 1440000 },
        { name: 'Closed Won', value: 12, deals: 12, amount: 1080000 },
      ];
    }

    // Transform real data from API
    const stages = ['DISCOVERY', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];
    return stages
      .filter(stage => data.stageBreakdown[stage])
      .map(stage => ({
        name: STAGE_LABELS[stage],
        value: data.stageBreakdown[stage].count || 0,
        deals: data.stageBreakdown[stage].count || 0,
        amount: data.stageBreakdown[stage].totalValue || 0,
        conversionRate: data.stageBreakdown[stage].conversionRate || 0,
      }));
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">
              Deals: <span className="text-white font-medium">{data.deals}</span>
            </p>
            <p className="text-gray-300">
              Value: <span className="text-white font-medium">{formatCurrency(data.amount)}</span>
            </p>
            {data.conversionRate > 0 && (
              <p className="text-gray-300">
                Conversion: <span className="text-white font-medium">{data.conversionRate.toFixed(1)}%</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const totalValue = funnelData.reduce((sum, stage) => sum + stage.amount, 0);
  const totalDeals = funnelData.reduce((sum, stage) => sum + stage.deals, 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-sm">Total Value</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400 text-sm">Total Deals</p>
          <p className="text-xl font-bold text-white">{totalDeals}</p>
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip content={<CustomTooltip />} />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive
            >
              {funnelData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={Object.values(STAGE_COLORS)[index] || '#8884d8'}
                  stroke="transparent"
                />
              ))}
              <LabelList
                position="center"
                fill="#fff"
                fontSize={12}
                formatter={(value: any, entry: any) => `${entry.payload.name}\n${entry.payload.deals} deals`}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>

      {/* Stage Breakdown */}
      <div className="space-y-2">
        {funnelData.map((stage, index) => {
          const percentage = totalDeals > 0 ? (stage.deals / totalDeals) * 100 : 0;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: Object.values(STAGE_COLORS)[index] }}
                />
                <span className="text-sm text-gray-300">{stage.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{stage.deals} deals</span>
                <span className="text-sm text-white font-medium">{formatCurrency(stage.amount)}</span>
                <div className="w-20 bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: Object.values(STAGE_COLORS)[index]
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}