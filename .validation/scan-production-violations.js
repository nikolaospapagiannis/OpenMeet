const fs = require('fs');
const path = require('path');

const srcDir = 'E:/ExAI-GOD/packages/core/src';
const violationPatterns = [
  '// For now',
  '// TODO:',
  '// FIXME:',
  '// In production',
  '// In prod',
  '// This would',
  '// Would query',
  '// Placeholder',
  '// Mock',
  'console.log',
  'console.error',
  'console.warn'
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let violations = [];

    content.split('\n').forEach((line, lineNum) => {
      violationPatterns.forEach(pattern => {
        if (line.includes(pattern)) {
          violations.push({
            line: lineNum + 1,
            pattern,
            content: line.trim()
          });
        }
      });
    });

    return violations;
  } catch (err) {
    return [];
  }
}

function findProductionTsFiles(dir) {
  let results = [];
  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== '__tests__') {
        results = results.concat(findProductionTsFiles(filePath));
      } else if (file.endsWith('.ts') &&
                 !file.endsWith('.test.ts') &&
                 !file.endsWith('.spec.ts') &&
                 !file.includes('load-test') &&
                 !file.includes('accuracy-test') &&
                 file !== 'setup.ts') {
        results.push(filePath);
      }
    });
  } catch (err) {
    // Skip inaccessible directories
  }

  return results;
}

console.log('Scanning PRODUCTION files only (excluding test files)...\n');

const allFiles = findProductionTsFiles(srcDir);
const highViolationFiles = [];

allFiles.forEach(filePath => {
  const violations = scanFile(filePath);
  if (violations.length >= 3) {
    highViolationFiles.push({
      path: filePath.replace(/\\/g, '/'),
      relativePath: filePath.replace(srcDir, '').replace(/\\/g, '/').substring(1),
      count: violations.length,
      violations
    });
  }
});

// Sort by violation count (highest first)
highViolationFiles.sort((a, b) => b.count - a.count);

console.log(`Found ${highViolationFiles.length} PRODUCTION files with 3+ violations:\n`);

highViolationFiles.forEach(file => {
  console.log(`${file.count} violations: ${file.relativePath}`);
});

console.log('\n--- Detailed Breakdown ---\n');

highViolationFiles.forEach(file => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FILE: ${file.relativePath} (${file.count} violations)`);
  console.log('='.repeat(80));

  file.violations.forEach(v => {
    console.log(`  Line ${v.line}: [${v.pattern}]`);
    console.log(`    ${v.content}`);
  });
});

// Save results
fs.writeFileSync(
  'E:/ExAI-GOD/production-violations-scan.json',
  JSON.stringify(highViolationFiles, null, 2)
);

console.log('\n\nResults saved to: production-violations-scan.json');
console.log(`\nTotal production files scanned: ${allFiles.length}`);
