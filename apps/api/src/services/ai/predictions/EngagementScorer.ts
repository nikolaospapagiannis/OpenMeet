/**
 * Engagement Scorer
 *
 * Scores employee engagement from 1-on-1 meetings and team interactions:
 * - Participation level and quality
 * - Concerns and issues raised
 * - Career development discussions
 * - Sentiment analysis
 * - Manager relationship indicators
 * - Team collaboration metrics
 *
 * Uses OpenAI GPT-4 for real engagement analysis
 */

import { PrismaClient } from '@prisma/client';
import {
  BasePredictionService,
  FeatureVector,
} from '../PredictiveInsightsService';
import { HRDataService, createHRDataService } from './HRDataService';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'engagement-scorer' },
  transports: [new winston.transports.Console()],
});

export interface EngagementScore {
  overallScore: number; // 0-100
  engagementLevel: 'disengaged' | 'at-risk' | 'engaged' | 'highly-engaged';
  dimensions: EngagementDimension[];
  trend: 'declining' | 'stable' | 'improving';
  trendConfidence: number; // 0-100
  managerRecommendations: ManagerAction[];
  retentionRisk: number; // 0-100
}

export interface EngagementDimension {
  dimension: string;
  score: number; // 0-100
  trend: 'declining' | 'stable' | 'improving';
  indicators: string[];
  concerns: string[];
}

export interface ManagerAction {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'recognition' | 'development' | 'support' | 'feedback' | 'intervention';
  rationale: string;
  suggestedTimeline: string;
}

interface EngagementFeatures extends FeatureVector {
  participationRate: number;
  avgSentiment: number;
  sentimentTrend: number;
  concernsRaised: number;
  careerDiscussions: number;
  oneOnOneCadence: number;
  teamCollaboration: number;
  initiativeVolume: number;
  feedbackReceptiveness: number;
  workLifeBalance: number;
  recognitionMentions: number;
  frustrationIndicators: number;
  totalOneOnOnes: number;
  averageOneOnOneDuration: number;
  employeeTenure: number;
}

/**
 * Engagement Scorer Service
 */
export class EngagementScorer extends BasePredictionService<EngagementScore> {
  private hrDataService: HRDataService;

  constructor(prisma: PrismaClient) {
    super(prisma, 'engagement-scorer-v1');
    this.hrDataService = createHRDataService(prisma);
  }

