/**
 * Deal Risk Detection Service (GAP #2)
 * Gong-like revenue intelligence and deal insights
 * Enterprise P0 blocker - Automatic deal risk detection
 */

import { PrismaClient, Deal, DealStage } from '@prisma/client';
import winston from 'winston';
import OpenAI from 'openai';
import Redis from 'ioredis';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'deal-risk-detection' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// ====================================
// Types and Interfaces
// ====================================

export interface DealRiskAssessment {
  dealId: string;
  overallRisk: number; // 0-100 (0 = no risk, 100 = critical risk)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    missingStakeholders?: { risk: number; missing: string[]; detected: string[] };
    lowEngagement?: { risk: number; trend: string; score: number; details: string };
    competitivePresence?: { risk: number; competitors: string[]; mentions: number };
    engagementDrop?: { risk: number; dropPercentage: number; lastMeetingDays: number };
    staleDeal?: { risk: number; daysSinceLastActivity: number };
    missingNextSteps?: { risk: number; hasActionItems: boolean };
    budgetConcerns?: { risk: number; concerns: string[] };
  };
  recommendations: string[];
  lastAnalyzed: Date;
  nextReviewDate: Date;
}

export interface EngagementMetrics {
  dealId: string;
  score: number; // 0-100
  trend: 'increasing' | 'stable' | 'decreasing' | 'critical';
  totalMeetings: number;
  meetingFrequency: number; // meetings per week
  avgParticipants: number;
  stakeholderCoverage: number; // percentage of key stakeholders engaged
  responseTime: number; // avg hours to respond
  lastMeetingDate?: Date;
  daysSinceLastMeeting?: number;
  engagementHistory: Array<{ date: Date; score: number }>;
}

export interface StakeholderAnalysis {
  dealId: string;
  detected: Array<{
    name: string;
    email?: string;
    role: string;
    engagementLevel: 'high' | 'medium' | 'low';
    meetingCount: number;
  }>;
  missing: Array<{
    role: string;
    importance: 'critical' | 'high' | 'medium';
    reason: string;
  }>;
  coverageScore: number; // 0-100
}

export const REQUIRED_STAKEHOLDER_ROLES = [
  'Economic Buyer',
  'Decision Maker',
  'Technical Champion',
  'End User',
  'Influencer',
];

// ====================================
// Deal Risk Detection Service
// ====================================

export class DealRiskDetectionService {
  private prisma: PrismaClient;
  private redis: Redis;
  private openai: OpenAI;

  constructor(prisma: PrismaClient, redis: Redis, openai: OpenAI) {
    this.prisma = prisma;
    this.redis = redis;
    this.openai = openai;
  }

