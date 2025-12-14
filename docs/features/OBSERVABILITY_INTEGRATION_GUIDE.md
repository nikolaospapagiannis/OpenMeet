# Observability Integration Guide

Quick guide to integrate the observability infrastructure into your application.

## Backend Integration

### 1. Update `/apps/api/src/index.ts`

```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Import observability modules
import { initializeTracing, tracingMiddleware } from './lib/tracing';
import {
  initializeErrorMonitoring,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  userContextMiddleware
} from './lib/error-monitoring';
import { requestTracking } from './middleware/request-logger';
import {
  globalErrorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection
} from './middleware/global-error-handler';
import healthRouter, { initializeHealthChecker } from './routes/health';
import { HealthChecker } from './lib/health-checker';

const app = express();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// 1. Initialize tracing FIRST (before app creation if possible)
initializeTracing();

// 2. Initialize error monitoring
initializeErrorMonitoring(app);

// 3. Setup global error handlers
handleUncaughtException();
handleUnhandledRejection();

// 4. Early middleware (order matters!)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());
app.use(requestTracking()); // Adds requestId and logger to req

// 5. After request tracking
app.use(tracingMiddleware()); // Adds traceId to req
app.use(userContextMiddleware()); // Sets Sentry user context

// 6. Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ... other middleware

// 7. Health checks (BEFORE auth middleware)
const healthChecker = new HealthChecker({
  prisma,
  redis,
  // mongoose: mongoose (if using MongoDB)
});
initializeHealthChecker(healthChecker);
app.use('/health', healthRouter);

// 8. Your routes
app.use('/api', yourRoutes);

// 9. Error handling middleware (LAST)
app.use(notFoundHandler);
app.use(sentryErrorHandler());
app.use(globalErrorHandler);

// 10. Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
```

### 2. Update Route Handlers

Replace old error handling:

```typescript
// ❌ OLD
router.get('/meetings', async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany();
    res.json(meetings);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});
```

With new structured approach:

```typescript
// ✅ NEW
import { createModuleLogger } from '../lib/logger';
import { asyncHandler } from '../middleware/global-error-handler';

const logger = createModuleLogger('meetings');

router.get('/meetings', asyncHandler(async (req, res) => {
  // Use req.logger for request-scoped logging
  req.logger.info('Fetching meetings', { userId: req.user?.id });

  const meetings = await prisma.meeting.findMany();

  req.logger.info('Meetings fetched', { count: meetings.length });
  res.json(meetings);
}));
```

### 3. Environment Variables

Add to `.env`:

```bash
# Logging
LOG_LEVEL=info
NODE_ENV=production

# Tracing
ENABLE_TRACING=true
TRACING_EXPORTER=jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces
SERVICE_NAME=openmeet-api
APP_VERSION=1.0.0

# Error Monitoring (Sentry)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

---

## Frontend Integration

### 1. Update `/apps/web/src/app/layout.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { errorMonitoring } from '@/lib/error-monitoring';
import { setupAxiosInterceptors } from '@/lib/error-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize error monitoring
    errorMonitoring.init();

    // Setup Axios interceptors
    setupAxiosInterceptors();
  }, []);

  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### 2. Wrap Page Components

```typescript
// /apps/web/src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingPage } from '@/components/LoadingPage';
import { DashboardStatsSkeleton } from '@/components/SkeletonLoader';
import { useErrorHandler } from '@/hooks/useErrorHandler';

function DashboardContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const { error, handleError } = useErrorHandler();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setData(data);
    } catch (err) {
      handleError(err as Error, { context: 'dashboard_fetch' });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) return <DashboardStatsSkeleton />;
  if (error) return <div>Error loading dashboard</div>;

  return <div>{/* Your dashboard content */}</div>;
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
```

### 3. Using Error Handler Hook

