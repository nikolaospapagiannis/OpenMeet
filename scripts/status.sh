#!/bin/bash
#
# OpenMeet Development Environment Status Script
#

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  OpenMeet Development Environment Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_ROOT"

# Docker containers status
echo -e "${BLUE}Docker Containers:${NC}"
echo ""
docker-compose ps 2>/dev/null || echo "Docker Compose not available"

echo ""
echo -e "${BLUE}Port Status:${NC}"
echo ""

check_port() {
    local port=$1
    local name=$2
    local pid=""

    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        pid=$(netstat -ano 2>/dev/null | grep ":$port " | grep "LISTENING" | awk '{print $5}' | head -1)
    else
        pid=$(lsof -ti:$port 2>/dev/null || true)
    fi

    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
        echo -e "  ${GREEN}●${NC} Port $port ($name) - PID: $pid"
    else
        echo -e "  ${RED}○${NC} Port $port ($name) - Not in use"
    fi
}

check_port 3000 "Next.js Web"
check_port 4000 "API Server"
check_port 5432 "PostgreSQL"
check_port 6380 "Redis"
check_port 27017 "MongoDB"
check_port 9200 "Elasticsearch"
check_port 5674 "RabbitMQ"
check_port 9000 "MinIO"

echo ""
echo -e "${BLUE}Service Health:${NC}"
echo ""

# Check API health
api_health=$(curl -s http://localhost:4000/health 2>/dev/null || echo "")
if [ -n "$api_health" ]; then
    echo -e "  ${GREEN}●${NC} API: Healthy"
else
    echo -e "  ${RED}○${NC} API: Not responding"
fi

# Check Redis
redis_ping=$(docker exec openmeet-redis redis-cli -a redis123 PING 2>/dev/null || echo "")
if [ "$redis_ping" == "PONG" ]; then
    echo -e "  ${GREEN}●${NC} Redis: Healthy"
else
    echo -e "  ${RED}○${NC} Redis: Not responding"
fi

# Check PostgreSQL
pg_ready=$(docker exec openmeet-postgres pg_isready -U openmeet 2>/dev/null || echo "")
if [[ "$pg_ready" == *"accepting connections"* ]]; then
    echo -e "  ${GREEN}●${NC} PostgreSQL: Healthy"
else
    echo -e "  ${RED}○${NC} PostgreSQL: Not responding"
fi

echo ""
