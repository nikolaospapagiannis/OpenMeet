# Security Infrastructure

Fortune 100-grade security hardening and penetration testing suite for the OpenMeet platform.

## Overview

This directory contains comprehensive security tools including:
- Automated vulnerability scanning
- Penetration testing suite
- Secrets detection and prevention
- Security verification scripts
- Automated reporting

## Quick Start

```bash
# Run all security scans
npm run security:all

# Individual scans
npm run security:scan       # Vulnerability scanning (npm audit + Snyk)
npm run security:secrets    # Scan for hardcoded secrets
npm run security:pentest    # Run penetration tests (requires server)
npm run security:verify     # Run verification checks
```

## Components

### 1. Security Middleware (`apps/api/src/middleware/security.ts`)

Comprehensive security middleware stack including:

#### Security Headers
- **Helmet.js** - Complete security header suite
- **CSP** - Content Security Policy to prevent XSS
- **HSTS** - HTTP Strict Transport Security (1-year)
- **X-Frame-Options** - Clickjacking prevention
- **X-Content-Type-Options** - MIME sniffing prevention

#### Protection Layers
- **Rate Limiting** - General (1000/15min) and Auth (10/15min)
- **SQL Injection Protection** - Pattern-based detection and blocking
- **XSS Protection** - Script injection prevention
- **CSRF Protection** - Token validation
- **IP Whitelisting** - Restrict access to sensitive endpoints
- **Request Signing** - HMAC signature validation
- **API Key Rotation** - Automatic expiration tracking

#### Usage Example

```typescript
import {
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  sqlInjectionProtection,
  xssProtection,
  ipWhitelist,
  requestSignature,
} from './middleware/security';

// Apply to Express app
app.use(helmetConfig);
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use('/api', generalRateLimit);
app.use('/api/auth/login', authRateLimit);

// Protect admin endpoints with IP whitelist
app.use('/api/admin', ipWhitelist(['10.0.0.1', '10.0.0.2']));

// Require signed requests for webhooks
app.use('/api/webhooks', requestSignature({
  secret: process.env.WEBHOOK_SECRET,
  headerName: 'X-Signature',
}));
```

---

### 2. Vulnerability Scanner (`security-scan.ts`)

Automated dependency and code scanning for vulnerabilities.

#### Features
- **npm audit** integration with JSON parsing
- **Snyk** vulnerability scanning (optional, requires auth)
- **Secrets detection** - 17+ patterns for hardcoded credentials
- Automatic report generation
- CI/CD ready (exits with code 1 on critical/high)

#### Detects
- CVE vulnerabilities in dependencies
- AWS credentials (Access Key, Secret Key)
- Google API keys
- Stripe API keys
- Private keys (RSA, DSA, EC, OpenSSH, PGP)
- GitHub tokens
- Slack tokens
- JWT tokens
- Database connection strings
- Generic API keys and secrets

#### Usage

```bash
# Run scanner
npm run security:scan

# Or directly
ts-node infrastructure/security/security-scan.ts
```

#### CI/CD Integration

```yaml
# GitHub Actions example
- name: Security Scan
  run: npm run security:scan

# Fails build if critical/high vulnerabilities found
```

#### Reports

Reports are saved to `infrastructure/security/reports/`:
- `npm-audit-<timestamp>.json`
- `snyk-<timestamp>.json`
- `secrets-scan-<timestamp>.json`
- `combined-<timestamp>.json`

---

### 3. Penetration Testing Suite (`pen-test.ts`)

Comprehensive automated penetration testing using OWASP ZAP API patterns.

#### Test Coverage

1. **SQL Injection Testing**
   - Tests multiple injection vectors
   - Detects error message disclosure
   - Validates parameterized query usage
   - CWE-89 compliance

2. **Cross-Site Scripting (XSS)**
   - Multiple payload variants
   - Reflection detection
   - Input sanitization validation
   - CWE-79 compliance

3. **CSRF Protection**
   - Token validation testing
   - Origin header verification
   - SameSite cookie checking
   - CWE-352 compliance

