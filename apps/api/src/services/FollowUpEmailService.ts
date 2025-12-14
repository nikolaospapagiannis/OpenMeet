/**
 * Follow-Up Email Service
 * Auto-draft follow-up emails with meeting context, action items, and key moments
 *
 * Enterprise Feature: Intelligent email generation from meeting content
 */

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { transcriptService } from './TranscriptService';
import { emailService, EmailTemplate as SendGridEmailTemplate, EmailOptions } from './email';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export interface FollowUpEmailDraft {
  id: string;
  meetingId: string;
  subject: string;
  body: string;
  bodyHtml: string;
  recipients: EmailRecipient[];
  actionItems: string[];
  keyMoments: KeyMoment[];
  nextSteps: string[];
  template: EmailTemplate;
  tone: EmailTone;
  generatedAt: Date;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  role?: string;
  type: 'to' | 'cc' | 'bcc';
}

export interface KeyMoment {
  description: string;
  timestamp: number;
  quote?: string;
  importance: 'high' | 'medium' | 'low';
}

export interface EmailTemplate {
  type: 'sales_follow_up' | 'internal_summary' | 'client_recap' | 'action_items' | 'thank_you' | 'custom';
  name: string;
  structure: string[];
}

export type EmailTone = 'professional' | 'friendly' | 'formal' | 'casual' | 'enthusiastic';

export interface DraftEmailOptions {
  meetingId: string;
  templateType?: EmailTemplate['type'];
  tone?: EmailTone;
  includeTranscriptExcerpts?: boolean;
  includeRecording?: boolean;
  customInstructions?: string;
  recipients?: EmailRecipient[];
}

class FollowUpEmailService {
  /**
   * Draft follow-up email for meeting
   */
  async draftEmail(options: DraftEmailOptions): Promise<FollowUpEmailDraft> {
    try {
      logger.info('Drafting follow-up email', { meetingId: options.meetingId });

      // Get meeting data
      const meeting = await this.getMeetingData(options.meetingId);

      // Get template
      const template = this.getEmailTemplate(options.templateType || 'sales_follow_up');

      // Generate email content
      const emailContent = await this.generateEmailContent(
        meeting,
        template,
        options.tone || 'professional',
        options.customInstructions
      );

      // Extract key moments
      const keyMoments = await this.extractKeyMoments(meeting);

      // Determine recipients
      const recipients = options.recipients || this.determineRecipients(meeting);

      const draft: FollowUpEmailDraft = {
        id: `email_draft_${Date.now()}`,
        meetingId: options.meetingId,
        subject: emailContent.subject,
        body: emailContent.body,
        bodyHtml: emailContent.bodyHtml,
        recipients,
        actionItems: meeting.actionItems,
        keyMoments,
        nextSteps: emailContent.nextSteps,
        template,
        tone: options.tone || 'professional',
        generatedAt: new Date(),
      };

      // Store draft
      await this.storeDraft(draft);

      logger.info('Follow-up email drafted', { draftId: draft.id, meetingId: options.meetingId });
      return draft;
    } catch (error) {
      logger.error('Error drafting follow-up email', { error, options });
      throw error;
    }
  }

