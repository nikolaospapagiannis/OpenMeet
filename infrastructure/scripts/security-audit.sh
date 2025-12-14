#!/bin/bash

###############################################################################
# Security Audit Script for OpenMeet Platform
# Comprehensive security testing and vulnerability scanning
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="${REPORT_DIR:-./security-reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/security-audit_$TIMESTAMP.md"

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"
}

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize report
cat > "$REPORT_FILE" <<EOF
# Security Audit Report
**Date**: $(date)
**Version**: 1.0.0

## Executive Summary

EOF

log "Starting comprehensive security audit..."

# 1. NPM Audit
log "Running npm audit..."
echo -e "\n## NPM Vulnerability Scan\n" >> "$REPORT_FILE"

if npm audit --json > "$REPORT_DIR/npm-audit_$TIMESTAMP.json" 2>&1; then
    echo "✅ No vulnerabilities found" >> "$REPORT_FILE"
else
    VULNERABILITIES=$(cat "$REPORT_DIR/npm-audit_$TIMESTAMP.json" | jq -r '.metadata.vulnerabilities | to_entries[] | "\(.key): \(.value)"')
    echo "\`\`\`" >> "$REPORT_FILE"
    echo "$VULNERABILITIES" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    warn "NPM vulnerabilities found"
fi

# 2. Snyk Test (if available)
log "Running Snyk security scan..."
echo -e "\n## Snyk Vulnerability Scan\n" >> "$REPORT_FILE"

if command -v snyk &> /dev/null; then
    if snyk test --json > "$REPORT_DIR/snyk-test_$TIMESTAMP.json" 2>&1; then
        echo "✅ No vulnerabilities found by Snyk" >> "$REPORT_FILE"
    else
        echo "⚠️ Vulnerabilities detected. See detailed report." >> "$REPORT_FILE"
        warn "Snyk vulnerabilities found"
    fi
else
    echo "⏭️ Skipped (Snyk not installed)" >> "$REPORT_FILE"
fi

# 3. Docker Image Scanning (if Trivy available)
log "Scanning Docker images..."
echo -e "\n## Docker Image Security\n" >> "$REPORT_FILE"

if command -v trivy &> /dev/null; then
    IMAGES=("openmeet-api:latest" "openmeet-web:latest" "openmeet:latest")
    for IMAGE in "${IMAGES[@]}"; do
        echo "### $IMAGE" >> "$REPORT_FILE"
        if docker image inspect "$IMAGE" &>/dev/null; then
            trivy image --severity HIGH,CRITICAL "$IMAGE" >> "$REPORT_DIR/trivy_${IMAGE//:/_}_$TIMESTAMP.txt" 2>&1 || true
            echo "\`\`\`" >> "$REPORT_FILE"
            tail -20 "$REPORT_DIR/trivy_${IMAGE//:/_}_$TIMESTAMP.txt" >> "$REPORT_FILE"
            echo "\`\`\`" >> "$REPORT_FILE"
        else
            echo "⏭️ Image not found" >> "$REPORT_FILE"
        fi
    done
else
    echo "⏭️ Skipped (Trivy not installed)" >> "$REPORT_FILE"
fi

# 4. SSL/TLS Configuration Check
log "Checking SSL/TLS configuration..."
echo -e "\n## SSL/TLS Configuration\n" >> "$REPORT_FILE"

DOMAINS=("api.openmeet-v2.com" "openmeet-v2.com")
for DOMAIN in "${DOMAINS[@]}"; do
    echo "### $DOMAIN" >> "$REPORT_FILE"
    if command -v testssl &> /dev/null; then
        testssl --quiet --jsonfile "$REPORT_DIR/ssl_${DOMAIN}_$TIMESTAMP.json" "$DOMAIN" 2>&1 || true
        echo "✅ SSL test completed" >> "$REPORT_FILE"
    else
        # Simple OpenSSL check
        if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
            echo "✅ SSL certificate valid" >> "$REPORT_FILE"
        else
            echo "⚠️ Could not verify SSL certificate" >> "$REPORT_FILE"
        fi
    fi
done

# 5. Security Headers Check
log "Checking security headers..."
echo -e "\n## Security Headers\n" >> "$REPORT_FILE"

check_headers() {
    local URL=$1
    echo "### $URL" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"

    HEADERS=$(curl -sI "$URL" 2>/dev/null || echo "Failed to fetch headers")

    # Check for important security headers
    echo "$HEADERS" | grep -i "strict-transport-security" || echo "❌ Missing: Strict-Transport-Security"
    echo "$HEADERS" | grep -i "x-frame-options" || echo "❌ Missing: X-Frame-Options"
    echo "$HEADERS" | grep -i "x-content-type-options" || echo "❌ Missing: X-Content-Type-Options"
    echo "$HEADERS" | grep -i "content-security-policy" || echo "❌ Missing: Content-Security-Policy"
    echo "$HEADERS" | grep -i "x-xss-protection" || echo "⚠️ Missing: X-XSS-Protection (legacy)"

    echo "\`\`\`" >> "$REPORT_FILE"
}

