/**
 * Email Template Service
 * Advanced template management and rendering with variable substitution
 */

import winston from 'winston';
import Handlebars from 'handlebars';
import { PrismaClient } from '@prisma/client';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'email-template-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

Handlebars.registerHelper('formatTime', (date: Date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
});

Handlebars.registerHelper('formatDuration', (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('gt', (a: any, b: any) => a > b);
Handlebars.registerHelper('lt', (a: any, b: any) => a < b);

export interface TemplateVariable {
  name: string;
  value: any;
  required?: boolean;
}

export interface EmailTemplateData {
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: TemplateVariable[];
}

export class EmailTemplateService {
  private templateCache: Map<string, Handlebars.TemplateDelegate>;

  constructor() {
    this.templateCache = new Map();
  }

  /**
   * Render template with variables
   */
  render(template: string, data: Record<string, any>): string {
    try {
      // Check cache
      let compiledTemplate = this.templateCache.get(template);

      if (!compiledTemplate) {
        compiledTemplate = Handlebars.compile(template);
        this.templateCache.set(template, compiledTemplate);
      }

      return compiledTemplate(data);
    } catch (error) {
      logger.error('Failed to render template:', error);
      throw new Error('Template rendering failed');
    }
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(template);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract variables from template
   */
  extractVariables(template: string): string[] {
    const variables = new Set<string>();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const variable = match[1].trim();
      // Remove helpers and modifiers
      const cleanVariable = variable.split(/\s+/)[0].replace(/^#/, '');
      variables.add(cleanVariable);
    }

    return Array.from(variables);
  }

  /**
   * Get meeting summary template
   */
  getMeetingSummaryTemplate(): EmailTemplateData {
    return {
      subject: 'Meeting Summary: {{meetingTitle}}',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .meta {
              background: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
            }
            .meta-item {
              margin: 5px 0;
              display: flex;
              justify-content: space-between;
            }
            .meta-label {
              font-weight: 600;
              color: #6b7280;
            }
            .section {
              margin: 25px 0;
            }
            .section h2 {
              color: #4f46e5;
              font-size: 18px;
              margin-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            .list-item {
              padding: 10px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .list-item:last-child {
              border-bottom: none;
            }
            .action-item {
              background: #fef3c7;
              padding: 12px;
              border-left: 4px solid #f59e0b;
              margin: 8px 0;
              border-radius: 4px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #4f46e5;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 5px;
            }
            .button:hover {
              background: #4338ca;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>{{meetingTitle}}</h1>
          </div>

          <div class="content">
            <div class="meta">
              <div class="meta-item">
                <span class="meta-label">Date:</span>
                <span>{{formatDate date}}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Duration:</span>
                <span>{{formatDuration duration}}</span>
              </div>
              {{#if participantCount}}
              <div class="meta-item">
                <span class="meta-label">Participants:</span>
                <span>{{participantCount}}</span>
              </div>
              {{/if}}
            </div>

            {{#if overview}}
            <div class="section">
              <h2>Overview</h2>
              <p>{{overview}}</p>
            </div>
            {{/if}}

            {{#if keyPoints}}
            {{#if keyPoints.length}}
            <div class="section">
              <h2>Key Points</h2>
              {{#each keyPoints}}
              <div class="list-item">• {{this}}</div>
              {{/each}}
            </div>
            {{/if}}
            {{/if}}

            {{#if actionItems}}
            {{#if actionItems.length}}
            <div class="section">
              <h2>Action Items</h2>
              {{#each actionItems}}
              <div class="action-item">
                <strong>{{this.title}}</strong>
                {{#if this.assignee}}
                <div style="margin-top: 5px; font-size: 14px;">
                  👤 Assigned to: {{this.assignee}}
                </div>
                {{/if}}
                {{#if this.dueDate}}
                <div style="margin-top: 5px; font-size: 14px;">
                  📅 Due: {{formatDate this.dueDate}}
                </div>
                {{/if}}
              </div>
              {{/each}}
            </div>
            {{/if}}
            {{/if}}

            {{#if decisions}}
            {{#if decisions.length}}
            <div class="section">
              <h2>Decisions Made</h2>
              {{#each decisions}}
              <div class="list-item">✓ {{this}}</div>
              {{/each}}
            </div>
            {{/if}}
            {{/if}}

            {{#if questions}}
            {{#if questions.length}}
            <div class="section">
              <h2>Questions</h2>
              {{#each questions}}
              <div class="list-item">❓ {{this}}</div>
              {{/each}}
            </div>
            {{/if}}
            {{/if}}

            <div style="text-align: center; margin-top: 30px;">
              <a href="{{transcriptUrl}}" class="button">View Full Transcript</a>
              {{#if recordingUrl}}
              <a href="{{recordingUrl}}" class="button">Watch Recording</a>
              {{/if}}
            </div>
          </div>

          <div class="footer">
            <p>© {{year}} OpenMeet. All rights reserved.</p>
            <p>
              <a href="{{unsubscribeUrl}}">Unsubscribe</a> |
              <a href="{{preferencesUrl}}">Email Preferences</a>
            </p>
          </div>
        </body>
        </html>
      `,
      textBody: `
MEETING SUMMARY: {{meetingTitle}}

Date: {{formatDate date}}
Duration: {{formatDuration duration}}
{{#if participantCount}}Participants: {{participantCount}}{{/if}}

{{#if overview}}
OVERVIEW
{{overview}}
{{/if}}

{{#if keyPoints}}
{{#if keyPoints.length}}
KEY POINTS
{{#each keyPoints}}
• {{this}}
{{/each}}
{{/if}}
{{/if}}

{{#if actionItems}}
{{#if actionItems.length}}
ACTION ITEMS
{{#each actionItems}}
• {{this.title}}{{#if this.assignee}} ({{this.assignee}}){{/if}}{{#if this.dueDate}} - Due: {{formatDate this.dueDate}}{{/if}}
{{/each}}
{{/if}}
{{/if}}

{{#if decisions}}
{{#if decisions.length}}
DECISIONS MADE
{{#each decisions}}
✓ {{this}}
{{/each}}
{{/if}}
{{/if}}

View full transcript: {{transcriptUrl}}
{{#if recordingUrl}}Watch recording: {{recordingUrl}}{{/if}}

---
© {{year}} OpenMeet. All rights reserved.
      `,
    };
  }

  /**
   * Get action item reminder template
   */
  getActionItemReminderTemplate(): EmailTemplateData {
    return {
      subject: 'Reminder: Action Items from {{meetingTitle}}',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .reminder-badge {
              background: #ef4444;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              display: inline-block;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .action-item {
              background: #fef3c7;
              padding: 15px;
              border-left: 4px solid #f59e0b;
              margin: 12px 0;
              border-radius: 4px;
            }
            .urgent {
              background: #fee2e2;
              border-left-color: #ef4444;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #4f46e5;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="reminder-badge">⏰ REMINDER</div>

          <h1>Action Items from: {{meetingTitle}}</h1>
          <p>Meeting Date: {{formatDate meetingDate}}</p>

          <p>Hi {{userName}}, this is a reminder about your pending action items:</p>

          {{#each actionItems}}
          <div class="action-item {{#if this.urgent}}urgent{{/if}}">
            <strong>{{this.title}}</strong>
            {{#if this.description}}
            <p style="margin: 8px 0;">{{this.description}}</p>
            {{/if}}
            {{#if this.dueDate}}
            <div style="margin-top: 8px; font-size: 14px;">
              📅 Due: {{formatDate this.dueDate}}
              {{#if this.urgent}}
              <span style="color: #ef4444; font-weight: 600;">• URGENT</span>
              {{/if}}
            </div>
            {{/if}}
          </div>
          {{/each}}

          <a href="{{meetingUrl}}" class="button">View Meeting Details</a>
        </body>
        </html>
      `,
      textBody: `
⏰ REMINDER

Action Items from: {{meetingTitle}}
Meeting Date: {{formatDate meetingDate}}

Hi {{userName}}, this is a reminder about your pending action items:

{{#each actionItems}}
• {{this.title}}{{#if this.urgent}} [URGENT]{{/if}}
  {{#if this.description}}{{this.description}}{{/if}}
  {{#if this.dueDate}}Due: {{formatDate this.dueDate}}{{/if}}

{{/each}}

View meeting details: {{meetingUrl}}
      `,
    };
  }

  /**
   * Get meeting invitation template
   */
  getMeetingInvitationTemplate(): EmailTemplateData {
    return {
      subject: 'Meeting Invitation: {{meetingTitle}}',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .invitation {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 30px;
            }
            .invitation h1 {
              margin: 0;
              font-size: 28px;
            }
            .meeting-info {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .info-row {
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
              display: flex;
              align-items: center;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-icon {
              font-size: 24px;
              margin-right: 12px;
              width: 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: #10b981;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="invitation">
            <h1>📅 You're Invited!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">{{meetingTitle}}</p>
          </div>

          <div class="meeting-info">
            <div class="info-row">
              <span class="info-icon">👤</span>
              <div>
                <strong>Host:</strong> {{hostName}}
              </div>
            </div>
            <div class="info-row">
              <span class="info-icon">📅</span>
              <div>
                <strong>Date:</strong> {{formatDate scheduledAt}}
              </div>
            </div>
            <div class="info-row">
              <span class="info-icon">🕐</span>
              <div>
                <strong>Time:</strong> {{formatTime scheduledAt}}
              </div>
            </div>
            {{#if duration}}
            <div class="info-row">
              <span class="info-icon">⏱</span>
              <div>
                <strong>Duration:</strong> {{formatDuration duration}}
              </div>
            </div>
            {{/if}}
            {{#if description}}
            <div class="info-row">
              <span class="info-icon">📝</span>
              <div>
                <strong>Description:</strong><br>
                {{description}}
              </div>
            </div>
            {{/if}}
          </div>

          <div style="text-align: center;">
            <a href="{{meetingUrl}}" class="button">Join Meeting</a>
          </div>

          <p style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 6px; font-size: 14px;">
            ℹ️ This meeting will be recorded and transcribed by OpenMeet for your convenience.
          </p>
        </body>
        </html>
      `,
      textBody: `
📅 YOU'RE INVITED!

{{meetingTitle}}

Host: {{hostName}}
Date: {{formatDate scheduledAt}}
Time: {{formatTime scheduledAt}}
{{#if duration}}Duration: {{formatDuration duration}}{{/if}}

{{#if description}}
Description:
{{description}}
{{/if}}

Join meeting: {{meetingUrl}}

ℹ️ This meeting will be recorded and transcribed by OpenMeet for your convenience.
      `,
    };
  }

  /**
   * Get weekly digest template
   */
  getWeeklyDigestTemplate(): EmailTemplateData {
    return {
      subject: 'Your Weekly Meeting Digest - {{weekStart}} to {{weekEnd}}',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 700px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              border: 1px solid #e5e7eb;
            }
            .stat-value {
              font-size: 32px;
              font-weight: bold;
              color: #4f46e5;
              margin: 10px 0;
            }
            .stat-label {
              font-size: 14px;
              color: #6b7280;
            }
            .section {
              margin: 30px 0;
            }
            .section h2 {
              color: #1f2937;
              font-size: 20px;
              margin-bottom: 15px;
            }
            .meeting-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0;
            }
            .meeting-title {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .meeting-meta {
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Your Weekly Digest</h1>
            <p>{{formatDate weekStart}} - {{formatDate weekEnd}}</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">{{meetingsCount}}</div>
              <div class="stat-label">Meetings</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{formatDuration totalDuration}}</div>
              <div class="stat-label">Total Time</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{actionItemsCount}}</div>
              <div class="stat-label">Action Items</div>
            </div>
          </div>

          {{#if topInsights}}
          {{#if topInsights.length}}
          <div class="section">
            <h2>💡 Top Insights</h2>
            {{#each topInsights}}
            <div class="meeting-card">{{this}}</div>
            {{/each}}
          </div>
          {{/if}}
          {{/if}}

          {{#if upcomingMeetings}}
          {{#if upcomingMeetings.length}}
          <div class="section">
            <h2>📅 Upcoming This Week</h2>
            {{#each upcomingMeetings}}
            <div class="meeting-card">
              <div class="meeting-title">{{this.title}}</div>
              <div class="meeting-meta">{{formatDate this.date}} at {{formatTime this.date}}</div>
            </div>
            {{/each}}
          </div>
          {{/if}}
          {{/if}}
        </body>
        </html>
      `,
      textBody: `
📊 YOUR WEEKLY DIGEST
{{formatDate weekStart}} - {{formatDate weekEnd}}

STATS
• {{meetingsCount}} meetings
• {{formatDuration totalDuration}} total time
• {{actionItemsCount}} action items

{{#if topInsights}}
{{#if topInsights.length}}
TOP INSIGHTS
{{#each topInsights}}
• {{this}}
{{/each}}
{{/if}}
{{/if}}

{{#if upcomingMeetings}}
{{#if upcomingMeetings.length}}
UPCOMING THIS WEEK
{{#each upcomingMeetings}}
• {{this.title}} - {{formatDate this.date}} at {{formatTime this.date}}
{{/each}}
{{/if}}
{{/if}}
      `,
    };
  }

  /**
   * Render meeting summary email
   */
  renderMeetingSummary(data: {
    meetingTitle: string;
    date: Date;
    duration: number;
    participantCount?: number;
    overview?: string;
    keyPoints?: string[];
    actionItems?: Array<{
      title: string;
      assignee?: string;
      dueDate?: Date;
    }>;
    decisions?: string[];
    questions?: string[];
    transcriptUrl: string;
    recordingUrl?: string;
    unsubscribeUrl?: string;
    preferencesUrl?: string;
  }): { subject: string; html: string; text: string } {
    const template = this.getMeetingSummaryTemplate();

    const templateData = {
      ...data,
      year: new Date().getFullYear(),
    };

    return {
      subject: this.render(template.subject, templateData),
      html: this.render(template.htmlBody, templateData),
      text: this.render(template.textBody || '', templateData),
    };
  }

  /**
   * Render action item reminder email
   */
  renderActionItemReminder(data: {
    meetingTitle: string;
    meetingDate: Date;
    meetingUrl: string;
    userName: string;
    actionItems: Array<{
      title: string;
      description?: string;
      dueDate?: Date;
      urgent?: boolean;
    }>;
  }): { subject: string; html: string; text: string } {
    const template = this.getActionItemReminderTemplate();

    return {
      subject: this.render(template.subject, data),
      html: this.render(template.htmlBody, data),
      text: this.render(template.textBody || '', data),
    };
  }

  /**
   * Render meeting invitation email
   */
  renderMeetingInvitation(data: {
    meetingTitle: string;
    hostName: string;
    scheduledAt: Date;
    duration?: number;
    description?: string;
    meetingUrl: string;
  }): { subject: string; html: string; text: string } {
    const template = this.getMeetingInvitationTemplate();

    return {
      subject: this.render(template.subject, data),
      html: this.render(template.htmlBody, data),
      text: this.render(template.textBody || '', data),
    };
  }

  /**
   * Render weekly digest email
   */
  renderWeeklyDigest(data: {
    weekStart: Date;
    weekEnd: Date;
    meetingsCount: number;
    totalDuration: number;
    actionItemsCount: number;
    topInsights?: string[];
    upcomingMeetings?: Array<{
      title: string;
      date: Date;
    }>;
  }): { subject: string; html: string; text: string } {
    const template = this.getWeeklyDigestTemplate();

    return {
      subject: this.render(template.subject, data),
      html: this.render(template.htmlBody, data),
      text: this.render(template.textBody || '', data),
    };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }
}
