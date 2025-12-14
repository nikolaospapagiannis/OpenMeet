# Load Testing Suite - OpenMeet

Enterprise-grade load testing framework using Artillery.io for Fortune 100-level performance validation.

## Quick Start

```bash
# Install Artillery (if not already installed)
npm install -g artillery

# Run all load tests
./run-all.sh

# Run individual test
artillery run scenarios/auth-load.yml
```

## Test Scenarios

### 1. Main API Load Test (`api-load-test.yml`)
**Target:** 5,000 requests/second sustained load
**Duration:** ~10 minutes
**Tests:**
- Health checks
- User authentication flow
- Meeting list and search
- Transcription operations
- Analytics dashboard
- Organization operations
- Integration status checks
- Real-time features

**Run:**
```bash
artillery run api-load-test.yml
```

### 2. Authentication Load (`scenarios/auth-load.yml`)
**Target:** 1,000 concurrent users
**Duration:** ~3.5 minutes
**Tests:**
- User login (60% of traffic)
- User registration (20% of traffic)
- Token refresh (15% of traffic)
- Logout (5% of traffic)

**Run:**
```bash
artillery run scenarios/auth-load.yml
```

### 3. Search Load (`scenarios/search-load.yml`)
**Target:** 2,000 concurrent searches
**Duration:** ~6.5 minutes
**Tests:**
- Full-text meeting search (40%)
- Transcription search (35%)
- Advanced filtered search (20%)
- Autocomplete search (5%)

**Run:**
```bash
artillery run scenarios/search-load.yml
```

### 4. Meeting Upload (`scenarios/meeting-upload.yml`)
**Target:** 500 concurrent uploads
**Duration:** ~6 minutes
**Tests:**
- Meeting file upload (50%)
- Meeting metadata update (30%)
- Bulk meeting creation (20%)

**Run:**
```bash
artillery run scenarios/meeting-upload.yml
```

### 5. WebSocket Load (`scenarios/websocket-load.yml`)
**Target:** 1,000 concurrent WebSocket connections
**Duration:** ~9 minutes
**Tests:**
- Live meeting connections (40%)
- Real-time transcription stream (30%)
- Live collaboration events (20%)
- Connection stress test (10%)

**Run:**
```bash
artillery run scenarios/websocket-load.yml
```

## Reports

### Viewing Results

After running tests, reports are generated in `reports/load-test-<timestamp>/`:

**HTML Reports (Interactive):**
```bash
open reports/load-test-*/api-load-report.html
open reports/load-test-*/auth-load-report.html
```

**JSON Reports (Raw Data):**
```bash
cat reports/load-test-*/api-load-report.json | jq '.aggregate'
```

**Summary Report:**
```bash
cat reports/load-test-*/summary.md
```

### Key Metrics

**Request Rate:**
- Target: 5,000+ RPS sustained
- Metric: `.aggregate.rates.http.request_rate`

**Response Time:**
- P95 < 200ms: `.aggregate.http.response_time.p95`
- P99 < 500ms: `.aggregate.http.response_time.p99`

**Error Rate:**
- Target < 1%
- Calculate: `(errors / total_requests) * 100`

**Throughput:**
- Total requests: `.aggregate.counters.http.requests`
- Duration: Test phase durations

## Configuration

### Environment Variables

Create `.env` in this directory:

```bash
API_URL=http://localhost:4000
TEST_USER_EMAIL=admin@example.com
TEST_USER_PASSWORD=AdminPass123!
```

### Test Parameters

Edit YAML files to adjust:

**Load Intensity:**
```yaml
phases:
  - duration: 120          # Test duration in seconds
    arrivalRate: 100       # New users per second
    rampTo: 500           # Ramp up to this rate
```

**Performance SLAs:**
```yaml
ensure:
  maxErrorRate: 1         # Max 1% error rate
  p95: 200               # P95 < 200ms
  p99: 500               # P99 < 500ms
```

## Customization

### Adding New Test Scenarios

1. Create new scenario file:
```bash
cp scenarios/auth-load.yml scenarios/my-test.yml
```

2. Edit the scenario:
```yaml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 50

scenarios:
  - name: "My Custom Test"
    flow:
      - post:
          url: "/api/my-endpoint"
          json:
            data: "test"
```

3. Add to `run-all.sh`:
```bash
run_test "my-test" "./scenarios/my-test.yml" "1"
```

### Creating Processors

Processors handle complex logic and custom metrics:

