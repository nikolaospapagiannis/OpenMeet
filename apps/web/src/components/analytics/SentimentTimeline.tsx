'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  MapPin,
} from 'lucide-react';

interface SentimentData {
  timestamp: number;
  sentiment: number;
  speaker: string;
  text: string;
}

interface SentimentTimelineProps {
  data: SentimentData[];
  duration: number;
  onMomentClick?: (timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getSentimentLabel(sentiment: number): {
  label: string;
  color: string;
  icon: any;
} {
  if (sentiment >= 0.5) {
    return { label: 'Positive', color: 'green', icon: Smile };
  } else if (sentiment >= -0.2) {
    return { label: 'Neutral', color: 'blue', icon: Meh };
  } else {
    return { label: 'Negative', color: 'red', icon: Frown };
  }
}

const CustomTooltip = ({ active, payload, onMomentClick }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    const sentimentInfo = getSentimentLabel(data.sentiment);
    const Icon = sentimentInfo.icon;

    return (
      <div
        className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl max-w-xs cursor-pointer hover:border-teal-500 transition-colors"
        onClick={() => onMomentClick && onMomentClick(data.timestamp)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">{formatTime(data.timestamp)}</span>
          <Badge
            variant="secondary"
            className={`text-xs bg-${sentimentInfo.color}-500/20 text-${sentimentInfo.color}-400`}
          >
            <Icon className="w-3 h-3 mr-1" />
            {sentimentInfo.label}
          </Badge>
        </div>
        <p className="text-sm font-medium text-white mb-1">{data.speaker}</p>
        <p className="text-xs text-gray-300 line-clamp-3">{data.text}</p>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Score: <span className="font-semibold">{data.sentiment.toFixed(2)}</span>
          </p>
        </div>
        {onMomentClick && (
          <p className="text-xs text-teal-400 mt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Click to jump to this moment
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function SentimentTimeline({
  data,
  duration,
  onMomentClick,
}: SentimentTimelineProps) {
  const [highlightedMoment, setHighlightedMoment] = useState<number | null>(null);

  // Process data for chart
  const chartData = data
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((d) => ({
      ...d,
      time: formatTime(d.timestamp),
      timeSeconds: d.timestamp,
    }));

  // Calculate statistics
  const avgSentiment =
    data.reduce((sum, d) => sum + d.sentiment, 0) / data.length;
  const maxSentiment = Math.max(...data.map((d) => d.sentiment));
  const minSentiment = Math.min(...data.map((d) => d.sentiment));

  // Find notable moments (extreme sentiment changes)
  const notableMoments = chartData.filter(
    (d) => Math.abs(d.sentiment) > 0.7
  );

  // Calculate sentiment trend
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstHalfAvg =
    firstHalf.reduce((sum, d) => sum + d.sentiment, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, d) => sum + d.sentiment, 0) / secondHalf.length;
  const trend = secondHalfAvg - firstHalfAvg;

  const handleMomentClick = (timestamp: number) => {
    setHighlightedMoment(timestamp);
    if (onMomentClick) {
      onMomentClick(timestamp);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Meh className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Average</div>
              <div className="text-lg font-bold text-white">
                {avgSentiment.toFixed(2)}
              </div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Smile className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Most Positive</div>
              <div className="text-lg font-bold text-white">
                {maxSentiment.toFixed(2)}
              </div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Frown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Most Negative</div>
              <div className="text-lg font-bold text-white">
                {minSentiment.toFixed(2)}
              </div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${
                trend > 0 ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
              } border flex items-center justify-center`}
            >
              {trend > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <div className="text-xs text-gray-400">Trend</div>
              <div
                className={`text-lg font-bold ${
                  trend > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {trend > 0 ? '+' : ''}
                {trend.toFixed(2)}
              </div>
            </div>
          </div>
        </CardGlass>
      </div>

      {/* Timeline Chart */}
      <CardGlass variant="default" hover>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Sentiment Over Time</h3>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7a5af8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7a5af8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
            />
            <Tooltip
              content={<CustomTooltip onMomentClick={handleMomentClick} />}
              cursor={{ stroke: '#7a5af8', strokeWidth: 2 }}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="sentiment"
              stroke="#7a5af8"
              strokeWidth={3}
              fill="url(#colorSentiment)"
              animationDuration={1000}
            />

            {/* Mark notable moments */}
            {notableMoments.map((moment, idx) => (
              <ReferenceLine
                key={idx}
                x={moment.time}
                stroke={moment.sentiment > 0 ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400">Positive (&gt; 0.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-400">Neutral (-0.2 to 0.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-400">Negative (&lt; -0.2)</span>
          </div>
        </div>
      </CardGlass>

      {/* Notable Moments */}
      {notableMoments.length > 0 && (
        <CardGlass variant="default">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-purple-400" />
            <h4 className="font-semibold text-white">Notable Moments</h4>
          </div>
          <div className="space-y-3">
            {notableMoments.slice(0, 5).map((moment, idx) => {
              const sentimentInfo = getSentimentLabel(moment.sentiment);
              const Icon = sentimentInfo.icon;
              return (
                <div
                  key={idx}
                  onClick={() => handleMomentClick(moment.timestamp)}
                  className={`
                    p-3 rounded-lg border transition-all cursor-pointer
                    ${
                      highlightedMoment === moment.timestamp
                        ? 'bg-gray-800/70 border-teal-500'
                        : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${sentimentInfo.color}-400`} />
                      <span className="text-sm font-medium text-white">
                        {moment.speaker}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs bg-${sentimentInfo.color}-500/20 text-${sentimentInfo.color}-400`}
                      >
                        {sentimentInfo.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-400">{moment.time}</span>
                  </div>
                  <p className="text-sm text-gray-300">{moment.text}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      Score: {moment.sentiment.toFixed(2)}
                    </span>
                    {onMomentClick && (
                      <span className="text-xs text-teal-400 ml-auto flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Jump to moment
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardGlass>
      )}

      {/* Insights */}
      <CardGlass variant="default">
        <h4 className="font-semibold text-white mb-4">Sentiment Analysis Insights</h4>
        <div className="space-y-2">
          {avgSentiment > 0.5 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Smile className="w-4 h-4 text-green-400 mt-0.5" />
              <p className="text-sm text-green-300">
                Overall positive meeting with high engagement and enthusiasm
              </p>
            </div>
          )}
          {avgSentiment < -0.2 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <Frown className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-sm text-red-300">
                Negative sentiment detected - consider follow-up to address concerns
              </p>
            </div>
          )}
          {trend > 0.3 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <TrendingUp className="w-4 h-4 text-green-400 mt-0.5" />
              <p className="text-sm text-green-300">
                Sentiment improved throughout the meeting - positive trajectory
              </p>
            </div>
          )}
          {trend < -0.3 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <TrendingDown className="w-4 h-4 text-amber-400 mt-0.5" />
              <p className="text-sm text-amber-300">
                Sentiment declined during meeting - may need addressing
              </p>
            </div>
          )}
          {Math.abs(maxSentiment - minSentiment) > 1.5 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
              <p className="text-sm text-blue-300">
                High sentiment variation - diverse emotional responses during discussion
              </p>
            </div>
          )}
        </div>
      </CardGlass>
    </div>
  );
}
