/**
 * Workflow Automation Routes
 *
 * Comprehensive workflow automation endpoints for:
 * - Meeting Scheduler (Calendly-like booking)
 * - Agenda Templates
 * - Note Templates
 * - Thread/Channel Organization
 * - Topic Tracking
 * - Auto-Task Creation
 * - Auto-CRM Population
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { meetingSchedulerService } from '../services/MeetingSchedulerService';
import { agendaTemplateService } from '../services/AgendaTemplateService';
import { noteTemplateService } from '../services/NoteTemplateService';
import { threadViewService } from '../services/ThreadViewService';
import { topicTrackerService } from '../services/TopicTrackerService';
import { autoTaskCreationService } from '../services/AutoTaskCreationService';
import { autoCRMPopulationService } from '../services/AutoCRMPopulationService';
import { logger } from '../utils/logger';

export const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// ========================================
// MEETING SCHEDULER ROUTES
// ========================================

/**
 * POST /api/workflow/scheduler/booking-link
 * Create booking link
 */
router.post(
  '/scheduler/booking-link',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('slug').trim().notEmpty().withMessage('Slug is required'),
    body('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
    body('availability').isObject().withMessage('Availability is required'),
    body('description').optional().trim(),
    body('bufferTime').optional().isInt({ min: 0 }),
    body('customQuestions').optional().isArray(),
    body('confirmationMessage').optional().trim(),
    body('redirectUrl').optional().isURL(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const link = await meetingSchedulerService.createSchedulingLink(
        userId,
        organizationId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: link,
        bookingUrl: `${process.env.FRONTEND_URL}/book/${link.slug}`,
      });
    } catch (error) {
      logger.error('Error creating booking link', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create booking link',
      });
    }
  }
);

/**
 * GET /api/workflow/scheduler/links
 * Get user's scheduling links
 */
router.get('/scheduler/links', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const links = await meetingSchedulerService.getUpcomingBookings(userId);

    res.json({
      success: true,
      data: links,
    });
  } catch (error) {
    logger.error('Error getting scheduling links', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduling links',
    });
  }
});

/**
 * GET /api/workflow/scheduler/available-slots
 * Get available time slots for booking
 */
router.get(
  '/scheduler/available-slots',
  [
    query('linkId').isUUID().withMessage('Valid link ID is required'),
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { linkId, startDate, endDate } = req.query as any;

      const slots = await meetingSchedulerService.getAvailableSlots(
        linkId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: slots,
        count: slots.length,
      });
    } catch (error) {
      logger.error('Error getting available slots', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get available slots',
      });
    }
  }
);

// ========================================
// AGENDA TEMPLATE ROUTES
// ========================================

/**
 * GET /api/workflow/templates/agenda
 * List agenda templates
 */
router.get(
  '/templates/agenda',
  [
    query('type').optional().trim(),
    query('tags').optional(),
    query('isActive').optional().isBoolean().toBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;
      const { type, tags, isActive } = req.query as any;

      const templates = await agendaTemplateService.getTemplates(organizationId, {
        type,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        isActive,
      });

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      logger.error('Error getting agenda templates', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get agenda templates',
      });
    }
  }
);

/**
 * POST /api/workflow/templates/agenda
 * Create custom agenda template
 */
router.post(
  '/templates/agenda',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one agenda item is required'),
    body('type').optional().trim(),
    body('tags').optional().isArray(),
    body('variables').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const template = await agendaTemplateService.createTemplate(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Error creating agenda template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create agenda template',
      });
    }
  }
);

/**
 * POST /api/workflow/templates/agenda/:id/apply
 * Apply agenda template to meeting
 */
router.post(
  '/templates/agenda/:id/apply',
  [
    param('id').isUUID().withMessage('Valid template ID is required'),
    body('meetingId').isUUID().withMessage('Valid meeting ID is required'),
    body('variables').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { id: templateId } = req.params;
      const { meetingId, variables } = req.body;

      const agenda = await agendaTemplateService.createAgendaFromTemplate(
        meetingId,
        templateId,
        userId,
        variables
      );

      res.status(201).json({
        success: true,
        data: agenda,
      });
    } catch (error) {
      logger.error('Error applying agenda template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to apply agenda template',
      });
    }
  }
);

// ========================================
// NOTE TEMPLATE ROUTES
// ========================================

/**
 * GET /api/workflow/templates/note
 * List note templates
 */
router.get(
  '/templates/note',
  [
    query('category').optional().trim(),
    query('tags').optional(),
    query('isActive').optional().isBoolean().toBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;
      const { category, tags, isActive } = req.query as any;

      const templates = await noteTemplateService.getTemplates(organizationId, {
        category,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        isActive,
      });

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      logger.error('Error getting note templates', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get note templates',
      });
    }
  }
);

