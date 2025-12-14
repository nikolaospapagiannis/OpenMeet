'use client';

import { Mic, MessageSquare, Clock, TrendingUp, TrendingDown, Minus, Users, Volume2 } from 'lucide-react';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';

interface CallMetrics {
  talkToListenRatio: number;
  questionCount: number;
  openEndedQuestions: number;
  closedQuestions: number;
  interruptionCount: number;
  averageResponseTime: number;
  longestMonologue: number;
  engagementScore: number;
  sentimentTrend: 'improving' | 'declining' | 'stable';
}

interface CallMetricsPanelProps {
  metrics: CallMetrics;
}

export function CallMetricsPanel({ metrics }: CallMetricsPanelProps) {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-[var(--ff-text-muted)]" />;
    }
  };

  const getMetricQuality = (metricType: string, value: number): { color: string; label: string } => {
    switch (metricType) {
      case 'talkToListen':
        if (value <= 0.5) return { color: '#22c55e', label: 'Excellent' };
        if (value <= 0.7) return { color: '#3b82f6', label: 'Good' };
        if (value <= 1) return { color: '#f59e0b', label: 'Fair' };
        return { color: '#ef4444', label: 'Poor' };

      case 'interruptions':
        if (value === 0) return { color: '#22c55e', label: 'None' };
        if (value <= 2) return { color: '#3b82f6', label: 'Minimal' };
        if (value <= 5) return { color: '#f59e0b', label: 'Moderate' };
        return { color: '#ef4444', label: 'Excessive' };

      case 'engagement':
        if (value >= 80) return { color: '#22c55e', label: 'High' };
        if (value >= 60) return { color: '#3b82f6', label: 'Good' };
        if (value >= 40) return { color: '#f59e0b', label: 'Moderate' };
        return { color: '#ef4444', label: 'Low' };

      default:
        return { color: '#6b7280', label: 'N/A' };
    }
  };

  const metricCards = [
    {
      icon: <Mic className="h-5 w-5" />,
      title: 'Talk-to-Listen Ratio',
      value: `${(metrics.talkToListenRatio * 100).toFixed(0)}%`,
      subtitle: 'talking time',
      quality: getMetricQuality('talkToListen', metrics.talkToListenRatio)
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Questions Asked',
      value: metrics.questionCount,
      subtitle: `${metrics.openEndedQuestions} open-ended`,
      quality: { color: '#3b82f6', label: `${metrics.closedQuestions} closed` }
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Interruptions',
      value: metrics.interruptionCount,
      subtitle: 'times interrupted',
      quality: getMetricQuality('interruptions', metrics.interruptionCount)
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: 'Avg Response Time',
      value: formatTime(metrics.averageResponseTime),
      subtitle: 'to respond',
      quality: { color: '#3b82f6', label: 'Responsive' }
    },
    {
      icon: <Volume2 className="h-5 w-5" />,
      title: 'Longest Monologue',
      value: formatTime(metrics.longestMonologue),
      subtitle: 'continuous speech',
      quality: metrics.longestMonologue > 120
        ? { color: '#f59e0b', label: 'Too Long' }
        : { color: '#22c55e', label: 'Good' }
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: 'Engagement Score',
      value: `${metrics.engagementScore}%`,
      subtitle: 'overall engagement',
      quality: getMetricQuality('engagement', metrics.engagementScore)
    }
  ];

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <CardGlassTitle>Call Metrics Analysis</CardGlassTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--ff-text-muted)]">Sentiment Trend:</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.sentimentTrend)}
              <span className="text-sm capitalize text-[var(--ff-text-secondary)]">
                {metrics.sentimentTrend}
              </span>
            </div>
          </div>
        </div>
      </CardGlassHeader>
      <CardGlassContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricCards.map((metric, idx) => (
            <div
              key={idx}
              className="p-4 bg-[var(--ff-bg-dark)] rounded-xl border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/30 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${metric.quality.color}20` }}
                >
                  <div style={{ color: metric.quality.color }}>
                    {metric.icon}
                  </div>
                </div>
                <div
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${metric.quality.color}20`,
                    color: metric.quality.color
                  }}
                >
                  {metric.quality.label}
                </div>
              </div>

              {/* Content */}
              <div>
                <p className="text-xs font-medium text-[var(--ff-text-muted)] mb-1">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-[var(--ff-text-primary)] mb-1">
                  {metric.value}
                </p>
                <p className="text-xs text-[var(--ff-text-muted)]">
                  {metric.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Visual Breakdown */}
        <div className="mt-6 pt-6 border-t border-[var(--ff-border)]">
          <h3 className="text-sm font-semibold text-[var(--ff-text-primary)] mb-4">
            Question Type Distribution
          </h3>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="flex h-8 rounded-lg overflow-hidden bg-[var(--ff-bg-dark)]">
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${(metrics.openEndedQuestions / metrics.questionCount) * 100}%` }}
                />
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${(metrics.closedQuestions / metrics.questionCount) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                <span className="text-[var(--ff-text-muted)]">
                  Open-ended ({metrics.openEndedQuestions})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span className="text-[var(--ff-text-muted)]">
                  Closed ({metrics.closedQuestions})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-[var(--ff-purple-500)]/5 rounded-lg border border-[var(--ff-purple-500)]/20">
          <p className="text-sm text-[var(--ff-text-secondary)]">
            <span className="font-semibold text-[var(--ff-purple-500)]">AI Insight:</span>{' '}
            {metrics.talkToListenRatio < 0.5
              ? "Great job listening! You're giving the other party plenty of space to share their thoughts."
              : metrics.talkToListenRatio > 0.7
              ? "Consider asking more questions and listening more actively to better understand the other party's needs."
              : "Good balance between talking and listening. Keep engaging with thoughtful questions."}
          </p>
        </div>
      </CardGlassContent>
    </CardGlass>
  );
}