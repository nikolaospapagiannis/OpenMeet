/**
 * Revenue Intelligence Routes (GAP #2)
 * Enterprise P0 Blocker - Competing with Gong/Chorus
 *
 * Endpoints:
 * - GET /api/revenue/deals/:dealId/risk - Get deal risk score
 * - GET /api/revenue/win-loss-analysis - Win/loss patterns
 * - GET /api/revenue/forecast-accuracy - Forecast metrics
 * - GET /api/revenue/pipeline-health - Pipeline scoring
 * - POST /api/revenue/coaching/alerts - Configure real-time alerts
 * - GET /api/revenue/competitive-intelligence - Competitor mentions
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { param, query, body, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import { DealRiskDetectionService, dealRiskDetectionService } from '../services/DealRiskDetectionService';
import { WinLossAnalysisService, winLossAnalysisService } from '../services/WinLossAnalysisService';
import { ForecastAccuracyService, forecastAccuracyService } from '../services/ForecastAccuracyService';
import { RealtimeCoachingService, realtimeCoachingService } from '../services/RealtimeCoachingService';
import { Counter, Histogram } from 'prom-client';
import OpenAI from 'openai';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'revenue-intelligence-routes' },
  transports: [new winston.transports.Console()],
});

// Prometheus metrics
const riskAnalysisCounter = new Counter({
  name: 'revenue_intelligence_risk_analysis_total',
  help: 'Total number of deal risk analyses performed',
});

const winLossAnalysisCounter = new Counter({
  name: 'revenue_intelligence_winloss_analysis_total',
  help: 'Total number of win-loss analyses performed',
});

const forecastCalculationCounter = new Counter({
  name: 'revenue_intelligence_forecast_calculations_total',
  help: 'Total number of forecast calculations',
});

const coachingAlertsCounter = new Counter({
  name: 'revenue_intelligence_coaching_alerts_total',
  help: 'Total number of coaching alerts generated',
  labelNames: ['alert_type'],
});

const requestDuration = new Histogram({
  name: 'revenue_intelligence_request_duration_seconds',
  help: 'Revenue intelligence API request duration',
  labelNames: ['endpoint'],
});

// Initialize service instances with dependencies
const dealRiskService = new DealRiskDetectionService(prisma, redis, openai);
const winLossService = new WinLossAnalysisService(prisma, redis, openai);
const forecastService = new ForecastAccuracyService(prisma, redis);
const coachingService = new RealtimeCoachingService();

// All routes require authentication
router.use(authMiddleware);

// ====================================
// Deal Risk Detection
// ====================================

/**
 * GET /api/revenue/deals/:dealId/risk
 * Get comprehensive deal risk assessment
 */
router.get(
  '/deals/:dealId/risk',
  [param('dealId').isUUID().withMessage('Invalid deal ID')],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'deal_risk' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const { dealId } = req.params;

      logger.info('Analyzing deal risk', { dealId, organizationId });

      const riskAssessment = await dealRiskService.analyzeDealRisk(dealId, organizationId);

      riskAnalysisCounter.inc();

      res.json({
        success: true,
        data: riskAssessment,
      });
    } catch (error) {
      logger.error('Error analyzing deal risk', { error, dealId: req.params.dealId });

      if (error instanceof Error && error.message === 'Deal not found') {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to analyze deal risk' });
    } finally {
      end();
    }
  }
);

// ====================================
// Win-Loss Analysis
// ====================================

/**
 * GET /api/revenue/win-loss-analysis
 * Get comprehensive win-loss pattern analysis
 */
