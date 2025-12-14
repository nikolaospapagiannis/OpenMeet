'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Clock } from 'lucide-react';
import { Interruption, SpeakerMetrics } from './TalkPatternAnalysis';

interface InterruptionChartProps {
  interruptions: Interruption[];
  speakerMetrics: SpeakerMetrics[];
}

const SPEAKER_COLORS = [
  '#7a5af8', // Purple
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
];

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
        <p className="text-white font-medium">{payload[0].payload.speaker}</p>
        <p className="text-sm text-gray-300">
          Interruptions Made: {payload[0].value}
        </p>
        <p className="text-sm text-gray-300">
          Interruptions Received: {payload[1]?.value || 0}
        </p>
      </div>
    );
  }
  return null;
};

export function InterruptionChart({ interruptions, speakerMetrics }: InterruptionChartProps) {
  // Prepare chart data
  const chartData = speakerMetrics.map((speaker, index) => ({
    speaker: speaker.speaker,
    made: speaker.interruptionsMade,
    received: speaker.interruptionsReceived,
    color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
  }));

  // Calculate interruption types
  const interruptionTypes = {
    overlap: interruptions.filter(i => i.type === 'overlap').length,
    quickTakeover: interruptions.filter(i => i.type === 'quick_takeover').length,
    normal: interruptions.filter(i => i.type === 'normal').length,
  };

  // Sort interruptions by timestamp for timeline view
  const recentInterruptions = [...interruptions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const getInterruptionBadge = (type: string) => {
    switch (type) {
      case 'overlap':
        return <Badge variant="destructive" className="text-xs">Overlap</Badge>;
      case 'quick_takeover':
        return <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">Quick</Badge>;
      case 'normal':
        return <Badge variant="secondary" className="text-xs">Normal</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Chart */}
      <CardGlass variant="default" hover>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Interruption Analysis</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-gray-300">
              Total: {interruptions.length}
            </Badge>
            {interruptions.length > 10 && (
              <Badge variant="destructive" className="text-xs">
                High Activity
              </Badge>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="speaker" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="made" name="Interruptions Made" fill="#7a5af8">
              {chartData.map((entry, index) => (
                <Cell key={`cell-made-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Bar dataKey="received" name="Interruptions Received" fill="#94a3b8" fillOpacity={0.5}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-received-${index}`} fill={entry.color} fillOpacity={0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardGlass>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interruption Types */}
        <CardGlass variant="default">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h4 className="font-medium text-white">Interruption Types</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded border border-red-500/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-white">Overlaps</span>
                <span className="text-xs text-gray-400">(Speaking simultaneously)</span>
              </div>
              <span className="text-lg font-semibold text-red-400">
                {interruptionTypes.overlap}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded border border-amber-500/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-sm text-white">Quick Takeovers</span>
                <span className="text-xs text-gray-400">(&lt;0.3s gap)</span>
              </div>
              <span className="text-lg font-semibold text-amber-400">
                {interruptionTypes.quickTakeover}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-500/10 rounded border border-gray-500/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-sm text-white">Normal Transitions</span>
                <span className="text-xs text-gray-400">(0.3-0.5s gap)</span>
              </div>
              <span className="text-lg font-semibold text-gray-400">
                {interruptionTypes.normal}
              </span>
            </div>
          </div>

          {interruptionTypes.overlap > 5 && (
            <div className="mt-4 p-3 bg-red-500/10 rounded border border-red-500/20">
              <p className="text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                High number of overlapping interruptions detected. Consider establishing clearer turn-taking rules.
              </p>
            </div>
          )}
        </CardGlass>

        {/* Recent Interruptions Timeline */}
        <CardGlass variant="default">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-white">Recent Interruptions</h4>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentInterruptions.length > 0 ? (
              recentInterruptions.map((interruption) => (
                <div
                  key={interruption.id}
                  className="p-2 bg-gray-800/50 rounded border border-gray-700 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatTime(interruption.timestamp)}
                      </span>
                      {getInterruptionBadge(interruption.type)}
                    </div>
                    {interruption.gapTime < 0 && (
                      <span className="text-xs text-red-400">
                        {Math.abs(interruption.gapTime * 1000).toFixed(0)}ms overlap
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-white font-medium">{interruption.interrupter}</span>
                    <span className="text-gray-400"> interrupted </span>
                    <span className="text-white font-medium">{interruption.interrupted}</span>
                  </div>
                  {interruption.context && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      "{interruption.context}"
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No interruptions detected</p>
              </div>
            )}
          </div>
        </CardGlass>
      </div>

      {/* Insights */}
      {interruptions.length > 0 && (
        <CardGlass variant="default">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-white">Interruption Insights</h4>
          </div>
          <div className="space-y-2">
            {chartData.some(d => d.made > d.received * 2) && (
              <p className="text-sm text-amber-400">
                • Some speakers interrupt significantly more than they are interrupted
              </p>
            )}
            {interruptionTypes.overlap / interruptions.length > 0.3 && (
              <p className="text-sm text-red-400">
                • High proportion of overlapping speech indicates heated discussion or poor audio quality
              </p>
            )}
            {interruptions.length < 3 && (
              <p className="text-sm text-green-400">
                • Low interruption count indicates respectful turn-taking
              </p>
            )}
          </div>
        </CardGlass>
      )}
    </div>
  );
}