#!/bin/bash

###############################################################################
# Penetration Testing Script
# Automated security testing for OpenMeet Platform
###############################################################################

set -euo pipefail

# Configuration
TARGET_URL="${TARGET_URL:-https://staging.openmeet-v2.com}"
API_URL="${API_URL:-https://staging-api.openmeet-v2.com}"
REPORT_DIR="${REPORT_DIR:-./pentest-reports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[PENTEST]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

mkdir -p "$REPORT_DIR"

log "Starting penetration tests against $TARGET_URL"

# 1. OWASP ZAP Baseline Scan
log "Running OWASP ZAP baseline scan..."
if command -v docker &> /dev/null; then
    docker run --rm -v "$(pwd)/$REPORT_DIR:/zap/wrk/:rw" \
        -t owasp/zap2docker-stable zap-baseline.py \
        -t "$TARGET_URL" \
        -r "zap_baseline_$TIMESTAMP.html" \
        -J "zap_baseline_$TIMESTAMP.json" || warn "ZAP scan completed with warnings"
else
    warn "Docker not available, skipping ZAP scan"
fi

# 2. SQL Injection Tests
log "Testing for SQL injection..."
cat > "$REPORT_DIR/sqli_test_$TIMESTAMP.txt" <<EOF
# SQL Injection Test Results
Target: $API_URL

EOF

# Test common SQL injection payloads
PAYLOADS=(
    "' OR '1'='1"
    "admin'--"
    "1' UNION SELECT NULL--"
    "' OR 1=1--"
)

for PAYLOAD in "${PAYLOADS[@]}"; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$PAYLOAD\",\"password\":\"test\"}" 2>&1 || echo "500")

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)

    if [[ "$HTTP_CODE" == "200" ]] || [[ "$RESPONSE" =~ "SQL"|"syntax"|"database" ]]; then
        echo "⚠️ VULNERABLE to: $PAYLOAD (HTTP $HTTP_CODE)" >> "$REPORT_DIR/sqli_test_$TIMESTAMP.txt"
        warn "Potential SQL injection vulnerability detected"
    else
        echo "✅ Protected against: $PAYLOAD (HTTP $HTTP_CODE)" >> "$REPORT_DIR/sqli_test_$TIMESTAMP.txt"
    fi
done

# 3. XSS Tests
log "Testing for XSS vulnerabilities..."
cat > "$REPORT_DIR/xss_test_$TIMESTAMP.txt" <<EOF
# XSS Test Results
Target: $TARGET_URL

EOF

XSS_PAYLOADS=(
    "<script>alert('XSS')</script>"
    "<img src=x onerror=alert('XSS')>"
    "javascript:alert('XSS')"
)

for PAYLOAD in "${XSS_PAYLOADS[@]}"; do
    RESPONSE=$(curl -s "$API_URL/api/search?q=$PAYLOAD" 2>&1 || echo "error")

    if [[ "$RESPONSE" =~ "<script>"|"onerror=" ]]; then
        echo "⚠️ VULNERABLE to XSS: $PAYLOAD" >> "$REPORT_DIR/xss_test_$TIMESTAMP.txt"
        warn "Potential XSS vulnerability detected"
    else
        echo "✅ Protected against XSS: $PAYLOAD" >> "$REPORT_DIR/xss_test_$TIMESTAMP.txt"
    fi
done

# 4. Authentication Tests
log "Testing authentication mechanisms..."
cat > "$REPORT_DIR/auth_test_$TIMESTAMP.txt" <<EOF
# Authentication Test Results

EOF

# Test without token
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/meetings")
if [[ "$RESPONSE" == "401" ]]; then
    echo "✅ Properly requires authentication" >> "$REPORT_DIR/auth_test_$TIMESTAMP.txt"
else
    echo "⚠️ Endpoint accessible without auth (HTTP $RESPONSE)" >> "$REPORT_DIR/auth_test_$TIMESTAMP.txt"
    warn "Authentication bypass possible"
fi

# Test with invalid token
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
    -H "Authorization: Bearer invalid_token" \
    "$API_URL/api/meetings")
if [[ "$RESPONSE" == "401" ]]; then
    echo "✅ Rejects invalid tokens" >> "$REPORT_DIR/auth_test_$TIMESTAMP.txt"
