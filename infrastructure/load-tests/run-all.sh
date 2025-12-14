#!/bin/bash

##############################################################################
# Artillery Load Test Execution Script
# Runs all load test scenarios and generates comprehensive reports
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="./reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_ID="load-test-${TIMESTAMP}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Artillery Load Test Suite${NC}"
echo -e "${BLUE}  Run ID: ${RUN_ID}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create reports directory
mkdir -p "${REPORT_DIR}/${RUN_ID}"

# Function to run a test scenario
run_test() {
    local test_name=$1
    local test_file=$2
    local duration=$3

    echo -e "${YELLOW}[${test_name}]${NC} Starting load test..."
    echo -e "  File: ${test_file}"
    echo -e "  Expected duration: ~${duration} minutes"
    echo ""

    local report_file="${REPORT_DIR}/${RUN_ID}/${test_name}-report.json"
    local html_file="${REPORT_DIR}/${RUN_ID}/${test_name}-report.html"

    # Run Artillery with JSON output
    if artillery run \
        --output "${report_file}" \
        "${test_file}"; then
        echo -e "${GREEN}[${test_name}]${NC} ✓ Test completed successfully"

        # Generate HTML report
        if [ -f "${report_file}" ]; then
            artillery report --output "${html_file}" "${report_file}" 2>/dev/null || true
        fi
    else
        echo -e "${RED}[${test_name}]${NC} ✗ Test failed"
        return 1
    fi

    echo ""
}

# Check if Artillery is installed
if ! command -v artillery &> /dev/null; then
    echo -e "${RED}Error: Artillery is not installed${NC}"
    echo "Install it with: npm install -g artillery"
    exit 1
fi

# Check if API is running
echo -e "${BLUE}Checking if API is running...${NC}"
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${YELLOW}⚠ Warning: API might not be running at http://localhost:4000${NC}"
    echo -e "  Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Test execution order (from lightest to heaviest)
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Execution Plan${NC}"
echo -e "${BLUE}========================================${NC}"
echo "1. API Health & Endpoints (5 min)"
echo "2. Authentication (5 min)"
echo "3. Search Operations (8 min)"
echo "4. Meeting Upload (10 min)"
echo "5. WebSocket Connections (12 min)"
echo ""
echo -e "${YELLOW}Total estimated time: ~40 minutes${NC}"
echo ""
read -p "Press Enter to start load tests or Ctrl+C to cancel..."

# 1. Main API Load Test
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test 1/5: Main API Load Test${NC}"
echo -e "${BLUE}========================================${NC}"
run_test "api-load" "./api-load-test.yml" "5"

# 2. Authentication Load Test (1000 concurrent users)
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test 2/5: Authentication Load Test${NC}"
echo -e "${BLUE}  Target: 1000 concurrent users${NC}"
echo -e "${BLUE}========================================${NC}"
run_test "auth-load" "./scenarios/auth-load.yml" "5"

# 3. Search Load Test (2000 concurrent searches)
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test 3/5: Search Load Test${NC}"
echo -e "${BLUE}  Target: 2000 concurrent searches${NC}"
echo -e "${BLUE}========================================${NC}"
run_test "search-load" "./scenarios/search-load.yml" "8"

# 4. Meeting Upload Test (500 concurrent uploads)
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test 4/5: Meeting Upload Load Test${NC}"
echo -e "${BLUE}  Target: 500 concurrent uploads${NC}"
echo -e "${BLUE}========================================${NC}"
run_test "meeting-upload" "./scenarios/meeting-upload.yml" "10"

# 5. WebSocket Load Test (1000 concurrent connections)
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test 5/5: WebSocket Load Test${NC}"
echo -e "${BLUE}  Target: 1000 concurrent connections${NC}"
echo -e "${BLUE}========================================${NC}"
run_test "websocket-load" "./scenarios/websocket-load.yml" "12"

# Generate summary report
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Generating Summary Report${NC}"
echo -e "${BLUE}========================================${NC}"

SUMMARY_FILE="${REPORT_DIR}/${RUN_ID}/summary.md"

cat > "${SUMMARY_FILE}" << EOF
# Load Test Summary Report

**Run ID:** ${RUN_ID}
**Date:** $(date)
**Duration:** ~40 minutes

## Tests Executed

### 1. Main API Load Test
- **File:** api-load-test.yml
- **Target:** 5000 req/sec sustained load
- **Status:** See api-load-report.html

### 2. Authentication Load Test
- **File:** scenarios/auth-load.yml
- **Target:** 1000 concurrent users
- **Scenarios:** Login, Registration, Token Refresh, Logout
- **Status:** See auth-load-report.html

### 3. Search Load Test
- **File:** scenarios/search-load.yml
- **Target:** 2000 concurrent searches
- **Scenarios:** Full-text search, Transcription search, Filtered search, Autocomplete
- **Status:** See search-load-report.html

### 4. Meeting Upload Load Test
- **File:** scenarios/meeting-upload.yml
- **Target:** 500 concurrent uploads
- **Scenarios:** File upload, Metadata update, Bulk creation
- **Status:** See meeting-upload-report.html

### 5. WebSocket Load Test
- **File:** scenarios/websocket-load.yml
- **Target:** 1000 concurrent connections
- **Scenarios:** Live meetings, Real-time transcription, Collaboration events
- **Status:** See websocket-load-report.html

## Performance SLA Targets

- **Max Error Rate:** < 1%
- **P95 Response Time:** < 200ms (API), < 50ms (WebSocket)
- **P99 Response Time:** < 500ms (API), < 100ms (WebSocket)

## Reports Location

All reports are saved in: \`${REPORT_DIR}/${RUN_ID}/\`

### Report Files
- HTML reports: *-report.html (interactive)
- JSON reports: *-report.json (raw data)
- Summary: summary.md (this file)

## Next Steps

1. Review HTML reports for detailed metrics
2. Analyze bottlenecks identified
3. Compare with performance baseline
4. Implement optimizations
5. Re-run tests to verify improvements

## Quick Analysis

To view HTML reports, open them in a browser:
\`\`\`bash
open ${REPORT_DIR}/${RUN_ID}/api-load-report.html
\`\`\`

To extract key metrics:
\`\`\`bash
cat ${REPORT_DIR}/${RUN_ID}/*-report.json | jq '.aggregate'
\`\`\`
EOF

echo -e "${GREEN}✓ Summary report generated: ${SUMMARY_FILE}${NC}"
echo ""

# Print summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Load Test Suite Complete! ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Reports saved to: ${YELLOW}${REPORT_DIR}/${RUN_ID}/${NC}"
echo ""
echo -e "${BLUE}Quick Stats:${NC}"
if [ -f "${REPORT_DIR}/${RUN_ID}/api-load-report.json" ]; then
    echo -e "  Main API Test:"
    cat "${REPORT_DIR}/${RUN_ID}/api-load-report.json" | jq -r '.aggregate | "    Requests: \(.requestsCompleted) | Errors: \(.errors // 0) | P95: \(.p95)ms | P99: \(.p99)ms"' 2>/dev/null || echo "    (Report parsing failed)"
fi
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Open HTML reports: ${REPORT_DIR}/${RUN_ID}/*-report.html"
echo "  2. Review summary: ${SUMMARY_FILE}"
echo "  3. Analyze bottlenecks and optimize"
echo ""
echo -e "${GREEN}✓ All tests completed successfully!${NC}"
