/**
 * Workflow Processor Worker
 * Bull queue worker for processing workflow automation tasks
 */

import Bull, { Job, Queue } from 'bull';
import Redis from 'ioredis';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { WorkflowAutomationService } from '../services/WorkflowAutomationService';
import { EmailService } from '../services/email';
import { EmailTemplateService } from '../services/EmailTemplateService';
import { QueueService } from '../services/queue';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'workflow-processor' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// Initialize services
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const emailService = new EmailService();
const queueService = new QueueService(redis);
const emailTemplateService = new EmailTemplateService();
const workflowService = new WorkflowAutomationService(
  emailService,
  queueService,
  redis
);

// Queue names
enum WorkflowJobType {
  APPLY_TEMPLATE = 'workflow:apply_template',
  AUTO_LINK_MEETINGS = 'workflow:auto_link_meetings',
  EXECUTE_FOLLOW_UP = 'workflow:execute_follow_up',
  EXECUTE_AUTOMATION_RULE = 'workflow:execute_automation_rule',
  SEND_SCHEDULED_EMAIL = 'workflow:send_scheduled_email',
  GENERATE_WEEKLY_DIGEST = 'workflow:generate_weekly_digest',
  PROCESS_SMART_SCHEDULING = 'workflow:process_smart_scheduling',
}

// Create Bull queues
const queues: Map<WorkflowJobType, Queue> = new Map();

Object.values(WorkflowJobType).forEach((jobType) => {
  const queue = new Bull(jobType, {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  queues.set(jobType, queue);

  // Set up error handlers
  queue.on('error', (error) => {
    logger.error(`Queue error [${jobType}]:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job failed [${jobType}]:`, {
      jobId: job.id,
      error: error.message,
    });
  });
});

/**
 * Process template application
 */
const processApplyTemplate = async (job: Job) => {
  const { templateId, meetingId, variableValues, organizationId } = job.data;

  logger.info('Processing template application', {
    jobId: job.id,
    templateId,
    meetingId,
  });

  try {
    await workflowService.applyTemplate(templateId, meetingId, variableValues);

    logger.info('Template applied successfully', {
      jobId: job.id,
      templateId,
      meetingId,
    });

    return { success: true, templateId, meetingId };
  } catch (error) {
    logger.error('Failed to apply template:', error);
    throw error;
  }
};

/**
 * Process auto-linking of meetings to threads
 */
const processAutoLinkMeetings = async (job: Job) => {
  const { meetingId, organizationId, criteria } = job.data;

  logger.info('Processing auto-link meetings', {
    jobId: job.id,
    meetingId,
  });

  try {
    const threadId = await workflowService.autoLinkMeetings(
      meetingId,
      organizationId,
      criteria
    );

    logger.info('Meeting auto-linked to thread', {
      jobId: job.id,
      meetingId,
      threadId,
    });

    return { success: true, meetingId, threadId };
  } catch (error) {
    logger.error('Failed to auto-link meeting:', error);
    throw error;
  }
};

/**
 * Process follow-up execution
 */
const processExecuteFollowUp = async (job: Job) => {
  const { configId, meetingId } = job.data;

  logger.info('Processing follow-up execution', {
    jobId: job.id,
    configId,
    meetingId,
  });

  try {
    const result = await workflowService.executeFollowUp(configId, meetingId);

    logger.info('Follow-up executed successfully', {
      jobId: job.id,
      configId,
      meetingId,
      result,
    });

    return { success: true, result };
  } catch (error) {
    logger.error('Failed to execute follow-up:', error);
    throw error;
  }
};

/**
 * Process automation rule execution
 */
const processExecuteAutomationRule = async (job: Job) => {
  const { trigger, organizationId, meetingId, payload } = job.data;

  logger.info('Processing automation rule execution', {
    jobId: job.id,
    trigger,
    organizationId,
    meetingId,
  });

  try {
    await workflowService.executeAutomationRules(trigger, {
      organizationId,
      meetingId,
      payload,
    });

    logger.info('Automation rules executed successfully', {
      jobId: job.id,
      trigger,
      meetingId,
    });

    return { success: true, trigger, meetingId };
  } catch (error) {
    logger.error('Failed to execute automation rules:', error);
    throw error;
  }
};

/**
 * Process scheduled email sending
 */
const processSendScheduledEmail = async (job: Job) => {
  const { to, template, data } = job.data;

  logger.info('Processing scheduled email', {
    jobId: job.id,
    to,
    template,
  });

  try {
    let emailContent;

    switch (template) {
      case 'meeting_summary':
        emailContent = emailTemplateService.renderMeetingSummary(data);
        break;
      case 'action_item_reminder':
        emailContent = emailTemplateService.renderActionItemReminder(data);
        break;
      case 'meeting_invitation':
        emailContent = emailTemplateService.renderMeetingInvitation(data);
        break;
      case 'weekly_digest':
        emailContent = emailTemplateService.renderWeeklyDigest(data);
        break;
      default:
        throw new Error(`Unknown email template: ${template}`);
    }

    await emailService.sendEmail(
      {
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
      },
      { to }
    );

    logger.info('Scheduled email sent successfully', {
      jobId: job.id,
      to,
      template,
    });

    return { success: true, to, template };
  } catch (error) {
    logger.error('Failed to send scheduled email:', error);
    throw error;
  }
};

/**
 * Process weekly digest generation
 */
const processGenerateWeeklyDigest = async (job: Job) => {
  const { organizationId, userId, userEmail } = job.data;

  logger.info('Processing weekly digest generation', {
    jobId: job.id,
    organizationId,
    userId,
  });

  try {
    // Calculate date range (last 7 days)
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Get meetings for the user
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        userId,
        status: 'completed',
        actualStartAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        participants: true,
        summaries: true,
      },
    });

    // Calculate stats
    const meetingsCount = meetings.length;
    const totalDuration = meetings.reduce(
      (sum, m) => sum + (m.durationSeconds || 0),
      0
    );

    // Extract action items
    const allActionItems: any[] = [];
    meetings.forEach((meeting) => {
      meeting.summaries.forEach((summary) => {
        const actionItems = (summary.actionItems as any) || [];
        allActionItems.push(...actionItems);
      });
    });

    // Get upcoming meetings
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        userId,
        status: { in: ['scheduled', 'in_progress'] },
        scheduledStartAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { scheduledStartAt: 'asc' },
      take: 5,
    });

    // Extract top insights
    const topInsights: string[] = [];
    meetings.forEach((meeting) => {
      meeting.summaries.forEach((summary) => {
        const keyPoints = (summary.keyPoints as any) || [];
        topInsights.push(...keyPoints.slice(0, 2));
      });
    });

    // Render and send email
    const emailContent = emailTemplateService.renderWeeklyDigest({
      weekStart,
      weekEnd,
      meetingsCount,
      totalDuration,
      actionItemsCount: allActionItems.length,
      topInsights: topInsights.slice(0, 5),
      upcomingMeetings: upcomingMeetings.map((m) => ({
        title: m.title,
        date: m.scheduledStartAt!,
      })),
    });

    await emailService.sendEmail(
      {
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
      },
      { to: userEmail }
    );

    logger.info('Weekly digest generated and sent', {
      jobId: job.id,
      userId,
      meetingsCount,
    });

    return {
      success: true,
      meetingsCount,
      actionItemsCount: allActionItems.length,
    };
  } catch (error) {
    logger.error('Failed to generate weekly digest:', error);
    throw error;
  }
};

