/**
 * AI Coaching Scorecard Service
 *
 * Automated sales call coaching and scoring
 * Competitive Feature: Fathom AI Scorecards + Avoma Coaching
 *
 * Features:
 * - Customizable coaching frameworks
 * - Automatic call scoring (0-100)
 * - Best practice detection
 * - Talk time analysis
 * - Question quality assessment
 * - Objection handling evaluation
 * - Performance trending
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { transcriptService } from './TranscriptService';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export interface CoachingFramework {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  criteria: ScoringCriterion[];
  isActive: boolean;
  createdAt: Date;
}

export interface ScoringCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100, total should be 100
  category: 'discovery' | 'presentation' | 'objection_handling' | 'closing' | 'rapport' | 'custom';
  evaluationPrompt: string;
}

export interface Scorecard {
  id: string;
  meetingId: string;
  frameworkId: string;
  frameworkName: string;
  overallScore: number; // 0-100
  criteriaScores: CriterionScore[];
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  metrics: CallMetrics;
  generatedAt: Date;
}

export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number; // 0-100
  feedback: string;
  examples: string[]; // Quotes from transcript
  weight: number;
}

export interface CallMetrics {
  talkToListenRatio: number;
  questionCount: number;
  openEndedQuestions: number;
  closedQuestions: number;
  interruptionCount: number;
  averageResponseTime: number; // seconds
  longestMonologue: number; // seconds
  engagementScore: number; // 0-100
  sentimentTrend: 'improving' | 'declining' | 'stable';
}

export interface CoachingInsight {
  type: 'strength' | 'improvement' | 'warning' | 'best_practice';
  category: string;
  title: string;
  description: string;
  examples?: string[];
  impact: 'high' | 'medium' | 'low';
}

class CoachingScorecardService {
  /**
   * Generate coaching scorecard for a meeting
   */
  async generateScorecard(
    meetingId: string,
    frameworkId: string,
    userId: string
  ): Promise<Scorecard> {
    try {
      logger.info('Generating coaching scorecard', { meetingId, frameworkId });

      // Fetch framework from organization metadata
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: true,
          organization: true,
        },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const orgMetadata = meeting.organization?.metadata as any;
      const frameworks = orgMetadata?.coachingFrameworks || [];
      const framework = frameworks.find((f: any) => f.id === frameworkId);

      if (!framework) {
        throw new Error('Coaching framework not found');
      }

      // Get transcript
      const transcriptRecord = await prisma.transcript.findFirst({
        where: { meetingId },
        orderBy: { createdAt: 'desc' },
      });

      if (!transcriptRecord || !transcriptRecord.mongodbId) {
        throw new Error('Transcript not found');
      }

      const transcript = await transcriptService.getTranscriptText(transcriptRecord.mongodbId);
      const segments = await transcriptService.getTranscriptSegments(transcriptRecord.mongodbId);

      // Calculate call metrics
      const metrics = await this.calculateCallMetrics(segments);

      // Score each criterion
      const criteriaScores = await this.scoreCriteria(
        framework.criteria as any[],
        transcript,
        segments,
        metrics
      );

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore(criteriaScores);

      // Generate insights
      const insights = await this.generateInsights(
        transcript,
        metrics,
        criteriaScores
      );

      // Create scorecard
      const scorecard: Scorecard = {
        id: `scorecard_${meetingId}_${Date.now()}`,
        meetingId,
        frameworkId,
        frameworkName: framework.name,
        overallScore,
        criteriaScores,
        strengths: insights.filter(i => i.type === 'strength').map(i => i.description),
        improvements: insights.filter(i => i.type === 'improvement').map(i => i.description),
        recommendations: insights.filter(i => i.type === 'best_practice').map(i => i.description),
        metrics,
        generatedAt: new Date(),
      };

      // Store in database using Scorecard model
      await prisma.scorecard.create({
        data: {
          id: scorecard.id,
          organizationId: meeting.organizationId,
          meetingId,
          userId,
          overallScore,
          engagementScore: Math.round(metrics.engagementScore),
          questionCount: metrics.questionCount,
          interruptionCount: metrics.interruptionCount,
          talkRatio: metrics.talkToListenRatio,
          coachingInsights: criteriaScores as any,
          strengths: scorecard.strengths as any,
          improvements: scorecard.improvements as any,
          metadata: {
            frameworkId,
            frameworkName: framework.name,
            recommendations: scorecard.recommendations,
            metrics,
          } as any,
        },
      });

      logger.info('Coaching scorecard generated', {
        scorecardId: scorecard.id,
        overallScore
      });

      return scorecard;
    } catch (error) {
      logger.error('Error generating scorecard', { error, meetingId });
      throw error;
    }
  }

  /**
   * Calculate call metrics from transcript segments
   */
  private async calculateCallMetrics(segments: any[]): Promise<CallMetrics> {
    try {
      // Calculate talk time by speaker
      const speakerTimes: Record<string, number> = {};
      for (const segment of segments) {
        const duration = (segment.endTime || segment.startTime + 3) - segment.startTime;
        speakerTimes[segment.speaker] = (speakerTimes[segment.speaker] || 0) + duration;
      }

      // Identify sales rep (typically first speaker or most talk time)
      const speakers = Object.entries(speakerTimes).sort((a, b) => b[1] - a[1]);
      const repSpeaker = speakers[0]?.[0] || 'Speaker 1';
      const repTime = speakerTimes[repSpeaker] || 0;
      const totalTime = Object.values(speakerTimes).reduce((a, b) => a + b, 0);
      const customerTime = totalTime - repTime;

      const talkToListenRatio = customerTime > 0 ? repTime / customerTime : 0;

      // Count questions
      let questionCount = 0;
      let openEndedQuestions = 0;
      let closedQuestions = 0;

      for (const segment of segments) {
        if (segment.text.includes('?')) {
          questionCount++;

          // Classify question type
          const lowerText = segment.text.toLowerCase();
          if (
            lowerText.match(/\b(how|why|what|tell me about|describe|explain|walk me through)\b/)
          ) {
            openEndedQuestions++;
          } else {
            closedQuestions++;
          }
        }
      }

      // Count interruptions (speaker changes in <1 second)
      let interruptionCount = 0;
      for (let i = 1; i < segments.length; i++) {
        const timeSinceLast = segments[i].startTime - (segments[i - 1].endTime || segments[i - 1].startTime);
        if (timeSinceLast < 1 && segments[i].speaker !== segments[i - 1].speaker) {
          interruptionCount++;
        }
      }

      // Find longest monologue
      let longestMonologue = 0;
      let currentMonologue = 0;
      let lastSpeaker = '';

      for (const segment of segments) {
        const duration = (segment.endTime || segment.startTime + 3) - segment.startTime;
        if (segment.speaker === lastSpeaker) {
          currentMonologue += duration;
        } else {
          longestMonologue = Math.max(longestMonologue, currentMonologue);
          currentMonologue = duration;
          lastSpeaker = segment.speaker;
        }
      }
      longestMonologue = Math.max(longestMonologue, currentMonologue);

      // Calculate average response time
      let responseTimes: number[] = [];
      for (let i = 1; i < segments.length; i++) {
        if (segments[i].speaker !== segments[i - 1].speaker) {
          const responseTime = segments[i].startTime - (segments[i - 1].endTime || segments[i - 1].startTime);
          if (responseTime < 10) { // Ignore long pauses
            responseTimes.push(responseTime);
          }
        }
      }
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore({
        talkToListenRatio,
        questionCount,
        openEndedQuestions,
        interruptionCount,
      });

      // Determine sentiment trend (simplified)
      const sentimentTrend: CallMetrics['sentimentTrend'] = 'stable';

      return {
        talkToListenRatio: Math.round(talkToListenRatio * 100) / 100,
        questionCount,
        openEndedQuestions,
        closedQuestions,
        interruptionCount,
        averageResponseTime: Math.round(averageResponseTime * 10) / 10,
        longestMonologue: Math.round(longestMonologue),
        engagementScore,
        sentimentTrend,
      };
    } catch (error) {
      logger.error('Error calculating call metrics', { error });
      throw error;
    }
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(data: {
    talkToListenRatio: number;
    questionCount: number;
    openEndedQuestions: number;
    interruptionCount: number;
  }): number {
    let score = 100;

    // Ideal talk-to-listen ratio is 0.5-0.8 (rep talks 50-80% of customer)
    if (data.talkToListenRatio < 0.3) {
      score -= 20; // Rep not talking enough
    } else if (data.talkToListenRatio > 1.5) {
      score -= 30; // Rep talking too much
    }

    // Should ask questions (5-15 is good)
    if (data.questionCount < 5) {
      score -= 15;
    } else if (data.questionCount > 20) {
      score -= 10; // Too many questions
    }

    // Open-ended questions are better
    const openEndedRatio = data.questionCount > 0
      ? data.openEndedQuestions / data.questionCount
      : 0;
    if (openEndedRatio < 0.3) {
      score -= 15; // Too many closed questions
    }

    // Interruptions are bad
    score -= Math.min(data.interruptionCount * 3, 20);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score individual criteria using AI
   */
  private async scoreCriteria(
    criteria: ScoringCriterion[],
    transcript: string,
    segments: any[],
    metrics: CallMetrics
  ): Promise<CriterionScore[]> {
    const scores: CriterionScore[] = [];

    for (const criterion of criteria) {
      try {
        const score = await this.scoreSingleCriterion(
          criterion,
          transcript,
          segments,
          metrics
        );
        scores.push(score);
      } catch (error) {
        logger.error('Error scoring criterion', { error, criterionId: criterion.id });
        // Add default score on error
        scores.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          score: 50,
          feedback: 'Scoring failed',
          examples: [],
          weight: criterion.weight,
        });
      }
    }

    return scores;
  }

  /**
   * Score single criterion using GPT-4
   */
  private async scoreSingleCriterion(
    criterion: ScoringCriterion,
    transcript: string,
    segments: any[],
    metrics: CallMetrics
  ): Promise<CriterionScore> {
    try {
      const prompt = `${criterion.evaluationPrompt}

Call Transcript:
${transcript.substring(0, 6000)} // Limit length

Call Metrics:
- Talk-to-listen ratio: ${metrics.talkToListenRatio}
- Questions asked: ${metrics.questionCount} (${metrics.openEndedQuestions} open-ended)
- Interruptions: ${metrics.interruptionCount}

Evaluate this criterion: "${criterion.name}"
${criterion.description}

Provide:
1. Score (0-100)
2. Brief feedback (2-3 sentences)
3. 1-2 specific examples from the transcript (direct quotes)

Return valid JSON:
{
  "score": number,
  "feedback": "string",
  "examples": ["quote1", "quote2"]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a sales coaching expert. Score calls objectively and provide actionable feedback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        score: result.score || 50,
        feedback: result.feedback || 'No feedback generated',
        examples: result.examples || [],
        weight: criterion.weight,
      };
    } catch (error) {
      logger.error('Error scoring single criterion', { error });
      throw error;
    }
  }

  /**
   * Calculate overall score from criteria scores
   */
  private calculateOverallScore(criteriaScores: CriterionScore[]): number {
    const totalWeight = criteriaScores.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = criteriaScores.reduce((sum, c) => sum + (c.score * c.weight), 0);
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Generate coaching insights using AI
   */
  private async generateInsights(
    transcript: string,
    metrics: CallMetrics,
    scores: CriterionScore[]
  ): Promise<CoachingInsight[]> {
    try {
      const prompt = `Analyze this sales call and provide coaching insights.

Call Metrics:
- Talk-to-listen ratio: ${metrics.talkToListenRatio}
- Questions: ${metrics.questionCount} total (${metrics.openEndedQuestions} open-ended)
- Engagement score: ${metrics.engagementScore}

Criterion Scores:
${scores.map(s => `- ${s.criterionName}: ${s.score}/100`).join('\n')}

Transcript (excerpt):
${transcript.substring(0, 4000)}

Provide 5-7 specific coaching insights. For each:
1. Identify if it's a strength, improvement area, or best practice
2. Give actionable feedback
3. Rate impact (high/medium/low)

Return valid JSON array:
[{
  "type": "strength|improvement|best_practice",
  "category": "category name",
  "title": "short title",
  "description": "actionable description",
  "impact": "high|medium|low"
}]`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales coach. Provide specific, actionable coaching insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"insights":[]}');
      return result.insights || [];
    } catch (error) {
      logger.error('Error generating insights', { error });
      return [];
    }
  }

  /**
   * Get pre-built template by type
   */
  getPreBuiltTemplate(
    type: 'sales' | 'support' | 'leadership' | 'recruiting' | 'customer_success'
  ): Omit<CoachingFramework, 'id' | 'organizationId' | 'createdAt'> {
    const templates = {
      sales: {
        name: 'Sales Call Excellence',
        description: 'Comprehensive sales call evaluation framework for B2B sales teams',
        criteria: [
          {
            id: 'discovery',
            name: 'Discovery & Needs Analysis',
            description: 'How well did the rep uncover customer needs and pain points?',
            weight: 25,
            category: 'discovery' as const,
            evaluationPrompt: 'Evaluate the quality of discovery questions, active listening, and needs analysis. Look for open-ended questions, validation of understanding, and depth of exploration.',
          },
          {
            id: 'presentation',
            name: 'Solution Presentation',
            description: 'How effectively was the solution presented and tied to needs?',
            weight: 20,
            category: 'presentation' as const,
            evaluationPrompt: 'Evaluate how well the solution was presented and matched to customer needs. Assess clarity, value proposition articulation, and customization.',
          },
          {
            id: 'objections',
            name: 'Objection Handling',
            description: 'How well were objections addressed?',
            weight: 20,
            category: 'objection_handling' as const,
            evaluationPrompt: 'Evaluate the handling of customer objections and concerns. Look for empathy, addressing root causes, and turning objections into opportunities.',
          },
          {
            id: 'rapport',
            name: 'Rapport Building',
            description: 'How well was rapport and trust established?',
            weight: 15,
            category: 'rapport' as const,
            evaluationPrompt: 'Evaluate rapport building, active listening, and relationship development. Assess authenticity, empathy, and connection.',
          },
          {
            id: 'closing',
            name: 'Next Steps & Closing',
            description: 'Were clear next steps established?',
            weight: 20,
            category: 'closing' as const,
            evaluationPrompt: 'Evaluate how well next steps were defined and commitment secured. Look for clarity, mutual agreement, and timeline definition.',
          },
        ],
        isActive: true,
      },
      support: {
        name: 'Customer Support Quality',
        description: 'Customer support call evaluation for quality assurance and coaching',
        criteria: [
          {
            id: 'problem_understanding',
            name: 'Problem Understanding',
            description: 'How well did the agent understand the customer issue?',
            weight: 25,
            category: 'discovery' as const,
            evaluationPrompt: 'Evaluate how thoroughly the agent understood the customer problem. Look for clarifying questions, active listening, and accurate issue identification.',
          },
          {
            id: 'empathy',
            name: 'Empathy & Communication',
            description: 'How empathetic and clear was the communication?',
            weight: 20,
            category: 'rapport' as const,
            evaluationPrompt: 'Assess empathy shown to customer frustrations, tone of voice, and clarity of communication.',
          },
          {
            id: 'solution_quality',
            name: 'Solution Quality',
            description: 'Was the solution appropriate and effective?',
            weight: 25,
            category: 'presentation' as const,
            evaluationPrompt: 'Evaluate the quality and appropriateness of the solution provided. Consider accuracy, completeness, and customer satisfaction.',
          },
          {
            id: 'efficiency',
            name: 'Efficiency',
            description: 'How efficiently was the issue resolved?',
            weight: 15,
            category: 'custom' as const,
            evaluationPrompt: 'Assess time management, process efficiency, and ability to resolve quickly without sacrificing quality.',
          },
          {
            id: 'follow_up',
            name: 'Follow-up & Documentation',
            description: 'Were follow-up actions clear and documented?',
            weight: 15,
            category: 'closing' as const,
            evaluationPrompt: 'Evaluate clarity of follow-up actions, documentation quality, and setting customer expectations.',
          },
        ],
        isActive: true,
      },
      leadership: {
        name: 'Leadership Meeting Effectiveness',
        description: 'Evaluation framework for leadership and strategic meetings',
        criteria: [
          {
            id: 'agenda_clarity',
            name: 'Agenda & Objectives',
            description: 'Were objectives clear and agenda followed?',
            weight: 20,
            category: 'custom' as const,
            evaluationPrompt: 'Evaluate clarity of meeting objectives, agenda adherence, and time management.',
          },
          {
            id: 'facilitation',
            name: 'Facilitation Skills',
            description: 'How well was the meeting facilitated?',
            weight: 20,
            category: 'custom' as const,
            evaluationPrompt: 'Assess facilitation quality, keeping discussions on track, managing diverse opinions, and ensuring participation.',
          },
          {
            id: 'decision_making',
            name: 'Decision Making',
            description: 'How effective was the decision-making process?',
            weight: 25,
            category: 'custom' as const,
            evaluationPrompt: 'Evaluate decision-making clarity, stakeholder input, data-driven approach, and commitment to decisions.',
          },
          {
            id: 'engagement',
            name: 'Team Engagement',
            description: 'How engaged were team members?',
            weight: 20,
            category: 'rapport' as const,
            evaluationPrompt: 'Assess participation balance, psychological safety, and team engagement levels.',
          },
          {
            id: 'action_items',
            name: 'Action Items & Accountability',
            description: 'Were action items clear with owners and deadlines?',
            weight: 15,
            category: 'closing' as const,
            evaluationPrompt: 'Evaluate clarity of action items, assignment of ownership, and deadline definition.',
          },
        ],
        isActive: true,
      },
      recruiting: {
        name: 'Interview Quality Assessment',
        description: 'Evaluation framework for recruiting and interview effectiveness',
        criteria: [
          {
            id: 'preparation',
            name: 'Interview Preparation',
            description: 'How prepared was the interviewer?',
            weight: 15,
            category: 'custom' as const,
            evaluationPrompt: 'Evaluate interviewer preparation, knowledge of candidate background, and structured approach.',
          },
          {
            id: 'questioning',
            name: 'Question Quality',
            description: 'How effective were the interview questions?',
            weight: 25,
            category: 'discovery' as const,
            evaluationPrompt: 'Assess question quality, depth, behavioral focus, and ability to elicit meaningful responses.',
          },
          {
            id: 'listening',
            name: 'Active Listening',
            description: 'How well did the interviewer listen and probe?',
            weight: 20,
            category: 'rapport' as const,
            evaluationPrompt: 'Evaluate active listening, follow-up questions, and ability to dig deeper into responses.',
          },
          {
            id: 'candidate_experience',
            name: 'Candidate Experience',
            description: 'Was the candidate experience positive?',
            weight: 20,
            category: 'rapport' as const,
            evaluationPrompt: 'Assess professionalism, respect, company culture representation, and candidate engagement.',
          },
          {
            id: 'assessment',
            name: 'Assessment & Next Steps',
            description: 'Was assessment thorough with clear next steps?',
            weight: 20,
            category: 'closing' as const,
            evaluationPrompt: 'Evaluate assessment depth, clarity of next steps, and timeline communication.',
          },
        ],
        isActive: true,
      },
      customer_success: {
        name: 'Customer Success Check-in',
        description: 'Evaluation framework for customer success and account management',
        criteria: [
          {
            id: 'relationship',
            name: 'Relationship Building',
            description: 'How strong is the customer relationship?',
            weight: 20,
            category: 'rapport' as const,
            evaluationPrompt: 'Evaluate rapport, trust-building, and depth of relationship. Assess authenticity and customer engagement.',
          },
          {
            id: 'value_realization',
            name: 'Value Realization',
            description: 'Is the customer realizing value?',
            weight: 25,
            category: 'discovery' as const,
            evaluationPrompt: 'Assess discussion of ROI, value metrics, and customer success indicators. Evaluate understanding of customer outcomes.',
          },
          {
            id: 'proactive_support',
            name: 'Proactive Support',
            description: 'How proactive was the support provided?',
            weight: 20,
            category: 'presentation' as const,
            evaluationPrompt: 'Evaluate proactive identification of opportunities, risks, and solutions. Assess future-focused discussion.',
          },
          {
            id: 'expansion_opportunity',
            name: 'Expansion Opportunities',
            description: 'Were expansion opportunities explored?',
            weight: 20,
            category: 'custom' as const,
            evaluationPrompt: 'Assess identification and discussion of upsell, cross-sell, or expansion opportunities.',
          },
          {
            id: 'action_planning',
            name: 'Action Planning',
            description: 'Were clear action plans established?',
            weight: 15,
            category: 'closing' as const,
            evaluationPrompt: 'Evaluate clarity of action items, mutual commitment, and success plan development.',
          },
        ],
        isActive: true,
      },
    };

    return templates[type];
  }

  /**
   * Create framework from pre-built template
   */
  async createFromTemplate(
    organizationId: string,
    templateType: 'sales' | 'support' | 'leadership' | 'recruiting' | 'customer_success'
  ): Promise<CoachingFramework> {
    try {
      const template = this.getPreBuiltTemplate(templateType);

      const framework: CoachingFramework = {
        id: `framework_${Date.now()}_${templateType}`,
        organizationId,
        ...template,
        createdAt: new Date(),
      };

      // Store in organization metadata
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = org?.metadata as any || {};
      const frameworks = orgMetadata.coachingFrameworks || [];
      frameworks.push(framework);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          metadata: {
            ...orgMetadata,
            coachingFrameworks: frameworks,
          } as any,
        },
      });

      logger.info('Created framework from template', { frameworkId: framework.id, templateType });
      return framework;
    } catch (error) {
      logger.error('Error creating framework from template', { error, templateType });
      throw error;
    }
  }

  /**
   * Create custom coaching framework
   */
  async createCustomFramework(
    organizationId: string,
    name: string,
    description: string,
    criteria: Omit<ScoringCriterion, 'id'>[]
  ): Promise<CoachingFramework> {
    try {
      // Validate that weights sum to 100
      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 100) > 1) {
        throw new Error(`Criteria weights must sum to 100, got ${totalWeight}`);
      }

      const framework: CoachingFramework = {
        id: `framework_custom_${Date.now()}`,
        organizationId,
        name,
        description,
        criteria: criteria.map((c, index) => ({
          ...c,
          id: `criterion_${index}_${Date.now()}`,
        })),
        isActive: true,
        createdAt: new Date(),
      };

      // Store in organization metadata
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = org?.metadata as any || {};
      const frameworks = orgMetadata.coachingFrameworks || [];
      frameworks.push(framework);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          metadata: {
            ...orgMetadata,
            coachingFrameworks: frameworks,
          } as any,
        },
      });

      logger.info('Created custom framework', { frameworkId: framework.id, name });
      return framework;
    } catch (error) {
      logger.error('Error creating custom framework', { error });
      throw error;
    }
  }

  /**
   * List all frameworks for organization
   */
  async listFrameworks(organizationId: string): Promise<CoachingFramework[]> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = org?.metadata as any || {};
      return orgMetadata.coachingFrameworks || [];
    } catch (error) {
      logger.error('Error listing frameworks', { error });
      return [];
    }
  }

  /**
   * Update framework
   */
  async updateFramework(
    organizationId: string,
    frameworkId: string,
    updates: Partial<Pick<CoachingFramework, 'name' | 'description' | 'criteria' | 'isActive'>>
  ): Promise<CoachingFramework> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = org?.metadata as any || {};
      const frameworks = orgMetadata.coachingFrameworks || [];
      const index = frameworks.findIndex((f: any) => f.id === frameworkId);

      if (index === -1) {
        throw new Error('Framework not found');
      }

      frameworks[index] = {
        ...frameworks[index],
        ...updates,
      };

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          metadata: {
            ...orgMetadata,
            coachingFrameworks: frameworks,
          } as any,
        },
      });

      return frameworks[index];
    } catch (error) {
      logger.error('Error updating framework', { error });
      throw error;
    }
  }

  /**
   * Delete framework
   */
  async deleteFramework(organizationId: string, frameworkId: string): Promise<void> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = org?.metadata as any || {};
      const frameworks = orgMetadata.coachingFrameworks || [];
      const filtered = frameworks.filter((f: any) => f.id !== frameworkId);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          metadata: {
            ...orgMetadata,
            coachingFrameworks: filtered,
          } as any,
        },
      });

      logger.info('Deleted framework', { frameworkId });
    } catch (error) {
      logger.error('Error deleting framework', { error });
      throw error;
    }
  }

  /**
   * Real-time scoring during live meeting
   */
  async scoreLiveSession(
    liveSessionId: string,
    frameworkId: string,
    currentTranscript: string,
    currentSegments: any[]
  ): Promise<{
    preliminaryScore: number;
    insights: CoachingInsight[];
    metrics: CallMetrics;
  }> {
    try {
      logger.info('Scoring live session', { liveSessionId, frameworkId });

      // Get live session
      const session = await prisma.liveSession.findUnique({
        where: { id: liveSessionId },
        include: {
          meeting: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!session) {
        throw new Error('Live session not found');
      }

      // Get framework
      const orgMetadata = session.meeting.organization?.metadata as any;
      const frameworks = orgMetadata?.coachingFrameworks || [];
      const framework = frameworks.find((f: any) => f.id === frameworkId);

      if (!framework) {
        throw new Error('Framework not found');
      }

      // Calculate current metrics
      const metrics = await this.calculateCallMetrics(currentSegments);

      // Score a subset of criteria for real-time feedback (to save API costs)
      const priorityCriteria = framework.criteria.slice(0, 3);
      const criteriaScores = await this.scoreCriteria(
        priorityCriteria,
        currentTranscript,
        currentSegments,
        metrics
      );

      // Calculate preliminary score
      const preliminaryScore = this.calculateOverallScore(criteriaScores);

      // Generate quick insights
      const insights = await this.generateInsights(
        currentTranscript,
        metrics,
        criteriaScores
      );

      return {
        preliminaryScore,
        insights,
        metrics,
      };
    } catch (error) {
      logger.error('Error scoring live session', { error });
      throw error;
    }
  }

  /**
   * Create default coaching framework (legacy - use createFromTemplate instead)
   */
  async createDefaultFramework(organizationId: string): Promise<CoachingFramework> {
    return this.createFromTemplate(organizationId, 'sales');
  }

  /**
   * Get scorecard for meeting
   */
  async getScorecard(meetingId: string): Promise<Scorecard | null> {
    try {
      const scorecard = await prisma.scorecard.findFirst({
        where: { meetingId },
        orderBy: { createdAt: 'desc' },
      });

      if (!scorecard) {
        return null;
      }

      const metadata = scorecard.metadata as any;

      return {
        id: scorecard.id,
        meetingId: scorecard.meetingId,
        frameworkId: metadata?.frameworkId || '',
        frameworkName: metadata?.frameworkName || '',
        overallScore: scorecard.overallScore || 0,
        criteriaScores: scorecard.coachingInsights as any,
        strengths: scorecard.strengths as string[],
        improvements: scorecard.improvements as string[],
        recommendations: metadata?.recommendations || [],
        metrics: metadata?.metrics || {},
        generatedAt: scorecard.createdAt,
      };
    } catch (error) {
      logger.error('Error getting scorecard', { error });
      return null;
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    userId: string,
    days: number = 30
  ): Promise<{
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    scorecards: Array<{ date: Date; score: number; meetingId: string }>;
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const scorecards = await prisma.scorecard.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (scorecards.length === 0) {
        return {
          averageScore: 0,
          trend: 'stable',
          scorecards: [],
        };
      }

      const averageScore = scorecards.reduce((sum, s) => sum + (s.overallScore || 0), 0) / scorecards.length;

      // Determine trend (compare first half to second half)
      const midpoint = Math.floor(scorecards.length / 2);
      const firstHalfAvg = scorecards.slice(0, midpoint).reduce((sum, s) => sum + (s.overallScore || 0), 0) / midpoint;
      const secondHalfAvg = scorecards.slice(midpoint).reduce((sum, s) => sum + (s.overallScore || 0), 0) / (scorecards.length - midpoint);

      let trend: 'improving' | 'declining' | 'stable';
      if (secondHalfAvg > firstHalfAvg + 5) {
        trend = 'improving';
      } else if (secondHalfAvg < firstHalfAvg - 5) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }

      return {
        averageScore: Math.round(averageScore),
        trend,
        scorecards: scorecards.map(s => ({
          date: s.createdAt,
          score: s.overallScore || 0,
          meetingId: s.meetingId,
        })),
      };
    } catch (error) {
      logger.error('Error getting performance trends', { error });
      throw error;
    }
  }
}

export const coachingScorecardService = new CoachingScorecardService();
