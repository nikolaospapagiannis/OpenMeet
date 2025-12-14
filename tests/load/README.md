# Load Testing Suite

Comprehensive load testing configuration for OpenMeet platform using Artillery.

## Overview

This directory contains Artillery load test configurations for testing different components of the system:

- **api-load-test.yml** - REST API endpoints (meetings, transcriptions, analytics)
- **graphql-load-test.yml** - GraphQL API queries and mutations
- **auth-load-test.yml** - Authentication flows (login, register, token refresh)
- **ai-service-load-test.yml** - AI/ML service (transcription, summarization, sentiment)

## Prerequisites

### Install Artillery

```bash
npm install -g artillery@latest
```

### Start Services

Before running load tests, ensure all services are running:

```bash
# Start API service (Node.js)
cd apps/api
npm run dev  # Runs on port 3000

# Start AI service (Python)
cd apps/ai-service
python -m uvicorn app.main:app --reload  # Runs on port 8000

# Start databases
docker-compose up -d postgres mongodb redis elasticsearch
```

### Environment Variables

Ensure all required environment variables are set:

```bash
# API Service
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
ELASTICSEARCH_URL=http://...
JWT_SECRET=...
OPENAI_API_KEY=...

# AI Service
OPENAI_API_KEY=...
```

## Running Load Tests

### Quick Start

Run individual test suites:

```bash
# Test REST API endpoints
artillery run api-load-test.yml

# Test GraphQL API
artillery run graphql-load-test.yml

# Test authentication
artillery run auth-load-test.yml

# Test AI service
artillery run ai-service-load-test.yml
```

### Generate HTML Reports

```bash
# Run test and generate report
artillery run --output report.json api-load-test.yml
artillery report report.json

# This opens an HTML report in your browser
```

### Run All Tests

```bash
# Run all test suites sequentially
for test in *.yml; do
  echo "Running $test..."
  artillery run --output "${test%.yml}-report.json" "$test"
  artillery report "${test%.yml}-report.json"
done
```

## Test Specifications

### API Load Test (api-load-test.yml)

**Target Performance:**
- 1,000 concurrent users
- 10,000 requests/minute
- p95 response time: < 500ms
- p99 response time: < 1000ms
- Error rate: < 1%

**Test Phases:**
1. Warm-up: 60s @ 10 users/sec
2. Ramp-up: 120s @ 10 → 50 users/sec
3. Sustained: 300s @ 50 users/sec (3,000 req/min)
4. Peak: 120s @ 100 users/sec (6,000 req/min)
5. Spike: 60s @ 200 users/sec (12,000 req/min)
6. Cool-down: 60s @ 10 users/sec

**Scenarios:**
- Read operations (70%): List meetings, get transcripts, analytics
- Write operations (20%): Create/update meetings
- Analytics queries (10%): Dashboard, reports

### GraphQL Load Test (graphql-load-test.yml)

**Target Performance:**
- p95: < 800ms
- p99: < 1500ms
- Error rate: < 1%

**Test Phases:**
1. Warm-up: 30s @ 5 users/sec
2. Ramp-up: 60s @ 5 → 30 users/sec
3. Sustained: 180s @ 30 users/sec
4. Peak: 60s @ 60 users/sec

**Scenarios:**
- Query operations (60%): Fetch data with nested relationships
- Mutation operations (30%): Create, update, delete
- Complex queries (10%): Deep nested relationships

### Auth Load Test (auth-load-test.yml)

**Target Performance:**
- p95: < 300ms (auth should be fast)
- p99: < 600ms
- Error rate: < 0.5% (very low for auth)

**Scenarios:**
- User login (50%)
- User registration (20%)
- Token refresh (20%)
- User logout (10%)
- Authentication failures (5%)
- Concurrent sessions (5%)

### AI Service Load Test (ai-service-load-test.yml)

**Target Performance:**
- p95: < 5000ms (5 seconds - AI operations are slower)
- p99: < 10000ms (10 seconds)
- Error rate: < 2% (allow for OpenAI API failures)

**Note:** AI operations are compute-intensive, so target load is lower:
- Sustained: 5 requests/sec
- Peak: 10 requests/sec

**Scenarios:**
- Audio transcription (40%)
- Text summarization (30%)
- Sentiment analysis (20%)
- Speaker diarization (10%)
- Batch operations (5%)
- Error handling (5%)

## Performance Baselines

### Current Baseline (Development)

| Service | Endpoint | p95 | p99 | Error Rate |
|---------|----------|-----|-----|------------|
| API | GET /meetings | 150ms | 350ms | 0.3% |
| API | POST /meetings | 200ms | 450ms | 0.5% |
| API | GET /analytics | 180ms | 400ms | 0.4% |
| GraphQL | queries | 220ms | 500ms | 0.3% |
| GraphQL | mutations | 280ms | 600ms | 0.5% |
| Auth | POST /login | 120ms | 250ms | 0.1% |
| Auth | POST /register | 180ms | 350ms | 0.2% |
| AI | POST /transcribe | 3500ms | 7000ms | 1.5% |
| AI | POST /summarize | 1800ms | 3500ms | 1.2% |
| AI | POST /sentiment | 1200ms | 2500ms | 1.0% |

### Production Targets

| Service | p95 Target | p99 Target | Error Target |
|---------|------------|------------|--------------|
| API | < 200ms | < 500ms | < 1% |
| GraphQL | < 300ms | < 800ms | < 1% |
| Auth | < 200ms | < 400ms | < 0.5% |
| AI | < 5000ms | < 10000ms | < 2% |

## Monitoring During Tests

### Real-time Monitoring

