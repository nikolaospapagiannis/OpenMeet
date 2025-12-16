/**
 * AI/ML Operations Dashboard Routes
 * Super Admin Dashboard API endpoints for AI/ML management
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { requirePermission, auditAdminAction, requireRole } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Entity types for audit log storage
const AI_MODEL_CONFIG_ENTITY = 'ai_model_config';
const AI_PROMPT_TEMPLATE_ENTITY = 'ai_prompt_template';
const AI_GUARDRAILS_ENTITY = 'ai_guardrails';
const AI_COST_LIMITS_ENTITY = 'ai_cost_limits';

// Encryption key for API keys (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.AI_API_KEY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Model pricing per 1M tokens (in USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'claude-opus-4-5-20250514': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'gemini-1.5-pro': { input: 3.50, output: 10.50 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'mistral-large': { input: 4.00, output: 12.00 },
  'mistral-medium': { input: 2.70, output: 8.10 },
  'mistral-small': { input: 1.00, output: 3.00 },
};

// Zod Schemas for validation
const AIModelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  provider: z.enum(['openai', 'anthropic', 'google', 'mistral', 'azure', 'custom']),
  modelId: z.string().min(1),
  apiKey: z.string().optional(),
  apiEndpoint: z.string().url().optional(),
  maxTokens: z.number().int().min(1).max(200000).default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  enabled: z.boolean().default(true),
  rateLimitRpm: z.number().int().min(1).default(60),
  rateLimitTpm: z.number().int().min(1).default(100000),
  costPerInputToken: z.number().min(0).optional(),
  costPerOutputToken: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

const PromptTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    required: z.boolean().default(true),
    defaultValue: z.unknown().optional(),
    description: z.string().optional(),
  })).optional(),
  modelConfig: z.object({
    preferredModel: z.string().optional(),
    maxTokens: z.number().int().optional(),
    temperature: z.number().optional(),
  }).optional(),
  enabled: z.boolean().default(true),
  version: z.number().int().default(1),
});

const GuardrailsSchema = z.object({
  contentFiltering: z.object({
    enabled: z.boolean().default(true),
    blockProfanity: z.boolean().default(true),
    blockHateSpeech: z.boolean().default(true),
    blockViolence: z.boolean().default(true),
    blockSexualContent: z.boolean().default(true),
    blockPII: z.boolean().default(true),
    customBlocklist: z.array(z.string()).optional(),
  }),
  inputValidation: z.object({
    enabled: z.boolean().default(true),
    maxInputLength: z.number().int().min(1).default(100000),
    maxConversationTurns: z.number().int().min(1).default(50),
    allowedTopics: z.array(z.string()).optional(),
    blockedTopics: z.array(z.string()).optional(),
  }),
  outputValidation: z.object({
    enabled: z.boolean().default(true),
    maxOutputLength: z.number().int().min(1).default(50000),
    requireCitations: z.boolean().default(false),
    enforceFormatting: z.boolean().default(false),
  }),
  rateLimiting: z.object({
    enabled: z.boolean().default(true),
    requestsPerMinute: z.number().int().min(1).default(60),
    tokensPerMinute: z.number().int().min(1).default(100000),
    requestsPerDay: z.number().int().min(1).default(10000),
    tokensPerDay: z.number().int().min(1).default(1000000),
  }),
  monitoring: z.object({
    logAllRequests: z.boolean().default(true),
    alertOnHighUsage: z.boolean().default(true),
    alertThresholdPercent: z.number().min(0).max(100).default(80),
    alertOnErrors: z.boolean().default(true),
    errorAlertThreshold: z.number().int().min(1).default(10),
  }),
});

const CostLimitsSchema = z.object({
  globalDailyLimit: z.number().min(0).optional(),
  globalMonthlyLimit: z.number().min(0).optional(),
  perOrganizationDailyLimit: z.number().min(0).optional(),
  perOrganizationMonthlyLimit: z.number().min(0).optional(),
  perUserDailyLimit: z.number().min(0).optional(),
  perUserMonthlyLimit: z.number().min(0).optional(),
  alertThresholds: z.array(z.number().min(0).max(100)).default([50, 75, 90, 100]),
  hardLimitAction: z.enum(['block', 'throttle', 'notify']).default('notify'),
});

// Helper functions
function encryptApiKey(plainKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptApiKey(encryptedKey: string): string {
  const [ivHex, encrypted] = encryptedKey.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted key format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  return inputCost + outputCost;
}

function getDateRangeForPeriod(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'quarter':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

// ====================================================================
// MODEL MANAGEMENT ENDPOINTS
// ====================================================================

/**
 * GET /models - List all AI model configurations
 */
