/**
 * Workflow Automation Routes
 * Templates, threads, follow-ups, scheduling, and automation rules
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { body, query, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { WorkflowAutomationService } from '../services/WorkflowAutomationService';
import { EmailService } from '../services/email';
import { QueueService } from '../services/queue';

const router: Router = Router();
const prisma = new PrismaClient();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'workflows-routes' },
  transports: [new winston.transports.Console()],
});

// Initialize services
const emailService = new EmailService();
const queueService = new QueueService(redis);
const workflowService = new WorkflowAutomationService(
  emailService,
  queueService,
  redis
);

// All routes require authentication
router.use(authMiddleware);

// ========================================
// MEETING TEMPLATES
// ========================================

/**
 * POST /api/workflows/templates
 * Create meeting template
 */
router.post(
  '/templates',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type')
      .isIn(['one_on_one', 'team_meeting', 'client_call', 'interview', 'standup', 'retrospective', 'custom'])
      .withMessage('Invalid template type'),
    body('templateData').isObject().withMessage('Template data must be an object'),
    body('description').optional().trim(),
    body('variables').optional().isArray(),
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

      const template = await workflowService.createTemplate(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Failed to create template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create template',
      });
    }
  }
);

/**
 * GET /api/workflows/templates
 * List meeting templates
 */
router.get(
  '/templates',
  [
    query('type').optional().trim(),
    query('isActive').optional().isBoolean().toBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { type, isActive } = req.query;

      const templates = await workflowService.getTemplates(organizationId, {
        type: type as string | undefined,
        isActive: isActive !== undefined ? isActive as unknown as boolean : undefined,
      });

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      logger.error('Failed to get templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get templates',
      });
    }
  }
);

/**
 * GET /api/workflows/templates/:id
 * Get template by ID
 */
router.get(
  '/templates/:id',
  [param('id').isUUID().withMessage('Invalid template ID')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const template = await workflowService.getTemplate(
        req.params.id,
        organizationId
      );

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Failed to get template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get template',
      });
    }
  }
);

/**
 * PUT /api/workflows/templates/:id
 * Update template
 */
router.put(
  '/templates/:id',
  [
    param('id').isUUID().withMessage('Invalid template ID'),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('templateData').optional().isObject(),
    body('variables').optional().isArray(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const template = await workflowService.updateTemplate(
        req.params.id,
        organizationId,
        req.body
      );

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Failed to update template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update template',
      });
    }
  }
);

/**
 * DELETE /api/workflows/templates/:id
 * Delete template
 */
router.delete(
  '/templates/:id',
  [param('id').isUUID().withMessage('Invalid template ID')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const success = await workflowService.deleteTemplate(
        req.params.id,
        organizationId
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete template',
      });
    }
  }
);

/**
 * POST /api/workflows/templates/:id/apply
 * Apply template to meeting
 */
router.post(
  '/templates/:id/apply',
  [
    param('id').isUUID().withMessage('Invalid template ID'),
    body('meetingId').isUUID().withMessage('Invalid meeting ID'),
    body('variableValues').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { meetingId, variableValues } = req.body;

      await workflowService.applyTemplate(
        req.params.id,
        meetingId,
        variableValues
      );

      res.json({
        success: true,
        message: 'Template applied successfully',
      });
    } catch (error) {
      logger.error('Failed to apply template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply template',
      });
    }
  }
);

/**
 * POST /api/workflows/templates/suggest
 * Get template suggestion based on meeting data
 */
router.post(
  '/templates/suggest',
  [
    body('title').optional().trim(),
    body('participants').optional().isArray(),
    body('duration').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const suggestion = await workflowService.suggestTemplate(
        organizationId,
        req.body
      );

      res.json({
        success: true,
        data: suggestion,
      });
    } catch (error) {
      logger.error('Failed to suggest template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suggest template',
      });
    }
  }
);

// ========================================
// CONVERSATION THREADS
// ========================================

/**
 * GET /api/workflows/threads
 * List conversation threads
 */
router.get(
  '/threads',
  [
    query('search').optional().trim(),
    query('isArchived').optional().isBoolean().toBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const threads = await workflowService.getThreads(
        organizationId,
        req.query as any
      );

      res.json({
        success: true,
        data: threads,
        count: threads.length,
      });
    } catch (error) {
      logger.error('Failed to get threads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get threads',
      });
    }
  }
);

/**
 * GET /api/workflows/threads/:id
 * Get thread with all meetings
 */
router.get(
  '/threads/:id',
  [param('id').isUUID().withMessage('Invalid thread ID')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const thread = await workflowService.getThreadWithMeetings(
        req.params.id,
        organizationId
      );

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
      logger.error('Failed to get thread:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get thread',
      });
    }
  }
);

/**
 * POST /api/workflows/threads
 * Create conversation thread
 */
router.post(
  '/threads',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('topic').optional().trim(),
    body('participantEmails').isArray().withMessage('Participant emails must be an array'),
    body('meetingIds').isArray().withMessage('Meeting IDs must be an array'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const thread = await workflowService.createThread(
        organizationId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: thread,
      });
    } catch (error) {
      logger.error('Failed to create thread:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create thread',
      });
    }
  }
);

/**
 * POST /api/workflows/threads/auto-link
 * Auto-link meeting to thread
 */
router.post(
  '/threads/auto-link',
  [
    body('meetingId').isUUID().withMessage('Invalid meeting ID'),
    body('criteria').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { meetingId, criteria } = req.body;

      const threadId = await workflowService.autoLinkMeetings(
        meetingId,
        organizationId,
        criteria
      );

      res.json({
        success: true,
        data: { threadId, meetingId },
      });
    } catch (error) {
      logger.error('Failed to auto-link meeting:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-link meeting',
      });
    }
  }
);

