/**
 * Deal Risk Predictor
 *
 * Predicts deal risk BEFORE sales notices using AI analysis of:
 * - Sentiment trends across meetings
 * - Customer engagement patterns
 * - Response time metrics
 * - Competitor mentions
 * - Decision-maker involvement
 *
 * Uses OpenAI GPT-4 for real prediction analysis with structured outputs
 */

import { PrismaClient } from '@prisma/client';
import {
  BasePredictionService,
  FeatureVector,
} from '../PredictiveInsightsService';
import { CRMDataService, createCRMDataService } from './CRMDataService';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'deal-risk-predictor' },
  transports: [new winston.transports.Console()],
});

export interface DealRiskPrediction {
  riskScore: number; // 0-100, higher = more at risk
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  timeToChurn: number | null; // days, null if not at risk
  confidenceLevel: number; // 0-100
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  impact: number; // 0-100
  description: string;
}

interface DealRiskFeatures extends FeatureVector {
  avgSentiment: number;
  sentimentTrend: number;
  engagementRate: number;
  responseTimeAvg: number;
  competitorMentions: number;
  decisionMakerParticipation: number;
  meetingFrequency: number;
  dealStageProgress: number;
  lastContactDays: number;
  escalationCount: number;
  totalMeetings: number;
  dealValue: number;
}

/**
 * Deal Risk Predictor Service
 */
export class DealRiskPredictor extends BasePredictionService<DealRiskPrediction> {
  private crmDataService: CRMDataService;

  constructor(prisma: PrismaClient) {
    super(prisma, 'deal-risk-v1');
    this.crmDataService = createCRMDataService(prisma);
  }

