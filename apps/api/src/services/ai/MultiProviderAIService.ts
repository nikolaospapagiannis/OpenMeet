/**
 * Multi-Provider AI Service
 *
 * Main service class with:
 * - Provider selection strategy (priority, cost, latency, capability)
 * - Automatic fallback on failure
 * - Response normalization
 * - Usage tracking
 * - Health monitoring
 */

import * as winston from 'winston';
import {
  AIProviderFactory,
  AIProviderType,
  IAIProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  TranscriptionOptions,
  TranscriptionResponse,
} from './AIProviderFactory';
import { AIModelRegistry } from './AIModelRegistry';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'multi-provider-ai' },
  transports: [new winston.transports.Console()],
});

/**
 * Provider selection strategy
 */
export type ProviderStrategy =
  | 'priority' // Use providers in priority order
  | 'cost' // Use cheapest provider first
  | 'latency' // Use fastest provider first
  | 'capability' // Use provider with best capability match
  | 'round-robin'; // Distribute load evenly

/**
 * Provider health status
 */
interface ProviderHealth {
  provider: AIProviderType;
  healthy: boolean;
  lastCheck: Date;
  failureCount: number;
  avgLatency?: number;
}

/**
 * Usage tracking
 */
interface UsageStats {
  provider: AIProviderType;
  model: string;
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorCount: number;
}

/**
 * Multi-Provider AI Service
 *
 * Intelligent routing and fallback across multiple AI providers
 */
export class MultiProviderAIService {
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private providerHealth: Map<AIProviderType, ProviderHealth> = new Map();
  private usageStats: Map<string, UsageStats> = new Map();
  private strategy: ProviderStrategy;
  private roundRobinIndex: number = 0;

