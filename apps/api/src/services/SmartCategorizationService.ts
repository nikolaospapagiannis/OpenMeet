/**
 * Smart Categorization Service
 * Auto-categorize pain points, competitors, needs, objections, budget discussions, and timelines
 *
 * Enterprise Feature: Automatic detection and categorization of key sales/business moments
 */

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { transcriptService } from './TranscriptService';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export interface CategorizationResult {
  painPoints: PainPoint[];
  competitors: CompetitorMention[];
  customerNeeds: CustomerNeed[];
  objections: Objection[];
  budgetDiscussions: BudgetDiscussion[];
  timelineMentions: TimelineMention[];
  summary: {
    totalPainPoints: number;
    totalCompetitors: number;
    totalNeeds: number;
    totalObjections: number;
    budgetDiscussed: boolean;
    timelineEstablished: boolean;
  };
}

export interface PainPoint {
  id: string;
  description: string;
  category: 'technical' | 'operational' | 'financial' | 'strategic' | 'other';
  severity: 'high' | 'medium' | 'low';
  speaker?: string;
  timestamp?: number;
  quote?: string;
  impact?: string;
}

export interface CompetitorMention {
  id: string;
  competitorName: string;
  context: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  speaker?: string;
  timestamp?: number;
  quote?: string;
  concernsRaised?: string[];
}

export interface CustomerNeed {
  id: string;
  need: string;
  category: 'feature' | 'integration' | 'support' | 'performance' | 'security' | 'compliance' | 'other';
  priority: 'must_have' | 'nice_to_have' | 'future';
  speaker?: string;
  timestamp?: number;
  quote?: string;
  addressed: boolean;
}

export interface Objection {
  id: string;
  objection: string;
  type: 'price' | 'timing' | 'feature' | 'competitor' | 'trust' | 'authority' | 'need' | 'other';
  severity: 'high' | 'medium' | 'low';
  resolved: boolean;
  resolutionStrategy?: string;
  speaker?: string;
  timestamp?: number;
  quote?: string;
}

export interface BudgetDiscussion {
  id: string;
  context: string;
  amount?: number;
  currency?: string;
  timeframe?: string;
  decision_maker?: string;
  approval_required: boolean;
  budget_available: boolean | null;
  timestamp?: number;
  quote?: string;
}

export interface TimelineMention {
  id: string;
  event: string;
  date?: string;
  timeframe?: string;
  type: 'deadline' | 'start_date' | 'decision_date' | 'milestone' | 'other';
  urgency: 'high' | 'medium' | 'low';
  timestamp?: number;
  quote?: string;
}

class SmartCategorizationService {
  /**
   * Categorize entire meeting
   */
  async categorizeMeeting(meetingId: string): Promise<CategorizationResult> {
    try {
      logger.info('Starting smart categorization for meeting', { meetingId });

      // Get meeting and transcript
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const transcriptRecord = await prisma.transcript.findFirst({
        where: { meetingId },
        orderBy: { createdAt: 'desc' },
      });

      if (!transcriptRecord || !transcriptRecord.mongodbId) {
        throw new Error('Transcript not found');
      }

      const transcript = await transcriptService.getTranscriptText(transcriptRecord.mongodbId);
      const segments = await transcriptService.getTranscriptSegments(transcriptRecord.mongodbId);

      // Run categorization with GPT-4
      const result = await this.analyzeTranscript(transcript, segments);

      // Store results in meeting analytics
      await this.storeCategorizationResults(meetingId, result);

      logger.info('Smart categorization completed', {
        meetingId,
        painPoints: result.painPoints.length,
        competitors: result.competitors.length,
        needs: result.customerNeeds.length,
        objections: result.objections.length,
      });

      return result;
    } catch (error) {
      logger.error('Error in smart categorization', { error, meetingId });
      throw error;
    }
  }

