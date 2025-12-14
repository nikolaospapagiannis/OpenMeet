/**
 * SuggestedQuestions Component - Quick question chips for AI queries
 *
 * Features:
 * - Categorized question suggestions
 * - Quick click to ask
 * - Customizable categories
 * - Follow-up question support
 */

'use client';

import React from 'react';
import {
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Search,
  Lightbulb,
  Target,
  MessageSquare,
  AlertCircle,
  BarChart,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { CardGlass, CardGlassContent } from '@/components/ui/card-glass';
import { LucideIcon } from 'lucide-react';

export interface QuestionCategory {
  icon: LucideIcon;
  text: string;
  category: string;
  color?: string;
}

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
  customQuestions?: QuestionCategory[];
  showCategories?: boolean;
  followUpQuestions?: string[];
}

const DEFAULT_QUESTIONS: QuestionCategory[] = [
  {
    icon: TrendingUp,
    text: 'What were the key decisions made this week?',
    category: 'Decisions',
    color: 'purple',
  },
  {
    icon: CheckCircle,
    text: 'Summarize action items from the last 5 meetings',
    category: 'Action Items',
    color: 'green',
  },
  {
    icon: Users,
    text: 'Who spoke the most in recent meetings?',
    category: 'Analytics',
    color: 'blue',
  },
  {
    icon: Calendar,
    text: 'What topics were discussed yesterday?',
    category: 'Topics',
    color: 'orange',
  },
  {
    icon: Search,
    text: 'Find discussions about budget or pricing',
    category: 'Search',
    color: 'cyan',
  },
  {
    icon: Lightbulb,
    text: 'What are the main themes across my meetings?',
    category: 'Insights',
    color: 'yellow',
  },
  {
    icon: AlertCircle,
    text: 'What blockers or issues were mentioned?',
    category: 'Issues',
    color: 'red',
  },
  {
    icon: BarChart,
    text: 'Show sentiment trends over the last month',
    category: 'Sentiment',
    color: 'indigo',
  },
  {
    icon: Target,
    text: 'What goals or objectives were set?',
    category: 'Goals',
    color: 'pink',
  },
  {
    icon: Clock,
    text: 'Which action items are overdue?',
    category: 'Status',
    color: 'amber',
  },
  {
    icon: MessageSquare,
    text: 'What questions were left unanswered?',
    category: 'Follow-ups',
    color: 'teal',
  },
  {
    icon: FileText,
    text: 'Generate an executive summary of this month',
    category: 'Summary',
    color: 'slate',
  },
];

const CATEGORY_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Summary', value: 'Summary' },
  { label: 'Action Items', value: 'Action Items' },
  { label: 'Decisions', value: 'Decisions' },
  { label: 'Topics', value: 'Topics' },
  { label: 'Analytics', value: 'Analytics' },
];

export function SuggestedQuestions({
  onQuestionClick,
  customQuestions,
  showCategories = false,
  followUpQuestions,
}: SuggestedQuestionsProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const questions = customQuestions || DEFAULT_QUESTIONS;

  const filteredQuestions =
    selectedCategory === 'all'
      ? questions
      : questions.filter(q => q.category === selectedCategory);

  const getColorClasses = (color?: string) => {
    const colors: Record<string, { bg: string; text: string; hover: string }> = {
      purple: {
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        hover: 'group-hover:bg-purple-500/30',
      },
      blue: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        hover: 'group-hover:bg-blue-500/30',
      },
      green: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        hover: 'group-hover:bg-green-500/30',
      },
      orange: {
        bg: 'bg-orange-500/20',
        text: 'text-orange-400',
        hover: 'group-hover:bg-orange-500/30',
      },
      cyan: {
        bg: 'bg-cyan-500/20',
        text: 'text-cyan-400',
        hover: 'group-hover:bg-cyan-500/30',
      },
      yellow: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        hover: 'group-hover:bg-yellow-500/30',
      },
      red: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        hover: 'group-hover:bg-red-500/30',
      },
      indigo: {
        bg: 'bg-indigo-500/20',
        text: 'text-indigo-400',
        hover: 'group-hover:bg-indigo-500/30',
      },
      pink: {
        bg: 'bg-pink-500/20',
        text: 'text-pink-400',
        hover: 'group-hover:bg-pink-500/30',
      },
      amber: {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        hover: 'group-hover:bg-amber-500/30',
      },
      teal: {
        bg: 'bg-teal-500/20',
        text: 'text-teal-400',
        hover: 'group-hover:bg-teal-500/30',
      },
      slate: {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        hover: 'group-hover:bg-slate-500/30',
      },
    };

    return colors[color || 'purple'];
  };

  return (
    <div className="space-y-6">
      {/* Follow-up Questions (if any) */}
      {followUpQuestions && followUpQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Lightbulb className="h-4 w-4" />
            <span>Follow-up questions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((question, i) => (
              <button
                key={i}
                onClick={() => onQuestionClick(question)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-sm text-purple-300 hover:text-purple-200 transition-colors border border-purple-500/20 group"
              >
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Tabs */}
      {showCategories && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setSelectedCategory(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === tab.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Suggested Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuestions.map((q, i) => {
          const Icon = q.icon;
          const colors = getColorClasses(q.color);

          return (
            <CardGlass
              key={i}
              hover
              className="cursor-pointer group"
              onClick={() => onQuestionClick(q.text)}
            >
              <CardGlassContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 ${colors.bg} ${colors.hover} rounded-lg flex items-center justify-center flex-shrink-0 transition-colors`}
                  >
                    <Icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs ${colors.text} mb-1 block font-medium`}>
                      {q.category}
                    </span>
                    <p className="text-sm text-slate-300 group-hover:text-white transition-colors line-clamp-2">
                      {q.text}
                    </p>
                  </div>
                </div>
              </CardGlassContent>
            </CardGlass>
          );
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No questions found in this category</p>
        </div>
      )}
    </div>
  );
}
