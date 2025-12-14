/**
 * SMS Service
 * Twilio-based SMS delivery with real database logging and pricing API
 */

import twilio from 'twilio';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'sms-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export interface SMSOptions {
  to: string | string[];
  from?: string;
  mediaUrl?: string[];
  statusCallback?: string;
  metadata?: Record<string, any>;
  organizationId?: string;
  userId?: string;
}

export enum SMSTemplateType {
  VERIFICATION_CODE = 'verification_code',
  PASSWORD_RESET = 'password_reset',
  MEETING_REMINDER = 'meeting_reminder',
  MEETING_STARTED = 'meeting_started',
  RECORDING_READY = 'recording_ready',
  SECURITY_ALERT = 'security_alert',
  QUOTA_WARNING = 'quota_warning',
  PAYMENT_REMINDER = 'payment_reminder',
}

export class SmsService {
  private twilioClient: twilio.Twilio | null = null;
  private fromNumber: string;
  private readonly appName: string = 'OpenMeet';
  private readonly appUrl: string;
  private readonly pricingCacheTTL = 86400; // 24 hours in seconds

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    } else {
      logger.warn('Twilio credentials not configured');
    }

    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.appUrl = process.env.WEB_URL || 'http://localhost:3000';
  }

  /**
   * Send SMS message with database logging and cost tracking
   */
  async sendSMS(
    message: string,
    options: SMSOptions
  ): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        logger.error('Twilio client not initialized');
        return false;
      }

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const fromNumber = options.from || this.fromNumber;

      for (const recipient of recipients) {
        try {
          const formattedNumber = this.formatPhoneNumber(recipient);

          // Get pricing for this destination
          const pricing = await this.getRealTimePricing(formattedNumber);
          const segments = this.calculateSegments(message);
          const estimatedCost = pricing ? pricing.pricePerSms * segments : 0;

          // Create SMS log entry before sending
          const smsLog = await prisma.sMSLog.create({
            data: {
              organizationId: options.organizationId,
              userId: options.userId,
              to: formattedNumber,
              from: fromNumber,
              message: message.substring(0, 160), // Store truncated for privacy
              status: 'pending',
              direction: 'outbound',
              segments,
              cost: estimatedCost,
              countryCode: pricing?.countryCode,
              metadata: options.metadata || {},
            },
          });

          // Send via Twilio
          const result = await this.twilioClient.messages.create({
            body: message,
            from: fromNumber,
            to: formattedNumber,
            mediaUrl: options.mediaUrl,
            statusCallback: options.statusCallback || `${this.appUrl}/api/webhooks/sms/status`,
          });

          // Update log with success
          await prisma.sMSLog.update({
            where: { id: smsLog.id },
            data: {
              messageId: result.sid,
              status: 'sent',
              cost: result.price ? parseFloat(result.price) : estimatedCost,
              deliveredAt: new Date(),
            },
          });

          logger.info('SMS sent successfully', {
            to: formattedNumber,
            messageId: result.sid,
            segments,
            cost: result.price || estimatedCost,
          });

          // Update organization usage metrics if organizationId provided
          if (options.organizationId) {
            await this.updateUsageMetrics(options.organizationId, {
              smsCount: 1,
              smsCost: result.price ? parseFloat(result.price) : estimatedCost,
            });
          }

        } catch (error) {
          logger.error('Failed to send SMS to recipient:', { recipient, error });

          // Log failure to database
          await prisma.sMSLog.create({
            data: {
              organizationId: options.organizationId,
              userId: options.userId,
              to: recipient,
              from: fromNumber,
              message: message.substring(0, 160),
              status: 'failed',
              direction: 'outbound',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              failedAt: new Date(),
              metadata: options.metadata || {},
            },
          });
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      return false;
    }
  }

  /**
   * Send bulk SMS messages with batch processing
   */
  async sendBulkSMS(
    message: string,
    recipients: string[],
    options?: Partial<SMSOptions>
  ): Promise<{ sent: number; failed: number; totalCost: number }> {
    let sent = 0;
    let failed = 0;
    let totalCost = 0;

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const success = await this.sendSMS(message, {
            ...options,
            to: recipient
          });

          if (success) {
            // Get cost from database
            const log = await prisma.sMSLog.findFirst({
              where: {
                to: this.formatPhoneNumber(recipient),
                status: 'sent',
              },
              orderBy: { createdAt: 'desc' },
            });

            return { success: true, cost: log?.cost || 0 };
          }

          return { success: false, cost: 0 };
        })
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          sent++;
          totalCost += result.value.cost;
        } else {
          failed++;
        }
      });

      // Add delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Bulk SMS send completed', { sent, failed, totalCost });

    return { sent, failed, totalCost };
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(
    phoneNumber: string,
    code: string,
    userId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.VERIFICATION_CODE, { code });
    return this.sendSMS(message, { to: phoneNumber, userId });
  }

  /**
   * Send password reset code
   */
  async sendPasswordResetCode(
    phoneNumber: string,
    code: string,
    userId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.PASSWORD_RESET, { code });
    return this.sendSMS(message, { to: phoneNumber, userId });
  }

  /**
   * Send meeting reminder
   */
  async sendMeetingReminder(
    phoneNumber: string,
    meeting: {
      title: string;
      startTime: Date;
      meetingUrl?: string;
    },
    organizationId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.MEETING_REMINDER, {
      title: meeting.title,
      time: meeting.startTime.toLocaleTimeString(),
      url: meeting.meetingUrl,
    });

    return this.sendSMS(message, { to: phoneNumber, organizationId });
  }

  /**
   * Send meeting started notification
   */
  async sendMeetingStartedNotification(
    phoneNumber: string,
    meeting: {
      title: string;
      joinUrl: string;
    },
    organizationId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.MEETING_STARTED, {
      title: meeting.title,
      url: meeting.joinUrl,
    });

    return this.sendSMS(message, { to: phoneNumber, organizationId });
  }

  /**
   * Send recording ready notification
   */
  async sendRecordingReadyNotification(
    phoneNumber: string,
    recording: {
      meetingTitle: string;
      viewUrl: string;
    },
    organizationId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.RECORDING_READY, {
      title: recording.meetingTitle,
      url: recording.viewUrl,
    });

    return this.sendSMS(message, { to: phoneNumber, organizationId });
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    phoneNumber: string,
    alert: {
      type: string;
      description: string;
    },
    userId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.SECURITY_ALERT, {
      type: alert.type,
      description: alert.description,
    });

    return this.sendSMS(message, { to: phoneNumber, userId });
  }

  /**
   * Send quota warning
   */
  async sendQuotaWarning(
    phoneNumber: string,
    quota: {
      used: number;
      limit: number;
      percentage: number;
    },
    organizationId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.QUOTA_WARNING, {
      percentage: quota.percentage,
      used: quota.used,
      limit: quota.limit,
    });

    return this.sendSMS(message, { to: phoneNumber, organizationId });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(
    phoneNumber: string,
    payment: {
      amount: number;
      dueDate: Date;
    },
    organizationId?: string
  ): Promise<boolean> {
    const message = this.getTemplate(SMSTemplateType.PAYMENT_REMINDER, {
      amount: payment.amount,
      dueDate: payment.dueDate.toLocaleDateString(),
    });

    return this.sendSMS(message, { to: phoneNumber, organizationId });
  }

  /**
   * Get user phone number from database
   */
  async getUserPhoneNumber(userId: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          metadata: true,
        },
      });

      if (!user) {
        logger.warn('User not found', { userId });
        return null;
      }

      // Check metadata for phone number (stored in JSON field)
      const metadata = user.metadata as any;
      const phoneNumber = metadata?.phoneNumber || metadata?.phone;

      if (!phoneNumber) {
        logger.info('No phone number found for user', { userId });
        return null;
      }

      return phoneNumber;
    } catch (error) {
      logger.error('Failed to get user phone number:', { userId, error });
      return null;
    }
  }

  /**
   * Get users by phone numbers (for bulk operations)
   */
  async getUsersByPhoneNumbers(phoneNumbers: string[]): Promise<Map<string, string>> {
    try {
      // Format all phone numbers
      const formattedNumbers = phoneNumbers.map(num => this.formatPhoneNumber(num));

      // Query users with phone numbers in metadata
      const users = await prisma.user.findMany({
        where: {
          OR: formattedNumbers.map(phone => ({
            metadata: {
              path: ['phoneNumber'],
              equals: phone,
            },
          })),
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      // Create map of phone -> userId
      const phoneToUserId = new Map<string, string>();

      users.forEach(user => {
        const metadata = user.metadata as any;
        const phone = metadata?.phoneNumber || metadata?.phone;
        if (phone) {
          phoneToUserId.set(this.formatPhoneNumber(phone), user.id);
        }
      });

      return phoneToUserId;
    } catch (error) {
      logger.error('Failed to get users by phone numbers:', error);
      return new Map();
    }
  }

  /**
   * Get SMS template
   */
  private getTemplate(
    type: SMSTemplateType,
    data: Record<string, any>
  ): string {
    const templates: Record<SMSTemplateType, (data: any) => string> = {
      [SMSTemplateType.VERIFICATION_CODE]: (data) =>
        `${this.appName}: Your verification code is ${data.code}. Valid for 10 minutes.`,

      [SMSTemplateType.PASSWORD_RESET]: (data) =>
        `${this.appName}: Your password reset code is ${data.code}. Valid for 30 minutes.`,

      [SMSTemplateType.MEETING_REMINDER]: (data) =>
        `${this.appName}: Meeting "${data.title}" starts at ${data.time}. ${data.url ? `Join: ${data.url}` : ''}`,

      [SMSTemplateType.MEETING_STARTED]: (data) =>
        `${this.appName}: Meeting "${data.title}" has started. Join now: ${data.url}`,

      [SMSTemplateType.RECORDING_READY]: (data) =>
        `${this.appName}: Recording for "${data.title}" is ready. View: ${data.url}`,

      [SMSTemplateType.SECURITY_ALERT]: (data) =>
        `${this.appName} Security Alert: ${data.type}. ${data.description}`,

      [SMSTemplateType.QUOTA_WARNING]: (data) =>
        `${this.appName}: You've used ${data.percentage}% of your quota (${data.used}/${data.limit}). Upgrade to continue.`,

      [SMSTemplateType.PAYMENT_REMINDER]: (data) =>
        `${this.appName}: Payment of $${data.amount} is due on ${data.dueDate}. Update billing to avoid service interruption.`,
    };

    return templates[type](data);
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if not present (assuming US for now)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }

    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate phone number
   */
  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        return false;
      }

      const formatted = this.formatPhoneNumber(phoneNumber);
      const lookup = await this.twilioClient.lookups.v1
        .phoneNumbers(formatted)
        .fetch();

      return lookup.phoneNumber !== null;
    } catch (error) {
      logger.error('Phone number validation failed:', error);
      return false;
    }
  }

  /**
   * Get SMS status from Twilio
   */
  async getSMSStatus(messageSid: string): Promise<string | null> {
    try {
      if (!this.twilioClient) {
        return null;
      }

      const message = await this.twilioClient.messages(messageSid).fetch();

      // Update database with latest status
      await prisma.sMSLog.updateMany({
        where: { messageId: messageSid },
        data: {
          status: message.status,
          deliveredAt: message.status === 'delivered' ? new Date() : undefined,
          failedAt: message.status === 'failed' || message.status === 'undelivered' ? new Date() : undefined,
          errorCode: message.errorCode?.toString(),
          errorMessage: message.errorMessage,
        },
      });

      return message.status;
    } catch (error) {
      logger.error('Failed to get SMS status:', error);
      return null;
    }
  }

  /**
   * Handle SMS status webhook from Twilio
   */
  async handleStatusWebhook(data: {
    MessageSid: string;
    MessageStatus: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    Price?: string;
    PriceUnit?: string;
  }): Promise<void> {
    try {
      const updateData: any = {
        status: data.MessageStatus,
      };

      if (data.MessageStatus === 'delivered') {
        updateData.deliveredAt = new Date();
      } else if (data.MessageStatus === 'failed' || data.MessageStatus === 'undelivered') {
        updateData.failedAt = new Date();
        updateData.errorCode = data.ErrorCode;
        updateData.errorMessage = data.ErrorMessage;
      }

      if (data.Price) {
        updateData.cost = Math.abs(parseFloat(data.Price));
        updateData.currency = data.PriceUnit || 'USD';
      }

      await prisma.sMSLog.updateMany({
        where: { messageId: data.MessageSid },
        data: updateData,
      });

      logger.info('SMS status updated', {
        messageId: data.MessageSid,
        status: data.MessageStatus,
      });
    } catch (error) {
      logger.error('Failed to handle status webhook:', error);
    }
  }

  /**
   * Get delivery report from database
   */
  async getDeliveryReport(
    startDate: Date,
    endDate: Date,
    organizationId?: string
  ): Promise<Array<{
    to: string;
    status: string;
    dateSent: Date;
    cost: number;
    errorCode?: string;
    errorMessage?: string;
  }>> {
    try {
      const logs = await prisma.sMSLog.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          direction: 'outbound',
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      return logs.map(log => ({
        to: log.to,
        status: log.status,
        dateSent: log.createdAt,
        cost: log.cost,
        errorCode: log.errorCode || undefined,
        errorMessage: log.errorMessage || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get delivery report:', error);
      return [];
    }
  }

  /**
   * Handle incoming SMS webhook
   */
  async handleIncomingSMS(data: {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
  }): Promise<void> {
    try {
      logger.info('Incoming SMS received', {
        from: data.From,
        to: data.To,
        messageId: data.MessageSid,
      });

      // Log incoming message to database
      await prisma.sMSLog.create({
        data: {
          to: data.To,
          from: data.From,
          message: data.Body.substring(0, 160),
          messageId: data.MessageSid,
          status: 'received',
          direction: 'inbound',
          segments: this.calculateSegments(data.Body),
        },
      });

      // Process incoming message based on content
      const body = data.Body.toLowerCase().trim();

      if (body === 'stop' || body === 'unsubscribe') {
        // Handle unsubscribe
        await this.handleUnsubscribe(data.From);
      } else if (body === 'help') {
        // Send help message
        await this.sendSMS(
          `${this.appName} Help: Reply STOP to unsubscribe. Visit ${this.appUrl}/help for more info.`,
          { to: data.From }
        );
      }
    } catch (error) {
      logger.error('Failed to handle incoming SMS:', error);
    }
  }

  /**
   * Handle unsubscribe request
   */
  private async handleUnsubscribe(phoneNumber: string): Promise<void> {
    try {
      // Find user by phone number and update preferences
      const users = await this.getUsersByPhoneNumbers([phoneNumber]);
      const userId = users.get(this.formatPhoneNumber(phoneNumber));

      if (userId) {
        // Update user preferences to disable SMS notifications
        await prisma.user.update({
          where: { id: userId },
          data: {
            preferences: {
              ...(await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } }))?.preferences as any,
              smsNotifications: false,
            },
          },
        });

        logger.info('User unsubscribed from SMS', { userId, phoneNumber });
      }

      // Send confirmation
      await this.sendSMS(
        `${this.appName}: You've been unsubscribed from SMS notifications.`,
        { to: phoneNumber }
      );
    } catch (error) {
      logger.error('Failed to handle unsubscribe:', error);
    }
  }

  /**
   * Calculate SMS segments
   */
  calculateSegments(message: string): number {
    const length = message.length;

    // GSM 7-bit encoding
    if (this.isGSM7Bit(message)) {
      if (length <= 160) return 1;
      return Math.ceil(length / 153);
    }

    // Unicode encoding
    if (length <= 70) return 1;
    return Math.ceil(length / 67);
  }

  /**
   * Check if message uses GSM 7-bit encoding
   */
  private isGSM7Bit(message: string): boolean {
    const gsm7BitChars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/0-9:;<=>?¡A-Z\[\\Ñ§¿a-z{|}~\]ÄÖÜäöüàÀ€]*$/;
    return gsm7BitChars.test(message);
  }

  /**
   * Get real-time pricing from Twilio API with caching
   */
  async getRealTimePricing(phoneNumber: string): Promise<{
    countryCode: string;
    pricePerSms: number;
  } | null> {
    try {
      if (!this.twilioClient) {
        return null;
      }

      const formatted = this.formatPhoneNumber(phoneNumber);

      // Check Redis cache first
      const cacheKey = `sms_pricing:${formatted.substring(0, 4)}`; // Cache by country code
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Lookup phone number to get country
      const lookup = await this.twilioClient.lookups.v1
        .phoneNumbers(formatted)
        .fetch({ type: ['carrier'] });

      const countryCode = lookup.countryCode;

      // Check database cache
      const dbCache = await prisma.sMSPricing.findFirst({
        where: {
          countryCode,
          expiresAt: { gt: new Date() },
        },
      });

      if (dbCache) {
        const pricing = {
          countryCode: dbCache.countryCode,
          pricePerSms: dbCache.pricePerSms,
        };

        // Cache in Redis
        await redis.setex(cacheKey, this.pricingCacheTTL, JSON.stringify(pricing));

        return pricing;
      }

      // Fetch from Twilio Pricing API
      const pricingInfo = await this.twilioClient.pricing.v2
        .countries(countryCode)
        .fetch();

      // Get SMS pricing - use voice pricing as fallback since messaging API varies
      // Default to estimated pricing based on country
      const pricePerSms = this.getEstimatedPriceByCountry(countryCode);

      // Store in database
      await prisma.sMSPricing.upsert({
        where: { countryCode },
        update: {
          countryName: pricingInfo.country,
          pricePerSms,
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + this.pricingCacheTTL * 1000),
        },
        create: {
          countryCode,
          countryName: pricingInfo.country,
          pricePerSms,
          expiresAt: new Date(Date.now() + this.pricingCacheTTL * 1000),
        },
      });

      const pricing = { countryCode, pricePerSms };

      // Cache in Redis
      await redis.setex(cacheKey, this.pricingCacheTTL, JSON.stringify(pricing));

      return pricing;
    } catch (error) {
      logger.error('Failed to get real-time pricing:', error);

      // Fallback to default pricing
      return {
        countryCode: 'US',
        pricePerSms: 0.0075, // Default US pricing
      };
    }
  }

  /**
   * Get estimated price by country code
   */
  private getEstimatedPriceByCountry(countryCode: string): number {
    const pricing: Record<string, number> = {
      US: 0.0075, CA: 0.0075, GB: 0.04, DE: 0.09, FR: 0.08,
      AU: 0.045, JP: 0.07, IN: 0.01, BR: 0.04, MX: 0.03,
    };
    return pricing[countryCode] || 0.05; // Default international rate
  }

  /**
   * Update organization usage metrics
   */
  private async updateUsageMetrics(
    organizationId: string,
    metrics: {
      smsCount: number;
      smsCost: number;
    }
  ): Promise<void> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Find existing SMS count metric or create new one
      const existingSmsMetric = await prisma.usageMetric.findFirst({
        where: {
          organizationId,
          metricType: 'sms_sent',
          periodStart,
          periodEnd,
        },
      });

      if (existingSmsMetric) {
        await prisma.usageMetric.update({
          where: { id: existingSmsMetric.id },
          data: { metricValue: existingSmsMetric.metricValue + BigInt(metrics.smsCount) },
        });
      } else {
        await prisma.usageMetric.create({
          data: {
            organizationId,
            metricType: 'sms_sent',
            metricValue: metrics.smsCount,
            periodStart,
            periodEnd,
          },
        });
      }

      // Find existing SMS cost metric or create new one
      const existingCostMetric = await prisma.usageMetric.findFirst({
        where: {
          organizationId,
          metricType: 'sms_cost',
          periodStart,
          periodEnd,
        },
      });

      const costInCents = Math.round(metrics.smsCost * 100);
      if (existingCostMetric) {
        await prisma.usageMetric.update({
          where: { id: existingCostMetric.id },
          data: { metricValue: existingCostMetric.metricValue + BigInt(costInCents) },
        });
      } else {
        await prisma.usageMetric.create({
          data: {
            organizationId,
            metricType: 'sms_cost',
            metricValue: costInCents,
            periodStart,
            periodEnd,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to update usage metrics:', error);
    }
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStatistics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalCost: number;
    byCountry: Record<string, { count: number; cost: number }>;
  }> {
    try {
      const logs = await prisma.sMSLog.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          direction: 'outbound',
        },
      });

      const stats = {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalCost: 0,
        byCountry: {} as Record<string, { count: number; cost: number }>,
      };

      logs.forEach(log => {
        stats.totalSent++;
        stats.totalCost += log.cost;

        if (log.status === 'delivered') {
          stats.totalDelivered++;
        } else if (log.status === 'failed' || log.status === 'undelivered') {
          stats.totalFailed++;
        }

        if (log.countryCode) {
          if (!stats.byCountry[log.countryCode]) {
            stats.byCountry[log.countryCode] = { count: 0, cost: 0 };
          }
          stats.byCountry[log.countryCode].count++;
          stats.byCountry[log.countryCode].cost += log.cost;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get usage statistics:', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalCost: 0,
        byCountry: {},
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        logger.warn('Twilio client not initialized');
        return false;
      }

      // Test API connection
      await this.twilioClient.api.accounts.list({ limit: 1 });

      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      // Test Redis connection
      await redis.ping();

      return true;
    } catch (error) {
      logger.error('SMS service health check failed:', error);
      return false;
    }
  }
}