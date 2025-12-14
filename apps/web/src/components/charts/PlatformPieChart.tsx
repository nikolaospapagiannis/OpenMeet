'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CardGlass } from '@/components/ui/card-glass';
import { Video } from 'lucide-react';

interface PlatformPieChartProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = {
  'Zoom': '#2D8CFF',
  'Google Meet': '#34A853',
  'Microsoft Teams': '#5B5FC7',
  'Other': '#94a3b8'
};

export function PlatformPieChart({ data }: PlatformPieChartProps) {
  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center gap-2 mb-6">
        <Video className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Platform Distribution</h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Other}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </CardGlass>
  );
}
