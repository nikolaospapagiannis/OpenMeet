/**
 * Sharing Routes
 * Meeting and clip sharing functionality with secure token-based access
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { body, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permission-check';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { emailService } from '../services/email';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'sharing-routes' },
  transports: [new winston.transports.Console()],
});

/**
 * Generate secure random token for sharing
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/meetings/:id/share
 * Create a shareable link for a meeting
 * Requires authentication
 */
router.post(
  '/meetings/:id/share',
  authMiddleware,
  requirePermission('meetings.share'),
  [
    param('id').isUUID(),
    body('permission').isIn(['view', 'comment', 'edit']),
    body('expiresAt').optional().isISO8601(),
    body('password').optional().isString().isLength({ min: 4 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { permission, expiresAt, password } = req.body;

      // Verify meeting exists and user has access
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId,
        },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Generate unique token
      const token = generateShareToken();

      // Hash password if provided
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;

      // Create share link metadata (store in Redis for fast access)
      const shareData = {
        id: crypto.randomUUID(),
        token,
        meetingId,
        organizationId,
        createdBy: userId,
        permission,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        passwordHash,
        viewCount: 0,
        createdAt: new Date().toISOString(),
      };

      // Store in Redis with expiration (if set)
      const redisKey = `share:${token}`;
      await redis.set(redisKey, JSON.stringify(shareData));

      if (expiresAt) {
        const ttl = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
        if (ttl > 0) {
          await redis.expire(redisKey, ttl);
        }
      }

      // Also store reference by meeting ID for revocation
      await redis.sadd(`share:meeting:${meetingId}`, token);

      logger.info('Share link created', {
        meetingId,
        token: token.substring(0, 8) + '...',
        userId,
        permission,
      });

      res.status(201).json({
        id: shareData.id,
        token,
        permission,
        expiresAt: shareData.expiresAt,
        viewCount: 0,
        createdAt: shareData.createdAt,
      });
    } catch (error) {
      logger.error('Error creating share link:', error);
      res.status(500).json({ error: 'Failed to create share link' });
    }
  }
);

/**
 * GET /api/meetings/:id/share-links
 * Get all share links for a meeting
 * Requires authentication
 */
router.get(
  '/meetings/:id/share-links',
  authMiddleware,
  requirePermission('meetings.read'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const organizationId = (req as any).user.organizationId;

      // Verify meeting exists and user has access
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId,
        },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Get all tokens for this meeting
      const tokens = await redis.smembers(`share:meeting:${meetingId}`);
      const shareLinks = [];

      for (const token of tokens) {
        const data = await redis.get(`share:${token}`);
        if (data) {
          const shareData = JSON.parse(data);
          shareLinks.push({
            id: shareData.id,
            token,
            permission: shareData.permission,
            expiresAt: shareData.expiresAt,
            viewCount: shareData.viewCount,
            createdAt: shareData.createdAt,
          });
        }
      }

      res.json(shareLinks);
    } catch (error) {
      logger.error('Error fetching share links:', error);
      res.status(500).json({ error: 'Failed to fetch share links' });
    }
  }
);

/**
 * DELETE /api/meetings/:id/share/:linkId
 * Revoke a share link
 * Requires authentication
 */
router.delete(
  '/meetings/:id/share/:linkId',
  authMiddleware,
  requirePermission('meetings.share'),
  [param('id').isUUID(), param('linkId').isString()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const linkId = req.params.linkId;
      const organizationId = (req as any).user.organizationId;

      // Verify meeting exists and user has access
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId,
        },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Find and delete the token
      const tokens = await redis.smembers(`share:meeting:${meetingId}`);

      for (const token of tokens) {
        const data = await redis.get(`share:${token}`);
        if (data) {
          const shareData = JSON.parse(data);
          if (shareData.id === linkId) {
            // Delete from Redis
            await redis.del(`share:${token}`);
            await redis.srem(`share:meeting:${meetingId}`, token);

            logger.info('Share link revoked', {
              meetingId,
              linkId,
              token: token.substring(0, 8) + '...',
            });

            res.json({ success: true, message: 'Share link revoked' });
            return;
          }
        }
      }

      res.status(404).json({ error: 'Share link not found' });
    } catch (error) {
      logger.error('Error revoking share link:', error);
      res.status(500).json({ error: 'Failed to revoke share link' });
    }
  }
);

/**
 * POST /api/shared/:token
 * Access a shared meeting via token (public endpoint, no auth required)
 */
