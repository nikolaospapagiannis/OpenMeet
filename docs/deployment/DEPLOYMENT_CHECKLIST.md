# Fortune 100 Rate Limiting & DDoS Protection - Deployment Checklist

## Pre-Deployment Steps

### 1. Install Dependencies

```bash
# From project root
npm install rate-limiter-flexible --workspace=@openmeet/api --legacy-peer-deps

# Or directly in apps/api
cd apps/api
npm install rate-limiter-flexible --legacy-peer-deps
```

### 2. Database Migration

```bash
cd apps/api
npx prisma migrate dev --name add_rate_limiting_tables
npx prisma generate
```

This will create the following tables:
- `IPList` - Whitelist/blacklist management
- `IPBlock` - IP blocking records
- `RateLimitViolation` - Violation tracking
- `DDoSAttackEvent` - Attack event logs
- `TrustScore` - Trust score persistence
- `RateLimitAlert` - Alert management

### 3. Environment Variables

Add to `.env`:

```bash
# Redis Configuration (required)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# IP Whitelisting
WHITELISTED_IPS=192.168.1.1,10.0.0.1
WHITELISTED_CIDRS=192.168.0.0/24,10.0.0.0/8

# IP Blacklisting
BLACKLISTED_IPS=
BLACKLISTED_CIDRS=

# GeoIP Blocking
GEO_BLOCKING_ENABLED=false
BLOCKED_COUNTRIES=
ALLOWED_COUNTRIES=

# Alert Configuration
RATE_LIMIT_ALERT_EMAIL=security@yourcompany.com
RATE_LIMIT_ALERT_SLACK_WEBHOOK=
RATE_LIMIT_ALERT_PAGERDUTY_KEY=

# Monitoring
LOG_LEVEL=info
```

### 4. Redis Setup

Ensure Redis is running:

```bash
# Start Redis (if using Docker)
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --requirepass your-secure-password

# Or using redis-cli to test connection
redis-cli -h localhost -p 6379 -a your-secure-password ping
# Expected response: PONG
```

### 5. Test Rate Limiting

```bash
# Run tests
npm test -- --grep "rate limiting"

# Manual API test
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v

# Check headers in response:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 4
# X-RateLimit-Reset: <timestamp>
```

---

## CloudFlare Deployment

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2. Configure CloudFlare Worker

```bash
cd infrastructure/cloudflare

# Create KV namespace
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "RATE_LIMIT_KV" --preview

# Update wrangler.toml with your KV namespace IDs
```

### 3. Deploy Worker

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

### 4. Configure WAF Rules

```bash
# Import WAF rules via CloudFlare API or dashboard
# Use waf-rules.json as reference
```

---

## Monitoring Setup

### 1. Prometheus Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'openmeet-rate-limits'
    scrape_interval: 15s
    static_configs:
      - targets: ['api.openmeet.com:4000']
    metrics_path: '/api/rate-limits/prometheus'
