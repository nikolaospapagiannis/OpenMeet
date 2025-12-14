#!/bin/bash
#
# OpenMeet - First-Time Setup Script
# Automatically sets up Docker containers, ML models, and all dependencies
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Print banner
print_banner() {
    echo ""
    echo -e "${CYAN}"
    echo "  ███╗   ██╗███████╗██████╗ ██╗   ██╗██╗      █████╗     █████╗ ██╗"
    echo "  ████╗  ██║██╔════╝██╔══██╗██║   ██║██║     ██╔══██╗   ██╔══██╗██║"
    echo "  ██╔██╗ ██║█████╗  ██████╔╝██║   ██║██║     ███████║   ███████║██║"
    echo "  ██║╚██╗██║██╔══╝  ██╔══██╗██║   ██║██║     ██╔══██║   ██╔══██║██║"
    echo "  ██║ ╚████║███████╗██████╔╝╚██████╔╝███████╗██║  ██║   ██║  ██║██║"
    echo "  ╚═╝  ╚═══╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝  ╚═╝╚═╝"
    echo -e "${NC}"
    echo -e "${BLUE}  Enterprise-Grade Meeting Intelligence Platform${NC}"
    echo -e "${YELLOW}  First-Time Setup Script v1.0${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"

    local missing=0

    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if [ "$NODE_VERSION" -ge 20 ]; then
            log_success "Node.js $(node -v) installed"
        else
            log_error "Node.js 20+ required (found $(node -v))"
            missing=1
        fi
    else
        log_error "Node.js not found"
        missing=1
    fi

    # Check pnpm
    if command -v pnpm &> /dev/null; then
        log_success "pnpm $(pnpm -v) installed"
    else
        log_warn "pnpm not found - installing..."
        npm install -g pnpm
        log_success "pnpm installed"
    fi

    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d ' ' -f 2)
        log_success "Python $PYTHON_VERSION installed"
    else
        log_error "Python 3 not found"
        missing=1
    fi

    # Check Docker
    if command -v docker &> /dev/null; then
        if docker info > /dev/null 2>&1; then
            log_success "Docker is running"
        else
            log_error "Docker is installed but not running. Please start Docker Desktop."
            missing=1
        fi
    else
        log_error "Docker not found"
        missing=1
    fi

    # Check Docker Compose
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        log_success "Docker Compose available"
    else
        log_error "Docker Compose not found"
        missing=1
    fi

    if [ $missing -ne 0 ]; then
        log_error "Missing prerequisites. Please install them and try again."
        exit 1
    fi

    log_success "All prerequisites met!"
}

# Setup environment file
setup_environment() {
    log_header "Setting Up Environment"

    cd "$PROJECT_ROOT"

    if [ -f ".env" ]; then
        log_warn ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            log_info "Keeping existing .env file"
            return
        fi
    fi

    # Copy example file
    cp .env.example .env
    log_success "Created .env file from template"

    # Generate secure secrets
    log_info "Generating secure secrets..."

    # Generate JWT secrets (32+ characters) - alphanumeric only to avoid sed issues
    JWT_SECRET=$(openssl rand -hex 24)
    JWT_REFRESH_SECRET=$(openssl rand -hex 24)
    ENCRYPTION_KEY=$(openssl rand -hex 16)

    # Update .env with secure values using perl for cross-platform compatibility
    perl -i -pe "s/REPLACE_WITH_SECURE_SECRET_MIN_32_CHARS/$JWT_SECRET/g" .env
    perl -i -pe "s/REPLACE_WITH_DIFFERENT_SECURE_SECRET_MIN_32_CHARS/$JWT_REFRESH_SECRET/g" .env
    perl -i -pe "s/REPLACE_WITH_32_CHARACTER_HEX_KEY/$ENCRYPTION_KEY/g" .env

    log_success "Generated secure JWT and encryption keys"
}

