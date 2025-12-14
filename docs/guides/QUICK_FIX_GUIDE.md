# OpenMeet - Quick Fix Guide for E2E Deployment

**Status:** 4 Critical Issues to Fix
**Time to Fix:** ~1-2 hours
**Difficulty:** Easy-Medium

---

## The 4 Blocking Issues

```
❌ API Service        - Missing 'openai' module
❌ Web Service        - Docker image not built
❌ Realtime Service   - Container crashed (exit 255)
❌ AI Service         - Docker image not built
```

---

## Fix #1: API Service - Missing 'openai' Module (5 minutes)

### The Error
```
Error: Cannot find module 'openai'
Location: /app/dist/services/RevenueIntelligenceService.js:47
```

### The Fix
```bash
cd G:\openmeet

# Remove broken container
docker-compose rm -f api

# Rebuild with cache fresh
docker-compose build --no-cache api

# Verify it built
docker images | grep openmeet-api

# Test (should NOT error on 'openai' module)
docker-compose up api
# Wait 5 seconds, then check if it stays running
docker ps | grep openmeet-api
```

### Why This Works
- Forces fresh npm install of all dependencies
- Ensures `openai` package (specified in package.json) gets installed
- Clears any partial/corrupted files

### Success Indicator
```
Container runs for > 10 seconds without exiting
No "Cannot find module" errors
```

---

## Fix #2: Web Service - Build Docker Image (10 minutes)

### The Issue
- Docker image doesn't exist
- Source code and .next build exist but not containerized

### The Fix
```bash
cd G:\openmeet

# Build the web service image
docker-compose build web

# Verify it was created
docker images | grep openmeet-web

# Should output something like:
# openmeet-web   latest   abc123def456   5 minutes ago   250MB
```

### What Happens
```
Step 1-5: Copy files from local to image
Step 6-10: Install dependencies
Step 11-15: Build Next.js app (.next)
Step 16: Create production image
Output: openmeet-web:latest (200-400MB)
```

### Success Indicator
```
Image appears in: docker images | grep openmeet-web
Size: 200-400 MB
Built successfully with no errors
```

---

## Fix #3: Realtime Service - Debug & Rebuild (15 minutes)

### The Issue
```
Container: openmeet-realtime
Last Status: Exited (255) 1 hour ago
Exit Code 255: Configuration or runtime error
```

### Step 1: Check What Went Wrong
```bash
cd G:\openmeet

# See the error that caused exit
docker logs openmeet-realtime --tail 100

# This will show the actual error message
```

### Step 2: Rebuild Fresh
```bash
# Clean rebuild
docker-compose build --no-cache realtime

# Try to start it with live logs
docker-compose up realtime

# Watch the console for any errors
# If it stays running for 10+ seconds, it's working
# Press Ctrl+C to stop (it will continue running in background)
```

### Step 3: Verify It's Running
```bash
docker ps | grep openmeet-realtime

# Should show "Up X seconds" not "Exited"
```

### Common Issues & Fixes

**Issue 1: Redis connection failed**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
Fix: Redis must be running
docker-compose ps redis  # Should show "Up"
```

**Issue 2: Port already in use**
```
Error: EADDRINUSE: address already in use :::5000
Fix: Kill process on port 5000
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Mac/Linux
```

**Issue 3: Node modules missing**
```
Error: Cannot find module 'xyz'
Fix: Rebuild forces npm install
```

### Success Indicator
```
docker-compose ps
NAME              STATUS
openmeet-realtime   Up X seconds (healthy)
```

---

## Fix #4: AI Service - Build Docker Image (10 minutes)

### The Issue
- Docker image doesn't exist
- Dockerfile exists but never built

### The Fix
```bash
cd G:\openmeet

# Build the AI service image
docker-compose build ai-service

# Watch the output (takes 10-15 min due to dependencies)
# It will:
#   1. Download Python 3.11-slim image (slim = small)
#   2. Install system deps (ffmpeg, build tools)
#   3. Install Python packages from requirements.txt
#   4. Download spaCy NLP model
#   5. Copy application code
#   6. Create Docker image

# Verify
docker images | grep openmeet-service
```

### If Build Fails

**Most Common: Requirements Conflict**
```bash
# Check what's in requirements.txt
cat apps/ai-service/requirements.txt

# Common fixes:
# - Remove conflicting versions
# - Pin specific versions that work together
# - Try building with --no-cache
```

**Fix: Rebuild with verbose output**
```bash
docker-compose build --no-cache --progress=plain ai-service 2>&1 | tee build.log
```

### Success Indicator
```
Image appears in: docker images | grep openmeet-service
Size: 500MB-1GB
Port 5001: Working
```

---

## Verify All 4 Fixes Work

Once all fixes complete, run this verification:

```bash
cd G:\openmeet

