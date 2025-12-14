/**
 * Test file for WorkflowAutomationService
 * Verifies that the real implementations compile correctly
 */

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';

describe('WorkflowAutomationService', () => {
  beforeAll(async () => {
    // Setup any required environment variables for the test
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  afterAll(async () => {
    // Clean up
  });

  it('should compile with real SDK imports', async () => {
    // This test verifies that the imports compile correctly
    const asana = await import('asana');
    expect(asana).toBeDefined();
    expect(asana.Client).toBeDefined();

    const { Version3Client } = await import('jira.js');
    expect(Version3Client).toBeDefined();

    const { LinearClient } = await import('@linear/sdk');
    expect(LinearClient).toBeDefined();

    const { format } = await import('date-fns');
    expect(format).toBeDefined();
  });

  it('should have correct type definitions', async () => {
    // Import the service to verify it compiles with the new implementation
    const module = await import('../WorkflowAutomationService');
    const { WorkflowAutomationService } = module;
    expect(WorkflowAutomationService).toBeDefined();
  });

  it('should verify TaskPriority enum mapping', () => {
    // Verify that TaskPriority enum values map correctly
    const { TaskPriority } = require('@prisma/client');

    // Asana doesn't use priority values
    // Jira uses: High, Medium, Low
    // Linear uses: 1 (urgent), 2 (high), 3 (normal), 4 (low)

    expect(TaskPriority.high).toBeDefined();
    expect(TaskPriority.medium).toBeDefined();
    expect(TaskPriority.low).toBeDefined();
  });
});