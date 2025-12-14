/**
 * Seed Script for Pre-built Templates
 * Run this script to populate the database with pre-built templates
 */

import { PrismaClient, TemplateType } from '@prisma/client';

const prisma = new PrismaClient();

// Pre-built templates to seed
const preBuiltTemplates = [
  {
    name: 'Sales Discovery Call',
    description: 'Comprehensive notes template for sales discovery calls',
    type: TemplateType.client_call,
    templateData: {
      sections: [
        {
          title: 'Meeting Overview',
          content: '**Meeting:** {{meeting_title}}\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n**Prospect:** {{prospect_name}} - {{company}}'
        },
        {
          title: 'Current Situation',
          content: '### Company Background\n\n### Current Challenges\n\n### Impact of Challenges'
        },
        {
          title: 'Goals & Objectives',
          content: '### Primary Goals\n\n### Success Metrics\n\n### Timeline'
        },
        {
          title: 'Next Steps',
          content: '### Action Items\n\n### Follow-up Date'
        }
      ],
      tags: ['sales', 'discovery', 'prospecting']
    },
    variables: ['{{meeting_title}}', '{{date}}', '{{attendees}}', '{{prospect_name}}', '{{company}}']
  },
  {
    name: '1-on-1 Meeting',
    description: 'Template for one-on-one meetings with team members',
    type: TemplateType.one_on_one,
    templateData: {
      sections: [
        {
          title: 'Meeting Details',
          content: '**Meeting:** {{meeting_title}}\n**Date:** {{date}}\n**Employee:** {{employee}}\n**Manager:** {{manager}}'
        },
        {
          title: 'Check-in',
          content: '### How are things going?\n\n### Current workload\n\n### Blockers or challenges'
        },
        {
          title: 'Goals & Progress',
          content: '### Current goals\n\n### Progress update\n\n### Support needed'
        },
        {
          title: 'Development',
          content: '### Career goals\n\n### Learning opportunities\n\n### Feedback'
        },
        {
          title: 'Action Items',
          content: '### Employee actions\n\n### Manager actions\n\n### Next meeting topics'
        }
      ],
      tags: ['internal', 'one-on-one', 'management']
    },
    variables: ['{{meeting_title}}', '{{date}}', '{{employee}}', '{{manager}}']
  },
  {
    name: 'Team Standup',
    description: 'Daily standup meeting template',
    type: TemplateType.standup,
    templateData: {
      sections: [
        {
          title: 'Standup Info',
          content: '**Date:** {{date}}\n**Team:** {{team}}\n**Sprint:** {{sprint}}\n**Attendees:** {{attendees}}'
        },
        {
          title: 'Team Updates',
          content: '### Yesterday\'s Progress\n\n### Today\'s Focus\n\n### Blockers'
        },
        {
          title: 'Key Metrics',
          content: '### Sprint Progress\n\n### Burndown Status\n\n### Risk Items'
        },
        {
          title: 'Action Items',
          content: '### Immediate Actions\n\n### Dependencies'
        }
      ],
      tags: ['internal', 'standup', 'agile']
    },
    variables: ['{{date}}', '{{team}}', '{{attendees}}', '{{sprint}}']
  },
  {
    name: 'Technical Interview',
    description: 'Technical interview assessment template',
    type: TemplateType.interview,
    templateData: {
      sections: [
        {
          title: 'Interview Details',
          content: '**Candidate:** {{candidate}}\n**Position:** {{position}}\n**Date:** {{date}}\n**Interviewer:** {{interviewer}}'
        },
        {
          title: 'Technical Assessment',
          content: '### Coding Skills\n\n### Problem Solving\n\n### System Design\n\n### Technical Knowledge'
        },
        {
          title: 'Questions Asked',
          content: '### Technical Questions\n\n### Candidate Responses\n\n### Follow-up Questions'
        },
        {
          title: 'Evaluation',
          content: '### Strengths\n\n### Areas of Concern\n\n### Overall Rating'
        },
        {
          title: 'Recommendation',
          content: '### Hiring Recommendation\n\n### Next Steps\n\n### Additional Notes'
        }
      ],
      tags: ['interview', 'technical', 'hiring']
    },
    variables: ['{{candidate}}', '{{position}}', '{{date}}', '{{interviewer}}']
  },
  {
    name: 'Sprint Retrospective',
    description: 'Sprint retrospective template',
    type: TemplateType.retrospective,
    templateData: {
      sections: [
        {
          title: 'Retro Details',
          content: '**Sprint:** {{sprint}}\n**Team:** {{team}}\n**Facilitator:** {{facilitator}}\n**Date:** {{date}}'
        },
        {
          title: 'What Went Well',
          content: '### Successes\n\n### Team Achievements\n\n### Process Improvements'
        },
        {
          title: 'What Could Be Better',
          content: '### Challenges\n\n### Pain Points\n\n### Missed Opportunities'
        },
        {
          title: 'Action Items',
          content: '### Process Changes\n\n### Team Agreements\n\n### Next Sprint Focus'
        },
        {
          title: 'Team Health',
          content: '### Morale\n\n### Collaboration\n\n### Support Needed'
        }
      ],
      tags: ['project', 'retrospective', 'agile']
    },
    variables: ['{{sprint}}', '{{team}}', '{{facilitator}}', '{{date}}']
  }
];

async function seedTemplates() {
  console.log('Starting template seeding...');

  try {
    // Get or create a system organization for global templates
    let systemOrg = await prisma.organization.findFirst({
      where: { slug: 'system' }
    });

    if (!systemOrg) {
      systemOrg = await prisma.organization.create({
        data: {
          name: 'System',
          slug: 'system',
          subscriptionTier: 'enterprise'
        }
      });
      console.log('Created system organization');
    }

    // Seed each template
    for (const template of preBuiltTemplates) {
      const existing = await prisma.meetingTemplate.findFirst({
        where: {
          name: template.name,
          organizationId: systemOrg.id
        }
      });

      if (existing) {
        console.log(`Template "${template.name}" already exists, updating...`);
        await prisma.meetingTemplate.update({
          where: { id: existing.id },
          data: {
            description: template.description,
            type: template.type,
            templateData: template.templateData as any,
            variables: template.variables as any,
            isActive: true
          }
        });
      } else {
        await prisma.meetingTemplate.create({
          data: {
            organizationId: systemOrg.id,
            name: template.name,
            description: template.description,
            type: template.type,
            templateData: template.templateData as any,
            variables: template.variables as any,
            isActive: true,
            usageCount: 0
          }
        });
        console.log(`Created template: ${template.name}`);
      }
    }

    console.log('Template seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTemplates();