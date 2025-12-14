# E2E Testing Checklist - OpenMeet

**Date Prepared:** 2025-11-15
**Test Environment:** Windows 11 + Docker Desktop
**Branch:** claude/complete-production-deployment-01XryGm2MMyfQKE8d8ptmPfT
**Status:** 96% Environment Ready (22/23 checks passed)

---

## Pre-Test Verification Results

### Infrastructure Status: ✅ VERIFIED

```
✓ PostgreSQL 5432     - RUNNING & CONNECTED
✓ Redis 6380          - RUNNING & CONNECTED (password auth)
✓ MongoDB 27017       - RUNNING & CONNECTED
✓ Elasticsearch 9200  - RUNNING & CONNECTED
✓ RabbitMQ 5674       - RUNNING & CONNECTED
✓ MinIO 9000-9001     - RUNNING & CONNECTED

All ports accessible and responsive
All services passing health checks
```

### Application Stack: ⏱️ NOT YET STARTED

These services are configured and ready to start:
- API Server (port 4000)
- Web Frontend (port 3003)
- Real-time Service (port 5003)
- AI Service (port 5001)
- vLLM Service (port 8000)

### Configuration: ✅ VERIFIED

```
✓ .env file exists (2.0 KB)
✓ docker-compose.yml exists (9.5 KB)
✓ API Dockerfile exists
✓ Web Dockerfile exists
✓ Chrome extension exists (43 KB)
```

---

## Phase 1: Environment Setup & Verification

### 1.1 Confirm All Infrastructure Services

```bash
# Check all running containers
docker-compose ps

# Expected output:
# openmeet-postgres      UP (healthy)
# openmeet-redis         UP (healthy)
# openmeet-mongodb       UP (healthy)
# openmeet-elasticsearch UP (healthy)
# openmeet-rabbitmq      UP (healthy)
# openmeet-minio         UP (healthy)
```

**Status:** ✅ PASSED

---

### 1.2 Verify Database Connectivity

#### PostgreSQL
```bash
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c "SELECT version();"
```

Expected: PostgreSQL version string
**Status:** ✅ PASSED

#### MongoDB
```bash
docker exec openmeet-mongodb mongosh --eval "db.adminCommand({ping: 1})"
```

Expected: `{ ok: 1 }`
**Status:** ✅ PASSED

#### Redis
```bash
docker exec openmeet-redis redis-cli -a redis123 PING
```

Expected: `PONG`
**Status:** ✅ PASSED

---

### 1.3 Verify Service Credentials

| Service | User | Password | Host | Status |
|---------|------|----------|------|--------|
| PostgreSQL | openmeet | openmeet123 | localhost:5432 | ✅ |
| MongoDB | openmeet | mongo123 | localhost:27017 | ✅ |
| Redis | (none) | redis123 | localhost:6380 | ✅ |
| RabbitMQ | openmeet | rabbit123 | localhost:5674 | ✅ |
| MinIO | openmeet | minio123456 | localhost:9000 | ✅ |

---

## Phase 2: Application Service Startup

### 2.1 Start Application Services

```bash
cd /g/openmeet

# Build application images (first time)
docker-compose build api web realtime ai-service

# Start services
docker-compose up -d api web realtime ai-service

# Wait for startup
sleep 180
```

**Pre-Check:**
- [ ] Disk space available (>5GB recommended)
- [ ] Docker daemon running
- [ ] No port conflicts on 3003, 4000, 5001, 5003

**Execution:**
```bash
# Verify startup
docker-compose ps

# Should show:
# openmeet-api       UP
# openmeet-web       UP
# openmeet-realtime  UP
# openmeet-service UP
```

**Post-Check:**
```bash
# Check API health
curl -v http://localhost:4000/health

# Check Web health
curl -I http://localhost:3003/

# Check WebSocket ready
netstat -tuln | grep 5003
```

**Status:** ⏱️ PENDING (Ready to execute)

---

### 2.2 Start vLLM Service (Optional but Recommended)

```bash
docker-compose up -d vllm

# Wait for model loading (this takes time)
# Monitor with:
docker-compose logs -f vllm

# First startup: 2-5 minutes (loading ~7GB model)
# Subsequent startups: <30 seconds
```

