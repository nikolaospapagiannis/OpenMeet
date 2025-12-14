"""
Provider Manager
Central service for managing AI providers with fallback support
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Union
from enum import Enum

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
    EmbeddingRequest,
    EmbeddingResponse,
    VisionRequest,
    VisionResponse,
)
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .local_provider import LocalProvider

logger = logging.getLogger(__name__)


class ProviderStrategy(str, Enum):
    """Provider selection strategy"""
    PRIORITY = "priority"  # Use provider with highest priority
    COST_OPTIMIZED = "cost_optimized"  # Use cheapest provider
    FASTEST = "fastest"  # Use fastest provider
    FALLBACK = "fallback"  # Try primary, fallback to others on failure


class ProviderManager:
    """
    Manages multiple AI providers with intelligent routing and fallbacks
    """

    def __init__(self):
        self.providers: Dict[ProviderType, AIProvider] = {}
        self.strategy = ProviderStrategy.FALLBACK
        self.default_providers: Dict[ModelCapability, ProviderType] = {}

        logger.info("🚀 Provider Manager initialized")

    def register_provider(self, provider_type: ProviderType, config: ProviderConfig):
        """Register a new provider"""
        try:
            if provider_type == ProviderType.OPENAI:
                provider = OpenAIProvider(config)
            elif provider_type == ProviderType.ANTHROPIC:
                provider = AnthropicProvider(config)
            elif provider_type == ProviderType.LOCAL:
                provider = LocalProvider(config)
            else:
                raise ValueError(f"Unsupported provider type: {provider_type}")

            self.providers[provider_type] = provider
            logger.info(f"✅ Registered provider: {provider_type.value} (priority={config.priority})")

        except Exception as e:
            logger.error(f"❌ Failed to register provider {provider_type}: {e}")
            raise

    def unregister_provider(self, provider_type: ProviderType):
        """Unregister a provider"""
        if provider_type in self.providers:
            del self.providers[provider_type]
            logger.info(f"🗑️ Unregistered provider: {provider_type.value}")

    def set_default_provider(self, capability: ModelCapability, provider_type: ProviderType):
        """Set default provider for a capability"""
        if provider_type not in self.providers:
            raise ValueError(f"Provider {provider_type} not registered")

        self.default_providers[capability] = provider_type
        logger.info(f"📌 Set default provider for {capability.value}: {provider_type.value}")

    def set_strategy(self, strategy: ProviderStrategy):
        """Set provider selection strategy"""
        self.strategy = strategy
        logger.info(f"🎯 Provider strategy set to: {strategy.value}")

    def get_providers_for_capability(self, capability: ModelCapability) -> List[AIProvider]:
        """Get all providers that support a capability, sorted by priority"""
        providers = [
            p for p in self.providers.values()
            if p.is_enabled() and p.supports_capability(capability)
        ]
        return sorted(providers, key=lambda p: p.get_priority())

    async def transcribe(
        self,
        request: TranscriptionRequest,
        provider_type: Optional[ProviderType] = None
    ) -> TranscriptionResponse:
        """
        Transcribe audio with automatic provider selection and fallback

        Args:
            request: Transcription request
            provider_type: Specific provider to use (None = auto-select)

        Returns:
            TranscriptionResponse
        """
        try:
            # Get providers for transcription
            if provider_type:
                providers = [self.providers.get(provider_type)]
            else:
                providers = self.get_providers_for_capability(ModelCapability.TRANSCRIPTION)

            if not providers:
                raise RuntimeError("No providers available for transcription")

            # Try providers in order
            last_error = None
            for provider in providers:
                try:
                    logger.info(f"🎤 Transcribing with {provider.provider_type.value}...")
                    result = await provider.transcribe(request)
                    logger.info(f"✅ Transcription successful with {provider.provider_type.value}")
                    return result

                except NotImplementedError:
                    logger.debug(f"Provider {provider.provider_type.value} doesn't support transcription")
                    continue

                except Exception as e:
                    last_error = e
                    logger.warning(f"⚠️ Transcription failed with {provider.provider_type.value}: {e}")

                    if self.strategy != ProviderStrategy.FALLBACK:
                        raise

                    logger.info(f"🔄 Trying next provider...")
                    continue

            raise RuntimeError(f"All providers failed. Last error: {last_error}")

        except Exception as e:
            logger.error(f"❌ Transcription failed: {e}")
            raise

    async def chat_completion(
        self,
        request: ChatRequest,
        provider_type: Optional[ProviderType] = None
    ) -> ChatResponse:
        """Chat completion with automatic provider selection"""
        try:
            if provider_type:
                providers = [self.providers.get(provider_type)]
            else:
                providers = self.get_providers_for_capability(ModelCapability.CHAT)

            if not providers:
                raise RuntimeError("No providers available for chat")

            last_error = None
            for provider in providers:
                try:
                    logger.info(f"💬 Chat with {provider.provider_type.value}...")
                    result = await provider.chat_completion(request)
                    logger.info(f"✅ Chat successful with {provider.provider_type.value}")
                    return result

                except NotImplementedError:
                    continue

                except Exception as e:
                    last_error = e
                    logger.warning(f"⚠️ Chat failed with {provider.provider_type.value}: {e}")

                    if self.strategy != ProviderStrategy.FALLBACK:
                        raise

                    continue

            raise RuntimeError(f"All providers failed. Last error: {last_error}")

        except Exception as e:
            logger.error(f"❌ Chat completion failed: {e}")
            raise

    async def generate_embedding(
        self,
        request: EmbeddingRequest,
        provider_type: Optional[ProviderType] = None
    ) -> EmbeddingResponse:
        """Generate embeddings with automatic provider selection"""
        try:
            if provider_type:
                providers = [self.providers.get(provider_type)]
            else:
                providers = self.get_providers_for_capability(ModelCapability.EMBEDDING)

            if not providers:
                raise RuntimeError("No providers available for embeddings")

            last_error = None
            for provider in providers:
                try:
                    logger.info(f"📊 Embedding with {provider.provider_type.value}...")
                    result = await provider.generate_embedding(request)
                    logger.info(f"✅ Embedding successful with {provider.provider_type.value}")
                    return result

                except NotImplementedError:
                    continue

                except Exception as e:
                    last_error = e
                    logger.warning(f"⚠️ Embedding failed with {provider.provider_type.value}: {e}")

                    if self.strategy != ProviderStrategy.FALLBACK:
                        raise

                    continue

            raise RuntimeError(f"All providers failed. Last error: {last_error}")

        except Exception as e:
            logger.error(f"❌ Embedding generation failed: {e}")
            raise

    async def vision_completion(
        self,
        request: VisionRequest,
        provider_type: Optional[ProviderType] = None
    ) -> VisionResponse:
        """Vision completion with automatic provider selection"""
        try:
            if provider_type:
                providers = [self.providers.get(provider_type)]
            else:
                providers = self.get_providers_for_capability(ModelCapability.VISION)

            if not providers:
                raise RuntimeError("No providers available for vision")

            last_error = None
            for provider in providers:
                try:
                    logger.info(f"👁️ Vision with {provider.provider_type.value}...")
                    result = await provider.vision_completion(request)
                    logger.info(f"✅ Vision successful with {provider.provider_type.value}")
                    return result

                except NotImplementedError:
                    continue

                except Exception as e:
                    last_error = e
                    logger.warning(f"⚠️ Vision failed with {provider.provider_type.value}: {e}")

                    if self.strategy != ProviderStrategy.FALLBACK:
                        raise

                    continue

            raise RuntimeError(f"All providers failed. Last error: {last_error}")

        except Exception as e:
            logger.error(f"❌ Vision completion failed: {e}")
            raise

    async def health_check_all(self) -> Dict[str, bool]:
        """Check health of all providers"""
        results = {}
        for provider_type, provider in self.providers.items():
            try:
                is_healthy = await provider.health_check()
                results[provider_type.value] = is_healthy
            except Exception as e:
                logger.warning(f"Health check failed for {provider_type.value}: {e}")
                results[provider_type.value] = False

        return results

    def list_all_models(self) -> Dict[str, List[ModelInfo]]:
        """List all available models from all providers"""
        models = {}
        for provider_type, provider in self.providers.items():
            try:
                models[provider_type.value] = provider.list_models()
            except Exception as e:
                logger.warning(f"Failed to list models for {provider_type.value}: {e}")
                models[provider_type.value] = []

        return models

    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers"""
        status = {
            "strategy": self.strategy.value,
            "providers": {},
            "default_providers": {k.value: v.value for k, v in self.default_providers.items()},
        }

        for provider_type, provider in self.providers.items():
            status["providers"][provider_type.value] = {
                "enabled": provider.is_enabled(),
                "priority": provider.get_priority(),
                "capabilities": [c.value for c in provider.get_capabilities()],
                "models_count": len(provider.list_models()),
            }

        return status

    async def estimate_cost(
        self,
        request: Union[ChatRequest, TranscriptionRequest],
        provider_type: ProviderType,
        model: Optional[str] = None
    ) -> Dict[str, float]:
        """Estimate cost for a request"""
        if provider_type not in self.providers:
            return {"error": "Provider not registered"}

        provider = self.providers[provider_type]
        return await provider.estimate_cost(request, model)

    async def compare_providers(
        self,
        request: Union[ChatRequest, TranscriptionRequest],
        capability: ModelCapability
    ) -> Dict[str, Any]:
        """Compare costs and capabilities across providers"""
        providers = self.get_providers_for_capability(capability)

        comparison = {
            "providers": [],
            "cheapest": None,
            "most_capable": None,
        }

        for provider in providers:
            try:
                cost = await provider.estimate_cost(request)
                provider_info = {
                    "provider": provider.provider_type.value,
                    "priority": provider.get_priority(),
                    "cost": cost,
                    "models_count": len(provider.list_models()),
                }
                comparison["providers"].append(provider_info)

            except Exception as e:
                logger.warning(f"Failed to get cost for {provider.provider_type.value}: {e}")

        # Find cheapest
        if comparison["providers"]:
            comparison["cheapest"] = min(
                comparison["providers"],
                key=lambda p: p["cost"].get("total_cost", float("inf"))
            )["provider"]

        return comparison


# Singleton instance
_manager_instance: Optional[ProviderManager] = None


def get_provider_manager() -> ProviderManager:
    """Get or create provider manager instance"""
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = ProviderManager()
    return _manager_instance


def initialize_providers(configs: Dict[ProviderType, ProviderConfig]) -> ProviderManager:
    """Initialize provider manager with configs"""
    manager = get_provider_manager()

    for provider_type, config in configs.items():
        if config.enabled:
            try:
                manager.register_provider(provider_type, config)
            except Exception as e:
                logger.error(f"Failed to initialize {provider_type.value}: {e}")

    return manager
