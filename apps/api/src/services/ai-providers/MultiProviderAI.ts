/**
 * Multi-Provider AI Service
 * Supports: OpenAI, Ollama, vLLM, LM Studio
 *
 * This service provides a unified interface for multiple AI providers,
 * allowing seamless switching between cloud (OpenAI) and local (Ollama, vLLM, LM Studio)
 * providers without changing application code.
 */

import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'multi-provider-ai' },
  transports: [new winston.transports.Console()],
});

export type AIProvider = 'openai' | 'ollama' | 'vllm' | 'lmstudio';

export interface AIProviderConfig {
  provider: AIProvider;
  baseURL: string;
  apiKey?: string;
  model: string;
  embeddingModel?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface EmbeddingOptions {
  input: string | string[];
  model?: string;
}

/**
 * Multi-Provider AI Service
 *
 * Example usage:
 * ```typescript
 * const ai = new MultiProviderAI('ollama');
 * const response = await ai.chatCompletion({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
export class MultiProviderAI {
  private config: AIProviderConfig;
  private fallbackProvider?: MultiProviderAI;

  constructor(provider?: AIProvider, fallbackProvider?: AIProvider) {
    const activeProvider = provider || (process.env.AI_PROVIDER as AIProvider) || 'openai';

    this.config = this.getProviderConfig(activeProvider);

    // Setup fallback provider
    if (fallbackProvider) {
      this.fallbackProvider = new MultiProviderAI(fallbackProvider);
    } else if (process.env.AI_FALLBACK_PROVIDER && process.env.AI_FALLBACK_PROVIDER !== activeProvider) {
      this.fallbackProvider = new MultiProviderAI(process.env.AI_FALLBACK_PROVIDER as AIProvider);
    }

    logger.info(`MultiProviderAI initialized`, {
      provider: this.config.provider,
      baseURL: this.config.baseURL,
      model: this.config.model,
      hasFallback: !!this.fallbackProvider,
    });
  }

  /**
   * Get configuration for a specific provider
   */
  private getProviderConfig(provider: AIProvider): AIProviderConfig {
    switch (provider) {
      case 'openai':
        return {
          provider: 'openai',
          baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        };

      case 'ollama':
        return {
          provider: 'ollama',
          baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
          embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
        };

      case 'vllm':
        return {
          provider: 'vllm',
          baseURL: process.env.VLLM_BASE_URL || 'http://localhost:8000/v1',
          apiKey: process.env.VLLM_API_KEY || 'dummy-key',
          model: process.env.VLLM_MODEL || 'meta-llama/Llama-3.2-3B-Instruct',
          embeddingModel: process.env.VLLM_EMBEDDING_MODEL,
        };

      case 'lmstudio':
        return {
          provider: 'lmstudio',
          baseURL: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
          model: process.env.LMSTUDIO_MODEL || 'local-model',
          embeddingModel: process.env.LMSTUDIO_EMBEDDING_MODEL,
        };

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Chat Completion
   *
   * Supports all providers with OpenAI-compatible API
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { messages, temperature = 0.7, maxTokens = 1000, stream = false } = options;

    try {
      // Ollama has a different API format
      if (this.config.provider === 'ollama') {
        return await this.ollamaChatCompletion(messages, temperature, maxTokens);
      }

      // OpenAI-compatible providers (OpenAI, vLLM, LM Studio)
      const response = await axios.post(
        `${this.config.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
          timeout: 60000,
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      logger.debug(`Chat completion successful`, {
        provider: this.config.provider,
        model: this.config.model,
        inputTokens: messages.reduce((sum, m) => sum + m.content.length, 0),
        outputLength: content.length,
      });

      return content;

    } catch (error) {
      logger.error(`Chat completion failed`, {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Try fallback provider
      if (this.fallbackProvider) {
        logger.info(`Trying fallback provider...`);
        return await this.fallbackProvider.chatCompletion(options);
      }

      throw error;
    }
  }

  /**
   * Ollama-specific chat completion
   * Uses Ollama's /api/generate endpoint
   */
  private async ollamaChatCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    // Convert chat messages to single prompt
    const prompt = messages
      .map(m => {
        if (m.role === 'system') return `System: ${m.content}`;
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') return `Assistant: ${m.content}`;
        return m.content;
      })
      .join('\n\n');

    const response = await axios.post(
      `${this.config.baseURL}/api/generate`,
      {
        model: this.config.model,
        prompt: prompt + '\n\nAssistant:',
        temperature,
        options: {
          num_predict: maxTokens,
        },
        stream: false,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    );

    return response.data.response || '';
  }

  /**
   * Generate Embeddings
   *
   * Supports OpenAI, Ollama (with nomic-embed-text), and other providers
   */
  async embeddings(options: EmbeddingOptions): Promise<number[][]> {
    const { input, model } = options;
    const inputs = Array.isArray(input) ? input : [input];

    try {
      // Ollama embeddings
      if (this.config.provider === 'ollama') {
        return await this.ollamaEmbeddings(inputs, model);
      }

      // OpenAI-compatible providers
      const response = await axios.post(
        `${this.config.baseURL}/embeddings`,
        {
          model: model || this.config.embeddingModel,
          input: inputs,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
          timeout: 30000,
        }
      );

      const embeddings = response.data.data.map((item: any) => item.embedding);

      logger.debug(`Embeddings generated`, {
        provider: this.config.provider,
        model: model || this.config.embeddingModel,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
      });

      return embeddings;

    } catch (error) {
      logger.error(`Embeddings generation failed`, {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Try fallback provider
      if (this.fallbackProvider) {
        logger.info(`Trying fallback provider for embeddings...`);
        return await this.fallbackProvider.embeddings(options);
      }

      throw error;
    }
  }

  /**
   * Ollama-specific embeddings
   * Uses Ollama's /api/embeddings endpoint
   */
  private async ollamaEmbeddings(inputs: string[], model?: string): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of inputs) {
      const response = await axios.post(
        `${this.config.baseURL}/api/embeddings`,
        {
          model: model || this.config.embeddingModel || 'nomic-embed-text',
          prompt: text,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      embeddings.push(response.data.embedding);
    }

    return embeddings;
  }

  /**
   * Get provider info
   */
  getProviderInfo(): AIProviderConfig {
    return { ...this.config };
  }

  /**
   * Test provider availability
   */
  async testConnection(): Promise<boolean> {
    try {
      if (this.config.provider === 'ollama') {
        const response = await axios.get(`${this.config.baseURL}/api/tags`, { timeout: 5000 });
        return response.status === 200;
      }

      // OpenAI-compatible test
      const response = await axios.get(`${this.config.baseURL}/models`, {
        headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {},
        timeout: 5000,
      });

      return response.status === 200;

    } catch (error) {
      logger.warn(`Provider connection test failed`, {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

/**
 * Factory function to create AI provider instance
 */
export function createAIProvider(provider?: AIProvider, fallback?: AIProvider): MultiProviderAI {
  return new MultiProviderAI(provider, fallback);
}

/**
 * Helper to calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}