/**
 * POST /api/workflow/templates/note
 * Create custom note template
 */
router.post(
  '/templates/note',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('sections').isArray({ min: 1 }).withMessage('At least one section is required'),
    body('variables').isArray().withMessage('Variables array is required'),
    body('category').optional().trim(),
    body('tags').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const template = await noteTemplateService.createTemplate(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Error creating note template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create note template',
      });
    }
  }
);

/**
 * POST /api/workflow/templates/note/:id/auto-fill
 * Auto-fill note template with AI
 */
router.post(
  '/templates/note/:id/auto-fill',
  [
    param('id').isUUID().withMessage('Valid template ID is required'),
    body('meetingId').isUUID().withMessage('Valid meeting ID is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { id: templateId } = req.params;
      const { meetingId } = req.body;

      const note = await noteTemplateService.autoFillWithAI(
        meetingId,
        templateId,
        userId
      );

      res.status(201).json({
        success: true,
        data: note,
      });
    } catch (error) {
      logger.error('Error auto-filling note template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to auto-fill note template',
      });
    }
  }
);

// ========================================
// THREAD/CHANNEL ORGANIZATION ROUTES
// ========================================

/**
 * GET /api/workflow/threads
 * List meeting threads
 */
router.get(
  '/threads',
  [
    query('type').optional().trim(),
    query('tags').optional(),
    query('isArchived').optional().isBoolean().toBoolean(),
    query('search').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { type, tags, isArchived, search } = req.query as any;

      const threads = await threadViewService.getThreads(
        organizationId,
        userId,
        {
          type,
          tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
          isArchived,
          search,
        }
      );

      res.json({
        success: true,
        data: threads,
        count: threads.length,
      });
    } catch (error) {
      logger.error('Error getting threads', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get threads',
      });
    }
  }
);

/**
 * POST /api/workflow/threads
 * Create meeting thread
 */
router.post(
  '/threads',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').optional().trim(),
    body('type').optional().isIn(['project', 'topic', 'team', 'customer', 'custom']),
    body('color').optional().trim(),
    body('icon').optional().trim(),
    body('members').optional().isArray(),
    body('tags').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const thread = await threadViewService.createThread(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: thread,
      });
    } catch (error) {
      logger.error('Error creating thread', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create thread',
      });
    }
  }
);

/**
 * GET /api/workflow/threads/:id
 * Get thread with meetings
 */
router.get(
  '/threads/:id',
  [param('id').isUUID().withMessage('Valid thread ID is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { id } = req.params;

      const thread = await threadViewService.getThreadWithMeetings(id, userId);

      if (!thread) {
        res.status(404).json({
          success: false,
          error: 'Thread not found',
        });
        return;
      }

      res.json({
        success: true,
        data: thread,
      });
    } catch (error) {
      logger.error('Error getting thread', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get thread',
      });
    }
  }
);

/**
 * POST /api/workflow/threads/:id/meetings
 * Add meeting to thread
 */
router.post(
  '/threads/:id/meetings',
  [
    param('id').isUUID().withMessage('Valid thread ID is required'),
    body('meetingId').isUUID().withMessage('Valid meeting ID is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const { id: threadId } = req.params;
      const { meetingId } = req.body;

      await threadViewService.addMeetingToThread(threadId, meetingId, userId);

      res.json({
        success: true,
        message: 'Meeting added to thread',
      });
    } catch (error) {
      logger.error('Error adding meeting to thread', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to add meeting to thread',
      });
    }
  }
);

// ========================================
// TOPIC TRACKER ROUTES
// ========================================

/**
 * GET /api/workflow/topics/track
 * Get topic trackers
 */
router.get('/topics/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user.organizationId;

    const trackers = await topicTrackerService.getTrackers(organizationId);

    res.json({
      success: true,
      data: trackers,
      count: trackers.length,
    });
  } catch (error) {
    logger.error('Error getting topic trackers', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get topic trackers',
    });
  }
});

/**
 * POST /api/workflow/topics/track
 * Create topic tracker
 */
router.post(
  '/topics/track',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('keywords').isArray({ min: 1 }).withMessage('At least one keyword is required'),
    body('description').optional().trim(),
    body('alertEnabled').optional().isBoolean(),
    body('alertThreshold').optional().isInt({ min: 1 }),
    body('alertRecipients').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const tracker = await topicTrackerService.createTracker(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: tracker,
      });
    } catch (error) {
      logger.error('Error creating topic tracker', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create topic tracker',
      });
    }
  }
);

/**
 * GET /api/workflow/topics/:id/trend
 * Get topic trend analysis
 */
