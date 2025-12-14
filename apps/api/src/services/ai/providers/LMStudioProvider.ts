/**
 * LM Studio Provider
 *
 * LM Studio integration with OpenAI-compatible API:
 * - Local LM Studio server at http://localhost:1234
 * - Chat completions
 * - Model info endpoint
 * - Streaming support
 */

import axios, { AxiosInstance } from 'axios';
import * as winston from 'winston';
import {
  IAIProvider,
  AIProviderType,
  ProviderCapabilities,
  ProviderConfig,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
} from '../AIProviderFactory';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'lmstudio-provider' },
  transports: [new winston.transports.Console()],
});

/**
 * LM Studio Provider Implementation
 */
export class LMStudioProvider implements IAIProvider {
  readonly type: AIProviderType = 'lmstudio';
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    embeddings: false, // LM Studio doesn't support embeddings
    transcription: false,
    vision: false,
    streaming: true,
    functions: false,
  };

  private client: AxiosInstance;
  private config: Required<ProviderConfig>;

  constructor(config?: ProviderConfig) {
    // Load configuration with defaults
    this.config = {
      apiKey: config?.apiKey || '', // LM Studio doesn't require API key
      baseURL: config?.baseURL || process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234',
      model: config?.model || process.env.LMSTUDIO_MODEL || 'local-model',
      embeddingModel: config?.embeddingModel || '', // Not supported
      timeout: config?.timeout || 60000,
      maxRetries: config?.maxRetries || 2,
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('LM Studio provider initialized', {
      baseURL: this.config.baseURL,
      model: this.config.model,
    });
  }

  /**
   * Get available LM Studio models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/v1/models');
      const models = response.data.data?.map((m: any) => m.id) || [];

      logger.debug(`Retrieved ${models.length} LM Studio models`);
      return models;
    } catch (error) {
      logger.error('Failed to retrieve LM Studio models', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return configured model as fallback
      return [this.config.model];
    }
  }

  /**
   * Chat completion with LM Studio
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const {
      messages,
      temperature = 0.7,
      maxTokens = 1000,
      stream = false,
      topP,
      frequencyPenalty,
      presencePenalty,
      stop,
    } = options;

    try {
      const startTime = Date.now();

      const response = await this.client.post('/v1/chat/completions', {
        model: this.config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop,
      });

      const duration = Date.now() - startTime;

      const choice = response.data.choices?.[0];
      if (!choice?.message?.content) {
        throw new Error('No content in LM Studio response');
      }

      const result: ChatCompletionResponse = {
        content: choice.message.content,
        model: response.data.model || this.config.model,
        usage: response.data.usage
          ? {
              promptTokens: response.data.usage.prompt_tokens,
              completionTokens: response.data.usage.completion_tokens,
              totalTokens: response.data.usage.total_tokens,
            }
          : undefined,
        finishReason: choice.finish_reason || undefined,
      };

      logger.info('LM Studio chat completion successful', {
        model: result.model,
        duration,
        tokens: result.usage?.totalTokens,
        finishReason: result.finishReason,
      });

      return result;
    } catch (error) {
      logger.error('LM Studio chat completion failed', {
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate embeddings (not supported by LM Studio)
   */
  async generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    throw new Error('LM Studio does not support embeddings. Use OpenAI or another provider.');
  }

  /**
   * Test connection to LM Studio server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/models', { timeout: 5000 });
      const isConnected = response.status === 200;

      logger.debug('LM Studio connection test', { success: isConnected });
      return isConnected;
    } catch (error) {
      logger.warn('LM Studio connection test failed', {
        baseURL: this.config.baseURL,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ProviderConfig {
    return {
      baseURL: this.config.baseURL,
      model: this.config.model,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    };
  }

  /**
   * Get model information from LM Studio
   */
  async getModelInfo(modelName?: string): Promise<any> {
    try {
      const response = await this.client.get('/v1/models');
      const models = response.data.data || [];

      if (modelName) {
        const model = models.find((m: any) => m.id === modelName);
        if (!model) {
          throw new Error(`Model ${modelName} not found`);
        }
        return model;
      }

      logger.debug('Retrieved LM Studio models info', { count: models.length });
      return models;
    } catch (error) {
      logger.error('Failed to get LM Studio model info', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get currently loaded model
   */
  async getCurrentModel(): Promise<string | null> {
    try {
      const models = await this.getAvailableModels();
      // LM Studio typically loads one model at a time
      return models.length > 0 ? models[0] : null;
    } catch (error) {
      logger.warn('Failed to get current LM Studio model', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Check server health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    model?: string;
  }> {
    try {
      const isConnected = await this.testConnection();
      const currentModel = isConnected ? await this.getCurrentModel() : null;

      return {
        healthy: isConnected,
        model: currentModel || undefined,
      };
    } catch (error) {
      logger.warn('LM Studio health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { healthy: false };
    }
  }

  /**
   * Check if model is loaded
   */
  async isModelLoaded(modelName?: string): Promise<boolean> {
    try {
      const currentModel = await this.getCurrentModel();
      if (!modelName) {
        return currentModel !== null;
      }
      return currentModel === modelName;
    } catch (error) {
      return false;
    }
  }
}
