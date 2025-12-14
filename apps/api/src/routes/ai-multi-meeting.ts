/**
 * Multi-Meeting AI Intelligence Routes (GAP #1 - Critical Differentiator)
 * RESTful API endpoints for cross-meeting AI queries and analytics
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authMiddleware, requireOrganization } from '../middleware/auth';
import { createMultiMeetingAIService } from '../services/MultiMeetingAIService';
import { SearchService } from '../services/search';
import { CacheService } from '../services/cache';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(requireOrganization);

// Initialize services
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});
const cacheService = new CacheService(redis);
const esClient = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});
const searchService = new SearchService(esClient);
const multiMeetingAI = createMultiMeetingAIService(searchService, cacheService, esClient);

// ====================================
// POST /api/ai/query - ChatGPT-like query across all meetings
// ====================================
router.post(
  '/query',
  [
    body('question')
      .isString()
      .notEmpty()
      .withMessage('Question is required')
      .isLength({ max: 1000 })
      .withMessage('Question too long'),
    body('filters').optional().isObject(),
    body('filters.dateFrom').optional().isISO8601(),
    body('filters.dateTo').optional().isISO8601(),
    body('filters.participantEmails').optional().isArray(),
    body('filters.tags').optional().isArray(),
    body('limit').optional().isInt({ min: 1, max: 50 }),
    body('conversationHistory').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { question, filters, limit, conversationHistory } = req.body;

      logger.info('Multi-meeting query request', {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        question,
      });

      // Parse date filters
      const meetingFilters = filters ? {
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        participantEmails: filters.participantEmails,
        tags: filters.tags,
        status: filters.status,
      } : undefined;

      const result = await multiMeetingAI.queryAcrossMeetings({
        userId: req.user!.id,
        organizationId: req.user!.organizationId!,
        question,
        meetingFilters,
        limit,
        conversationHistory,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error in multi-meeting query', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to process query',
        message: error.message,
      });
    }
  }
);

// ====================================
// POST /api/ai/super-summary - Generate multi-meeting summary
// ====================================
router.post(
  '/super-summary',
  [
    body('filters').optional().isObject(),
    body('filters.dateFrom').optional().isISO8601(),
    body('filters.dateTo').optional().isISO8601(),
    body('filters.participantEmails').optional().isArray(),
    body('filters.tags').optional().isArray(),
    body('summaryType')
      .optional()
      .isIn(['executive', 'detailed', 'action-focused', 'decision-focused'])
      .withMessage('Invalid summary type'),
    body('includeTopics').optional().isBoolean(),
    body('includeTrends').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { filters, summaryType, includeTopics, includeTrends } = req.body;

      logger.info('Super summary request', {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        summaryType,
      });

      // Parse filters
      const meetingFilters = filters ? {
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        participantEmails: filters.participantEmails,
        tags: filters.tags,
      } : undefined;

      const result = await multiMeetingAI.generateSuperSummary({
        userId: req.user!.id,
        organizationId: req.user!.organizationId!,
        meetingFilters,
        summaryType,
        includeTopics,
        includeTrends,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error generating super summary', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate super summary',
        message: error.message,
      });
    }
  }
);

// ====================================
// GET /api/ai/topics/track - Track topic trends over time
// ====================================
router.get(
  '/topics/track',
  [
    query('topics').optional().isString(),
    query('dateFrom')
      .notEmpty()
      .withMessage('dateFrom is required')
      .isISO8601()
      .withMessage('Invalid date format'),
    query('dateTo')
      .notEmpty()
      .withMessage('dateTo is required')
      .isISO8601()
      .withMessage('Invalid date format'),
    query('granularity')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('Invalid granularity'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { topics, dateFrom, dateTo, granularity } = req.query;

      logger.info('Topic tracking request', {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        dateRange: { dateFrom, dateTo },
      });

      // Parse topics (comma-separated)
      const topicsList = topics ? String(topics).split(',').map(t => t.trim()) : undefined;

      const result = await multiMeetingAI.trackTopics({
        organizationId: req.user!.organizationId!,
        topics: topicsList,
        dateFrom: new Date(String(dateFrom)),
        dateTo: new Date(String(dateTo)),
        granularity: (granularity as 'day' | 'week' | 'month') || 'week',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error tracking topics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to track topics',
        message: error.message,
      });
    }
  }
);

// ====================================
// GET /api/ai/patterns - Detect patterns across meetings
// ====================================
router.get(
  '/patterns',
  [
    query('analysisType')
      .notEmpty()
      .withMessage('analysisType is required')
      .isIn(['recurring_issues', 'decision_patterns', 'team_dynamics', 'productivity', 'all'])
      .withMessage('Invalid analysis type'),
    query('dateFrom')
      .notEmpty()
      .withMessage('dateFrom is required')
      .isISO8601()
      .withMessage('Invalid date format'),
    query('dateTo')
      .notEmpty()
      .withMessage('dateTo is required')
      .isISO8601()
      .withMessage('Invalid date format'),
    query('minOccurrences').optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { analysisType, dateFrom, dateTo, minOccurrences } = req.query;

      logger.info('Pattern detection request', {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        analysisType,
      });

      const result = await multiMeetingAI.detectPatterns({
        organizationId: req.user!.organizationId!,
        analysisType: analysisType as any,
        dateFrom: new Date(String(dateFrom)),
        dateTo: new Date(String(dateTo)),
        minOccurrences: minOccurrences ? parseInt(String(minOccurrences)) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error detecting patterns', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to detect patterns',
        message: error.message,
      });
    }
  }
);

// ====================================
// POST /api/ai/aggregate-insights - Get aggregate insights from meetings
// ====================================
router.post(
  '/aggregate-insights',
  [
    body('meetingIds')
      .isArray({ min: 1 })
      .withMessage('At least one meeting ID is required'),
    body('meetingIds.*').isString().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { meetingIds } = req.body;

      logger.info('Aggregate insights request', {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        meetingCount: meetingIds.length,
      });

      const result = await multiMeetingAI.generateAggregateInsights(
        req.user!.organizationId!,
        meetingIds
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error generating aggregate insights', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate aggregate insights',
        message: error.message,
      });
    }
  }
);

// ====================================
// GET /api/ai/conversation-history - Get conversation history for user
// ====================================
router.get(
  '/conversation-history',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;

      logger.info('Conversation history request', {
        userId: req.user!.id,
      });

      // Get from cache
      const history = await cacheService.get<any[]>(
        'conversation_history',
        req.user!.id
      ) || [];

      res.json({
        success: true,
        data: {
          history: history.slice(0, limit ? parseInt(String(limit)) : 50),
        },
      });
    } catch (error: any) {
      logger.error('Error fetching conversation history', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation history',
        message: error.message,
      });
    }
  }
);

// ====================================
// POST /api/ai/conversation-history - Save conversation to history
// ====================================
router.post(
  '/conversation-history',
  [
    body('question').isString().notEmpty(),
    body('answer').isString().notEmpty(),
    body('metadata').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const { question, answer, metadata } = req.body;

      logger.info('Saving conversation to history', {
        userId: req.user!.id,
      });

      // Get existing history
      const history = await cacheService.get<any[]>(
        'conversation_history',
        req.user!.id
      ) || [];

      // Add new conversation
      history.unshift({
        question,
        answer,
        timestamp: new Date(),
        metadata,
      });

      // Keep only last 100 conversations
      const trimmedHistory = history.slice(0, 100);

      // Save to cache
      await cacheService.set(
        'conversation_history',
        req.user!.id,
        trimmedHistory,
        86400 // 24 hours
      );

      res.json({
        success: true,
        data: {
          message: 'Conversation saved to history',
        },
      });
    } catch (error: any) {
      logger.error('Error saving conversation history', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to save conversation history',
        message: error.message,
      });
    }
  }
);

// ====================================
// GET /api/ai/search-suggestions - Get search suggestions based on history
// ====================================
router.get(
  '/search-suggestions',
  async (req: Request, res: Response) => {
    try {
      logger.info('Search suggestions request', {
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
      });

      // Get popular queries from cache or generate suggestions
      const suggestions = [
        "What were the key decisions made in the last month?",
        "Show me all action items assigned to me",
        "What topics are trending in our meetings?",
        "Summarize all product discussions from this quarter",
        "What blockers were mentioned across meetings?",
        "Compare our team's sentiment over the last 3 months",
        "What meetings discussed [specific client/product]?",
        "Show me patterns in our weekly standups",
      ];

      res.json({
        success: true,
        data: {
          suggestions,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching search suggestions', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch search suggestions',
        message: error.message,
      });
    }
  }
);

// ====================================
// GET /api/ai/health - Health check for AI services
// ====================================
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      services: {
        openai: false,
        elasticsearch: false,
        cache: false,
      },
      timestamp: new Date(),
    };

    // Check Elasticsearch
    try {
      const esHealth = await esClient.cluster.health();
      health.services.elasticsearch = (esHealth as any).status !== 'red';
    } catch (error) {
      logger.warn('Elasticsearch health check failed', { error });
    }

    // Check cache
    try {
      await cacheService.set('health_check', 'test', { value: 'ok' }, 60);
      const result = await cacheService.get('health_check', 'test');
      health.services.cache = result !== null;
    } catch (error) {
      logger.warn('Cache health check failed', { error });
    }

    // Check OpenAI (simple check if API key exists)
    health.services.openai = !!process.env.OPENAI_API_KEY;

    // Overall status
    health.status = Object.values(health.services).every(s => s) ? 'healthy' : 'degraded';

    res.json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    logger.error('Error in health check', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
    });
  }
});

export default router;
