'use client';

import { useState } from 'react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  MessageSquare,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { TalkTimeChart } from './TalkTimeChart';
import { SentimentTimeline } from './SentimentTimeline';
import { TopicBreakdown } from './TopicBreakdown';
import { QuestionAnalysis } from './QuestionAnalysis';
import { EngagementScore } from './EngagementScore';

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  metric?: string;
}

interface SpeakerData {
  speaker: string;
  talkTime: number;
  wordCount: number;
  talkTimePercentage: number;
}

interface SentimentData {
  timestamp: number;
  sentiment: number;
  speaker: string;
  text: string;
}

interface TopicData {
  topic: string;
  count: number;
  duration: number;
  segments: Array<{
    timestamp: number;
    text: string;
  }>;
}

interface Question {
  id: string;
  speaker: string;
  question: string;
  timestamp: number;
  answered: boolean;
  answerSnippet?: string;
  answerTimestamp?: number;
}

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

interface MeetingInsightsPanelProps {
  meetingId: string;
  insights?: Insight[];
  speakerData?: SpeakerData[];
  sentimentData?: SentimentData[];
  topicData?: TopicData[];
  questions?: Question[];
  engagementData?: EngagementData;
  duration?: number;
}

const insightConfig = {
  success: { icon: CheckCircle2, color: 'emerald', label: 'Great!' },
  warning: { icon: AlertCircle, color: 'amber', label: 'Attention' },
  info: { icon: Clock, color: 'cyan', label: 'Insight' },
  tip: { icon: Lightbulb, color: 'purple', label: 'Tip' },
};

type TabType = 'overview' | 'engagement' | 'sentiment' | 'topics' | 'questions';

export function MeetingInsightsPanel({
  meetingId,
  insights = [],
  speakerData = [],
  sentimentData = [],
  topicData = [],
  questions = [],
  engagementData,
  duration = 0,
}: MeetingInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Calculate summary metrics
  const totalParticipants = speakerData.length;
  const totalQuestions = questions.length;
  const avgSentiment = sentimentData.length > 0
    ? sentimentData.reduce((sum, d) => sum + d.sentiment, 0) / sentimentData.length
    : 0;
  const topTopics = topicData.slice(0, 3);

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'engagement', label: 'Engagement', icon: Users },
    { id: 'sentiment', label: 'Sentiment', icon: TrendingUp },
    { id: 'topics', label: 'Topics', icon: MessageSquare },
    { id: 'questions', label: 'Questions', icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <CardGlass variant="elevated" padding="sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                  ${isActive
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </CardGlass>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardGlass variant="default" padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Participants</div>
                  <div className="text-2xl font-bold text-white">{totalParticipants}</div>
                </div>
              </div>
            </CardGlass>

            <CardGlass variant="default" padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Duration</div>
                  <div className="text-2xl font-bold text-white">
                    {Math.floor(duration / 60)}m {duration % 60}s
                  </div>
                </div>
              </div>
            </CardGlass>

            <CardGlass variant="default" padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Questions</div>
                  <div className="text-2xl font-bold text-white">{totalQuestions}</div>
                </div>
              </div>
            </CardGlass>

            <CardGlass variant="default" padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Avg Sentiment</div>
                  <div className="text-2xl font-bold text-white">
                    {avgSentiment.toFixed(1)}
                  </div>
                </div>
              </div>
            </CardGlass>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <CardGlass variant="elevated" gradient>
              <h3 className="text-lg font-semibold text-white mb-6">AI Insights</h3>
              <div className="space-y-4">
                {insights.map((insight, idx) => {
                  const config = insightConfig[insight.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={idx}
                      className="group p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-teal-500/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${config.color}-500/20 to-${config.color}-600/20 border border-${config.color}-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-5 h-5 text-${config.color}-400`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`bg-${config.color}-500/20 text-${config.color}-300 border-${config.color}-500/30`}>
                              {config.label}
                            </Badge>
                            {insight.metric && (
                              <span className="text-xs font-mono text-slate-400">
                                {insight.metric}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                          <p className="text-sm text-slate-400">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardGlass>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {speakerData.length > 0 && (
              <TalkTimeChart speakerData={speakerData} />
            )}
            {engagementData && (
              <EngagementScore data={engagementData} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'engagement' && engagementData && (
        <div className="space-y-6">
          <EngagementScore data={engagementData} detailed />
          {speakerData.length > 0 && (
            <TalkTimeChart speakerData={speakerData} />
          )}
        </div>
      )}

      {activeTab === 'sentiment' && sentimentData.length > 0 && (
        <SentimentTimeline data={sentimentData} duration={duration} />
      )}

      {activeTab === 'topics' && topicData.length > 0 && (
        <TopicBreakdown topics={topicData} />
      )}

      {activeTab === 'questions' && questions.length > 0 && (
        <QuestionAnalysis questions={questions} />
      )}

      {/* Empty State */}
      {activeTab === 'sentiment' && sentimentData.length === 0 && (
        <CardGlass variant="default" className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-600 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Sentiment Data</h3>
          <p className="text-sm text-slate-400">
            Sentiment analysis data is not available for this meeting.
          </p>
        </CardGlass>
      )}

      {activeTab === 'topics' && topicData.length === 0 && (
        <CardGlass variant="default" className="text-center py-12">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-600 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Topics Detected</h3>
          <p className="text-sm text-slate-400">
            Topic analysis data is not available for this meeting.
          </p>
        </CardGlass>
      )}

      {activeTab === 'questions' && questions.length === 0 && (
        <CardGlass variant="default" className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-600 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">No Questions Detected</h3>
          <p className="text-sm text-slate-400">
            No questions were identified during this meeting.
          </p>
        </CardGlass>
      )}
    </div>
  );
}
