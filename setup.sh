#!/bin/bash

#############################################################
#  OPENMEET AI - One-Click Setup Script
#  Sets up the complete system with all ML models
#############################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WHISPER_MODEL_SIZE="${WHISPER_MODEL_SIZE:-large-v3}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2}"

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║     ███╗   ██╗███████╗██████╗ ██╗   ██╗██╗      █████╗       ║"
    echo "║     ████╗  ██║██╔════╝██╔══██╗██║   ██║██║     ██╔══██╗      ║"
    echo "║     ██╔██╗ ██║█████╗  ██████╔╝██║   ██║██║     ███████║      ║"
    echo "║     ██║╚██╗██║██╔══╝  ██╔══██╗██║   ██║██║     ██╔══██║      ║"
    echo "║     ██║ ╚████║███████╗██████╔╝╚██████╔╝███████╗██║  ██║      ║"
    echo "║     ╚═╝  ╚═══╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝      ║"
    echo "║                                                               ║"
    echo "║              AI-Powered Meeting Intelligence                  ║"
    echo "║                  One-Click Setup Script                       ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_step() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}▶ $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"

    local missing=()

    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    else
        log_success "Docker: $(docker --version)"
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing+=("docker-compose")
    else
        log_success "Docker Compose: $(docker compose version 2>/dev/null || docker-compose --version)"
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing+=("node")
    else
        log_success "Node.js: $(node --version)"
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_warning "pnpm not found, will install..."
        npm install -g pnpm
        log_success "pnpm installed: $(pnpm --version)"
    else
        log_success "pnpm: $(pnpm --version)"
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    log_success "Docker daemon is running"

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi

    log_success "All prerequisites met!"
}

# Setup environment variables
setup_environment() {
    log_step "Setting Up Environment"

    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success "Created .env from .env.example"
        else
            log_info "Creating .env with default configuration..."
            create_default_env
        fi
    else
        log_success ".env file already exists"
    fi

    # Update whisper model size to large-v3
    if grep -q "WHISPER_MODEL_SIZE=" .env; then
        sed -i.bak "s/WHISPER_MODEL_SIZE=.*/WHISPER_MODEL_SIZE=${WHISPER_MODEL_SIZE}/" .env
    else
        echo "WHISPER_MODEL_SIZE=${WHISPER_MODEL_SIZE}" >> .env
    fi
    log_success "Set WHISPER_MODEL_SIZE=${WHISPER_MODEL_SIZE}"

    # Ensure HF_TOKEN is set
    if ! grep -q "^HF_TOKEN=hf_" .env; then
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}  HuggingFace Token Required for Speaker Diarization${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "pyannote speaker diarization requires a HuggingFace token."
        echo ""
        echo "1. Create account: https://huggingface.co/join"
        echo "2. Get token: https://huggingface.co/settings/tokens"
        echo "3. Accept license: https://huggingface.co/pyannote/speaker-diarization-3.1"
        echo ""
        read -p "Enter your HuggingFace token (or press Enter to skip): " hf_token
        if [ -n "$hf_token" ]; then
            sed -i.bak "s/^HF_TOKEN=.*/HF_TOKEN=${hf_token}/" .env
            echo "HUGGINGFACE_TOKEN=${hf_token}" >> .env
            log_success "HuggingFace token configured"
        else
            log_warning "Skipping HF token - speaker diarization will use fallback mode"
        fi
    else
        log_success "HuggingFace token already configured"
    fi

    rm -f .env.bak
    log_success "Environment configured"
}

