/**
 * Win-Loss Analysis Service (GAP #2)
 * Enterprise P0 blocker - Win-loss analysis and pattern recognition
 * Competing with Gong/Chorus for revenue intelligence
 */

import { PrismaClient, WinLoss, WinLossOutcome, Deal, DealStage } from '@prisma/client';
import winston from 'winston';
import OpenAI from 'openai';
import Redis from 'ioredis';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'win-loss-analysis' },
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

export interface WinLossPattern {
  pattern: string;
  frequency: number;
  impactScore: number; // 0-100
  category: 'product' | 'price' | 'relationship' | 'competition' | 'timing' | 'other';
  examples: string[];
  recommendation: string;
}

export interface WinningPattern {
  pattern: string;
  winRate: number; // percentage
  avgDealSize: number;
  avgSalesCycle: number; // days
  keyTactics: string[];
  replicableActions: string[];
}

export interface LosingPattern {
  pattern: string;
  lossRate: number; // percentage
  avgDealSize: number;
  commonObjections: string[];
  preventionStrategies: string[];
}

export interface CompetitiveIntelligence {
  competitor: string;
  lossCount: number;
  winCount: number;
  winRate: number; // percentage
  avgDealSize: number;
  commonObjections: string[];
  winningStrategies: string[];
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface WinLossAnalysisResult {
  organizationId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalDeals: number;
    wins: number;
    losses: number;
    winRate: number;
    avgWinDealSize: number;
    avgLossDealSize: number;
    avgSalesCycleWin: number;
    avgSalesCycleLoss: number;
  };
  winningPatterns: WinningPattern[];
  losingPatterns: LosingPattern[];
  competitiveIntelligence: CompetitiveIntelligence[];
  topObjections: Array<{ objection: string; count: number; category: string }>;
  recommendations: string[];
  trendAnalysis: {
    winRateTrend: 'improving' | 'stable' | 'declining';
    dealSizeTrend: 'growing' | 'stable' | 'shrinking';
    salesCycleTrend: 'faster' | 'stable' | 'slower';
  };
}

export interface DealOutcomePredictor {
  dealId: string;
  predictedOutcome: 'win' | 'loss';
  confidence: number; // 0-100
  winProbability: number; // 0-100
  lossProbability: number; // 0-100
  keyFactors: Array<{
    factor: string;
    impact: number; // -100 to 100
    category: string;
  }>;
  similarDeals: Array<{
    dealId: string;
    dealName: string;
    outcome: WinLossOutcome;
    similarity: number; // 0-100
  }>;
  recommendations: string[];
}

// ====================================
// Win-Loss Analysis Service
// ====================================

export class WinLossAnalysisService {
  private prisma: PrismaClient;
  private redis: Redis;
  private openai: OpenAI;

  constructor(prisma: PrismaClient, redis: Redis, openai: OpenAI) {
    this.prisma = prisma;
    this.redis = redis;
    this.openai = openai;
  }

