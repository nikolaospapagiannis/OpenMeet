#!/bin/bash

###################################################################################
# Security Verification Script
# Runs comprehensive security checks and generates reports
###################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print header
print_header() {
    echo "========================================================================"
    echo "$1"
    echo "========================================================================"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

log_info "Starting security verification from: $PROJECT_ROOT"

# Create reports directory
mkdir -p infrastructure/security/reports
mkdir -p logs

FAILED_CHECKS=0
TOTAL_CHECKS=0

###################################################################################
# 1. Check Security Headers
###################################################################################
print_header "1. SECURITY HEADERS VERIFICATION"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking if security middleware exists..."
if [ -f "apps/api/src/middleware/security.ts" ]; then
    log_success "Security middleware found"

    # Check for critical security headers implementation
    if grep -q "helmet" "apps/api/src/middleware/security.ts"; then
        log_success "Helmet.js configured"
    else
        log_error "Helmet.js not found"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi

    if grep -q "contentSecurityPolicy" "apps/api/src/middleware/security.ts"; then
        log_success "Content Security Policy implemented"
    else
        log_error "Content Security Policy missing"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi

    if grep -q "hsts" "apps/api/src/middleware/security.ts"; then
        log_success "HSTS configured"
    else
        log_error "HSTS missing"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    log_error "Security middleware not found"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

###################################################################################
# 2. NPM Audit
###################################################################################
print_header "2. NPM DEPENDENCY SECURITY AUDIT"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Running npm audit..."
if npm audit --json > infrastructure/security/reports/npm-audit-raw.json 2>&1; then
    log_success "npm audit passed - no vulnerabilities found"
else
    # npm audit returns non-zero if vulnerabilities found
    AUDIT_RESULT=$(cat infrastructure/security/reports/npm-audit-raw.json)

    # Parse vulnerabilities
    CRITICAL=$(echo "$AUDIT_RESULT" | grep -o '"critical":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    HIGH=$(echo "$AUDIT_RESULT" | grep -o '"high":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    MODERATE=$(echo "$AUDIT_RESULT" | grep -o '"moderate":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    LOW=$(echo "$AUDIT_RESULT" | grep -o '"low":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")

    log_warning "Vulnerabilities found:"
    log_warning "  Critical: $CRITICAL"
    log_warning "  High: $HIGH"
    log_warning "  Moderate: $MODERATE"
    log_warning "  Low: $LOW"

    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        log_error "Critical or high severity vulnerabilities found!"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
fi

###################################################################################
# 3. Secrets Scanning
###################################################################################
print_header "3. SECRETS SCANNING"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Scanning for hardcoded secrets..."

# Check for common secret patterns
SECRETS_FOUND=0

# AWS Keys
if grep -r "AKIA[0-9A-Z]\{16\}" --include="*.ts" --include="*.js" --include="*.env" --exclude-dir=node_modules . 2>/dev/null; then
    log_error "Potential AWS Access Key found"
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Private Keys
if grep -r "BEGIN.*PRIVATE KEY" --include="*.ts" --include="*.js" --include="*.pem" --exclude-dir=node_modules . 2>/dev/null; then
    log_error "Private key found in codebase"
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Generic API keys (more permissive check)
API_KEY_COUNT=$(grep -r "api[_-]\?key.*['\"][a-zA-Z0-9]\{20,\}['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules . 2>/dev/null | grep -v "process.env" | grep -v "example" | grep -v "placeholder" | wc -l || echo "0")
if [ "$API_KEY_COUNT" -gt 0 ]; then
    log_warning "Potential hardcoded API keys found: $API_KEY_COUNT instances"
fi

if [ "$SECRETS_FOUND" -gt 0 ]; then
    log_error "Secrets detected in codebase!"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
    log_success "No secrets detected"
fi

###################################################################################
# 4. Security Configuration Check
###################################################################################
print_header "4. SECURITY CONFIGURATION"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking security configurations..."

CONFIG_ISSUES=0

# Check for .env files in git
if git ls-files | grep "\.env$" > /dev/null 2>&1; then
    log_error ".env files are tracked in git"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
else
    log_success ".env files not tracked in git"
fi

# Check for proper .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env" ".gitignore"; then
        log_success ".env in .gitignore"
    else
        log_error ".env not in .gitignore"
        CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
    fi

    if grep -q "node_modules" ".gitignore"; then
        log_success "node_modules in .gitignore"
    else
        log_warning "node_modules not in .gitignore"
    fi
else
    log_error ".gitignore not found"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
fi

# Check for security scripts
if [ -f "infrastructure/security/security-scan.ts" ]; then
    log_success "Security scanner script exists"
else
    log_error "Security scanner script missing"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
fi

if [ -f "infrastructure/security/pen-test.ts" ]; then
    log_success "Penetration test script exists"
else
    log_error "Penetration test script missing"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
fi

if [ "$CONFIG_ISSUES" -gt 0 ]; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

###################################################################################
# 5. Authentication & Authorization Check
###################################################################################
print_header "5. AUTHENTICATION & AUTHORIZATION"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking authentication implementation..."

AUTH_ISSUES=0

if [ -f "apps/api/src/middleware/auth.ts" ]; then
    log_success "Auth middleware exists"

    # Check for JWT implementation
    if grep -q "jsonwebtoken\|jwt" "apps/api/src/middleware/auth.ts"; then
        log_success "JWT authentication configured"
    else
        log_warning "JWT not found in auth middleware"
    fi
else
    log_error "Auth middleware not found"
    AUTH_ISSUES=$((AUTH_ISSUES + 1))
fi

if [ "$AUTH_ISSUES" -gt 0 ]; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

###################################################################################
# 6. CORS Configuration Check
###################################################################################
print_header "6. CORS CONFIGURATION"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking CORS configuration..."

CORS_ISSUES=0

if grep -q "strictCorsOptions" "apps/api/src/middleware/security.ts"; then
    log_success "Strict CORS configuration found"
else
    log_error "Strict CORS configuration missing"
    CORS_ISSUES=$((CORS_ISSUES + 1))
fi

# Check for wildcard CORS (security risk)
if grep -r "origin.*\*" --include="*.ts" --include="*.js" apps/api/src/ 2>/dev/null | grep -v "comment" | grep -v "//"; then
    log_warning "Wildcard CORS detected - potential security risk"
fi

if [ "$CORS_ISSUES" -gt 0 ]; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

###################################################################################
# 7. Rate Limiting Check
###################################################################################
print_header "7. RATE LIMITING"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking rate limiting configuration..."

RATE_LIMIT_ISSUES=0

if grep -q "generalRateLimit\|authRateLimit" "apps/api/src/middleware/security.ts"; then
    log_success "Rate limiting configured"

    # Check if rate limiting is applied
    if grep -q "generalRateLimit" "apps/api/src/index.ts"; then
        log_success "Rate limiting applied to API"
    else
        log_error "Rate limiting not applied"
        RATE_LIMIT_ISSUES=$((RATE_LIMIT_ISSUES + 1))
    fi
else
    log_error "Rate limiting not configured"
    RATE_LIMIT_ISSUES=$((RATE_LIMIT_ISSUES + 1))
fi

if [ "$RATE_LIMIT_ISSUES" -gt 0 ]; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

###################################################################################
# 8. SQL Injection Protection
###################################################################################
print_header "8. SQL INJECTION PROTECTION"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking SQL injection protection..."

SQL_ISSUES=0

if grep -q "sqlInjectionProtection" "apps/api/src/middleware/security.ts"; then
    log_success "SQL injection protection middleware exists"
else
    log_error "SQL injection protection missing"
    SQL_ISSUES=$((SQL_ISSUES + 1))
fi

# Check for unsafe SQL queries (string concatenation in queries)
if grep -r '\`SELECT.*\${' --include="*.ts" --include="*.js" apps/ 2>/dev/null | grep -v "test"; then
    log_warning "Potential unsafe SQL queries found (string interpolation)"
fi

if [ "$SQL_ISSUES" -gt 0 ]; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

###################################################################################
# 9. XSS Protection
###################################################################################
print_header "9. XSS PROTECTION"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking XSS protection..."

XSS_ISSUES=0

if grep -q "xssProtection" "apps/api/src/middleware/security.ts"; then
    log_success "XSS protection middleware exists"
else
    log_error "XSS protection missing"
    XSS_ISSUES=$((XSS_ISSUES + 1))
fi

if [ "$XSS_ISSUES" -gt 0 ]; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

###################################################################################
# 10. TypeScript Compilation Check
###################################################################################
print_header "10. TYPESCRIPT COMPILATION"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
    log_success "TypeScript compilation successful"
else
    log_warning "TypeScript compilation has warnings/errors (non-blocking)"
fi

###################################################################################
# SUMMARY
###################################################################################
print_header "SECURITY VERIFICATION SUMMARY"

echo ""
echo "Total Checks: $TOTAL_CHECKS"
echo "Passed: $((TOTAL_CHECKS - FAILED_CHECKS))"
echo "Failed: $FAILED_CHECKS"
echo ""

if [ "$FAILED_CHECKS" -eq 0 ]; then
    log_success "🎉 All security checks passed!"
    echo ""
    log_success "✅ Security headers configured"
    log_success "✅ No critical vulnerabilities"
    log_success "✅ No secrets exposed"
    log_success "✅ Security middleware implemented"
    echo ""
    exit 0
else
    log_error "❌ $FAILED_CHECKS security check(s) failed"
    echo ""
    log_error "Please review the errors above and fix security issues before deployment"
    echo ""
    exit 1
fi
