'use client';

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Settings, Download, Eye, Shield } from 'lucide-react';
import TopicTable, { Topic } from '@/components/topics/TopicTable';
import TrendChart from '@/components/topics/TrendChart';
import MentionList from '@/components/topics/MentionList';
import AlertConfig from '@/components/topics/AlertConfig';
import TopicCorrelation from '@/components/topics/TopicCorrelation';
import AddTopicModal from '@/components/topics/AddTopicModal';
import TrackerBuilder from '@/components/topics/TrackerBuilder';
import KeywordHighlighter from '@/components/topics/KeywordHighlighter';
import TopicInsights from '@/components/topics/TopicInsights';
import CompetitorTracker from '@/components/topics/CompetitorTracker';
import TopicAlerts from '@/components/topics/TopicAlerts';
import { useTopics } from '@/hooks/useTopics';
import apiClient from '@/lib/api';

export default function TopicsPage() {
  // State Management
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trends' | 'mentions' | 'alerts' | 'correlations' | 'insights' | 'tracker' | 'competitors'>('trends');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTrackerBuilder, setShowTrackerBuilder] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string>(
    `During today's sales call, we discussed pricing strategies for our enterprise customers.
    The client mentioned they are currently using CompetitorX's solution but are experiencing
    integration issues with their CRM system. They expressed interest in our API capabilities
    and asked about our roadmap for Q2 2024.

    Key points from the discussion:
    - Budget range: $50,000-$75,000 annually
    - Decision timeline: End of Q1
    - Main concerns: Integration, support response time, scalability
    - They mentioned CompetitorY as another option they're evaluating

    The client seemed particularly interested when we discussed our machine learning features
    and real-time analytics dashboard. They also asked about our compliance with GDPR and
    SOC 2 certification, which we confirmed.

    Next steps: We agreed to schedule a technical demo next week with their engineering team
    to showcase the API integration process and discuss custom implementation options.`
  );
  const [useAdvancedTopics, setUseAdvancedTopics] = useState(false);

  // Fetch topics on mount
  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getTopics({ limit: 100 });

      // Transform API response to match our Topic interface
      const transformedTopics: Topic[] = response.topics.map((topic: any) => ({
        id: topic.id,
        keyword: topic.keyword,
        name: topic.name || topic.keyword,
        mentionCount: topic.totalMentions || 0,
        trend: topic.trend || 'stable',
        trendPercent: topic.changePercent || 0,
        lastMentioned: topic.lastMentioned ? new Date(topic.lastMentioned) : undefined,
        isActive: topic.isActive !== false,
        alertEnabled: topic.alertEnabled || false,
        alertThreshold: topic.alertThreshold
      }));

      setTopics(transformedTopics);

      // Auto-select first topic if none selected
      if (transformedTopics.length > 0 && !selectedTopic) {
        setSelectedTopic(transformedTopics[0]);
        setSelectedTopicIds([transformedTopics[0].id]);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);

    // Toggle selection for trend comparison
    if (selectedTopicIds.includes(topic.id)) {
      setSelectedTopicIds(prev => prev.filter(id => id !== topic.id));
    } else {
      setSelectedTopicIds(prev => [...prev, topic.id].slice(-5)); // Max 5 topics
    }
  };

  const handleTopicDelete = (id: string) => {
    setTopics(prev => prev.filter(topic => topic.id !== id));
    if (selectedTopic?.id === id) {
      setSelectedTopic(null);
    }
    setSelectedTopicIds(prev => prev.filter(topicId => topicId !== id));
  };

  const handleAddTopic = (newTopic: any) => {
    const transformedTopic: Topic = {
      id: newTopic.id,
      keyword: newTopic.keyword,
      name: newTopic.name || newTopic.keyword,
      mentionCount: 0,
      trend: 'stable',
      trendPercent: 0,
      lastMentioned: undefined,
      isActive: true,
      alertEnabled: newTopic.alertEnabled || false,
      alertThreshold: newTopic.alertThreshold
    };

    setTopics(prev => [transformedTopic, ...prev]);
    setSelectedTopic(transformedTopic);
    setSelectedTopicIds([transformedTopic.id]);
  };

  const handleAlertConfigSave = async (configs: any[]) => {
    // Update alert configuration in backend
    if (selectedTopic) {
      try {
        for (const config of configs) {
          await apiClient.configureTopicAlert(selectedTopic.id, config);
        }
        // Refresh topics to get updated alert status
        fetchTopics();
      } catch (error) {
        console.error('Error saving alert configuration:', error);
      }
    }
  };

  const handleMeetingClick = (meetingId: string) => {
    // Navigate to meeting detail page
    window.location.href = `/dashboard/meetings/${meetingId}`;
  };

  const handleCorrelationTopicClick = (topicId: string, topicName: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      setSelectedTopic(topic);
      setActiveTab('trends');
    }
  };

  const exportData = async () => {
    try {
      const data = {
        topics: topics,
        exportDate: new Date().toISOString(),
        selectedPeriod: period
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topic-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const topicNamesMap = new Map(
    topics.map(t => [t.id, t.name || t.keyword])
  );

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      {/* Page Header */}
      <div className="border-b border-[var(--ff-border)] bg-[var(--ff-bg-layer)]">
        <div className="container-ff py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="heading-l text-white">Topic Tracker</h1>
              <p className="text-[var(--ff-text-secondary)] mt-2">
                Monitor keywords and topics across all your meetings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTrackerBuilder(true)}
                className="button-secondary flex items-center gap-2"
              >
                <Eye size={18} />
                Build Tracker
              </button>
              <button
                onClick={fetchTopics}
                className="button-secondary flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={exportData}
                className="button-secondary flex items-center gap-2"
              >
                <Download size={18} />
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="button-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Add Topic
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-ff py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Topic List */}
          <div className="lg:col-span-5">
            <TopicTable
              topics={topics}
              onTopicSelect={handleTopicSelect}
              onTopicDelete={handleTopicDelete}
              onRefresh={fetchTopics}
              loading={loading}
            />

            {/* Quick Stats */}
            {topics.length > 0 && (
              <div className="card-ff mt-6">
                <h3 className="font-medium text-white mb-4">Overview</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {topics.length}
                    </p>
                    <p className="text-sm text-[var(--ff-text-muted)] mt-1">Tracked Topics</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {topics.reduce((sum, t) => sum + t.mentionCount, 0)}
                    </p>
                    <p className="text-sm text-[var(--ff-text-muted)] mt-1">Total Mentions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {topics.filter(t => t.alertEnabled).length}
                    </p>
                    <p className="text-sm text-[var(--ff-text-muted)] mt-1">Active Alerts</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-7">
            {selectedTopic ? (
              <>
                {/* Tab Navigation */}
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg mb-6 inline-flex flex-wrap">
                  {(['trends', 'mentions', 'insights', 'alerts', 'tracker', 'competitors', 'correlations'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded capitalize transition-colors ${
                        activeTab === tab
                          ? 'bg-[var(--ff-purple-500)] text-white'
                          : 'text-[var(--ff-text-secondary)] hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'trends' && (
                  <TrendChart
                    topicIds={selectedTopicIds}
                    topicNames={topicNamesMap}
                    period={period}
                    customDateRange={customDateRange}
                    onPeriodChange={setPeriod}
                    height={400}
                  />
                )}

                {activeTab === 'mentions' && (
                  <MentionList
                    topicId={selectedTopic.id}
                    topicName={selectedTopic.name || selectedTopic.keyword}
                    onMeetingClick={handleMeetingClick}
                  />
                )}

                {activeTab === 'insights' && (
                  <TopicInsights
                    topicIds={selectedTopicIds}
                    dateRange={customDateRange}
                    onDrillDown={(insight, data) => {
                      console.log('Drill down:', insight, data);
                    }}
                  />
                )}

                {activeTab === 'alerts' && (
                  <TopicAlerts
                    topicId={selectedTopic.id}
                    topicName={selectedTopic.name || selectedTopic.keyword}
                    onSave={(rules) => {
                      console.log('Saved rules:', rules);
                      handleAlertConfigSave(rules as any);
                    }}
                    onTest={(rule) => {
                      console.log('Testing rule:', rule);
                    }}
                  />
                )}

                {activeTab === 'tracker' && (
                  <div className="space-y-4">
                    <TrackerBuilder
                      onSave={(tracker) => {
                        console.log('Saved tracker:', tracker);
                        // Could integrate with topic creation
                        const newTopic = {
                          keyword: tracker.name,
                          name: tracker.name,
                          alertEnabled: tracker.alertEnabled,
                          alertThreshold: tracker.alertThreshold
                        };
                        handleAddTopic(newTopic);
                      }}
                      onTest={(patterns, text) => {
                        console.log('Testing patterns:', patterns, 'with text:', text);
                      }}
                    />

                    {/* Sample transcript for highlighting */}
                    {highlightedText && (
                      <KeywordHighlighter
                        text={highlightedText}
                        keywords={topics.slice(0, 5).map(t => ({
                          id: t.id,
                          text: t.keyword,
                          color: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'][topics.indexOf(t) % 5],
                          caseSensitive: false,
                          wholeWord: true
                        }))}
                        onKeywordClick={(keyword, matches) => {
                          console.log('Keyword clicked:', keyword, 'Matches:', matches);
                        }}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'competitors' && (
                  <CompetitorTracker
                    onCompetitorSelect={(competitor) => {
                      console.log('Selected competitor:', competitor);
                    }}
                    onMentionClick={(mention) => {
                      console.log('Mention clicked:', mention);
                      handleMeetingClick(mention.meetingId);
                    }}
                    onAlertConfig={(competitor, config) => {
                      console.log('Alert config for competitor:', competitor, config);
                    }}
                  />
                )}

                {activeTab === 'correlations' && (
                  <TopicCorrelation
                    topicId={selectedTopic.id}
                    topicName={selectedTopic.name || selectedTopic.keyword}
                    onTopicClick={handleCorrelationTopicClick}
                  />
                )}
              </>
            ) : (
              <div className="card-ff h-96 flex items-center justify-center">
                <div className="text-center">
                  <Settings className="mx-auto text-[var(--ff-text-muted)] mb-4" size={48} />
                  <p className="text-[var(--ff-text-secondary)]">
                    {topics.length === 0
                      ? 'Add your first topic to get started'
                      : 'Select a topic to view details'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Topic Modal */}
      <AddTopicModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTopic}
      />

      {/* Tracker Builder Modal */}
      {showTrackerBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--ff-bg-layer)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-m text-white">Advanced Tracker Builder</h2>
                <button
                  onClick={() => setShowTrackerBuilder(false)}
                  className="text-[var(--ff-text-secondary)] hover:text-white"
                >
                  ✕
                </button>
              </div>
              <TrackerBuilder
                onSave={(tracker) => {
                  console.log('Saved tracker:', tracker);
                  const newTopic = {
                    keyword: tracker.name,
                    name: tracker.name,
                    alertEnabled: tracker.alertEnabled,
                    alertThreshold: tracker.alertThreshold
                  };
                  handleAddTopic(newTopic);
                  setShowTrackerBuilder(false);
                }}
                onTest={(patterns, text) => {
                  console.log('Testing patterns:', patterns, 'with text:', text);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}