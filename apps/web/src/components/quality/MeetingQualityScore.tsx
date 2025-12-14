'use client';

/**
 * Meeting Quality Score Component
 * Displays overall quality score with factor breakdown and improvement tips
 */

import React from 'react';
import { TrendingUp, TrendingDown, Award, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface QualityFactors {
  participationBalance: number;
  engagementScore: number;
  actionabilityScore: number;
  clarityScore: number;
  timeManagementScore: number;
  objectiveCompletion: number;
  productivityScore: number;
  sentimentScore: number;
}

interface QualityScoreProps {
  overallScore: number;
  factors: QualityFactors;
  recommendations: string[];
  strengths?: string[];
  improvements?: string[];
  comparisonAverage?: number;
  trend?: 'improving' | 'declining' | 'stable';
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const getScoreGrade = (score: number) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

export default function MeetingQualityScore({
  overallScore,
  factors,
  recommendations,
  strengths = [],
  improvements = [],
  comparisonAverage,
  trend
}: QualityScoreProps) {
  // Prepare data for radar chart
  const radarData = [
    { metric: 'Participation', score: factors.participationBalance, fullMark: 100 },
    { metric: 'Engagement', score: factors.engagementScore, fullMark: 100 },
    { metric: 'Actionability', score: factors.actionabilityScore, fullMark: 100 },
    { metric: 'Clarity', score: factors.clarityScore, fullMark: 100 },
    { metric: 'Time Mgmt', score: factors.timeManagementScore, fullMark: 100 },
    { metric: 'Objectives', score: factors.objectiveCompletion, fullMark: 100 }
  ];

  const factorBreakdown = [
    { name: 'Participation Balance', score: factors.participationBalance, icon: '👥' },
    { name: 'Engagement', score: factors.engagementScore, icon: '🎯' },
    { name: 'Actionability', score: factors.actionabilityScore, icon: '✅' },
    { name: 'Clarity of Outcomes', score: factors.clarityScore, icon: '💡' },
    { name: 'Time Management', score: factors.timeManagementScore, icon: '⏱️' },
    { name: 'Objective Completion', score: factors.objectiveCompletion, icon: '🎖️' },
    { name: 'Productivity', score: factors.productivityScore, icon: '📈' }
  ];

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Meeting Quality Score</h2>
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl font-bold">{overallScore.toFixed(1)}</span>
              <span className="text-3xl opacity-75">/100</span>
            </div>
            <div className="mt-3 flex items-center space-x-4">
              <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium">
                Grade: {getScoreGrade(overallScore)}
              </span>
              {trend && (
                <span className="flex items-center space-x-1">
                  {trend === 'improving' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : trend === 'declining' ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : null}
                  <span className="text-sm capitalize">{trend}</span>
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <Award className="w-16 h-16 opacity-50 mb-2" />
            {comparisonAverage && (
              <div className="text-sm">
                <div className="opacity-75">Team Average</div>
                <div className="text-2xl font-bold">{comparisonAverage.toFixed(1)}</div>
                <div className="text-xs opacity-75 mt-1">
                  {overallScore > comparisonAverage ? (
                    <span className="text-green-200">
                      +{(overallScore - comparisonAverage).toFixed(1)} above avg
                    </span>
                  ) : (
                    <span className="text-red-200">
                      {(overallScore - comparisonAverage).toFixed(1)} below avg
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strengths.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Strengths</h3>
            </div>
            <ul className="space-y-2">
              {strengths.map((strength, idx) => (
                <li key={idx} className="text-sm text-green-800 flex items-start">
                  <span className="mr-2">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {improvements.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Target className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900">Areas for Improvement</h3>
            </div>
            <ul className="space-y-2">
              {improvements.map((improvement, idx) => (
                <li key={idx} className="text-sm text-yellow-800 flex items-start">
                  <span className="mr-2">→</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Factor Breakdown - Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Factor List */}
          <div className="space-y-3">
            {factorBreakdown.map((factor, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                    <span>{factor.icon}</span>
                    <span>{factor.name}</span>
                  </span>
                  <span className={`text-sm font-bold ${
                    factor.score >= 80 ? 'text-green-600' :
                    factor.score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {factor.score}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      factor.score >= 80 ? 'bg-green-500' :
                      factor.score >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Recommendations</h3>
        </div>
        <ul className="space-y-3">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start space-x-3 text-sm text-blue-800">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-semibold text-xs">
                {idx + 1}
              </span>
              <span className="flex-1">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