# 1. Check all images exist
echo "=== CHECKING DOCKER IMAGES ==="
docker images | grep "openmeet"
# Should show 4 images:
#   openmeet-api
#   openmeet-web
#   openmeet-realtime
#   openmeet-service

# 2. Start all services
echo "=== STARTING SERVICES ==="
docker-compose up -d

# 3. Wait for health checks
echo "=== WAITING FOR HEALTH CHECKS ==="
sleep 30

# 4. Check status
echo "=== CHECKING SERVICE STATUS ==="
docker-compose ps

# Should show all "Up" status, no "Exited"
# Example:
# NAME              STATUS
# openmeet-api        Up 30 seconds (healthy)
# openmeet-web        Up 30 seconds
# openmeet-realtime   Up 30 seconds (healthy)
# openmeet-service Up 30 seconds (healthy)
# + 6 infrastructure services all "Up (healthy)"

# 5. Test API connectivity
echo "=== TESTING API CONNECTIVITY ==="
curl http://localhost:4000/health

# Should return something like:
# {"status":"ok","timestamp":"2025-11-15T22:30:00Z"}
```

---

## Quick Troubleshooting

### Issue: "docker: command not found"
```
Make sure Docker Desktop is running
Windows: Docker.exe icon in taskbar
Mac: Docker icon in menu bar
Linux: service docker status
```

### Issue: "docker-compose: command not found"
```
Docker Compose is included with Docker Desktop
If using standalone compose:
docker compose up -d  # (without hyphen)
```

### Issue: Port already in use
```bash
# Find what's using the port
netstat -ano | findstr :4000   # Windows

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or just change port in .env:
# Change: NEXT_PUBLIC_API_URL=http://localhost:4000
# To:     NEXT_PUBLIC_API_URL=http://localhost:4001
```

### Issue: Out of disk space
```bash
# Clean up Docker
docker system prune -a

# Remove old containers/images
docker container prune
docker image prune
```

---

## Timeline Estimate

| Action | Time | Done |
|--------|------|------|
| Fix API (rebuild) | 5 min | [ ] |
| Build Web | 10 min | [ ] |
| Debug/rebuild Realtime | 15 min | [ ] |
| Build AI Service | 10 min | [ ] |
| Verify all 4 work | 5 min | [ ] |
| Start all services | 2 min | [ ] |
| Test connectivity | 5 min | [ ] |
| **TOTAL** | **52 min** | |

---

## Commands Copy-Paste (Run in Order)

```bash
cd G:\openmeet

# 1. Fix API
docker-compose rm -f api
docker-compose build --no-cache api

# 2. Build Web
docker-compose build web

# 3. Rebuild Realtime
docker logs openmeet-realtime --tail 100
docker-compose build --no-cache realtime

# 4. Build AI Service
docker-compose build ai-service

# 5. Verify all
docker images | grep openmeet

# 6. Start all
docker-compose up -d

# 7. Wait and check
sleep 30
docker-compose ps

# 8. Test API
curl http://localhost:4000/health
```

---

## Success = All Services Running ✅

When you see this, you're READY for E2E testing:

```
CONTAINER ID   IMAGE                STATUS
abc123         openmeet-api        Up 30s (healthy)
def456         openmeet-web        Up 30s
ghi789         openmeet-realtime   Up 30s (healthy)
jkl012         openmeet-service Up 30s (healthy)
mno345         postgres:15-alpine   Up 30s (healthy)
pqr678         redis:7-alpine       Up 30s (healthy)
stu901         mongo:7              Up 30s (healthy)
vwx234         elasticsearch:8.11.0 Up 30s (healthy)
yza567         rabbitmq:3           Up 30s (healthy)
bcd890         minio/minio:latest   Up 30s (healthy)
```

Plus:
- `curl http://localhost:4000/health` returns JSON with "status": "ok"
- `http://localhost:3003` loads the web interface
- `curl ws://localhost:5003` WebSocket connects
- Database queries work

---

## After Fixes: Next Steps

Once all 4 services are running:

1. **Test Database**
   ```bash
   docker exec openmeet-postgres psql -U openmeet -d openmeet_db -c "SELECT COUNT(*) FROM users;"
   ```

2. **Test Cache**
   ```bash
   docker exec openmeet-redis redis-cli -a redis123 ping
   ```

3. **Test Web**
   - Open http://localhost:3003 in browser
   - Should see login/signup page

4. **Test API**
   ```bash
   curl -X GET http://localhost:4000/health
   ```

5. **Document Results**
   - Screenshot of `docker-compose ps`
   - Screenshot of `http://localhost:3003`
   - API health check response

---

**That's it! Once all 4 fixes complete and services are running, you're ready for E2E testing.**

Good luck!
