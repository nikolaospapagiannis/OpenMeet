/**
 * Fine-Tuning API Routes
 * Endpoints for managing custom AI model fine-tuning
 * ZERO TOLERANCE: Real API endpoints with actual service integration
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import FineTuningService from '../services/ai/FineTuningService';
import TrainingDataService from '../services/ai/TrainingDataService';
import IndustryTemplateService from '../services/ai/IndustryModelTemplates';
import { authMiddleware as authenticate, requireRole } from '../middleware/auth';
import winston from 'winston';

const router = Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'fine-tuning-routes' },
  transports: [new winston.transports.Console()],
});

// ====================================
// Middleware
// ====================================

/**
 * Validation error handler
 */
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

// All routes require authentication
router.use(authenticate);

// ====================================
// Industry Templates
// ====================================

/**
 * GET /api/fine-tuning/templates
 * List all industry templates
 */
router.get('/templates', async (req: any, res: any) => {
  try {
    const { industry, modelType } = req.query;

    let templates = IndustryTemplateService.listTemplates();

    if (industry) {
      templates = IndustryTemplateService.getTemplatesByIndustry(industry);
    }

    if (modelType) {
      templates = IndustryTemplateService.getTemplatesByModelType(modelType);
    }

    res.json({
      success: true,
      data: {
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          industry: t.industry,
          modelType: t.modelType,
          baseModel: t.baseModel,
          complianceRequirements: t.complianceRequirements,
          exampleCount: t.trainingExamples.length,
        })),
        total: templates.length,
      },
    });
  } catch (error) {
    logger.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list templates',
    });
  }
});

/**
 * GET /api/fine-tuning/templates/:templateId
 * Get template details
 */
router.get(
  '/templates/:templateId',
  [param('templateId').isString().notEmpty()],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { templateId } = req.params;

      const template = IndustryTemplateService.getTemplate(templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Error getting template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template',
      });
    }
  }
);

// ====================================
// Training Data
// ====================================

/**
 * POST /api/fine-tuning/training-data/extract
 * Extract training data from meetings
 */
router.post(
  '/training-data/extract',
  requireRole(['admin', 'owner']),
  [
    body('modelType').isIn(['categorization', 'sentiment', 'summary', 'custom']),
    body('filters').optional().isObject(),
    body('limit').optional().isInt({ min: 10, max: 1000 }),
    body('industryTemplate').optional().isString(),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { modelType, filters, limit, industryTemplate } = req.body;
      const organizationId = req.user.organizationId;

      const trainingData = await TrainingDataService.extractTrainingData({
        organizationId,
        modelType,
        filters,
        limit,
        industryTemplate,
      });

      res.json({
        success: true,
        data: trainingData,
      });
    } catch (error) {
      logger.error('Error extracting training data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract training data',
      });
    }
  }
);

/**
 * GET /api/fine-tuning/training-data/preview
 * Preview training data samples
 */
router.get(
  '/training-data/preview',
  [
    query('modelType').isIn(['categorization', 'sentiment', 'summary', 'custom']),
    query('sampleSize').optional().isInt({ min: 1, max: 20 }),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { modelType, sampleSize } = req.query;
      const organizationId = req.user.organizationId;

      const samples = await TrainingDataService.previewTrainingData(
        organizationId,
        modelType,
        parseInt(sampleSize || '5')
      );

      res.json({
        success: true,
        data: {
          samples,
          count: samples.length,
        },
      });
    } catch (error) {
      logger.error('Error previewing training data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview training data',
      });
    }
  }
);

/**
 * POST /api/fine-tuning/training-data/upload
 * Upload training data to OpenAI
 */
router.post(
  '/training-data/upload',
  requireRole(['admin', 'owner']),
  [body('trainingData').isArray(), body('fileName').optional().isString()],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { trainingData, fileName } = req.body;
      const organizationId = req.user.organizationId;

      const fileId = await FineTuningService.uploadTrainingFile(organizationId, trainingData, fileName);

      res.json({
        success: true,
        data: {
          fileId,
          exampleCount: trainingData.length,
          message: 'Training data uploaded successfully',
        },
      });
    } catch (error) {
      logger.error('Error uploading training data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload training data',
      });
    }
  }
);

// ====================================
// Fine-Tuning Jobs
// ====================================

/**
 * POST /api/fine-tuning/jobs
 * Create fine-tuning job
 */
router.post(
  '/jobs',
  requireRole(['admin', 'owner']),
  [
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('modelType').isIn(['categorization', 'sentiment', 'summary', 'custom']),
    body('baseModel').isString().notEmpty(),
    body('trainingFileId').isString().notEmpty(),
    body('validationFileId').optional().isString(),
    body('hyperparameters').optional().isObject(),
    body('industryTemplate').optional().isString(),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const organizationId = req.user.organizationId;
      const userId = req.user.id;

      const jobStatus = await FineTuningService.createFineTuningJob({
        organizationId,
        userId,
        name: req.body.name,
        description: req.body.description,
        modelType: req.body.modelType,
        baseModel: req.body.baseModel,
        trainingFileId: req.body.trainingFileId,
        validationFileId: req.body.validationFileId,
        hyperparameters: req.body.hyperparameters,
        industryTemplate: req.body.industryTemplate,
      });

      res.status(201).json({
        success: true,
        data: jobStatus,
        message: 'Fine-tuning job created successfully',
      });
    } catch (error) {
      logger.error('Error creating fine-tuning job:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create fine-tuning job',
      });
    }
  }
);

/**
 * GET /api/fine-tuning/jobs
 * List fine-tuning jobs
 */
