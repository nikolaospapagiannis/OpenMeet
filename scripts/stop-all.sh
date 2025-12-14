#!/bin/bash
#
# OpenMeet Development Environment Stop Script
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Stopping OpenMeet Development Environment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_ROOT"

# Stop Docker containers
echo -e "${BLUE}[INFO]${NC} Stopping Docker containers..."
docker-compose down --remove-orphans

# Kill Next.js dev server if running
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
        taskkill //F //PID %%a 2>/dev/null || true
    )
else
    # Unix
    pkill -f "next dev" 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

echo -e "${GREEN}[OK]${NC} All services stopped"
echo ""
