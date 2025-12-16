'use client';

import React, { useState, useEffect } from 'react';
import { Building, TrendingUp, TrendingDown, AlertTriangle, Shield, Eye, Plus, Settings, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Competitor {
  id: string;
  name: string;
  aliases: string[];
  logo?: string;
  color: string;
  website?: string;
  tracked: boolean;
  alertThreshold: number;
  lastMention?: Date;
}

interface CompetitorMention {
  competitorId: string;
  meetingId: string;
  timestamp: Date;
  context: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  speaker: string;
  tags: string[];
}

interface CompetitorInsight {
  competitorId: string;
  totalMentions: number;
  mentionTrend: 'up' | 'down' | 'stable';
  trendPercent: number;
  averageSentiment: number;
  topFeatures: string[];
  comparisonContext: string[];
}

interface CompetitorTrackerProps {
  onCompetitorSelect?: (competitor: Competitor) => void;
  onMentionClick?: (mention: CompetitorMention) => void;
  onAlertConfig?: (competitor: Competitor, config: any) => void;
}

export default function CompetitorTracker({
  onCompetitorSelect,
  onMentionClick,
  onAlertConfig
}: CompetitorTrackerProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([
    {
      id: '1',
      name: 'Competitor A',
      aliases: ['CompA', 'Comp-A'],
      color: '#8B5CF6',
      tracked: true,
      alertThreshold: 5,
      lastMention: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: 'Competitor B',
      aliases: ['CompB', 'Comp-B'],
      color: '#EC4899',
      tracked: true,
      alertThreshold: 10,
      lastMention: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      name: 'Competitor C',
      aliases: ['CompC', 'Comp-C'],
      color: '#10B981',
      tracked: true,
      alertThreshold: 3,
      lastMention: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [mentions, setMentions] = useState<CompetitorMention[]>([]);
  const [insights, setInsights] = useState<Map<string, CompetitorInsight>>(new Map());
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewMode, setViewMode] = useState<'dashboard' | 'timeline' | 'comparison' | 'alerts'>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);

  // Generate mock data
  useEffect(() => {
    const generateMockData = () => {
      const mockMentions: CompetitorMention[] = [];
      const mockInsights = new Map<string, CompetitorInsight>();

      competitors.forEach(comp => {
        // Generate mentions
        const mentionCount = Math.floor(Math.random() * 30) + 10;
        for (let i = 0; i < mentionCount; i++) {
          mockMentions.push({
            competitorId: comp.id,
            meetingId: `meeting-${Math.floor(Math.random() * 100)}`,
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            context: `Discussion about ${comp.name}'s ${['pricing', 'features', 'integration', 'support'][Math.floor(Math.random() * 4)]}`,
            sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as any,
            speaker: `Speaker ${Math.floor(Math.random() * 5) + 1}`,
            tags: ['pricing', 'features', 'integration'].slice(0, Math.floor(Math.random() * 3) + 1)
          });
        }

        // Generate insights
        mockInsights.set(comp.id, {
          competitorId: comp.id,
          totalMentions: mentionCount,
          mentionTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
          trendPercent: Math.random() * 50 - 25,
          averageSentiment: Math.random() * 2 - 1,
          topFeatures: ['API', 'Dashboard', 'Pricing', 'Support'].slice(0, 3),
          comparisonContext: ['Better pricing', 'More features', 'Easier integration']
        });
      });

      setMentions(mockMentions);
      setInsights(mockInsights);
    };

    generateMockData();
  }, [competitors]);

  // Prepare chart data
  const getTrendData = () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayData: any = {
        date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      };

      competitors.forEach(comp => {
        const dayMentions = mentions.filter(m =>
          m.competitorId === comp.id &&
          m.timestamp.toDateString() === date.toDateString()
        );
        dayData[comp.name] = dayMentions.length;
      });

      data.push(dayData);
    }

    return data;
  };

  const getSentimentData = () => {
    return competitors.map(comp => {
      const compMentions = mentions.filter(m => m.competitorId === comp.id);
      const positive = compMentions.filter(m => m.sentiment === 'positive').length;
      const negative = compMentions.filter(m => m.sentiment === 'negative').length;
      const neutral = compMentions.filter(m => m.sentiment === 'neutral').length;

      return {
        name: comp.name,
        positive,
        negative,
        neutral
      };
    });
  };

  const getRadarData = () => {
    const metrics = ['Mentions', 'Positive Sentiment', 'Features', 'Pricing', 'Integration'];
    return metrics.map(metric => {
      const dataPoint: any = { metric };
      competitors.forEach(comp => {
        dataPoint[comp.name] = Math.floor(Math.random() * 100);
      });
      return dataPoint;
    });
  };

  const handleAddCompetitor = (name: string, aliases: string[]) => {
    const newCompetitor: Competitor = {
      id: Date.now().toString(),
      name,
      aliases,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      tracked: true,
      alertThreshold: 5
    };
    setCompetitors([...competitors, newCompetitor]);
    setShowAddModal(false);
  };

  const toggleTracking = (competitorId: string) => {
    setCompetitors(comps =>
      comps.map(c => c.id === competitorId ? { ...c, tracked: !c.tracked } : c)
    );
  };

  const exportData = () => {
    const exportData = {
      competitors,
      mentions: mentions.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString()
      })),
      insights: Array.from(insights.entries()).map(([id, insight]) => ({
        ...insight,
        competitorId: id
      })),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitor-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="competitor-tracker">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-m text-white">Competitor Monitoring</h2>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="input-field text-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={exportData}
            className="button-secondary flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="button-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Competitor
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['dashboard', 'timeline', 'comparison', 'alerts'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm rounded-lg capitalize transition-colors ${
              viewMode === mode
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {/* Competitor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map(comp => {
              const insight = insights.get(comp.id);
              return (
                <div
                  key={comp.id}
                  className={`card-ff cursor-pointer hover:bg-white/10 transition-colors ${
                    selectedCompetitor?.id === comp.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedCompetitor(comp);
                    onCompetitorSelect?.(comp);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: comp.color + '20' }}
                      >
                        <Building size={20} style={{ color: comp.color }} />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{comp.name}</h3>
                        <p className="text-xs text-gray-400">
                          {comp.aliases.join(', ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTracking(comp.id);
                      }}
                      className={`p-1 rounded ${comp.tracked ? 'text-green-400' : 'text-gray-400'}`}
                    >
                      <Eye size={16} />
                    </button>
                  </div>

                  {insight && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {insight.totalMentions}
                          </p>
                          <p className="text-xs text-gray-400">mentions</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${
                          insight.mentionTrend === 'up' ? 'text-green-400' :
                          insight.mentionTrend === 'down' ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {insight.mentionTrend === 'up' ? <TrendingUp size={14} /> :
                           insight.mentionTrend === 'down' ? <TrendingDown size={14} /> : null}
                          {Math.abs(insight.trendPercent).toFixed(1)}%
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          insight.averageSentiment > 0.3 ? 'bg-green-500/20 text-green-400' :
                          insight.averageSentiment < -0.3 ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {insight.averageSentiment > 0.3 ? 'Positive' :
                           insight.averageSentiment < -0.3 ? 'Negative' : 'Neutral'}
                        </span>
                        {comp.lastMention && (
                          <span className="text-gray-400">
                            Last: {new Date(comp.lastMention).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trend Chart */}
          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Mention Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {competitors.filter(c => c.tracked).map(comp => (
                  <Line
                    key={comp.id}
                    type="monotone"
                    dataKey={comp.name}
                    stroke={comp.color}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {mentions
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 20)
            .map((mention, index) => {
              const competitor = competitors.find(c => c.id === mention.competitorId);
              if (!competitor) return null;

              return (
                <div
                  key={index}
                  className="card-ff flex items-start gap-4 cursor-pointer hover:bg-white/5"
                  onClick={() => onMentionClick?.(mention)}
                >
                  <div
                    className="w-2 h-full rounded-full"
                    style={{ backgroundColor: competitor.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{competitor.name}</h4>
                      <span className="text-xs text-gray-400">
                        {mention.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{mention.context}</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        mention.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                        mention.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {mention.sentiment}
                      </span>
                      <span className="text-xs text-gray-400">by {mention.speaker}</span>
                      <div className="flex items-center gap-1">
                        {mention.tags.map(tag => (
                          <span key={tag} className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Comparison View */}
      {viewMode === 'comparison' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Sentiment Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getSentimentData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="positive" fill="#10B981" />
                <Bar dataKey="neutral" fill="#6B7280" />
                <Bar dataKey="negative" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-ff">
            <h3 className="font-medium text-white mb-4">Feature Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={getRadarData()}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                <PolarRadiusAxis stroke="#9CA3AF" />
                {competitors.map(comp => (
                  <Radar
                    key={comp.id}
                    name={comp.name}
                    dataKey={comp.name}
                    stroke={comp.color}
                    fill={comp.color}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Alerts View */}
      {viewMode === 'alerts' && (
        <div className="space-y-4">
          {competitors.map(comp => (
            <div key={comp.id} className="card-ff">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: comp.color + '20' }}
                  >
                    <Building size={16} style={{ color: comp.color }} />
                  </div>
                  <h3 className="font-medium text-white">{comp.name}</h3>
                </div>
                <button
                  onClick={() => onAlertConfig?.(comp, { threshold: comp.alertThreshold })}
                  className="button-secondary text-sm flex items-center gap-1"
                >
                  <Settings size={14} />
                  Configure
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-orange-400" />
                    <span className="text-sm text-gray-400">Alert Threshold</span>
                  </div>
                  <p className="text-white font-medium">
                    {comp.alertThreshold} mentions/day
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-blue-400" />
                    <span className="text-sm text-gray-400">Alert Status</span>
                  </div>
                  <p className="text-white font-medium">
                    {comp.tracked ? 'Active' : 'Paused'}
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-green-400" />
                    <span className="text-sm text-gray-400">Last Alert</span>
                  </div>
                  <p className="text-white font-medium">
                    {comp.lastMention ? new Date(comp.lastMention).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="heading-m text-white mb-4">Add Competitor</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const aliases = (formData.get('aliases') as string).split(',').map(a => a.trim());
              handleAddCompetitor(name, aliases);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Competitor Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="input-field w-full"
                    placeholder="e.g., Competitor Name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Aliases (comma-separated)</label>
                  <input
                    type="text"
                    name="aliases"
                    className="input-field w-full"
                    placeholder="e.g., CompName, CName"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary">
                  Add Competitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}