router.post(
  '/shared/:token',
  [
    param('token').isString().isLength({ min: 32, max: 128 }),
    body('password').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const token = req.params.token;
      const { password } = req.body;

      // Get share data from Redis
      const shareDataRaw = await redis.get(`share:${token}`);

      if (!shareDataRaw) {
        res.status(404).json({ error: 'Share link not found or expired' });
        return;
      }

      const shareData = JSON.parse(shareDataRaw);

      // Check if expired
      if (shareData.expiresAt && new Date(shareData.expiresAt) < new Date()) {
        res.status(403).json({ error: 'Share link has expired' });
        return;
      }

      // Check password if required
      if (shareData.passwordHash) {
        if (!password) {
          res.status(403).json({ error: 'Password required to access this meeting' });
          return;
        }

        const isValidPassword = await bcrypt.compare(password, shareData.passwordHash);
        if (!isValidPassword) {
          res.status(401).json({ error: 'Invalid password' });
          return;
        }
      }

      // Increment view count
      shareData.viewCount = (shareData.viewCount || 0) + 1;
      await redis.set(`share:${token}`, JSON.stringify(shareData));

      // Fetch meeting data
      const meeting = await prisma.meeting.findUnique({
        where: { id: shareData.meetingId },
        include: {
          participants: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
          summaries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              overview: true,
              keyPoints: true,
              actionItems: true,
              decisions: true,
            },
          },
          transcriptContent: {
            select: {
              fullText: true,
              segments: true,
            },
            take: 1,
          },
        },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Build response based on permission level
      const responseData: any = {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledStartAt: meeting.scheduledStartAt,
        duration: meeting.durationSeconds || 0,
        permission: shareData.permission,
        viewCount: shareData.viewCount,
      };

      // Add participants (available for all permission levels)
      responseData.participants = meeting.participants;

      // Add summary (available for all permission levels)
      if (meeting.summaries && meeting.summaries.length > 0) {
        responseData.summary = meeting.summaries[0];
      }

      // Add transcript (available for all permission levels)
      if (meeting.transcriptContent && meeting.transcriptContent.length > 0) {
        const transcript = meeting.transcriptContent[0];
        responseData.transcript = {
          fullText: transcript.fullText,
          segments: transcript.segments,
        };
      }

      logger.info('Shared meeting accessed', {
        meetingId: shareData.meetingId,
        token: token.substring(0, 8) + '...',
        permission: shareData.permission,
        viewCount: shareData.viewCount,
      });

      res.json(responseData);
    } catch (error) {
      logger.error('Error accessing shared meeting:', error);
      res.status(500).json({ error: 'Failed to access shared meeting' });
    }
  }
);

/**
 * POST /api/meetings/:id/share/email
 * Send meeting share link via email
 * Requires authentication
 */
router.post(
  '/meetings/:id/share/email',
  authMiddleware,
  requirePermission('meetings.share'),
  [
    param('id').isUUID(),
    body('recipients').isArray({ min: 1 }),
    body('recipients.*').isEmail(),
    body('message').optional().isString().isLength({ max: 500 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { recipients, message } = req.body;

      // Verify meeting exists and user has access
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId,
        },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Get user info for sender name
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });

      const senderName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Someone';

      // Create share link (if not already exists)
      let shareToken = '';
      const existingTokens = await redis.smembers(`share:meeting:${meetingId}`);

      if (existingTokens.length > 0) {
        // Use existing token
        shareToken = existingTokens[0];
      } else {
        // Create new token
        shareToken = generateShareToken();
        const shareData = {
          id: crypto.randomUUID(),
          token: shareToken,
          meetingId,
          organizationId,
          createdBy: userId,
          permission: 'view',
          expiresAt: null,
          passwordHash: null,
          viewCount: 0,
          createdAt: new Date().toISOString(),
        };

        await redis.set(`share:${shareToken}`, JSON.stringify(shareData));
        await redis.sadd(`share:meeting:${meetingId}`, shareToken);
      }

      const shareUrl = `${process.env.APP_URL || 'http://localhost:3000'}/shared/${shareToken}`;

      // Send emails to all recipients using EmailService
      const emailResults = await Promise.allSettled(
        recipients.map(async (recipient: string) => {
          const emailTemplate = {
            subject: `${senderName} shared a meeting with you`,
            htmlContent: `
              <h1>${senderName} shared a meeting with you</h1>
              <h2>${meeting.title}</h2>
              ${message ? `<p style="color: #6B7280; font-style: italic;">"${message}"</p>` : ''}
              <p>Click the button below to view the meeting recording, transcript, and summary:</p>
              <a href="${shareUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View Meeting</a>
              <p style="margin-top: 20px; font-size: 14px; color: #6B7280;">
                This link was shared by ${senderName}${user?.email ? ` (${user.email})` : ''}.
              </p>
            `,
            textContent: `${senderName} shared a meeting with you\n\n${meeting.title}\n\n${message ? `"${message}"\n\n` : ''}View the meeting at: ${shareUrl}`,
          };

          const success = await emailService.sendEmail(emailTemplate, {
            to: recipient,
            organizationId,
            metadata: {
              meetingId,
              shareToken: shareToken.substring(0, 8),
              sharedBy: userId,
            },
          });

          if (success) {
            logger.info('Share email sent', {
              meetingId,
              recipient,
              sender: senderName,
            });
          }

          return { recipient, success };
        })
      );

      const successCount = emailResults.filter(
        r => r.status === 'fulfilled' && (r.value as { success: boolean }).success
      ).length;
      const failedCount = recipients.length - successCount;

      logger.info('Share emails completed', {
        meetingId,
        total: recipients.length,
        sent: successCount,
        failed: failedCount,
      });

      res.json({
        success: true,
        message: `Invites sent to ${successCount} of ${recipients.length} recipients`,
        shareUrl,
        emailsSent: successCount,
        emailsFailed: failedCount,
      });
    } catch (error) {
      logger.error('Error sending share emails:', error);
      res.status(500).json({ error: 'Failed to send share emails' });
    }
  }
);

export default router;
