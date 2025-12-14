/**
 * Notification Service
 * Multi-channel notification delivery: Email, SMS, Push, In-app
 */

import express from 'express';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import Bull from 'bull';
import winston from 'winston';
import Handlebars from 'handlebars';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize services
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Notification queue
const notificationQueue = new Bull('notifications', process.env.REDIS_URL || 'redis://localhost:6379');

app.use(express.json());

// Email templates
const emailTemplates = {
  welcome: Handlebars.compile(`
    <h1>Welcome to OpenMeet!</h1>
    <p>Hi {{firstName}},</p>
    <p>Thank you for joining OpenMeet. Start recording your meetings today!</p>
  `),
  meetingReady: Handlebars.compile(`
    <h2>Your meeting is ready!</h2>
    <p>Hi {{userName}},</p>
    <p>Your meeting "{{meetingTitle}}" has been processed.</p>
    <a href="{{meetingUrl}}">View Meeting</a>
  `),
  actionItemAssigned: Handlebars.compile(`
    <h2>New Action Item</h2>
    <p>Hi {{assigneeName}},</p>
    <p>You've been assigned: <strong>{{actionItem}}</strong></p>
    <p>Due: {{dueDate}}</p>
  `)
};

// Send notification endpoint
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { userId, type, channel, data, priority = 'normal' } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        channel,
        data,
        priority,
        status: 'pending'
      }
    });

    // Queue for delivery
    await notificationQueue.add('deliver', {
      notificationId: notification.id,
      userId,
      type,
      channel,
      data,
      priority
    }, {
      priority: priority === 'urgent' ? 1 : priority === 'high' ? 2 : 3,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });

    res.json({ success: true, notificationId: notification.id });
  } catch (error: any) {
    logger.error('Notification creation failed', { error: error.message });
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send bulk notifications
app.post('/api/notifications/bulk', async (req, res) => {
  try {
    const { userIds, type, channel, data } = req.body;

    const jobs = userIds.map((userId: string) => ({
      userId,
      type,
      channel,
      data
    }));

    await notificationQueue.addBulk(jobs.map(job => ({
      name: 'deliver',
      data: job
    })));

    res.json({ success: true, count: userIds.length });
  } catch (error: any) {
    logger.error('Bulk notification failed', { error: error.message });
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

// Get user notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { unreadOnly } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly === 'true' ? { readAt: null } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ notifications });
  } catch (error: any) {
    logger.error('Get notifications failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Mark as read failed', { error: error.message });
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Process notification queue
notificationQueue.process('deliver', async (job) => {
  const { notificationId, userId, type, channel, data } = job.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    switch (channel) {
      case 'email':
        await sendEmail(user.email, type, data);
        break;
      case 'sms':
        if (user.phone) await sendSMS(user.phone, type, data);
        break;
      case 'push':
        await sendPushNotification(userId, type, data);
        break;
      case 'in_app':
        await sendInAppNotification(userId, type, data);
        break;
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'delivered', deliveredAt: new Date() }
      });
    }

    logger.info('Notification delivered', { notificationId, channel, type });
  } catch (error: any) {
    logger.error('Notification delivery failed', { error: error.message, notificationId });

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'failed', error: error.message }
      });
    }

    throw error;
  }
});

// Email delivery
async function sendEmail(to: string, type: string, data: any) {
  const template = emailTemplates[type as keyof typeof emailTemplates];
  if (!template) throw new Error('Template not found');

  const html = template(data);

  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@openmeet.com',
    subject: getEmailSubject(type),
    html
  });
}

// SMS delivery
async function sendSMS(to: string, type: string, data: any) {
  const message = getSMSMessage(type, data);

  await twilioClient.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: message
  });
}

// Push notification
async function sendPushNotification(userId: string, type: string, data: any) {
  // Get user's FCM token from database
  const token = await redis.get(`fcm_token:${userId}`);
  if (!token) return;

  // Send via Firebase Cloud Messaging
  // Implementation depends on firebase-admin setup
  logger.info('Push notification sent', { userId, type });
}

// In-app notification
async function sendInAppNotification(userId: string, type: string, data: any) {
  // Publish to Redis pub/sub for real-time delivery
  await redis.publish('notifications', JSON.stringify({
    userId,
    type,
    data,
    timestamp: new Date()
  }));
}

// Helper functions
function getEmailSubject(type: string): string {
  const subjects: Record<string, string> = {
    welcome: 'Welcome to OpenMeet!',
    meetingReady: 'Your meeting is ready',
    actionItemAssigned: 'New action item assigned to you',
    subscriptionExpiring: 'Your subscription is expiring soon',
    paymentFailed: 'Payment failed - action required'
  };
  return subjects[type] || 'Notification from OpenMeet';
}

function getSMSMessage(type: string, data: any): string {
  const messages: Record<string, (data: any) => string> = {
    meetingReady: (d) => `Your meeting "${d.meetingTitle}" is ready! View it at ${d.meetingUrl}`,
    actionItemAssigned: (d) => `New task: ${d.actionItem}`,
  };
  return messages[type]?.(data) || 'You have a new notification from OpenMeet';
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  logger.info(`Notification service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await redis.quit();
  await notificationQueue.close();
  process.exit(0);
});
