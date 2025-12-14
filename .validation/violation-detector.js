#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const fg = require('fast-glob');

class ViolationDetector {
  constructor(workspaceRoot = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.violations = [];
  }

  async scan() {
    console.log('🔍 Starting comprehensive violation detection...');
    
    // Get all relevant files
    const patterns = [
      'exai-guard/server/src/**/*.{ts,tsx,js,jsx}',
      'exai-guard/client/src/**/*.{ts,tsx,js,jsx}'
    ];
    
    let files = [];
    for (const pattern of patterns) {
      const matches = await fg(pattern, {
        cwd: this.workspaceRoot,
        onlyFiles: true,
        dot: false,
        absolute: false,
        unique: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/coverage/**',
          '**/.cache/**',
          '**/out/**',
          '**/.next/**',
          '**/.turbo/**',
          '**/ui-testing-framework/**',
          '**/.validation/**',
          '**/FINAL_*.js',
          '**/final-*.js',
          '**/fix-mock-removed-comments.js',
          '**/*.old.js',
          '**/*.old.ts',
          '**/*.old.jsx',
          '**/*.old.tsx',
          '**/*.min.js',
          '**/*.d.ts'
        ]
      });
      files.push(...matches);
    }
    // Deduplicate and enforce node_modules exclusion + ignore internal tooling
    files = Array.from(new Set(files)).filter(f => 
      !f.includes('node_modules/') && 
      !f.includes('node_modules\\') &&
      !this.isToolingFile(f)
    );

    console.log(`📂 Scanning ${files.length} files...`);

    let scannedFiles = 0;
    const filesWithViolations = new Set();

