'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Award, Sparkles, Info } from 'lucide-react';
import { QualityScore } from '@/hooks/useQuality';

interface QualityScoreCardProps {
  score: QualityScore;
  showDetails?: boolean;
  compact?: boolean;
  onDetailsClick?: () => void;
}

export default function QualityScoreCard({
  score,
  showDetails = true,
  compact = false,
  onDetailsClick
}: QualityScoreCardProps) {
  const getTrendIcon = () => {
    switch (score.trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (score.trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getGradeColor = () => {
    switch (score.grade) {
      case 'A+':
      case 'A':
        return 'from-green-500 to-emerald-600';
      case 'B':
        return 'from-blue-500 to-indigo-600';
      case 'C':
        return 'from-yellow-500 to-orange-600';
      case 'D':
        return 'from-orange-500 to-red-600';
      case 'F':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getGradeDescription = () => {
    switch (score.grade) {
      case 'A+':
        return 'Outstanding performance! Your meetings are exceptionally effective.';
      case 'A':
        return 'Excellent performance! Your meetings are highly effective.';
      case 'B':
        return 'Good performance with room for improvement.';
      case 'C':
        return 'Average performance. Consider implementing best practices.';
      case 'D':
        return 'Below average. Significant improvements needed.';
      case 'F':
        return 'Poor performance. Major changes required.';
      default:
        return 'Performance level undefined.';
    }
  };

  // Calculate score ring progress
  const scorePercentage = (score.overall / 100) * 100;
  const strokeDashoffset = 440 - (440 * scorePercentage) / 100; // 440 is circumference for r=70

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
           onClick={onDetailsClick}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getGradeColor()} flex items-center justify-center`}>
              <span className="text-white font-bold text-lg">{score.grade}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">{score.overall.toFixed(1)}</span>
                <span className="text-gray-500">/100</span>
                {getTrendIcon()}
              </div>
              <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTrendColor()}`}>
                <span>
                  {score.trend === 'improving' ? '+' : score.trend === 'declining' ? '-' : ''}
                  {Math.abs(score.trendPercentage).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          {showDetails && (
            <Info className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getGradeColor()} p-6 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Quality Score</h2>
            <p className="text-white/90 text-sm">
              Last updated: {new Date(score.lastUpdated).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <Sparkles className="w-8 h-8 text-white/75" />
        </div>
      </div>

      {/* Score Display */}
      <div className="p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            {/* SVG Ring */}
            <svg className="transform -rotate-90 w-36 h-36">
              <circle
                cx="72"
                cy="72"
                r="70"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="72"
                cy="72"
                r="70"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={440}
                strokeDashoffset={strokeDashoffset}
                className={`text-blue-600 transition-all duration-1000 ease-out`}
              />
            </svg>

            {/* Score in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-gray-900">{score.overall.toFixed(1)}</div>
              <div className="text-sm text-gray-500">out of 100</div>
            </div>
          </div>
        </div>

        {/* Grade and Trend */}
        <div className="flex items-center justify-center space-x-6 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Grade</div>
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${getGradeColor()}`}>
              <span className="text-2xl font-bold text-white">{score.grade}</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Trend</div>
            <div className="flex items-center justify-center space-x-2">
              {getTrendIcon()}
              <span className={`text-lg font-semibold ${
                score.trend === 'improving' ? 'text-green-600' :
                score.trend === 'declining' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {Math.abs(score.trendPercentage).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 text-center">{getGradeDescription()}</p>
        </div>

        {/* Top Factors */}
        {showDetails && score.factors && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Factors</h3>
            {score.factors.slice(0, 3).map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    factor.score >= 80 ? 'bg-green-500' :
                    factor.score >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{factor.name}</div>
                    <div className="text-xs text-gray-500">{factor.description}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {factor.score.toFixed(0)}
                  </span>
                  {factor.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {factor.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  {factor.trend === 'stable' && <Minus className="w-3 h-3 text-gray-500" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Details Button */}
        {onDetailsClick && (
          <button
            onClick={onDetailsClick}
            className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>View Full Analysis</span>
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}