'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CardGlass } from '@/components/ui/card-glass';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import { SpeakerMetrics } from './TalkPatternAnalysis';

interface TalkTimeDistributionProps {
  speakerMetrics: SpeakerMetrics[];
}

// Speaker color palette using design system colors
const SPEAKER_COLORS = [
  '#7a5af8', // --ff-purple-500
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
        <p className="text-white font-medium">{data.name}</p>
        <p className="text-sm text-gray-300">
          Talk Time: {formatDuration(data.value)}
        </p>
        <p className="text-sm text-gray-300">
          Percentage: {data.percentage}%
        </p>
        <p className="text-sm text-gray-400">
          Word Count: {data.wordCount.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};


function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function TalkTimeDistribution({ speakerMetrics }: TalkTimeDistributionProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Prepare data for pie chart
  const chartData = speakerMetrics.map((speaker, index) => ({
    name: speaker.speaker,
    value: speaker.talkTime,
    percentage: speaker.talkTimePercentage,
    wordCount: speaker.wordCount,
    color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
  }));

  // Sort by talk time for better visualization
  chartData.sort((a, b) => b.value - a.value);

  const totalDuration = speakerMetrics.reduce((sum, s) => sum + s.talkTime, 0);

  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handlePieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Talk Time Distribution</h3>
      </div>

      <div className="space-y-4">
        {/* Total Duration Summary */}
        <div className="text-center pb-4 border-b border-gray-700">
          <p className="text-sm text-gray-400">Total Meeting Duration</p>
          <p className="text-2xl font-bold text-white">
            {formatDuration(totalDuration)}
          </p>
        </div>

        {/* Pie Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              animationDuration={800}
              onMouseEnter={handlePieEnter}
              onMouseLeave={handlePieLeave}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="grid grid-cols-1 gap-2 pt-4 border-t border-gray-700">
          {chartData.map((speaker, index) => (
            <div
              key={speaker.name}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-800/50 transition-colors cursor-pointer"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: speaker.color }}
                />
                <span className="text-sm text-gray-300">{speaker.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {formatDuration(speaker.value)}
                </span>
                <span className="text-sm font-medium text-white">
                  {speaker.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Insights */}
        {speakerMetrics.length > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Key Insights
            </p>
            {chartData[0].percentage > 50 && (
              <p className="text-sm text-amber-400">
                ⚠ {chartData[0].name} dominated the conversation ({chartData[0].percentage}%)
              </p>
            )}
            {chartData[chartData.length - 1].percentage < 10 && (
              <p className="text-sm text-amber-400">
                ⚠ {chartData[chartData.length - 1].name} had limited participation (
                {chartData[chartData.length - 1].percentage}%)
              </p>
            )}
            {chartData[0].percentage < 40 &&
              chartData[chartData.length - 1].percentage > 20 && (
                <p className="text-sm text-green-400">
                  ✓ Balanced participation across speakers
                </p>
              )}
          </div>
        )}
      </div>
    </CardGlass>
  );
}