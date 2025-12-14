/**
 * Transcriptions Routes
 * Transcript retrieval, content management, and search
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { param, query, body, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const elasticsearch = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'transcriptions-routes' },
  transports: [new winston.transports.Console()],
});

router.use(authMiddleware);

/**
 * GET /api/transcriptions/:id
 * Get transcript metadata and content
 */
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      // Check cache first
      const cacheKey = `transcript:${id}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      // Get metadata from PostgreSQL
      const transcript = await prisma.transcript.findFirst({
        where: {
          id,
          meeting: { organizationId },
        },
        include: {
          meeting: {
            select: { id: true, title: true, organizationId: true },
          },
        },
      });

      if (!transcript) {
        res.status(404).json({ error: 'Transcript not found' });
        return;
      }

      // Get content from database if available
      let content = null;
      if (transcript.mongodbId) {
        try {
          const { transcriptService } = await import('../services/TranscriptService');
          const segments = await transcriptService.getTranscriptSegments(transcript.mongodbId);
          content = segments || [];
        } catch (error) {
          logger.warn('Failed to fetch transcript segments:', error);
        }
      }

      const result = {
        ...transcript,
        segments: content,
      };

      // Cache for 10 minutes
      await redis.setex(cacheKey, 600, JSON.stringify(result));

      res.json(result);
    } catch (error) {
      logger.error('Error fetching transcript:', error);
      res.status(500).json({ error: 'Failed to fetch transcript' });
    }
  }
);

/**
 * GET /api/transcriptions/meeting/:meetingId
 * Get all transcripts for a meeting
 */
router.get(
  '/meeting/:meetingId',
  [param('meetingId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { meetingId } = req.params;
      const organizationId = (req as any).user.organizationId;

      const transcripts = await prisma.transcript.findMany({
        where: {
          meetingId,
          meeting: { organizationId },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, title: true },
          },
        },
      });

      res.json({ data: transcripts });
    } catch (error) {
      logger.error('Error fetching meeting transcripts:', error);
      res.status(500).json({ error: 'Failed to fetch transcripts' });
    }
  }
);

/**
 * POST /api/transcriptions
 * Create a new transcript
 */
router.post(
  '/',
  [
    body('meetingId').isUUID(),
    body('recordingId').optional().isUUID(),
    body('language').optional().isString(),
    body('segments').isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { meetingId, recordingId, language, segments } = req.body;

      // Verify meeting belongs to organization
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, organizationId },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Store segments in database
      let mongodbId: string | null = null;
      if (segments && segments.length > 0) {
        try {
          const { transcriptService } = await import('../services/TranscriptService');
          mongodbId = await transcriptService.storeTranscript({
            meetingId,
            organizationId,
            segments,
            language: language || 'en',
          });
        } catch (error) {
          logger.warn('Failed to store transcript segments:', error);
        }
      }

      // Calculate statistics
      const wordCount = segments.reduce((sum: number, seg: any) => sum + (seg.text?.split(/\s+/).length || 0), 0);
      const confidenceScore = segments.length > 0
        ? segments.reduce((sum: number, seg: any) => sum + (seg.confidence || 0), 0) / segments.length
        : null;

      // Create transcript metadata in PostgreSQL
      const transcript = await prisma.transcript.create({
        data: {
          meetingId,
          recordingId,
          mongodbId,
          language: language || 'en',
          wordCount,
          confidenceScore,
          isFinal: true,
        },
        include: {
          meeting: {
            select: { id: true, title: true },
          },
        },
      });

      // Index in Elasticsearch for searching
      try {
        for (const segment of segments) {
          await elasticsearch.index({
            index: 'transcript_segments',
            document: {
              transcriptId: transcript.id,
              meetingId,
              organizationId,
              speaker: segment.speaker,
              text: segment.text,
              startTime: segment.startTime,
              endTime: segment.endTime,
              createdAt: new Date(),
            },
          });
        }
      } catch (error) {
        logger.warn('Failed to index transcript segments in Elasticsearch:', error);
      }

      logger.info('Transcript created:', { transcriptId: transcript.id, meetingId });
      res.status(201).json(transcript);
    } catch (error) {
      logger.error('Error creating transcript:', error);
      res.status(500).json({ error: 'Failed to create transcript' });
    }
  }
);

/**
 * POST /api/transcriptions/:id/search
 * Search within a specific transcript
 */
router.post(
  '/:id/search',
  [
    param('id').isUUID(),
    body('query').notEmpty().trim(),
    body('caseSensitive').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { query, caseSensitive = false } = req.body;
      const organizationId = (req as any).user.organizationId;

      // Verify access
      const transcript = await prisma.transcript.findFirst({
        where: {
          id,
          meeting: { organizationId },
        },
      });

      if (!transcript) {
        res.status(404).json({ error: 'Transcript not found' });
        return;
      }

      // Search in Elasticsearch
      try {
        const searchResult = await elasticsearch.search({
          index: 'transcript_segments',
          body: {
            query: {
              bool: {
                must: [
                  { term: { transcriptId: id } },
                  {
                    match: {
                      text: {
                        query,
                        fuzziness: 'AUTO',
                      },
                    },
                  },
                ],
              },
            },
            highlight: {
              fields: {
                text: {},
              },
            },
            sort: [{ startTime: 'asc' }],
          },
        });

        const results = (searchResult.hits.hits as any[]).map((hit: any) => ({
          ...hit._source,
          highlights: hit.highlight?.text || [],
        }));

        res.json({ data: results, total: results.length });
      } catch (error) {
        logger.warn('Elasticsearch search failed, falling back to database:', error);

        // Fallback to database search
        if (transcript.mongodbId) {
          try {
            const { transcriptService } = await import('../services/TranscriptService');
            const segments = await transcriptService.getTranscriptSegments(transcript.mongodbId);

            if (segments) {
              const regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
              const results = segments.filter((seg: any) => regex.test(seg.text));
              res.json({ data: results, total: results.length });
            } else {
              res.json({ data: [], total: 0 });
            }
          } catch (error) {
            logger.warn('Database fallback search failed:', error);
            res.json({ data: [], total: 0 });
          }
        } else {
          res.json({ data: [], total: 0 });
        }
      }
    } catch (error) {
      logger.error('Error searching transcript:', error);
      res.status(500).json({ error: 'Failed to search transcript' });
    }
  }
);

/**
 * PATCH /api/transcriptions/:id
 * Update transcript metadata
 */
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('isFinal').optional().isBoolean(),
    body('language').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;
      const updateData = req.body;

      const transcript = await prisma.transcript.findFirst({
        where: {
          id,
          meeting: { organizationId },
        },
      });

      if (!transcript) {
        res.status(404).json({ error: 'Transcript not found' });
        return;
      }

      const updated = await prisma.transcript.update({
        where: { id },
        data: updateData,
      });

      // Invalidate cache
      await redis.del(`transcript:${id}`);

      logger.info('Transcript updated:', { transcriptId: id });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating transcript:', error);
      res.status(500).json({ error: 'Failed to update transcript' });
    }
  }
);

/**
 * DELETE /api/transcriptions/:id
 * Delete a transcript
 */
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const transcript = await prisma.transcript.findFirst({
        where: {
          id,
          meeting: { organizationId },
        },
      });

      if (!transcript) {
        res.status(404).json({ error: 'Transcript not found' });
        return;
      }

      // Delete from transcript storage
      if (transcript.mongodbId) {
        try {
          const { transcriptService } = await import('../services/TranscriptService');
          await transcriptService.deleteTranscript(transcript.mongodbId);
        } catch (error) {
          logger.warn('Failed to delete transcript content:', error);
        }
      }

      // Delete from Elasticsearch
      try {
        await elasticsearch.deleteByQuery({
          index: 'transcript_segments',
          body: {
            query: {
              term: { transcriptId: id },
            },
          },
        });
      } catch (error) {
        logger.warn('Failed to delete transcript segments from Elasticsearch:', error);
      }

      // Delete from PostgreSQL
      await prisma.transcript.delete({ where: { id } });

      // Invalidate cache
      await redis.del(`transcript:${id}`);

      logger.info('Transcript deleted:', { transcriptId: id });
      res.json({ message: 'Transcript deleted successfully' });
    } catch (error) {
      logger.error('Error deleting transcript:', error);
      res.status(500).json({ error: 'Failed to delete transcript' });
    }
  }
);

export default router;
