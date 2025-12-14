"""
Provider Configuration Service
Manages provider settings with database persistence and dynamic updates
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
from dataclasses import asdict

from .providers import (
    ProviderType,
    ProviderConfig,
    ModelCapability,
    get_provider_manager,
    ProviderStrategy,
)

logger = logging.getLogger(__name__)


class ProviderConfigService:
    """
    Manages provider configurations
    - Load from environment variables
    - Load from database (organization-specific settings)
    - Save configuration changes
    - Hot-reload providers
    """

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.getenv(
            "PROVIDER_CONFIG_PATH",
            str(Path.home() / ".openmeet" / "provider_config.json")
        )
        self.manager = get_provider_manager()
        self.current_config: Dict[str, Any] = {}

    def load_default_config(self) -> Dict[ProviderType, ProviderConfig]:
        """
        Load default provider configuration from environment variables
        """
        configs = {}

        # OpenAI configuration
        if os.getenv("OPENAI_API_KEY"):
            configs[ProviderType.OPENAI] = ProviderConfig(
                provider_type=ProviderType.OPENAI,
                enabled=os.getenv("OPENAI_ENABLED", "true").lower() == "true",
                api_key=os.getenv("OPENAI_API_KEY"),
                organization=os.getenv("OPENAI_ORGANIZATION"),
                priority=int(os.getenv("OPENAI_PRIORITY", "50")),
                max_retries=int(os.getenv("OPENAI_MAX_RETRIES", "3")),
                timeout=int(os.getenv("OPENAI_TIMEOUT", "60")),
            )
            logger.info("✅ OpenAI configuration loaded from environment")

        # Anthropic configuration
        if os.getenv("ANTHROPIC_API_KEY"):
            configs[ProviderType.ANTHROPIC] = ProviderConfig(
                provider_type=ProviderType.ANTHROPIC,
                enabled=os.getenv("ANTHROPIC_ENABLED", "true").lower() == "true",
                api_key=os.getenv("ANTHROPIC_API_KEY"),
                priority=int(os.getenv("ANTHROPIC_PRIORITY", "60")),
                max_retries=int(os.getenv("ANTHROPIC_MAX_RETRIES", "3")),
                timeout=int(os.getenv("ANTHROPIC_TIMEOUT", "60")),
            )
            logger.info("✅ Anthropic configuration loaded from environment")

        # Local models configuration
        local_enabled = os.getenv("LOCAL_MODELS_ENABLED", "false").lower() == "true"
        if local_enabled:
            configs[ProviderType.LOCAL] = ProviderConfig(
                provider_type=ProviderType.LOCAL,
                enabled=True,
                api_key=os.getenv("HUGGINGFACE_TOKEN"),  # Optional HF token
                priority=int(os.getenv("LOCAL_PRIORITY", "100")),  # Lower priority by default
                timeout=int(os.getenv("LOCAL_TIMEOUT", "300")),  # Longer timeout for local
                custom_config={
                    "whisper_model": os.getenv("LOCAL_WHISPER_MODEL", "large-v3"),
                    "llm_model": os.getenv("LOCAL_LLM_MODEL", "llama-3.1-8b"),
                    "quantization": os.getenv("LOCAL_QUANTIZATION", "4bit"),
                    "device": os.getenv("LOCAL_DEVICE", "auto"),
                }
            )
            logger.info("✅ Local models configuration loaded from environment")

        return configs

    def load_config_from_file(self) -> Dict[ProviderType, ProviderConfig]:
        """Load provider configuration from JSON file"""
        try:
            if not os.path.exists(self.config_path):
                logger.info(f"No config file found at {self.config_path}, using defaults")
                return self.load_default_config()

            with open(self.config_path, 'r') as f:
                data = json.load(f)

            configs = {}
            for provider_key, config_data in data.get("providers", {}).items():
                provider_type = ProviderType(provider_key)
                configs[provider_type] = ProviderConfig(**config_data)

            logger.info(f"✅ Loaded config from {self.config_path}")
            return configs

        except Exception as e:
            logger.error(f"Failed to load config from file: {e}")
            return self.load_default_config()

    def save_config_to_file(self, configs: Dict[ProviderType, ProviderConfig]):
        """Save provider configuration to JSON file"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)

            # Convert to serializable format
            data = {
                "providers": {
                    provider_type.value: asdict(config)
                    for provider_type, config in configs.items()
                },
                "version": "1.0.0",
            }

            with open(self.config_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)

            logger.info(f"✅ Saved config to {self.config_path}")

        except Exception as e:
            logger.error(f"Failed to save config to file: {e}")
            raise

    def initialize_providers(self, reload: bool = False):
        """
        Initialize all providers based on configuration

        Args:
            reload: If True, reload even if already initialized
        """
        try:
            # Load configuration
            configs = self.load_config_from_file()

            if not configs:
                logger.warning("No provider configurations found")
                return

            # Register all providers
            for provider_type, config in configs.items():
                if config.enabled:
                    try:
                        if reload:
                            self.manager.unregister_provider(provider_type)
                        self.manager.register_provider(provider_type, config)
                    except Exception as e:
                        logger.error(f"Failed to register {provider_type.value}: {e}")

            # Set default providers for capabilities
            self._set_default_providers(configs)

            # Set strategy
            strategy_name = os.getenv("PROVIDER_STRATEGY", "fallback")
            self.manager.set_strategy(ProviderStrategy(strategy_name))

            self.current_config = configs
            logger.info("✅ All providers initialized")

        except Exception as e:
            logger.error(f"Failed to initialize providers: {e}")
            raise

    def _set_default_providers(self, configs: Dict[ProviderType, ProviderConfig]):
        """Set default providers for each capability based on priority"""

        # Default: use OpenAI for chat if available, otherwise local
        if ProviderType.OPENAI in configs and configs[ProviderType.OPENAI].enabled:
            self.manager.set_default_provider(ModelCapability.CHAT, ProviderType.OPENAI)
            self.manager.set_default_provider(ModelCapability.EMBEDDING, ProviderType.OPENAI)
        elif ProviderType.LOCAL in configs and configs[ProviderType.LOCAL].enabled:
            self.manager.set_default_provider(ModelCapability.CHAT, ProviderType.LOCAL)
            self.manager.set_default_provider(ModelCapability.EMBEDDING, ProviderType.LOCAL)

        # Default: use Anthropic or OpenAI for vision
        if ProviderType.ANTHROPIC in configs and configs[ProviderType.ANTHROPIC].enabled:
            self.manager.set_default_provider(ModelCapability.VISION, ProviderType.ANTHROPIC)
        elif ProviderType.OPENAI in configs and configs[ProviderType.OPENAI].enabled:
            self.manager.set_default_provider(ModelCapability.VISION, ProviderType.OPENAI)

        # Default: use Local for transcription (faster + free), fallback to OpenAI
        if ProviderType.LOCAL in configs and configs[ProviderType.LOCAL].enabled:
            self.manager.set_default_provider(ModelCapability.TRANSCRIPTION, ProviderType.LOCAL)
        elif ProviderType.OPENAI in configs and configs[ProviderType.OPENAI].enabled:
            self.manager.set_default_provider(ModelCapability.TRANSCRIPTION, ProviderType.OPENAI)

    def update_provider_config(
        self,
        provider_type: ProviderType,
        updates: Dict[str, Any],
        hot_reload: bool = True
    ):
        """
        Update provider configuration dynamically

        Args:
            provider_type: Provider to update
            updates: Configuration updates
            hot_reload: If True, reload provider immediately
        """
        try:
            configs = self.load_config_from_file()

            if provider_type not in configs:
                logger.warning(f"Provider {provider_type.value} not found, creating new config")
                configs[provider_type] = ProviderConfig(provider_type=provider_type)

            # Update configuration
            config = configs[provider_type]
            for key, value in updates.items():
                if hasattr(config, key):
                    setattr(config, key, value)

            # Save to file
            self.save_config_to_file(configs)

            # Hot reload if requested
            if hot_reload and config.enabled:
                self.manager.unregister_provider(provider_type)
                self.manager.register_provider(provider_type, config)
                logger.info(f"🔄 Hot-reloaded provider: {provider_type.value}")

            self.current_config = configs

        except Exception as e:
            logger.error(f"Failed to update provider config: {e}")
            raise

    def get_provider_config(self, provider_type: ProviderType) -> Optional[ProviderConfig]:
        """Get current configuration for a provider"""
        return self.current_config.get(provider_type)

    def get_all_configs(self) -> Dict[ProviderType, ProviderConfig]:
        """Get all provider configurations"""
        return self.current_config.copy()

    def enable_provider(self, provider_type: ProviderType, hot_reload: bool = True):
        """Enable a provider"""
        self.update_provider_config(provider_type, {"enabled": True}, hot_reload)

    def disable_provider(self, provider_type: ProviderType):
        """Disable a provider"""
        self.update_provider_config(provider_type, {"enabled": False}, hot_reload=False)
        self.manager.unregister_provider(provider_type)

    def set_provider_priority(self, provider_type: ProviderType, priority: int, hot_reload: bool = True):
        """Set provider priority (lower = higher priority)"""
        self.update_provider_config(provider_type, {"priority": priority}, hot_reload)

    async def health_check_all(self) -> Dict[str, bool]:
        """Check health of all providers"""
        return await self.manager.health_check_all()

    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive provider status"""
        return {
            "provider_manager": self.manager.get_provider_status(),
            "config_path": self.config_path,
            "total_providers": len(self.current_config),
            "enabled_providers": sum(1 for c in self.current_config.values() if c.enabled),
        }


# Singleton instance
_config_service_instance: Optional[ProviderConfigService] = None


def get_provider_config_service() -> ProviderConfigService:
    """Get or create provider config service instance"""
    global _config_service_instance
    if _config_service_instance is None:
        _config_service_instance = ProviderConfigService()
    return _config_service_instance


def initialize_provider_system():
    """
    Initialize the entire provider system
    Call this on application startup
    """
    service = get_provider_config_service()
    service.initialize_providers()
    return service
