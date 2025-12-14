/**
 * Email Service Tests
 * Unit tests for database-backed email service
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { PrismaClient, EmailTemplateType, EmailDeliveryStatus } from '@prisma/client';
import Redis from 'ioredis';
import { EmailService } from '../email';

// Mock dependencies
jest.mock('@sendgrid/mail');
jest.mock('ioredis');
jest.mock('@prisma/client');

describe('EmailService', () => {
  let emailService: EmailService;
  let prisma: PrismaClient;
  let redis: Redis;

  beforeAll(() => {
    // Setup test environment
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@example.com';
    process.env.SUPPORT_EMAIL = 'support@example.com';
    process.env.WEB_URL = 'http://localhost:3000';

    emailService = new EmailService();
    prisma = new PrismaClient();
    redis = new Redis();
  });

  afterAll(async () => {
    await emailService.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should create default template if none exists', async () => {
      const mockTemplate = {
        id: 'template-1',
        type: EmailTemplateType.welcome,
        name: 'Welcome Email',
        subject: 'Welcome to {{appName}}!',
        htmlBody: '<h1>Welcome {{firstName}}!</h1>',
        textBody: 'Welcome {{firstName}}!',
        isDefault: true,
        isActive: true,
        version: 1,
        variables: [],
        usageCount: 0,
        lastUsedAt: null,
        organizationId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.emailTemplate, 'findFirst').mockResolvedValueOnce(null);
      jest.spyOn(prisma.emailTemplate, 'create').mockResolvedValueOnce(mockTemplate);

      const templateId = await emailService.saveTemplate(
        EmailTemplateType.welcome,
        {
          subject: 'Welcome to {{appName}}!',
          htmlBody: '<h1>Welcome {{firstName}}!</h1>',
          textBody: 'Welcome {{firstName}}!',
        }
      );

      expect(templateId).toBe(mockTemplate.id);
      expect(prisma.emailTemplate.create).toHaveBeenCalled();
    });

    it('should version templates on update', async () => {
      const existingTemplate = {
        id: 'template-1',
        type: EmailTemplateType.welcome,
        name: 'Welcome Email',
        subject: 'Old Subject',
        htmlBody: '<h1>Old Body</h1>',
        textBody: 'Old Body',
        version: 1,
        isActive: true,
        organizationId: 'org-1',
      };

      const newTemplate = {
        ...existingTemplate,
        id: 'template-2',
        subject: 'New Subject',
        htmlBody: '<h1>New Body</h1>',
        version: 2,
      };

      jest.spyOn(prisma.emailTemplate, 'findFirst').mockResolvedValueOnce(existingTemplate);
      jest.spyOn(prisma.emailTemplate, 'create').mockResolvedValueOnce(newTemplate);
      jest.spyOn(prisma.emailTemplate, 'update').mockResolvedValueOnce(existingTemplate);

      const templateId = await emailService.saveTemplate(
        EmailTemplateType.welcome,
        {
          subject: 'New Subject',
          htmlBody: '<h1>New Body</h1>',
        },
        'org-1'
      );

      expect(templateId).toBe(newTemplate.id);
      expect(prisma.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: existingTemplate.id },
        data: { isActive: false },
      });
    });

    it('should cache templates in Redis', async () => {
      const mockTemplate = {
        id: 'template-1',
        type: EmailTemplateType.welcome,
        subject: 'Welcome {{firstName}}',
        htmlBody: '<h1>Welcome {{firstName}}!</h1>',
        textBody: 'Welcome {{firstName}}!',
        isActive: true,
        organizationId: 'org-1',
        variables: [],
      };

      jest.spyOn(redis, 'get').mockResolvedValueOnce(null);
      jest.spyOn(redis, 'setex').mockResolvedValueOnce('OK');
      jest.spyOn(prisma.emailTemplate, 'findFirst').mockResolvedValueOnce(mockTemplate);
      jest.spyOn(prisma.emailTemplate, 'update').mockResolvedValueOnce(mockTemplate);

      // Private method test through public interface
      const success = await emailService.sendWelcomeEmail('test@example.com', 'John', 'org-1');

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('email:template:'),
        3600,
        expect.any(String)
      );
    });

    it('should use cached template if available', async () => {
      const cachedTemplate = JSON.stringify({
        subject: 'Cached Subject',
        htmlBody: '<h1>Cached Body</h1>',
        textBody: 'Cached Body',
      });

      jest.spyOn(redis, 'get').mockResolvedValueOnce(cachedTemplate);
      jest.spyOn(prisma.emailTemplate, 'findFirst');

      const success = await emailService.sendWelcomeEmail('test@example.com', 'John', 'org-1');

      expect(prisma.emailTemplate.findFirst).not.toHaveBeenCalled();
    });

    it('should clear cache on template update', async () => {
      jest.spyOn(redis, 'del').mockResolvedValueOnce(1);

      await emailService.clearTemplateCache('org-1');

      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('Email Sending', () => {
    it('should log email send to database', async () => {
      const mockLog = {
        id: 'log-1',
        to: 'test@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        status: EmailDeliveryStatus.sent,
        messageId: 'msg-123',
        sentAt: new Date(),
        organizationId: 'org-1',
      };

      jest.spyOn(prisma.emailLog, 'create').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailLog, 'update').mockResolvedValueOnce(mockLog);

      const template = {
        subject: 'Test Email',
        htmlContent: '<h1>Test</h1>',
        textContent: 'Test',
      };

      const success = await emailService.sendEmail(template, {
        to: 'test@example.com',
        organizationId: 'org-1',
      });

      expect(prisma.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          to: 'test@example.com',
          organizationId: 'org-1',
          status: EmailDeliveryStatus.pending,
        }),
      });
    });

    it('should update log on send failure', async () => {
      const mockLog = {
        id: 'log-1',
        status: EmailDeliveryStatus.failed,
      };

      jest.spyOn(prisma.emailLog, 'create').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailLog, 'update').mockResolvedValueOnce(mockLog);

      // Force send to fail
      const sgMail = require('@sendgrid/mail');
      sgMail.send.mockRejectedValueOnce(new Error('SendGrid error'));

      const template = {
        subject: 'Test Email',
        htmlContent: '<h1>Test</h1>',
      };

      const success = await emailService.sendEmail(template, {
        to: 'test@example.com',
      });

      expect(success).toBe(false);
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: mockLog.id },
        data: expect.objectContaining({
          status: EmailDeliveryStatus.failed,
          error: 'SendGrid error',
        }),
      });
    });
  });

  describe('Webhook Processing', () => {
    it('should process delivered webhook event', async () => {
      const mockLog = {
        id: 'log-1',
        messageId: 'msg-123',
        firstOpenedAt: null,
      };

      const webhookEvent = {
        emailLogId: 'log-1',
        sg_message_id: 'msg-123',
        event: 'delivered',
        timestamp: Date.now() / 1000,
        email: 'test@example.com',
      };

      jest.spyOn(prisma.emailLog, 'findFirst').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailLog, 'update').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailWebhookEvent, 'create').mockResolvedValueOnce({});

      await emailService.processWebhookEvent(webhookEvent);

      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: mockLog.id },
        data: expect.objectContaining({
          status: EmailDeliveryStatus.delivered,
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should track email opens', async () => {
      const mockLog = {
        id: 'log-1',
        messageId: 'msg-123',
        firstOpenedAt: null,
        openCount: 0,
      };

      const webhookEvent = {
        sg_message_id: 'msg-123',
        event: 'open',
        timestamp: Date.now() / 1000,
        email: 'test@example.com',
      };

      jest.spyOn(prisma.emailLog, 'findFirst').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailLog, 'update').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailWebhookEvent, 'create').mockResolvedValueOnce({});

      await emailService.processWebhookEvent(webhookEvent);

      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: mockLog.id },
        data: expect.objectContaining({
          status: EmailDeliveryStatus.opened,
          openCount: { increment: 1 },
          firstOpenedAt: expect.any(Date),
        }),
      });
    });

    it('should track clicks', async () => {
      const mockLog = {
        id: 'log-1',
        messageId: 'msg-123',
        clickCount: 0,
      };

      const webhookEvent = {
        sg_message_id: 'msg-123',
        event: 'click',
        timestamp: Date.now() / 1000,
        email: 'test@example.com',
        url: 'http://example.com',
      };

      jest.spyOn(prisma.emailLog, 'findFirst').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailLog, 'update').mockResolvedValueOnce(mockLog);
      jest.spyOn(prisma.emailWebhookEvent, 'create').mockResolvedValueOnce({});

      await emailService.processWebhookEvent(webhookEvent);

      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: mockLog.id },
        data: expect.objectContaining({
          status: EmailDeliveryStatus.clicked,
          clickCount: { increment: 1 },
          uniqueClickCount: { increment: 1 },
        }),
      });
    });
  });

  describe('Bulk Sending', () => {
    it('should process bulk emails in batches', async () => {
      const recipients = Array.from({ length: 250 }, (_, i) => ({
        to: `user${i}@example.com`,
        data: { firstName: `User${i}` },
      }));

      const mockTemplate = {
        id: 'template-1',
        subject: 'Bulk Email',
        htmlBody: '<h1>Hello {{firstName}}</h1>',
        textBody: 'Hello {{firstName}}',
      };

      jest.spyOn(prisma.emailTemplate, 'findFirst').mockResolvedValue(mockTemplate);
      jest.spyOn(prisma.emailTemplate, 'update').mockResolvedValue(mockTemplate);
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(true);

      const result = await emailService.sendBulkEmails(
        EmailTemplateType.welcome,
        recipients,
        'org-1'
      );

      expect(result.sent + result.failed).toBe(250);
      // Should process in 3 batches (100, 100, 50)
      expect(emailService.sendEmail).toHaveBeenCalledTimes(250);
    });
  });

  describe('Statistics', () => {
    it('should calculate email statistics', async () => {
      jest.spyOn(prisma.emailLog, 'count').mockResolvedValueOnce(100);
      jest.spyOn(prisma.emailLog, 'groupBy').mockResolvedValueOnce([
        { status: EmailDeliveryStatus.delivered, _count: { id: 80 } },
        { status: EmailDeliveryStatus.opened, _count: { id: 60 } },
        { status: EmailDeliveryStatus.clicked, _count: { id: 30 } },
        { status: EmailDeliveryStatus.bounced, _count: { id: 5 } },
        { status: EmailDeliveryStatus.failed, _count: { id: 15 } },
      ]);
      jest.spyOn(prisma.emailLog, 'aggregate').mockResolvedValueOnce({
        _avg: {
          openCount: 2.5,
          clickCount: 1.2,
        },
      });

      const stats = await emailService.getEmailStatistics('org-1');

      expect(stats.total).toBe(100);
      expect(stats.statusBreakdown.delivered).toBe(80);
      expect(stats.statusBreakdown.opened).toBe(60);
      expect(stats.averageOpenCount).toBe(2.5);
      expect(stats.averageClickCount).toBe(1.2);
    });
  });

  describe('Health Check', () => {
    it('should check service health', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ result: 1 }]);
      jest.spyOn(redis, 'ping').mockResolvedValueOnce('PONG');

      const health = await emailService.healthCheck();

      expect(health.sendgrid).toBe(true);
      expect(health.database).toBe(true);
      expect(health.redis).toBe(true);
    });
  });
});