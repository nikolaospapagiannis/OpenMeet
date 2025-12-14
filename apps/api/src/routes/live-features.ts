/**
 * Live Features Routes (GAP #5)
 * Real-time features during active meetings
 *
 * REST API endpoints for:
 * - Live captions/subtitles with multi-language support
 * - AI suggestions during calls
 * - Live highlights/bookmarks
 * - Sentiment analysis
 * - Keyword tracking and alerts
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { liveCaptionsService } from '../services/LiveCaptionsService';
import { liveAISuggestionsService } from '../services/LiveAISuggestionsService';
import { liveHighlightService } from '../services/LiveHighlightService';
import { liveSentimentService } from '../services/LiveSentimentService';
import { keywordAlertService } from '../services/KeywordAlertService';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'live-features-routes' },
  transports: [new winston.transports.Console()],
});

// Rate limiting for live endpoints
const liveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: 'Too many live feature requests, please try again later',
});

// ========================================
// LIVE CAPTIONS ROUTES
// ========================================

/**
 * GET /api/live/:sessionId/captions
 * Get live caption stream/history
 */
router.get(
  '/:sessionId/captions',
  [
    param('sessionId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const user = (req as any).user;

      // Verify session access
      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const captions = await liveCaptionsService.getCaptionHistory(
        liveSession.meetingId,
        limit
      );

      const sessionInfo = liveCaptionsService.getSessionInfo(liveSession.meetingId);

      res.json({
        success: true,
        captions,
        sessionInfo,
        count: captions.length,
      });
    } catch (error) {
      logger.error('Error getting live captions:', error);
      res.status(500).json({ error: 'Failed to get live captions' });
    }
  }
);

/**
 * POST /api/live/:sessionId/captions/style
 * Update caption styling
 */
router.post(
  '/:sessionId/captions/style',
  liveLimiter,
  [
    param('sessionId').isUUID(),
    body('fontSize').optional().isInt({ min: 8, max: 48 }),
    body('color').optional().isString(),
    body('backgroundColor').optional().isString(),
    body('position').optional().isIn(['top', 'bottom', 'custom']),
    body('opacity').optional().isFloat({ min: 0, max: 1 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      await liveCaptionsService.updateCaptionStyle(liveSession.meetingId, req.body);

      res.json({
        success: true,
        message: 'Caption style updated',
      });
    } catch (error) {
      logger.error('Error updating caption style:', error);
      res.status(500).json({ error: 'Failed to update caption style' });
    }
  }
);

/**
 * POST /api/live/:sessionId/captions/languages
 * Add target language for real-time translation
 */
router.post(
  '/:sessionId/captions/languages',
  liveLimiter,
  [param('sessionId').isUUID(), body('language').isString().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const { language } = req.body;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      await liveCaptionsService.addTargetLanguage(liveSession.meetingId, language);

      res.json({
        success: true,
        message: 'Target language added',
        language,
      });
    } catch (error) {
      logger.error('Error adding target language:', error);
      res.status(500).json({ error: 'Failed to add target language' });
    }
  }
);

/**
 * GET /api/live/:sessionId/captions/languages/available
 * Get available caption languages
 */
router.get('/:sessionId/captions/languages/available', async (req: Request, res: Response) => {
  try {
    const languages = liveCaptionsService.getAvailableLanguages();

    res.json({
      success: true,
      languages,
    });
  } catch (error) {
    logger.error('Error getting available languages:', error);
    res.status(500).json({ error: 'Failed to get available languages' });
  }
});

// ========================================
// LIVE HIGHLIGHTS ROUTES
// ========================================

/**
 * POST /api/live/:sessionId/highlight
 * Create a live highlight/bookmark
 */
router.post(
  '/:sessionId/highlight',
  liveLimiter,
  [
    param('sessionId').isUUID(),
    body('title').isString().notEmpty(),
    body('description').optional().isString(),
    body('type').optional().isIn(['manual', 'action_item', 'decision', 'question', 'key_moment']),
    body('timestampSeconds').isFloat({ min: 0 }),
    body('tags').optional().isArray(),
    body('transcriptSnippet').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const highlight = await liveHighlightService.createHighlight(sessionId, {
        userId: user.id,
        type: req.body.type || 'manual',
        title: req.body.title,
        description: req.body.description,
        timestampSeconds: req.body.timestampSeconds,
        tags: req.body.tags,
        transcriptSnippet: req.body.transcriptSnippet,
      });

      res.status(201).json({
        success: true,
        highlight,
      });
    } catch (error) {
      logger.error('Error creating highlight:', error);
      res.status(500).json({ error: 'Failed to create highlight' });
    }
  }
);

