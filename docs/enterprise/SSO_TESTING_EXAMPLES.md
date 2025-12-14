# SSO/SCIM Testing Examples

## Quick Testing Commands

### 1. Test SCIM User Creation

```bash
curl -X POST http://localhost:3000/scim/v2/Users \
  -H "Authorization: Bearer scim_your-token-here" \
  -H "Content-Type: application/scim+json" \
  -d '{
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    "userName": "test.user@example.com",
    "name": {
      "givenName": "Test",
      "familyName": "User",
      "formatted": "Test User"
    },
    "displayName": "Test User",
    "emails": [
      {
        "value": "test.user@example.com",
        "type": "work",
        "primary": true
      }
    ],
    "active": true
  }'
```

Expected Response:
```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "uuid-here",
  "externalId": "test.user@example.com",
  "userName": "test.user@example.com",
  "name": {
    "givenName": "Test",
    "familyName": "User",
    "formatted": "Test User"
  },
  "emails": [
    {
      "value": "test.user@example.com",
      "type": "work",
      "primary": true
    }
  ],
  "active": true,
  "meta": {
    "resourceType": "User",
    "created": "2025-11-15T...",
    "lastModified": "2025-11-15T...",
    "location": "/scim/v2/Users/uuid-here"
  }
}
```

### 2. Test SCIM User List

```bash
curl "http://localhost:3000/scim/v2/Users?startIndex=1&count=10" \
  -H "Authorization: Bearer scim_your-token-here"
```

### 3. Test SCIM User Get

```bash
curl http://localhost:3000/scim/v2/Users/{userId} \
  -H "Authorization: Bearer scim_your-token-here"
```

### 4. Test SCIM User Update (PUT)

```bash
curl -X PUT http://localhost:3000/scim/v2/Users/{userId} \
  -H "Authorization: Bearer scim_your-token-here" \
  -H "Content-Type: application/scim+json" \
  -d '{
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    "userName": "test.user@example.com",
    "name": {
      "givenName": "Test",
      "familyName": "User Updated"
    },
    "emails": [
      {
        "value": "test.user@example.com",
        "primary": true
      }
    ],
    "active": true
  }'
```

### 5. Test SCIM User Patch

```bash
curl -X PATCH http://localhost:3000/scim/v2/Users/{userId} \
  -H "Authorization: Bearer scim_your-token-here" \
  -H "Content-Type: application/scim+json" \
  -d '{
    "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    "Operations": [
      {
        "op": "replace",
        "path": "active",
        "value": false
      }
    ]
  }'
```

### 6. Test SCIM User Deactivate

```bash
curl -X DELETE http://localhost:3000/scim/v2/Users/{userId} \
  -H "Authorization: Bearer scim_your-token-here"
```

Expected Response: 204 No Content

### 7. Test SCIM Group Creation

```bash
curl -X POST http://localhost:3000/scim/v2/Groups \
  -H "Authorization: Bearer scim_your-token-here" \
  -H "Content-Type: application/scim+json" \
  -d '{
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    "displayName": "Engineering Team",
    "members": [
      {
        "value": "user-id-1",
        "display": "John Doe"
      }
    ]
  }'
```

### 8. Test Service Provider Config

```bash
curl http://localhost:3000/scim/v2/ServiceProviderConfig \
  -H "Authorization: Bearer scim_your-token-here"
```

### 9. Test Resource Types

```bash
curl http://localhost:3000/scim/v2/ResourceTypes \
  -H "Authorization: Bearer scim_your-token-here"
```

---

## SSO Configuration API Testing

### 10. Configure SSO (Okta Example)

```bash
curl -X POST http://localhost:3000/api/sso/saml/configure \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "okta",
    "oktaDomain": "your-domain.okta.com",
    "oktaClientId": "client-id",
    "oktaClientSecret": "client-secret",
    "oktaApiToken": "api-token",
    "enforceSSO": false,
    "jitProvisioning": true,
    "scimEnabled": true
  }'
```

### 11. Get SSO Configuration

```bash
curl http://localhost:3000/api/sso/saml/config \
  -H "Authorization: Bearer your-jwt-token"
```

### 12. Test SSO Connection

```bash
curl -X POST http://localhost:3000/api/sso/test \
  -H "Authorization: Bearer your-jwt-token"
```

