'use client';

import React, { useState } from 'react';
import {
  Mic,
  Users,
  Layout,
  MessageSquare,
  Zap,
  Clock,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { QualityFactor } from '@/hooks/useQuality';

interface QualityBreakdownProps {
  factors: QualityFactor[];
  showComparison?: boolean;
  benchmarkData?: QualityFactor[];
  onFactorClick?: (factor: QualityFactor) => void;
}

const factorIcons: Record<string, React.ReactNode> = {
  'Audio Quality': <Mic className="w-5 h-5" />,
  'Engagement': <Users className="w-5 h-5" />,
  'Structure': <Layout className="w-5 h-5" />,
  'Filler Words': <MessageSquare className="w-5 h-5" />,
  'Clarity': <Zap className="w-5 h-5" />,
  'Pacing': <Clock className="w-5 h-5" />
};

const factorDescriptions: Record<string, string> = {
  'Audio Quality': 'Clear audio without background noise, echo, or interruptions',
  'Engagement': 'Active participation, questions asked, and interaction level',
  'Structure': 'Well-organized agenda, clear objectives, and time management',
  'Filler Words': 'Minimal use of "um", "uh", "like", and other filler words',
  'Clarity': 'Clear communication, concise explanations, and articulate speech',
  'Pacing': 'Appropriate speaking speed, pauses, and rhythm'
};

const factorTips: Record<string, string[]> = {
  'Audio Quality': [
    'Use a high-quality microphone or headset',
    'Find a quiet room with minimal echo',
    'Test audio before important meetings',
    'Mute when not speaking'
  ],
  'Engagement': [
    'Ask open-ended questions',
    'Use polls and interactive features',
    'Call participants by name',
    'Encourage video when appropriate'
  ],
  'Structure': [
    'Share agenda before the meeting',
    'Start with clear objectives',
    'Use time blocks for each topic',
    'End with action items and next steps'
  ],
  'Filler Words': [
    'Practice speaking slowly and deliberately',
    'Pause instead of using filler words',
    'Record yourself to identify patterns',
    'Prepare talking points in advance'
  ],
  'Clarity': [
    'Use simple, direct language',
    'Avoid jargon when possible',
    'Summarize key points',
    'Check for understanding regularly'
  ],
  'Pacing': [
    'Vary your speaking speed for emphasis',
    'Include natural pauses',
    'Allow time for questions',
    'Monitor participant engagement'
  ]
};

export default function QualityBreakdown({
  factors,
  showComparison = false,
  benchmarkData,
  onFactorClick
}: QualityBreakdownProps) {
  const [selectedFactor, setSelectedFactor] = useState<QualityFactor | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'chart' | 'detailed'>('grid');

  // Prepare data for radar chart
  const radarData = factors.map(factor => ({
    factor: factor.name,
    score: factor.score,
    benchmark: benchmarkData?.find(b => b.name === factor.name)?.score || factor.benchmarkScore || 0,
    fullMark: 100
  }));

  // Prepare data for bar chart
  const barData = factors.map(factor => ({
    name: factor.name.split(' ').map(w => w[0]).join(''),
    fullName: factor.name,
    score: factor.score,
    benchmark: benchmarkData?.find(b => b.name === factor.name)?.score || factor.benchmarkScore || 0,
    weight: factor.weight * 100
  }));

  const getFactorColor = (score: number) => {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleFactorClick = (factor: QualityFactor) => {
    setSelectedFactor(factor);
    onFactorClick?.(factor);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quality Factor Breakdown</h2>
        <div className="flex items-center space-x-2">
          {['grid', 'chart', 'detailed'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factors.map((factor, idx) => (
            <div
              key={idx}
              onClick={() => handleFactorClick(factor)}
              className="relative p-4 rounded-lg border-2 hover:shadow-lg transition-all cursor-pointer"
              style={{
                borderColor: `${getFactorColor(factor.score)}33`,
                backgroundColor: `${getFactorColor(factor.score)}08`
              }}
            >
              {/* Icon and Title */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-white shadow-sm">
                    {factorIcons[factor.name] || <Info className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{factor.name}</h3>
                    <p className="text-xs text-gray-500">Weight: {(factor.weight * 100).toFixed(0)}%</p>
                  </div>
                </div>
                {getTrendIcon(factor.trend)}
              </div>

              {/* Score Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl font-bold" style={{ color: getFactorColor(factor.score) }}>
                    {factor.score.toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-500">/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${factor.score}%`,
                      backgroundColor: getFactorColor(factor.score)
                    }}
                  />
                </div>
              </div>

              {/* Benchmark Comparison */}
              {factor.benchmarkScore && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Benchmark</span>
                  <span className={`font-medium ${
                    factor.score >= factor.benchmarkScore ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {factor.score >= factor.benchmarkScore ? '+' : ''}
                    {(factor.score - factor.benchmarkScore).toFixed(0)}
                  </span>
                </div>
              )}

              {/* Description */}
              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                {factor.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="space-y-6">
          {/* Radar Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Your Score"
                  dataKey="score"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                {showComparison && (
                  <Radar
                    name="Benchmark"
                    dataKey="benchmark"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                  />
                )}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Factor Scores</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-semibold text-gray-900">{data.fullName}</p>
                          <p className="text-sm text-gray-600">Score: {data.score}</p>
                          {data.benchmark > 0 && (
                            <p className="text-sm text-gray-600">Benchmark: {data.benchmark}</p>
                          )}
                          <p className="text-xs text-gray-500">Weight: {data.weight}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="score" name="Score">
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getFactorColor(entry.score)} />
                  ))}
                </Bar>
                {showComparison && <Bar dataKey="benchmark" fill="#E5E7EB" name="Benchmark" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <div className="space-y-4">
          {factors.map((factor, idx) => (
            <div
              key={idx}
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setSelectedFactor(selectedFactor?.name === factor.name ? null : factor)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="p-2 rounded-lg bg-gray-100">
                      {factorIcons[factor.name] || <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{factor.name}</h3>
                      <p className="text-sm text-gray-600">{factorDescriptions[factor.name]}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold" style={{ color: getFactorColor(factor.score) }}>
                          {factor.score.toFixed(0)}
                        </span>
                        {getTrendIcon(factor.trend)}
                      </div>
                      <div className="text-xs text-gray-500">Weight: {(factor.weight * 100).toFixed(0)}%</div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      selectedFactor?.name === factor.name ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${factor.score}%`,
                        backgroundColor: getFactorColor(factor.score)
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedFactor?.name === factor.name && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="space-y-4">
                    {/* Tips */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <span>Improvement Tips</span>
                      </h4>
                      <ul className="space-y-1">
                        {factorTips[factor.name]?.map((tip, tipIdx) => (
                          <li key={tipIdx} className="flex items-start space-x-2 text-sm text-gray-600">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Benchmark Comparison */}
                    {factor.benchmarkScore && (
                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Industry Benchmark</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium">{factor.benchmarkScore}</span>
                            <span className={`text-sm font-bold ${
                              factor.score >= factor.benchmarkScore ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {factor.score >= factor.benchmarkScore ? '+' : ''}
                              {(factor.score - factor.benchmarkScore).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}