# Enterprise Features Implementation Plan

## Overview

Implementation plan for 4 enterprise-grade features with full multi-tenant compliance, no shortcuts, no bypass.

**Features to Implement:**
1. Geographic Distribution with Real GeoIP
2. Real-time Concurrent Users with WebSocket
3. Real-time Analytics Stream
4. Comprehensive Testing Suite

---

## Feature 1: Geographic Distribution with Real GeoIP

### Current State
- Session model has `ipAddress` field
- AuditLog captures IP addresses
- No GeoIP service integration
- Frontend map shows mock/static data

### Implementation Plan

#### 1.1 Backend: GeoIP Service (MaxMind GeoLite2)

**File: `apps/api/src/services/GeoIPService.ts`**

```typescript
// Enterprise-grade GeoIP service using MaxMind GeoLite2
// - Automatic database updates (weekly)
// - In-memory caching with LRU
// - Multi-tenant session tracking
// - Privacy-compliant IP anonymization option

interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  accuracy: number; // km radius
}

class GeoIPService {
  - lookupIP(ip: string): Promise<GeoLocation | null>
  - updateDatabase(): Promise<void> // Weekly cron job
  - getSessionLocations(organizationId: string): Promise<SessionLocation[]>
  - aggregateByCountry(organizationId: string): Promise<CountryStats[]>
  - aggregateByRegion(organizationId: string): Promise<RegionStats[]>
}
```

**Dependencies to add:**
- `maxmind` - MaxMind GeoLite2 reader
- `@maxmind/geoip2-node` - Official Node.js API
- `node-cron` - For weekly database updates

#### 1.2 Database Schema Updates

**File: `apps/api/prisma/schema.prisma`**

```prisma
model SessionGeoData {
  id             String   @id @default(uuid())
  sessionId      String   @unique
  session        Session  @relation(fields: [sessionId], references: [id])
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // GeoIP data
  country        String
  countryCode    String   @db.Char(2)
  region         String?
  city           String?
  latitude       Float?
  longitude      Float?
  timezone       String?

  // Anonymized for GDPR
  ipHash         String   // SHA-256 hash, not raw IP

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, countryCode])
  @@index([organizationId, createdAt])
}
```

#### 1.3 API Endpoints

**File: `apps/api/src/routes/admin/analytics-geo.ts`**

```typescript
// GET /api/admin/analytics/geo/distribution
// - Returns aggregated country/region distribution
// - Multi-tenant: scoped by organizationId for platform admins
// - Super admin: can view all or filter by org

// GET /api/admin/analytics/geo/sessions
// - Returns active session locations (anonymized)
// - Real-time data with WebSocket subscription option

// GET /api/admin/analytics/geo/heatmap
// - Returns heatmap data for visualization
// - Configurable time range and granularity
```

#### 1.4 Frontend Integration

**File: `apps/web/src/app/(admin)/admin/analytics/components/GeoDistributionMap.tsx`**

- Replace mock data with real API calls
- Use react-simple-maps with real coordinates
- Add loading states and error handling
- Implement drill-down by country → region → city
- Real-time updates via WebSocket subscription

### Verification Commands
```bash
# Test GeoIP lookup
curl -X GET "http://localhost:4100/api/admin/analytics/geo/lookup?ip=8.8.8.8" \
  -H "Authorization: Bearer $TOKEN"

# Get distribution
curl -X GET "http://localhost:4100/api/admin/analytics/geo/distribution" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Feature 2: Real-time Concurrent Users with WebSocket

### Current State
- Socket.IO installed and configured
- LiveMeetingHandler exists but lacks multi-tenant isolation
- In-memory state management (won't scale)
- No Redis adapter for horizontal scaling

### Critical Issues to Fix
1. **No organizationId validation** in WebSocket connections
2. **In-memory Maps** for connection state
3. **No Redis adapter** for multi-server deployment
4. **No session validation** on WebSocket auth

### Implementation Plan

#### 2.1 Redis Adapter for Socket.IO

**File: `apps/api/src/websocket/setup.ts`**

```typescript
// Add Redis adapter for horizontal scaling
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

**Dependencies to add:**
- `@socket.io/redis-adapter`

#### 2.2 Multi-Tenant WebSocket Handler

**File: `apps/api/src/websocket/AdminRealtimeHandler.ts`**

```typescript
// Enterprise-grade real-time handler with multi-tenant isolation
class AdminRealtimeHandler {
  // Connection state stored in Redis, not memory
  private redis: RedisClient;

  // Namespaces by organization for isolation
  // /admin/{organizationId}/concurrent-users
  // /admin/{organizationId}/analytics-stream

  async handleConnection(socket: Socket) {
    // 1. Validate JWT token
    // 2. Verify user has admin role (SystemRole or UserRole)
    // 3. Extract organizationId from token
    // 4. Join organization-specific room
    // 5. Update Redis connection count
    // 6. Broadcast updated count to organization room
  }

  async handleDisconnection(socket: Socket) {
    // 1. Decrement Redis connection count
    // 2. Remove from organization room
    // 3. Broadcast updated count
  }

  async getConcurrentUsers(organizationId: string): Promise<number> {
    // Read from Redis, not memory
    return redis.get(`concurrent:${organizationId}`);
  }

  async broadcastToOrganization(orgId: string, event: string, data: any) {
    // Emit only to sockets in that organization's room
    io.to(`org:${orgId}`).emit(event, data);
  }
}
```

#### 2.3 Concurrent Users Service

**File: `apps/api/src/services/ConcurrentUsersService.ts`**

```typescript
class ConcurrentUsersService {
  // Track concurrent users per organization in Redis

  async increment(organizationId: string, userId: string, socketId: string) {
    // Use Redis SET for unique users
    await redis.sadd(`concurrent:users:${organizationId}`, `${userId}:${socketId}`);
    // Set TTL for auto-cleanup
    await redis.expire(`concurrent:users:${organizationId}`, 3600);
  }

  async decrement(organizationId: string, userId: string, socketId: string) {
    await redis.srem(`concurrent:users:${organizationId}`, `${userId}:${socketId}`);
  }

  async getCount(organizationId: string): Promise<number> {
    return redis.scard(`concurrent:users:${organizationId}`);
  }

  async getGlobalCount(): Promise<number> {
    // Super admin only - count across all orgs
    const keys = await redis.keys('concurrent:users:*');
    let total = 0;
    for (const key of keys) {
      total += await redis.scard(key);
    }
    return total;
  }

  async getByOrganization(): Promise<Map<string, number>> {
    // Super admin only - breakdown by org
  }
}
```

#### 2.4 Frontend WebSocket Integration

**File: `apps/web/src/hooks/useRealtimeConcurrentUsers.ts`**

```typescript
export function useRealtimeConcurrentUsers() {
  const [count, setCount] = useState<number>(0);
  const [byOrganization, setByOrganization] = useState<Map<string, number>>();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>();

  useEffect(() => {
    const socket = io('/admin/concurrent-users', {
      auth: { token: getAuthToken() },
      transports: ['websocket'], // No polling fallback for real-time
    });

    socket.on('concurrent-users:update', (data) => {
      setCount(data.count);
      setByOrganization(data.byOrganization);
    });

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('error', () => setConnectionStatus('error'));

    return () => socket.disconnect();
  }, []);

  return { count, byOrganization, connectionStatus };
}
```

**File: `apps/web/src/app/(admin)/admin/analytics/components/ConcurrentUsersGauge.tsx`**

- Replace mock data with WebSocket subscription
- Show real-time gauge animation
- Display connection status indicator
- For super_admin: show breakdown by organization

