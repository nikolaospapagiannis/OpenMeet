import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { promisify } from 'util';
import Redis from 'ioredis';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { createModuleLogger } from '../lib/logger';

const router: Router = Router();
const prisma = new PrismaClient();
const logger = createModuleLogger('intelligence');

// Redis client for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const getAsync = promisify(redis.get).bind(redis);
const setexAsync = promisify(redis.setex).bind(redis);

// Elasticsearch client
const elasticsearch = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/intelligence/search
 * Cross-meeting semantic search
 *
 * Searches across all meetings and transcripts for a user/organization
 * using semantic search powered by Elasticsearch and AI.
 */
router.post('/search', [
  body('query').trim().notEmpty().withMessage('Search query is required'),
  body('meetingIds').optional().isArray().withMessage('Meeting IDs must be an array'),
  body('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().toDate().withMessage('Invalid end date'),
  body('speakers').optional().isArray().withMessage('Speakers must be an array'),
  body('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!userId || !organizationId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const { query: searchQuery, meetingIds, startDate, endDate, speakers, limit = 20 } = req.body;

  try {
    // Build Elasticsearch query
    const must: any[] = [
      { term: { organizationId } },
      {
        multi_match: {
          query: searchQuery,
          fields: ['text^3', 'title^2', 'summary', 'keyPoints'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (meetingIds && meetingIds.length > 0) {
      must.push({ terms: { meetingId: meetingIds } });
    }

    if (startDate || endDate) {
      const range: any = {};
      if (startDate) range.gte = startDate;
      if (endDate) range.lte = endDate;
      must.push({ range: { createdAt: range } });
    }

    if (speakers && speakers.length > 0) {
      must.push({ terms: { speaker: speakers } });
    }

    // Search across multiple indexes
    const [transcriptResults, meetingResults] = await Promise.all([
      // Search transcript segments
      elasticsearch.search({
        index: 'transcript_segments',
        body: {
          query: { bool: { must } },
          size: limit,
          highlight: {
            fields: {
              text: {
                pre_tags: ['<mark>'],
                post_tags: ['</mark>'],
                fragment_size: 150,
                number_of_fragments: 3,
              },
            },
          },
          sort: [
            { _score: { order: 'desc' as const } },
            { createdAt: { order: 'desc' as const } },
          ],
        },
      }),
      // Search meetings
      elasticsearch.search({
        index: 'meetings',
        body: {
          query: { bool: { must } },
          size: limit,
          highlight: {
            fields: {
              title: {},
              description: {},
            },
          },
        },
      }),
    ]);

    // Extract and format results
    const transcriptHits = transcriptResults.hits.hits.map((hit: any) => ({
      type: 'transcript',
      meetingId: hit._source.meetingId,
      transcriptId: hit._source.transcriptId,
      speaker: hit._source.speaker,
      text: hit._source.text,
      startTime: hit._source.startTime,
      endTime: hit._source.endTime,
      highlights: hit.highlight?.text || [],
      score: hit._score,
    }));

    const meetingHits = meetingResults.hits.hits.map((hit: any) => ({
      type: 'meeting',
      meetingId: hit._source.id,
      title: hit._source.title,
      description: hit._source.description,
      scheduledAt: hit._source.scheduledAt,
      highlights: {
        title: hit.highlight?.title || [],
        description: hit.highlight?.description || [],
      },
      score: hit._score,
    }));

    // Combine and sort by relevance score
    const combinedResults = [...transcriptHits, ...meetingHits]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Fetch meeting metadata for transcript results
    const meetingIdsToFetch = [
      ...new Set(combinedResults.filter(r => r.type === 'transcript').map(r => r.meetingId)),
    ];

    const meetings = await prisma.meeting.findMany({
      where: {
        id: { in: meetingIdsToFetch },
        organizationId,
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        platform: true,
      },
    });

    const meetingMap = new Map(meetings.map(m => [m.id, m]));

    // Enrich results with meeting metadata
    const enrichedResults = combinedResults.map(result => {
      if (result.type === 'transcript' && result.meetingId) {
        const meeting = meetingMap.get(result.meetingId);
        return {
          ...result,
          meeting: meeting || null,
        };
      }
      return result;
    });

    res.json({
      query: searchQuery,
      totalResults: combinedResults.length,
      results: enrichedResults,
    });
  } catch (error: any) {
    logger.error('Cross-meeting search error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to perform cross-meeting search', details: error.message });
  }
});

/**
 * POST /api/intelligence/ask
 * AI Chat Assistant (AskFred-style)
 *
 * Ask questions about meetings and get AI-powered answers using
 * retrieval-augmented generation (RAG) with meeting context.
 */
router.post('/ask', [
  body('question').trim().notEmpty().withMessage('Question is required'),
  body('meetingIds').optional().isArray().withMessage('Meeting IDs must be an array'),
  body('conversationHistory').optional().isArray().withMessage('Conversation history must be an array'),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!userId || !organizationId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const { question, meetingIds, conversationHistory = [] } = req.body;

  try {
    // Step 1: Retrieve relevant context using semantic search
    const searchMust: any[] = [
      { term: { organizationId } },
      {
        multi_match: {
          query: question,
          fields: ['text^3', 'summary^2', 'keyPoints'],
          type: 'best_fields',
        },
      },
    ];

    if (meetingIds && meetingIds.length > 0) {
      searchMust.push({ terms: { meetingId: meetingIds } });
    }

    const contextResults = await elasticsearch.search({
      index: 'transcript_segments',
      body: {
        query: { bool: { must: searchMust } },
        size: 10,
        _source: ['meetingId', 'text', 'speaker', 'startTime'],
      },
    });

    // Fetch meeting summaries for additional context
    const relevantMeetingIds = [
      ...new Set(contextResults.hits.hits.map((hit: any) => hit._source.meetingId)),
    ];

    const summaries = await prisma.meetingSummary.findMany({
      where: {
        meeting: {
          id: { in: relevantMeetingIds },
          organizationId,
        },
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            scheduledStartAt: true,
          },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // Step 2: Build context for AI
    const transcriptContext = contextResults.hits.hits
      .map((hit: any) => {
        const source = hit._source;
        return `[${source.speaker}]: ${source.text}`;
      })
      .join('\n\n');

    const summaryContext = summaries
      .map(summary => {
        const keyPoints = Array.isArray(summary.keyPoints) ? summary.keyPoints : [];
        return `Meeting: ${summary.meeting.title}\nDate: ${summary.meeting.scheduledAt || summary.meeting.scheduledStartAt}\nSummary: ${summary.overview || ''}\nKey Points:\n${keyPoints.map((kp: any) => `- ${typeof kp === 'string' ? kp : kp.text || kp.point || ''}`).join('\n')}`;
      })
      .join('\n\n---\n\n');

    const fullContext = `# Meeting Transcripts\n\n${transcriptContext}\n\n# Meeting Summaries\n\n${summaryContext}`;

    // Step 3: Call AI service with RAG
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/v1/chat`, {
      question,
      context: fullContext,
      conversationHistory,
    }, {
      timeout: 30000,
    });

    // Step 4: Return answer with source citations
    res.json({
      question,
      answer: aiResponse.data.answer,
      sources: summaries.map(s => ({
        meetingId: s.meeting.id,
        meetingTitle: s.meeting.title,
        meetingDate: s.meeting.scheduledAt || s.meeting.scheduledStartAt,
      })),
      conversationId: aiResponse.data.conversationId,
    });
  } catch (error: any) {
    logger.error('AI chat assistant error', { error: error.message, stack: error.stack });
    if (error.response?.status === 400) {
      res.status(400).json({ error: 'Invalid question or context', details: error.response.data });
      return;
    }
    res.status(500).json({ error: 'Failed to get AI answer', details: error.message });
  }
});

/**
 * POST /api/intelligence/super-summary
 * Generate Super Summary across multiple meetings
 *
 * Consolidates insights, action items, and key points from multiple meetings
 * into a single comprehensive summary.
 */
router.post('/super-summary', [
  body('meetingIds').isArray({ min: 2 }).withMessage('At least 2 meeting IDs are required'),
  body('title').optional().trim().notEmpty().withMessage('Title must not be empty'),
  body('timeRange').optional().isIn(['day', 'week', 'month', 'custom']).withMessage('Invalid time range'),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!userId || !organizationId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const { meetingIds, title, timeRange } = req.body;

  try {
    // Check cache first
    const cacheKey = `super-summary:${organizationId}:${meetingIds.sort().join(',')}`;
    const cached = await getAsync(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    // Fetch meetings and verify access
    const meetings = await prisma.meeting.findMany({
      where: {
        id: { in: meetingIds },
        organizationId,
      },
      include: {
        summaries: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        transcripts: {
          select: {
            wordCount: true,
            language: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (meetings.length === 0) {
      res.status(404).json({ error: 'No meetings found or access denied' });
      return;
    }

    if (meetings.length < meetingIds.length) {
      res.status(403).json({ error: 'Some meetings not accessible' });
      return;
    }

    // Aggregate all summaries and action items
    const allSummaries = meetings
      .filter(m => m.summaries && m.summaries.length > 0)
      .map(m => m.summaries[0]);

    const allActionItems = allSummaries.flatMap(s => s.actionItems as any[]);
    const allKeyPoints = allSummaries.flatMap(s => s.keyPoints as any[]);
    const allTopics = allSummaries.flatMap(s => (s.customSections as any)?.topics || []);

    // Build comprehensive text for AI analysis
    const meetingSummariesText = meetings.map(m => {
      const summary = m.summaries && m.summaries.length > 0 ? m.summaries[0] : null;
      if (!summary) return '';

      const keyPoints = Array.isArray(summary.keyPoints) ? summary.keyPoints : [];
      const actionItems = Array.isArray(summary.actionItems) ? summary.actionItems : [];
      const topics = (summary.customSections as any)?.topics || [];

      return `
# Meeting: ${m.title}
Date: ${m.scheduledAt || m.scheduledStartAt}
Platform: ${m.platform}

## Summary
${summary.overview || ''}

## Key Points
${keyPoints.map((kp: any) => `- ${typeof kp === 'string' ? kp : kp.text || kp.point || ''}`).join('\n')}

## Action Items
${actionItems.map((ai: any) => `- ${ai.task || ai.description || ''} (Owner: ${ai.owner || 'Unassigned'}, Deadline: ${ai.deadline || ai.dueDate || 'Not specified'})`).join('\n')}

## Topics
${Array.isArray(topics) ? topics.join(', ') : ''}
`;
    }).join('\n\n---\n\n');

    // Call AI service to generate super summary
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/v1/super-summarize`, {
      meetings: meetingSummariesText,
      meetingCount: meetings.length,
      timeRange: timeRange || 'custom',
    }, {
      timeout: 60000, // 60 seconds for complex analysis
    });

    // Extract insights
    const superSummary = {
      title: title || `Super Summary of ${meetings.length} Meetings`,
      timeRange: {
        start: new Date(Math.min(...meetings.map(m => new Date(m.scheduledAt || m.scheduledStartAt || new Date()).getTime()))),
        end: new Date(Math.max(...meetings.map(m => new Date(m.scheduledAt || m.scheduledStartAt || new Date()).getTime()))),
      },
      meetingCount: meetings.length,
      totalDuration: meetings.reduce((sum, m) => sum + (m.durationSeconds || m.duration || 0), 0),
      summary: aiResponse.data.overallSummary,
      keyThemes: aiResponse.data.keyThemes,
      recurringTopics: aiResponse.data.recurringTopics,
      actionItems: {
        total: allActionItems.length,
        completed: allActionItems.filter((ai: any) => ai.status === 'completed').length,
        pending: allActionItems.filter((ai: any) => ai.status === 'pending').length,
        overdue: allActionItems.filter((ai: any) => {
          if (ai.deadline === 'Not specified') return false;
          return new Date(ai.deadline) < new Date();
        }).length,
        byOwner: aiResponse.data.actionItemsByOwner,
      },
      decisions: aiResponse.data.keyDecisions,
      insights: aiResponse.data.insights,
      recommendations: aiResponse.data.recommendations,
      meetings: meetings.map(m => ({
        id: m.id,
        title: m.title,
        scheduledAt: m.scheduledAt || m.scheduledStartAt,
        platform: m.platform,
        durationSeconds: m.durationSeconds || m.duration,
      })),
      generatedAt: new Date(),
    };

    // Cache for 1 hour
    await setexAsync(cacheKey, 3600, JSON.stringify(superSummary));

    res.json(superSummary);
  } catch (error: any) {
    logger.error('Super summary generation error', { error: error.message, stack: error.stack });
    if (error.response?.status === 400) {
      res.status(400).json({ error: 'Invalid meeting data', details: error.response.data });
      return;
    }
    res.status(500).json({ error: 'Failed to generate super summary', details: error.message });
  }
});

/**
 * GET /api/intelligence/insights
 * Get meeting insights and correlation analysis
 *
 * Analyzes patterns, trends, and correlations across meetings
 * for a given time period.
 */
router.get('/insights', [
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!userId || !organizationId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const { startDate, endDate, period = 'month' } = req.query;

  try {
    // Calculate date range
    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Check cache
    const cacheKey = `insights:${organizationId}:${start.toISOString()}:${end.toISOString()}`;
    const cached = await getAsync(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    // Fetch meetings and summaries
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        OR: [
          {
            scheduledAt: {
              gte: start,
              lte: end,
            },
          },
          {
            scheduledStartAt: {
              gte: start,
              lte: end,
            },
          },
        ],
        status: 'completed',
      },
      include: {
        summaries: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        participants: true,
      },
    });

    if (meetings.length === 0) {
      res.json({
        period: { start, end },
        meetingCount: 0,
        insights: {
          message: 'No meetings found in this time period',
        },
      });
      return;
    }

    // Extract topics and action items
    const allTopics = meetings
      .filter(m => m.summaries && m.summaries.length > 0)
      .flatMap(m => {
        const summary = m.summaries[0];
        const topics = (summary.customSections as any)?.topics || [];
        return Array.isArray(topics) ? topics : [];
      });

    const topicFrequency = allTopics.reduce((acc: any, topic: string) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});

    const recurringTopics = Object.entries(topicFrequency)
      .filter(([_, count]) => (count as number) >= 2)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, frequency: count }));

    // Action item analysis
    const allActionItems = meetings
      .filter(m => m.summaries && m.summaries.length > 0)
      .flatMap(m => {
        const actionItems = m.summaries[0].actionItems;
        return Array.isArray(actionItems) ? actionItems : [];
      });

    const actionItemsByOwner = allActionItems.reduce((acc: any, item: any) => {
      const owner = item.owner || 'Unassigned';
      if (!acc[owner]) {
        acc[owner] = { total: 0, completed: 0, pending: 0 };
      }
      acc[owner].total++;
      if (item.status === 'completed') {
        acc[owner].completed++;
      } else {
        acc[owner].pending++;
      }
      return acc;
    }, {});

    // Participant analysis
    const participantStats = meetings
      .flatMap(m => m.participants)
      .reduce((acc: any, participant) => {
        const email = participant.email;
        if (!acc[email]) {
          acc[email] = {
            email,
            name: participant.name,
            meetingCount: 0,
            totalTalkTime: 0,
          };
        }
        acc[email].meetingCount++;
        acc[email].totalTalkTime += participant.talkTimeSeconds || 0;
        return acc;
      }, {});

    const topParticipants = Object.values(participantStats)
      .sort((a: any, b: any) => b.meetingCount - a.meetingCount)
      .slice(0, 10);

    // Meeting frequency analysis
    const meetingsByDay: any = {};
    meetings.forEach(m => {
      const scheduledDate = m.scheduledAt || m.scheduledStartAt;
      if (scheduledDate) {
        const day = new Date(scheduledDate).toISOString().split('T')[0];
        meetingsByDay[day] = (meetingsByDay[day] || 0) + 1;
      }
    });

    const averageMeetingsPerDay = meetings.length / Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

    // Build insights object
    const insights = {
      period: { start, end },
      meetingCount: meetings.length,
      totalDuration: meetings.reduce((sum, m) => sum + (m.durationSeconds || m.duration || 0), 0),
      averageDuration: Math.round(meetings.reduce((sum, m) => sum + (m.durationSeconds || m.duration || 0), 0) / meetings.length),
      averageMeetingsPerDay: Math.round(averageMeetingsPerDay * 10) / 10,
      recurringTopics,
      actionItems: {
        total: allActionItems.length,
        byOwner: actionItemsByOwner,
        completionRate: allActionItems.length > 0
          ? Math.round((allActionItems.filter((ai: any) => ai.status === 'completed').length / allActionItems.length) * 100)
          : 0,
      },
      topParticipants,
      meetingsByPlatform: meetings.reduce((acc: any, m) => {
        acc[m.platform] = (acc[m.platform] || 0) + 1;
        return acc;
      }, {}),
      trends: {
        meetingsOverTime: Object.entries(meetingsByDay)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, count]) => ({ date, count })),
      },
    };

    // Cache for 30 minutes
    await setexAsync(cacheKey, 1800, JSON.stringify(insights));

    res.json(insights);
  } catch (error: any) {
    logger.error('Insights generation error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate insights', details: error.message });
  }
});

