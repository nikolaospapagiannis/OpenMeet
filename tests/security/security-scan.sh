#!/bin/bash

# Security Scanning Script for OpenMeet
# Runs automated security checks before production deployment
#
# Usage: ./security-scan.sh [--quick|--full]
#
# Requirements:
#   - npm (for npm audit)
#   - python3 (for safety check)
#   - docker (for container scanning)
#   - git (for secret scanning)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCAN_MODE="${1:---full}"

# Create report directory
mkdir -p "$REPORT_DIR"

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

print_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Track findings
CRITICAL_FINDINGS=0
HIGH_FINDINGS=0
MEDIUM_FINDINGS=0
LOW_FINDINGS=0

# 1. Dependency Vulnerability Scanning
scan_dependencies() {
    print_header "1. Dependency Vulnerability Scanning"

    # npm audit for Node.js dependencies
    log_info "Running npm audit..."
    if npm audit --json > "$REPORT_DIR/npm-audit-$TIMESTAMP.json" 2>&1; then
        log_success "npm audit completed - No vulnerabilities found"
    else
        log_warning "npm audit found vulnerabilities"
        npm audit --parseable | grep -E "critical|high" && HIGH_FINDINGS=$((HIGH_FINDINGS + 1)) || true
    fi

    # Check Python dependencies (AI service)
    if [ -f "apps/ai-service/requirements.txt" ]; then
        log_info "Checking Python dependencies..."
        if command_exists safety; then
            cd apps/ai-service
            safety check --json > "../../$REPORT_DIR/safety-check-$TIMESTAMP.json" 2>&1 || log_warning "safety check found vulnerabilities"
            cd ../..
        else
            log_warning "safety not installed - skipping Python dependency check"
            log_info "Install with: pip install safety"
        fi
    fi

    # Check for outdated packages
    log_info "Checking for outdated packages..."
    npm outdated > "$REPORT_DIR/npm-outdated-$TIMESTAMP.txt" 2>&1 || true
}

# 2. Secret Scanning
scan_secrets() {
    print_header "2. Secret Scanning"

    log_info "Scanning for hardcoded secrets..."

    # Common secret patterns
    PATTERNS=(
        "password\s*=\s*['\"][^'\"]*['\"]"
        "api[_-]?key\s*=\s*['\"][^'\"]*['\"]"
        "secret\s*=\s*['\"][^'\"]*['\"]"
        "token\s*=\s*['\"][^'\"]*['\"]"
        "aws[_-]?access[_-]?key"
        "private[_-]?key"
        "sk[-_][a-zA-Z0-9]{20,}"
        "pk[-_][a-zA-Z0-9]{20,}"
    )

    SECRETS_FOUND=0
    for pattern in "${PATTERNS[@]}"; do
        results=$(grep -rE "$pattern" --include="*.js" --include="*.ts" --include="*.py" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null || true)
        if [ -n "$results" ]; then
            echo "$results" >> "$REPORT_DIR/secrets-scan-$TIMESTAMP.txt"
            SECRETS_FOUND=$((SECRETS_FOUND + 1))
        fi
    done

    if [ $SECRETS_FOUND -gt 0 ]; then
        log_error "Found potential hardcoded secrets - Review $REPORT_DIR/secrets-scan-$TIMESTAMP.txt"
        CRITICAL_FINDINGS=$((CRITICAL_FINDINGS + 1))
    else
        log_success "No hardcoded secrets detected"
    fi
}

# 3. Docker Image Scanning
scan_docker_images() {
    print_header "3. Docker Image Vulnerability Scanning"

    if ! command_exists docker; then
        log_warning "Docker not installed - skipping image scanning"
        return
    fi

    # Scan base images
    IMAGES=("node:22" "python:3.11" "postgres:15" "mongo:7" "redis:7")

    for image in "${IMAGES[@]}"; do
        log_info "Scanning $image..."
        if command_exists trivy; then
            trivy image --severity HIGH,CRITICAL "$image" > "$REPORT_DIR/docker-scan-${image//:/}_$TIMESTAMP.txt" 2>&1 || log_warning "Vulnerabilities found in $image"
        else
            log_warning "trivy not installed - cannot scan Docker images"
            log_info "Install with: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
            break
        fi
    done
}