```typescript
import { useAsyncError } from '@/hooks/useErrorHandler';
import { ButtonSpinner } from '@/components/LoadingSpinner';

function MyComponent() {
  const { error, isLoading, executeAsync } = useAsyncError();

  async function handleSubmit(data: any) {
    await executeAsync(
      async () => {
        const response = await fetch('/api/submit', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return response.json();
      },
      {
        onSuccess: (result) => {
          console.log('Success:', result);
        },
        onError: (error) => {
          console.error('Failed:', error);
        },
        context: { operation: 'submit_form', formType: 'contact' }
      }
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error.message}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? <ButtonSpinner /> : 'Submit'}
      </button>
    </form>
  );
}
```

### 4. Loading States

```typescript
import { LoadingSpinner, InlineSpinner } from '@/components/LoadingSpinner';
import { MeetingCardSkeleton, ListSkeleton } from '@/components/SkeletonLoader';

// Full page loading
if (isInitialLoad) return <LoadingPage text="Loading meetings..." />;

// Skeleton loading (better UX)
if (isLoading) return <MeetingCardSkeleton />;

// Inline loading
<button disabled={isSaving}>
  {isSaving && <InlineSpinner className="mr-2" />}
  Save
</button>
```

---

## Using Distributed Tracing

### Backend - Custom Spans

```typescript
import { traceFunction, addSpanEvent } from '../lib/tracing';

async function processData(data: any) {
  return traceFunction('process-data', async (span) => {
    span.setAttribute('data.size', data.length);

    // Add events
    addSpanEvent('validation-started');
    await validateData(data);

    addSpanEvent('processing-started');
    const result = await heavyProcessing(data);

    span.setAttribute('result.items', result.length);
    return result;
  });
}
```

### Backend - Decorator Pattern

```typescript
import { Trace } from '../lib/tracing';

class MeetingService {
  @Trace('meeting-service.create')
  async createMeeting(data: CreateMeetingDto) {
    // Automatically traced!
    return await this.prisma.meeting.create({ data });
  }
}
```

---

## Health Check Endpoints

### Check Application Health

```bash
# Comprehensive health check
curl http://localhost:3001/health

# Liveness probe (Kubernetes)
curl http://localhost:3001/health/live

# Readiness probe (Kubernetes)
curl http://localhost:3001/health/ready

# Detailed health info (internal use)
curl http://localhost:3001/health/detailed
```

### Example Response

```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T12:00:00.000Z",
  "uptime": 12345.67,
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connection successful",
      "responseTime": 12
    },
    "redis": {
      "status": "pass",
      "message": "Redis connection successful",
      "responseTime": 3
    },
    "system": {
      "status": "pass",
      "message": "System resources normal"
    }
  },
  "system": {
    "memory": {
      "total": 17179869184,
      "free": 8589934592,
      "used": 8589934592,
      "usagePercent": 50
    },
    "cpu": {
      "loadAverage": [1.2, 1.5, 1.8],
      "cores": 8
    }
  }
}
```

---

## Viewing Traces

### Jaeger UI

1. Start Jaeger (if not already running):
```bash
docker run -d --name jaeger \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 14250:14250 \
  jaegertracing/all-in-one:latest
```

2. Open browser: http://localhost:16686

3. Search for traces by:
   - Service name: `openmeet-api`
   - Operation
   - Tags (userId, endpoint, etc.)
   - Duration

---

## Viewing Logs

### Local Development

Logs are written to:
- `/apps/api/logs/combined.log` - All logs
- `/apps/api/logs/error.log` - Errors only
- `/apps/api/logs/http.log` - HTTP requests
- `/apps/api/logs/exceptions.log` - Uncaught exceptions
- `/apps/api/logs/rejections.log` - Unhandled rejections

### Production

Ship logs to your logging service:

**ELK Stack:**
```bash
filebeat.inputs:
- type: log
  paths:
    - /var/log/openmeet-api/*.log
  json.keys_under_root: true
  json.add_error_key: true
```

