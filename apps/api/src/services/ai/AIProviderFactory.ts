/**
 * AI Provider Factory
 *
 * Factory pattern for creating AI provider instances with unified interface.
 * Supports OpenAI, Anthropic, vLLM, Ollama, and LM Studio.
 */

import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { VLLMProvider } from './providers/VLLMProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { LMStudioProvider } from './providers/LMStudioProvider';

/**
 * Supported AI providers
 */
export type AIProviderType = 'openai' | 'anthropic' | 'vllm' | 'ollama' | 'lmstudio';

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message interface
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

/**
 * Embedding options
 */
export interface EmbeddingOptions {
  input: string | string[];
  model?: string;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Transcription options
 */
export interface TranscriptionOptions {
  audioBuffer: Buffer;
  fileName: string;
  language?: string;
  prompt?: string;
}

/**
 * Transcription response
 */
export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  chat: boolean;
  embeddings: boolean;
  transcription: boolean;
  vision: boolean;
  streaming: boolean;
  functions: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  embeddingModel?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Unified AI Provider Interface
 *
 * All providers must implement this interface to ensure consistent behavior
 */
export interface IAIProvider {
  /**
   * Provider type identifier
   */
  readonly type: AIProviderType;

  /**
   * Provider capabilities
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Get available models for this provider
   */
  getAvailableModels(): Promise<string[]>;

  /**
   * Chat completion
   */
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * Generate embeddings
   */
  generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse>;

  /**
   * Transcribe audio (if supported)
   */
  transcribeAudio?(options: TranscriptionOptions): Promise<TranscriptionResponse>;

  /**
   * Test provider connection
   */
  testConnection(): Promise<boolean>;

  /**
   * Get current configuration
   */
  getConfig(): ProviderConfig;
}

/**
 * AI Provider Factory
 *
 * Creates appropriate provider instances based on configuration
 */
export class AIProviderFactory {
  /**
   * Create a provider instance
   */
  static createProvider(
    type: AIProviderType,
    config?: ProviderConfig
  ): IAIProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(config);

      case 'anthropic':
        return new AnthropicProvider(config);

      case 'vllm':
        return new VLLMProvider(config);

      case 'ollama':
        return new OllamaProvider(config);

      case 'lmstudio':
        return new LMStudioProvider(config);

      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  /**
   * Create provider from environment variables
   */
  static createFromEnv(): IAIProvider {
    const providerType = (process.env.AI_DEFAULT_PROVIDER as AIProviderType) || 'openai';
    return AIProviderFactory.createProvider(providerType);
  }

  /**
   * Create multiple providers for fallback chain
   */
  static createProviderChain(types?: AIProviderType[]): IAIProvider[] {
    // Use types from parameter or environment variable
    const providerTypes = types ||
      (process.env.AI_FALLBACK_PROVIDERS?.split(',').map(p => p.trim() as AIProviderType)) ||
      ['openai', 'anthropic', 'vllm', 'ollama'];

    return providerTypes.map(type => AIProviderFactory.createProvider(type));
  }

  /**
   * Get default provider type from environment
   */
  static getDefaultProviderType(): AIProviderType {
    return (process.env.AI_DEFAULT_PROVIDER as AIProviderType) || 'openai';
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(type: AIProviderType, config?: ProviderConfig): boolean {
    switch (type) {
      case 'openai':
        return !!(config?.apiKey || process.env.OPENAI_API_KEY);

      case 'anthropic':
        return !!(config?.apiKey || process.env.ANTHROPIC_API_KEY);

      case 'vllm':
      case 'ollama':
      case 'lmstudio':
        // Local providers don't require API keys
        return true;

      default:
        return false;
    }
  }
}