  constructor(
    providerTypes?: AIProviderType[],
    strategy: ProviderStrategy = 'priority'
  ) {
    this.strategy = strategy;

    // Default provider priority if not specified
    const types = providerTypes || this.getDefaultProviderTypes();

    // Initialize providers
    for (const type of types) {
      try {
        const provider = AIProviderFactory.createProvider(type);
        this.providers.set(type, provider);

        // Initialize health status
        this.providerHealth.set(type, {
          provider: type,
          healthy: true,
          lastCheck: new Date(),
          failureCount: 0,
        });

        logger.info(`Initialized provider: ${type}`);
      } catch (error) {
        logger.warn(`Failed to initialize provider: ${type}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (this.providers.size === 0) {
      throw new Error('No AI providers could be initialized');
    }

    logger.info('MultiProviderAIService initialized', {
      providers: Array.from(this.providers.keys()),
      strategy: this.strategy,
    });
  }

  /**
   * Get default provider types from environment or use defaults
   */
  private getDefaultProviderTypes(): AIProviderType[] {
    const envProviders = process.env.AI_FALLBACK_PROVIDERS;
    if (envProviders) {
      return envProviders.split(',').map(p => p.trim() as AIProviderType);
    }
    return ['openai', 'anthropic', 'vllm', 'ollama', 'lmstudio'];
  }

  /**
   * Chat completion with automatic provider selection and fallback
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const providers = this.selectProviders('chat');
    let lastError: Error | null = null;

    for (const providerType of providers) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        const startTime = Date.now();

        logger.debug(`Attempting chat completion with ${providerType}`);
        const response = await provider.chatCompletion(options);

        const duration = Date.now() - startTime;

        // Update health and stats
        this.updateProviderHealth(providerType, true, duration);
        this.updateUsageStats(providerType, response.model, response.usage?.totalTokens || 0, duration, 0);

        logger.info('Chat completion successful', {
          provider: providerType,
          model: response.model,
          duration,
          tokens: response.usage?.totalTokens,
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - Date.now();

        logger.warn(`Chat completion failed with ${providerType}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update health and stats
        this.updateProviderHealth(providerType, false);
        this.updateUsageStats(providerType, 'unknown', 0, duration, 1);

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed for chat completion. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Generate embeddings with automatic provider selection and fallback
   */
  async generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const providers = this.selectProviders('embeddings');
    let lastError: Error | null = null;

    for (const providerType of providers) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        const startTime = Date.now();

        logger.debug(`Attempting embeddings with ${providerType}`);
        const response = await provider.generateEmbeddings(options);

        const duration = Date.now() - startTime;

        // Update health and stats
        this.updateProviderHealth(providerType, true, duration);
        this.updateUsageStats(providerType, response.model, response.usage?.totalTokens || 0, duration, 0);

        logger.info('Embeddings generation successful', {
          provider: providerType,
          model: response.model,
          count: response.embeddings.length,
          duration,
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Embeddings failed with ${providerType}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update health
        this.updateProviderHealth(providerType, false);

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed for embeddings. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Transcribe audio (only OpenAI supports this)
   */
  async transcribeAudio(options: TranscriptionOptions): Promise<TranscriptionResponse> {
    const providers = this.selectProviders('transcription');

    if (providers.length === 0) {
      throw new Error('No providers support audio transcription');
    }

    let lastError: Error | null = null;

    for (const providerType of providers) {
      const provider = this.providers.get(providerType);
      if (!provider?.transcribeAudio) continue;

      try {
        const startTime = Date.now();

        logger.debug(`Attempting transcription with ${providerType}`);
        const response = await provider.transcribeAudio(options);

        const duration = Date.now() - startTime;

        // Update health
        this.updateProviderHealth(providerType, true, duration);

        logger.info('Transcription successful', {
          provider: providerType,
          duration,
          textLength: response.text.length,
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Transcription failed with ${providerType}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update health
        this.updateProviderHealth(providerType, false);

        // Continue to next provider
        continue;
      }
    }

    throw new Error(
      `All providers failed for transcription. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Select providers based on strategy and capability
   */
  private selectProviders(capability: 'chat' | 'embeddings' | 'transcription' | 'vision' | 'streaming' | 'functions'): AIProviderType[] {
    // Filter providers by capability
    const capableProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.capabilities[capability])
      .map(([type, _]) => type);

    if (capableProviders.length === 0) {
      return [];
    }

    // Apply selection strategy
    switch (this.strategy) {
      case 'priority':
        return this.sortByPriority(capableProviders);

      case 'cost':
        return this.sortByCost(capableProviders);

      case 'latency':
        return this.sortByLatency(capableProviders);

      case 'capability':
        return this.sortByCapability(capableProviders, capability);

      case 'round-robin':
        return this.roundRobinSelect(capableProviders);

      default:
        return this.sortByPriority(capableProviders);
    }
  }

  /**
   * Sort providers by priority
   */
  private sortByPriority(providers: AIProviderType[]): AIProviderType[] {
    const priority: AIProviderType[] = ['openai', 'anthropic', 'vllm', 'ollama', 'lmstudio'];
    return providers.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  }

  /**
   * Sort providers by cost (cheapest first)
   */
  private sortByCost(providers: AIProviderType[]): AIProviderType[] {
    return providers.sort((a, b) => {
      // Local providers have zero cost
      const costA = ['vllm', 'ollama', 'lmstudio'].includes(a) ? 0 : 1;
      const costB = ['vllm', 'ollama', 'lmstudio'].includes(b) ? 0 : 1;
      return costA - costB;
    });
  }

  /**
   * Sort providers by latency (fastest first)
   */
  private sortByLatency(providers: AIProviderType[]): AIProviderType[] {
    return providers.sort((a, b) => {
      const healthA = this.providerHealth.get(a);
      const healthB = this.providerHealth.get(b);
      return (healthA?.avgLatency || Infinity) - (healthB?.avgLatency || Infinity);
    });
  }

  /**
   * Sort providers by capability match
   */
  private sortByCapability(providers: AIProviderType[], capability: string): AIProviderType[] {
    // For now, use priority sorting
    // In the future, this could rank by quality for the specific capability
    return this.sortByPriority(providers);
  }

  /**
   * Round-robin provider selection
   */
  private roundRobinSelect(providers: AIProviderType[]): AIProviderType[] {
    if (providers.length === 0) return [];

    const selected = providers[this.roundRobinIndex % providers.length];
    this.roundRobinIndex++;

    // Return selected first, then others as fallback
    return [selected, ...providers.filter(p => p !== selected)];
  }

  /**
   * Update provider health status
   */
  private updateProviderHealth(
    provider: AIProviderType,
    success: boolean,
    latency?: number
  ): void {
    const health = this.providerHealth.get(provider);
    if (!health) return;

    health.lastCheck = new Date();

    if (success) {
      health.healthy = true;
      health.failureCount = 0;

      if (latency !== undefined) {
        // Update running average of latency
        health.avgLatency = health.avgLatency
          ? (health.avgLatency * 0.7 + latency * 0.3)
          : latency;
      }
    } else {
      health.failureCount++;

      // Mark unhealthy after 3 consecutive failures
      if (health.failureCount >= 3) {
        health.healthy = false;
        logger.warn(`Provider marked unhealthy: ${provider}`);
      }
    }
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(
    provider: AIProviderType,
    model: string,
    tokens: number,
    latency: number,
    errorCount: number
  ): void {
    const key = `${provider}:${model}`;
    const stats = this.usageStats.get(key) || {
      provider,
      model,
      requestCount: 0,
      totalTokens: 0,
      totalCost: 0,
      avgLatency: 0,
      errorCount: 0,
    };

    stats.requestCount++;
    stats.totalTokens += tokens;
    stats.errorCount += errorCount;

    // Update running average of latency
    stats.avgLatency = (stats.avgLatency * (stats.requestCount - 1) + latency) / stats.requestCount;

    // Estimate cost if pricing available
    const modelInfo = AIModelRegistry.getModel(model);
    if (modelInfo?.pricing && tokens > 0) {
      const cost = AIModelRegistry.estimateCost(model, tokens / 2, tokens / 2) || 0;
      stats.totalCost += cost;
    }

    this.usageStats.set(key, stats);
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats[] {
    return Array.from(this.usageStats.values());
  }

  /**
   * Test all provider connections
   */
  async testAllConnections(): Promise<Map<AIProviderType, boolean>> {
    const results = new Map<AIProviderType, boolean>();

    for (const [type, provider] of Array.from(this.providers.entries())) {
      try {
        const isConnected = await provider.testConnection();
        results.set(type, isConnected);

        logger.info(`Connection test for ${type}: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        results.set(type, false);
        logger.error(`Connection test for ${type} threw error`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get specific provider
   */
  getProvider(type: AIProviderType): IAIProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Set provider strategy
   */
  setStrategy(strategy: ProviderStrategy): void {
    this.strategy = strategy;
    logger.info(`Provider strategy changed to: ${strategy}`);
  }

  /**
   * Get current strategy
   */
  getStrategy(): ProviderStrategy {
    return this.strategy;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.usageStats.clear();
    logger.info('Usage statistics reset');
  }

  /**
   * Health check for service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    providers: { [key: string]: boolean };
    totalProviders: number;
    healthyProviders: number;
  }> {
    const connectionTests = await this.testAllConnections();
    const healthyCount = Array.from(connectionTests.values()).filter(h => h).length;

    return {
      healthy: healthyCount > 0,
      providers: Object.fromEntries(connectionTests),
      totalProviders: this.providers.size,
      healthyProviders: healthyCount,
    };
  }
}
