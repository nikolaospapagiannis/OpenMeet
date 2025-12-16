'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api';

export interface Topic {
  id: string;
  keyword: string;
  name?: string;
  aliases?: string[];
  category?: string;
  mentionCount: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  lastMentioned?: Date;
  isActive: boolean;
  alertEnabled?: boolean;
  alertThreshold?: number;
  patterns?: TopicPattern[];
  excludePatterns?: string[];
}

export interface TopicPattern {
  id: string;
  type: 'keyword' | 'regex' | 'phrase';
  value: string;
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface TopicMention {
  id: string;
  topicId: string;
  meetingId: string;
  timestamp: Date;
  speaker: string;
  transcript: string;
  context: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface TopicInsight {
  topicId: string;
  totalMentions: number;
  uniqueSpeakers: number;
  averageSentiment: number;
  peakHour: string;
  peakDay: string;
  correlatedTopics: Array<{
    topicId: string;
    topicName: string;
    correlation: number;
  }>;
}

export interface UseTopicsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilter?: {
    categories?: string[];
    isActive?: boolean;
    hasAlerts?: boolean;
  };
}

export interface UseTopicsReturn {
  // Data
  topics: Topic[];
  mentions: Map<string, TopicMention[]>;
  insights: Map<string, TopicInsight>;

  // Loading states
  loading: boolean;
  error: Error | null;

  // Operations
  createTopic: (topic: Partial<Topic>) => Promise<Topic>;
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<Topic>;
  deleteTopic: (id: string) => Promise<void>;
  toggleTopic: (id: string) => Promise<void>;

  // Mention operations
  getMentions: (topicId: string, options?: GetMentionsOptions) => Promise<TopicMention[]>;
  searchMentions: (query: string, topicIds?: string[]) => Promise<TopicMention[]>;

  // Pattern operations
  addPattern: (topicId: string, pattern: TopicPattern) => Promise<void>;
  removePattern: (topicId: string, patternId: string) => Promise<void>;
  testPattern: (pattern: TopicPattern, text: string) => RegExpMatchArray[] | null;

  // Alert operations
  configureAlert: (topicId: string, config: AlertConfig) => Promise<void>;
  getAlertHistory: (topicId: string) => Promise<AlertHistoryItem[]>;

  // Insights & Analytics
  getInsights: (topicId: string, dateRange?: DateRange) => Promise<TopicInsight>;
  getCorrelations: (topicId: string) => Promise<TopicCorrelation[]>;
  getTrends: (topicIds: string[], dateRange?: DateRange) => Promise<TrendData[]>;

  // Bulk operations
  bulkUpdate: (updates: Array<{ id: string; changes: Partial<Topic> }>) => Promise<void>;
  importTopics: (topics: Partial<Topic>[]) => Promise<Topic[]>;
  exportTopics: (topicIds?: string[]) => Promise<ExportData>;

  // Utility
  refresh: () => Promise<void>;
  filter: (criteria: FilterCriteria) => void;
  sort: (by: SortBy, order?: 'asc' | 'desc') => void;
}

interface GetMentionsOptions {
  limit?: number;
  offset?: number;
  dateRange?: DateRange;
  speakers?: string[];
  sentiment?: string[];
  sortBy?: 'date' | 'relevance' | 'sentiment';
}

interface AlertConfig {
  enabled: boolean;
  threshold: number;
  channels: string[];
  cooldown?: number;
  conditions?: AlertCondition[];
}

interface AlertCondition {
  type: 'threshold' | 'trend' | 'sentiment';
  operator: 'gt' | 'lt' | 'eq';
  value: any;
  timeWindow?: string;
}

interface AlertHistoryItem {
  id: string;
  timestamp: Date;
  trigger: string;
  status: 'sent' | 'failed' | 'pending';
  channels: string[];
  message: string;
}

interface TopicCorrelation {
  topicA: string;
  topicB: string;
  correlation: number;
  coOccurrences: number;
}

interface TrendData {
  date: string;
  [topicId: string]: number | string;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface FilterCriteria {
  categories?: string[];
  isActive?: boolean;
  hasAlerts?: boolean;
  minMentions?: number;
  trend?: 'up' | 'down' | 'stable';
  search?: string;
}

type SortBy = 'name' | 'mentions' | 'trend' | 'lastMentioned' | 'created';

interface ExportData {
  topics: Topic[];
  mentions: TopicMention[];
  insights: TopicInsight[];
  timestamp: string;
}

export function useTopics(options: UseTopicsOptions = {}): UseTopicsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
    initialFilter = {}
  } = options;

