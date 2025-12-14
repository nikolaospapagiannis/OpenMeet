'use client';

import { useState } from 'react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  Activity,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Award,
  BookOpen,
} from 'lucide-react';
import { OverallMetrics, PaceAnalysis } from './TalkPatternAnalysis';

interface CoachingRecommendationsProps {
  recommendations: string[];
  overallMetrics: OverallMetrics;
  paceAnalysis: PaceAnalysis;
}

interface RecommendationCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  recommendations: string[];
  priority: 'high' | 'medium' | 'low';
}

export function CoachingRecommendations({
  recommendations,
  overallMetrics,
  paceAnalysis,
}: CoachingRecommendationsProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [completedRecommendations, setCompletedRecommendations] = useState<Set<string>>(
    new Set()
  );

  // Categorize recommendations
  const categories: RecommendationCategory[] = [];

  // Speaking Balance
  if (overallMetrics.talkToListenRatio > 1.5 || overallMetrics.talkToListenRatio < 0.5) {
    categories.push({
      title: 'Speaking Balance',
      icon: <Users className="w-5 h-5" />,
      color: 'text-purple-400',
      priority: 'high',
      recommendations: [
        overallMetrics.talkToListenRatio > 1.5
          ? 'Allow more time for others to contribute'
          : 'Be more active in the conversation',
        'Practice active listening techniques',
        'Ask follow-up questions to encourage participation',
        'Use pauses to invite others to speak',
      ],
    });
  }

  // Pace Control
  if (paceAnalysis.paceVariation === 'erratic' || paceAnalysis.overallPace > 160 || paceAnalysis.overallPace < 120) {
    categories.push({
      title: 'Pace Control',
      icon: <Activity className="w-5 h-5" />,
      color: 'text-blue-400',
      priority: paceAnalysis.paceVariation === 'erratic' ? 'high' : 'medium',
      recommendations: [
        ...paceAnalysis.recommendations,
        'Practice breathing exercises to maintain steady pace',
        'Use pauses for emphasis instead of speed variations',
        'Record yourself to become aware of pace patterns',
      ],
    });
  }

  // Interaction Quality
  if (overallMetrics.totalInterruptions > 10 || overallMetrics.totalMonologues > 3) {
    categories.push({
      title: 'Interaction Quality',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'text-amber-400',
      priority: 'medium',
      recommendations: [
        overallMetrics.totalInterruptions > 10
          ? 'Wait for natural pauses before speaking'
          : '',
        overallMetrics.totalMonologues > 3
          ? 'Break down long explanations into digestible segments'
          : '',
        'Check for understanding after key points',
        'Use visual aids to support verbal explanations',
      ].filter(r => r),
    });
  }

  // Engagement Techniques
  if (overallMetrics.totalQuestions < 5 || overallMetrics.silencePercentage > 15) {
    categories.push({
      title: 'Engagement Techniques',
      icon: <Target className="w-5 h-5" />,
      color: 'text-green-400',
      priority: 'medium',
      recommendations: [
        overallMetrics.totalQuestions < 5
          ? 'Ask more open-ended questions'
          : '',
        'Use engaging storytelling techniques',
        'Create interactive moments in the conversation',
        overallMetrics.silencePercentage > 15
          ? 'Address technical issues or disengagement'
          : '',
      ].filter(r => r),
    });
  }

  // Add general recommendations
  if (recommendations.length > 0) {
    categories.push({
      title: 'General Improvements',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-gray-400',
      priority: 'low',
      recommendations: recommendations,
    });
  }

  // Calculate overall performance score
  const performanceScore = calculatePerformanceScore(overallMetrics, paceAnalysis);

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  const toggleRecommendation = (recommendation: string) => {
    const newCompleted = new Set(completedRecommendations);
    if (newCompleted.has(recommendation)) {
      newCompleted.delete(recommendation);
    } else {
      newCompleted.add(recommendation);
    }
    setCompletedRecommendations(newCompleted);
  };

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <CardGlass variant="default" hover>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Communication Performance</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-white">{performanceScore}</div>
            <Badge
              variant="secondary"
              className={`text-xs ${getScoreColor(performanceScore)}`}
            >
              {getScoreLabel(performanceScore)}
            </Badge>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Balance</div>
            <div className="flex items-center justify-center gap-1">
              {getMetricScore(overallMetrics.talkToListenRatio, 'balance')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Pace</div>
            <div className="flex items-center justify-center gap-1">
              {getMetricScore(paceAnalysis.overallPace, 'pace')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Engagement</div>
            <div className="flex items-center justify-center gap-1">
              {getMetricScore(overallMetrics.totalQuestions, 'engagement')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Flow</div>
            <div className="flex items-center justify-center gap-1">
              {getMetricScore(overallMetrics.totalInterruptions, 'flow')}
            </div>
          </div>
        </div>
      </CardGlass>

      {/* AI-Generated Coaching Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Personalized Coaching</h3>
          <Badge variant="outline" className="text-xs">
            AI-Generated
          </Badge>
        </div>

        {categories.map((category) => (
          <CardGlass
            key={category.title}
            variant="default"
            className={`border-l-4 ${getBorderColor(category.priority)}`}
          >
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleCategory(category.title)}
            >
              <div className="flex items-center gap-3">
                <div className={category.color}>{category.icon}</div>
                <div>
                  <h4 className="font-medium text-white">{category.title}</h4>
                  <p className="text-xs text-gray-400">
                    {category.recommendations.length} recommendations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getPriorityBadge(category.priority)}
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedCategory === category.title ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </div>

            {expandedCategory === category.title && (
              <div className="mt-4 space-y-2 border-t border-gray-700 pt-4">
                {category.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-800/50 transition-colors"
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRecommendation(rec);
                      }}
                    >
                      {completedRecommendations.has(rec) ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <div className="w-4 h-4 border border-gray-500 rounded" />
                      )}
                    </Button>
                    <p
                      className={`text-sm flex-1 ${
                        completedRecommendations.has(rec)
                          ? 'text-gray-500 line-through'
                          : 'text-gray-300'
                      }`}
                    >
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardGlass>
        ))}
      </div>

      {/* Learning Resources */}
      <CardGlass variant="default">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <h4 className="font-medium text-white">Recommended Resources</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => console.log('Open resource')}
          >
            <Target className="w-4 h-4 mr-2" />
            Active Listening Techniques
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => console.log('Open resource')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Effective Questioning
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => console.log('Open resource')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Managing Speaking Pace
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => console.log('Open resource')}
          >
            <Users className="w-4 h-4 mr-2" />
            Facilitating Group Discussions
          </Button>
        </div>
      </CardGlass>

      {/* Progress Tracking */}
      {completedRecommendations.size > 0 && (
        <CardGlass variant="default">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Implementation Progress</h4>
              <p className="text-sm text-gray-400 mt-1">
                {completedRecommendations.size} of{' '}
                {categories.reduce((sum, cat) => sum + cat.recommendations.length, 0)}{' '}
                recommendations completed
              </p>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {Math.round(
                (completedRecommendations.size /
                  categories.reduce((sum, cat) => sum + cat.recommendations.length, 0)) *
                  100
              )}
              %
            </div>
          </div>
        </CardGlass>
      )}
    </div>
  );
}

