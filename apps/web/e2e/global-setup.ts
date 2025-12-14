import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const API_URL = process.env.E2E_API_URL || 'http://localhost:4100';
const AI_SERVICE_URL = process.env.E2E_AI_URL || 'http://localhost:8888';

// Simple logger for test setup (process.stdout is acceptable for test runners)
const log = {
  info: (msg: string) => process.stdout.write(`[E2E Setup] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[E2E Setup ERROR] ${msg}\n`),
};

/**
 * Global setup for E2E tests
 * Verifies all services are healthy before running tests
 */
async function globalSetup(config: FullConfig) {
  log.info('=== OpenMeet E2E Test Setup ===');

  // Verify API server is healthy
  log.info('Checking API server...');
  try {
    const apiResponse = await fetch(`${API_URL}/health`);
    if (!apiResponse.ok) {
      throw new Error(`API health check failed: ${apiResponse.status}`);
    }
    const apiHealth = await apiResponse.json();
    log.info(`  API: ${apiHealth.status}`);
    log.info(`  Database: ${apiHealth.services?.database || 'unknown'}`);
    log.info(`  Redis: ${apiHealth.services?.redis || 'unknown'}`);
  } catch (error) {
    log.error('API server is not available!');
    log.error('Run: pnpm dev:api');
    throw new Error('API server health check failed. Please start the API server.');
  }

  // Verify AI service is healthy (optional - may not be needed for all tests)
  log.info('Checking AI service...');
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/health`);
    if (!aiResponse.ok) {
      log.info(`  AI Service: not available (status ${aiResponse.status})`);
    } else {
      const aiHealth = await aiResponse.json();
      log.info(`  AI Service: ${aiHealth.status}`);
      log.info(`  Version: ${aiHealth.version || 'unknown'}`);
    }
  } catch (error) {
    log.info('  AI service is not available (optional for basic tests)');
    // Don't fail - AI service is optional for many tests
  }

  // Create auth state directory
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create empty auth state file if it doesn't exist
  const authFile = path.join(authDir, 'user.json');
  if (!fs.existsSync(authFile)) {
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
  }

  log.info('=== Setup Complete ===');
}

export default globalSetup;