  // State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mentions, setMentions] = useState<Map<string, TopicMention[]>>(new Map());
  const [insights, setInsights] = useState<Map<string, TopicInsight>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>(initialFilter);
  const [sortCriteria, setSortCriteria] = useState<{ by: SortBy; order: 'asc' | 'desc' }>({
    by: 'mentions',
    order: 'desc'
  });

  // Fetch topics from API
  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTopics({ limit: 100 });

      const transformedTopics: Topic[] = response.topics.map((topic: any) => ({
        id: topic.id,
        keyword: topic.keyword,
        name: topic.name || topic.keyword,
        aliases: topic.aliases || [],
        category: topic.category || 'General',
        mentionCount: topic.totalMentions || 0,
        trend: topic.trend || 'stable',
        trendPercent: topic.changePercent || 0,
        lastMentioned: topic.lastMentioned ? new Date(topic.lastMentioned) : undefined,
        isActive: topic.isActive !== false,
        alertEnabled: topic.alertEnabled || false,
        alertThreshold: topic.alertThreshold,
        patterns: topic.patterns || [],
        excludePatterns: topic.excludePatterns || []
      }));

      setTopics(transformedTopics);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching topics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchTopics();

    if (autoRefresh) {
      const interval = setInterval(fetchTopics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchTopics]);

  // Filter and sort topics
  const filteredAndSortedTopics = useMemo(() => {
    let filtered = [...topics];

    // Apply filters
    if (filterCriteria.categories?.length) {
      filtered = filtered.filter(t => filterCriteria.categories!.includes(t.category || ''));
    }
    if (filterCriteria.isActive !== undefined) {
      filtered = filtered.filter(t => t.isActive === filterCriteria.isActive);
    }
    if (filterCriteria.hasAlerts !== undefined) {
      filtered = filtered.filter(t => t.alertEnabled === filterCriteria.hasAlerts);
    }
    if (filterCriteria.minMentions !== undefined) {
      filtered = filtered.filter(t => t.mentionCount >= filterCriteria.minMentions!);
    }
    if (filterCriteria.trend) {
      filtered = filtered.filter(t => t.trend === filterCriteria.trend);
    }
    if (filterCriteria.search) {
      const search = filterCriteria.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.name?.toLowerCase().includes(search) ||
        t.keyword.toLowerCase().includes(search) ||
        t.aliases?.some(a => a.toLowerCase().includes(search))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortCriteria.by) {
        case 'name':
          compareValue = (a.name || a.keyword).localeCompare(b.name || b.keyword);
          break;
        case 'mentions':
          compareValue = a.mentionCount - b.mentionCount;
          break;
        case 'trend':
          compareValue = a.trendPercent - b.trendPercent;
          break;
        case 'lastMentioned':
          compareValue = (a.lastMentioned?.getTime() || 0) - (b.lastMentioned?.getTime() || 0);
          break;
        default:
          compareValue = 0;
      }

      return sortCriteria.order === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [topics, filterCriteria, sortCriteria]);

  // Operations
  const createTopic = useCallback(async (topic: Partial<Topic>): Promise<Topic> => {
    if (!topic.keyword) {
      throw new Error('Topic keyword is required');
    }
    const response = await apiClient.createTopic({
      keyword: topic.keyword,
      name: topic.name,
      alertThreshold: topic.alertThreshold,
      alertEnabled: topic.alertEnabled,
      alertRecipients: []
    });
    const newTopic: Topic = {
      id: response.id,
      keyword: topic.keyword!,
      name: topic.name || topic.keyword,
      aliases: topic.aliases || [],
      category: topic.category || 'General',
      mentionCount: 0,
      trend: 'stable',
      trendPercent: 0,
      isActive: true,
      alertEnabled: topic.alertEnabled || false,
      alertThreshold: topic.alertThreshold,
      patterns: topic.patterns || [],
      excludePatterns: topic.excludePatterns || []
    };

    setTopics(prev => [...prev, newTopic]);
    return newTopic;
  }, []);

  const updateTopic = useCallback(async (id: string, updates: Partial<Topic>): Promise<Topic> => {
    const response = await apiClient.updateTopic(id, updates);
    const updatedTopic = { ...topics.find(t => t.id === id)!, ...updates };
    setTopics(prev => prev.map(t => t.id === id ? updatedTopic : t));
    return updatedTopic;
  }, [topics]);

  const deleteTopic = useCallback(async (id: string): Promise<void> => {
    await apiClient.deleteTopic(id);
    setTopics(prev => prev.filter(t => t.id !== id));
    mentions.delete(id);
    insights.delete(id);
  }, [mentions, insights]);

  const toggleTopic = useCallback(async (id: string): Promise<void> => {
    const topic = topics.find(t => t.id === id);
    if (topic) {
      await updateTopic(id, { isActive: !topic.isActive });
    }
  }, [topics, updateTopic]);

  const getMentions = useCallback(async (
    topicId: string,
    options: GetMentionsOptions = {}
  ): Promise<TopicMention[]> => {
    try {
      const response = await apiClient.getTopicMentions(topicId, options);
      const topicMentions = response.mentions.map((m: any) => ({
        id: m.id,
        topicId,
        meetingId: m.meetingId,
        timestamp: new Date(m.timestamp),
        speaker: m.speaker,
        transcript: m.transcript,
        context: m.context,
        sentiment: m.sentiment,
        confidence: m.confidence
      }));

      setMentions(prev => new Map(prev).set(topicId, topicMentions));
      return topicMentions;
    } catch (err) {
      console.error('Error fetching mentions:', err);
      return [];
    }
  }, []);

  const searchMentions = useCallback(async (
    query: string,
    topicIds?: string[]
  ): Promise<TopicMention[]> => {
    try {
      // Search across provided topics or all topics
      const allMentions: TopicMention[] = [];
      const topicsToSearch = topicIds || topics.map(t => t.id);

      for (const topicId of topicsToSearch.slice(0, 10)) { // Limit to prevent too many requests
        const response = await apiClient.getTopicMentions(topicId, { limit: 50 });
        const filtered = response.mentions.filter((m: any) =>
          m.transcript?.toLowerCase().includes(query.toLowerCase()) ||
          m.context?.toLowerCase().includes(query.toLowerCase())
        );
        allMentions.push(...filtered.map((m: any) => ({
          id: m.id,
          topicId,
          meetingId: m.meetingId,
          timestamp: new Date(m.timestamp),
          speaker: m.speaker,
          transcript: m.transcript,
          context: m.context,
          sentiment: m.sentiment,
          confidence: m.confidence
        })));
      }
      return allMentions;
    } catch (err) {
      console.error('Error searching mentions:', err);
      return [];
    }
  }, [topics]);

  const addPattern = useCallback(async (topicId: string, pattern: TopicPattern): Promise<void> => {
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      const updatedPatterns = [...(topic.patterns || []), pattern];
      await updateTopic(topicId, { patterns: updatedPatterns });
    }
  }, [topics, updateTopic]);