  /**
   * Analyze transcript using GPT-4
   */
  private async analyzeTranscript(
    transcript: string,
    segments: any[]
  ): Promise<CategorizationResult> {
    try {
      const prompt = `Analyze this sales/business meeting transcript and categorize key elements.

Transcript:
${transcript.substring(0, 12000)}

Extract and categorize:
1. Pain Points - Problems or challenges mentioned by customers
2. Competitor Mentions - Any competitors discussed
3. Customer Needs - Requirements or desires expressed
4. Objections - Concerns or pushback raised
5. Budget Discussions - Any mention of budget, pricing, or financial constraints
6. Timeline Mentions - Deadlines, dates, or timeframes discussed

Return valid JSON with this structure:
{
  "painPoints": [{
    "description": "string",
    "category": "technical|operational|financial|strategic|other",
    "severity": "high|medium|low",
    "quote": "exact quote from transcript",
    "impact": "potential business impact"
  }],
  "competitors": [{
    "competitorName": "string",
    "context": "how they were mentioned",
    "sentiment": "positive|neutral|negative",
    "quote": "exact quote",
    "concernsRaised": ["concern1", "concern2"]
  }],
  "customerNeeds": [{
    "need": "string",
    "category": "feature|integration|support|performance|security|compliance|other",
    "priority": "must_have|nice_to_have|future",
    "quote": "exact quote",
    "addressed": boolean
  }],
  "objections": [{
    "objection": "string",
    "type": "price|timing|feature|competitor|trust|authority|need|other",
    "severity": "high|medium|low",
    "resolved": boolean,
    "resolutionStrategy": "how it was addressed",
    "quote": "exact quote"
  }],
  "budgetDiscussions": [{
    "context": "string",
    "amount": number or null,
    "currency": "USD|EUR|etc" or null,
    "timeframe": "string",
    "approval_required": boolean,
    "budget_available": boolean or null,
    "quote": "exact quote"
  }],
  "timelineMentions": [{
    "event": "string",
    "date": "date string" or null,
    "timeframe": "string",
    "type": "deadline|start_date|decision_date|milestone|other",
    "urgency": "high|medium|low",
    "quote": "exact quote"
  }]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales analyst. Extract and categorize key information from meeting transcripts with high accuracy. Always include exact quotes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');

      // Map speaker and timestamp information from segments
      const result: CategorizationResult = {
        painPoints: (analysis.painPoints || []).map((p: any, index: number) => ({
          id: `pain_${Date.now()}_${index}`,
          ...p,
          ...this.findSpeakerAndTimestamp(p.quote, segments),
        })),
        competitors: (analysis.competitors || []).map((c: any, index: number) => ({
          id: `competitor_${Date.now()}_${index}`,
          ...c,
          ...this.findSpeakerAndTimestamp(c.quote, segments),
        })),
        customerNeeds: (analysis.customerNeeds || []).map((n: any, index: number) => ({
          id: `need_${Date.now()}_${index}`,
          ...n,
          ...this.findSpeakerAndTimestamp(n.quote, segments),
        })),
        objections: (analysis.objections || []).map((o: any, index: number) => ({
          id: `objection_${Date.now()}_${index}`,
          ...o,
          ...this.findSpeakerAndTimestamp(o.quote, segments),
        })),
        budgetDiscussions: (analysis.budgetDiscussions || []).map((b: any, index: number) => ({
          id: `budget_${Date.now()}_${index}`,
          ...b,
          ...this.findSpeakerAndTimestamp(b.quote, segments),
        })),
        timelineMentions: (analysis.timelineMentions || []).map((t: any, index: number) => ({
          id: `timeline_${Date.now()}_${index}`,
          ...t,
          ...this.findSpeakerAndTimestamp(t.quote, segments),
        })),
        summary: {
          totalPainPoints: (analysis.painPoints || []).length,
          totalCompetitors: (analysis.competitors || []).length,
          totalNeeds: (analysis.customerNeeds || []).length,
          totalObjections: (analysis.objections || []).length,
          budgetDiscussed: (analysis.budgetDiscussions || []).length > 0,
          timelineEstablished: (analysis.timelineMentions || []).length > 0,
        },
      };

      return result;
    } catch (error) {
      logger.error('Error analyzing transcript', { error });
      throw error;
    }
  }

  /**
   * Find speaker and timestamp for a quote in segments
   */
  private findSpeakerAndTimestamp(
    quote: string,
    segments: any[]
  ): { speaker?: string; timestamp?: number } {
    if (!quote || !segments.length) {
      return {};
    }

    // Find segment containing this quote
    const normalizedQuote = quote.toLowerCase().trim();
    for (const segment of segments) {
      const normalizedSegment = segment.text.toLowerCase();
      if (normalizedSegment.includes(normalizedQuote) || normalizedQuote.includes(normalizedSegment)) {
        return {
          speaker: segment.speaker,
          timestamp: segment.startTime,
        };
      }
    }

    return {};
  }

  /**
   * Store categorization results
   */
  private async storeCategorizationResults(
    meetingId: string,
    result: CategorizationResult
  ): Promise<void> {
    try {
      // Store in meeting analytics
      await prisma.meetingAnalytics.upsert({
        where: { meetingId },
        update: {
          metadata: {
            categorization: result,
            categorizedAt: new Date().toISOString(),
          } as any,
        },
        create: {
          meetingId,
          metadata: {
            categorization: result,
            categorizedAt: new Date().toISOString(),
          } as any,
        },
      });
    } catch (error) {
      logger.error('Error storing categorization results', { error });
      throw error;
    }
  }

  /**
   * Get categorization results for a meeting
   */
  async getCategorizationResults(meetingId: string): Promise<CategorizationResult | null> {
    try {
      const analytics = await prisma.meetingAnalytics.findUnique({
        where: { meetingId },
      });

      if (!analytics?.metadata) {
        return null;
      }

      const metadata = analytics.metadata as any;
      return metadata.categorization || null;
    } catch (error) {
      logger.error('Error getting categorization results', { error });
      return null;
    }
  }

  /**
   * Detect specific category in real-time (for live meetings)
   */
  async detectInRealTime(
    text: string,
    category: 'pain_point' | 'competitor' | 'need' | 'objection' | 'budget' | 'timeline'
  ): Promise<any[]> {
    try {
      const prompts = {
        pain_point: 'Identify any pain points, problems, or challenges mentioned in this text.',
        competitor: 'Identify any competitor mentions in this text.',
        need: 'Identify any customer needs or requirements in this text.',
        objection: 'Identify any objections or concerns in this text.',
        budget: 'Identify any budget or pricing discussions in this text.',
        timeline: 'Identify any dates, deadlines, or timeline mentions in this text.',
      };

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a meeting analyst. Extract specific information concisely.',
          },
          {
            role: 'user',
            content: `${prompts[category]}\n\nText: ${text}\n\nReturn JSON array of findings.`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"items":[]}');
      return result.items || [];
    } catch (error) {
      logger.error('Error in real-time detection', { error, category });
      return [];
    }
  }
}

export const smartCategorizationService = new SmartCategorizationService();
