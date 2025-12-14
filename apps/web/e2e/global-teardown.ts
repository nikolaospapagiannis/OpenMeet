import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global teardown for E2E tests
 * Cleans up test artifacts and temporary files
 */
async function globalTeardown(config: FullConfig) {
  // Clean up auth state files created during tests
  const authDir = path.join(__dirname, '.auth');

  try {
    // Keep auth directory but clean up test-specific files
    const files = fs.readdirSync(authDir);
    for (const file of files) {
      if (file.startsWith('test-') || file.startsWith('temp-')) {
        fs.unlinkSync(path.join(authDir, file));
      }
    }
  } catch (error) {
    // Directory may not exist, that's fine
  }

  // Clean up any uploaded test files if needed
  // This would connect to the API to clean up test data
  // For now, we rely on database seeding to reset state

  return;
}

export default globalTeardown;