### Verification Commands
```bash
# Test WebSocket connection
wscat -c "ws://localhost:4100/admin/concurrent-users" \
  -H "Authorization: Bearer $TOKEN"

# Check Redis concurrent users
docker exec redis redis-cli SCARD "concurrent:users:org-123"

# Check Redis adapter working
docker exec redis redis-cli PUBSUB CHANNELS "socket.io*"
```

---

## Feature 3: Real-time Analytics Stream

### Current State
- AdvancedAnalyticsService exists with comprehensive analytics
- No real-time streaming capability
- Frontend polls for updates (not real-time)

### Implementation Plan

#### 3.1 Analytics Event Publisher

**File: `apps/api/src/services/AnalyticsEventPublisher.ts`**

```typescript
// Publishes analytics events to Redis pub/sub for real-time streaming
class AnalyticsEventPublisher {
  private redis: RedisClient;

  // Event types
  async publishMeetingStarted(organizationId: string, meetingId: string) {
    await this.publish(organizationId, 'meeting:started', { meetingId });
  }

  async publishMeetingEnded(organizationId: string, meetingId: string, stats: MeetingStats) {
    await this.publish(organizationId, 'meeting:ended', { meetingId, stats });
  }

  async publishUserActivity(organizationId: string, activity: UserActivity) {
    await this.publish(organizationId, 'user:activity', activity);
  }

  async publishTranscriptionProgress(organizationId: string, meetingId: string, progress: number) {
    await this.publish(organizationId, 'transcription:progress', { meetingId, progress });
  }

  async publishAIInsight(organizationId: string, insight: AIInsight) {
    await this.publish(organizationId, 'ai:insight', insight);
  }

  private async publish(organizationId: string, event: string, data: any) {
    const channel = `analytics:${organizationId}`;
    await this.redis.publish(channel, JSON.stringify({ event, data, timestamp: Date.now() }));
  }
}
```

#### 3.2 Analytics Stream WebSocket Handler

**File: `apps/api/src/websocket/AnalyticsStreamHandler.ts`**

```typescript
class AnalyticsStreamHandler {
  private redis: RedisClient;
  private subscribers: Map<string, RedisSubscriber> = new Map();

  async handleConnection(socket: Socket) {
    const { organizationId, isSuperAdmin } = socket.data;

    if (isSuperAdmin) {
      // Subscribe to all organization channels
      await this.subscribeToAllOrgs(socket);
    } else {
      // Subscribe only to own organization
      await this.subscribeToOrg(socket, organizationId);
    }
  }

  private async subscribeToOrg(socket: Socket, orgId: string) {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(`analytics:${orgId}`);

    subscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      socket.emit('analytics:event', data);
    });

    this.subscribers.set(socket.id, subscriber);
  }

  async handleDisconnection(socket: Socket) {
    const subscriber = this.subscribers.get(socket.id);
    if (subscriber) {
      await subscriber.unsubscribe();
      await subscriber.quit();
      this.subscribers.delete(socket.id);
    }
  }
}
```

#### 3.3 Server-Sent Events Alternative

**File: `apps/api/src/routes/admin/analytics-stream.ts`**

```typescript
// SSE endpoint for browsers that prefer SSE over WebSocket
router.get('/api/admin/analytics/stream', adminAuth, async (req, res) => {
  const { organizationId, isSuperAdmin } = req.user;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const subscriber = redis.duplicate();

  if (isSuperAdmin) {
    await subscriber.psubscribe('analytics:*');
  } else {
    await subscriber.subscribe(`analytics:${organizationId}`);
  }

  subscriber.on('message', (channel, message) => {
    res.write(`data: ${message}\n\n`);
  });

  req.on('close', async () => {
    await subscriber.unsubscribe();
    await subscriber.quit();
  });
});
```

#### 3.4 Frontend Analytics Stream Hook

**File: `apps/web/src/hooks/useAnalyticsStream.ts`**

