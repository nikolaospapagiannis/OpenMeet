/**
 * Revenue Intelligence Service
 * GAP #2 - Gong Competitor Features
 * Deal tracking, Win-loss analysis, Sales coaching scorecards, Pipeline insights
 */

import { PrismaClient, Deal, DealStage, WinLoss, WinLossOutcome, Scorecard, CRMProvider } from '@prisma/client';
import Redis from 'ioredis';
import winston from 'winston';
import OpenAI from 'openai';
import axios from 'axios';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'revenue-intelligence' },
  transports: [new winston.transports.Console()],
});

export interface CreateDealInput {
  name: string;
  amount?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expectedCloseDate?: Date;
  crmProvider?: CRMProvider;
  crmDealId?: string;
  crmAccountId?: string;
  contactEmail?: string;
  contactName?: string;
  ownerId?: string;
  description?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateDealInput {
  name?: string;
  amount?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  contactEmail?: string;
  contactName?: string;
  ownerId?: string;
  description?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface CreateWinLossInput {
  dealId: string;
  outcome: WinLossOutcome;
  closedDate: Date;
  dealAmount?: number;
  competitorName?: string;
  lostReason?: string;
  winReason?: string;
  keyObjections?: string[];
  lessonsLearned?: string[];
}

export interface PipelineMetrics {
  totalDeals: number;
  totalValue: number;
  averageDealSize: number;
  dealsByStage: Record<DealStage, number>;
  valueByStage: Record<DealStage, number>;
  winRate: number;
  avgDealVelocity: number;
  topPerformers: Array<{
    userId: string;
    userName: string;
    dealsWon: number;
    totalValue: number;
  }>;
}

export interface SalesCoachingInsights {
  talkRatio: number;
  questionRate: number;
  monologueCount: number;
  fillerWordCount: number;
  paceWpm: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  coachingTips: string[];
}

export class RevenueIntelligenceService {
  private prisma: PrismaClient;
  private redis: Redis;
  private openai: OpenAI;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Create a new deal
   */
  async createDeal(
    organizationId: string,
    data: CreateDealInput
  ): Promise<Deal> {
    try {
      const deal = await this.prisma.deal.create({
        data: {
          organizationId,
          name: data.name,
          amount: data.amount,
          currency: data.currency || 'USD',
          stage: data.stage || 'prospecting',
          probability: data.probability || 0,
          expectedCloseDate: data.expectedCloseDate,
          crmProvider: data.crmProvider,
          crmDealId: data.crmDealId,
          crmAccountId: data.crmAccountId,
          contactEmail: data.contactEmail,
          contactName: data.contactName,
          ownerId: data.ownerId,
          description: data.description,
          tags: data.tags || [],
          customFields: data.customFields || {},
        },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info(`Deal created: ${deal.id} for organization ${organizationId}`);

      // Invalidate cache
      await this.redis.del(`pipeline:${organizationId}`);

      return deal;
    } catch (error) {
      logger.error('Error creating deal:', error);
      throw error;
    }
  }

  /**
   * Update a deal
   */
  async updateDeal(
    dealId: string,
    organizationId: string,
    data: UpdateDealInput
  ): Promise<Deal> {
    try {
      const deal = await this.prisma.deal.update({
        where: {
          id: dealId,
          organizationId,
        },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.currency && { currency: data.currency }),
          ...(data.stage && { stage: data.stage }),
          ...(data.probability !== undefined && { probability: data.probability }),
          ...(data.expectedCloseDate && { expectedCloseDate: data.expectedCloseDate }),
          ...(data.actualCloseDate && { actualCloseDate: data.actualCloseDate }),
          ...(data.contactEmail && { contactEmail: data.contactEmail }),
          ...(data.contactName && { contactName: data.contactName }),
          ...(data.ownerId && { ownerId: data.ownerId }),
          ...(data.description && { description: data.description }),
          ...(data.tags && { tags: data.tags }),
          ...(data.customFields && { customFields: data.customFields }),
        },
        include: {
          owner: true,
          meetings: {
            include: {
              meeting: {
                select: {
                  id: true,
                  title: true,
                  scheduledStartAt: true,
                },
              },
            },
          },
        },
      });

      // Invalidate cache
      await this.redis.del(`pipeline:${organizationId}`);
      await this.redis.del(`deal:${dealId}`);

      return deal;
    } catch (error) {
      logger.error('Error updating deal:', error);
      throw error;
    }
  }

  /**
   * Get deal by ID
   */
  async getDeal(dealId: string, organizationId: string): Promise<Deal | null> {
    try {
      // Check cache first
      const cached = await this.redis.get(`deal:${dealId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const deal = await this.prisma.deal.findFirst({
        where: {
          id: dealId,
          organizationId,
        },
        include: {
          owner: true,
          meetings: {
            include: {
              meeting: {
                select: {
                  id: true,
                  title: true,
                  scheduledStartAt: true,
                  status: true,
                },
              },
            },
          },
          winLoss: true,
          scorecards: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (deal) {
        // Cache for 5 minutes
        await this.redis.setex(`deal:${dealId}`, 300, JSON.stringify(deal));
      }

      return deal;
    } catch (error) {
      logger.error('Error getting deal:', error);
      throw error;
    }
  }

  /**
   * List all deals for an organization
   */
  async listDeals(
    organizationId: string,
    filters?: {
      stage?: DealStage;
      ownerId?: string;
      search?: string;
    }
  ): Promise<Deal[]> {
    try {
      const where: any = { organizationId };

      if (filters?.stage) {
        where.stage = filters.stage;
      }

      if (filters?.ownerId) {
        where.ownerId = filters.ownerId;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { contactEmail: { contains: filters.search, mode: 'insensitive' } },
          { contactName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const deals = await this.prisma.deal.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          meetings: {
            select: {
              id: true,
              meetingId: true,
            },
          },
          winLoss: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return deals;
    } catch (error) {
      logger.error('Error listing deals:', error);
      throw error;
    }
  }

  /**
   * Link a meeting to a deal
   */
  async linkMeetingToDeal(
    dealId: string,
    meetingId: string,
    organizationId: string,
    impact?: string
  ): Promise<void> {
    try {
      // Verify deal belongs to organization
      const deal = await this.prisma.deal.findFirst({
        where: { id: dealId, organizationId },
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      await this.prisma.dealMeeting.create({
        data: {
          dealId,
          meetingId,
          impact,
        },
      });

      // Invalidate cache
      await this.redis.del(`deal:${dealId}`);

      logger.info(`Linked meeting ${meetingId} to deal ${dealId}`);
    } catch (error) {
      logger.error('Error linking meeting to deal:', error);
      throw error;
    }
  }

  /**
   * Record win/loss analysis
   */
  async recordWinLoss(
    organizationId: string,
    data: CreateWinLossInput
  ): Promise<WinLoss> {
    try {
      // Get deal and verify ownership
      const deal = await this.prisma.deal.findFirst({
        where: {
          id: data.dealId,
          organizationId,
        },
        include: {
          meetings: {
            include: {
              meeting: {
                include: {
                  transcripts: true,
                },
              },
            },
          },
        },
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      // Analyze sentiment from meeting transcripts
      let sentimentAnalysis = null;
      let competitiveInsights = null;

      if (deal.meetings.length > 0) {
        // Call AI service to analyze sales calls
        try {
          const transcripts = deal.meetings
            .flatMap(dm => dm.meeting.transcripts)
            .filter(t => t.isFinal);

          if (transcripts.length > 0) {
            const analysisResult = await this.analyzeSalesCallsForDeal(
              deal.meetings.map(dm => dm.meeting),
              data.outcome
            );

            sentimentAnalysis = analysisResult.sentiment;
            competitiveInsights = analysisResult.competitive;
          }
        } catch (error) {
          logger.error('Error analyzing sales calls:', error);
        }
      }

      // Create win/loss record
      const winLoss = await this.prisma.winLoss.create({
        data: {
          dealId: data.dealId,
          organizationId,
          outcome: data.outcome,
          closedDate: data.closedDate,
          dealAmount: data.dealAmount,
          competitorName: data.competitorName,
          lostReason: data.lostReason,
          winReason: data.winReason,
          keyObjections: data.keyObjections || [],
          sentimentAnalysis,
          competitiveInsights,
          lessonsLearned: data.lessonsLearned || [],
        },
      });

      // Update deal stage
      await this.prisma.deal.update({
        where: { id: data.dealId },
        data: {
          stage: data.outcome === 'won' ? 'closed_won' : 'closed_lost',
          actualCloseDate: data.closedDate,
        },
      });

      // Invalidate caches
      await this.redis.del(`pipeline:${organizationId}`);
      await this.redis.del(`deal:${data.dealId}`);
      await this.redis.del(`winloss:analysis:${organizationId}`);

      logger.info(`Win/loss recorded for deal ${data.dealId}: ${data.outcome}`);

      return winLoss;
    } catch (error) {
      logger.error('Error recording win/loss:', error);
      throw error;
    }
  }

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const cacheKey = `winloss:analysis:${organizationId}:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const where: any = { organizationId };
      if (startDate || endDate) {
        where.closedDate = {};
        if (startDate) where.closedDate.gte = startDate;
        if (endDate) where.closedDate.lte = endDate;
      }

      const winLosses = await this.prisma.winLoss.findMany({
        where,
        include: {
          deal: {
            select: {
              name: true,
              amount: true,
              owner: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { closedDate: 'desc' },
      });

      // Calculate metrics
      const totalDeals = winLosses.length;
      const wins = winLosses.filter(w => w.outcome === 'won').length;
      const losses = winLosses.filter(w => w.outcome === 'lost').length;
      const winRate = totalDeals > 0 ? (wins / totalDeals) * 100 : 0;

      // Common objections
      const objections: Record<string, number> = {};
      winLosses.forEach(w => {
        if (Array.isArray(w.keyObjections)) {
          w.keyObjections.forEach((obj: any) => {
            const objStr = typeof obj === 'string' ? obj : JSON.stringify(obj);
            objections[objStr] = (objections[objStr] || 0) + 1;
          });
        }
      });

      const topObjections = Object.entries(objections)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([objection, count]) => ({ objection, count }));

      // Competitors
      const competitors: Record<string, { losses: number; avgDealSize: number }> = {};
      winLosses.forEach(w => {
        if (w.competitorName) {
          if (!competitors[w.competitorName]) {
            competitors[w.competitorName] = { losses: 0, avgDealSize: 0 };
          }
          competitors[w.competitorName].losses++;
          if (w.dealAmount) {
            competitors[w.competitorName].avgDealSize += w.dealAmount;
          }
        }
      });

      const topCompetitors = Object.entries(competitors)
        .map(([name, data]) => ({
          name,
          losses: data.losses,
          avgDealSize: data.avgDealSize / data.losses,
        }))
        .sort((a, b) => b.losses - a.losses)
        .slice(0, 5);

      // Winning patterns
      const winningReasons: Record<string, number> = {};
      winLosses.filter(w => w.outcome === 'won').forEach(w => {
        if (w.winReason) {
          winningReasons[w.winReason] = (winningReasons[w.winReason] || 0) + 1;
        }
      });

      const topWinReasons = Object.entries(winningReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      // Loss reasons
      const lossReasons: Record<string, number> = {};
      winLosses.filter(w => w.outcome === 'lost').forEach(w => {
        if (w.lostReason) {
          lossReasons[w.lostReason] = (lossReasons[w.lostReason] || 0) + 1;
        }
      });

      const topLossReasons = Object.entries(lossReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      const analysis = {
        summary: {
          totalDeals,
          wins,
          losses,
          winRate: Math.round(winRate * 100) / 100,
        },
        commonObjections: topObjections,
        topCompetitors,
        winningPatterns: topWinReasons,
        lossReasons: topLossReasons,
        recentWinLosses: winLosses.slice(0, 10),
      };

      // Cache for 30 minutes
      await this.redis.setex(cacheKey, 1800, JSON.stringify(analysis));

      return analysis;
    } catch (error) {
      logger.error('Error getting win/loss analysis:', error);
      throw error;
    }
  }

  /**
   * Generate sales coaching scorecard for a meeting
   */
  async generateScorecard(
    meetingId: string,
    userId: string,
    organizationId: string,
    dealId?: string
  ): Promise<Scorecard> {
    try {
      // Get meeting with transcript
      const meeting = await this.prisma.meeting.findFirst({
        where: {
          id: meetingId,
          organizationId,
        },
        include: {
          transcripts: {
            where: { isFinal: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          participants: true,
        },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (!meeting.transcripts.length) {
        throw new Error('No transcript available for this meeting');
      }

      // Call AI service to analyze sales call
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const transcript = meeting.transcripts[0];

      // Get transcript content from database
      const transcriptContent = await this.getTranscriptContent(transcript.mongodbId || '');

      const response = await axios.post(`${aiServiceUrl}/api/v1/analyze-sales-call`, {
        meetingId,
        transcript: transcriptContent,
        participants: meeting.participants.map(p => ({
          name: p.name || 'Unknown',
          email: p.email || '',
          talkTime: p.talkTimeSeconds,
        })),
        duration: meeting.durationSeconds || 0,
      });

      const analysis = response.data;

      // Create scorecard
      const scorecard = await this.prisma.scorecard.create({
        data: {
          organizationId,
          meetingId,
          userId,
          dealId,
          talkRatio: analysis.talkRatio,
          repTalkTime: analysis.repTalkTime,
          prospectTalkTime: analysis.prospectTalkTime,
          questionCount: analysis.questionCount,
          questionRate: analysis.questionRate,
          monologueCount: analysis.monologueCount,
          longestMonologue: analysis.longestMonologue,
          interruptionCount: analysis.interruptionCount,
          fillerWordCount: analysis.fillerWordCount,
          fillerWords: analysis.fillerWords || [],
          paceWpm: analysis.paceWpm,
          overallScore: analysis.overallScore,
          engagementScore: analysis.engagementScore,
          listeningScore: analysis.listeningScore,
          clarityScore: analysis.clarityScore,
          coachingInsights: analysis.coachingInsights || [],
          strengths: analysis.strengths || [],
          improvements: analysis.improvements || [],
          aiAnalysisRaw: analysis,
        },
      });

      logger.info(`Scorecard generated for meeting ${meetingId}`);

      return scorecard;
    } catch (error) {
      logger.error('Error generating scorecard:', error);
      throw error;
    }
  }

  /**
   * Get scorecards for a user
   */
  async getUserScorecards(
    userId: string,
    organizationId: string,
    limit: number = 10
  ): Promise<Scorecard[]> {
    try {
      const scorecards = await this.prisma.scorecard.findMany({
        where: {
          userId,
          organizationId,
        },
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              scheduledStartAt: true,
            },
          },
          deal: {
            select: {
              id: true,
              name: true,
              stage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return scorecards;
    } catch (error) {
      logger.error('Error getting user scorecards:', error);
      throw error;
    }
  }

  /**
   * Get pipeline insights
   */
  async getPipelineInsights(organizationId: string): Promise<PipelineMetrics> {
    try {
      const cacheKey = `pipeline:${organizationId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const deals = await this.prisma.deal.findMany({
        where: { organizationId },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          winLoss: true,
        },
      });

      const totalDeals = deals.length;
      const totalValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
      const averageDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

      // Deals by stage
      const dealsByStage: Record<string, number> = {};
      const valueByStage: Record<string, number> = {};

      Object.values(DealStage).forEach(stage => {
        dealsByStage[stage] = 0;
        valueByStage[stage] = 0;
      });

      deals.forEach(deal => {
        dealsByStage[deal.stage]++;
        valueByStage[deal.stage] += deal.amount || 0;
      });

      // Win rate
      const closedDeals = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost').length;
      const wonDeals = deals.filter(d => d.stage === 'closed_won').length;
      const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;

      // Deal velocity (average days to close)
      const closedDealsWithDates = deals.filter(d =>
        (d.stage === 'closed_won' || d.stage === 'closed_lost') &&
        d.actualCloseDate
      );

      let totalDays = 0;
      closedDealsWithDates.forEach(d => {
        if (d.actualCloseDate) {
          const days = Math.floor(
            (d.actualCloseDate.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          totalDays += days;
        }
      });

      const avgDealVelocity = closedDealsWithDates.length > 0
        ? Math.round(totalDays / closedDealsWithDates.length)
        : 0;

      // Top performers
      const performerMap: Record<string, { name: string; dealsWon: number; totalValue: number }> = {};

      deals.filter(d => d.stage === 'closed_won' && d.ownerId).forEach(deal => {
        const ownerId = deal.ownerId!;
        if (!performerMap[ownerId]) {
          const ownerName = deal.owner
            ? `${deal.owner.firstName || ''} ${deal.owner.lastName || ''}`.trim()
            : 'Unknown';

          performerMap[ownerId] = {
            name: ownerName,
            dealsWon: 0,
            totalValue: 0,
          };
        }
        performerMap[ownerId].dealsWon++;
        performerMap[ownerId].totalValue += deal.amount || 0;
      });

      const topPerformers = Object.entries(performerMap)
        .map(([userId, data]) => ({
          userId,
          userName: data.name,
          dealsWon: data.dealsWon,
          totalValue: data.totalValue,
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

      const metrics: PipelineMetrics = {
        totalDeals,
        totalValue,
        averageDealSize,
        dealsByStage: dealsByStage as Record<DealStage, number>,
        valueByStage: valueByStage as Record<DealStage, number>,
        winRate: Math.round(winRate * 100) / 100,
        avgDealVelocity,
        topPerformers,
      };

      // Cache for 10 minutes
      await this.redis.setex(cacheKey, 600, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      logger.error('Error getting pipeline insights:', error);
      throw error;
    }
  }

  /**
   * Analyze sales calls for a deal using AI
   */
  private async analyzeSalesCallsForDeal(
    meetings: any[],
    outcome: WinLossOutcome
  ): Promise<{ sentiment: any; competitive: any }> {
    try {
      // This is a simplified implementation
      // In production, you would call the AI service with full transcript analysis

      const prompt = `Analyze these sales meetings for a deal that ${outcome === 'won' ? 'WON' : 'LOST'}.
      Identify sentiment patterns and competitive insights.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a sales analyst. Analyze meeting patterns and provide insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const analysis = response.choices[0].message.content || '';

      return {
        sentiment: {
          overall: outcome === 'won' ? 0.7 : -0.3,
          analysis,
        },
        competitive: {
          insights: analysis,
        },
      };
    } catch (error) {
      logger.error('Error analyzing sales calls:', error);
      return {
        sentiment: null,
        competitive: null,
      };
    }
  }

  /**
   * Get transcript content from database storage
   */
  private async getTranscriptContent(transcriptId: string): Promise<string> {
    const { transcriptService } = await import('./TranscriptService');

    try {
      const transcriptText = await transcriptService.getTranscriptText(transcriptId);
      return transcriptText;
    } catch (error) {
      logger.error('Error fetching transcript:', error);
      throw new Error('Failed to fetch transcript content');
    }
  }
}

export default RevenueIntelligenceService;