  /**
   * Analyze win-loss patterns for an organization
   */
  async analyzeWinLossPatterns(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WinLossAnalysisResult> {
    try {
      logger.info('Analyzing win-loss patterns', { organizationId });

      // Check cache
      const cacheKey = `winloss:analysis:${organizationId}:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Set default date range if not provided (last 90 days)
      if (!endDate) {
        endDate = new Date();
      }
      if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
      }

      // Fetch win-loss data with related deals and meetings
      const winLosses = await this.prisma.winLoss.findMany({
        where: {
          organizationId,
          closedDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          deal: {
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
              },
              scorecards: true,
            },
          },
        },
        orderBy: { closedDate: 'desc' },
      });

      // Calculate summary statistics
      const summary = this.calculateSummary(winLosses);

      // Identify winning patterns
      const winningPatterns = await this.identifyWinningPatterns(
        winLosses.filter((w) => w.outcome === 'won')
      );

      // Identify losing patterns
      const losingPatterns = await this.identifyLosingPatterns(
        winLosses.filter((w) => w.outcome === 'lost')
      );

      // Analyze competitive intelligence
      const competitiveIntelligence = await this.analyzeCompetitors(winLosses);

      // Extract top objections
      const topObjections = this.extractTopObjections(winLosses);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        winningPatterns,
        losingPatterns,
        competitiveIntelligence,
        summary
      );

      // Analyze trends
      const trendAnalysis = await this.analyzeTrends(organizationId, startDate, endDate);

      const result: WinLossAnalysisResult = {
        organizationId,
        period: { startDate, endDate },
        summary,
        winningPatterns,
        losingPatterns,
        competitiveIntelligence,
        topObjections,
        recommendations,
        trendAnalysis,
      };

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

      logger.info('Win-loss analysis complete', {
        organizationId,
        totalDeals: summary.totalDeals,
        winRate: summary.winRate,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing win-loss patterns', { error, organizationId });
      throw error;
    }
  }

  /**
   * Identify winning patterns using AI and statistical analysis
   */
  async identifyWinningPatterns(wins: any[]): Promise<WinningPattern[]> {
    try {
      if (wins.length === 0) return [];

      // Group by common characteristics
      const patterns: Map<string, any[]> = new Map();

      // Analyze using AI
      const winReasons = wins.map((w) => w.winReason).filter(Boolean);
      const dealData = wins.map((w) => ({
        dealSize: w.dealAmount || 0,
        salesCycle: this.calculateSalesCycle(w.deal),
        stakeholders: w.deal.meetings?.length || 0,
        industry: w.deal.customFields?.industry || 'unknown',
      }));

      let aiPatterns: WinningPattern[] = [];

      if (winReasons.length > 0) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are a sales intelligence AI. Analyze winning patterns from closed-won deals.
                Identify common tactics, strategies, and replicable actions that led to wins.
                Return a JSON array of patterns with format:
                [{"pattern": "...", "keyTactics": [...], "replicableActions": [...]}]`,
              },
              {
                role: 'user',
                content: `Analyze these ${wins.length} won deals:\nReasons: ${JSON.stringify(winReasons)}\nData: ${JSON.stringify(dealData)}`,
              },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });

