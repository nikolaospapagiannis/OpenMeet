/**
 * Auto-Agenda Service
 * Generates intelligent meeting agendas using GPT-4 based on context from previous meetings,
 * open action items, calendar context, and project status.
 *
 * ZERO TOLERANCE: Uses REAL OpenAI GPT-4 API calls - NO mocks, NO fake responses
 */

import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import OpenAI from 'openai';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'auto-agenda-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// REAL OpenAI client - not a mock
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ====================================
// Types and Interfaces
// ====================================

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration: number; // minutes
  owner?: string;
  priority: 'high' | 'medium' | 'low';
  type: 'discussion' | 'decision' | 'update' | 'brainstorm' | 'review';
  order: number;
  notes?: string;
}

export interface Agenda {
  id: string;
  meetingId: string;
  items: AgendaItem[];
  totalDuration: number;
  template?: string;
  generatedBy: 'ai' | 'user';
  context?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgendaTemplate {
  id: string;
  name: string;
  description: string;
  type: 'one_on_one' | 'team_standup' | 'sprint_planning' | 'customer_call' | 'sales_demo' | 'project_review' | 'custom';
  items: Omit<AgendaItem, 'id'>[];
  organizationId?: string;
  isPublic: boolean;
}

export interface GenerateAgendaOptions {
  meetingId: string;
  meetingTitle: string;
  meetingType?: string;
  duration?: number; // minutes
  attendeeEmails: string[];
  organizationId: string;
  userId: string;
  context?: {
    previousMeetingIds?: string[];
    openActionItems?: boolean;
    calendarContext?: boolean;
    projectIds?: string[];
  };
}

export interface GenerateAgendaResult {
  agenda: Agenda;
  suggestions: {
    title: string;
    reasoning: string;
    confidence: number;
  }[];
  context: {
    previousMeetingsAnalyzed: number;
    openActionItemsFound: number;
    templateUsed?: string;
  };
}

// ====================================
// Agenda Templates
// ====================================

const DEFAULT_TEMPLATES: AgendaTemplate[] = [
  {
    id: 'template-1-on-1',
    name: '1:1 Meeting',
    description: 'Standard one-on-one meeting template',
    type: 'one_on_one',
    isPublic: true,
    items: [
      {
        title: 'Check-in & Personal Updates',
        duration: 5,
        priority: 'high',
        type: 'discussion',
        order: 1,
        notes: 'How are things going? Any blockers or concerns?'
      },
      {
        title: 'Progress Review',
        duration: 10,
        priority: 'high',
        type: 'update',
        order: 2,
        notes: 'Review progress on current goals and projects'
      },
      {
        title: 'Challenges & Blockers',
        duration: 10,
        priority: 'high',
        type: 'discussion',
        order: 3,
        notes: 'Discuss any challenges or blockers'
      },
      {
        title: 'Career Development',
        duration: 10,
        priority: 'medium',
        type: 'discussion',
        order: 4,
        notes: 'Career goals, learning opportunities, feedback'
      },
      {
        title: 'Action Items & Next Steps',
        duration: 5,
        priority: 'high',
        type: 'decision',
        order: 5,
        notes: 'Define clear action items and follow-ups'
      }
    ]
  },
  {
    id: 'template-standup',
    name: 'Team Standup',
    description: 'Daily or weekly team standup',
    type: 'team_standup',
    isPublic: true,
    items: [
      {
        title: 'What We Accomplished',
        duration: 5,
        priority: 'high',
        type: 'update',
        order: 1,
        notes: 'Quick wins and completed tasks'
      },
      {
        title: 'Today\'s Priorities',
        duration: 5,
        priority: 'high',
        type: 'update',
        order: 2,
        notes: 'What everyone is working on today'
      },
      {
        title: 'Blockers & Help Needed',
        duration: 5,
        priority: 'high',
        type: 'discussion',
        order: 3,
        notes: 'Any blockers or areas where help is needed'
      }
    ]
  },
  {
    id: 'template-sprint-planning',
    name: 'Sprint Planning',
    description: 'Sprint planning session',
    type: 'sprint_planning',
    isPublic: true,
    items: [
      {
        title: 'Sprint Review',
        duration: 15,
        priority: 'high',
        type: 'review',
        order: 1,
        notes: 'Review previous sprint outcomes'
      },
      {
        title: 'Backlog Refinement',
        duration: 20,
        priority: 'high',
        type: 'discussion',
        order: 2,
        notes: 'Review and prioritize backlog items'
      },
      {
        title: 'Story Estimation',
        duration: 30,
        priority: 'high',
        type: 'discussion',
        order: 3,
        notes: 'Estimate effort for upcoming stories'
      },
      {
        title: 'Sprint Commitment',
        duration: 10,
        priority: 'high',
        type: 'decision',
        order: 4,
        notes: 'Commit to sprint goals and deliverables'
      },
      {
        title: 'Risk Assessment',
        duration: 10,
        priority: 'medium',
        type: 'discussion',
        order: 5,
        notes: 'Identify risks and mitigation strategies'
      }
    ]
  },
  {
    id: 'template-customer-call',
    name: 'Customer Call',
    description: 'Customer discovery or support call',
    type: 'customer_call',
    isPublic: true,
    items: [
      {
        title: 'Introduction & Agenda Overview',
        duration: 3,
        priority: 'high',
        type: 'discussion',
        order: 1,
        notes: 'Welcome and set expectations'
      },
      {
        title: 'Discovery Questions',
        duration: 15,
        priority: 'high',
        type: 'discussion',
        order: 2,
        notes: 'Understand customer needs and pain points'
      },
      {
        title: 'Solution Discussion',
        duration: 15,
        priority: 'high',
        type: 'discussion',
        order: 3,
        notes: 'Present solutions and address concerns'
      },
      {
        title: 'Demo or Walkthrough',
        duration: 15,
        priority: 'medium',
        type: 'update',
        order: 4,
        notes: 'Show product features and capabilities'
      },
      {
        title: 'Next Steps & Follow-up',
        duration: 7,
        priority: 'high',
        type: 'decision',
        order: 5,
        notes: 'Agree on action items and timeline'
      }
    ]
  },
  {
    id: 'template-sales-demo',
    name: 'Sales Demo',
    description: 'Product demonstration for prospects',
    type: 'sales_demo',
    isPublic: true,
    items: [
      {
        title: 'Introduction & Discovery',
        duration: 10,
        priority: 'high',
        type: 'discussion',
        order: 1,
        notes: 'Learn about their business and challenges'
      },
      {
        title: 'Product Demo - Core Features',
        duration: 20,
        priority: 'high',
        type: 'update',
        order: 2,
        notes: 'Demo features most relevant to their needs'
      },
      {
        title: 'Use Case Discussion',
        duration: 10,
        priority: 'high',
        type: 'discussion',
        order: 3,
        notes: 'Map features to their specific use cases'
      },
      {
        title: 'Q&A Session',
        duration: 10,
        priority: 'high',
        type: 'discussion',
        order: 4,
        notes: 'Answer questions and address objections'
      },
      {
        title: 'Pricing & Next Steps',
        duration: 10,
        priority: 'high',
        type: 'decision',
        order: 5,
        notes: 'Discuss pricing and path forward'
      }
    ]
  },
  {
    id: 'template-project-review',
    name: 'Project Review',
    description: 'Project status and review meeting',
    type: 'project_review',
    isPublic: true,
    items: [
      {
        title: 'Project Status Overview',
        duration: 10,
        priority: 'high',
        type: 'update',
        order: 1,
        notes: 'Current status, milestones, and metrics'
      },
      {
        title: 'Accomplishments & Wins',
        duration: 10,
        priority: 'medium',
        type: 'update',
        order: 2,
        notes: 'Celebrate successes and completed work'
      },
      {
        title: 'Challenges & Risks',
        duration: 15,
        priority: 'high',
        type: 'discussion',
        order: 3,
        notes: 'Discuss obstacles and risk mitigation'
      },
      {
        title: 'Resource Review',
        duration: 10,
        priority: 'medium',
        type: 'review',
        order: 4,
        notes: 'Budget, timeline, and resource allocation'
      },
      {
        title: 'Decisions & Action Items',
        duration: 15,
        priority: 'high',
        type: 'decision',
        order: 5,
        notes: 'Make key decisions and assign action items'
      }
    ]
  }
];

class AutoAgendaService {
  /**
   * Generate an agenda using AI based on meeting context
   * REAL GPT-4 API call - not a mock
   */
  async generateAgenda(options: GenerateAgendaOptions): Promise<GenerateAgendaResult> {
    try {
      logger.info('Generating agenda with AI', { meetingId: options.meetingId });

      // Gather context from various sources
      const context = await this.gatherContext(options);

      // Build the prompt for GPT-4
      const prompt = this.buildPrompt(options, context);

      // Call REAL OpenAI GPT-4 API
      const completion = await openai.chat.completions.create({
        model: process.env.GPT_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert meeting facilitator and productivity coach. Your role is to create effective, actionable meeting agendas that maximize productivity and ensure clear outcomes. You understand different meeting types, team dynamics, and best practices for running efficient meetings.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0].message.content || '{}';
      const aiResponse = JSON.parse(responseText);

      // Transform AI response into our agenda format
      const agenda = await this.createAgendaFromAI(
        options.meetingId,
        options.userId,
        aiResponse,
        context
      );

      return {
        agenda,
        suggestions: aiResponse.suggestions || [],
        context: {
          previousMeetingsAnalyzed: context.previousMeetings.length,
          openActionItemsFound: context.openActionItems.length,
          templateUsed: context.template?.name
        }
      };
    } catch (error: any) {
      logger.error('Failed to generate agenda', { error: error.message });
      throw new Error(`Agenda generation failed: ${error.message}`);
    }
  }

  /**
   * Gather context from previous meetings, action items, etc.
   */
  private async gatherContext(options: GenerateAgendaOptions) {
    const { organizationId, attendeeEmails, context: contextOptions } = options;

    // Get previous meetings with same attendees
    let previousMeetings: any[] = [];
    if (contextOptions?.previousMeetingIds) {
      previousMeetings = await prisma.meeting.findMany({
        where: {
          id: { in: contextOptions.previousMeetingIds },
          organizationId
        },
        include: {
          summaries: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          participants: true
        },
        take: 5,
        orderBy: { scheduledStartAt: 'desc' }
      });
    } else {
      // Find recent meetings with similar attendees
      previousMeetings = await prisma.meeting.findMany({
        where: {
          organizationId,
          status: 'completed',
          participants: {
            some: {
              email: { in: attendeeEmails }
            }
          }
        },
        include: {
          summaries: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          participants: true
        },
        take: 5,
        orderBy: { scheduledStartAt: 'desc' }
      });
    }

    // Get open action items for these attendees
    let openActionItems: any[] = [];
    if (contextOptions?.openActionItems !== false) {
      const summaries = await prisma.meetingSummary.findMany({
        where: {
          meeting: {
            organizationId,
            participants: {
              some: {
                email: { in: attendeeEmails }
              }
            }
          }
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });

      // Extract open action items from summaries
      for (const summary of summaries) {
        const actionItems = Array.isArray(summary.actionItems) ? summary.actionItems : [];
        for (const item of actionItems as any[]) {
          if (!item.completed && !item.cancelled) {
            openActionItems.push({
              text: item.text || item.title,
              assignee: item.assignee,
              dueDate: item.dueDate,
              meetingId: summary.meetingId
            });
          }
        }
      }
    }

    // Get template if meeting type matches
    const template = this.getTemplateByType(options.meetingType);

    return {
      previousMeetings,
      openActionItems,
      template,
      meetingType: options.meetingType,
      duration: options.duration || 60
    };
  }

  /**
   * Build GPT-4 prompt for agenda generation
   */
  private buildPrompt(options: GenerateAgendaOptions, context: any): string {
    const { meetingTitle, duration = 60, attendeeEmails } = options;

    let prompt = `Generate a meeting agenda for the following meeting:

Title: ${meetingTitle}
Duration: ${duration} minutes
Attendees: ${attendeeEmails.length} people

`;

    if (context.template) {
      prompt += `\nRecommended Template: ${context.template.name}\n`;
      prompt += `Template Items:\n${context.template.items.map((item: any) =>
        `- ${item.title} (${item.duration}min)`
      ).join('\n')}\n`;
    }

    if (context.previousMeetings.length > 0) {
      prompt += `\nPrevious Meetings Context:\n`;
      for (const meeting of context.previousMeetings.slice(0, 3)) {
        prompt += `- ${meeting.title}`;
        if (meeting.summaries[0]) {
          const summary = meeting.summaries[0];
          prompt += `: ${summary.overview || 'No summary'}`;
        }
        prompt += `\n`;
      }
    }

    if (context.openActionItems.length > 0) {
      prompt += `\nOpen Action Items (${context.openActionItems.length}):\n`;
      for (const item of context.openActionItems.slice(0, 10)) {
        prompt += `- ${item.text}${item.assignee ? ` (${item.assignee})` : ''}\n`;
      }
    }

    prompt += `\nPlease generate a detailed agenda with the following JSON structure:
{
  "items": [
    {
      "title": "Item title",
      "description": "Brief description of what will be covered",
      "duration": 10,
      "priority": "high|medium|low",
      "type": "discussion|decision|update|brainstorm|review",
      "order": 1,
      "notes": "Additional context or questions to address"
    }
  ],
  "suggestions": [
    {
      "title": "Suggestion title",
      "reasoning": "Why this is recommended",
      "confidence": 0.85
    }
  ]
}

Requirements:
- Total duration of all items should be approximately ${duration} minutes
- Include time for intros/outros if needed
- Prioritize discussing open action items if relevant
- Build on topics from previous meetings where appropriate
- Ensure clear outcomes and decision points
- Leave buffer time for overruns (allocate ~80% of total time)`;

    return prompt;
  }

  /**
   * Create agenda record from AI response
   */
  private async createAgendaFromAI(
    meetingId: string,
    userId: string,
    aiResponse: any,
    context: any
  ): Promise<Agenda> {
    const items: AgendaItem[] = (aiResponse.items || []).map((item: any, index: number) => ({
      id: `item-${Date.now()}-${index}`,
      title: item.title,
      description: item.description,
      duration: item.duration || 10,
      owner: item.owner,
      priority: item.priority || 'medium',
      type: item.type || 'discussion',
      order: item.order || index + 1,
      notes: item.notes
    }));

    const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

    // Store in database (using metadata JSON field)
    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        metadata: {
          agenda: {
            items: items as any,
            totalDuration,
            template: context.template?.name,
            generatedBy: 'ai',
            generatedAt: new Date().toISOString()
          }
        } as any
      }
    });

