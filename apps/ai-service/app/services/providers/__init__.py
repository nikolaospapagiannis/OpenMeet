"""
AI Provider Abstraction Layer
Unified interface for OpenAI, Anthropic, Local models, and more
"""

from .base_provider import (
    AIProvider,
    ProviderType,
    ProviderConfig,
    ModelCapability,
    ModelInfo,
    TranscriptionRequest,
    TranscriptionResponse,
    ChatRequest,
    ChatResponse,
    ChatMessage,
    EmbeddingRequest,
    EmbeddingResponse,
    VisionRequest,
    VisionResponse,
)

from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .local_provider import LocalProvider
from .provider_manager import (
    ProviderManager,
    ProviderStrategy,
    get_provider_manager,
    initialize_providers,
)

__all__ = [
    # Base classes
    "AIProvider",
    "ProviderType",
    "ProviderConfig",
    "ModelCapability",
    "ModelInfo",

    # Request/Response models
    "TranscriptionRequest",
    "TranscriptionResponse",
    "ChatRequest",
    "ChatResponse",
    "ChatMessage",
    "EmbeddingRequest",
    "EmbeddingResponse",
    "VisionRequest",
    "VisionResponse",

    # Provider implementations
    "OpenAIProvider",
    "AnthropicProvider",
    "LocalProvider",

    # Provider manager
    "ProviderManager",
    "ProviderStrategy",
    "get_provider_manager",
    "initialize_providers",
]
