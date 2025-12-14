/**
 * Agenda Template Service
 *
 * Pre-meeting agenda templates with built-in and custom templates
 * Features:
 * - 10 pre-built templates (sales call, 1:1, standup, etc.)
 * - Custom template builder
 * - Auto-populate agenda before meeting
 * - Agenda sharing
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AgendaItem {
  id: string;
  title: string;
  duration: number; // minutes
  description?: string;
  type: 'discussion' | 'presentation' | 'decision' | 'brainstorm' | 'review' | 'other';
  presenter?: string;
  notes?: string;
  order: number;
}

export interface AgendaTemplate {
  id: string;
  name: string;
  description: string;
  type: 'sales_call' | 'one_on_one' | 'standup' | 'retrospective' | 'planning' |
        'review' | 'brainstorm' | 'interview' | 'all_hands' | 'client_meeting' | 'custom';
  items: AgendaItem[];
  estimatedDuration: number; // minutes
  isBuiltIn: boolean;
  isActive: boolean;
  organizationId?: string;
  createdBy?: string;
  usageCount: number;
  tags: string[];
  variables?: Record<string, string>; // For template customization
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingAgenda {
  id: string;
  meetingId: string;
  templateId?: string;
  items: AgendaItem[];
  totalDuration: number;
  status: 'draft' | 'finalized' | 'in_progress' | 'completed';
  sharedWith: string[]; // User IDs or emails
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class AgendaTemplateService {
  /**
   * Get all built-in agenda templates
   */
  getBuiltInTemplates(): Omit<AgendaTemplate, 'id' | 'organizationId' | 'createdBy' | 'usageCount' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: 'Sales Discovery Call',
        description: 'Structured agenda for initial sales discovery calls',
        type: 'sales_call',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 45,
        tags: ['sales', 'discovery', 'prospecting'],
        items: [
          {
            id: '1',
            title: 'Introduction & Rapport Building',
            duration: 5,
            description: 'Warm introduction and build connection',
            type: 'discussion',
            order: 1,
          },
          {
            id: '2',
            title: 'Current State & Challenges',
            duration: 10,
            description: 'Understand current situation and pain points',
            type: 'discussion',
            order: 2,
          },
          {
            id: '3',
            title: 'Goals & Desired Outcomes',
            duration: 10,
            description: 'Identify what success looks like',
            type: 'discussion',
            order: 3,
          },
          {
            id: '4',
            title: 'Solution Overview',
            duration: 15,
            description: 'Present relevant solution capabilities',
            type: 'presentation',
            order: 4,
          },
          {
            id: '5',
            title: 'Next Steps & Timeline',
            duration: 5,
            description: 'Define action items and follow-up',
            type: 'decision',
            order: 5,
          },
        ],
        variables: {
          prospectName: '{{prospect_name}}',
          companyName: '{{company_name}}',
        },
      },
      {
        name: '1:1 Check-in',
        description: 'Regular one-on-one meeting template for managers',
        type: 'one_on_one',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 30,
        tags: ['management', '1:1', 'check-in'],
        items: [
          {
            id: '1',
            title: 'Personal Check-in',
            duration: 5,
            description: 'How are you doing? Any blockers?',
            type: 'discussion',
            order: 1,
          },
          {
            id: '2',
            title: 'Recent Wins & Challenges',
            duration: 10,
            description: 'Review accomplishments and obstacles',
            type: 'review',
            order: 2,
          },
          {
            id: '3',
            title: 'Current Projects Update',
            duration: 10,
            description: 'Status of ongoing work',
            type: 'review',
            order: 3,
          },
          {
            id: '4',
            title: 'Career Development',
            duration: 5,
            description: 'Growth goals and opportunities',
            type: 'discussion',
            order: 4,
          },
        ],
      },
      {
        name: 'Daily Standup',
        description: 'Quick daily sync for agile teams',
        type: 'standup',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 15,
        tags: ['agile', 'standup', 'daily'],
        items: [
          {
            id: '1',
            title: 'Yesterday\'s Progress',
            duration: 5,
            description: 'What did we accomplish?',
            type: 'review',
            order: 1,
          },
          {
            id: '2',
            title: 'Today\'s Plan',
            duration: 5,
            description: 'What are we working on today?',
            type: 'discussion',
            order: 2,
          },
          {
            id: '3',
            title: 'Blockers & Support Needed',
            duration: 5,
            description: 'Any obstacles or help required?',
            type: 'discussion',
            order: 3,
          },
        ],
      },
      {
        name: 'Sprint Retrospective',
        description: 'End-of-sprint team reflection',
        type: 'retrospective',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 60,
        tags: ['agile', 'retrospective', 'sprint'],
        items: [
          {
            id: '1',
            title: 'Sprint Recap',
            duration: 5,
            description: 'Review sprint goals and outcomes',
            type: 'review',
            order: 1,
          },
          {
            id: '2',
            title: 'What Went Well',
            duration: 15,
            description: 'Celebrate successes and wins',
            type: 'discussion',
            order: 2,
          },
          {
            id: '3',
            title: 'What Didn\'t Go Well',
            duration: 15,
            description: 'Identify challenges and issues',
            type: 'discussion',
            order: 3,
          },
          {
            id: '4',
            title: 'Action Items',
            duration: 20,
            description: 'Define improvements for next sprint',
            type: 'decision',
            order: 4,
          },
          {
            id: '5',
            title: 'Closing',
            duration: 5,
            description: 'Summary and appreciation',
            type: 'other',
            order: 5,
          },
        ],
      },
      {
        name: 'Sprint Planning',
        description: 'Planning session for upcoming sprint',
        type: 'planning',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 90,
        tags: ['agile', 'planning', 'sprint'],
        items: [
          {
            id: '1',
            title: 'Sprint Goal Definition',
            duration: 15,
            description: 'Define what we want to achieve',
            type: 'discussion',
            order: 1,
          },
          {
            id: '2',
            title: 'Backlog Review',
            duration: 30,
            description: 'Review and prioritize user stories',
            type: 'review',
            order: 2,
          },
          {
            id: '3',
            title: 'Story Estimation',
            duration: 30,
            description: 'Estimate effort for selected stories',
            type: 'discussion',
            order: 3,
          },
          {
            id: '4',
            title: 'Sprint Commitment',
            duration: 15,
            description: 'Finalize sprint backlog',
            type: 'decision',
            order: 4,
          },
        ],
      },
      {
        name: 'Design Review',
        description: 'Review and critique design work',
        type: 'review',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 45,
        tags: ['design', 'review', 'feedback'],
        items: [
          {
            id: '1',
            title: 'Context & Objectives',
            duration: 5,
            description: 'Explain design goals and constraints',
            type: 'presentation',
            order: 1,
          },
          {
            id: '2',
            title: 'Design Walkthrough',
            duration: 15,
            description: 'Present design solutions',
            type: 'presentation',
            order: 2,
          },
          {
            id: '3',
            title: 'Feedback & Discussion',
            duration: 20,
            description: 'Gather input and suggestions',
            type: 'discussion',
            order: 3,
          },
          {
            id: '4',
            title: 'Next Steps',
            duration: 5,
            description: 'Define revisions and timeline',
            type: 'decision',
            order: 4,
          },
        ],
      },
      {
        name: 'Brainstorming Session',
        description: 'Creative ideation and problem-solving',
        type: 'brainstorm',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 60,
        tags: ['brainstorm', 'ideation', 'creative'],
        items: [
          {
            id: '1',
            title: 'Problem Statement',
            duration: 10,
            description: 'Define the challenge clearly',
            type: 'presentation',
            order: 1,
          },
          {
            id: '2',
            title: 'Silent Ideation',
            duration: 10,
            description: 'Individual idea generation',
            type: 'brainstorm',
            order: 2,
          },
          {
            id: '3',
            title: 'Idea Sharing',
            duration: 20,
            description: 'Share and build on ideas',
            type: 'discussion',
            order: 3,
          },
          {
            id: '4',
            title: 'Idea Clustering & Voting',
            duration: 15,
            description: 'Group and prioritize ideas',
            type: 'decision',
            order: 4,
          },
          {
            id: '5',
            title: 'Next Steps',
            duration: 5,
            description: 'Define actions for top ideas',
            type: 'decision',
            order: 5,
          },
        ],
      },
      {
        name: 'Job Interview',
        description: 'Structured candidate interview',
        type: 'interview',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 60,
        tags: ['hiring', 'interview', 'recruiting'],
        items: [
          {
            id: '1',
            title: 'Introduction',
            duration: 5,
            description: 'Welcome and overview',
            type: 'discussion',
            order: 1,
          },
          {
            id: '2',
            title: 'Candidate Background',
            duration: 10,
            description: 'Review experience and motivations',
            type: 'discussion',
            order: 2,
          },
          {
            id: '3',
            title: 'Technical/Role Questions',
            duration: 30,
            description: 'Assess skills and competencies',
            type: 'discussion',
            order: 3,
          },
          {
            id: '4',
            title: 'Company & Role Overview',
            duration: 10,
            description: 'Explain opportunity and culture',
            type: 'presentation',
            order: 4,
          },
          {
            id: '5',
            title: 'Candidate Questions',
            duration: 5,
            description: 'Answer candidate inquiries',
            type: 'discussion',
            order: 5,
          },
        ],
        variables: {
          candidateName: '{{candidate_name}}',
          position: '{{position}}',
        },
      },
      {
        name: 'All-Hands Meeting',
        description: 'Company-wide update and Q&A',
        type: 'all_hands',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 60,
        tags: ['company', 'all-hands', 'update'],
        items: [
          {
            id: '1',
            title: 'Company Updates',
            duration: 15,
            description: 'Metrics, wins, and announcements',
            type: 'presentation',
            order: 1,
          },
          {
            id: '2',
            title: 'Department Highlights',
            duration: 20,
            description: 'Updates from each team',
            type: 'presentation',
            order: 2,
          },
          {
            id: '3',
            title: 'Recognition & Celebrations',
            duration: 10,
            description: 'Acknowledge achievements',
            type: 'other',
            order: 3,
          },
          {
            id: '4',
            title: 'Open Q&A',
            duration: 15,
            description: 'Answer employee questions',
            type: 'discussion',
            order: 4,
          },
        ],
      },
      {
        name: 'Client Business Review',
        description: 'Quarterly business review with clients',
        type: 'client_meeting',
        isBuiltIn: true,
        isActive: true,
        estimatedDuration: 60,
        tags: ['client', 'QBR', 'review'],
        items: [
          {
            id: '1',
            title: 'Agenda & Objectives',
            duration: 5,
            description: 'Review meeting goals',
            type: 'presentation',
            order: 1,
          },
          {
            id: '2',
            title: 'Performance Review',
            duration: 15,
            description: 'Metrics and results achieved',
            type: 'review',
            order: 2,
          },
          {
            id: '3',
            title: 'Strategic Initiatives',
            duration: 15,
            description: 'Discuss ongoing and new projects',
            type: 'discussion',
            order: 3,
          },
          {
            id: '4',
            title: 'Roadmap & Future Plans',
            duration: 15,
            description: 'Preview upcoming features and goals',
            type: 'presentation',
            order: 4,
          },
          {
            id: '5',
            title: 'Action Items & Next Steps',
            duration: 10,
            description: 'Define commitments and timeline',
            type: 'decision',
            order: 5,
          },
        ],
        variables: {
          clientName: '{{client_name}}',
          quarter: '{{quarter}}',
        },
      },
    ];
  }

  /**
   * Initialize built-in templates in organization settings
   * This is typically called once per organization
   */
  async initializeBuiltInTemplates(organizationId: string): Promise<void> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const existingTemplates: AgendaTemplate[] = settings.agendaTemplates || [];

      const templates = this.getBuiltInTemplates();

      for (const template of templates) {
        const exists = existingTemplates.find(
          (t) => t.name === template.name && t.isBuiltIn
        );

        if (!exists) {
          const newTemplate: AgendaTemplate = {
            id: `agenda_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: template.name,
            description: template.description,
            type: template.type,
            items: template.items,
            estimatedDuration: template.estimatedDuration,
            isBuiltIn: template.isBuiltIn,
            isActive: template.isActive,
            tags: template.tags,
            variables: template.variables || {},
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          existingTemplates.push(newTemplate);
        }
      }

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            agendaTemplates: existingTemplates,
          },
        },
      });

      logger.info('Built-in agenda templates initialized');
    } catch (error) {
      logger.error('Error initializing built-in templates', { error });
    }
  }

  /**
   * Get all agenda templates (built-in and custom)
   * Retrieved from Organization.settings
   */
  async getTemplates(
    organizationId?: string,
    filters?: {
      type?: string;
      tags?: string[];
      isActive?: boolean;
    }
  ): Promise<AgendaTemplate[]> {
    try {
      if (!organizationId) {
        return [];
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        return [];
      }

      const settings = (org.settings as any) || {};
      let templates: AgendaTemplate[] = settings.agendaTemplates || [];

      // Apply filters
      if (filters?.type) {
        templates = templates.filter((t) => t.type === filters.type);
      }

      if (filters?.isActive !== undefined) {
        templates = templates.filter((t) => t.isActive === filters.isActive);
      }

      if (filters?.tags && filters.tags.length > 0) {
        templates = templates.filter((t) =>
          filters.tags!.some((tag) => t.tags.includes(tag))
        );
      }

      // Sort by isBuiltIn desc, then usageCount desc
      templates.sort((a, b) => {
        if (a.isBuiltIn !== b.isBuiltIn) {
          return a.isBuiltIn ? -1 : 1;
        }
        return b.usageCount - a.usageCount;
      });

      return templates;
    } catch (error) {
      logger.error('Error getting agenda templates', { error });
      throw error;
    }
  }

  /**
   * Get template by ID
   * Retrieved from Organization.settings
   */
  async getTemplate(templateId: string, organizationId: string): Promise<AgendaTemplate | null> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        return null;
      }

      const settings = (org.settings as any) || {};
      const templates: AgendaTemplate[] = settings.agendaTemplates || [];
      const template = templates.find((t) => t.id === templateId);

      return template || null;
    } catch (error) {
      logger.error('Error getting agenda template', { error, templateId });
      return null;
    }
  }

  /**
   * Create custom agenda template
   * Stored in Organization.settings
   */
  async createTemplate(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description: string;
      type?: string;
      items: AgendaItem[];
      tags?: string[];
      variables?: Record<string, string>;
    }
  ): Promise<AgendaTemplate> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const templates: AgendaTemplate[] = settings.agendaTemplates || [];

      const estimatedDuration = data.items.reduce((sum, item) => sum + item.duration, 0);

      const template: AgendaTemplate = {
        id: `agenda_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        description: data.description,
        type: (data.type as any) || 'custom',
        items: data.items,
        estimatedDuration,
        isBuiltIn: false,
        isActive: true,
        organizationId,
        createdBy: userId,
        tags: data.tags || [],
        variables: data.variables || {},
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templates.push(template);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            agendaTemplates: templates,
          },
        },
      });

      logger.info('Custom agenda template created', { templateId: template.id });

      return template;
    } catch (error) {
      logger.error('Error creating agenda template', { error });
      throw error;
    }
  }

  /**
   * Update agenda template
   * Updates in Organization.settings
   */
  async updateTemplate(
    templateId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      items: AgendaItem[];
      tags: string[];
      variables: Record<string, string>;
      isActive: boolean;
    }>
  ): Promise<AgendaTemplate> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const templates: AgendaTemplate[] = settings.agendaTemplates || [];
      const templateIndex = templates.findIndex((t) => t.id === templateId);

      if (templateIndex === -1) {
        throw new Error('Template not found');
      }

      // Recalculate duration if items changed
      let estimatedDuration = templates[templateIndex].estimatedDuration;
      if (data.items) {
        estimatedDuration = data.items.reduce((sum, item) => sum + item.duration, 0);
      }

      templates[templateIndex] = {
        ...templates[templateIndex],
        ...data,
        estimatedDuration,
        updatedAt: new Date(),
      };

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            agendaTemplates: templates,
          },
        },
      });

      logger.info('Agenda template updated', { templateId });

      return templates[templateIndex];
    } catch (error) {
      logger.error('Error updating agenda template', { error, templateId });
      throw error;
    }
  }

  /**
   * Delete agenda template (only custom templates)
   * Removes from Organization.settings
   */
  async deleteTemplate(templateId: string, organizationId: string): Promise<boolean> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        return false;
      }

      const settings = (org.settings as any) || {};
      const templates: AgendaTemplate[] = settings.agendaTemplates || [];
      const template = templates.find((t) => t.id === templateId);

      if (!template) {
        return false;
      }

      if (template.isBuiltIn) {
        throw new Error('Cannot delete built-in templates');
      }

      const filteredTemplates = templates.filter((t) => t.id !== templateId);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            agendaTemplates: filteredTemplates,
          },
        },
      });

      logger.info('Agenda template deleted', { templateId });

      return true;
    } catch (error) {
      logger.error('Error deleting agenda template', { error, templateId });
      throw error;
    }
  }

  /**
   * Create meeting agenda from template
   * Stored in Meeting.metadata
   */
  async createAgendaFromTemplate(
    meetingId: string,
    templateId: string,
    userId: string,
    organizationId: string,
    variables?: Record<string, string>
  ): Promise<MeetingAgenda> {
    try {
      const template = await this.getTemplate(templateId, organizationId);

      if (!template) {
        throw new Error('Template not found');
      }

      // Replace variables in items
      let items = JSON.parse(JSON.stringify(template.items)) as AgendaItem[];

      if (variables && template.variables) {
        const itemsStr = JSON.stringify(items);
        let replacedStr = itemsStr;

        for (const [key, placeholder] of Object.entries(template.variables)) {
          if (variables[key]) {
            replacedStr = replacedStr.replace(new RegExp(placeholder, 'g'), variables[key]);
          }
        }

        items = JSON.parse(replacedStr);
      }

      const agendaId = `agenda_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const agenda: MeetingAgenda = {
        id: agendaId,
        meetingId,
        templateId,
        items,
        totalDuration: template.estimatedDuration,
        status: 'draft',
        sharedWith: [],
        lastModifiedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store agenda in Meeting.metadata
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          metadata: {
            ...(meeting.metadata as any || {}),
            agenda,
          },
        },
      });

      // Increment template usage count
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (org) {
        const settings = (org.settings as any) || {};
        const templates: AgendaTemplate[] = settings.agendaTemplates || [];
        const templateIndex = templates.findIndex((t) => t.id === templateId);

        if (templateIndex !== -1) {
          templates[templateIndex].usageCount += 1;
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              settings: {
                ...settings,
                agendaTemplates: templates,
              },
            },
          });
        }
      }

      logger.info('Meeting agenda created from template', {
        agendaId: agenda.id,
        meetingId,
        templateId,
      });

      return agenda;
    } catch (error) {
      logger.error('Error creating agenda from template', { error, meetingId, templateId });
      throw error;
    }
  }

  /**
   * Get meeting agenda
   * Retrieved from Meeting.metadata
   */
  async getMeetingAgenda(meetingId: string): Promise<MeetingAgenda | null> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return null;
      }

      const metadata = meeting.metadata as any || {};
      return metadata.agenda || null;
    } catch (error) {
      logger.error('Error getting meeting agenda', { error, meetingId });
      return null;
    }
  }

  /**
   * Update meeting agenda
   * Updates in Meeting.metadata
   */
  async updateAgenda(
    meetingId: string,
    userId: string,
    data: Partial<{
      items: AgendaItem[];
      status: 'draft' | 'finalized' | 'in_progress' | 'completed';
      sharedWith: string[];
    }>
  ): Promise<MeetingAgenda> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const metadata = meeting.metadata as any || {};
      const currentAgenda = metadata.agenda as MeetingAgenda;

      if (!currentAgenda) {
        throw new Error('Agenda not found');
      }

      // Recalculate duration if items changed
      let totalDuration = currentAgenda.totalDuration;
      if (data.items) {
        totalDuration = data.items.reduce((sum, item) => sum + item.duration, 0);
      }

      const updatedAgenda: MeetingAgenda = {
        ...currentAgenda,
        ...data,
        totalDuration,
        lastModifiedBy: userId,
        updatedAt: new Date(),
      };

      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          metadata: {
            ...metadata,
            agenda: updatedAgenda,
          },
        },
      });

      logger.info('Meeting agenda updated', { meetingId });

      return updatedAgenda;
    } catch (error) {
      logger.error('Error updating meeting agenda', { error, meetingId });
      throw error;
    }
  }

  /**
   * Share agenda with users
   * Updates in Meeting.metadata
   */
  async shareAgenda(meetingId: string, userIds: string[]): Promise<void> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const metadata = meeting.metadata as any || {};
      const agenda = metadata.agenda as MeetingAgenda;

      if (!agenda) {
        throw new Error('Agenda not found');
      }

      const currentSharedWith = agenda.sharedWith || [];
      const newSharedWith = [...new Set([...currentSharedWith, ...userIds])];

      agenda.sharedWith = newSharedWith;
      agenda.updatedAt = new Date();

      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          metadata: {
            ...metadata,
            agenda,
          },
        },
      });

      logger.info('Agenda shared with users', { meetingId, userIds });
    } catch (error) {
      logger.error('Error sharing agenda', { error, meetingId });
      throw error;
    }
  }

  /**
   * Auto-suggest agenda template based on meeting data
   */
  async suggestTemplate(meetingData: {
    title?: string;
    participants?: string[];
    duration?: number;
    type?: string;
  }): Promise<AgendaTemplate | null> {
    try {
      const templates = await this.getTemplates(undefined, { isActive: true });

      let bestMatch: AgendaTemplate | null = null;
      let bestScore = 0;

      for (const template of templates) {
        let score = 0;

        // Match by title keywords
        if (meetingData.title) {
          const titleLower = meetingData.title.toLowerCase();
          const nameLower = template.name.toLowerCase();

          // Check for exact type matches
          if (titleLower.includes('1:1') || titleLower.includes('one on one')) {
            if (template.type === 'one_on_one') score += 50;
          }
          if (titleLower.includes('standup') || titleLower.includes('daily')) {
            if (template.type === 'standup') score += 50;
          }
          if (titleLower.includes('retro') || titleLower.includes('retrospective')) {
            if (template.type === 'retrospective') score += 50;
          }
          if (titleLower.includes('sales') || titleLower.includes('discovery')) {
            if (template.type === 'sales_call') score += 50;
          }
          if (titleLower.includes('interview')) {
            if (template.type === 'interview') score += 50;
          }
          if (titleLower.includes('planning') || titleLower.includes('sprint planning')) {
            if (template.type === 'planning') score += 50;
          }
          if (titleLower.includes('review') || titleLower.includes('design review')) {
            if (template.type === 'review') score += 50;
          }
          if (titleLower.includes('brainstorm') || titleLower.includes('ideation')) {
            if (template.type === 'brainstorm') score += 50;
          }
          if (titleLower.includes('all hands') || titleLower.includes('town hall')) {
            if (template.type === 'all_hands') score += 50;
          }
          if (titleLower.includes('client') || titleLower.includes('qbr')) {
            if (template.type === 'client_meeting') score += 50;
          }

          // Word matching
          const titleWords = titleLower.split(' ');
          const nameWords = nameLower.split(' ');
          const matchingWords = titleWords.filter(word => nameWords.includes(word));
          score += matchingWords.length * 5;
        }

        // Match by duration
        if (meetingData.duration) {
          const durationDiff = Math.abs(meetingData.duration - template.estimatedDuration);
          if (durationDiff <= 15) {
            score += 20 - durationDiff;
          }
        }

        // Match by participant count
        if (meetingData.participants) {
          const count = meetingData.participants.length;
          if (count === 2 && template.type === 'one_on_one') score += 30;
          if (count <= 5 && template.type === 'standup') score += 20;
          if (count >= 10 && template.type === 'all_hands') score += 20;
        }

        // Favor built-in templates slightly
        if (template.isBuiltIn) {
          score += 5;
        }

        // Usage count bonus
        score += template.usageCount * 0.1;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = template;
        }
      }

      logger.info('Template suggestion found', {
        templateId: bestMatch?.id,
        score: bestScore,
        meetingTitle: meetingData.title,
      });

      return bestMatch;
    } catch (error) {
      logger.error('Error suggesting template', { error });
      return null;
    }
  }
}

export const agendaTemplateService = new AgendaTemplateService();