# 4. Static Application Security Testing (SAST)
run_sast() {
    print_header "4. Static Application Security Testing (SAST)"

    # ESLint security plugin
    log_info "Running ESLint security rules..."
    if npm list eslint-plugin-security >/dev/null 2>&1; then
        npx eslint --ext .js,.ts apps/ --format json > "$REPORT_DIR/eslint-security-$TIMESTAMP.json" 2>&1 || log_warning "ESLint found security issues"
    else
        log_warning "eslint-plugin-security not installed"
    fi

    # TypeScript strict null checks
    log_info "Checking TypeScript configuration..."
    if grep -q "\"strict\": true" tsconfig.json; then
        log_success "TypeScript strict mode enabled"
    else
        log_warning "TypeScript strict mode not enabled"
        MEDIUM_FINDINGS=$((MEDIUM_FINDINGS + 1))
    fi
}

# 5. Security Headers Check
check_security_headers() {
    print_header "5. Security Headers Check"

    log_info "Checking security header configuration..."

    # Check Helmet.js usage
    if grep -rq "helmet()" --include="*.js" --include="*.ts" apps/api/; then
        log_success "Helmet.js configured"
    else
        log_error "Helmet.js not found in API service"
        HIGH_FINDINGS=$((HIGH_FINDINGS + 1))
    fi

    # Check CSP configuration
    if grep -rq "Content-Security-Policy" --include="*.json" --include="*.ts" --include="*.js" .; then
        log_success "Content Security Policy configured"
    else
        log_warning "Content Security Policy not configured"
        MEDIUM_FINDINGS=$((MEDIUM_FINDINGS + 1))
    fi
}

# 6. Authentication & Authorization Checks
check_auth_security() {
    print_header "6. Authentication & Authorization Security"

    log_info "Checking authentication implementation..."

    # Check for JWT usage
    if grep -rq "jsonwebtoken" --include="package.json" .; then
        log_success "JWT authentication library found"

        # Check for JWT secret in environment
        if grep -rq "JWT_SECRET" --include=".env.example" .; then
            log_success "JWT secret configured via environment"
        else
            log_warning "JWT_SECRET not found in .env.example"
        fi
    else
        log_error "JWT library not found"
        CRITICAL_FINDINGS=$((CRITICAL_FINDINGS + 1))
    fi

    # Check for bcrypt usage
    if grep -rq "bcrypt" --include="package.json" .; then
        log_success "bcrypt for password hashing found"
    else
        log_error "bcrypt not found - passwords may not be hashed properly"
        CRITICAL_FINDINGS=$((CRITICAL_FINDINGS + 1))
    fi

    # Check rate limiting
    if grep -rq "express-rate-limit" --include="package.json" .; then
        log_success "Rate limiting library found"
    else
        log_warning "Rate limiting not configured"
        HIGH_FINDINGS=$((HIGH_FINDINGS + 1))
    fi
}

# 7. Input Validation Checks
check_input_validation() {
    print_header "7. Input Validation"

    log_info "Checking input validation..."

    # Check for validation middleware
    if grep -rq "express-validator\|joi\|yup" --include="package.json" .; then
        log_success "Input validation library found"
    else
        log_error "No input validation library found"
        CRITICAL_FINDINGS=$((CRITICAL_FINDINGS + 1))
    fi

    # Check for SQL injection protection (Prisma)
    if grep -rq "\"@prisma/client\"" --include="package.json" .; then
        log_success "Prisma ORM found (SQL injection protection)"
    else
        log_warning "ORM not detected - verify SQL injection protection"
        HIGH_FINDINGS=$((HIGH_FINDINGS + 1))
    fi
}

# 8. HTTPS/TLS Configuration
check_tls_config() {
    print_header "8. HTTPS/TLS Configuration"

    log_info "Checking TLS configuration..."

    # Check for HTTPS redirect
    if grep -rq "if.*http" --include="*.js" --include="*.ts" apps/; then
        log_info "HTTP to HTTPS redirect logic found"
    else
        log_warning "HTTPS redirect not detected in code"
    fi

    # Check for secure cookie settings
    if grep -rq "secure: true" --include="*.js" --include="*.ts" apps/; then
        log_success "Secure cookie flag found"
    else
        log_warning "Secure cookie flag not found"
        MEDIUM_FINDINGS=$((MEDIUM_FINDINGS + 1))
    fi
}

# 9. Environment Variable Check
check_env_vars() {
    print_header "9. Environment Variable Security"

    log_info "Checking environment variable configuration..."

    if [ -f ".env" ]; then
        log_error ".env file found in repository root - should be .gitignored"
        CRITICAL_FINDINGS=$((CRITICAL_FINDINGS + 1))
    else
        log_success ".env file not in repository (good practice)"
    fi

    if [ -f ".env.example" ]; then
        log_success ".env.example found for documentation"
    else
        log_warning ".env.example not found"
    fi

    # Check .gitignore
    if grep -q ".env" .gitignore 2>/dev/null; then
        log_success ".env properly gitignored"
    else
        log_error ".env not in .gitignore"
        CRITICAL_FINDINGS=$((CRITICAL_FINDINGS + 1))
    fi
}

