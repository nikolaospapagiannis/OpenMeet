/**
 * Forecast Accuracy Service (GAP #2)
 * Enterprise P0 blocker - Forecast accuracy improvement and pipeline health
 * Competing with Gong/Chorus for revenue intelligence
 */

import { PrismaClient, Deal, DealStage } from '@prisma/client';
import winston from 'winston';
import Redis from 'ioredis';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'forecast-accuracy' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// ====================================
// Types and Interfaces
// ====================================

export interface PipelineHealthMetrics {
  organizationId: string;
  asOfDate: Date;
  overallHealth: number; // 0-100
  healthLevel: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  metrics: {
    totalPipelineValue: number;
    weightedPipelineValue: number;
    dealCount: number;
    averageDealSize: number;
    conversionRate: number;
    averageSalesCycle: number;
    pipelineCoverage: number; // ratio to quota
    pipelineVelocity: number; // deals moving forward per week
  };
  byStage: Array<{
    stage: DealStage;
    dealCount: number;
    totalValue: number;
    averageAge: number; // days in stage
    conversionRate: number;
    stuckDeals: number; // deals aged > 30 days in stage
  }>;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    recommendation: string;
  }>;
  trends: {
    pipelineGrowth: number; // percentage change from last period
    velocityChange: number; // percentage change from last period
    conversionTrend: 'improving' | 'stable' | 'declining';
  };
}

export interface ForecastAccuracyMetrics {
  organizationId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  accuracy: {
    overall: number; // 0-100
    byStage: Record<DealStage, number>;
    trend: 'improving' | 'stable' | 'declining';
  };
  forecast: {
    predicted: number;
    actual: number;
    variance: number; // percentage
    varianceAmount: number;
  };
  dealProgression: {
    expected: number; // deals that should have closed
    actual: number; // deals that actually closed
    slipped: number; // deals that pushed out
    lost: number; // deals that were lost
    accelerated: number; // deals that closed early
  };
  recommendations: string[];
  historicalAccuracy: Array<{
    period: string;
    accuracy: number;
    predicted: number;
    actual: number;
  }>;
}

export interface DealProgressionTracking {
  dealId: string;
  dealName: string;
  currentStage: DealStage;
  expectedCloseDate?: Date;
  probabilityScore: number; // 0-100
  velocityScore: number; // 0-100 (speed of progression)
  healthScore: number; // 0-100
  progression: Array<{
    stage: DealStage;
    enteredAt: Date;
    exitedAt?: Date;
    daysInStage: number;
    expectedDays: number;
    status: 'on_track' | 'delayed' | 'accelerated';
  }>;
  predictedCloseDate: Date;
  confidenceLevel: number; // 0-100
  riskFactors: string[];
  recommendations: string[];
}

export interface ForecastInput {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  includedStages?: DealStage[];
  minProbability?: number;
}

export interface ForecastOutput {
  periodStart: Date;
  periodEnd: Date;
  forecastedRevenue: number;
  conservativeEstimate: number; // 10th percentile
  likelyEstimate: number; // 50th percentile
  optimisticEstimate: number; // 90th percentile
  dealCount: number;
  confidence: number; // 0-100
  breakdown: {
    byStage: Array<{
      stage: DealStage;
      dealCount: number;
      revenue: number;
      probability: number;
    }>;
    byOwner: Array<{
      ownerId: string;
      ownerName: string;
      dealCount: number;
      revenue: number;
    }>;
  };
  assumptions: string[];
  risks: string[];
}

// ====================================
// Forecast Accuracy Service
// ====================================

