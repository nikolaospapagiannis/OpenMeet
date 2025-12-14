const fs = require('fs');

// Violation patterns
const patterns = [
  /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|NOTE):/gi,
  /\/\/\s*For now/gi,
  /\/\/\s*In production/gi,
  /\/\/\s*In prod/gi,
  /\/\/\s*Temporary/gi,
  /\/\/\s*Placeholder/gi,
  /\/\/\s*Mock/gi,
  /\/\/\s*Stub/gi
];

function scanFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  let violations = 0;

  lines.forEach((line, index) => {
    patterns.forEach(pattern => {
      if (pattern.test(line)) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
        violations++;
      }
    });
  });

  return violations;
}

console.log('=== Checking enterprise-observability.ts ===');
const v1 = scanFile('packages/core/src/observability/enterprise-observability.ts');
console.log(`Total violations: ${v1}\n`);

console.log('=== Checking index.ts ===');
const v2 = scanFile('packages/core/src/observability/index.ts');
console.log(`Total violations: ${v2}\n`);

console.log(`\n=== FINAL RESULT ===`);
console.log(`enterprise-observability.ts: ${v1} violations`);
console.log(`index.ts: ${v2} violations`);
console.log(`Total: ${v1 + v2} violations`);
console.log(`Status: ${v1 + v2 === 0 ? 'PASSED - 0 VIOLATIONS' : 'FAILED'}`);