```typescript
export function useAnalyticsStream(options?: { useSSE?: boolean }) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    activeMeetings: 0,
    activeUsers: 0,
    transcriptionsInProgress: 0,
    aiProcessingQueue: 0,
  });

  useEffect(() => {
    if (options?.useSSE) {
      // SSE implementation
      const eventSource = new EventSource('/api/admin/analytics/stream', {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleEvent(data);
      };

      return () => eventSource.close();
    } else {
      // WebSocket implementation
      const socket = io('/admin/analytics-stream', {
        auth: { token: getAuthToken() },
      });

      socket.on('analytics:event', handleEvent);

      return () => socket.disconnect();
    }
  }, []);

  const handleEvent = (event: AnalyticsEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100

    // Update real-time metrics
    switch (event.event) {
      case 'meeting:started':
        setMetrics(m => ({ ...m, activeMeetings: m.activeMeetings + 1 }));
        break;
      case 'meeting:ended':
        setMetrics(m => ({ ...m, activeMeetings: m.activeMeetings - 1 }));
        break;
      // ... other cases
    }
  };

  return { events, metrics };
}
```

#### 3.5 Analytics Dashboard Component

**File: `apps/web/src/app/(admin)/admin/analytics/components/RealtimeAnalyticsStream.tsx`**

- Live event feed with filtering
- Real-time metric cards with animations
- Activity sparklines
- Organization selector for super admins

### Verification Commands
```bash
# Test SSE stream
curl -N -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4100/api/admin/analytics/stream"

# Test WebSocket stream
wscat -c "ws://localhost:4100/admin/analytics-stream" \
  -H "Authorization: Bearer $TOKEN"

# Publish test event
docker exec redis redis-cli PUBLISH "analytics:org-123" \
  '{"event":"meeting:started","data":{"meetingId":"m-1"}}'
```

---

## Feature 4: Comprehensive Testing Suite

### Current State
- Jest configured for API and Web
- Playwright E2E tests exist (10 files)
- Weak component test coverage (13 tests)
- No performance/load testing
- No contract testing

### Implementation Plan

#### 4.1 API Integration Tests

**Directory: `apps/api/tests/integration/`**

```
integration/
├── auth/
│   ├── login.test.ts
│   ├── registration.test.ts
│   ├── mfa.test.ts
│   └── session.test.ts
├── admin/
│   ├── analytics.test.ts
│   ├── users.test.ts
│   ├── organizations.test.ts
│   └── api-keys.test.ts
├── meetings/
│   ├── crud.test.ts
│   ├── transcription.test.ts
│   └── sharing.test.ts
├── multi-tenant/
│   ├── isolation.test.ts
│   ├── cross-org-access.test.ts
│   └── role-permissions.test.ts
└── websocket/
    ├── connection.test.ts
    ├── concurrent-users.test.ts
    └── analytics-stream.test.ts
```

**Test Utilities:**

**File: `apps/api/tests/utils/test-factory.ts`**

```typescript
// Factory for creating test data with proper multi-tenant isolation
export class TestFactory {
  async createOrganization(overrides?: Partial<Organization>): Promise<Organization> {
    return prisma.organization.create({
      data: {
        name: `Test Org ${randomUUID()}`,
        slug: `test-org-${randomUUID()}`,
        ...overrides,
      },
    });
  }

  async createUser(organizationId: string, role: UserRole = 'user'): Promise<User> {
    // ...
  }

  async createAdminUser(systemRole: SystemRole): Promise<User> {
    // ...
  }

  async createMeeting(organizationId: string, ownerId: string): Promise<Meeting> {
    // ...
  }
}
```

**File: `apps/api/tests/utils/auth-helpers.ts`**

```typescript
export async function getAuthToken(user: User): Promise<string> {
  // Generate valid JWT for test user
}

export async function getAdminToken(systemRole: SystemRole): Promise<string> {
  // Generate admin token with system role
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
```

**Example Integration Test:**

**File: `apps/api/tests/integration/multi-tenant/isolation.test.ts`**