4. **Authentication Bypass**
   - Protected endpoint testing
   - Invalid token validation
   - Session management verification
   - CWE-287 compliance

5. **Security Headers**
   - Validates all critical headers
   - Checks information disclosure
   - HSTS verification
   - CSP validation

6. **SSL/TLS Configuration**
   - HTTPS enforcement
   - Certificate validation
   - Protocol version checking

#### Usage

```bash
# Start API server first
npm run dev:api

# In another terminal, run pen tests
npm run security:pentest

# Or with custom target
TARGET_URL=https://staging.example.com npm run security:pentest
```

#### Configuration

```typescript
const tester = new PenetrationTester({
  targetUrl: 'http://localhost:3000',
  zapApiKey: process.env.ZAP_API_KEY, // Optional
  testTypes: [
    'sql-injection',
    'xss',
    'csrf',
    'auth-bypass',
    'security-headers',
    'ssl'
  ],
});

const report = await tester.runAllTests();
```

#### Reports

Generates both JSON and HTML reports:
- `pen-test-<timestamp>.json`
- `pen-test-<timestamp>.html` (viewable in browser)

---

### 4. Secrets Scanner (`secrets-scanner.ts`)

Scans entire codebase for hardcoded secrets and credentials.

#### Features
- 17 secret pattern detections
- Line and column number reporting
- False positive filtering
- Pre-commit hook generation
- Comprehensive reporting

#### Secret Patterns Detected

| Type | Pattern | Severity |
|------|---------|----------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | Critical |
| AWS Secret Key | `aws_secret_access_key` pattern | Critical |
| Google API Key | `AIza[0-9A-Za-z-_]{35}` | Critical |
| Stripe API Key | `(sk\|pk)_(test\|live)_` | Critical |
| Private Key | `BEGIN PRIVATE KEY` | Critical |
| GitHub Token | `ghp_`, `ghs_` | Critical |
| Slack Token | `xox[baprs]-` | High |
| JWT Token | `eyJ...` pattern | High |
| Generic API Key | `api_key = "..."` | High |
| Password | `password = "..."` | High |
| Database URL | `postgres://user:pass@...` | Critical |

#### Usage

```bash
# Run secrets scan
npm run security:secrets

# Or directly
ts-node infrastructure/security/secrets-scanner.ts
```

#### Pre-Commit Hook

Automatically install pre-commit hook to prevent secret commits:

```bash
# Run scanner once to create hook
npm run security:secrets

# Hook is created at .git/hooks/pre-commit
# Will block commits containing secrets
```

#### Reports

- `secrets-scan-<timestamp>.json` - Machine-readable
- `secrets-scan-<timestamp>.txt` - Human-readable

---

### 5. Security Verification Script (`verify-security.sh`)

Comprehensive security verification script for CI/CD and production readiness.

#### Checks Performed

1. ✅ **Security Headers Verification**
   - Helmet.js configuration
   - CSP implementation
   - HSTS settings

2. ✅ **NPM Dependency Audit**
   - Critical vulnerabilities
   - High severity issues
   - Moderate/low tracking

3. ✅ **Secrets Scanning**
   - Hardcoded credentials
   - API keys
   - Private keys

4. ✅ **Security Configuration**
   - .env files not in git
   - Proper .gitignore
   - Security scripts present

5. ✅ **Authentication & Authorization**
   - Auth middleware
   - JWT implementation

6. ✅ **CORS Configuration**
   - Strict origin checking
   - No wildcard origins

7. ✅ **Rate Limiting**
   - General rate limits
   - Auth-specific limits

8. ✅ **SQL Injection Protection**
   - Middleware presence
   - No unsafe queries

9. ✅ **XSS Protection**
   - Input sanitization
   - Output encoding

10. ✅ **TypeScript Compilation**
    - Clean builds

#### Usage

```bash
# Run verification
npm run security:verify

# Or directly
./infrastructure/security/verify-security.sh
```