else
    echo "⚠️ Accepts invalid tokens (HTTP $RESPONSE)" >> "$REPORT_DIR/auth_test_$TIMESTAMP.txt"
fi

# 5. Rate Limiting Tests
log "Testing rate limiting..."
cat > "$REPORT_DIR/ratelimit_test_$TIMESTAMP.txt" <<EOF
# Rate Limiting Test Results

EOF

SUCCESS_COUNT=0
for i in {1..150}; do
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/health")
    if [[ "$HTTP_CODE" == "200" ]]; then
        ((SUCCESS_COUNT++))
    elif [[ "$HTTP_CODE" == "429" ]]; then
        echo "✅ Rate limiting active after $SUCCESS_COUNT requests" >> "$REPORT_DIR/ratelimit_test_$TIMESTAMP.txt"
        break
    fi
done

if [[ $SUCCESS_COUNT -ge 150 ]]; then
    echo "⚠️ No rate limiting detected after 150 requests" >> "$REPORT_DIR/ratelimit_test_$TIMESTAMP.txt"
    warn "Rate limiting not enforced"
fi

# 6. CSRF Tests
log "Testing CSRF protection..."
# Test if state-changing endpoints require CSRF tokens
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
    "$API_URL/api/meetings" \
    -H "Content-Type: application/json" \
    -d '{"title":"test"}')

echo "CSRF test (POST without token): HTTP $RESPONSE" >> "$REPORT_DIR/csrf_test_$TIMESTAMP.txt"

# 7. Security Headers Check
log "Checking security headers..."
cat > "$REPORT_DIR/headers_test_$TIMESTAMP.txt" <<EOF
# Security Headers Test

EOF

HEADERS=$(curl -sI "$TARGET_URL")

echo "$HEADERS" | grep -i "strict-transport-security" && \
    echo "✅ HSTS enabled" >> "$REPORT_DIR/headers_test_$TIMESTAMP.txt" || \
    echo "⚠️ HSTS missing" >> "$REPORT_DIR/headers_test_$TIMESTAMP.txt"

echo "$HEADERS" | grep -i "x-frame-options" && \
    echo "✅ X-Frame-Options present" >> "$REPORT_DIR/headers_test_$TIMESTAMP.txt" || \
    echo "⚠️ X-Frame-Options missing" >> "$REPORT_DIR/headers_test_$TIMESTAMP.txt"

echo "$HEADERS" | grep -i "content-security-policy" && \
    echo "✅ CSP enabled" >> "$REPORT_DIR/headers_test_$TIMESTAMP.txt" || \
    echo "⚠️ CSP missing" >> "$REPORT_DIR/headers_test_$TIMESTAMP.txt"

# 8. SSL/TLS Configuration
log "Testing SSL/TLS configuration..."
if command -v nmap &> /dev/null; then
    nmap --script ssl-enum-ciphers -p 443 "$(echo $TARGET_URL | sed 's|https://||')" > "$REPORT_DIR/ssl_test_$TIMESTAMP.txt" 2>&1 || true
else
    warn "nmap not available, skipping SSL cipher tests"
fi

# Generate summary report
log "Generating summary report..."
cat > "$REPORT_DIR/pentest_summary_$TIMESTAMP.md" <<EOF
# Penetration Test Summary

**Date**: $(date)
**Target**: $TARGET_URL
**API**: $API_URL

## Test Results

### SQL Injection
$(cat "$REPORT_DIR/sqli_test_$TIMESTAMP.txt")

### XSS
$(cat "$REPORT_DIR/xss_test_$TIMESTAMP.txt")

### Authentication
$(cat "$REPORT_DIR/auth_test_$TIMESTAMP.txt")

### Rate Limiting
$(cat "$REPORT_DIR/ratelimit_test_$TIMESTAMP.txt")

### Security Headers
$(cat "$REPORT_DIR/headers_test_$TIMESTAMP.txt")

## Recommendations

1. Review all warnings and fix vulnerabilities
2. Ensure rate limiting is properly configured
3. Verify all security headers are present
4. Implement CSRF protection for state-changing operations
5. Regular security audits recommended

EOF

log "Penetration testing complete!"
log "Reports saved to: $REPORT_DIR/"
log "Summary: $REPORT_DIR/pentest_summary_$TIMESTAMP.md"

exit 0