```typescript
describe('Multi-Tenant Isolation', () => {
  let org1: Organization;
  let org2: Organization;
  let user1: User;
  let user2: User;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    org1 = await factory.createOrganization();
    org2 = await factory.createOrganization();
    user1 = await factory.createUser(org1.id);
    user2 = await factory.createUser(org2.id);
    token1 = await getAuthToken(user1);
    token2 = await getAuthToken(user2);
  });

  afterAll(async () => {
    await cleanupOrganization(org1.id);
    await cleanupOrganization(org2.id);
  });

  it('should not allow user to access other organization meetings', async () => {
    const meeting = await factory.createMeeting(org1.id, user1.id);

    const response = await request(app)
      .get(`/api/meetings/${meeting.id}`)
      .set(authHeader(token2)); // User from org2

    expect(response.status).toBe(404); // Not 403, don't leak existence
  });

  it('should isolate analytics data by organization', async () => {
    // Create meetings in both orgs
    await factory.createMeeting(org1.id, user1.id);
    await factory.createMeeting(org1.id, user1.id);
    await factory.createMeeting(org2.id, user2.id);

    // User1 should only see org1 meetings
    const response = await request(app)
      .get('/api/meetings')
      .set(authHeader(token1));

    expect(response.body.data.length).toBe(2);
    expect(response.body.data.every(m => m.organizationId === org1.id)).toBe(true);
  });

  // More isolation tests...
});
```

#### 4.2 React Component Tests

**Directory: `apps/web/src/__tests__/components/`**

```
components/
├── admin/
│   ├── AnalyticsCharts.test.tsx
│   ├── ConcurrentUsersGauge.test.tsx
│   ├── GeoDistributionMap.test.tsx
│   ├── UserManagement.test.tsx
│   └── OrganizationSelector.test.tsx
├── meetings/
│   ├── MeetingCard.test.tsx
│   ├── TranscriptViewer.test.tsx
│   └── SpeakerTimeline.test.tsx
├── shared/
│   ├── DataTable.test.tsx
│   ├── Charts.test.tsx
│   └── Forms.test.tsx
└── hooks/
    ├── useRealtimeConcurrentUsers.test.ts
    ├── useAnalyticsStream.test.ts
    └── useAuth.test.ts
```

**Test Setup:**

**File: `apps/web/src/__tests__/setup.ts`**

```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**File: `apps/web/src/__tests__/mocks/handlers.ts`**

```typescript
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/admin/analytics/concurrent-users', (req, res, ctx) => {
    return res(ctx.json({ count: 42, byOrganization: { 'org-1': 20, 'org-2': 22 } }));
  }),

  rest.get('/api/admin/analytics/geo/distribution', (req, res, ctx) => {
    return res(ctx.json({
      countries: [
        { code: 'US', name: 'United States', count: 1000 },
        { code: 'GB', name: 'United Kingdom', count: 500 },
      ],
    }));
  }),

  // More handlers...
];
```

**Example Component Test:**

**File: `apps/web/src/__tests__/components/admin/ConcurrentUsersGauge.test.tsx`**

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { ConcurrentUsersGauge } from '@/app/(admin)/admin/analytics/components/ConcurrentUsersGauge';
import { WS } from 'jest-websocket-mock';

describe('ConcurrentUsersGauge', () => {
  let server: WS;

  beforeEach(() => {
    server = new WS('ws://localhost:4100/admin/concurrent-users');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should display loading state initially', () => {
    render(<ConcurrentUsersGauge />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display concurrent user count from WebSocket', async () => {
    render(<ConcurrentUsersGauge />);

    await server.connected;
    server.send(JSON.stringify({ count: 42 }));

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('should show connection status indicator', async () => {
    render(<ConcurrentUsersGauge />);

    await server.connected;
    expect(screen.getByTestId('connection-status')).toHaveClass('connected');

    server.close();

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveClass('disconnected');
    });
  });
});
```

#### 4.3 E2E Tests with Playwright

**Directory: `apps/web/e2e/`**

