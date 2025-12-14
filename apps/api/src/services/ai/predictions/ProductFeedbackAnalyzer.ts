/**
 * Product Feedback Analyzer
 *
 * Analyzes product feedback sentiment trends from customer meetings:
 * - Feature requests and prioritization
 * - Bug reports and severity
 * - User satisfaction by feature
 * - Competitive intelligence
 * - Usage patterns and adoption
 * - Friction points and pain analysis
 *
 * Uses OpenAI GPT-4 for real feedback analysis and insights
 */

import { PrismaClient } from '@prisma/client';
import {
  BasePredictionService,
  FeatureVector,
} from '../PredictiveInsightsService';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'product-feedback-analyzer' },
  transports: [new winston.transports.Console()],
});

export interface ProductFeedbackAnalysis {
  overallSentiment: number; // -1 to 1
  sentimentTrend: 'declining' | 'stable' | 'improving';
  featurePriorities: FeaturePriority[];
  bugSeverity: BugSeverity;
  competitiveInsights: CompetitiveInsight[];
  adoptionMetrics: AdoptionMetrics;
  actionableInsights: ProductInsight[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface FeaturePriority {
  feature: string;
  requestCount: number;
  sentiment: number; // -1 to 1
  urgency: 'low' | 'medium' | 'high' | 'critical';
  impactEstimate: number; // 0-100
  requestingCustomers: number;
  revenue: number;
  description: string;
}

export interface BugSeverity {
  critical: number;
  high: number;
  medium: number;
  low: number;
  totalReports: number;
  topBugs: BugReport[];
}

export interface BugReport {
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  frequency: number;
  affectedCustomers: number;
  businessImpact: string;
}

export interface CompetitiveInsight {
  competitor: string;
  mentions: number;
  context: 'positive' | 'neutral' | 'negative' | 'threat';
  specificFeatures: string[];
  risk: number; // 0-100
}

export interface AdoptionMetrics {
  featureAdoption: { [feature: string]: number };
  usageGrowth: number; // percentage
  powerUsers: number;
  casualUsers: number;
  dormantFeatures: string[];
}

export interface ProductInsight {
  insight: string;
  category: 'feature' | 'bug' | 'ux' | 'performance' | 'competitive' | 'adoption';
  priority: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  recommendedAction: string;
  estimatedImpact: number; // 0-100
}

interface ProductFeedbackFeatures extends FeatureVector {
  totalFeedbackItems: number;
  avgSentiment: number;
  sentimentChange: number;
  featureRequestCount: number;
  bugReportCount: number;
  praiseCount: number;
  complaintCount: number;
  competitorMentions: number;
  usabilityIssues: number;
  performanceComplaints: number;
  integrationRequests: number;
  documentationGaps: number;
  trainingNeeds: number;
  adoptionBlocks: number;
  powerUserFeedback: number;
}

/**
 * Product Feedback Analyzer Service
 */
export class ProductFeedbackAnalyzer extends BasePredictionService<ProductFeedbackAnalysis> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'product-feedback-analyzer-v1');
  }

  /**
   * Extract features from product feedback in meetings
   */
  protected async extractFeatures(productData: {
    productId?: string;
    organizationId: string;
    timeframe?: number; // days
  }): Promise<ProductFeedbackFeatures> {
    const { organizationId, timeframe = 90 } = productData;

    logger.info('Extracting product feedback features', { timeframe });

    // Query meetings with product feedback (last N days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);

    const meetings = await this.prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: startDate },
        OR: [
          // Filter by product-related tags
          { tags: { hasSome: ['product', 'feedback', 'feature-request', 'bug', 'product-feedback'] } },
          // Also include meetings with product-related titles
          { title: { contains: 'product', mode: 'insensitive' } },
          { title: { contains: 'feedback', mode: 'insensitive' } },
          { title: { contains: 'feature', mode: 'insensitive' } },
          { title: { contains: 'roadmap', mode: 'insensitive' } },
        ],
      },
      include: {
        transcripts: true,
        participants: true,
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: 100,
    });

    // Helper to get first transcript from meeting (transcript content/sentiment from metadata JSON)
    const getTranscriptData = (meeting: typeof meetings[number]) => {
      const transcript = meeting.transcripts?.[0];
      if (!transcript) return { sentiment: 0, content: '' };
      // Metadata may contain sentiment and content for in-memory processing
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

    // Calculate sentiment change (recent vs older)
    const recentSentiments = sentiments.slice(0, Math.floor(sentiments.length / 2));
    const olderSentiments = sentiments.slice(Math.floor(sentiments.length / 2));

    const sentimentChange = recentSentiments.length > 0 && olderSentiments.length > 0
      ? (recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length) -
        (olderSentiments.reduce((a, b) => a + b, 0) / olderSentiments.length)
      : 0;

    // Count feature requests
    const featureKeywords = [
      'feature', 'request', 'would like', 'need', 'wish',
      'enhancement', 'improve', 'add', 'support for'
    ];

    const featureRequestCount = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + featureKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count bug reports
    const bugKeywords = [
      'bug', 'error', 'broken', 'not working', 'issue',
      'problem', 'crash', 'fail', 'incorrect'
    ];

    const bugReportCount = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + bugKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count praise
    const praiseKeywords = [
      'love', 'great', 'excellent', 'perfect', 'amazing',
      'helpful', 'useful', 'easy', 'intuitive', 'fast'
    ];

    const praiseCount = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + praiseKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count complaints
    const complaintKeywords = [
      'difficult', 'confusing', 'slow', 'frustrated', 'complicated',
      'annoying', 'hard to', 'takes too long', 'cumbersome'
    ];

    const complaintCount = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + complaintKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count competitor mentions
    const competitorKeywords = [
      'competitor', 'alternative', 'other tool', 'vs',
      'compared to', 'similar to', 'competitor offers'
    ];

    const competitorMentions = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + competitorKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count usability issues
    const usabilityKeywords = [
      'usability', 'ux', 'user interface', 'confusing', 'hard to find',
      'not intuitive', 'unclear', 'navigation'
    ];

    const usabilityIssues = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + usabilityKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count performance complaints
    const performanceKeywords = [
      'slow', 'performance', 'loading', 'lag', 'timeout',
      'takes forever', 'speed', 'unresponsive'
    ];

    const performanceComplaints = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + performanceKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count integration requests
    const integrationKeywords = [
      'integration', 'integrate with', 'connect to', 'api',
      'sync with', 'export to', 'import from'
    ];

    const integrationRequests = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + integrationKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count documentation gaps
    const documentationKeywords = [
      'documentation', 'docs', 'how to', 'guide', 'tutorial',
      'unclear', 'not documented', 'no instructions'
    ];

    const documentationGaps = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + documentationKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count training needs
    const trainingKeywords = [
      'training', 'learn', 'onboarding', 'help', 'support',
      'teach', 'show how', 'walkthrough'
    ];

    const trainingNeeds = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + trainingKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Count adoption blocks
    const adoptionKeywords = [
      'not using', 'haven\'t adopted', 'team won\'t', 'resistance',
      'hard to get buy-in', 'convincing people'
    ];

    const adoptionBlocks = meetings.reduce((count, meeting) => {
      const transcriptText = getTranscriptData(meeting).content.toLowerCase();
      return count + adoptionKeywords.filter(k => transcriptText.includes(k)).length;
    }, 0);

    // Identify power user feedback (longer, detailed feedback)
    const powerUserFeedback = meetings.filter(m => {
      const transcript = getTranscriptData(m).content;
      return transcript.length > 1000; // Detailed feedback
    }).length;

    return {
      totalFeedbackItems: meetings.length,
      avgSentiment,
      sentimentChange,
      featureRequestCount,
      bugReportCount,
      praiseCount,
      complaintCount,
      competitorMentions,
      usabilityIssues,
      performanceComplaints,
      integrationRequests,
      documentationGaps,
      trainingNeeds,
      adoptionBlocks,
      powerUserFeedback,
    };
  }

  /**
   * Make prediction using GPT-4
   */
  protected async makePrediction(
    features: ProductFeedbackFeatures
  ): Promise<ProductFeedbackAnalysis> {
    logger.info('Analyzing product feedback with AI');

    const systemPrompt = `You are a product manager and user researcher specializing in feedback analysis. Analyze customer feedback data to extract actionable insights for product development.

Consider these factors:
- Feature requests indicate unmet needs and market gaps
- Bug severity affects user experience and retention
- Sentiment trends show product-market fit evolution
- Competitor mentions signal competitive threats
- Adoption blocks reveal onboarding and usability issues
- Power user feedback often contains valuable advanced insights

Provide comprehensive analysis with prioritized, actionable recommendations.`;

    const userPrompt = `Analyze these product feedback metrics:

${this.formatFeaturesForAI(features)}

Provide your analysis in this exact JSON format:
{
  "overallSentiment": <number -1 to 1>,
  "sentimentTrend": "<declining|stable|improving>",
  "featurePriorities": [
    {
      "feature": "<feature name>",
      "requestCount": <number>,
      "sentiment": <number -1 to 1>,
      "urgency": "<low|medium|high|critical>",
      "impactEstimate": <number 0-100>,
      "requestingCustomers": <number>,
      "revenue": <number>,
      "description": "<description>"
    }
  ],
  "bugSeverity": {
    "critical": <number>,
    "high": <number>,
    "medium": <number>,
    "low": <number>,
    "totalReports": <number>,
    "topBugs": [
      {
        "issue": "<issue description>",
        "severity": "<critical|high|medium|low>",
        "frequency": <number>,
        "affectedCustomers": <number>,
        "businessImpact": "<impact description>"
      }
    ]
  },
  "competitiveInsights": [
    {
      "competitor": "<competitor name>",
      "mentions": <number>,
      "context": "<positive|neutral|negative|threat>",
      "specificFeatures": ["<feature 1>", "<feature 2>"],
      "risk": <number 0-100>
    }
  ],
  "adoptionMetrics": {
    "featureAdoption": {"<feature>": <percentage>},
    "usageGrowth": <number>,
    "powerUsers": <number>,
    "casualUsers": <number>,
    "dormantFeatures": ["<feature 1>", "<feature 2>"]
  },
  "actionableInsights": [
    {
      "insight": "<insight description>",
      "category": "<feature|bug|ux|performance|competitive|adoption>",
      "priority": "<low|medium|high|critical>",
      "evidence": ["<evidence 1>", "<evidence 2>"],
      "recommendedAction": "<action>",
      "estimatedImpact": <number 0-100>
    }
  ],
  "urgency": "<low|medium|high|critical>"
}`;

    const schema = `{
  "overallSentiment": "number (-1 to 1)",
  "sentimentTrend": "string (declining|stable|improving)",
  "featurePriorities": "array of feature objects",
  "bugSeverity": "object with bug metrics",
  "competitiveInsights": "array of competitor objects",
  "adoptionMetrics": "object with adoption data",
  "actionableInsights": "array of insight objects",
  "urgency": "string (low|medium|high|critical)"
}`;

    const prediction = await this.callAIStructured<ProductFeedbackAnalysis>(
      systemPrompt,
      userPrompt,
      schema
    );

    logger.info('Product feedback analysis complete', {
      overallSentiment: prediction.overallSentiment,
      urgency: prediction.urgency,
    });

    return prediction;
  }

  /**
   * Generate human-readable explanation
   */
  protected async generateExplanation(
    prediction: ProductFeedbackAnalysis,
    features: ProductFeedbackFeatures
  ): Promise<string> {
    const systemPrompt = `You are a product leader presenting feedback analysis to stakeholders. Provide clear, strategic explanations that drive decision-making.`;

    const userPrompt = `Explain this product feedback analysis in 2-3 sentences:

Overall Sentiment: ${prediction.overallSentiment.toFixed(2)}
Trend: ${prediction.sentimentTrend}
Urgency: ${prediction.urgency}

Key Metrics:
- Feature Requests: ${features.featureRequestCount}
- Bug Reports: ${features.bugReportCount}
- Praise: ${features.praiseCount}
- Complaints: ${features.complaintCount}
- Competitor Mentions: ${features.competitorMentions}

Top Priority: ${prediction.featurePriorities[0]?.feature || 'N/A'}

Write a concise executive summary.`;

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
   * Generate product recommendations
   */
  protected async generateRecommendations(
    prediction: ProductFeedbackAnalysis,
    features: ProductFeedbackFeatures
  ): Promise<string[]> {
    // Extract high-priority insights
    return prediction.actionableInsights
      .filter(insight => insight.priority === 'high' || insight.priority === 'critical')
      .slice(0, 5)
      .map(insight => `${insight.recommendedAction} (${insight.category})`);
  }
}

/**
 * Factory function to create ProductFeedbackAnalyzer
 */
export function createProductFeedbackAnalyzer(
  prisma: PrismaClient
): ProductFeedbackAnalyzer {
  return new ProductFeedbackAnalyzer(prisma);
}
