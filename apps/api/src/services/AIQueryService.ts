/**
 * Multi-Meeting AI Intelligence Service (GAP #1)
 * ChatGPT-like interface to query across ALL meetings
 *
 * ROUTES ALL AI CALLS THROUGH PYTHON FASTAPI
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';
import { transcriptService } from './TranscriptService';

const prisma = new PrismaClient();

// AI Service URL (Python FastAPI)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8888';

// Create axios instance for AI service
const aiClient: AxiosInstance = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
});

// Initialize Elasticsearch client
const esClient = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

// ====================================
// Types and Interfaces
// ====================================

export interface SuperSummaryCriteria {
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string[];
  participantEmails?: string[];
  tags?: string[];
  meetingIds?: string[];
  summaryType?: 'executive' | 'detailed' | 'action-focused' | 'decision-focused';
}

export interface SuperSummaryResult {
  summary: string;
  keyThemes: string[];
  actionItems: Array<{
    description: string;
    assignee?: string;
    status: string;
    meetingTitle: string;
    date: Date;
  }>;
  criticalDecisions: Array<{
    decision: string;
    meetingTitle: string;
    date: Date;
    impact: 'high' | 'medium' | 'low';
  }>;
  meetingsAnalyzed: number;
  timeSpan: { from: Date; to: Date };
  tokensUsed: number;
  processingTimeMs: number;
}

export interface SearchResult {
  meetingId: string;
  meetingTitle: string;
  meetingDate: Date;
  relevanceScore: number;
  matchedSegments: Array<{
    text: string;
    speaker?: string;
    timestamp: number;
    highlights?: string[];
  }>;
}

export interface InsightResult {
  themes: string[];
  patterns: Array<{
    type: string;
    description: string;
    occurrences: number;
    examples: string[];
  }>;
  sentiment: {
    overall: number;
    trend: 'positive' | 'neutral' | 'negative';
  };
  recommendations: string[];
  tokensUsed: number;
}

export interface RAGQueryResult {
  answer: string;
  confidence: number;
  sources: Array<{
    meetingId: string;
    meetingTitle: string;
    meetingDate: Date;
    relevantContent: string;
  }>;
  suggestedFollowUps: string[];
  tokensUsed: number;
}

// ====================================
// AI Query Service Class
// ====================================

class AIQueryService {
  /**
   * Ask a question across all meetings using RAG (Retrieval-Augmented Generation)
   * ROUTES THROUGH PYTHON FASTAPI
   */
  async askQuestion(userId: string, question: string): Promise<RAGQueryResult> {
    const startTime = Date.now();

    try {
      logger.info('AI query received', { userId, question });

      // Step 1: Fetch user's meetings with summaries and transcripts
      const meetings = await prisma.meeting.findMany({
        where: {
          participants: { some: { userId } }
        },
        include: {
          summaries: true,
          transcripts: true,
          analytics: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 30 // Get more meetings for better context
      });

      if (meetings.length === 0) {
        return {
          answer: "I don't have access to any meetings for your account yet. Please ensure you have recorded meetings available.",
          confidence: 0,
          sources: [],
          suggestedFollowUps: [
            "How do I record a meeting?",
            "What integrations are available?",
          ],
          tokensUsed: 0,
        };
      }

      // Step 2: Generate embedding for the question (for semantic search)
      const questionEmbedding = await this.generateEmbedding(question);

      // Step 3: Build context from meetings with relevance scoring
      const meetingContexts = await Promise.all(
        meetings.map(async (m) => {
          let transcriptText = '';

          // Get transcript from database if available
          if (m.transcripts[0]?.mongodbId) {
            try {
              const transcript = await transcriptService.getTranscript(m.transcripts[0].mongodbId);
              if (transcript) {
                transcriptText = transcript.fullText.substring(0, 2000); // Limit text
              }
            } catch (error) {
              logger.warn('Failed to fetch transcript', { meetingId: m.id });
            }
          }

          return {
            meetingId: m.id,
            title: m.title,
            date: m.scheduledStartAt || m.createdAt,
            summary: m.summaries[0]?.overview || '',
            keyPoints: m.summaries[0]?.keyPoints || [],
            actionItems: m.summaries[0]?.actionItems || [],
            decisions: m.summaries[0]?.decisions || [],
            transcriptExcerpt: transcriptText,
            topics: m.analytics[0]?.topics || [],
          };
        })
      );

      // Step 4: Score and rank meetings by relevance to the question
      const rankedMeetings = await this.rankMeetingsByRelevance(
        meetingContexts,
        questionEmbedding,
        question
      );

      // Step 5: Build optimized context for GPT-4
      const topMeetings = rankedMeetings.slice(0, 10);
      const contextStr = topMeetings.map((m, i) =>
        `[Meeting ${i + 1}: "${m.title}" on ${new Date(m.date).toLocaleDateString()}]
Summary: ${m.summary}
Key Points: ${JSON.stringify(m.keyPoints).substring(0, 500)}
${m.transcriptExcerpt ? `Transcript Excerpt: ${m.transcriptExcerpt.substring(0, 500)}...` : ''}`
      ).join('\n\n');

      // Step 6: Call Python FastAPI /api/v1/chat endpoint
      logger.info('Calling FastAPI /api/v1/chat', { contextLength: contextStr.length });

      const response = await aiClient.post('/api/v1/chat', {
        question,
        context: contextStr,
        conversationHistory: [],
      });

      const aiResult = response.data;
      const answer = aiResult.answer || 'Unable to generate response';
      const tokensUsed = 0;

      // Step 7: Generate follow-up suggestions
      const suggestedFollowUps = this.generateFollowUpSuggestions(
        question,
        topMeetings.flatMap(m => m.topics as string[])
      );

      // Step 8: Calculate confidence based on relevance scores
      const avgRelevance = topMeetings.reduce((sum, m) => sum + (m.relevanceScore || 0), 0) / topMeetings.length;
      const confidence = Math.min(avgRelevance * 0.8 + 0.2, 1);

      logger.info('AI query completed', {
        userId,
        tokensUsed,
        confidence,
        processingTimeMs: Date.now() - startTime
      });

      return {
        answer,
        confidence,
        sources: topMeetings.slice(0, 5).map(m => ({
          meetingId: m.meetingId,
          meetingTitle: m.title,
          meetingDate: m.date,
          relevantContent: m.summary.substring(0, 200),
        })),
        suggestedFollowUps,
        tokensUsed,
      };
    } catch (error) {
      logger.error('Error in AI query', { error, userId });
      throw error;
    }
  }

  /**
   * Generate Super Summary from multiple meetings
   * ROUTES THROUGH PYTHON FASTAPI
   */
  async generateSuperSummary(userId: string, criteria: SuperSummaryCriteria): Promise<SuperSummaryResult> {
    const startTime = Date.now();

    try {
      logger.info('Generating super summary', { userId, criteria });

      // Step 1: Build query filters based on criteria
      const whereClause: any = {
        participants: { some: { userId } },
        status: 'completed',
      };

      if (criteria.dateFrom || criteria.dateTo) {
        whereClause.scheduledStartAt = {};
        if (criteria.dateFrom) whereClause.scheduledStartAt.gte = criteria.dateFrom;
        if (criteria.dateTo) whereClause.scheduledStartAt.lte = criteria.dateTo;
      }

      if (criteria.meetingIds && criteria.meetingIds.length > 0) {
        whereClause.id = { in: criteria.meetingIds };
      }

      // Step 2: Fetch meetings with all related data
      const meetings = await prisma.meeting.findMany({
        where: whereClause,
        include: {
          summaries: true,
          analytics: true,
          participants: true,
        },
        orderBy: { scheduledStartAt: 'desc' },
        take: 50, // Limit to 50 meetings for API limits
      });

      if (meetings.length === 0) {
        return {
          summary: 'No meetings found matching the specified criteria.',
          keyThemes: [],
          actionItems: [],
          criticalDecisions: [],
          meetingsAnalyzed: 0,
          timeSpan: {
            from: criteria.dateFrom || new Date(),
            to: criteria.dateTo || new Date()
          },
          tokensUsed: 0,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 3: Filter by keywords if provided
      let filteredMeetings = meetings;
      if (criteria.keywords && criteria.keywords.length > 0) {
        const keywordPattern = criteria.keywords.join('|').toLowerCase();
        filteredMeetings = meetings.filter(m => {
          const searchText = [
            m.title,
            m.summaries[0]?.overview || '',
            JSON.stringify(m.summaries[0]?.keyPoints || []),
          ].join(' ').toLowerCase();
          return new RegExp(keywordPattern).test(searchText);
        });
      }

      // Step 4: Filter by participants if provided
      if (criteria.participantEmails && criteria.participantEmails.length > 0) {
        filteredMeetings = filteredMeetings.filter(m =>
          m.participants.some(p =>
            criteria.participantEmails!.includes(p.email || '')
          )
        );
      }

      // Step 5: Aggregate meeting data for analysis
      const aggregatedData = filteredMeetings.map(m => ({
        title: m.title,
        date: m.scheduledStartAt || m.createdAt,
        overview: m.summaries[0]?.overview || '',
        keyPoints: m.summaries[0]?.keyPoints || [],
        actionItems: m.summaries[0]?.actionItems || [],
        decisions: m.summaries[0]?.decisions || [],
        topics: m.analytics[0]?.topics || [],
        sentiment: m.analytics[0]?.sentimentScores || {},
        participantCount: m.participantCount,
      }));

      // Step 6: Build aggregated text for FastAPI and call /api/v1/super-summarize
      const meetingsText = aggregatedData.map(m => {
        const dateStr = new Date(m.date).toLocaleDateString();
        return `Meeting: ${m.title} (${dateStr})\nSummary: ${m.overview}\nKey Points: ${JSON.stringify(m.keyPoints)}`;
      }).join('\n\n---\n\n');

      logger.info('Calling FastAPI /api/v1/super-summarize', { meetingCount: filteredMeetings.length });

      const response = await aiClient.post('/api/v1/super-summarize', {
        meetings: meetingsText,
        meetingCount: filteredMeetings.length,
        timeRange: criteria.summaryType || 'custom',
      });

      const aiResult = response.data;
      const tokensUsed = 0;

      // Step 7: Extract and consolidate action items across meetings
      const allActionItems = filteredMeetings.flatMap(m => {
        const items = m.summaries[0]?.actionItems as any[] || [];
        return items.map((item: any) => ({
          description: typeof item === 'string' ? item : (item.description || item.text || JSON.stringify(item)),
          assignee: item?.assignee,
          status: item?.status || 'pending',
          meetingTitle: m.title,
          date: m.scheduledStartAt || m.createdAt,
        }));
      });

      // Step 8: Extract and consolidate decisions across meetings
      const allDecisions = filteredMeetings.flatMap(m => {
        const decisions = m.summaries[0]?.decisions as any[] || [];
        return decisions.map((decision: any) => ({
          decision: typeof decision === 'string' ? decision : (decision.description || decision.text || JSON.stringify(decision)),
          meetingTitle: m.title,
          date: m.scheduledStartAt || m.createdAt,
          impact: decision?.impact || 'medium' as 'high' | 'medium' | 'low',
        }));
      });

      // Step 9: Calculate time span
      const dates = filteredMeetings
        .map(m => m.scheduledStartAt || m.createdAt)
        .filter(Boolean)
        .sort((a, b) => a.getTime() - b.getTime());

      const timeSpan = {
        from: dates[0] || new Date(),
        to: dates[dates.length - 1] || new Date(),
      };

      logger.info('Super summary generated', {
        userId,
        meetingsAnalyzed: filteredMeetings.length,
        tokensUsed,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        summary: aiResult.summary || 'Summary generation completed.',
        keyThemes: aiResult.keyThemes || [],
        actionItems: allActionItems,
        criticalDecisions: allDecisions,
        meetingsAnalyzed: filteredMeetings.length,
        timeSpan,
        tokensUsed,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Error generating super summary', { error, userId });
      throw error;
    }
  }

  /**
   * Search across all meetings using Elasticsearch
   * ROUTES THROUGH PYTHON FASTAPI (with Elasticsearch fallback)
   */
  async searchAcrossMeetings(
    userId: string,
    query: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
    }
  ): Promise<SearchResult[]> {
    try {
      logger.info('Searching across meetings', { userId, query });

      // Step 1: Get user's organization for filtering
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });

      if (!user?.organizationId) {
        return [];
      }

      // Step 2: Build Elasticsearch query
      const esQuery: any = {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['content^2', 'title', 'speaker'],
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
          ],
          filter: [
            { term: { organizationId: user.organizationId } },
          ],
        },
      };

      // Add date range filter if provided
      if (options?.dateFrom || options?.dateTo) {
        const rangeFilter: any = { range: { createdAt: {} } };
        if (options.dateFrom) rangeFilter.range.createdAt.gte = options.dateFrom.toISOString();
        if (options.dateTo) rangeFilter.range.createdAt.lte = options.dateTo.toISOString();
        esQuery.bool.filter.push(rangeFilter);
      }

      // Step 3: Execute Elasticsearch search
      const searchResponse = await esClient.search({
        index: 'transcripts',
        body: {
          query: esQuery,
          highlight: {
            fields: {
              content: {
                fragment_size: 150,
                number_of_fragments: 3,
                pre_tags: ['<mark>'],
                post_tags: ['</mark>'],
              },
            },
          },
          size: options?.limit || 20,
          sort: [
            { _score: { order: 'desc' } },
            { createdAt: { order: 'desc' } },
          ],
        },
      });

      // Step 4: Process and format results
      const hits = (searchResponse.hits.hits as any[]) || [];
      const meetingIds = Array.from(new Set(hits.map(hit => hit._source.meetingId)));

      // Step 5: Fetch meeting details from database
      const meetings = await prisma.meeting.findMany({
        where: { id: { in: meetingIds } },
        select: {
          id: true,
          title: true,
          scheduledStartAt: true,
          createdAt: true,
        },
      });

      const meetingMap = new Map(meetings.map(m => [m.id, m]));

      // Step 6: Build search results
      const results: SearchResult[] = hits.map(hit => {
        const meeting = meetingMap.get(hit._source.meetingId);
        return {
          meetingId: hit._source.meetingId,
          meetingTitle: meeting?.title || 'Unknown Meeting',
          meetingDate: meeting?.scheduledStartAt || meeting?.createdAt || new Date(),
          relevanceScore: hit._score || 0,
          matchedSegments: [{
            text: hit._source.content?.substring(0, 500) || '',
            speaker: hit._source.speaker,
            timestamp: hit._source.timestamp || 0,
            highlights: hit.highlight?.content || [],
          }],
        };
      });

      logger.info('Search completed', {
        userId,
        query,
        resultsCount: results.length
      });

      return results;
    } catch (error: any) {
      // Fallback to database search if Elasticsearch is unavailable
      if (error.name === 'ConnectionError' || error.statusCode === 503) {
        logger.warn('Elasticsearch unavailable, falling back to database search', { error: error.message });
        return this.fallbackDatabaseSearch(userId, query, options);
      }

      logger.error('Error searching across meetings', { error, userId });
      throw error;
    }
  }

  /**
   * Generate insights from meetings using AI
   * ROUTES THROUGH PYTHON FASTAPI
   */
  async generateInsights(
    userId: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      analysisType?: 'themes' | 'patterns' | 'sentiment' | 'all';
    }
  ): Promise<InsightResult> {
    try {
      logger.info('Generating insights', { userId, options });

      // Step 1: Fetch meetings for analysis
      const whereClause: any = {
        participants: { some: { userId } },
        status: 'completed',
      };

      if (options?.dateFrom || options?.dateTo) {
        whereClause.scheduledStartAt = {};
        if (options.dateFrom) whereClause.scheduledStartAt.gte = options.dateFrom;
        if (options.dateTo) whereClause.scheduledStartAt.lte = options.dateTo;
      }

      const meetings = await prisma.meeting.findMany({
        where: whereClause,
        include: {
          summaries: true,
          analytics: true,
        },
        orderBy: { scheduledStartAt: 'desc' },
        take: 30,
      });

      if (meetings.length === 0) {
        return {
          themes: [],
          patterns: [],
          sentiment: { overall: 0, trend: 'neutral' },
          recommendations: ['No meetings found for analysis. Record some meetings to get insights.'],
          tokensUsed: 0,
        };
      }

      // Step 2: Aggregate data for analysis
      const analysisData = meetings.map(m => ({
        title: m.title,
        date: m.scheduledStartAt || m.createdAt,
        summary: m.summaries[0]?.overview || '',
        keyPoints: m.summaries[0]?.keyPoints || [],
        actionItems: m.summaries[0]?.actionItems || [],
        decisions: m.summaries[0]?.decisions || [],
        topics: m.analytics[0]?.topics || [],
        sentiment: m.analytics[0]?.sentimentScores,
        engagement: m.analytics[0]?.engagementScore,
      }));

      // Step 3: Build meeting text and call FastAPI /api/v1/quality-score
      const meetingText = analysisData.map(m => `Meeting: ${m.title}\nSummary: ${m.summary}`).join('\n\n');

      logger.info('Calling FastAPI /api/v1/quality-score', { meetingCount: meetings.length });

      const response = await aiClient.post('/api/v1/quality-score', {
        meetingText: meetingText.substring(0, 10000),
        duration: 60,
        participantCount: 5,
        objectives: [],
        actionItems: [],
      });

      const aiResult = response.data;
      const tokensUsed = 0;

      // Step 4: Calculate sentiment from analytics data
      const sentimentValues = meetings
        .map(m => (m.analytics[0]?.sentimentScores as any)?.overall)
        .filter(s => typeof s === 'number');

      const avgSentiment = sentimentValues.length > 0
        ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length
        : aiResult.overallSentiment || 0;

      const sentimentTrend = aiResult.sentimentTrend === 'improving' ? 'positive'
        : aiResult.sentimentTrend === 'declining' ? 'negative'
        : 'neutral';

      logger.info('Insights generated', {
        userId,
        tokensUsed,
        themesCount: aiResult.themes?.length || 0,
        patternsCount: aiResult.patterns?.length || 0,
      });

      return {
        themes: aiResult.themes || [],
        patterns: aiResult.patterns || [],
        sentiment: {
          overall: avgSentiment,
          trend: sentimentTrend,
        },
        recommendations: aiResult.recommendations || [],
        tokensUsed,
      };
    } catch (error) {
      logger.error('Error generating insights', { error, userId });
      throw error;
    }
  }

  // ====================================
  // Private Helper Methods
  // ====================================

  /**
   * Generate follow-up question suggestions based on topics
   */
  private generateFollowUpSuggestions(question: string, topics: string[]): string[] {
    const suggestions: string[] = [];
    if (topics.length > 0) {
      suggestions.push(`Tell me more about ${topics[0]}`);
    }
    suggestions.push(
      'What action items came from this?',
      'Who was responsible for follow-ups?',
      'Were there any decisions made?'
    );
    return suggestions.slice(0, 3);
  }

  /**
   * Generate embedding - returns empty to use fallback keyword matching
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    return [];
  }

  /**
   * Rank meetings by relevance to the question using embeddings
   */
  private async rankMeetingsByRelevance(
    meetings: any[],
    questionEmbedding: number[],
    question: string
  ): Promise<any[]> {
    if (questionEmbedding.length === 0) {
      // Fallback to keyword matching if embedding failed
      const keywords = question.toLowerCase().split(/\s+/);
      return meetings.map(m => {
        const searchText = [m.title, m.summary, JSON.stringify(m.keyPoints)].join(' ').toLowerCase();
        const matchCount = keywords.filter(k => searchText.includes(k)).length;
        return { ...m, relevanceScore: matchCount / keywords.length };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Score each meeting based on embedding similarity
    const scoredMeetings = await Promise.all(
      meetings.map(async (m) => {
        const meetingText = [m.title, m.summary].join(' ');
        const meetingEmbedding = await this.generateEmbedding(meetingText);
        const similarity = this.cosineSimilarity(questionEmbedding, meetingEmbedding);
        return { ...m, relevanceScore: similarity };
      })
    );

    return scoredMeetings.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Fallback database search when Elasticsearch is unavailable
   */
  private async fallbackDatabaseSearch(
    userId: string,
    query: string,
    options?: { dateFrom?: Date; dateTo?: Date; limit?: number }
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      participants: { some: { userId } },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (options?.dateFrom || options?.dateTo) {
      whereClause.scheduledStartAt = {};
      if (options.dateFrom) whereClause.scheduledStartAt.gte = options.dateFrom;
      if (options.dateTo) whereClause.scheduledStartAt.lte = options.dateTo;
    }

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      include: { summaries: true },
      orderBy: { scheduledStartAt: 'desc' },
      take: options?.limit || 20,
    });

    return meetings.map(m => ({
      meetingId: m.id,
      meetingTitle: m.title,
      meetingDate: m.scheduledStartAt || m.createdAt,
      relevanceScore: 0.5, // Default score for database search
      matchedSegments: [{
        text: m.summaries[0]?.overview || m.description || '',
        timestamp: 0,
      }],
    }));
  }
}

export const aiQueryService = new AIQueryService();
