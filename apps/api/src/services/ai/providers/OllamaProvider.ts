/**
 * Ollama Provider
 *
 * Ollama REST API integration:
 * - Local Ollama server at http://localhost:11434
 * - Model management (list, pull, delete)
 * - Generate completions
 * - Embeddings (nomic-embed-text)
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
  defaultMeta: { service: 'ollama-provider' },
  transports: [new winston.transports.Console()],
});

/**
 * Ollama Provider Implementation
 */
export class OllamaProvider implements IAIProvider {
  readonly type: AIProviderType = 'ollama';
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
      apiKey: config?.apiKey || '', // Ollama doesn't require API key
      baseURL: config?.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config?.model || process.env.OLLAMA_MODEL || 'llama3.2:3b',
      embeddingModel: config?.embeddingModel || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
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

    logger.info('Ollama provider initialized', {
      baseURL: this.config.baseURL,
      model: this.config.model,
      embeddingModel: this.config.embeddingModel,
    });
  }

  /**
   * Get available Ollama models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models?.map((m: any) => m.name) || [];

      logger.debug(`Retrieved ${models.length} Ollama models`);
      return models;
    } catch (error) {
      logger.error('Failed to retrieve Ollama models', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return configured model as fallback
      return [this.config.model];
    }
  }

  /**
   * Chat completion with Ollama
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const {
      messages,
      temperature = 0.7,
      maxTokens = 1000,
      stream = false,
      topP,
      stop,
    } = options;

    try {
      const startTime = Date.now();

      // Convert chat messages to single prompt
      const prompt = this.formatMessagesToPrompt(messages);

      const response = await this.client.post('/api/generate', {
        model: this.config.model,
        prompt,
        temperature,
        stream: false, // We handle streaming separately
        options: {
          num_predict: maxTokens,
          top_p: topP,
          stop,
        },
      });

      const duration = Date.now() - startTime;

      if (!response.data.response) {
        throw new Error('No content in Ollama response');
      }

      const result: ChatCompletionResponse = {
        content: response.data.response,
        model: response.data.model,
        usage: response.data.prompt_eval_count && response.data.eval_count
          ? {
              promptTokens: response.data.prompt_eval_count,
              completionTokens: response.data.eval_count,
              totalTokens: response.data.prompt_eval_count + response.data.eval_count,
            }
          : undefined,
        finishReason: response.data.done ? 'stop' : undefined,
      };

      logger.info('Ollama chat completion successful', {
        model: response.data.model,
        duration,
        tokens: result.usage?.totalTokens,
      });

      return result;
    } catch (error) {
      logger.error('Ollama chat completion failed', {
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate embeddings with Ollama
   */
  async generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const { input, model } = options;
    const inputs = Array.isArray(input) ? input : [input];

    try {
      const startTime = Date.now();

      const embeddings: number[][] = [];

      // Ollama processes embeddings one at a time
      for (const text of inputs) {
        const response = await this.client.post('/api/embeddings', {
          model: model || this.config.embeddingModel,
          prompt: text,
        });

        if (response.data.embedding) {
          embeddings.push(response.data.embedding);
        }
      }

      const duration = Date.now() - startTime;

      const result: EmbeddingResponse = {
        embeddings,
        model: model || this.config.embeddingModel,
        usage: undefined, // Ollama doesn't provide token usage for embeddings
      };

      logger.info('Ollama embeddings generated', {
        model: result.model,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
        duration,
      });

      return result;
    } catch (error) {
      logger.error('Ollama embeddings generation failed', {
        model: model || this.config.embeddingModel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      const isConnected = response.status === 200;

      logger.debug('Ollama connection test', { success: isConnected });
      return isConnected;
    } catch (error) {
      logger.warn('Ollama connection test failed', {
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
      embeddingModel: this.config.embeddingModel,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    };
  }

  /**
   * Format chat messages to Ollama prompt format
   */
  private formatMessagesToPrompt(messages: { role: string; content: string }[]): string {
    return messages
      .map(m => {
        if (m.role === 'system') return `System: ${m.content}`;
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') return `Assistant: ${m.content}`;
        return m.content;
      })
      .join('\n\n') + '\n\nAssistant:';
  }

  /**
   * Pull a model from Ollama library
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      logger.info(`Pulling Ollama model: ${modelName}`);

      await this.client.post('/api/pull', {
        name: modelName,
        stream: false,
      });

      logger.info(`Successfully pulled model: ${modelName}`);
    } catch (error) {
      logger.error('Failed to pull Ollama model', {
        model: modelName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete a model from Ollama
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      logger.info(`Deleting Ollama model: ${modelName}`);

      await this.client.delete('/api/delete', {
        data: { name: modelName },
      });

      logger.info(`Successfully deleted model: ${modelName}`);
    } catch (error) {
      logger.error('Failed to delete Ollama model', {
        model: modelName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Show model information
   */
  async showModelInfo(modelName?: string): Promise<any> {
    try {
      const model = modelName || this.config.model;
      const response = await this.client.post('/api/show', {
        name: model,
      });

      logger.debug('Retrieved Ollama model info', { model });
      return response.data;
    } catch (error) {
      logger.error('Failed to get Ollama model info', {
        model: modelName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get Ollama version
   */
  async getVersion(): Promise<string> {
    try {
      const response = await this.client.get('/api/version', { timeout: 5000 });
      return response.data?.version || 'unknown';
    } catch (error) {
      logger.warn('Failed to get Ollama version', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 'unknown';
    }
  }

  /**
   * Check if a model is available locally
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.includes(modelName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure model is available, pull if necessary
   */
  async ensureModel(modelName: string): Promise<void> {
    const isAvailable = await this.isModelAvailable(modelName);

    if (!isAvailable) {
      logger.info(`Model ${modelName} not available locally, pulling...`);
      await this.pullModel(modelName);
    } else {
      logger.debug(`Model ${modelName} is available locally`);
    }
  }
}