  /**
   * Extract features from deal data and associated meetings
   */
  protected async extractFeatures(dealData: {
    dealId: string;
    organizationId: string;
  }): Promise<DealRiskFeatures> {
    const { dealId, organizationId } = dealData;

    logger.info('Extracting deal risk features', { dealId });

    // Get real deal data from CRM
    const deal = await this.crmDataService.getDeal(dealId, organizationId);

    // Query all meetings related to this deal (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const meetings = await this.prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: ninetyDaysAgo },
        OR: [
          {
            dealMeetings: {
              some: {
                dealId,
              },
            },
          },
          // Also include meetings with deal contact
          ...(deal?.contactEmail
            ? [{
                participants: {
                  some: {
                    email: deal.contactEmail,
                  },
                },
              }]
            : []),
        ],
      },
      include: {
        transcripts: true,
        participants: true,
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: 20,
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

    // Calculate sentiment metrics
    const sentiments = meetings
      .map(m => getTranscriptData(m).sentiment)
      .filter(s => s !== 0);

    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

    // Calculate sentiment trend (recent vs older)
    const recentSentiments = sentiments.slice(0, 5);
    const olderSentiments = sentiments.slice(5, 10);

    const sentimentTrend = recentSentiments.length > 0 && olderSentiments.length > 0
      ? (recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length) -
        (olderSentiments.reduce((a, b) => a + b, 0) / olderSentiments.length)
      : 0;

    // Calculate engagement rate (participation in scheduled meetings)
    const engagementRate = meetings.length > 0
      ? meetings.filter(m => m.participants.length > 0).length / meetings.length
      : 0;

    // Calculate average response time (days between meetings)
    const responseTimeAvg = meetings.length > 1
      ? meetings.slice(0, -1).reduce((sum, meeting, i) => {
          const nextMeeting = meetings[i + 1];
          const meetingDate = meeting.scheduledStartAt || meeting.createdAt;
          const nextMeetingDate = nextMeeting.scheduledStartAt || nextMeeting.createdAt;
          const daysDiff = Math.abs(
            (meetingDate.getTime() - nextMeetingDate.getTime()) /
            (1000 * 60 * 60 * 24)
          );
          return sum + daysDiff;
        }, 0) / (meetings.length - 1)
      : 7;

    // Count competitor mentions in transcripts
    const competitorKeywords = ['competitor', 'alternative', 'other vendor', 'switching'];
    const competitorMentions = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + competitorKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Calculate decision maker participation
    const decisionMakerParticipation = meetings.length > 0
      ? meetings.filter(m =>
          m.participants.some(p => p.role?.includes('director') || p.role?.includes('vp'))
        ).length / meetings.length
      : 0;

    // Meeting frequency (meetings per week)
    const meetingFrequency = meetings.length > 0
      ? (meetings.length / 13) // 90 days ≈ 13 weeks
      : 0;

    // Days since last contact
    const lastContactDays = meetings.length > 0
      ? Math.floor(
          (Date.now() - (meetings[0].scheduledStartAt || meetings[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 90;

    // Count escalations (negative sentiment spikes)
    const escalationCount = sentiments.filter(s => s < -0.5).length;

    // Get real deal stage progress from CRM data
    const stageProgressMap: { [key: string]: number } = {
      'prospecting': 0.1,
      'qualification': 0.25,
      'proposal': 0.5,
      'negotiation': 0.75,
      'closed_won': 1.0,
      'closed_lost': 0,
    };
    const dealStageProgress = deal ? (stageProgressMap[deal.stage] || 0.5) : 0.5;

    // Get real deal value from CRM
    const dealValue = deal?.amount || 50000;

    return {
      avgSentiment,
      sentimentTrend,
      engagementRate,
      responseTimeAvg,
      competitorMentions,
      decisionMakerParticipation,
      meetingFrequency,
      dealStageProgress,
      lastContactDays,
      escalationCount,
      totalMeetings: meetings.length,
      dealValue,
    };
  }

  /**
   * Make prediction using GPT-4 with structured output
   */
  protected async makePrediction(
    features: DealRiskFeatures
  ): Promise<DealRiskPrediction> {
    logger.info('Making deal risk prediction with AI');

    const systemPrompt = `You are a B2B sales risk prediction expert. Analyze the following deal metrics and predict the likelihood of deal risk or churn.

Your analysis should consider:
- Sentiment trends (negative trends indicate risk)
- Engagement patterns (declining engagement is a red flag)
- Response time (increasing delays indicate disengagement)
- Competitor activity (mentions suggest alternatives being considered)
- Decision maker involvement (lack of senior participation is concerning)

Provide a comprehensive risk assessment with specific, actionable factors.`;

    const userPrompt = `Analyze these deal metrics and predict risk:

${this.formatFeaturesForAI(features)}

Provide your prediction in this exact JSON format:
{
  "riskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "riskFactors": [
    {
      "factor": "<factor name>",
      "severity": "<low|medium|high>",
      "impact": <number 0-100>,
      "description": "<detailed description>"
    }
  ],
  "timeToChurn": <days or null>,
  "confidenceLevel": <number 0-100>
}`;

    const schema = `{
  "riskScore": "number (0-100)",
  "riskLevel": "string (low|medium|high|critical)",
  "riskFactors": "array of risk factor objects",
  "timeToChurn": "number or null",
  "confidenceLevel": "number (0-100)"
}`;

    const prediction = await this.callAIStructured<DealRiskPrediction>(
      systemPrompt,
      userPrompt,
      schema
    );

    logger.info('Deal risk prediction complete', {
      riskScore: prediction.riskScore,
      riskLevel: prediction.riskLevel,
    });

    return prediction;
  }

  /**
   * Generate human-readable explanation
   */
  protected async generateExplanation(
    prediction: DealRiskPrediction,
    features: DealRiskFeatures
  ): Promise<string> {
    const systemPrompt = `You are a B2B sales analyst explaining deal risk predictions to account executives. Provide clear, actionable explanations.`;

    const userPrompt = `Explain this deal risk prediction in 2-3 sentences:

Risk Level: ${prediction.riskLevel}
Risk Score: ${prediction.riskScore}/100
Key Metrics:
- Average Sentiment: ${features.avgSentiment.toFixed(2)}
- Sentiment Trend: ${features.sentimentTrend.toFixed(2)}
- Engagement Rate: ${(features.engagementRate * 100).toFixed(1)}%
- Days Since Last Contact: ${features.lastContactDays}
- Competitor Mentions: ${features.competitorMentions}

Write a concise explanation focusing on the most critical factors.`;

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
   * Generate actionable recommendations
   */
  protected async generateRecommendations(
    prediction: DealRiskPrediction,
    features: DealRiskFeatures
  ): Promise<string[]> {
    const systemPrompt = `You are a B2B sales coach providing specific, actionable recommendations to save at-risk deals. Each recommendation should be concrete and immediately actionable.`;

    const userPrompt = `Generate 3-5 specific action items for this at-risk deal:

Risk Level: ${prediction.riskLevel}
Risk Factors:
${prediction.riskFactors.map(f => `- ${f.factor}: ${f.description}`).join('\n')}

Key Metrics:
- Engagement Rate: ${(features.engagementRate * 100).toFixed(1)}%
- Days Since Last Contact: ${features.lastContactDays}
- Decision Maker Participation: ${(features.decisionMakerParticipation * 100).toFixed(1)}%
- Competitor Mentions: ${features.competitorMentions}

Provide recommendations as a JSON array of strings:
["action 1", "action 2", "action 3"]`;

    const response = await this.ai.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 500,
    });

    try {
      const recommendations = this.parseJSONResponse<string[]>(response);
      return recommendations;
    } catch {
      // Fallback: split by lines
      return response
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
    }
  }
}

/**
 * Factory function to create DealRiskPredictor
 */
export function createDealRiskPredictor(prisma: PrismaClient): DealRiskPredictor {
  return new DealRiskPredictor(prisma);
}
