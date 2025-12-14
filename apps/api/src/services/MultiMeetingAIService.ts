/**
 * Multi-Meeting AI Intelligence Service (GAP #1 - Critical Differentiator)
 * ChatGPT-like interface to query across ALL meetings with advanced analytics
 *
 * Features:
 * - Semantic search across all meetings using vector embeddings
 * - Conversational AI interface with context awareness
 * - Topic clustering and trend detection
 * - Pattern recognition across time periods
 * - Super summaries from multiple meetings
 * - Topic/keyword tracking over time
 */

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import winston from 'winston';
import { SearchService, SearchIndex } from './search';
import { transcriptService, ITranscript } from './TranscriptService';
import { CacheService } from './cache';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'multi-meeting-ai-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// ====================================
// Types and Interfaces
// ====================================

export interface QueryOptions {
  userId: string;
  organizationId: string;
  question: string;
  meetingFilters?: {
    dateFrom?: Date;
    dateTo?: Date;
    participantEmails?: string[];
    tags?: string[];
    status?: string[];
  };
  limit?: number;
  includeContext?: boolean;
  conversationHistory?: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface QueryResult {
  answer: string;
  confidence: number;
  sources: Array<{
    meetingId: string;
    meetingTitle: string;
    meetingDate: Date;
    relevantSegments: string[];
    relevanceScore: number;
  }>;
  suggestedFollowUps: string[];
  tokensUsed: number;
  processingTimeMs: number;
}

export interface SuperSummaryOptions {
  userId: string;
  organizationId: string;
  meetingFilters?: {
    dateFrom?: Date;
    dateTo?: Date;
    participantEmails?: string[];
    tags?: string[];
  };
  summaryType?: 'executive' | 'detailed' | 'action-focused' | 'decision-focused';
  includeTopics?: boolean;
  includeTrends?: boolean;
}

export interface SuperSummaryResult {
  id: string;
  summary: string;
  keyThemes: string[];
  criticalDecisions: Array<{
    decision: string;
    meetingTitle: string;
    date: Date;
    impact: 'high' | 'medium' | 'low';
  }>;
  actionItems: Array<{
    description: string;
    assignee?: string;
    status: string;
    meetingTitle: string;
    date: Date;
  }>;
  trendAnalysis?: {
    topicTrends: Array<{ topic: string; trend: 'rising' | 'declining' | 'stable'; mentions: number[] }>;
    sentimentTrend: Array<{ date: Date; sentiment: number }>;
  };
  meetingsAnalyzed: number;
  timeSpan: { from: Date; to: Date };
}

export interface TopicTrackingOptions {
  organizationId: string;
  topics?: string[];
  dateFrom: Date;
  dateTo: Date;
  granularity?: 'day' | 'week' | 'month';
}

export interface TopicTrackingResult {
  topics: Array<{
    name: string;
    timeline: Array<{
      period: string;
      mentions: number;
      sentiment: number;
      meetings: string[];
    }>;
    overallTrend: 'rising' | 'declining' | 'stable';
    correlatedTopics: string[];
  }>;
  emergingTopics: Array<{
    name: string;
    growthRate: number;
    firstMentioned: Date;
  }>;
}

export interface PatternDetectionOptions {
  organizationId: string;
  analysisType: 'recurring_issues' | 'decision_patterns' | 'team_dynamics' | 'productivity' | 'all';
  dateFrom: Date;
  dateTo: Date;
  minOccurrences?: number;
}

export interface PatternDetectionResult {
  patterns: Array<{
    type: string;
    description: string;
    occurrences: number;
    confidence: number;
    examples: Array<{
      meetingId: string;
      meetingTitle: string;
      date: Date;
      evidence: string;
    }>;
    impact: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
  insights: string[];
  trends: Array<{
    metric: string;
    direction: 'improving' | 'declining' | 'stable';
    values: number[];
  }>;
}

export interface VectorEmbedding {
  meetingId: string;
  segmentId: string;
  text: string;
  embedding: number[];
  metadata: {
    speaker?: string;
    timestamp: number;
    topics?: string[];
  };
}

// ====================================
// Multi-Meeting AI Service Class
// ====================================

export class MultiMeetingAIService {
  private openai: OpenAI;
  private searchService: SearchService;
  private cacheService: CacheService;
  private esClient: ElasticsearchClient;

