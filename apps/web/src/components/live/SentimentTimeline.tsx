/**
 * Live Sentiment Timeline Component
 *
 * Real-time visualization of meeting sentiment using Recharts
 * Shows sentiment score over time with live WebSocket updates
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { useLiveSentiment } from '@/hooks/useLiveSentiment';
import EmotionBreakdown from './EmotionBreakdown';
import SentimentAlert from './SentimentAlert';

interface SentimentTimelineProps {
  sessionId: string;
  height?: number;
  showEmotions?: boolean;
  showAlerts?: boolean;
  timeWindow?: '5min' | '15min' | 'all';
  showSpeakers?: boolean;
}

export default function SentimentTimeline({
  sessionId,
  height = 300,
  showEmotions = true,
  showAlerts = true,
  timeWindow = '15min',
  showSpeakers = false
}: SentimentTimelineProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const {
    data,
    alerts,
    speakers,
    isConnected,
    error,
    reconnect,
    acknowledgeAlert,
    clearData
  } = useLiveSentiment({
    sessionId,
    maxDataPoints: 200,
    onAlert: (alert) => {
      console.log('New alert:', alert);
    }
  });

  // Filter data based on time window
  const filteredData = useMemo(() => {
    if (timeWindow === 'all') return data;

    const now = Date.now();
    const windowMs = timeWindow === '5min' ? 5 * 60 * 1000 : 15 * 60 * 1000;
    const cutoff = now - windowMs;

    return data.filter(d => d.timestamp > cutoff);
  }, [data, timeWindow]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const dataToUse = selectedSpeaker && speakers.has(selectedSpeaker)
      ? speakers.get(selectedSpeaker)!
      : filteredData;

    return dataToUse.map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        minute: '2-digit',
        second: '2-digit'
      }),
      timestamp: d.timestamp,
      sentiment: Number(d.sentiment.overall.toFixed(3)),
      positive: d.sentiment.positive,
      negative: -Math.abs(d.sentiment.negative), // Make negative for visualization
      neutral: d.sentiment.neutral,
      engagement: d.engagement,
      speaker: d.speaker || 'Unknown',
      text: d.text.substring(0, 100) + (d.text.length > 100 ? '...' : ''),
      emotions: d.emotions,
      tone: d.tone
    }));
  }, [filteredData, selectedSpeaker, speakers]);

  // Calculate aggregated emotions for the current view
  const aggregatedEmotions = useMemo(() => {
    if (chartData.length === 0) return null;

    const emotions = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      trust: 0,
      anticipation: 0,
      disgust: 0
    };

    chartData.forEach(d => {
      if (d.emotions) {
        Object.keys(emotions).forEach(key => {
          emotions[key as keyof typeof emotions] += d.emotions[key as keyof typeof emotions];
        });
      }
    });

    // Average the emotions
    const count = chartData.length;
    Object.keys(emotions).forEach(key => {
      emotions[key as keyof typeof emotions] /= count;
    });

    return emotions;
  }, [chartData]);

  // Get unique speakers
  const uniqueSpeakers = useMemo(() => {
    return Array.from(speakers.keys());
  }, [speakers]);

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--ff-bg-layer)] p-3 rounded-lg border border-[var(--ff-border)] shadow-xl">
          <p className="text-sm font-semibold mb-2 text-white">{data.time}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ff-text-muted)]">Sentiment:</span>
              <span
                className={`text-sm font-bold ${
                  data.sentiment > 0.3 ? 'text-[#22c55e]' :
                  data.sentiment < -0.3 ? 'text-[#ef4444]' :
                  'text-[#94a3b8]'
                }`}
              >
                {data.sentiment > 0 ? '+' : ''}{data.sentiment}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ff-text-muted)]">Engagement:</span>
              <span className="text-sm text-white">{(data.engagement * 100).toFixed(0)}%</span>
            </div>
            {data.speaker && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--ff-text-muted)]">Speaker:</span>
                <span className="text-sm text-white">{data.speaker}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ff-text-muted)]">Tone:</span>
              <span className={`text-sm font-medium capitalize ${
                data.tone === 'positive' ? 'text-[#22c55e]' :
                data.tone === 'negative' ? 'text-[#ef4444]' :
                data.tone === 'neutral' ? 'text-[#94a3b8]' :
                'text-[#f59e0b]'
              }`}>{data.tone}</span>
            </div>
            {data.text && (
              <div className="mt-2 pt-2 border-t border-[var(--ff-border)]">
                <p className="text-xs text-[var(--ff-text-secondary)] italic">"{data.text}"</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]'
      }`} />
      <span className="text-xs text-[var(--ff-text-muted)]">
        {isConnected ? 'Live' : error || 'Disconnected'}
      </span>
      {!isConnected && (
        <button
          onClick={reconnect}
          className="text-xs text-[var(--ff-purple-500)] hover:text-[var(--ff-purple-600)] ml-2"
        >
          Reconnect
        </button>
      )}
    </div>
  );

  // Time window selector
  const TimeWindowSelector = () => (
    <div className="flex gap-2 mb-4">
      {(['5min', '15min', 'all'] as const).map((window) => (
        <button
          key={window}
          onClick={() => setAutoScroll(true)}
          className={`px-3 py-1 text-xs rounded-md transition-all ${
            timeWindow === window
              ? 'bg-[var(--ff-purple-500)] text-white'
              : 'bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)] hover:bg-[var(--ff-border)]'
          }`}
        >
          {window === 'all' ? 'All' : window}
        </button>
      ))}
    </div>
  );

  return (
    <div className="sentiment-timeline">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Live Sentiment Analysis</h2>
          <p className="text-sm text-[var(--ff-text-muted)]">
            Real-time emotional intelligence tracking
          </p>
        </div>
        <ConnectionStatus />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <TimeWindowSelector />

        {showSpeakers && uniqueSpeakers.length > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[var(--ff-text-muted)]">Speaker:</span>
            <select
              value={selectedSpeaker || ''}
              onChange={(e) => setSelectedSpeaker(e.target.value || null)}
              className="bg-[var(--ff-bg-layer)] text-white text-sm px-3 py-1 rounded border border-[var(--ff-border)] focus:border-[var(--ff-purple-500)] focus:outline-none"
            >
              <option value="">All Speakers</option>
              {uniqueSpeakers.map(speaker => (
                <option key={speaker} value={speaker}>{speaker}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-3 py-1 rounded ${
              autoScroll
                ? 'bg-[var(--ff-purple-500)] text-white'
                : 'bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)]'
            }`}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={clearData}
            className="text-xs px-3 py-1 rounded bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)] hover:bg-[var(--ff-border)]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-[var(--ff-bg-layer)] rounded-lg p-4 mb-6 border border-[var(--ff-border)]">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-[var(--ff-text-muted)]">Waiting for sentiment data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.8}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />

              <XAxis
                dataKey="time"
                stroke="var(--ff-text-muted)"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                domain={[-1, 1]}
                stroke="var(--ff-text-muted)"
                tick={{ fontSize: 10 }}
                ticks={[-1, -0.5, 0, 0.5, 1]}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Reference lines */}
              <ReferenceLine
                y={0}
                stroke="var(--ff-text-muted)"
                strokeDasharray="5 5"
                opacity={0.5}
                label={{ value: "Neutral", fill: "var(--ff-text-muted)", fontSize: 10 }}
              />
              <ReferenceLine
                y={0.3}
                stroke="#22c55e"
                strokeDasharray="3 3"
                opacity={0.3}
              />
              <ReferenceLine
                y={-0.3}
                stroke="#ef4444"
                strokeDasharray="3 3"
                opacity={0.3}
              />

              {/* Positive/Negative areas */}
              <Area
                type="monotone"
                dataKey="positive"
                stackId="1"
                fill="url(#positiveGradient)"
                stroke="#22c55e"
                strokeWidth={0}
              />
              <Area
                type="monotone"
                dataKey="negative"
                stackId="1"
                fill="url(#negativeGradient)"
                stroke="#ef4444"
                strokeWidth={0}
              />

              {/* Main sentiment line */}
              <Line
                type="monotone"
                dataKey="sentiment"
                stroke="var(--ff-purple-500)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: "var(--ff-purple-600)" }}
                animationDuration={300}
                animationEasing="ease-in-out"
              />

              {/* Engagement line */}
              <Line
                type="monotone"
                dataKey="engagement"
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                opacity={0.6}
              />

              {showSpeakers && (
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: '12px', color: 'var(--ff-text-muted)' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Additional Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {showEmotions && aggregatedEmotions && (
          <EmotionBreakdown emotions={aggregatedEmotions} />
        )}

        {showAlerts && alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-3">Recent Alerts</h3>
            {alerts.slice(-5).reverse().map((alert) => (
              <SentimentAlert
                key={alert.id}
                alert={alert}
                onAcknowledge={() => acknowledgeAlert(alert.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}