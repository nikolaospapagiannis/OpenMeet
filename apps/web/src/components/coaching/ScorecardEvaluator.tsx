'use client';

import { useState, useEffect } from 'react';
import { FileText, Zap, CheckCircle, AlertCircle, Clock, Download, RefreshCw, ChevronDown } from 'lucide-react';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { ScoreGauge } from './ScoreGauge';

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  keyPhrases?: string[];
}

interface EvaluationResult {
  criterionId: string;
  criterionName: string;
  score: number;
  feedback: string;
  examples: string[];
  improvements: string[];
}

interface ScorecardEvaluatorProps {
  meetingId?: string;
  transcript?: TranscriptSegment[];
  scorecardId?: string;
  onEvaluate?: (meetingId: string, scorecardId: string) => Promise<any>;
  autoEvaluate?: boolean;
}

export function ScorecardEvaluator({
  meetingId,
  transcript,
  scorecardId,
  onEvaluate,
  autoEvaluate = true
}: ScorecardEvaluatorProps) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[] | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(null);
  const [evaluationTime, setEvaluationTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoEvaluate && meetingId && scorecardId && !evaluationResults) {
      handleEvaluate();
    }
  }, [meetingId, scorecardId, autoEvaluate]);

  const handleEvaluate = async () => {
    if (!meetingId || !scorecardId) {
      setError('Meeting ID and Scorecard ID are required');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Simulate AI evaluation with mock data
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResults: EvaluationResult[] = [
        {
          criterionId: '1',
          criterionName: 'Discovery Questions',
          score: 85,
          feedback: 'Excellent use of open-ended questions to uncover customer needs',
          examples: [
            '"What challenges are you facing with your current solution?"',
            '"How would solving this problem impact your team?"'
          ],
          improvements: [
            'Consider asking more quantifying questions about impact',
            'Dig deeper into timeline and urgency'
          ]
        },
        {
          criterionId: '2',
          criterionName: 'Active Listening',
          score: 72,
          feedback: 'Good listening skills with room for improvement in acknowledgment',
          examples: [
            'Paraphrased customer concerns effectively at 12:30',
            'Asked clarifying questions about budget constraints'
          ],
          improvements: [
            'Allow more pause time after customer responses',
            'Reduce interruptions during customer explanations'
          ]
        },
        {
          criterionId: '3',
          criterionName: 'Value Proposition',
          score: 90,
          feedback: 'Strong articulation of value aligned with customer needs',
          examples: [
            'Connected product features to specific customer pain points',
            'Quantified potential ROI based on customer data'
          ],
          improvements: [
            'Include more customer success stories',
            'Provide industry-specific examples'
          ]
        },
        {
          criterionId: '4',
          criterionName: 'Objection Handling',
          score: 68,
          feedback: 'Addressed objections but could be more proactive',
          examples: [
            'Successfully addressed pricing concerns with ROI data',
            'Handled technical questions with expertise'
          ],
          improvements: [
            'Anticipate common objections earlier in conversation',
            'Use more feel-felt-found framework for empathy'
          ]
        },
        {
          criterionId: '5',
          criterionName: 'Next Steps',
          score: 95,
          feedback: 'Clear and actionable next steps with mutual commitment',
          examples: [
            'Secured specific follow-up meeting date',
            'Defined clear action items for both parties'
          ],
          improvements: [
            'Send follow-up email within 24 hours',
            'Create shared success criteria document'
          ]
        }
      ];

      setEvaluationResults(mockResults);
      const avgScore = mockResults.reduce((sum, r) => sum + r.score, 0) / mockResults.length;
      setOverallScore(Math.round(avgScore));
      setEvaluationTime(Date.now() - startTime);

      if (onEvaluate) {
        const result = await onEvaluate(meetingId, scorecardId);
        if (result) {
          // Update with actual results if available
          console.log('Evaluation result:', result);
        }
      }
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setError(err.message || 'Failed to evaluate scorecard');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  };

  const exportResults = () => {
    if (!evaluationResults) return;

    const report = {
      meetingId,
      scorecardId,
      overallScore,
      evaluationDate: new Date().toISOString(),
      results: evaluationResults,
      evaluationTimeMs: evaluationTime
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scorecard-evaluation-${meetingId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--ff-purple-500)]/10 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-[var(--ff-purple-500)]" />
            </div>
            <div>
              <CardGlassTitle>Automatic Scorecard Evaluator</CardGlassTitle>
              <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
                AI-powered evaluation from meeting transcripts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {evaluationResults && (
              <>
                <Button
                  onClick={exportResults}
                  className="px-4 py-2 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded-lg hover:bg-[var(--ff-border)] flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isEvaluating ? 'animate-spin' : ''}`} />
                  Re-evaluate
                </Button>
              </>
            )}
          </div>
        </div>
      </CardGlassHeader>
      <CardGlassContent className="space-y-4">
        {/* Evaluation Status */}
        {!evaluationResults && !isEvaluating && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-[var(--ff-text-muted)] mb-3" />
            <p className="text-[var(--ff-text-muted)] mb-4">
              Ready to evaluate meeting transcript
            </p>
            <Button
              onClick={handleEvaluate}
              disabled={!meetingId || !scorecardId}
              className="px-6 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)]"
            >
              Start Evaluation
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isEvaluating && (
          <div className="text-center py-12">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[var(--ff-purple-500)] border-r-transparent mb-4" />
            <p className="text-[var(--ff-text-primary)] font-medium mb-2">
              Analyzing Transcript...
            </p>
            <p className="text-xs text-[var(--ff-text-muted)]">
              Using AI to evaluate against scorecard criteria
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">Evaluation Failed</p>
                <p className="text-xs text-red-400/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {evaluationResults && overallScore !== null && (
          <>
            {/* Overall Score */}
            <div className="bg-[var(--ff-bg-dark)] rounded-xl p-6 border border-[var(--ff-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--ff-text-muted)] mb-2">Overall Score</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold text-[var(--ff-text-primary)]">
                      {overallScore}
                    </span>
                    <span className="text-lg text-[var(--ff-text-muted)]">/100</span>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${getScoreColor(overallScore)}20`,
                        color: getScoreColor(overallScore)
                      }}
                    >
                      {getScoreLabel(overallScore)}
                    </span>
                  </div>
                  {evaluationTime && (
                    <p className="text-xs text-[var(--ff-text-muted)] mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Evaluated in {(evaluationTime / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <ScoreGauge score={overallScore} size={100} />
                </div>
              </div>
            </div>

            {/* Criteria Results */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--ff-text-primary)]">
                Detailed Evaluation
              </h3>
              {evaluationResults.map((result) => (
                <div
                  key={result.criterionId}
                  className="bg-[var(--ff-bg-dark)] rounded-lg border border-[var(--ff-border)] overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedCriterion(
                      selectedCriterion === result.criterionId ? null : result.criterionId
                    )}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--ff-bg-layer)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: getScoreColor(result.score) }}
                      />
                      <div className="text-left">
                        <p className="font-medium text-[var(--ff-text-primary)]">
                          {result.criterionName}
                        </p>
                        <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
                          {result.feedback}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: getScoreColor(result.score) }}
                        >
                          {result.score}
                        </span>
                        <span className="text-sm text-[var(--ff-text-muted)]">/100</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--ff-text-muted)] transition-transform ${
                          selectedCriterion === result.criterionId ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {selectedCriterion === result.criterionId && (
                    <div className="px-4 pb-4 border-t border-[var(--ff-border)] space-y-3">
                      {/* Examples */}
                      {result.examples.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[var(--ff-text-primary)] mb-2">
                            Positive Examples:
                          </p>
                          <div className="space-y-1">
                            {result.examples.map((example, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-[var(--ff-text-secondary)] italic">
                                  {example}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Improvements */}
                      {result.improvements.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[var(--ff-text-primary)] mb-2">
                            Suggested Improvements:
                          </p>
                          <div className="space-y-1">
                            {result.improvements.map((improvement, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1 flex-shrink-0" />
                                <p className="text-xs text-[var(--ff-text-secondary)]">
                                  {improvement}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}