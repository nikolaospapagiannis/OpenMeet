/**
 * Advanced AI Service
 * Handles advanced AI capabilities including categorization, vocabulary, quality scoring, and predictions
 */

import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'advanced-ai-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ====================================
// Types and Interfaces
// ====================================

export interface CategorizationOptions {
  text: string;
  customCategories?: string[];
  industryContext?: string;
  organizationId?: string;
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  suggestedCategories: Array<{ name: string; score: number }>;
  topics: string[];
  industryTags: string[];
}

export interface VocabularyExpansionOptions {
  text: string;
  organizationId: string;
  industryContext?: string;
}

export interface VocabularyExpansionResult {
  expandedText: string;
  expansions: Array<{ term: string; expansion: string; position: number }>;
  detectedAcronyms: string[];
  suggestions: Array<{ term: string; possibleExpansion: string }>;
}

export interface QualityScoreOptions {
  meetingId: string;
  meetingText: string;
  duration: number;
  participantCount: number;
  objectives?: string[];
  actionItems?: string[];
  organizationId: string;
  userId?: string;
}

export interface QualityScoreResult {
  overallScore: number;
  engagementScore: number;
  participationBalance: number;
  timeManagementScore: number;
  objectiveCompletion: number;
  actionabilityScore: number;
  clarityScore: number;
  productivityScore: number;
  sentimentScore: number;
  factors: Record<string, any>;
  recommendations: string[];
}

export interface PredictTopicsOptions {
  organizationId: string;
  limit?: number;
  teamContext?: string;
}

export interface PredictTopicsResult {
  predictedTopics: Array<{
    topic: string;
    probability: number;
    reason: string;
  }>;
  reasoning: string;
  confidence: number;
}

export interface PredictAttendeesOptions {
  meetingTopic: string;
  organizationId: string;
}

export interface PredictAttendeesResult {
  suggestedAttendees: Array<{
    name: string;
    email: string;
    reason: string;
    priority: string;
  }>;
  reasoning: Record<string, string>;
  optionalAttendees: string[];
}

export interface TrainModelOptions {
  organizationId: string;
  name: string;
  description?: string;
  modelType: 'categorization' | 'sentiment' | 'summary' | 'custom';
  baseModel?: string;
  trainingExamples: Array<Record<string, any>>;
  hyperparameters?: Record<string, any>;
}

export interface TrainModelResult {
  jobId: string;
  status: string;
  message: string;
  aiModelId: string;
}

// ====================================
// Advanced AI Service Class
// ====================================