/**
 * POST /api/intelligence/correlate
 * Find correlations between meetings
 *
 * Identifies related meetings based on topics, participants, and content similarity.
 */
router.post('/correlate', [
  body('meetingId').isString().notEmpty().withMessage('Meeting ID is required'),
  body('limit').optional().isInt({ min: 1, max: 50 }).toInt().withMessage('Limit must be between 1 and 50'),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!userId || !organizationId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const { meetingId, limit = 10 } = req.body;

  try {
    // Fetch source meeting
    const sourceMeeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        organizationId,
      },
      include: {
        summaries: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        participants: true,
      },
    });

    if (!sourceMeeting) {
      res.status(404).json({ error: 'Meeting not found or access denied' });
      return;
    }

    if (!sourceMeeting.summaries || sourceMeeting.summaries.length === 0) {
      res.status(400).json({ error: 'Meeting does not have a summary yet' });
      return;
    }

    // Extract topics and key points for similarity matching
    const sourceSummary = sourceMeeting.summaries[0];
    const sourceTopics = (sourceSummary.customSections as any)?.topics || [];
    const sourceKeyPoints = Array.isArray(sourceSummary.keyPoints) ? sourceSummary.keyPoints : [];
    const sourceParticipants = sourceMeeting.participants.map(p => p.email).filter(Boolean) as string[];

    // Find related meetings by topic overlap
    const relatedMeetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        id: { not: meetingId },
        status: 'completed',
      },
      include: {
        summaries: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        participants: true,
      },
      take: limit * 3, // Fetch more to filter and rank
    });

    // Calculate similarity scores
    const scoredMeetings = relatedMeetings
      .filter(m => m.summaries && m.summaries.length > 0)
      .map(meeting => {
        const summary = meeting.summaries[0];
        const topics = (summary.customSections as any)?.topics || [];
        const participants = meeting.participants.map(p => p.email).filter(Boolean) as string[];

        // Topic overlap score
        const topicOverlap = sourceTopics.filter((t: string) => topics.includes(t)).length;
        const topicScore = topicOverlap / Math.max(sourceTopics.length, 1);

        // Participant overlap score
        const participantOverlap = sourceParticipants.filter(p => participants.includes(p)).length;
        const participantScore = participantOverlap / Math.max(sourceParticipants.length, 1);

        // Time proximity score (closer in time = higher score)
        const sourceDate = sourceMeeting.scheduledAt || sourceMeeting.scheduledStartAt;
        const meetingDate = meeting.scheduledAt || meeting.scheduledStartAt;
        const timeDiff = sourceDate && meetingDate
          ? Math.abs(new Date(sourceDate).getTime() - new Date(meetingDate).getTime())
          : 90 * 24 * 60 * 60 * 1000;
        const maxTimeDiff = 90 * 24 * 60 * 60 * 1000; // 90 days
        const timeScore = Math.max(0, 1 - (timeDiff / maxTimeDiff));

        // Combined score (weighted)
        const score = (topicScore * 0.5) + (participantScore * 0.3) + (timeScore * 0.2);

        return {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            scheduledAt: meeting.scheduledAt || meeting.scheduledStartAt,
            platform: meeting.platform,
            durationSeconds: meeting.durationSeconds || meeting.duration,
          },
          correlationScore: Math.round(score * 100) / 100,
          reasons: {
            sharedTopics: sourceTopics.filter((t: string) => topics.includes(t)),
            sharedParticipants: sourceParticipants.filter(p => participants.includes(p)),
            timeDifferenceHours: Math.round(timeDiff / (60 * 60 * 1000)),
          },
        };
      })
      .filter(m => m.correlationScore > 0.1) // Only return meetings with meaningful correlation
      .sort((a, b) => b.correlationScore - a.correlationScore)
      .slice(0, limit);

    res.json({
      sourceMeeting: {
        id: sourceMeeting.id,
        title: sourceMeeting.title,
        scheduledAt: sourceMeeting.scheduledAt || sourceMeeting.scheduledStartAt,
      },
      relatedMeetings: scoredMeetings,
      totalFound: scoredMeetings.length,
    });
  } catch (error: any) {
    logger.error('Meeting correlation error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to find related meetings', details: error.message });
  }
});

export default router;