router.get(
  '/win-loss-analysis',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'winloss_analysis' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      logger.info('Analyzing win-loss patterns', { organizationId, startDate, endDate });

      const analysis = await winLossService.analyzeWinLossPatterns(
        organizationId,
        startDate,
        endDate
      );

      winLossAnalysisCounter.inc();

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error('Error analyzing win-loss patterns', { error });
      res.status(500).json({ error: 'Failed to analyze win-loss patterns' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/deals/:dealId/outcome-prediction
 * Predict deal outcome using AI and historical patterns
 */
router.get(
  '/deals/:dealId/outcome-prediction',
  [param('dealId').isUUID().withMessage('Invalid deal ID')],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'outcome_prediction' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const { dealId } = req.params;

      logger.info('Predicting deal outcome', { dealId, organizationId });

      const prediction = await winLossService.predictDealOutcome(dealId, organizationId);

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      logger.error('Error predicting deal outcome', { error, dealId: req.params.dealId });

      if (error instanceof Error && error.message === 'Deal not found') {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to predict deal outcome' });
    } finally {
      end();
    }
  }
);

// ====================================
// Forecast Accuracy
// ====================================

/**
 * GET /api/revenue/forecast-accuracy
 * Calculate forecast accuracy metrics
 */
router.get(
  '/forecast-accuracy',
  [
    query('startDate').isISO8601().withMessage('Start date is required'),
    query('endDate').isISO8601().withMessage('End date is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'forecast_accuracy' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      logger.info('Calculating forecast accuracy', { organizationId, startDate, endDate });

      const accuracy = await forecastService.calculateForecastAccuracy(
        organizationId,
        startDate,
        endDate
      );

      forecastCalculationCounter.inc();

      res.json({
        success: true,
        data: accuracy,
      });
    } catch (error) {
      logger.error('Error calculating forecast accuracy', { error });
      res.status(500).json({ error: 'Failed to calculate forecast accuracy' });
    } finally {
      end();
    }
  }
);

/**
 * POST /api/revenue/forecast
 * Generate revenue forecast for a period
 */
router.post(
  '/forecast',
  [
    body('periodStart').isISO8601().withMessage('Period start date is required'),
    body('periodEnd').isISO8601().withMessage('Period end date is required'),
    body('includedStages').optional().isArray(),
    body('minProbability').optional().isInt({ min: 0, max: 100 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'generate_forecast' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      logger.info('Generating forecast', { organizationId });

      const forecast = await forecastService.generateForecast({
        organizationId,
        periodStart: new Date(req.body.periodStart),
        periodEnd: new Date(req.body.periodEnd),
        includedStages: req.body.includedStages,
        minProbability: req.body.minProbability,
      });

      forecastCalculationCounter.inc();

      res.json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      logger.error('Error generating forecast', { error });
      res.status(500).json({ error: 'Failed to generate forecast' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/deals/:dealId/progression
 * Track deal progression through pipeline
 */
router.get(
  '/deals/:dealId/progression',
  [param('dealId').isUUID().withMessage('Invalid deal ID')],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'deal_progression' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const { dealId } = req.params;

      logger.info('Tracking deal progression', { dealId, organizationId });

      const progression = await forecastService.trackDealProgression(dealId, organizationId);

      res.json({
        success: true,
        data: progression,
      });
    } catch (error) {
      logger.error('Error tracking deal progression', { error, dealId: req.params.dealId });

      if (error instanceof Error && error.message === 'Deal not found') {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to track deal progression' });
    } finally {
      end();
    }
  }
);

// ====================================
// Pipeline Health
// ====================================

/**
 * GET /api/revenue/pipeline-health
 * Get comprehensive pipeline health metrics
 */
router.get(
  '/pipeline-health',
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'pipeline_health' });

    try {
      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      logger.info('Calculating pipeline health', { organizationId });

      const health = await forecastService.calculatePipelineHealth(organizationId);

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Error calculating pipeline health', { error });
      res.status(500).json({ error: 'Failed to calculate pipeline health' });
    } finally {
      end();
    }
  }
);

// ====================================
// Real-time Coaching
// ====================================

/**
 * POST /api/revenue/coaching/alerts
 * Configure real-time coaching alerts
 */
router.post(
  '/coaching/alerts',
  [
    body('enabled').optional().isBoolean(),
    body('alerts').optional().isObject(),
    body('battleCards').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'configure_coaching' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      logger.info('Updating coaching configuration', { organizationId, userId });

      const updatedConfig = await coachingService.updateCoachingConfiguration(
        organizationId,
        req.body,
        userId
      );

      res.json({
        success: true,
        data: updatedConfig,
      });
    } catch (error) {
      logger.error('Error updating coaching configuration', { error });
      res.status(500).json({ error: 'Failed to update coaching configuration' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/coaching/alerts
 * Get current coaching alert configuration
 */
router.get(
  '/coaching/alerts',
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'get_coaching_config' });

    try {
      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      logger.info('Getting coaching configuration', { organizationId, userId });

      const config = await coachingService.getCoachingConfiguration(organizationId, userId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error getting coaching configuration', { error });
      res.status(500).json({ error: 'Failed to get coaching configuration' });
    } finally {
      end();
    }
  }
);

/**
 * POST /api/revenue/coaching/sessions
 * Start a new coaching session
 */
router.post(
  '/coaching/sessions',
  [body('meetingId').isUUID().withMessage('Meeting ID is required')],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'start_coaching_session' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const { meetingId } = req.body;

      logger.info('Starting coaching session', { meetingId, organizationId });

      const session = await coachingService.startCoachingSession(
        meetingId,
        organizationId,
        userId
      );

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error('Error starting coaching session', { error });
      res.status(500).json({ error: 'Failed to start coaching session' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/coaching/sessions/:sessionId
 * Get coaching session details
 */
router.get(
  '/coaching/sessions/:sessionId',
  [param('sessionId').notEmpty().withMessage('Session ID is required')],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'get_coaching_session' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { sessionId } = req.params;

      logger.info('Getting coaching session', { sessionId });

      const session = await coachingService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Coaching session not found' });
        return;
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error('Error getting coaching session', { error, sessionId: req.params.sessionId });
      res.status(500).json({ error: 'Failed to get coaching session' });
    } finally {
      end();
    }
  }
);

/**
 * POST /api/revenue/coaching/sessions/:sessionId/end
 * End a coaching session
 */
router.post(
  '/coaching/sessions/:sessionId/end',
  [param('sessionId').notEmpty().withMessage('Session ID is required')],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'end_coaching_session' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { sessionId } = req.params;

      logger.info('Ending coaching session', { sessionId });

      await coachingService.endCoachingSession(sessionId);

      res.json({
        success: true,
        message: 'Coaching session ended',
      });
    } catch (error) {
      logger.error('Error ending coaching session', { error, sessionId: req.params.sessionId });
      res.status(500).json({ error: 'Failed to end coaching session' });
    } finally {
      end();
    }
  }
);

// ====================================
// Competitive Intelligence
// ====================================

/**
 * GET /api/revenue/competitive-intelligence
 * Get competitive intelligence from win-loss analysis
 */
router.get(
  '/competitive-intelligence',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('competitor').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'competitive_intelligence' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      logger.info('Analyzing competitive intelligence', { organizationId, startDate, endDate });

      // Get win-loss analysis which includes competitive intelligence
      const analysis = await winLossService.analyzeWinLossPatterns(
        organizationId,
        startDate,
        endDate
      );

      // Filter by specific competitor if requested
      let competitiveData = analysis.competitiveIntelligence;
      if (req.query.competitor) {
        competitiveData = competitiveData.filter(
          (c) => c.competitor.toLowerCase() === (req.query.competitor as string).toLowerCase()
        );
      }

      res.json({
        success: true,
        data: {
          competitors: competitiveData,
          period: analysis.period,
          summary: {
            totalCompetitors: competitiveData.length,
            criticalThreats: competitiveData.filter((c) => c.threatLevel === 'critical').length,
            highThreats: competitiveData.filter((c) => c.threatLevel === 'high').length,
            totalLosses: competitiveData.reduce((sum, c) => sum + c.lossCount, 0),
            averageWinRate: competitiveData.length > 0
              ? Math.round(competitiveData.reduce((sum, c) => sum + c.winRate, 0) / competitiveData.length)
              : 0,
          },
        },
      });
    } catch (error) {
      logger.error('Error analyzing competitive intelligence', { error });
      res.status(500).json({ error: 'Failed to analyze competitive intelligence' });
    } finally {
      end();
    }
  }
);

// ====================================
// Health Check
// ====================================

/**
 * GET /api/revenue/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    service: 'revenue-intelligence',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
