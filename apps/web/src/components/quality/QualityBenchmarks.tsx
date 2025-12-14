'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LineChart,
  Line
} from 'recharts';
import {
  Trophy,
  Target,
  TrendingUp,
  Building,
  Users,
  Award,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { QualityBenchmark } from '@/hooks/useQuality';

interface QualityBenchmarksProps {
  benchmarks: QualityBenchmark;
  currentScore: number;
  onIndustryChange?: (industry: string) => void;
}

const industries = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Education',
  'Consulting',
  'Media'
];

export default function QualityBenchmarks({
  benchmarks,
  currentScore,
  onIndustryChange
}: QualityBenchmarksProps) {
  const [selectedIndustry, setSelectedIndustry] = useState(benchmarks.industry);
  const [expandedSection, setExpandedSection] = useState<'factors' | 'leaders' | null>('factors');

  const handleIndustryChange = (industry: string) => {
    setSelectedIndustry(industry);
    onIndustryChange?.(industry);
  };

  // Calculate percentile position
  const getPercentileDescription = (percentile: number) => {
    if (percentile >= 90) return 'Top 10% - Industry Leader';
    if (percentile >= 75) return 'Top 25% - Above Average';
    if (percentile >= 50) return 'Top 50% - Average Performer';
    if (percentile >= 25) return 'Bottom 50% - Below Average';
    return 'Bottom 25% - Needs Improvement';
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'from-green-500 to-emerald-600';
    if (percentile >= 75) return 'from-blue-500 to-indigo-600';
    if (percentile >= 50) return 'from-yellow-500 to-orange-600';
    if (percentile >= 25) return 'from-orange-500 to-red-600';
    return 'from-red-500 to-pink-600';
  };

  // Prepare comparison data for bar chart
  const comparisonData = benchmarks.comparison.map(item => ({
    ...item,
    yourScore: item.yourScore,
    industryAverage: item.industryAverage,
    difference: item.difference
  }));

  // Prepare radial bar data for percentile display
  const radialData = [
    {
      name: 'Your Position',
      value: benchmarks.percentile,
      fill: currentScore >= benchmarks.averageScore ? '#10B981' : '#F59E0B'
    }
  ];

  // Calculate score difference
  const scoreDifference = currentScore - benchmarks.averageScore;
  const isAboveAverage = scoreDifference >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Industry Benchmarks</h2>
            <p className="text-indigo-100">Compare your performance against industry standards</p>
          </div>
          <Trophy className="w-10 h-10 text-white/75" />
        </div>
      </div>

      {/* Industry Selector */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Industry</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {industries.map(industry => (
            <button
              key={industry}
              onClick={() => handleIndustryChange(industry)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedIndustry === industry
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Building className="w-4 h-4 inline mr-1" />
              {industry}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Percentile Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Comparison */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Comparison</h3>
            <div className="space-y-4">
              {/* Your Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Your Organization</div>
                    <div className="text-2xl font-bold text-gray-900">{currentScore.toFixed(1)}</div>
                  </div>
                </div>
                {isAboveAverage ? (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-red-500" />
                )}
              </div>

              {/* Industry Average */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Building className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">{selectedIndustry} Average</div>
                    <div className="text-2xl font-bold text-gray-900">{benchmarks.averageScore.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              {/* Difference */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Difference</span>
                  <span className={`text-2xl font-bold ${isAboveAverage ? 'text-green-600' : 'text-red-600'}`}>
                    {isAboveAverage ? '+' : ''}{scoreDifference.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Percentile Position */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Position</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={200} height={200}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  data={radialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill={currentScore >= benchmarks.averageScore ? '#10B981' : '#F59E0B'}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-3xl font-bold fill-gray-900"
                  >
                    {benchmarks.percentile}
                  </text>
                  <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm fill-gray-600"
                  >
                    percentile
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className={`text-center mt-4 px-4 py-2 rounded-lg bg-gradient-to-r ${getPercentileColor(benchmarks.percentile)} text-white`}>
              <p className="text-sm font-medium">{getPercentileDescription(benchmarks.percentile)}</p>
            </div>
          </div>
        </div>

        {/* Factor Comparison */}
        <div className="bg-gray-50 rounded-lg p-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'factors' ? null : 'factors')}
            className="w-full flex items-center justify-between mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">Factor Comparison</h3>
            {expandedSection === 'factors' ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSection === 'factors' && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="factor" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="yourScore" fill="#3B82F6" name="Your Score" />
                  <Bar dataKey="industryAverage" fill="#E5E7EB" name="Industry Average" />
                </BarChart>
              </ResponsiveContainer>

              {/* Detailed Factor Analysis */}
              <div className="mt-6 space-y-3">
                {comparisonData.map((factor, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      factor.difference >= 0
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{factor.factor}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Your score: {factor.yourScore.toFixed(1)} | Industry: {factor.industryAverage.toFixed(1)}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      factor.difference >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {factor.difference >= 0 ? '+' : ''}{factor.difference.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Performers */}
        <div className="bg-gray-50 rounded-lg p-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'leaders' ? null : 'leaders')}
            className="w-full flex items-center justify-between mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">Industry Leaders</h3>
            {expandedSection === 'leaders' ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSection === 'leaders' && (
            <div className="space-y-3">
              {benchmarks.topPerformers.map((performer, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                      idx === 1 ? 'bg-gray-300 text-gray-700' :
                      idx === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{performer.company}</div>
                      <div className="text-sm text-gray-600">Top performer in {selectedIndustry}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{performer.score.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">quality score</div>
                  </div>
                </div>
              ))}

              {/* Your Position */}
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                      You
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Your Organization</div>
                      <div className="text-sm text-gray-600">
                        Ranked #{Math.round(100 - benchmarks.percentile)} of 100 companies
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{currentScore.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">your score</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Key Insights</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    You're performing {isAboveAverage ? 'above' : 'below'} the {selectedIndustry} industry average
                    by {Math.abs(scoreDifference).toFixed(1)} points
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    Your strongest factor compared to industry is{' '}
                    <strong>
                      {comparisonData.reduce((best, current) =>
                        current.difference > best.difference ? current : best
                      ).factor}
                    </strong>
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    Focus on improving{' '}
                    <strong>
                      {comparisonData.reduce((worst, current) =>
                        current.difference < worst.difference ? current : worst
                      ).factor}
                    </strong>{' '}
                    to match industry standards
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}