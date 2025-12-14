#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const violations = [];

// Patterns to detect
const patterns = {
  console_log: {
    regex: /console\.(log|error|warn|debug|info)/g,
    severity: 'HIGH',
    message: 'Console logging in production code',
    exceptions: ['logger.ts', 'setup.ts']
  },
  todo_comments: {
    regex: /\/\/\s*(TODO|FIXME|HACK|XXX|For now|STUB|PLACEHOLDER|NOT_IMPLEMENTED):/gi,
    severity: 'MEDIUM',
    message: 'Unresolved TODO/FIXME comment'
  },
  fake_async: {
    regex: /setTimeout.*\/(simulate|mock|fake)/gi,
    severity: 'HIGH',
    message: 'Fake async implementation using setTimeout'
  },
  hardcoded_mock: {
    regex: /return\s+\{[^}]*mock:\s*true/gi,
    severity: 'BLOCKER',
    message: 'Hardcoded mock return value'
  },
  not_implemented: {
    regex: /throw\s+new\s+Error\s*\(\s*['"`]Not implemented['"`]\s*\)/gi,
    severity: 'BLOCKER',
    message: 'Not implemented error thrown'
  },
  empty_return: {
    regex: /return\s+(null|undefined)\s*;.*\/\/.*TODO/gi,
    severity: 'HIGH',
    message: 'Empty return with TODO comment'
  }
};

async function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath);

  // Check if this is a test file
  const isTest = filePath.includes('.test.') ||
                 filePath.includes('.spec.') ||
                 filePath.includes('__tests__') ||
                 filePath.includes('/test/') ||
                 filePath.includes('load-test') ||
                 filePath.includes('e2e-test') ||
                 filePath.includes('accuracy-test');

  // Skip test files for certain checks
  if (isTest) return;

  // Check each pattern
  for (const [name, config] of Object.entries(patterns)) {
    // Check exceptions
    if (config.exceptions && config.exceptions.some(ex => filePath.includes(ex))) {
      continue;
    }

    let match;
    const regex = new RegExp(config.regex.source, config.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1]?.trim() || '';

      violations.push({
        file: relPath,
        line: lineNum,
        severity: config.severity,
        type: name,
        message: config.message,
        code: line
      });
    }
  }
}

async function main() {
  console.log('🔍 Scanning for violations...\n');

  const files = await glob('packages/core/src/**/*.ts', {
    cwd: process.cwd(),
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/__tests__/**',
      '**/test/**',
      '**/*.test.ts',
      '**/*.spec.ts'
    ]
  });

  console.log(`Found ${files.length} source files to scan\n`);

  for (const file of files) {
    await scanFile(path.join(process.cwd(), file));
  }

  // Group by file
  const byFile = {};
  violations.forEach(v => {
    if (!byFile[v.file]) byFile[v.file] = [];
    byFile[v.file].push(v);
  });

  // Sort files by violation count
  const sortedFiles = Object.entries(byFile)
    .map(([file, viols]) => ({ file, count: viols.length, violations: viols }))
    .sort((a, b) => b.count - a.count);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 VIOLATION REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Total Violations: ${violations.length}`);
  console.log(`Files with Violations: ${sortedFiles.length}\n`);

  // Summary by severity
  const bySeverity = {
    BLOCKER: violations.filter(v => v.severity === 'BLOCKER').length,
    HIGH: violations.filter(v => v.severity === 'HIGH').length,
    MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length
  };

  console.log('By Severity:');
  console.log(`  🔴 BLOCKER: ${bySeverity.BLOCKER}`);
  console.log(`  🟠 HIGH: ${bySeverity.HIGH}`);
  console.log(`  🟡 MEDIUM: ${bySeverity.MEDIUM}\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📁 HIGH-IMPACT FILES (5+ violations)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const highImpact = sortedFiles.filter(f => f.count >= 5);
  highImpact.forEach(({ file, count }) => {
    console.log(`  ${count.toString().padStart(3)} violations - ${file}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📁 MEDIUM-IMPACT FILES (3-4 violations)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mediumImpact = sortedFiles.filter(f => f.count >= 3 && f.count < 5);
  mediumImpact.forEach(({ file, count }) => {
    console.log(`  ${count.toString().padStart(3)} violations - ${file}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📁 LOW-IMPACT FILES (1-2 violations)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const lowImpact = sortedFiles.filter(f => f.count < 3);
  console.log(`  ${lowImpact.length} files with 1-2 violations each\n`);

  // Show top 20 files with details
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 TOP 20 FILES BY VIOLATION COUNT (DETAILED)');
  console.log('═══════════════════════════════════════════════════════════\n');

  sortedFiles.slice(0, 20).forEach(({ file, count, violations: viols }) => {
    console.log(`\n📄 ${file} (${count} violations)`);
    viols.forEach(v => {
      const severity = v.severity === 'BLOCKER' ? '🔴' : v.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(`  ${severity} Line ${v.line}: ${v.message}`);
      console.log(`     ${v.code.substring(0, 80)}${v.code.length > 80 ? '...' : ''}`);
    });
  });

  // Save to JSON
  const report = {
    totalViolations: violations.length,
    filesWithViolations: sortedFiles.length,
    bySeverity,
    highImpact: highImpact.map(f => ({ file: f.file, count: f.count })),
    mediumImpact: mediumImpact.map(f => ({ file: f.file, count: f.count })),
    lowImpact: lowImpact.map(f => ({ file: f.file, count: f.count })),
    allViolations: sortedFiles
  };

  fs.writeFileSync('violation-scan-report.json', JSON.stringify(report, null, 2));
  console.log('\n\n📊 Full report saved to: violation-scan-report.json');
}

main().catch(console.error);
