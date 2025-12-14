#!/bin/bash
#
# OpenMeet Development Environment Startup Script
# Handles port conflicts, service dependencies, and health checks
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Required ports and their services
declare -A PORTS=(
    [3000]="Next.js Web"
    [4000]="API Server"
    [5432]="PostgreSQL"
    [6380]="Redis"
    [27017]="MongoDB"
    [9200]="Elasticsearch"
    [5674]="RabbitMQ"
    [15674]="RabbitMQ Management"
    [9000]="MinIO"
    [9001]="MinIO Console"
)

# Service groups for ordered startup
INFRA_SERVICES="postgres redis mongodb elasticsearch rabbitmq minio"
APP_SERVICES="api"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if running on Windows
is_windows() {
    [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]
}

# Get PID using a port
get_pid_on_port() {
    local port=$1
    if is_windows; then
        netstat -ano 2>/dev/null | grep ":$port " | grep "LISTENING" | awk '{print $5}' | head -1
    else
        lsof -ti:$port 2>/dev/null || true
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    local service_name=${PORTS[$port]:-"Unknown"}
    local pid=$(get_pid_on_port $port)

    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
        log_warn "Port $port ($service_name) is in use by PID $pid"
        if is_windows; then
            taskkill //F //PID $pid 2>/dev/null && log_success "Killed process $pid on port $port" || true
        else
            kill -9 $pid 2>/dev/null && log_success "Killed process $pid on port $port" || true
        fi
        sleep 1
    fi
}

# Check if port is available
check_port() {
    local port=$1
    local pid=$(get_pid_on_port $port)
    [ -z "$pid" ] || [ "$pid" == "0" ]
}

# Free all required ports
free_ports() {
    log_header "Checking and Freeing Ports"

    local ports_freed=0
    for port in "${!PORTS[@]}"; do
        if ! check_port $port; then
            kill_port $port
            ((ports_freed++))
        else
            log_success "Port $port (${PORTS[$port]}) is available"
        fi
    done

    if [ $ports_freed -gt 0 ]; then
        log_info "Freed $ports_freed port(s)"
        sleep 2
    fi
}

# Check Docker status
check_docker() {
    log_header "Checking Docker"

    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running! Please start Docker Desktop first."
        exit 1
    fi

    log_success "Docker is running"

    # Check Docker Compose
    if ! docker-compose version > /dev/null 2>&1; then
        log_error "Docker Compose is not available!"
        exit 1
    fi

    log_success "Docker Compose is available"
}

# Stop existing containers
stop_containers() {
    log_header "Stopping Existing Containers"

    cd "$PROJECT_ROOT"
    docker-compose down --remove-orphans 2>/dev/null || true
    log_success "Stopped existing containers"
}

# Start infrastructure services
start_infrastructure() {
    log_header "Starting Infrastructure Services"

    cd "$PROJECT_ROOT"

    for service in $INFRA_SERVICES; do
        log_info "Starting $service..."
        docker-compose up -d $service 2>/dev/null
        sleep 2
    done

    log_success "Infrastructure services started"
}

# Wait for service to be healthy
wait_for_service() {
    local service=$1
    local max_attempts=${2:-30}
    local attempt=1

    log_info "Waiting for $service to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        local status=$(docker-compose ps $service 2>/dev/null | grep -i "healthy\|running" || true)
        if [ -n "$status" ]; then
            log_success "$service is healthy"
            return 0
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    log_warn "$service may not be fully healthy yet"
    return 1
}

# Wait for all infrastructure
wait_for_infrastructure() {
    log_header "Waiting for Infrastructure Health"

    cd "$PROJECT_ROOT"

    # Wait for specific services
    wait_for_service "postgres" 30
    wait_for_service "redis" 20
    wait_for_service "mongodb" 30
    wait_for_service "elasticsearch" 60
    wait_for_service "rabbitmq" 30
    wait_for_service "minio" 20

    log_success "Infrastructure is ready"
}