router.get(
  '/topics/:id/trend',
  [
    param('id').isUUID().withMessage('Valid tracker ID is required'),
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required'),
    query('interval').optional().isIn(['day', 'week', 'month']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { startDate, endDate, interval } = req.query as any;

      const trend = await topicTrackerService.getTopicTrend(
        id,
        new Date(startDate),
        new Date(endDate),
        interval || 'day'
      );

      res.json({
        success: true,
        data: trend,
      });
    } catch (error) {
      logger.error('Error getting topic trend', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get topic trend',
      });
    }
  }
);

/**
 * GET /api/workflow/topics/:id/analytics
 * Get topic analytics
 */
router.get(
  '/topics/:id/analytics',
  [
    param('id').isUUID().withMessage('Valid tracker ID is required'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { startDate, endDate } = req.query as any;

      const analytics = await topicTrackerService.getTopicAnalytics(
        id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting topic analytics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get topic analytics',
      });
    }
  }
);

// ========================================
// AUTO-TASK CREATION ROUTES
// ========================================

/**
 * POST /api/workflow/tasks/auto-create
 * Auto-create tasks from meeting
 */
router.post(
  '/tasks/auto-create',
  [body('meetingId').isUUID().withMessage('Valid meeting ID is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { meetingId } = req.body;

      const tasks = await autoTaskCreationService.autoCreateTasks(
        meetingId,
        organizationId
      );

      res.status(201).json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    } catch (error) {
      logger.error('Error auto-creating tasks', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to auto-create tasks',
      });
    }
  }
);

/**
 * POST /api/workflow/tasks/config
 * Create task creation configuration
 */
router.post(
  '/tasks/config',
  [
    body('platform')
      .isIn(['asana', 'jira', 'linear', 'monday', 'clickup', 'internal'])
      .withMessage('Valid platform is required'),
    body('platformConfig').isObject().withMessage('Platform config is required'),
    body('autoCreate').optional().isBoolean(),
    body('requireApproval').optional().isBoolean(),
    body('minConfidence').optional().isFloat({ min: 0, max: 1 }),
    body('taskPrefix').optional().trim(),
    body('defaultDueDays').optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const config = await autoTaskCreationService.createConfig(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error creating task config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create task config',
      });
    }
  }
);

/**
 * GET /api/workflow/tasks/:meetingId
 * Get created tasks for meeting
 */
router.get(
  '/tasks/:meetingId',
  [param('meetingId').isUUID().withMessage('Valid meeting ID is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { meetingId } = req.params;

      const tasks = await autoTaskCreationService.getCreatedTasks(meetingId);

      res.json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    } catch (error) {
      logger.error('Error getting created tasks', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get created tasks',
      });
    }
  }
);

// ========================================
// AUTO-CRM POPULATION ROUTES
// ========================================

/**
 * POST /api/workflow/crm/auto-populate
 * Auto-populate CRM from meeting
 */
router.post(
  '/crm/auto-populate',
  [
    body('meetingId').isUUID().withMessage('Valid meeting ID is required'),
    body('crmRecordId').optional().trim(),
    body('crmRecordType')
      .optional()
      .isIn(['contact', 'lead', 'deal', 'account', 'opportunity']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { meetingId, crmRecordId, crmRecordType } = req.body;

      const updates = await autoCRMPopulationService.autoPopulateCRM(
        meetingId,
        organizationId,
        crmRecordId,
        crmRecordType
      );

      res.status(201).json({
        success: true,
        data: updates,
        count: updates.length,
      });
    } catch (error) {
      logger.error('Error auto-populating CRM', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to auto-populate CRM',
      });
    }
  }
);

/**
 * POST /api/workflow/crm/config
 * Create CRM configuration
 */
router.post(
  '/crm/config',
  [
    body('platform')
      .isIn(['salesforce', 'hubspot', 'pipedrive', 'zoho', 'dynamics', 'custom'])
      .withMessage('Valid platform is required'),
    body('platformConfig').isObject().withMessage('Platform config is required'),
    body('autoPopulate').optional().isBoolean(),
    body('populationRules').optional().isArray(),
    body('autoDealStage').optional().isBoolean(),
    body('dealStageRules').optional().isArray(),
    body('logActivities').optional().isBoolean(),
    body('activityMapping').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const config = await autoCRMPopulationService.createConfig(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error creating CRM config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create CRM config',
      });
    }
  }
);

/**
 * GET /api/workflow/crm/updates/:meetingId
 * Get CRM updates for meeting
 */
router.get(
  '/crm/updates/:meetingId',
  [param('meetingId').isUUID().withMessage('Valid meeting ID is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { meetingId } = req.params;

      const updates = await autoCRMPopulationService.getCRMUpdates(meetingId);

      res.json({
        success: true,
        data: updates,
        count: updates.length,
      });
    } catch (error) {
      logger.error('Error getting CRM updates', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get CRM updates',
      });
    }
  }
);

export default router;
