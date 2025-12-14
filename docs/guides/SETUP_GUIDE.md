# OpenMeet Setup Guide

Complete setup instructions for running the OpenMeet platform with all GAP features (Multi-Meeting AI, Revenue Intelligence, Video Intelligence, Live Features, Advanced AI, and Workflow Automation).

## Prerequisites

### System Requirements
- **Node.js**: 20.x or higher
- **Python**: 3.11 or higher
- **PostgreSQL**: 15.x or higher
- **MongoDB**: 7.x or higher
- **Redis**: 7.x or higher
- **Elasticsearch**: 8.x or higher
- **FFmpeg**: Latest version (for video processing)
- **Docker**: Optional but recommended

### Required Tools
```bash
# Check Node.js version
node --version  # Should be >= 20.0.0

# Check Python version
python3 --version  # Should be >= 3.11

# Check FFmpeg installation
ffmpeg -version
ffprobe -version

# If FFmpeg is not installed
# Ubuntu/Debian:
sudo apt-get install ffmpeg

# macOS:
brew install ffmpeg

# Windows:
# Download from https://ffmpeg.org/download.html
```

## Quick Start (Docker Compose - Recommended)

### 1. Clone and Configure

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd openmeet

# Copy environment file
cp .env.example .env

# Update .env with your configuration
# IMPORTANT: The .env file has been pre-configured with secure secrets
# Update API keys for production:
# - OPENAI_API_KEY
# - SENDGRID_API_KEY
# - Google Calendar API credentials
# - CRM integration credentials (Salesforce, HubSpot, Pipedrive)
```

### 2. Start Services with Docker Compose

```bash
# Start all services (PostgreSQL, MongoDB, Redis, Elasticsearch, MinIO)
docker compose up -d

# Verify all services are running
docker compose ps

# Check logs
docker compose logs -f
```

### 3. Install Dependencies

```bash
# Install API dependencies
cd apps/api
npm install

# Install AI service dependencies
cd ../ai-service
pip install -r requirements.txt

# Return to project root
cd ../..
```

### 4. Database Setup

```bash
cd apps/api

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Verify migration
npx prisma studio  # Opens database GUI at http://localhost:5555
```

### 5. Start Application

```bash
# Terminal 1: API Service
cd apps/api
npm run dev

# Terminal 2: AI Service
cd apps/ai-service
python -m uvicorn app.main:app --reload --port 5001

# Terminal 3: Background Workers (Bull Queue)
cd apps/api
npm run dev:worker

# Terminal 4: WebSocket Server (if separate)
# WebSocket is integrated in main API server
```

### 6. Verify Setup

```bash
# Check API health
curl http://localhost:4000/health

# Check AI service health
curl http://localhost:5001/health

# Check WebSocket connection
# Use a WebSocket client to connect to ws://localhost:5000
```

## Manual Setup (Without Docker)

### 1. Install and Configure PostgreSQL

```bash
# Install PostgreSQL
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# macOS:
brew install postgresql@15

# Start PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql@15  # macOS

# Create database and user
sudo -u postgres psql
CREATE DATABASE openmeet_ai_db;
CREATE USER openmeet_ai WITH ENCRYPTED PASSWORD 'openmeet_ai_123';
GRANT ALL PRIVILEGES ON DATABASE openmeet_ai_db TO openmeet_ai;
\q

# Update .env file with connection string
DATABASE_URL=postgresql://openmeet_ai:openmeet_ai_123@localhost:5432/openmeet_ai_db
```

### 2. Install and Configure MongoDB

```bash
# Install MongoDB
# Ubuntu/Debian:
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# macOS:
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community@7.0  # macOS

# Create user
mongosh
use admin
db.createUser({
  user: "openmeet_ai",
  pwd: "mongo123",
  roles: ["root"]
})
exit

# Update .env file
MONGODB_URL=mongodb://openmeet_ai:mongo123@localhost:27017/openmeet_ai_transcripts?authSource=admin
```

### 3. Install and Configure Redis

```bash
# Install Redis
# Ubuntu/Debian:
sudo apt-get install redis-server

# macOS:
brew install redis

# Configure Redis password
# Edit /etc/redis/redis.conf (Linux) or /usr/local/etc/redis.conf (macOS)
# Uncomment and set:
requirepass redis123

# Start Redis
sudo systemctl start redis  # Linux
brew services start redis  # macOS

# Verify connection
redis-cli
AUTH redis123
PING  # Should return PONG
exit

# Update .env file
REDIS_URL=redis://:redis123@localhost:6379
```

### 4. Install and Configure Elasticsearch

```bash
# Install Elasticsearch
# Ubuntu/Debian:
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt-get update
sudo apt-get install elasticsearch

# macOS:
brew tap elastic/tap
brew install elastic/tap/elasticsearch-full

# Start Elasticsearch
sudo systemctl start elasticsearch  # Linux
brew services start elasticsearch-full  # macOS

# Verify
curl http://localhost:9200

