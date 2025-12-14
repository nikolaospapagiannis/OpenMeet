'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { darkChartTheme } from '@/lib/chart-theme';
import { CardGlass } from '@/components/ui/card-glass';
import { Users } from 'lucide-react';

interface SpeakerLineChartProps {
  data: Array<{ time: string; [key: string]: number | string }>;
  speakers: string[];
}

const SPEAKER_COLORS = ['#14b8a6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];

export function SpeakerLineChart({ data, speakers }: SpeakerLineChartProps) {
  return (
    <CardGlass variant="elevated" gradient>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Speaker Talk Time</h3>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid {...darkChartTheme.cartesianGrid} />
          <XAxis
            dataKey="time"
            {...darkChartTheme.xAxis}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            {...darkChartTheme.yAxis}
            tick={{ fill: '#94a3b8' }}
            label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: '#64748b' }}
          />
          <Tooltip {...darkChartTheme.tooltip} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {speakers.map((speaker, index) => (
            <Line
              key={speaker}
              type="monotone"
              dataKey={speaker}
              stroke={SPEAKER_COLORS[index % SPEAKER_COLORS.length]}
              strokeWidth={2}
              dot={{ fill: SPEAKER_COLORS[index % SPEAKER_COLORS.length], r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={1000}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </CardGlass>
  );
}