create_default_env() {
    cat > .env << 'ENVEOF'
# Application Environment
NODE_ENV=development
PYTHON_ENV=development

# Database Configuration
POSTGRES_USER=openmeet
POSTGRES_PASSWORD=openmeet123
POSTGRES_DB=openmeet_db
DATABASE_URL=postgresql://openmeet:openmeet123@localhost:4001/openmeet_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=redis123
REDIS_URL=redis://:redis123@localhost:6380

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200

# RabbitMQ Configuration
RABBITMQ_USER=openmeet
RABBITMQ_PASSWORD=rabbit123
RABBITMQ_URL=amqp://openmeet:rabbit123@localhost:5674

# MinIO S3 Storage Configuration
MINIO_USER=openmeet
MINIO_PASSWORD=minio123456
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=openmeet
S3_SECRET_KEY=minio123456
S3_BUCKET=openmeet-storage

# JWT Configuration
JWT_SECRET=c5164bb1165c59df3d34fba048c5abd09bf89ccc4e1297d2
JWT_REFRESH_SECRET=b6552ee60a48651c13d46cba3557efe31adfed105939a8e9
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption Key (AES-256)
ENCRYPTION_KEY=764c4e988bb18891f8cd5d42361ae403

# Application URLs
PORT=4100
API_URL=http://localhost:4100
WEB_URL=http://localhost:4200
WS_URL=ws://localhost:5000
AI_SERVICE_URL=http://localhost:8888
TRANSCRIPTION_SERVICE_URL=http://localhost:5002

# Local AI Service Configuration
USE_LOCAL_TRANSCRIPTION=true
WHISPER_PROVIDER=local
WHISPER_MODEL_SIZE=large-v3

# HuggingFace Token (required for pyannote speaker diarization)
HF_TOKEN=
HUGGINGFACE_TOKEN=

# Public URLs
NEXT_PUBLIC_API_URL=http://localhost:4100
NEXT_PUBLIC_WS_URL=ws://localhost:5000
NEXT_PUBLIC_WEB_URL=http://localhost:4200

# Twilio - Leave empty to disable SMS features
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# OpenAI (optional - leave empty for local-only mode)
OPENAI_API_KEY=

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json
ENVEOF
    log_success "Created default .env file"
}

# Start infrastructure containers
start_infrastructure() {
    log_step "Starting Infrastructure Containers"

    log_info "Starting PostgreSQL, Redis, Elasticsearch, RabbitMQ, MinIO..."
    docker-compose up -d postgres redis elasticsearch rabbitmq minio

    log_info "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep -q "healthy"; then
            healthy_count=$(docker-compose ps | grep -c "healthy" || true)
            log_info "Healthy containers: $healthy_count/5"
            if [ "$healthy_count" -ge 5 ]; then
                break
            fi
        fi
        sleep 5
        ((attempt++))
    done

    # Verify each service
    echo ""
    docker-compose ps --format "table {{.Name}}\t{{.Status}}" | grep -E "(postgres|redis|elasticsearch|rabbitmq|minio)"
    echo ""

    log_success "Infrastructure containers started"
}

# Start Ollama and download model
start_ollama() {
    log_step "Starting Ollama & Downloading LLM Model"

    log_info "Starting Ollama container..."
    docker-compose up -d ollama

    log_info "Waiting for Ollama to be ready..."
    sleep 10

    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            break
        fi
        sleep 3
        ((attempt++))
    done

    log_info "Downloading ${OLLAMA_MODEL} model (this may take a few minutes)..."
    docker exec openmeet-ollama ollama pull ${OLLAMA_MODEL}

    log_success "Ollama ready with ${OLLAMA_MODEL} model"
}

# Build and start AI service with model downloads
start_ai_service() {
    log_step "Building & Starting AI Service"

    log_info "Building AI service container..."
    docker-compose build ai-service

    log_info "Starting AI service..."
    docker-compose up -d ai-service

    log_info "Waiting for AI service to initialize..."
    sleep 15

    # Check health
    local max_attempts=20
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8888/health > /dev/null 2>&1; then
            log_success "AI service is healthy"
            break
        fi
        sleep 5
        ((attempt++))
    done

    # Pre-download ML models
    log_info "Pre-downloading ML models (WhisperX ${WHISPER_MODEL_SIZE}, pyannote)..."
    log_info "This may take 5-10 minutes on first run..."

    docker exec openmeet-service python << 'PYTHONEOF'
import os
import sys

print("Downloading ML models...")

# Download Whisper model
print(f"\n[1/4] Downloading WhisperX {os.getenv('WHISPER_MODEL_SIZE', 'large-v3')} model...")
try:
    from faster_whisper import WhisperModel
    model_size = os.getenv('WHISPER_MODEL_SIZE', 'large-v3')
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    print(f"  ✅ WhisperX {model_size} downloaded successfully")
except Exception as e:
    print(f"  ⚠️  WhisperX download error (will retry on first use): {e}")

# Download spaCy model
print("\n[2/4] Downloading spaCy model...")
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
        print("  ✅ spaCy en_core_web_sm already available")
    except:
        import subprocess
        subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], check=True)
        print("  ✅ spaCy en_core_web_sm downloaded")
