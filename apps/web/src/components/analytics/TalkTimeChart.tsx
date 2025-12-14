'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CardGlass } from '@/components/ui/card-glass';
import { Clock, Filter } from 'lucide-react';

interface SpeakerData {
  speaker: string;
  talkTime: number;
  wordCount: number;
  talkTimePercentage: number;
}

interface TalkTimeChartProps {
  speakerData: SpeakerData[];
  onSpeakerClick?: (speaker: string) => void;
}

// Speaker color palette
const SPEAKER_COLORS = [
  '#7a5af8', // Purple
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-1">{data.name}</p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-300">
            Talk Time: <span className="font-semibold">{formatDuration(data.value)}</span>
          </p>
          <p className="text-gray-300">
            Percentage: <span className="font-semibold">{data.percentage}%</span>
          </p>
          <p className="text-gray-400">
            Words: <span className="font-medium">{data.wordCount.toLocaleString()}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function TalkTimeChart({ speakerData, onSpeakerClick }: TalkTimeChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);

  // Prepare data for pie chart
  const chartData = speakerData.map((speaker, index) => ({
    name: speaker.speaker,
    value: speaker.talkTime,
    percentage: speaker.talkTimePercentage,
    wordCount: speaker.wordCount,
    color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
  }));

  // Sort by talk time for better visualization
  const sortedData = [...chartData].sort((a, b) => b.value - a.value);
  const totalDuration = speakerData.reduce((sum, s) => sum + s.talkTime, 0);

  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handlePieLeave = () => {
    setActiveIndex(undefined);
  };

  const handleLegendClick = (speaker: string) => {
    setSelectedSpeaker(selectedSpeaker === speaker ? null : speaker);
    if (onSpeakerClick) {
      onSpeakerClick(speaker);
    }
  };

  // Calculate insights
  const dominantSpeaker = sortedData[0];
  const leastActiveSpeaker = sortedData[sortedData.length - 1];
  const isBalanced =
    dominantSpeaker.percentage < 40 && leastActiveSpeaker.percentage > 20;

  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Talk Time Distribution</h3>
        </div>
        {onSpeakerClick && (
          <button
            onClick={() => setSelectedSpeaker(null)}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Filter className="w-3 h-3" />
            {selectedSpeaker ? 'Clear Filter' : 'Click to filter'}
          </button>
        )}
      </div>

      {/* Total Duration */}
      <div className="text-center pb-4 mb-4 border-b border-gray-700">
        <p className="text-sm text-gray-400">Total Speaking Time</p>
        <p className="text-2xl font-bold text-white">
          {formatDuration(totalDuration)}
        </p>
      </div>

      {/* Pie Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => {
                const name = entry.name || '';
                const percentage = entry.payload?.percentage || 0;
                return `${name.split(' ')[0]} ${percentage}%`;
              }}
              outerRadius={110}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              animationDuration={800}
              onMouseEnter={handlePieEnter}
              onMouseLeave={handlePieLeave}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={
                    selectedSpeaker === null || selectedSpeaker === entry.name
                      ? 1
                      : 0.3
                  }
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onClick={() => handleLegendClick(entry.name)}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          Speakers (click to filter transcript)
        </p>
        {sortedData.map((speaker, index) => (
          <div
            key={speaker.name}
            onClick={() => handleLegendClick(speaker.name)}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            className={`
              flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer
              ${
                selectedSpeaker === speaker.name
                  ? 'bg-gray-800/70 border border-teal-500/50'
                  : 'bg-gray-800/30 border border-gray-700 hover:bg-gray-800/50'
              }
              ${activeIndex === index ? 'ring-2 ring-teal-500/30' : ''}
            `}
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: speaker.color }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white block truncate">
                  {speaker.name}
                </span>
                <span className="text-xs text-gray-400">
                  {speaker.wordCount.toLocaleString()} words
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-sm text-gray-400">
                {formatDuration(speaker.value)}
              </span>
              <span className="text-sm font-bold text-white min-w-[3rem] text-right">
                {speaker.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Key Insights */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          Key Insights
        </p>
        <div className="space-y-2">
          {isBalanced ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5" />
              <p className="text-sm text-green-300">
                Balanced participation across all speakers
              </p>
            </div>
          ) : (
            <>
              {dominantSpeaker.percentage > 50 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                  <p className="text-sm text-amber-300">
                    <span className="font-semibold">{dominantSpeaker.name}</span>{' '}
                    dominated the conversation ({dominantSpeaker.percentage}%)
                  </p>
                </div>
              )}
              {leastActiveSpeaker.percentage < 10 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <p className="text-sm text-blue-300">
                    <span className="font-semibold">{leastActiveSpeaker.name}</span>{' '}
                    had limited participation ({leastActiveSpeaker.percentage}%)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Speaking rate insights */}
          {sortedData.map((speaker) => {
            const wordsPerMinute = (speaker.wordCount / (speaker.value / 60)).toFixed(0);
            const wpm = parseInt(wordsPerMinute);
            if (wpm > 180) {
              return (
                <div
                  key={speaker.name}
                  className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5" />
                  <p className="text-sm text-purple-300">
                    <span className="font-semibold">{speaker.name}</span> speaking
                    quickly at {wordsPerMinute} words/min
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </CardGlass>
  );
}
