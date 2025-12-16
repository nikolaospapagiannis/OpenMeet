/**
 * Predictions API Routes
 *
 * Endpoints for AI-powered predictive insights:
 * - Deal risk prediction
 * - Customer churn prediction
 * - Employee engagement scoring
 * - Product feedback analysis
 *
 * All predictions use REAL AI models (OpenAI GPT-4)
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { createDealRiskPredictor } from '../services/ai/predictions/DealRiskPredictor';
import { createChurnPredictor } from '../services/ai/predictions/ChurnPredictor';
import { createEngagementScorer } from '../services/ai/predictions/EngagementScorer';
import { createProductFeedbackAnalyzer } from '../services/ai/predictions/ProductFeedbackAnalyzer';
import { createPredictiveInsightsService } from '../services/ai/PredictiveInsightsService';
import winston from 'winston';

const router: Router = Router();
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'predictions-api' },
  transports: [new winston.transports.Console()],
});

/**
 * GET /api/predictions/deals/:dealId/risk
 * Predict deal risk for a specific deal
 */
router.get(
  '/deals/:dealId/risk',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { dealId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      logger.info('Deal risk prediction requested', { dealId, organizationId });

      const predictor = createDealRiskPredictor(prisma);
      const result = await predictor.predict({ dealId, organizationId });

      logger.info('Deal risk prediction complete', {
        dealId,
        riskScore: result.prediction.riskScore,
        riskLevel: result.prediction.riskLevel,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Deal risk prediction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to predict deal risk',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/predictions/customers/:customerId/churn
 * Predict churn risk for a specific customer
 */
router.get(
  '/customers/:customerId/churn',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      logger.info('Churn prediction requested', { customerId, organizationId });

      const predictor = createChurnPredictor(prisma);
      const result = await predictor.predict({ customerId, organizationId });

      logger.info('Churn prediction complete', {
        customerId,
        churnProbability: result.prediction.churnProbability,
        churnRisk: result.prediction.churnRisk,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Churn prediction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to predict customer churn',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/predictions/employees/:employeeId/engagement
 * Score employee engagement for a specific employee
 */
router.get(
  '/employees/:employeeId/engagement',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      logger.info('Engagement scoring requested', { employeeId, organizationId });

      const scorer = createEngagementScorer(prisma);
      const result = await scorer.predict({ employeeId, organizationId });

      logger.info('Engagement scoring complete', {
        employeeId,
        overallScore: result.prediction.overallScore,
        engagementLevel: result.prediction.engagementLevel,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Engagement scoring failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to score employee engagement',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/predictions/products/feedback
 * Analyze product feedback sentiment and trends
 */
router.get(
  '/products/feedback',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      const { productId, timeframe } = req.query;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      logger.info('Product feedback analysis requested', {
        organizationId,
        productId,
        timeframe,
      });

      const analyzer = createProductFeedbackAnalyzer(prisma);
      const result = await analyzer.predict({
        productId: productId as string,
        organizationId,
        timeframe: timeframe ? parseInt(timeframe as string) : 90,
      });

      logger.info('Product feedback analysis complete', {
        organizationId,
        overallSentiment: result.prediction.overallSentiment,
        urgency: result.prediction.urgency,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Product feedback analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to analyze product feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/predictions/refresh
 * Refresh all predictions for an organization
 */
router.post(
  '/refresh',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      logger.info('Prediction refresh requested', { organizationId });

      const service = createPredictiveInsightsService(prisma);
      await service.refreshAllPredictions(organizationId);

      res.json({
        success: true,
        message: 'Prediction refresh initiated',
      });
    } catch (error) {
      logger.error('Prediction refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to refresh predictions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/predictions/history/:entityType/:entityId
 * Get prediction history for a specific entity
 */
router.get(
  '/history/:entityType/:entityId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      const { limit } = req.query;

      logger.info('Prediction history requested', { entityType, entityId });

      const service = createPredictiveInsightsService(prisma);
      const history = await service.getPredictionHistory(
        entityType,
        entityId,
        limit ? parseInt(limit as string) : 10
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Prediction history retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve prediction history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/predictions/accuracy/:predictionType
 * Get prediction accuracy metrics
 */
router.get(
  '/accuracy/:predictionType',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { predictionType } = req.params;
      const { startDate, endDate } = req.query;

      logger.info('Prediction accuracy metrics requested', { predictionType });

      const service = createPredictiveInsightsService(prisma);
      const metrics = await service.getAccuracyMetrics(
        predictionType,
        startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate ? new Date(endDate as string) : new Date()
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Accuracy metrics retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve accuracy metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/predictions/types
 * Get available prediction types
 */
router.get('/types', authenticateToken, async (req: Request, res: Response) => {
  try {
    const service = createPredictiveInsightsService(prisma);
    const types = service.getAvailablePredictions();

    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    logger.error('Failed to get prediction types', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve prediction types',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