# Update .env file
ELASTICSEARCH_URL=http://localhost:9200
```

### 5. Install MinIO (S3-compatible storage)

```bash
# Install MinIO
# Linux:
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# macOS:
brew install minio/stable/minio

# Start MinIO
mkdir -p ~/minio-data
minio server ~/minio-data --console-address ":9001"

# Access MinIO Console at http://localhost:9001
# Default credentials: minioadmin / minioadmin

# Create bucket 'openmeet-storage'
# Update .env file
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=openmeet_ai
S3_SECRET_KEY=minio123456
S3_BUCKET=openmeet-storage
```

## Environment Configuration

### Critical Environment Variables

The following environment variables MUST be configured before running the application:

#### 1. Database Connections
- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `ELASTICSEARCH_URL` - Elasticsearch URL

#### 2. Security (Already Configured)
- `JWT_SECRET` - ✅ Pre-configured with secure random value
- `JWT_REFRESH_SECRET` - ✅ Pre-configured with secure random value
- `ENCRYPTION_KEY` - ✅ Pre-configured with 256-bit key

#### 3. External API Keys (REQUIRED for Production)
```bash
# OpenAI API (CRITICAL - Required for all AI features)
OPENAI_API_KEY=sk-...  # Get from https://platform.openai.com/api-keys

# SendGrid (Required for email features - GAP #7)
SENDGRID_API_KEY=SG....  # Get from https://app.sendgrid.com/settings/api_keys

# Google Calendar API (Required for smart scheduling - GAP #7)
GOOGLE_CALENDAR_CLIENT_ID=...  # Get from Google Cloud Console
GOOGLE_CALENDAR_CLIENT_SECRET=...

# CRM Integrations (Optional - for Revenue Intelligence GAP #2)
SALESFORCE_CLIENT_ID=...
SALESFORCE_CLIENT_SECRET=...
HUBSPOT_API_KEY=...
PIPEDRIVE_API_KEY=...

# Video Conferencing (Optional - for meeting import)
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
TEAMS_CLIENT_ID=...
TEAMS_CLIENT_SECRET=...
```

## Database Migrations

### Running Migrations

```bash
cd apps/api

# Option 1: Development (creates migration if needed)
npx prisma migrate dev

# Option 2: Production (applies existing migrations)
npx prisma migrate deploy

# Option 3: Manual (apply specific migration)
psql -U openmeet_ai -d openmeet_ai_db -f prisma/migrations/20251114030604_all_feature_gaps/migration.sql
```

### Migration Includes

The migration creates all tables for:
- **GAP #1**: Multi-Meeting AI Intelligence (already migrated)
- **GAP #2**: Revenue Intelligence
  - Deal tracking
  - Win-loss analysis
  - Sales coaching scorecards
- **GAP #3**: Video Intelligence
  - Video processing and storage
  - Clip creation
  - Highlight detection
  - Screen share analysis
- **GAP #5**: Live Features
  - Live transcription sessions
  - Real-time bookmarks
  - Live insights
  - Reactions
- **GAP #6**: Advanced AI
  - Custom vocabulary
  - AI model training
  - Quality scoring
  - AI analysis tracking
- **GAP #7**: Workflow Automation
  - Meeting templates
  - Conversation threading
  - Follow-up automation
  - Smart scheduling
  - Automation rules

### Verify Migration

```bash
# Check applied migrations
npx prisma migrate status

# View database schema
npx prisma studio  # Opens at http://localhost:5555

# Or use psql
psql -U openmeet_ai -d openmeet_ai_db
\dt  # List all tables
\d "Deal"  # Describe Deal table
```

## Running the Application

### Development Mode

```bash
# Start all services in separate terminals

# Terminal 1: API Server
cd apps/api
npm run dev
# Runs on http://localhost:4000

# Terminal 2: AI Service
cd apps/ai-service
python -m uvicorn app.main:app --reload --port 5001
# Runs on http://localhost:5001

# Terminal 3: Background Workers
cd apps/api
npm run dev:worker
# Processes Bull queue jobs (workflow automation, follow-ups, etc.)
```

### Production Mode

```bash
# Build the application
cd apps/api
npm run build

# Start API server
npm run start

# Start workers
npm run start:worker

# Start AI service (in production with gunicorn)
cd apps/ai-service
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:5001
```

### Using Process Managers

#### PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'openmeet-api',
      cwd: './apps/api',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'openmeet-worker',
      cwd: './apps/api',
      script: 'npm',
      args: 'run start:worker',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'openmeet',
      cwd: './apps/ai-service',
      script: 'python',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 5001',
      interpreter: 'python3',
      env: {
        PYTHON_ENV: 'production',
      },
    },
  ],
};
EOF

# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all
```

## Feature Testing

### GAP #1: Multi-Meeting AI Intelligence

```bash
# Test cross-meeting search
curl -X POST http://localhost:4000/api/intelligence/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "action items about the product launch",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }'

# Test AI chat assistant
curl -X POST http://localhost:4000/api/intelligence/ask \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What were the main concerns raised in recent client meetings?",
    "conversationHistory": []
  }'
```

### GAP #2: Revenue Intelligence

