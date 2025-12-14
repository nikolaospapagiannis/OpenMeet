/**
 * Test page for Live Sentiment Timeline Component
 *
 * This page demonstrates the real-time sentiment analysis components
 * with WebSocket integration and Recharts visualization
 */

'use client';

import { useState } from 'react';
import SentimentTimeline from '@/components/live/SentimentTimeline';

export default function TestSentimentPage() {
  const [sessionId] = useState('test-session-' + Date.now());
  const [showEmotions, setShowEmotions] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [timeWindow, setTimeWindow] = useState<'5min' | '15min' | 'all'>('15min');

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Live Sentiment Timeline Test
          </h1>
          <p className="text-[var(--ff-text-muted)]">
            Testing WebSocket connection to ws://localhost:4100/ws/live-sentiment
          </p>
          <p className="text-sm text-[var(--ff-text-secondary)] mt-2">
            Session ID: <code className="bg-[var(--ff-bg-layer)] px-2 py-1 rounded">{sessionId}</code>
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[var(--ff-bg-layer)] rounded-lg p-4 mb-8 border border-[var(--ff-border)]">
          <h3 className="text-lg font-semibold text-white mb-4">Component Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--ff-text-secondary)]">
              <input
                type="checkbox"
                checked={showEmotions}
                onChange={(e) => setShowEmotions(e.target.checked)}
                className="rounded"
              />
              Show Emotions
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--ff-text-secondary)]">
              <input
                type="checkbox"
                checked={showAlerts}
                onChange={(e) => setShowAlerts(e.target.checked)}
                className="rounded"
              />
              Show Alerts
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--ff-text-secondary)]">
              <input
                type="checkbox"
                checked={showSpeakers}
                onChange={(e) => setShowSpeakers(e.target.checked)}
                className="rounded"
              />
              Show Speakers
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--ff-text-secondary)]">Time:</span>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value as '5min' | '15min' | 'all')}
                className="bg-[var(--ff-bg-dark)] text-white text-sm px-2 py-1 rounded border border-[var(--ff-border)]"
              >
                <option value="5min">5 min</option>
                <option value="15min">15 min</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sentiment Timeline Component */}
        <SentimentTimeline
          sessionId={sessionId}
          height={400}
          showEmotions={showEmotions}
          showAlerts={showAlerts}
          timeWindow={timeWindow}
          showSpeakers={showSpeakers}
        />

        {/* Instructions */}
        <div className="mt-8 bg-[var(--ff-bg-layer)] rounded-lg p-6 border border-[var(--ff-border)]">
          <h3 className="text-lg font-semibold text-white mb-4">How to Test</h3>
          <ol className="space-y-2 text-sm text-[var(--ff-text-secondary)]">
            <li>1. Ensure the API server is running on port 4100</li>
            <li>2. The component will attempt to connect to ws://localhost:4100/ws/live-sentiment</li>
            <li>3. Connection status is shown in the top-right corner</li>
            <li>4. Sentiment data will appear in real-time when received</li>
            <li>5. Use the controls above to toggle different features</li>
          </ol>

          <div className="mt-4 p-4 bg-[var(--ff-bg-dark)] rounded">
            <h4 className="text-sm font-semibold text-white mb-2">Features Implemented:</h4>
            <ul className="space-y-1 text-xs text-[var(--ff-text-muted)]">
              <li>✓ Real-time WebSocket connection using Socket.io-client</li>
              <li>✓ Recharts line chart with gradient fills</li>
              <li>✓ 8-dimensional emotion analysis (joy, sadness, anger, fear, surprise, trust, anticipation, disgust)</li>
              <li>✓ Alert system for negative trends and sudden drops</li>
              <li>✓ Speaker-level sentiment tracking</li>
              <li>✓ Time window filtering (5min, 15min, all)</li>
              <li>✓ Auto-scroll and manual controls</li>
              <li>✓ Custom tooltips with context</li>
              <li>✓ Responsive design with OpenMeet color system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}