#!/bin/bash

# HONEST AUDIT SCRIPT - Detect Fake Implementations
# This script scans for common patterns that indicate fake/mock implementations

echo "════════════════════════════════════════════════════════════════"
echo "🔍 HONEST AUDIT - Detecting Fake Implementations"
echo "════════════════════════════════════════════════════════════════"
echo ""

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Function to search and report
search_pattern() {
    local pattern=$1
    local description=$2
    local severity=$3

    echo "Searching for: $description"

    results=$(grep -r "$pattern" \
        --include="*.ts" \
        --include="*.tsx" \
        --include="*.js" \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=dist \
        --exclude-dir=build \
        --exclude-dir=cypress \
        apps/ infrastructure/ 2>/dev/null || true)

    if [ ! -z "$results" ]; then
        if [ "$severity" = "HIGH" ]; then
            echo -e "${RED}❌ FOUND ($severity):${NC}"
            ISSUES_FOUND=$((ISSUES_FOUND + 10))
        elif [ "$severity" = "MEDIUM" ]; then
            echo -e "${YELLOW}⚠️  FOUND ($severity):${NC}"
            ISSUES_FOUND=$((ISSUES_FOUND + 5))
        else
            echo -e "${YELLOW}ℹ️  FOUND ($severity):${NC}"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
        echo "$results" | head -20
        count=$(echo "$results" | wc -l)
        echo -e "${YELLOW}Total occurrences: $count${NC}"
    else
        echo -e "${GREEN}✓ None found${NC}"
    fi
    echo ""
}

echo "1️⃣  FAKE ASYNC PATTERNS"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "return new Promise\(resolve => setTimeout" "Fake async with setTimeout" "HIGH"
search_pattern "await new Promise.*setTimeout" "Fake delay with setTimeout" "HIGH"
search_pattern "async.*return \[\]" "Async functions returning empty arrays" "MEDIUM"
search_pattern "async.*return {}" "Async functions returning empty objects" "MEDIUM"
search_pattern "async.*return null" "Async functions returning null" "LOW"

echo "2️⃣  HARDCODED RETURN VALUES"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "return { success: true }" "Hardcoded success returns" "HIGH"
search_pattern "return \[.*\].*// TODO" "Hardcoded array returns with TODO" "HIGH"
search_pattern "return { data: \[" "Hardcoded data returns" "MEDIUM"

echo "3️⃣  FAKE DATABASE QUERIES"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "// Mock database" "Mock database comments" "HIGH"
search_pattern "// Fake query" "Fake query comments" "HIGH"
search_pattern "// TODO: Implement database" "TODO database implementations" "HIGH"

echo "4️⃣  STUB IMPLEMENTATIONS"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "throw new Error\(.*not implemented" "Not implemented errors" "HIGH"
search_pattern "console.warn.*stub" "Stub warnings" "HIGH"
search_pattern "// STUB:" "Stub comments" "HIGH"

echo "5️⃣  HARDCODED DATA"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "const mockData = " "Mock data constants" "MEDIUM"
search_pattern "const fakeData = " "Fake data constants" "HIGH"
search_pattern "const stubData = " "Stub data constants" "HIGH"

echo "6️⃣  TODO/FIXME MARKERS"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "// TODO:" "TODO comments" "MEDIUM"
search_pattern "// FIXME:" "FIXME comments" "HIGH"
search_pattern "// HACK:" "HACK comments" "MEDIUM"

echo "7️⃣  CONSOLE STATEMENTS (Production Code)"
echo "─────────────────────────────────────────────────────────────────"
# Exclude test files
console_results=$(grep -r "console\." \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude="*test*" \
    --exclude="*spec*" \
    --exclude="*.cy.ts" \
    --exclude-dir=node_modules \
    --exclude-dir=cypress \
    apps/api/src apps/web/src 2>/dev/null | \
    grep -v "console.error" | \
    grep -v "// console" || true)

if [ ! -z "$console_results" ]; then
    echo -e "${YELLOW}⚠️  FOUND:${NC}"
    echo "$console_results" | head -20
    count=$(echo "$console_results" | wc -l)
    echo -e "${YELLOW}Total occurrences: $count${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 5))
else
    echo -e "${GREEN}✓ None found${NC}"
fi
echo ""

echo "8️⃣  PLACEHOLDER IMPLEMENTATIONS"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "placeholder" "Placeholder text" "MEDIUM"
search_pattern "example\.com" "Example domain usage" "LOW"
search_pattern "test@test.com" "Test email addresses" "LOW"

echo "9️⃣  FAKE API CALLS"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "// Simulating API call" "Simulated API calls" "HIGH"
search_pattern "// Mock API" "Mock API comments" "HIGH"

echo "🔟 INCOMPLETE ERROR HANDLING"
echo "─────────────────────────────────────────────────────────────────"
search_pattern "catch.*{}" "Empty catch blocks" "MEDIUM"
search_pattern "catch.*// ignore" "Ignored errors" "HIGH"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 AUDIT SUMMARY"
echo "════════════════════════════════════════════════════════════════"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ CLEAN - No major issues found!${NC}"
    echo "Production readiness: HIGH"
    exit 0
elif [ $ISSUES_FOUND -lt 20 ]; then
    echo -e "${YELLOW}⚠️  MINOR ISSUES - Score: $ISSUES_FOUND${NC}"
    echo "Production readiness: MEDIUM - Review recommended"
    exit 0
elif [ $ISSUES_FOUND -lt 50 ]; then
    echo -e "${YELLOW}⚠️  MODERATE ISSUES - Score: $ISSUES_FOUND${NC}"
    echo "Production readiness: LOW - Fixes required"
    exit 1
else
    echo -e "${RED}❌ MAJOR ISSUES - Score: $ISSUES_FOUND${NC}"
    echo "Production readiness: BLOCKED - Major refactoring needed"
    exit 1
fi
