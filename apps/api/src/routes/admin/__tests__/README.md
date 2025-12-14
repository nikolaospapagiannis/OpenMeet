# Super Admin Dashboard API - Test Suite

This directory contains comprehensive integration tests for the Super Admin Dashboard API.

## Test Files

### 1. `admin-routes.test.ts`
**REAL Integration Tests** - Uses actual database connections and middleware.

**What it tests:**
- ✅ Admin authentication middleware (blocks non-admin users)
- ✅ GET /admin/organizations - Lists organizations
- ✅ GET /admin/users - Lists users with filtering
- ✅ GET /admin/subscriptions - Lists subscriptions
- ✅ POST /admin/organizations - Creates organizations
- ✅ PATCH /admin/users/:id/system-role - Updates user roles
- ✅ Permission-based access control

**NO MOCKS** - All tests use:
- Real Prisma database connections
- Real Express routes
- Real JWT authentication
- Real middleware stack

## Running the Tests

### Prerequisites
```bash
# Ensure database is running
docker-compose up -d postgres

# Install dependencies
pnpm install
```

### Run Integration Tests
```bash
# Run all tests
pnpm test

# Run only admin route tests
pnpm test admin-routes.test.ts

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Manual Verification Script
For live API verification (server must be running):

```bash
# Start the API server in one terminal
pnpm dev

# In another terminal, run verification script
npx ts-node scripts/verify-admin-api.ts
```

The verification script will:
1. ✅ Check API health endpoint
2. ✅ Verify database connection
3. ✅ Create test super admin user
4. ✅ Test authentication middleware
5. ✅ Verify all GET endpoints return data
6. ✅ Test POST organization creation
7. ✅ Test PATCH user role update
8. ✅ Verify non-admin users are blocked
9. ✅ Print detailed verification report

### Expected Output

```
=== SUPER ADMIN API VERIFICATION ===

API URL: http://localhost:4000
Timestamp: 2025-01-15T10:30:45.123Z

--- Infrastructure Checks ---
✅ Health Check - API healthy - 1.0.0
✅ Database Connection - Connected - 15 orgs, 42 users

--- Authentication Setup ---
✓ Test token created for user: usr_abc123

--- Admin Authentication ---
✅ Admin Auth Middleware - 403 for non-admin (correct)
✅ Admin Auth Middleware - Authenticated access allowed
✅ Permission Denial Check - 403 for non-admin user (correct)

--- Read Endpoints ---
✅ GET /admin/organizations - 200 OK (15 orgs returned)
✅ GET /admin/users - 200 OK (42 users returned)
✅ GET /admin/subscriptions - 200 OK (12 subs returned)

--- Write Endpoints ---
✅ POST /admin/organizations - Organization created successfully
✅ PATCH /admin/users/:id/system-role - User role updated successfully

=== VERIFICATION SUMMARY ===

Total Tests: 10
✅ Passed: 10
❌ Failed: 0
Success Rate: 100.0%
```

## Test Architecture

### Why REAL Integration Tests?

Following CLAUDE.md standards:
- ❌ NO mocks for business logic
- ✅ Uses actual database (Prisma)
- ✅ Tests real middleware stack
- ✅ Verifies actual API responses
- ✅ Tests with real JWT tokens

### Test Data Management

All tests:
- Create test data in `beforeAll()`
- Clean up in `afterAll()`
- Use unique identifiers (timestamps)
- Don't interfere with production data

### Verification Format

Every test follows TRUTH PROTOCOL:
```typescript
// 1. Make real API call
const response = await request(app)
  .get('/admin/organizations')
  .set('Authorization', `Bearer ${token}`);

// 2. Verify actual response
expect(response.status).toBe(200);
expect(response.body.data.length).toBeGreaterThan(0);

// 3. Verify against real database
const dbCount = await prisma.organization.count();
expect(dbCount).toBeGreaterThan(0);
```

## Continuous Integration

Add to GitHub Actions:
```yaml
- name: Run Admin API Tests
  run: pnpm test admin-routes.test.ts

- name: Verify Admin API Live
  run: |
    pnpm dev &
    sleep 5
    npx ts-node scripts/verify-admin-api.ts
```

## Troubleshooting

### Tests Failing?

1. **Database not connected**
   ```bash
   docker-compose up -d postgres
   pnpm prisma migrate dev
   ```

2. **No super admin user**
   - Tests create one automatically
   - Or manually create via Prisma Studio

3. **JWT errors**
   - Check `JWT_SECRET` in `.env`
   - Verify token generation logic

4. **Permission errors**
   - Verify user has `systemRole` set
   - Check middleware is applied

### Manual Verification Script Failing?

1. **API not running**
   ```bash
   pnpm dev
   # Wait for "Server ready at http://localhost:4000"
   ```

2. **Wrong port**
   - Check `API_URL` in script
   - Default: `http://localhost:4000`

3. **Database connection**
   - Script auto-creates test data
   - Requires database to be up

## Coverage Goals

Target: **80%+ coverage**

Current coverage includes:
- ✅ All GET endpoints
- ✅ All POST endpoints
- ✅ All PATCH endpoints
- ✅ Authentication middleware
- ✅ Permission checks
- ✅ Error handling
- ✅ Input validation

## Next Steps

To add more tests:

1. **Copy existing test structure**
   ```typescript
   describe('New Feature', () => {
     it('should work correctly', async () => {
       const response = await request(app)
         .get('/admin/new-endpoint')
         .set('Authorization', `Bearer ${token}`)
         .expect(200);

       expect(response.body.success).toBe(true);
     });
   });
   ```

2. **Add to verification script**
   ```typescript
   async function verifyNewFeature(client, token) {
     const response = await client.get('/api/admin/new-endpoint', {
       headers: { Authorization: `Bearer ${token}` }
     });

     logTest('New Feature', response.status === 200, 'Works!');
   }
   ```

3. **Run and verify**
   ```bash
   pnpm test
   npx ts-node scripts/verify-admin-api.ts
   ```

## Questions?

See:
- `/docs/SUPERADMIN_ROADMAP.md` - Feature roadmap
- `CLAUDE.md` - Testing standards
- Prisma schema for data models