          const aiResult = JSON.parse(response.choices[0].message.content || '{"patterns":[]}');
          aiPatterns = (aiResult.patterns || []).map((p: any) => ({
            pattern: p.pattern,
            winRate: 100,
            avgDealSize: dealData.reduce((sum, d) => sum + d.dealSize, 0) / dealData.length,
            avgSalesCycle: dealData.reduce((sum, d) => sum + d.salesCycle, 0) / dealData.length,
            keyTactics: p.keyTactics || [],
            replicableActions: p.replicableActions || [],
          }));
        } catch (aiError) {
          logger.warn('AI pattern identification failed, using heuristics', { aiError });
        }
      }

      // Fallback: Statistical patterns
      if (aiPatterns.length === 0) {
        // Group by deal size ranges
        const largeDealWins = wins.filter((w) => (w.dealAmount || 0) > 50000);
        if (largeDealWins.length >= 3) {
          aiPatterns.push({
            pattern: 'Enterprise deals with executive engagement',
            winRate: (largeDealWins.length / wins.length) * 100,
            avgDealSize: largeDealWins.reduce((sum, w) => sum + (w.dealAmount || 0), 0) / largeDealWins.length,
            avgSalesCycle: largeDealWins.reduce((sum, w) => sum + this.calculateSalesCycle(w.deal), 0) / largeDealWins.length,
            keyTactics: ['Executive sponsorship', 'Business case development', 'Multi-stakeholder engagement'],
            replicableActions: ['Schedule executive briefing', 'Develop ROI calculator', 'Map stakeholder influence'],
          });
        }
      }

      return aiPatterns.slice(0, 5); // Top 5 patterns
    } catch (error) {
      logger.error('Error identifying winning patterns', { error });
      return [];
    }
  }

  /**
   * Identify losing patterns
   */
  async identifyLosingPatterns(losses: any[]): Promise<LosingPattern[]> {
    try {
      if (losses.length === 0) return [];

      // Extract loss reasons
      const lossReasons = losses.map((l) => l.lostReason).filter(Boolean);
      const objections = losses.flatMap((l) => l.keyObjections || []);

      let aiPatterns: LosingPattern[] = [];

      if (lossReasons.length > 0) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are a sales intelligence AI. Analyze losing patterns from closed-lost deals.
                Identify common objections, failure points, and prevention strategies.
                Return a JSON array of patterns with format:
                [{"pattern": "...", "commonObjections": [...], "preventionStrategies": [...]}]`,
              },
              {
                role: 'user',
                content: `Analyze these ${losses.length} lost deals:\nReasons: ${JSON.stringify(lossReasons)}\nObjections: ${JSON.stringify(objections)}`,
              },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });

          const aiResult = JSON.parse(response.choices[0].message.content || '{"patterns":[]}');
          aiPatterns = (aiResult.patterns || []).map((p: any) => ({
            pattern: p.pattern,
            lossRate: (losses.length / (losses.length + 1)) * 100,
            avgDealSize: losses.reduce((sum, l) => sum + (l.dealAmount || 0), 0) / losses.length,
            commonObjections: p.commonObjections || [],
            preventionStrategies: p.preventionStrategies || [],
          }));
        } catch (aiError) {
          logger.warn('AI losing pattern identification failed', { aiError });
        }
      }

      // Fallback: Extract common objections
      if (aiPatterns.length === 0) {
        const objectionCounts = new Map<string, number>();
        objections.forEach((obj) => {
          const objStr = typeof obj === 'string' ? obj : JSON.stringify(obj);
          objectionCounts.set(objStr, (objectionCounts.get(objStr) || 0) + 1);
        });

        const topObjections = Array.from(objectionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([obj]) => obj);

        if (topObjections.length > 0) {
          aiPatterns.push({
            pattern: 'Price and budget concerns',
            lossRate: (losses.length / (losses.length + 1)) * 100,
            avgDealSize: losses.reduce((sum, l) => sum + (l.dealAmount || 0), 0) / losses.length,
            commonObjections: topObjections,
            preventionStrategies: [
              'Establish budget early in qualification',
              'Demonstrate ROI with concrete examples',
              'Offer flexible payment terms',
            ],
          });
        }
      }

      return aiPatterns.slice(0, 5);
    } catch (error) {
      logger.error('Error identifying losing patterns', { error });
      return [];
    }
  }

  /**
   * Analyze competitive intelligence
   */
  async analyzeCompetitors(winLosses: any[]): Promise<CompetitiveIntelligence[]> {
    try {
      const competitorMap = new Map<string, any>();

      winLosses.forEach((wl) => {
        if (wl.competitorName) {
          const competitor = wl.competitorName;
          if (!competitorMap.has(competitor)) {
            competitorMap.set(competitor, {
              competitor,
              wins: 0,
              losses: 0,
              totalDealSize: 0,
              dealCount: 0,
              objections: [],
            });
          }

          const data = competitorMap.get(competitor);
          if (wl.outcome === 'won') {
            data.wins++;
          } else {
            data.losses++;
          }
          data.totalDealSize += wl.dealAmount || 0;
          data.dealCount++;
          if (wl.keyObjections) {
            data.objections.push(...wl.keyObjections);
          }
        }
      });

      const intelligence: CompetitiveIntelligence[] = Array.from(competitorMap.values()).map((data) => {
        const totalDeals = data.wins + data.losses;
        const winRate = totalDeals > 0 ? (data.wins / totalDeals) * 100 : 0;
        const avgDealSize = data.dealCount > 0 ? data.totalDealSize / data.dealCount : 0;

        // Determine threat level
        let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (data.losses >= 5 && winRate < 30) threatLevel = 'critical';
        else if (data.losses >= 3 && winRate < 50) threatLevel = 'high';
        else if (data.losses >= 2) threatLevel = 'medium';

        // Extract common objections (top 3)
        const objectionCounts = new Map<string, number>();
        data.objections.forEach((obj: any) => {
          const objStr = typeof obj === 'string' ? obj : JSON.stringify(obj);
          objectionCounts.set(objStr, (objectionCounts.get(objStr) || 0) + 1);
        });

        const commonObjections = Array.from(objectionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([obj]) => obj);

        return {
          competitor: data.competitor,
          lossCount: data.losses,
          winCount: data.wins,
          winRate: Math.round(winRate),
          avgDealSize: Math.round(avgDealSize),
          commonObjections,
          winningStrategies: this.generateCompetitiveStrategies(data.competitor, winRate),
          threatLevel,
        };
      });

      // Sort by threat level and loss count
      return intelligence.sort((a, b) => {
        const threatOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const threatDiff = threatOrder[b.threatLevel] - threatOrder[a.threatLevel];
        if (threatDiff !== 0) return threatDiff;
        return b.lossCount - a.lossCount;
      });
    } catch (error) {
      logger.error('Error analyzing competitors', { error });
      return [];
    }
  }

  /**
   * Predict deal outcome using historical patterns
   */
  async predictDealOutcome(
    dealId: string,
    organizationId: string
  ): Promise<DealOutcomePredictor> {
    try {
      logger.info('Predicting deal outcome', { dealId });

      // Get deal with full context
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
          },
          scorecards: true,
          owner: true,
        },
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      // Get historical win-loss data for comparison
      const historicalDeals = await this.prisma.winLoss.findMany({
        where: { organizationId },
        include: {
          deal: {
            include: {
              meetings: true,
              scorecards: true,
            },
          },
        },
        orderBy: { closedDate: 'desc' },
        take: 100,
      });

      // Calculate features for current deal
      const currentFeatures = this.extractDealFeatures(deal);

      // Find similar deals
      const similarDeals = this.findSimilarDeals(currentFeatures, historicalDeals);

      // Calculate win probability based on similar deals
      const similarWins = similarDeals.filter((d) => d.outcome === 'won').length;
      const winProbability = similarDeals.length > 0 ? (similarWins / similarDeals.length) * 100 : 50;

      // Identify key factors
      const keyFactors = this.identifyKeyFactors(currentFeatures, historicalDeals);

      // Generate recommendations
      const recommendations = this.generatePredictionRecommendations(
        winProbability,
        keyFactors,
        similarDeals
      );

      return {
        dealId,
        predictedOutcome: winProbability >= 50 ? 'win' : 'loss',
        confidence: Math.abs(winProbability - 50) * 2, // 0-100 scale
        winProbability: Math.round(winProbability),
        lossProbability: Math.round(100 - winProbability),
        keyFactors,
        similarDeals: similarDeals.slice(0, 5).map((d) => ({
          dealId: d.deal.id,
          dealName: d.deal.name,
          outcome: d.outcome,
          similarity: d.similarity,
        })),
        recommendations,
      };
    } catch (error) {
      logger.error('Error predicting deal outcome', { error, dealId });
      throw error;
    }
  }

  // ====================================
  // Helper Methods
  // ====================================

  private calculateSummary(winLosses: any[]): any {
    const wins = winLosses.filter((w) => w.outcome === 'won');
    const losses = winLosses.filter((w) => w.outcome === 'lost');

    const totalDeals = winLosses.length;
    const winCount = wins.length;
    const lossCount = losses.length;
    const winRate = totalDeals > 0 ? (winCount / totalDeals) * 100 : 0;

    const avgWinDealSize = wins.length > 0
      ? wins.reduce((sum, w) => sum + (w.dealAmount || 0), 0) / wins.length
      : 0;

    const avgLossDealSize = losses.length > 0
      ? losses.reduce((sum, l) => sum + (l.dealAmount || 0), 0) / losses.length
      : 0;

    const avgSalesCycleWin = wins.length > 0
      ? wins.reduce((sum, w) => sum + this.calculateSalesCycle(w.deal), 0) / wins.length
      : 0;

    const avgSalesCycleLoss = losses.length > 0
      ? losses.reduce((sum, l) => sum + this.calculateSalesCycle(l.deal), 0) / losses.length
      : 0;

    return {
      totalDeals,
      wins: winCount,
      losses: lossCount,
      winRate: Math.round(winRate * 100) / 100,
      avgWinDealSize: Math.round(avgWinDealSize),
      avgLossDealSize: Math.round(avgLossDealSize),
      avgSalesCycleWin: Math.round(avgSalesCycleWin),
      avgSalesCycleLoss: Math.round(avgSalesCycleLoss),
    };
  }

  private calculateSalesCycle(deal: Deal): number {
    if (!deal.actualCloseDate) return 0;
    const created = new Date(deal.createdAt);
    const closed = new Date(deal.actualCloseDate);
    return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  private extractTopObjections(winLosses: any[]): Array<{ objection: string; count: number; category: string }> {
    const objectionCounts = new Map<string, number>();

    winLosses.forEach((wl) => {
      if (Array.isArray(wl.keyObjections)) {
        wl.keyObjections.forEach((obj: any) => {
          const objStr = typeof obj === 'string' ? obj : JSON.stringify(obj);
          objectionCounts.set(objStr, (objectionCounts.get(objStr) || 0) + 1);
        });
      }
    });

    return Array.from(objectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([objection, count]) => ({
        objection,
        count,
        category: this.categorizeObjection(objection),
      }));
  }

  private categorizeObjection(objection: string): string {
    const lower = objection.toLowerCase();
    if (lower.includes('price') || lower.includes('cost') || lower.includes('budget')) return 'price';
    if (lower.includes('feature') || lower.includes('functionality')) return 'product';
    if (lower.includes('competitor') || lower.includes('alternative')) return 'competition';
    if (lower.includes('timing') || lower.includes('now')) return 'timing';
    return 'other';
  }

  private async generateRecommendations(
    winningPatterns: WinningPattern[],
    losingPatterns: LosingPattern[],
    competitiveIntelligence: CompetitiveIntelligence[],
    summary: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Win rate recommendations
    if (summary.winRate < 30) {
      recommendations.push('Critical: Win rate below 30% - Review qualification criteria and sales process');
    } else if (summary.winRate < 50) {
      recommendations.push('Opportunity: Win rate below 50% - Focus on implementing winning patterns');
    }

    // Winning patterns
    if (winningPatterns.length > 0) {
      const topPattern = winningPatterns[0];
      recommendations.push(`Replicate success: ${topPattern.pattern} - ${topPattern.replicableActions[0]}`);
    }

    // Losing patterns
    if (losingPatterns.length > 0) {
      const topLoss = losingPatterns[0];
      recommendations.push(`Address weakness: ${topLoss.pattern} - ${topLoss.preventionStrategies[0]}`);
    }

    // Competitive threats
    const criticalCompetitors = competitiveIntelligence.filter((c) => c.threatLevel === 'critical' || c.threatLevel === 'high');
    if (criticalCompetitors.length > 0) {
      recommendations.push(`Competitive alert: Strengthen positioning against ${criticalCompetitors[0].competitor}`);
    }

    // Sales cycle optimization
    if (summary.avgSalesCycleWin > summary.avgSalesCycleLoss) {
      recommendations.push('Optimize sales cycle: Won deals taking longer than lost deals - streamline processes');
    }

    return recommendations.slice(0, 5);
  }

  private async analyzeTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Compare with previous period
    const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - periodDays);

    const currentPeriod = await this.prisma.winLoss.findMany({
      where: {
        organizationId,
        closedDate: { gte: startDate, lte: endDate },
      },
    });

    const previousPeriod = await this.prisma.winLoss.findMany({
      where: {
        organizationId,
        closedDate: { gte: previousStart, lt: startDate },
      },
    });

    const currentWinRate = currentPeriod.length > 0
      ? (currentPeriod.filter((w) => w.outcome === 'won').length / currentPeriod.length) * 100
      : 0;

    const previousWinRate = previousPeriod.length > 0
      ? (previousPeriod.filter((w) => w.outcome === 'won').length / previousPeriod.length) * 100
      : 0;

    const winRateTrend = currentWinRate > previousWinRate + 5 ? 'improving'
      : currentWinRate < previousWinRate - 5 ? 'declining'
      : 'stable';

    return {
      winRateTrend,
      dealSizeTrend: 'stable', // Simplified
      salesCycleTrend: 'stable', // Simplified
    };
  }

  private extractDealFeatures(deal: any): any {
    return {
      amount: deal.amount || 0,
      stage: deal.stage,
      meetingCount: deal.meetings?.length || 0,
      participantCount: deal.meetings?.reduce((sum: number, dm: any) => sum + (dm.meeting.participantCount || 0), 0) || 0,
      salesCycle: this.calculateSalesCycle(deal),
      scorecardAvg: deal.scorecards?.length > 0
        ? deal.scorecards.reduce((sum: number, s: any) => sum + (s.overallScore || 0), 0) / deal.scorecards.length
        : 0,
    };
  }

  private findSimilarDeals(features: any, historicalDeals: any[]): any[] {
    return historicalDeals
      .map((wl) => {
        const dealFeatures = this.extractDealFeatures(wl.deal);
        const similarity = this.calculateSimilarity(features, dealFeatures);
        return { ...wl, similarity };
      })
      .filter((d) => d.similarity > 50)
      .sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSimilarity(features1: any, features2: any): number {
    let similarity = 100;

    // Amount similarity
    const amountDiff = Math.abs(features1.amount - features2.amount);
    const amountPenalty = Math.min((amountDiff / Math.max(features1.amount, features2.amount)) * 50, 50);
    similarity -= amountPenalty;

    // Meeting count similarity
    const meetingDiff = Math.abs(features1.meetingCount - features2.meetingCount);
    similarity -= Math.min(meetingDiff * 5, 20);

    // Sales cycle similarity
    const cycleDiff = Math.abs(features1.salesCycle - features2.salesCycle);
    similarity -= Math.min(cycleDiff / 10, 20);

    return Math.max(0, similarity);
  }

  private identifyKeyFactors(features: any, historicalDeals: any[]): Array<{
    factor: string;
    impact: number;
    category: string;
  }> {
    const factors: Array<{ factor: string; impact: number; category: string }> = [];

    // Analyze deal size impact
    const avgWinSize = historicalDeals
      .filter((w) => w.outcome === 'won')
      .reduce((sum, w) => sum + (w.dealAmount || 0), 0) / Math.max(historicalDeals.filter((w) => w.outcome === 'won').length, 1);

    if (features.amount > avgWinSize) {
      factors.push({
        factor: 'Deal size above average for wins',
        impact: 20,
        category: 'deal_size',
      });
    } else {
      factors.push({
        factor: 'Deal size below average for wins',
        impact: -10,
        category: 'deal_size',
      });
    }

    // Meeting engagement
    if (features.meetingCount >= 3) {
      factors.push({
        factor: 'Strong meeting engagement',
        impact: 25,
        category: 'engagement',
      });
    } else if (features.meetingCount <= 1) {
      factors.push({
        factor: 'Low meeting engagement',
        impact: -30,
        category: 'engagement',
      });
    }

    // Scorecard performance
    if (features.scorecardAvg > 70) {
      factors.push({
        factor: 'High sales performance scores',
        impact: 30,
        category: 'performance',
      });
    } else if (features.scorecardAvg < 50 && features.scorecardAvg > 0) {
      factors.push({
        factor: 'Low sales performance scores',
        impact: -25,
        category: 'performance',
      });
    }

    return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5);
  }

  private generatePredictionRecommendations(
    winProbability: number,
    keyFactors: any[],
    similarDeals: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (winProbability < 30) {
      recommendations.push('High risk of loss - Consider re-qualifying this opportunity');
    } else if (winProbability < 50) {
      recommendations.push('Below 50% win probability - Focus on addressing risk factors');
    } else if (winProbability > 70) {
      recommendations.push('High probability of win - Maintain momentum and close proactively');
    }

    // Factor-based recommendations
    keyFactors.forEach((factor) => {
      if (factor.impact < -20) {
        recommendations.push(`Address: ${factor.factor}`);
      }
    });

    return recommendations.slice(0, 5);
  }

  private generateCompetitiveStrategies(competitor: string, winRate: number): string[] {
    const strategies: string[] = [];

    if (winRate < 30) {
      strategies.push(`Strengthen differentiation against ${competitor}`);
      strategies.push('Develop competitive battle cards');
      strategies.push('Focus on unique value propositions');
    } else if (winRate < 50) {
      strategies.push(`Improve win rate against ${competitor}`);
      strategies.push('Highlight competitive advantages early');
    } else {
      strategies.push(`Maintain strong position against ${competitor}`);
    }

    return strategies;
  }
}

// Export singleton instance
export const winLossAnalysisService = new WinLossAnalysisService(prisma, redis, openai);
export default WinLossAnalysisService;
