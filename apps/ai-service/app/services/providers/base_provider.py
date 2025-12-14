"""
Base AI Provider Interface
Unified abstraction for all AI providers (OpenAI, Anthropic, Local, etc.)
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncIterator, Union
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Available provider types"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"
    GOOGLE = "google"
    AZURE = "azure"
    CUSTOM = "custom"


class ModelCapability(str, Enum):
    """Model capabilities"""
    TEXT_GENERATION = "text_generation"
    CHAT = "chat"
    TRANSCRIPTION = "transcription"
    VISION = "vision"
    EMBEDDING = "embedding"
    SUMMARIZATION = "summarization"
    SENTIMENT_ANALYSIS = "sentiment_analysis"


@dataclass
class ProviderConfig:
    """Provider configuration"""
    provider_type: ProviderType
    enabled: bool = True
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    organization: Optional[str] = None
    priority: int = 100  # Lower = higher priority
    max_retries: int = 3
    timeout: int = 60
    rate_limit_rpm: Optional[int] = None  # Requests per minute
    custom_config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelInfo:
    """Model information"""
    model_id: str
    name: str
    provider: ProviderType
    capabilities: List[ModelCapability]
    context_window: int
    max_output_tokens: int
    cost_per_1k_input: float  # USD
    cost_per_1k_output: float  # USD
    supports_streaming: bool = False
    supports_function_calling: bool = False
    description: Optional[str] = None


@dataclass
class TranscriptionRequest:
    """Transcription request"""
    audio_path: str
    language: Optional[str] = None
    enable_diarization: bool = False
    enable_timestamps: bool = True
    custom_vocabulary: Optional[List[str]] = None


@dataclass
class TranscriptionResponse:
    """Transcription response"""
    text: str
    segments: List[Dict[str, Any]]
    language: str
    duration: float
    confidence: float
    provider: str
    model: str
    processing_time: float


@dataclass
class ChatMessage:
    """Chat message"""
    role: str  # "system", "user", "assistant"
    content: str
    name: Optional[str] = None
    function_call: Optional[Dict[str, Any]] = None


@dataclass
class ChatRequest:
    """Chat completion request"""
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop: Optional[List[str]] = None
    stream: bool = False
    functions: Optional[List[Dict[str, Any]]] = None


@dataclass
class ChatResponse:
    """Chat completion response"""
    content: str
    model: str
    provider: str
    finish_reason: str
    usage: Dict[str, int]  # prompt_tokens, completion_tokens, total_tokens
    function_call: Optional[Dict[str, Any]] = None


@dataclass
class EmbeddingRequest:
    """Embedding request"""
    input: Union[str, List[str]]
    model: Optional[str] = None


@dataclass
class EmbeddingResponse:
    """Embedding response"""
    embeddings: List[List[float]]
    model: str
    provider: str
    usage: Dict[str, int]


@dataclass
class VisionRequest:
    """Vision/multimodal request"""
    image_path: str
    prompt: str
    model: Optional[str] = None
    max_tokens: Optional[int] = None


@dataclass
class VisionResponse:
    """Vision response"""
    content: str
    model: str
    provider: str
    confidence: Optional[float] = None


class AIProvider(ABC):
    """
    Abstract base class for all AI providers
    Provides unified interface for OpenAI, Anthropic, Local models, etc.
    """

    def __init__(self, config: ProviderConfig):
        self.config = config
        self.provider_type = config.provider_type
        self.enabled = config.enabled

    @abstractmethod
    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """Transcribe audio to text"""
        pass

    @abstractmethod
    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate chat completion"""
        pass

    @abstractmethod
    async def chat_completion_stream(self, request: ChatRequest) -> AsyncIterator[str]:
        """Generate streaming chat completion"""
        pass

    @abstractmethod
    async def generate_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate text embeddings"""
        pass

    @abstractmethod
    async def vision_completion(self, request: VisionRequest) -> VisionResponse:
        """Process vision/multimodal request"""
        pass

    @abstractmethod
    def list_models(self) -> List[ModelInfo]:
        """List available models from this provider"""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is healthy and accessible"""
        pass

    @abstractmethod
    def get_capabilities(self) -> List[ModelCapability]:
        """Get provider capabilities"""
        pass

    def is_enabled(self) -> bool:
        """Check if provider is enabled"""
        return self.enabled

    def get_priority(self) -> int:
        """Get provider priority (lower = higher priority)"""
        return self.config.priority

    def supports_capability(self, capability: ModelCapability) -> bool:
        """Check if provider supports capability"""
        return capability in self.get_capabilities()

    async def estimate_cost(
        self,
        request: Union[ChatRequest, TranscriptionRequest],
        model: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Estimate cost for request
        Returns: {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}
        """
        # Default implementation - override for accurate costs
        return {"input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}

    def __str__(self) -> str:
        return f"{self.provider_type.value} (enabled={self.enabled}, priority={self.config.priority})"

    def __repr__(self) -> str:
        return f"<AIProvider {self.provider_type.value}>"