/**
 * GET /api/live/:sessionId/highlights
 * Get all highlights for session
 */
router.get(
  '/:sessionId/highlights',
  [
    param('sessionId').isUUID(),
    query('type').optional().isString(),
    query('autoDetected').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const highlights = await liveHighlightService.getHighlights(sessionId, {
        type: req.query.type as string,
        autoDetected: req.query.autoDetected === 'true' ? true : req.query.autoDetected === 'false' ? false : undefined,
      });

      const statistics = await liveHighlightService.getStatistics(sessionId);

      res.json({
        success: true,
        highlights,
        statistics,
      });
    } catch (error) {
      logger.error('Error getting highlights:', error);
      res.status(500).json({ error: 'Failed to get highlights' });
    }
  }
);

/**
 * DELETE /api/live/:sessionId/highlights/:highlightId
 * Delete a highlight
 */
router.delete(
  '/:sessionId/highlights/:highlightId',
  [param('sessionId').isUUID(), param('highlightId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId, highlightId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      await liveHighlightService.deleteHighlight(sessionId, highlightId);

      res.json({
        success: true,
        message: 'Highlight deleted',
      });
    } catch (error) {
      logger.error('Error deleting highlight:', error);
      res.status(500).json({ error: 'Failed to delete highlight' });
    }
  }
);

// ========================================
// LIVE SENTIMENT ROUTES
// ========================================

/**
 * GET /api/live/:sessionId/sentiment
 * Get live sentiment analysis
 */
router.get(
  '/:sessionId/sentiment',
  [param('sessionId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const overview = await liveSentimentService.getSentimentOverview(sessionId);

      res.json({
        success: true,
        sentiment: overview,
      });
    } catch (error) {
      logger.error('Error getting sentiment:', error);
      res.status(500).json({ error: 'Failed to get sentiment' });
    }
  }
);

/**
 * GET /api/live/:sessionId/sentiment/history
 * Get sentiment history
 */
router.get(
  '/:sessionId/sentiment/history',
  [
    param('sessionId').isUUID(),
    query('speaker').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const history = await liveSentimentService.getSentimentHistory(sessionId, {
        speaker: req.query.speaker as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });

      res.json({
        success: true,
        history,
        count: history.length,
      });
    } catch (error) {
      logger.error('Error getting sentiment history:', error);
      res.status(500).json({ error: 'Failed to get sentiment history' });
    }
  }
);

/**
 * POST /api/live/:sessionId/sentiment/alerts/:alertId/acknowledge
 * Acknowledge a sentiment alert
 */
