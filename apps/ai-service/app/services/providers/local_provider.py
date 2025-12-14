"""
Local Model Provider Implementation
Supports: Local Whisper, Llama, Gemma, Qwen, Vision models from HuggingFace
Zero API costs, full privacy, offline capability
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
import os
import time
import torch

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


class LocalProvider(AIProvider):
    """Local model provider using HuggingFace models"""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

        # Import local services
        from ..local_whisper import get_local_whisper, is_available as whisper_available
        from ..huggingface_manager import get_hf_manager

        self.hf_manager = get_hf_manager(token=config.api_key or os.getenv("HUGGINGFACE_TOKEN"))
        self.whisper_service = None
        self.whisper_available = whisper_available()

        # Currently loaded LLM
        self.current_llm = None
        self.current_llm_tokenizer = None
        self.current_llm_name = None

        # Model registry
        self.models = {
            # Whisper models
            "whisper-large-v3": ModelInfo(
                model_id="whisper-large-v3",
                name="Whisper Large V3 (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.TRANSCRIPTION],
                context_window=0,
                max_output_tokens=0,
                cost_per_1k_input=0.0,  # FREE!
                cost_per_1k_output=0.0,
                supports_streaming=False,
                description="Best accuracy, 3GB, 5x faster than OpenAI API",
            ),
            "whisper-medium": ModelInfo(
                model_id="whisper-medium",
                name="Whisper Medium (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.TRANSCRIPTION],
                context_window=0,
                max_output_tokens=0,
                cost_per_1k_input=0.0,
                cost_per_1k_output=0.0,
                supports_streaming=False,
                description="Balanced, 1.5GB",
            ),

            # LLMs for chat/summarization
            "llama-3.1-8b": ModelInfo(
                model_id="meta-llama/Meta-Llama-3.1-8B-Instruct",
                name="Llama 3.1 8B (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION],
                context_window=128000,
                max_output_tokens=4096,
                cost_per_1k_input=0.0,  # FREE!
                cost_per_1k_output=0.0,
                supports_streaming=True,
                description="Meta's best 8B model, excellent quality",
            ),
            "qwen2.5-7b": ModelInfo(
                model_id="Qwen/Qwen2.5-7B-Instruct",
                name="Qwen 2.5 7B (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION],
                context_window=32768,
                max_output_tokens=4096,
                cost_per_1k_input=0.0,
                cost_per_1k_output=0.0,
                supports_streaming=True,
                description="Alibaba's model, great for code and reasoning",
            ),
            "gemma-2-9b": ModelInfo(
                model_id="google/gemma-2-9b-it",
                name="Gemma 2 9B (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION],
                context_window=8192,
                max_output_tokens=4096,
                cost_per_1k_input=0.0,
                cost_per_1k_output=0.0,
                supports_streaming=True,
                description="Google's latest, very capable",
            ),
            "phi-3.5-mini": ModelInfo(
                model_id="microsoft/Phi-3.5-mini-instruct",
                name="Phi 3.5 Mini (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.CHAT, ModelCapability.TEXT_GENERATION],
                context_window=128000,
                max_output_tokens=4096,
                cost_per_1k_input=0.0,
                cost_per_1k_output=0.0,
                supports_streaming=True,
                description="Microsoft's lightweight model, fast and efficient",
            ),

            # Vision models
            "moondream2": ModelInfo(
                model_id="vikhyatk/moondream2",
                name="Moondream 2 (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.VISION],
                context_window=2048,
                max_output_tokens=512,
                cost_per_1k_input=0.0,
                cost_per_1k_output=0.0,
                supports_streaming=False,
                description="Fast vision model, 3.7GB",
            ),

            # Embeddings
            "bge-large-en-v1.5": ModelInfo(
                model_id="BAAI/bge-large-en-v1.5",
                name="BGE Large EN (Local)",
                provider=ProviderType.LOCAL,
                capabilities=[ModelCapability.EMBEDDING],
                context_window=512,
                max_output_tokens=0,
                cost_per_1k_input=0.0,
                cost_per_1k_output=0.0,
                supports_streaming=False,
                description="Best English embeddings, 1.3GB",
            ),
        }

        logger.info(f"✅ Local Provider initialized ({len(self.models)} models, whisper={self.whisper_available})")

    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """Transcribe audio using local Whisper"""
        try:
            if not self.whisper_available:
                raise RuntimeError("Local Whisper not available. Install with: pip install faster-whisper")

            start_time = time.time()

            # Initialize Whisper service if needed
            if self.whisper_service is None:
                from ..local_whisper import get_local_whisper
                model_size = "large-v3"  # Can be configured
                self.whisper_service = get_local_whisper(model_size=model_size)

            # Run transcription in thread pool (blocking operation)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.whisper_service.transcribe(
                    audio_path=request.audio_path,
                    language=request.language,
                    word_timestamps=request.enable_timestamps,
                    vad_filter=True,
                )
            )

            return TranscriptionResponse(
                text=result.text,
                segments=[
                    {
                        "id": seg.id,
                        "start": seg.start,
                        "end": seg.end,
                        "text": seg.text,
                        "confidence": seg.confidence,
                        "speaker": seg.speaker,
                    }
                    for seg in result.segments
                ],
                language=result.language,
                duration=result.duration,
                confidence=sum(seg.confidence for seg in result.segments) / len(result.segments) if result.segments else 0.9,
                provider="local",
                model=result.model,
                processing_time=result.processing_time,
            )

        except Exception as e:
            logger.error(f"Local transcription failed: {e}")
            raise

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate chat completion with local LLM"""
        try:
            start_time = time.time()

            # Load model if not already loaded
            model_id = request.model or "llama-3.1-8b"
            await self._ensure_llm_loaded(model_id)

            # Build prompt from messages
            prompt = self._build_prompt(request.messages, model_id)

            # Generate response in thread pool
            loop = asyncio.get_event_loop()
            response_text = await loop.run_in_executor(
                None,
                lambda: self._generate_text(prompt, request)
            )

            processing_time = time.time() - start_time

            # Estimate tokens (rough)
            input_tokens = len(prompt.split())
            output_tokens = len(response_text.split())

            return ChatResponse(
                content=response_text,
                model=model_id,
                provider="local",
                finish_reason="stop",
                usage={
                    "prompt_tokens": input_tokens,
                    "completion_tokens": output_tokens,
                    "total_tokens": input_tokens + output_tokens,
                },
            )

        except Exception as e:
            logger.error(f"Local chat completion failed: {e}")
            raise

    async def chat_completion_stream(self, request: ChatRequest) -> AsyncIterator[str]:
        """Generate streaming chat completion"""
        try:
            model_id = request.model or "llama-3.1-8b"
            await self._ensure_llm_loaded(model_id)

            prompt = self._build_prompt(request.messages, model_id)

            # Generate with streaming
            inputs = self.current_llm_tokenizer(prompt, return_tensors="pt").to(self.current_llm.device)

            from transformers import TextIteratorStreamer
            from threading import Thread

            streamer = TextIteratorStreamer(self.current_llm_tokenizer, skip_special_tokens=True)

            generation_kwargs = dict(
                inputs,
                streamer=streamer,
                max_new_tokens=request.max_tokens or 1000,
                temperature=request.temperature,
                top_p=request.top_p,
                do_sample=True if request.temperature > 0 else False,
            )

            thread = Thread(target=self.current_llm.generate, kwargs=generation_kwargs)
            thread.start()

            for text in streamer:
                yield text

            thread.join()

        except Exception as e:
            logger.error(f"Local streaming failed: {e}")
            raise

    async def generate_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings with local model"""
        try:
            from sentence_transformers import SentenceTransformer

            model_id = request.model or "bge-large-en-v1.5"
            model_info = self.models.get(model_id)

            if not model_info:
                raise ValueError(f"Unknown embedding model: {model_id}")

            # Load embedding model
            loop = asyncio.get_event_loop()
            model = await loop.run_in_executor(
                None,
                lambda: SentenceTransformer(model_info.model_id)
            )

            # Generate embeddings
            input_texts = [request.input] if isinstance(request.input, str) else request.input
            embeddings = await loop.run_in_executor(
                None,
                lambda: model.encode(input_texts, convert_to_numpy=True).tolist()
            )

            return EmbeddingResponse(
                embeddings=embeddings,
                model=model_id,
                provider="local",
                usage={
                    "prompt_tokens": sum(len(text.split()) for text in input_texts),
                    "total_tokens": sum(len(text.split()) for text in input_texts),
                },
            )

        except Exception as e:
            logger.error(f"Local embedding failed: {e}")
            raise

    async def vision_completion(self, request: VisionRequest) -> VisionResponse:
        """Process vision request with local vision model"""
        try:
            # TODO: Implement local vision models (LLaVA, Moondream)
            raise NotImplementedError("Local vision models not yet implemented")

        except Exception as e:
            logger.error(f"Local vision failed: {e}")
            raise

    def list_models(self) -> List[ModelInfo]:
        """List available models"""
        return list(self.models.values())

    async def health_check(self) -> bool:
        """Check local provider health"""
        try:
            # Check if we have GPU available
            cuda_available = torch.cuda.is_available()
            logger.info(f"Local provider health: CUDA={cuda_available}")
            return True
        except Exception as e:
            logger.warning(f"Local health check failed: {e}")
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
        """Local models are free!"""
        return {
            "input_cost": 0.0,
            "output_cost": 0.0,
            "total_cost": 0.0,
            "note": "Local models have zero API costs 🎉",
        }

    # Private helper methods

    async def _ensure_llm_loaded(self, model_id: str):
        """Ensure LLM is loaded"""
        if self.current_llm_name == model_id:
            return  # Already loaded

        logger.info(f"🔄 Loading local LLM: {model_id}")

        model_info = self.models.get(model_id)
        if not model_info:
            raise ValueError(f"Unknown model: {model_id}")

        # Load in thread pool (blocking operation)
        loop = asyncio.get_event_loop()
        model, tokenizer = await loop.run_in_executor(
            None,
            lambda: self.hf_manager.load_llm(
                model_name=model_id,
                device="auto",
                quantization="4bit",  # Use 4-bit quantization to save VRAM
            )
        )

        self.current_llm = model
        self.current_llm_tokenizer = tokenizer
        self.current_llm_name = model_id

        logger.info(f"✅ Local LLM loaded: {model_id}")

    def _build_prompt(self, messages: List[ChatMessage], model_id: str) -> str:
        """Build prompt from messages based on model format"""
        # Llama 3.1 format
        if "llama" in model_id.lower():
            prompt_parts = []
            for msg in messages:
                if msg.role == "system":
                    prompt_parts.append(f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n{msg.content}<|eot_id|>")
                elif msg.role == "user":
                    prompt_parts.append(f"<|start_header_id|>user<|end_header_id|>\n{msg.content}<|eot_id|>")
                elif msg.role == "assistant":
                    prompt_parts.append(f"<|start_header_id|>assistant<|end_header_id|>\n{msg.content}<|eot_id|>")
            prompt_parts.append("<|start_header_id|>assistant<|end_header_id|>")
            return "".join(prompt_parts)

        # Default format (for Qwen, Gemma, Phi)
        else:
            prompt_parts = []
            for msg in messages:
                if msg.role == "system":
                    prompt_parts.append(f"System: {msg.content}\n\n")
                elif msg.role == "user":
                    prompt_parts.append(f"User: {msg.content}\n\n")
                elif msg.role == "assistant":
                    prompt_parts.append(f"Assistant: {msg.content}\n\n")
            prompt_parts.append("Assistant: ")
            return "".join(prompt_parts)

    def _generate_text(self, prompt: str, request: ChatRequest) -> str:
        """Generate text (blocking, run in executor)"""
        inputs = self.current_llm_tokenizer(prompt, return_tensors="pt").to(self.current_llm.device)

        outputs = self.current_llm.generate(
            **inputs,
            max_new_tokens=request.max_tokens or 1000,
            temperature=request.temperature,
            top_p=request.top_p,
            do_sample=True if request.temperature > 0 else False,
            pad_token_id=self.current_llm_tokenizer.eos_token_id,
        )

        response = self.current_llm_tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        return response.strip()