router.get(
  '/models',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { enabled, provider } = req.query;

      const modelConfigs = await prisma.auditLog.findMany({
        where: {
          entityType: AI_MODEL_CONFIG_ENTITY,
          action: { startsWith: 'ai_model:' },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['entityId'],
      });

      let models = modelConfigs.map((log) => {
        const changes = log.changes as Record<string, unknown>;
        return {
          id: log.entityId,
          name: changes?.name || log.entityId,
          provider: changes?.provider || 'unknown',
          modelId: changes?.modelId || '',
          maxTokens: changes?.maxTokens || 4096,
          temperature: changes?.temperature || 0.7,
          enabled: changes?.enabled ?? true,
          rateLimitRpm: changes?.rateLimitRpm || 60,
          rateLimitTpm: changes?.rateLimitTpm || 100000,
          costPerInputToken: changes?.costPerInputToken,
          costPerOutputToken: changes?.costPerOutputToken,
          description: changes?.description || '',
          tags: changes?.tags || [],
          hasApiKey: !!(changes?.encryptedApiKey),
          createdAt: log.createdAt,
          updatedAt: log.createdAt,
        };
      });

      // Filter by enabled status
      if (enabled !== undefined) {
        const enabledBool = enabled === 'true';
        models = models.filter((m) => m.enabled === enabledBool);
      }

      // Filter by provider
      if (provider) {
        models = models.filter((m) => m.provider === provider);
      }

      res.json({
        success: true,
        data: models,
        meta: {
          total: models.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching AI models', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI models',
      });
    }
  }
);

/**
 * GET /models/:id - Get single AI model configuration
 */
router.get(
  '/models/:id',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const modelConfig = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_MODEL_CONFIG_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!modelConfig) {
        res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
        return;
      }

      const changes = modelConfig.changes as Record<string, unknown>;

      res.json({
        success: true,
        data: {
          id: modelConfig.entityId,
          name: changes?.name || modelConfig.entityId,
          provider: changes?.provider || 'unknown',
          modelId: changes?.modelId || '',
          apiEndpoint: changes?.apiEndpoint,
          maxTokens: changes?.maxTokens || 4096,
          temperature: changes?.temperature || 0.7,
          topP: changes?.topP,
          frequencyPenalty: changes?.frequencyPenalty,
          presencePenalty: changes?.presencePenalty,
          enabled: changes?.enabled ?? true,
          rateLimitRpm: changes?.rateLimitRpm || 60,
          rateLimitTpm: changes?.rateLimitTpm || 100000,
          costPerInputToken: changes?.costPerInputToken,
          costPerOutputToken: changes?.costPerOutputToken,
          description: changes?.description || '',
          tags: changes?.tags || [],
          hasApiKey: !!(changes?.encryptedApiKey),
          createdAt: modelConfig.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error fetching AI model', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI model',
      });
    }
  }
);

/**
 * POST /models - Create new AI model configuration
 */
router.post(
  '/models',
  requireRole('platform_admin'),
  auditAdminAction('admin:create_ai_model'),
  async (req: Request, res: Response) => {
    try {
      const validation = AIModelConfigSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const data = validation.data;

      // Check if model ID already exists
      const existing = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_MODEL_CONFIG_ENTITY,
          entityId: data.id,
        },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          error: 'Model configuration with this ID already exists',
        });
        return;
      }

      // Encrypt API key if provided
      let encryptedApiKey: string | undefined;
      if (data.apiKey) {
        encryptedApiKey = encryptApiKey(data.apiKey);
      }

      // Create model configuration
      const modelConfig = await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: 'ai_model:create',
          entityType: AI_MODEL_CONFIG_ENTITY,
          entityId: data.id,
          changes: {
            name: data.name,
            provider: data.provider,
            modelId: data.modelId,
            apiEndpoint: data.apiEndpoint,
            encryptedApiKey,
            maxTokens: data.maxTokens,
            temperature: data.temperature,
            topP: data.topP,
            frequencyPenalty: data.frequencyPenalty,
            presencePenalty: data.presencePenalty,
            enabled: data.enabled,
            rateLimitRpm: data.rateLimitRpm,
            rateLimitTpm: data.rateLimitTpm,
            costPerInputToken: data.costPerInputToken,
            costPerOutputToken: data.costPerOutputToken,
            description: data.description,
            tags: data.tags,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('AI model configuration created', {
        modelId: data.id,
        provider: data.provider,
        adminId: (req as any).admin?.id,
      });

      res.status(201).json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          provider: data.provider,
          modelId: data.modelId,
          enabled: data.enabled,
          createdAt: modelConfig.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error creating AI model', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create AI model configuration',
      });
    }
  }
);

/**
 * PUT /models/:id - Update AI model configuration
 */
