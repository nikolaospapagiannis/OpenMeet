#!/usr/bin/env node
/**
 * Enterprise Pre-commit Governance Check
 *
 * This script validates staged files against enterprise coding standards
 * as defined in CLAUDE.md Zero-Tolerance Implementation Standards.
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Violations found
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Construct patterns dynamically to avoid self-detection
const SLASH_SLASH = String.fromCharCode(47, 47);
const FORBIDDEN_PATTERNS = [
  // Comment patterns (constructed to avoid self-detection)
  { pattern: new RegExp(SLASH_SLASH + '\\s*T' + 'O' + 'D' + 'O(?!Write)', 'gi'), name: 'Incomplete task marker', severity: 'HIGH' },
  { pattern: new RegExp(SLASH_SLASH + '\\s*FI' + 'X' + 'ME', 'gi'), name: 'Known issue marker', severity: 'HIGH' },
  { pattern: new RegExp(SLASH_SLASH + '\\s*HA' + 'CK', 'gi'), name: 'Hack marker', severity: 'HIGH' },
  { pattern: new RegExp(SLASH_SLASH + '\\s*X' + 'X' + 'X', 'gi'), name: 'XXX marker', severity: 'HIGH' },
  { pattern: new RegExp(SLASH_SLASH + '\\s*W' + 'IP', 'gi'), name: 'Work in progress', severity: 'HIGH' },

  // Fake implementation patterns
  { pattern: /throw\s+new\s+Error\s*\(\s*['"`]Not\s+implemented/gi, name: 'NotImplemented error', severity: 'CRITICAL' },
  { pattern: /return\s*{\s*mo\s*ck\s*:/gi, name: 'M' + 'ock return value', severity: 'CRITICAL' },
  { pattern: /return\s*{\s*fa\s*ke\s*:/gi, name: 'Fa' + 'ke return value', severity: 'CRITICAL' },
  { pattern: /const\s+(mo\s*ck|fa\s*ke|dum\s*my|stu\s*b)\w*\s*=/gi, name: 'Fa' + 'ke variable declaration', severity: 'HIGH' },

  // Async without await (synthetic async)
  { pattern: /async\s+function\s+\w+\s*\([^)]*\)\s*{\s*return\s+[^a]/g, name: 'Async without await', severity: 'MEDIUM' },

  // Excuse comments
  { pattern: new RegExp(SLASH_SLASH + '\\s*[Ii]n\\s+production', 'g'), name: 'Production excuse', severity: 'HIGH' },
  { pattern: new RegExp(SLASH_SLASH + '\\s*[Ff]or\\s+now', 'g'), name: 'Temporary excuse', severity: 'HIGH' },
  { pattern: new RegExp(SLASH_SLASH + '\\s*[Pp]lace' + 'holder', 'g'), name: 'Place' + 'holder admission', severity: 'HIGH' },
  { pattern: new RegExp(SLASH_SLASH + '\\s*[Ss]tu' + 'b', 'g'), name: 'Stu' + 'b admission', severity: 'HIGH' },
];

// Files to exclude from scanning
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /build\//,
  /coverage\//,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /__tests__\//,
  /\.d\.ts$/,
  /CLAUDE\.md$/,
  /\.validation\//,
  /docs\//,
  /infrastructure\/audit\//,
  /\.husky\//,
  /scripts\/pre-commit-check\.js$/,  // Exclude self
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function shouldScanFile(filePath) {
  // Only scan TypeScript/JavaScript files
  if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) {
    return false;
  }

  // Check exclusions
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  return true;
}

function scanFile(filePath) {
  const violations = [];

  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return violations;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    for (const { pattern, name, severity } of FORBIDDEN_PATTERNS) {
      // Reset regex state for each file
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        violations.push({
          file: filePath,
          line: lineNumber,
          name,
          severity,
          match: match[0].substring(0, 60),
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning ${filePath}: ${error.message}`);
  }

  return violations;
}

function main() {
  console.log('[GOVERNANCE] Running enterprise code quality checks...\n');

  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log('[GOVERNANCE] No staged files to check.');
    process.exit(0);
  }

  const filesToScan = stagedFiles.filter(shouldScanFile);

  if (filesToScan.length === 0) {
    console.log('[GOVERNANCE] No applicable files to check.');
    process.exit(0);
  }

  console.log(`[GOVERNANCE] Scanning ${filesToScan.length} file(s)...\n`);

  let allViolations = [];

  for (const file of filesToScan) {
    const violations = scanFile(file);
    allViolations = allViolations.concat(violations);
  }

  if (allViolations.length === 0) {
    console.log('[GOVERNANCE] All checks passed! No violations found.\n');
    process.exit(0);
  }

  // Report violations
  console.error('[GOVERNANCE] VIOLATIONS DETECTED!\n');

  const criticalCount = allViolations.filter(v => v.severity === 'CRITICAL').length;
  const highCount = allViolations.filter(v => v.severity === 'HIGH').length;
  const mediumCount = allViolations.filter(v => v.severity === 'MEDIUM').length;

  console.error(`  CRITICAL: ${criticalCount}`);
  console.error(`  HIGH:     ${highCount}`);
  console.error(`  MEDIUM:   ${mediumCount}\n`);

  for (const v of allViolations) {
    const icon = v.severity === 'CRITICAL' ? '🔴' : v.severity === 'HIGH' ? '🟠' : '🟡';
    console.error(`  ${icon} ${v.file}:${v.line}`);
    console.error(`     ${v.name}: "${v.match}..."\n`);
  }

  console.error('\n[GOVERNANCE] COMMIT BLOCKED');
  console.error('\nPer CLAUDE.md Zero-Tolerance Standards, you must:');
  console.error('  1. Implement missing functionality completely');
  console.error('  2. Remove all incomplete markers from code');
  console.error('  3. Replace synthetic returns with real implementations\n');

  process.exit(1);
}

main();
