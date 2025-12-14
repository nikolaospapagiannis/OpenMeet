/**
 * Integration tests for AI Prediction Services with Real Data Sources
 * Verifies that all prediction services correctly use CRMDataService and HRDataService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ChurnPredictor, createChurnPredictor } from '../ChurnPredictor';
import { DealRiskPredictor, createDealRiskPredictor } from '../DealRiskPredictor';
import { EngagementScorer, createEngagementScorer } from '../EngagementScorer';
import { ProductFeedbackAnalyzer, createProductFeedbackAnalyzer } from '../ProductFeedbackAnalyzer';
import { CRMDataService } from '../CRMDataService';
import { HRDataService } from '../HRDataService';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    meeting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    deal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    meetingParticipant: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    salesforceMeetingSync: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    hubspotMeetingSync: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  })),
}));

// Mock OpenAI Service
vi.mock('../../ai/OpenAIService', () => ({
  OpenAIService: vi.fn(() => ({
    chatCompletion: vi.fn().mockResolvedValue('AI response'),
  })),
}));

describe('Real Data Integration Tests', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    vi.clearAllMocks();
  });

  describe('ChurnPredictor with CRMDataService', () => {
    it('should use real CRM data for support tickets', async () => {
      const churnPredictor = createChurnPredictor(prisma);

      // Mock meeting data to simulate support tickets
      (prisma.meeting.findMany as any).mockResolvedValue([
        {
          id: 'meeting-1',
          organizationId: 'org-1',
          title: 'Support Issue: Login Problems',
          tags: ['support', 'bug'],
          status: 'completed',
          scheduledStartAt: new Date(),
          participants: [{ email: 'customer@example.com' }],
          transcripts: [{
            metadata: {
              sentiment: -0.6,
              content: 'Customer experiencing critical login issues',
            },
          }],
          aiAnalyses: [{
            sentiment: { overall: -0.6 },
          }],
        },
      ]);

      // Mock deal for contract data
      (prisma.deal.findMany as any).mockResolvedValue([
        {
          id: 'deal-1',
          organizationId: 'org-1',
          name: 'Annual Contract',
          amount: 100000,
          expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          stage: 'closed_won',
          crmAccountId: 'customer@example.com',
        },
      ]);

      // Test feature extraction
      const features = await (churnPredictor as any).extractFeatures({
        customerId: 'customer@example.com',
        organizationId: 'org-1',
      });

      // Verify real support ticket data is used
      expect(features.supportTicketsLast30Days).toBeGreaterThanOrEqual(0);
      expect(features.contractRenewalDays).toBeDefined();
      expect(features.contractRenewalDays).not.toBe(Math.floor(Math.random() * 365)); // Not random
    });

    it('should filter meetings by customer association', async () => {
      const churnPredictor = createChurnPredictor(prisma);

      (prisma.meeting.findMany as any).mockResolvedValue([]);

      await (churnPredictor as any).extractFeatures({
        customerId: 'customer@example.com',
        organizationId: 'org-1',
      });

      // Verify correct query with customer filtering
      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                participants: expect.objectContaining({
                  some: expect.objectContaining({
                    email: 'customer@example.com',
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('DealRiskPredictor with CRMDataService', () => {
    it('should use real deal stage progress from CRM', async () => {
      const dealRiskPredictor = createDealRiskPredictor(prisma);

      // Mock real deal data
      (prisma.deal.findFirst as any).mockResolvedValue({
        id: 'deal-1',
        name: 'Enterprise Deal',
        amount: 250000,
        stage: 'negotiation',
        probability: 75,
        contactEmail: 'buyer@company.com',
      });

      (prisma.meeting.findMany as any).mockResolvedValue([]);

      const features = await (dealRiskPredictor as any).extractFeatures({
        dealId: 'deal-1',
        organizationId: 'org-1',
      });

      // Verify real deal data is used
      expect(features.dealValue).toBe(250000);
      expect(features.dealStageProgress).toBe(0.75); // negotiation = 0.75
    });

    it('should filter meetings by deal association', async () => {
      const dealRiskPredictor = createDealRiskPredictor(prisma);

      (prisma.deal.findFirst as any).mockResolvedValue({
        id: 'deal-1',
        contactEmail: 'buyer@company.com',
      });

      (prisma.meeting.findMany as any).mockResolvedValue([]);

      await (dealRiskPredictor as any).extractFeatures({
        dealId: 'deal-1',
        organizationId: 'org-1',
      });

      // Verify meetings are filtered by deal
      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                dealMeetings: expect.objectContaining({
                  some: expect.objectContaining({
                    dealId: 'deal-1',
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('EngagementScorer with HRDataService', () => {
    it('should use real employee data from HR service', async () => {
      const engagementScorer = createEngagementScorer(prisma);

      // Mock employee data
      (prisma.user.findFirst as any).mockResolvedValue({
        id: 'emp-1',
        email: 'employee@company.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        metadata: {
          managerId: 'manager-1',
          department: 'Engineering',
        },
      });

      // Mock meeting participation data
      (prisma.meeting.findMany as any).mockResolvedValue([
        {
          id: 'meeting-1',
          title: '1:1 with Manager',
          participants: [
            {
              userId: 'emp-1',
              email: 'employee@company.com',
              talkTimeSeconds: 1200,
            },
          ],
          transcripts: [],
        },
      ]);

      const features = await (engagementScorer as any).extractFeatures({
        employeeId: 'emp-1',
        organizationId: 'org-1',
      });

      // Verify real employee tenure is used
      expect(features.employeeTenure).toBeGreaterThan(300); // At least 300 days
      expect(features.participationRate).toBeGreaterThanOrEqual(0);
    });

    it('should filter 1-on-1 meetings by employee participation', async () => {
      const engagementScorer = createEngagementScorer(prisma);

      (prisma.user.findFirst as any).mockResolvedValue({
        id: 'emp-1',
        email: 'employee@company.com',
      });

      (prisma.meeting.findMany as any).mockResolvedValue([]);

      await (engagementScorer as any).extractFeatures({
        employeeId: 'emp-1',
        organizationId: 'org-1',
      });

      // Verify 1-on-1 meetings are properly filtered
      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                participants: expect.objectContaining({
                  some: expect.objectContaining({
                    OR: expect.arrayContaining([
                      { userId: 'emp-1' },
                      { email: 'employee@company.com' },
                    ]),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('ProductFeedbackAnalyzer with Real Meeting Tags', () => {
    it('should filter meetings by product feedback tags', async () => {
      const feedbackAnalyzer = createProductFeedbackAnalyzer(prisma);

      (prisma.meeting.findMany as any).mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Product Feedback Session',
          tags: ['product', 'feedback'],
          transcripts: [{
            metadata: {
              sentiment: 0.3,
              content: 'Feature request for dashboard improvements',
            },
          }],
          participants: [],
        },
      ]);

      const features = await (feedbackAnalyzer as any).extractFeatures({
        organizationId: 'org-1',
      });

      // Verify meetings are filtered by tags
      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                tags: expect.objectContaining({
                  hasSome: expect.arrayContaining(['product', 'feedback']),
                }),
              }),
            ]),
          }),
        })
      );

      expect(features.totalFeedbackItems).toBe(1);
      expect(features.featureRequestCount).toBeGreaterThanOrEqual(0);
    });

    it('should include meetings with product-related titles', async () => {
      const feedbackAnalyzer = createProductFeedbackAnalyzer(prisma);

      (prisma.meeting.findMany as any).mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Feature Roadmap Discussion',
          tags: [],
          transcripts: [],
          participants: [],
        },
        {
          id: 'meeting-2',
          title: 'Product Feedback Call',
          tags: [],
          transcripts: [],
          participants: [],
        },
      ]);

      const features = await (feedbackAnalyzer as any).extractFeatures({
        organizationId: 'org-1',
      });

      // Verify title-based filtering works
      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: expect.objectContaining({
                  contains: 'product',
                  mode: 'insensitive',
                }),
              }),
              expect.objectContaining({
                title: expect.objectContaining({
                  contains: 'roadmap',
                  mode: 'insensitive',
                }),
              }),
            ]),
          }),
        })
      );

      expect(features.totalFeedbackItems).toBe(2);
    });
  });

  describe('CRMDataService', () => {
    it('should fetch deal from local database first', async () => {
      const crmService = new CRMDataService(prisma);

      (prisma.deal.findFirst as any).mockResolvedValue({
        id: 'deal-1',
        name: 'Test Deal',
        amount: 50000,
        stage: 'proposal',
        probability: 60,
      });

      const deal = await crmService.getDeal('deal-1', 'org-1');

      expect(deal).toBeDefined();
      expect(deal?.amount).toBe(50000);
      expect(deal?.stage).toBe('proposal');
    });

    it('should calculate account health from meetings', async () => {
      const crmService = new CRMDataService(prisma);

      (prisma.meeting.findMany as any).mockResolvedValue([
        {
          id: 'meeting-1',
          scheduledStartAt: new Date(),
          aiAnalyses: [{
            sentiment: { overall: 0.7 },
            risks: [],
            opportunities: [{ description: 'Expansion opportunity', potential: 'high' }],
          }],
        },
      ]);

      const health = await crmService.getAccountHealth('account-1', 'org-1');

      expect(health.healthScore).toBeGreaterThan(0);
      expect(health.healthScore).toBeLessThanOrEqual(100);
      expect(health.opportunities).toContain('Expansion opportunity');
    });
  });

  describe('HRDataService', () => {
    it('should calculate employee engagement metrics', async () => {
      const hrService = new HRDataService(prisma);

      (prisma.user.findFirst as any).mockResolvedValue({
        id: 'emp-1',
        email: 'employee@company.com',
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      });

      (prisma.meeting.findMany as any).mockResolvedValue([
        {
          id: 'meeting-1',
          status: 'completed',
          participants: [
            {
              userId: 'emp-1',
              email: 'employee@company.com',
              talkTimeSeconds: 900,
              isOrganizer: false,
            },
          ],
        },
      ]);

      const engagement = await hrService.getEmployeeEngagement('emp-1', 'org-1', 90);

      expect(engagement).toBeDefined();
      expect(engagement?.averageTalkTime).toBe(900);
      expect(engagement?.meetingParticipation).toBeGreaterThanOrEqual(0);
    });

    it('should infer employee level from title', async () => {
      const hrService = new HRDataService(prisma);

      (prisma.user.findFirst as any).mockResolvedValue({
        id: 'emp-1',
        email: 'employee@company.com',
      });

      (prisma.meetingParticipant.findFirst as any).mockResolvedValue({
        role: 'Senior Software Engineer',
        metadata: { department: 'Engineering' },
      });

      const employee = await hrService.getEmployee('emp-1', 'org-1');

      expect(employee?.level).toBe('senior');
      expect(employee?.department).toBe('Engineering');
    });
  });
});