/**
 * Enhanced Video Clips API Routes
 *
 * Comprehensive endpoints for:
 * - Clip CRUD operations with advanced metadata
 * - Sharing to Slack, Teams, and email
 * - Clip library management with filtering and search
 * - Download and export functionality
 * - Real-time processing status updates
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { videoProcessingQueue } from '../queues/videoProcessing';
import { notificationService } from '../services/NotificationService';
import { storageService } from '../services/StorageService';
import { videoIntelligenceService } from '../services/VideoIntelligenceService';
import { logger } from '../utils/logger';
import { generateShareToken, verifyShareToken } from '../utils/tokens';
import crypto from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();

// Middleware for all routes except public share links
router.use('/share/:token', (req, res, next) => next());
router.use(authMiddleware);

/**
 * GET /api/clips
 * Get user's clips with filtering and pagination
 */
router.get(
  '/',
  [
    query('userId').optional().isUUID(),
    query('meetingId').optional().isUUID(),
    query('search').optional().isString().trim(),
    query('tags').optional().isString(),
    query('isFavorite').optional().isBoolean(),
    query('sortBy').optional().isIn(['recent', 'duration', 'views', 'shares']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = req.query.userId || (req as any).user.userId;
      const {
        meetingId,
        search,
        tags,
        isFavorite,
        sortBy = 'recent',
        page = 1,
        limit = 20
      } = req.query;

      // Build filter conditions
      const where: any = {
        userId,
        deletedAt: null
      };

      if (meetingId) {
        where.meetingId = meetingId;
      }

      if (isFavorite !== undefined) {
        where.isFavorite = isFavorite === 'true';
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (tags) {
        const tagArray = (tags as string).split(',').map(t => t.trim());
        where.tags = {
          hasSome: tagArray
        };
      }

      // Build sort order
      let orderBy: any = {};
      switch (sortBy) {
        case 'duration':
          orderBy = { duration: 'desc' };
          break;
        case 'views':
          orderBy = { views: 'desc' };
          break;
        case 'shares':
          orderBy = { shares: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
      }

      // Execute query with pagination
      const [clips, total] = await Promise.all([
        prisma.videoClip.findMany({
          where,
          orderBy,
          skip: ((page as number) - 1) * (limit as number),
          take: limit as number,
          include: {
            meeting: {
              select: {
                title: true,
                recordedAt: true
              }
            }
          }
        }),
        prisma.videoClip.count({ where })
      ]);

      // Format response
      const formattedClips = clips.map(clip => ({
        id: clip.id,
        title: clip.title,
        description: clip.description,
        meetingId: clip.meetingId,
        meetingTitle: clip.meeting.title,
        videoUrl: clip.videoUrl,
        thumbnailUrl: clip.thumbnailUrl,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        createdAt: clip.createdAt,
        updatedAt: clip.updatedAt,
        isFavorite: clip.isFavorite || false,
        tags: clip.tags || [],
        views: clip.views || 0,
        shares: clip.shares || 0
      }));

      res.json({
        success: true,
        clips: formattedClips,
        pagination: {
          total,
          page: page as number,
          limit: limit as number,
          totalPages: Math.ceil(total / (limit as number))
        }
      });

    } catch (error) {
      logger.error('Error fetching clips:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch clips'
      });
    }
  }
);

/**
 * POST /api/clips
 * Create a new video clip
 */
router.post(
  '/',
  [
    body('meetingId').isUUID().withMessage('Valid meeting ID required'),
    body('startTime').isFloat({ min: 0 }).withMessage('Start time must be positive'),
    body('endTime').isFloat({ min: 0 }).withMessage('End time must be positive'),
    body('title').isString().trim().notEmpty().withMessage('Title is required'),
    body('description').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('isPublic').optional().isBoolean(),
    body('includeTranscript').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = (req as any).user.userId;
      const {
        meetingId,
        startTime,
        endTime,
        title,
        description,
        tags = [],
        isPublic = false,
        includeTranscript = true
      } = req.body;

      // Validate time range
      if (endTime <= startTime) {
        return res.status(400).json({
          success: false,
          error: 'End time must be after start time'
        });
      }

      const duration = endTime - startTime;
      if (duration < 1) {
        return res.status(400).json({
          success: false,
          error: 'Clip must be at least 1 second long'
        });
      }

      if (duration > 300) {
        return res.status(400).json({
          success: false,
          error: 'Clip cannot be longer than 5 minutes'
        });
      }

      // Verify meeting exists and user has access
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId: (req as any).user.organizationId
        }
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found'
        });
      }

      // Create clip record
      const clip = await prisma.videoClip.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          meetingId,
          title,
          description,
          startTime,
          endTime,
          tags,
          isPublic,
          status: 'processing',
          videoUrl: '', // Will be updated after processing
          thumbnailUrl: '' // Will be updated after processing
        }
      });

      // Queue video processing job
      await videoProcessingQueue.add('process-clip', {
        clipId: clip.id,
        meetingId,
        startTime,
        endTime,
        includeTranscript,
        userId
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      logger.info('Clip created and queued for processing', { clipId: clip.id });

      res.status(201).json({
        success: true,
        id: clip.id,
        status: 'processing',
        message: 'Clip is being processed'
      });

    } catch (error) {
      logger.error('Error creating clip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create clip'
      });
    }
  }
);