export class AdvancedAIService {
  /**
   * Auto-categorize meeting using GPT-4
   */
  async categorizeMeeting(options: CategorizationOptions): Promise<CategorizationResult> {
    try {
      logger.info('Categorizing meeting with advanced AI');

      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/categorize`, {
        text: options.text,
        customCategories: options.customCategories,
        industryContext: options.industryContext,
        organizationId: options.organizationId,
      });

      return response.data;
    } catch (error) {
      logger.error('Error categorizing meeting:', error);
      throw new Error(`Failed to categorize meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Expand vocabulary and acronyms in text
   */
  async expandVocabulary(options: VocabularyExpansionOptions): Promise<VocabularyExpansionResult> {
    try {
      logger.info('Expanding vocabulary for organization:', options.organizationId);

      // Fetch custom vocabulary from database
      const vocabularyEntries = await prisma.customVocabulary.findMany({
        where: {
          organizationId: options.organizationId,
          isActive: true,
        },
      });

      // Build vocabulary mapping
      const vocabulary: Record<string, string> = {};
      vocabularyEntries.forEach((entry) => {
        vocabulary[entry.term] = entry.expansion || entry.definition || entry.term;
      });

      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/expand-vocabulary`, {
        text: options.text,
        vocabulary,
        industryContext: options.industryContext,
      });

      // Update usage count for used terms
      const expansions = response.data.expansions || [];
      const usedTerms = expansions.map((e: any) => e.term);

      if (usedTerms.length > 0) {
        await prisma.customVocabulary.updateMany({
          where: {
            organizationId: options.organizationId,
            term: { in: usedTerms },
          },
          data: {
            usageCount: { increment: 1 },
          },
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Error expanding vocabulary:', error);
      throw new Error(`Failed to expand vocabulary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add custom vocabulary term
   */
  async addVocabularyTerm(
    organizationId: string,
    term: string,
    expansion?: string,
    definition?: string,
    options?: {
      aliases?: string[];
      category?: string;
      industry?: string;
      usage?: string;
      userId?: string;
    }
  ) {
    try {
      logger.info(`Adding vocabulary term: ${term} for org: ${organizationId}`);

      const vocabularyEntry = await prisma.customVocabulary.create({
        data: {
          organizationId,
          term,
          expansion,
          definition,
          aliases: options?.aliases || [],
          category: options?.category,
          industry: options?.industry,
          usage: options?.usage,
          userId: options?.userId,
          isActive: true,
          usageCount: 0,
        },
      });

      return vocabularyEntry;
    } catch (error) {
      logger.error('Error adding vocabulary term:', error);
      throw new Error(`Failed to add vocabulary term: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get vocabulary terms for organization
   */
  async getVocabulary(organizationId: string, filters?: {
    category?: string;
    industry?: string;
    isActive?: boolean;
  }) {
    try {
      const where: any = { organizationId };

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.industry) {
        where.industry = filters.industry;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const vocabularyTerms = await prisma.customVocabulary.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return vocabularyTerms;
    } catch (error) {
      logger.error('Error fetching vocabulary:', error);
      throw new Error(`Failed to fetch vocabulary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete vocabulary term
   */
  async deleteVocabularyTerm(id: string, organizationId: string) {
    try {
      await prisma.customVocabulary.delete({
        where: {
          id,
          organizationId,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting vocabulary term:', error);
      throw new Error(`Failed to delete vocabulary term: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Score meeting quality
   */
  async scoreMeetingQuality(options: QualityScoreOptions): Promise<QualityScoreResult> {
    try {
      logger.info('Scoring meeting quality for meeting:', options.meetingId);

      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/quality-score`, {
        meetingText: options.meetingText,
        duration: options.duration,
        participantCount: options.participantCount,
        objectives: options.objectives,
        actionItems: options.actionItems,
      });

      const scoreData: QualityScoreResult = response.data;

      // Save quality score to database
      await prisma.qualityScore.upsert({
        where: { meetingId: options.meetingId },
        update: {
          overallScore: scoreData.overallScore,
          engagementScore: scoreData.engagementScore,
          participationBalance: scoreData.participationBalance,
          timeManagementScore: scoreData.timeManagementScore,
          objectiveCompletion: scoreData.objectiveCompletion,
          actionabilityScore: scoreData.actionabilityScore,
          clarityScore: scoreData.clarityScore,
          productivityScore: scoreData.productivityScore,
          sentimentScore: scoreData.sentimentScore,
          factors: scoreData.factors,
          recommendations: scoreData.recommendations,
        },
        create: {
          meetingId: options.meetingId,
          organizationId: options.organizationId,
          userId: options.userId,
          overallScore: scoreData.overallScore,
          engagementScore: scoreData.engagementScore,
          participationBalance: scoreData.participationBalance,
          timeManagementScore: scoreData.timeManagementScore,
          objectiveCompletion: scoreData.objectiveCompletion,
          actionabilityScore: scoreData.actionabilityScore,
          clarityScore: scoreData.clarityScore,
          productivityScore: scoreData.productivityScore,
          sentimentScore: scoreData.sentimentScore,
          factors: scoreData.factors,
          recommendations: scoreData.recommendations,
        },
      });

      return scoreData;
    } catch (error) {
      logger.error('Error scoring meeting quality:', error);
      throw new Error(`Failed to score meeting quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quality scores for user's meetings
   */
  async getQualityScores(
    organizationId: string,
    options?: {
      userId?: string;
      limit?: number;
      minScore?: number;
    }
  ) {
    try {
      const where: any = { organizationId };

      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.minScore !== undefined) {
        where.overallScore = { gte: options.minScore };
      }

      const scores = await prisma.qualityScore.findMany({
        where,
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              scheduledStartAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
      });

      return scores;
    } catch (error) {
      logger.error('Error fetching quality scores:', error);
      throw new Error(`Failed to fetch quality scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Predict next meeting topics
   */
  async predictNextTopics(options: PredictTopicsOptions): Promise<PredictTopicsResult> {
    try {
      logger.info('Predicting next topics for organization:', options.organizationId);

      // Fetch recent meetings
      const recentMeetings = await prisma.meeting.findMany({
        where: {
          organizationId: options.organizationId,
          status: 'completed',
        },
        include: {
          summaries: {
            select: {
              title: true,
              keyPoints: true,
              actionItems: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          analytics: {
            select: {
              topics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
      });

      // Format meeting data for AI
      const meetingsData = recentMeetings.map((meeting) => ({
        title: meeting.title,
        topics: (meeting.analytics[0]?.topics as string[]) || [],
        actionItems: (meeting.summaries[0]?.actionItems as string[]) || [],
      }));

      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/predict-next-topics`, {
        recentMeetings: meetingsData,
        teamContext: options.teamContext,
      });

      return response.data;
    } catch (error) {
      logger.error('Error predicting topics:', error);
      throw new Error(`Failed to predict topics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Predict required attendees for meeting
   */
  async predictRequiredAttendees(options: PredictAttendeesOptions): Promise<PredictAttendeesResult> {
    try {
      logger.info('Predicting attendees for topic:', options.meetingTopic);

      // Fetch recent meetings with participant data
      const recentMeetings = await prisma.meeting.findMany({
        where: {
          organizationId: options.organizationId,
          status: 'completed',
        },
        include: {
          participants: {
            select: {
              name: true,
              email: true,
              role: true,
              talkTimeSeconds: true,
            },
          },
          analytics: {
            select: {
              topics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // Format meeting data
      const meetingsData = recentMeetings.map((meeting) => ({
        title: meeting.title,
        attendees: meeting.participants.map((p) => p.email || p.name),
        topics: (meeting.analytics[0]?.topics as string[]) || [],
      }));

      // Get organization users as available attendees
      const users = await prisma.user.findMany({
        where: {
          organizationId: options.organizationId,
          isActive: true,
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      const availableAttendees = users.map((user) => ({
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
      }));

      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/predict-attendees`, {
        meetingTopic: options.meetingTopic,
        recentMeetings: meetingsData,
        availableAttendees,
      });

      return response.data;
    } catch (error) {
      logger.error('Error predicting attendees:', error);
      throw new Error(`Failed to predict attendees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Train custom AI model
   */
  async trainCustomModel(options: TrainModelOptions): Promise<TrainModelResult> {
    try {
      logger.info('Training custom model for organization:', options.organizationId);

      // Create AI model record
      const aiModel = await prisma.aIModel.create({
        data: {
          organizationId: options.organizationId,
          name: options.name,
          description: options.description,
          type: options.modelType,
          status: 'training',
          baseModel: options.baseModel || 'gpt-3.5-turbo',
          trainingDataCount: options.trainingExamples.length,
          customParameters: options.hyperparameters || {},
        },
      });

      // Call AI service to start training
      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/train-model`, {
        organizationId: options.organizationId,
        modelType: options.modelType,
        baseModel: options.baseModel || 'gpt-3.5-turbo',
        trainingExamples: options.trainingExamples,
        hyperparameters: options.hyperparameters,
      });

      // Update AI model with job ID
      await prisma.aIModel.update({
        where: { id: aiModel.id },
        data: {
          fineTuneJobId: response.data.jobId,
          metadata: {
            trainingStarted: new Date().toISOString(),
            initialStatus: response.data.status,
          },
        },
      });

      return {
        ...response.data,
        aiModelId: aiModel.id,
      };
    } catch (error) {
      logger.error('Error training custom model:', error);
      throw new Error(`Failed to train custom model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get custom model status
   */
  async getModelStatus(modelId: string, organizationId: string) {
    try {
      const aiModel = await prisma.aIModel.findFirst({
        where: {
          id: modelId,
          organizationId,
        },
      });

      if (!aiModel) {
        throw new Error('Model not found');
      }

      // If training, check status from AI service
      if (aiModel.status === 'training' && aiModel.fineTuneJobId) {
        try {
          const response = await axios.get(`${AI_SERVICE_URL}/api/v1/train-model/${aiModel.fineTuneJobId}`);

          // Update model status if changed
          if (response.data.status === 'succeeded') {
            await prisma.aIModel.update({
              where: { id: modelId },
              data: {
                status: 'ready',
                modelId: response.data.fineTunedModel,
                trainedAt: new Date(),
                performanceMetrics: response.data.progress || {},
              },
            });
          } else if (response.data.status === 'failed') {
            await prisma.aIModel.update({
              where: { id: modelId },
              data: {
                status: 'failed',
                metadata: {
                  ...((aiModel.metadata as Record<string, any>) || {}),
                  error: response.data.error,
                },
              },
            });
          }

          return {
            ...aiModel,
            trainingStatus: response.data,
          };
        } catch (error) {
          logger.warn('Failed to fetch training status from AI service:', error);
        }
      }

      return aiModel;
    } catch (error) {
      logger.error('Error getting model status:', error);
      throw new Error(`Failed to get model status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List custom models for organization
   */
  async listModels(organizationId: string, options?: {
    type?: string;
    status?: string;
  }) {
    try {
      const where: any = { organizationId };

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.status) {
        where.status = options.status;
      }

      const models = await prisma.aIModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return models;
    } catch (error) {
      logger.error('Error listing models:', error);
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new AdvancedAIService();