export class ForecastAccuracyService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Calculate pipeline health metrics
   */
  async calculatePipelineHealth(
    organizationId: string
  ): Promise<PipelineHealthMetrics> {
    try {
      logger.info('Calculating pipeline health', { organizationId });

      // Check cache
      const cacheKey = `pipeline-health:${organizationId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get all active deals
      const deals = await this.prisma.deal.findMany({
        where: {
          organizationId,
          stage: {
            notIn: ['closed_won', 'closed_lost'],
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          meetings: {
            include: {
              meeting: true,
            },
          },
          winLoss: true,
        },
      });

      // Calculate overall metrics
      const totalPipelineValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
      const weightedPipelineValue = deals.reduce(
        (sum, d) => sum + (d.amount || 0) * (d.probability / 100),
        0
      );
      const averageDealSize = deals.length > 0 ? totalPipelineValue / deals.length : 0;

      // Calculate conversion rate (from historical data)
      const conversionRate = await this.calculateConversionRate(organizationId);

      // Calculate average sales cycle
      const closedDeals = await this.prisma.deal.findMany({
        where: {
          organizationId,
          stage: {
            in: ['closed_won', 'closed_lost'],
          },
          actualCloseDate: {
            not: null,
          },
        },
        take: 50,
        orderBy: { actualCloseDate: 'desc' },
      });

      const averageSalesCycle = this.calculateAverageSalesCycle(closedDeals);

      // Calculate pipeline velocity
      const velocity = await this.calculatePipelineVelocity(organizationId);

      // Analyze by stage
      const byStage = await this.analyzeByStage(deals, organizationId);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(deals, byStage, {
        conversionRate,
        velocity,
        averageSalesCycle,
      });

      // Calculate trends
      const trends = await this.calculatePipelineTrends(organizationId);

      // Calculate overall health score
      const overallHealth = this.calculateOverallHealth({
        pipelineValue: totalPipelineValue,
        dealCount: deals.length,
        conversionRate,
        velocity,
        stageHealth: byStage,
        riskCount: riskFactors.filter((r) => r.severity === 'high' || r.severity === 'critical').length,
      });

      const healthLevel = this.getHealthLevel(overallHealth);

      const health: PipelineHealthMetrics = {
        organizationId,
        asOfDate: new Date(),
        overallHealth,
        healthLevel,
        metrics: {
          totalPipelineValue: Math.round(totalPipelineValue),
          weightedPipelineValue: Math.round(weightedPipelineValue),
          dealCount: deals.length,
          averageDealSize: Math.round(averageDealSize),
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageSalesCycle: Math.round(averageSalesCycle),
          pipelineCoverage: this.calculatePipelineCoverage(weightedPipelineValue, organizationId),
          pipelineVelocity: Math.round(velocity * 10) / 10,
        },
        byStage,
        riskFactors,
        trends,
      };

      // Cache for 30 minutes
      await this.redis.setex(cacheKey, 1800, JSON.stringify(health));

      logger.info('Pipeline health calculated', {
        organizationId,
        health: overallHealth,
        level: healthLevel,
      });

      return health;
    } catch (error) {
      logger.error('Error calculating pipeline health', { error, organizationId });
      throw error;
    }
  }

  /**
   * Calculate forecast accuracy
   */
  async calculateForecastAccuracy(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ForecastAccuracyMetrics> {
    try {
      logger.info('Calculating forecast accuracy', { organizationId, startDate, endDate });

      // Get deals that were expected to close in this period
      const expectedDeals = await this.prisma.deal.findMany({
        where: {
          organizationId,
          expectedCloseDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          winLoss: true,
        },
      });

      // Calculate predictions vs actuals
      const predicted = expectedDeals.reduce((sum, d) => sum + (d.amount || 0) * (d.probability / 100), 0);

      const actualWins = expectedDeals.filter((d) => d.stage === 'closed_won');
      const actual = actualWins.reduce((sum, d) => sum + (d.amount || 0), 0);

      const variance = predicted > 0 ? ((actual - predicted) / predicted) * 100 : 0;
      const accuracy = Math.max(0, 100 - Math.abs(variance));

      // Track deal progression
      const slipped = expectedDeals.filter(
        (d) =>
          d.stage !== 'closed_won' &&
          d.stage !== 'closed_lost' &&
          d.expectedCloseDate &&
          new Date(d.expectedCloseDate) < endDate
      ).length;

      const lost = expectedDeals.filter((d) => d.stage === 'closed_lost').length;

      const accelerated = actualWins.filter(
        (d) =>
          d.actualCloseDate &&
          d.expectedCloseDate &&
          new Date(d.actualCloseDate) < new Date(d.expectedCloseDate)
      ).length;

      // Calculate accuracy by stage
      const byStage: Record<string, number> = {};
      Object.values(DealStage).forEach((stage) => {
        const stageDeals = expectedDeals.filter(
          (d) => d.stage === stage || (d.winLoss && d.stage === 'closed_won')
        );
        const stagePredicted = stageDeals.reduce((sum, d) => sum + (d.amount || 0) * (d.probability / 100), 0);
        const stageActual = stageDeals.filter((d) => d.stage === 'closed_won').reduce((sum, d) => sum + (d.amount || 0), 0);
        const stageVariance = stagePredicted > 0 ? Math.abs((stageActual - stagePredicted) / stagePredicted) * 100 : 0;
        byStage[stage] = Math.max(0, 100 - stageVariance);
      });

      // Generate recommendations
      const recommendations = this.generateForecastRecommendations({
        accuracy,
        variance,
        slipped,
        lost,
        expectedCount: expectedDeals.length,
        actualCount: actualWins.length,
      });

      // Get historical accuracy
      const historicalAccuracy = await this.getHistoricalAccuracy(organizationId, 6);

      // Determine trend
      const trend = this.determineTrend(accuracy, historicalAccuracy);

      const metrics: ForecastAccuracyMetrics = {
        organizationId,
        period: { startDate, endDate },
        accuracy: {
          overall: Math.round(accuracy),
          byStage: byStage as Record<DealStage, number>,
          trend,
        },
        forecast: {
          predicted: Math.round(predicted),
          actual: Math.round(actual),
          variance: Math.round(variance * 100) / 100,
          varianceAmount: Math.round(actual - predicted),
        },
        dealProgression: {
          expected: expectedDeals.length,
          actual: actualWins.length,
          slipped,
          lost,
          accelerated,
        },
        recommendations,
        historicalAccuracy,
      };

      logger.info('Forecast accuracy calculated', {
        organizationId,
        accuracy: metrics.accuracy.overall,
        variance: metrics.forecast.variance,
      });

      return metrics;
    } catch (error) {
      logger.error('Error calculating forecast accuracy', { error, organizationId });
      throw error;
    }
  }

  /**
   * Track deal progression
   */
  async trackDealProgression(
    dealId: string,
    organizationId: string
  ): Promise<DealProgressionTracking> {
    try {
      logger.info('Tracking deal progression', { dealId });

      const deal = await this.prisma.deal.findFirst({
        where: { id: dealId, organizationId },
        include: {
          meetings: {
            include: {
              meeting: {
                include: {
                  analytics: true,
                },
              },
            },
          },
          scorecards: true,
        },
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      // Calculate progression metrics
      const daysInCurrentStage = this.calculateDaysInStage(deal);
      const expectedDaysInStage = await this.getExpectedDaysInStage(deal.stage, organizationId);

      const velocityScore = this.calculateVelocityScore(daysInCurrentStage, expectedDaysInStage);
      const probabilityScore = deal.probability;
      const healthScore = await this.calculateDealHealthScore(deal);

      // Build progression timeline (simplified - would need stage change tracking)
      const progression: any[] = [
        {
          stage: deal.stage,
          enteredAt: deal.createdAt,
          exitedAt: undefined,
          daysInStage: daysInCurrentStage,
          expectedDays: expectedDaysInStage,
          status: velocityScore > 70 ? 'on_track' : velocityScore > 40 ? 'delayed' : 'accelerated',
        },
      ];

      // Predict close date
      const predictedCloseDate = this.predictCloseDate(deal, velocityScore);

      // Identify risk factors
      const riskFactors: string[] = [];
      if (velocityScore < 50) riskFactors.push('Deal moving slowly through pipeline');
      if (deal.meetings.length < 2) riskFactors.push('Insufficient customer engagement');
      if (probabilityScore < 50) riskFactors.push('Low win probability');
      if (healthScore < 50) riskFactors.push('Poor deal health indicators');

      // Generate recommendations
      const recommendations = this.generateProgressionRecommendations(
        velocityScore,
        probabilityScore,
        healthScore,
        deal
      );

      // Calculate confidence
      const confidenceLevel = this.calculateConfidenceLevel({
        velocityScore,
        probabilityScore,
        healthScore,
        meetingCount: deal.meetings.length,
      });

      return {
        dealId,
        dealName: deal.name,
        currentStage: deal.stage,
        expectedCloseDate: deal.expectedCloseDate || undefined,
        probabilityScore,
        velocityScore,
        healthScore,
        progression,
        predictedCloseDate,
        confidenceLevel,
        riskFactors,
        recommendations,
      };
    } catch (error) {
      logger.error('Error tracking deal progression', { error, dealId });
      throw error;
    }
  }

  /**
   * Generate revenue forecast
   */
  async generateForecast(input: ForecastInput): Promise<ForecastOutput> {
    try {
      logger.info('Generating forecast', { organizationId: input.organizationId });

      const { organizationId, periodStart, periodEnd, includedStages, minProbability } = input;

      // Get deals expected to close in period
      const deals = await this.prisma.deal.findMany({
        where: {
          organizationId,
          expectedCloseDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          stage: includedStages ? { in: includedStages } : { notIn: ['closed_lost'] },
          probability: minProbability ? { gte: minProbability } : undefined,
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Calculate forecasted revenue (probability-weighted)
      const forecastedRevenue = deals.reduce((sum, d) => sum + (d.amount || 0) * (d.probability / 100), 0);

      // Calculate percentile estimates
      const sortedDeals = [...deals].sort((a, b) => (a.probability || 0) - (b.probability || 0));

      const conservativeDeals = sortedDeals.filter((d) => (d.probability || 0) >= 70);
      const conservativeEstimate = conservativeDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

      const likelyDeals = sortedDeals.filter((d) => (d.probability || 0) >= 50);
      const likelyEstimate = likelyDeals.reduce((sum, d) => sum + (d.amount || 0) * (d.probability / 100), 0);

      const optimisticEstimate = deals.reduce((sum, d) => sum + (d.amount || 0), 0);

      // Breakdown by stage
      const stageMap = new Map<DealStage, any[]>();
      deals.forEach((d) => {
        if (!stageMap.has(d.stage)) {
          stageMap.set(d.stage, []);
        }
        stageMap.get(d.stage)!.push(d);
      });

      const byStage = Array.from(stageMap.entries()).map(([stage, stageDeals]) => ({
        stage,
        dealCount: stageDeals.length,
        revenue: Math.round(stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0)),
        probability: Math.round(
          stageDeals.reduce((sum, d) => sum + (d.probability || 0), 0) / stageDeals.length
        ),
      }));

      // Breakdown by owner
      const ownerMap = new Map<string, any>();
      deals.forEach((d) => {
        if (d.ownerId) {
          if (!ownerMap.has(d.ownerId)) {
            ownerMap.set(d.ownerId, {
              ownerId: d.ownerId,
              ownerName: d.owner ? `${d.owner.firstName || ''} ${d.owner.lastName || ''}`.trim() : 'Unknown',
              deals: [],
            });
          }
          ownerMap.get(d.ownerId).deals.push(d);
        }
      });

      const byOwner = Array.from(ownerMap.values()).map((owner) => ({
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        dealCount: owner.deals.length,
        revenue: Math.round(owner.deals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)),
      }));

      // Calculate confidence based on historical accuracy
      const historicalAccuracy = await this.getHistoricalAccuracy(organizationId, 3);
      const avgAccuracy = historicalAccuracy.length > 0
        ? historicalAccuracy.reduce((sum, h) => sum + h.accuracy, 0) / historicalAccuracy.length
        : 70;

      const confidence = Math.round(avgAccuracy);

      // Generate assumptions and risks
      const assumptions = [
        `Based on ${deals.length} deals in pipeline`,
        `Using probability-weighted forecast methodology`,
        `Historical forecast accuracy: ${confidence}%`,
      ];

      const risks = [];
      if (deals.length < 10) risks.push('Low deal count may impact forecast reliability');
      if (confidence < 70) risks.push('Historical forecast accuracy below 70%');
      const highValueDeals = deals.filter((d) => (d.amount || 0) > forecastedRevenue / deals.length * 2);
      if (highValueDeals.length > 0) risks.push(`${highValueDeals.length} large deals create forecast concentration risk`);

      return {
        periodStart,
        periodEnd,
        forecastedRevenue: Math.round(forecastedRevenue),
        conservativeEstimate: Math.round(conservativeEstimate),
        likelyEstimate: Math.round(likelyEstimate),
        optimisticEstimate: Math.round(optimisticEstimate),
        dealCount: deals.length,
        confidence,
        breakdown: {
          byStage,
          byOwner,
        },
        assumptions,
        risks,
      };
    } catch (error) {
      logger.error('Error generating forecast', { error });
      throw error;
    }
  }

  // ====================================
  // Helper Methods
  // ====================================

  private async calculateConversionRate(organizationId: string): Promise<number> {
    const closedDeals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        stage: { in: ['closed_won', 'closed_lost'] },
      },
      take: 100,
    });

    if (closedDeals.length === 0) return 50;

    const won = closedDeals.filter((d) => d.stage === 'closed_won').length;
    return (won / closedDeals.length) * 100;
  }

  private calculateAverageSalesCycle(deals: Deal[]): number {
    const cyclesWithDates = deals
      .filter((d) => d.actualCloseDate)
      .map((d) => {
        const created = new Date(d.createdAt);
        const closed = new Date(d.actualCloseDate!);
        return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });

    if (cyclesWithDates.length === 0) return 60; // Default 60 days

    return cyclesWithDates.reduce((sum, c) => sum + c, 0) / cyclesWithDates.length;
  }

  private async calculatePipelineVelocity(organizationId: string): Promise<number> {
    // Simplified: deals that changed stage in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyUpdated = await this.prisma.deal.count({
      where: {
        organizationId,
        updatedAt: { gte: sevenDaysAgo },
        stage: { notIn: ['closed_won', 'closed_lost'] },
      },
    });

    return recentlyUpdated / 7; // Per day
  }

  /**
   * Calculate pipeline coverage ratio (weighted pipeline / quota)
   */
  private calculatePipelineCoverage(weightedPipelineValue: number, organizationId: string): number {
    // Standard quota is 3x pipeline coverage for healthy sales
    // If no quota set, assume 33% of weighted pipeline as target
    const targetQuota = weightedPipelineValue / 3;
    if (targetQuota <= 0) return 0;
    return Math.round((weightedPipelineValue / targetQuota) * 100) / 100;
  }

  private async analyzeByStage(
    deals: Deal[],
    organizationId: string
  ): Promise<any[]> {
    const stages = Object.values(DealStage).filter((s) => s !== 'closed_won' && s !== 'closed_lost');

    return Promise.all(
      stages.map(async (stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const totalValue = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

        // Calculate average age in stage
        const ages = stageDeals.map((d) => {
          const created = new Date(d.createdAt);
          const now = new Date();
          return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });
        const averageAge = ages.length > 0 ? ages.reduce((sum, a) => sum + a, 0) / ages.length : 0;

        // Stuck deals (>30 days in stage)
        const stuckDeals = stageDeals.filter((d) => {
          const created = new Date(d.createdAt);
          const now = new Date();
          const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return days > 30;
        }).length;

        // Historical conversion rate for this stage
        const conversionRate = await this.calculateStageConversionRate(organizationId, stage);

        return {
          stage,
          dealCount: stageDeals.length,
          totalValue: Math.round(totalValue),
          averageAge: Math.round(averageAge),
          conversionRate: Math.round(conversionRate),
          stuckDeals,
        };
      })
    );
  }

  private async calculateStageConversionRate(
    organizationId: string,
    stage: DealStage
  ): Promise<number> {
    // Simplified: would need stage change tracking
    const stageWeights: Record<string, number> = {
      prospecting: 10,
      qualification: 25,
      proposal: 50,
      negotiation: 75,
      closed_won: 100,
      closed_lost: 0,
    };

    return stageWeights[stage] || 50;
  }

  private identifyRiskFactors(deals: Deal[], byStage: any[], metrics: any): any[] {
    const risks: any[] = [];

    // Low pipeline value
    if (metrics.conversionRate < 30) {
      risks.push({
        factor: 'Low conversion rate',
        severity: 'critical',
        impact: `Only ${Math.round(metrics.conversionRate)}% of deals are won`,
        recommendation: 'Review qualification criteria and sales process',
      });
    }

    // Slow velocity
    if (metrics.velocity < 1) {
      risks.push({
        factor: 'Low pipeline velocity',
        severity: 'high',
        impact: 'Less than 1 deal progressing per day',
        recommendation: 'Accelerate deal progression and follow-up cadence',
      });
    }

    // Stuck deals
    const totalStuck = byStage.reduce((sum, s) => sum + s.stuckDeals, 0);
    if (totalStuck > 5) {
      risks.push({
        factor: 'High number of stuck deals',
        severity: 'medium',
        impact: `${totalStuck} deals stuck for >30 days`,
        recommendation: 'Review and re-qualify stalled opportunities',
      });
    }

    // Insufficient pipeline
    if (deals.length < 10) {
      risks.push({
        factor: 'Low deal count',
        severity: 'medium',
        impact: `Only ${deals.length} active deals in pipeline`,
        recommendation: 'Increase prospecting and lead generation activities',
      });
    }

    return risks;
  }

  private async calculatePipelineTrends(organizationId: string): Promise<any> {
    // Compare last 30 days with previous 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const currentPeriodDeals = await this.prisma.deal.count({
      where: {
        organizationId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const previousPeriodDeals = await this.prisma.deal.count({
      where: {
        organizationId,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    });

    const pipelineGrowth = previousPeriodDeals > 0
      ? ((currentPeriodDeals - previousPeriodDeals) / previousPeriodDeals) * 100
      : 0;

    return {
      pipelineGrowth: Math.round(pipelineGrowth),
      velocityChange: 0, // Simplified
      conversionTrend: 'stable' as const,
    };
  }

  private calculateOverallHealth(params: any): number {
    let score = 50; // Base score

    // Deal count
    if (params.dealCount >= 20) score += 15;
    else if (params.dealCount >= 10) score += 10;
    else if (params.dealCount < 5) score -= 20;

    // Conversion rate
    if (params.conversionRate >= 50) score += 20;
    else if (params.conversionRate >= 30) score += 10;
    else if (params.conversionRate < 20) score -= 20;

    // Velocity
    if (params.velocity >= 2) score += 15;
    else if (params.velocity >= 1) score += 10;
    else if (params.velocity < 0.5) score -= 15;

    // Risk factors
    score -= params.riskCount * 10;

    return Math.max(0, Math.min(100, score));
  }

  private getHealthLevel(score: number): 'critical' | 'poor' | 'fair' | 'good' | 'excellent' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'critical';
  }

  private generateForecastRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.accuracy < 70) {
      recommendations.push('Improve forecast accuracy by updating deal probabilities more frequently');
    }

    if (metrics.slipped > metrics.actualCount) {
      recommendations.push('High slip rate - validate close dates with customers');
    }

    if (metrics.lost > metrics.actualCount * 0.3) {
      recommendations.push('Loss rate exceeds 30% - strengthen qualification process');
    }

    if (Math.abs(metrics.variance) > 20) {
      recommendations.push('Forecast variance exceeds 20% - review probability scoring methodology');
    }

    return recommendations;
  }

  private async getHistoricalAccuracy(
    organizationId: string,
    periods: number
  ): Promise<Array<{ period: string; accuracy: number; predicted: number; actual: number }>> {
    // Simplified implementation
    return [];
  }

  private determineTrend(
    currentAccuracy: number,
    historical: any[]
  ): 'improving' | 'stable' | 'declining' {
    if (historical.length === 0) return 'stable';

    const avgHistorical = historical.reduce((sum, h) => sum + h.accuracy, 0) / historical.length;

    if (currentAccuracy > avgHistorical + 5) return 'improving';
    if (currentAccuracy < avgHistorical - 5) return 'declining';
    return 'stable';
  }

  private calculateDaysInStage(deal: Deal): number {
    const now = new Date();
    const created = new Date(deal.createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async getExpectedDaysInStage(
    stage: DealStage,
    organizationId: string
  ): Promise<number> {
    const expectedDays: Record<string, number> = {
      prospecting: 14,
      qualification: 21,
      proposal: 14,
      negotiation: 7,
      closed_won: 0,
      closed_lost: 0,
    };

    return expectedDays[stage] || 14;
  }

  private calculateVelocityScore(actual: number, expected: number): number {
    if (expected === 0) return 100;
    const ratio = actual / expected;

    if (ratio <= 0.7) return 100; // Accelerated
    if (ratio <= 1) return 80; // On track
    if (ratio <= 1.5) return 60; // Slightly delayed
    if (ratio <= 2) return 40; // Delayed
    return 20; // Significantly delayed
  }

  private async calculateDealHealthScore(deal: any): Promise<number> {
    let score = 50;

    // Meeting engagement
    if (deal.meetings.length >= 5) score += 20;
    else if (deal.meetings.length >= 3) score += 15;
    else if (deal.meetings.length >= 2) score += 10;
    else if (deal.meetings.length <= 1) score -= 20;

    // Scorecard performance
    if (deal.scorecards && deal.scorecards.length > 0) {
      const avgScore = deal.scorecards.reduce((sum: number, s: any) => sum + (s.overallScore || 0), 0) / deal.scorecards.length;
      if (avgScore >= 70) score += 20;
      else if (avgScore >= 50) score += 10;
      else score -= 10;
    }

    // Probability
    if (deal.probability >= 75) score += 10;
    else if (deal.probability < 25) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private predictCloseDate(deal: Deal, velocityScore: number): Date {
    const predicted = new Date(deal.expectedCloseDate || new Date());

    // Adjust based on velocity
    if (velocityScore < 50) {
      // Delayed - push out
      predicted.setDate(predicted.getDate() + 14);
    } else if (velocityScore > 80) {
      // Accelerated - pull in
      predicted.setDate(predicted.getDate() - 7);
    }

    return predicted;
  }

  private generateProgressionRecommendations(
    velocity: number,
    probability: number,
    health: number,
    deal: any
  ): string[] {
    const recommendations: string[] = [];

    if (velocity < 50) {
      recommendations.push('Deal is moving slowly - schedule next meeting within 3 days');
    }

    if (probability < 50) {
      recommendations.push('Low win probability - re-qualify and address objections');
    }

    if (health < 50) {
      recommendations.push('Poor deal health - increase engagement and stakeholder coverage');
    }

    if (deal.meetings.length < 2) {
      recommendations.push('Insufficient engagement - schedule discovery and demo calls');
    }

    return recommendations;
  }

  private calculateConfidenceLevel(params: any): number {
    const weights = {
      velocity: 0.3,
      probability: 0.3,
      health: 0.2,
      engagement: 0.2,
    };

    const engagementScore = Math.min(params.meetingCount * 20, 100);

    const confidence =
      params.velocityScore * weights.velocity +
      params.probabilityScore * weights.probability +
      params.healthScore * weights.health +
      engagementScore * weights.engagement;

    return Math.round(confidence);
  }
}

// Export singleton instance
export const forecastAccuracyService = new ForecastAccuracyService(prisma, redis);
export default ForecastAccuracyService;