/**
 * GET /api/clips/:id
 * Get clip details
 */
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const clip = await prisma.videoClip.findFirst({
        where: {
          id,
          userId,
          deletedAt: null
        },
        include: {
          meeting: {
            select: {
              title: true,
              recordedAt: true
            }
          }
        }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      // Increment view count
      await prisma.videoClip.update({
        where: { id },
        data: { views: (clip.views || 0) + 1 }
      });

      res.json({
        success: true,
        clip: {
          ...clip,
          duration: clip.endTime - clip.startTime
        }
      });

    } catch (error) {
      logger.error('Error fetching clip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch clip'
      });
    }
  }
);

/**
 * PATCH /api/clips/:id
 * Update clip metadata
 */
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().isString().trim().notEmpty(),
    body('description').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('isPublic').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = (req as any).user.userId;
      const updates = req.body;

      // Verify ownership
      const clip = await prisma.videoClip.findFirst({
        where: { id, userId, deletedAt: null }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      // Update clip
      const updatedClip = await prisma.videoClip.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        clip: updatedClip
      });

    } catch (error) {
      logger.error('Error updating clip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update clip'
      });
    }
  }
);

/**
 * DELETE /api/clips/:id
 * Soft delete a clip
 */
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      // Verify ownership
      const clip = await prisma.videoClip.findFirst({
        where: { id, userId, deletedAt: null }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      // Soft delete
      await prisma.videoClip.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });

      // Clean up storage (async)
      if (clip.videoUrl) {
        storageService.deleteFile(clip.videoUrl).catch(err => {
          logger.error('Error deleting clip file:', err);
        });
      }

      res.json({
        success: true,
        message: 'Clip deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting clip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete clip'
      });
    }
  }
);

/**
 * PATCH /api/clips/:id/favorite
 * Toggle favorite status
 */
router.patch(
  '/:id/favorite',
  [
    param('id').isUUID(),
    body('isFavorite').isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;
      const userId = (req as any).user.userId;

      const clip = await prisma.videoClip.findFirst({
        where: { id, userId, deletedAt: null }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      await prisma.videoClip.update({
        where: { id },
        data: { isFavorite }
      });

      res.json({
        success: true,
        isFavorite
      });

    } catch (error) {
      logger.error('Error updating favorite status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update favorite status'
      });
    }
  }
);

/**
 * POST /api/clips/:id/share
 * Share clip to various platforms
 */