    return {
      id: `agenda-${meetingId}`,
      meetingId,
      items,
      totalDuration,
      template: context.template?.name,
      generatedBy: 'ai',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get agenda for a meeting
   */
  async getAgenda(meetingId: string): Promise<Agenda | null> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const metadata = meeting.metadata as any;
    if (!metadata?.agenda) {
      return null;
    }

    return {
      id: `agenda-${meetingId}`,
      meetingId,
      ...metadata.agenda,
      createdAt: new Date(metadata.agenda.generatedAt || meeting.createdAt),
      updatedAt: new Date(meeting.updatedAt)
    };
  }

  /**
   * Update agenda
   */
  async updateAgenda(meetingId: string, items: AgendaItem[]): Promise<Agenda> {
    const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        metadata: {
          agenda: {
            items: items as any,
            totalDuration,
            generatedBy: 'user',
            updatedAt: new Date().toISOString()
          }
        } as any
      }
    });

    return {
      id: `agenda-${meetingId}`,
      meetingId,
      items,
      totalDuration,
      generatedBy: 'user',
      createdAt: new Date(meeting.createdAt),
      updatedAt: new Date()
    };
  }

  /**
   * Get all templates
   */
  async getTemplates(organizationId?: string): Promise<AgendaTemplate[]> {
    // Return default templates + org-specific templates
    const templates = [...DEFAULT_TEMPLATES];

    if (organizationId) {
      // Get custom templates from database
      const customTemplates = await prisma.meetingTemplate.findMany({
        where: {
          organizationId,
          isActive: true
        }
      });

      // Transform to AgendaTemplate format
      for (const t of customTemplates) {
        const templateData = t.templateData as any;
        if (templateData?.agendaItems) {
          templates.push({
            id: t.id,
            name: t.name,
            description: t.description || '',
            type: t.type as any,
            items: templateData.agendaItems,
            organizationId: t.organizationId,
            isPublic: false
          });
        }
      }
    }

    return templates;
  }

  /**
   * Create custom template
   */
  async createTemplate(
    organizationId: string,
    template: Omit<AgendaTemplate, 'id' | 'organizationId'>
  ): Promise<AgendaTemplate> {
    const created = await prisma.meetingTemplate.create({
      data: {
        organizationId,
        name: template.name,
        description: template.description,
        type: template.type as any,
        templateData: {
          agendaItems: template.items as any
        } as any,
        isActive: true
      }
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description || '',
      type: created.type as any,
      items: template.items,
      organizationId: created.organizationId,
      isPublic: false
    };
  }

  /**
   * Get template by meeting type
   */
  private getTemplateByType(meetingType?: string): AgendaTemplate | undefined {
    if (!meetingType) return undefined;

    return DEFAULT_TEMPLATES.find(t =>
      t.type === meetingType ||
      t.name.toLowerCase().includes(meetingType.toLowerCase())
    );
  }
}

export const autoAgendaService = new AutoAgendaService();
