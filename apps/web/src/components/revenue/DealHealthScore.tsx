'use client';

import React, { useMemo } from 'react';
import { Deal } from '@/hooks/useRevenueIntelligence';

interface DealHealthScoreProps {
  deal: Deal;
  detailed?: boolean;
  onMetricClick?: (metric: string) => void;
}

interface HealthMetric {
  name: string;
  score: number;
  weight: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  recommendation?: string;
}

export function DealHealthScore({ deal, detailed = true, onMetricClick }: DealHealthScoreProps) {
  // Calculate individual health metrics
  const healthMetrics = useMemo((): HealthMetric[] => {
    const metrics: HealthMetric[] = [];

    // 1. Stage Duration Score
    const stageDurationScore = (() => {
      if (deal.daysInStage <= 15) return 100;
      if (deal.daysInStage <= 30) return 75;
      if (deal.daysInStage <= 45) return 50;
      if (deal.daysInStage <= 60) return 25;
      return 0;
    })();

    metrics.push({
      name: 'Stage Duration',
      score: stageDurationScore,
      weight: 0.2,
      status: stageDurationScore >= 75 ? 'good' : stageDurationScore >= 50 ? 'warning' : 'critical',
      description: `${deal.daysInStage} days in current stage`,
      recommendation: stageDurationScore < 50 ? 'Consider scheduling follow-up to move deal forward' : undefined,
    });

    // 2. Engagement Level Score
    const engagementScore = deal.engagementLevel === 'high' ? 100 : deal.engagementLevel === 'medium' ? 60 : 20;

    metrics.push({
      name: 'Engagement Level',
      score: engagementScore,
      weight: 0.25,
      status: engagementScore >= 75 ? 'good' : engagementScore >= 50 ? 'warning' : 'critical',
      description: `${deal.engagementLevel} engagement level`,
      recommendation: engagementScore < 60 ? 'Increase touchpoints with stakeholders' : undefined,
    });

    // 3. Competitor Presence Score
    const competitorScore = (() => {
      if (deal.competitors.length === 0) return 100;
      if (deal.competitors.length === 1) return 75;
      if (deal.competitors.length === 2) return 50;
      return 25;
    })();

    metrics.push({
      name: 'Competitive Landscape',
      score: competitorScore,
      weight: 0.15,
      status: competitorScore >= 75 ? 'good' : competitorScore >= 50 ? 'warning' : 'critical',
      description: `${deal.competitors.length} competitor${deal.competitors.length !== 1 ? 's' : ''} identified`,
      recommendation: competitorScore < 50 ? 'Strengthen value proposition against competition' : undefined,
    });

    // 4. Objection Handling Score
    const objectionScore = (() => {
      if (deal.objections.length === 0) return 100;
      if (deal.objections.length <= 2) return 75;
      if (deal.objections.length <= 4) return 50;
      return 25;
    })();

    metrics.push({
      name: 'Objection Management',
      score: objectionScore,
      weight: 0.15,
      status: objectionScore >= 75 ? 'good' : objectionScore >= 50 ? 'warning' : 'critical',
      description: `${deal.objections.length} unresolved objection${deal.objections.length !== 1 ? 's' : ''}`,
      recommendation: objectionScore < 50 ? 'Address key objections with targeted content' : undefined,
    });

    // 5. Sentiment Score
    const sentimentScore = deal.sentiment === 'positive' ? 100 : deal.sentiment === 'neutral' ? 60 : 20;

    metrics.push({
      name: 'Overall Sentiment',
      score: sentimentScore,
      weight: 0.15,
      status: sentimentScore >= 75 ? 'good' : sentimentScore >= 50 ? 'warning' : 'critical',
      description: `${deal.sentiment} sentiment detected`,
      recommendation: sentimentScore < 60 ? 'Work on improving relationship dynamics' : undefined,
    });

    // 6. Timeline Adherence Score
    const daysToClose = Math.floor((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const timelineScore = (() => {
      if (deal.stage === 'closed-won' || deal.stage === 'closed-lost') return 100;
      if (daysToClose < 0) return 0; // Overdue
      if (deal.stage === 'negotiation' && daysToClose >= 7) return 100;
      if (deal.stage === 'proposal' && daysToClose >= 14) return 100;
      if (deal.stage === 'qualification' && daysToClose >= 30) return 100;
      if (deal.stage === 'discovery' && daysToClose >= 45) return 100;
      return 50; // Timeline at risk
    })();

    metrics.push({
      name: 'Timeline Risk',
      score: timelineScore,
      weight: 0.1,
      status: timelineScore >= 75 ? 'good' : timelineScore >= 50 ? 'warning' : 'critical',
      description: daysToClose < 0 ? `${Math.abs(daysToClose)} days overdue` : `${daysToClose} days to close`,
      recommendation: timelineScore < 50 ? 'Review and update timeline with stakeholders' : undefined,
    });

    return metrics;
  }, [deal]);

  // Calculate overall weighted score
  const overallScore = useMemo(() => {
    const weightedSum = healthMetrics.reduce((sum, metric) => sum + (metric.score * metric.weight), 0);
    const totalWeight = healthMetrics.reduce((sum, metric) => sum + metric.weight, 0);
    return Math.round(weightedSum / totalWeight);
  }, [healthMetrics]);

  // Determine overall status
  const overallStatus = overallScore >= 75 ? 'healthy' : overallScore >= 50 ? 'at-risk' : 'critical';

  // Visual score ring
  const scoreRingRadius = 45;
  const scoreRingCircumference = 2 * Math.PI * scoreRingRadius;
  const scoreRingOffset = scoreRingCircumference - (overallScore / 100) * scoreRingCircumference;

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 75) return 'stroke-green-400';
    if (score >= 50) return 'stroke-yellow-400';
    return 'stroke-red-400';
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'at-risk':
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Health Score */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="flex items-center gap-4">
          {/* Score Ring */}
          <div className="relative">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={scoreRingRadius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-700"
              />
              <circle
                cx="50"
                cy="50"
                r={scoreRingRadius}
                strokeWidth="8"
                fill="none"
                className={`${getScoreRingColor(overallScore)} transition-all duration-500`}
                strokeDasharray={scoreRingCircumference}
                strokeDashoffset={scoreRingOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}
                </span>
                <p className="text-xs text-gray-500">Score</p>
              </div>
            </div>
          </div>

          {/* Deal Info */}
          <div>
            <h3 className="font-semibold text-white mb-1">{deal.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{deal.company}</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyles(overallStatus)}`}>
              {overallStatus.replace('-', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-right">
          <div>
            <p className="text-xs text-gray-500">Deal Value</p>
            <p className="text-lg font-bold text-white">${(deal.value / 1000).toFixed(0)}k</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Probability</p>
            <p className="text-lg font-bold text-white">{deal.probability}%</p>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {detailed && (
        <div className="space-y-2">
          {healthMetrics.map(metric => (
            <div
              key={metric.name}
              onClick={() => onMetricClick?.(metric.name)}
              className="p-3 bg-gray-900/30 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{metric.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadgeStyles(metric.status)}`}>
                    {metric.status}
                  </span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(metric.score)}`}>
                  {metric.score}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    metric.score >= 75 ? 'bg-green-400' :
                    metric.score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>

              <p className="text-xs text-gray-400 mb-1">{metric.description}</p>

              {metric.recommendation && (
                <div className="mt-2 p-2 bg-purple-500/10 rounded border border-purple-500/20">
                  <p className="text-xs text-purple-400">
                    💡 {metric.recommendation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Recommendations */}
      {detailed && healthMetrics.some(m => m.recommendation) && (
        <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <h4 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Key Actions to Improve Health
          </h4>
          <ul className="space-y-1">
            {healthMetrics
              .filter(m => m.recommendation && m.score < 75)
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
              .map((metric, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span>{metric.recommendation}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}