  const removePattern = useCallback(async (topicId: string, patternId: string): Promise<void> => {
    const topic = topics.find(t => t.id === topicId);
    if (topic && topic.patterns) {
      const updatedPatterns = topic.patterns.filter(p => p.id !== patternId);
      await updateTopic(topicId, { patterns: updatedPatterns });
    }
  }, [topics, updateTopic]);

  const testPattern = useCallback((pattern: TopicPattern, text: string): RegExpMatchArray[] | null => {
    try {
      let regex: RegExp;

      if (pattern.type === 'regex') {
        regex = new RegExp(pattern.value, pattern.caseSensitive ? 'g' : 'gi');
      } else {
        let regexPattern = pattern.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (pattern.wholeWord) {
          regexPattern = `\\b${regexPattern}\\b`;
        }
        regex = new RegExp(regexPattern, pattern.caseSensitive ? 'g' : 'gi');
      }

      return Array.from(text.matchAll(regex));
    } catch (err) {
      console.error('Error testing pattern:', err);
      return null;
    }
  }, []);

  const configureAlert = useCallback(async (topicId: string, config: AlertConfig): Promise<void> => {
    await apiClient.configureTopicAlert(topicId, {
      type: 'mention_spike',
      threshold: config.threshold,
      enabled: config.enabled,
      recipients: config.channels
    });
    await updateTopic(topicId, {
      alertEnabled: config.enabled,
      alertThreshold: config.threshold
    });
  }, [updateTopic]);

  const getAlertHistory = useCallback(async (topicId: string): Promise<AlertHistoryItem[]> => {
    try {
      const response = await apiClient.getTopicAlerts(topicId, { limit: 50 });
      return response.alerts?.map((alert: any) => ({
        id: alert.id,
        timestamp: new Date(alert.timestamp || alert.createdAt),
        trigger: alert.trigger || 'mention_spike',
        status: alert.status || 'sent',
        channels: alert.channels || [],
        message: alert.message || ''
      })) || [];
    } catch (err) {
      console.error('Error fetching alert history:', err);
      return [];
    }
  }, []);