  /**
   * Analyze comprehensive deal risk
   */
  async analyzeDealRisk(
    dealId: string,
    organizationId: string
  ): Promise<DealRiskAssessment> {
    try {
      logger.info('Analyzing comprehensive deal risk', { dealId });

      // Check cache first
      const cacheKey = `deal-risk:${dealId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get deal with related data
      const deal = await this.prisma.deal.findFirst({
        where: { id: dealId, organizationId },
        include: {
          meetings: {
            include: {
              meeting: {
                include: {
                  participants: true,
                  summaries: true,
                  analytics: true,
                },
              },
            },
            orderBy: {
              meeting: {
                scheduledStartAt: 'desc',
              },
            },
          },
          scorecards: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      const meetings = deal.meetings.map((dm) => dm.meeting);

      // Run all risk detection in parallel
      const [
        stakeholderAnalysis,
        engagementMetrics,
        competitiveRisk,
        staleDealRisk,
        missingNextStepsRisk,
        budgetRisk,
      ] = await Promise.all([
        this.detectMissingStakeholders(dealId, meetings),
        this.trackEngagementMetrics(dealId, meetings),
        this.detectCompetitivePresence(dealId, meetings),
        this.detectStaleDeal(dealId, meetings),
        this.detectMissingNextSteps(dealId, meetings),
        this.detectBudgetConcerns(dealId, meetings),
      ]);

      // Calculate overall risk
      const riskFactors = {
        missingStakeholders: {
          risk: this.calculateStakeholderRisk(stakeholderAnalysis),
          missing: stakeholderAnalysis.missing.map((s) => s.role),
          detected: stakeholderAnalysis.detected.map((s) => s.role),
        },
        lowEngagement: {
          risk: this.calculateEngagementRisk(engagementMetrics),
          trend: engagementMetrics.trend,
          score: engagementMetrics.score,
          details: this.getEngagementDetails(engagementMetrics),
        },
        competitivePresence: competitiveRisk,
        engagementDrop: {
          risk: engagementMetrics.trend === 'critical' ? 80 : engagementMetrics.trend === 'decreasing' ? 50 : 0,
          dropPercentage: this.calculateEngagementDrop(engagementMetrics.engagementHistory),
          lastMeetingDays: engagementMetrics.daysSinceLastMeeting || 0,
        },
        staleDeal: staleDealRisk,
        missingNextSteps: missingNextStepsRisk,
        budgetConcerns: budgetRisk,
      };

      // Calculate weighted overall risk
      const overallRisk = this.calculateOverallRisk(riskFactors);
      const riskLevel = this.getRiskLevel(overallRisk);

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskFactors, deal);

      const assessment: DealRiskAssessment = {
        dealId,
        overallRisk,
        riskLevel,
        factors: riskFactors,
        recommendations,
        lastAnalyzed: new Date(),
        nextReviewDate: this.calculateNextReviewDate(riskLevel),
      };

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(assessment));

      logger.info('Deal risk analysis complete', {
        dealId,
        overallRisk,
        riskLevel,
      });

      return assessment;
    } catch (error) {
      logger.error('Error analyzing deal risk', { error, dealId });
      throw error;
    }
  }

  /**
   * Detect missing stakeholders using AI
   */
  async detectMissingStakeholders(
    dealId: string,
    meetings: any[]
  ): Promise<StakeholderAnalysis> {
    try {
      logger.info('Detecting missing stakeholders', { dealId });

      // Extract all participants
      const participantMap = new Map<string, any>();
      meetings.forEach((meeting) => {
        meeting.participants?.forEach((p: any) => {
          const key = p.email || p.name || `unknown-${p.id}`;
          if (!participantMap.has(key)) {
            participantMap.set(key, {
              name: p.name || 'Unknown',
              email: p.email,
              meetingCount: 0,
              totalTalkTime: 0,
            });
          }
          const participant = participantMap.get(key);
          participant.meetingCount++;
          participant.totalTalkTime += p.talkTimeSeconds || 0;
        });
      });

      // Use AI to classify stakeholder roles
      const participantsList = Array.from(participantMap.values());
      let detectedStakeholders: any[] = [];

      if (participantsList.length > 0 && meetings.length > 0) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are a sales intelligence AI. Analyze meeting participants and classify their roles.
                Possible roles: ${REQUIRED_STAKEHOLDER_ROLES.join(', ')}.
                Return a JSON array with format: [{"name": "...", "email": "...", "role": "...", "engagementLevel": "high|medium|low"}]`,
              },
              {
                role: 'user',
                content: `Analyze these participants from ${meetings.length} meetings:\n${JSON.stringify(participantsList, null, 2)}`,
              },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });

          const aiResult = JSON.parse(response.choices[0].message.content || '{"stakeholders":[]}');
          detectedStakeholders = aiResult.stakeholders || [];
        } catch (aiError) {
          logger.warn('AI stakeholder detection failed, using heuristics', { aiError });
          // Fallback to heuristic classification
          detectedStakeholders = participantsList.map((p) => ({
            name: p.name,
            email: p.email,
            role: 'Participant',
            engagementLevel: p.meetingCount >= 3 ? 'high' : p.meetingCount >= 2 ? 'medium' : 'low',
          }));
        }
      }

      // Determine missing stakeholders
      const detectedRoles = new Set(detectedStakeholders.map((s) => s.role));
      const missing = REQUIRED_STAKEHOLDER_ROLES.filter((role) => !detectedRoles.has(role)).map(
        (role) => ({
          role,
          importance: role === 'Economic Buyer' || role === 'Decision Maker' ? 'critical' as const : 'high' as const,
          reason: `No ${role} identified in ${meetings.length} meetings`,
        })
      );

      const detected = detectedStakeholders.map((s) => ({
        name: s.name,
        email: s.email,
        role: s.role,
        engagementLevel: s.engagementLevel as 'high' | 'medium' | 'low',
        meetingCount: participantMap.get(s.email || s.name)?.meetingCount || 0,
      }));

      const coverageScore = Math.round(
        (detectedRoles.size / REQUIRED_STAKEHOLDER_ROLES.length) * 100
      );

      return {
        dealId,
        detected,
        missing,
        coverageScore,
      };
    } catch (error) {
      logger.error('Error detecting stakeholders', { error, dealId });
      return {
        dealId,
        detected: [],
        missing: [],
        coverageScore: 0,
      };
    }
  }

  /**
   * Track engagement metrics and trends
   */
  async trackEngagementMetrics(
    dealId: string,
    meetings: any[]
  ): Promise<EngagementMetrics> {
    try {
      logger.info('Tracking engagement metrics', { dealId });

      const totalMeetings = meetings.length;
      if (totalMeetings === 0) {
        return {
          dealId,
          score: 0,
          trend: 'critical',
          totalMeetings: 0,
          meetingFrequency: 0,
          avgParticipants: 0,
          stakeholderCoverage: 0,
          responseTime: 0,
          engagementHistory: [],
        };
      }

      // Calculate meeting frequency (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentMeetings = meetings.filter(
        (m) => m.scheduledStartAt && new Date(m.scheduledStartAt) >= thirtyDaysAgo
      );
      const meetingFrequency = (recentMeetings.length / 30) * 7; // per week

      // Calculate average participants
      const avgParticipants =
        meetings.reduce((sum, m) => sum + (m.participantCount || m.participants?.length || 0), 0) /
        totalMeetings;

      // Last meeting date
      const sortedMeetings = [...meetings].sort(
        (a, b) =>
          new Date(b.scheduledStartAt || 0).getTime() -
          new Date(a.scheduledStartAt || 0).getTime()
      );
      const lastMeetingDate = sortedMeetings[0]?.scheduledStartAt
        ? new Date(sortedMeetings[0].scheduledStartAt)
        : undefined;
      const daysSinceLastMeeting = lastMeetingDate
        ? Math.floor((Date.now() - lastMeetingDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // Engagement history (simplified - last 5 meetings)
      const engagementHistory = sortedMeetings.slice(0, 5).map((m) => {
        const engagementScore = m.analytics?.engagementScore || 50;
        return {
          date: new Date(m.scheduledStartAt || Date.now()),
          score: engagementScore,
        };
      });

      // Calculate trend
      const trend = this.calculateEngagementTrend(engagementHistory, daysSinceLastMeeting);

      // Overall engagement score
      const score = this.calculateEngagementScore({
        meetingFrequency,
        avgParticipants,
        daysSinceLastMeeting: daysSinceLastMeeting || 0,
        recentEngagement: engagementHistory[0]?.score || 50,
      });

      return {
        dealId,
        score,
        trend,
        totalMeetings,
        meetingFrequency: Math.round(meetingFrequency * 10) / 10,
        avgParticipants: Math.round(avgParticipants * 10) / 10,
        stakeholderCoverage: 0, // Will be set by stakeholder analysis
        responseTime: this.calculateResponseTimeFromMeetings(sortedMeetings),
        lastMeetingDate,
        daysSinceLastMeeting,
        engagementHistory,
      };
    } catch (error) {
      logger.error('Error tracking engagement', { error, dealId });
      throw error;
    }
  }

  /**
   * Detect competitive presence in meetings
   */
  private async detectCompetitivePresence(
    dealId: string,
    meetings: any[]
  ): Promise<{ risk: number; competitors: string[]; mentions: number }> {
    try {
      const competitorKeywords = [
        'salesforce',
        'hubspot',
        'gong',
        'chorus',
        'competitor',
        'alternative',
        'other vendor',
      ];

      let totalMentions = 0;
      const competitorsFound = new Set<string>();

      for (const meeting of meetings) {
        const summaries = meeting.summaries || [];
        for (const summary of summaries) {
          const text = (
            (summary.overview || '') +
            ' ' +
            JSON.stringify(summary.keyPoints || [])
          ).toLowerCase();

          competitorKeywords.forEach((keyword) => {
            if (text.includes(keyword)) {
              totalMentions++;
              competitorsFound.add(keyword);
            }
          });
        }
      }

      const risk = Math.min(totalMentions * 15, 100);

      return {
        risk,
        competitors: Array.from(competitorsFound),
        mentions: totalMentions,
      };
    } catch (error) {
      logger.error('Error detecting competitive presence', { error });
      return { risk: 0, competitors: [], mentions: 0 };
    }
  }

  /**
   * Detect stale deals (no activity)
   */
  private async detectStaleDeal(
    dealId: string,
    meetings: any[]
  ): Promise<{ risk: number; daysSinceLastActivity: number }> {
    try {
      if (meetings.length === 0) {
        return { risk: 100, daysSinceLastActivity: 999 };
      }

      const sortedMeetings = [...meetings].sort(
        (a, b) =>
          new Date(b.scheduledStartAt || 0).getTime() -
          new Date(a.scheduledStartAt || 0).getTime()
      );

      const lastMeeting = sortedMeetings[0];
      const daysSinceLastActivity = lastMeeting.scheduledStartAt
        ? Math.floor(
            (Date.now() - new Date(lastMeeting.scheduledStartAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      // Risk increases with days of inactivity
      let risk = 0;
      if (daysSinceLastActivity > 30) risk = 90;
      else if (daysSinceLastActivity > 14) risk = 60;
      else if (daysSinceLastActivity > 7) risk = 30;

      return { risk, daysSinceLastActivity };
    } catch (error) {
      logger.error('Error detecting stale deal', { error });
      return { risk: 0, daysSinceLastActivity: 0 };
    }
  }

  /**
   * Detect missing next steps/action items
   */
  private async detectMissingNextSteps(
    dealId: string,
    meetings: any[]
  ): Promise<{ risk: number; hasActionItems: boolean }> {
    try {
      if (meetings.length === 0) {
        return { risk: 50, hasActionItems: false };
      }

      // Check most recent meeting for action items
      const sortedMeetings = [...meetings].sort(
        (a, b) =>
          new Date(b.scheduledStartAt || 0).getTime() -
          new Date(a.scheduledStartAt || 0).getTime()
      );

      const recentMeeting = sortedMeetings[0];
      const hasActionItems =
        recentMeeting.summaries?.some((s: any) => {
          const actionItems = s.actionItems;
          return Array.isArray(actionItems) && actionItems.length > 0;
        }) || false;

      const risk = hasActionItems ? 0 : 70;

      return { risk, hasActionItems };
    } catch (error) {
      logger.error('Error detecting missing next steps', { error });
      return { risk: 0, hasActionItems: false };
    }
  }

  /**
   * Detect budget concerns from meeting content
   */
  private async detectBudgetConcerns(
    dealId: string,
    meetings: any[]
  ): Promise<{ risk: number; concerns: string[] }> {
    try {
      const budgetKeywords = ['budget', 'price', 'cost', 'expensive', 'roi', 'cheaper'];
      const concerns: string[] = [];

      for (const meeting of meetings) {
        const summaries = meeting.summaries || [];
        for (const summary of summaries) {
          const text = ((summary.overview || '') + ' ' + JSON.stringify(summary.keyPoints || [])).toLowerCase();

          budgetKeywords.forEach((keyword) => {
            if (text.includes(keyword) && !concerns.includes(keyword)) {
              concerns.push(keyword);
            }
          });
        }
      }

      const risk = Math.min(concerns.length * 20, 80);

      return { risk, concerns };
    } catch (error) {
      logger.error('Error detecting budget concerns', { error });
      return { risk: 0, concerns: [] };
    }
  }

  // ====================================
  // Helper Methods
  // ====================================

  private calculateStakeholderRisk(analysis: StakeholderAnalysis): number {
    const criticalMissing = analysis.missing.filter((m) => m.importance === 'critical').length;
    const highMissing = analysis.missing.filter((m) => m.importance === 'high').length;

    return Math.min(criticalMissing * 40 + highMissing * 20, 100);
  }

  private calculateEngagementRisk(metrics: EngagementMetrics): number {
    return Math.max(0, 100 - metrics.score);
  }

  private getEngagementDetails(metrics: EngagementMetrics): string {
    if (metrics.trend === 'critical') {
      return `No meetings in ${metrics.daysSinceLastMeeting} days - immediate action required`;
    }
    if (metrics.trend === 'decreasing') {
      return `Engagement declining - last meeting ${metrics.daysSinceLastMeeting} days ago`;
    }
    if (metrics.trend === 'stable') {
      return `Stable engagement with ${metrics.meetingFrequency} meetings per week`;
    }
    return `Strong engagement - ${metrics.totalMeetings} total meetings`;
  }

  private calculateEngagementDrop(history: Array<{ date: Date; score: number }>): number {
    if (history.length < 2) return 0;

    const latest = history[0].score;
    const previous = history[1].score;

    return Math.round(((previous - latest) / previous) * 100);
  }

  private calculateEngagementTrend(
    history: Array<{ date: Date; score: number }>,
    daysSinceLastMeeting?: number
  ): 'increasing' | 'stable' | 'decreasing' | 'critical' {
    if (!daysSinceLastMeeting) {
      daysSinceLastMeeting = 0;
    }

    if (daysSinceLastMeeting > 14) return 'critical';
    if (history.length < 2) return daysSinceLastMeeting > 7 ? 'decreasing' : 'stable';

    const recent = history.slice(0, 2);
    const diff = recent[0].score - recent[1].score;

    if (diff > 10) return 'increasing';
    if (diff < -10) return 'decreasing';
    return 'stable';
  }

  private calculateEngagementScore(params: {
    meetingFrequency: number;
    avgParticipants: number;
    daysSinceLastMeeting: number;
    recentEngagement: number;
  }): number {
    let score = 50; // Base score

    // Meeting frequency (0-30 points)
    if (params.meetingFrequency >= 2) score += 30;
    else if (params.meetingFrequency >= 1) score += 20;
    else if (params.meetingFrequency >= 0.5) score += 10;

    // Participant count (0-20 points)
    if (params.avgParticipants >= 5) score += 20;
    else if (params.avgParticipants >= 3) score += 15;
    else if (params.avgParticipants >= 2) score += 10;

    // Recency penalty
    if (params.daysSinceLastMeeting > 14) score -= 40;
    else if (params.daysSinceLastMeeting > 7) score -= 20;
    else if (params.daysSinceLastMeeting > 3) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private calculateOverallRisk(factors: any): number {
    const weights = {
      missingStakeholders: 0.25,
      lowEngagement: 0.25,
      competitivePresence: 0.15,
      engagementDrop: 0.15,
      staleDeal: 0.1,
      missingNextSteps: 0.05,
      budgetConcerns: 0.05,
    };

    let weightedRisk = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      const risk = factors[key]?.risk || 0;
      weightedRisk += risk * weight;
    });

    return Math.round(weightedRisk);
  }

  private getRiskLevel(overallRisk: number): 'low' | 'medium' | 'high' | 'critical' {
    if (overallRisk >= 75) return 'critical';
    if (overallRisk >= 50) return 'high';
    if (overallRisk >= 25) return 'medium';
    return 'low';
  }

  private generateRecommendations(factors: any, deal: Deal): string[] {
    const recommendations: string[] = [];

    if (factors.missingStakeholders?.risk > 30) {
      factors.missingStakeholders.missing.slice(0, 2).forEach((role: string) => {
        recommendations.push(`Schedule meeting with ${role} to reduce stakeholder risk`);
      });
    }

    if (factors.lowEngagement?.risk > 50) {
      recommendations.push('Increase engagement frequency - schedule follow-up call within 3 days');
    }

    if (factors.competitivePresence?.risk > 40) {
      recommendations.push('Address competitive concerns and differentiate value proposition');
    }

    if (factors.staleDeal?.risk > 60) {
      recommendations.push('Re-engage immediately - deal has gone cold');
    }

    if (factors.missingNextSteps?.risk > 50) {
      recommendations.push('Define clear next steps and action items with prospect');
    }

    if (factors.budgetConcerns?.risk > 40) {
      recommendations.push('Schedule business case review to address budget and ROI concerns');
    }

    if (deal.stage === 'prospecting' && factors.missingStakeholders?.risk > 50) {
      recommendations.push('Identify and connect with economic buyer before proceeding');
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  private calculateNextReviewDate(riskLevel: string): Date {
    const nextReview = new Date();
    switch (riskLevel) {
      case 'critical':
        nextReview.setDate(nextReview.getDate() + 1); // Daily
        break;
      case 'high':
        nextReview.setDate(nextReview.getDate() + 3); // Every 3 days
        break;
      case 'medium':
        nextReview.setDate(nextReview.getDate() + 7); // Weekly
        break;
      default:
        nextReview.setDate(nextReview.getDate() + 14); // Bi-weekly
    }
    return nextReview;
  }

  /**
   * Calculate average response time based on meeting intervals
   */
  private calculateResponseTimeFromMeetings(meetings: any[]): number {
    if (meetings.length < 2) return 0;
    
    let totalGapDays = 0;
    let gaps = 0;
    
    for (let i = 1; i < meetings.length; i++) {
      const prev = new Date(meetings[i - 1].scheduledAt || meetings[i - 1].createdAt);
      const curr = new Date(meetings[i].scheduledAt || meetings[i].createdAt);
      const gapDays = Math.abs(curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      totalGapDays += gapDays;
      gaps++;
    }
    
    return gaps > 0 ? Math.round((totalGapDays / gaps) * 10) / 10 : 0;
  }
}

// Export singleton instance
export const dealRiskDetectionService = new DealRiskDetectionService(prisma, redis, openai);
export default DealRiskDetectionService;
