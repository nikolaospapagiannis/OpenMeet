'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { darkChartTheme, ChartGradients } from '@/lib/chart-theme';
import { CardGlass } from '@/components/ui/card-glass';
import { TrendingUp } from 'lucide-react';

interface MeetingTrendsChartProps {
  data: Array<{ date: string; meetings: number; duration: number }>;
}

export function MeetingTrendsChart({ data }: MeetingTrendsChartProps) {
  return (
    <CardGlass variant="elevated" gradient>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-white">Meeting Trends</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500"></div>
            <span className="text-slate-400">Meetings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-slate-400">Duration (hrs)</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <ChartGradients />
          <CartesianGrid {...darkChartTheme.cartesianGrid} />
          <XAxis
            dataKey="date"
            {...darkChartTheme.xAxis}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            {...darkChartTheme.yAxis}
            tick={{ fill: '#94a3b8' }}
          />
          <Tooltip {...darkChartTheme.tooltip} />
          <Area
            type="monotone"
            dataKey="meetings"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#colorTeal)"
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="duration"
            stroke="#a855f7"
            strokeWidth={2}
            fill="url(#colorPurple)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </CardGlass>
  );
}