```javascript
// processors/my-processor.js
module.exports = {
  generateTestData: function(context, events, done) {
    context.vars.customData = "generated value";
    return done();
  },

  validateResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode === 200) {
      ee.emit('counter', 'custom.success', 1);
    }
    return next();
  }
};
```

Reference in YAML:
```yaml
config:
  processor: "./processors/my-processor.js"
```

## Performance Targets

### API Endpoints

| Endpoint | P95 Target | P99 Target | Max Error Rate |
|----------|------------|------------|----------------|
| `/health` | 10ms | 20ms | 0% |
| `/api/auth/login` | 100ms | 200ms | 1% |
| `/api/meetings` | 150ms | 300ms | 1% |
| `/api/meetings/search` | 100ms | 250ms | 1% |
| `/api/transcriptions` | 200ms | 500ms | 2% |
| `/api/analytics` | 300ms | 800ms | 2% |

### WebSocket

| Metric | Target |
|--------|--------|
| Connection Time | < 100ms |
| Message Latency P95 | < 50ms |
| Message Latency P99 | < 100ms |
| Max Concurrent Connections | 1,000+ |

### Database

| Metric | Target |
|--------|--------|
| Query Time P95 | < 50ms |
| Query Time P99 | < 100ms |
| Connection Pool Usage | < 80% |
| Cache Hit Ratio | > 90% |

## Troubleshooting

### Error: Artillery not found

```bash
npm install -g artillery
```

### Error: Cannot connect to API

1. Check API is running:
```bash
curl http://localhost:4000/health
```

2. Update target URL in test files
3. Check firewall settings

### Error: Too many open files

Increase file descriptor limit:
```bash
ulimit -n 10000
```

### Error: Out of memory

Reduce concurrent users:
```yaml
phases:
  - duration: 60
    arrivalRate: 10  # Reduced from 100
```

### Slow Test Execution

**Possible causes:**
1. API server not optimized
2. Database not indexed
3. Network latency
4. Insufficient resources

**Solutions:**
1. Review PERFORMANCE_REPORT.md for optimizations
2. Check database indexes exist
3. Run tests locally
4. Scale up test machine

## Continuous Integration

### GitHub Actions

```yaml
name: Load Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Artillery
        run: npm install -g artillery
      - name: Run Load Tests
        run: cd infrastructure/load-tests && ./run-all.sh
      - name: Upload Reports
        uses: actions/upload-artifact@v2
        with:
          name: load-test-reports
          path: infrastructure/load-tests/reports/
```

### Pre-deployment Testing

```bash
# Before deploying to production
./run-all.sh

# Check results
if [ $(cat reports/latest/api-load-report.json | jq '.aggregate.http.response_time.p95') -lt 200 ]; then
  echo "✅ Performance tests passed"
  exit 0
else
  echo "❌ Performance degradation detected"
  exit 1
fi
```

## Monitoring Integration

Load tests automatically emit metrics to:

1. **Prometheus** - Real-time metrics at `/metrics`
2. **Grafana** - Dashboard at http://localhost:3000
3. **Artillery HTML Reports** - Generated in `reports/`

### Viewing Live Metrics

1. Start monitoring stack:
```bash
docker-compose -f ../monitoring/docker-compose.yml up -d
```

2. Run load test:
```bash
./run-all.sh
```

3. View dashboard:
```
http://localhost:3000/d/load-testing
```

## Best Practices

### 1. Test Regularly
- Run daily light tests
- Weekly full test suite
- Pre-release stress tests

### 2. Monitor Trends
- Track P95/P99 over time
- Alert on >10% degradation
- Investigate anomalies

### 3. Realistic Data
- Use production-like payloads
- Test with real user patterns
- Include edge cases

### 4. Incremental Load
- Start with warm-up phase
- Gradually increase load
- Include cool-down period

### 5. Clean Test Environment
- Reset database between runs
- Clear caches
- Restart services

## Support

**Documentation:**
- `/home/user/openmeet/PERFORMANCE_REPORT.md` - Full performance report
- `/home/user/openmeet/apps/api/src/config/database-performance.ts` - DB optimization
- `/home/user/openmeet/apps/api/src/middleware/cache.ts` - API caching

**Artillery Docs:**
- https://artillery.io/docs

**Issues:**
- Check logs in `reports/*/stderr.log`
- Review Artillery output for errors
- Verify API health before testing

---

**Last Updated:** 2025-11-15
**Version:** 1.0.0
**Maintained By:** Engineering Team
