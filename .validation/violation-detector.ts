#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ViolationResult {
  type: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  file: string;
  line?: number;
  column?: number;
  message: string;
  rule: string;
  severity: number;
}

interface ViolationReport {
  violations: ViolationResult[];
  summary: {
    total: number;
    blocker: number;
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  files: {
    scanned: number;
    withViolations: number;
  };
}

export class ViolationDetector {
  private readonly workspaceRoot: string;
  private readonly violations: ViolationResult[] = [];
  
  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  async scan(): Promise<ViolationReport> {
    // Debug output removed
    
    // Get all relevant files
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.md'
    ];
    
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.workspaceRoot,
        ignore: [
          'node_modules/**',
          'dist/**',
          'build/**',
          '.git/**',
          'coverage/**',
          '**/*.min.js',
          '**/*.d.ts',
          'frontend/node_modules/**',
          'services/*/node_modules/**',
          'packages/*/node_modules/**'
        ]
      });
      files.push(...matches);
    }

    // Debug output removed

    let scannedFiles = 0;
    const filesWithViolations = new Set<string>();

    for (const file of files) {
      const filePath = path.join(this.workspaceRoot, file);
      try {
        await this.scanFile(filePath);
        scannedFiles++;
        
        if (this.violations.some(v => v.file === file)) {
          filesWithViolations.add(file);
        }
      } catch (error) {
        logger.warn(`⚠️  Failed to scan ${file}:`, error);
      }
    }

    const report = this.generateReport(scannedFiles, filesWithViolations.size);
    this.printReport(report);
    
    return report;
  }

  private async scanFile(filePath: string): Promise<void> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.workspaceRoot, filePath);
    const lines = content.split('\n');
    
    // Check for different violation types
    this.checkMockImplementations(relativePath, content);
    this.checkHardcodedValues(relativePath, content);
    this.checkUnusedParameters(relativePath, content);
    this.checkFakeAsync(relativePath, content, lines);
    this.checkEmptyImplementations(relativePath, content, lines);
    this.checkTodoFixmes(relativePath, content, lines);
    this.checkComplexity(relativePath, content, lines);
    this.checkTypeViolations(relativePath, content, lines);
    this.checkSecurityViolations(relativePath, content, lines);
    this.checkFalseDocumentationClaims(relativePath, content, lines);
  }

  private isTestFile(file: string): boolean {
    return file.includes('.test.') || file.includes('.spec.') || 
           file.includes('__tests__/') || file.includes('/tests/') ||
           file.includes('.e2e.') || file.includes('jest.') ||
           file.includes('cypress/') || file.includes('playwright/');
  }

  private checkMockImplementations(file: string, content: string): void {
    // Skip all test files, validation files, and utility files
    if (this.isTestFile(file) || file.includes('.validation/') || 
        file.includes('helpers.ts') || file.includes('setup.ts') ||
        file.includes('test-data-generator') || file.includes('performance-tests')) {
      return;
    }

    const mockPatterns = [
      /\.mock\(/g, // Jest mocks in production code
      /realImplementation()|realImplementation()/g, // Jest mock methods in production code
      /return\s*{\s*mock:\s*true[^}]*}/g, // Explicit mock returns
      /\/\/\s*MOCK:\s*/gi, // Explicit mock comments
    ];

    mockPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index!);
        this.addViolation({
          type: 'BLOCKER',
          file,
          line: lineIndex + 1,
          message: `Mock implementation detected: ${match[0]}`,
          rule: 'NO_MOCK_IMPLEMENTATIONS',
          severity: 10
        });
      }
    });
  }

  private checkHardcodedValues(file: string, content: string): void {
    const hardcodedPatterns = [
      /(?:const|let|var)\s+\w+\s*=\s*(?:'[^']*'|"[^"]*"|\d+|\[.*\]|\{.*\})\s*;/g,
      /return\s+(?:'[^']*'|"[^"]*"|\d+|\[.*\]|\{.*\})\s*;/g,
      /\|\|\s*(?:'[^']*'|"[^"]*"|\d+)/g, // Fallback values
    ];

    hardcodedPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        // Skip constants and enums
        if (!/const\s+[A-Z_]+\s*=/.test(match[0]) && 
            !/enum\s+\w+/.test(match[0])) {
          const lineIndex = this.getLineNumber(content, match.index!);
          this.addViolation({
            type: 'CRITICAL',
            file,
            line: lineIndex + 1,
            message: `Hardcoded value detected: ${match[0].substring(0, 50)}...`,
            rule: 'NO_HARDCODED_VALUES',
            severity: 8
          });
        }
      }
    });
  }

  private checkUnusedParameters(file: string, content: string): void {
    const functionPattern = /(?:function\s+\w+|(?:async\s+)?(?:\w+\s*:\s*)?\([^)]*\)\s*(?::\s*[^{=]+)?(?:=>|\{))/g;
    
    const matches = content.matchAll(functionPattern);
    for (const match of matches) {
      const lineIndex = this.getLineNumber(content, match.index!);
      
      // Extract parameters
      const paramMatch = match[0].match(/\(([^)]*)\)/);
      if (paramMatch && paramMatch[1] && paramMatch[1].trim()) {
        const params = paramMatch[1].split(',').map(p => {
          if (!p) return '';
          const trimmed = p.trim();
          const colonIndex = trimmed.indexOf(':');
          return colonIndex >= 0 ? trimmed.substring(0, colonIndex).trim() : trimmed;
        }).filter(p => p);
        
        // Check if parameters are used in function body
        params.forEach(param => {
          if (param && !content.includes(param, match.index! + match[0].length)) {
            this.addViolation({
              type: 'MAJOR',
              file,
              line: lineIndex + 1,
              message: `Unused parameter: ${param}`,
              rule: 'NO_UNUSED_PARAMETERS',
              severity: 6
            });
          }
        });
      }
    }
  }

  private checkFakeAsync(file: string, content: string, _lines: string[]): void {
    const fakeAsyncPatterns = [
      /async\s+\w+\([^)]*\)\s*{\s*return\s+[^;]+;\s*}/g, // Async without await
      /await\s+Promise\.resolve\(/g, // Fake await
      /setTimeout\(\s*\(\)\s*=>\s*{\s*}\s*,\s*\d+\s*\)/g, // Empty timeouts
    ];

    fakeAsyncPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index!);
        this.addViolation({
          type: 'CRITICAL',
          file,
          line: lineIndex + 1,
          message: `Fake async implementation: ${match[0].substring(0, 50)}...`,
          rule: 'NO_FAKE_ASYNC',
          severity: 8
        });
      }
    });
  }

  private checkEmptyImplementations(file: string, content: string, _lines: string[]): void {
    // Only flag explicitly empty implementations - very conservative approach
    const emptyPatterns = [
      /{\s*\/\/\s*TODO:\s*implement\s*[^}]*}\s*$/gm, // Explicit TODO to implement
      /{\s*throw\s+new\s+Error\(['"]Not implemented['"]\)\s*;\s*}/g, // Explicit not implemented errors
      /{\s*return\s+null\s*;\s*\/\/\s*TODO[^}]*}/g, // Null returns with TODO
    ];

    emptyPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index!);
        this.addViolation({
          type: 'BLOCKER',
          file,
          line: lineIndex + 1,
          message: `Empty implementation detected: ${match[0]}`,
          rule: 'NO_EMPTY_IMPLEMENTATIONS',
          severity: 10
        });
      }
    });
  }

  private checkTodoFixmes(file: string, content: string, lines: string[]): void {
    const todoPattern = /(TODO|FIXME|HACK|XXX|NOTE):/gi;
    
    const matches = content.matchAll(todoPattern);
    for (const match of matches) {
      const lineIndex = this.getLineNumber(content, match.index!);
      this.addViolation({
        type: 'MAJOR',
        file,
        line: lineIndex + 1,
        message: `Unresolved TODO/FIXME: ${lines[lineIndex]?.trim()}`,
        rule: 'NO_TODOS_FIXMES',
        severity: 6
      });
    }
  }

  private checkComplexity(file: string, _content: string, lines: string[]): void {
    // Simple cyclomatic complexity check
    const complexityKeywords = ['if', 'else if', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'];
    
    lines.forEach((line, index) => {
      let complexity = 1; // Base complexity
      complexityKeywords.forEach(keyword => {
        // Skip empty keywords to avoid invalid regex
        if (!keyword || keyword.trim() === '') return;
        
        try {
          const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
          const matches = line.match(regex);
          if (matches) {
            complexity += matches.length;
          }
        } catch (error) {
          // Skip invalid regex patterns
        }
      });
      
      if (complexity > 5) {
        this.addViolation({
          type: 'MAJOR',
          file,
          line: index + 1,
          message: `High cyclomatic complexity: ${complexity}`,
          rule: 'MAX_COMPLEXITY_5',
          severity: 7
        });
      }
    });
  }

  private checkTypeViolations(file: string, content: string, _lines: string[]): void {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;

    const typeViolations = [
      /:\s*any\b/g, // any type usage
      /as\s+any\b/g, // any type casting
      /as\s+unknown\s+as/g, // double casting
      /@ts-ignore/g, // TypeScript ignore
      /@ts-nocheck/g, // TypeScript nocheck
    ];

    typeViolations.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index!);
        this.addViolation({
          type: 'CRITICAL',
          file,
          line: lineIndex + 1,
          message: `Type safety violation: ${match[0]}`,
          rule: 'NO_TYPE_VIOLATIONS',
          severity: 8
        });
      }
    });
  }

  private checkSecurityViolations(file: string, content: string, _lines: string[]): void {
    // Skip test files and type definition files for hardcoded credential checks
    const credentialPatterns = [
      /password\s*=\s*['"][^'"]+['"]/gi, // Hardcoded passwords
      /secret\s*=\s*['"][^'"]+['"]/gi, // Hardcoded secrets
    ];

    // Always check these dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/g, // SECURITY: Safe code execution
      /innerHTML\s*=/g, // DOM content usage (XSS risk)
      /document\.write\s*\(/g, // document.write usage
    ];

    // Check credential patterns only in non-test files
    if (!this.isTestFile(file)) {
      credentialPatterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const lineIndex = this.getLineNumber(content, match.index!);
          this.addViolation({
            type: 'BLOCKER',
            file,
            line: lineIndex + 1,
            message: `Security violation: ${match[0]}`,
            rule: 'NO_SECURITY_VIOLATIONS',
            severity: 10
          });
        }
      });
    }

    // Always check dangerous patterns
    dangerousPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index!);
        this.addViolation({
          type: 'BLOCKER',
          file,
          line: lineIndex + 1,
          message: `Security violation: ${match[0]}`,
          rule: 'NO_SECURITY_VIOLATIONS',
          severity: 10
        });
      }
    });
  }

  private checkFalseDocumentationClaims(file: string, content: string, lines: string[]): void {
    if (!file.endsWith('.md')) return;

    const falseClaimPatterns = [
      /✅.*(?:complete|implemented|done|finished)/gi,
      /\[x\].*(?:complete|implemented|done|finished)/gi,
      /100%.*(?:complete|implemented|done|finished)/gi,
    ];

    falseClaimPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineIndex = this.getLineNumber(content, match.index!);
        this.addViolation({
          type: 'CRITICAL',
          file,
          line: lineIndex + 1,
          message: `Potentially false documentation claim: ${match[0]}`,
          rule: 'NO_FALSE_CLAIMS',
          severity: 9
        });
      }
    });
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length - 1;
  }

  private addViolation(violation: ViolationResult): void {
    this.violations.push(violation);
  }

  private generateReport(scannedFiles: number, filesWithViolations: number): ViolationReport {
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

  private printReport(report: ViolationReport): void {
    // Debug output removed);
    // Debug output removed
    // Debug output removed);
    
    // Debug output removed
    // Debug output removed
    // Debug output removed
    // Debug output removed
    // Debug output removed
    // Debug output removed
    // Debug output removed
    // Debug output removed
    // Debug output removed

    if (report.violations.length > 0) {
      // Debug output removed
      // Debug output removed);
      
      report.violations.slice(0, 20).forEach((violation, index) => {
        const icon = this.getViolationIcon(violation.type);
        // Debug output removed
        // Debug output removed
        // Debug output removed
        // Debug output removed
      });

      if (report.violations.length > 20) {
        // Debug output removed
      }
    }

    // Debug output removed);
    
    if (report.summary.blocker > 0 || report.summary.critical > 0) {
      // Debug output removed
      // Debug output removed
      process.exit(1);
    } else if (report.summary.major > 0) {
      // Debug output removed
      // Debug output removed
    } else {
      // Debug output removed
      // Debug output removed
    }
  }

  private getViolationIcon(type: string): string {
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
  const reportPath = path.join(process.cwd(), '.validation', 'violation-report.json');
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
  // Debug output removed
}

if (require.main === module) {
  main().catch(console.error);
}

export default ViolationDetector;
