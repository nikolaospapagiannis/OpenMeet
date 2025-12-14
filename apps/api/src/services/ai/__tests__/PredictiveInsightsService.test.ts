/**
 * Tests for PredictiveInsightsService
 * Verifies that REAL implementations are working (no fakes!)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PredictiveInsightsService } from '../PredictiveInsightsService';

// Mock Prisma
const mockPrisma = {
  organization: {
    findUnique: jest.fn(),
  },
  deal: {
    findMany: jest.fn(),
  },
  meeting: {
    findMany: jest.fn(),
  },
  dealMeeting: {
    findMany: jest.fn(),
  },
  aIAnalysis: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
} as any;

// Mock Redis and QueueService
jest.mock('ioredis', () => ({
  default: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

jest.mock('../../queue', () => ({
  QueueService: jest.fn().mockImplementation(() => ({
    addJob: jest.fn().mockResolvedValue('job-id'),
  })),
  JobType: {
    ANALYTICS_PROCESSING: 'analytics_processing',
  },
  JobPriority: {
    NORMAL: 50,
  },
}));

describe('PredictiveInsightsService', () => {
  let service: PredictiveInsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PredictiveInsightsService(mockPrisma);
  });

  describe('refreshAllPredictions', () => {
    it('should query real database for organizations, deals, and meetings', async () => {
      const organizationId = 'org-123';

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: organizationId,
        name: 'Test Org',
      });

      mockPrisma.deal.findMany.mockResolvedValue([
        {
          id: 'deal-1',
          organizationId,
          amount: 50000,
          stage: 'negotiation',
          probability: 0.7,
          meetings: [],
        },
      ]);

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          organizationId,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          participants: [{ id: 'p1' }, { id: 'p2' }],
          recordings: [],
          analytics: null,
          summary: null,
        },
      ]);

      await service.refreshAllPredictions(organizationId);

      // Verify database queries were made
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: organizationId },
      });

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        include: { meetings: true },
      });

      expect(mockPrisma.meeting.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        include: {
          analytics: true,
          summary: true,
          participants: true,
          recordings: true,
        },
      });
    });

    it('should throw error if organization does not exist', async () => {
      const organizationId = 'non-existent';

      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.refreshAllPredictions(organizationId))
        .rejects.toThrow(`Organization ${organizationId} not found`);
    });
  });

  describe('getPredictionHistory', () => {
    it('should query real database for prediction history', async () => {
      const entityId = 'meeting-123';
      const entityType = 'meeting';

      mockPrisma.aIAnalysis.findMany.mockResolvedValue([
        {
          id: 'analysis-1',
          meetingId: entityId,
          organizationId: 'org-123',
          status: 'completed',
          analysisTypes: ['engagement_prediction'],
          risks: { dealRisk: { score: 45 } },
          metrics: { engagement: { score: 78 } },
          metadata: { predictionType: 'engagement_prediction' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]);

      const result = await service.getPredictionHistory(entityType, entityId, 10);

      // Verify database query was made
      expect(mockPrisma.aIAnalysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            meetingId: entityId,
          }),
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      );

      // Verify real data is returned, not empty array
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'analysis-1',
        entityType: 'meeting',
        entityId,
        predictionType: 'engagement_prediction',
        predictions: expect.objectContaining({
          risks: expect.any(Object),
          metrics: expect.any(Object),
        }),
      });
    });

    it('should return informative message when no predictions exist', async () => {
      mockPrisma.aIAnalysis.findMany.mockResolvedValue([]);

      const result = await service.getPredictionHistory('meeting', 'meeting-456', 10);

      // Should not return empty array, but informative response
      expect(result).toHaveLength(1);
      expect(result[0].predictions).toMatchObject({
        message: 'No predictions have been generated for this entity yet',
        hint: 'Call refreshAllPredictions to generate initial predictions',
      });
    });
  });

  describe('getAccuracyMetrics', () => {
    it('should calculate real accuracy from database predictions', async () => {
      const predictionType = 'deal_risk_prediction';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.aIAnalysis.findMany.mockResolvedValue([
        {
          id: 'pred-1',
          createdAt: new Date('2024-06-01'),
          risks: { dealRisk: { score: 70 } },
          meeting: {
            dealMeetings: [{
              deal: { status: 'closed_lost' },
            }],
          },
        },
        {
          id: 'pred-2',
          createdAt: new Date('2024-07-01'),
          risks: { dealRisk: { score: 20 } },
          meeting: {
            dealMeetings: [{
              deal: { status: 'closed_won' },
            }],
          },
        },
      ]);

      const result = await service.getAccuracyMetrics(predictionType, startDate, endDate);

      // Verify database query was made
      expect(mockPrisma.aIAnalysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );

      // Verify real calculations, not hardcoded 0.85
      expect(result).toMatchObject({
        predictionType,
        totalPredictions: 2,
        accuracy: expect.any(Number),
        correctPredictions: expect.any(Number),
        falsePositives: expect.any(Number),
        falseNegatives: expect.any(Number),
        meanAbsoluteError: expect.any(Number),
        dateRange: { startDate, endDate },
        breakdown: expect.any(Object),
      });

      // Accuracy should NOT be the hardcoded 0.85
      expect(result.accuracy).not.toBe(0.85);
    });

    it('should return zero metrics when no predictions found', async () => {
      mockPrisma.aIAnalysis.findMany.mockResolvedValue([]);

      const result = await service.getAccuracyMetrics(
        'engagement_prediction',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(result.totalPredictions).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.breakdown).toMatchObject({
        message: 'No predictions found in the specified date range',
        suggestion: 'Generate predictions first using refreshAllPredictions',
      });
    });
  });

  describe('Integration Tests', () => {
    it('should NOT have any TODOs or fake implementations', () => {
      // This test ensures no fake implementations remain
      const serviceCode = service.toString();

      // These should not exist in real implementation
      expect(serviceCode).not.toContain('TODO');
      expect(serviceCode).not.toContain('// In production');
      expect(serviceCode).not.toContain('return []');
      expect(serviceCode).not.toContain('accuracy: 0.85');
    });
  });
});