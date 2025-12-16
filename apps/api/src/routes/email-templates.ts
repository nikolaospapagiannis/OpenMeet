/**
 * Email Templates API
 * CRUD operations for email templates
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, EmailTemplateType } from '@prisma/client';
import winston from 'winston';
import { emailService } from '../services/email';
import { authMiddleware as authenticate, requireRole } from '../middleware/auth';

// Helper to create authorize middleware
const authorize = (role: string) => requireRole([role, 'admin', 'owner']);

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'email-templates-api' },
  transports: [new winston.transports.Console()],
});

/**
 * Get all templates for an organization
 */
router.get('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user;
    const { type, isActive = true } = req.query;

    const where: any = {
      OR: [
        { organizationId },
        { isDefault: true },
      ],
      isActive: isActive === 'true',
    };

    if (type) {
      where.type = type as EmailTemplateType;
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'asc' },
        { version: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        type: true,
        name: true,
        subject: true,
        isDefault: true,
        isActive: true,
        version: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(templates);
  } catch (error) {
    logger.error('Failed to fetch templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get a specific template
 */
router.get('/templates/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { organizationId },
          { isDefault: true },
        ],
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    logger.error('Failed to fetch template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Create a new template
 */
router.post('/templates', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user;
    const {
      type,
      name,
      subject,
      htmlBody,
      textBody,
      variables,
    } = req.body;

    // Validate required fields
    if (!type || !name || !subject || !htmlBody) {
      return res.status(400).json({
        error: 'Missing required fields: type, name, subject, htmlBody',
      });
    }

    // Check if template already exists
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        organizationId,
        type,
        isActive: true,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Active template of this type already exists. Update existing template instead.',
      });
    }

    // Create new template
    const template = await prisma.emailTemplate.create({
      data: {
        organizationId,
        type,
        name,
        subject,
        htmlBody,
        textBody: textBody || null,
        variables: variables || [],
        version: 1,
        isDefault: false,
        isActive: true,
      },
    });

    // Clear cache for this template type
    await emailService.clearTemplateCache(organizationId);

    logger.info('Template created', {
      templateId: template.id,
      type,
      organizationId,
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error('Failed to create template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Update an existing template (creates new version)
 */
router.put('/templates/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const {
      subject,
      htmlBody,
      textBody,
      variables,
    } = req.body;

    // Fetch existing template
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.isDefault) {
      return res.status(403).json({
        error: 'Cannot modify default templates. Create a custom template instead.',
      });
    }

    // Create new version
    const newTemplate = await prisma.emailTemplate.create({
      data: {
        organizationId,
        type: existing.type,
        name: existing.name,
        subject: subject || existing.subject,
        htmlBody: htmlBody || existing.htmlBody,
        textBody: textBody || existing.textBody,
        variables: variables || existing.variables,
        version: existing.version + 1,
        isDefault: false,
        isActive: true,
      },
    });

    // Deactivate old version
    await prisma.emailTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    // Clear cache
    await emailService.clearTemplateCache(organizationId);

    logger.info('Template updated', {
      templateId: newTemplate.id,
      oldId: id,
      version: newTemplate.version,
      organizationId,
    });

    res.json(newTemplate);
  } catch (error) {
    logger.error('Failed to update template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Delete a template (soft delete - sets isActive to false)
 */
router.delete('/templates/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.isDefault) {
      return res.status(403).json({
        error: 'Cannot delete default templates',
      });
    }

    // Soft delete
    await prisma.emailTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    // Clear cache
    await emailService.clearTemplateCache(organizationId);

    logger.info('Template deleted', {
      templateId: id,
      organizationId,
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * Preview a template with sample data
 */
router.post('/templates/:id/preview', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const { data = {} } = req.body;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { organizationId },
          { isDefault: true },
        ],
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Add default context
    const context = {
      ...data,
      appName: process.env.APP_NAME || 'OpenMeet',
      appUrl: process.env.WEB_URL || 'http://localhost:3000',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@openmeet.com',
      currentYear: new Date().getFullYear(),
    };

    // Import Handlebars for preview
    const Handlebars = await import('handlebars');

    // Compile and render
    const subjectTemplate = Handlebars.compile(template.subject);
    const htmlTemplate = Handlebars.compile(template.htmlBody);
    const textTemplate = template.textBody ? Handlebars.compile(template.textBody) : null;

    const preview = {
      subject: subjectTemplate(context),
      htmlBody: htmlTemplate(context),
      textBody: textTemplate ? textTemplate(context) : null,
      variables: template.variables,
    };

    res.json(preview);
  } catch (error) {
    logger.error('Failed to preview template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

/**
 * Send test email
 */
router.post('/templates/:id/test', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId, email } = req.user;
    const { testEmail, data = {} } = req.body;

    const recipient = testEmail || email;

    if (!emailService.isValidEmail(recipient)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { organizationId },
          { isDefault: true },
        ],
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Add test data
    const testData = {
      ...data,
      isTest: true,
      testNote: 'This is a test email from the template editor',
    };

    // Use email service to send
    const templateConfig = {
      subject: template.subject,
      htmlContent: template.htmlBody,
      textContent: template.textBody || undefined,
    };

    const success = await emailService.sendEmail(templateConfig, {
      to: recipient,
      organizationId,
      metadata: {
        templateId: id,
        isTest: true,
      },
    });

    if (success) {
      logger.info('Test email sent', {
        templateId: id,
        recipient,
        organizationId,
      });

      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (error) {
    logger.error('Failed to send test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * Get template statistics
 */
router.get('/templates/:id/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { organizationId },
          { isDefault: true },
        ],
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get email logs for this template
    const where: any = {
      templateId: id,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [
      totalSent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
    ] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({
        where: { ...where, status: 'delivered' },
      }),
      prisma.emailLog.count({
        where: { ...where, status: 'opened' },
      }),
      prisma.emailLog.count({
        where: { ...where, status: 'clicked' },
      }),
      prisma.emailLog.count({
        where: { ...where, status: 'bounced' },
      }),
      prisma.emailLog.count({
        where: { ...where, status: 'failed' },
      }),
    ]);

    const stats = {
      templateId: id,
      templateName: template.name,
      totalSent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
      bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
      failureRate: totalSent > 0 ? (failed / totalSent) * 100 : 0,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt,
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch template stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Clear template cache
 */
router.post('/templates/cache/clear', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user;

    await emailService.clearTemplateCache(organizationId);

    logger.info('Template cache cleared', { organizationId });

    res.json({ message: 'Template cache cleared successfully' });
  } catch (error) {
    logger.error('Failed to clear template cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;