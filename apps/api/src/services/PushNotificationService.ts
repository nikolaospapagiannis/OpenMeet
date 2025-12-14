/**
 * Push Notification Service
 * Firebase Admin SDK integration for sending push notifications
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Firebase Admin is optional - will use mock if not available
let admin: any = null;
try {
  admin = require('firebase-admin');
} catch {
  logger.warn('firebase-admin not installed, push notifications disabled');
}

// Type definitions for Firebase Admin messaging (when module is not installed)
interface FirebaseMessage {
  token?: string;
  topic?: string;
  notification?: {
    title?: string;
    body?: string;
    imageUrl?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: string;
    ttl?: number;
    notification?: {
      sound?: string;
      clickAction?: string;
      channelId?: string;
    };
  };
  apns?: {
    payload?: {
      aps?: {
        badge?: number;
        sound?: string;
        contentAvailable?: boolean;
      };
    };
  };
}

interface FirebaseMulticastMessage extends Omit<FirebaseMessage, 'token' | 'topic'> {
  tokens: string[];
}

interface BatchResponse {
  successCount: number;
  failureCount: number;
  responses: Array<{
    success: boolean;
    error?: { code: string; message: string };
  }>;
}

interface TopicManagementResponse {
  successCount: number;
  failureCount: number;
}

const prisma = new PrismaClient();

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'meeting_ready' | 'action_item' | 'comment_reply' | 'weekly_summary';
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface SendOptions {
  userId?: string;
  userIds?: string[];
  token?: string;
  tokens?: string[];
  topic?: string;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  timeToLive?: number;
}

class PushNotificationService {
  private initialized: boolean = false;

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if already initialized
      if (admin.apps.length === 0) {
        // Initialize with service account credentials
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

        if (serviceAccount) {
          // Initialize with service account file
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } else if (process.env.FIREBASE_PROJECT_ID) {
          // Initialize with environment variables
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
          });
        } else {
          // Use Application Default Credentials (for GCP environments)
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        }

        this.initialized = true;
        logger.info('Firebase Admin SDK initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(
    token: string,
    payload: NotificationPayload,
    options?: Partial<SendOptions>
  ): Promise<string> {
    await this.initialize();

    try {
      const message: FirebaseMessage = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          type: payload.type,
          ...(payload.data || {}),
        },
        android: {
          priority: options?.priority || 'high',
          ttl: options?.timeToLive || 86400000, // 24 hours
          notification: {
            sound: options?.sound || 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: options?.badge,
              sound: options?.sound || 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      logger.info('Notification sent to device:', { token, messageId: response });

      // Log notification in database
      await this.logNotification(payload, token);

      return response;
    } catch (error) {
      logger.error('Failed to send notification to device:', error);

      // Handle token errors
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.removeInvalidToken(token);
      }

      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToDevices(
    tokens: string[],
    payload: NotificationPayload,
    options?: Partial<SendOptions>
  ): Promise<BatchResponse> {
    await this.initialize();

    if (tokens.length === 0) {
      throw new Error('No tokens provided');
    }

    try {
      const message: FirebaseMulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          type: payload.type,
          ...(payload.data || {}),
        },
        android: {
          priority: options?.priority || 'high',
          ttl: options?.timeToLive || 86400000,
          notification: {
            sound: options?.sound || 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: options?.badge,
              sound: options?.sound || 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);

      logger.info('Batch notification sent:', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            logger.error('Failed to send to token:', {
              token: tokens[idx],
              error: resp.error,
            });
          }
        });

        // Remove invalid tokens
        await this.removeInvalidTokens(failedTokens);
      }

      return response;
    } catch (error) {
      logger.error('Failed to send batch notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to a user (all their devices)
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload,
    options?: Partial<SendOptions>
  ): Promise<BatchResponse | null> {
    const tokens = await this.getUserTokens(userId);

    if (tokens.length === 0) {
      logger.warn('No active tokens found for user:', userId);
      return null;
    }

    return this.sendToDevices(tokens, payload, options);
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload,
    options?: Partial<SendOptions>
  ): Promise<BatchResponse | null> {
    const tokens = await this.getUsersTokens(userIds);

    if (tokens.length === 0) {
      logger.warn('No active tokens found for users');
      return null;
    }

    return this.sendToDevices(tokens, payload, options);
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    payload: NotificationPayload,
    options?: Partial<SendOptions>
  ): Promise<string> {
    await this.initialize();

    try {
      const message: FirebaseMessage = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          type: payload.type,
          ...(payload.data || {}),
        },
        android: {
          priority: options?.priority || 'high',
          notification: {
            sound: options?.sound || 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: options?.sound || 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      logger.info('Notification sent to topic:', { topic, messageId: response });

      return response;
    } catch (error) {
      logger.error('Failed to send notification to topic:', error);
      throw error;
    }
  }

  /**
   * Send data-only notification (silent notification)
   */
  async sendDataMessage(
    token: string,
    data: Record<string, string>,
    options?: Partial<SendOptions>
  ): Promise<string> {
    await this.initialize();

    try {
      const message: FirebaseMessage = {
        token,
        data,
        android: {
          priority: options?.priority || 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      logger.info('Data message sent:', { token, messageId: response });

      return response;
    } catch (error) {
      logger.error('Failed to send data message:', error);
      throw error;
    }
  }

  /**
   * Subscribe devices to a topic
   */
  async subscribeToTopic(
    tokens: string[],
    topic: string
  ): Promise<TopicManagementResponse> {
    await this.initialize();

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info('Subscribed to topic:', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return response;
    } catch (error) {
      logger.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe devices from a topic
   */
  async unsubscribeFromTopic(
    tokens: string[],
    topic: string
  ): Promise<TopicManagementResponse> {
    await this.initialize();

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info('Unsubscribed from topic:', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return response;
    } catch (error) {
      logger.error('Failed to unsubscribe from topic:', error);
      throw error;
    }
  }

  /**
   * Get all tokens for a user
   */
  private async getUserTokens(userId: string): Promise<string[]> {
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        token: true,
      },
    });

    return deviceTokens.map(dt => dt.token);
  }

  /**
   * Get all tokens for multiple users
   */
  private async getUsersTokens(userIds: string[]): Promise<string[]> {
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: {
          in: userIds,
        },
        isActive: true,
      },
      select: {
        token: true,
      },
    });

    return deviceTokens.map(dt => dt.token);
  }

  /**
   * Remove invalid token from database
   */
  private async removeInvalidToken(token: string): Promise<void> {
    try {
      await prisma.deviceToken.update({
        where: { token },
        data: { isActive: false },
      });

      logger.info('Marked token as inactive:', token);
    } catch (error) {
      logger.error('Failed to remove invalid token:', error);
    }
  }

  /**
   * Remove multiple invalid tokens
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      await prisma.deviceToken.updateMany({
        where: {
          token: {
            in: tokens,
          },
        },
        data: {
          isActive: false,
        },
      });

      logger.info('Marked tokens as inactive:', tokens.length);
    } catch (error) {
      logger.error('Failed to remove invalid tokens:', error);
    }
  }

  /**
   * Log notification in database
   */
  private async logNotification(
    payload: NotificationPayload,
    recipient: string
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          type: 'push',
          status: 'sent',
          channel: 'fcm',
          recipient,
          subject: payload.title,
          content: payload.body,
          metadata: {
            type: payload.type,
            data: payload.data || {},
          },
          sentAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to log notification:', error);
    }
  }

  // ===========================================
  // Notification Templates
  // ===========================================

  /**
   * Send meeting ready notification
   */
  async sendMeetingReadyNotification(
    userId: string,
    meetingId: string,
    meetingTitle: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Meeting Transcription Ready',
      body: `Your meeting "${meetingTitle}" has been transcribed and is ready for review.`,
      type: 'meeting_ready',
      data: {
        meetingId,
        meetingTitle,
      },
    };

    await this.sendToUser(userId, payload);
  }

  /**
   * Send action item notification
   */
  async sendActionItemNotification(
    userId: string,
    actionItemId: string,
    actionItemTitle: string,
    meetingTitle?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: 'New Action Item Assigned',
      body: `You have been assigned: ${actionItemTitle}${
        meetingTitle ? ` from "${meetingTitle}"` : ''
      }`,
      type: 'action_item',
      data: {
        actionItemId,
        actionItemTitle,
        meetingTitle,
      },
    };

    await this.sendToUser(userId, payload);
  }

  /**
   * Send comment reply notification
   */
  async sendCommentReplyNotification(
    userId: string,
    commentId: string,
    meetingId: string,
    commenterName: string,
    meetingTitle?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: 'New Comment Reply',
      body: `${commenterName} replied to your comment${
        meetingTitle ? ` in "${meetingTitle}"` : ''
      }`,
      type: 'comment_reply',
      data: {
        commentId,
        meetingId,
        commenterName,
        meetingTitle,
      },
    };

    await this.sendToUser(userId, payload);
  }

  /**
   * Send weekly summary notification
   */
  async sendWeeklySummaryNotification(
    userId: string,
    meetingCount: number,
    actionItemCount: number
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Weekly Summary Available',
      body: `This week: ${meetingCount} meetings, ${actionItemCount} action items completed`,
      type: 'weekly_summary',
      data: {
        meetingCount,
        actionItemCount,
      },
    };

    await this.sendToUser(userId, payload);
  }
}

export default new PushNotificationService();
