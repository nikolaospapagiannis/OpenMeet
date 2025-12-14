'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  MessageSquare,
  Activity,
  Target,
  Award,
  Info,
} from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';

interface EngagementData {
  overallScore: number;
  participationBalance: number;
  questionRate: number;
  interactionLevel: number;
  comparisonToPrevious?: {
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface EngagementScoreProps {
  data: EngagementData;
  detailed?: boolean;
}

function getScoreLabel(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 85) {
    return {
      label: 'Excellent',
      color: 'green',
      description: 'Exceptional engagement with balanced participation',
    };
  } else if (score >= 70) {
    return {
      label: 'Good',
      color: 'blue',
      description: 'Strong engagement with room for improvement',
    };
  } else if (score >= 50) {
    return {
      label: 'Fair',
      color: 'amber',
      description: 'Moderate engagement with significant opportunities',
    };
  } else {
    return {
      label: 'Poor',
      color: 'red',
      description: 'Low engagement requiring attention',
    };
  }
}

function getMetricColor(value: number): string {
  if (value >= 80) return '#22c55e'; // Green
  if (value >= 60) return '#3b82f6'; // Blue
  if (value >= 40) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
}

export function EngagementScore({ data, detailed = false }: EngagementScoreProps) {
  const scoreInfo = getScoreLabel(data.overallScore);

  // Prepare data for radial chart
  const chartData = [
    {
      name: 'Overall',
      value: data.overallScore,
      fill: getMetricColor(data.overallScore),
    },
  ];

  // Detailed metrics data
  const metrics = [
    {
      name: 'Participation Balance',
      value: data.participationBalance,
      icon: Users,
      description: 'How evenly participants contributed',
      color: getMetricColor(data.participationBalance),
    },
    {
      name: 'Question Rate',
      value: data.questionRate,
      icon: MessageSquare,
      description: 'Frequency of questions asked',
      color: getMetricColor(data.questionRate),
    },
    {
      name: 'Interaction Level',
      value: data.interactionLevel,
      icon: Activity,
      description: 'Active exchanges and responses',
      color: getMetricColor(data.interactionLevel),
    },
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      case 'stable':
        return Minus;
    }
  };

  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Engagement Score</h3>
      </div>

      {/* Main Score Display */}
      <div className="flex flex-col items-center mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            data={chartData}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Score Display (centered in the radial chart) */}
        <div className="absolute flex flex-col items-center" style={{ marginTop: '60px' }}>
          <div className="text-5xl font-bold text-white">
            {data.overallScore}
          </div>
          <Badge
            variant="secondary"
            className={`text-xs bg-${scoreInfo.color}-500/20 text-${scoreInfo.color}-400 mt-2`}
          >
            {scoreInfo.label}
          </Badge>
        </div>
      </div>

      {/* Comparison to Previous */}
      {data.comparisonToPrevious && (
        <div className="mb-6 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">vs. Previous Meeting</span>
            <div className="flex items-center gap-2">
              {(() => {
                const TrendIcon = getTrendIcon(data.comparisonToPrevious.trend);
                const isPositive = data.comparisonToPrevious.trend === 'up';
                const isNeutral = data.comparisonToPrevious.trend === 'stable';
                return (
                  <>
                    <TrendIcon
                      className={`w-4 h-4 ${
                        isPositive
                          ? 'text-green-400'
                          : isNeutral
                          ? 'text-gray-400'
                          : 'text-red-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        isPositive
                          ? 'text-green-400'
                          : isNeutral
                          ? 'text-gray-400'
                          : 'text-red-400'
                      }`}
                    >
                      {isPositive && '+'}
                      {data.comparisonToPrevious.change.toFixed(1)}%
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-300">{scoreInfo.description}</p>
        </div>
      </div>

      {/* Detailed Metrics */}
      {detailed && (
        <div className="space-y-4">
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Engagement Factors
            </h4>

            <div className="space-y-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                const percentage = metric.value;
                return (
                  <div key={metric.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">{metric.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {percentage}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: metric.color,
                        }}
                      />
                    </div>

                    <p className="text-xs text-gray-500">{metric.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Recommendations
            </h4>

            <div className="space-y-2">
              {data.participationBalance < 60 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-300">
                    • Encourage quieter participants to share their thoughts
                  </p>
                </div>
              )}

              {data.questionRate < 50 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-300">
                    • Foster more questions by pausing for Q&A
                  </p>
                </div>
              )}

              {data.interactionLevel < 60 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-300">
                    • Use interactive techniques like polls or breakout discussions
                  </p>
                </div>
              )}

              {data.overallScore >= 80 && (
                <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-300">
                    • Great engagement! Continue these meeting practices
                  </p>
                </div>
              )}

              {data.comparisonToPrevious &&
                data.comparisonToPrevious.trend === 'down' && (
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-300">
                      • Engagement declined - review meeting format and participation
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Simple view for overview tab */}
      {!detailed && (
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-700">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.name}
                className="flex flex-col items-center p-2 rounded bg-gray-800/30"
              >
                <Icon className="w-4 h-4 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500 text-center mb-1">
                  {metric.name.split(' ')[0]}
                </span>
                <span className="text-sm font-semibold text-white">{metric.value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Score Interpretation Guide */}
      {detailed && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Score Guide
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-400">85-100: Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-400">70-84: Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-gray-400">50-69: Fair</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-400">0-49: Poor</span>
            </div>
          </div>
        </div>
      )}
    </CardGlass>
  );
}
