"""
Anthropic Provider Implementation
Supports: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
import anthropic
from anthropic import Anthropic, AsyncAnthropic
import os
import time

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

logger = logging.getLogger(__name__)


class AnthropicProvider(AIProvider):
    """Anthropic (Claude) API provider implementation"""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

        # Initialize Anthropic clients
        api_key = config.api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key not provided")

        self.client = Anthropic(
            api_key=api_key,
            base_url=config.api_base,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )

        self.async_client = AsyncAnthropic(
            api_key=api_key,
            base_url=config.api_base,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )

        # Model registry
        self.models = {
            "claude-3-5-sonnet": ModelInfo(
                model_id="claude-3-5-sonnet-20241022",
                name="Claude 3.5 Sonnet",
                provider=ProviderType.ANTHROPIC,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION, ModelCapability.VISION],
                context_window=200000,
                max_output_tokens=8192,
                cost_per_1k_input=0.003,
                cost_per_1k_output=0.015,
                supports_streaming=True,
                supports_function_calling=True,
                description="Most intelligent model, best for complex tasks",
            ),
            "claude-3-opus": ModelInfo(
                model_id="claude-3-opus-20240229",
                name="Claude 3 Opus",
                provider=ProviderType.ANTHROPIC,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION, ModelCapability.VISION],
                context_window=200000,
                max_output_tokens=4096,
                cost_per_1k_input=0.015,
                cost_per_1k_output=0.075,
                supports_streaming=True,
                supports_function_calling=True,
                description="Top-level performance on highly complex tasks",
            ),
            "claude-3-sonnet": ModelInfo(
                model_id="claude-3-sonnet-20240229",
                name="Claude 3 Sonnet",
                provider=ProviderType.ANTHROPIC,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION, ModelCapability.VISION],
                context_window=200000,
                max_output_tokens=4096,
                cost_per_1k_input=0.003,
                cost_per_1k_output=0.015,
                supports_streaming=True,
                supports_function_calling=True,
                description="Balance of intelligence and speed",
            ),
            "claude-3-haiku": ModelInfo(
                model_id="claude-3-haiku-20240307",
                name="Claude 3 Haiku",
                provider=ProviderType.ANTHROPIC,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION, ModelCapability.VISION],
                context_window=200000,
                max_output_tokens=4096,
                cost_per_1k_input=0.00025,
                cost_per_1k_output=0.00125,
                supports_streaming=True,
                supports_function_calling=True,
                description="Fastest and most compact model",
            ),
        }

        logger.info(f"✅ Anthropic Provider initialized ({len(self.models)} models)")

    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """Anthropic doesn't support transcription"""
        raise NotImplementedError("Anthropic doesn't provide transcription. Use OpenAI or Local provider.")

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate chat completion with Claude"""
        try:
            model = request.model or "claude-3-5-sonnet-20241022"

            # Convert messages (Claude format different from OpenAI)
            system_messages = [msg.content for msg in request.messages if msg.role == "system"]
            system = "\n\n".join(system_messages) if system_messages else None

            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
                if msg.role in ["user", "assistant"]
            ]

            response = await self.async_client.messages.create(
                model=model,
                system=system,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens or 4096,
                top_p=request.top_p,
                stop_sequences=request.stop,
                stream=False,
            )

            return ChatResponse(
                content=response.content[0].text,
                model=response.model,
                provider="anthropic",
                finish_reason=response.stop_reason,
                usage={
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
                },
            )

        except Exception as e:
            logger.error(f"Anthropic chat completion failed: {e}")
            raise

    async def chat_completion_stream(self, request: ChatRequest) -> AsyncIterator[str]:
        """Generate streaming chat completion"""
        try:
            model = request.model or "claude-3-5-sonnet-20241022"

            system_messages = [msg.content for msg in request.messages if msg.role == "system"]
            system = "\n\n".join(system_messages) if system_messages else None

            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
                if msg.role in ["user", "assistant"]
            ]

            async with self.async_client.messages.stream(
                model=model,
                system=system,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens or 4096,
                top_p=request.top_p,
            ) as stream:
                async for text in stream.text_stream:
                    yield text

        except Exception as e:
            logger.error(f"Anthropic streaming failed: {e}")
            raise

    async def generate_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Anthropic doesn't support embeddings"""
        raise NotImplementedError("Anthropic doesn't provide embeddings. Use OpenAI or Local provider.")

    async def vision_completion(self, request: VisionRequest) -> VisionResponse:
        """Process vision request with Claude"""
        try:
            model = request.model or "claude-3-5-sonnet-20241022"

            # Read image and encode to base64
            import base64
            with open(request.image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")

            # Detect media type
            import mimetypes
            media_type = mimetypes.guess_type(request.image_path)[0] or "image/jpeg"

            response = await self.async_client.messages.create(
                model=model,
                max_tokens=request.max_tokens or 1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data,
                                },
                            },
                            {
                                "type": "text",
                                "text": request.prompt,
                            },
                        ],
                    }
                ],
            )

            return VisionResponse(
                content=response.content[0].text,
                model=response.model,
                provider="anthropic",
            )

        except Exception as e:
            logger.error(f"Anthropic vision failed: {e}")
            raise

    def list_models(self) -> List[ModelInfo]:
        """List available models"""
        return list(self.models.values())

    async def health_check(self) -> bool:
        """Check Anthropic API health"""
        try:
            # Simple test request
            await self.async_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}],
            )
            return True
        except Exception as e:
            logger.warning(f"Anthropic health check failed: {e}")
            return False

    def get_capabilities(self) -> List[ModelCapability]:
        """Get provider capabilities"""
        return [
            ModelCapability.CHAT,
            ModelCapability.TEXT_GENERATION,
            ModelCapability.VISION,
        ]

    async def estimate_cost(
        self,
        request: Union[ChatRequest, TranscriptionRequest],
        model: Optional[str] = None
    ) -> Dict[str, float]:
        """Estimate cost for request"""
        if isinstance(request, ChatRequest):
            model_id = model or request.model or "claude-3-5-sonnet-20241022"
            model_info = self.models.get(model_id.split("/")[-1])

            if not model_info:
                return {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}

            # Token estimation
            total_chars = sum(len(msg.content) for msg in request.messages)
            estimated_input_tokens = total_chars // 4
            estimated_output_tokens = request.max_tokens or 1000

            input_cost = (estimated_input_tokens / 1000) * model_info.cost_per_1k_input
            output_cost = (estimated_output_tokens / 1000) * model_info.cost_per_1k_output
            total_cost = input_cost + output_cost

            return {
                "input_cost": round(input_cost, 6),
                "output_cost": round(output_cost, 6),
                "total_cost": round(total_cost, 6),
                "estimated_input_tokens": estimated_input_tokens,
                "estimated_output_tokens": estimated_output_tokens,
            }

        return {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}
