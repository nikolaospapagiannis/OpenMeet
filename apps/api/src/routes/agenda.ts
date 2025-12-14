/**
 * Agenda Routes
 * API endpoints for auto-generating and managing meeting agendas
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permission-check';
import { autoAgendaService } from '../services/ai/AutoAgendaService';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'agenda-routes' },
  transports: [new winston.transports.Console()],
});

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/meetings/:id/agenda/generate
 * Generate an AI-powered agenda for a meeting
 */
router.post(
  '/:id/agenda/generate',
  requirePermission('meetings.update'),
  [
    param('id').isUUID(),
    body('meetingType').optional().isString(),
    body('duration').optional().isInt({ min: 5, max: 480 }),
    body('context').optional().isObject(),
    body('context.previousMeetingIds').optional().isArray(),
    body('context.openActionItems').optional().isBoolean(),
    body('context.calendarContext').optional().isBoolean(),
    body('context.projectIds').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Get meeting details
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: true
        }
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      if (meeting.organizationId !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Extract attendee emails
      const attendeeEmails = meeting.participants
        .filter(p => p.email)
        .map(p => p.email as string);

      // Generate agenda using AI service
      const result = await autoAgendaService.generateAgenda({
        meetingId,
        meetingTitle: meeting.title,
        meetingType: req.body.meetingType,
        duration: req.body.duration || meeting.durationSeconds ? Math.round(meeting.durationSeconds / 60) : 60,
        attendeeEmails,
        organizationId,
        userId,
        context: req.body.context
      });

      logger.info('Generated agenda', {
        meetingId,
        itemCount: result.agenda.items.length,
        context: result.context
      });

      res.json({
        success: true,
        agenda: result.agenda,
        suggestions: result.suggestions,
        context: result.context
      });
    } catch (error: any) {
      logger.error('Failed to generate agenda', { error: error.message });
      res.status(500).json({
        error: 'Failed to generate agenda',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/meetings/:id/agenda
 * Get the agenda for a meeting
 */
router.get(
  '/:id/agenda',
  requirePermission('meetings.read'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const organizationId = (req as any).user.organizationId;

      // Verify meeting access
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      if (meeting.organizationId !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Get agenda
      const agenda = await autoAgendaService.getAgenda(meetingId);

      if (!agenda) {
        res.status(404).json({ error: 'No agenda found for this meeting' });
        return;
      }

      res.json({
        success: true,
        agenda
      });
    } catch (error: any) {
      logger.error('Failed to get agenda', { error: error.message });
      res.status(500).json({
        error: 'Failed to get agenda',
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/meetings/:id/agenda
 * Update the agenda for a meeting
 */
router.put(
  '/:id/agenda',
  requirePermission('meetings.update'),
  [
    param('id').isUUID(),
    body('items').isArray(),
    body('items.*.title').isString(),
    body('items.*.duration').isInt({ min: 1 }),
    body('items.*.priority').isIn(['high', 'medium', 'low']),
    body('items.*.type').isIn(['discussion', 'decision', 'update', 'brainstorm', 'review']),
    body('items.*.order').isInt({ min: 1 }),
    body('items.*.description').optional().isString(),
    body('items.*.owner').optional().isString(),
    body('items.*.notes').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const organizationId = (req as any).user.organizationId;

      // Verify meeting access
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      if (meeting.organizationId !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Update agenda
      const items = req.body.items.map((item: any, index: number) => ({
        id: item.id || `item-${Date.now()}-${index}`,
        ...item
      }));

      const agenda = await autoAgendaService.updateAgenda(meetingId, items);

      logger.info('Updated agenda', { meetingId, itemCount: items.length });

      res.json({
        success: true,
        agenda
      });
    } catch (error: any) {
      logger.error('Failed to update agenda', { error: error.message });
      res.status(500).json({
        error: 'Failed to update agenda',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/meetings/:id/agenda
 * Delete the agenda for a meeting
 */
router.delete(
  '/:id/agenda',
  requirePermission('meetings.update'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const meetingId = req.params.id;
      const organizationId = (req as any).user.organizationId;

      // Verify meeting access
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      if (meeting.organizationId !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Remove agenda from metadata
      const metadata = meeting.metadata as any;
      delete metadata.agenda;

      await prisma.meeting.update({
        where: { id: meetingId },
        data: { metadata }
      });

      logger.info('Deleted agenda', { meetingId });

      res.json({
        success: true,
        message: 'Agenda deleted'
      });
    } catch (error: any) {
      logger.error('Failed to delete agenda', { error: error.message });
      res.status(500).json({
        error: 'Failed to delete agenda',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/agenda/templates
 * List available agenda templates
 */
router.get(
  '/templates',
  requirePermission('meetings.read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;

      const templates = await autoAgendaService.getTemplates(organizationId);

      res.json({
        success: true,
        templates
      });
    } catch (error: any) {
      logger.error('Failed to get templates', { error: error.message });
      res.status(500).json({
        error: 'Failed to get templates',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/agenda/templates
 * Create a custom agenda template
 */
router.post(
  '/templates',
  requirePermission('meetings.create'),
  [
    body('name').isString().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().isString(),
    body('type').isIn(['one_on_one', 'team_standup', 'sprint_planning', 'customer_call', 'sales_demo', 'project_review', 'custom']),
    body('items').isArray(),
    body('items.*.title').isString(),
    body('items.*.duration').isInt({ min: 1 }),
    body('items.*.priority').isIn(['high', 'medium', 'low']),
    body('items.*.type').isIn(['discussion', 'decision', 'update', 'brainstorm', 'review']),
    body('items.*.order').isInt({ min: 1 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;

      const template = await autoAgendaService.createTemplate(organizationId, {
        name: req.body.name,
        description: req.body.description || '',
        type: req.body.type,
        items: req.body.items,
        isPublic: false
      });

      logger.info('Created custom template', {
        templateId: template.id,
        organizationId
      });

      res.status(201).json({
        success: true,
        template
      });
    } catch (error: any) {
      logger.error('Failed to create template', { error: error.message });
      res.status(500).json({
        error: 'Failed to create template',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/agenda/templates/:id
 * Get a specific agenda template
 */
router.get(
  '/templates/:id',
  requirePermission('meetings.read'),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const templateId = req.params.id;

      const templates = await autoAgendaService.getTemplates(organizationId);
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({
        success: true,
        template
      });
    } catch (error: any) {
      logger.error('Failed to get template', { error: error.message });
      res.status(500).json({
        error: 'Failed to get template',
        message: error.message
      });
    }
  }
);

export default router;
