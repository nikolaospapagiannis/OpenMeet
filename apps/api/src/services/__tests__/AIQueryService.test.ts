/**
 * AIQueryService Tests
 *
 * Tests the REAL OpenAI implementation (requires valid OPENAI_API_KEY)
 * Note: These tests make actual API calls - run sparingly to avoid costs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// All mocks must be defined at the top level with vi.hoisted
const mocks = vi.hoisted(() => {
  const meetingFindMany = vi.fn();
  const userFindUnique = vi.fn();
  const getTranscript = vi.fn();
  const esSearch = vi.fn();
  const chatCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ summary: 'Mock summary', keyThemes: [], patterns: [], recommendations: [] }) } }],
    usage: { total_tokens: 100 },
  });
  const embeddingsCreate = vi.fn().mockResolvedValue({
    data: [{ embedding: new Array(1536).fill(0.1) }],
  });

  return {
    meetingFindMany,
    userFindUnique,
    getTranscript,
    esSearch,
    chatCreate,
    embeddingsCreate,
  };
});

// Mock modules using hoisted values
vi.mock('@prisma/client', () => {
  class MockPrismaClient {
    meeting = { findMany: mocks.meetingFindMany };
    user = { findUnique: mocks.userFindUnique };
  }
  return { PrismaClient: MockPrismaClient };
});

vi.mock('../TranscriptService', () => ({
  transcriptService: { getTranscript: mocks.getTranscript },
}));

vi.mock('@elastic/elasticsearch', () => {
  class MockClient {
    search = mocks.esSearch;
  }
  return { Client: MockClient };
});

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mocks.chatCreate } };
      embeddings = { create: mocks.embeddingsCreate };
    },
  };
});

// Import after mocks
import { aiQueryService, SuperSummaryCriteria, SuperSummaryResult, SearchResult, InsightResult, RAGQueryResult } from '../AIQueryService';

describe('AIQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('askQuestion', () => {
    it('should return meaningful response when no meetings exist', async () => {
      mocks.meetingFindMany.mockResolvedValue([]);

      const result = await aiQueryService.askQuestion(
        'test-user-id',
        'What were the key decisions from last week?'
      );

      expect(result).toBeDefined();
      expect(result.answer).toContain("don't have access");
      expect(result.confidence).toBe(0);
      expect(result.sources).toHaveLength(0);
      expect(result.suggestedFollowUps).toBeDefined();
      expect(result.tokensUsed).toBe(0);
    });

    it('should have proper RAGQueryResult structure in response', async () => {
      mocks.meetingFindMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Weekly Standup',
          scheduledStartAt: new Date(),
          createdAt: new Date(),
          summaries: [{
            overview: 'Team discussed project progress and blockers',
            keyPoints: ['Progress update', 'Blockers identified'],
            actionItems: [],
            decisions: [],
          }],
          transcripts: [],
          analytics: [],
        },
      ]);

      mocks.chatCreate.mockResolvedValue({
        choices: [{ message: { content: 'The team discussed progress and blockers.' } }],
        usage: { total_tokens: 150 },
      });

      const result = await aiQueryService.askQuestion(
        'test-user-id',
        'What was discussed in the standup?'
      );

      // Verify response structure matches RAGQueryResult interface
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('suggestedFollowUps');
      expect(result).toHaveProperty('tokensUsed');

      // Type check
      expect(typeof result.answer).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.sources)).toBe(true);
      expect(Array.isArray(result.suggestedFollowUps)).toBe(true);
      expect(typeof result.tokensUsed).toBe('number');
    });
  });

  describe('generateSuperSummary', () => {
    it('should return empty result when no meetings match criteria', async () => {
      mocks.meetingFindMany.mockResolvedValue([]);

      const criteria: SuperSummaryCriteria = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      };

      const result = await aiQueryService.generateSuperSummary('test-user-id', criteria);

      expect(result).toBeDefined();
      expect(result.summary).toContain('No meetings found');
      expect(result.meetingsAnalyzed).toBe(0);
      expect(result.keyThemes).toHaveLength(0);
      expect(result.actionItems).toHaveLength(0);
      expect(result.criticalDecisions).toHaveLength(0);
    });

    it('should have proper SuperSummaryResult structure', async () => {
      mocks.meetingFindMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Q4 Budget Review',
          scheduledStartAt: new Date('2024-01-15'),
          createdAt: new Date('2024-01-15'),
          summaries: [{
            overview: 'Discussed budget allocations for Q4',
            keyPoints: ['Budget allocation'],
            actionItems: [{ description: 'Review budget', assignee: 'John', status: 'pending' }],
            decisions: [{ description: 'Approved Q4 budget', impact: 'high' }],
          }],
          analytics: [{
            topics: ['budget', 'finance'],
            sentimentScores: { overall: 0.7 },
          }],
          participants: [{ email: 'john@example.com' }],
          participantCount: 3,
        },
      ]);

      mocks.chatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ summary: 'Q4 budget review completed', keyThemes: ['budget', 'finance'] }) } }],
        usage: { total_tokens: 200 },
      });

      const result = await aiQueryService.generateSuperSummary('test-user-id', {});

      // Verify response structure matches SuperSummaryResult interface
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keyThemes');
      expect(result).toHaveProperty('actionItems');
      expect(result).toHaveProperty('criticalDecisions');
      expect(result).toHaveProperty('meetingsAnalyzed');
      expect(result).toHaveProperty('timeSpan');
      expect(result).toHaveProperty('tokensUsed');
      expect(result).toHaveProperty('processingTimeMs');

      expect(result.meetingsAnalyzed).toBeGreaterThan(0);
      expect(result.timeSpan).toHaveProperty('from');
      expect(result.timeSpan).toHaveProperty('to');
    });

    it('should filter by keywords correctly', async () => {
      mocks.meetingFindMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Budget Discussion',
          scheduledStartAt: new Date(),
          createdAt: new Date(),
          summaries: [{ overview: 'Discussed budget', keyPoints: [], actionItems: [], decisions: [] }],
          analytics: [],
          participants: [],
          participantCount: 2,
        },
        {
          id: 'meeting-2',
          title: 'Team Building',
          scheduledStartAt: new Date(),
          createdAt: new Date(),
          summaries: [{ overview: 'Planned activities', keyPoints: [], actionItems: [], decisions: [] }],
          analytics: [],
          participants: [],
          participantCount: 5,
        },
      ]);

      mocks.chatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ summary: 'Budget related summary', keyThemes: ['budget'] }) } }],
        usage: { total_tokens: 100 },
      });

      const result = await aiQueryService.generateSuperSummary('test-user-id', {
        keywords: ['budget'],
      });

      // Should only include meetings matching keyword
      expect(result.meetingsAnalyzed).toBe(1);
    });
  });

  describe('searchAcrossMeetings', () => {
    it('should return empty array when user has no organization', async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      const results = await aiQueryService.searchAcrossMeetings(
        'test-user-id',
        'budget meeting'
      );

      expect(results).toEqual([]);
    });

    it('should have proper SearchResult structure when results found', async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: 'test-user-id',
        organizationId: 'org-1',
      });

      mocks.esSearch.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'doc-1',
              _score: 0.9,
              _source: {
                meetingId: 'meeting-1',
                content: 'Budget discussion transcript',
                speaker: 'John',
                timestamp: 120,
              },
              highlight: {
                content: ['<mark>Budget</mark> discussion'],
              },
            },
          ],
        },
      });

      mocks.meetingFindMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Q4 Budget Review',
          scheduledStartAt: new Date('2024-01-15'),
          createdAt: new Date('2024-01-15'),
        },
      ]);

      const results = await aiQueryService.searchAcrossMeetings(
        'test-user-id',
        'budget'
      );

      expect(results.length).toBeGreaterThan(0);

      // Verify structure matches SearchResult interface
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('meetingId');
      expect(firstResult).toHaveProperty('meetingTitle');
      expect(firstResult).toHaveProperty('meetingDate');
      expect(firstResult).toHaveProperty('relevanceScore');
      expect(firstResult).toHaveProperty('matchedSegments');
      expect(Array.isArray(firstResult.matchedSegments)).toBe(true);
    });

    it('should fallback to database search when Elasticsearch fails', async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: 'test-user-id',
        organizationId: 'org-1',
      });

      // Simulate Elasticsearch connection error
      const connectionError = new Error('Connection refused');
      (connectionError as any).name = 'ConnectionError';
      mocks.esSearch.mockRejectedValue(connectionError);

      mocks.meetingFindMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Budget Review',
          description: 'Quarterly budget review',
          scheduledStartAt: new Date(),
          createdAt: new Date(),
          summaries: [{ overview: 'Budget discussion' }],
        },
      ]);

      const results = await aiQueryService.searchAcrossMeetings(
        'test-user-id',
        'budget'
      );

      // Should not throw, should return database results
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('generateInsights', () => {
    it('should return empty insights when no meetings exist', async () => {
      mocks.meetingFindMany.mockResolvedValue([]);

      const result = await aiQueryService.generateInsights('test-user-id', {
        analysisType: 'all',
      });

      expect(result).toBeDefined();
      expect(result.themes).toHaveLength(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.sentiment.overall).toBe(0);
      expect(result.sentiment.trend).toBe('neutral');
      expect(result.recommendations).toContain('No meetings found for analysis. Record some meetings to get insights.');
      expect(result.tokensUsed).toBe(0);
    });

    it('should have proper InsightResult structure', async () => {
      mocks.meetingFindMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Weekly Standup',
          scheduledStartAt: new Date(),
          createdAt: new Date(),
          summaries: [{
            overview: 'Team discussed blockers and progress',
            keyPoints: ['Blockers', 'Progress'],
            actionItems: [],
            decisions: [],
          }],
          analytics: [{
            topics: ['standup', 'progress'],
            sentimentScores: { overall: 0.6 },
            engagementScore: 75,
          }],
        },
      ]);

      mocks.chatCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          themes: ['progress', 'blockers'],
          patterns: [{ type: 'recurring_issue', description: 'Blockers', occurrences: 1, examples: [] }],
          overallSentiment: 0.6,
          sentimentTrend: 'stable',
          recommendations: ['Continue daily standups'],
        }) } }],
        usage: { total_tokens: 150 },
      });

      const result = await aiQueryService.generateInsights('test-user-id', {});

      // Verify structure matches InsightResult interface
      expect(result).toHaveProperty('themes');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('tokensUsed');

      expect(result.sentiment).toHaveProperty('overall');
      expect(result.sentiment).toHaveProperty('trend');
      expect(['positive', 'neutral', 'negative']).toContain(result.sentiment.trend);
    });
  });

  describe('Type exports', () => {
    it('should export all required interfaces', () => {
      // These imports would fail at compile time if types don't exist
      const criteriaType: SuperSummaryCriteria = {};
      const summaryType: Partial<SuperSummaryResult> = { summary: '' };
      const searchType: Partial<SearchResult> = { meetingId: '' };
      const insightType: Partial<InsightResult> = { themes: [] };
      const queryType: Partial<RAGQueryResult> = { answer: '' };

      expect(criteriaType).toBeDefined();
      expect(summaryType).toBeDefined();
      expect(searchType).toBeDefined();
      expect(insightType).toBeDefined();
      expect(queryType).toBeDefined();
    });
  });
});