```
e2e/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── session-timeout.spec.ts
├── admin/
│   ├── dashboard.spec.ts
│   ├── analytics.spec.ts
│   ├── user-management.spec.ts
│   └── organization-management.spec.ts
├── meetings/
│   ├── create-meeting.spec.ts
│   ├── view-transcript.spec.ts
│   └── share-meeting.spec.ts
├── multi-tenant/
│   ├── org-switching.spec.ts
│   └── role-based-access.spec.ts
└── real-time/
    ├── concurrent-users.spec.ts
    └── analytics-stream.spec.ts
```

**Playwright Configuration:**

**File: `apps/web/playwright.config.ts`**

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    port: 4200,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Example E2E Test:**

**File: `apps/web/e2e/admin/analytics.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin } from '../helpers/auth';

test.describe('Admin Analytics', () => {
  test('should display real-time concurrent users for admin', async ({ page }) => {
    await loginAsAdmin(page, 'org-1');
    await page.goto('/admin/analytics');

    // Wait for WebSocket connection
    await expect(page.getByTestId('connection-status')).toHaveClass(/connected/);

    // Verify concurrent users gauge is visible
    await expect(page.getByTestId('concurrent-users-gauge')).toBeVisible();

    // Verify only org's data is shown (not breakdown)
    await expect(page.getByTestId('org-breakdown')).not.toBeVisible();
  });

  test('should display org breakdown for super admin', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/analytics');

    // Super admin sees breakdown
    await expect(page.getByTestId('org-breakdown')).toBeVisible();

    // Should see multiple organizations
    const orgRows = page.getByTestId('org-row');
    await expect(orgRows).toHaveCount.greaterThan(1);
  });

  test('should display geographic distribution map', async ({ page }) => {
    await loginAsAdmin(page, 'org-1');
    await page.goto('/admin/analytics');

    // Map should load with real data
    await expect(page.getByTestId('geo-map')).toBeVisible();

    // Should have country markers
    const markers = page.getByTestId('country-marker');
    await expect(markers).toHaveCount.greaterThan(0);

    // Click on a country should show details
    await markers.first().click();
    await expect(page.getByTestId('country-details')).toBeVisible();
  });

  test('should update analytics in real-time', async ({ page }) => {
    await loginAsAdmin(page, 'org-1');
    await page.goto('/admin/analytics');

    // Get initial count
    const initialCount = await page.getByTestId('active-meetings-count').textContent();

    // Trigger a meeting creation (via API or another browser)
    await page.evaluate(async () => {
      await fetch('/api/test/trigger-meeting-event', { method: 'POST' });
    });

    // Wait for WebSocket update
    await expect(async () => {
      const newCount = await page.getByTestId('active-meetings-count').textContent();
      expect(Number(newCount)).toBeGreaterThan(Number(initialCount));
    }).toPass({ timeout: 5000 });
  });
});
```

#### 4.4 Performance Tests with k6

**Directory: `tests/performance/`**

```
performance/
├── scripts/
│   ├── api-load.js
│   ├── websocket-load.js
│   ├── concurrent-users.js
│   └── analytics-stream.js
├── scenarios/
│   ├── normal-load.json
│   ├── spike-test.json
│   └── stress-test.json
└── thresholds.json
```

**File: `tests/performance/scripts/api-load.js`**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const analyticsLatency = new Trend('analytics_latency');

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    errors: ['rate<0.01'], // Error rate < 1%
    analytics_latency: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4100';
const TOKEN = __ENV.AUTH_TOKEN;

