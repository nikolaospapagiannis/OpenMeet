'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { PaceAnalysis, PaceSegment } from './TalkPatternAnalysis';

interface PaceAnalysisChartProps {
  paceAnalysis: PaceAnalysis;
}

// Speaker colors matching the pie chart
const SPEAKER_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  '#7a5af8', // Purple
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getVariationBadge(variation: string) {
  switch (variation) {
    case 'consistent':
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Consistent</Badge>;
    case 'variable':
      return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">Variable</Badge>;
    case 'erratic':
      return <Badge variant="destructive">Erratic</Badge>;
    default:
      return null;
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
        <p className="text-white font-medium">Time: {formatTime(data.time)}</p>
        <p className="text-sm text-gray-300">
          Speaker: {data.speaker}
        </p>
        <p className="text-sm text-gray-300">
          Pace: {data.pace} WPM
        </p>
        {data.text && (
          <p className="text-xs text-gray-400 mt-2 max-w-xs">
            "{data.text}..."
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function PaceAnalysisChart({ paceAnalysis }: PaceAnalysisChartProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);

  // Prepare chart data
  const chartData = paceAnalysis.paceBySegment.map((segment, index) => {
    // Assign colors to speakers if not already assigned
    if (!SPEAKER_COLORS[segment.speaker]) {
      const colorIndex = Object.keys(SPEAKER_COLORS).length;
      SPEAKER_COLORS[segment.speaker] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    }

    return {
      time: segment.startTime,
      pace: segment.pace,
      speaker: segment.speaker,
      text: segment.text,
      color: SPEAKER_COLORS[segment.speaker],
    };
  });

  // Filter data by selected speaker
  const filteredData = selectedSpeaker
    ? chartData.filter(d => d.speaker === selectedSpeaker)
    : chartData;

  // Get unique speakers for toggle buttons
  const speakers = Array.from(new Set(chartData.map(d => d.speaker)));

  // Optimal pace range
  const OPTIMAL_MIN = 120;
  const OPTIMAL_MAX = 150;

  return (
    <div className="space-y-6">
      <CardGlass variant="default" hover>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Speaking Pace Analysis</h3>
          </div>
          <div className="flex items-center gap-2">
            {getVariationBadge(paceAnalysis.paceVariation)}
            <Badge variant="outline" className="text-gray-300">
              Avg: {paceAnalysis.overallPace} WPM
            </Badge>
          </div>
        </div>

        {/* Speaker Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={selectedSpeaker === null ? 'default' : 'outline'}
            onClick={() => setSelectedSpeaker(null)}
          >
            All Speakers
          </Button>
          {speakers.map(speaker => (
            <Button
              key={speaker}
              size="sm"
              variant={selectedSpeaker === speaker ? 'default' : 'outline'}
              onClick={() => setSelectedSpeaker(speaker)}
              style={{
                borderColor: selectedSpeaker === speaker ? SPEAKER_COLORS[speaker] : undefined,
                backgroundColor: selectedSpeaker === speaker ? SPEAKER_COLORS[speaker] + '20' : undefined,
              }}
            >
              {speaker}
            </Button>
          ))}
        </div>

        {/* Line Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              domain={[0, 200]}
              ticks={[0, 50, 100, 120, 150, 200]}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              label={{
                value: 'Words Per Minute',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#94a3b8' },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Optimal pace range */}
            <ReferenceArea
              y1={OPTIMAL_MIN}
              y2={OPTIMAL_MAX}
              fill="#22c55e"
              fillOpacity={0.1}
              label={{
                value: 'Optimal Range',
                position: 'insideTopRight',
                style: { fill: '#22c55e', fontSize: '12px' },
              }}
            />

            {/* Reference lines */}
            <ReferenceLine
              y={OPTIMAL_MIN}
              stroke="#22c55e"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={OPTIMAL_MAX}
              stroke="#22c55e"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={160}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              label={{
                value: 'Fast',
                position: 'insideTopRight',
                style: { fill: '#f59e0b', fontSize: '10px' },
              }}
            />
            <ReferenceLine
              y={100}
              stroke="#3b82f6"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              label={{
                value: 'Slow',
                position: 'insideTopRight',
                style: { fill: '#3b82f6', fontSize: '10px' },
              }}
            />

            {/* Line for each data point */}
            <Line
              type="monotone"
              dataKey="pace"
              stroke="#7a5af8"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.color}
                    stroke={payload.color}
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardGlass>

      {/* Fast and Slow Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Segments */}
        {paceAnalysis.fastSegments.length > 0 && (
          <CardGlass variant="default">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h4 className="font-medium text-white">Fast Segments (&gt;160 WPM)</h4>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="space-y-2">
              {paceAnalysis.fastSegments.map((segment, index) => (
                <div key={index} className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-white">{segment.speaker}</span>
                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
                      {segment.pace} WPM
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">"{segment.text}..."</p>
                </div>
              ))}
            </div>
          </CardGlass>
        )}

        {/* Slow Segments */}
        {paceAnalysis.slowSegments.length > 0 && (
          <CardGlass variant="default">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-blue-400" />
              <h4 className="font-medium text-white">Slow Segments (&lt;120 WPM)</h4>
            </div>
            <div className="space-y-2">
              {paceAnalysis.slowSegments.map((segment, index) => (
                <div key={index} className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-white">{segment.speaker}</span>
                    <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                      {segment.pace} WPM
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">"{segment.text}..."</p>
                </div>
              ))}
            </div>
          </CardGlass>
        )}
      </div>

      {/* Recommendations */}
      {paceAnalysis.recommendations.length > 0 && (
        <CardGlass variant="default">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-white">Pace Recommendations</h4>
          </div>
          <ul className="space-y-2">
            {paceAnalysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardGlass>
      )}
    </div>
  );
}