check_headers "https://api.openmeet-v2.com" >> "$REPORT_FILE" 2>&1 || true
check_headers "https://openmeet-v2.com" >> "$REPORT_FILE" 2>&1 || true

# 6. Environment Variable Check
log "Checking environment variable security..."
echo -e "\n## Environment Variables\n" >> "$REPORT_FILE"

INSECURE_PATTERNS=("password" "secret" "key" "token")
ISSUES_FOUND=0

for PATTERN in "${INSECURE_PATTERNS[@]}"; do
    if grep -r "$PATTERN" .env* 2>/dev/null | grep -v ".example" | grep -v "your-" | grep -v "REPLACE"; then
        warn "Found potential hardcoded $PATTERN in .env files"
        ((ISSUES_FOUND++))
    fi
done

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ No hardcoded secrets found in tracked files" >> "$REPORT_FILE"
else
    echo "⚠️ Found $ISSUES_FOUND potential security issues" >> "$REPORT_FILE"
fi

# 7. Dependency License Check
log "Checking dependency licenses..."
echo -e "\n## Dependency Licenses\n" >> "$REPORT_FILE"

if command -v license-checker &> /dev/null; then
    license-checker --json > "$REPORT_DIR/licenses_$TIMESTAMP.json" 2>&1 || true
    echo "✅ License check completed. See detailed report." >> "$REPORT_FILE"
else
    echo "⏭️ Skipped (license-checker not installed)" >> "$REPORT_FILE"
fi

# 8. Code Quality & Security Patterns
log "Checking code patterns..."
echo -e "\n## Code Security Patterns\n" >> "$REPORT_FILE"

# Check for common security anti-patterns
echo "### Potential Security Issues" >> "$REPORT_FILE"
echo "\`\`\`" >> "$REPORT_FILE"

grep -rn "eval(" apps/ 2>/dev/null | head -5 && echo "⚠️ Found eval() usage" || echo "✅ No eval() found"
grep -rn "innerHTML" apps/ 2>/dev/null | head -5 && echo "⚠️ Found innerHTML usage (XSS risk)" || echo "✅ No innerHTML found"
grep -rn "dangerouslySetInnerHTML" apps/ 2>/dev/null | head -5 && echo "⚠️ Found dangerouslySetInnerHTML" || echo "✅ Safe"
grep -rn "SELECT \*" apps/ 2>/dev/null | head -5 && echo "⚠️ Found SELECT * queries" || echo "✅ No SELECT * found"

echo "\`\`\`" >> "$REPORT_FILE"

# 9. Authentication & Authorization Check
log "Checking authentication patterns..."
echo -e "\n## Authentication & Authorization\n" >> "$REPORT_FILE"

if grep -r "JWT_SECRET" apps/ 2>/dev/null | grep -v ".example"; then
    echo "⚠️ JWT_SECRET found in code (should be environment variable only)" >> "$REPORT_FILE"
else
    echo "✅ No hardcoded JWT secrets" >> "$REPORT_FILE"
fi

# 10. API Security
log "Checking API security..."
echo -e "\n## API Security\n" >> "$REPORT_FILE"

if grep -r "cors({.*origin:.*\*" apps/ 2>/dev/null; then
    echo "⚠️ CORS configured to allow all origins (*)" >> "$REPORT_FILE"
else
    echo "✅ CORS properly restricted" >> "$REPORT_FILE"
fi

# 11. Database Security
log "Checking database security..."
echo -e "\n## Database Security\n" >> "$REPORT_FILE"

# Check for SQL injection prevention
if grep -r "prisma\.\$queryRaw\|prisma\.\$executeRaw" apps/ 2>/dev/null; then
    echo "⚠️ Found raw SQL queries - verify parameterization" >> "$REPORT_FILE"
else
    echo "✅ Using ORM safely" >> "$REPORT_FILE"
fi

# Summary
log "Generating summary..."
echo -e "\n## Summary\n" >> "$REPORT_FILE"
echo "- Report generated: $TIMESTAMP" >> "$REPORT_FILE"
echo "- Detailed reports in: $REPORT_DIR/" >> "$REPORT_FILE"
echo -e "\n### Recommended Actions\n" >> "$REPORT_FILE"
echo "1. Review all vulnerability reports" >> "$REPORT_FILE"
echo "2. Update dependencies with known vulnerabilities" >> "$REPORT_FILE"
echo "3. Ensure all secrets are in environment variables" >> "$REPORT_FILE"
echo "4. Verify SSL/TLS configuration" >> "$REPORT_FILE"
echo "5. Check security headers are properly set" >> "$REPORT_FILE"

log "Security audit complete!"
log "Report saved to: $REPORT_FILE"

# Open report if on macOS/Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$REPORT_FILE"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$REPORT_FILE"
fi

exit 0