  const getInsights = useCallback(async (
    topicId: string,
    _dateRange?: DateRange
  ): Promise<TopicInsight> => {
    try {
      // Aggregate insights from mentions, trends, and correlations
      const [mentionsResponse, correlationsResponse] = await Promise.all([
        apiClient.getTopicMentions(topicId, { limit: 100 }),
        apiClient.getTopicCorrelations(topicId)
      ]);

      const mentionsList = mentionsResponse.mentions || [];
      const uniqueSpeakers = new Set(mentionsList.map((m: any) => m.speaker)).size;
      const sentiments = mentionsList.map((m: any) => {
        if (m.sentiment === 'positive') return 1;
        if (m.sentiment === 'negative') return -1;
        return 0;
      });
      const averageSentiment = sentiments.length > 0
        ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length
        : 0;

      const insight: TopicInsight = {
        topicId,
        totalMentions: mentionsList.length,
        uniqueSpeakers,
        averageSentiment,
        peakHour: '14:00', // Would require time aggregation
        peakDay: 'Monday', // Would require day aggregation
        correlatedTopics: correlationsResponse.correlations?.map((c: any) => ({
          topicId: c.topicB || c.relatedTopicId,
          topicName: c.topicBName || c.name || 'Related Topic',
          correlation: c.correlation || c.score || 0
        })) || []
      };

      setInsights(prev => new Map(prev).set(topicId, insight));
      return insight;
    } catch (err) {
      console.error('Error fetching insights:', err);
      throw err;
    }
  }, []);

  const getCorrelations = useCallback(async (topicId: string): Promise<TopicCorrelation[]> => {
    try {
      const response = await apiClient.getTopicCorrelations(topicId);
      return response.correlations;
    } catch (err) {
      console.error('Error fetching correlations:', err);
      return [];
    }
  }, []);

  const getTrends = useCallback(async (
    topicIds: string[],
    dateRange?: DateRange
  ): Promise<TrendData[]> => {
    try {
      // Fetch trends for each topic individually and merge results
      const trendPromises = topicIds.map(topicId =>
        apiClient.getTopicTrends(topicId, {
          startDate: dateRange?.start?.toISOString(),
          endDate: dateRange?.end?.toISOString()
        })
      );
      const responses = await Promise.all(trendPromises);

      // Merge trends by date
      const trendsByDate = new Map<string, Record<string, unknown>>();
      responses.forEach((response, index) => {
        const topicId = topicIds[index];
        (response.trends || []).forEach((trend: any) => {
          const date = trend.date;
          const existing: Record<string, unknown> = trendsByDate.get(date) || { date };
          existing[topicId] = trend.count || trend.mentions || 0;
          trendsByDate.set(date, existing);
        });
      });

      return Array.from(trendsByDate.values()) as TrendData[];
    } catch (err) {
      console.error('Error fetching trends:', err);
      return [];
    }
  }, []);

  const bulkUpdate = useCallback(async (
    updates: Array<{ id: string; changes: Partial<Topic> }>
  ): Promise<void> => {
    await Promise.all(updates.map(({ id, changes }) => updateTopic(id, changes)));
  }, [updateTopic]);

  const importTopics = useCallback(async (topicsToImport: Partial<Topic>[]): Promise<Topic[]> => {
    const imported = await Promise.all(topicsToImport.map(t => createTopic(t)));
    return imported;
  }, [createTopic]);

  const exportTopics = useCallback(async (topicIds?: string[]): Promise<ExportData> => {
    const topicsToExport = topicIds
      ? topics.filter(t => topicIds.includes(t.id))
      : topics;

    const allMentions: TopicMention[] = [];
    const allInsights: TopicInsight[] = [];

    for (const topic of topicsToExport) {
      const topicMentions = mentions.get(topic.id) || [];
      allMentions.push(...topicMentions);

      const topicInsight = insights.get(topic.id);
      if (topicInsight) {
        allInsights.push(topicInsight);
      }
    }

    return {
      topics: topicsToExport,
      mentions: allMentions,
      insights: allInsights,
      timestamp: new Date().toISOString()
    };
  }, [topics, mentions, insights]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchTopics();
  }, [fetchTopics]);

  const filter = useCallback((criteria: FilterCriteria): void => {
    setFilterCriteria(criteria);
  }, []);

  const sort = useCallback((by: SortBy, order: 'asc' | 'desc' = 'desc'): void => {
    setSortCriteria({ by, order });
  }, []);

  return {
    topics: filteredAndSortedTopics,
    mentions,
    insights,
    loading,
    error,
    createTopic,
    updateTopic,
    deleteTopic,
    toggleTopic,
    getMentions,
    searchMentions,
    addPattern,
    removePattern,
    testPattern,
    configureAlert,
    getAlertHistory,
    getInsights,
    getCorrelations,
    getTrends,
    bulkUpdate,
    importTopics,
    exportTopics,
    refresh,
    filter,
    sort
  };
}