router.put(
  '/models/:id',
  requireRole('platform_admin'),
  auditAdminAction('admin:update_ai_model'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get current configuration
      const currentConfig = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_MODEL_CONFIG_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!currentConfig) {
        res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
        return;
      }

      const currentChanges = currentConfig.changes as Record<string, unknown>;
      const updateData = req.body;

      // Encrypt new API key if provided
      let encryptedApiKey = currentChanges?.encryptedApiKey;
      if (updateData.apiKey) {
        encryptedApiKey = encryptApiKey(updateData.apiKey);
      }

      // Merge with current configuration
      const newChanges = {
        name: updateData.name ?? currentChanges?.name,
        provider: updateData.provider ?? currentChanges?.provider,
        modelId: updateData.modelId ?? currentChanges?.modelId,
        apiEndpoint: updateData.apiEndpoint ?? currentChanges?.apiEndpoint,
        encryptedApiKey,
        maxTokens: updateData.maxTokens ?? currentChanges?.maxTokens,
        temperature: updateData.temperature ?? currentChanges?.temperature,
        topP: updateData.topP ?? currentChanges?.topP,
        frequencyPenalty: updateData.frequencyPenalty ?? currentChanges?.frequencyPenalty,
        presencePenalty: updateData.presencePenalty ?? currentChanges?.presencePenalty,
        enabled: updateData.enabled ?? currentChanges?.enabled,
        rateLimitRpm: updateData.rateLimitRpm ?? currentChanges?.rateLimitRpm,
        rateLimitTpm: updateData.rateLimitTpm ?? currentChanges?.rateLimitTpm,
        costPerInputToken: updateData.costPerInputToken ?? currentChanges?.costPerInputToken,
        costPerOutputToken: updateData.costPerOutputToken ?? currentChanges?.costPerOutputToken,
        description: updateData.description ?? currentChanges?.description,
        tags: updateData.tags ?? currentChanges?.tags,
      };

      // Create update record
      const updated = await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: 'ai_model:update',
          entityType: AI_MODEL_CONFIG_ENTITY,
          entityId: id,
          changes: newChanges,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('AI model configuration updated', {
        modelId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          id,
          name: newChanges.name,
          provider: newChanges.provider,
          modelId: newChanges.modelId,
          enabled: newChanges.enabled,
          updatedAt: updated.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error updating AI model', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update AI model configuration',
      });
    }
  }
);

/**
 * DELETE /models/:id - Delete AI model configuration
 */
router.delete(
  '/models/:id',
  requireRole('super_admin'),
  auditAdminAction('admin:delete_ai_model'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await prisma.auditLog.deleteMany({
        where: {
          entityType: AI_MODEL_CONFIG_ENTITY,
          entityId: id,
        },
      });

      if (result.count === 0) {
        res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
        return;
      }

      logger.info('AI model configuration deleted', {
        modelId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Model configuration deleted',
      });
    } catch (error) {
      logger.error('Error deleting AI model', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete AI model configuration',
      });
    }
  }
);

/**
 * POST /models/:id/test - Test AI model connectivity
 */
