/**
 * Emotion Breakdown Component
 *
 * Visualizes the 8 emotion dimensions in real-time
 * Uses Recharts for pie chart and bar chart visualizations
 */

'use client';

import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface EmotionBreakdownProps {
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    trust: number;
    anticipation: number;
    disgust: number;
  };
  viewType?: 'pie' | 'bar' | 'radar';
  height?: number;
}

// Emotion colors based on psychological associations
const EMOTION_COLORS = {
  joy: '#fbbf24',        // Yellow - happiness
  sadness: '#60a5fa',    // Blue - sadness
  anger: '#ef4444',      // Red - anger
  fear: '#a855f7',       // Purple - fear
  surprise: '#f97316',   // Orange - surprise
  trust: '#22c55e',      // Green - trust
  anticipation: '#ec4899', // Pink - anticipation
  disgust: '#737373'     // Gray - disgust
};

// Emotion icons for better visualization
const EMOTION_ICONS = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  fear: '😨',
  surprise: '😮',
  trust: '🤝',
  anticipation: '🎯',
  disgust: '🤢'
};

export default function EmotionBreakdown({
  emotions,
  viewType = 'bar',
  height = 250
}: EmotionBreakdownProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState(viewType);

  // Prepare data for charts
  const chartData = useMemo(() => {
    return Object.entries(emotions)
      .map(([emotion, value]) => ({
        name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        key: emotion,
        value: Number((value * 100).toFixed(1)),
        rawValue: value,
        color: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS],
        icon: EMOTION_ICONS[emotion as keyof typeof EMOTION_ICONS]
      }))
      .sort((a, b) => b.value - a.value);
  }, [emotions]);

  // Get dominant emotion
  const dominantEmotion = useMemo(() => {
    return chartData[0];
  }, [chartData]);

  // Calculate emotion intensity (overall emotional engagement)
  const emotionalIntensity = useMemo(() => {
    const total = Object.values(emotions).reduce((sum, val) => sum + val, 0);
    return (total / Object.keys(emotions).length * 100).toFixed(0);
  }, [emotions]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--ff-bg-layer)] p-3 rounded-lg border border-[var(--ff-border)] shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{data.icon}</span>
            <span className="font-semibold text-white">{data.name}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs text-[var(--ff-text-muted)]">Intensity:</span>
              <span className="text-sm font-bold text-white">{data.value}%</span>
            </div>
            <div className="w-full bg-[var(--ff-bg-dark)] rounded-full h-2 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${data.value}%`,
                  backgroundColor: data.color
                }}
              />
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Pie chart rendering
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              onClick={() => setSelectedEmotion(entry.key)}
              style={{ cursor: 'pointer', opacity: selectedEmotion && selectedEmotion !== entry.key ? 0.5 : 1 }}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  // Bar chart rendering
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--ff-border)" opacity={0.3} />
        <XAxis
          dataKey="name"
          stroke="var(--ff-text-muted)"
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
        />
        <YAxis
          stroke="var(--ff-text-muted)"
          tick={{ fontSize: 10 }}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          animationDuration={800}
          radius={[4, 4, 0, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              onClick={() => setSelectedEmotion(entry.key)}
              style={{ cursor: 'pointer', opacity: selectedEmotion && selectedEmotion !== entry.key ? 0.5 : 1 }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  // Radar chart rendering
  const renderRadarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData}>
        <PolarGrid
          stroke="var(--ff-border)"
          strokeDasharray="3 3"
        />
        <PolarAngleAxis
          dataKey="name"
          stroke="var(--ff-text-muted)"
          tick={{ fontSize: 10 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          stroke="var(--ff-text-muted)"
          tick={{ fontSize: 10 }}
        />
        <Radar
          name="Emotions"
          dataKey="value"
          stroke="var(--ff-purple-500)"
          fill="var(--ff-purple-500)"
          fillOpacity={0.6}
          animationDuration={800}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );

  // View type selector
  const ViewSelector = () => (
    <div className="flex gap-1 bg-[var(--ff-bg-dark)] p-1 rounded-md">
      {(['bar', 'pie', 'radar'] as const).map((view) => (
        <button
          key={view}
          onClick={() => setCurrentView(view)}
          className={`px-3 py-1 text-xs rounded transition-all capitalize ${
            currentView === view
              ? 'bg-[var(--ff-purple-500)] text-white'
              : 'text-[var(--ff-text-muted)] hover:text-white'
          }`}
        >
          {view}
        </button>
      ))}
    </div>
  );

  return (
    <div className="emotion-breakdown bg-[var(--ff-bg-layer)] rounded-lg p-4 border border-[var(--ff-border)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Emotional State</h3>
          <p className="text-xs text-[var(--ff-text-muted)]">
            8-dimensional emotion analysis
          </p>
        </div>
        <ViewSelector />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[var(--ff-bg-dark)] rounded p-2">
          <p className="text-xs text-[var(--ff-text-muted)] mb-1">Dominant</p>
          <div className="flex items-center gap-1">
            <span className="text-sm">{dominantEmotion.icon}</span>
            <span className="text-sm font-semibold text-white">{dominantEmotion.name}</span>
          </div>
        </div>
        <div className="bg-[var(--ff-bg-dark)] rounded p-2">
          <p className="text-xs text-[var(--ff-text-muted)] mb-1">Intensity</p>
          <p className="text-sm font-semibold text-white">{emotionalIntensity}%</p>
        </div>
        <div className="bg-[var(--ff-bg-dark)] rounded p-2">
          <p className="text-xs text-[var(--ff-text-muted)] mb-1">Balance</p>
          <p className="text-sm font-semibold text-white">
            {Math.abs(chartData[0].value - chartData[chartData.length - 1].value) < 20 ? 'Balanced' : 'Varied'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="emotion-chart">
        {currentView === 'pie' && renderPieChart()}
        {currentView === 'bar' && renderBarChart()}
        {currentView === 'radar' && renderRadarChart()}
      </div>

      {/* Emotion Legend */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {chartData.map((emotion) => (
          <button
            key={emotion.key}
            onClick={() => setSelectedEmotion(emotion.key === selectedEmotion ? null : emotion.key)}
            className={`flex items-center gap-1 p-1 rounded text-xs transition-all ${
              selectedEmotion === emotion.key
                ? 'bg-[var(--ff-bg-dark)] ring-1 ring-[var(--ff-purple-500)]'
                : 'hover:bg-[var(--ff-bg-dark)]'
            }`}
          >
            <span>{emotion.icon}</span>
            <span className="text-[var(--ff-text-muted)]">{emotion.value}%</span>
          </button>
        ))}
      </div>

      {/* Selected Emotion Details */}
      {selectedEmotion && (
        <div className="mt-4 p-3 bg-[var(--ff-bg-dark)] rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {EMOTION_ICONS[selectedEmotion as keyof typeof EMOTION_ICONS]}
              </span>
              <span className="font-semibold text-white capitalize">{selectedEmotion}</span>
            </div>
            <button
              onClick={() => setSelectedEmotion(null)}
              className="text-[var(--ff-text-muted)] hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--ff-text-muted)]">Current Level:</span>
              <span className="text-white font-semibold">
                {(emotions[selectedEmotion as keyof typeof emotions] * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-[var(--ff-bg-layer)] rounded-full h-2 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${emotions[selectedEmotion as keyof typeof emotions] * 100}%`,
                  backgroundColor: EMOTION_COLORS[selectedEmotion as keyof typeof EMOTION_COLORS]
                }}
              />
            </div>
            <p className="text-xs text-[var(--ff-text-muted)] mt-2">
              {selectedEmotion === 'joy' && 'Positive engagement and satisfaction detected.'}
              {selectedEmotion === 'sadness' && 'Emotional downturn or disappointment present.'}
              {selectedEmotion === 'anger' && 'Frustration or conflict may be occurring.'}
              {selectedEmotion === 'fear' && 'Uncertainty or concern is being expressed.'}
              {selectedEmotion === 'surprise' && 'Unexpected information or reactions detected.'}
              {selectedEmotion === 'trust' && 'Confidence and reliability in the conversation.'}
              {selectedEmotion === 'anticipation' && 'Forward-looking excitement or planning detected.'}
              {selectedEmotion === 'disgust' && 'Aversion or strong disagreement present.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}