  /**
   * Extract features from employee 1-on-1 meetings
   */
  protected async extractFeatures(employeeData: {
    employeeId: string;
    organizationId: string;
  }): Promise<EngagementFeatures> {
    const { employeeId, organizationId } = employeeData;

    logger.info('Extracting engagement features', { employeeId });

    // Get employee data from HR service
    const employee = await this.hrDataService.getEmployee(employeeId, organizationId);
    const engagement = await this.hrDataService.getEmployeeEngagement(employeeId, organizationId, 90);

    // Query 1-on-1 meetings (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const meetings = await this.prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: ninetyDaysAgo },
        AND: [
          {
            OR: [
              { title: { contains: '1:1', mode: 'insensitive' } },
              { title: { contains: 'one on one', mode: 'insensitive' } },
              { participants: { some: {} }, AND: { participants: { none: {} } } }, // Exactly 2 participants
            ],
          },
          {
            participants: {
              some: {
                OR: [
                  { userId: employeeId },
                  { email: employee?.email || employeeId },
                ],
              },
            },
          },
        ],
      },
      include: {
        transcripts: true,
        participants: true,
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: 12, // ~3 months of weekly 1-on-1s
    });

    // Helper to get transcript data from meeting (content/sentiment from metadata JSON)
    const getTranscriptData = (meeting: typeof meetings[number]) => {
      const transcript = meeting.transcripts?.[0];
      if (!transcript) return { sentiment: 0, content: '' };
      const metadata = transcript.metadata as { sentiment?: number; content?: string } | null;
      return {
        sentiment: metadata?.sentiment ?? 0,
        content: metadata?.content ?? '',
      };
    };

    // Calculate participation rate from engagement data or meeting participation
    const participationRate = engagement
      ? engagement.meetingParticipation / 100
      : meetings.length > 0
        ? meetings.filter(m => {
            // Check if employee actually participated (has talk time or transcript content)
            const participant = m.participants.find(p =>
              p.userId === employeeId || p.email === employee?.email
            );
            return participant && (participant.talkTimeSeconds > 0 || getTranscriptData(m).content.length > 100);
          }).length / meetings.length
        : 0;

    // Calculate sentiment metrics
    const sentiments = meetings
      .map(m => getTranscriptData(m).sentiment)
      .filter(s => s !== 0);

    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

    // Calculate sentiment trend
    const recentSentiments = sentiments.slice(0, 4);
    const olderSentiments = sentiments.slice(4, 8);

    const sentimentTrend = recentSentiments.length > 0 && olderSentiments.length > 0
      ? (recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length) -
        (olderSentiments.reduce((a, b) => a + b, 0) / olderSentiments.length)
      : 0;

    // Count concerns raised
    const concernKeywords = [
      'concern', 'worried', 'issue', 'problem', 'challenge',
      'difficult', 'struggling', 'overwhelmed', 'stressed'
    ];

    const concernsRaised = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + concernKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count career development discussions
    const careerKeywords = [
      'career', 'growth', 'development', 'promotion', 'learn',
      'training', 'skills', 'opportunities', 'advancement'
    ];

    const careerDiscussions = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + careerKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Calculate 1-on-1 cadence (meetings per month)
    const oneOnOneCadence = meetings.length / 3; // 3 months

    // Team collaboration indicators
    const collaborationKeywords = [
      'team', 'collaborate', 'together', 'help', 'support',
      'working with', 'partnered', 'group'
    ];

    const teamCollaboration = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + collaborationKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Initiative volume (proactive suggestions)
    const initiativeKeywords = [
      'suggest', 'propose', 'idea', 'could we', 'what if',
      'recommend', 'think we should'
    ];

    const initiativeVolume = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + initiativeKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Feedback receptiveness
    const feedbackKeywords = [
      'feedback', 'appreciate', 'understand', 'makes sense',
      'good point', 'thank you', 'helpful'
    ];

    const feedbackReceptiveness = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + feedbackKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Work-life balance mentions
    const balanceKeywords = [
      'balance', 'workload', 'hours', 'time off', 'vacation',
      'burnout', 'tired', 'exhausted', 'weekend'
    ];

    const workLifeBalance = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + balanceKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Recognition mentions
    const recognitionKeywords = [
      'thank', 'appreciate', 'great job', 'well done', 'excellent',
      'proud', 'recognition', 'accomplished'
    ];

    const recognitionMentions = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + recognitionKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Frustration indicators
    const frustrationKeywords = [
      'frustrat', 'annoying', 'waste', 'inefficient', 'stuck',
      'blocked', 'disappointed', 'unclear'
    ];

    const frustrationIndicators = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + frustrationKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Calculate average 1-on-1 duration
    const averageOneOnOneDuration = meetings.length > 0
      ? meetings.reduce((sum, m) => {
          // Use duration field (in seconds) or calculate from actual times, default to 30 min
          const duration = m.duration
            ? m.duration / 60
            : (m.actualEndAt && m.actualStartAt)
              ? (m.actualEndAt.getTime() - m.actualStartAt.getTime()) / (1000 * 60)
              : 30;
          return sum + duration;
        }, 0) / meetings.length
      : 30;

    // Get real employee tenure from HR system
    const employeeTenure = employee?.tenure || 365; // days

    return {
      participationRate,
      avgSentiment,
      sentimentTrend,
      concernsRaised,
      careerDiscussions,
      oneOnOneCadence,
      teamCollaboration,
      initiativeVolume,
      feedbackReceptiveness,
      workLifeBalance,
      recognitionMentions,
      frustrationIndicators,
      totalOneOnOnes: meetings.length,
      averageOneOnOneDuration,
      employeeTenure,
    };
  }

  /**
   * Make prediction using GPT-4
   */
  protected async makePrediction(
    features: EngagementFeatures
  ): Promise<EngagementScore> {
    logger.info('Scoring employee engagement with AI');

    const systemPrompt = `You are an organizational psychologist and HR expert specializing in employee engagement analysis. Analyze 1-on-1 meeting data to assess employee engagement levels.

Consider these key indicators:
- Positive sentiment and improving trends signal high engagement
- Career discussions indicate growth mindset and future orientation
- Initiative and collaboration show active participation
- Concerns and frustrations need attention but aren't always negative
- Work-life balance mentions may signal burnout risk
- Recognition received correlates with motivation

Provide comprehensive engagement assessment across multiple dimensions with specific, actionable recommendations for managers.`;

    const userPrompt = `Analyze these employee engagement metrics:

${this.formatFeaturesForAI(features)}

Provide your assessment in this exact JSON format:
{
  "overallScore": <number 0-100>,
  "engagementLevel": "<disengaged|at-risk|engaged|highly-engaged>",
  "dimensions": [
    {
      "dimension": "<dimension name>",
      "score": <number 0-100>,
      "trend": "<declining|stable|improving>",
      "indicators": ["<indicator 1>", "<indicator 2>"],
      "concerns": ["<concern 1>", "<concern 2>"]
    }
  ],
  "trend": "<declining|stable|improving>",
  "trendConfidence": <number 0-100>,
  "managerRecommendations": [
    {
      "action": "<action description>",
      "priority": "<low|medium|high|urgent>",
      "category": "<recognition|development|support|feedback|intervention>",
      "rationale": "<why this matters>",
      "suggestedTimeline": "<when to act>"
    }
  ],
  "retentionRisk": <number 0-100>
}`;

    const schema = `{
  "overallScore": "number (0-100)",
  "engagementLevel": "string (disengaged|at-risk|engaged|highly-engaged)",
  "dimensions": "array of dimension objects",
  "trend": "string (declining|stable|improving)",
  "trendConfidence": "number (0-100)",
  "managerRecommendations": "array of recommendation objects",
  "retentionRisk": "number (0-100)"
}`;

    const prediction = await this.callAIStructured<EngagementScore>(
      systemPrompt,
      userPrompt,
      schema
    );

    logger.info('Engagement scoring complete', {
      overallScore: prediction.overallScore,
      engagementLevel: prediction.engagementLevel,
    });

    return prediction;
  }

  /**
   * Generate human-readable explanation
   */
  protected async generateExplanation(
    prediction: EngagementScore,
    features: EngagementFeatures
  ): Promise<string> {
    const systemPrompt = `You are a people manager explaining employee engagement assessments to leadership. Provide clear, balanced explanations that highlight both strengths and areas for attention.`;

    const userPrompt = `Explain this engagement assessment in 2-3 sentences:

Engagement Level: ${prediction.engagementLevel}
Overall Score: ${prediction.overallScore}/100
Trend: ${prediction.trend}
Retention Risk: ${prediction.retentionRisk}%

Key Metrics:
- Average Sentiment: ${features.avgSentiment.toFixed(2)}
- Career Discussions: ${features.careerDiscussions}
- Participation Rate: ${(features.participationRate * 100).toFixed(1)}%
- Initiative Volume: ${features.initiativeVolume}
- Concerns Raised: ${features.concernsRaised}

Write a concise explanation that managers can act on.`;

    const explanation = await this.ai.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 300,
    });

    return explanation.trim();
  }

  /**
   * Generate manager recommendations
   */
  protected async generateRecommendations(
    prediction: EngagementScore,
    features: EngagementFeatures
  ): Promise<string[]> {
    // Extract high-priority actions from manager recommendations
    return prediction.managerRecommendations
      .filter(rec => rec.priority === 'high' || rec.priority === 'urgent')
      .slice(0, 5)
      .map(rec => `${rec.action} (${rec.category}, ${rec.suggestedTimeline})`);
  }
}

/**
 * Factory function to create EngagementScorer
 */
export function createEngagementScorer(prisma: PrismaClient): EngagementScorer {
  return new EngagementScorer(prisma);
}
