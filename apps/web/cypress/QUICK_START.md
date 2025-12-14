# Cypress E2E Testing - Quick Start Guide

## 🚀 Running Tests

### Development Mode (Interactive)
```bash
cd apps/web
npm run test:e2e:open
```

### Headless Mode (CI)
```bash
cd apps/web
npm run test:e2e
```

### Run Specific Test Suite
```bash
# Run only login tests
npx cypress run --spec "cypress/e2e/auth/login.cy.ts"

# Run all auth tests
npx cypress run --spec "cypress/e2e/auth/**/*.cy.ts"
```

## 📁 Project Structure

```
apps/web/cypress/
├── e2e/                          # Test files
│   ├── auth/                     # Authentication tests
│   │   ├── login.cy.ts          # Login flow (17 tests)
│   │   ├── register.cy.ts       # Registration (15 tests)
│   │   └── oauth.cy.ts          # OAuth flows (16 tests)
│   ├── meetings/                 # Meeting tests
│   │   ├── create.cy.ts         # Creation & upload (28 tests)
│   │   ├── view.cy.ts           # Viewing & playback (31 tests)
│   │   └── search.cy.ts         # Search & filters (20 tests)
│   ├── integrations/
│   │   └── connect.cy.ts        # Integrations (29 tests)
│   └── dashboard/
│       └── analytics.cy.ts      # Analytics (31 tests)
├── support/                      # Utilities
│   ├── commands.ts              # Custom commands
│   ├── api-helpers.ts           # API mocking
│   ├── test-data.ts             # Test fixtures
│   └── selectors.ts             # UI selectors
└── fixtures/                     # Test files
    ├── sample-audio.mp3
    ├── sample-video.mp4
    └── *.json

```

## 🎯 Test Statistics

- **Total Test Files:** 10
- **Total Test Cases:** 207
- **Coverage:** All critical user flows
- **Pass Rate:** 100% (target)

## 🛠️ Custom Commands

```typescript
// Login with session caching
cy.login('test@example.com', 'Test123!');

// Login via API (faster)
cy.loginViaApi('test@example.com', 'Test123!');

// Create meeting
cy.createMeeting('Meeting Title', 'Description');

// Upload file
cy.uploadFile('sample-audio.mp3', 'audio/mp3');

// Stub OAuth
cy.stubOAuthProvider('google', true);

// Get by test ID
cy.getBySel('login-button').click();
```

## 📊 API Helpers

```typescript
import ApiHelper from '../../support/api-helpers';

// Setup all API mocks
ApiHelper.setupAllInterceptors();

// Setup specific mocks
ApiHelper.setupAuthInterceptors();
ApiHelper.setupMeetingInterceptors();
ApiHelper.setupAnalyticsInterceptors();

// Mock errors
ApiHelper.mockApiError('POST', '/api/endpoint', 500);
ApiHelper.mockNetworkDelay('GET', '/api/endpoint', 3000);
```

## 📝 Writing New Tests

```typescript
import { testUsers } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Feature Name', () => {
  beforeEach(() => {
    ApiHelper.setupAllInterceptors();
    cy.login(testUsers.validUser.email, testUsers.validUser.password);
    cy.visit('/feature-page');
  });

  it('should do something', () => {
    cy.log('Testing feature functionality');
    cy.get(selectors.feature.button).click();
    cy.contains('Success message').should('be.visible');
  });
});
```

## 🔧 Configuration

All settings in `cypress.config.ts`:
- Base URL: http://localhost:3000
- API URL: http://localhost:3001
- Viewport: 1280x720
- Videos: Enabled
- Screenshots: On failure

## 📦 CI/CD

Tests run automatically via GitHub Actions:
- **Trigger:** Push, PR, Manual
- **Execution:** 4 parallel containers
- **Artifacts:** Videos, screenshots, reports
- **Location:** `.github/workflows/e2e-tests.yml`

## 🐛 Debugging

```bash
# Open Cypress with Chrome DevTools
npx cypress open --browser chrome

# Run with debug logs
DEBUG=cypress:* npx cypress run

# Generate detailed logs
npx cypress run --config video=true,screenshotOnRunFailure=true
```

## ✅ Best Practices

1. ✅ Use `cy.log()` instead of console.log
2. ✅ No hardcoded waits - use `cy.wait('@alias')`
3. ✅ Always use data-testid selectors
4. ✅ Keep tests isolated and independent
5. ✅ Use custom commands for repeated actions
6. ✅ Mock API calls for faster execution
7. ✅ Clear, descriptive test names

## 📚 Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Full Test Report](./E2E_TEST_REPORT.md)
- [GitHub Actions Workflow](../../.github/workflows/e2e-tests.yml)

---

**Need Help?** Check the full test report or Cypress documentation.
