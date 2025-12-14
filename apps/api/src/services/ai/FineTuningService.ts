/**
 * Fine-Tuning Service
 * Manages custom AI model fine-tuning using OpenAI API
 * ZERO TOLERANCE: Real OpenAI API integration only - NO MOCKS
 */

import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'fine-tuning-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

// ====================================
// Types and Interfaces
// ====================================

export interface CreateFineTuningJobOptions {
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  modelType: 'categorization' | 'sentiment' | 'summary' | 'custom';
  baseModel: string; // e.g., 'gpt-3.5-turbo-1106', 'gpt-4-0613'
  trainingFileId: string; // OpenAI file ID
  validationFileId?: string; // Optional validation file
  hyperparameters?: {
    n_epochs?: number;
    batch_size?: number;
    learning_rate_multiplier?: number;
  };
  industryTemplate?: string;
}

export interface FineTuningJobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  fineTunedModel?: string;
  trainingProgress?: {
    currentEpoch: number;
    totalEpochs: number;
    trainLoss: number;
    validLoss?: number;
  };
  estimatedCompletionTime?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FineTunedModel {
  id: string;
  name: string;
  modelId: string; // OpenAI model ID (e.g., ft:gpt-3.5-turbo:org:name:id)
  baseModel: string;
  type: string;
  status: string;
  organizationId: string;
  performanceMetrics?: {
    accuracy?: number;
    trainLoss: number;
    validLoss?: number;
    trainingExamples: number;
  };
  deployedAt?: Date;
  isActive: boolean;
}

export interface DeployModelOptions {
  modelId: string;
  organizationId: string;
  userId: string;
  deploymentName?: string;
  autoActivate?: boolean;
}

// ====================================
// Fine-Tuning Service Class
// ====================================

