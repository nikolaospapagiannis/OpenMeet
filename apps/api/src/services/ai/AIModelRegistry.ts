/**
 * AI Model Registry
 *
 * Comprehensive model capabilities matrix with:
 * - Token limits
 * - Pricing information
 * - Feature support (streaming, functions, vision)
 * - Performance characteristics
 */

import { AIProviderType, ProviderCapabilities } from './AIProviderFactory';

/**
 * Model capability information
 */
export interface ModelInfo {
  provider: AIProviderType;
  modelId: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ProviderCapabilities;
  pricing?: {
    inputPer1kTokens: number;
    outputPer1kTokens: number;
    currency: string;
  };
  performanceCharacteristics: {
    speed: 'slow' | 'medium' | 'fast' | 'very-fast';
    quality: 'basic' | 'good' | 'excellent' | 'superior';
    costEfficiency: 'low' | 'medium' | 'high' | 'very-high';
  };
  bestFor: string[];
  released?: string;
}

/**
 * AI Model Registry
 *
 * Central registry of all supported models with their capabilities
 */
export class AIModelRegistry {
  private static models: Map<string, ModelInfo> = new Map([
    // OpenAI Models
    [
      'gpt-4-turbo-preview',
      {
        provider: 'openai',
        modelId: 'gpt-4-turbo-preview',
        displayName: 'GPT-4 Turbo',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: true,
          streaming: true,
          functions: true,
        },
        pricing: {
          inputPer1kTokens: 0.01,
          outputPer1kTokens: 0.03,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'medium',
          quality: 'superior',
          costEfficiency: 'medium',
        },
        bestFor: ['complex reasoning', 'long context', 'vision tasks', 'function calling'],
        released: '2024-01',
      },
    ],
    [
      'gpt-4',
      {
        provider: 'openai',
        modelId: 'gpt-4',
        displayName: 'GPT-4',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: false,
          streaming: true,
          functions: true,
        },
        pricing: {
          inputPer1kTokens: 0.03,
          outputPer1kTokens: 0.06,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'slow',
          quality: 'superior',
          costEfficiency: 'low',
        },
        bestFor: ['complex reasoning', 'creative writing', 'analysis'],
        released: '2023-03',
      },
    ],
    [
      'gpt-3.5-turbo',
      {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        maxOutputTokens: 4096,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: false,
          streaming: true,
          functions: true,
        },
        pricing: {
          inputPer1kTokens: 0.0005,
          outputPer1kTokens: 0.0015,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'fast',
          quality: 'good',
          costEfficiency: 'very-high',
        },
        bestFor: ['quick responses', 'simple tasks', 'high volume'],
        released: '2023-03',
      },
    ],
    [
      'text-embedding-3-small',
      {
        provider: 'openai',
        modelId: 'text-embedding-3-small',
        displayName: 'Text Embedding 3 Small',
        contextWindow: 8191,
        maxOutputTokens: 0,
        capabilities: {
          chat: false,
          embeddings: true,
          transcription: false,
          vision: false,
          streaming: false,
          functions: false,
        },
        pricing: {
          inputPer1kTokens: 0.00002,
          outputPer1kTokens: 0,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'very-fast',
          quality: 'good',
          costEfficiency: 'very-high',
        },
        bestFor: ['embeddings', 'semantic search', 'clustering'],
        released: '2024-01',
      },
    ],
    [
      'text-embedding-3-large',
      {
        provider: 'openai',
        modelId: 'text-embedding-3-large',
        displayName: 'Text Embedding 3 Large',
        contextWindow: 8191,
        maxOutputTokens: 0,
        capabilities: {
          chat: false,
          embeddings: true,
          transcription: false,
          vision: false,
          streaming: false,
          functions: false,
        },
        pricing: {
          inputPer1kTokens: 0.00013,
          outputPer1kTokens: 0,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'fast',
          quality: 'excellent',
          costEfficiency: 'high',
        },
        bestFor: ['high-quality embeddings', 'semantic search', 'RAG'],
        released: '2024-01',
      },
    ],

    // Anthropic Models
    [
      'claude-3-5-sonnet-20241022',
      {
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: true,
          streaming: true,
          functions: true,
        },
        pricing: {
          inputPer1kTokens: 0.003,
          outputPer1kTokens: 0.015,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'fast',
          quality: 'superior',
          costEfficiency: 'high',
        },
        bestFor: ['coding', 'complex reasoning', 'long context', 'vision'],
        released: '2024-10',
      },
    ],
    [
      'claude-3-5-haiku-20241022',
      {
        provider: 'anthropic',
        modelId: 'claude-3-5-haiku-20241022',
        displayName: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: false,
          streaming: true,
          functions: true,
        },
        pricing: {
          inputPer1kTokens: 0.0008,
          outputPer1kTokens: 0.004,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'very-fast',
          quality: 'excellent',
          costEfficiency: 'very-high',
        },
        bestFor: ['quick responses', 'high volume', 'cost efficiency'],
        released: '2024-10',
      },
    ],
    [
      'claude-3-opus-20240229',
      {
        provider: 'anthropic',
        modelId: 'claude-3-opus-20240229',
        displayName: 'Claude 3 Opus',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: true,
          streaming: true,
          functions: true,
        },
        pricing: {
          inputPer1kTokens: 0.015,
          outputPer1kTokens: 0.075,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'slow',
          quality: 'superior',
          costEfficiency: 'low',
        },
        bestFor: ['complex tasks', 'highest quality', 'research'],
        released: '2024-02',
      },
    ],

    // vLLM Models (example configurations)
    [
      'meta-llama/Llama-3.2-3B-Instruct',
      {
        provider: 'vllm',
        modelId: 'meta-llama/Llama-3.2-3B-Instruct',
        displayName: 'Llama 3.2 3B Instruct',
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: {
          chat: true,
          embeddings: true,
          transcription: false,
          vision: false,
          streaming: true,
          functions: false,
        },
        pricing: {
          inputPer1kTokens: 0,
          outputPer1kTokens: 0,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'very-fast',
          quality: 'good',
          costEfficiency: 'very-high',
        },
        bestFor: ['local deployment', 'cost savings', 'data privacy'],
        released: '2024-09',
      },
    ],
    [
      'meta-llama/Llama-3.1-8B-Instruct',
      {
        provider: 'vllm',
        modelId: 'meta-llama/Llama-3.1-8B-Instruct',
        displayName: 'Llama 3.1 8B Instruct',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: {
          chat: true,
          embeddings: true,
          transcription: false,
          vision: false,
          streaming: true,
          functions: false,
        },
        pricing: {
          inputPer1kTokens: 0,
          outputPer1kTokens: 0,
          currency: 'USD',
        },
        performanceCharacteristics: {
          speed: 'fast',
          quality: 'excellent',
          costEfficiency: 'very-high',
        },
        bestFor: ['local deployment', 'long context', 'data privacy'],
        released: '2024-07',
      },
    ],

    // Ollama Models
    [
      'llama3.2:3b',
      {
        provider: 'ollama',
        modelId: 'llama3.2:3b',
        displayName: 'Llama 3.2 3B (Ollama)',
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: false,
          streaming: true,
          functions: false,
        },
        performanceCharacteristics: {
          speed: 'very-fast',
          quality: 'good',
          costEfficiency: 'very-high',
        },
        bestFor: ['local deployment', 'quick responses', 'prototyping'],
        released: '2024-09',
      },
    ],
    [
      'llama3.1:8b',
      {
        provider: 'ollama',
        modelId: 'llama3.1:8b',
        displayName: 'Llama 3.1 8B (Ollama)',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: false,
          streaming: true,
          functions: false,
        },
        performanceCharacteristics: {
          speed: 'fast',
          quality: 'excellent',
          costEfficiency: 'very-high',
        },
        bestFor: ['local deployment', 'data privacy', 'offline usage'],
        released: '2024-07',
      },
    ],
    [
      'nomic-embed-text',
      {
        provider: 'ollama',
        modelId: 'nomic-embed-text',
        displayName: 'Nomic Embed Text',
        contextWindow: 8192,
        maxOutputTokens: 0,
        capabilities: {
          chat: false,
          embeddings: true,
          transcription: false,
          vision: false,
          streaming: false,
          functions: false,
        },
        performanceCharacteristics: {
          speed: 'fast',
          quality: 'good',
          costEfficiency: 'very-high',
        },
        bestFor: ['local embeddings', 'semantic search', 'data privacy'],
        released: '2024-02',
      },
    ],

    // LM Studio (generic entry)
    [
      'local-model',
      {
        provider: 'lmstudio',
        modelId: 'local-model',
        displayName: 'LM Studio Local Model',
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: {
          chat: true,
          embeddings: false,
          transcription: false,
          vision: false,
          streaming: true,
          functions: false,
        },
        performanceCharacteristics: {
          speed: 'medium',
          quality: 'good',
          costEfficiency: 'very-high',
        },
        bestFor: ['local deployment', 'data privacy', 'custom models'],
      },
    ],
  ]);

  /**
   * Get model information by ID
   */
  static getModel(modelId: string): ModelInfo | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models for a provider
   */
  static getModelsByProvider(provider: AIProviderType): ModelInfo[] {
    return Array.from(this.models.values()).filter(m => m.provider === provider);
  }

  /**
   * Get models by capability
   */
  static getModelsByCapability(capability: keyof ProviderCapabilities): ModelInfo[] {
    return Array.from(this.models.values()).filter(m => m.capabilities[capability]);
  }

  /**
   * Get all registered models
   */
  static getAllModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Register a new model
   */
  static registerModel(modelInfo: ModelInfo): void {
    this.models.set(modelInfo.modelId, modelInfo);
  }

  /**
   * Check if model exists
   */
  static hasModel(modelId: string): boolean {
    return this.models.has(modelId);
  }

  /**
   * Get recommended model for task
   */
  static getRecommendedModel(criteria: {
    provider?: AIProviderType;
    capability?: keyof ProviderCapabilities;
    prioritize?: 'speed' | 'quality' | 'cost';
    maxCostPer1kTokens?: number;
  }): ModelInfo | null {
    let candidates = Array.from(this.models.values());

    // Filter by provider
    if (criteria.provider) {
      candidates = candidates.filter(m => m.provider === criteria.provider);
    }

    // Filter by capability
    if (criteria.capability) {
      candidates = candidates.filter(m => m.capabilities[criteria.capability]);
    }

    // Filter by cost
    if (criteria.maxCostPer1kTokens !== undefined) {
      candidates = candidates.filter(
        m =>
          !m.pricing ||
          (m.pricing.inputPer1kTokens + m.pricing.outputPer1kTokens) / 2 <=
            criteria.maxCostPer1kTokens!
      );
    }

    if (candidates.length === 0) return null;

    // Sort by priority
    switch (criteria.prioritize) {
      case 'speed':
        candidates.sort((a, b) => {
          const speedOrder = { 'very-fast': 0, fast: 1, medium: 2, slow: 3 };
          return (
            speedOrder[a.performanceCharacteristics.speed] -
            speedOrder[b.performanceCharacteristics.speed]
          );
        });
        break;

      case 'quality':
        candidates.sort((a, b) => {
          const qualityOrder = { superior: 0, excellent: 1, good: 2, basic: 3 };
          return (
            qualityOrder[a.performanceCharacteristics.quality] -
            qualityOrder[b.performanceCharacteristics.quality]
          );
        });
        break;

      case 'cost':
        candidates.sort((a, b) => {
          const costOrder = { 'very-high': 0, high: 1, medium: 2, low: 3 };
          return (
            costOrder[a.performanceCharacteristics.costEfficiency] -
            costOrder[b.performanceCharacteristics.costEfficiency]
          );
        });
        break;

      default:
        // Default: balance of quality and cost
        candidates.sort((a, b) => {
          const scoreA = this.calculateModelScore(a);
          const scoreB = this.calculateModelScore(b);
          return scoreB - scoreA;
        });
    }

    return candidates[0];
  }

  /**
   * Calculate overall model score
   */
  private static calculateModelScore(model: ModelInfo): number {
    const qualityScore = { superior: 4, excellent: 3, good: 2, basic: 1 };
    const speedScore = { 'very-fast': 4, fast: 3, medium: 2, slow: 1 };
    const costScore = { 'very-high': 4, high: 3, medium: 2, low: 1 };

    return (
      qualityScore[model.performanceCharacteristics.quality] * 0.4 +
      speedScore[model.performanceCharacteristics.speed] * 0.3 +
      costScore[model.performanceCharacteristics.costEfficiency] * 0.3
    );
  }

  /**
   * Get pricing estimate for tokens
   */
  static estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number | null {
    const model = this.getModel(modelId);
    if (!model?.pricing) return null;

    const inputCost = (inputTokens / 1000) * model.pricing.inputPer1kTokens;
    const outputCost = (outputTokens / 1000) * model.pricing.outputPer1kTokens;

    return inputCost + outputCost;
  }

  /**
   * Compare models
   */
  static compareModels(modelId1: string, modelId2: string): {
    model1: ModelInfo;
    model2: ModelInfo;
    comparison: {
      contextWindow: string;
      speed: string;
      quality: string;
      cost: string;
    };
  } | null {
    const model1 = this.getModel(modelId1);
    const model2 = this.getModel(modelId2);

    if (!model1 || !model2) return null;

    return {
      model1,
      model2,
      comparison: {
        contextWindow:
          model1.contextWindow > model2.contextWindow
            ? `${modelId1} is larger`
            : model1.contextWindow < model2.contextWindow
            ? `${modelId2} is larger`
            : 'Equal',
        speed:
          this.calculateModelScore(model1) > this.calculateModelScore(model2)
            ? `${modelId1} is faster`
            : 'Equal or similar',
        quality:
          model1.performanceCharacteristics.quality ===
          model2.performanceCharacteristics.quality
            ? 'Equal'
            : `${modelId1} may be higher quality`,
        cost:
          model1.performanceCharacteristics.costEfficiency ===
          model2.performanceCharacteristics.costEfficiency
            ? 'Similar cost efficiency'
            : `Different cost profiles`,
      },
    };
  }
}
