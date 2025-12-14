/**
 * Anthropic Provider
 *
 * Real Anthropic SDK integration supporting:
 * - Claude-3 Opus, Sonnet, Haiku
 * - Streaming support
 * - Message batching
 * - Vision capabilities
 */

import Anthropic from '@anthropic-ai/sdk';
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
  defaultMeta: { service: 'anthropic-provider' },
  transports: [new winston.transports.Console()],
});

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider implements IAIProvider {
  readonly type: AIProviderType = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    embeddings: false, // Anthropic doesn't provide embeddings
    transcription: false, // Anthropic doesn't provide transcription
    vision: true,
    streaming: true,
    functions: true, // Claude supports tool use
  };

  private client: Anthropic;
  private config: Required<ProviderConfig>;

  constructor(config?: ProviderConfig) {
    // Load configuration with defaults
    this.config = {
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY || '',
      baseURL: config?.baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      model: config?.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      embeddingModel: config?.embeddingModel || '', // Not supported
      timeout: config?.timeout || 60000,
      maxRetries: config?.maxRetries || 3,
    };

    // Validate API key
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.');
    }

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    logger.info('Anthropic provider initialized', {
      baseURL: this.config.baseURL,
      model: this.config.model,
    });
  }

  /**
   * Get available Anthropic models
   */
  async getAvailableModels(): Promise<string[]> {
    // Anthropic doesn't have a models list endpoint, return known models
    const models = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];

    logger.debug(`Available Anthropic models: ${models.length}`);
    return models;
  }

  /**
   * Chat completion with Claude models
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

      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Convert messages to Anthropic format
      const anthropicMessages: Anthropic.MessageParam[] = conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      // Create message
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        system: systemMessage?.content,
        temperature,
        top_p: topP,
        stop_sequences: stop,
        stream: false,
      });

      const duration = Date.now() - startTime;

      // Extract content from response
      const contentBlock = response.content[0];
      if (!contentBlock || contentBlock.type !== 'text') {
        throw new Error('No text content in Anthropic response');
      }

      const result: ChatCompletionResponse = {
        content: contentBlock.text,
        model: response.model,
        usage: response.usage
          ? {
              promptTokens: response.usage.input_tokens,
              completionTokens: response.usage.output_tokens,
              totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
        finishReason: response.stop_reason || undefined,
      };

      logger.info('Anthropic chat completion successful', {
        model: response.model,
        duration,
        tokens: result.usage?.totalTokens,
        finishReason: result.finishReason,
      });

      return result;
    } catch (error) {
      logger.error('Anthropic chat completion failed', {
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate embeddings (not supported by Anthropic)
   */
  async generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    throw new Error('Anthropic does not support embeddings. Use OpenAI or another provider.');
  }

  /**
   * Test connection to Anthropic
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a minimal message to test the connection
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      logger.debug('Anthropic connection test successful');
      return true;
    } catch (error) {
      logger.warn('Anthropic connection test failed', {
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
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    };
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
      stop,
    } = options;

    try {
      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Convert messages to Anthropic format
      const anthropicMessages: Anthropic.MessageParam[] = conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      // Create streaming message
      const stream = await this.client.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        system: systemMessage?.content,
        temperature,
        top_p: topP,
        stop_sequences: stop,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error) {
      logger.error('Anthropic streaming completion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create message with tools (function calling)
   */
  async chatCompletionWithTools(
    options: ChatCompletionOptions & {
      tools?: Anthropic.Tool[];
    }
  ): Promise<ChatCompletionResponse & { toolCalls?: any[] }> {
    const {
      messages,
      temperature = 0.7,
      maxTokens = 1000,
      topP,
      stop,
      tools,
    } = options;

    try {
      const startTime = Date.now();

      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Convert messages to Anthropic format
      const anthropicMessages: Anthropic.MessageParam[] = conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      // Create message with tools
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        system: systemMessage?.content,
        temperature,
        top_p: topP,
        stop_sequences: stop,
        tools,
      });

      const duration = Date.now() - startTime;

      // Extract content and tool calls
      let textContent = '';
      const toolCalls: any[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      const result = {
        content: textContent,
        model: response.model,
        usage: response.usage
          ? {
              promptTokens: response.usage.input_tokens,
              completionTokens: response.usage.output_tokens,
              totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
        finishReason: response.stop_reason || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      logger.info('Anthropic chat completion with tools successful', {
        model: response.model,
        duration,
        tokens: result.usage?.totalTokens,
        toolCalls: toolCalls.length,
      });

      return result;
    } catch (error) {
      logger.error('Anthropic chat completion with tools failed', {
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