router.post(
  '/models/:id/test',
  requireRole('platform_admin'),
  auditAdminAction('admin:test_ai_model'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const modelConfig = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_MODEL_CONFIG_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!modelConfig) {
        res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
        return;
      }

      const changes = modelConfig.changes as Record<string, unknown>;
      const provider = changes?.provider as string;
      const modelId = changes?.modelId as string;
      const encryptedApiKey = changes?.encryptedApiKey as string | undefined;
      const apiEndpoint = changes?.apiEndpoint as string | undefined;

      if (!encryptedApiKey) {
        res.status(400).json({
          success: false,
          error: 'No API key configured for this model',
        });
        return;
      }

      const apiKey = decryptApiKey(encryptedApiKey);
      const startTime = Date.now();
      let testResult: { success: boolean; latency: number; error?: string; response?: string };

      switch (provider) {
        case 'openai': {
          const endpoint = apiEndpoint || 'https://api.openai.com/v1/chat/completions';
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Say "test successful" in exactly 2 words.' }],
              max_tokens: 10,
            }),
          });
          const data = await response.json();
          testResult = {
            success: response.ok,
            latency: Date.now() - startTime,
            error: data.error?.message,
            response: data.choices?.[0]?.message?.content,
          };
          break;
        }

        case 'anthropic': {
          const endpoint = apiEndpoint || 'https://api.anthropic.com/v1/messages';
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: modelId,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'Say "test successful" in exactly 2 words.' }],
            }),
          });
          const data = await response.json();
          testResult = {
            success: response.ok,
            latency: Date.now() - startTime,
            error: data.error?.message,
            response: data.content?.[0]?.text,
          };
          break;
        }

        case 'google': {
          const endpoint = apiEndpoint || `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Say "test successful" in exactly 2 words.' }] }],
            }),
          });
          const data = await response.json();
          testResult = {
            success: response.ok,
            latency: Date.now() - startTime,
            error: data.error?.message,
            response: data.candidates?.[0]?.content?.parts?.[0]?.text,
          };
          break;
        }

        case 'mistral': {
          const endpoint = apiEndpoint || 'https://api.mistral.ai/v1/chat/completions';
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Say "test successful" in exactly 2 words.' }],
              max_tokens: 10,
            }),
          });
          const data = await response.json();
          testResult = {
            success: response.ok,
            latency: Date.now() - startTime,
            error: data.error?.message,
            response: data.choices?.[0]?.message?.content,
          };
          break;
        }

        default:
          testResult = {
            success: false,
            latency: Date.now() - startTime,
            error: `Unsupported provider: ${provider}`,
          };
      }

      logger.info('AI model connectivity test', {
        modelId: id,
        provider,
        success: testResult.success,
        latency: testResult.latency,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          modelId: id,
          provider,
          testResult,
        },
      });
    } catch (error) {
      logger.error('Error testing AI model', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to test AI model connectivity',
      });
    }
  }
);

// ====================================================================
// USAGE ANALYTICS ENDPOINTS
// ====================================================================

/**
 * GET /usage - Get AI usage statistics
 */
router.get(
  '/usage',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { period = 'month', startDate, endDate } = req.query;

      let dateRange: { start: Date; end: Date };
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      } else {
        dateRange = getDateRangeForPeriod(period as string);
      }

      // Get usage data from AIAppUsage
      const usageData = await prisma.aIAppUsage.aggregate({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          duration: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          duration: true,
        },
      });

      // Get success/failure counts
      const successCount = await prisma.aIAppUsage.count({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          success: true,
        },
      });

      const totalRequests = usageData._count.id || 0;
      const totalInputTokens = usageData._sum.inputTokens || 0;
      const totalOutputTokens = usageData._sum.outputTokens || 0;
      const totalTokens = totalInputTokens + totalOutputTokens;

      // Calculate costs (using average model pricing)
      const estimatedCost = calculateCost('gpt-4o-mini', totalInputTokens, totalOutputTokens);

      // Get daily breakdown
      const dailyUsage = await prisma.$queryRaw<Array<{ date: string; requests: bigint; tokens: bigint; cost: number }>>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as requests,
          SUM(input_tokens + output_tokens) as tokens,
          SUM(input_tokens * 0.00000015 + output_tokens * 0.0000006) as cost
        FROM ai_app_usage
        WHERE created_at >= ${dateRange.start} AND created_at <= ${dateRange.end}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      res.json({
        success: true,
        data: {
          summary: {
            totalRequests,
            totalTokens,
            totalInputTokens,
            totalOutputTokens,
            estimatedCost,
            averageLatency: usageData._avg.duration || 0,
            successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
          },
          dailyBreakdown: dailyUsage.map((d) => ({
            date: d.date,
            requests: Number(d.requests),
            tokens: Number(d.tokens),
            cost: d.cost,
          })),
          period: {
            start: dateRange.start,
            end: dateRange.end,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching AI usage', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI usage statistics',
      });
    }
  }
);

/**
 * GET /usage/by-organization - Get usage by organization
 */
router.get(
  '/usage/by-organization',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { period = 'month', limit = '20' } = req.query;
      const dateRange = getDateRangeForPeriod(period as string);

      const orgUsage = await prisma.$queryRaw<Array<{
        organization_id: string;
        org_name: string;
        total_requests: bigint;
        total_tokens: bigint;
        estimated_cost: number;
      }>>`
        SELECT
          aau.organization_id,
          COALESCE(o.name, 'Unknown') as org_name,
          COUNT(*) as total_requests,
          SUM(aau.input_tokens + aau.output_tokens) as total_tokens,
          SUM(aau.input_tokens * 0.00000015 + aau.output_tokens * 0.0000006) as estimated_cost
        FROM ai_app_usage aau
        LEFT JOIN organizations o ON o.id = aau.organization_id
        WHERE aau.created_at >= ${dateRange.start} AND aau.created_at <= ${dateRange.end}
          AND aau.organization_id IS NOT NULL
        GROUP BY aau.organization_id, o.name
        ORDER BY total_tokens DESC
        LIMIT ${parseInt(limit as string, 10)}
      `;

      res.json({
        success: true,
        data: orgUsage.map((o) => ({
          organizationId: o.organization_id,
          organizationName: o.org_name,
          totalRequests: Number(o.total_requests),
          totalTokens: Number(o.total_tokens),
          estimatedCost: o.estimated_cost,
        })),
      });
    } catch (error) {
      logger.error('Error fetching organization usage', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization usage',
      });
    }
  }
);

/**
 * GET /usage/by-model - Get usage by model
 */
router.get(
  '/usage/by-model',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { period = 'month' } = req.query;
      const dateRange = getDateRangeForPeriod(period as string);

      const modelUsage = await prisma.$queryRaw<Array<{
        model_id: string;
        total_requests: bigint;
        total_tokens: bigint;
        avg_duration: number;
        success_count: bigint;
      }>>`
        SELECT
          aa.model_id,
          COUNT(*) as total_requests,
          SUM(aau.input_tokens + aau.output_tokens) as total_tokens,
          AVG(aau.duration) as avg_duration,
          SUM(CASE WHEN aau.success THEN 1 ELSE 0 END) as success_count
        FROM ai_app_usage aau
        JOIN ai_apps aa ON aa.id = aau.ai_app_id
        WHERE aau.created_at >= ${dateRange.start} AND aau.created_at <= ${dateRange.end}
        GROUP BY aa.model_id
        ORDER BY total_tokens DESC
      `;

      res.json({
        success: true,
        data: modelUsage.map((m) => ({
          modelId: m.model_id,
          totalRequests: Number(m.total_requests),
          totalTokens: Number(m.total_tokens),
          averageLatency: m.avg_duration,
          successRate: Number(m.total_requests) > 0
            ? (Number(m.success_count) / Number(m.total_requests)) * 100
            : 0,
          pricing: MODEL_PRICING[m.model_id] || { input: 0, output: 0 },
        })),
      });
    } catch (error) {
      logger.error('Error fetching model usage', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch model usage',
      });
    }
  }
);

/**
 * GET /usage/by-feature - Get usage by AI feature/app
 */
router.get(
  '/usage/by-feature',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { period = 'month' } = req.query;
      const dateRange = getDateRangeForPeriod(period as string);

      const featureUsage = await prisma.$queryRaw<Array<{
        ai_app_id: string;
        app_name: string;
        category: string;
        total_requests: bigint;
        total_tokens: bigint;
        avg_duration: number;
        success_count: bigint;
      }>>`
        SELECT
          aau.ai_app_id,
          aa.name as app_name,
          aa.category,
          COUNT(*) as total_requests,
          SUM(aau.input_tokens + aau.output_tokens) as total_tokens,
          AVG(aau.duration) as avg_duration,
          SUM(CASE WHEN aau.success THEN 1 ELSE 0 END) as success_count
        FROM ai_app_usage aau
        JOIN ai_apps aa ON aa.id = aau.ai_app_id
        WHERE aau.created_at >= ${dateRange.start} AND aau.created_at <= ${dateRange.end}
        GROUP BY aau.ai_app_id, aa.name, aa.category
        ORDER BY total_requests DESC
      `;

      res.json({
        success: true,
        data: featureUsage.map((f) => ({
          featureId: f.ai_app_id,
          featureName: f.app_name,
          category: f.category,
          totalRequests: Number(f.total_requests),
          totalTokens: Number(f.total_tokens),
          averageLatency: f.avg_duration,
          successRate: Number(f.total_requests) > 0
            ? (Number(f.success_count) / Number(f.total_requests)) * 100
            : 0,
        })),
      });
    } catch (error) {
      logger.error('Error fetching feature usage', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feature usage',
      });
    }
  }
);

// ====================================================================
// PROMPT TEMPLATE MANAGEMENT ENDPOINTS
// ====================================================================

/**
 * GET /prompts - List all prompt templates
 */
router.get(
  '/prompts',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { category, enabled } = req.query;

      const promptLogs = await prisma.auditLog.findMany({
        where: {
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          action: { startsWith: 'ai_prompt:' },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['entityId'],
      });

      let prompts = promptLogs.map((log) => {
        const changes = log.changes as Record<string, unknown>;
        return {
          id: log.entityId,
          name: changes?.name || log.entityId,
          description: changes?.description || '',
          category: changes?.category || 'general',
          enabled: changes?.enabled ?? true,
          version: changes?.version || 1,
          systemPromptPreview: (changes?.systemPrompt as string)?.substring(0, 200) + '...',
          variableCount: (changes?.variables as unknown[])?.length || 0,
          createdAt: log.createdAt,
        };
      });

      if (category) {
        prompts = prompts.filter((p) => p.category === category);
      }

      if (enabled !== undefined) {
        const enabledBool = enabled === 'true';
        prompts = prompts.filter((p) => p.enabled === enabledBool);
      }

      res.json({
        success: true,
        data: prompts,
      });
    } catch (error) {
      logger.error('Error fetching prompt templates', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch prompt templates',
      });
    }
  }
);

/**
 * GET /prompts/:id - Get single prompt template
 */
router.get(
  '/prompts/:id',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const promptLog = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!promptLog) {
        res.status(404).json({
          success: false,
          error: 'Prompt template not found',
        });
        return;
      }

      const changes = promptLog.changes as Record<string, unknown>;

      res.json({
        success: true,
        data: {
          id: promptLog.entityId,
          name: changes?.name,
          description: changes?.description,
          category: changes?.category,
          systemPrompt: changes?.systemPrompt,
          userPromptTemplate: changes?.userPromptTemplate,
          variables: changes?.variables,
          modelConfig: changes?.modelConfig,
          enabled: changes?.enabled,
          version: changes?.version,
          createdAt: promptLog.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error fetching prompt template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch prompt template',
      });
    }
  }
);

/**
 * POST /prompts - Create new prompt template
 */
router.post(
  '/prompts',
  requireRole('platform_admin'),
  auditAdminAction('admin:create_prompt_template'),
  async (req: Request, res: Response) => {
    try {
      const validation = PromptTemplateSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const data = validation.data;

      const existing = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          entityId: data.id,
        },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          error: 'Prompt template with this ID already exists',
        });
        return;
      }

      const promptLog = await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: 'ai_prompt:create',
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          entityId: data.id,
          changes: {
            name: data.name,
            description: data.description,
            category: data.category,
            systemPrompt: data.systemPrompt,
            userPromptTemplate: data.userPromptTemplate,
            variables: data.variables,
            modelConfig: data.modelConfig,
            enabled: data.enabled,
            version: data.version,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('Prompt template created', {
        promptId: data.id,
        adminId: (req as any).admin?.id,
      });

      res.status(201).json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          category: data.category,
          version: data.version,
          createdAt: promptLog.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error creating prompt template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create prompt template',
      });
    }
  }
);

/**
 * PUT /prompts/:id - Update prompt template
 */
router.put(
  '/prompts/:id',
  requireRole('platform_admin'),
  auditAdminAction('admin:update_prompt_template'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const currentPrompt = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!currentPrompt) {
        res.status(404).json({
          success: false,
          error: 'Prompt template not found',
        });
        return;
      }

      const currentChanges = currentPrompt.changes as Record<string, unknown>;
      const updateData = req.body;

      // Increment version if system prompt changed
      const currentVersion = (currentChanges?.version as number) || 1;
      const systemPromptChanged = updateData.systemPrompt &&
        updateData.systemPrompt !== currentChanges?.systemPrompt;
      const newVersion = systemPromptChanged ? currentVersion + 1 : currentVersion;

      const newChanges = {
        name: updateData.name ?? currentChanges?.name,
        description: updateData.description ?? currentChanges?.description,
        category: updateData.category ?? currentChanges?.category,
        systemPrompt: updateData.systemPrompt ?? currentChanges?.systemPrompt,
        userPromptTemplate: updateData.userPromptTemplate ?? currentChanges?.userPromptTemplate,
        variables: updateData.variables ?? currentChanges?.variables,
        modelConfig: updateData.modelConfig ?? currentChanges?.modelConfig,
        enabled: updateData.enabled ?? currentChanges?.enabled,
        version: newVersion,
      };

      const updated = await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: 'ai_prompt:update',
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          entityId: id,
          changes: newChanges,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('Prompt template updated', {
        promptId: id,
        newVersion,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          id,
          name: newChanges.name,
          version: newVersion,
          updatedAt: updated.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error updating prompt template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update prompt template',
      });
    }
  }
);

/**
 * DELETE /prompts/:id - Delete prompt template
 */
router.delete(
  '/prompts/:id',
  requireRole('super_admin'),
  auditAdminAction('admin:delete_prompt_template'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await prisma.auditLog.deleteMany({
        where: {
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          entityId: id,
        },
      });

      if (result.count === 0) {
        res.status(404).json({
          success: false,
          error: 'Prompt template not found',
        });
        return;
      }

      logger.info('Prompt template deleted', {
        promptId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Prompt template deleted',
      });
    } catch (error) {
      logger.error('Error deleting prompt template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete prompt template',
      });
    }
  }
);

/**
 * GET /prompts/:id/versions - Get prompt template version history
 */
router.get(
  '/prompts/:id/versions',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const versions = await prisma.auditLog.findMany({
        where: {
          entityType: AI_PROMPT_TEMPLATE_ENTITY,
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (versions.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Prompt template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: versions.map((v) => {
          const changes = v.changes as Record<string, unknown>;
          return {
            version: changes?.version || 1,
            action: v.action,
            systemPromptPreview: (changes?.systemPrompt as string)?.substring(0, 200) + '...',
            createdAt: v.createdAt,
            createdBy: v.user ? {
              id: v.user.id,
              email: v.user.email,
              name: `${v.user.firstName || ''} ${v.user.lastName || ''}`.trim(),
            } : null,
          };
        }),
      });
    } catch (error) {
      logger.error('Error fetching prompt versions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch prompt versions',
      });
    }
  }
);

// ====================================================================
// GUARDRAILS MANAGEMENT ENDPOINTS
// ====================================================================

/**
 * GET /guardrails - Get current guardrails configuration
 */
router.get(
  '/guardrails',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const guardrailsLog = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_GUARDRAILS_ENTITY,
          entityId: 'global',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!guardrailsLog) {
        // Return default configuration
        res.json({
          success: true,
          data: {
            contentFiltering: {
              enabled: true,
              blockProfanity: true,
              blockHateSpeech: true,
              blockViolence: true,
              blockSexualContent: true,
              blockPII: true,
              customBlocklist: [],
            },
            inputValidation: {
              enabled: true,
              maxInputLength: 100000,
              maxConversationTurns: 50,
              allowedTopics: [],
              blockedTopics: [],
            },
            outputValidation: {
              enabled: true,
              maxOutputLength: 50000,
              requireCitations: false,
              enforceFormatting: false,
            },
            rateLimiting: {
              enabled: true,
              requestsPerMinute: 60,
              tokensPerMinute: 100000,
              requestsPerDay: 10000,
              tokensPerDay: 1000000,
            },
            monitoring: {
              logAllRequests: true,
              alertOnHighUsage: true,
              alertThresholdPercent: 80,
              alertOnErrors: true,
              errorAlertThreshold: 10,
            },
            updatedAt: null,
          },
        });
        return;
      }

      const changes = guardrailsLog.changes as Record<string, unknown>;

      res.json({
        success: true,
        data: {
          ...changes,
          updatedAt: guardrailsLog.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error fetching guardrails', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch guardrails configuration',
      });
    }
  }
);

/**
 * PUT /guardrails - Update guardrails configuration
 */
router.put(
  '/guardrails',
  requireRole('platform_admin'),
  auditAdminAction('admin:update_guardrails'),
  async (req: Request, res: Response) => {
    try {
      const validation = GuardrailsSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const data = validation.data;

      await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: 'ai_guardrails:update',
          entityType: AI_GUARDRAILS_ENTITY,
          entityId: 'global',
          changes: data as unknown as Prisma.InputJsonValue,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('AI guardrails updated', {
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          ...data,
          updatedAt: new Date(),
        },
        message: 'Guardrails configuration updated',
      });
    } catch (error) {
      logger.error('Error updating guardrails', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update guardrails configuration',
      });
    }
  }
);

// ====================================================================
// LOGS ENDPOINTS
// ====================================================================

/**
 * GET /logs - Get AI operation logs
 */
router.get(
  '/logs',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const {
        page = '1',
        limit = '50',
        status,
        model,
        organizationId,
        userId,
        startDate,
        endDate,
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.AIAppUsageWhereInput = {};

      if (status === 'success') {
        where.success = true;
      } else if (status === 'error') {
        where.success = false;
      }

      if (organizationId) {
        where.organizationId = organizationId as string;
      }

      if (userId) {
        where.userId = userId as string;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.aIAppUsage.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            aiApp: {
              select: {
                id: true,
                name: true,
                modelId: true,
                category: true,
              },
            },
          },
        }),
        prisma.aIAppUsage.count({ where }),
      ]);

      res.json({
        success: true,
        data: logs.map((log) => ({
          id: log.id,
          aiAppId: log.aiAppId,
          aiAppName: log.aiApp.name,
          model: log.aiApp.modelId,
          category: log.aiApp.category,
          userId: log.userId,
          organizationId: log.organizationId,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          totalTokens: log.inputTokens + log.outputTokens,
          duration: log.duration,
          success: log.success,
          error: log.error,
          cost: calculateCost(log.aiApp.modelId, log.inputTokens, log.outputTokens),
          createdAt: log.createdAt,
        })),
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Error fetching AI logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI operation logs',
      });
    }
  }
);

// ====================================================================
// COST MANAGEMENT ENDPOINTS
// ====================================================================

/**
 * GET /costs - Get cost analytics
 */
router.get(
  '/costs',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { period = 'month' } = req.query;
      const dateRange = getDateRangeForPeriod(period as string);

      // Get total costs
      const totalUsage = await prisma.aIAppUsage.aggregate({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
        },
      });

      const totalInputTokens = totalUsage._sum.inputTokens || 0;
      const totalOutputTokens = totalUsage._sum.outputTokens || 0;

      // Get cost breakdown by model
      const modelCosts = await prisma.$queryRaw<Array<{
        model_id: string;
        input_tokens: bigint;
        output_tokens: bigint;
      }>>`
        SELECT
          aa.model_id,
          SUM(aau.input_tokens) as input_tokens,
          SUM(aau.output_tokens) as output_tokens
        FROM ai_app_usage aau
        JOIN ai_apps aa ON aa.id = aau.ai_app_id
        WHERE aau.created_at >= ${dateRange.start} AND aau.created_at <= ${dateRange.end}
        GROUP BY aa.model_id
        ORDER BY (SUM(aau.input_tokens) + SUM(aau.output_tokens)) DESC
      `;

      const costByModel = modelCosts.map((m) => {
        const inputTokens = Number(m.input_tokens);
        const outputTokens = Number(m.output_tokens);
        return {
          model: m.model_id,
          inputTokens,
          outputTokens,
          cost: calculateCost(m.model_id, inputTokens, outputTokens),
        };
      });

      // Get daily cost trend
      const dailyCosts = await prisma.$queryRaw<Array<{
        date: string;
        input_tokens: bigint;
        output_tokens: bigint;
      }>>`
        SELECT
          DATE(created_at) as date,
          SUM(input_tokens) as input_tokens,
          SUM(output_tokens) as output_tokens
        FROM ai_app_usage
        WHERE created_at >= ${dateRange.start} AND created_at <= ${dateRange.end}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      // Get current cost limits
      const limitsLog = await prisma.auditLog.findFirst({
        where: {
          entityType: AI_COST_LIMITS_ENTITY,
          entityId: 'global',
        },
        orderBy: { createdAt: 'desc' },
      });

      const limits = limitsLog?.changes as Record<string, unknown> || {
        globalDailyLimit: null,
        globalMonthlyLimit: null,
      };

      const totalCost = calculateCost('gpt-4o-mini', totalInputTokens, totalOutputTokens);

      res.json({
        success: true,
        data: {
          summary: {
            totalCost,
            totalInputTokens,
            totalOutputTokens,
            averageCostPerRequest: totalCost / (costByModel.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0) || 1),
          },
          costByModel,
          dailyTrend: dailyCosts.map((d) => ({
            date: d.date,
            cost: calculateCost('gpt-4o-mini', Number(d.input_tokens), Number(d.output_tokens)),
          })),
          limits,
          period: {
            start: dateRange.start,
            end: dateRange.end,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching cost analytics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cost analytics',
      });
    }
  }
);