**Health Check:**
```bash
# Wait ~300 seconds then test
sleep 300

curl -s http://localhost:8000/health | jq .

# Expected:
# {
#   "model_name": "meta-llama/Llama-3.2-3B-Instruct",
#   "max_model_len": 4096,
#   "model_serving_status": "READY"
# }
```

**Status:** ⏱️ PENDING (Ready to execute)

---

## Phase 3: Test User Creation

### 3.1 Create Test User Account

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "E2E Test User",
    "timezone": "UTC"
  }'

# Expected response:
# {
#   "user": {
#     "id": "user-uuid",
#     "email": "test@example.com",
#     "name": "E2E Test User"
#   },
#   "accessToken": "jwt-token-here",
#   "refreshToken": "refresh-token-here"
# }
```

**Save credentials for use in tests:**
```bash
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="TestPassword123!"
export TEST_USER_JWT="[token-from-response]"
```

**Status:** ⏱️ PENDING (After app startup)

---

### 3.2 Verify User in Database

```bash
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT id, email, name FROM users WHERE email='test@example.com';"

# Expected: 1 row with user data
```

**Status:** ⏱️ PENDING

---

## Phase 4: Chrome Extension Installation

### 4.1 Load Extension in Chrome

1. **Open Chrome Extensions**
   - URL: `chrome://extensions`
   - Enable "Developer mode" (toggle top-right)

2. **Load Unpacked Extension**
   - Click "Load unpacked"
   - Navigate to: `G:\openmeet\apps\chrome-extension`
   - Select the directory

3. **Verify Extension**
   - Extension should appear in list
   - ID: Will be auto-generated
   - Status: "Enabled"
   - Permissions: Approved for required hosts

4. **Test Extension UI**
   - Click extension icon in toolbar
   - Popup should open
   - Verify login screen or authenticated state

**Status:** ⏱️ PENDING

---

### 4.2 Extension Configuration

```javascript
// In extension popup console (F12)

// Should see in chrome.storage.local:
{
  "apiUrl": "http://localhost:4000",
  "wsUrl": "ws://localhost:5003",
  "version": "1.0.0"
}

// Test API connectivity from extension:
fetch('http://localhost:4000/health')
  .then(r => r.json())
  .then(d => console.log('API OK', d))
```

**Status:** ⏱️ PENDING

---

## Phase 5: E2E Test Scenarios

### Test 1: Authentication Flow

**Objective:** Verify user login and session management

**Steps:**
1. Navigate to http://localhost:3003
2. Click "Sign In"
3. Enter email: `test@example.com`
4. Enter password: `TestPassword123!`
5. Click "Continue"
6. Verify redirect to dashboard

**Verification:**
```bash
# Check JWT token stored
curl -c cookies.txt http://localhost:3003/dashboard

# Check token valid
curl -H "Authorization: Bearer $TEST_USER_JWT" \
  http://localhost:4000/api/user/profile
```

**Expected Result:** ✅ User authenticated, JWT valid

**Status:** ⏱️ PENDING

---

### Test 2: Meeting Recording Initiation

**Objective:** Verify extension can initiate recording on meeting platform

**Steps:**
1. Open Google Meet in new tab
2. Start/join a test meeting
3. Verify extension detects meeting platform
4. Click extension icon > "Start Recording"
5. Confirm recording started

**Verification:**
```bash
# Check Redis for recording session
docker exec openmeet-redis redis-cli -a redis123 \
  GET "recording:session:*"

# Check database for recording entry
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT id, user_id, status FROM recordings WHERE user_id='$USER_ID';"
```

**Expected Result:** ✅ Recording session created

**Status:** ⏱️ PENDING

---

### Test 3: Transcription Processing

**Objective:** Verify audio transcription through Whisper

**Steps:**
1. Let recording run for 30+ seconds with speech
2. Stop recording
3. Wait for transcription to process
4. Check transcript in UI

**Verification:**
```bash
# Monitor AI service logs
docker-compose logs -f ai-service | grep "transcrib"

# Check MongoDB for transcript
docker exec openmeet-mongodb mongosh openmeet_transcripts --eval \
  "db.transcripts.findOne({}, {segments: {$slice: 1}})"

# Check API response
curl -H "Authorization: Bearer $TEST_USER_JWT" \
  http://localhost:4000/api/meetings/[meeting-id]/transcript
```

**Expected Result:** ✅ Transcript generated with segments

**Status:** ⏱️ PENDING

---

### Test 4: AI Summarization

