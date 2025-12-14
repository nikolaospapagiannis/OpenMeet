/**
 * Notifications Routes
 * User notification management and push notification token registration
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import pushNotificationService from '../services/PushNotificationService';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'notifications-routes' },
  transports: [new winston.transports.Console()],
});

router.use(authMiddleware);

/**
 * POST /api/notifications/register
 * Register device token for push notifications
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { token, platform, deviceId, appVersion } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      res.status(400).json({ error: 'Valid platform is required (ios, android, web)' });
      return;
    }

    // Check if token already exists
    const existingToken = await prisma.deviceToken.findUnique({
      where: { token },
    });

    if (existingToken) {
      // Update existing token
      await prisma.deviceToken.update({
        where: { token },
        data: {
          userId,
          platform,
          deviceId,
          appVersion,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });

      logger.info('Device token updated:', { userId, platform });
    } else {
      // Create new token
      await prisma.deviceToken.create({
        data: {
          userId,
          token,
          platform,
          deviceId,
          appVersion,
          isActive: true,
        },
      });

      logger.info('Device token registered:', { userId, platform });
    }

    res.json({ success: true, message: 'Device token registered' });
  } catch (error) {
    logger.error('Register device token error:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

/**
 * DELETE /api/notifications/register
 * Unregister device token
 */
router.delete('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    // Mark token as inactive
    await prisma.deviceToken.updateMany({
      where: {
        userId,
        token,
      },
      data: {
        isActive: false,
      },
    });

    logger.info('Device token unregistered:', { userId });

    res.json({ success: true, message: 'Device token unregistered' });
  } catch (error) {
    logger.error('Unregister device token error:', error);
    res.status(500).json({ error: 'Failed to unregister device token' });
  }
});

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { limit = 50, offset = 0, status } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    // Get notifications from database
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        status: { in: ['pending', 'sent', 'delivered'] },
      },
    });

    res.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    // Verify notification belongs to user and update
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    // Update notification status
    await prisma.notification.update({
      where: { id },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Update all unread notifications
    await prisma.notification.updateMany({
      where: {
        userId,
        status: { in: ['pending', 'sent', 'delivered'] },
      },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * POST /api/notifications/send
 * Send a push notification (admin only)
 */
router.post('/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Check if user is admin
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    const { userIds, type, title, body, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: 'userIds array is required' });
      return;
    }

    if (!type || !['meeting_ready', 'action_item', 'comment_reply', 'weekly_summary'].includes(type)) {
      res.status(400).json({ error: 'Valid notification type is required' });
      return;
    }

    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    // Send notification
    const result = await pushNotificationService.sendToUsers(userIds, {
      type,
      title,
      body,
      data: data || {},
    });

    logger.info('Push notification sent by admin:', {
      adminId: userId,
      userIds: userIds.length,
      type,
    });

    res.json({
      success: true,
      message: 'Notification sent',
      successCount: result?.successCount || 0,
      failureCount: result?.failureCount || 0,
    });
  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * GET /api/notifications/tokens
 * Get user's registered device tokens (for debugging)
 */
router.get('/tokens', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        deviceId: true,
        appVersion: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    res.json({ tokens });
  } catch (error) {
    logger.error('Get tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

export default router;