# Start Docker containers
start_docker_services() {
    log_header "Starting Docker Services"

    cd "$PROJECT_ROOT"

    # Stop any existing containers
    log_info "Stopping any existing containers..."
    docker-compose down --remove-orphans 2>/dev/null || true

    # Start infrastructure services (without vllm and app services for initial setup)
    log_info "Starting infrastructure services..."
    docker-compose up -d postgres redis elasticsearch rabbitmq minio

    # Wait for services
    log_info "Waiting for services to be healthy..."

    # Wait for PostgreSQL
    log_info "  Waiting for PostgreSQL..."
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U openmeet &> /dev/null; then
            log_success "  PostgreSQL is ready"
            break
        fi
        sleep 2
        echo -n "."
    done

    # Wait for Redis
    log_info "  Waiting for Redis..."
    for i in {1..20}; do
        if docker-compose exec -T redis redis-cli -a redis123 ping &> /dev/null; then
            log_success "  Redis is ready"
            break
        fi
        sleep 2
        echo -n "."
    done

    # Wait for Elasticsearch
    log_info "  Waiting for Elasticsearch..."
    for i in {1..60}; do
        if curl -sf http://localhost:9200/_cluster/health &> /dev/null; then
            log_success "  Elasticsearch is ready"
            break
        fi
        sleep 3
        echo -n "."
    done

    # Wait for RabbitMQ
    log_info "  Waiting for RabbitMQ..."
    for i in {1..30}; do
        if docker-compose exec -T rabbitmq rabbitmq-diagnostics ping &> /dev/null; then
            log_success "  RabbitMQ is ready"
            break
        fi
        sleep 2
        echo -n "."
    done

    # Wait for MinIO
    log_info "  Waiting for MinIO..."
    for i in {1..20}; do
        if curl -sf http://localhost:9000/minio/health/live &> /dev/null; then
            log_success "  MinIO is ready"
            break
        fi
        sleep 2
        echo -n "."
    done

    log_success "All Docker services are running!"
}

# Install Node.js dependencies
install_node_dependencies() {
    log_header "Installing Node.js Dependencies"

    cd "$PROJECT_ROOT"

    log_info "Installing dependencies with pnpm..."
    pnpm install

    log_success "Node.js dependencies installed!"
}

# Setup database
setup_database() {
    log_header "Setting Up Database"

    cd "$PROJECT_ROOT/apps/api"

    # Generate Prisma client
    log_info "Generating Prisma client..."
    DATABASE_URL="postgresql://openmeet:openmeet123@localhost:4001/openmeet_db" npx prisma generate

    # Push database schema (creates tables)
    log_info "Pushing database schema..."
    DATABASE_URL="postgresql://openmeet:openmeet123@localhost:4001/openmeet_db" npx prisma db push --force-reset 2>/dev/null || \
    DATABASE_URL="postgresql://openmeet:openmeet123@localhost:4001/openmeet_db" npx prisma db push

    # Seed database (optional)
    log_info "Seeding database with initial data..."
    DATABASE_URL="postgresql://openmeet:openmeet123@localhost:4001/openmeet_db" npx prisma db seed 2>/dev/null || log_warn "Seeding skipped (may not be configured)"

    log_success "Database setup complete!"
}

# Setup Python ML environment
setup_python_ml() {
    log_header "Setting Up Python ML Environment"

    cd "$PROJECT_ROOT/apps/ai-service"

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Upgrade pip
    log_info "Upgrading pip..."
    pip install --upgrade pip setuptools wheel

    # Install requirements
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt

    # Install ML requirements
    log_info "Installing ML dependencies (this may take a while)..."
    pip install -r requirements-ml.txt 2>/dev/null || log_warn "Some ML packages may need manual installation"

    log_success "Python environment setup complete!"
}