**Objective:** Verify vLLM generates meeting summary

**Prerequisites:**
- vLLM service running
- Complete transcript available

**Steps:**
1. Navigate to completed meeting
2. Click "Generate Summary"
3. Wait for AI processing
4. Verify summary appears

**Verification:**
```bash
# Check vLLM logs
docker-compose logs -f vllm | grep "prompt"

# Check API for summary
curl -H "Authorization: Bearer $TEST_USER_JWT" \
  http://localhost:4000/api/meetings/[meeting-id]/summary

# Check database
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT id, status, summary FROM meetings WHERE id='[meeting-id]';"
```

**Expected Result:** ✅ Summary generated and stored

**Status:** ⏱️ PENDING

---

### Test 5: Data Export

**Objective:** Verify transcript export in multiple formats

**Steps:**
1. Navigate to completed meeting
2. Click "Export"
3. Select format: JSON
4. Verify download
5. Repeat for PDF format

**Verification:**
```bash
# Check exported file
ls -lh ~/Downloads/meeting-*.json

# Verify content
cat ~/Downloads/meeting-*.json | jq '.metadata'

# Check MinIO for exported files
docker exec openmeet-minio mc ls minio/transcripts/
```

**Expected Result:** ✅ Files exported correctly

**Status:** ⏱️ PENDING

---

### Test 6: Real-time WebSocket Updates

**Objective:** Verify live transcript updates during recording

**Steps:**
1. Start new recording
2. Open browser DevTools (F12)
3. Monitor WebSocket in Network tab
4. Watch for real-time transcript updates
5. Verify no connection drops

**Verification:**
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:5003');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
ws.onerror = (e) => console.error('Error:', e);

// Should receive:
// { type: 'transcript.segment', data: { text: '...', start: 0, end: 1.5 } }
// { type: 'recording.status', data: { status: 'recording', duration: 65 } }
```

**Expected Result:** ✅ Live updates flowing

**Status:** ⏱️ PENDING

---

### Test 7: Performance & Load

**Objective:** Verify system handles concurrent recordings

**Steps:**
1. Open multiple meeting tabs
2. Start recording on each
3. Monitor system resources
4. Check for errors

**Verification:**
```bash
# Monitor Docker stats
docker stats

# Check queue depth
docker exec openmeet-rabbitmq rabbitmq-diagnostics queues

# Monitor database connections
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check Redis memory
docker exec openmeet-redis redis-cli -a redis123 INFO memory
```

**Expected Result:** ✅ System stable under load

**Status:** ⏱️ PENDING

---

## Phase 6: Database Verification

### 6.1 Schema Verification

```bash
# List tables
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Expected tables:
# users
# meetings
# recordings
# transcripts
# segments
# summaries
# audit_logs
```

**Status:** ✅ PENDING

---

### 6.2 Sample Data Queries

```bash
# Count users
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT count(*) as total_users FROM users;"

# Count meetings
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT count(*) as total_meetings FROM meetings;"

# Check oldest and newest meetings
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "SELECT MIN(created_at), MAX(created_at) FROM meetings;"
```

**Status:** ⏱️ PENDING

---

## Phase 7: Performance Benchmarks

### 7.1 API Response Times

```bash
# API health endpoint
time curl -s http://localhost:4000/health | jq .

# User profile endpoint
time curl -H "Authorization: Bearer $TEST_USER_JWT" \
  http://localhost:4000/api/user/profile | jq .

# Meetings list endpoint
time curl -H "Authorization: Bearer $TEST_USER_JWT" \
  http://localhost:4000/api/meetings | jq .
```

**Target Response Times:**
- Health check: < 50ms
- Profile endpoint: < 100ms
- List endpoint: < 200ms

**Status:** ⏱️ PENDING

---

### 7.2 WebSocket Latency

```bash
# In browser console
const startTime = Date.now();
ws.send(JSON.stringify({type: 'ping'}));
// On pong response:
console.log('Latency:', Date.now() - startTime, 'ms');
```

**Target Latency:** < 50ms

**Status:** ⏱️ PENDING

---

### 7.3 Transcription Latency

```bash
# Measure transcription time
# Time from recording stop to first segment appearing

