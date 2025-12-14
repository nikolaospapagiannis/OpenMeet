'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { darkChartTheme } from '@/lib/chart-theme';
import { CardGlass } from '@/components/ui/card-glass';
import { Clock } from 'lucide-react';

interface DurationBarChartProps {
  data: Array<{ name: string; duration: number }>;
}

const COLORS = ['#14b8a6', '#06b6d4', '#a855f7', '#ec4899', '#f59e0b'];

export function DurationBarChart({ data }: DurationBarChartProps) {
  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Meeting Duration by Type</h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid {...darkChartTheme.cartesianGrid} />
          <XAxis
            dataKey="name"
            {...darkChartTheme.xAxis}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            {...darkChartTheme.yAxis}
            tick={{ fill: '#94a3b8' }}
            label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#64748b' }}
          />
          <Tooltip {...darkChartTheme.tooltip} />
          <Bar
            dataKey="duration"
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardGlass>
  );
}