# Start application services
start_applications() {
    log_header "Starting Application Services"

    cd "$PROJECT_ROOT"

    for service in $APP_SERVICES; do
        log_info "Starting $service..."
        docker-compose up -d --build $service 2>/dev/null
    done

    # Wait for API to be ready
    wait_for_service "api" 60

    log_success "Application services started"
}

# Start Next.js dev server
start_web() {
    log_header "Starting Web Development Server"

    cd "$PROJECT_ROOT/apps/web"

    # Check if already running
    if check_port 3000; then
        log_info "Starting Next.js dev server on port 3000..."
        pnpm dev &
        sleep 5

        if ! check_port 3000; then
            log_success "Next.js dev server is running on http://localhost:3000"
        else
            log_warn "Next.js may still be starting..."
        fi
    else
        log_warn "Port 3000 is already in use - Next.js may already be running"
    fi
}

# Verify all services
verify_services() {
    log_header "Verifying Services"

    local all_ok=true

    # Check infrastructure
    for service in $INFRA_SERVICES; do
        local status=$(docker-compose ps $service 2>/dev/null | grep -i "up\|running" || true)
        if [ -n "$status" ]; then
            log_success "$service is running"
        else
            log_error "$service is NOT running"
            all_ok=false
        fi
    done

    # Check API
    local api_response=$(curl -s http://localhost:4000/health 2>/dev/null || echo "")
    if [ -n "$api_response" ]; then
        log_success "API is responding on http://localhost:4000"
    else
        log_warn "API may still be starting..."
    fi

    # Check Web
    if ! check_port 3000; then
        log_success "Web server is running on http://localhost:3000"
    else
        log_warn "Web server is not running (start manually with: cd apps/web && pnpm dev)"
    fi

    echo ""
    if $all_ok; then
        log_success "All services are running!"
    else
        log_warn "Some services may need attention"
    fi
}

# Print summary
print_summary() {
    log_header "Service URLs"

    echo -e "  ${GREEN}Web App:${NC}              http://localhost:3000"
    echo -e "  ${GREEN}API:${NC}                  http://localhost:4000"
    echo -e "  ${GREEN}API Health:${NC}           http://localhost:4000/health"
    echo -e "  ${GREEN}GraphQL:${NC}              http://localhost:4000/graphql"
    echo ""
    echo -e "  ${BLUE}PostgreSQL:${NC}           localhost:5432"
    echo -e "  ${BLUE}Redis:${NC}                localhost:6380"
    echo -e "  ${BLUE}MongoDB:${NC}              localhost:27017"
    echo -e "  ${BLUE}Elasticsearch:${NC}        http://localhost:9200"
    echo -e "  ${BLUE}RabbitMQ:${NC}             http://localhost:15674"
    echo -e "  ${BLUE}MinIO Console:${NC}        http://localhost:9001"
    echo ""
    echo -e "  ${YELLOW}Default Credentials:${NC}"
    echo -e "    PostgreSQL: openmeet / openmeet123"
    echo -e "    Redis: redis123"
    echo -e "    MongoDB: openmeet / mongo123"
    echo -e "    RabbitMQ: openmeet / rabbit123"
    echo -e "    MinIO: openmeet / minio123"
    echo ""
}

# Main execution
main() {
    log_header "OpenMeet Development Environment"
    echo "Starting all services..."

    # Parse arguments
    local skip_web=false
    local rebuild=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-web)
                skip_web=true
                shift
                ;;
            --rebuild)
                rebuild=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --no-web     Skip starting the Next.js dev server"
                echo "  --rebuild    Force rebuild of Docker images"
                echo "  --help       Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Run steps
    check_docker
    free_ports
    stop_containers
    start_infrastructure
    wait_for_infrastructure

    if $rebuild; then
        log_info "Rebuilding application images..."
        cd "$PROJECT_ROOT"
        docker-compose build --no-cache $APP_SERVICES
    fi

    start_applications

    if ! $skip_web; then
        start_web
    fi

    verify_services
    print_summary

    log_success "Startup complete!"
}

# Run main
main "$@"