```

### 2. Grafana Dashboard

Import dashboard configuration from `/monitoring/grafana-dashboard.json` (to be created)

Key metrics to monitor:
- `rate_limit_hits_total`
- `blocked_requests_total`
- `request_duration_seconds`
- `active_connections`
- `blocked_ips_total`
- `trust_score`

### 3. Alert Manager

Configure alert rules:

```yaml
groups:
  - name: rate_limiting
    rules:
      - alert: RateLimitSpike
        expr: rate(rate_limit_hits_total[1m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Rate limit spike detected"

      - alert: DDoSAttack
        expr: rate(blocked_requests_total[1m]) > 50
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Potential DDoS attack detected"
```

---

## Verification Steps

### 1. Health Check

```bash
curl http://localhost:4000/health
```

Expected response includes Redis connection status.

### 2. Rate Limit Dashboard

Navigate to: `http://localhost:3000/settings/rate-limits`

Verify:
- [ ] Current usage displays correctly
- [ ] Metrics update in real-time
- [ ] Top consumers list populates
- [ ] Blocked IPs table shows entries
- [ ] Alerts display properly

### 3. Test Rate Limiting

```bash
# Test burst protection
for i in {1..150}; do
  curl http://localhost:4000/api/search?q=test &
done

# Should see 429 responses after threshold
```

### 4. Test DDoS Protection

```bash
# Test burst detection (should block after 100 requests/second)
ab -n 200 -c 200 http://localhost:4000/api/

# Test slow request protection
curl http://localhost:4000/api/meetings --max-time 31 &
```

### 5. Test IP Blocking

```bash
# Block an IP
curl -X POST http://localhost:4000/api/rate-limits/block-ip \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100","reason":"Testing","duration":300}'

# Verify block
curl http://localhost:4000/api/ -H "X-Forwarded-For: 192.168.1.100"
# Should return 403 Forbidden

# Unblock
curl -X POST http://localhost:4000/api/rate-limits/unblock/192.168.1.100 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Production Checklist

### Pre-Launch

- [ ] Redis is configured with persistence
- [ ] Redis has proper backup strategy
- [ ] All environment variables are set
- [ ] Database migrations are applied
- [ ] CloudFlare Workers are deployed
- [ ] WAF rules are configured
- [ ] Prometheus is scraping metrics
- [ ] Grafana dashboards are set up
- [ ] Alert channels are configured
- [ ] Rate limit tiers are reviewed
- [ ] Endpoint limits are tuned
- [ ] Trust score modifiers are adjusted

### Launch Day

- [ ] Monitor `/api/rate-limits/dashboard` closely
- [ ] Watch for false positives
- [ ] Review blocked IPs
- [ ] Monitor alert volume
- [ ] Check Prometheus metrics
- [ ] Verify CloudFlare analytics

### Post-Launch

- [ ] Review rate limit effectiveness (day 1, 7, 30)
- [ ] Analyze top consumers
- [ ] Tune rate limits based on patterns
- [ ] Review and respond to alerts
- [ ] Update IP blacklist/whitelist as needed

---

## Troubleshooting

### Issue: Rate limits not working

**Check:**
1. Redis connection: `redis-cli ping`
2. Middleware order in `index.ts`
3. Environment variables loaded
4. Browser console for rate limit headers

### Issue: Too many false positives

**Solution:**
1. Review trust score configuration
2. Adjust endpoint-specific limits
3. Check for legitimate high-volume users
4. Consider whitelisting trusted IPs

### Issue: Performance degradation

**Check:**
1. Redis latency: `redis-cli --latency`
2. Prometheus metrics for slow requests
3. Rate limiter overhead in traces
4. Database query performance

### Issue: Alerts flooding

**Solution:**
1. Adjust alert thresholds
2. Implement alert grouping
3. Add alert cooldown periods
4. Review alert conditions

---

## Rollback Plan

If issues occur:

```bash
# 1. Disable DDoS protection
# Comment out in index.ts:
# app.use(ddosProtection(redis));

# 2. Disable combined rate limiting
# Comment out in index.ts:
# app.use('/api', combinedRateLimiting());

# 3. Fall back to simple rate limiting
# Uncomment original:
# app.use('/api', limiter);

# 4. Restart API server
pm2 restart api

# 5. Clear Redis rate limit keys (if needed)
redis-cli --scan --pattern 'rl:*' | xargs redis-cli del
redis-cli --scan --pattern 'ddos:*' | xargs redis-cli del
```

---

## Support Contacts

- **Rate Limiting Issues:** security@yourcompany.com
- **Infrastructure:** devops@yourcompany.com
- **On-Call:** PagerDuty escalation

---

## Additional Resources

- [Rate Limiting Implementation Report](./RATE_LIMITING_IMPLEMENTATION.md)
- [CloudFlare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Prometheus Metrics](./monitoring/prometheus-metrics.md)
- [Security Runbook](./security/runbook.md)

---

## Success Criteria

System is considered successful when:

1. ✅ < 0.1% false positive rate
2. ✅ Zero successful DDoS attacks
3. ✅ < 2ms rate limiting overhead
4. ✅ 99.99% uptime maintained
5. ✅ All endpoints protected
6. ✅ Real-time monitoring operational
7. ✅ Alert response time < 5 minutes
8. ✅ Trust score accuracy > 95%

---

Last Updated: 2025-11-15
Version: 1.0.0
