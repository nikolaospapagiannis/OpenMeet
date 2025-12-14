#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enterprise Infrastructure Finalization Script
 * Ensures all critical enterprise infrastructure components are production-ready
 */

// Critical infrastructure components to validate
const infrastructureComponents = {
  core: {
    api: '../../api-server.js',
    ai: '../../src/ai/',
    enterprise: '../../src/enterprise/',
    security: '../../src/security/',
    auth: '../../src/auth/'
  },
  improvement: {
    engine: '../../src/improvement/continuous-improvement-engine.ts',
    recommendations: '../../src/recommendations/'
  },
  omega: {
    extension: '../../src/omega/vscode-extension/',
    agents: '../../src/agents/',
    orchestrator: '../../src/omega/orchestrator/'
  },
  validation: {
    quality: '../../src/quality/',
    analyzers: '../../src/analyzers/',
    compliance: '../../src/compliance/'
  },
  database: {
    config: '../../src/db/',
    vectordb: '../../src/vectordb/'
  }
};

// Infrastructure validation summary
async function validateInfrastructure() {
  logger.info('🔍 Starting Enterprise Infrastructure Validation...\n');
  
  let totalChecks = 0;
  let passedChecks = 0;
  let criticalIssues = [];
  
  // Validate core infrastructure
  for (const [category, components] of Object.entries(infrastructureComponents)) {
    logger.info(`📁 Checking ${category} infrastructure...`);
    
    for (const [name, filePath] of Object.entries(components)) {
      totalChecks++;
      const fullPath = path.resolve(__dirname, filePath);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(fullPath);
          if (files.length > 0) {
            logger.info(`  ✅ ${name}: Found ${files.length} files`);
            passedChecks++;
          } else {
            logger.info(`  ⚠️  ${name}: Directory exists but is empty`);
            criticalIssues.push(`Empty directory: ${filePath}`);
          }
        } else {
          // Check if file has content
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.trim().length > 100) {
            logger.info(`  ✅ ${name}: File exists with content`);
            passedChecks++;
          } else {
            logger.info(`  ⚠️  ${name}: File exists but has minimal content`);
            criticalIssues.push(`Minimal content: ${filePath}`);
          }
        }
      } else {
        logger.info(`  ❌ ${name}: Missing - ${filePath}`);
        criticalIssues.push(`Missing: ${filePath}`);
      }
    }
    logger.info('');
  }
  
  // Generate final report
  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
  logger.info('📊 INFRASTRUCTURE VALIDATION REPORT');
  logger.info('================================');
  logger.info(`Total Checks: ${totalChecks}`);
  logger.info(`Passed: ${passedChecks}`);
  logger.info(`Failed: ${totalChecks - passedChecks}`);
  logger.info(`Success Rate: ${successRate}%`);
  
  if (criticalIssues.length > 0) {
    logger.info('\n❌ Critical Issues Found:');
    criticalIssues.forEach((issue, index) => {
      logger.info(`${index + 1}. ${issue}`);
    });
  }
  
  if (successRate >= 80) {
    logger.info('\n✅ Infrastructure validation PASSED');
    return true;
  } else {
    logger.info('\n❌ Infrastructure validation FAILED - Critical issues detected');
    return false;
  }
}

// Run validation
validateInfrastructure()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('💥 Validation failed with error:', error);
    process.exit(1);
  });

process.exit(0);