// Helper functions
function calculatePerformanceScore(metrics: OverallMetrics, pace: PaceAnalysis): number {
  let score = 100;

  // Talk-to-listen ratio (optimal: 0.5-1.5)
  if (metrics.talkToListenRatio > 2 || metrics.talkToListenRatio < 0.3) {
    score -= 20;
  } else if (metrics.talkToListenRatio > 1.5 || metrics.talkToListenRatio < 0.5) {
    score -= 10;
  }

  // Pace (optimal: 120-150)
  if (pace.overallPace > 160 || pace.overallPace < 100) {
    score -= 15;
  } else if (pace.overallPace > 150 || pace.overallPace < 120) {
    score -= 7;
  }

  // Interruptions
  if (metrics.totalInterruptions > 15) {
    score -= 15;
  } else if (metrics.totalInterruptions > 10) {
    score -= 7;
  }

  // Questions
  if (metrics.totalQuestions < 3) {
    score -= 10;
  } else if (metrics.totalQuestions < 5) {
    score -= 5;
  }

  // Monologues
  if (metrics.totalMonologues > 5) {
    score -= 10;
  } else if (metrics.totalMonologues > 3) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

function getMetricScore(value: number, type: string): React.ReactNode {
  let score = 5;
  let color = 'text-green-400';

  switch (type) {
    case 'balance':
      if (value > 2 || value < 0.3) {
        score = 2;
        color = 'text-red-400';
      } else if (value > 1.5 || value < 0.5) {
        score = 3;
        color = 'text-amber-400';
      }
      break;
    case 'pace':
      if (value > 160 || value < 100) {
        score = 2;
        color = 'text-red-400';
      } else if (value > 150 || value < 120) {
        score = 3;
        color = 'text-amber-400';
      }
      break;
    case 'engagement':
      if (value < 3) {
        score = 2;
        color = 'text-red-400';
      } else if (value < 5) {
        score = 3;
        color = 'text-amber-400';
      }
      break;
    case 'flow':
      if (value > 15) {
        score = 2;
        color = 'text-red-400';
      } else if (value > 10) {
        score = 3;
        color = 'text-amber-400';
      }
      break;
  }

  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < score ? color : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

function getBorderColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'border-red-500';
    case 'medium':
      return 'border-amber-500';
    case 'low':
      return 'border-gray-500';
    default:
      return 'border-gray-700';
  }
}

function getPriorityBadge(priority: string): React.ReactNode {
  switch (priority) {
    case 'high':
      return (
        <Badge variant="destructive" className="text-xs">
          High Priority
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="secondary" className="text-xs">
          Low
        </Badge>
      );
    default:
      return null;
  }
}