# Download ML models
download_ml_models() {
    log_header "Downloading ML Models"

    cd "$PROJECT_ROOT/apps/ai-service"

    # Activate virtual environment
    source venv/bin/activate

    # Create models directory
    mkdir -p "$PROJECT_ROOT/ml-models"

    # Download spaCy English model (already in requirements.txt but verify)
    log_info "Verifying spaCy English model..."
    python3 -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null || {
        log_info "Downloading spaCy model..."
        python3 -m spacy download en_core_web_sm
    }
    log_success "spaCy model ready"

    # Download NLTK data
    log_info "Downloading NLTK data..."
    python3 -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True); nltk.download('averaged_perceptron_tagger', quiet=True)"
    log_success "NLTK data downloaded"

    # Pre-download sentence-transformers model (for KeyBERT)
    log_info "Pre-loading sentence-transformers model (for keyword extraction)..."
    python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" 2>/dev/null || log_warn "Will download on first use"

    # Note about pyannote.audio
    log_warn "NOTE: pyannote.audio models require HuggingFace authentication."
    log_warn "To enable speaker diarization, set HF_TOKEN in your .env file"
    log_warn "Get your token from: https://huggingface.co/settings/tokens"

    # Note about faster-whisper
    log_info "faster-whisper models will be downloaded on first use"
    log_info "Default model: 'small' (~500MB)"

    log_success "ML models setup complete!"
}

# Print final status
print_status() {
    log_header "Setup Complete!"

    echo -e "${GREEN}OpenMeet has been set up successfully!${NC}"
    echo ""
    echo "Service URLs:"
    echo -e "  ${CYAN}Web App:${NC}         http://localhost:4200"
    echo -e "  ${CYAN}API Server:${NC}      http://localhost:4100"
    echo -e "  ${CYAN}AI Service:${NC}      http://localhost:5001"
    echo -e "  ${CYAN}WebSocket:${NC}       ws://localhost:5000"
    echo ""
    echo "Infrastructure:"
    echo -e "  ${BLUE}PostgreSQL:${NC}      localhost:4001 (openmeet/openmeet123)"
    echo -e "  ${BLUE}Redis:${NC}           localhost:6380 (redis123)"
    echo -e "  ${BLUE}Elasticsearch:${NC}   http://localhost:9200"
    echo -e "  ${BLUE}RabbitMQ:${NC}        http://localhost:15674 (openmeet/rabbit123)"
    echo -e "  ${BLUE}MinIO Console:${NC}   http://localhost:9001 (openmeet/minio123456)"
    echo ""
    echo "To start development servers:"
    echo -e "  ${YELLOW}pnpm dev${NC}           # Start all services"
    echo -e "  ${YELLOW}pnpm dev:web${NC}       # Start web frontend only"
    echo -e "  ${YELLOW}pnpm dev:api${NC}       # Start API server only"
    echo ""
    echo "To start the AI service:"
    echo -e "  ${YELLOW}cd apps/ai-service${NC}"
    echo -e "  ${YELLOW}source venv/bin/activate${NC}"
    echo -e "  ${YELLOW}uvicorn app.main:app --reload --port 5001${NC}"
    echo ""
    echo "Optional: For local LLM inference (GPU required):"
    echo -e "  ${YELLOW}docker-compose up -d vllm${NC}"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    print_banner

    # Parse arguments
    SKIP_DOCKER=false
    SKIP_PYTHON=false
    SKIP_MODELS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-python)
                SKIP_PYTHON=true
                shift
                ;;
            --skip-models)
                SKIP_MODELS=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-docker    Skip Docker container setup"
                echo "  --skip-python    Skip Python ML environment setup"
                echo "  --skip-models    Skip ML model downloads"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Run setup steps
    check_prerequisites
    setup_environment

    if [ "$SKIP_DOCKER" = false ]; then
        start_docker_services
    else
        log_warn "Skipping Docker setup"
    fi

    install_node_dependencies
    setup_database

    if [ "$SKIP_PYTHON" = false ]; then
        setup_python_ml

        if [ "$SKIP_MODELS" = false ]; then
            download_ml_models
        else
            log_warn "Skipping ML model downloads"
        fi
    else
        log_warn "Skipping Python setup"
    fi

    print_status
}

# Run main
main "$@"