except Exception as e:
    print(f"  ⚠️  spaCy download error: {e}")

# Download sentence-transformers for KeyBERT
print("\n[3/4] Downloading sentence-transformers model...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("  ✅ Sentence transformer model downloaded")
except Exception as e:
    print(f"  ⚠️  Sentence transformer download error: {e}")

# Test pyannote (will download on first use with HF token)
print("\n[4/4] Checking pyannote.audio...")
try:
    from typing import NamedTuple
    import torchaudio
    if not hasattr(torchaudio, 'set_audio_backend'):
        torchaudio.set_audio_backend = lambda x: None
    if not hasattr(torchaudio, 'get_audio_backend'):
        torchaudio.get_audio_backend = lambda: "soundfile"
    if not hasattr(torchaudio, 'list_audio_backends'):
        torchaudio.list_audio_backends = lambda: ["soundfile", "sox"]
    if not hasattr(torchaudio, 'AudioMetaData'):
        class AudioMetaData(NamedTuple):
            sample_rate: int
            num_frames: int
            num_channels: int
            bits_per_sample: int
            encoding: str
        torchaudio.AudioMetaData = AudioMetaData

    from pyannote.audio import Pipeline
    print("  ✅ pyannote.audio available")

    hf_token = os.getenv('HF_TOKEN') or os.getenv('HUGGINGFACE_TOKEN')
    if hf_token and hf_token.startswith('hf_'):
        print("  ℹ️  pyannote models will download on first diarization request")
    else:
        print("  ⚠️  No HF token - speaker diarization will use fallback mode")
except Exception as e:
    print(f"  ⚠️  pyannote check error: {e}")

print("\n✅ ML model pre-download complete!")
PYTHONEOF

    log_success "AI service ready with ML models"
}

# Install Node.js dependencies
install_dependencies() {
    log_step "Installing Node.js Dependencies"

    log_info "Running pnpm install..."
    pnpm install

    log_success "Node.js dependencies installed"
}

# Setup database
setup_database() {
    log_step "Setting Up Database"

    log_info "Generating Prisma client..."
    cd apps/api
    DATABASE_URL="postgresql://openmeet:openmeet123@localhost:4001/openmeet_db" npx prisma generate

    log_info "Running database migrations..."
    DATABASE_URL="postgresql://openmeet:openmeet123@localhost:4001/openmeet_db" npx prisma db push

    log_info "Seeding database with test data..."
    DATABASE_URL="postgresql://openmeet:openmeet123@localhost:4001/openmeet_db" npx prisma db seed || true

    cd ../..

    log_success "Database setup complete"
}

# Start application services
start_application() {
    log_step "Starting Application Services"

    log_info "Starting API server on port 4100..."
    pnpm dev:api > /tmp/api-server.log 2>&1 &
    API_PID=$!

    log_info "Starting Web frontend on port 4200..."
    pnpm dev:web > /tmp/web-server.log 2>&1 &
    WEB_PID=$!

    log_info "Waiting for services to start..."
    sleep 15

    # Verify API
    if curl -s http://localhost:4100/health > /dev/null 2>&1; then
        log_success "API server is running on http://localhost:4100"
    else
        log_warning "API server may still be starting..."
    fi

    log_success "Application services started"
}