# 10. Database Security
check_database_security() {
    print_header "10. Database Security"

    log_info "Checking database security practices..."

    # Check for database connection encryption
    if grep -rq "ssl.*true\|sslmode.*require" --include=".env.example" --include="*.ts" .; then
        log_success "Database SSL/TLS configuration found"
    else
        log_warning "Database SSL/TLS not explicitly configured"
        MEDIUM_FINDINGS=$((MEDIUM_FINDINGS + 1))
    fi

    # Check for database credential management
    if grep -rq "DATABASE_URL\|MONGODB_URI" --include=".env.example" .; then
        log_success "Database credentials via environment variables"
    else
        log_warning "Database connection not via environment variables"
    fi
}

# 11. API Security
check_api_security() {
    print_header "11. API Security"

    log_info "Checking API security practices..."

    # Check for CORS configuration
    if grep -rq "cors" --include="package.json" .; then
        log_success "CORS library found"

        if grep -rq "origin:.*\\*" --include="*.js" --include="*.ts" apps/; then
            log_error "CORS configured with wildcard (*) - security risk"
            HIGH_FINDINGS=$((HIGH_FINDINGS + 1))
        else
            log_success "CORS appears to be properly configured"
        fi
    else
        log_warning "CORS library not found"
    fi

    # Check for GraphQL security
    if grep -rq "graphql" --include="package.json" .; then
        log_info "GraphQL detected - checking security..."

        # Query depth limiting
        if grep -rq "depthLimit\|queryDepth" --include="*.js" --include="*.ts" apps/; then
            log_success "GraphQL query depth limiting found"
        else
            log_warning "GraphQL query depth limiting not detected"
            HIGH_FINDINGS=$((HIGH_FINDINGS + 1))
        fi
    fi
}

# 12. Logging and Monitoring
check_logging() {
    print_header "12. Logging and Monitoring"

    log_info "Checking logging configuration..."

    # Check for logging library
    if grep -rq "winston\|pino\|bunyan" --include="package.json" .; then
        log_success "Logging library found"
    else
        log_warning "No structured logging library detected"
        MEDIUM_FINDINGS=$((MEDIUM_FINDINGS + 1))
    fi

    # Check for monitoring
    if grep -rq "prometheus\|prom-client" --include="package.json" .; then
        log_success "Prometheus monitoring configured"
    else
        log_warning "Prometheus monitoring not detected"
    fi
}

# Generate final report
generate_report() {
    print_header "Security Scan Summary"

    TOTAL_FINDINGS=$((CRITICAL_FINDINGS + HIGH_FINDINGS + MEDIUM_FINDINGS + LOW_FINDINGS))

    echo "Scan completed at: $(date)"
    echo "Mode: $SCAN_MODE"
    echo ""
    echo "Findings Summary:"
    echo "  Critical: $CRITICAL_FINDINGS"
    echo "  High:     $HIGH_FINDINGS"
    echo "  Medium:   $MEDIUM_FINDINGS"
    echo "  Low:      $LOW_FINDINGS"
    echo "  Total:    $TOTAL_FINDINGS"
    echo ""

    if [ $CRITICAL_FINDINGS -gt 0 ]; then
        log_error "CRITICAL vulnerabilities found - DO NOT deploy to production"
        echo "Status: ❌ FAILED"
        exit 1
    elif [ $HIGH_FINDINGS -gt 0 ]; then
        log_warning "HIGH severity issues found - Address before production deployment"
        echo "Status: ⚠️  WARNING"
        exit 0
    else
        log_success "No critical or high severity issues found"
        echo "Status: ✅ PASSED"
        exit 0
    fi
}

# Main execution
main() {
    print_header "OpenMeet Security Scanner"
    echo "Starting security scan at $(date)"
    echo "Scan mode: $SCAN_MODE"
    echo "Report directory: $REPORT_DIR"
    echo ""

    # Run all security checks
    scan_dependencies
    scan_secrets

    if [ "$SCAN_MODE" = "--full" ]; then
        scan_docker_images
    fi

    run_sast
    check_security_headers
    check_auth_security
    check_input_validation
    check_tls_config
    check_env_vars
    check_database_security
    check_api_security
    check_logging

    # Generate final report
    generate_report
}

# Run main function
main
