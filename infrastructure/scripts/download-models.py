#!/usr/bin/env python3
"""
HuggingFace Model Downloader for Offline AI
Downloads Whisper and LLM models for local inference
"""

import os
import sys
from pathlib import Path
from huggingface_hub import snapshot_download, hf_hub_download
import argparse

# HuggingFace token from environment
HF_TOKEN = os.getenv("HF_TOKEN", "YOUR_HUGGINGFACE_TOKEN_HERE")

# Model configurations
MODELS = {
    "whisper-small": {
        "repo_id": "openai/whisper-small",
        "local_dir": "./ml-models/whisper-small",
        "description": "Whisper Small - 244M params, multilingual speech recognition",
        "size": "~1GB",
    },
    "whisper-tiny": {
        "repo_id": "openai/whisper-tiny",
        "local_dir": "./ml-models/whisper-tiny",
        "description": "Whisper Tiny - 39M params, fastest speech recognition",
        "size": "~150MB",
    },
    "llama-3.2-3b": {
        "repo_id": "meta-llama/Llama-3.2-3B-Instruct",
        "local_dir": "./ml-models/llama-3.2-3b",
        "description": "Llama 3.2 3B - Small but powerful LLM",
        "size": "~6GB",
    },
    "phi-3-mini": {
        "repo_id": "microsoft/Phi-3-mini-4k-instruct",
        "local_dir": "./ml-models/phi-3-mini",
        "description": "Phi-3 Mini - 3.8B params, efficient instruction-following",
        "size": "~8GB",
    },
    "qwen-2.5-3b": {
        "repo_id": "Qwen/Qwen2.5-3B-Instruct",
        "local_dir": "./ml-models/qwen-2.5-3b",
        "description": "Qwen 2.5 3B - State-of-the-art small LLM",
        "size": "~6GB",
    },
    "nomic-embed": {
        "repo_id": "nomic-ai/nomic-embed-text-v1.5",
        "local_dir": "./ml-models/nomic-embed-text",
        "description": "Nomic Embed - Best embeddings for semantic search",
        "size": "~500MB",
    },
    "all-minilm": {
        "repo_id": "sentence-transformers/all-MiniLM-L6-v2",
        "local_dir": "./ml-models/all-minilm-l6-v2",
        "description": "MiniLM - Fast and lightweight embeddings",
        "size": "~90MB",
    },
}


def download_model(model_name: str, force: bool = False):
    """Download a model from HuggingFace"""

    if model_name not in MODELS:
        print(f"❌ Unknown model: {model_name}")
        print(f"Available models: {', '.join(MODELS.keys())}")
        return False

    config = MODELS[model_name]
    local_dir = Path(config["local_dir"])

    # Check if model already exists
    if local_dir.exists() and not force:
        print(f"✅ Model '{model_name}' already exists at {local_dir}")
        print(f"   Use --force to re-download")
        return True

    print(f"\n📦 Downloading: {config['description']}")
    print(f"   Repository: {config['repo_id']}")
    print(f"   Size: {config['size']}")
    print(f"   Destination: {local_dir}")
    print()

    try:
        # Create directory
        local_dir.parent.mkdir(parents=True, exist_ok=True)

        # Download model
        print(f"⏳ Downloading {model_name}...")
        snapshot_download(
            repo_id=config["repo_id"],
            local_dir=str(local_dir),
            token=HF_TOKEN,
            resume_download=True,
            local_dir_use_symlinks=False,
        )

        print(f"✅ Successfully downloaded {model_name}")
        return True

    except Exception as e:
        print(f"❌ Error downloading {model_name}: {e}")
        return False


def download_recommended_set():
    """Download recommended models for offline deployment"""

    print("🚀 Downloading Recommended Model Set")
    print("=" * 60)
    print()
    print("This will download:")
    print("  1. Whisper Small - Speech-to-text (~1GB)")
    print("  2. Qwen 2.5 3B - General LLM (~6GB)")
    print("  3. MiniLM - Embeddings (~90MB)")
    print()
    print("Total size: ~7GB")
    print()

    response = input("Continue? [Y/n]: ").strip().lower()
    if response and response != 'y':
        print("Cancelled.")
        return

    # Download recommended models
    models_to_download = ["whisper-small", "qwen-2.5-3b", "all-minilm"]

    results = {}
    for model in models_to_download:
        results[model] = download_model(model)

    # Summary
    print("\n" + "=" * 60)
    print("📊 Download Summary:")
    print("=" * 60)
    for model, success in results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"  {model}: {status}")

    if all(results.values()):
        print("\n🎉 All models downloaded successfully!")
        print("\n📋 Next Steps:")
        print("  1. Start Ollama and pull models:")
        print("     docker-compose up -d ollama")
        print("     docker exec -it openmeet-ollama ollama pull llama3.2:3b")
        print("     docker exec -it openmeet-ollama ollama pull nomic-embed-text")
        print()
        print("  2. Or use vLLM for high-performance inference:")
        print("     docker-compose up -d vllm")
        print()
        print("  3. Update AI services to use local models")
    else:
        print("\n⚠️  Some downloads failed. Check errors above.")


def list_models():
    """List all available models"""

    print("\n📦 Available Models:")
    print("=" * 80)

    for name, config in MODELS.items():
        exists = Path(config["local_dir"]).exists()
        status = "✅ Downloaded" if exists else "⬇️  Not downloaded"

        print(f"\n{name}")
        print(f"  {status}")
        print(f"  Description: {config['description']}")
        print(f"  Repository: {config['repo_id']}")
        print(f"  Size: {config['size']}")
        print(f"  Path: {config['local_dir']}")


def main():
    parser = argparse.ArgumentParser(
        description="Download AI models from HuggingFace for offline use"
    )

    parser.add_argument(
        "action",
        choices=["download", "list", "recommended"],
        help="Action to perform",
    )

    parser.add_argument(
        "--model",
        "-m",
        help="Model name to download (use with 'download' action)",
    )

    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Force re-download even if model exists",
    )

    parser.add_argument(
        "--token",
        "-t",
        help="HuggingFace token (overrides HF_TOKEN env var)",
    )

    args = parser.parse_args()

    # Set token if provided
    if args.token:
        global HF_TOKEN
        HF_TOKEN = args.token

    # Check token
    if not HF_TOKEN or HF_TOKEN == "your-hf-token-here":
        print("❌ Error: HuggingFace token not set!")
        print("   Set HF_TOKEN environment variable or use --token flag")
        print()
        print("   Get your token from: https://huggingface.co/settings/tokens")
        sys.exit(1)

    # Execute action
    if args.action == "list":
        list_models()

    elif args.action == "recommended":
        download_recommended_set()

    elif args.action == "download":
        if not args.model:
            print("❌ Error: --model required for download action")
            print(f"   Available models: {', '.join(MODELS.keys())}")
            sys.exit(1)

        success = download_model(args.model, force=args.force)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