router.get(
  '/jobs',
  [query('status').optional().isString(), query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const organizationId = req.user.organizationId;
      const { status, limit } = req.query;

      const jobs = await FineTuningService.listJobs(organizationId, {
        status,
        limit: limit ? parseInt(limit) : undefined,
        userId: req.query.userId,
      });

      res.json({
        success: true,
        data: {
          jobs,
          total: jobs.length,
        },
      });
    } catch (error) {
      logger.error('Error listing jobs:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list jobs',
      });
    }
  }
);

/**
 * GET /api/fine-tuning/jobs/:jobId
 * Get fine-tuning job status
 */
router.get(
  '/jobs/:jobId',
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { jobId } = req.params;
      const organizationId = req.user.organizationId;

      const jobStatus = await FineTuningService.getJobStatus(jobId, organizationId);

      res.json({
        success: true,
        data: jobStatus,
      });
    } catch (error) {
      logger.error('Error getting job status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job status',
      });
    }
  }
);

/**
 * DELETE /api/fine-tuning/jobs/:jobId
 * Cancel fine-tuning job
 */
router.delete(
  '/jobs/:jobId',
  requireRole(['admin', 'owner']),
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { jobId } = req.params;
      const organizationId = req.user.organizationId;

      await FineTuningService.cancelJob(jobId, organizationId);

      res.json({
        success: true,
        message: 'Fine-tuning job cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling job:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel job',
      });
    }
  }
);

// ====================================
// Fine-Tuned Models
// ====================================

/**
 * GET /api/fine-tuning/models
 * List fine-tuned models
 */
router.get(
  '/models',
  [
    query('type').optional().isString(),
    query('status').optional().isString(),
    query('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const organizationId = req.user.organizationId;
      const { type, status, isActive } = req.query;

      const models = await FineTuningService.listModels(organizationId, {
        type,
        status,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });

      res.json({
        success: true,
        data: {
          models,
          total: models.length,
        },
      });
    } catch (error) {
      logger.error('Error listing models:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list models',
      });
    }
  }
);

/**
 * POST /api/fine-tuning/models/:modelId/deploy
 * Deploy fine-tuned model
 */
router.post(
  '/models/:modelId/deploy',
  requireRole(['admin', 'owner']),
  [
    param('modelId').isString().notEmpty(),
    body('deploymentName').optional().isString(),
    body('autoActivate').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { modelId } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.id;

      const deployedModel = await FineTuningService.deployModel({
        modelId,
        organizationId,
        userId,
        deploymentName: req.body.deploymentName,
        autoActivate: req.body.autoActivate,
      });

      res.json({
        success: true,
        data: deployedModel,
        message: 'Model deployed successfully',
      });
    } catch (error) {
      logger.error('Error deploying model:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deploy model',
      });
    }
  }
);

/**
 * POST /api/fine-tuning/models/:modelId/use
 * Use fine-tuned model for completion
 */
router.post(
  '/models/:modelId/use',
  [param('modelId').isString().notEmpty(), body('messages').isArray().notEmpty()],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { modelId } = req.params;
      const { messages } = req.body;
      const organizationId = req.user.organizationId;

      const completion = await FineTuningService.useModel(modelId, organizationId, messages);

      res.json({
        success: true,
        data: {
          completion,
          modelId,
        },
      });
    } catch (error) {
      logger.error('Error using model:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to use model',
      });
    }
  }
);

/**
 * DELETE /api/fine-tuning/models/:modelId
 * Delete fine-tuned model
 */
router.delete(
  '/models/:modelId',
  requireRole(['admin', 'owner']),
  [param('modelId').isString().notEmpty()],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { modelId } = req.params;
      const organizationId = req.user.organizationId;

      await FineTuningService.deleteModel(modelId, organizationId);

      res.json({
        success: true,
        message: 'Model deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting model:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete model',
      });
    }
  }
);

// ====================================
// Complete Fine-Tuning Workflow
// ====================================

/**
 * POST /api/fine-tuning/workflows/start
 * Start complete fine-tuning workflow
 */
router.post(
  '/workflows/start',
  requireRole(['admin', 'owner']),
  [
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('modelType').isIn(['categorization', 'sentiment', 'summary', 'custom']),
    body('industryTemplate').optional().isString(),
    body('baseModel').isString().notEmpty(),
    body('trainingDataFilters').optional().isObject(),
    body('hyperparameters').optional().isObject(),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const organizationId = req.user.organizationId;
      const userId = req.user.id;

      // Step 1: Extract training data
      logger.info('Step 1: Extracting training data');
      const trainingData = await TrainingDataService.extractTrainingData({
        organizationId,
        modelType: req.body.modelType,
        filters: req.body.trainingDataFilters,
        industryTemplate: req.body.industryTemplate,
      });

      if (trainingData.validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Training data validation failed',
          validationErrors: trainingData.validationErrors,
        });
      }

      // Step 2: Upload training file
      logger.info('Step 2: Uploading training file to OpenAI');
      const trainingFileId = await FineTuningService.uploadTrainingFile(
        organizationId,
        trainingData.examples,
        `${req.body.name}-training.jsonl`
      );

      // Step 3: Create fine-tuning job
      logger.info('Step 3: Creating fine-tuning job');
      const jobStatus = await FineTuningService.createFineTuningJob({
        organizationId,
        userId,
        name: req.body.name,
        description: req.body.description,
        modelType: req.body.modelType,
        baseModel: req.body.baseModel,
        trainingFileId,
        hyperparameters: req.body.hyperparameters,
        industryTemplate: req.body.industryTemplate,
      });

      res.status(201).json({
        success: true,
        data: {
          job: jobStatus,
          trainingStats: trainingData.statistics,
          message: 'Fine-tuning workflow started successfully',
        },
      });
    } catch (error) {
      logger.error('Error starting fine-tuning workflow:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start fine-tuning workflow',
      });
    }
  }
);

export default router;