router.post(
  '/:sessionId/sentiment/alerts/:alertId/acknowledge',
  [param('sessionId').isUUID(), param('alertId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId, alertId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      await liveSentimentService.acknowledgeAlert(sessionId, alertId);

      res.json({
        success: true,
        message: 'Alert acknowledged',
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }
);

// ========================================
// LIVE AI SUGGESTIONS ROUTES
// ========================================

/**
 * GET /api/live/:sessionId/suggestions
 * Get AI suggestions for current conversation
 */
router.get(
  '/:sessionId/suggestions',
  [
    param('sessionId').isUUID(),
    query('type').optional().isString(),
    query('minConfidence').optional().isFloat({ min: 0, max: 1 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const suggestions = await liveAISuggestionsService.getSuggestions(sessionId, {
        type: req.query.type as string,
        minConfidence: req.query.minConfidence
          ? parseFloat(req.query.minConfidence as string)
          : undefined,
      });

      const nextBestAction = await liveAISuggestionsService.getNextBestAction(sessionId);
      const conversationFlow = await liveAISuggestionsService.getConversationFlow(sessionId);

      res.json({
        success: true,
        suggestions,
        nextBestAction,
        conversationFlow,
        count: suggestions.length,
      });
    } catch (error) {
      logger.error('Error getting AI suggestions:', error);
      res.status(500).json({ error: 'Failed to get AI suggestions' });
    }
  }
);

/**
 * POST /api/live/:sessionId/suggestions/:suggestionId/dismiss
 * Dismiss a suggestion
 */
router.post(
  '/:sessionId/suggestions/:suggestionId/dismiss',
  [param('sessionId').isUUID(), param('suggestionId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId, suggestionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      await liveAISuggestionsService.dismissSuggestion(sessionId, suggestionId);

      res.json({
        success: true,
        message: 'Suggestion dismissed',
      });
    } catch (error) {
      logger.error('Error dismissing suggestion:', error);
      res.status(500).json({ error: 'Failed to dismiss suggestion' });
    }
  }
);

// ========================================
// KEYWORD TRACKING ROUTES
// ========================================

/**
 * POST /api/live/:sessionId/keywords/track
 * Add keyword to track
 */
router.post(
  '/:sessionId/keywords/track',
  liveLimiter,
  [
    param('sessionId').isUUID(),
    body('term').isString().notEmpty(),
    body('category').isString().notEmpty(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('caseSensitive').optional().isBoolean(),
    body('matchWholeWord').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const keyword = await keywordAlertService.addKeyword(sessionId, {
        term: req.body.term,
        category: req.body.category,
        priority: req.body.priority || 'medium',
        caseSensitive: req.body.caseSensitive ?? false,
        matchWholeWord: req.body.matchWholeWord ?? true,
        notificationEnabled: true,
      });

      res.status(201).json({
        success: true,
        keyword,
      });
    } catch (error) {
      logger.error('Error adding keyword:', error);
      res.status(500).json({ error: 'Failed to add keyword' });
    }
  }
);

/**
 * GET /api/live/:sessionId/keywords/matches
 * Get keyword matches
 */
router.get(
  '/:sessionId/keywords/matches',
  [
    param('sessionId').isUUID(),
    query('category').optional().isString(),
    query('keyword').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const matches = await keywordAlertService.getMatches(sessionId, {
        category: req.query.category as string,
        keyword: req.query.keyword as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });

      const statistics = await keywordAlertService.getStatistics(sessionId);

      res.json({
        success: true,
        matches,
        statistics,
      });
    } catch (error) {
      logger.error('Error getting keyword matches:', error);
      res.status(500).json({ error: 'Failed to get keyword matches' });
    }
  }
);

/**
 * GET /api/live/:sessionId/keywords/alerts
 * Get keyword alerts
 */
router.get(
  '/:sessionId/keywords/alerts',
  [
    param('sessionId').isUUID(),
    query('acknowledged').optional().isBoolean(),
    query('severity').optional().isIn(['info', 'warning', 'critical']),
  ],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      const alerts = await keywordAlertService.getAlerts(sessionId, {
        acknowledged: req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined,
        severity: req.query.severity as 'info' | 'warning' | 'critical',
      });

      res.json({
        success: true,
        alerts,
        count: alerts.length,
      });
    } catch (error) {
      logger.error('Error getting keyword alerts:', error);
      res.status(500).json({ error: 'Failed to get keyword alerts' });
    }
  }
);

/**
 * POST /api/live/:sessionId/keywords/categories/:categoryName/toggle
 * Toggle keyword category
 */
router.post(
  '/:sessionId/keywords/categories/:categoryName/toggle',
  [
    param('sessionId').isUUID(),
    param('categoryName').isString(),
    body('enabled').isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId, categoryName } = req.params;
      const { enabled } = req.body;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      await keywordAlertService.toggleCategory(sessionId, categoryName, enabled);

      res.json({
        success: true,
        message: `Category ${enabled ? 'enabled' : 'disabled'}`,
        categoryName,
        enabled,
      });
    } catch (error) {
      logger.error('Error toggling keyword category:', error);
      res.status(500).json({ error: 'Failed to toggle keyword category' });
    }
  }
);

/**
 * POST /api/live/:sessionId/keywords/alerts/:alertId/acknowledge
 * Acknowledge a keyword alert
 */
router.post(
  '/:sessionId/keywords/alerts/:alertId/acknowledge',
  [param('sessionId').isUUID(), param('alertId').isString()],
  async (req: Request, res: Response) => {
    try {
      const { sessionId, alertId } = req.params;
      const user = (req as any).user;

      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: sessionId,
          meeting: {
            organizationId: user.organizationId,
          },
        },
      });

      if (!liveSession) {
        return res.status(404).json({ error: 'Live session not found' });
      }

      await keywordAlertService.acknowledgeAlert(sessionId, alertId);

      res.json({
        success: true,
        message: 'Alert acknowledged',
      });
    } catch (error) {
      logger.error('Error acknowledging keyword alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge keyword alert' });
    }
  }
);

export default router;
