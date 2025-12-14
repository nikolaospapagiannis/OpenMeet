# Security Testing Suite

Comprehensive security testing and vulnerability assessment for OpenMeet platform.

## Overview

This directory contains security testing tools, checklists, and documentation for conducting thorough security assessments before production deployment.

### Components

1. **OWASP_TOP_10_CHECKLIST.md** - Detailed checklist covering OWASP Top 10 2021
2. **security-scan.sh** - Automated security scanning script
3. **security-reports/** - Generated security scan reports (gitignored)

## Quick Start

### Run Automated Security Scan

```bash
# Quick scan (dependencies, secrets, SAST)
cd tests/security
./security-scan.sh --quick

# Full scan (includes Docker image scanning)
./security-scan.sh --full
```

### Review OWASP Top 10 Checklist

```bash
# Open checklist and manually test each item
cat OWASP_TOP_10_CHECKLIST.md
```

##Prerequisites

### Required Tools

```bash
# Node.js and npm (already installed)
node --version  # v20.x+
npm --version

# Python (for Python dependency scanning)
python3 --version  # 3.11+
pip install safety  # Python dependency vulnerability scanner

# Docker (for image scanning)
docker --version

# Optional but recommended
npm install -g snyk          # Vulnerability scanning
brew install trivy           # Container vulnerability scanner
npm install -g retire        # JavaScript library scanner
```

### Environment Setup

```bash
# Ensure all services are configured but NOT running
# (security tests should run against code, not live services)

# Required environment files
- .env.example (for configuration reference)
- .gitignore (must include .env)
```

## Security Scan Script

### Features

The `security-scan.sh` script performs automated security checks:

1. **Dependency Vulnerability Scanning**
   - npm audit for Node.js packages
   - safety check for Python packages
   - Identifies outdated packages

2. **Secret Scanning**
   - Searches for hardcoded passwords, API keys, tokens
   - Common secret patterns detection
   - Reports potential security leaks

3. **Docker Image Scanning**
   - Scans base images for vulnerabilities
   - Identifies outdated or vulnerable containers
   - Uses Trivy scanner (if installed)

4. **Static Application Security Testing (SAST)**
   - ESLint security rules
   - TypeScript strict mode verification
   - Code quality checks

5. **Security Headers Check**
   - Helmet.js configuration
   - Content Security Policy (CSP)
   - HSTS, X-Frame-Options, etc.

6. **Authentication & Authorization**
   - JWT implementation verification
   - bcrypt password hashing
   - Rate limiting configuration

7. **Input Validation**
   - Validation middleware detection
   - SQL injection protection (Prisma)
   - Sanitization checks

8. **HTTPS/TLS Configuration**
   - Secure cookie settings
   - HTTPS redirect logic
   - TLS configuration review

9. **Environment Variable Security**
   - .env file location verification
   - .gitignore configuration
   - Secrets management best practices

10. **Database Security**
    - SSL/TLS for database connections
    - Connection string security
    - Credential management

11. **API Security**
    - CORS configuration
    - GraphQL query depth limiting
    - API rate limiting

12. **Logging and Monitoring**
    - Structured logging
    - Prometheus metrics
    - Monitoring configuration

### Usage

```bash
# Quick scan (5-10 minutes)
./security-scan.sh --quick

# Full scan (15-30 minutes)
./security-scan.sh --full

# View reports
ls -la security-reports/
cat security-reports/npm-audit-*.json
cat security-reports/secrets-scan-*.txt
```

### Exit Codes

- `0` - Success (no critical/high issues)
- `1` - Failure (critical issues found - DO NOT DEPLOY)

### Output

```
========================================
Security Scan Summary
========================================

Scan completed at: Mon Nov 14 02:30:45 UTC 2025
Mode: --full

Findings Summary:
  Critical: 0
  High:     2
  Medium:   5
  Low:      3
  Total:    10

Status: ⚠️  WARNING - Address HIGH issues before production
```

## OWASP Top 10 Checklist

### Categories

1. **A01: Broken Access Control** - Unauthorized access to functions/data
2. **A02: Cryptographic Failures** - Weak encryption, exposed sensitive data
3. **A03: Injection** - SQL, NoSQL, command injection
4. **A04: Insecure Design** - Missing security controls
5. **A05: Security Misconfiguration** - Default/improper configurations
6. **A06: Vulnerable Components** - Outdated/vulnerable dependencies
7. **A07: Auth Failures** - Weak authentication/session management
8. **A08: Data Integrity Failures** - Unsigned updates, deserialization
9. **A09: Logging/Monitoring Failures** - Insufficient detection capabilities
10. **A10: SSRF** - Server-side request forgery vulnerabilities

### How to Use

1. Open `OWASP_TOP_10_CHECKLIST.md`
2. For each category, review implementation details
3. Execute test cases manually or with tools
4. Check boxes as tests are completed
5. Document findings
6. Remediate vulnerabilities
7. Re-test until all checks pass

### Test Case Example

```markdown
#### 1.1 Horizontal Privilege Escalation
- [ ] **Test:** User A tries to access User B's meetings
  - Endpoint: `GET /api/meetings/:id`
  - Expected: 403 Forbidden or 404 Not Found
  - Payload: Valid meeting ID from different user
  - **Status:** ⏳ Pending

**How to test:**
1. Create two user accounts (User A, User B)
2. User B creates a meeting, note the meeting ID
3. User A attempts: `GET /api/meetings/{user-b-meeting-id}`
4. Verify response is 403/404, not 200 with data
```

## Manual Penetration Testing

### Tools Needed

```bash
# Burp Suite (recommended)
https://portswigger.net/burp

# OWASP ZAP (free alternative)
https://www.zaproxy.org/

# Postman/Insomnia (API testing)
https://www.postman.com/

# cURL (command line)
curl --version
```

### Test Scenarios

#### 1. Access Control Testing

```bash
# Get user A's auth token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usera@example.com","password":"password123"}'
# Save token: TOKEN_A=...

# Get user B's meeting ID
curl http://localhost:3000/api/meetings \
  -H "Authorization: Bearer $TOKEN_B"
# Note a meeting ID: MEETING_ID_B=...

# Try to access user B's meeting with user A's token
curl http://localhost:3000/api/meetings/$MEETING_ID_B \
  -H "Authorization: Bearer $TOKEN_A"
# Expected: 403 Forbidden or 404 Not Found
```

#### 2. SQL Injection Testing

```bash
# Test search parameter
curl "http://localhost:3000/api/meetings?search=' OR '1'='1" \
  -H "Authorization: Bearer $TOKEN"
# Expected: Safe handling, no SQL injection

# Test with UNION attack
curl "http://localhost:3000/api/meetings?search=' UNION SELECT * FROM users--" \
  -H "Authorization: Bearer $TOKEN"
# Expected: Input validation error or safe handling
```

#### 3. Rate Limiting Testing

```bash
# Test authentication rate limiting
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' &
done
wait
# Expected: Rate limit kicked in after 10 attempts (429 Too Many Requests)
```

#### 4. SSRF Testing (AI Service)

```bash
# Test with internal network URL
curl -X POST http://localhost:8000/api/v1/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "http://localhost:6379/",
    "language": "en"
  }'
# Expected: 400 Bad Request (internal IPs blocked)

# Test with cloud metadata endpoint
curl -X POST http://localhost:8000/api/v1/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "http://169.254.169.254/latest/meta-data/",
    "language": "en"
  }'
# Expected: 400 Bad Request (metadata endpoint blocked)
```

#### 5. JWT Security Testing

```bash
# Test with expired token
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
# Expected: 401 Unauthorized (expired token)

# Test with modified payload (invalid signature)
# Change user ID in JWT payload and try to use it
# Expected: 401 Unauthorized (signature verification failed)

# Test with no signature (algorithm: none)
# Expected: 401 Unauthorized (algorithm validation)
```

#### 6. GraphQL Security Testing

```bash
# Test query depth attack
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "query { meeting { user { organization { members { user { organization { members { ... } } } } } } } }"
  }'
# Expected: Query too deep error (depth limit enforced)

# Test batch query attack
# Send 1000 queries in single request
# Expected: Complexity limit error
```

## Automated Penetration Testing

### OWASP ZAP Integration

```bash
# Install OWASP ZAP
brew install --cask owasp-zap  # macOS
# or download from https://www.zaproxy.org/

# Run automated scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html

# View report
open zap-report.html
```

### Nikto Web Scanner

```bash
# Install Nikto
git clone https://github.com/sullo/nikto
cd nikto/program

# Scan web application
./nikto.pl -h http://localhost:3000 -output nikto-report.html
```

## Security Reports

### Generated Reports Location

```
tests/security/security-reports/
├── npm-audit-20251114_023045.json
├── safety-check-20251114_023045.json
├── secrets-scan-20251114_023045.txt
├── docker-scan-node22_20251114_023045.txt
├── docker-scan-python3.11_20251114_023045.txt
├── eslint-security-20251114_023045.json
└── npm-outdated-20251114_023045.txt
```

Reports are automatically timestamped and gitignored.

### Report Analysis

```bash
# View npm vulnerabilities
jq '.vulnerabilities' security-reports/npm-audit-*.json

# Check for critical secrets
grep -i "critical\|high" security-reports/secrets-scan-*.txt

# Count vulnerabilities by severity
jq '.metadata.vulnerabilities' security-reports/npm-audit-*.json
```

## Critical Security Items

### Before Production Deployment

**P0 - Must Fix:**
1. ✅ SQL Injection Protection (Prisma ORM)
2. ✅ XSS Protection (Input sanitization)
3. ✅ CSRF Protection (State tokens in OAuth)
4. ⏳ **SSRF Protection** - Add URL validation for audio_url
5. ⏳ **Rate Limiting** - Implement user-based rate limiting
6. ✅ Authentication (JWT with refresh tokens)
7. ✅ Password Hashing (bcrypt)
8. ✅ Encryption (AES-256 for tokens, TLS for transport)
9. ⏳ **Security Headers** - Ensure Helmet.js in production
10. ⏳ **Dependency Audit** - Fix all critical/high npm vulnerabilities

**P1 - Should Fix (Week 1):**
11. ⏳ GraphQL query depth/complexity limiting
12. ⏳ User enumeration prevention (generic error messages)
13. ⏳ Account lockout after failed login attempts
14. ⏳ Password strength requirements
15. ⏳ Comprehensive audit logging
16. ⏳ Input validation on all endpoints
17. ⏳ CORS configuration review
18. ⏳ Error message sanitization (no stack traces in production)
19. ⏳ Session timeout configuration
20. ⏳ File upload validation

## Security Testing Workflow

### Pre-Deployment Checklist

1. **Week -3: Initial Security Assessment**
   - [ ] Run automated security scan (`./security-scan.sh --full`)
   - [ ] Review OWASP Top 10 checklist
   - [ ] Document findings
   - [ ] Create remediation plan

2. **Week -2: Vulnerability Remediation**
   - [ ] Fix all critical (P0) vulnerabilities
   - [ ] Fix high (P1) vulnerabilities
   - [ ] Update dependencies to patch versions
   - [ ] Re-run security scan
   - [ ] Verify fixes

3. **Week -1: Manual Penetration Testing**
   - [ ] Access control testing
   - [ ] Authentication bypass attempts
   - [ ] Injection attack testing
   - [ ] SSRF testing
   - [ ] Rate limiting verification
   - [ ] Session management testing

4. **Week 0: Pre-Production Security Audit**
   - [ ] Final automated security scan (must pass)
   - [ ] Complete OWASP Top 10 checklist (100%)
   - [ ] Third-party security review (recommended)
   - [ ] Document security baseline
   - [ ] Obtain security sign-off

5. **Post-Deployment: Ongoing Security**
   - [ ] Weekly automated scans
   - [ ] Monthly manual penetration testing
   - [ ] Quarterly third-party security audit
   - [ ] Continuous dependency monitoring
   - [ ] Security incident response plan

## Common Vulnerabilities and Fixes

### 1. SSRF in Audio URL (CRITICAL)

**Vulnerability:**
```python
# AI service: No URL validation
response = await http_client.get(request.audio_url)
```

**Fix:**
```python
# Validate and sanitize URL
import ipaddress
from urllib.parse import urlparse

def is_safe_url(url: str) -> bool:
    parsed = urlparse(url)

    # Only allow http/https
    if parsed.scheme not in ['http', 'https']:
        return False

    # Block private IP ranges
    try:
        ip = ipaddress.ip_address(parsed.hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return False
    except ValueError:
        pass  # hostname, not IP

    # Block cloud metadata endpoints
    if parsed.hostname in ['169.254.169.254', 'metadata.google.internal']:
        return False

    return True

# Before fetching
if not is_safe_url(request.audio_url):
    raise HTTPException(400, "Invalid or unsafe URL")
```

### 2. Missing GraphQL Query Depth Limiting (HIGH)

**Vulnerability:**
```typescript
// No query depth limiting
const server = new ApolloServer({ typeDefs, resolvers });
```

**Fix:**
```typescript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)], // Max depth: 10
});
```

### 3. User Enumeration via Login (MEDIUM)

**Vulnerability:**
```typescript
// Reveals if user exists
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}
if (!validPassword) {
  return res.status(401).json({ error: 'Incorrect password' });
}
```

**Fix:**
```typescript
// Generic error message
if (!user || !validPassword) {
  return res.status(401).json({
    error: 'Invalid email or password'
  });
}
```

## Security Resources

### Documentation
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [GraphQL Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)

### Tools
- [OWASP ZAP](https://www.zaproxy.org/) - Web app security scanner
- [Burp Suite](https://portswigger.net/burp) - Web vulnerability scanner
- [Trivy](https://aquasecurity.github.io/trivy/) - Container vulnerability scanner
- [Snyk](https://snyk.io/) - Dependency vulnerability scanner
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Node.js security
- [safety](https://pyup.io/safety/) - Python dependency checker

### Security Communities
- [OWASP Community](https://owasp.org/)
- [HackerOne](https://www.hackerone.com/) - Bug bounty platform
- [CERT/CC](https://www.cert.org/) - Cybersecurity advisories

## Support

### Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

**Report security vulnerabilities to:**
- Email: security@openmeet.com
- Encrypted: PGP key available on request
- Response time: 48 hours
- Responsible disclosure: 90 days

### Security Team Contacts

- **Security Lead:** DevSecOps Team
- **Incident Response:** On-call rotation
- **Compliance:** Legal + Security teams

## Next Steps

1. ✅ Review this README
2. ⏳ Run automated security scan
3. ⏳ Complete OWASP Top 10 checklist
4. ⏳ Fix all P0 vulnerabilities
5. ⏳ Manual penetration testing
6. ⏳ Third-party security audit (recommended)
7. ⏳ Document security baseline
8. ⏳ Obtain production deployment approval

---

**Security Testing Status:** ⏳ In Progress
**Target Completion:** Before Production Deployment
**Last Updated:** 2025-11-14
**Version:** 1.0.0