### 13. Sync Users from IdP

```bash
curl -X POST http://localhost:3000/api/sso/sync-users \
  -H "Authorization: Bearer your-jwt-token"
```

Expected Response:
```json
{
  "success": true,
  "created": 5,
  "updated": 12,
  "deactivated": 2
}
```

### 14. Get SSO Statistics

```bash
curl http://localhost:3000/api/sso/stats \
  -H "Authorization: Bearer your-jwt-token"
```

Expected Response:
```json
{
  "success": true,
  "stats": {
    "totalLogins": 150,
    "activeUsers": 45,
    "activeSessions": 23,
    "avgSessionDuration": 7200
  }
}
```

### 15. Get SAML Metadata

```bash
curl http://localhost:3000/api/sso/saml/metadata/{organizationId}
```

Expected Response: XML metadata

---

## Integration Testing with Okta SDK

### JavaScript/TypeScript Example

```typescript
import { oktaIntegrationService } from './integrations/okta-integration';

// Test authentication
const result = await oktaIntegrationService.authenticateUser(
  'org-id',
  'user@example.com',
  'password123'
);

console.log('Auth result:', result);
// {
//   sessionToken: 'okta-session-token',
//   user: { id: '...', profile: {...} },
//   status: 'SUCCESS'
// }

// Test user sync
const syncResult = await oktaIntegrationService.syncUsers('org-id');
console.log('Sync result:', syncResult);
// { created: 5, updated: 10, deactivated: 1 }

// Test group sync
const groupSync = await oktaIntegrationService.syncGroups('org-id');
console.log('Group sync:', groupSync);
// { created: 3, updated: 2 }
```

---

## Integration Testing with Auth0

```typescript
import { auth0IntegrationService } from './integrations/auth0-integration';

// Test authentication
const tokens = await auth0IntegrationService.authenticateUser(
  'org-id',
  'user@example.com',
  'password123'
);

console.log('Tokens:', tokens);
// {
//   accessToken: 'jwt...',
//   idToken: 'jwt...',
//   refreshToken: 'rt...',
//   expiresIn: 86400
// }

// Get user info
const userInfo = await auth0IntegrationService.getUserInfo(
  'org-id',
  tokens.accessToken
);
console.log('User info:', userInfo);

// Sync users
const syncResult = await auth0IntegrationService.syncUsers('org-id');
console.log('Sync:', syncResult);
```

---

## JIT Provisioning Testing

```typescript
import { jitProvisioningService } from './services/jit-provisioning-service';

// Test JIT provisioning from SAML
const result = await jitProvisioningService.provisionFromSAML(
  'org-id',
  {
    nameId: 'user@example.com',
    sessionIndex: 'session-123',
    attributes: {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      groups: ['Admins', 'Engineering']
    }
  }
);

console.log('JIT result:', result);
// {
//   user: { id: '...', email: '...', ... },
//   isNew: true,
//   organization: { id: '...', name: '...' }
// }

// Get JIT stats
const stats = await jitProvisioningService.getJITStats('org-id');
console.log('JIT stats:', stats);
// {
//   totalJITUsers: 45,
//   jitUsersLast30Days: 12,
//   activeJITUsers: 43,
//   providers: { okta: 30, auth0: 15 }
// }
```

---

## SCIM Service Testing

```typescript
import { scimService } from './services/scim-service';

// List users
const users = await scimService.getUsers('org-id', {
  startIndex: 1,
  count: 10
});
console.log('Users:', users);

// Create user
const newUser = await scimService.createUser('org-id', {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
  userName: 'new.user@example.com',
  name: {
    givenName: 'New',
    familyName: 'User'
  },
  emails: [
    { value: 'new.user@example.com', primary: true }
  ],
  active: true
});
console.log('Created user:', newUser);

// Update user
const updated = await scimService.updateUser('org-id', newUser.id, {
  ...newUser,
  active: false
});
console.log('Updated user:', updated);
```

---

## SSO Configuration Service Testing

