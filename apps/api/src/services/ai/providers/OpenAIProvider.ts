/**
 * OpenAI Provider
 *
 * Real OpenAI SDK integration supporting:
 * - Chat completions (GPT-4, GPT-3.5-turbo)
 * - Embeddings (text-embedding-3-small, text-embedding-3-large)
 * - Whisper transcription
 * - Streaming support
 * - Vision models
 */

import OpenAI from 'openai';
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
  TranscriptionOptions,
  TranscriptionResponse,
} from '../AIProviderFactory';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'openai-provider' },
  transports: [new winston.transports.Console()],
});

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements IAIProvider {
  readonly type: AIProviderType = 'openai';
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    embeddings: true,
    transcription: true,
    vision: true,
    streaming: true,
    functions: true,
  };

  private client: OpenAI;
  private config: Required<ProviderConfig>;

  constructor(config?: ProviderConfig) {
    // Load configuration with defaults
    this.config = {
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
      baseURL: config?.baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: config?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      embeddingModel: config?.embeddingModel || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      timeout: config?.timeout || 60000,
      maxRetries: config?.maxRetries || 3,
    };

    // Validate API key
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    logger.info('OpenAI provider initialized', {
      baseURL: this.config.baseURL,
      model: this.config.model,
      embeddingModel: this.config.embeddingModel,
    });
  }

  /**
   * Get available OpenAI models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      const models = response.data
        .filter(m => m.id.startsWith('gpt-') || m.id.includes('embedding'))
        .map(m => m.id)
        .sort();

      logger.debug(`Retrieved ${models.length} OpenAI models`);
      return models;
    } catch (error) {
      logger.error('Failed to retrieve OpenAI models', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return common models as fallback
      return [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-3.5-turbo',
        'text-embedding-3-small',
        'text-embedding-3-large',
      ];
    }
  }

  /**
   * Chat completion with GPT models
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

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature,
        max_tokens: maxTokens,
        stream: false,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop,
      });

      const duration = Date.now() - startTime;

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      const result: ChatCompletionResponse = {
        content: choice.message.content,
        model: response.model,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        finishReason: choice.finish_reason || undefined,
      };

      logger.info('OpenAI chat completion successful', {
        model: response.model,
        duration,
        tokens: result.usage?.totalTokens,
        finishReason: result.finishReason,
      });

      return result;
    } catch (error) {
      logger.error('OpenAI chat completion failed', {
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const { input, model } = options;
    const inputs = Array.isArray(input) ? input : [input];

    try {
      const startTime = Date.now();

      const response = await this.client.embeddings.create({
        model: model || this.config.embeddingModel,
        input: inputs,
      });

      const duration = Date.now() - startTime;

      const embeddings = response.data.map(item => item.embedding);

      const result: EmbeddingResponse = {
        embeddings,
        model: response.model,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };

      logger.info('OpenAI embeddings generated', {
        model: response.model,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
        duration,
      });

      return result;
    } catch (error) {
      logger.error('OpenAI embeddings generation failed', {
        model: model || this.config.embeddingModel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Transcribe audio using Whisper
   */
  async transcribeAudio(options: TranscriptionOptions): Promise<TranscriptionResponse> {
    const { audioBuffer, fileName, language, prompt } = options;

    try {
      const startTime = Date.now();

      // Create a File object from buffer
      const audioFile = new File([audioBuffer as any], fileName, {
        type: this.getAudioMimeType(fileName),
      }) as any;

      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language,
        prompt,
        response_format: 'verbose_json',
      });

      const duration = Date.now() - startTime;

      const result: TranscriptionResponse = {
        text: response.text,
        language: (response as any).language,
        duration: (response as any).duration,
      };

      logger.info('OpenAI transcription successful', {
        fileName,
        textLength: result.text.length,
        language: result.language,
        duration,
      });

      return result;
    } catch (error) {
      logger.error('OpenAI transcription failed', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Test connection to OpenAI
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      logger.debug('OpenAI connection test successful');
      return true;
    } catch (error) {
      logger.warn('OpenAI connection test failed', {
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
   * Helper to determine audio MIME type from filename
   */
  private getAudioMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
    };
    return mimeTypes[ext || ''] || 'audio/mpeg';
  }

  /**
   * Chat completion with streaming (for future use)
   */
  async *chatCompletionStream(
    options: ChatCompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    const {
      messages,
      temperature = 0.7,
      maxTokens = 1000,
      topP,
      frequencyPenalty,
      presencePenalty,
      stop,
    } = options;

    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature,
        max_tokens: maxTokens,
        stream: true,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('OpenAI streaming completion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
