import request from 'supertest';
import express from 'express';
import templateRouter from '../templates';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    meetingTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  })),
  TemplateType: {
    one_on_one: 'one_on_one',
    team_meeting: 'team_meeting',
    client_call: 'client_call',
    interview: 'interview',
    standup: 'standup',
    retrospective: 'retrospective',
    custom: 'custom'
  }
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'user-123',
      organizationId: 'org-456'
    };
    next();
  }
}));

// Mock rate limiting middleware
jest.mock('../../middleware/rate-limit', () => ({
  rateLimitByEndpoint: () => (req: any, res: any, next: any) => next()
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

describe('Template Routes', () => {
  let app: express.Application;
  let prisma: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', templateRouter);

    // Get the mocked PrismaClient instance
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('GET /templates', () => {
    it('should return both pre-built and custom templates', async () => {
      const mockCustomTemplates = [
        {
          id: 'custom-1',
          name: 'Custom Template 1',
          description: 'A custom template',
          type: 'custom',
          organizationId: 'org-456',
          userId: 'user-123',
          templateData: {
            sections: [{ title: 'Section 1', content: 'Content 1' }],
            tags: ['custom', 'test']
          },
          variables: ['{{var1}}', '{{var2}}'],
          isActive: true,
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prisma.meetingTemplate.findMany.mockResolvedValue(mockCustomTemplates);

      const response = await request(app)
        .get('/templates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.templates).toBeDefined();
      expect(response.body.templates.length).toBeGreaterThan(0);

      // Check that pre-built templates are included
      const preBuiltTemplate = response.body.templates.find((t: any) => t.id === 'sales-discovery');
      expect(preBuiltTemplate).toBeDefined();
      expect(preBuiltTemplate.isPreBuilt).toBe(true);

      // Check that custom templates are included
      const customTemplate = response.body.templates.find((t: any) => t.id === 'custom-1');
      expect(customTemplate).toBeDefined();
      expect(customTemplate.isPreBuilt).toBe(false);

      expect(prisma.meetingTemplate.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { organizationId: 'org-456' },
            { isActive: true }
          ]
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    });

    it('should handle database errors gracefully', async () => {
      prisma.meetingTemplate.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/templates')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch templates');
    });
  });

  describe('POST /templates', () => {
    it('should create a new custom template in database', async () => {
      const newTemplate = {
        name: 'New Template',
        description: 'A new custom template',
        category: 'team_meeting',
        sections: [
          { title: 'Section 1', content: 'Content 1' },
          { title: 'Section 2', content: 'Content 2' }
        ],
        variables: ['{{var1}}', '{{var2}}'],
        tags: ['meeting', 'team']
      };

      const createdTemplate = {
        id: 'template-789',
        organizationId: 'org-456',
        userId: 'user-123',
        name: newTemplate.name,
        description: newTemplate.description,
        type: 'team_meeting',
        templateData: {
          sections: newTemplate.sections,
          tags: newTemplate.tags
        },
        variables: newTemplate.variables,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.meetingTemplate.create.mockResolvedValue(createdTemplate);

      const response = await request(app)
        .post('/templates')
        .send(newTemplate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.template).toBeDefined();
      expect(response.body.template.id).toBe('template-789');
      expect(response.body.template.name).toBe('New Template');
      expect(response.body.template.sections).toEqual(newTemplate.sections);

      expect(prisma.meetingTemplate.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-456',
          userId: 'user-123',
          name: newTemplate.name,
          description: newTemplate.description,
          type: 'team_meeting',
          templateData: {
            sections: newTemplate.sections,
            tags: newTemplate.tags
          },
          variables: newTemplate.variables,
          isActive: true,
          usageCount: 0
        }
      });
    });
  });

  describe('GET /templates/:id', () => {
    it('should return a pre-built template', async () => {
      const response = await request(app)
        .get('/templates/sales-discovery')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.template.id).toBe('sales-discovery');
      expect(response.body.template.isPreBuilt).toBe(true);
    });

    it('should return a custom template from database', async () => {
      const mockTemplate = {
        id: 'custom-template-1',
        name: 'Custom Template',
        description: 'Description',
        type: 'custom',
        organizationId: 'org-456',
        userId: 'user-123',
        templateData: {
          sections: [{ title: 'Test', content: 'Content' }],
          tags: ['test']
        },
        variables: [],
        isActive: true,
        usageCount: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.meetingTemplate.findFirst.mockResolvedValue(mockTemplate);

      const response = await request(app)
        .get('/templates/custom-template-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.template.id).toBe('custom-template-1');
      expect(response.body.template.isPreBuilt).toBe(false);

      expect(prisma.meetingTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'custom-template-1',
          organizationId: 'org-456',
          isActive: true
        }
      });
    });

    it('should return 404 for non-existent template', async () => {
      prisma.meetingTemplate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/templates/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });
  });

  describe('PATCH /templates/:id', () => {
    it('should update a custom template in database', async () => {
      const existingTemplate = {
        id: 'template-1',
        name: 'Old Name',
        description: 'Old Description',
        type: 'custom',
        organizationId: 'org-456',
        templateData: {
          sections: [{ title: 'Old Section', content: 'Old Content' }],
          tags: ['old']
        },
        variables: ['{{old}}']
      };

      const updateData = {
        name: 'Updated Name',
        description: 'Updated Description',
        sections: [{ title: 'New Section', content: 'New Content' }]
      };

      prisma.meetingTemplate.findFirst.mockResolvedValue(existingTemplate);
      prisma.meetingTemplate.update.mockResolvedValue({
        ...existingTemplate,
        ...updateData,
        templateData: {
          sections: updateData.sections,
          tags: ['old']
        },
        updatedAt: new Date()
      });

      const response = await request(app)
        .patch('/templates/template-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.template.name).toBe('Updated Name');
      expect(response.body.template.sections).toEqual(updateData.sections);

      expect(prisma.meetingTemplate.update).toHaveBeenCalled();
    });
  });

  describe('DELETE /templates/:id', () => {
    it('should soft delete a template by setting isActive to false', async () => {
      const existingTemplate = {
        id: 'template-1',
        organizationId: 'org-456',
        isActive: true
      };

      prisma.meetingTemplate.findFirst.mockResolvedValue(existingTemplate);
      prisma.meetingTemplate.update.mockResolvedValue({
        ...existingTemplate,
        isActive: false
      });

      const response = await request(app)
        .delete('/templates/template-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template deleted successfully');

      expect(prisma.meetingTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { isActive: false }
      });
    });
  });

  describe('POST /templates/:id/apply', () => {
    it('should apply a template and increment usage count', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        organizationId: 'org-456',
        templateData: {
          sections: [
            { title: 'Meeting', content: 'Meeting: {{title}}' },
            { title: 'Date', content: 'Date: {{date}}' }
          ]
        },
        variables: ['{{title}}', '{{date}}']
      };

      const variableValues = {
        title: 'Team Standup',
        date: '2024-01-15'
      };

      prisma.meetingTemplate.findFirst.mockResolvedValue(mockTemplate);
      prisma.meetingTemplate.update.mockResolvedValue({
        ...mockTemplate,
        usageCount: 1
      });

      const response = await request(app)
        .post('/templates/template-1/apply')
        .send({
          meetingId: 'meeting-123',
          variableValues
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.notes.sections[0].content).toBe('Meeting: Team Standup');
      expect(response.body.notes.sections[1].content).toBe('Date: 2024-01-15');

      expect(prisma.meetingTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          usageCount: {
            increment: 1
          }
        }
      });
    });

    it('should apply a pre-built template without incrementing database counter', async () => {
      const variableValues = {
        meeting_title: 'Sales Call',
        date: '2024-01-15',
        attendees: 'John, Jane',
        prospect_name: 'ACME Corp',
        company: 'ACME Industries'
      };

      const response = await request(app)
        .post('/templates/sales-discovery/apply')
        .send({
          meetingId: 'meeting-123',
          variableValues
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.notes.templateName).toBe('Sales Discovery Call');
      expect(response.body.notes.sections[0].content).toContain('Sales Call');

      // Should not call database update for pre-built templates
      expect(prisma.meetingTemplate.update).not.toHaveBeenCalled();
    });
  });
});