"""
HuggingFace Model Manager
Handles downloading and managing local models from HuggingFace Hub
Supports: LLMs, Whisper, Vision models, and custom training
"""

import os
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
import json
import torch
from huggingface_hub import (
    hf_hub_download,
    snapshot_download,
    login,
    HfApi,
    HfFolder,
)
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel, AutoConfig
import gc

logger = logging.getLogger(__name__)


class HuggingFaceModelManager:
    """
    Manages HuggingFace models: download, cache, load, and update
    """

    def __init__(self, cache_dir: Optional[str] = None, token: Optional[str] = None):
        """
        Initialize HuggingFace model manager

        Args:
            cache_dir: Directory to cache models (default: ~/.cache/huggingface)
            token: HuggingFace API token for private/gated models
        """
        self.cache_dir = cache_dir or os.path.expanduser("~/.cache/huggingface")
        self.models_dir = Path(self.cache_dir) / "hub"
        self.models_dir.mkdir(parents=True, exist_ok=True)

        # Store token
        self.token = token or os.getenv("HUGGINGFACE_TOKEN")

        # Login if token provided
        if self.token:
            try:
                login(token=self.token, add_to_git_credential=False)
                logger.info("✅ Logged in to HuggingFace")
            except Exception as e:
                logger.warning(f"HuggingFace login failed: {e}")

        # Initialize API client
        self.api = HfApi(token=self.token)

        # Track loaded models
        self.loaded_models: Dict[str, Any] = {}
        self.loaded_tokenizers: Dict[str, Any] = {}

        # Model registry (recommended models)
        self.model_registry = {
            # Fast Whisper models
            "whisper-large-v3": {
                "repo_id": "openai/whisper-large-v3",
                "type": "whisper",
                "size": "3GB",
                "description": "Best accuracy for transcription",
            },
            "whisper-medium": {
                "repo_id": "openai/whisper-medium",
                "type": "whisper",
                "size": "1.5GB",
                "description": "Balanced speed/accuracy",
            },
            "whisper-small": {
                "repo_id": "openai/whisper-small",
                "type": "whisper",
                "size": "500MB",
                "description": "Fast transcription",
            },

            # LLMs for summarization
            "llama-3.1-8b": {
                "repo_id": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                "type": "llm",
                "size": "16GB",
                "description": "Best quality, requires 24GB VRAM",
                "quantized": "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",
            },
            "qwen2.5-7b": {
                "repo_id": "Qwen/Qwen2.5-7B-Instruct",
                "type": "llm",
                "size": "14GB",
                "description": "Excellent for code and reasoning",
                "quantized": "Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4",
            },
            "gemma-2-9b": {
                "repo_id": "google/gemma-2-9b-it",
                "type": "llm",
                "size": "18GB",
                "description": "Google's latest, very capable",
                "quantized": "unsloth/gemma-2-9b-it-bnb-4bit",
            },
            "phi-3.5-mini": {
                "repo_id": "microsoft/Phi-3.5-mini-instruct",
                "type": "llm",
                "size": "7.6GB",
                "description": "Fast, lightweight, great quality",
            },

            # Vision models
            "moondream2": {
                "repo_id": "vikhyatk/moondream2",
                "type": "vision",
                "size": "3.7GB",
                "description": "Fast vision-language model",
            },
            "llava-1.6-mistral-7b": {
                "repo_id": "llava-hf/llava-1.6-mistral-7b-hf",
                "type": "vision",
                "size": "15GB",
                "description": "Powerful multimodal understanding",
            },

            # Embedding models
            "bge-large-en-v1.5": {
                "repo_id": "BAAI/bge-large-en-v1.5",
                "type": "embedding",
                "size": "1.3GB",
                "description": "Best English embeddings",
            },
        }

        logger.info(f"📦 HuggingFace Model Manager initialized (cache: {self.cache_dir})")

    def list_available_models(self) -> List[Dict[str, Any]]:
        """List all available models in registry"""
        return [
            {"name": name, **details}
            for name, details in self.model_registry.items()
        ]

    def download_model(
        self,
        model_name: str,
        quantized: bool = False,
        revision: Optional[str] = None,
    ) -> str:
        """
        Download a model from HuggingFace Hub

        Args:
            model_name: Name from registry or full repo_id
            quantized: Use quantized version if available (4-bit, saves VRAM)
            revision: Specific model revision/tag

        Returns:
            Path to downloaded model
        """
        try:
            # Get repo_id from registry or use as-is
            if model_name in self.model_registry:
                model_info = self.model_registry[model_name]
                repo_id = model_info.get("quantized" if quantized else "repo_id", model_info["repo_id"])
                logger.info(f"📥 Downloading {model_name} ({repo_id})...")
            else:
                repo_id = model_name
                logger.info(f"📥 Downloading custom model: {repo_id}")

            # Download entire model repository
            model_path = snapshot_download(
                repo_id=repo_id,
                cache_dir=self.cache_dir,
                revision=revision,
                token=self.token,
                resume_download=True,
                local_files_only=False,
            )

            logger.info(f"✅ Model downloaded to: {model_path}")
            return model_path

        except Exception as e:
            logger.error(f"❌ Failed to download model {model_name}: {e}")
            raise

    def load_llm(
        self,
        model_name: str,
        device: str = "auto",
        quantization: Optional[str] = None,
        max_memory: Optional[Dict[str, str]] = None,
    ) -> tuple:
        """
        Load LLM model and tokenizer

        Args:
            model_name: Model name from registry or repo_id
            device: Device to load on ("auto", "cuda", "cpu")
            quantization: Quantization method ("4bit", "8bit", None)
            max_memory: Max memory per device (e.g., {"0": "20GB", "cpu": "30GB"})

        Returns:
            (model, tokenizer) tuple
        """
        try:
            # Check if already loaded
            cache_key = f"{model_name}_{quantization}_{device}"
            if cache_key in self.loaded_models:
                logger.info(f"♻️ Using cached model: {model_name}")
                return self.loaded_models[cache_key], self.loaded_tokenizers[cache_key]

            # Get repo_id
            if model_name in self.model_registry:
                model_info = self.model_registry[model_name]
                repo_id = model_info.get("quantized" if quantization else "repo_id", model_info["repo_id"])
            else:
                repo_id = model_name

            logger.info(f"🔧 Loading LLM: {repo_id}")

            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(
                repo_id,
                cache_dir=self.cache_dir,
                token=self.token,
                trust_remote_code=True,
            )

            # Prepare loading kwargs
            load_kwargs = {
                "pretrained_model_name_or_path": repo_id,
                "cache_dir": self.cache_dir,
                "token": self.token,
                "trust_remote_code": True,
                "device_map": device,
            }

            # Add quantization if specified
            if quantization == "4bit":
                from transformers import BitsAndBytesConfig
                load_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4",
                )
                logger.info("⚡ Using 4-bit quantization (saves 75% VRAM)")
            elif quantization == "8bit":
                from transformers import BitsAndBytesConfig
                load_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_8bit=True,
                )
                logger.info("⚡ Using 8-bit quantization (saves 50% VRAM)")
            else:
                load_kwargs["torch_dtype"] = torch.float16

            # Add max memory if specified
            if max_memory:
                load_kwargs["max_memory"] = max_memory

            # Load model
            model = AutoModelForCausalLM.from_pretrained(**load_kwargs)

            # Cache models
            self.loaded_models[cache_key] = model
            self.loaded_tokenizers[cache_key] = tokenizer

            logger.info(f"✅ LLM loaded successfully: {repo_id}")
            return model, tokenizer

        except Exception as e:
            logger.error(f"❌ Failed to load LLM {model_name}: {e}")
            raise

    def load_embedding_model(self, model_name: str = "bge-large-en-v1.5") -> tuple:
        """Load embedding model for semantic search"""
        try:
            from sentence_transformers import SentenceTransformer

            if model_name in self.model_registry:
                repo_id = self.model_registry[model_name]["repo_id"]
            else:
                repo_id = model_name

            logger.info(f"🔧 Loading embedding model: {repo_id}")

            model = SentenceTransformer(repo_id, cache_folder=self.cache_dir)

            logger.info(f"✅ Embedding model loaded: {repo_id}")
            return model, None

        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise

    def unload_model(self, model_name: str):
        """Unload model from memory to free VRAM"""
        try:
            # Find all matching cache keys
            keys_to_remove = [k for k in self.loaded_models.keys() if k.startswith(model_name)]

            for key in keys_to_remove:
                if key in self.loaded_models:
                    del self.loaded_models[key]
                if key in self.loaded_tokenizers:
                    del self.loaded_tokenizers[key]

            # Force garbage collection
            gc.collect()
            torch.cuda.empty_cache()

            logger.info(f"🗑️ Unloaded model: {model_name}")

        except Exception as e:
            logger.warning(f"Failed to unload model {model_name}: {e}")

    def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get model information from registry"""
        return self.model_registry.get(model_name)

    def check_model_exists(self, model_name: str) -> bool:
        """Check if model is already downloaded"""
        try:
            if model_name in self.model_registry:
                repo_id = self.model_registry[model_name]["repo_id"]
            else:
                repo_id = model_name

            # Try to load config to check if model exists
            try:
                AutoConfig.from_pretrained(
                    repo_id,
                    cache_dir=self.cache_dir,
                    token=self.token,
                    local_files_only=True,
                )
                return True
            except:
                return False

        except Exception:
            return False

    def get_device_info(self) -> Dict[str, Any]:
        """Get GPU/CPU information"""
        info = {
            "cuda_available": torch.cuda.is_available(),
            "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "devices": [],
        }

        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                device_info = {
                    "id": i,
                    "name": torch.cuda.get_device_name(i),
                    "memory_total": torch.cuda.get_device_properties(i).total_memory / 1e9,  # GB
                    "memory_allocated": torch.cuda.memory_allocated(i) / 1e9,  # GB
                    "memory_reserved": torch.cuda.memory_reserved(i) / 1e9,  # GB
                }
                info["devices"].append(device_info)

        return info

    def estimate_model_memory(self, model_name: str, quantization: Optional[str] = None) -> Dict[str, Any]:
        """Estimate memory requirements for a model"""
        if model_name not in self.model_registry:
            return {"error": "Model not in registry"}

        model_info = self.model_registry[model_name]
        base_size_str = model_info.get("size", "unknown")

        # Parse size (e.g., "16GB" -> 16)
        try:
            base_size_gb = float(base_size_str.replace("GB", "").replace("MB", "e-3"))
        except:
            base_size_gb = 0

        # Adjust for quantization
        if quantization == "4bit":
            actual_size_gb = base_size_gb * 0.25
        elif quantization == "8bit":
            actual_size_gb = base_size_gb * 0.5
        else:
            actual_size_gb = base_size_gb

        return {
            "model": model_name,
            "base_size_gb": base_size_gb,
            "actual_size_gb": actual_size_gb,
            "quantization": quantization or "none",
            "recommended_vram_gb": actual_size_gb + 4,  # +4GB for activations
        }


# Singleton instance
_manager_instance: Optional[HuggingFaceModelManager] = None


def get_hf_manager(token: Optional[str] = None) -> HuggingFaceModelManager:
    """Get or create HuggingFace model manager instance"""
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = HuggingFaceModelManager(token=token)
    return _manager_instance


def initialize_hf_manager(token: str):
    """Initialize manager with token"""
    global _manager_instance
    _manager_instance = HuggingFaceModelManager(token=token)
    return _manager_instance
