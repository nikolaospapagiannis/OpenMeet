'use client';

import { useState } from 'react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Search,
} from 'lucide-react';

interface Question {
  id: string;
  speaker: string;
  question: string;
  timestamp: number;
  answered: boolean;
  answerSnippet?: string;
  answerTimestamp?: number;
}

interface QuestionAnalysisProps {
  questions: Question[];
  onQuestionClick?: (timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function QuestionAnalysis({ questions, onQuestionClick }: QuestionAnalysisProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate statistics
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter((q) => q.answered).length;
  const unansweredQuestions = totalQuestions - answeredQuestions;
  const answerRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  // Group questions by speaker
  const questionsBySpeaker = questions.reduce((acc, q) => {
    acc[q.speaker] = (acc[q.speaker] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topAsker = Object.entries(questionsBySpeaker).sort(([, a], [, b]) => b - a)[0];

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'answered' && q.answered) ||
      (filterStatus === 'unanswered' && !q.answered);

    const matchesSearch =
      searchQuery === '' ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.speaker.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleQuestionClick = (timestamp: number) => {
    if (onQuestionClick) {
      onQuestionClick(timestamp);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Total Questions</div>
              <div className="text-lg font-bold text-white">{totalQuestions}</div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Answered</div>
              <div className="text-lg font-bold text-white">{answeredQuestions}</div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Unanswered</div>
              <div className="text-lg font-bold text-white">{unansweredQuestions}</div>
            </div>
          </div>
        </CardGlass>

        <CardGlass variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Answer Rate</div>
              <div className="text-lg font-bold text-white">{answerRate.toFixed(0)}%</div>
            </div>
          </div>
        </CardGlass>
      </div>

      {/* Filters and Search */}
      <CardGlass variant="default" padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              All ({totalQuestions})
            </button>
            <button
              onClick={() => setFilterStatus('answered')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'answered'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Answered ({answeredQuestions})
            </button>
            <button
              onClick={() => setFilterStatus('unanswered')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'unanswered'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Unanswered ({unansweredQuestions})
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions or speakers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </CardGlass>

      {/* Questions List */}
      <CardGlass variant="default">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <h4 className="font-semibold text-white">Questions</h4>
            <span className="text-sm text-gray-400">
              ({filteredQuestions.length} {filterStatus !== 'all' && filterStatus})
            </span>
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((question) => (
              <div
                key={question.id}
                onClick={() => handleQuestionClick(question.timestamp)}
                className={`
                  p-4 rounded-lg border transition-all
                  ${
                    question.answered
                      ? 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                      : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                  }
                  ${onQuestionClick ? 'cursor-pointer' : ''}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-white">{question.speaker}</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        question.answered
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {question.answered ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Answered
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Unanswered
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatTime(question.timestamp)}
                  </div>
                </div>

                {/* Question */}
                <div className="mb-3 pl-6">
                  <p className="text-sm text-gray-300 italic">"{question.question}"</p>
                </div>

                {/* Answer */}
                {question.answered && question.answerSnippet && (
                  <div className="pl-6 pt-3 border-t border-gray-700">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full bg-green-500 rounded-full mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-green-400">
                            Answer:
                          </span>
                          {question.answerTimestamp && (
                            <span className="text-xs text-gray-500">
                              {formatTime(question.answerTimestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{question.answerSnippet}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action hint */}
                {onQuestionClick && (
                  <div className="mt-2 text-xs text-teal-400 pl-6">
                    Click to jump to this moment in the transcript
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery
                  ? 'No questions match your search'
                  : 'No questions found with selected filters'}
              </p>
            </div>
          )}
        </div>
      </CardGlass>

      {/* Insights */}
      {totalQuestions > 0 && (
        <CardGlass variant="default">
          <h4 className="font-semibold text-white mb-4">Question Insights</h4>
          <div className="space-y-2">
            {answerRate >= 80 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                <p className="text-sm text-green-300">
                  Excellent answer rate ({answerRate.toFixed(0)}%) - most questions were
                  addressed
                </p>
              </div>
            )}

            {answerRate < 50 && unansweredQuestions > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-sm text-red-300">
                  {unansweredQuestions} question{unansweredQuestions !== 1 ? 's' : ''}{' '}
                  remain unanswered - consider follow-up
                </p>
              </div>
            )}

            {topAsker && topAsker[1] > 3 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-300">
                  <span className="font-semibold">{topAsker[0]}</span> was most inquisitive
                  with {topAsker[1]} question{topAsker[1] !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {totalQuestions > 10 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <HelpCircle className="w-4 h-4 text-purple-400 mt-0.5" />
                <p className="text-sm text-purple-300">
                  High question count ({totalQuestions}) indicates active engagement and
                  curiosity
                </p>
              </div>
            )}

            {totalQuestions < 3 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                <p className="text-sm text-amber-300">
                  Low question count may indicate clear communication or passive
                  participation
                </p>
              </div>
            )}
          </div>

          {/* Speaker Breakdown */}
          {Object.keys(questionsBySpeaker).length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                Questions by Speaker
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(questionsBySpeaker)
                  .sort(([, a], [, b]) => b - a)
                  .map(([speaker, count]) => (
                    <div
                      key={speaker}
                      className="flex items-center justify-between p-2 rounded bg-gray-800/50"
                    >
                      <span className="text-sm text-gray-300 truncate">{speaker}</span>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardGlass>
      )}
    </div>
  );
}