export class FineTuningService {
  /**
   * Upload training data file to OpenAI
   * REAL: Uses actual OpenAI Files API
   */
  async uploadTrainingFile(
    organizationId: string,
    trainingData: Array<{ messages: Array<{ role: string; content: string }> }>,
    fileName?: string
  ): Promise<string> {
    try {
      logger.info(`Uploading training file for organization: ${organizationId}`);

      // Convert training data to JSONL format
      const jsonlContent = trainingData
        .map((example) => JSON.stringify(example))
        .join('\n');

      // Write to temporary file
      const tempFileName = fileName || `training-${organizationId}-${uuidv4()}.jsonl`;
      const tempFilePath = join(tmpdir(), tempFileName);

      await writeFile(tempFilePath, jsonlContent, 'utf-8');

      // Upload to OpenAI
      const fileStream = createReadStream(tempFilePath);
      const uploadResponse = await openai.files.create({
        file: fileStream,
        purpose: 'fine-tune',
      });

      // Clean up temp file
      await unlink(tempFilePath).catch((err) =>
        logger.warn(`Failed to delete temp file: ${err.message}`)
      );

      // Store file metadata in AIModel metadata (fineTuneFile model doesn't exist)
      // File info will be associated with the AIModel when job is created
      logger.info(`Training file uploaded: ${uploadResponse.id}`, {
        organizationId,
        fileId: uploadResponse.id,
        bytes: uploadResponse.bytes,
        exampleCount: trainingData.length,
      });

      logger.info(`Successfully uploaded training file: ${uploadResponse.id}`);
      return uploadResponse.id;
    } catch (error) {
      logger.error('Error uploading training file:', error);
      throw new Error(`Failed to upload training file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create fine-tuning job with OpenAI
   * REAL: Uses actual OpenAI Fine-tuning API
   */
  async createFineTuningJob(options: CreateFineTuningJobOptions): Promise<FineTuningJobStatus> {
    try {
      logger.info(`Creating fine-tuning job for organization: ${options.organizationId}`);

      // Validate OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      // Create fine-tuning job with OpenAI
      const fineTuneJob = await openai.fineTuning.jobs.create({
        training_file: options.trainingFileId,
        validation_file: options.validationFileId,
        model: options.baseModel,
        hyperparameters: options.hyperparameters,
        suffix: options.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 40),
      });

      // Store job in AIModel record (fineTuningJob model doesn't exist)
      const modelId = uuidv4();
      await prisma.aIModel.create({
        data: {
          id: modelId,
          organizationId: options.organizationId,
          name: options.name,
          description: options.description,
          type: options.modelType,
          status: 'training',
          baseModel: options.baseModel,
          fineTuneJobId: fineTuneJob.id,
          trainingDataCount: 0, // Will be updated when job completes
          customParameters: options.hyperparameters || {},
          metadata: {
            industryTemplate: options.industryTemplate,
            createdBy: options.userId,
            trainingFileId: options.trainingFileId,
            validationFileId: options.validationFileId,
            openaiJobId: fineTuneJob.id,
            jobStatus: fineTuneJob.status,
          },
        },
      });

      logger.info(`Fine-tuning job created: ${fineTuneJob.id}`);

      return {
        id: modelId,
        status: fineTuneJob.status as any,
        createdAt: new Date(fineTuneJob.created_at * 1000),
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error creating fine-tuning job:', error);
      throw new Error(`Failed to create fine-tuning job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get fine-tuning job status from OpenAI
   * REAL: Queries actual OpenAI API for job status
   */
  async getJobStatus(jobId: string, organizationId: string): Promise<FineTuningJobStatus> {
    try {
      logger.info(`Getting status for fine-tuning job: ${jobId}`);

      // Get AIModel with job info (fineTuningJob model doesn't exist)
      const model = await prisma.aIModel.findFirst({
        where: {
          id: jobId,
          organizationId,
        },
      });

      if (!model || !model.fineTuneJobId) {
        throw new Error('Fine-tuning job not found');
      }

      // Fetch current status from OpenAI
      const openaiJob = await openai.fineTuning.jobs.retrieve(model.fineTuneJobId);

      const metadata = model.metadata as Record<string, any> || {};

      // Update AIModel with latest status
      await prisma.aIModel.update({
        where: { id: jobId },
        data: {
          status: openaiJob.status === 'succeeded' ? 'ready' : openaiJob.status === 'failed' ? 'failed' : 'training',
          modelId: openaiJob.fine_tuned_model || undefined,
          trainedAt: openaiJob.status === 'succeeded' ? new Date() : undefined,
          metadata: {
            ...metadata,
            jobStatus: openaiJob.status,
            fineTunedModel: openaiJob.fine_tuned_model,
            error: openaiJob.error?.message,
            finishedAt: openaiJob.finished_at ? new Date(openaiJob.finished_at * 1000).toISOString() : null,
          },
        },
      });

      // If job succeeded, update AI model
      if (openaiJob.status === 'succeeded' && openaiJob.fine_tuned_model) {
        await prisma.aIModel.updateMany({
          where: {
            organizationId,
            fineTuneJobId: openaiJob.id,
          },
          data: {
            status: 'ready',
            modelId: openaiJob.fine_tuned_model,
            trainedAt: new Date(),
            performanceMetrics: {
              trainedTokens: openaiJob.trained_tokens || 0,
            },
          },
        });
      } else if (openaiJob.status === 'failed') {
        await prisma.aIModel.updateMany({
          where: {
            organizationId,
            fineTuneJobId: openaiJob.id,
          },
          data: {
            status: 'failed',
          },
        });
      }

      // Calculate estimated completion time if running
      let estimatedCompletionTime: Date | undefined;
      if (openaiJob.status === 'running' && openaiJob.estimated_finish) {
        estimatedCompletionTime = new Date(openaiJob.estimated_finish * 1000);
      }

      return {
        id: jobId,
        status: openaiJob.status as any,
        fineTunedModel: openaiJob.fine_tuned_model || undefined,
        estimatedCompletionTime,
        error: openaiJob.error?.message,
        createdAt: new Date(openaiJob.created_at * 1000),
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error getting job status:', error);
      throw new Error(`Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all fine-tuning jobs for organization
   */
  async listJobs(
    organizationId: string,
    options?: {
      status?: string;
      limit?: number;
      userId?: string;
    }
  ): Promise<FineTuningJobStatus[]> {
    try {
      const where: any = {
        organizationId,
        fineTuneJobId: { not: null }, // Only models with fine-tuning jobs
      };

      if (options?.status) {
        where.status = options.status;
      }

      // userId is stored in metadata
      const models = await prisma.aIModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
      });

      // Filter by userId if specified (stored in metadata)
      let filteredModels = models;
      if (options?.userId) {
        filteredModels = models.filter(m => {
          const metadata = m.metadata as Record<string, any> || {};
          return metadata.createdBy === options.userId;
        });
      }

      return filteredModels.map((model) => {
        const metadata = model.metadata as Record<string, any> || {};
        return {
          id: model.id,
          status: (metadata.jobStatus || model.status) as any,
          fineTunedModel: model.modelId || undefined,
          error: metadata.error || undefined,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
        };
      });
    } catch (error) {
      logger.error('Error listing jobs:', error);
      throw new Error(`Failed to list jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a running fine-tuning job
   * REAL: Calls OpenAI API to cancel job
   */
  async cancelJob(jobId: string, organizationId: string): Promise<void> {
    try {
      logger.info(`Cancelling fine-tuning job: ${jobId}`);

      const model = await prisma.aIModel.findFirst({
        where: {
          id: jobId,
          organizationId,
        },
      });

      if (!model || !model.fineTuneJobId) {
        throw new Error('Fine-tuning job not found');
      }

      // Cancel job with OpenAI
      await openai.fineTuning.jobs.cancel(model.fineTuneJobId);

      const metadata = model.metadata as Record<string, any> || {};

      // Update AIModel
      await prisma.aIModel.update({
        where: { id: jobId },
        data: {
          status: 'failed', // 'cancelled' is not a valid AIModelStatus
          metadata: {
            ...metadata,
            jobStatus: 'cancelled',
            cancelledAt: new Date().toISOString(),
          },
        },
      });

      logger.info(`Successfully cancelled job: ${jobId}`);
    } catch (error) {
      logger.error('Error cancelling job:', error);
      throw new Error(`Failed to cancel job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deploy a fine-tuned model for use
   */
  async deployModel(options: DeployModelOptions): Promise<FineTunedModel> {
    try {
      logger.info(`Deploying model: ${options.modelId}`);

      const model = await prisma.aIModel.findFirst({
        where: {
          id: options.modelId,
          organizationId: options.organizationId,
        },
      });

      if (!model) {
        throw new Error('Model not found');
      }

      if (model.status !== 'ready') {
        throw new Error(`Model is not ready for deployment. Current status: ${model.status}`);
      }

      const existingMetadata = model.metadata as Record<string, any> || {};

      // If auto-activate, deactivate other models of the same type (using metadata)
      if (options.autoActivate) {
        const otherModels = await prisma.aIModel.findMany({
          where: {
            organizationId: options.organizationId,
            type: model.type,
            id: { not: options.modelId },
          },
        });

        for (const other of otherModels) {
          const otherMetadata = other.metadata as Record<string, any> || {};
          if (otherMetadata.isActive) {
            await prisma.aIModel.update({
              where: { id: other.id },
              data: {
                metadata: { ...otherMetadata, isActive: false },
              },
            });
          }
        }
      }

      // Deploy the model (store deployment info in metadata)
      const deployedModel = await prisma.aIModel.update({
        where: { id: options.modelId },
        data: {
          metadata: {
            ...existingMetadata,
            isActive: options.autoActivate ?? true,
            deployedAt: new Date().toISOString(),
            deployedBy: options.userId,
          },
        },
      });

      const deployedMetadata = deployedModel.metadata as Record<string, any> || {};

      logger.info(`Model deployed successfully: ${options.modelId}`);

      return {
        id: deployedModel.id,
        name: deployedModel.name,
        modelId: deployedModel.modelId || '',
        baseModel: deployedModel.baseModel,
        type: deployedModel.type,
        status: deployedModel.status,
        organizationId: deployedModel.organizationId,
        performanceMetrics: deployedModel.performanceMetrics as any,
        deployedAt: deployedMetadata.deployedAt ? new Date(deployedMetadata.deployedAt) : undefined,
        isActive: deployedMetadata.isActive ?? false,
      };
    } catch (error) {
      logger.error('Error deploying model:', error);
      throw new Error(`Failed to deploy model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List fine-tuned models for organization
   */
  async listModels(
    organizationId: string,
    options?: {
      type?: string;
      status?: string;
      isActive?: boolean;
    }
  ): Promise<FineTunedModel[]> {
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

      // Filter by isActive if specified (stored in metadata)
      let filteredModels = models;
      if (options?.isActive !== undefined) {
        filteredModels = models.filter(m => {
          const metadata = m.metadata as Record<string, any> || {};
          return metadata.isActive === options.isActive;
        });
      }

      return filteredModels.map((model) => {
        const metadata = model.metadata as Record<string, any> || {};
        return {
          id: model.id,
          name: model.name,
          modelId: model.modelId || '',
          baseModel: model.baseModel,
          type: model.type,
          status: model.status,
          organizationId: model.organizationId,
          performanceMetrics: model.performanceMetrics as any,
          deployedAt: metadata.deployedAt ? new Date(metadata.deployedAt) : undefined,
          isActive: metadata.isActive ?? false,
        };
      });
    } catch (error) {
      logger.error('Error listing models:', error);
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a fine-tuned model
   * NOTE: This only marks the model as deleted in our DB
   * OpenAI doesn't provide API to delete fine-tuned models
   */
  async deleteModel(modelId: string, organizationId: string): Promise<void> {
    try {
      logger.info(`Deleting model: ${modelId}`);

      await prisma.aIModel.delete({
        where: {
          id: modelId,
          organizationId,
        },
      });

      logger.info(`Model deleted: ${modelId}`);
    } catch (error) {
      logger.error('Error deleting model:', error);
      throw new Error(`Failed to delete model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use a fine-tuned model for completion
   * REAL: Calls OpenAI API with the fine-tuned model
   */
  async useModel(
    modelId: string,
    organizationId: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    try {
      const model = await prisma.aIModel.findFirst({
        where: {
          id: modelId,
          organizationId,
          status: 'ready',
        },
      });

      if (!model || !model.modelId) {
        throw new Error('Model not found or not ready');
      }

      // Call OpenAI with fine-tuned model
      const completion = await openai.chat.completions.create({
        model: model.modelId,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      // Track usage (store usageCount in metadata since field doesn't exist)
      const modelData = await prisma.aIModel.findUnique({ where: { id: modelId } });
      const metadata = (modelData?.metadata as Record<string, any>) || {};
      await prisma.aIModel.update({
        where: { id: modelId },
        data: {
          lastUsedAt: new Date(),
          metadata: {
            ...metadata,
            usageCount: (metadata.usageCount || 0) + 1,
          },
        },
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('Error using model:', error);
      throw new Error(`Failed to use model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new FineTuningService();
