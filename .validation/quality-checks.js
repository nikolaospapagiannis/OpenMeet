#!/usr/bin/env node

/**
 * Quality Checks Script
 * Validates code quality, architecture patterns, and enterprise standards
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logger = {
  info: (...args) => console.warn(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};
const EMPTY = [];

class QualityValidator {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.infos = [];
  }

  /**
   * Main validation entry point
   */
  async validate() {

    // Get changed files from git
    const changedFiles = this.getChangedFiles();
    
    if (changedFiles.length === 0) {
      
      return true;
    }

    // Run all validation checks
    await this.validateArchitecture(changedFiles);
    await this.validateImplementationQuality(changedFiles);
    await this.validateTypeScript(changedFiles);
    await this.validateSecurity(changedFiles);
    await this.validatePerformance(changedFiles);
    await this.validateDocumentation(changedFiles);

    // Report results
    this.reportResults();

    // Return success/failure
    return this.violations.length === 0;
  }

  /**
   * Get list of changed files from git
   */
  getChangedFiles() {
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=AM', { encoding: 'utf8' });
      return output.trim().split('\n').filter(file => 
        file.endsWith('.ts') || 
        file.endsWith('.tsx') || 
        file.endsWith('.js') || 
        file.endsWith('.jsx')
      );
    } catch (error) {
      return EMPTY;
    }
  }

  /**
   * Validate architecture patterns
   */
  async validateArchitecture(files) {

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      // Check for service-oriented architecture
      if (file.includes('/services/')) {
        this.validateServiceArchitecture(file, content, lines);
      }

      // Check for component architecture
      if (file.includes('/pages/') || file.includes('/components/')) {
        this.validateComponentArchitecture(file, content, lines);
      }

      // Check import patterns
      this.validateImportPatterns(file, content, lines);
    }
  }

  /**
   * Validate service architecture patterns
   */
  validateServiceArchitecture(file, content, lines) {
    // Check for real API endpoints
    if (!content.includes('process.env') && content.includes('Service')) {
      this.addViolation(file, 0, 'BLOCKER', 'Service must use environment-based configuration');
    }

    // Check for proper error handling
    if (!content.includes('try') || !content.includes('catch')) {
      this.addViolation(file, 0, 'CRITICAL', 'Service must implement comprehensive error handling');
    }

    // Check for TypeScript strict types
    if (content.includes('any') && !content.includes('// eslint-disable-next-line @typescript-eslint/no-explicit-any')) {
      this.addViolation(file, 0, 'MAJOR', 'Avoid using "any" type in services - use specific types');
    }
  }

  /**
   * Validate component architecture patterns
   */
  validateComponentArchitecture(file, content, lines) {
    // Check for proper React patterns
    if (content.includes('React.FC') || content.includes('FunctionComponent')) {
      if (!content.includes('useState') && !content.includes('useEffect') && content.length > 1000) {
        this.addWarning(file, 0, 'Consider breaking down large components into smaller ones');
      }
    }

    // Check for proper prop types
    if (content.includes('interface') && content.includes('Props')) {
      this.addInfo(file, 0, 'Good: Using TypeScript interfaces for props');
    }
  }

  /**
   * Validate import patterns
   */
  validateImportPatterns(file, content, lines) {
    lines.forEach((line, index) => {
      // Check for relative imports beyond two levels
      if (line.includes('import') && line.includes('../../../')) {
        this.addViolation(file, index + 1, 'MAJOR', 'Avoid deep relative imports - consider absolute imports');
      }

      // Check for unused imports (basic check)
      const importMatch = line.match(/import\s+{\s*([^}]+)\s*}\s+from/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(i => i.trim());
        imports.forEach(importName => {
          if (!content.includes(importName.replace('as ', '').split(' ')[0])) {
            this.addWarning(file, index + 1, `Potentially unused import: ${importName}`);
          }
        });
      }
    });
  }

  /**
   * Validate implementation quality
   */
  async validateImplementationQuality(files) {

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      // Check for fake implementations
      this.checkFakeImplementations(file, content, lines);
      
      // Check for TODO/FIXME comments
      this.checkTodoComments(file, content, lines);
      
      // Check for console logs in production code
      this.checkConsoleStatements(file, content, lines);
    }
  }

  /**
   * Check for fake implementations
   */
  checkFakeImplementations(file, content, lines) {
    const fakePatterns = [
      'fake',
      'mock',
      'placeholder',
      'temporary implementation',
      'simulate',
      'simulation',
      'stub',
      'todo: implement',
      'pseudocode',
      'return {};',
      'return [];',
      'return null;',
      '// in a real implementation',
      '// in production',
      '// in prod',
      '// would set up',
      '// would execute',
      '// would query',
      '// would fetch from',
      '// would send',
      '// would analyze',
      '// would insert',
      '// would gather'
    ];

    lines.forEach((line, index) => {
      fakePatterns.forEach(pattern => {
        if (line.toLowerCase().includes(pattern.toLowerCase()) && 
            !line.includes('test') && 
            !line.includes('spec')) {
          this.addViolation(file, index + 1, 'BLOCKER', `Placeholder implementation detected: ${pattern}`);
        }
      });
    });
  }

  /**
   * Check for TODO/FIXME comments
   */
  checkTodoComments(file, content, lines) {
    lines.forEach((line, index) => {
      if (line.includes('TODO') || line.includes('FIXME')) {
        this.addWarning(file, index + 1, 'Unresolved TODO/FIXME comment');
      }
    });
  }

  /**
   * Check for console statements
   */
  checkConsoleStatements(file, content, lines) {
    if (!file.includes('test') && !file.includes('spec')) {
      lines.forEach((line, index) => {
        if (line.includes('console.log') || line.includes('console.error')) {
          this.addViolation(file, index + 1, 'MAJOR', 'Remove console statements from production code');
        }
      });
    }
  }

  /**
   * Validate TypeScript compliance
   */
  async validateTypeScript(files) {

    try {
      // Run TypeScript compiler check
      execSync('npx tsc --noEmit --strict', { stdio: 'pipe' });
      this.addInfo('', 0, 'TypeScript compilation successful');
    } catch (error) {
      this.addViolation('', 0, 'BLOCKER', 'TypeScript compilation failed - fix all type errors');
    }
  }

  /**
   * Validate security patterns
   */
  async validateSecurity(files) {

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      // Check for hardcoded secrets
      this.checkHardcodedSecrets(file, content, lines);
      
      // Check for SQL injection patterns
      this.checkSqlInjectionPatterns(file, content, lines);
    }
  }

  /**
   * Check for hardcoded secrets
   */
  checkHardcodedSecrets(file, content, lines) {
    const secretPatterns = [
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
      /password\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
      /token\s*=\s*['"][^'"]+['"]/i
    ];

    lines.forEach((line, index) => {
      secretPatterns.forEach(pattern => {
        if (pattern.test(line) && !line.includes('process.env')) {
          this.addViolation(file, index + 1, 'BLOCKER', 'Hardcoded secret detected - use environment variables');
        }
      });
    });
  }

  /**
   * Check for SQL injection patterns
   */
  checkSqlInjectionPatterns(file, content, lines) {
    lines.forEach((line, index) => {
      if (line.includes('SELECT') && line.includes('+') && line.includes('req.')) {
        this.addViolation(file, index + 1, 'CRITICAL', 'Potential SQL injection - use parameterized queries');
      }
    });
  }

  /**
   * Validate performance patterns
   */
  async validatePerformance(files) {

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');
      
      // Check file size
      if (content.length > 10000 && !file.includes('test')) {
        this.addWarning(file, 0, 'Large file detected - consider breaking into smaller modules');
      }

      // Check for performance anti-patterns
      this.checkPerformanceAntiPatterns(file, content);
    }
  }

  /**
   * Check for performance anti-patterns
   */
  checkPerformanceAntiPatterns(file, content) {
    // Check for inefficient loops
    if (content.includes('useEffect') && content.includes('[]') === false) {
      this.addWarning(file, 0, 'useEffect without dependencies array may cause performance issues');
    }

    // Check for direct DOM manipulation
    if (content.includes('document.getElementById') || content.includes('document.querySelector')) {
      this.addWarning(file, 0, 'Direct DOM manipulation detected - prefer React patterns');
    }
  }

  /**
   * Validate documentation
   */
  async validateDocumentation(files) {

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');
      
      // Check for JSDoc comments on functions
      this.checkJSDocCoverage(file, content);
    }
  }

  /**
   * Check JSDoc coverage
   */
  checkJSDocCoverage(file, content) {
    const functionMatches = content.match(/(?:export\s+)?(?:async\s+)?function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s+)?\(/g);
    const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g);

    if (functionMatches && functionMatches.length > 0) {
      const jsdocCount = jsdocMatches ? jsdocMatches.length : 0;
      const functionCount = functionMatches.length;
      
      if (jsdocCount < functionCount * 0.5) {
        this.addWarning(file, 0, `Low JSDoc coverage: ${jsdocCount}/${functionCount} functions documented`);
      }
    }
  }

  /**
   * Add violation
   */
  addViolation(file, line, severity, message) {
    this.violations.push({ file, line, severity, message });
  }

  /**
   * Add warning
   */
  addWarning(file, line, message) {
    this.warnings.push({ file, line, message });
  }

  /**
   * Add info
   */
  addInfo(file, line, message) {
    this.infos.push({ file, line, message });
  }

  /**
   * Report results
   */
  reportResults() {
    logger.info('\n🔍 QUALITY CHECK RESULTS');
    logger.info('='.repeat(50));

    // Report violations
    if (this.violations.length > 0) {
      logger.info('\n❌ VIOLATIONS:');
      this.violations.forEach(v => {
        logger.info(`  ${v.file}:${v.line} [${v.severity}] ${v.message}`);
      });
    }

    // Report warnings
    if (this.warnings.length > 0) {
      logger.info('\n⚠️  WARNINGS:');
      this.warnings.forEach(w => {
        logger.info(`  ${w.file}:${w.line} ${w.message}`);
      });
    }

    // Report infos
    if (this.infos.length > 0) {
      logger.info('\n📋 INFO:');
      this.infos.forEach(i => {
        logger.info(`  ${i.file}:${i.line} ${i.message}`);
      });
    }

    // Summary
    logger.info('\n📊 SUMMARY:');
    logger.info(`  Violations: ${this.violations.length}`);
    logger.info(`  Warnings: ${this.warnings.length}`);
    logger.info(`  Info: ${this.infos.length}`);

    if (this.violations.length === 0) {
      logger.info('\n✅ All quality checks passed!');
    } else {
      logger.info('\n❌ Quality checks failed - fix violations before proceeding');
    }

    logger.info('='.repeat(50) + '\n');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new QualityValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logger.error('Quality validation error:', error);
    process.exit(1);
  });
}

module.exports = QualityValidator;