**CloudWatch:**
```bash
# Install CloudWatch agent and configure to ship JSON logs
```

**Datadog:**
```bash
# Use Datadog agent with log collection enabled
```

---

## Error Monitoring (Sentry)

### View Errors

1. Go to sentry.io (or your self-hosted instance)
2. Select your project
3. View:
   - Error frequency and trends
   - Stack traces
   - User impact
   - Release tracking
   - Performance issues

### Set Up Alerts

1. Navigate to Alerts → Create Alert
2. Configure:
   - Error threshold (e.g., >100 errors/hour)
   - Performance degradation
   - Custom metrics

### Releases

Track deployments:

```bash
# Create release
sentry-cli releases new openmeet-api@1.0.0

# Associate commits
sentry-cli releases set-commits openmeet-api@1.0.0 --auto

# Finalize release
sentry-cli releases finalize openmeet-api@1.0.0
```

---

## Testing

### Test Error Boundary

```typescript
// Create a component that throws
function BrokenComponent() {
  throw new Error('Test error boundary');
}

// Render with error boundary
<ErrorBoundary>
  <BrokenComponent />
</ErrorBoundary>
```

### Test Error Monitoring

```bash
curl -X POST http://localhost:3001/api/test/error
```

### Test Health Checks

```bash
# Should return 200 OK
curl http://localhost:3001/health/live

# Check detailed status
curl http://localhost:3001/health/detailed | jq
```

### Test Logging

```typescript
// In any route handler
req.logger.info('Test log', { test: true, userId: '123' });
req.logger.error('Test error', { error: 'something bad' });
```

### Test Tracing

1. Make API request
2. Check response headers for `X-Trace-ID`
3. Search for trace in Jaeger UI using trace ID

---

## Troubleshooting

### Logs Not Appearing

- Check `LOG_LEVEL` environment variable
- Verify `/logs` directory has write permissions
- Check Winston transport configuration

### Traces Not Showing in Jaeger

- Verify `ENABLE_TRACING=true`
- Check Jaeger is running: `curl http://localhost:14268/api/traces`
- Verify `JAEGER_ENDPOINT` is correct
- Check network connectivity

### Sentry Errors Not Captured

- Verify `SENTRY_DSN` is set
- Check Sentry dashboard for quota limits
- Verify error isn't in ignore list
- Check `beforeSend` filter in error-monitoring.ts

### Health Check Failing

- Check database connection
- Verify Redis is running
- Check system resources (memory, disk)
- Review detailed health endpoint for specifics

---

## Best Practices

### 1. Always Use Request Logger

```typescript
// ✅ Good
req.logger.info('Processing request', { userId: req.user?.id });

// ❌ Bad
console.log('Processing request');
```

### 2. Use asyncHandler for Routes

```typescript
// ✅ Good
router.get('/users', asyncHandler(async (req, res) => {
  const users = await getUsers();
  res.json(users);
}));

// ❌ Bad
router.get('/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error });
  }
});
```

### 3. Show Loading States

```typescript
// ✅ Good
if (isLoading) return <SkeletonLoader />;
return <Content data={data} />;

// ❌ Bad
if (isLoading) return null;
return <Content data={data} />;
```

### 4. Wrap Components in Error Boundaries

```typescript
// ✅ Good
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>

// ❌ Bad
<ComplexComponent />
```

### 5. Add Context to Errors

```typescript
// ✅ Good
handleError(error, {
  operation: 'create_meeting',
  meetingId: meeting.id,
  userId: user.id
});

// ❌ Bad
handleError(error);
```

---

## Summary

You now have:
- ✅ Complete error handling infrastructure
- ✅ Distributed tracing across all services
- ✅ Structured logging with correlation
- ✅ Health monitoring endpoints
- ✅ Loading states for better UX
- ✅ Error monitoring and alerting

Your application is production-ready with Fortune 100-grade observability!