  /**
   * Get meeting data
   */
  private async getMeetingData(meetingId: string): Promise<any> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: true,
        summaries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const transcriptRecord = await prisma.transcript.findFirst({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    let transcript = '';
    let segments: any[] = [];

    if (transcriptRecord?.mongodbId) {
      transcript = await transcriptService.getTranscriptText(transcriptRecord.mongodbId);
      segments = await transcriptService.getTranscriptSegments(transcriptRecord.mongodbId);
    }

    const summary = meeting.summaries[0];

    return {
      id: meeting.id,
      title: meeting.title,
      participants: meeting.participants,
      summary: summary?.overview || '',
      keyPoints: (summary?.keyPoints as string[]) || [],
      actionItems: (summary?.actionItems as string[]) || [],
      decisions: (summary?.decisions as string[]) || [],
      transcript: transcript.substring(0, 8000), // Limit for API
      segments,
      scheduledAt: meeting.scheduledStartAt,
    };
  }

  /**
   * Get email template
   */
  private getEmailTemplate(type: EmailTemplate['type']): EmailTemplate {
    const templates: Record<EmailTemplate['type'], EmailTemplate> = {
      sales_follow_up: {
        type: 'sales_follow_up',
        name: 'Sales Follow-Up',
        structure: [
          'greeting',
          'thank_you',
          'meeting_recap',
          'key_discussion_points',
          'next_steps',
          'call_to_action',
          'closing',
        ],
      },
      internal_summary: {
        type: 'internal_summary',
        name: 'Internal Meeting Summary',
        structure: [
          'greeting',
          'meeting_purpose',
          'key_decisions',
          'action_items_with_owners',
          'upcoming_deadlines',
          'closing',
        ],
      },
      client_recap: {
        type: 'client_recap',
        name: 'Client Meeting Recap',
        structure: [
          'greeting',
          'appreciation',
          'meeting_summary',
          'discussed_solutions',
          'proposed_timeline',
          'next_steps',
          'availability',
          'closing',
        ],
      },
      action_items: {
        type: 'action_items',
        name: 'Action Items Summary',
        structure: [
          'greeting',
          'action_items_list',
          'deadlines',
          'dependencies',
          'support_needed',
          'closing',
        ],
      },
      thank_you: {
        type: 'thank_you',
        name: 'Thank You Note',
        structure: [
          'greeting',
          'sincere_thanks',
          'key_takeaway',
          'looking_forward',
          'closing',
        ],
      },
      custom: {
        type: 'custom',
        name: 'Custom Template',
        structure: [
          'greeting',
          'content',
          'closing',
        ],
      },
    };

    return templates[type];
  }

  /**
   * Generate email content using GPT-4
   */
  private async generateEmailContent(
    meeting: any,
    template: EmailTemplate,
    tone: EmailTone,
    customInstructions?: string
  ): Promise<{
    subject: string;
    body: string;
    bodyHtml: string;
    nextSteps: string[];
  }> {
    try {
      const toneDescriptions = {
        professional: 'professional and business-appropriate',
        friendly: 'warm and approachable while maintaining professionalism',
        formal: 'formal and highly professional',
        casual: 'casual and conversational',
        enthusiastic: 'enthusiastic and energetic',
      };

      const prompt = `Draft a follow-up email for this meeting.

Meeting Information:
- Title: ${meeting.title}
- Summary: ${meeting.summary}
- Key Points: ${meeting.keyPoints.join(', ')}
- Action Items: ${meeting.actionItems.join(', ')}
- Decisions: ${meeting.decisions.join(', ')}

Email Template: ${template.name}
Tone: ${toneDescriptions[tone]}

${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

Generate an email with:
1. A compelling subject line
2. A well-structured body following the ${template.name} template
3. Clear next steps
4. Proper formatting

Return valid JSON:
{
  "subject": "email subject line",
  "body": "plain text email body",
  "bodyHtml": "HTML formatted email body",
  "nextSteps": ["step1", "step2", "step3"]
}

Make the email concise, actionable, and ${toneDescriptions[tone]}.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business communication specialist. Draft professional, clear, and actionable follow-up emails.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');

      return {
        subject: result.subject || `Follow-up: ${meeting.title}`,
        body: result.body || '',
        bodyHtml: result.bodyHtml || this.convertToHtml(result.body || ''),
        nextSteps: result.nextSteps || [],
      };
    } catch (error) {
      logger.error('Error generating email content', { error });
      throw error;
    }
  }

  /**
   * Extract key moments from meeting
   */
  private async extractKeyMoments(meeting: any): Promise<KeyMoment[]> {
    try {
      if (!meeting.segments || meeting.segments.length === 0) {
        return [];
      }

      const prompt = `Analyze this meeting transcript and identify the top 5 key moments.

Transcript excerpt:
${meeting.transcript}

Return valid JSON array of key moments:
[{
  "description": "brief description of the moment",
  "quote": "exact quote from transcript",
  "importance": "high|medium|low"
}]`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at identifying key moments in business meetings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"moments":[]}');
      const moments = result.moments || [];

      return moments.map((m: any, index: number) => ({
        ...m,
        timestamp: 0, // Would need to find in segments
        id: `moment_${index}`,
      }));
    } catch (error) {
      logger.error('Error extracting key moments', { error });
      return [];
    }
  }

  /**
   * Determine recipients from meeting participants
   */
  private determineRecipients(meeting: any): EmailRecipient[] {
    const recipients: EmailRecipient[] = [];

    for (const participant of meeting.participants) {
      if (participant.email) {
        recipients.push({
          email: participant.email,
          name: participant.name,
          role: participant.role,
          type: participant.isOrganizer ? 'cc' : 'to',
        });
      }
    }

    return recipients;
  }

  /**
   * Convert plain text to HTML
   */
  private convertToHtml(text: string): string {
    // Simple conversion - split by double newlines for paragraphs
    const paragraphs = text.split('\n\n');
    let html = '';

    for (const para of paragraphs) {
      if (para.trim()) {
        // Check if it's a list item
        if (para.trim().startsWith('-') || para.trim().startsWith('*')) {
          const items = para.split('\n').filter(line => line.trim());
          html += '<ul>\n';
          for (const item of items) {
            const cleaned = item.replace(/^[-*]\s*/, '');
            html += `  <li>${cleaned}</li>\n`;
          }
          html += '</ul>\n';
        } else if (para.trim().match(/^\d+\./)) {
          const items = para.split('\n').filter(line => line.trim());
          html += '<ol>\n';
          for (const item of items) {
            const cleaned = item.replace(/^\d+\.\s*/, '');
            html += `  <li>${cleaned}</li>\n`;
          }
          html += '</ol>\n';
        } else {
          html += `<p>${para.trim()}</p>\n`;
        }
      }
    }

    return html;
  }

  /**
   * Store email draft
   */
  private async storeDraft(draft: FollowUpEmailDraft): Promise<void> {
    try {
      // Store in meeting metadata
      const meeting = await prisma.meeting.findUnique({
        where: { id: draft.meetingId },
      });

      if (!meeting) return;

      const metadata = meeting.metadata as any || {};
      const emailDrafts = metadata.emailDrafts || [];
      emailDrafts.push({
        id: draft.id,
        subject: draft.subject,
        template: draft.template.type,
        tone: draft.tone,
        generatedAt: draft.generatedAt,
      });

      await prisma.meeting.update({
        where: { id: draft.meetingId },
        data: {
          metadata: {
            ...metadata,
            emailDrafts,
            latestEmailDraft: draft,
          } as any,
        },
      });
    } catch (error) {
      logger.error('Error storing email draft', { error });
    }
  }

  /**
   * Get email draft
   */
  async getDraft(meetingId: string, draftId?: string): Promise<FollowUpEmailDraft | null> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting?.metadata) {
        return null;
      }

      const metadata = meeting.metadata as any;

      if (draftId) {
        const emailDrafts = metadata.emailDrafts || [];
        const draft = emailDrafts.find((d: any) => d.id === draftId);
        return draft || null;
      }

      return metadata.latestEmailDraft || null;
    } catch (error) {
      logger.error('Error getting email draft', { error });
      return null;
    }
  }

  /**
   * List all email drafts for meeting
   */
  async listDrafts(meetingId: string): Promise<FollowUpEmailDraft[]> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting?.metadata) {
        return [];
      }

      const metadata = meeting.metadata as any;
      return metadata.emailDrafts || [];
    } catch (error) {
      logger.error('Error listing email drafts', { error });
      return [];
    }
  }

  /**
   * Regenerate email with different options
   */
  async regenerateEmail(
    meetingId: string,
    changes: {
      tone?: EmailTone;
      templateType?: EmailTemplate['type'];
      customInstructions?: string;
    }
  ): Promise<FollowUpEmailDraft> {
    try {
      const meeting = await this.getMeetingData(meetingId);

      const template = this.getEmailTemplate(changes.templateType || 'sales_follow_up');
      const emailContent = await this.generateEmailContent(
        meeting,
        template,
        changes.tone || 'professional',
        changes.customInstructions
      );

      const keyMoments = await this.extractKeyMoments(meeting);
      const recipients = this.determineRecipients(meeting);

      const draft: FollowUpEmailDraft = {
        id: `email_draft_${Date.now()}`,
        meetingId,
        subject: emailContent.subject,
        body: emailContent.body,
        bodyHtml: emailContent.bodyHtml,
        recipients,
        actionItems: meeting.actionItems,
        keyMoments,
        nextSteps: emailContent.nextSteps,
        template,
        tone: changes.tone || 'professional',
        generatedAt: new Date(),
      };

      await this.storeDraft(draft);

      return draft;
    } catch (error) {
      logger.error('Error regenerating email', { error });
      throw error;
    }
  }

  /**
   * Send email draft using EmailService (SendGrid)
   */
  async sendEmail(draftId: string, meetingId: string): Promise<{ sent: number; failed: number }> {
    try {
      const draft = await this.getDraft(meetingId, draftId);

      if (!draft) {
        throw new Error('Draft not found');
      }

      // Separate recipients by type
      const toRecipients = draft.recipients.filter(r => r.type === 'to').map(r => r.email);
      const ccRecipients = draft.recipients.filter(r => r.type === 'cc').map(r => r.email);
      const bccRecipients = draft.recipients.filter(r => r.type === 'bcc').map(r => r.email);

      if (toRecipients.length === 0) {
        throw new Error('No recipients specified for email');
      }

      logger.info('Sending follow-up email', {
        draftId,
        meetingId,
        toCount: toRecipients.length,
        ccCount: ccRecipients.length,
        bccCount: bccRecipients.length,
        subject: draft.subject,
      });

      // Build the email template for SendGrid
      const template: SendGridEmailTemplate = {
        subject: draft.subject,
        htmlContent: draft.bodyHtml,
        textContent: draft.body,
      };

      // Build email options
      const options: EmailOptions = {
        to: toRecipients,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
        metadata: {
          meetingId,
          draftId,
          templateType: draft.template.type,
          tone: draft.tone,
          source: 'follow-up-email-service',
        },
      };

      // Send the email via EmailService (SendGrid)
      const success = await emailService.sendEmail(template, options);

      // Track results
      const result = {
        sent: success ? toRecipients.length : 0,
        failed: success ? 0 : toRecipients.length,
      };

      // Update meeting metadata with send status
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (meeting) {
        const metadata = meeting.metadata as any || {};
        const emailHistory = metadata.emailHistory || [];

        emailHistory.push({
          draftId,
          sentAt: new Date().toISOString(),
          success,
          recipients: {
            to: toRecipients,
            cc: ccRecipients,
            bcc: bccRecipients,
          },
          subject: draft.subject,
          templateType: draft.template.type,
        });

        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            metadata: {
              ...metadata,
              emailSentAt: new Date().toISOString(),
              emailSentDraftId: draftId,
              emailSendSuccess: success,
              emailHistory,
            } as any,
          },
        });
      }

      if (success) {
        logger.info('Follow-up email sent successfully', {
          draftId,
          meetingId,
          recipients: toRecipients.length,
        });
      } else {
        logger.error('Failed to send follow-up email', {
          draftId,
          meetingId,
        });
        throw new Error('Email sending failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending follow-up email', { error, draftId, meetingId });
      throw error;
    }
  }

  /**
   * Send email to multiple recipients individually (for personalization)
   */
  async sendPersonalizedEmails(
    draftId: string,
    meetingId: string,
    personalizations?: Map<string, { greeting?: string; additionalContent?: string }>
  ): Promise<{ sent: number; failed: number }> {
    try {
      const draft = await this.getDraft(meetingId, draftId);

      if (!draft) {
        throw new Error('Draft not found');
      }

      const toRecipients = draft.recipients.filter(r => r.type === 'to');

      if (toRecipients.length === 0) {
        throw new Error('No recipients specified for email');
      }

      let sent = 0;
      let failed = 0;

      // Send to each recipient individually
      for (const recipient of toRecipients) {
        try {
          const personalization = personalizations?.get(recipient.email);

          // Personalize content if provided
          let personalizedHtml = draft.bodyHtml;
          let personalizedText = draft.body;

          if (personalization) {
            if (personalization.greeting && recipient.name) {
              // Replace generic greeting with personalized one
              personalizedHtml = personalizedHtml.replace(
                /Hi,|Hello,|Dear [^,]+,/i,
                `${personalization.greeting} ${recipient.name},`
              );
              personalizedText = personalizedText.replace(
                /Hi,|Hello,|Dear [^,]+,/i,
                `${personalization.greeting} ${recipient.name},`
              );
            }

            if (personalization.additionalContent) {
              // Append additional personalized content before closing
              personalizedHtml = personalizedHtml.replace(
                /<\/body>/i,
                `<p>${personalization.additionalContent}</p></body>`
              );
              personalizedText += `\n\n${personalization.additionalContent}`;
            }
          }

          const template: SendGridEmailTemplate = {
            subject: draft.subject,
            htmlContent: personalizedHtml,
            textContent: personalizedText,
          };

          const success = await emailService.sendEmail(template, {
            to: recipient.email,
            metadata: {
              meetingId,
              draftId,
              recipientName: recipient.name,
              recipientRole: recipient.role,
              source: 'follow-up-email-service-personalized',
            },
          });

          if (success) {
            sent++;
            logger.info('Personalized email sent', {
              recipient: recipient.email,
              draftId,
            });
          } else {
            failed++;
            logger.warn('Failed to send personalized email', {
              recipient: recipient.email,
              draftId,
            });
          }
        } catch (recipientError) {
          failed++;
          logger.error('Error sending to recipient', {
            recipient: recipient.email,
            error: recipientError,
          });
        }
      }

      // Update meeting metadata
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (meeting) {
        const metadata = meeting.metadata as any || {};
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            metadata: {
              ...metadata,
              emailSentAt: new Date().toISOString(),
              emailSentDraftId: draftId,
              emailSendResults: { sent, failed },
            } as any,
          },
        });
      }

      logger.info('Personalized emails batch complete', {
        draftId,
        meetingId,
        sent,
        failed,
      });

      return { sent, failed };
    } catch (error) {
      logger.error('Error sending personalized emails', { error, draftId, meetingId });
      throw error;
    }
  }
}

export const followUpEmailService = new FollowUpEmailService();