```typescript
import { ssoConfigService } from './services/sso-config-service';

// Configure SSO
const config = await ssoConfigService.configureSS('org-id', {
  provider: 'okta',
  enabled: true,
  enforceSSO: false,
  oktaDomain: 'your-domain.okta.com',
  oktaClientId: 'client-id',
  oktaClientSecret: 'secret',
  oktaApiToken: 'token',
  jitProvisioning: true,
  scimEnabled: true
});
console.log('SSO config:', config);

// Test connection
const testResult = await ssoConfigService.testConnection('org-id');
console.log('Connection test:', testResult);
// { success: true, message: 'Connection successful', details: {...} }

// Get statistics
const stats = await ssoConfigService.getStatistics('org-id');
console.log('Stats:', stats);
// {
//   activeSessions: 23,
//   totalUsers: 100,
//   jitProvisionedUsers: 45,
//   scimUsers: 80,
//   ...
// }
```

---

## Browser Testing

### SAML Login Flow

1. Navigate to: `http://localhost:3000/api/sso/saml/login/your-org-id`
2. You'll be redirected to your IdP
3. Login with IdP credentials
4. Get redirected back to ACS endpoint
5. User is created via JIT (if first time)
6. Session is established
7. Redirected to app

### SSO Configuration UI

1. Navigate to: `http://localhost:3001/settings/sso`
2. Select provider (e.g., Okta)
3. Fill in credentials
4. Click "Test Connection"
5. Should see success message
6. Click "Save Configuration"
7. Click "Sync Users Now"
8. See sync results

---

## Postman Collection

### Import this collection for quick testing:

```json
{
  "info": {
    "name": "SSO/SCIM Testing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "SCIM - List Users",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{scim_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/scim/v2/Users?startIndex=1&count=10",
          "host": ["{{base_url}}"],
          "path": ["scim", "v2", "Users"]
        }
      }
    },
    {
      "name": "SCIM - Create User",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{scim_token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/scim+json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"schemas\": [\"urn:ietf:params:scim:schemas:core:2.0:User\"],\n  \"userName\": \"test@example.com\",\n  \"name\": {\n    \"givenName\": \"Test\",\n    \"familyName\": \"User\"\n  },\n  \"emails\": [{\n    \"value\": \"test@example.com\",\n    \"primary\": true\n  }],\n  \"active\": true\n}"
        },
        "url": {
          "raw": "{{base_url}}/scim/v2/Users",
          "host": ["{{base_url}}"],
          "path": ["scim", "v2", "Users"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "scim_token",
      "value": "scim_your-token-here"
    }
  ]
}
```

---

## Validation Checklist

- [ ] SCIM endpoints return proper SCIM 2.0 format
- [ ] Bearer token authentication works
- [ ] User creation via SCIM creates database record
- [ ] User update via SCIM updates database
- [ ] User delete via SCIM deactivates user
- [ ] SAML login redirects to IdP
- [ ] SAML assertion validated correctly
- [ ] JIT provisioning creates new users
- [ ] JIT provisioning updates existing users
- [ ] Okta sync creates/updates users
- [ ] Auth0 sync creates/updates users
- [ ] SSO UI loads and displays correctly
- [ ] Test connection validates IdP
- [ ] Sync users triggers full sync
- [ ] Statistics display correctly
- [ ] Audit logs created for all operations

---

## Common Issues & Solutions

### SCIM 401 Unauthorized
**Issue:** SCIM requests return 401
**Solution:** Check bearer token is correct and matches SSOConfig.scimToken

### SAML Login Redirect Loop
**Issue:** Keeps redirecting back to IdP
**Solution:** Check ACS URL is whitelisted in IdP, verify entity ID matches

### JIT User Not Created
**Issue:** User logs in but not created in database
**Solution:** Check `jitProvisioning` is enabled, verify email attribute in SAML assertion

### Okta Connection Test Fails
**Issue:** Test connection returns error
**Solution:** Verify API token has correct permissions, check domain is correct

---

## Load Testing

### SCIM Endpoint Load Test (using Artillery)

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: "Bearer scim_your-token-here"

scenarios:
  - name: "SCIM User List"
    flow:
      - get:
          url: "/scim/v2/Users?startIndex=1&count=10"
```

### Expected Performance
- SCIM List Users: < 100ms
- SCIM Create User: < 200ms
- SAML Login Redirect: < 50ms
- JIT Provisioning: < 300ms

---

**Happy Testing!** 🚀
