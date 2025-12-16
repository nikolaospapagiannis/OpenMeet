'use client';

/**
 * Team Quality Dashboard
 * Shows team quality trends over time with Recharts visualizations
 */

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from 'lucide-react';

interface TeamQualityDashboardProps {
  trends: {
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    trendPercentage: number;
    totalMeetings: number;
    scores: {
      date: Date;
      score: number;
      meetingCount: number;
    }[];
    topPerformers: {
      meetingId: string;
      title: string;
      score: number;
      date: Date;
    }[];
    bottomPerformers: {
      meetingId: string;
      title: string;
      score: number;
      date: Date;
    }[];
    recommendations: string[];
  };
  period: 'week' | 'month' | 'quarter' | 'year';
}

export default function TeamQualityDashboard({ trends, period }: TeamQualityDashboardProps) {
  // Prepare chart data
  const chartData = trends.scores.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(s.score * 10) / 10,
    meetings: s.meetingCount
  }));

  const getTrendIcon = () => {
    switch (trends.trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trends.trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
            {getTrendIcon()}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold text-gray-900">
              {trends.averageScore.toFixed(1)}
            </span>
            <span className="text-lg text-gray-500">/100</span>
          </div>
          <div className={`mt-2 inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
            <span>
              {trends.trend === 'improving' ? '+' : trends.trend === 'declining' ? '-' : ''}
              {Math.abs(trends.trendPercentage).toFixed(1)}%
            </span>
            <span>{period === 'week' ? 'vs last week' : period === 'month' ? 'vs last month' : 'vs last quarter'}</span>
          </div>
        </div>

        {/* Total Meetings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Meetings</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold text-gray-900">
              {trends.totalMeetings}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Analyzed in this {period}
          </p>
        </div>

        {/* Quality Grade */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90 mb-2">Team Grade</h3>
          <div className="flex items-center space-x-3">
            <Award className="w-10 h-10 opacity-75" />
            <span className="text-5xl font-bold">
              {trends.averageScore >= 90 ? 'A+' :
               trends.averageScore >= 80 ? 'A' :
               trends.averageScore >= 70 ? 'B' :
               trends.averageScore >= 60 ? 'C' : 'D'}
            </span>
          </div>
          <p className="mt-2 text-xs opacity-75">
            {trends.averageScore >= 80 ? 'Excellent performance!' :
             trends.averageScore >= 60 ? 'Good, room to improve' :
             'Needs improvement'}
          </p>
        </div>
      </div>

      {/* Quality Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Trend Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 5 }}
              activeDot={{ r: 7 }}
              name="Quality Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Meeting Count Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Volume</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 12 }} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="meetings" fill="#8B5CF6" name="Meetings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Award className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Meetings</h3>
          </div>
          <div className="space-y-3">
            {trends.topPerformers.slice(0, 5).map((meeting, idx) => (
              <div key={meeting.meetingId} className="flex items-start justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                      {meeting.title}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 ml-8">
                    {new Date(meeting.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xl font-bold text-green-600">
                    {meeting.score.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Needs Improvement</h3>
          </div>
          <div className="space-y-3">
            {trends.bottomPerformers.slice(0, 5).map((meeting, idx) => (
              <div key={meeting.meetingId} className="flex items-start justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex items-center justify-center w-6 h-6 bg-yellow-500 text-white rounded-full text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                      {meeting.title}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 ml-8">
                    {new Date(meeting.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xl font-bold text-yellow-600">
                    {meeting.score.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {trends.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Recommendations for Improvement
          </h3>
          <ul className="space-y-2">
            {trends.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start space-x-3 text-sm text-blue-800">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-semibold text-xs">
                  {idx + 1}
                </span>
                <span className="flex-1">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
