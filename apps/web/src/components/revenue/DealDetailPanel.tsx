'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Phone, Mail, Video, MessageSquare, AlertTriangle, TrendingUp, Brain, Clock, User, DollarSign, Target } from 'lucide-react';

interface DealDetailPanelProps {
  dealId: string;
}

interface DealDetail {
  id: string;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  riskScore: number;
  expectedCloseDate: string;
  contactName: string;
  contactEmail: string;
  ownerName: string;
  timeline: TimelineEvent[];
  insights: string[];
  riskFactors: RiskFactor[];
  nextActions: string[];
  meetings: Meeting[];
}

interface TimelineEvent {
  id: string;
  type: 'meeting' | 'email' | 'call' | 'note';
  date: string;
  title: string;
  description?: string;
}

interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: string[];
}

const EVENT_ICONS = {
  meeting: Video,
  email: Mail,
  call: Phone,
  note: MessageSquare,
};

const SEVERITY_COLORS = {
  low: 'text-green-500 bg-green-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  high: 'text-red-500 bg-red-500/10',
};

export function DealDetailPanel({ dealId }: DealDetailPanelProps) {
  const [dealDetail, setDealDetail] = useState<DealDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'insights' | 'meetings'>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchDealDetails();
  }, [dealId]);

  const fetchDealDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken') || '';

      // Fetch deal details
      const response = await fetch(`/api/revenue/deals/${dealId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deal details');
      }

      const data = await response.json();

      // Mock additional data for demo (would come from API in real implementation)
      const enrichedData: DealDetail = {
        ...data,
        timeline: [
          { id: '1', type: 'meeting', date: '2024-01-15T10:00:00', title: 'Discovery Call', description: 'Initial requirements discussion' },
          { id: '2', type: 'email', date: '2024-01-16T14:30:00', title: 'Follow-up Email', description: 'Sent pricing proposal' },
          { id: '3', type: 'call', date: '2024-01-18T15:00:00', title: 'Pricing Discussion', description: 'Negotiated enterprise discount' },
          { id: '4', type: 'meeting', date: '2024-01-20T11:00:00', title: 'Technical Demo', description: 'Product walkthrough with engineering team' },
        ],
        insights: [
          'Deal momentum has slowed - last activity was 5 days ago',
          'Decision maker engagement is high (attended 3/4 meetings)',
          'Competitor mentioned in last call (Gong)',
          'Budget approval expected by end of month',
        ],
        riskFactors: [
          { factor: 'Engagement Drop', severity: 'medium', description: 'No response to last 2 emails' },
          { factor: 'Competition', severity: 'high', description: 'Evaluating Gong in parallel' },
          { factor: 'Budget Timing', severity: 'low', description: 'Q1 budget not yet approved' },
        ],
        nextActions: [
          'Schedule executive alignment call',
          'Send ROI analysis document',
          'Connect with champion for internal update',
          'Prepare custom demo for use case',
        ],
        meetings: [
          { id: '1', title: 'Discovery Call', date: '2024-01-15', duration: 45, participants: ['John Smith', 'Sarah Jones'] },
          { id: '2', title: 'Technical Demo', date: '2024-01-20', duration: 60, participants: ['John Smith', 'Tech Team'] },
        ],
      };

      setDealDetail(enrichedData);
    } catch (error) {
      console.error('Failed to fetch deal details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeDeal = async () => {
    try {
      setIsAnalyzing(true);
      const token = localStorage.getItem('authToken') || '';

      const response = await fetch(`/api/revenue/deals/${dealId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to analyze deal');
      }

      const analysis = await response.json();

      // Update deal details with new analysis
      if (dealDetail) {
        setDealDetail({
          ...dealDetail,
          insights: analysis.insights || dealDetail.insights,
          riskFactors: analysis.riskFactors || dealDetail.riskFactors,
          nextActions: analysis.recommendations || dealDetail.nextActions,
        });
      }
    } catch (error) {
      console.error('Failed to analyze deal:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!dealDetail) {
    return (
      <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6 h-full">
        <p className="text-gray-400">Failed to load deal details</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-2">{dealDetail.name}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {formatCurrency(dealDetail.amount)}
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            {dealDetail.probability}%
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDate(dealDetail.expectedCloseDate)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['overview', 'timeline', 'insights', 'meetings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-white">{dealDetail.contactName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-white">{dealDetail.contactEmail}</span>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Risk Factors</h3>
              <div className="space-y-2">
                {dealDetail.riskFactors.map((risk, index) => (
                  <div key={index} className={`p-3 rounded-lg ${SEVERITY_COLORS[risk.severity].split(' ')[1]}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${SEVERITY_COLORS[risk.severity].split(' ')[0]}`} />
                      <div>
                        <p className="text-white text-sm font-medium">{risk.factor}</p>
                        <p className="text-gray-400 text-xs mt-1">{risk.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Actions */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Recommended Actions</h3>
              <ul className="space-y-2">
                {dealDetail.nextActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5"></div>
                    <span className="text-sm text-white">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4">
            {dealDetail.timeline.map((event) => {
              const Icon = EVENT_ICONS[event.type];
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="p-2 rounded-lg bg-gray-800">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{event.title}</p>
                    {event.description && (
                      <p className="text-gray-400 text-xs mt-1">{event.description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">{formatDate(event.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <button
              onClick={handleAnalyzeDeal}
              disabled={isAnalyzing}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Brain className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'Generate AI Insights'}
            </button>

            <div className="space-y-3">
              {dealDetail.insights.map((insight, index) => (
                <div key={index} className="p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-white">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="space-y-4">
            {dealDetail.meetings.map((meeting) => (
              <div key={meeting.id} className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-medium">{meeting.title}</h4>
                  <span className="text-xs text-gray-400">{meeting.duration} min</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {formatDate(meeting.date)}
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Participants:</p>
                  <p className="text-xs text-gray-300">{meeting.participants.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}