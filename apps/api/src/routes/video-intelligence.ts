/**
 * Video Intelligence Routes
 *
 * Endpoints for GAP #3: Video Intelligence & Replay
 * - Smart video clips
 * - Key moment detection
 * - Emotional tone analysis
 * - Shareable clips
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { videoIntelligenceService } from '../services/VideoIntelligenceService';
import { logger } from '../utils/logger';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/video-intelligence/clips/generate
 * Generate smart clips for a meeting
 */
router.post(
  '/clips/generate',
  [
    body('transcriptId').isString().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transcriptId } = req.body;
      const userId = (req as any).user.userId;

      const clips = await videoIntelligenceService.generateSmartClips(transcriptId, userId);

      res.json({
        success: true,
        clips,
        count: clips.length,
      });
    } catch (error: any) {
      logger.error('Error generating clips', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate clips',
      });
    }
  }
);

/**
 * GET /api/video-intelligence/moments/:transcriptId
 * Detect key moments in a meeting
 */
router.get(
  '/moments/:transcriptId',
  [
    param('transcriptId').isString().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transcriptId } = req.params;

      const moments = await videoIntelligenceService.detectKeyMoments(transcriptId);

      res.json({
        success: true,
        moments,
        count: moments.length,
      });
    } catch (error: any) {
      logger.error('Error detecting key moments', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to detect key moments',
      });
    }
  }
);

/**
 * GET /api/video-intelligence/emotional-tone/:transcriptId
 * Analyze emotional tone throughout meeting
 */
router.get(
  '/emotional-tone/:transcriptId',
  [
    param('transcriptId').isString().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transcriptId } = req.params;

      const tones = await videoIntelligenceService.analyzeEmotionalTone(transcriptId);

      res.json({
        success: true,
        tones,
        count: tones.length,
      });
    } catch (error: any) {
      logger.error('Error analyzing emotional tone', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze emotional tone',
      });
    }
  }
);

/**
 * POST /api/video-intelligence/clips/:clipId/share
 * Create shareable link for a clip
 */
router.post(
  '/clips/:clipId/share',
  [
    param('clipId').isString().notEmpty(),
    body('includeTranscript').optional().isBoolean(),
    body('includeNotes').optional().isBoolean(),
    body('expiresIn').optional().isInt({ min: 60, max: 2592000 }), // 1 min to 30 days
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { clipId } = req.params;
      const { includeTranscript, includeNotes, expiresIn } = req.body;
      const userId = (req as any).user.userId;

      const shareData = await videoIntelligenceService.createShareableClip(clipId, userId, {
        includeTranscript,
        includeNotes,
        expiresIn,
      });

      res.json({
        success: true,
        ...shareData,
      });
    } catch (error: any) {
      logger.error('Error creating shareable clip', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create shareable clip',
      });
    }
  }
);

/**
 * GET /api/video-intelligence/topics/:transcriptId
 * Get topic-based navigation timestamps
 */
router.get(
  '/topics/:transcriptId',
  [
    param('transcriptId').isString().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transcriptId } = req.params;

      const topics = await videoIntelligenceService.getTopicTimestamps(transcriptId);

      res.json({
        success: true,
        topics,
        count: topics.length,
      });
    } catch (error: any) {
      logger.error('Error getting topic timestamps', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get topic timestamps',
      });
    }
  }
);

/**
 * GET /api/video-intelligence/analytics/:transcriptId
 * Get video analytics for a meeting
 */
router.get(
  '/analytics/:transcriptId',
  [
    param('transcriptId').isString().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transcriptId } = req.params;

      const analytics = await videoIntelligenceService.getVideoAnalytics(transcriptId);

      res.json({
        success: true,
        analytics,
      });
    } catch (error: any) {
      logger.error('Error getting video analytics', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get video analytics',
      });
    }
  }
);

export default router;