router.post(
  '/:id/share',
  [
    param('id').isUUID(),
    body('destination').isIn(['email', 'slack', 'teams']),
    body('recipients').optional().isArray(),
    body('channel').optional().isString(),
    body('message').optional().isString(),
    body('includeTranscript').optional().isBoolean(),
    body('expirationDays').optional().isInt({ min: 0, max: 365 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = (req as any).user.userId;
      const {
        destination,
        recipients,
        channel,
        message,
        includeTranscript,
        expirationDays = 7
      } = req.body;

      // Verify clip exists and user has access
      const clip = await prisma.videoClip.findFirst({
        where: {
          id,
          OR: [
            { userId },
            { isPublic: true }
          ],
          deletedAt: null
        },
        include: {
          meeting: {
            select: {
              title: true
            }
          }
        }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      // Generate share link
      const shareToken = await generateShareToken(id, expirationDays);
      const shareUrl = `${process.env.APP_URL}/clips/share/${shareToken}`;

      // Share based on destination
      switch (destination) {
        case 'email':
          await notificationService.sendEmail({
            to: recipients,
            subject: `Shared clip: ${clip.title}`,
            template: 'clip-share',
            data: {
              clipTitle: clip.title,
              clipUrl: shareUrl,
              message,
              duration: Math.floor(clip.endTime - clip.startTime),
              senderName: (req as any).user.name
            }
          });
          break;

        case 'slack':
          await notificationService.sendToSlack({
            channel,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${clip.title}*\n${message || ''}`
                }
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Meeting:* ${clip.meeting.title}`
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Duration:* ${Math.floor(clip.endTime - clip.startTime)}s`
                  }
                ]
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'View Clip'
                    },
                    url: shareUrl,
                    style: 'primary'
                  }
                ]
              }
            ],
            attachments: clip.thumbnailUrl ? [
              {
                image_url: clip.thumbnailUrl,
                thumb_url: clip.thumbnailUrl
              }
            ] : undefined
          });
          break;

        case 'teams':
          await notificationService.sendToTeams({
            channel,
            card: {
              '@type': 'MessageCard',
              '@context': 'http://schema.org/extensions',
              summary: clip.title,
              themeColor: '7B3FF2',
              sections: [
                {
                  activityTitle: clip.title,
                  activitySubtitle: `From: ${clip.meeting.title}`,
                  activityImage: clip.thumbnailUrl,
                  text: message || `Check out this ${Math.floor(clip.endTime - clip.startTime)} second clip`
                }
              ],
              potentialAction: [
                {
                  '@type': 'OpenUri',
                  name: 'View Clip',
                  targets: [
                    {
                      os: 'default',
                      uri: shareUrl
                    }
                  ]
                }
              ]
            }
          });
          break;
      }

      // Update share count
      await prisma.videoClip.update({
        where: { id },
        data: { shares: (clip.shares || 0) + 1 }
      });

      logger.info('Clip shared successfully', {
        clipId: id,
        destination,
        userId
      });

      res.json({
        success: true,
        shareUrl,
        message: `Clip shared to ${destination} successfully`
      });

    } catch (error) {
      logger.error('Error sharing clip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to share clip'
      });
    }
  }
);

/**
 * POST /api/clips/:id/share-link
 * Generate a shareable link for the clip
 */
router.post(
  '/:id/share-link',
  [
    param('id').isUUID(),
    body('expirationDays').optional().isInt({ min: 0, max: 365 }),
    body('includeTranscript').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { expirationDays = 7, includeTranscript = false } = req.body;
      const userId = (req as any).user.userId;

      // Verify clip exists and user has access
      const clip = await prisma.videoClip.findFirst({
        where: {
          id,
          OR: [
            { userId },
            { isPublic: true }
          ],
          deletedAt: null
        }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      // Generate share token
      const shareToken = await generateShareToken(id, expirationDays, {
        includeTranscript
      });

      const shareUrl = `${process.env.APP_URL}/clips/share/${shareToken}`;

      res.json({
        success: true,
        shareUrl,
        expiresAt: expirationDays > 0
          ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
          : null
      });

    } catch (error) {
      logger.error('Error generating share link:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate share link'
      });
    }
  }
);

/**
 * GET /api/clips/:id/status
 * Get clip processing status
 */
router.get(
  '/:id/status',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const clip = await prisma.videoClip.findFirst({
        where: { id, userId, deletedAt: null }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      // Get processing job status if still processing
      let processingProgress = 0;
      if (clip.status === 'processing') {
        const job = await videoProcessingQueue.getJob(`clip-${id}`);
        if (job) {
          processingProgress = job.progress || 0;
        }
      }

      res.json({
        success: true,
        status: clip.status,
        progress: processingProgress,
        clipUrl: clip.videoUrl || null,
        thumbnailUrl: clip.thumbnailUrl || null
      });

    } catch (error) {
      logger.error('Error getting clip status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get clip status'
      });
    }
  }
);

/**
 * GET /api/clips/:id/download
 * Download clip video file
 */
router.get(
  '/:id/download',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const clip = await prisma.videoClip.findFirst({
        where: {
          id,
          OR: [
            { userId },
            { isPublic: true }
          ],
          deletedAt: null
        }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      if (!clip.videoUrl) {
        return res.status(404).json({
          success: false,
          error: 'Clip video not available'
        });
      }

      // Get download URL from storage service
      const downloadUrl = await storageService.getSignedUrl(
        clip.videoUrl,
        {
          action: 'download',
          filename: `${clip.title.replace(/[^a-z0-9]/gi, '_')}.mp4`
        }
      );

      res.redirect(downloadUrl);

    } catch (error) {
      logger.error('Error downloading clip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download clip'
      });
    }
  }
);

/**
 * GET /api/clips/share/:token
 * Public endpoint to view shared clip
 */
router.get(
  '/share/:token',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      // Verify and decode token
      const decoded = await verifyShareToken(token);
      if (!decoded || !decoded.clipId) {
        return res.status(404).json({
          success: false,
          error: 'Invalid or expired share link'
        });
      }

      // Get clip
      const clip = await prisma.videoClip.findFirst({
        where: {
          id: decoded.clipId,
          deletedAt: null
        },
        include: {
          meeting: {
            select: {
              title: true,
              recordedAt: true
            }
          }
        }
      });

      if (!clip) {
        return res.status(404).json({
          success: false,
          error: 'Clip not found'
        });
      }

      // Increment view count
      await prisma.videoClip.update({
        where: { id: decoded.clipId },
        data: { views: (clip.views || 0) + 1 }
      });

      // Return clip data based on token permissions
      const response: any = {
        success: true,
        clip: {
          id: clip.id,
          title: clip.title,
          description: clip.description,
          videoUrl: clip.videoUrl,
          thumbnailUrl: clip.thumbnailUrl,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.endTime - clip.startTime,
          meetingTitle: clip.meeting.title,
          createdAt: clip.createdAt
        }
      };

      // Include transcript if permitted
      if (decoded.includeTranscript) {
        const transcript = await videoIntelligenceService.getTranscriptSegments(
          clip.meetingId,
          clip.startTime,
          clip.endTime
        );
        response.clip.transcript = transcript;
      }

      res.json(response);

    } catch (error) {
      logger.error('Error accessing shared clip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to access shared clip'
      });
    }
  }
);

export default router;