  constructor(
    searchService: SearchService,
    cacheService: CacheService,
    esClient?: ElasticsearchClient
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.searchService = searchService;
    this.cacheService = cacheService;
    this.esClient = esClient || new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });
  }

  /**
   * Query across all meetings with ChatGPT-like conversational interface
   */
  async queryAcrossMeetings(options: QueryOptions): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      logger.info('Processing multi-meeting query', {
        userId: options.userId,
        organizationId: options.organizationId,
        question: options.question,
      });

      // Step 1: Find relevant meetings using semantic search and filters
      const relevantMeetings = await this.findRelevantMeetings(
        options.organizationId,
        options.question,
        options.meetingFilters,
        options.limit || 20
      );

      if (relevantMeetings.length === 0) {
        return {
          answer: "I couldn't find any relevant meetings matching your query. Try adjusting your search criteria or date range.",
          confidence: 0,
          sources: [],
          suggestedFollowUps: [
            "What meetings did I have this week?",
            "Show me all meetings about [specific topic]",
            "What were the key decisions made recently?"
          ],
          tokensUsed: 0,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 2: Get detailed transcript content for relevant meetings
      const meetingContexts = await this.buildMeetingContexts(relevantMeetings);

      // Step 3: Generate embeddings for the question (semantic search)
      const questionEmbedding = await this.generateEmbedding(options.question);

      // Step 4: Find most relevant segments using vector similarity
      const relevantSegments = await this.findRelevantSegments(
        questionEmbedding,
        meetingContexts,
        10 // top 10 most relevant segments
      );

      // Step 5: Build context for GPT-4
      const context = this.buildConversationalContext(
        options.question,
        relevantSegments,
        options.conversationHistory
      );

      // Step 6: Query GPT-4 with context
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are an intelligent meeting assistant with access to all of the user's meeting transcripts.
Your role is to answer questions about meetings by analyzing transcripts, summaries, and patterns.

Guidelines:
- Provide specific, actionable answers based on the meeting content
- Cite specific meetings when referencing information
- If information is unclear or not found, say so explicitly
- Suggest follow-up questions when appropriate
- Be concise but thorough
- Maintain context across the conversation`
        },
        {
          role: 'user',
          content: context
        }
      ];

      // Add conversation history if provided
      if (options.conversationHistory && options.conversationHistory.length > 0) {
        // Insert history before the current question
        messages.splice(1, 0, ...options.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const answer = completion.choices[0]?.message?.content || 'Unable to generate response';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Step 7: Generate suggested follow-up questions
      const suggestedFollowUps = await this.generateFollowUpQuestions(
        options.question,
        answer,
        relevantMeetings
      );

      // Step 8: Calculate confidence score based on relevance
      const confidence = this.calculateConfidence(relevantSegments, relevantMeetings);

      // Step 9: Format sources
      const sources = relevantMeetings.slice(0, 5).map(meeting => ({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        meetingDate: meeting.scheduledStartAt || meeting.createdAt,
        relevantSegments: relevantSegments
          .filter(seg => seg.meetingId === meeting.id)
          .slice(0, 3)
          .map(seg => seg.text),
        relevanceScore: meeting.relevanceScore || 0,
      }));

      logger.info('Multi-meeting query completed', {
        tokensUsed,
        sourcesCount: sources.length,
        confidence,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        answer,
        confidence,
        sources,
        suggestedFollowUps,
        tokensUsed,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Error in multi-meeting query', { error });
      throw error;
    }
  }

  /**
   * Generate super summary from multiple meetings
   */
  async generateSuperSummary(options: SuperSummaryOptions): Promise<SuperSummaryResult> {
    try {
      logger.info('Generating super summary', {
        userId: options.userId,
        organizationId: options.organizationId,
      });

      // Fetch meetings based on filters
      const meetings = await this.fetchMeetingsForAnalysis(
        options.organizationId,
        options.meetingFilters
      );

      if (meetings.length === 0) {
        throw new Error('No meetings found matching the criteria');
      }

      // Get summaries and analyses for all meetings
      const meetingData = await Promise.all(
        meetings.map(async (meeting) => {
          const summary = await prisma.meetingSummary.findFirst({
            where: { meetingId: meeting.id },
            orderBy: { createdAt: 'desc' },
          });

          const analytics = await prisma.meetingAnalytics.findFirst({
            where: { meetingId: meeting.id },
          });

          return {
            meeting,
            summary,
            analytics,
          };
        })
      );

      // Build aggregated context
      const aggregatedContext = meetingData.map(({ meeting, summary, analytics }) => ({
        title: meeting.title,
        date: meeting.scheduledStartAt || meeting.createdAt,
        overview: summary?.overview || '',
        keyPoints: summary?.keyPoints || [],
        actionItems: summary?.actionItems || [],
        decisions: summary?.decisions || [],
        topics: analytics?.topics || [],
        sentiment: analytics?.sentimentScores || {},
      }));

      // Generate super summary using GPT-4
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an executive meeting analyst. Analyze multiple meetings and create a comprehensive summary.

Focus on:
- Overarching themes and patterns
- Critical decisions and their impact
- Action items and their status
- Emerging trends and concerns
- Strategic insights

Format: ${options.summaryType || 'executive'} style`
          },
          {
            role: 'user',
            content: `Analyze these ${meetings.length} meetings and create a super summary:\n\n${JSON.stringify(aggregatedContext, null, 2)}`
          }
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

      // Extract action items across all meetings
      const allActionItems = meetingData.flatMap(({ meeting, summary }) =>
        (summary?.actionItems as any[] || []).map((item: any) => ({
          description: item.description || item.text || String(item),
          assignee: item.assignee,
          status: item.status || 'pending',
          meetingTitle: meeting.title,
          date: meeting.scheduledStartAt || meeting.createdAt,
        }))
      );

      // Extract decisions
      const allDecisions = meetingData.flatMap(({ meeting, summary }) =>
        (summary?.decisions as any[] || []).map((decision: any) => ({
          decision: decision.description || decision.text || String(decision),
          meetingTitle: meeting.title,
          date: meeting.scheduledStartAt || meeting.createdAt,
          impact: decision.impact || 'medium' as 'high' | 'medium' | 'low',
        }))
      );

      // Analyze trends if requested
      let trendAnalysis;
      if (options.includeTrends) {
        trendAnalysis = await this.analyzeTrends(meetingData);
      }

      const superSummary: SuperSummaryResult = {
        id: `super_summary_${Date.now()}`,
        summary: result.summary || '',
        keyThemes: result.keyThemes || [],
        criticalDecisions: allDecisions.slice(0, 10),
        actionItems: allActionItems,
        trendAnalysis,
        meetingsAnalyzed: meetings.length,
        timeSpan: {
          from: meetings[meetings.length - 1]?.scheduledStartAt || meetings[meetings.length - 1]?.createdAt,
          to: meetings[0]?.scheduledStartAt || meetings[0]?.createdAt,
        },
      };

      // Cache the result
      await this.cacheService.set(
        'super_summary',
        superSummary.id,
        superSummary,
        3600 // 1 hour
      );

      logger.info('Super summary generated', {
        id: superSummary.id,
        meetingsAnalyzed: meetings.length,
      });

      return superSummary;
    } catch (error) {
      logger.error('Error generating super summary', { error });
      throw error;
    }
  }

  /**
   * Track topics over time
   */
  async trackTopics(options: TopicTrackingOptions): Promise<TopicTrackingResult> {
    try {
      logger.info('Tracking topics over time', {
        organizationId: options.organizationId,
        dateRange: { from: options.dateFrom, to: options.dateTo },
      });

      // Fetch meetings in date range
      const meetings = await prisma.meeting.findMany({
        where: {
          organizationId: options.organizationId,
          scheduledStartAt: {
            gte: options.dateFrom,
            lte: options.dateTo,
          },
          status: 'completed',
        },
        include: {
          analytics: true,
          summaries: true,
        },
        orderBy: { scheduledStartAt: 'asc' },
      });

      // Extract all topics from meetings
      const topicMentions = new Map<string, Array<{
        date: Date;
        meetingId: string;
        sentiment: number;
      }>>();

      meetings.forEach(meeting => {
        const analytics = meeting.analytics[0];
        const topics = (analytics?.topics as any[] || []);
        const date = meeting.scheduledStartAt || meeting.createdAt;

        topics.forEach((topic: any) => {
          const topicName = typeof topic === 'string' ? topic : topic.name;
          const sentiment = typeof topic === 'object' ? topic.sentiment : 0;

          if (!topicMentions.has(topicName)) {
            topicMentions.set(topicName, []);
          }

          topicMentions.get(topicName)!.push({
            date,
            meetingId: meeting.id,
            sentiment,
          });
        });
      });

      // If specific topics requested, filter
      let topicsToTrack = Array.from(topicMentions.keys());
      if (options.topics && options.topics.length > 0) {
        topicsToTrack = topicsToTrack.filter(t =>
          options.topics!.some(requested =>
            t.toLowerCase().includes(requested.toLowerCase())
          )
        );
      }

      // Build timeline for each topic
      const topics = topicsToTrack.map(topicName => {
        const mentions = topicMentions.get(topicName)!;

        // Group by time period
        const timeline = this.groupByTimePeriod(
          mentions,
          options.granularity || 'week'
        );

        // Calculate trend
        const mentionCounts = timeline.map(t => t.mentions);
        const trend = this.calculateTrend(mentionCounts);

        // Find correlated topics (topics that often appear together)
        const correlatedTopics = this.findCorrelatedTopics(
          topicName,
          meetings,
          topicMentions
        );

        return {
          name: topicName,
          timeline,
          overallTrend: trend,
          correlatedTopics: correlatedTopics.slice(0, 5),
        };
      });

      // Detect emerging topics (topics with rapid growth)
      const emergingTopics = this.detectEmergingTopics(topicMentions, options.dateFrom);

      return {
        topics,
        emergingTopics,
      };
    } catch (error) {
      logger.error('Error tracking topics', { error });
      throw error;
    }
  }

  /**
   * Detect patterns across meetings
   */
  async detectPatterns(options: PatternDetectionOptions): Promise<PatternDetectionResult> {
    try {
      logger.info('Detecting patterns across meetings', {
        organizationId: options.organizationId,
        analysisType: options.analysisType,
      });

      // Fetch meetings with analyses
      const meetings = await prisma.meeting.findMany({
        where: {
          organizationId: options.organizationId,
          scheduledStartAt: {
            gte: options.dateFrom,
            lte: options.dateTo,
          },
          status: 'completed',
        },
        include: {
          summaries: true,
          analytics: true,
          aiAnalyses: true,
        },
        orderBy: { scheduledStartAt: 'asc' },
      });

      // Use GPT-4 to analyze patterns
      const meetingData = meetings.map(m => ({
        id: m.id,
        title: m.title,
        date: m.scheduledStartAt || m.createdAt,
        summary: m.summaries[0]?.overview,
        keyPoints: m.summaries[0]?.keyPoints,
        actionItems: m.summaries[0]?.actionItems,
        decisions: m.summaries[0]?.decisions,
        topics: m.analytics[0]?.topics,
        sentiment: m.analytics[0]?.sentimentScores,
      }));

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a pattern detection expert. Analyze meetings to identify:
- Recurring issues or blockers
- Decision-making patterns
- Team dynamics and collaboration patterns
- Productivity trends
- Risk indicators

Provide specific, actionable insights with concrete examples.`
          },
          {
            role: 'user',
            content: `Analyze these meetings for patterns (${options.analysisType}):\n\n${JSON.stringify(meetingData, null, 2)}`
          }
        ],
        temperature: 0.6,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

      // Calculate trends from analytics data
      const trends = this.calculateMetricTrends(meetings);

      return {
        patterns: result.patterns || [],
        insights: result.insights || [],
        trends,
      };
    } catch (error) {
      logger.error('Error detecting patterns', { error });
      throw error;
    }
  }

  /**
   * Generate aggregate insights from multiple meetings
   */
  async generateAggregateInsights(
    organizationId: string,
    meetingIds: string[]
  ): Promise<{
    themes: string[];
    sentiment: { overall: number; trend: string };
    actionItemStats: { total: number; completed: number; overdue: number };
    participationMetrics: { averageParticipants: number; topSpeakers: string[] };
    recommendations: string[];
  }> {
    try {
      const meetings = await prisma.meeting.findMany({
        where: {
          id: { in: meetingIds },
          organizationId,
        },
        include: {
          summaries: true,
          analytics: true,
          participants: true,
        },
      });

      // Aggregate action items
      const allActionItems = meetings.flatMap(m =>
        m.summaries[0]?.actionItems as any[] || []
      );

      const actionItemStats = {
        total: allActionItems.length,
        completed: allActionItems.filter((a: any) => a.status === 'completed').length,
        overdue: allActionItems.filter((a: any) => a.status === 'overdue').length,
      };

      // Calculate sentiment trend
      const sentiments = meetings
        .map(m => m.analytics[0]?.sentimentScores)
        .filter(Boolean);

      const avgSentiment = sentiments.length > 0
        ? sentiments.reduce((sum: number, s: any) => sum + (s.overall || 0), 0) / sentiments.length
        : 0;

      // Extract themes using topic clustering
      const allTopics = meetings.flatMap(m =>
        (m.analytics[0]?.topics as any[] || []).map((t: any) =>
          typeof t === 'string' ? t : t.name
        )
      );

      const themes = this.clusterTopics(allTopics);

      // Participation metrics
      const participationMetrics = {
        averageParticipants: meetings.reduce((sum, m) => sum + m.participantCount, 0) / meetings.length,
        topSpeakers: this.getTopSpeakers(meetings),
      };

      // Generate recommendations
      const recommendations = await this.generateRecommendations(meetings, actionItemStats, avgSentiment);

      return {
        themes: themes.slice(0, 10),
        sentiment: {
          overall: avgSentiment,
          trend: avgSentiment > 0.5 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral',
        },
        actionItemStats,
        participationMetrics,
        recommendations,
      };
    } catch (error) {
      logger.error('Error generating aggregate insights', { error });
      throw error;
    }
  }

  // ====================================
  // Private Helper Methods
  // ====================================

  private async findRelevantMeetings(
    organizationId: string,
    query: string,
    filters?: QueryOptions['meetingFilters'],
    limit: number = 20
  ): Promise<any[]> {
    const where: any = {
      organizationId,
      status: 'completed',
    };

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledStartAt = {};
      if (filters.dateFrom) where.scheduledStartAt.gte = filters.dateFrom;
      if (filters.dateTo) where.scheduledStartAt.lte = filters.dateTo;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.metadata = {
        path: ['tags'],
        array_contains: filters.tags,
      };
    }

    // First, get meetings from database
    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        summaries: true,
        analytics: true,
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: limit * 2, // Get more for filtering
    });

    // Use Elasticsearch for semantic search if available
    try {
      const searchResults = await this.searchService.searchTranscripts(
        query,
        organizationId,
        { size: limit }
      );

      // Match meetings with search results
      const meetingRelevance = new Map<string, number>();
      searchResults.hits.forEach((hit, index) => {
        const meetingId = (hit.source as any).meetingId;
        if (!meetingRelevance.has(meetingId)) {
          meetingRelevance.set(meetingId, hit.score);
        }
      });

      // Add relevance scores to meetings
      meetings.forEach(meeting => {
        (meeting as any).relevanceScore = meetingRelevance.get(meeting.id) || 0;
      });

      // Sort by relevance
      meetings.sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    } catch (error) {
      logger.warn('Elasticsearch search failed, using database only', { error });
    }

    return meetings.slice(0, limit);
  }

  private async buildMeetingContexts(meetings: any[]): Promise<any[]> {
    return Promise.all(
      meetings.map(async (meeting) => {
        // Get transcript from database
        const transcript = await prisma.transcript.findFirst({
          where: { meetingId: meeting.id },
          orderBy: { createdAt: 'desc' },
        });

        let fullText = '';
        let segments: any[] = [];

        if (transcript?.mongodbId) {
          const mongoTranscript = await transcriptService.getTranscript(transcript.mongodbId);
          if (mongoTranscript) {
            fullText = mongoTranscript.fullText;
            segments = mongoTranscript.segments;
          }
        }

        return {
          meeting,
          transcript: fullText,
          segments,
          summary: meeting.summaries[0],
          analytics: meeting.analytics[0],
        };
      })
    );
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding', { error });
      throw error;
    }
  }

  private async findRelevantSegments(
    questionEmbedding: number[],
    meetingContexts: any[],
    topK: number
  ): Promise<Array<{ meetingId: string; text: string; score: number }>> {
    const segments: Array<{ meetingId: string; text: string; score: number }> = [];

    // For each meeting, score segments
    for (const context of meetingContexts) {
      if (!context.segments || context.segments.length === 0) {
        // Fall back to summary if no segments
        if (context.summary?.overview) {
          segments.push({
            meetingId: context.meeting.id,
            text: context.summary.overview,
            score: 0.5,
          });
        }
        continue;
      }

      // Sample segments (to avoid processing too many)
      const sampledSegments = context.segments.filter((_: any, i: number) => i % 5 === 0);

      for (const segment of sampledSegments) {
        // Calculate semantic similarity using vector embeddings
        const score = await this.calculateTextSimilarity(segment.text, questionEmbedding);

        segments.push({
          meetingId: context.meeting.id,
          text: segment.text,
          score,
        });
      }
    }

    // Sort by score and return top K
    segments.sort((a, b) => b.score - a.score);
    return segments.slice(0, topK);
  }

  private async calculateTextSimilarity(text: string, embedding: number[]): Promise<number> {
    try {
      // Generate embedding for text using OpenAI
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      const textEmbedding = response.data[0].embedding;

      // Calculate cosine similarity
      const dotProduct = textEmbedding.reduce((sum, val, i) => sum + val * (embedding[i] || 0), 0);
      const magnitude1 = Math.sqrt(textEmbedding.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

      if (magnitude1 === 0 || magnitude2 === 0) return 0;

      return dotProduct / (magnitude1 * magnitude2);
    } catch (error) {
      logger.error('Error calculating text similarity:', error);
      return 0;
    }
  }

  private buildConversationalContext(
    question: string,
    segments: Array<{ meetingId: string; text: string; score: number }>,
    history?: ConversationMessage[]
  ): string {
    let context = `Question: ${question}\n\n`;

    context += `Relevant information from your meetings:\n\n`;

    segments.forEach((segment, index) => {
      context += `[${index + 1}] ${segment.text}\n\n`;
    });

    context += `\nBased on the above information from your meetings, please answer the question.`;

    return context;
  }

  private async generateFollowUpQuestions(
    question: string,
    answer: string,
    meetings: any[]
  ): Promise<string[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate 3 relevant follow-up questions based on the conversation.'
          },
          {
            role: 'user',
            content: `Question: ${question}\nAnswer: ${answer}\n\nSuggest follow-up questions:`
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
      });

      const suggestions = completion.choices[0]?.message?.content || '';
      return suggestions.split('\n').filter(q => q.trim()).slice(0, 3);
    } catch (error) {
      logger.error('Error generating follow-up questions', { error });
      return [];
    }
  }

  private calculateConfidence(segments: any[], meetings: any[]): number {
    if (segments.length === 0) return 0;

    const avgScore = segments.reduce((sum, s) => sum + s.score, 0) / segments.length;
    const meetingCoverage = Math.min(meetings.length / 5, 1); // More meetings = higher confidence

    return Math.min(avgScore * meetingCoverage, 1);
  }

  private async fetchMeetingsForAnalysis(
    organizationId: string,
    filters?: SuperSummaryOptions['meetingFilters']
  ): Promise<any[]> {
    const where: any = {
      organizationId,
      status: 'completed',
    };

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledStartAt = {};
      if (filters.dateFrom) where.scheduledStartAt.gte = filters.dateFrom;
      if (filters.dateTo) where.scheduledStartAt.lte = filters.dateTo;
    }

    return prisma.meeting.findMany({
      where,
      orderBy: { scheduledStartAt: 'desc' },
      take: 50,
    });
  }

  private async analyzeTrends(meetingData: any[]): Promise<any> {
    // Analyze topic trends
    const topicsByDate = new Map<string, Map<string, number>>();
    const sentimentByDate: Array<{ date: Date; sentiment: number }> = [];

    meetingData.forEach(({ meeting, analytics }) => {
      const date = meeting.scheduledStartAt || meeting.createdAt;
      const dateKey = date.toISOString().split('T')[0];

      if (!topicsByDate.has(dateKey)) {
        topicsByDate.set(dateKey, new Map());
      }

      const topics = (analytics?.topics as any[]) || [];
      topics.forEach((topic: any) => {
        const topicName = typeof topic === 'string' ? topic : topic.name;
        const dateTopics = topicsByDate.get(dateKey)!;
        dateTopics.set(topicName, (dateTopics.get(topicName) || 0) + 1);
      });

      if (analytics?.sentimentScores) {
        sentimentByDate.push({
          date,
          sentiment: (analytics.sentimentScores as any).overall || 0,
        });
      }
    });

    // Find trending topics
    const topicTrends: any[] = [];
    topicsByDate.forEach((topics, date) => {
      topics.forEach((count, topicName) => {
        let trend = topicTrends.find(t => t.topic === topicName);
        if (!trend) {
          trend = { topic: topicName, trend: 'stable', mentions: [] };
          topicTrends.push(trend);
        }
        trend.mentions.push(count);
      });
    });

    // Calculate trend direction
    topicTrends.forEach(trend => {
      if (trend.mentions.length < 2) {
        trend.trend = 'stable';
      } else {
        const recent = trend.mentions.slice(-3).reduce((a: number, b: number) => a + b, 0);
        const earlier = trend.mentions.slice(0, -3).reduce((a: number, b: number) => a + b, 0);

        if (recent > earlier * 1.5) trend.trend = 'rising';
        else if (recent < earlier * 0.5) trend.trend = 'declining';
        else trend.trend = 'stable';
      }
    });

    return {
      topicTrends: topicTrends.slice(0, 10),
      sentimentTrend: sentimentByDate,
    };
  }

  private groupByTimePeriod(
    mentions: Array<{ date: Date; meetingId: string; sentiment: number }>,
    granularity: 'day' | 'week' | 'month'
  ): Array<{ period: string; mentions: number; sentiment: number; meetings: string[] }> {
    const groups = new Map<string, { count: number; sentiments: number[]; meetings: Set<string> }>();

    mentions.forEach(mention => {
      let key: string;
      const date = new Date(mention.date);

      if (granularity === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groups.has(key)) {
        groups.set(key, { count: 0, sentiments: [], meetings: new Set() });
      }

      const group = groups.get(key)!;
      group.count++;
      group.sentiments.push(mention.sentiment);
      group.meetings.add(mention.meetingId);
    });

    return Array.from(groups.entries()).map(([period, data]) => ({
      period,
      mentions: data.count,
      sentiment: data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length,
      meetings: Array.from(data.meetings),
    }));
  }

  private calculateTrend(values: number[]): 'rising' | 'declining' | 'stable' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(-3).reduce((a, b) => a + b, 0);
    const earlier = values.slice(0, -3).reduce((a, b) => a + b, 0) || 1;

    if (recent > earlier * 1.3) return 'rising';
    if (recent < earlier * 0.7) return 'declining';
    return 'stable';
  }

  private findCorrelatedTopics(
    topicName: string,
    meetings: any[],
    allTopicMentions: Map<string, any[]>
  ): string[] {
    const correlations = new Map<string, number>();

    meetings.forEach(meeting => {
      const topics = (meeting.analytics[0]?.topics as any[] || [])
        .map((t: any) => typeof t === 'string' ? t : t.name);

      if (topics.includes(topicName)) {
        topics.forEach((otherTopic: string) => {
          if (otherTopic !== topicName) {
            correlations.set(otherTopic, (correlations.get(otherTopic) || 0) + 1);
          }
        });
      }
    });

    return Array.from(correlations.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic);
  }

  private detectEmergingTopics(
    topicMentions: Map<string, any[]>,
    fromDate: Date
  ): Array<{ name: string; growthRate: number; firstMentioned: Date }> {
    const emerging: Array<{ name: string; growthRate: number; firstMentioned: Date }> = [];

    topicMentions.forEach((mentions, topicName) => {
      const sortedMentions = mentions.sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstMention = sortedMentions[0]?.date;

      // Check if topic emerged recently (in last 25% of time period)
      const timeSpan = Date.now() - fromDate.getTime();
      const emergenceThreshold = Date.now() - (timeSpan * 0.25);

      if (firstMention && firstMention.getTime() > emergenceThreshold) {
        const recentMentions = mentions.filter(m => m.date.getTime() > emergenceThreshold).length;
        const growthRate = recentMentions / mentions.length;

        if (growthRate > 0.5) {
          emerging.push({
            name: topicName,
            growthRate,
            firstMentioned: firstMention,
          });
        }
      }
    });

    return emerging.sort((a, b) => b.growthRate - a.growthRate).slice(0, 5);
  }

  private calculateMetricTrends(meetings: any[]): Array<{
    metric: string;
    direction: 'improving' | 'declining' | 'stable';
    values: number[];
  }> {
    const metrics = [
      { key: 'engagementScore', name: 'Engagement' },
      { key: 'participantCount', name: 'Participation' },
    ];

    return metrics.map(({ key, name }) => {
      const values = meetings.map(m => (m.analytics[0] as any)?.[key] || m[key] || 0);
      const trend = this.calculateTrend(values);

      return {
        metric: name,
        direction: trend === 'rising' ? 'improving' : trend === 'declining' ? 'declining' : 'stable',
        values,
      };
    });
  }

  private clusterTopics(topics: string[]): string[] {
    // Simple frequency-based clustering
    const topicCounts = new Map<string, number>();

    topics.forEach(topic => {
      const normalized = topic.toLowerCase().trim();
      topicCounts.set(normalized, (topicCounts.get(normalized) || 0) + 1);
    });

    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic);
  }

  private getTopSpeakers(meetings: any[]): string[] {
    const speakerTimes = new Map<string, number>();

    meetings.forEach(meeting => {
      meeting.participants.forEach((participant: any) => {
        const name = participant.name || participant.email || 'Unknown';
        const time = participant.talkTimeSeconds || 0;
        speakerTimes.set(name, (speakerTimes.get(name) || 0) + time);
      });
    });

    return Array.from(speakerTimes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  private async generateRecommendations(
    meetings: any[],
    actionItemStats: any,
    avgSentiment: number
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Action item recommendations
    if (actionItemStats.total > 0) {
      const completionRate = actionItemStats.completed / actionItemStats.total;
      if (completionRate < 0.5) {
        recommendations.push(`Action item completion rate is ${(completionRate * 100).toFixed(0)}%. Consider implementing better tracking or reducing commitments.`);
      }
    }

    // Sentiment recommendations
    if (avgSentiment < 0) {
      recommendations.push('Meetings show negative sentiment trends. Consider addressing team concerns or adjusting meeting formats.');
    }

    // Meeting frequency
    const avgDaysBetween = this.calculateAverageDaysBetweenMeetings(meetings);
    if (avgDaysBetween < 1) {
      recommendations.push('High meeting frequency detected. Consider consolidating meetings to improve productivity.');
    }

    return recommendations;
  }

  private calculateAverageDaysBetweenMeetings(meetings: any[]): number {
    if (meetings.length < 2) return 0;

    let totalDays = 0;
    for (let i = 1; i < meetings.length; i++) {
      const prev = meetings[i - 1].scheduledStartAt || meetings[i - 1].createdAt;
      const curr = meetings[i].scheduledStartAt || meetings[i].createdAt;
      totalDays += Math.abs(curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    }

    return totalDays / (meetings.length - 1);
  }
}

// Export singleton instance
export const createMultiMeetingAIService = (
  searchService: SearchService,
  cacheService: CacheService,
  esClient?: ElasticsearchClient
) => {
  return new MultiMeetingAIService(searchService, cacheService, esClient);
};
