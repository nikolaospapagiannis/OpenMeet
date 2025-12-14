/**
 * vLLM Provider
 *
 * vLLM server integration with OpenAI-compatible API:
 * - Local vLLM server at configurable URL
 * - Model switching support
 * - Batched inference
 * - Streaming support
 * - Embeddings support
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
  defaultMeta: { service: 'vllm-provider' },
  transports: [new winston.transports.Console()],
});

/**
 * vLLM Provider Implementation
 */
export class VLLMProvider implements IAIProvider {
  readonly type: AIProviderType = 'vllm';
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    embeddings: true,
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
      apiKey: config?.apiKey || process.env.VLLM_API_KEY || 'dummy-key',
      baseURL: config?.baseURL || process.env.VLLM_BASE_URL || 'http://localhost:8000',
      model: config?.model || process.env.VLLM_MODEL || 'meta-llama/Llama-3.2-3B-Instruct',
      embeddingModel: config?.embeddingModel || process.env.VLLM_EMBEDDING_MODEL || '',
      timeout: config?.timeout || 60000,
      maxRetries: config?.maxRetries || 2,
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    logger.info('vLLM provider initialized', {
      baseURL: this.config.baseURL,
      model: this.config.model,
    });
  }

  /**
   * Get available vLLM models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/v1/models');
      const models = response.data.data?.map((m: any) => m.id) || [];

      logger.debug(`Retrieved ${models.length} vLLM models`);
      return models;
    } catch (error) {
      logger.error('Failed to retrieve vLLM models', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return configured model as fallback
      return [this.config.model];
    }
  }

  /**
   * Chat completion with vLLM
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
        throw new Error('No content in vLLM response');
      }

      const result: ChatCompletionResponse = {
        content: choice.message.content,
        model: response.data.model,
        usage: response.data.usage
          ? {
              promptTokens: response.data.usage.prompt_tokens,
              completionTokens: response.data.usage.completion_tokens,
              totalTokens: response.data.usage.total_tokens,
            }
          : undefined,
        finishReason: choice.finish_reason || undefined,
      };

      logger.info('vLLM chat completion successful', {
        model: response.data.model,
        duration,
        tokens: result.usage?.totalTokens,
        finishReason: result.finishReason,
      });

      return result;
    } catch (error) {
      logger.error('vLLM chat completion failed', {
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate embeddings with vLLM
   */
  async generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const { input, model } = options;
    const inputs = Array.isArray(input) ? input : [input];

    try {
      const startTime = Date.now();

      const response = await this.client.post('/v1/embeddings', {
        model: model || this.config.embeddingModel || this.config.model,
        input: inputs,
      });

      const duration = Date.now() - startTime;

      const embeddings = response.data.data?.map((item: any) => item.embedding) || [];

      const result: EmbeddingResponse = {
        embeddings,
        model: response.data.model,
        usage: response.data.usage
          ? {
              promptTokens: response.data.usage.prompt_tokens,
              totalTokens: response.data.usage.total_tokens,
            }
          : undefined,
      };

      logger.info('vLLM embeddings generated', {
        model: response.data.model,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
        duration,
      });

      return result;
    } catch (error) {
      logger.error('vLLM embeddings generation failed', {
        model: model || this.config.embeddingModel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Test connection to vLLM server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/models', { timeout: 5000 });
      const isConnected = response.status === 200;

      logger.debug('vLLM connection test', { success: isConnected });
      return isConnected;
    } catch (error) {
      logger.warn('vLLM connection test failed', {
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
      apiKey: '***redacted***',
      baseURL: this.config.baseURL,
      model: this.config.model,
      embeddingModel: this.config.embeddingModel,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    };
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName?: string): Promise<any> {
    try {
      const model = modelName || this.config.model;
      const response = await this.client.get(`/v1/models/${model}`);

      logger.debug('Retrieved vLLM model info', { model });
      return response.data;
    } catch (error) {
      logger.error('Failed to get vLLM model info', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check vLLM server health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    version?: string;
    model?: string;
  }> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });

      return {
        healthy: response.status === 200,
        version: response.data?.version,
        model: this.config.model,
      };
    } catch (error) {
      logger.warn('vLLM health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { healthy: false };
    }
  }

  /**
   * Get vLLM server version
   */
  async getVersion(): Promise<string> {
    try {
      const response = await this.client.get('/version', { timeout: 5000 });
      return response.data?.version || 'unknown';
    } catch (error) {
      logger.warn('Failed to get vLLM version', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 'unknown';
    }
  }
}
