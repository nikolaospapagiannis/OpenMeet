import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * OpenMeet E2E Test Configuration
 *
 * Environment:
 * - Frontend: http://localhost:4200
 * - API: http://localhost:4100
 * - AI Service: http://localhost:8888
 *
 * Test Categories:
 * - auth: Registration, login, password reset, MFA
 * - upload: File upload and processing
 * - transcription: View transcripts, speaker diarization
 * - summarization: AI summaries from transcripts
 * - templates: Template-based re-summarization
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4200';
const API_URL = process.env.E2E_API_URL || 'http://localhost:4100';

export default defineConfig({
  testDir: './e2e',

  // Test timeout - longer for AI operations
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // Run tests in parallel
  fullyParallel: false, // Sequential for state-dependent tests

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 1,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    baseURL: BASE_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // API context for direct API calls
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },

    // Storage state for authentication
    storageState: path.join(__dirname, 'e2e/.auth/user.json'),
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - runs first to create auth state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        storageState: undefined, // Don't use existing state for setup
      },
    },

    // Chromium tests (primary) - main test suite
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
  ],

  // Run local dev server before starting tests
  webServer: [
    {
      command: 'pnpm dev',
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        PORT: '4200',
        NEXT_PUBLIC_API_URL: `${API_URL}/api`,
        NEXT_PUBLIC_WS_URL: 'ws://localhost:4100',
      },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results/',

  // Global setup and teardown
  globalSetup: path.join(__dirname, 'e2e/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'e2e/global-teardown.ts'),
});