#### Exit Codes

- `0` - All checks passed
- `1` - One or more checks failed

#### CI/CD Integration

```yaml
# GitHub Actions
- name: Security Verification
  run: npm run security:verify
```

---

## Environment Variables

Required environment variables for security features:

```bash
# CORS Configuration
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# JWT Configuration
JWT_SECRET=<strong-random-secret-min-32-chars>
JWT_EXPIRATION=1h

# API Security
API_ENCRYPTION_KEY=<strong-encryption-key>
WEBHOOK_SECRET=<webhook-signing-secret>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000

# Snyk (Optional)
SNYK_TOKEN=<your-snyk-token>

# OWASP ZAP (Optional)
ZAP_API_KEY=<zap-api-key>
ZAP_PROXY_URL=http://localhost:8080
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Run Security Scan
        run: npm run security:scan

      - name: Scan for Secrets
        run: npm run security:secrets

      - name: Security Verification
        run: npm run security:verify

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: infrastructure/security/reports/
```

### Pre-Production Checklist

Before deploying to production:

- [ ] Run `npm run security:all` - All scans pass
- [ ] Run `npm run security:verify` - All checks pass
- [ ] Review `SECURITY_AUDIT_REPORT.md`
- [ ] Ensure all environment variables set
- [ ] Enable HTTPS/TLS
- [ ] Configure WAF (if available)
- [ ] Set up monitoring and alerting
- [ ] Review and rotate all API keys
- [ ] Enable pre-commit hooks

---

## Compliance

### OWASP Top 10 (2021) Coverage

| Risk | Mitigation | Status |
|------|------------|--------|
| A01: Broken Access Control | Auth middleware, RBAC | ✅ |
| A02: Cryptographic Failures | TLS, encryption | ✅ |
| A03: Injection | Input validation, parameterized queries | ✅ |
| A04: Insecure Design | Security-first architecture | ✅ |
| A05: Security Misconfiguration | Hardened defaults | ✅ |
| A06: Vulnerable Components | Automated scanning | ✅ |
| A07: Authentication Failures | MFA, rate limiting | ✅ |
| A08: Data Integrity | Code signing | ✅ |
| A09: Logging Failures | Winston logging | ✅ |
| A10: SSRF | URL validation | ✅ |

### PCI DSS

For payment processing:
- ✅ Secure network (firewalls, encryption)
- ✅ Cardholder data protection (Stripe tokenization)
- ✅ Vulnerability management (scanning, patching)
- ✅ Access control (MFA, least privilege)
- ✅ Monitoring (logging, testing)

### GDPR

- ✅ Data encryption (at rest and in transit)
- ✅ Right to erasure (delete endpoints)
- ✅ Data portability (export functionality)
- ✅ Breach notification (alerting)
- ✅ Privacy by design

---

## Troubleshooting

### Snyk Authentication

```bash
# Login to Snyk
snyk auth

# Verify authentication
snyk test
```

### Rate Limit Issues

If legitimate traffic is being rate-limited:

```typescript
// Adjust limits in security.ts
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increase limit
});
```

### False Positive Secrets

Add patterns to exclude in `secrets-scanner.ts`:

```typescript
private isLikelyFalsePositive(line: string, evidence: string): boolean {
  const falsePositiveIndicators = [
    'example',
    'test',
    'YOUR_KEY_HERE',
    // Add more patterns
  ];
  // ...
}
```

### CSP Violations

If Content Security Policy blocks legitimate resources:

```typescript
// In security.ts
contentSecurityPolicy: {
  directives: {
    scriptSrc: ["'self'", "https://trusted-cdn.com"],
    // Add trusted sources
  },
}
```

---

## Support

For security issues:
- **Email:** security@openmeet.com
- **Documentation:** `/home/user/openmeet/SECURITY_AUDIT_REPORT.md`
- **Reports:** `/home/user/openmeet/infrastructure/security/reports/`

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** November 15, 2025
**Version:** 1.0.0
**Maintained by:** Security Team
