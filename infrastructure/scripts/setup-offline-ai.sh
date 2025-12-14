#!/bin/bash
#
# Setup Offline AI - Download models and configure local AI providers
#

set -e

echo "🚀 OpenMeet v2 - Offline AI Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Check HuggingFace token
if [ -z "$HF_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  HF_TOKEN not set in environment${NC}"
    echo "   Checking .env file..."

    if [ -f ".env" ]; then
        source .env
        if [ -n "$HF_TOKEN" ] && [ "$HF_TOKEN" != "your-hf-token-here" ]; then
            echo -e "${GREEN}✅ Found HF_TOKEN in .env${NC}"
        else
            echo -e "${RED}❌ HF_TOKEN not configured in .env${NC}"
            echo "   Get your token from: https://huggingface.co/settings/tokens"
            exit 1
        fi
    else
        echo -e "${RED}❌ .env file not found${NC}"
        exit 1
    fi
fi

echo ""
echo "📦 Step 1: Creating directories"
echo "-------------------------------"
mkdir -p ml-models
mkdir -p ml-models/.cache
echo -e "${GREEN}✅ Directories created${NC}"

echo ""
echo "📥 Step 2: Downloading models from HuggingFace"
echo "-----------------------------------------------"
echo ""
echo "This will download:"
echo "  - Whisper Small (~1GB) - Speech-to-text"
echo "  - Qwen 2.5 3B (~6GB) - General LLM"
echo "  - MiniLM L6 (~90MB) - Embeddings"
echo ""
echo "Total: ~7GB"
echo ""

read -p "Continue? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo "Cancelled."
    exit 0
fi

# Detect Python command (python3 on Linux/Mac, python on Windows)
PYTHON_CMD="python3"
if command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1)
    if [[ $PYTHON_VERSION == *"Python 3"* ]]; then
        PYTHON_CMD="python"
    fi
fi

echo "Using Python: $PYTHON_CMD ($($PYTHON_CMD --version 2>&1))"

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
$PYTHON_CMD -m pip install -q huggingface-hub || {
    echo -e "${RED}❌ Failed to install huggingface-hub${NC}"
    echo "Try: $PYTHON_CMD -m pip install --user huggingface-hub"
    exit 1
}

# Download models
echo ""
$PYTHON_CMD infrastructure/scripts/download-models.py recommended

echo ""
echo "🐳 Step 3: Starting Ollama"
echo "--------------------------"
docker-compose up -d ollama

echo ""
echo "⏳ Waiting for Ollama to be ready..."
sleep 10

# Pull Ollama models
echo ""
echo "📥 Step 4: Pulling Ollama models"
echo "--------------------------------"

echo "Pulling llama3.2:3b..."
docker exec -it openmeet-ollama ollama pull llama3.2:3b || {
    echo -e "${YELLOW}⚠️  Failed to pull llama3.2:3b, trying smaller model...${NC}"
    docker exec -it openmeet-ollama ollama pull llama3.2:1b
}

echo ""
echo "Pulling nomic-embed-text..."
docker exec -it openmeet-ollama ollama pull nomic-embed-text

echo ""
echo "✅ Step 5: Verifying installation"
echo "----------------------------------"

# Test Ollama
echo -n "Testing Ollama API... "
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# List downloaded models
echo ""
echo "📊 Downloaded Models:"
docker exec openmeet-ollama ollama list

echo ""
echo "🎉 Offline AI Setup Complete!"
echo "=============================="
echo ""
echo "✅ What's ready:"
echo "  - Ollama running on port 11434"
echo "  - Llama 3.2 3B model loaded"
echo "  - Nomic embeddings loaded"
echo "  - HuggingFace models cached"
echo ""
echo "📋 Next Steps:"
echo "  1. Update AI services to use Ollama:"
echo "     Set AI_PROVIDER=ollama in .env"
echo ""
echo "  2. Test Ollama:"
echo "     curl http://localhost:11434/api/generate -d '{\"model\":\"llama3.2:3b\",\"prompt\":\"Hello!\"}'"
echo ""
echo "  3. Start application services:"
echo "     docker-compose up -d api web ai-service"
echo ""
echo "  4. For high-performance inference, use vLLM:"
echo "     docker-compose up -d vllm"
echo ""
