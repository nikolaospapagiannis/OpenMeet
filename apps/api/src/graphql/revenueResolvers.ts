/**
 * Revenue Intelligence GraphQL Resolvers
 * GAP #2 - Gong Competitor Features
 */

import { PrismaClient } from '@prisma/client';
import RevenueIntelligenceService from '../services/RevenueIntelligenceService';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const revenueService = new RevenueIntelligenceService(prisma, redis);

export const revenueResolvers = {
  Query: {
    deal: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.getDeal(id, context.user.organizationId);
    },

    deals: async (_: any, filters: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.listDeals(context.user.organizationId, filters);
    },

    winLossAnalysis: async (_: any, { startDate, endDate }: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.getWinLossAnalysis(
        context.user.organizationId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
    },

    scorecard: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return prisma.scorecard.findFirst({
        where: {
          id,
          organizationId: context.user.organizationId,
        },
      });
    },

    userScorecards: async (_: any, { userId, limit }: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.getUserScorecards(
        userId,
        context.user.organizationId,
        limit || 10
      );
    },

    pipelineMetrics: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.getPipelineInsights(context.user.organizationId);
    },
  },

  Mutation: {
    createDeal: async (_: any, { input }: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.createDeal(context.user.organizationId, input);
    },

    updateDeal: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.updateDeal(id, context.user.organizationId, input);
    },

    recordWinLoss: async (_: any, { input }: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.recordWinLoss(context.user.organizationId, {
        ...input,
        closedDate: new Date(input.closedDate),
      });
    },

    generateScorecard: async (_: any, { meetingId, userId, dealId }: any, context: any) => {
      if (!context.user) throw new Error('Authentication required');
      return revenueService.generateScorecard(
        meetingId,
        userId || context.user.id,
        context.user.organizationId,
        dealId
      );
    },
  },

  Deal: {
    owner: (parent: any) => {
      if (!parent.owner) return null;
      return parent.owner;
    },
    meetings: async (parent: any) => {
      const dealMeetings = await prisma.dealMeeting.findMany({
        where: { dealId: parent.id },
        include: { meeting: true },
      });
      return dealMeetings.map(dm => dm.meeting);
    },
    winLoss: async (parent: any) => {
      return prisma.winLoss.findUnique({
        where: { dealId: parent.id },
      });
    },
  },

  Scorecard: {
    meeting: (parent: any) => {
      return prisma.meeting.findUnique({
        where: { id: parent.meetingId },
      });
    },
    user: (parent: any) => {
      return prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },
};

export default revenueResolvers;
