/**
 * Email Service
 * Database-backed email delivery with templates, logging, and Redis caching
 */

import sgMail from '@sendgrid/mail';
import winston from 'winston';
import { PrismaClient, EmailTemplateType as PrismaEmailTemplateType, EmailDeliveryStatus } from '@prisma/client';
import Handlebars from 'handlebars';
import juice from 'juice';
import Redis from 'ioredis';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'email-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// Initialize Redis for caching
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '2'), // Use DB 2 for email caching
  retryStrategy: (times: number) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: Date) => {
  return new Date(date).toLocaleDateString();
});

Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
});

Handlebars.registerHelper('if_eq', function(a: any, b: any, options: any) {
  if (a === b) {
    return options.fn(this);
  }
  return options.inverse(this);
});

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  organizationId?: string;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

// Re-export the enum from Prisma
export const EmailTemplateType = PrismaEmailTemplateType;

export class EmailService {
  private readonly fromEmail: string;
  private readonly supportEmail: string;
  private readonly appName: string = 'OpenMeet';
  private readonly appUrl: string;
  private readonly cachePrefix = 'email:template:';
  private readonly cacheTTL = 3600; // 1 hour in seconds

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.warn('SendGrid API key not configured');
    } else {
      sgMail.setApiKey(apiKey);
    }

    this.fromEmail = process.env.FROM_EMAIL || 'noreply@openmeet.com';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@openmeet.com';
    this.appUrl = process.env.WEB_URL || 'http://localhost:3000';

    // Setup Redis error handling
    redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redis.on('connect', () => {
      logger.info('Redis connected for email template caching');
    });
  }

  /**
   * Send email with database logging
   */
  async sendEmail(
    template: EmailTemplate,
    options: EmailOptions
  ): Promise<boolean> {
    let emailLogId: string | undefined;

    try {
      // Create email log entry
      const emailLog = await prisma.emailLog.create({
        data: {
          organizationId: options.organizationId,
          to: Array.isArray(options.to) ? options.to.join(',') : options.to,
          from: this.fromEmail,
          cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : null,
          bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : null,
          replyTo: options.replyTo || this.supportEmail,
          subject: template.subject,
          status: EmailDeliveryStatus.pending,
          scheduledAt: options.scheduledAt,
          attachmentCount: options.attachments?.length || 0,
          metadata: options.metadata || {},
        },
      });

      emailLogId = emailLog.id;

      // Prepare SendGrid message
      const msg = {
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.appName,
        },
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent || this.htmlToText(template.htmlContent),
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo || this.supportEmail,
        attachments: options.attachments,
        sendAt: options.scheduledAt
          ? Math.floor(options.scheduledAt.getTime() / 1000)
          : undefined,
        customArgs: {
          ...options.metadata,
          emailLogId, // Track for webhook events
        },
      };

      // Send via SendGrid
      const [response] = await sgMail.send(msg);
      const messageId = response.headers['x-message-id'] || crypto.randomUUID();

      // Update email log with success
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: EmailDeliveryStatus.sent,
          messageId,
          sentAt: new Date(),
        },
      });

      logger.info('Email sent successfully', {
        emailLogId,
        to: options.to,
        subject: template.subject,
        messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);

      // Update email log with failure
      if (emailLogId) {
        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: EmailDeliveryStatus.failed,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: (error as any).code || null,
          },
        });
      }

      return false;
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(
    templateType: PrismaEmailTemplateType,
    recipients: Array<EmailOptions & { data: Record<string, any> }>,
    organizationId?: string
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const template = await this.getTemplateFromDatabase(
            templateType,
            recipient.data,
            organizationId || recipient.organizationId
          );
          return this.sendEmail(template, recipient);
        })
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          sent++;
        } else {
          failed++;
        }
      });

      // Add delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Bulk email send completed', { sent, failed });

    return { sent, failed };
  }

  /**
   * Get template from database with Redis caching
   */
  private async getTemplateFromDatabase(
    type: PrismaEmailTemplateType,
    data: Record<string, any>,
    organizationId?: string
  ): Promise<EmailTemplate> {
    const cacheKey = `${this.cachePrefix}${organizationId || 'default'}:${type}`;

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        const template = JSON.parse(cached);
        return this.renderTemplate(template, data);
      }
    } catch (error) {
      logger.warn('Cache retrieval failed:', error);
    }

    // Get from database
    let dbTemplate = await prisma.emailTemplate.findFirst({
      where: {
        type,
        organizationId,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    // Fallback to default template if organization-specific not found
    if (!dbTemplate && organizationId) {
      dbTemplate = await prisma.emailTemplate.findFirst({
        where: {
          type,
          isDefault: true,
          isActive: true,
        },
        orderBy: {
          version: 'desc',
        },
      });
    }

    // If still no template, create a default one
    if (!dbTemplate) {
      dbTemplate = await this.createDefaultTemplate(type);
    }

    // Update usage tracking
    await prisma.emailTemplate.update({
      where: { id: dbTemplate.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    // Cache the template
    try {
      await redis.setex(
        cacheKey,
        this.cacheTTL,
        JSON.stringify({
          subject: dbTemplate.subject,
          htmlBody: dbTemplate.htmlBody,
          textBody: dbTemplate.textBody,
        })
      );
    } catch (error) {
      logger.warn('Cache storage failed:', error);
    }

    return this.renderTemplate(
      {
        subject: dbTemplate.subject,
        htmlBody: dbTemplate.htmlBody,
        textBody: dbTemplate.textBody || undefined,
      },
      data
    );
  }

  /**
   * Render template with Handlebars
   */
  private renderTemplate(
    template: { subject: string; htmlBody: string; textBody?: string },
    data: Record<string, any>
  ): EmailTemplate {
    const context = {
      ...data,
      appName: this.appName,
      appUrl: this.appUrl,
      supportEmail: this.supportEmail,
      currentYear: new Date().getFullYear(),
    };

    const subjectTemplate = Handlebars.compile(template.subject);
    const htmlTemplate = Handlebars.compile(template.htmlBody);
    const textTemplate = template.textBody ? Handlebars.compile(template.textBody) : null;

    return {
      subject: subjectTemplate(context),
      htmlContent: this.applyEmailLayout(htmlTemplate(context)),
      textContent: textTemplate ? textTemplate(context) : undefined,
    };
  }

  /**
   * Apply base email layout
   */
  private applyEmailLayout(content: string): string {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 { color: #1a1a1a; }
            h2 { color: #4F46E5; }
            h3 { color: #6B7280; }
            a { color: #4F46E5; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6B7280;
            }
          </style>
        </head>
        <body>
          ${content}
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            <p>
              <a href="${this.appUrl}/unsubscribe">Unsubscribe</a> |
              <a href="${this.appUrl}/preferences">Email Preferences</a> |
              <a href="${this.appUrl}/help">Help</a>
            </p>
          </div>
        </body>
      </html>
    `;

    // Inline CSS for better email client compatibility
    return juice(html);
  }

  /**
   * Create default template in database
   */
  private async createDefaultTemplate(type: PrismaEmailTemplateType) {
    const templates = {
      [EmailTemplateType.welcome]: {
        subject: 'Welcome to {{appName}}!',
        htmlBody: `
          <h1>Welcome {{firstName}}!</h1>
          <p>Thank you for joining {{appName}}. We're excited to have you on board.</p>
          <p>Get started by recording your first meeting or uploading an audio file.</p>
          <a href="{{appUrl}}/dashboard" class="button">Go to Dashboard</a>
          <p>If you have any questions, feel free to contact us at {{supportEmail}}</p>
        `,
        variables: [
          { name: 'firstName', type: 'string', required: true },
        ],
      },
      [EmailTemplateType.email_verification]: {
        subject: 'Verify Your Email Address',
        htmlBody: `
          <h1>Verify Your Email</h1>
          <p>Please click the button below to verify your email address:</p>
          <a href="{{verificationUrl}}" class="button">Verify Email</a>
          <p>This link will expire in {{expiryHours}} hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        `,
        variables: [
          { name: 'verificationUrl', type: 'string', required: true },
          { name: 'expiryHours', type: 'number', required: true, defaultValue: '24' },
        ],
      },
      [EmailTemplateType.password_reset]: {
        subject: 'Reset Your Password',
        htmlBody: `
          <h1>Password Reset Request</h1>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="{{resetUrl}}" class="button">Reset Password</a>
          <p>This link will expire in {{expiryMinutes}} minutes.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        `,
        variables: [
          { name: 'resetUrl', type: 'string', required: true },
          { name: 'expiryMinutes', type: 'number', required: true, defaultValue: '30' },
        ],
      },
      [EmailTemplateType.meeting_invitation]: {
        subject: 'Meeting Invitation: {{meetingTitle}}',
        htmlBody: `
          <h1>You're Invited to a Meeting</h1>
          <h2>{{meetingTitle}}</h2>
          <p><strong>Host:</strong> {{hostName}}</p>
          <p><strong>Date & Time:</strong> {{formatDate scheduledAt}}</p>
          <a href="{{meetingUrl}}" class="button">Join Meeting</a>
          <p>This meeting will be recorded and transcribed by {{appName}}.</p>
        `,
        variables: [
          { name: 'meetingTitle', type: 'string', required: true },
          { name: 'hostName', type: 'string', required: true },
          { name: 'scheduledAt', type: 'date', required: true },
          { name: 'meetingUrl', type: 'string', required: true },
        ],
      },
      [EmailTemplateType.meeting_summary]: {
        subject: 'Meeting Summary: {{meetingTitle}}',
        htmlBody: `
          <h1>Meeting Summary</h1>
          <h2>{{meetingTitle}}</h2>
          <p><strong>Date:</strong> {{formatDate date}}</p>
          <p><strong>Duration:</strong> {{duration}} minutes</p>

          {{#if keyPoints}}
          <h3>Key Points</h3>
          <ul>
            {{#each keyPoints}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
          {{/if}}

          {{#if actionItems}}
          <h3>Action Items</h3>
          <ul>
            {{#each actionItems}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
          {{/if}}

          <a href="{{transcriptUrl}}" class="button">View Full Transcript</a>
        `,
        variables: [
          { name: 'meetingTitle', type: 'string', required: true },
          { name: 'date', type: 'date', required: true },
          { name: 'duration', type: 'number', required: true },
          { name: 'keyPoints', type: 'array', required: false },
          { name: 'actionItems', type: 'array', required: false },
          { name: 'transcriptUrl', type: 'string', required: true },
        ],
      },
      [EmailTemplateType.meeting_recording_ready]: {
        subject: 'Recording Ready: {{meetingTitle}}',
        htmlBody: `
          <h1>Your Meeting Recording is Ready</h1>
          <h2>{{meetingTitle}}</h2>
          <p>Your meeting recording has been processed and is now available.</p>
          <p><strong>Duration:</strong> {{duration}} minutes</p>
          <a href="{{recordingUrl}}" class="button" style="margin-right: 10px;">Watch Recording</a>
          <a href="{{transcriptUrl}}" class="button" style="background-color: #6B7280;">View Transcript</a>
        `,
        variables: [
          { name: 'meetingTitle', type: 'string', required: true },
          { name: 'duration', type: 'number', required: true },
          { name: 'recordingUrl', type: 'string', required: true },
          { name: 'transcriptUrl', type: 'string', required: true },
        ],
      },
      [EmailTemplateType.subscription_confirmation]: {
        subject: 'Subscription Confirmation',
        htmlBody: `
          <h1>Subscription Confirmed</h1>
          <p>Your subscription to {{plan}} has been confirmed.</p>
          <p><strong>Plan:</strong> {{plan}}</p>
          <p><strong>Price:</strong> {{formatCurrency price}}</p>
          <p><strong>Billing Cycle:</strong> {{billingCycle}}</p>
          <p><strong>Next Billing Date:</strong> {{formatDate nextBillingDate}}</p>
          <a href="{{appUrl}}/billing" class="button">Manage Subscription</a>
        `,
        variables: [
          { name: 'plan', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'billingCycle', type: 'string', required: true },
          { name: 'nextBillingDate', type: 'date', required: true },
        ],
      },
      [EmailTemplateType.team_invitation]: {
        subject: '{{inviterName}} invited you to join {{teamName}}',
        htmlBody: `
          <h1>Team Invitation</h1>
          <p>{{inviterName}} has invited you to join <strong>{{teamName}}</strong> on {{appName}}.</p>
          <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
          <p>This invitation will expire in 7 days.</p>
        `,
        variables: [
          { name: 'inviterName', type: 'string', required: true },
          { name: 'teamName', type: 'string', required: true },
          { name: 'invitationUrl', type: 'string', required: true },
        ],
      },
      [EmailTemplateType.weekly_digest]: {
        subject: 'Your Weekly Meeting Digest',
        htmlBody: `
          <h1>Weekly Digest</h1>
          <p><strong>Week of {{formatDate weekStart}} - {{formatDate weekEnd}}</strong></p>

          <h3>Meeting Statistics</h3>
          <ul>
            <li>Total Meetings: {{meetingsCount}}</li>
            <li>Total Duration: {{totalDuration}} minutes</li>
          </ul>

          {{#if topInsights}}
          <h3>Top Insights</h3>
          <ul>
            {{#each topInsights}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
          {{/if}}

          {{#if upcomingMeetings}}
          <h3>Upcoming Meetings</h3>
          <ul>
            {{#each upcomingMeetings}}
            <li>{{this.title}} - {{formatDate this.date}}</li>
            {{/each}}
          </ul>
          {{/if}}

          <a href="{{appUrl}}/analytics" class="button">View Full Analytics</a>
        `,
        variables: [
          { name: 'weekStart', type: 'date', required: true },
          { name: 'weekEnd', type: 'date', required: true },
          { name: 'meetingsCount', type: 'number', required: true },
          { name: 'totalDuration', type: 'number', required: true },
          { name: 'topInsights', type: 'array', required: false },
          { name: 'upcomingMeetings', type: 'array', required: false },
        ],
      },
      [EmailTemplateType.quota_warning]: {
        subject: 'Storage Quota Warning',
        htmlBody: `
          <h1>Storage Quota Warning</h1>
          <p>You're approaching your storage quota limit.</p>
          <p><strong>Used:</strong> {{used}} GB</p>
          <p><strong>Limit:</strong> {{limit}} GB</p>
          <p><strong>Usage:</strong> {{percentage}}%</p>
          <a href="{{upgradeUrl}}" class="button">Upgrade Plan</a>
          <p>Need help? Contact us at {{supportEmail}}</p>
        `,
        variables: [
          { name: 'used', type: 'number', required: true },
          { name: 'limit', type: 'number', required: true },
          { name: 'percentage', type: 'number', required: true },
          { name: 'upgradeUrl', type: 'string', required: true },
        ],
      },
      [EmailTemplateType.security_alert]: {
        subject: 'Security Alert: {{alertType}}',
        htmlBody: `
          <h1>Security Alert</h1>
          <p><strong>Alert Type:</strong> {{alertType}}</p>
          <p>{{description}}</p>
          {{#if ipAddress}}
          <p><strong>IP Address:</strong> {{ipAddress}}</p>
          {{/if}}
          {{#if userAgent}}
          <p><strong>Device:</strong> {{userAgent}}</p>
          {{/if}}
          <p><strong>Time:</strong> {{formatDate timestamp}}</p>
          <p>If this wasn't you, please secure your account immediately.</p>
          <a href="{{appUrl}}/security" class="button">Review Security Settings</a>
        `,
        variables: [
          { name: 'alertType', type: 'string', required: true },
          { name: 'description', type: 'string', required: true },
          { name: 'ipAddress', type: 'string', required: false },
          { name: 'userAgent', type: 'string', required: false },
          { name: 'timestamp', type: 'date', required: true },
        ],
      },
    };

    const templateConfig = templates[type] || {
      subject: '{{appName}} Notification',
      htmlBody: '<h1>Notification</h1><p>This is a notification from {{appName}}.</p>',
      variables: [],
    };

    return await prisma.emailTemplate.create({
      data: {
        type,
        name: `Default ${type.replace(/_/g, ' ')} Template`,
        subject: templateConfig.subject,
        htmlBody: templateConfig.htmlBody,
        textBody: this.htmlToText(templateConfig.htmlBody),
        isDefault: true,
        isActive: true,
        variables: templateConfig.variables,
      },
    });
  }

  /**
   * Save or update template
   */
  async saveTemplate(
    type: PrismaEmailTemplateType,
    template: {
      subject: string;
      htmlBody: string;
      textBody?: string;
      variables?: any[];
    },
    organizationId?: string
  ): Promise<string> {
    // Invalidate cache
    const cacheKey = `${this.cachePrefix}${organizationId || 'default'}:${type}`;
    await redis.del(cacheKey);

    // Check if template exists
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        type,
        organizationId,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (existing) {
      // Create new version
      const newTemplate = await prisma.emailTemplate.create({
        data: {
          type,
          organizationId,
          name: existing.name,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          variables: template.variables || [],
          version: existing.version + 1,
          isDefault: false,
          isActive: true,
        },
      });

      // Deactivate old version
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: { isActive: false },
      });

      logger.info('Template updated', {
        templateId: newTemplate.id,
        type,
        version: newTemplate.version,
        organizationId,
      });

      return newTemplate.id;
    } else {
      // Create new template
      const newTemplate = await prisma.emailTemplate.create({
        data: {
          type,
          organizationId,
          name: `${type.replace(/_/g, ' ')} Template`,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          variables: template.variables || [],
          version: 1,
          isDefault: false,
          isActive: true,
        },
      });

      logger.info('Template created', {
        templateId: newTemplate.id,
        type,
        organizationId,
      });

      return newTemplate.id;
    }
  }

  /**
   * Process SendGrid webhook events
   */
  async processWebhookEvent(event: any): Promise<void> {
    try {
      const { emailLogId, sg_message_id, event: eventType, timestamp } = event;

      // Find email log by custom arg or message ID
      const emailLog = await prisma.emailLog.findFirst({
        where: {
          OR: [
            { id: emailLogId },
            { messageId: sg_message_id },
          ],
        },
      });

      if (!emailLog) {
        logger.warn('Email log not found for webhook event', { event });
        return;
      }

      // Update status based on event
      const statusUpdates: Partial<Record<string, EmailDeliveryStatus>> = {
        processed: EmailDeliveryStatus.sent,
        delivered: EmailDeliveryStatus.delivered,
        open: EmailDeliveryStatus.opened,
        click: EmailDeliveryStatus.clicked,
        bounce: EmailDeliveryStatus.bounced,
        dropped: EmailDeliveryStatus.failed,
        deferred: EmailDeliveryStatus.failed,
        unsubscribe: EmailDeliveryStatus.unsubscribed,
        spamreport: EmailDeliveryStatus.spam_reported,
      };

      const newStatus = statusUpdates[eventType];

      const updateData: any = {
        webhookEvents: {
          push: event,
        },
      };

      if (newStatus) {
        updateData.status = newStatus;
      }

      // Update specific timestamps and counts
      switch (eventType) {
        case 'delivered':
          updateData.deliveredAt = new Date(timestamp * 1000);
          break;
        case 'open':
          updateData.openCount = { increment: 1 };
          if (!emailLog.firstOpenedAt) {
            updateData.firstOpenedAt = new Date(timestamp * 1000);
          }
          updateData.openedAt = new Date(timestamp * 1000);
          break;
        case 'click':
          updateData.clickCount = { increment: 1 };
          if (event.url) {
            updateData.uniqueClickCount = { increment: 1 };
          }
          updateData.clickedAt = new Date(timestamp * 1000);
          break;
        case 'bounce':
          updateData.bouncedAt = new Date(timestamp * 1000);
          updateData.bounceType = event.type || 'unknown';
          updateData.error = event.reason || 'Email bounced';
          break;
        case 'unsubscribe':
          updateData.unsubscribedAt = new Date(timestamp * 1000);
          break;
        case 'spamreport':
          updateData.spamReportedAt = new Date(timestamp * 1000);
          break;
      }

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: updateData,
      });

      // Store webhook event
      await prisma.emailWebhookEvent.create({
        data: {
          emailLogId: emailLog.id,
          event: eventType,
          messageId: sg_message_id,
          timestamp: new Date(timestamp * 1000),
          email: event.email,
          ipAddress: event.ip,
          userAgent: event.useragent,
          url: event.url,
          category: event.category,
          rawEvent: event,
        },
      });

      logger.info('Webhook event processed', {
        emailLogId: emailLog.id,
        event: eventType,
        messageId: sg_message_id,
      });
    } catch (error) {
      logger.error('Failed to process webhook event:', error);
    }
  }

  // Convenience methods for specific email types

  async sendWelcomeEmail(
    email: string,
    firstName: string,
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.welcome,
      { firstName },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    organizationId?: string
  ): Promise<boolean> {
    const verificationUrl = `${this.appUrl}/verify-email?token=${verificationToken}`;

    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.email_verification,
      {
        verificationUrl,
        expiryHours: 24,
      },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    organizationId?: string
  ): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;

    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.password_reset,
      {
        resetUrl,
        expiryMinutes: 30,
      },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendMeetingInvitation(
    email: string,
    meeting: {
      title: string;
      scheduledAt: Date;
      meetingUrl: string;
      hostName: string;
    },
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.meeting_invitation,
      {
        meetingTitle: meeting.title,
        scheduledAt: meeting.scheduledAt,
        meetingUrl: meeting.meetingUrl,
        hostName: meeting.hostName,
      },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendMeetingSummary(
    email: string,
    summary: {
      meetingTitle: string;
      date: Date;
      duration: number;
      keyPoints: string[];
      actionItems: string[];
      transcriptUrl: string;
    },
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.meeting_summary,
      {
        meetingTitle: summary.meetingTitle,
        date: summary.date,
        duration: Math.floor(summary.duration / 60),
        keyPoints: summary.keyPoints,
        actionItems: summary.actionItems,
        transcriptUrl: summary.transcriptUrl,
      },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendRecordingReadyEmail(
    email: string,
    recording: {
      meetingTitle: string;
      recordingUrl: string;
      transcriptUrl: string;
      duration: number;
    },
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.meeting_recording_ready,
      {
        meetingTitle: recording.meetingTitle,
        recordingUrl: recording.recordingUrl,
        transcriptUrl: recording.transcriptUrl,
        duration: Math.floor(recording.duration / 60),
      },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendSubscriptionConfirmation(
    email: string,
    subscription: {
      plan: string;
      price: number;
      billingCycle: string;
      nextBillingDate: Date;
    },
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.subscription_confirmation,
      subscription,
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendTeamInvitation(
    email: string,
    invitation: {
      inviterName: string;
      teamName: string;
      invitationToken: string;
    },
    organizationId?: string
  ): Promise<boolean> {
    const invitationUrl = `${this.appUrl}/join-team?token=${invitation.invitationToken}`;

    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.team_invitation,
      {
        inviterName: invitation.inviterName,
        teamName: invitation.teamName,
        invitationUrl,
      },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendWeeklyDigest(
    email: string,
    digest: {
      weekStart: Date;
      weekEnd: Date;
      meetingsCount: number;
      totalDuration: number;
      topInsights: string[];
      upcomingMeetings: Array<{
        title: string;
        date: Date;
      }>;
    },
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.weekly_digest,
      digest,
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendQuotaWarning(
    email: string,
    quota: {
      used: number;
      limit: number;
      percentage: number;
      upgradeUrl: string;
    },
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.quota_warning,
      quota,
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  async sendSecurityAlert(
    email: string,
    alert: {
      type: string;
      description: string;
      ipAddress?: string;
      userAgent?: string;
      timestamp: Date;
    },
    organizationId?: string
  ): Promise<boolean> {
    const template = await this.getTemplateFromDatabase(
      EmailTemplateType.security_alert,
      {
        alertType: alert.type,
        description: alert.description,
        ipAddress: alert.ipAddress,
        userAgent: alert.userAgent,
        timestamp: alert.timestamp,
      },
      organizationId
    );

    return this.sendEmail(template, { to: email, organizationId });
  }

  /**
   * Get email statistics
   */
  async getEmailStatistics(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalEmails, statusCounts] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
      }),
    ]);

    const metrics = await prisma.emailLog.aggregate({
      where: {
        ...where,
        status: EmailDeliveryStatus.opened,
      },
      _avg: {
        openCount: true,
        clickCount: true,
      },
    });

    return {
      total: totalEmails,
      statusBreakdown: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      averageOpenCount: metrics._avg.openCount || 0,
      averageClickCount: metrics._avg.clickCount || 0,
    };
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ sendgrid: boolean; database: boolean; redis: boolean }> {
    const health = {
      sendgrid: false,
      database: false,
      redis: false,
    };

    try {
      // Check SendGrid
      if (process.env.SENDGRID_API_KEY) {
        health.sendgrid = true;
      }

      // Check database
      await prisma.$queryRaw`SELECT 1`;
      health.database = true;

      // Check Redis
      await redis.ping();
      health.redis = true;
    } catch (error) {
      logger.error('Health check failed:', error);
    }

    return health;
  }

  /**
   * Clear template cache
   */
  async clearTemplateCache(organizationId?: string): Promise<void> {
    const pattern = organizationId
      ? `${this.cachePrefix}${organizationId}:*`
      : `${this.cachePrefix}*`;

    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Template cache cleared', {
        organizationId,
        keysCleared: keys.length
      });
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await redis.quit();
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const emailService = new EmailService();