export function setup() {
  // Create test organization and users
  const res = http.post(`${BASE_URL}/api/test/setup-load-test`, null, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return JSON.parse(res.body);
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  // Test analytics endpoint
  const analyticsStart = Date.now();
  const analyticsRes = http.get(`${BASE_URL}/api/admin/analytics/overview`, { headers });
  analyticsLatency.add(Date.now() - analyticsStart);

  check(analyticsRes, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics has data': (r) => JSON.parse(r.body).data !== undefined,
  });
  errorRate.add(analyticsRes.status !== 200);

  // Test concurrent users endpoint
  const concurrentRes = http.get(`${BASE_URL}/api/admin/analytics/concurrent-users`, { headers });
  check(concurrentRes, {
    'concurrent users status is 200': (r) => r.status === 200,
  });

  // Test geo distribution endpoint
  const geoRes = http.get(`${BASE_URL}/api/admin/analytics/geo/distribution`, { headers });
  check(geoRes, {
    'geo status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

export function teardown(data) {
  // Cleanup test data
  http.post(`${BASE_URL}/api/test/cleanup-load-test`, JSON.stringify({ testId: data.testId }), {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  });
}
```

**File: `tests/performance/scripts/websocket-load.js`**

```javascript
import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const messagesReceived = new Counter('ws_messages_received');
const connectionTime = new Trend('ws_connection_time');

export const options = {
  stages: [
    { duration: '30s', target: 500 },   // 500 concurrent WebSocket connections
    { duration: '5m', target: 500 },    // Maintain 500 connections
    { duration: '30s', target: 1000 },  // Scale to 1000
    { duration: '5m', target: 1000 },   // Maintain 1000
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    ws_connection_time: ['p(95)<1000'], // 95% connect under 1s
    ws_messages_received: ['count>1000'], // Must receive messages
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:4100/admin/analytics-stream';
const TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  const connectStart = Date.now();

  const res = ws.connect(WS_URL, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  }, function (socket) {
    connectionTime.add(Date.now() - connectStart);

    socket.on('open', () => {
      console.log('WebSocket connected');
    });

    socket.on('message', (data) => {
      messagesReceived.add(1);
      const parsed = JSON.parse(data);
      check(parsed, {
        'message has event type': (m) => m.event !== undefined,
        'message has timestamp': (m) => m.timestamp !== undefined,
      });
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
    });

    // Keep connection open for test duration
    socket.setTimeout(function () {
      socket.close();
    }, 300000); // 5 minutes
  });

  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}
```

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests (API)
pnpm test:integration

# Component tests (Web)
pnpm --filter @openmeet/web test:components

# E2E tests
pnpm --filter @openmeet/web test:e2e

# Performance tests
k6 run tests/performance/scripts/api-load.js

# All tests with coverage
pnpm test:coverage
```

### Verification Commands
```bash
# Check test coverage
pnpm test:coverage
# Expected: >80% coverage

# Run E2E in CI mode
CI=true pnpm --filter @openmeet/web test:e2e

# Performance test results
k6 run --out json=results.json tests/performance/scripts/api-load.js
cat results.json | jq '.metrics.http_req_duration.values["p(95)"]'
# Expected: <500ms
```

---

## Implementation Order

### Phase 1: Infrastructure (Week 1)
1. Add Redis adapter for Socket.IO
2. Set up GeoIP database (MaxMind GeoLite2)
3. Create database migrations for SessionGeoData
4. Set up test infrastructure (factories, mocks, helpers)

### Phase 2: Backend Services (Week 2)
1. Implement GeoIPService
2. Implement ConcurrentUsersService with Redis
3. Implement AnalyticsEventPublisher
4. Create WebSocket handlers with multi-tenant isolation

### Phase 3: API Endpoints (Week 3)
1. Geo distribution endpoints
2. Concurrent users endpoints
3. Analytics stream (WebSocket + SSE)
4. Write integration tests for all endpoints

### Phase 4: Frontend (Week 4)
1. WebSocket hooks (concurrent users, analytics stream)
2. GeoDistributionMap with real data
3. ConcurrentUsersGauge with WebSocket
4. RealtimeAnalyticsStream component
5. Write component tests

### Phase 5: Testing & Polish (Week 5)
1. E2E tests for all features
2. Performance tests with k6
3. Multi-tenant isolation tests
4. Documentation updates

---

## Dependencies to Add

### API (`apps/api/package.json`)
```json
{
  "dependencies": {
    "@maxmind/geoip2-node": "^4.0.0",
    "@socket.io/redis-adapter": "^8.2.1",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12"
  }
}
```

### Web (`apps/web/package.json`)
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "msw": "^2.0.0",
    "jest-websocket-mock": "^2.5.0"
  }
}
```

### Root (`package.json`)
```json
{
  "devDependencies": {
    "k6": "^0.47.0"
  }
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GeoIP accuracy | Medium | Low | Use city-level fallback to country |
| WebSocket scale | Low | High | Redis adapter + load testing |
| Test flakiness | Medium | Medium | Proper async handling, retries |
| Multi-tenant leak | Low | Critical | Extensive isolation tests |

---

## Success Criteria (Honest Assessment - 2025-12-16)

### Implementation Status: ✅ FRONTEND COMPLETE, ⚠️ INFRASTRUCTURE NEEDS VERIFICATION

1. **Geographic Distribution**
   - [x] GeoDistributionMap component created (`apps/web/src/components/admin/GeoDistributionMap.tsx`)
   - [x] API endpoints defined (`apps/api/src/routes/admin/analytics-geo.ts`)
   - [x] GeoIPService created (`apps/api/src/services/GeoIPService.ts`)
   - ⚠️ GeoIP lookups return real location data - **NEEDS MAXMIND DATABASE DOWNLOAD**
   - ⚠️ Map shows actual user distribution - **NEEDS RUNTIME VERIFICATION**
   - ⚠️ Data scoped by organization - **NEEDS MULTI-TENANT RUNTIME TEST**

2. **Concurrent Users**
   - [x] ConcurrentUsersGauge component created (`apps/web/src/components/admin/ConcurrentUsersGauge.tsx`)
   - [x] ConcurrentUsersService created (`apps/api/src/services/ConcurrentUsersService.ts`)
   - [x] WebSocket handler created (`apps/api/src/websocket/AdminRealtimeHandler.ts`)
   - ⚠️ Real-time count updates within 1 second - **NEEDS RUNTIME VERIFICATION**
   - ⚠️ Accurate across multiple servers (Redis adapter) - **NEEDS REDIS SETUP VERIFICATION**
   - ⚠️ Organization isolation verified - **NEEDS MULTI-TENANT RUNTIME TEST**

3. **Analytics Stream**
   - [x] RealtimeAnalyticsStream component created (`apps/web/src/components/admin/RealtimeAnalyticsStream.tsx`)
   - [x] AnalyticsEventPublisher created (`apps/api/src/services/AnalyticsEventPublisher.ts`)
   - [x] WebSocket namespace defined (`/admin/analytics-stream`)
   - ⚠️ Events delivered in real-time (<100ms) - **NEEDS LATENCY TESTING**
   - ⚠️ WebSocket and SSE both working - **NEEDS RUNTIME VERIFICATION**
   - ⚠️ Super admin can see all orgs - **NEEDS MULTI-TENANT RUNTIME TEST**

4. **Testing**
   - [x] 94 unit tests created across 3 test files
   - [x] E2E test file created (`apps/web/e2e/admin-analytics.spec.ts`)
   - [x] Performance test file created (`apps/web/src/__tests__/performance/component-render.perf.test.tsx`)
   - ⚠️ >80% test coverage - **RUN: `pnpm test --coverage`**
   - ⚠️ All E2E tests pass - **RUN: `pnpm playwright test`**
   - ⚠️ Performance tests meet thresholds - **RUN: `pnpm test:perf`**
   - ⚠️ Multi-tenant isolation verified - **NEEDS INTEGRATION TEST**

### Verification Commands
```bash
# Verify TypeScript compiles
pnpm typecheck

# Run unit tests
cd apps/web && pnpm test

# Run E2E tests (requires running backend)
pnpm playwright test

# Check test coverage
pnpm test --coverage
```