// ========================================
// AUTOMATED FOLLOW-UPS
// ========================================

/**
 * POST /api/workflows/follow-ups/configure
 * Configure follow-up rule
 */
router.post(
  '/follow-ups/configure',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('trigger')
      .isIn(['meeting_end', 'action_item_created', 'deadline_approaching', 'meeting_scheduled', 'custom'])
      .withMessage('Invalid trigger type'),
    body('action')
      .isIn(['send_email', 'send_sms', 'create_calendar_event', 'send_webhook', 'create_task'])
      .withMessage('Invalid action type'),
    body('config').isObject().withMessage('Config must be an object'),
    body('description').optional().trim(),
    body('conditions').optional().isObject(),
    body('delayMinutes').optional().isInt({ min: 0 }),
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

      const config = await workflowService.configureFollowUp(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Failed to configure follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to configure follow-up',
      });
    }
  }
);

/**
 * GET /api/workflows/follow-ups
 * Get follow-up configurations
 */
router.get('/follow-ups', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user.organizationId;
    const configs = await workflowService.getFollowUpConfigs(organizationId);

    res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    logger.error('Failed to get follow-up configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get follow-up configs',
    });
  }
});

/**
 * POST /api/workflows/follow-ups/:configId/execute
 * Execute follow-up manually
 */
router.post(
  '/follow-ups/:configId/execute',
  [
    param('configId').isUUID().withMessage('Invalid config ID'),
    body('meetingId').isUUID().withMessage('Invalid meeting ID'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { configId } = req.params;
      const { meetingId } = req.body;

      const result = await workflowService.executeFollowUp(configId, meetingId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to execute follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute follow-up',
      });
    }
  }
);

// ========================================
// SMART SCHEDULING
// ========================================

/**
 * POST /api/workflows/smart-schedule
 * Get smart scheduling suggestions
 */
router.post(
  '/smart-schedule',
  [
    body('duration').isInt({ min: 15 }).withMessage('Duration must be at least 15 minutes'),
    body('participantEmails')
      .isArray({ min: 1 })
      .withMessage('At least one participant email is required'),
    body('preferredTimes').optional().isArray(),
    body('constraints').optional().isObject(),
    body('timezone').optional().trim(),
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

      const suggestions = await workflowService.getSchedulingSuggestions(
        organizationId,
        userId,
        req.body
      );

      res.json({
        success: true,
        data: suggestions,
        count: suggestions.length,
      });
    } catch (error) {
      logger.error('Failed to get scheduling suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scheduling suggestions',
      });
    }
  }
);

// ========================================
// AUTOMATION RULES
// ========================================

/**
 * POST /api/workflows/rules
 * Create automation rule
 */
router.post(
  '/rules',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('trigger')
      .isIn([
        'meeting_created',
        'meeting_completed',
        'transcript_ready',
        'summary_generated',
        'participant_joined',
        'action_item_created',
        'keyword_detected',
        'sentiment_detected',
        'duration_exceeded',
        'scheduled',
      ])
      .withMessage('Invalid trigger type'),
    body('conditions').isArray().withMessage('Conditions must be an array'),
    body('actions').isArray({ min: 1 }).withMessage('At least one action is required'),
    body('description').optional().trim(),
    body('priority').optional().isInt({ min: 1, max: 100 }),
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

      const rule = await workflowService.createAutomationRule(
        organizationId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      logger.error('Failed to create automation rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create automation rule',
      });
    }
  }
);

/**
 * GET /api/workflows/rules
 * List automation rules
 */
router.get(
  '/rules',
  [
    query('trigger').optional().trim(),
    query('isActive').optional().isBoolean().toBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const rules = await workflowService.getAutomationRules(
        organizationId,
        req.query as any
      );

      res.json({
        success: true,
        data: rules,
        count: rules.length,
      });
    } catch (error) {
      logger.error('Failed to get automation rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get automation rules',
      });
    }
  }
);

/**
 * PUT /api/workflows/rules/:id
 * Update automation rule
 */
router.put(
  '/rules/:id',
  [
    param('id').isUUID().withMessage('Invalid rule ID'),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('conditions').optional().isArray(),
    body('actions').optional().isArray(),
    body('isActive').optional().isBoolean(),
    body('priority').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const rule = await workflowService.updateAutomationRule(
        req.params.id,
        organizationId,
        req.body
      );

      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      logger.error('Failed to update automation rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update automation rule',
      });
    }
  }
);

/**
 * DELETE /api/workflows/rules/:id
 * Delete automation rule
 */
router.delete(
  '/rules/:id',
  [param('id').isUUID().withMessage('Invalid rule ID')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const success = await workflowService.deleteAutomationRule(
        req.params.id,
        organizationId
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Rule deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete automation rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete automation rule',
      });
    }
  }
);

/**
 * POST /api/workflows/rules/test
 * Test automation rule execution
 */
router.post(
  '/rules/test',
  [
    body('trigger').trim().notEmpty(),
    body('payload').isObject(),
    body('meetingId').optional().isUUID(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const { trigger, payload, meetingId } = req.body;

      await workflowService.executeAutomationRules(trigger, {
        organizationId,
        meetingId,
        payload,
      });

      res.json({
        success: true,
        message: 'Automation rules tested successfully',
      });
    } catch (error) {
      logger.error('Failed to test automation rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test automation rules',
      });
    }
  }
);

export default router;
