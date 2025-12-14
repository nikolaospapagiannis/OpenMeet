/**
 * Note Template Service
 *
 * Custom note templates per meeting type
 * Features:
 * - Template variables (name, company, date, etc.)
 * - Auto-fill templates with AI
 * - Template library
 * - Dynamic field substitution
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'email' | 'phone' | 'select' | 'multiline';
  required: boolean;
  defaultValue?: string;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface NoteSection {
  id: string;
  title: string;
  content: string;
  order: number;
  isCollapsible: boolean;
  variables: string[]; // Variable names used in this section
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'customer_success' | 'internal' | 'interview' | 'project' | 'custom';
  sections: NoteSection[];
  variables: TemplateVariable[];
  tags: string[];
  isActive: boolean;
  isDefault: boolean;
  organizationId?: string;
  createdBy?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingNote {
  id: string;
  meetingId: string;
  templateId?: string;
  content: Record<string, any>; // Filled template data
  rawContent?: string; // Plain text version
  aiGenerated: boolean;
  status: 'draft' | 'finalized';
  createdBy: string;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class NoteTemplateService {
  /**
   * Get built-in note templates
   */
  getBuiltInTemplates(): Omit<NoteTemplate, 'id' | 'organizationId' | 'createdBy' | 'usageCount' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: 'Sales Discovery Call Notes',
        description: 'Comprehensive notes template for sales discovery calls',
        category: 'sales',
        isActive: true,
        isDefault: false,
        tags: ['sales', 'discovery', 'prospecting'],
        variables: [
          {
            name: 'prospect_name',
            label: 'Prospect Name',
            type: 'text',
            required: true,
            placeholder: 'John Doe',
          },
          {
            name: 'company',
            label: 'Company',
            type: 'text',
            required: true,
            placeholder: 'Acme Inc',
          },
          {
            name: 'title',
            label: 'Job Title',
            type: 'text',
            required: false,
            placeholder: 'VP of Sales',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            required: false,
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'phone',
            required: false,
          },
          {
            name: 'meeting_date',
            label: 'Meeting Date',
            type: 'date',
            required: true,
          },
        ],
        sections: [
          {
            id: '1',
            title: 'Meeting Overview',
            content: `**Meeting with:** {{prospect_name}} - {{title}} at {{company}}
**Date:** {{meeting_date}}
**Contact:** {{email}} | {{phone}}

**Meeting Purpose:**
[Purpose of the call]`,
            order: 1,
            isCollapsible: false,
            variables: ['prospect_name', 'title', 'company', 'meeting_date', 'email', 'phone'],
          },
          {
            id: '2',
            title: 'Current Situation',
            content: `**Company Background:**
- Industry:
- Company size:
- Current tools/solutions:

**Current Challenges:**
1.
2.
3.

**Impact of Challenges:**
- `,
            order: 2,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '3',
            title: 'Goals & Objectives',
            content: `**Primary Goals:**
1.
2.
3.

**Success Metrics:**
-
-

**Timeline:**
- Desired implementation:
- Decision timeline: `,
            order: 3,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '4',
            title: 'Decision Process',
            content: `**Decision Makers:**
- Primary:
- Influencers:
- Technical evaluators:

**Budget:**
- Budget range:
- Budget approval process:

**Evaluation Criteria:**
1.
2.
3. `,
            order: 4,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '5',
            title: 'Proposed Solution',
            content: `**Recommended Approach:**
[Solution overview]

**Key Features Discussed:**
-
-
-

**Expected Benefits:**
-
-

**Concerns/Objections:**
- `,
            order: 5,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '6',
            title: 'Next Steps',
            content: `**Action Items:**
- [ ] [Action] - Owner: [Name] - Due: [Date]
- [ ]
- [ ]

**Follow-up:**
- Next meeting:
- Deliverables: `,
            order: 6,
            isCollapsible: false,
            variables: [],
          },
        ],
      },
      {
        name: '1:1 Meeting Notes',
        description: 'Template for regular one-on-one meetings',
        category: 'internal',
        isActive: true,
        isDefault: false,
        tags: ['1:1', 'management', 'team'],
        variables: [
          {
            name: 'employee_name',
            label: 'Employee Name',
            type: 'text',
            required: true,
          },
          {
            name: 'manager_name',
            label: 'Manager Name',
            type: 'text',
            required: true,
          },
          {
            name: 'meeting_date',
            label: 'Date',
            type: 'date',
            required: true,
          },
        ],
        sections: [
          {
            id: '1',
            title: 'Meeting Info',
            content: `**1:1 Meeting:** {{employee_name}} & {{manager_name}}
**Date:** {{meeting_date}}`,
            order: 1,
            isCollapsible: false,
            variables: ['employee_name', 'manager_name', 'meeting_date'],
          },
          {
            id: '2',
            title: 'How are you doing?',
            content: `**Personal Check-in:**
- Energy level:
- Work-life balance:
- Any concerns:

**Wins & Accomplishments:**
-
-

**Challenges:**
-
- `,
            order: 2,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '3',
            title: 'Project Updates',
            content: `**Current Projects:**

**Project 1:**
- Status:
- Progress:
- Blockers:

**Project 2:**
- Status:
- Progress:
- Blockers: `,
            order: 3,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '4',
            title: 'Growth & Development',
            content: `**Career Goals:**
- Short-term:
- Long-term:

**Learning & Development:**
- Skills to develop:
- Training needed:
- Opportunities: `,
            order: 4,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '5',
            title: 'Action Items',
            content: `**Manager Action Items:**
- [ ]
- [ ]

**Employee Action Items:**
- [ ]
- [ ]

**Next Meeting Topics:**
-
- `,
            order: 5,
            isCollapsible: false,
            variables: [],
          },
        ],
      },
      {
        name: 'Customer Success Check-in',
        description: 'Regular customer health check template',
        category: 'customer_success',
        isActive: true,
        isDefault: false,
        tags: ['customer success', 'account management', 'check-in'],
        variables: [
          {
            name: 'customer_name',
            label: 'Customer Name',
            type: 'text',
            required: true,
          },
          {
            name: 'company',
            label: 'Company',
            type: 'text',
            required: true,
          },
          {
            name: 'account_owner',
            label: 'Account Owner',
            type: 'text',
            required: true,
          },
          {
            name: 'meeting_date',
            label: 'Date',
            type: 'date',
            required: true,
          },
        ],
        sections: [
          {
            id: '1',
            title: 'Account Overview',
            content: `**Customer:** {{customer_name}} at {{company}}
**Account Owner:** {{account_owner}}
**Date:** {{meeting_date}}

**Account Health Score:** [Green/Yellow/Red]
**Last Contact:** [Date]`,
            order: 1,
            isCollapsible: false,
            variables: ['customer_name', 'company', 'account_owner', 'meeting_date'],
          },
          {
            id: '2',
            title: 'Product Usage & Adoption',
            content: `**Usage Metrics:**
- Active users:
- Feature adoption:
- Engagement trend:

**Product Feedback:**
- What's working well:
- Pain points:
- Feature requests: `,
            order: 2,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '3',
            title: 'Business Outcomes',
            content: `**Value Delivered:**
- Key achievements:
- ROI/Impact:
- Success stories:

**Goals Progress:**
- Original goals:
- Current status:
- Remaining objectives: `,
            order: 3,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '4',
            title: 'Risks & Opportunities',
            content: `**Risks:**
- Churn risk:
- Concerns:
- Mitigation plan:

**Opportunities:**
- Upsell potential:
- Expansion areas:
- Referral potential: `,
            order: 4,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '5',
            title: 'Action Plan',
            content: `**Immediate Actions:**
- [ ]
- [ ]

**Long-term Initiatives:**
-
-

**Next Check-in:** [Date]`,
            order: 5,
            isCollapsible: false,
            variables: [],
          },
        ],
      },
      {
        name: 'Interview Notes',
        description: 'Structured candidate interview evaluation',
        category: 'interview',
        isActive: true,
        isDefault: false,
        tags: ['hiring', 'interview', 'recruiting'],
        variables: [
          {
            name: 'candidate_name',
            label: 'Candidate Name',
            type: 'text',
            required: true,
          },
          {
            name: 'position',
            label: 'Position',
            type: 'text',
            required: true,
          },
          {
            name: 'interviewer',
            label: 'Interviewer',
            type: 'text',
            required: true,
          },
          {
            name: 'interview_date',
            label: 'Interview Date',
            type: 'date',
            required: true,
          },
        ],
        sections: [
          {
            id: '1',
            title: 'Interview Details',
            content: `**Candidate:** {{candidate_name}}
**Position:** {{position}}
**Interviewer:** {{interviewer}}
**Date:** {{interview_date}}

**Interview Type:** [Phone Screen/Technical/Culture Fit/Final]
**Duration:** [Minutes]`,
            order: 1,
            isCollapsible: false,
            variables: ['candidate_name', 'position', 'interviewer', 'interview_date'],
          },
          {
            id: '2',
            title: 'Background & Experience',
            content: `**Summary:**
[Brief background summary]

**Relevant Experience:**
-
-
-

**Key Skills:**
-
-

**Education:**
- `,
            order: 2,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '3',
            title: 'Technical Assessment',
            content: `**Technical Skills:**
- Skill 1: [Rating 1-5] - Notes
- Skill 2: [Rating 1-5] - Notes
- Skill 3: [Rating 1-5] - Notes

**Problem-Solving:**
- Approach:
- Quality of solution:
- Code quality:

**Technical Score:** [/10]`,
            order: 3,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '4',
            title: 'Cultural Fit',
            content: `**Company Values Alignment:**
- Value 1: [Assessment]
- Value 2: [Assessment]
- Value 3: [Assessment]

**Communication:**
- Clarity:
- Professionalism:
- Collaboration style:

**Motivation & Interest:**
- Why this role:
- Career goals:
- Questions asked: `,
            order: 4,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '5',
            title: 'Overall Assessment',
            content: `**Strengths:**
1.
2.
3.

**Areas of Concern:**
1.
2.

**Overall Rating:** [1-5 stars]

**Recommendation:**
[ ] Strong Yes
[ ] Yes
[ ] Maybe
[ ] No
[ ] Strong No

**Next Steps:**
- `,
            order: 5,
            isCollapsible: false,
            variables: [],
          },
        ],
      },
      {
        name: 'Project Kickoff Notes',
        description: 'Template for project kickoff meetings',
        category: 'project',
        isActive: true,
        isDefault: false,
        tags: ['project', 'kickoff', 'planning'],
        variables: [
          {
            name: 'project_name',
            label: 'Project Name',
            type: 'text',
            required: true,
          },
          {
            name: 'project_lead',
            label: 'Project Lead',
            type: 'text',
            required: true,
          },
          {
            name: 'start_date',
            label: 'Start Date',
            type: 'date',
            required: true,
          },
          {
            name: 'target_completion',
            label: 'Target Completion',
            type: 'date',
            required: false,
          },
        ],
        sections: [
          {
            id: '1',
            title: 'Project Overview',
            content: `**Project:** {{project_name}}
**Project Lead:** {{project_lead}}
**Start Date:** {{start_date}}
**Target Completion:** {{target_completion}}

**Project Objective:**
[Main goal of the project]`,
            order: 1,
            isCollapsible: false,
            variables: ['project_name', 'project_lead', 'start_date', 'target_completion'],
          },
          {
            id: '2',
            title: 'Scope & Deliverables',
            content: `**In Scope:**
-
-
-

**Out of Scope:**
-
-

**Key Deliverables:**
1. [Deliverable] - Due: [Date]
2. [Deliverable] - Due: [Date]
3. [Deliverable] - Due: [Date]`,
            order: 2,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '3',
            title: 'Team & Responsibilities',
            content: `**Core Team:**
- [Name] - [Role] - [Responsibility]
- [Name] - [Role] - [Responsibility]
- [Name] - [Role] - [Responsibility]

**Stakeholders:**
-
-

**Communication Plan:**
- Status updates:
- Meeting cadence: `,
            order: 3,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '4',
            title: 'Risks & Dependencies',
            content: `**Potential Risks:**
1. Risk: [Description] - Mitigation: [Plan]
2. Risk: [Description] - Mitigation: [Plan]

**Dependencies:**
-
-

**Assumptions:**
-
- `,
            order: 4,
            isCollapsible: true,
            variables: [],
          },
          {
            id: '5',
            title: 'Next Steps',
            content: `**Immediate Actions:**
- [ ] [Action] - Owner: [Name] - Due: [Date]
- [ ]
- [ ]

**Milestones:**
- [Milestone 1]: [Date]
- [Milestone 2]: [Date]
- [Milestone 3]: [Date]`,
            order: 5,
            isCollapsible: false,
            variables: [],
          },
        ],
      },
    ];
  }

  /**
   * Initialize built-in templates in organization settings
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
      const existingTemplates: NoteTemplate[] = settings.noteTemplates || [];

      const templates = this.getBuiltInTemplates();

      for (const template of templates) {
        const exists = existingTemplates.find((t) => t.name === template.name && !t.organizationId);

        if (!exists) {
          const newTemplate: NoteTemplate = {
            id: `note_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...template,
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
            noteTemplates: existingTemplates,
          },
        },
      });

      logger.info('Built-in note templates initialized');
    } catch (error) {
      logger.error('Error initializing built-in note templates', { error });
    }
  }

  /**
   * Get all note templates
   * Retrieved from Organization.settings
   */
  async getTemplates(
    organizationId?: string,
    filters?: {
      category?: string;
      tags?: string[];
      isActive?: boolean;
    }
  ): Promise<NoteTemplate[]> {
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
      let templates: NoteTemplate[] = settings.noteTemplates || [];

      // Apply filters
      if (filters?.category) {
        templates = templates.filter((t) => t.category === filters.category);
      }

      if (filters?.isActive !== undefined) {
        templates = templates.filter((t) => t.isActive === filters.isActive);
      }

      if (filters?.tags && filters.tags.length > 0) {
        templates = templates.filter((t) =>
          filters.tags!.some((tag) => t.tags.includes(tag))
        );
      }

      // Sort by isDefault desc, then usageCount desc
      templates.sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        return b.usageCount - a.usageCount;
      });

      return templates;
    } catch (error) {
      logger.error('Error getting note templates', { error });
      throw error;
    }
  }

  /**
   * Get template by ID
   * Retrieved from Organization.settings
   */
  async getTemplate(templateId: string, organizationId: string): Promise<NoteTemplate | null> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        return null;
      }

      const settings = (org.settings as any) || {};
      const templates: NoteTemplate[] = settings.noteTemplates || [];
      const template = templates.find((t) => t.id === templateId);

      return template || null;
    } catch (error) {
      logger.error('Error getting note template', { error, templateId });
      return null;
    }
  }

  /**
   * Create custom note template
   * Stored in Organization.settings
   */
  async createTemplate(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description: string;
      category?: string;
      sections: NoteSection[];
      variables: TemplateVariable[];
      tags?: string[];
      isDefault?: boolean;
    }
  ): Promise<NoteTemplate> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const templates: NoteTemplate[] = settings.noteTemplates || [];

      const template: NoteTemplate = {
        id: `note_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        description: data.description,
        category: (data.category as any) || 'custom',
        sections: data.sections,
        variables: data.variables,
        tags: data.tags || [],
        isActive: true,
        isDefault: data.isDefault || false,
        organizationId,
        createdBy: userId,
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
            noteTemplates: templates,
          },
        },
      });

      logger.info('Custom note template created', { templateId: template.id });

      return template;
    } catch (error) {
      logger.error('Error creating note template', { error });
      throw error;
    }
  }

  /**
   * Update note template
   * Updates in Organization.settings
   */
  async updateTemplate(
    templateId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      description: string;
      sections: NoteSection[];
      variables: TemplateVariable[];
      tags: string[];
      isActive: boolean;
      isDefault: boolean;
    }>
  ): Promise<NoteTemplate> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const templates: NoteTemplate[] = settings.noteTemplates || [];
      const templateIndex = templates.findIndex((t) => t.id === templateId);

      if (templateIndex === -1) {
        throw new Error('Template not found');
      }

      templates[templateIndex] = {
        ...templates[templateIndex],
        ...data,
        updatedAt: new Date(),
      };

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            noteTemplates: templates,
          },
        },
      });

      logger.info('Note template updated', { templateId });

      return templates[templateIndex];
    } catch (error) {
      logger.error('Error updating note template', { error, templateId });
      throw error;
    }
  }

  /**
   * Delete note template
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
      const templates: NoteTemplate[] = settings.noteTemplates || [];
      const template = templates.find((t) => t.id === templateId);

      if (!template) {
        return false;
      }

      // Can only delete custom templates from your organization
      if (!template.organizationId || template.organizationId !== organizationId) {
        throw new Error('Cannot delete built-in or other organization templates');
      }

      const filteredTemplates = templates.filter((t) => t.id !== templateId);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            noteTemplates: filteredTemplates,
          },
        },
      });

      logger.info('Note template deleted', { templateId });

      return true;
    } catch (error) {
      logger.error('Error deleting note template', { error, templateId });
      throw error;
    }
  }

  /**
   * Create meeting notes from template
   * Stored in Meeting.metadata
   */
  async createNotesFromTemplate(
    meetingId: string,
    templateId: string,
    userId: string,
    organizationId: string,
    variableValues?: Record<string, string>,
    aiGenerated: boolean = false
  ): Promise<MeetingNote> {
    try {
      const template = await this.getTemplate(templateId, organizationId);

      if (!template) {
        throw new Error('Template not found');
      }

      // Replace variables in sections
      let sections = JSON.parse(JSON.stringify(template.sections)) as NoteSection[];
      const sectionsStr = JSON.stringify(sections);
      let replacedStr = sectionsStr;

      if (variableValues) {
        for (const variable of template.variables) {
          const value = variableValues[variable.name];
          if (value) {
            replacedStr = replacedStr.replace(
              new RegExp(`{{${variable.name}}}`, 'g'),
              value
            );
          }
        }
      }

      sections = JSON.parse(replacedStr);

      // Create content structure
      const content = {
        templateId,
        templateName: template.name,
        sections,
        variables: variableValues || {},
      };

      // Generate raw content
      const rawContent = sections
        .map(section => `## ${section.title}\n\n${section.content}`)
        .join('\n\n');

      const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const note: MeetingNote = {
        id: noteId,
        meetingId,
        templateId,
        content,
        rawContent,
        aiGenerated,
        status: 'draft',
        createdBy: userId,
        lastModifiedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store note in Meeting.metadata
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
            note,
          },
        },
      });

      // Increment template usage count
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (org) {
        const settings = (org.settings as any) || {};
        const templates: NoteTemplate[] = settings.noteTemplates || [];
        const templateIndex = templates.findIndex((t) => t.id === templateId);

        if (templateIndex !== -1) {
          templates[templateIndex].usageCount += 1;
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              settings: {
                ...settings,
                noteTemplates: templates,
              },
            },
          });
        }
      }

      logger.info('Meeting notes created from template', {
        noteId: note.id,
        meetingId,
        templateId,
      });

      return note;
    } catch (error) {
      logger.error('Error creating notes from template', { error, meetingId, templateId });
      throw error;
    }
  }

  /**
   * Auto-fill template with AI-generated content
   */
  async autoFillWithAI(
    meetingId: string,
    templateId: string,
    userId: string,
    transcriptSummary?: any
  ): Promise<MeetingNote> {
    try {
      // Get meeting data first to get organizationId
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

      const template = await this.getTemplate(templateId, meeting.organizationId);

      if (!template) {
        throw new Error('Template not found');
      }

      // Extract variable values from meeting data
      const variableValues: Record<string, string> = {};

      // Auto-populate common variables
      const summary = meeting.summaries[0];
      if (summary) {
        transcriptSummary = summary;
      }

      for (const variable of template.variables) {
        switch (variable.name) {
          case 'meeting_date':
          case 'interview_date':
          case 'start_date':
            variableValues[variable.name] = meeting.scheduledStartAt?.toISOString().split('T')[0] || '';
            break;
          case 'prospect_name':
          case 'customer_name':
          case 'candidate_name':
          case 'employee_name':
            if (meeting.participants.length > 0) {
              variableValues[variable.name] = meeting.participants[0].name || '';
            }
            break;
          case 'project_name':
            variableValues[variable.name] = meeting.title;
            break;
          default:
            // Use default value if available
            if (variable.defaultValue) {
              variableValues[variable.name] = variable.defaultValue;
            }
        }
      }

      // Create notes with AI generation flag
      const note = await this.createNotesFromTemplate(
        meetingId,
        templateId,
        userId,
        meeting.organizationId,
        variableValues,
        true
      );

      logger.info('Notes auto-filled with AI', { noteId: note.id, meetingId });

      return note;
    } catch (error) {
      logger.error('Error auto-filling template with AI', { error, meetingId });
      throw error;
    }
  }

  /**
   * Get meeting notes
   * Retrieved from Meeting.metadata
   */
  async getMeetingNotes(meetingId: string): Promise<MeetingNote | null> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return null;
      }

      const metadata = meeting.metadata as any || {};
      return metadata.note || null;
    } catch (error) {
      logger.error('Error getting meeting notes', { error, meetingId });
      return null;
    }
  }

  /**
   * Update meeting notes
   * Updates in Meeting.metadata
   */
  async updateNotes(
    meetingId: string,
    userId: string,
    data: Partial<{
      content: Record<string, any>;
      rawContent: string;
      status: 'draft' | 'finalized';
    }>
  ): Promise<MeetingNote> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const metadata = meeting.metadata as any || {};
      const currentNote = metadata.note as MeetingNote;

      if (!currentNote) {
        throw new Error('Note not found');
      }

      const updatedNote: MeetingNote = {
        ...currentNote,
        ...data,
        lastModifiedBy: userId,
        updatedAt: new Date(),
      };

      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          metadata: {
            ...metadata,
            note: updatedNote,
          },
        },
      });

      logger.info('Meeting notes updated', { meetingId });

      return updatedNote;
    } catch (error) {
      logger.error('Error updating meeting notes', { error, meetingId });
      throw error;
    }
  }

  /**
   * Suggest template based on meeting data
   */
  async suggestTemplate(meetingData: {
    title?: string;
    participants?: any[];
    type?: string;
  }): Promise<NoteTemplate | null> {
    try {
      const templates = await this.getTemplates(undefined, { isActive: true });

      let bestMatch: NoteTemplate | null = null;
      let bestScore = 0;

      for (const template of templates) {
        let score = 0;

        if (meetingData.title) {
          const titleLower = meetingData.title.toLowerCase();

          // Category matching
          if (titleLower.includes('sales') || titleLower.includes('discovery')) {
            if (template.category === 'sales') score += 40;
          }
          if (titleLower.includes('1:1') || titleLower.includes('one on one')) {
            if (template.category === 'internal' && template.name.includes('1:1')) score += 40;
          }
          if (titleLower.includes('customer') || titleLower.includes('check-in')) {
            if (template.category === 'customer_success') score += 40;
          }
          if (titleLower.includes('interview')) {
            if (template.category === 'interview') score += 40;
          }
          if (titleLower.includes('project') || titleLower.includes('kickoff')) {
            if (template.category === 'project') score += 40;
          }

          // Tag matching
          for (const tag of template.tags) {
            if (titleLower.includes(tag)) {
              score += 15;
            }
          }
        }

        // Participant count heuristics
        if (meetingData.participants) {
          const count = meetingData.participants.length;
          if (count === 2 && template.name.includes('1:1')) score += 20;
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
      });

      return bestMatch;
    } catch (error) {
      logger.error('Error suggesting template', { error });
      return null;
    }
  }
}

export const noteTemplateService = new NoteTemplateService();