# Check logs
docker-compose logs ai-service | grep "transcription_time"
```

**Target Time:** < 5 seconds for 1 minute recording

**Status:** ⏱️ PENDING

---

## Phase 8: Cleanup & Reporting

### 8.1 Cleanup Test Data

```bash
# Delete test user
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c \
  "DELETE FROM users WHERE email='test@example.com';"

# Clear Redis cache
docker exec openmeet-redis redis-cli -a redis123 FLUSHDB

# Optional: Reset all data (WARNING: DATA LOSS)
docker-compose down -v
docker-compose up -d
```

**Status:** ⏱️ PENDING

---

### 8.2 Generate Test Report

Create report file: `E2E-TEST-RESULTS.md`

```markdown
# E2E Test Results - OpenMeet

## Test Date: [DATE]
## Tester: [NAME]
## Duration: [TIME]

## Test Results Summary

### Infrastructure Tests
- [ ] PostgreSQL: PASS/FAIL
- [ ] Redis: PASS/FAIL
- [ ] MongoDB: PASS/FAIL
- [ ] API Server: PASS/FAIL
- [ ] Web Frontend: PASS/FAIL

### Feature Tests
- [ ] Authentication: PASS/FAIL
- [ ] Recording: PASS/FAIL
- [ ] Transcription: PASS/FAIL
- [ ] AI Summary: PASS/FAIL
- [ ] Export: PASS/FAIL
- [ ] Real-time Updates: PASS/FAIL

### Performance Tests
- [ ] API Response Time: PASS/FAIL
- [ ] WebSocket Latency: PASS/FAIL
- [ ] Database Queries: PASS/FAIL

### Issues Found
1. [Issue description]
2. [Issue description]

## Overall Status: PASS/FAIL
```

**Status:** ⏱️ PENDING

---

## Quick Start Commands

### Start Everything

```bash
cd /g/openmeet

# Start infrastructure (already running)
docker-compose ps

# Start applications
docker-compose up -d api web realtime ai-service

# Start vLLM (optional)
docker-compose up -d vllm

# Wait for services
sleep 180

# Run verification
./verify-e2e-environment.sh
```

### Monitor Services

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api

# Monitor resource usage
docker stats
```

### Run Diagnostics

```bash
# PostgreSQL
docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c "SELECT 1;"

# Redis
docker exec openmeet-redis redis-cli -a redis123 PING

# MongoDB
docker exec openmeet-mongodb mongosh --eval "db.adminCommand({ping: 1})"

# API
curl -v http://localhost:4000/health

# WebSocket
curl -v http://localhost:5003/health
```

---

## Test Environment Summary

```
OpenMeet - E2E Testing Environment
====================================

Current Status: 96% READY (22/23 verification checks passed)

Infrastructure:      ✅ VERIFIED & OPERATIONAL
├─ PostgreSQL       ✅ Connected
├─ Redis            ✅ Connected
├─ MongoDB          ✅ Connected
├─ Elasticsearch    ✅ Connected
├─ RabbitMQ         ✅ Connected
└─ MinIO            ✅ Connected

Application Stack:   ⏱️ READY TO START
├─ API Server       Ready to start on :4000
├─ Web Frontend     Ready to start on :3003
├─ Real-time        Ready to start on :5003
└─ AI Service       Ready to start on :5001

LLM Services:        ⏱️ READY TO START
├─ vLLM             Ready to start on :8000
└─ Ollama           Available (not used by default)

Chrome Extension:    ✅ PACKAGED (43 KB)

Test Credentials:    ✅ CONFIGURED

E2E Tests:           ✅ CHECKLIST READY

NEXT STEP: Execute Phase 2 - Application Service Startup
```

---

## Support & Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Verify configuration
docker-compose config | grep -A 20 "[service-name]:"

# Restart service
docker-compose restart [service-name]

# Full reset
docker-compose down -v
docker-compose up -d
```

### Port Conflicts

```bash
# Find process using port
netstat -ano | findstr :[port-number]

# Kill process
taskkill /PID [pid] /F

# Or change port in docker-compose.yml
```

### Database Issues

```bash
# Check PostgreSQL
docker exec openmeet-postgres pg_isready -U openmeet

# Verify connection string
echo $DATABASE_URL

# Reset database
docker-compose down -v postgres
docker-compose up -d postgres
```

---

**Prepared by:** Claude Code
**Date:** 2025-11-15
**Version:** 1.0.0
**Branch:** claude/complete-production-deployment-01XryGm2MMyfQKE8d8ptmPfT
