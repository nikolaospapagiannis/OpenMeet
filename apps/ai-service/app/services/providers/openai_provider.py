"""
OpenAI Provider Implementation
Supports: GPT-4, GPT-3.5, Whisper, DALL-E, Embeddings
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
import openai
from openai import OpenAI, AsyncOpenAI
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


class OpenAIProvider(AIProvider):
    """OpenAI API provider implementation"""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

        # Initialize OpenAI clients
        api_key = config.api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not provided")

        self.client = OpenAI(
            api_key=api_key,
            organization=config.organization,
            base_url=config.api_base,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )

        self.async_client = AsyncOpenAI(
            api_key=api_key,
            organization=config.organization,
            base_url=config.api_base,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )

        # Model registry
        self.models = {
            "gpt-4-turbo": ModelInfo(
                model_id="gpt-4-turbo-preview",
                name="GPT-4 Turbo",
                provider=ProviderType.OPENAI,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION],
                context_window=128000,
                max_output_tokens=4096,
                cost_per_1k_input=0.01,
                cost_per_1k_output=0.03,
                supports_streaming=True,
                supports_function_calling=True,
            ),
            "gpt-4": ModelInfo(
                model_id="gpt-4",
                name="GPT-4",
                provider=ProviderType.OPENAI,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION],
                context_window=8192,
                max_output_tokens=4096,
                cost_per_1k_input=0.03,
                cost_per_1k_output=0.06,
                supports_streaming=True,
                supports_function_calling=True,
            ),
            "gpt-3.5-turbo": ModelInfo(
                model_id="gpt-3.5-turbo",
                name="GPT-3.5 Turbo",
                provider=ProviderType.OPENAI,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION],
                context_window=16385,
                max_output_tokens=4096,
                cost_per_1k_input=0.0005,
                cost_per_1k_output=0.0015,
                supports_streaming=True,
                supports_function_calling=True,
            ),
            "whisper-1": ModelInfo(
                model_id="whisper-1",
                name="Whisper",
                provider=ProviderType.OPENAI,
                capabilities=[ModelCapability.TRANSCRIPTION],
                context_window=0,
                max_output_tokens=0,
                cost_per_1k_input=0.006,  # per minute
                cost_per_1k_output=0.0,
                supports_streaming=False,
            ),
            "text-embedding-3-large": ModelInfo(
                model_id="text-embedding-3-large",
                name="Text Embedding 3 Large",
                provider=ProviderType.OPENAI,
                capabilities=[ModelCapability.EMBEDDING],
                context_window=8191,
                max_output_tokens=0,
                cost_per_1k_input=0.00013,
                cost_per_1k_output=0.0,
                supports_streaming=False,
            ),
        }

        logger.info(f"✅ OpenAI Provider initialized ({len(self.models)} models)")

    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """Transcribe audio using OpenAI Whisper"""
        try:
            start_time = time.time()

            with open(request.audio_path, "rb") as audio_file:
                response = await self.async_client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-1",
                    language=request.language,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"] if request.enable_timestamps else None,
                )

            processing_time = time.time() - start_time

            # Convert segments
            segments = []
            if hasattr(response, "segments") and response.segments:
                segments = [
                    {
                        "id": i,
                        "start": seg.get("start", 0.0),
                        "end": seg.get("end", 0.0),
                        "text": seg.get("text", ""),
                        "confidence": 0.9,  # OpenAI doesn't provide confidence
                    }
                    for i, seg in enumerate(response.segments)
                ]

            return TranscriptionResponse(
                text=response.text,
                segments=segments,
                language=response.language if hasattr(response, "language") else request.language or "en",
                duration=response.duration if hasattr(response, "duration") else 0.0,
                confidence=0.9,
                provider="openai",
                model="whisper-1",
                processing_time=processing_time,
            )

        except Exception as e:
            logger.error(f"OpenAI transcription failed: {e}")
            raise

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate chat completion"""
        try:
            model = request.model or "gpt-4-turbo-preview"

            # Convert messages
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]

            response = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                frequency_penalty=request.frequency_penalty,
                presence_penalty=request.presence_penalty,
                stop=request.stop,
                stream=False,
                functions=request.functions,
            )

            choice = response.choices[0]

            return ChatResponse(
                content=choice.message.content or "",
                model=response.model,
                provider="openai",
                finish_reason=choice.finish_reason,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
                function_call=choice.message.function_call.__dict__ if choice.message.function_call else None,
            )

        except Exception as e:
            logger.error(f"OpenAI chat completion failed: {e}")
            raise

    async def chat_completion_stream(self, request: ChatRequest) -> AsyncIterator[str]:
        """Generate streaming chat completion"""
        try:
            model = request.model or "gpt-4-turbo-preview"

            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]

            stream = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"OpenAI streaming failed: {e}")
            raise

    async def generate_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings"""
        try:
            model = request.model or "text-embedding-3-large"

            # Handle single string or list
            input_texts = [request.input] if isinstance(request.input, str) else request.input

            response = await self.async_client.embeddings.create(
                model=model,
                input=input_texts,
            )

            embeddings = [item.embedding for item in response.data]

            return EmbeddingResponse(
                embeddings=embeddings,
                model=response.model,
                provider="openai",
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
            )

        except Exception as e:
            logger.error(f"OpenAI embedding failed: {e}")
            raise

    async def vision_completion(self, request: VisionRequest) -> VisionResponse:
        """Process vision request with GPT-4 Vision"""
        try:
            # TODO: Implement GPT-4 Vision support
            raise NotImplementedError("GPT-4 Vision not yet implemented")

        except Exception as e:
            logger.error(f"OpenAI vision failed: {e}")
            raise

    def list_models(self) -> List[ModelInfo]:
        """List available models"""
        return list(self.models.values())

    async def health_check(self) -> bool:
        """Check OpenAI API health"""
        try:
            # Simple test request
            await self.async_client.models.list()
            return True
        except Exception as e:
            logger.warning(f"OpenAI health check failed: {e}")
            return False

    def get_capabilities(self) -> List[ModelCapability]:
        """Get provider capabilities"""
        return [
            ModelCapability.CHAT,
            ModelCapability.TEXT_GENERATION,
            ModelCapability.TRANSCRIPTION,
            ModelCapability.EMBEDDING,
            ModelCapability.VISION,
        ]

    async def estimate_cost(
        self,
        request: Union[ChatRequest, TranscriptionRequest],
        model: Optional[str] = None
    ) -> Dict[str, float]:
        """Estimate cost for request"""
        if isinstance(request, ChatRequest):
            model_id = model or request.model or "gpt-4-turbo-preview"
            model_info = self.models.get(model_id.split("/")[-1])

            if not model_info:
                return {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}

            # Rough token estimation (4 chars ≈ 1 token)
            total_chars = sum(len(msg.content) for msg in request.messages)
            estimated_input_tokens = total_chars // 4
            estimated_output_tokens = request.max_tokens or 500

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

        elif isinstance(request, TranscriptionRequest):
            # Whisper costs $0.006 per minute
            # Estimate duration from file size (rough: 1MB ≈ 1 minute)
            import os
            file_size_mb = os.path.getsize(request.audio_path) / (1024 * 1024)
            estimated_minutes = max(1, file_size_mb)
            total_cost = estimated_minutes * 0.006

            return {
                "input_cost": round(total_cost, 6),
                "output_cost": 0.0,
                "total_cost": round(total_cost, 6),
                "estimated_minutes": estimated_minutes,
            }

        return {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}