/**
 * PUT /costs/limits - Update cost limits
 */
router.put(
  '/costs/limits',
  requireRole('platform_admin'),
  auditAdminAction('admin:update_cost_limits'),
  async (req: Request, res: Response) => {
    try {
      const validation = CostLimitsSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const data = validation.data;

      await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: 'ai_cost_limits:update',
          entityType: AI_COST_LIMITS_ENTITY,
          entityId: 'global',
          changes: data as unknown as Prisma.InputJsonValue,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('AI cost limits updated', {
        adminId: (req as any).admin?.id,
        limits: data,
      });

      res.json({
        success: true,
        data,
        message: 'Cost limits updated',
      });
    } catch (error) {
      logger.error('Error updating cost limits', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update cost limits',
      });
    }
  }
);

// ====================================================================
// PERFORMANCE ENDPOINTS
// ====================================================================

/**
 * GET /performance - Get AI performance metrics
 */
router.get(
  '/performance',
  requirePermission('read:ai_operations'),
  async (req: Request, res: Response) => {
    try {
      const { period = 'day' } = req.query;
      const dateRange = getDateRangeForPeriod(period as string);

      // Get overall performance metrics
      const performanceData = await prisma.aIAppUsage.aggregate({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _avg: {
          duration: true,
        },
        _min: {
          duration: true,
        },
        _max: {
          duration: true,
        },
        _count: {
          id: true,
        },
      });

      // Get success rate
      const successCount = await prisma.aIAppUsage.count({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          success: true,
        },
      });

      // Get latency percentiles using raw SQL
      const percentiles = await prisma.$queryRaw<Array<{
        p50: number;
        p95: number;
        p99: number;
      }>>`
        SELECT
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) as p99
        FROM ai_app_usage
        WHERE created_at >= ${dateRange.start} AND created_at <= ${dateRange.end}
      `;

      // Get performance by model
      const modelPerformance = await prisma.$queryRaw<Array<{
        model_id: string;
        avg_duration: number;
        request_count: bigint;
        success_count: bigint;
        error_count: bigint;
      }>>`
        SELECT
          aa.model_id,
          AVG(aau.duration) as avg_duration,
          COUNT(*) as request_count,
          SUM(CASE WHEN aau.success THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN NOT aau.success THEN 1 ELSE 0 END) as error_count
        FROM ai_app_usage aau
        JOIN ai_apps aa ON aa.id = aau.ai_app_id
        WHERE aau.created_at >= ${dateRange.start} AND aau.created_at <= ${dateRange.end}
        GROUP BY aa.model_id
        ORDER BY request_count DESC
      `;

      // Get hourly distribution
      const hourlyDistribution = await prisma.$queryRaw<Array<{
        hour: number;
        request_count: bigint;
        avg_duration: number;
      }>>`
        SELECT
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as request_count,
          AVG(duration) as avg_duration
        FROM ai_app_usage
        WHERE created_at >= ${dateRange.start} AND created_at <= ${dateRange.end}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour ASC
      `;

      // Get error breakdown
      const errors = await prisma.aIAppUsage.findMany({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          success: false,
          error: { not: null },
        },
        select: {
          error: true,
        },
      });

      const errorBreakdown: Record<string, number> = {};
      errors.forEach((e) => {
        const errorType = e.error?.split(':')[0] || 'Unknown';
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
      });

      const totalRequests = performanceData._count.id || 0;

      res.json({
        success: true,
        data: {
          summary: {
            totalRequests,
            successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
            averageLatency: performanceData._avg.duration || 0,
            minLatency: performanceData._min.duration || 0,
            maxLatency: performanceData._max.duration || 0,
            p50Latency: percentiles[0]?.p50 || 0,
            p95Latency: percentiles[0]?.p95 || 0,
            p99Latency: percentiles[0]?.p99 || 0,
          },
          byModel: modelPerformance.map((m) => ({
            model: m.model_id,
            averageLatency: m.avg_duration,
            requestCount: Number(m.request_count),
            successCount: Number(m.success_count),
            errorCount: Number(m.error_count),
            successRate: Number(m.request_count) > 0
              ? (Number(m.success_count) / Number(m.request_count)) * 100
              : 0,
          })),
          hourlyDistribution: hourlyDistribution.map((h) => ({
            hour: h.hour,
            requestCount: Number(h.request_count),
            averageLatency: h.avg_duration,
          })),
          errorBreakdown,
          period: {
            start: dateRange.start,
            end: dateRange.end,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching performance metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics',
      });
    }
  }
);

export default router;
