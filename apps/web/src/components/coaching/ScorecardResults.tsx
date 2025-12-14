'use client';

import { TrendingUp, TrendingDown, Minus, Trophy, Target, AlertCircle, CheckCircle } from 'lucide-react';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { ScoreGauge } from './ScoreGauge';

interface ScorecardResult {
  id: string;
  meetingId: string;
  frameworkId: string;
  frameworkName: string;
  overallScore: number;
  criteriaScores: CriterionScore[];
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  metrics: any;
  generatedAt: string;
}

interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  feedback: string;
  examples: string[];
  weight: number;
}

interface ScorecardResultsProps {
  result: ScorecardResult;
  onScoreAnother?: () => void;
}

export function ScorecardResults({ result, onScoreAnother }: ScorecardResultsProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e'; // Excellent
    if (score >= 60) return '#3b82f6'; // Good
    if (score >= 40) return '#f59e0b'; // Needs Work
    return '#ef4444'; // Poor
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Trophy className="h-5 w-5" />;
    if (score >= 60) return <CheckCircle className="h-5 w-5" />;
    if (score >= 40) return <AlertCircle className="h-5 w-5" />;
    return <Target className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with Overall Score */}
      <CardGlass>
        <CardGlassHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardGlassTitle>{result.frameworkName} Scorecard</CardGlassTitle>
              <p className="text-sm text-[var(--ff-text-muted)] mt-1">
                Generated {new Date(result.generatedAt).toLocaleString()}
              </p>
            </div>
            {onScoreAnother && (
              <Button
                onClick={onScoreAnother}
                className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)]"
              >
                Score Another Meeting
              </Button>
            )}
          </div>
        </CardGlassHeader>
        <CardGlassContent>
          <div className="flex items-center gap-8">
            {/* Score Gauge */}
            <div className="flex-shrink-0">
              <ScoreGauge score={result.overallScore} />
            </div>

            {/* Score Details */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                  style={{
                    backgroundColor: `${getScoreColor(result.overallScore)}20`,
                    color: getScoreColor(result.overallScore)
                  }}
                >
                  {getScoreIcon(result.overallScore)}
                  <span className="font-semibold">{getScoreLabel(result.overallScore)}</span>
                </div>
                <span className="text-3xl font-bold text-[var(--ff-text-primary)]">
                  {result.overallScore}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--ff-text-muted)] mb-1">Criteria Evaluated</p>
                  <p className="text-lg font-semibold text-[var(--ff-text-primary)]">
                    {result.criteriaScores.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--ff-text-muted)] mb-1">Meeting ID</p>
                  <p className="text-sm font-mono text-[var(--ff-text-secondary)]">
                    {result.meetingId.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardGlassContent>
      </CardGlass>

      {/* Criteria Breakdown */}
      <CardGlass>
        <CardGlassHeader>
          <CardGlassTitle>Criteria Breakdown</CardGlassTitle>
        </CardGlassHeader>
        <CardGlassContent>
          <div className="space-y-4">
            {result.criteriaScores
              .sort((a, b) => b.score - a.score)
              .map((criterion) => (
                <div key={criterion.criterionId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: getScoreColor(criterion.score) }}
                      />
                      <div>
                        <p className="font-medium text-[var(--ff-text-primary)]">
                          {criterion.criterionName}
                        </p>
                        <p className="text-xs text-[var(--ff-text-muted)]">
                          Weight: {criterion.weight}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: getScoreColor(criterion.score) }}
                        >
                          {criterion.score}
                        </span>
                        <span className="text-sm text-[var(--ff-text-muted)]">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="ml-5">
                    <div className="w-full h-2 bg-[var(--ff-border)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${criterion.score}%`,
                          backgroundColor: getScoreColor(criterion.score)
                        }}
                      />
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="ml-5 p-3 bg-[var(--ff-bg-dark)] rounded-lg">
                    <p className="text-sm text-[var(--ff-text-secondary)]">
                      {criterion.feedback}
                    </p>
                    {criterion.examples.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-[var(--ff-text-muted)]">Examples:</p>
                        {criterion.examples.map((example, idx) => (
                          <p key={idx} className="text-xs text-[var(--ff-text-muted)] italic pl-2 border-l-2 border-[var(--ff-border)]">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardGlassContent>
      </CardGlass>

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <CardGlass>
          <CardGlassHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <CardGlassTitle>Key Strengths</CardGlassTitle>
            </div>
          </CardGlassHeader>
          <CardGlassContent>
            <div className="space-y-3">
              {result.strengths.map((strength, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--ff-text-secondary)]">{strength}</p>
                </div>
              ))}
            </div>
          </CardGlassContent>
        </CardGlass>

        {/* Areas for Improvement */}
        <CardGlass>
          <CardGlassHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <CardGlassTitle>Areas for Improvement</CardGlassTitle>
            </div>
          </CardGlassHeader>
          <CardGlassContent>
            <div className="space-y-3">
              {result.improvements.map((improvement, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--ff-text-secondary)]">{improvement}</p>
                </div>
              ))}
            </div>
          </CardGlassContent>
        </CardGlass>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <CardGlass>
          <CardGlassHeader>
            <CardGlassTitle>AI Recommendations</CardGlassTitle>
          </CardGlassHeader>
          <CardGlassContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendations.map((recommendation, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[var(--ff-bg-dark)] rounded-lg border border-[var(--ff-purple-500)]/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[var(--ff-purple-500)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--ff-purple-500)]">
                        {idx + 1}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ff-text-secondary)]">{recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardGlassContent>
        </CardGlass>
      )}
    </div>
  );
}