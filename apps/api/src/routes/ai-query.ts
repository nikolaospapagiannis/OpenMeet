/**
 * AI Query Routes
 * Endpoints for Multi-Meeting AI Intelligence (GAP #1)
 * REAL IMPLEMENTATION - Wired to AIQueryService with OpenAI
 */

import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { aiQueryService } from '../services/AIQueryService';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

router.use(authMiddleware);

/**
 * POST /api/ai/ask
 * Ask a question across all meetings using RAG
 */
router.post(
  '/ask',
  [body('question').isString().notEmpty().isLength({ min: 3, max: 1000 })],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { question, conversationId } = req.body;

      logger.info('AI query request', { userId, question: question.substring(0, 50) });

      // Get or create conversation for chat history
      let conversation = conversationId
        ? await getConversation(conversationId, userId)
        : await createConversation(userId);

      // Call the AI Query Service
      const result = await aiQueryService.askQuestion(userId, question);

      // Save to conversation history
      await saveToConversation(conversation.id, question, result.answer);

      res.json({
        success: true,
        conversationId: conversation.id,
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources,
        suggestedFollowUps: result.suggestedFollowUps,
        tokensUsed: result.tokensUsed,
      });
    } catch (error: any) {
      logger.error('Error in AI query', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai/super-summary
 * Generate aggregated summary from multiple meetings
 */
router.post(
  '/super-summary',
  [
    body('summaryType').optional().isIn(['executive', 'detailed', 'action-focused', 'decision-focused']),
    body('dateFrom').optional().isISO8601(),
    body('dateTo').optional().isISO8601(),
    body('meetingIds').optional().isArray(),
    body('keywords').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { summaryType, dateFrom, dateTo, meetingIds, keywords, participantEmails } = req.body;

      logger.info('Super summary request', { userId, summaryType });

      const result = await aiQueryService.generateSuperSummary(userId, {
        summaryType,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        meetingIds,
        keywords,
        participantEmails,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error('Error generating super summary', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai/search
 * Search across all meetings
 */
router.get(
  '/search',
  [
    query('q').isString().notEmpty(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { q, dateFrom, dateTo, limit } = req.query;

      const results = await aiQueryService.searchAcrossMeetings(userId, q as string, {
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json({ success: true, results, count: results.length });
    } catch (error: any) {
      logger.error('Error searching meetings', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai/insights
 * Generate AI-powered insights from meetings
 */
router.get(
  '/insights',
  [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('type').optional().isIn(['themes', 'patterns', 'sentiment', 'all']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { dateFrom, dateTo, type } = req.query;

      const insights = await aiQueryService.generateInsights(userId, {
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        analysisType: (type as any) || 'all',
      });

      res.json({ success: true, ...insights });
    } catch (error: any) {
      logger.error('Error generating insights', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai/conversations
 * Get user's AI conversation history
 */
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const conversationsKey = `ai:conversations:${userId}`;

    const conversationIds = await redis.lrange(conversationsKey, 0, 19);
    const conversations = await Promise.all(
      conversationIds.map(async (id) => {
        const data = await redis.hgetall(`ai:conversation:${id}`);
        const messages = await redis.lrange(`ai:conversation:${id}:messages`, 0, -1);
        return {
          id,
          title: data.title || 'New Conversation',
          createdAt: data.createdAt,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1] ? JSON.parse(messages[messages.length - 1]) : null,
        };
      })
    );

    res.json({ success: true, conversations });
  } catch (error: any) {
    logger.error('Error fetching conversations', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/conversations/:id
 * Get specific conversation with full history
 */
router.get('/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const conversation = await getConversation(id, userId);
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const messages = await redis.lrange(`ai:conversation:${id}:messages`, 0, -1);

    res.json({
      success: true,
      conversation: {
        ...conversation,
        messages: messages.map(m => JSON.parse(m)),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching conversation', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/ai/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const conversationsKey = `ai:conversations:${userId}`;
    await redis.lrem(conversationsKey, 0, id);
    await redis.del(`ai:conversation:${id}`);
    await redis.del(`ai:conversation:${id}:messages`);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting conversation', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions for conversation management
async function createConversation(userId: string): Promise<{ id: string; title: string }> {
  const id = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const conversationsKey = `ai:conversations:${userId}`;

  await redis.hset(`ai:conversation:${id}`, {
    userId,
    title: 'New Conversation',
    createdAt: new Date().toISOString(),
  });

  await redis.lpush(conversationsKey, id);
  await redis.ltrim(conversationsKey, 0, 99);

  return { id, title: 'New Conversation' };
}

async function getConversation(conversationId: string, userId: string): Promise<{ id: string; title: string } | null> {
  const data = await redis.hgetall(`ai:conversation:${conversationId}`);
  if (!data || data.userId !== userId) return null;
  return { id: conversationId, title: data.title || 'New Conversation' };
}

async function saveToConversation(conversationId: string, question: string, answer: string): Promise<void> {
  const messagesKey = `ai:conversation:${conversationId}:messages`;

  await redis.rpush(messagesKey, JSON.stringify({
    role: 'user',
    content: question,
    timestamp: new Date().toISOString(),
  }));

  await redis.rpush(messagesKey, JSON.stringify({
    role: 'assistant',
    content: answer,
    timestamp: new Date().toISOString(),
  }));

  const messageCount = await redis.llen(messagesKey);
  if (messageCount === 2) {
    const title = question.length > 50 ? question.substring(0, 50) + '...' : question;
    await redis.hset(`ai:conversation:${conversationId}`, 'title', title);
  }
}

export default router;
