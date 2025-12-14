/**
 * Template Routes
 * Endpoints for managing note templates
 *
 * Pre-built templates are stored in the database with isPreBuilt=true and no organizationId.
 * Custom templates are created by users and belong to an organization.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, TemplateType } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { rateLimitByEndpoint } from '../middleware/rate-limit';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Helper function to map category strings to TemplateType enum
function mapCategoryToTemplateType(category: string): TemplateType {
  const mapping: Record<string, TemplateType> = {
    'one_on_one': TemplateType.one_on_one,
    'team_meeting': TemplateType.team_meeting,
    'client_call': TemplateType.client_call,
    'interview': TemplateType.interview,
    'standup': TemplateType.standup,
    'retrospective': TemplateType.retrospective,
    'sales': TemplateType.client_call,
    'customer_success': TemplateType.client_call,
    'internal': TemplateType.team_meeting,
    'project': TemplateType.team_meeting
  };
  return mapping[category] || TemplateType.custom;
}

// Helper function to transform database template to API response format
function transformTemplateToResponse(template: any): any {
  const templateData = template.templateData as any;
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category || template.type,
    sections: templateData?.sections || [],
    variables: template.variables || [],
    tags: template.tags || templateData?.tags || [],
    organizationId: template.organizationId,
    createdBy: template.userId,
    isActive: template.isActive,
    isPreBuilt: template.isPreBuilt,
    usageCount: template.usageCount,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt
  };
}

// Get all templates (pre-built and custom)
router.get('/', authMiddleware, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;
    const { category } = req.query;

    // Fetch pre-built templates from database (system-wide, no organizationId)
    const preBuiltTemplates = await prisma.meetingTemplate.findMany({
      where: {
        isPreBuilt: true,
        isActive: true,
        ...(category ? { category: category as string } : {})
      },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Fetch custom templates for this organization
    const customTemplates = await prisma.meetingTemplate.findMany({
      where: {
        organizationId,
        isPreBuilt: false,
        isActive: true,
        ...(category ? { category: category as string } : {})
      },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Transform all templates to response format
    const allTemplates = [
      ...preBuiltTemplates.map(transformTemplateToResponse),
      ...customTemplates.map(transformTemplateToResponse)
    ];

    // Get unique categories for filtering
    const categories = [...new Set(allTemplates.map(t => t.category).filter(Boolean))];

    res.json({
      success: true,
      templates: allTemplates,
      categories,
      counts: {
        total: allTemplates.length,
        preBuilt: preBuiltTemplates.length,
        custom: customTemplates.length
      }
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// Create a new custom template
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    const { name, description, category, sections, variables, tags } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    // Map category to TemplateType enum or use 'custom'
    const templateType = mapCategoryToTemplateType(category);

    // Create template in database
    const template = await prisma.meetingTemplate.create({
      data: {
        organizationId,
        userId,
        name,
        description: description || null,
        type: templateType,
        category: category || null, // Store original category string
        templateData: {
          sections: sections || []
        },
        variables: variables || [],
        tags: tags || [],
        isPreBuilt: false,
        isActive: true,
        usageCount: 0
      }
    });

    res.json({
      success: true,
      template: transformTemplateToResponse(template)
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// Get a specific template
router.get('/:id', authMiddleware, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user?.organizationId;

    // First try to find a pre-built template (available to all users)
    let template = await prisma.meetingTemplate.findFirst({
      where: {
        id,
        isPreBuilt: true,
        isActive: true
      }
    });

    // If not found, try to find a custom template for this organization
    if (!template) {
      template = await prisma.meetingTemplate.findFirst({
        where: {
          id,
          organizationId,
          isPreBuilt: false,
          isActive: true
        }
      });
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template: transformTemplateToResponse(template)
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Update a custom template (only custom templates can be updated)
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user?.organizationId;
    const { name, description, category, sections, variables, tags } = req.body;

    // Check if template exists and belongs to organization (only custom templates can be updated)
    const existingTemplate = await prisma.meetingTemplate.findFirst({
      where: {
        id,
        organizationId,
        isPreBuilt: false,
        isActive: true
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or cannot be modified'
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) {
      updateData.type = mapCategoryToTemplateType(category);
      updateData.category = category;
    }
    if (variables !== undefined) updateData.variables = variables;
    if (tags !== undefined) updateData.tags = tags;

    // Merge templateData if sections are provided
    if (sections !== undefined) {
      const existingData = existingTemplate.templateData as any || {};
      updateData.templateData = {
        ...existingData,
        sections: sections
      };
    }

    // Update template in database
    const updatedTemplate = await prisma.meetingTemplate.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      template: transformTemplateToResponse(updatedTemplate)
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// Delete a custom template (only custom templates can be deleted)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user?.organizationId;

    // Check if template exists and belongs to organization (only custom templates can be deleted)
    const existingTemplate = await prisma.meetingTemplate.findFirst({
      where: {
        id,
        organizationId,
        isPreBuilt: false,
        isActive: true
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or cannot be deleted'
      });
    }

    // Soft delete by setting isActive to false
    await prisma.meetingTemplate.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// Apply template to a meeting
router.post('/:id/apply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { meetingId, variableValues } = req.body;
    const organizationId = (req as any).user?.organizationId;

    // Verify meeting belongs to user's organization (if meetingId provided)
    if (meetingId) {
      const meeting = await prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId,
        },
        select: { id: true }
      });

      if (!meeting) {
        return res.status(403).json({
          success: false,
          error: 'Meeting not found or access denied'
        });
      }
    }

    // First try to find a pre-built template (available to all users)
    let dbTemplate = await prisma.meetingTemplate.findFirst({
      where: {
        id,
        isPreBuilt: true,
        isActive: true
      }
    });

    // If not found, try to find a custom template for this organization
    if (!dbTemplate) {
      dbTemplate = await prisma.meetingTemplate.findFirst({
        where: {
          id,
          organizationId,
          isPreBuilt: false,
          isActive: true
        }
      });
    }

    if (!dbTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Transform database template
    const templateData = dbTemplate.templateData as any;
    const sections = templateData?.sections || [];

    // Apply variable substitution to sections
    const processedSections = sections.map((section: any) => ({
      ...section,
      content: section.content.replace(/\{\{(\w+)\}\}/g, (match: string, variable: string) => {
        return variableValues?.[variable] || match;
      })
    }));

    // Update usage count for all templates when applied
    await prisma.meetingTemplate.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    res.json({
      success: true,
      notes: {
        templateId: id,
        templateName: dbTemplate.name,
        sections: processedSections,
        variables: dbTemplate.variables || [],
        meetingId,
        appliedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error applying template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply template'
    });
  }
});

export default router;