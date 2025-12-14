/**
 * Workflow Automation Service
 * Handles templates, threads, follow-ups, scheduling, and automation rules
 */

import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import { google, calendar_v3 } from 'googleapis';
import winston from 'winston';
import { EmailService } from './email';
import { SmsService, SMSTemplateType } from './sms';
import { QueueService, JobType } from './queue';
import Redis from 'ioredis';
import * as asana from 'asana';
import { Version3Client } from 'jira.js';
import { LinearClient } from '@linear/sdk';
import { format } from 'date-fns';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'workflow-automation-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// Types
export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
}

export interface MeetingTemplateData {
  title?: string;
  description?: string;
  duration?: number;
  participants?: string[];
  agenda?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface ThreadingCriteria {
  byTopic?: boolean;
  byParticipants?: boolean;
  byTimeWindow?: number; // hours
  minSimilarity?: number; // 0-1
}

export interface FollowUpRule {
  trigger: 'meeting_end' | 'action_item_created' | 'deadline_approaching' | 'meeting_scheduled' | 'custom';
  action: 'send_email' | 'send_sms' | 'create_calendar_event' | 'send_webhook' | 'create_task';
  conditions?: Record<string, any>;
  config: Record<string, any>;
  delayMinutes?: number;
}

export interface SchedulingRequest {
  duration: number;
  participantEmails: string[];
  preferredTimes?: Date[];
  constraints?: {
    daysOfWeek?: number[];
    startHour?: number;
    endHour?: number;
    excludeDates?: Date[];
  };
  timezone?: string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  confidence: number;
  attendeesAvailable: string[];
  conflicts?: string[];
}

export interface AutomationRuleDefinition {
  trigger: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

export class WorkflowAutomationService {
  private emailService: EmailService;
  private smsService: SmsService;
  private queueService: QueueService;
  private redis: Redis;
  private calendarAuth: any;

  constructor(
    emailService: EmailService,
    queueService: QueueService,
    redis: Redis
  ) {
    this.emailService = emailService;
    this.smsService = new SmsService();
    this.queueService = queueService;
    this.redis = redis;
    this.initializeGoogleCalendar();
  }

  /**
   * Initialize Google Calendar API
   */
  private initializeGoogleCalendar(): void {
    try {
      const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS
        ? JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS)
        : null;

      if (!credentials) {
        logger.warn('Google Calendar credentials not configured');
        return;
      }

      this.calendarAuth = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
      );

      if (process.env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
        this.calendarAuth.setCredentials({
          refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
        });
      }
    } catch (error) {
      logger.error('Failed to initialize Google Calendar:', error);
    }
  }

  // ========================================
  // MEETING TEMPLATES
  // ========================================