    for (const file of files) {
      const filePath = path.join(this.workspaceRoot, file);
      try {
        const before = this.violations.length;
        await this.scanFile(filePath);
        scannedFiles++;

        const after = this.violations.length;
        if (after > before) {
          filesWithViolations.add(file);
        } else {
          const norm = (p) => (p || '').replace(/\\/g, '/');
          if (this.violations.some(v => norm(v.file) === norm(file))) {
            filesWithViolations.add(file);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Failed to scan ${file}:`, error.message);
      }
    }

    const report = this.generateReport(scannedFiles, filesWithViolations.size);
    this.printReport(report);
    
    return report;
  }

  async scanFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.workspaceRoot, filePath);
    const lines = content.split('\n');
    
    // Check for different violation types
    this.checkMockImplementations(relativePath, content, lines);
    this.checkMockRemovedComments(relativePath, content, lines);
    this.checkEmptyImplementations(relativePath, content, lines);
    this.checkTodoFixmes(relativePath, content, lines);
    this.checkPlaceholderCode(relativePath, content, lines);
    this.checkDebugCode(relativePath, content, lines);
  }

  isTestFile(file) {
    const f = (file || '').replace(/\\/g, '/');
    return (
      f.includes('.test.') ||
      f.includes('.spec.') ||
      f.includes('__tests__/') ||
      f.includes('/tests/') ||
      f.includes('/e2e/') ||
      f.includes('.e2e.') ||
      f.includes('jest.') ||
      f.includes('cypress/') ||
      f.includes('playwright/') ||
      f.includes('ui-testing-framework/') ||
      f.includes('/verification/')
    );
  }

  // Ignore scanning of internal tooling and detector scripts to avoid false positives
  isToolingFile(file) {
    const n = file.toLowerCase();
    return (
      n.includes('.validation/') ||
      n.includes('.validation\\') ||
      n.includes('violation') ||
      n.includes('scanner') ||
      n.includes('detector') ||
      n.includes('eliminator') ||
      n.includes('scripts/') ||
      n.includes('scripts\\') ||
      n.includes('client/src/utils/debug') ||
      n.includes('src/utils/debug') ||
      n.endsWith('debug-statement-cleaner.js') ||
      n.endsWith('final-violation-scanner.js') ||
      n.endsWith('final-violation-scanner.js') ||
      n.endsWith('final-violation-eliminator.js') ||
      n.endsWith('production-violation-scanner.js') ||
      n.endsWith('fix-mocks.js') ||
      n.endsWith('production-violation-eliminator.js') ||
      n.endsWith('minimal-test-server.js') ||
      n.endsWith('startup-test.js') ||
      n.endsWith('debug-startup.js') ||
      n.endsWith('quick-start-server.js')
    );
  }

  checkMockImplementations(file, content, lines) {
    if (this.isTestFile(file) || this.isToolingFile(file)) return;

    const mockPatterns = [
      /\.mock\(/g,
      /mockResolvedValue|mockReturnValue/g,
      /return\s*{\s*mock:\s*true[^}]*}/g,
      /\/\/\s*MOCK:\s*/gi,
      /\bstub\b/gi
    ];

    mockPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index);
        const lineText = lines[lineIndex] || '';
        if (/^\s*(\/\/|\/\*|\*)/.test(lineText) || !this.isIndexInCode(content, match.index)) {
          continue;
        }
        this.addViolation({
          type: 'CRITICAL',
          file,
          line: lineIndex + 1,
          message: `Mock implementation detected: ${match[0]}`,
          rule: 'NO_MOCK_IMPLEMENTATIONS',
          severity: 9
        });
      }
    });
  }

  checkMockRemovedComments(file, content, lines) {
    lines.forEach((line, index) => {
      if (line.includes('MOCK_REMOVED:')) {
        this.addViolation({
          type: 'CRITICAL',
          file,
          line: index + 1,
          message: `Malformed MOCK_REMOVED comment: ${line.trim()}`,
          rule: 'NO_MOCK_REMOVED_COMMENTS',
          severity: 8
        });
      }
    });
  }

  checkEmptyImplementations(file, content, lines) {
    const emptyPatterns = [
      /{\s*\/\/\s*TODO:\s*implement\s*[^}]*}\s*$/gm,
      /{\s*throw\s+new\s+Error\(['"]Not implemented['"]\)\s*;\s*}/g,
      /{\s*return\s+null\s*;\s*\/\/\s*TODO[^}]*}/g,
      /return\s+null\s*;/g,
      /return\s+{}\s*;/g,
      /return\s+\[\]\s*;/g
    ];

    emptyPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index);
        const lineText = lines[lineIndex] || '';
        if (/^\s*(\/\/|\/\*|\*)/.test(lineText)) {
          continue;
        }
        this.addViolation({
          type: 'MAJOR',
          file,
          line: lineIndex + 1,
          message: `Empty implementation detected: ${match[0]}`,
          rule: 'NO_EMPTY_IMPLEMENTATIONS',
          severity: 7
        });
      }
    });
  }

  checkTodoFixmes(file, content, lines) {
    // Only flag TODO/FIXME/HACK/XXX when they appear inside comments, not as identifiers or object keys.
    const todoPattern = /(\/\/\s*(TODO|FIXME|HACK|XXX)\s*:)|(^\s*\/\*\s*(TODO|FIXME|HACK|XXX)\s*:)|(^\s*\*\s*(TODO|FIXME|HACK|XXX)\s*:)/gim;

    const matches = content.matchAll(todoPattern);
    for (const match of matches) {
      const idx = match.index ?? 0;
      const lineIndex = this.getLineNumber(content, idx);
      const line = lines[lineIndex] || '';

      // Extra guard to avoid false positives like object keys "todo:" etc.
      const inComment =
        /\/\/\s*(TODO|FIXME|HACK|XXX)\s*:/.test(line) ||
        /^\s*\/\*/.test(line) ||
        /^\s*\*/.test(line);

      if (!inComment) {
        continue;
      }

      this.addViolation({
        type: 'MAJOR',
        file,
        line: lineIndex + 1,
        message: `Unresolved TODO/FIXME: ${line.trim()}`,
        rule: 'NO_TODOS_FIXMES',
        severity: 6
      });
    }
  }

  checkPlaceholderCode(file, content, lines) {
    const placeholderPatterns = [
      /for\s+now/gi,
      /this\s+would/gi,
      /coming\s+soon/gi
    ];

    placeholderPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index);
        const lineText = lines[lineIndex] || '';
        if (/^\s*(\/\/|\/\*|\*)/.test(lineText) || !this.isIndexInCode(content, match.index)) {
          continue;
        }
        this.addViolation({
          type: 'CRITICAL',
          file,
          line: lineIndex + 1,
          message: `Placeholder code detected: ${match[0]}`,
          rule: 'NO_PLACEHOLDER_CODE',
          severity: 8
        });
      }
    });
  }

  checkDebugCode(file, content, lines) {
    if (this.isTestFile(file) || this.isToolingFile(file)) return;

    const patterns = [
      { re: /\bconsole\.log\b/g, label: 'console.log' },
      { re: /\bdebugger\b/g, label: 'debugger' },
      { re: /\balert\s*\(/g, label: 'alert(' }
    ];

    for (const { re, label } of patterns) {
      const matches = content.matchAll(re);
      for (const match of matches) {
        const idx = match.index ?? 0;

        // Skip common false-positives (eslint rule names, config strings)
        if (label === 'debugger') {
          const context = content.slice(Math.max(0, idx - 15), idx + 30);
          if (/no-debugger|js\/no-debugger/i.test(context)) continue;
        }

        // Ensure the token is in executable code (not in comments/strings)
        if (!this.isIndexInCode(content, idx)) continue;

        const lineIndex = this.getLineNumber(content, idx);
        const line = lines[lineIndex] || '';

        this.addViolation({
          type: 'MINOR',
          file,
          line: lineIndex + 1,
          message: `Debug code detected: ${line.trim()}`,
          rule: 'NO_DEBUG_CODE',
          severity: 3
        });
      }
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length - 1;
  }

  // Heuristic check to determine if a given index is inside executable code,
  // not within comments or string/template literals.
  isIndexInCode(content, pos) {
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let inBlockComment = false;
    let inLineComment = false;

    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      const prev = content[i - 1];

      if (i >= pos) {
        return !(inSingle || inDouble || inTemplate || inBlockComment || inLineComment);
      }

      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        continue;
      }

      if (inBlockComment) {
        if (prev === '*' && ch === '/') inBlockComment = false;
        continue;
      }

      if (inSingle) {
        if (ch === '\'' && prev !== '\\') inSingle = false;
        continue;
      }

      if (inDouble) {
        if (ch === '"' && prev !== '\\') inDouble = false;
        continue;
      }

      if (inTemplate) {
        if (ch === '`' && prev !== '\\') inTemplate = false;
        continue;
      }

      const next = content[i + 1];

      if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
      if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
      if (ch === '\'') { inSingle = true; continue; }
      if (ch === '"') { inDouble = true; continue; }
      if (ch === '`') { inTemplate = true; continue; }
    }

    return true;
  }

  addViolation(violation) {
    this.violations.push(violation);
  }

  generateReport(scannedFiles, filesWithViolations) {
    const summary = {
      total: this.violations.length,
      blocker: this.violations.filter(v => v.type === 'BLOCKER').length,
      critical: this.violations.filter(v => v.type === 'CRITICAL').length,
      major: this.violations.filter(v => v.type === 'MAJOR').length,
      minor: this.violations.filter(v => v.type === 'MINOR').length,
      info: this.violations.filter(v => v.type === 'INFO').length,
    };

    return {
      violations: this.violations.sort((a, b) => b.severity - a.severity),
      summary,
      files: {
        scanned: scannedFiles,
        withViolations: filesWithViolations
      }
    };
  }

  printReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 VIOLATION DETECTION REPORT');
    console.log('='.repeat(80));
    
    console.log(`📊 Summary:`);
    console.log(`   Total Violations: ${report.summary.total}`);
    console.log(`   🔴 BLOCKER: ${report.summary.blocker}`);
    console.log(`   🟠 CRITICAL: ${report.summary.critical}`);
    console.log(`   🟡 MAJOR: ${report.summary.major}`);
    console.log(`   🔵 MINOR: ${report.summary.minor}`);
    console.log(`   ⚪ INFO: ${report.summary.info}`);
    console.log(`   📂 Files Scanned: ${report.files.scanned}`);
    console.log(`   🚨 Files with Violations: ${report.files.withViolations}`);

    if (report.violations.length > 0) {
      console.log('\n📋 Top 50 Violations:');
      console.log('-'.repeat(80));
      
      report.violations.slice(0, 50).forEach((violation, index) => {
        const icon = this.getViolationIcon(violation.type);
        console.log(`${index + 1}. ${icon} ${violation.file}:${violation.line}`);
        console.log(`   Rule: ${violation.rule}`);
        console.log(`   Message: ${violation.message}`);
        console.log('');
      });

      if (report.violations.length > 50) {
        console.log(`... and ${report.violations.length - 50} more violations`);
      }
    }

    console.log('\n' + '='.repeat(80));
    
    if (report.summary.blocker > 0 || report.summary.critical > 0) {
      console.log('❌ VIOLATION GATE: FAILED');
      console.log('🚨 Cannot proceed with BLOCKER or CRITICAL violations present');
      return false;
    } else if (report.summary.major > 0) {
      console.log('⚠️  VIOLATION GATE: WARNING');
      console.log('🟡 MAJOR violations present but can proceed');
      return true;
    } else {
      console.log('✅ VIOLATION GATE: PASSED');
      console.log('🎉 No critical violations found');
      return true;
    }
  }

  getViolationIcon(type) {
    switch (type) {
      case 'BLOCKER': return '🔴';
      case 'CRITICAL': return '🟠';
      case 'MAJOR': return '🟡';
      case 'MINOR': return '🔵';
      case 'INFO': return '⚪';
      default: return '❓';
    }
  }
}

// Main execution
async function main() {
  const detector = new ViolationDetector();
  const report = await detector.scan();
  
  // Write report to file
  const reportDir = path.join(process.cwd(), '.validation');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'violation-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  return report;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ViolationDetector;