```bash
# Create a deal
curl -X POST http://localhost:4000/api/revenue/deals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp Enterprise Deal",
    "amount": 50000,
    "stage": "proposal",
    "probability": 60
  }'

# Generate sales coaching scorecard
curl -X POST http://localhost:4000/api/revenue/scorecard \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "<meeting-id>",
    "userId": "<user-id>"
  }'
```

### GAP #3: Video Intelligence

```bash
# Upload video
curl -X POST http://localhost:4000/api/video/upload \
  -H "Authorization: Bearer <token>" \
  -F "video=@/path/to/video.mp4" \
  -F "meetingId=<meeting-id>"

# Generate highlights
curl -X POST http://localhost:4000/api/video/<video-id>/highlights \
  -H "Authorization: Bearer <token>"
```

### GAP #5: Live Features

```javascript
// Connect to WebSocket
const io = require('socket.io-client');
const socket = io('ws://localhost:5000', {
  auth: { token: '<jwt-token>' }
});

socket.on('connect', () => {
  socket.emit('live:join', { meetingId: '<meeting-id>' });
});

socket.on('live:transcript', (segment) => {
  console.log('New transcript:', segment);
});

socket.on('live:insight', (insight) => {
  console.log('AI insight:', insight);
});
```

### GAP #6: Advanced AI

```bash
# Add custom vocabulary
curl -X POST http://localhost:4000/api/ai-advanced/vocabulary \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "term": "K8s",
    "expansion": "Kubernetes",
    "definition": "Container orchestration platform",
    "category": "technical"
  }'

# Train custom model
curl -X POST http://localhost:4000/api/ai-advanced/models \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Category Model",
    "type": "categorization",
    "trainingData": [...]
  }'
```

### GAP #7: Workflow Automation

```bash
# Create meeting template
curl -X POST http://localhost:4000/api/workflows/templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly 1:1 Template",
    "type": "one_on_one",
    "templateData": {
      "agenda": ["Updates", "Blockers", "Goals"],
      "duration": 30
    }
  }'

# Configure automated follow-up
curl -X POST http://localhost:4000/api/workflows/follow-ups \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Send Summary Email",
    "trigger": "meeting_end",
    "action": "send_email",
    "actionConfig": {
      "template": "meeting_summary",
      "recipients": ["participants"]
    }
  }'
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U openmeet_ai -d openmeet_ai_db -c "SELECT version();"

# Check logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Check with password
redis-cli -a redis123 ping

# Check logs
tail -f /var/log/redis/redis-server.log
```

### Migration Errors

```bash
# Reset database (DANGER: Deletes all data!)
npx prisma migrate reset

# Apply migrations manually
npx prisma db push

# Force migration
npx prisma migrate deploy --force
```

### FFmpeg Not Found

```bash
# Install FFmpeg
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Verify installation
which ffmpeg
ffmpeg -version
```

### Worker Not Processing Jobs

```bash
# Check Redis connection (Bull requires Redis)
redis-cli -a redis123 ping

# Check Bull queue
redis-cli -a redis123
KEYS bull:*
LLEN bull:workflow-processing:wait

# Monitor worker logs
npm run dev:worker
```

## Performance Optimization

### Database Indexing

All critical indexes are included in the Prisma schema and created by migrations. Verify with:

```sql
-- Check indexes on Deal table
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Deal';

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM "Meeting" WHERE "organizationId" = '<org-id>';
```

### Redis Caching

Implement caching for frequently accessed data:

```typescript
// Example: Cache meeting summary
const cacheKey = `meeting:summary:${meetingId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const summary = await generateSummary(meetingId);
await redis.setex(cacheKey, 3600, JSON.stringify(summary));
```

### Bull Queue Concurrency

Adjust worker concurrency in `.env`:

```bash
BULL_QUEUE_CONCURRENCY=10  # Process up to 10 jobs concurrently
```

## Security Checklist

- [x] JWT secrets configured (pre-generated securely)
- [x] Encryption key configured (256-bit AES)
- [ ] Update OPENAI_API_KEY in production
- [ ] Update SENDGRID_API_KEY in production
- [ ] Configure CORS_ORIGIN for production domains
- [ ] Enable HTTPS in production
- [ ] Set secure cookie flags (`COOKIE_SECURE=true`)
- [ ] Configure firewall rules
- [ ] Enable database SSL/TLS
- [ ] Rotate secrets regularly
- [ ] Enable audit logging

## Next Steps

1. ✅ Database migrations created and ready
2. ✅ Environment configuration updated
3. ✅ Package dependencies updated
4. ⏳ Install dependencies: `npm install`
5. ⏳ Generate Prisma client: `npx prisma generate`
6. ⏳ Run migrations: `npx prisma migrate deploy`
7. ⏳ Start services
8. ⏳ Run tests
9. ⏳ Deploy to production

## Support

For issues or questions:
- GitHub Issues: <repository-url>/issues
- Documentation: /docs
- Email: support@openmeet.com

---

**Last Updated**: 2025-11-14
**Version**: 2.0.0-beta (All GAP Features Implemented)