  /**
   * Create meeting template
   */
  async createTemplate(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      type: string;
      templateData: MeetingTemplateData;
      variables?: TemplateVariable[];
    }
  ) {
    try {
      const template = await prisma.meetingTemplate.create({
        data: {
          organizationId,
          userId,
          name: data.name,
          description: data.description,
          type: data.type as any,
          templateData: data.templateData as any,
          variables: (data.variables || []) as any,
        },
      });

      logger.info('Meeting template created', { templateId: template.id });
      return template;
    } catch (error) {
      logger.error('Failed to create meeting template:', error);
      throw error;
    }
  }

  /**
   * Get templates
   */
  async getTemplates(organizationId: string, filters?: {
    type?: string;
    isActive?: boolean;
  }) {
    try {
      const where: any = { organizationId };
      if (filters?.type) where.type = filters.type;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;

      return await prisma.meetingTemplate.findMany({
        where,
        orderBy: { usageCount: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string, organizationId: string) {
    try {
      return await prisma.meetingTemplate.findFirst({
        where: { id, organizationId },
      });
    } catch (error) {
      logger.error('Failed to get template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      templateData: MeetingTemplateData;
      variables: TemplateVariable[];
      isActive: boolean;
    }>
  ) {
    try {
      return await prisma.meetingTemplate.update({
        where: { id },
        data: {
          ...data,
          templateData: data.templateData as any,
          variables: data.variables as any,
        },
      });
    } catch (error) {
      logger.error('Failed to update template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string, organizationId: string) {
    try {
      await prisma.meetingTemplate.delete({
        where: { id },
      });
      logger.info('Template deleted', { templateId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete template:', error);
      return false;
    }
  }

  /**
   * Apply template to meeting
   */
  async applyTemplate(
    templateId: string,
    meetingId: string,
    variableValues?: Record<string, any>
  ) {
    try {
      const template = await prisma.meetingTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      const templateData = template.templateData as any;
      const variables = template.variables as any[];

      // Replace variables in template data
      let processedData = JSON.stringify(templateData);
      if (variableValues && variables) {
        variables.forEach((variable: TemplateVariable) => {
          const value = variableValues[variable.name] || variable.defaultValue;
          if (value !== undefined) {
            processedData = processedData.replace(
              new RegExp(`{{${variable.name}}}`, 'g'),
              String(value)
            );
          }
        });
      }

      const meetingData = JSON.parse(processedData);

      // Update meeting with template data
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          title: meetingData.title,
          description: meetingData.description,
          metadata: {
            ...meetingData.customFields,
            templateId: templateId,
          },
        },
      });

      // Increment usage count
      await prisma.meetingTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });

      logger.info('Template applied to meeting', { templateId, meetingId });
      return true;
    } catch (error) {
      logger.error('Failed to apply template:', error);
      throw error;
    }
  }

  /**
   * Auto-suggest template based on meeting type
   */
  async suggestTemplate(
    organizationId: string,
    meetingData: {
      title?: string;
      participants?: string[];
      duration?: number;
    }
  ) {
    try {
      const templates = await this.getTemplates(organizationId, { isActive: true });

      // Simple matching logic - can be enhanced with ML
      let bestMatch = null;
      let bestScore = 0;

      for (const template of templates) {
        let score = 0;
        const templateData = template.templateData as any;

        // Match by title keywords
        if (meetingData.title && templateData.title) {
          const titleWords = meetingData.title.toLowerCase().split(' ');
          const templateWords = templateData.title.toLowerCase().split(' ');
          const matchingWords = titleWords.filter((word: string) =>
            templateWords.includes(word)
          );
          score += matchingWords.length * 10;
        }

        // Match by participant count
        if (
          meetingData.participants &&
          templateData.participants &&
          Math.abs(
            meetingData.participants.length - templateData.participants.length
          ) <= 2
        ) {
          score += 5;
        }

        // Match by duration
        if (
          meetingData.duration &&
          templateData.duration &&
          Math.abs(meetingData.duration - templateData.duration) <= 15
        ) {
          score += 3;
        }

        // Factor in usage count
        score += template.usageCount * 0.1;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = template;
        }
      }

      return bestMatch;
    } catch (error) {
      logger.error('Failed to suggest template:', error);
      return null;
    }
  }

  // ========================================
  // CONVERSATION THREADS
  // ========================================

  /**
   * Create conversation thread
   */
  async createThread(
    organizationId: string,
    data: {
      title: string;
      topic?: string;
      participantEmails: string[];
      meetingIds: string[];
    }
  ) {
    try {
      const thread = await prisma.conversationThread.create({
        data: {
          organizationId,
          title: data.title,
          topic: data.topic,
          participantEmails: data.participantEmails,
          meetingIds: data.meetingIds,
          messageCount: data.meetingIds.length,
        },
      });

      logger.info('Conversation thread created', { threadId: thread.id });
      return thread;
    } catch (error) {
      logger.error('Failed to create thread:', error);
      throw error;
    }
  }

  /**
   * Get threads
   */
  async getThreads(
    organizationId: string,
    filters?: {
      search?: string;
      isArchived?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = { organizationId };
      if (filters?.isArchived !== undefined) {
        where.isArchived = filters.isArchived;
      }

      const threads = await prisma.conversationThread.findMany({
        where,
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: { lastActivityAt: 'desc' },
      });

      // Filter by search if provided
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return threads.filter(
          (thread) =>
            thread.title.toLowerCase().includes(searchLower) ||
            thread.topic?.toLowerCase().includes(searchLower)
        );
      }

      return threads;
    } catch (error) {
      logger.error('Failed to get threads:', error);
      throw error;
    }
  }

  /**
   * Get thread with meetings
   */
  async getThreadWithMeetings(id: string, organizationId: string) {
    try {
      const thread = await prisma.conversationThread.findFirst({
        where: { id, organizationId },
      });

      if (!thread) {
        return null;
      }

      // Get all meetings in the thread
      const meetings = await prisma.meeting.findMany({
        where: {
          id: { in: thread.meetingIds },
          organizationId,
        },
        include: {
          participants: true,
          summaries: true,
        },
        orderBy: { scheduledStartAt: 'asc' },
      });

      return {
        ...thread,
        meetings,
      };
    } catch (error) {
      logger.error('Failed to get thread with meetings:', error);
      throw error;
    }
  }

  /**
   * Auto-link related meetings to threads
   */
  async autoLinkMeetings(
    meetingId: string,
    organizationId: string,
    criteria: ThreadingCriteria = {
      byTopic: true,
      byParticipants: true,
      byTimeWindow: 168, // 1 week
      minSimilarity: 0.5,
    }
  ) {
    try {
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, organizationId },
        include: { participants: true, summaries: true },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Get potential threads
      const existingThreads = await prisma.conversationThread.findMany({
        where: {
          organizationId,
          isArchived: false,
        },
      });

      let bestThread = null;
      let bestScore = 0;

      for (const thread of existingThreads) {
        let score = 0;

        // Check participant overlap
        if (criteria.byParticipants) {
          const threadParticipants = new Set(thread.participantEmails);
          const meetingParticipants = meeting.participants.map(
            (p) => p.email || ''
          );
          const overlap = meetingParticipants.filter((email) =>
            threadParticipants.has(email)
          ).length;
          score += (overlap / meetingParticipants.length) * 40;
        }

        // Check topic similarity
        if (criteria.byTopic && thread.topic && meeting.title) {
          const topicWords = thread.topic.toLowerCase().split(' ');
          const titleWords = meeting.title.toLowerCase().split(' ');
          const matchingWords = topicWords.filter((word) =>
            titleWords.includes(word)
          );
          score += (matchingWords.length / topicWords.length) * 40;
        }

        // Check time window
        if (criteria.byTimeWindow && thread.lastActivityAt) {
          const hoursDiff =
            (new Date().getTime() - thread.lastActivityAt.getTime()) /
            (1000 * 60 * 60);
          if (hoursDiff <= criteria.byTimeWindow) {
            score += 20;
          }
        }

        if (score > bestScore && score >= (criteria.minSimilarity || 0) * 100) {
          bestScore = score;
          bestThread = thread;
        }
      }

      // Add to existing thread or create new one
      if (bestThread) {
        await prisma.conversationThread.update({
          where: { id: bestThread.id },
          data: {
            meetingIds: [...bestThread.meetingIds, meetingId],
            messageCount: { increment: 1 },
            lastActivityAt: new Date(),
          },
        });
        logger.info('Meeting linked to existing thread', {
          meetingId,
          threadId: bestThread.id,
        });
        return bestThread.id;
      } else {
        // Create new thread
        const participantEmails = meeting.participants
          .map((p) => p.email)
          .filter(Boolean) as string[];
        const newThread = await this.createThread(organizationId, {
          title: meeting.title,
          topic: meeting.title,
          participantEmails,
          meetingIds: [meetingId],
        });
        logger.info('New thread created for meeting', {
          meetingId,
          threadId: newThread.id,
        });
        return newThread.id;
      }
    } catch (error) {
      logger.error('Failed to auto-link meetings:', error);
      return null;
    }
  }

  // ========================================
  // AUTOMATED FOLLOW-UPS
  // ========================================

  /**
   * Configure follow-up rule
   */
  async configureFollowUp(
    organizationId: string,
    userId: string,
    rule: {
      name: string;
      description?: string;
      trigger: string;
      action: string;
      conditions?: Record<string, any>;
      config: Record<string, any>;
      delayMinutes?: number;
    }
  ) {
    try {
      const config = await prisma.followUpConfig.create({
        data: {
          organizationId,
          userId,
          name: rule.name,
          description: rule.description,
          trigger: rule.trigger as any,
          action: rule.action as any,
          triggerConditions: rule.conditions || {},
          actionConfig: rule.config,
          delayMinutes: rule.delayMinutes || 0,
        },
      });

      logger.info('Follow-up rule configured', { configId: config.id });
      return config;
    } catch (error) {
      logger.error('Failed to configure follow-up:', error);
      throw error;
    }
  }

  /**
   * Get follow-up configurations
   */
  async getFollowUpConfigs(organizationId: string) {
    try {
      return await prisma.followUpConfig.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get follow-up configs:', error);
      throw error;
    }
  }

  /**
   * Execute follow-up action
   */
  async executeFollowUp(configId: string, meetingId: string) {
    try {
      const config = await prisma.followUpConfig.findUnique({
        where: { id: configId },
      });

      if (!config || !config.isActive) {
        throw new Error('Follow-up config not found or inactive');
      }

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: true,
          summaries: true,
        },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Create execution record
      const execution = await prisma.followUpExecution.create({
        data: {
          configId,
          meetingId,
          status: 'pending',
        },
      });

      try {
        let result;

        // Execute based on action type
        switch (config.action) {
          case 'send_email':
            result = await this.executeEmailFollowUp(config, meeting);
            break;
          case 'send_sms':
            result = await this.executeSmsFollowUp(config, meeting);
            break;
          case 'create_calendar_event':
            result = await this.executeCalendarFollowUp(config, meeting);
            break;
          case 'send_webhook':
            result = await this.executeWebhookFollowUp(config, meeting);
            break;
          case 'create_task':
            result = await this.executeTaskFollowUp(config, meeting);
            break;
          default:
            throw new Error(`Unknown action type: ${config.action}`);
        }

        // Update execution record
        await prisma.followUpExecution.update({
          where: { id: execution.id },
          data: {
            status: 'completed',
            result,
            executedAt: new Date(),
          },
        });

        // Update config
        await prisma.followUpConfig.update({
          where: { id: configId },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        });

        logger.info('Follow-up executed successfully', {
          configId,
          meetingId,
          executionId: execution.id,
        });

        return result;
      } catch (error) {
        // Update execution with error
        await prisma.followUpExecution.update({
          where: { id: execution.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        throw error;
      }
    } catch (error) {
      logger.error('Failed to execute follow-up:', error);
      throw error;
    }
  }

  /**
   * Execute email follow-up
   */
  private async executeEmailFollowUp(config: any, meeting: any) {
    const actionConfig = config.actionConfig;
    const recipients = actionConfig.recipients || meeting.participants.map(
      (p: any) => p.email
    ).filter(Boolean);

    const summary = meeting.summaries?.[0];
    const emailData = {
      meetingTitle: meeting.title,
      date: meeting.actualStartAt || meeting.scheduledStartAt,
      duration: meeting.durationSeconds,
      keyPoints: summary?.keyPoints || [],
      actionItems: summary?.actionItems || [],
      transcriptUrl: `${process.env.WEB_URL}/meetings/${meeting.id}/transcript`,
    };

    for (const recipient of recipients) {
      await this.emailService.sendMeetingSummary(recipient, emailData);
    }

    return { sent: recipients.length };
  }

  /**
   * Execute SMS follow-up
   */
  private async executeSmsFollowUp(config: any, meeting: any) {
    try {
      const actionConfig = config.actionConfig;

      // Get meeting summary
      const summary = await prisma.meetingSummary.findFirst({
        where: { meetingId: meeting.id },
        orderBy: { createdAt: 'desc' },
      });

      // Get participants with phone numbers
      const participants = await prisma.meetingParticipant.findMany({
        where: {
          meetingId: meeting.id,
          userId: { not: null },
        },
      });

      // Get users from participant IDs
      const userIds = participants.map(p => p.userId).filter(Boolean) as string[];
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
      });

      const usersWithPhone = users.filter(u => (u.metadata as any)?.phone);

      if (usersWithPhone.length === 0) {
        logger.warn('No participants with phone numbers found', { meetingId: meeting.id });
        return { status: 'no_recipients', message: 'No participants with phone numbers' };
      }

      // Prepare SMS content
      const meetingTitle = meeting.title || 'Your meeting';
      const summaryText = summary?.overview || 'Summary not yet available';
      const truncatedSummary = summaryText.substring(0, 300) + (summaryText.length > 300 ? '...' : '');

      const message = actionConfig.messageTemplate
        ? actionConfig.messageTemplate
            .replace('{{meetingTitle}}', meetingTitle)
            .replace('{{summary}}', truncatedSummary)
        : `Meeting Summary: ${meetingTitle}\n\n${truncatedSummary}\n\nView full details at ${process.env.APP_URL}/meetings/${meeting.id}`;

      // Send SMS to each participant
      const results = await Promise.allSettled(
        usersWithPhone.map(async (user) => {
          const phone = (user.metadata as any)?.phone;
          if (!phone) return null;

          return await this.smsService.sendSMS(message, {
            to: phone,
            metadata: {
              meetingId: meeting.id,
              userId: user.id,
              type: 'meeting_summary',
            },
          });
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      logger.info('SMS follow-up completed', {
        meetingId: meeting.id,
        successCount,
        failureCount,
        totalRecipients: usersWithPhone.length,
      });

      return {
        status: 'completed',
        sent: successCount,
        failed: failureCount,
        total: usersWithPhone.length,
      };
    } catch (error) {
      logger.error('Error executing SMS follow-up', { error, meetingId: meeting.id });
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute calendar follow-up
   */
  private async executeCalendarFollowUp(config: any, meeting: any) {
    try {
      if (!this.calendarAuth) {
        throw new Error('Google Calendar not configured');
      }

      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      const actionConfig = config.actionConfig;

      const event: calendar_v3.Schema$Event = {
        summary: actionConfig.title || `Follow-up: ${meeting.title}`,
        description: actionConfig.description || `Follow-up meeting for: ${meeting.title}`,
        start: {
          dateTime: actionConfig.startTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: actionConfig.timezone || 'UTC',
        },
        end: {
          dateTime: actionConfig.endTime || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          timeZone: actionConfig.timezone || 'UTC',
        },
        attendees: meeting.participants.map((p: any) => ({
          email: p.email,
        })),
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return { eventId: response.data.id, eventLink: response.data.htmlLink };
    } catch (error) {
      logger.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  /**
   * Execute webhook follow-up
   */
  private async executeWebhookFollowUp(config: any, meeting: any) {
    const actionConfig = config.actionConfig;
    const webhookUrl = actionConfig.url;

    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(actionConfig.headers || {}),
      },
      body: JSON.stringify({
        event: 'follow_up',
        meeting: {
          id: meeting.id,
          title: meeting.title,
          date: meeting.actualStartAt || meeting.scheduledStartAt,
        },
        config: config,
      }),
    });

    return {
      status: response.status,
      success: response.ok,
    };
  }

  /**
   * Execute task follow-up
   * Creates tasks from meeting action items and optionally syncs to external task systems
   */
  private async executeTaskFollowUp(config: any, meeting: any) {
    try {
      const actionConfig = config.actionConfig;

      // Get meeting summary with action items
      const summary = await prisma.meetingSummary.findFirst({
        where: { meetingId: meeting.id },
        orderBy: { createdAt: 'desc' },
      });

      const actionItemsData = summary.actionItems as any;
      const actionItems = Array.isArray(actionItemsData) ? actionItemsData : [];

      if (actionItems.length === 0) {
        logger.warn('No action items found for meeting', { meetingId: meeting.id });
        return { status: 'no_action_items', message: 'No action items to create tasks from' };
      }

      // Create tasks in database for each action item
      const createdTasks = await Promise.allSettled(
        actionItems.map(async (item) => {
          // Parse assignee to get user
          let assigneeUserId: string | undefined;
          if (item.assignee) {
            const user = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: { contains: item.assignee, mode: 'insensitive' } },
                  { firstName: { contains: item.assignee, mode: 'insensitive' } },
                  { lastName: { contains: item.assignee, mode: 'insensitive' } },
                ],
                organizationId: meeting.organizationId,
              },
            });
            assigneeUserId = user?.id;
          }

          // Create task
          const task = await prisma.task.create({
            data: {
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: item.text || 'Untitled task',
              description: `Action item from meeting: ${meeting.title}`,
              status: TaskStatus.open,
              priority: (actionConfig.defaultPriority as TaskPriority) || TaskPriority.medium,
              dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
              assignedTo: assigneeUserId,
              organizationId: meeting.organizationId,
              createdBy: meeting.createdBy || meeting.userId,
              sourceType: 'meeting',
              sourceId: meeting.id,
              metadata: {
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                extractedFrom: 'ai_summary',
              },
            },
          });

          logger.info('Task created from action item', {
            taskId: task.id,
            meetingId: meeting.id,
            assignee: item.assignee,
          });

          return task;
        })
      );

      const successTasks = createdTasks.filter(r => r.status === 'fulfilled');
      const failedTasks = createdTasks.filter(r => r.status === 'rejected');

      // If external task system integration is configured, sync tasks
      if (actionConfig.externalSystem) {
        await this.syncToExternalTaskSystem(
          actionConfig.externalSystem,
          successTasks
            .map(r => (r.status === 'fulfilled' ? r.value : null))
            .filter(Boolean),
          meeting
        );
      }

      logger.info('Task follow-up completed', {
        meetingId: meeting.id,
        createdTasks: successTasks.length,
        failedTasks: failedTasks.length,
        totalActionItems: actionItems.length,
      });

      return {
        status: 'completed',
        created: successTasks.length,
        failed: failedTasks.length,
        total: actionItems.length,
        tasks: successTasks.map(r => (r.status === 'fulfilled' ? r.value.id : null)),
      };
    } catch (error) {
      logger.error('Error executing task follow-up', { error, meetingId: meeting.id });
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync tasks to external task management system
   * Supports Asana, Jira, Linear, etc.
   */
  private async syncToExternalTaskSystem(
    system: string,
    tasks: any[],
    meeting: any
  ): Promise<void> {
    try {
      logger.info('Syncing tasks to external system', {
        system,
        taskCount: tasks.length,
        meetingId: meeting.id,
      });

      // Fetch integration credentials from database
      const integration = await prisma.integration.findFirst({
        where: {
          organizationId: meeting.organizationId,
          type: system.toLowerCase() as any,
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error(`No active ${system} integration found for organization`);
      }

      if (!integration.accessToken) {
        throw new Error(`${system} integration missing access token`);
      }

      const createdTaskIds: string[] = [];

      switch (system.toLowerCase()) {
        case 'asana': {
          // Initialize Asana client with access token
          const asanaClient = asana.Client.create().useAccessToken(integration.accessToken);

          // Get workspace and project IDs from integration settings
          const settings = integration.settings as any;
          if (!settings?.workspaceId || !settings?.projectId) {
            throw new Error('Asana integration missing workspace or project configuration');
          }

          // Create tasks in Asana
          for (const task of tasks) {
            try {
              const asanaTask = await asanaClient.tasks.create({
                workspace: settings.workspaceId,
                projects: [settings.projectId],
                name: task.title,
                notes: task.description || '',
                due_on: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : undefined,
                assignee: task.assigneeEmail ? settings.assigneeMapping?.[task.assigneeEmail] : undefined,
              });

              createdTaskIds.push(asanaTask.gid);
              logger.info('Created Asana task', {
                taskId: asanaTask.gid,
                title: task.title
              });
            } catch (taskError) {
              logger.error('Failed to create Asana task', {
                error: taskError,
                task: task.title
              });
              throw taskError;
            }
          }
          break;
        }

        case 'jira': {
          // Initialize Jira client
          const settings = integration.settings as any;
          if (!settings?.host || !settings?.projectKey) {
            throw new Error('Jira integration missing host or project configuration');
          }

          const jiraClient = new Version3Client({
            host: settings.host,
            authentication: {
              basic: {
                email: settings.email || '',
                apiToken: integration.accessToken,
              },
            },
          });

          // Create tasks in Jira
          for (const task of tasks) {
            try {
              const jiraIssue = await jiraClient.issues.createIssue({
                fields: {
                  project: {
                    key: settings.projectKey
                  },
                  summary: task.title,
                  description: {
                    type: 'doc',
                    version: 1,
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            type: 'text',
                            text: task.description || '',
                          },
                        ],
                      },
                    ],
                  },
                  issuetype: {
                    name: settings.issueType || 'Task'
                  },
                  duedate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : undefined,
                  priority: {
                    name: task.priority === TaskPriority.high ? 'High' :
                          task.priority === TaskPriority.low ? 'Low' : 'Medium'
                  },
                },
              });

              createdTaskIds.push(jiraIssue.key);
              logger.info('Created Jira issue', {
                issueKey: jiraIssue.key,
                title: task.title
              });
            } catch (taskError) {
              logger.error('Failed to create Jira issue', {
                error: taskError,
                task: task.title
              });
              throw taskError;
            }
          }
          break;
        }

        case 'linear': {
          // Initialize Linear client
          const linearClient = new LinearClient({
            apiKey: integration.accessToken,
          });

          // Get team ID from integration settings
          const settings = integration.settings as any;
          if (!settings?.teamId) {
            throw new Error('Linear integration missing team configuration');
          }

          // Create tasks in Linear
          for (const task of tasks) {
            try {
              const linearIssue = await linearClient.createIssue({
                teamId: settings.teamId,
                title: task.title,
                description: task.description || '',
                dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : undefined,
                priority: task.priority === TaskPriority.high ? 1 :
                         task.priority === TaskPriority.low ? 4 : 3,
                stateId: settings.defaultStateId, // Optional: default state for new issues
                assigneeId: task.assigneeEmail ? settings.assigneeMapping?.[task.assigneeEmail] : undefined,
              });

              const issue = await linearIssue.issue;
              if (issue) {
                createdTaskIds.push(issue.id);
                logger.info('Created Linear issue', {
                  issueId: issue.id,
                  title: task.title
                });
              }
            } catch (taskError) {
              logger.error('Failed to create Linear issue', {
                error: taskError,
                task: task.title
              });
              throw taskError;
            }
          }
          break;
        }

        default:
          throw new Error(`Unsupported task management system: ${system}`);
      }

      // Store sync metadata with external IDs
      await Promise.all(
        tasks.map((task, index) =>
          prisma.task.update({
            where: { id: task.id },
            data: {
              externalSystem: system,
              externalSyncedAt: new Date(),
              externalId: createdTaskIds[index] || null,
            },
          })
        )
      );

      logger.info('Successfully synced tasks to external system', {
        system,
        taskCount: tasks.length,
        createdTaskIds,
      });

    } catch (error) {
      logger.error('Error syncing to external task system', {
        error,
        system,
        meetingId: meeting.id
      });
      // Re-throw the error to let the caller handle it
      throw error;
    }
  }

  // ========================================
  // SMART SCHEDULING
  // ========================================

  /**
   * Get smart scheduling suggestions
   */
  async getSchedulingSuggestions(
    organizationId: string,
    userId: string,
    request: SchedulingRequest
  ): Promise<TimeSlot[]> {
    try {
      // Cache key for suggestions
      const cacheKey = `schedule:${organizationId}:${userId}:${JSON.stringify(request)}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const suggestions: TimeSlot[] = [];

      // Get calendar availability for all participants
      const availabilityMap = await this.getParticipantsAvailability(
        request.participantEmails,
        request.duration
      );

      // Find common free slots
      const now = new Date();
      const searchEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

      for (let day = new Date(now); day <= searchEnd; day.setDate(day.getDate() + 1)) {
        // Skip if day of week is excluded
        if (
          request.constraints?.daysOfWeek &&
          !request.constraints.daysOfWeek.includes(day.getDay())
        ) {
          continue;
        }

        // Skip if date is excluded
        if (
          request.constraints?.excludeDates?.some(
            (d) => d.toDateString() === day.toDateString()
          )
        ) {
          continue;
        }

        const startHour = request.constraints?.startHour || 9;
        const endHour = request.constraints?.endHour || 17;

        // Check each hour slot
        for (let hour = startHour; hour < endHour; hour++) {
          const slotStart = new Date(day);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + request.duration * 60 * 1000);

          // Check availability for all participants
          const conflicts: string[] = [];
          const available: string[] = [];

          for (const email of request.participantEmails) {
            const isAvailable = this.isTimeSlotAvailable(
              slotStart,
              slotEnd,
              availabilityMap.get(email) || []
            );

            if (isAvailable) {
              available.push(email);
            } else {
              conflicts.push(email);
            }
          }

          // Calculate confidence score
          const confidence =
            available.length / request.participantEmails.length;

          // Only include slots with at least 50% availability
          if (confidence >= 0.5) {
            suggestions.push({
              startTime: slotStart,
              endTime: slotEnd,
              confidence,
              attendeesAvailable: available,
              conflicts: conflicts.length > 0 ? conflicts : undefined,
            });
          }
        }
      }

      // Sort by confidence (highest first) and preferred times
      suggestions.sort((a, b) => {
        // Prefer suggested times if provided
        if (request.preferredTimes) {
          const aPreferred = request.preferredTimes.some(
            (t) => Math.abs(t.getTime() - a.startTime.getTime()) < 60 * 60 * 1000
          );
          const bPreferred = request.preferredTimes.some(
            (t) => Math.abs(t.getTime() - b.startTime.getTime()) < 60 * 60 * 1000
          );
          if (aPreferred && !bPreferred) return -1;
          if (!aPreferred && bPreferred) return 1;
        }

        // Then by confidence
        return b.confidence - a.confidence;
      });

      // Return top 10 suggestions
      const topSuggestions = suggestions.slice(0, 10);

      // Save to database
      await prisma.scheduleSuggestion.create({
        data: {
          organizationId,
          userId,
          requestData: request as any,
          suggestions: topSuggestions as any,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(topSuggestions));

      return topSuggestions;
    } catch (error) {
      logger.error('Failed to get scheduling suggestions:', error);
      throw error;
    }
  }

  /**
   * Get participants availability
   */
  private async getParticipantsAvailability(
    emails: string[],
    duration: number,
    organizerUserId?: string,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<Map<string, Array<{ start: Date; end: Date }>>> {
    try {
      const { googleCalendarService } = await import('./GoogleCalendarService');

      // Default time range: next 7 days
      const minTime = timeMin || new Date();
      const maxTime = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Use first email as organizer if not provided (for calendar access)
      const organizer = organizerUserId || emails[0];

      // Fetch busy times using Google Calendar API
      const busyTimesMap = await googleCalendarService.getBusyTimesByEmail(
        organizer,
        emails,
        minTime,
        maxTime
      );

      logger.info('Fetched participants availability', {
        participants: emails.length,
        duration,
      });

      return busyTimesMap;
    } catch (error) {
      logger.warn('Could not fetch calendar availability, returning empty:', error);

      // Fallback: return empty availability if calendar integration fails
      // This allows smart scheduling to still suggest times
      const emptyMap = new Map<string, Array<{ start: Date; end: Date }>>();
      emails.forEach(email => emptyMap.set(email, []));

      return emptyMap;
    }
  }

  /**
   * Check if time slot is available
   */
  private isTimeSlotAvailable(
    start: Date,
    end: Date,
    busyTimes: Array<{ start: Date; end: Date }>
  ): boolean {
    for (const busy of busyTimes) {
      if (
        (start >= busy.start && start < busy.end) ||
        (end > busy.start && end <= busy.end) ||
        (start <= busy.start && end >= busy.end)
      ) {
        return false;
      }
    }
    return true;
  }

  // ========================================
  // AUTOMATION RULES
  // ========================================

  /**
   * Create automation rule
   */
  async createAutomationRule(
    organizationId: string,
    userId: string,
    rule: {
      name: string;
      description?: string;
      trigger: string;
      conditions: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      actions: Array<{
        type: string;
        config: Record<string, any>;
      }>;
      priority?: number;
    }
  ) {
    try {
      const automationRule = await prisma.automationRule.create({
        data: {
          organizationId,
          userId,
          name: rule.name,
          description: rule.description,
          trigger: rule.trigger as any,
          conditions: rule.conditions as any,
          actions: rule.actions as any,
          priority: rule.priority || 50,
        },
      });

      logger.info('Automation rule created', { ruleId: automationRule.id });
      return automationRule;
    } catch (error) {
      logger.error('Failed to create automation rule:', error);
      throw error;
    }
  }

  /**
   * Get automation rules
   */
  async getAutomationRules(
    organizationId: string,
    filters?: {
      trigger?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const where: any = { organizationId };
      if (filters?.trigger) where.trigger = filters.trigger;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;

      return await prisma.automationRule.findMany({
        where,
        orderBy: { priority: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get automation rules:', error);
      throw error;
    }
  }

  /**
   * Execute automation rules
   */
  async executeAutomationRules(
    trigger: string,
    data: {
      meetingId?: string;
      organizationId: string;
      payload: Record<string, any>;
    }
  ) {
    try {
      const rules = await this.getAutomationRules(data.organizationId, {
        trigger,
        isActive: true,
      });

      logger.info('Executing automation rules', {
        trigger,
        ruleCount: rules.length,
      });

      for (const rule of rules) {
        const startTime = Date.now();

        try {
          // Check if conditions are met
          const conditionsMet = this.evaluateConditions(
            rule.conditions as any,
            data.payload
          );

          // Create execution record
          const execution = await prisma.ruleExecution.create({
            data: {
              ruleId: rule.id,
              meetingId: data.meetingId,
              triggeredBy: data.payload as any,
              conditionsMet,
              status: 'processing',
            },
          });

          if (!conditionsMet) {
            await prisma.ruleExecution.update({
              where: { id: execution.id },
              data: {
                status: 'skipped',
                executionTimeMs: Date.now() - startTime,
              },
            });
            continue;
          }

          // Execute actions
          const actionResults = [];
          const actions = rule.actions as any[];

          for (const action of actions) {
            const result = await this.executeRuleAction(
              action,
              data.payload,
              data.meetingId
            );
            actionResults.push(result);
          }

          // Update execution
          await prisma.ruleExecution.update({
            where: { id: execution.id },
            data: {
              status: 'completed',
              actionsResults: actionResults as any,
              executionTimeMs: Date.now() - startTime,
            },
          });

          // Update rule stats
          await prisma.automationRule.update({
            where: { id: rule.id },
            data: {
              executionCount: { increment: 1 },
              lastExecutedAt: new Date(),
            },
          });

          logger.info('Automation rule executed', {
            ruleId: rule.id,
            conditionsMet,
            actionsCount: actionResults.length,
          });
        } catch (error) {
          logger.error('Failed to execute automation rule:', {
            ruleId: rule.id,
            error,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to execute automation rules:', error);
      throw error;
    }
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>,
    data: Record<string, any>
  ): boolean {
    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(data, condition.field);

      let conditionMet = false;

      switch (condition.operator) {
        case 'equals':
          conditionMet = fieldValue === condition.value;
          break;
        case 'not_equals':
          conditionMet = fieldValue !== condition.value;
          break;
        case 'contains':
          conditionMet =
            typeof fieldValue === 'string' &&
            fieldValue.includes(condition.value);
          break;
        case 'not_contains':
          conditionMet =
            typeof fieldValue === 'string' &&
            !fieldValue.includes(condition.value);
          break;
        case 'greater_than':
          conditionMet = Number(fieldValue) > Number(condition.value);
          break;
        case 'less_than':
          conditionMet = Number(fieldValue) < Number(condition.value);
          break;
        case 'in':
          conditionMet = Array.isArray(condition.value) && condition.value.includes(fieldValue);
          break;
        case 'not_in':
          conditionMet = Array.isArray(condition.value) && !condition.value.includes(fieldValue);
          break;
        default:
          logger.warn(`Unknown operator: ${condition.operator}`);
          conditionMet = false;
      }

      if (!conditionMet) {
        return false; // All conditions must be met
      }
    }

    return true;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Execute rule action
   */
  private async executeRuleAction(
    action: { type: string; config: Record<string, any> },
    data: Record<string, any>,
    meetingId?: string
  ) {
    try {
      switch (action.type) {
        case 'send_email':
          // Queue email sending
          await this.queueService.addJob(JobType.EMAIL_NOTIFICATION, {
            type: JobType.EMAIL_NOTIFICATION,
            payload: {
              to: action.config.to,
              template: action.config.template,
              data: { ...data, meetingId },
            },
          });
          return { success: true, type: 'email' };

        case 'add_tag':
          if (meetingId && action.config.tag) {
            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                metadata: {
                  ...(data.metadata || {}),
                  tags: [
                    ...((data.metadata as any)?.tags || []),
                    action.config.tag,
                  ],
                },
              },
            });
          }
          return { success: true, type: 'tag', tag: action.config.tag };

        case 'trigger_webhook':
          await this.queueService.addJob(JobType.WEBHOOK_DELIVERY, {
            type: JobType.WEBHOOK_DELIVERY,
            payload: {
              url: action.config.url,
              data: { ...data, meetingId },
            },
          });
          return { success: true, type: 'webhook' };

        case 'send_notification':
          // Send in-app notification
          await prisma.notification.create({
            data: {
              userId: action.config.userId,
              type: 'in_app',
              channel: 'workflow_automation',
              recipient: action.config.userId,
              subject: action.config.subject,
              content: action.config.content,
            },
          });
          return { success: true, type: 'notification' };

        default:
          logger.warn(`Unknown action type: ${action.type}`);
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error) {
      logger.error('Failed to execute rule action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete automation rule
   */
  async deleteAutomationRule(id: string, organizationId: string) {
    try {
      await prisma.automationRule.delete({
        where: { id },
      });
      logger.info('Automation rule deleted', { ruleId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete automation rule:', error);
      return false;
    }
  }

  /**
   * Update automation rule
   */
  async updateAutomationRule(
    id: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      conditions: any[];
      actions: any[];
      isActive: boolean;
      priority: number;
    }>
  ) {
    try {
      return await prisma.automationRule.update({
        where: { id },
        data: {
          ...data,
          conditions: data.conditions as any,
          actions: data.actions as any,
        },
      });
    } catch (error) {
      logger.error('Failed to update automation rule:', error);
      throw error;
    }
  }
}