/**
 * Process smart scheduling
 */
const processSmartScheduling = async (job: Job) => {
  const { organizationId, userId, request } = job.data;

  logger.info('Processing smart scheduling', {
    jobId: job.id,
    organizationId,
    userId,
  });

  try {
    const suggestions = await workflowService.getSchedulingSuggestions(
      organizationId,
      userId,
      request
    );

    logger.info('Smart scheduling completed', {
      jobId: job.id,
      suggestionsCount: suggestions.length,
    });

    return { success: true, suggestions };
  } catch (error) {
    logger.error('Failed to process smart scheduling:', error);
    throw error;
  }
};

// Register processors
queues.get(WorkflowJobType.APPLY_TEMPLATE)?.process(processApplyTemplate);
queues.get(WorkflowJobType.AUTO_LINK_MEETINGS)?.process(processAutoLinkMeetings);
queues.get(WorkflowJobType.EXECUTE_FOLLOW_UP)?.process(processExecuteFollowUp);
queues.get(WorkflowJobType.EXECUTE_AUTOMATION_RULE)?.process(processExecuteAutomationRule);
queues.get(WorkflowJobType.SEND_SCHEDULED_EMAIL)?.process(processSendScheduledEmail);
queues.get(WorkflowJobType.GENERATE_WEEKLY_DIGEST)?.process(processGenerateWeeklyDigest);
queues.get(WorkflowJobType.PROCESS_SMART_SCHEDULING)?.process(processSmartScheduling);

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  logger.info('Shutting down workflow processor...');

  const closePromises: Promise<void>[] = [];
  for (const queue of queues.values()) {
    closePromises.push(queue.close());
  }

  await Promise.all(closePromises);
  await prisma.$disconnect();
  await redis.quit();

  logger.info('Workflow processor shut down successfully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

logger.info('Workflow processor started successfully', {
  queues: Array.from(queues.keys()),
});

// Export queues for external use
export { queues, WorkflowJobType };
