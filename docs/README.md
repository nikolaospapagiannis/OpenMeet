# OpenMeet Documentation

This directory contains all project documentation organized by category.

## Documentation Structure

```
docs/
├── ai/                    # AI/ML integration docs
├── architecture/          # System architecture (empty - see main README)
├── deployment/            # Deployment guides & runbooks
├── enterprise/            # Enterprise features (SSO, RBAC, SCIM)
├── features/              # Feature implementation docs
├── guides/                # User & setup guides
├── internal/              # Internal development notes
├── reports/               # Audit reports & analysis
├── security/              # Security implementation docs
├── testing/               # Testing guides & reports
└── assets/                # Images & static assets
```

## Quick Links

### Getting Started
- [Setup Guide](guides/SETUP_GUIDE.md)
- [Quick Start](guides/QUICK_START_GUIDE.md)
- [Chrome Extension Guide](guides/CHROME_EXTENSION_GUIDE.md)

### Deployment
- [Production Deployment Guide](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Docker Deployment](deployment/DOCKER_DEPLOYMENT.md)
- [Deployment Checklist](deployment/DEPLOYMENT_CHECKLIST.md)
- [Disaster Recovery Runbook](deployment/DISASTER_RECOVERY_RUNBOOK.md)

### Enterprise
- [SSO Implementation Guide](enterprise/SSO_IMPLEMENTATION_GUIDE.md)
- [RBAC Deployment Guide](enterprise/RBAC_DEPLOYMENT_GUIDE.md)
- [OAuth Runbooks](enterprise/OAUTH_RUNBOOKS.md)
- [SCIM Provisioning](enterprise/SSO_IMPLEMENTATION_GUIDE.md#scim)

### AI/ML
- [Offline AI Setup](ai/OFFLINE_AI_SETUP.md)
- [AI Provider System](ai/PROVIDER_SYSTEM_IMPLEMENTATION.md)
- [AI Predictions](ai/AI_PREDICTION_REAL_DATA_IMPLEMENTATION_REPORT.md)

### Security
- [Security Audit Report](security/SECURITY_AUDIT_REPORT.md)
- [Rate Limiting](security/RATE_LIMITING_IMPLEMENTATION.md)
- [Audit Logging](security/AUDIT_LOGGING_IMPLEMENTATION.md)

### Features
- [Live Transcription](features/LIVE_TRANSCRIPTION_IMPLEMENTATION.md)
- [Global Search](features/GLOBAL_SEARCH_IMPLEMENTATION.md)
- [Observability](features/OBSERVABILITY_IMPLEMENTATION_REPORT.md)
- [Analytics](features/ANALYTICS_VISUAL_GUIDE.md)

### Testing
- [E2E Testing Guide](testing/README-E2E-TESTING.md)
- [E2E Test Checklist](testing/E2E-TEST-CHECKLIST.md)
- [Load Testing](testing/LOAD_TESTING_IMPLEMENTATION_SUMMARY.md)

## Contributing

When adding new documentation:
1. Place it in the appropriate category folder
2. Use SCREAMING_SNAKE_CASE for filenames
3. Update this README with a link if it's a key document
4. Follow existing formatting conventions
