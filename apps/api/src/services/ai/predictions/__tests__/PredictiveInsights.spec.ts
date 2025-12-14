/**
 * Predictive Insights Service Tests
 *
 * Tests the main orchestrator and base prediction service
 * Uses REAL AI calls - NO MOCKS
 */

import { PrismaClient } from '@prisma/client';
import { PredictiveInsightsService } from '../../PredictiveInsightsService';
import { createDealRiskPredictor } from '../DealRiskPredictor';
import { createChurnPredictor } from '../ChurnPredictor';
import { createEngagementScorer } from '../EngagementScorer';
import { createProductFeedbackAnalyzer } from '../ProductFeedbackAnalyzer';

describe('PredictiveInsightsService', () => {
  let prisma: PrismaClient;
  let service: PredictiveInsightsService;

  beforeAll(() => {
    prisma = new PrismaClient();
    service = new PredictiveInsightsService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Service Configuration', () => {
    it('should provide list of available predictions', () => {
      const predictions = service.getAvailablePredictions();

      expect(predictions).toBeInstanceOf(Array);
      expect(predictions).toContain('deal_risk');
      expect(predictions).toContain('customer_churn');
      expect(predictions).toContain('employee_engagement');
      expect(predictions).toContain('product_feedback');
    });

    it('should initiate prediction refresh', async () => {
      const testOrgId = 'test-org-' + Date.now();

      await expect(service.refreshAllPredictions(testOrgId)).resolves.not.toThrow();
    });
  });

  describe('Prediction History', () => {
    it('should retrieve prediction history', async () => {
      const history = await service.getPredictionHistory('deal', 'test-deal', 5);

      expect(history).toBeInstanceOf(Array);
    });
  });

  describe('Accuracy Metrics', () => {
    it('should calculate accuracy metrics', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = await service.getAccuracyMetrics('deal_risk', startDate, endDate);

      expect(metrics).toBeDefined();
      expect(metrics.predictionType).toBe('deal_risk');
      expect(metrics.accuracy).toBeDefined();
      expect(metrics.dateRange).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should create all predictor types successfully', () => {
      const dealPredictor = createDealRiskPredictor(prisma);
      const churnPredictor = createChurnPredictor(prisma);
      const engagementScorer = createEngagementScorer(prisma);
      const feedbackAnalyzer = createProductFeedbackAnalyzer(prisma);

      expect(dealPredictor).toBeDefined();
      expect(churnPredictor).toBeDefined();
      expect(engagementScorer).toBeDefined();
      expect(feedbackAnalyzer).toBeDefined();
    });

    it('should handle missing OpenAI API key gracefully', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const predictor = createDealRiskPredictor(prisma);

      // Should initialize without error
      expect(predictor).toBeDefined();

      // Restore key
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });
  });

  describe('End-to-End Prediction Flow', () => {
    it('should complete full prediction workflow', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('Skipping E2E test: OPENAI_API_KEY not set');
        return;
      }

      const testOrgId = 'test-org-' + Date.now();

      // Create test data
      const meeting = await prisma.meeting.create({
        data: {
          organizationId: testOrgId,
          title: 'Test Meeting',
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000),
          transcript: {
            create: {
              content: 'This is a test meeting transcript with mixed sentiment.',
              sentiment: 0.3,
            },
          },
        },
      });

      // Test deal risk prediction
      const dealPredictor = createDealRiskPredictor(prisma);
      const dealResult = await dealPredictor.predict({
        dealId: 'test-deal',
        organizationId: testOrgId,
      });

      expect(dealResult.prediction).toBeDefined();
      expect(dealResult.metadata).toBeDefined();
      expect(dealResult.explanation).toBeTruthy();
      expect(dealResult.recommendations.length).toBeGreaterThan(0);

      console.log('E2E Test Results:', {
        dealRiskScore: dealResult.prediction.riskScore,
        processingTime: dealResult.metadata.processingTime,
        confidence: dealResult.metadata.confidenceScore,
      });

      // Cleanup
      await prisma.transcript.deleteMany({ where: { meetingId: meeting.id } });
      await prisma.meeting.delete({ where: { id: meeting.id } });
    }, 90000);
  });
});
