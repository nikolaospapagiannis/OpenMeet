'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { QuestionAnalysisData, QuestionExample } from './TalkPatternAnalysis';

interface QuestionAnalysisProps {
  questions: QuestionAnalysisData;
}

const QUESTION_TYPE_COLORS = {
  openEnded: '#22c55e', // Green for open-ended (good)
  closed: '#f59e0b', // Amber for closed
  rhetorical: '#ef4444', // Red for rhetorical
};

const QUALITY_COLORS = {
  excellent: '#22c55e',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444',
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getQualityBadge(quality: string) {
  const color = QUALITY_COLORS[quality as keyof typeof QUALITY_COLORS];
  return (
    <Badge
      variant="secondary"
      className="text-xs"
      style={{ backgroundColor: `${color}20`, color, borderColor: color }}
    >
      {quality.charAt(0).toUpperCase() + quality.slice(1)}
    </Badge>
  );
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'open':
      return <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">Open-ended</Badge>;
    case 'closed':
      return <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">Closed</Badge>;
    case 'rhetorical':
      return <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-400">Rhetorical</Badge>;
    default:
      return null;
  }
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
        <p className="text-white font-medium">{payload[0].name || payload[0].payload.name}</p>
        <p className="text-sm text-gray-300">
          Count: {payload[0].value}
        </p>
        <p className="text-sm text-gray-300">
          Percentage: {payload[0].payload.percentage}%
        </p>
      </div>
    );
  }
  return null;
};

export function QuestionAnalysis({ questions }: QuestionAnalysisProps) {
  // Prepare pie chart data for question types
  const totalQuestions = questions.totalQuestions;
  const typeData = [
    {
      name: 'Open-ended',
      value: questions.questionsByType.openEnded,
      percentage: totalQuestions > 0
        ? Math.round((questions.questionsByType.openEnded / totalQuestions) * 100)
        : 0,
      color: QUESTION_TYPE_COLORS.openEnded,
    },
    {
      name: 'Closed',
      value: questions.questionsByType.closed,
      percentage: totalQuestions > 0
        ? Math.round((questions.questionsByType.closed / totalQuestions) * 100)
        : 0,
      color: QUESTION_TYPE_COLORS.closed,
    },
    {
      name: 'Rhetorical',
      value: questions.questionsByType.rhetorical,
      percentage: totalQuestions > 0
        ? Math.round((questions.questionsByType.rhetorical / totalQuestions) * 100)
        : 0,
      color: QUESTION_TYPE_COLORS.rhetorical,
    },
  ].filter(d => d.value > 0); // Only show types with questions

  // Prepare bar chart data for questions by speaker
  const speakerData = Object.entries(questions.questionsBySpeaker).map(([speaker, count]) => ({
    speaker,
    questions: count,
  }));

  // Calculate insights
  const openEndedRatio = totalQuestions > 0
    ? questions.questionsByType.openEnded / totalQuestions
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Total Questions</div>
          <div className="text-2xl font-bold text-white">{questions.totalQuestions}</div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Question Rate</div>
          <div className="text-2xl font-bold text-white">
            {questions.questionRate.toFixed(1)}/min
          </div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Quality Score</div>
          <div className="flex items-center gap-2 mt-1">
            {getQualityBadge(questions.questionQuality)}
            {questions.questionQuality === 'excellent' && (
              <Award className="w-4 h-4 text-green-400" />
            )}
          </div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Open-ended Ratio</div>
          <div className="text-2xl font-bold text-white">
            {Math.round(openEndedRatio * 100)}%
          </div>
        </CardGlass>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Types Pie Chart */}
        <CardGlass variant="default" hover>
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Question Types</h3>
          </div>

          {typeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Type Breakdown */}
              <div className="mt-4 space-y-2">
                {typeData.map((type) => (
                  <div
                    key={type.name}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-sm text-gray-300">{type.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{type.value}</span>
                      <span className="text-sm font-medium text-white">{type.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No questions detected</p>
            </div>
          )}
        </CardGlass>

        {/* Questions by Speaker */}
        <CardGlass variant="default" hover>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Questions by Speaker</h3>
          </div>

          {speakerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={speakerData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="speaker" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="questions" fill="#7a5af8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No speaker data available</p>
            </div>
          )}
        </CardGlass>
      </div>

      {/* Question Examples */}
      {questions.examples.length > 0 && (
        <CardGlass variant="default" hover>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-white">Question Examples</h4>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {questions.examples.map((example, index) => (
              <div
                key={index}
                className="p-3 bg-gray-800/50 rounded border border-gray-700 hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{example.speaker}</span>
                    {getTypeBadge(example.type)}
                    {example.quality === 'high' && (
                      <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                        High Quality
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(example.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-300 italic">"{example.question}"</p>
              </div>
            ))}
          </div>
        </CardGlass>
      )}

      {/* Insights and Recommendations */}
      <CardGlass variant="default">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-purple-400" />
          <h4 className="font-medium text-white">Question Analysis Insights</h4>
        </div>
        <div className="space-y-2">
          {questions.questionQuality === 'excellent' && (
            <p className="text-sm text-green-400 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Excellent questioning technique with high proportion of open-ended questions
            </p>
          )}
          {questions.questionQuality === 'poor' && (
            <p className="text-sm text-red-400">
              • Too many closed or rhetorical questions limit productive discussion
            </p>
          )}
          {questions.totalQuestions < 5 && (
            <p className="text-sm text-amber-400">
              • Low question count may indicate passive participation
            </p>
          )}
          {questions.questionRate > 3 && (
            <p className="text-sm text-blue-400">
              • High question rate shows active engagement and curiosity
            </p>
          )}
          {openEndedRatio < 0.3 && (
            <p className="text-sm text-amber-400">
              • Consider asking more open-ended questions to encourage detailed responses
            </p>
          )}
        </div>

        {/* Recommendations */}
        {(questions.questionQuality === 'poor' || questions.questionQuality === 'fair') && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h5 className="text-sm font-medium text-white mb-2">Recommendations</h5>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Use "How" and "Why" questions to encourage explanation</li>
              <li>• Ask "What do you think about..." to gather opinions</li>
              <li>• Use "Tell me more about..." to deepen understanding</li>
              <li>• Avoid yes/no questions unless confirming specific points</li>
            </ul>
          </div>
        )}
      </CardGlass>
    </div>
  );
}