1. **Prometheus Metrics:**
   - Open Grafana dashboards
   - Monitor request rates, error rates, latency
   - Watch resource utilization (CPU, memory, disk)

2. **Database Performance:**
   ```bash
   # PostgreSQL
   SELECT * FROM pg_stat_activity WHERE state = 'active';

   # MongoDB
   db.currentOp()

   # Redis
   redis-cli INFO stats

   # Elasticsearch
   curl localhost:9200/_cluster/health?pretty
   ```

3. **Application Logs:**
   ```bash
   # API service
   tail -f apps/api/logs/app.log

   # AI service
   tail -f apps/ai-service/logs/app.log
   ```

### Key Metrics to Watch

- **Request Rate:** Requests per second
- **Error Rate:** Percentage of failed requests
- **Response Time:** p50, p95, p99 latencies
- **Throughput:** Successful requests per second
- **Database Connections:** Active connections
- **Cache Hit Rate:** Redis cache effectiveness
- **Queue Depth:** Background job queue size
- **CPU Usage:** Server CPU utilization
- **Memory Usage:** RAM utilization
- **Disk I/O:** Read/write operations

## Interpreting Results

### Success Criteria

✅ **PASS** if all conditions met:
- Error rate below target threshold
- p95 response time below target
- p99 response time below target
- No service crashes or OOM errors
- Database connections remain stable
- No queue buildup

⚠️ **WARNING** if:
- Metrics approach but don't exceed thresholds
- Intermittent errors occur
- Resource utilization > 80%

❌ **FAIL** if:
- Error rate exceeds threshold
- Response times exceed targets
- Services crash or become unresponsive
- Database connections exhausted
- OOM errors occur

### Common Issues and Fixes

#### High Error Rates

**Causes:**
- Database connection pool exhausted
- Rate limiting triggered
- OpenAI API quota exceeded
- Service timeouts

**Fixes:**
- Increase database connection pool size
- Adjust rate limits
- Implement request queuing
- Increase service timeouts

#### High Latency

**Causes:**
- Database queries not optimized
- Missing indexes
- Cache not working effectively
- High CPU/memory usage

**Fixes:**
- Add database indexes
- Optimize N+1 queries
- Verify Redis cache hit rate
- Scale horizontally

#### Service Crashes

**Causes:**
- Out of memory (OOM)
- Unhandled exceptions
- Resource exhaustion

**Fixes:**
- Increase memory limits
- Fix memory leaks
- Add error handling
- Implement circuit breakers

## Continuous Load Testing

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Artillery
        run: npm install -g artillery

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Run load tests
        run: |
          cd tests/load
          artillery run api-load-test.yml

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: tests/load/*.json
```

### Automated Performance Regression Detection

```bash
# Compare current results with baseline
artillery run --output current.json api-load-test.yml

# Compare with baseline (requires custom script)
node compare-performance.js baseline.json current.json

# Fail if performance degrades > 10%
# Example: p95 latency increased by >10%
```

## Cost Considerations

### OpenAI API Costs

During load testing, AI service tests will make real OpenAI API calls:

- **Transcription:** $0.006/minute
- **GPT-4 Summarization:** ~$0.03-0.06/meeting
- **GPT-4 Sentiment:** ~$0.01-0.02/analysis

**Estimated cost for full AI load test run:**
- 450 seconds @ 5 req/sec = 2,250 total requests
- Mixed operations (40% transcription, 30% summarization, 20% sentiment)
- **Total: ~$50-100 per full test run**

**Recommendation:**
- Use shorter test durations for development
- Reserve full tests for pre-production validation
- Consider using OpenAI API mocks for CI/CD
- Monitor OpenAI usage dashboard during tests

## Best Practices

1. **Start Small:** Begin with lower loads and increase gradually
2. **Monitor Everything:** Watch all metrics during tests
3. **Test Incrementally:** Test one component at a time first
4. **Use Realistic Data:** Simulate actual user behavior
5. **Test Edge Cases:** Include error scenarios
6. **Establish Baselines:** Record initial performance metrics
7. **Regular Testing:** Run load tests before each major release
8. **Document Results:** Keep history of test results
9. **Fix Issues:** Don't ignore performance regressions
10. **Cost Awareness:** Monitor OpenAI API costs during AI tests

## Troubleshooting

### Artillery Not Found

```bash
# Install globally
npm install -g artillery

# Or use npx
npx artillery run api-load-test.yml
```

### Services Not Running

```bash
# Check service status
curl http://localhost:3000/api/health  # API service
curl http://localhost:8000/health      # AI service

# Check Docker containers
docker ps

# Check logs
docker-compose logs -f
```

### Database Connection Errors

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"
mongosh $MONGODB_URI --eval "db.runCommand({ ping: 1 })"
redis-cli -u $REDIS_URL PING
curl $ELASTICSEARCH_URL/_cluster/health
```

### Out of Memory

```bash
# Increase Docker memory limits
docker-compose up -d --memory=4g

# Monitor memory usage
docker stats

# Reduce test load
# Edit yml file and reduce arrivalRate
```

## Support

For issues or questions:
1. Check application logs
2. Review Prometheus metrics
3. Consult production runbook
4. Contact DevOps team

## Next Steps

After completing load tests:

1. ✅ Analyze results against targets
2. ✅ Document performance baselines
3. ✅ Fix identified bottlenecks
4. ✅ Re-run tests to verify fixes
5. ✅ Update capacity planning
6. ✅ Configure auto-scaling thresholds
7. ✅ Schedule regular load testing
8. ✅ Proceed to production deployment

---

**Last Updated:** 2025-11-14
**Test Suite Version:** 1.0.0
**Platform:** OpenMeet
