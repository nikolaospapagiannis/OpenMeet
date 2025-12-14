# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

Email: **security@openmeet.dev**

Include:
- Type of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Phase | Timeline |
|-------|----------|
| Initial Response | Within 48 hours |
| Status Update | Within 7 days |
| Resolution Target | Within 90 days |

### What to Expect

1. Acknowledgment within 48 hours
2. Assessment and severity determination
3. Regular progress updates
4. Coordinated disclosure
5. Credit in security advisory (if desired)

## Safe Harbor

We consider security research conducted in good faith to be authorized. We will not pursue legal action against researchers who:

- Make good faith effort to avoid privacy violations
- Do not exploit issues beyond verification
- Report directly to us before public disclosure
- Give reasonable time to address issues

## Security Best Practices

### Environment Configuration

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Never use defaults in production
# Use environment variables, not .env files
```

### Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS only
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Regular security updates

## Built-in Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT + OAuth 2.0 + SAML SSO |
| Encryption | AES-256-GCM at rest, TLS in transit |
| Rate Limiting | Redis sliding window |
| Input Validation | Zod schemas, express-validator |
| RBAC | Fine-grained permissions |
| Audit Logging | Comprehensive action trails |

## Contact

- **Security:** security@openmeet.dev
- **General:** GitHub Issues/Discussions

Thank you for helping keep OpenMeet secure!
