/**
 * Deal Risk Predictor Tests
 *
 * Tests use REAL AI calls (OpenAI GPT-4) - NO MOCKS
 * Verifies actual prediction capabilities and data extraction
 */

import { PrismaClient } from '@prisma/client';
import { DealRiskPredictor, createDealRiskPredictor } from '../DealRiskPredictor';

describe('DealRiskPredictor', () => {
  let prisma: PrismaClient;
  let predictor: DealRiskPredictor;

  beforeAll(() => {
    prisma = new PrismaClient();
    predictor = createDealRiskPredictor(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Feature Extraction', () => {
    it('should extract features from deal data', async () => {
      // Create test data
      const testOrgId = 'test-org-' + Date.now();

      // Create test meetings with varying sentiments
      const meetings = await Promise.all([
        prisma.meeting.create({
          data: {
            organizationId: testOrgId,
            title: 'Sales Call 1',
            startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000),
            transcript: {
              create: {
                content: 'Great conversation about the product. Customer seems very interested.',
                sentiment: 0.8,
              },
            },
          },
        }),
        prisma.meeting.create({
          data: {
            organizationId: testOrgId,
            title: 'Sales Call 2',
            startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000),
            transcript: {
              create: {
                content: 'Customer mentioned looking at competitors. Some concerns about pricing.',
                sentiment: 0.2,
              },
            },
          },
        }),
      ]);

      // Extract features
      const features = await (predictor as any).extractFeatures({
        dealId: 'test-deal',
        organizationId: testOrgId,
      });

      // Verify features
      expect(features).toBeDefined();
      expect(features.totalMeetings).toBeGreaterThan(0);
      expect(features.avgSentiment).toBeGreaterThan(-1);
      expect(features.avgSentiment).toBeLessThan(1);
      expect(features.sentimentTrend).toBeDefined();
      expect(features.competitorMentions).toBeGreaterThanOrEqual(0);

      // Cleanup
      await prisma.transcript.deleteMany({ where: { meetingId: { in: meetings.map(m => m.id) } } });
      await prisma.meeting.deleteMany({ where: { organizationId: testOrgId } });
    }, 30000);
  });

  describe('AI Prediction', () => {
    it('should make deal risk prediction using real AI', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.warn('Skipping AI test: OPENAI_API_KEY not set');
        return;
      }

      const testOrgId = 'test-org-' + Date.now();

      // Create test meetings with clear risk signals
      const meetings = await Promise.all([
        prisma.meeting.create({
          data: {
            organizationId: testOrgId,
            title: 'Sales Call - Risk Signals',
            startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 3600000),
            transcript: {
              create: {
                content:
                  'We are evaluating multiple vendors. Your competitor offers better pricing. We have some concerns about implementation timeline.',
                sentiment: -0.3,
              },
            },
          },
        }),
        prisma.meeting.create({
          data: {
            organizationId: testOrgId,
            title: 'Follow-up Call',
            startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000),
            transcript: {
              create: {
                content: 'Still waiting on decision. Budget meeting got delayed.',
                sentiment: 0.1,
              },
            },
          },
        }),
      ]);

      // Make prediction
      const result = await predictor.predict({
        dealId: 'test-deal',
        organizationId: testOrgId,
      });

      // Verify prediction structure
      expect(result).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(result.recommendations).toBeDefined();

      // Verify prediction content
      expect(result.prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.prediction.riskScore).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.prediction.riskLevel);
      expect(result.prediction.riskFactors).toBeInstanceOf(Array);
      expect(result.prediction.riskFactors.length).toBeGreaterThan(0);

      // Verify metadata
      expect(result.metadata.modelVersion).toBe('deal-risk-v1');
      expect(result.metadata.confidenceScore).toBeGreaterThan(0);
      expect(result.metadata.confidenceScore).toBeLessThanOrEqual(100);

      // Verify recommendations
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toBeTruthy();

      console.log('Deal Risk Prediction:', {
        riskScore: result.prediction.riskScore,
        riskLevel: result.prediction.riskLevel,
        riskFactors: result.prediction.riskFactors.map(f => f.factor),
        explanation: result.explanation,
        recommendations: result.recommendations,
      });

      // Cleanup
      await prisma.transcript.deleteMany({ where: { meetingId: { in: meetings.map(m => m.id) } } });
      await prisma.meeting.deleteMany({ where: { organizationId: testOrgId } });
    }, 60000);
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on data quality', async () => {
      const features = {
        avgSentiment: 0.5,
        sentimentTrend: -0.2,
        engagementRate: 0.8,
        responseTimeAvg: 5,
        competitorMentions: 2,
        decisionMakerParticipation: 0.6,
        meetingFrequency: 1.5,
        dealStageProgress: 0.5,
        lastContactDays: 3,
        escalationCount: 1,
        totalMeetings: 10,
        dealValue: 50000,
      };

      const confidence = await (predictor as any).calculateConfidence(features);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });
});