# Print final status
print_status() {
    log_step "Setup Complete!"

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 OPENMEET AI IS READY! 🎉                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${CYAN}Services:${NC}"
    echo "  ├─ Web Frontend:    http://localhost:4200"
    echo "  ├─ API Server:      http://localhost:4100"
    echo "  ├─ AI Service:      http://localhost:8888"
    echo "  └─ Ollama:          http://localhost:11434"
    echo ""
    echo -e "${CYAN}Infrastructure:${NC}"
    echo "  ├─ PostgreSQL:      localhost:4001"
    echo "  ├─ Redis:           localhost:6380"
    echo "  ├─ Elasticsearch:   localhost:9200"
    echo "  ├─ RabbitMQ:        localhost:5674 (UI: 15674)"
    echo "  └─ MinIO:           localhost:9000 (UI: 9001)"
    echo ""
    echo -e "${CYAN}ML Stack:${NC}"
    echo "  ├─ Transcription:   WhisperX ${WHISPER_MODEL_SIZE}"
    echo "  ├─ Diarization:     pyannote.audio 3.1"
    echo "  └─ LLM:             Ollama/${OLLAMA_MODEL}"
    echo ""
    echo -e "${CYAN}Test Credentials:${NC}"
    echo "  ├─ Email:           admin@acme.com"
    echo "  └─ Password:        Demo123456!"
    echo ""
    echo -e "${YELLOW}Logs:${NC}"
    echo "  ├─ API:             tail -f /tmp/api-server.log"
    echo "  ├─ Web:             tail -f /tmp/web-server.log"
    echo "  └─ AI Service:      docker logs -f openmeet-service"
    echo ""
    echo -e "${GREEN}Open http://localhost:4200 in your browser to get started!${NC}"
    echo ""
}

# Cleanup function
cleanup() {
    log_step "Stopping Services"

    # Stop Node processes
    pkill -f "pnpm dev" || true
    pkill -f "next dev" || true
    pkill -f "ts-node" || true

    # Stop Docker containers
    docker-compose down

    log_success "All services stopped"
}

# Main execution
main() {
    print_banner

    echo ""
    echo -e "${CYAN}This script will set up the complete OpenMeet system:${NC}"
    echo "  • Infrastructure (PostgreSQL, Redis, Elasticsearch, RabbitMQ, MinIO)"
    echo "  • Ollama with ${OLLAMA_MODEL} LLM model"
    echo "  • AI Service with WhisperX ${WHISPER_MODEL_SIZE} + pyannote"
    echo "  • Node.js dependencies"
    echo "  • Database migrations and seed data"
    echo "  • API and Web servers"
    echo ""
    echo -e "${YELLOW}Estimated time: 10-20 minutes (depending on download speeds)${NC}"
    echo ""

    read -p "Continue with setup? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi

    # Trap for cleanup on error
    trap 'log_error "Setup failed. Check the logs above for errors."; exit 1' ERR

    check_prerequisites
    setup_environment
    start_infrastructure
    start_ollama
    start_ai_service
    install_dependencies
    setup_database
    start_application
    print_status
}

# Handle command line arguments
case "${1:-}" in
    --stop|stop)
        cleanup
        ;;
    --status|status)
        log_step "Service Status"
        docker-compose ps
        echo ""
        echo "API: $(curl -s http://localhost:4100/health 2>/dev/null || echo 'Not running')"
        echo "AI:  $(curl -s http://localhost:8888/health 2>/dev/null || echo 'Not running')"
        ;;
    --help|help|-h)
        echo "OpenMeet Setup Script"
        echo ""
        echo "Usage: ./setup.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (none)    Run full setup"
        echo "  stop      Stop all services"
        echo "  status    Show service status"
        echo "  help      Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  WHISPER_MODEL_SIZE  Whisper model (default: large-v3)"
        echo "  OLLAMA_MODEL        Ollama model (default: llama3.2)"
        ;;
    *)
        main
        ;;
esac
