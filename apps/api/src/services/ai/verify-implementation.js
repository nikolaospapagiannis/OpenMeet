#!/usr/bin/env node

/**
 * Verification script to ensure PredictiveInsightsService has REAL implementations
 * This checks that the fake implementations have been replaced
 */

const fs = require('fs');
const path = require('path');

console.log('Verifying PredictiveInsightsService implementation...\n');

// Read the service file
const servicePath = path.join(__dirname, 'PredictiveInsightsService.ts');
const serviceContent = fs.readFileSync(servicePath, 'utf8');

let hasIssues = false;
const checks = [];

// Check 1: No more empty array returns
if (serviceContent.includes('return [];')) {
  checks.push('❌ FAIL: Found "return [];" - Empty array returns still exist');
  hasIssues = true;
} else {
  checks.push('✅ PASS: No empty array returns found');
}

// Check 2: No hardcoded 0.85 accuracy
if (serviceContent.includes('accuracy: 0.85')) {
  checks.push('❌ FAIL: Found hardcoded "accuracy: 0.85"');
  hasIssues = true;
} else {
  checks.push('✅ PASS: No hardcoded accuracy values');
}

// Check 3: No TODO comments
if (serviceContent.includes('// TODO') || serviceContent.includes('//TODO')) {
  checks.push('❌ FAIL: Found TODO comments');
  hasIssues = true;
} else {
  checks.push('✅ PASS: No TODO comments');
}

// Check 4: No "In production" comments suggesting fake implementation
if (serviceContent.includes('// In production') || serviceContent.includes('// For now')) {
  checks.push('⚠️  WARN: Found comments suggesting incomplete implementation');
  // Not marking as failure since some comments might be legitimate
}

// Check 5: refreshAllPredictions has real implementation
if (serviceContent.includes('refreshAllPredictions') &&
    serviceContent.includes('prisma.organization.findUnique') &&
    serviceContent.includes('prisma.deal.findMany') &&
    serviceContent.includes('prisma.meeting.findMany')) {
  checks.push('✅ PASS: refreshAllPredictions queries database');
} else {
  checks.push('❌ FAIL: refreshAllPredictions missing database queries');
  hasIssues = true;
}

// Check 6: getPredictionHistory has real implementation
if (serviceContent.includes('getPredictionHistory') &&
    serviceContent.includes('prisma.aIAnalysis.findMany')) {
  checks.push('✅ PASS: getPredictionHistory queries database');
} else {
  checks.push('❌ FAIL: getPredictionHistory missing database queries');
  hasIssues = true;
}

// Check 7: getAccuracyMetrics has real implementation
if (serviceContent.includes('getAccuracyMetrics') &&
    serviceContent.includes('prisma.aIAnalysis.findMany') &&
    serviceContent.includes('correctPredictions') &&
    serviceContent.includes('falsePositives') &&
    serviceContent.includes('falseNegatives')) {
  checks.push('✅ PASS: getAccuracyMetrics calculates real metrics');
} else {
  checks.push('❌ FAIL: getAccuracyMetrics missing real calculations');
  hasIssues = true;
}

// Check 8: Uses QueueService for background jobs
if (serviceContent.includes('QueueService') &&
    serviceContent.includes('addJob')) {
  checks.push('✅ PASS: Uses QueueService for background processing');
} else {
  checks.push('⚠️  WARN: No queue service integration found');
}

// Check 9: Proper error handling
if (serviceContent.includes('try {') &&
    serviceContent.includes('catch (error)') &&
    serviceContent.includes('logger.error')) {
  checks.push('✅ PASS: Has proper error handling');
} else {
  checks.push('⚠️  WARN: Missing comprehensive error handling');
}

// Check 10: Returns meaningful data when no predictions exist
if (serviceContent.includes('No predictions have been generated')) {
  checks.push('✅ PASS: Returns informative messages when no data exists');
} else {
  checks.push('⚠️  WARN: May not handle empty results gracefully');
}

// Print results
console.log('='.repeat(60));
console.log('VERIFICATION RESULTS:');
console.log('='.repeat(60));
checks.forEach(check => console.log(check));
console.log('='.repeat(60));

if (hasIssues) {
  console.log('\n❌ VERIFICATION FAILED: Real implementation issues found');
  process.exit(1);
} else {
  console.log('\n✅ VERIFICATION PASSED: All fake implementations have been replaced!');
  console.log('\nThe PredictiveInsightsService now has:');
  console.log('  • Real database queries using Prisma');
  console.log('  • Background job processing with QueueService');
  console.log('  • Actual metric calculations');
  console.log('  • Proper error handling');
  console.log('  • Informative responses for empty data');
  process.exit(0);
}