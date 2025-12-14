/**
 * Super Summary Service
 * AI-powered meeting summarization
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SuperSummary {
  id: string;
  meetingId: string;
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    text: string;
    assignee?: string;
    dueDate?: Date;
  }>;
  decisions: string[];
  nextSteps: string[];
  sentiment: string;
  createdAt: Date;
}

/**
 * Generate super summary for a meeting
 */
export async function generateSuperSummary(meetingId: string): Promise<SuperSummary> {
  try {
    logger.info('Generating super summary', { meetingId });

    // Get meeting transcript
    const transcript = await prisma.transcription.findFirst({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    if (!transcript || !transcript.text) {
      throw new Error('No transcript found for meeting');
    }

    // Generate summary using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert meeting analyst. Analyze the transcript and provide:
1. A concise summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Action items with assignees if mentioned
4. Decisions made
5. Next steps
6. Overall sentiment (positive/neutral/negative)

Format your response as JSON.`,
        },
        {
          role: 'user',
          content: `Transcript:\n\n${transcript.text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // Store summary in database
    const summary = await prisma.meetingSummary.create({
      data: {
        id: 'summary_' + Date.now(),
        meetingId,
        summaryType: 'super_summary',
        overview: result.summary || '',
        keyPoints: result.keyPoints || [],
        actionItems: result.actionItems || [],
        decisions: result.decisions || [],
        customSections: {
          nextSteps: result.nextSteps || [],
          sentiment: result.sentiment || 'neutral',
        },
      },
    });

    logger.info('Super summary generated', { meetingId, summaryId: summary.id });
    return summary as any;
  } catch (error) {
    logger.error('Error generating super summary', { error, meetingId });
    throw error;
  }
}

/**
 * Get super summary for a meeting
 */
export async function getSuperSummary(meetingId: string): Promise<SuperSummary | null> {
  try {
    const summary = await prisma.meetingSummary.findFirst({
      where: { meetingId, summaryType: 'super_summary' },
      orderBy: { createdAt: 'desc' },
    });

    return summary as any;
  } catch (error) {
    logger.error('Error getting super summary', { error, meetingId });
    return null;
  }
}

/**
 * Update super summary
 */
export async function updateSuperSummary(
  summaryId: string,
  data: Partial<SuperSummary>
): Promise<SuperSummary> {
  try {
    const summary = await prisma.meetingSummary.update({
      where: { id: summaryId },
      data: {
        overview: data.summary,
        keyPoints: data.keyPoints as any,
        actionItems: data.actionItems as any,
        decisions: data.decisions as any,
        customSections: {
          nextSteps: (data as any).nextSteps || [],
          sentiment: data.sentiment || 'neutral',
        },
      },
    });

    logger.info('Super summary updated', { summaryId });
    return summary as any;
  } catch (error) {
    logger.error('Error updating super summary', { error, summaryId });
    throw error;
  }
}

export const superSummaryService = {
  generateSuperSummary,
  getSuperSummary,
  updateSuperSummary,
};
