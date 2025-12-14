#!/usr/bin/env node
/**
 * Seed Email Templates
 * Initialize default email templates in the database
 */

import { PrismaClient, EmailTemplateType } from '@prisma/client';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

interface TemplateData {
  subject: string;
  htmlBody: string;
  variables: any[];
}

const defaultTemplates: Record<EmailTemplateType, TemplateData> = {
  [EmailTemplateType.welcome]: {
    subject: 'Welcome to {{appName}}!',
    htmlBody: `
      <h1>Welcome {{firstName}}!</h1>
      <p>Thank you for joining {{appName}}. We're excited to have you on board.</p>
      <p>Here's what you can do to get started:</p>
      <ul>
        <li>Record your first meeting</li>
        <li>Upload an existing recording</li>
        <li>Invite team members</li>
      </ul>
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
      <p>Thank you for signing up! Please click the button below to verify your email address:</p>
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
      <p>For security reasons, this link can only be used once.</p>
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
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0;"><strong>Host:</strong></td>
          <td>{{hostName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Date & Time:</strong></td>
          <td>{{formatDate scheduledAt}}</td>
        </tr>
        {{#if duration}}
        <tr>
          <td style="padding: 8px 0;"><strong>Duration:</strong></td>
          <td>{{duration}} minutes</td>
        </tr>
        {{/if}}
      </table>
      <a href="{{meetingUrl}}" class="button">Join Meeting</a>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">This meeting will be recorded and transcribed by {{appName}}.</p>
    `,
    variables: [
      { name: 'meetingTitle', type: 'string', required: true },
      { name: 'hostName', type: 'string', required: true },
      { name: 'scheduledAt', type: 'date', required: true },
      { name: 'meetingUrl', type: 'string', required: true },
      { name: 'duration', type: 'number', required: false },
    ],
  },
  [EmailTemplateType.meeting_summary]: {
    subject: 'Meeting Summary: {{meetingTitle}}',
    htmlBody: `
      <h1>Meeting Summary</h1>
      <h2>{{meetingTitle}}</h2>
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0;"><strong>Date:</strong></td>
          <td>{{formatDate date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Duration:</strong></td>
          <td>{{duration}} minutes</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Participants:</strong></td>
          <td>{{participantCount}}</td>
        </tr>
      </table>

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

      {{#if decisions}}
      <h3>Decisions Made</h3>
      <ul>
        {{#each decisions}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}

      <div style="margin-top: 30px;">
        <a href="{{transcriptUrl}}" class="button">View Full Transcript</a>
        {{#if recordingUrl}}
        <a href="{{recordingUrl}}" class="button" style="margin-left: 10px; background-color: #6B7280;">Watch Recording</a>
        {{/if}}
      </div>
    `,
    variables: [
      { name: 'meetingTitle', type: 'string', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'duration', type: 'number', required: true },
      { name: 'participantCount', type: 'number', required: false },
      { name: 'keyPoints', type: 'array', required: false },
      { name: 'actionItems', type: 'array', required: false },
      { name: 'decisions', type: 'array', required: false },
      { name: 'transcriptUrl', type: 'string', required: true },
      { name: 'recordingUrl', type: 'string', required: false },
    ],
  },
  [EmailTemplateType.meeting_recording_ready]: {
    subject: 'Recording Ready: {{meetingTitle}}',
    htmlBody: `
      <h1>Your Meeting Recording is Ready</h1>
      <h2>{{meetingTitle}}</h2>
      <p>Great news! Your meeting recording has been processed and is now available for viewing.</p>

      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0;"><strong>Meeting Date:</strong></td>
          <td>{{formatDate meetingDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Duration:</strong></td>
          <td>{{duration}} minutes</td>
        </tr>
        {{#if fileSize}}
        <tr>
          <td style="padding: 8px 0;"><strong>File Size:</strong></td>
          <td>{{fileSize}} MB</td>
        </tr>
        {{/if}}
      </table>

      <div style="margin-top: 30px;">
        <a href="{{recordingUrl}}" class="button">Watch Recording</a>
        <a href="{{transcriptUrl}}" class="button" style="margin-left: 10px; background-color: #6B7280;">View Transcript</a>
      </div>

      <p style="margin-top: 20px; font-size: 14px; color: #666;">Tip: Share the recording with team members who couldn't attend the meeting.</p>
    `,
    variables: [
      { name: 'meetingTitle', type: 'string', required: true },
      { name: 'meetingDate', type: 'date', required: false },
      { name: 'duration', type: 'number', required: true },
      { name: 'fileSize', type: 'number', required: false },
      { name: 'recordingUrl', type: 'string', required: true },
      { name: 'transcriptUrl', type: 'string', required: true },
    ],
  },
  [EmailTemplateType.subscription_confirmation]: {
    subject: 'Subscription Confirmation - {{plan}} Plan',
    htmlBody: `
      <h1>Subscription Confirmed</h1>
      <p>Thank you for subscribing to the <strong>{{plan}}</strong> plan!</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Subscription Details</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>Plan:</strong></td>
            <td>{{plan}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Price:</strong></td>
            <td>{{formatCurrency price}} / {{billingCycle}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Next Billing Date:</strong></td>
            <td>{{formatDate nextBillingDate}}</td>
          </tr>
        </table>
      </div>

      <h3>What's Included:</h3>
      <ul>
        {{#each features}}
        <li>{{this}}</li>
        {{/each}}
      </ul>

      <a href="{{appUrl}}/billing" class="button">Manage Subscription</a>

      <p style="margin-top: 20px; font-size: 14px; color: #666;">Questions about your subscription? Contact us at {{supportEmail}}</p>
    `,
    variables: [
      { name: 'plan', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'billingCycle', type: 'string', required: true },
      { name: 'nextBillingDate', type: 'date', required: true },
      { name: 'features', type: 'array', required: false },
    ],
  },
  [EmailTemplateType.subscription_renewal]: {
    subject: 'Subscription Renewed Successfully',
    htmlBody: `
      <h1>Subscription Renewed</h1>
      <p>Your {{plan}} subscription has been renewed successfully.</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>Amount Charged:</strong></td>
            <td>{{formatCurrency amount}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Next Renewal Date:</strong></td>
            <td>{{formatDate nextRenewalDate}}</td>
          </tr>
        </table>
      </div>

      <a href="{{appUrl}}/billing/invoice/{{invoiceId}}" class="button">View Invoice</a>

      <p>Thank you for continuing with {{appName}}!</p>
    `,
    variables: [
      { name: 'plan', type: 'string', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'nextRenewalDate', type: 'date', required: true },
      { name: 'invoiceId', type: 'string', required: false },
    ],
  },
  [EmailTemplateType.subscription_cancelled]: {
    subject: 'Subscription Cancellation Confirmed',
    htmlBody: `
      <h1>Subscription Cancelled</h1>
      <p>We're sorry to see you go. Your subscription has been cancelled as requested.</p>

      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #991b1b;">Important Information</h3>
        <ul>
          <li>Your access will continue until: <strong>{{formatDate accessEndsDate}}</strong></li>
          <li>Your data will be retained for 30 days after access ends</li>
          <li>You can reactivate your subscription anytime before the end date</li>
        </ul>
      </div>

      {{#if feedbackUrl}}
      <p>We'd love to hear your feedback to improve our service:</p>
      <a href="{{feedbackUrl}}" class="button">Share Feedback</a>
      {{/if}}

      <p style="margin-top: 20px;">Changed your mind? You can reactivate your subscription at any time from your account settings.</p>
      <a href="{{appUrl}}/billing" class="button" style="background-color: #6B7280;">Reactivate Subscription</a>
    `,
    variables: [
      { name: 'accessEndsDate', type: 'date', required: true },
      { name: 'feedbackUrl', type: 'string', required: false },
    ],
  },
  [EmailTemplateType.payment_receipt]: {
    subject: 'Payment Receipt - Invoice #{{invoiceNumber}}',
    htmlBody: `
      <h1>Payment Receipt</h1>
      <p>Thank you for your payment. Here's your receipt for your records.</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Invoice Details</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
            <td>#{{invoiceNumber}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Date:</strong></td>
            <td>{{formatDate paymentDate}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Amount Paid:</strong></td>
            <td>{{formatCurrency amount}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
            <td>{{paymentMethod}}</td>
          </tr>
        </table>
      </div>

      {{#if lineItems}}
      <h3>Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        {{#each lineItems}}
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{description}}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">{{formatCurrency amount}}</td>
        </tr>
        {{/each}}
      </table>
      {{/if}}

      <a href="{{appUrl}}/billing/invoice/{{invoiceId}}" class="button">Download Invoice</a>
    `,
    variables: [
      { name: 'invoiceNumber', type: 'string', required: true },
      { name: 'paymentDate', type: 'date', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'paymentMethod', type: 'string', required: true },
      { name: 'lineItems', type: 'array', required: false },
      { name: 'invoiceId', type: 'string', required: true },
    ],
  },
  [EmailTemplateType.team_invitation]: {
    subject: '{{inviterName}} invited you to join {{teamName}}',
    htmlBody: `
      <h1>You're Invited!</h1>
      <p><strong>{{inviterName}}</strong> has invited you to join the <strong>{{teamName}}</strong> team on {{appName}}.</p>

      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 20px 0;">Join your team and start collaborating on meetings and transcripts.</p>
        <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
      </div>

      {{#if personalMessage}}
      <h3>Message from {{inviterName}}:</h3>
      <p style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #4F46E5;">{{personalMessage}}</p>
      {{/if}}

      <p style="margin-top: 20px; font-size: 14px; color: #666;">This invitation will expire in 7 days. If you don't want to join this team, you can safely ignore this email.</p>
    `,
    variables: [
      { name: 'inviterName', type: 'string', required: true },
      { name: 'teamName', type: 'string', required: true },
      { name: 'invitationUrl', type: 'string', required: true },
      { name: 'personalMessage', type: 'string', required: false },
    ],
  },
  [EmailTemplateType.weekly_digest]: {
    subject: 'Your Weekly Meeting Digest - {{weekRange}}',
    htmlBody: `
      <h1>Weekly Digest</h1>
      <p>Here's your meeting activity for the week of <strong>{{formatDate weekStart}} - {{formatDate weekEnd}}</strong></p>

      <div style="display: flex; gap: 20px; margin: 20px 0;">
        <div style="flex: 1; background-color: #eff6ff; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; color: #4F46E5;">{{meetingsCount}}</h2>
          <p style="margin: 5px 0 0 0;">Meetings</p>
        </div>
        <div style="flex: 1; background-color: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; color: #16a34a;">{{totalDuration}}</h2>
          <p style="margin: 5px 0 0 0;">Minutes</p>
        </div>
        <div style="flex: 1; background-color: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; color: #d97706;">{{actionItemsCount}}</h2>
          <p style="margin: 5px 0 0 0;">Action Items</p>
        </div>
      </div>

      {{#if topInsights}}
      <h3>Top Insights</h3>
      <ul>
        {{#each topInsights}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}

      {{#if completedActionItems}}
      <h3>✅ Completed Action Items</h3>
      <ul>
        {{#each completedActionItems}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}

      {{#if pendingActionItems}}
      <h3>⏳ Pending Action Items</h3>
      <ul>
        {{#each pendingActionItems}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}

      {{#if upcomingMeetings}}
      <h3>📅 Upcoming Meetings</h3>
      <table style="width: 100%;">
        {{#each upcomingMeetings}}
        <tr>
          <td style="padding: 8px 0;">{{title}}</td>
          <td style="padding: 8px 0; text-align: right;">{{formatDate date}}</td>
        </tr>
        {{/each}}
      </table>
      {{/if}}

      <div style="margin-top: 30px;">
        <a href="{{appUrl}}/analytics" class="button">View Full Analytics</a>
      </div>
    `,
    variables: [
      { name: 'weekRange', type: 'string', required: true },
      { name: 'weekStart', type: 'date', required: true },
      { name: 'weekEnd', type: 'date', required: true },
      { name: 'meetingsCount', type: 'number', required: true },
      { name: 'totalDuration', type: 'number', required: true },
      { name: 'actionItemsCount', type: 'number', required: false },
      { name: 'topInsights', type: 'array', required: false },
      { name: 'completedActionItems', type: 'array', required: false },
      { name: 'pendingActionItems', type: 'array', required: false },
      { name: 'upcomingMeetings', type: 'array', required: false },
    ],
  },
  [EmailTemplateType.quota_warning]: {
    subject: '⚠️ Storage Quota Warning - {{percentage}}% Used',
    htmlBody: `
      <h1>Storage Quota Warning</h1>
      <p>You're approaching your storage quota limit. Please review your usage and consider upgrading your plan if needed.</p>

      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #991b1b;">Storage Usage</h3>

        <div style="background-color: #e5e7eb; border-radius: 4px; height: 30px; margin: 15px 0; position: relative;">
          <div style="background-color: {{#if (gt percentage 90)}}#dc2626{{else if (gt percentage 75)}}#f59e0b{{else}}#10b981{{/if}}; height: 100%; width: {{percentage}}%; border-radius: 4px;"></div>
        </div>

        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>Used:</strong></td>
            <td>{{used}} GB of {{limit}} GB</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Available:</strong></td>
            <td>{{available}} GB</td>
          </tr>
        </table>
      </div>

      <h3>Recommendations:</h3>
      <ul>
        <li>Delete old recordings you no longer need</li>
        <li>Download important files for offline storage</li>
        <li>Upgrade to a higher plan for more storage</li>
      </ul>

      <a href="{{upgradeUrl}}" class="button">Upgrade Plan</a>
      <a href="{{appUrl}}/settings/storage" class="button" style="margin-left: 10px; background-color: #6B7280;">Manage Storage</a>

      <p style="margin-top: 20px; font-size: 14px; color: #666;">Need help managing your storage? Contact us at {{supportEmail}}</p>
    `,
    variables: [
      { name: 'percentage', type: 'number', required: true },
      { name: 'used', type: 'number', required: true },
      { name: 'limit', type: 'number', required: true },
      { name: 'available', type: 'number', required: true },
      { name: 'upgradeUrl', type: 'string', required: true },
    ],
  },
  [EmailTemplateType.security_alert]: {
    subject: '🔒 Security Alert: {{alertType}}',
    htmlBody: `
      <h1>Security Alert</h1>

      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="margin-top: 0; color: #991b1b;">{{alertType}}</h3>
        <p>{{description}}</p>

        <table style="width: 100%; margin-top: 15px;">
          {{#if ipAddress}}
          <tr>
            <td style="padding: 8px 0;"><strong>IP Address:</strong></td>
            <td>{{ipAddress}}</td>
          </tr>
          {{/if}}
          {{#if location}}
          <tr>
            <td style="padding: 8px 0;"><strong>Location:</strong></td>
            <td>{{location}}</td>
          </tr>
          {{/if}}
          {{#if device}}
          <tr>
            <td style="padding: 8px 0;"><strong>Device:</strong></td>
            <td>{{device}}</td>
          </tr>
          {{/if}}
          {{#if userAgent}}
          <tr>
            <td style="padding: 8px 0;"><strong>Browser:</strong></td>
            <td>{{userAgent}}</td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 8px 0;"><strong>Time:</strong></td>
            <td>{{formatDate timestamp}}</td>
          </tr>
        </table>
      </div>

      <h3>Was this you?</h3>
      <p>If you recognize this activity, you can safely ignore this email.</p>

      <h3>If this wasn't you:</h3>
      <ol>
        <li>Change your password immediately</li>
        <li>Review your recent account activity</li>
        <li>Enable two-factor authentication</li>
        <li>Contact support if you need assistance</li>
      </ol>

      <div style="margin-top: 30px;">
        <a href="{{appUrl}}/security" class="button">Review Security Settings</a>
        <a href="{{appUrl}}/settings/sessions" class="button" style="margin-left: 10px; background-color: #dc2626;">Sign Out All Devices</a>
      </div>
    `,
    variables: [
      { name: 'alertType', type: 'string', required: true },
      { name: 'description', type: 'string', required: true },
      { name: 'ipAddress', type: 'string', required: false },
      { name: 'location', type: 'string', required: false },
      { name: 'device', type: 'string', required: false },
      { name: 'userAgent', type: 'string', required: false },
      { name: 'timestamp', type: 'date', required: true },
    ],
  },
  [EmailTemplateType.custom]: {
    subject: '{{appName}} Notification',
    htmlBody: `
      <h1>{{title}}</h1>
      <p>{{message}}</p>
    `,
    variables: [
      { name: 'title', type: 'string', required: true },
      { name: 'message', type: 'string', required: true },
    ],
  },
};

// Function to extract plain text from HTML
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function seedEmailTemplates() {
  try {
    logger.info('Starting email template seeding...');

    for (const [type, templateData] of Object.entries(defaultTemplates)) {
      // Check if template already exists
      const existing = await prisma.emailTemplate.findFirst({
        where: {
          type: type as EmailTemplateType,
          isDefault: true,
        },
      });

      if (existing) {
        logger.info(`Template ${type} already exists, skipping...`);
        continue;
      }

      // Create the template
      const template = await prisma.emailTemplate.create({
        data: {
          type: type as EmailTemplateType,
          name: `Default ${type.replace(/_/g, ' ')} Template`,
          subject: templateData.subject,
          htmlBody: templateData.htmlBody,
          textBody: htmlToText(templateData.htmlBody),
          variables: templateData.variables,
          isDefault: true,
          isActive: true,
          version: 1,
        },
      });

      logger.info(`✅ Created template: ${type} (ID: ${template.id})`);
    }

    logger.info('Email template seeding completed successfully!');

    // Display statistics
    const totalTemplates = await prisma.emailTemplate.count({
      where: { isDefault: true },
    });

    logger.info(`Total default templates: ${totalTemplates}`);

  } catch (error) {
    logger.error('Error seeding email templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedEmailTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });