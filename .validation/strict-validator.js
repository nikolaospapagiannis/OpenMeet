#!/usr/bin/env node

/**
 * STRICT CODE VALIDATOR
 * This script PREVENTS bad code from entering the codebase
 * NO EXCEPTIONS - NO OVERRIDES
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('glob');

class StrictValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.config = {
      maxFileLines: 300,
      maxFunctionLines: 50,
      maxCyclomaticComplexity: 10,
      maxFileSize: 50 * 1024, // 50KB
      minTestCoverage: 80,
      maxDuplicatePercentage: 5,
      forbiddenPatterns: [
        { pattern: /console\.(log|error|warn|info)/, message: 'Use logger instead of console' },
        { pattern: /\/\/\s*(TODO|FIXME|HACK)/, message: 'Resolve TODOs before committing' },
        { pattern: /any\s*;/, message: 'TypeScript "any" type is forbidden' },
        { pattern: /require\(/, message: 'Use ES6 imports instead of require' },
        { pattern: /var\s+/, message: 'Use const/let instead of var' },
        { pattern: /==(?!=)/, message: 'Use === instead of ==' },
        { pattern: /!=(?!=)/, message: 'Use !== instead of !=' },
        { pattern: /^\s*\/\*[\s\S]*?\*\/\s*$/m, message: 'Remove commented code' },
        { pattern: /catch\s*\(\s*\)/, message: 'Empty catch blocks are forbidden' },
        { pattern: /throw\s+['""]/, message: 'Throw Error objects, not strings' }
      ],
      requiredFiles: [
        'README.md',
        'tsconfig.json',
        'package.json',
        '.gitignore',
        '.eslintrc.json',
        'jest.config.js'
      ],
      folderStructure: {
        'src/core': ['domain', 'use-cases', 'repositories'],
        'src/modules': [],
        'src/shared': ['utils', 'constants', 'types'],
        'src/infrastructure': ['database', 'cache'],
        'src/presentation': ['api', 'middleware', 'validators']
      }
    };
  }

  async validate() {
    logger.info('🔍 Starting strict validation...');

    // Check folder structure
    this.validateFolderStructure();

    // Check required files
    this.validateRequiredFiles();

    // Validate all source files
    await this.validateSourceFiles();

    // Check test coverage
    await this.validateTestCoverage();

    // Check for duplicate code
    await this.checkDuplicateCode();

    // Check TypeScript errors
    await this.validateTypeScript();

    // Check dependencies
    this.validateDependencies();

    // Check file sizes
    this.validateFileSizes();

    // Report results
    this.reportResults();
  }

  validateFolderStructure() {
    logger.info('📁 Validating folder structure...');
    
    Object.entries(this.config.folderStructure).forEach(([folder, subfolders]) => {
      if (!fs.existsSync(folder)) {
        this.errors.push(`Missing required folder: ${folder}`);
      } else {
        subfolders.forEach(subfolder => {
          const fullPath = path.join(folder, subfolder);
          if (!fs.existsSync(fullPath)) {
            this.errors.push(`Missing required subfolder: ${fullPath}`);
          }
        });
      }
    });

    // Check for files in wrong places
    const rootFiles = glob.sync('src/*.{js,ts,jsx,tsx}');
    if (rootFiles.length > 0) {
      this.errors.push(`Files found in src root (should be in subfolders): ${rootFiles.join(', ')}`);
    }
  }

  validateRequiredFiles() {
    logger.info('📄 Validating required files...');
    
    this.config.requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        this.errors.push(`Missing required file: ${file}`);
      }
    });
  }

  async validateSourceFiles() {
    logger.info('📝 Validating source files...');
    
    const files = glob.sync('src/**/*.{js,ts,jsx,tsx}', {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
    });

    for (const file of files) {
      await this.validateFile(file);
    }
  }

  async validateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Check file length
    if (lines.length > this.config.maxFileLines) {
      this.errors.push(
        `${filePath}: File too long (${lines.length} lines > ${this.config.maxFileLines} max)\n` +
        `  → Split into smaller modules following Single Responsibility Principle`
      );
    }

    // Check forbidden patterns
    this.config.forbiddenPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        const lineNum = this.findLineNumber(content, pattern);
        this.errors.push(`${filePath}:${lineNum} - ${message}`);
      }
    });

    // Check function length
    this.checkFunctionLength(filePath, content);

    // Check cyclomatic complexity
    await this.checkComplexity(filePath);

    // Check for proper exports
    this.checkModuleExports(filePath, content);

    // Check import structure
    this.checkImports(filePath, content);
  }

  checkFunctionLength(filePath, content) {
    const functionRegex = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]*)=>|\w+\s*\([^)]*\)\s*{)/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const startIndex = match.index;
      const functionLines = this.getFunctionLines(content, startIndex);
      
      if (functionLines > this.config.maxFunctionLines) {
        const lineNum = content.substring(0, startIndex).split('\n').length;
        this.errors.push(
          `${filePath}:${lineNum} - Function too long (${functionLines} lines > ${this.config.maxFunctionLines} max)\n` +
          `  → Extract into smaller functions or use composition pattern`
        );
      }
    }
  }

  getFunctionLines(content, startIndex) {
    let braceCount = 0;
    let inFunction = false;
    let lines = 0;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inFunction = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0 && inFunction) {
          return lines;
        }
      }
      
      if (inFunction && content[i] === '\n') {
        lines++;
      }
    }
    
    return lines;
  }

  async checkComplexity(filePath) {
    try {
      // Use eslint to check complexity
      const result = execSync(`npx eslint ${filePath} --format json`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const eslintResults = JSON.parse(result);
      eslintResults.forEach(fileResult => {
        fileResult.messages.forEach(message => {
          if (message.ruleId === 'complexity') {
            this.errors.push(
              `${filePath}: Cyclomatic complexity too high\n` +
              `  → Simplify logic, extract conditions, use early returns`
            );
          }
        });
      });
    } catch (error) {
      // ESLint will throw if there are errors, which is expected
    }
  }

  checkModuleExports(filePath, content) {
    if (filePath.includes('/modules/') && filePath.endsWith('index.ts')) {
      if (!content.includes('export')) {
        this.errors.push(`${filePath}: Module index must export public API`);
      }
    }
  }

  checkImports(filePath, content) {
    // Check for circular dependencies
    const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Check for importing from parent directories (except shared)
      if (importPath.includes('../') && !importPath.includes('shared')) {
        const lineNum = this.findLineNumber(content, match[0]);
        this.warnings.push(
          `${filePath}:${lineNum} - Importing from parent directory\n` +
          `  → Consider moving to shared or using dependency injection`
        );
      }
    }
  }

  async validateTestCoverage() {
    logger.info('🧪 Validating test coverage...');
    
    try {
      const coverageReport = execSync('npm run test:coverage -- --silent', { 
        encoding: 'utf8' 
      });
      
      const coverageMatch = coverageReport.match(/All files\s*\|\s*([\d.]+)/);
      if (coverageMatch) {
        const coverage = parseFloat(coverageMatch[1]);
        if (coverage < this.config.minTestCoverage) {
          this.errors.push(
            `Test coverage too low: ${coverage}% < ${this.config.minTestCoverage}% required\n` +
            `  → Write tests for uncovered code`
          );
        }
      }
    } catch (error) {
      this.errors.push('Failed to run test coverage check');
    }
  }

  async checkDuplicateCode() {
    logger.info('🔍 Checking duplicate code...');
    
    try {
      const result = execSync('npx jscpd src --min-lines 5 --reporters json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const report = JSON.parse(result);
      if (report.statistics.percentage > this.config.maxDuplicatePercentage) {
        this.errors.push(
          `Duplicate code detected: ${report.statistics.percentage}% > ${this.config.maxDuplicatePercentage}% max\n` +
          `  → Extract common code to shared utilities or base classes`
        );
        
        // Show duplicate locations
        report.duplicates.forEach(dup => {
          this.warnings.push(
            `Duplicate code found:\n` +
            `  - ${dup.firstFile}:${dup.lines[0]}-${dup.lines[1]}\n` +
            `  - ${dup.secondFile}:${dup.lines[0]}-${dup.lines[1]}`
          );
        });
      }
    } catch (error) {
      // JSCPD might not be installed
    }
  }

  async validateTypeScript() {
    logger.info('🔧 Validating TypeScript...');
    
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
    } catch (error) {
      this.errors.push(
        'TypeScript compilation errors found\n' +
        '  → Run "npm run type-check" to see errors'
      );
    }
  }

  validateDependencies() {
    logger.info('📦 Validating dependencies...');
    
    const projectRoot = path.resolve(__dirname, '..', '..');
    const packageJsonPath = path.join(projectRoot, 'backend', 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.warnings.push('Backend package.json not found');
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check for duplicate dependencies
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    
    const duplicates = deps.filter(dep => devDeps.includes(dep));
    if (duplicates.length > 0) {
      this.warnings.push(`Duplicate dependencies found in both dependencies and devDependencies: ${duplicates.join(', ')}`);
    }
    
    // Check for forbidden dependencies
    const forbidden = ['moment', 'underscore', 'jquery'];
    const foundForbidden = [...deps, ...devDeps].filter(dep => forbidden.includes(dep));
    
    if (foundForbidden.length > 0) {
      this.errors.push(`Forbidden dependencies found: ${foundForbidden.join(', ')}`);
    }
  }

  validateFileSizes() {
    logger.info('📊 Validating file sizes...');
    
    const files = glob.sync('src/**/*.{js,ts,jsx,tsx}');
    
    files.forEach(file => {
      const stats = fs.statSync(file);
      if (stats.size > this.config.maxFileSize) {
        this.errors.push(
          `${file}: File too large (${Math.round(stats.size / 1024)}KB > ${Math.round(this.config.maxFileSize / 1024)}KB max)\n` +
          `  → Split into smaller modules`
        );
      }
    });
  }

  findLineNumber(content, pattern) {
    const index = content.search(pattern);
    if (index === -1) return 1;
    return content.substring(0, index).split('\n').length;
  }

  reportResults() {
    logger.info('\n🎯 STRICT VALIDATION RESULTS\n');
    
    if (this.warnings.length > 0) {
      logger.info('⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        logger.info(`   ${warning}`);
      });
      logger.info('');
    }
    
    if (this.errors.length > 0) {
      logger.info('❌ ERRORS:');
      this.errors.forEach(error => {
        logger.info(`   ${error}`);
      });
      
      logger.info('\n🚨 VALIDATION FAILED - Fix all errors before proceeding');
      process.exit(1);
    } else {
      logger.info('✅ ALL VALIDATIONS PASSED');
    }
  }
}

// Run validator
const validator = new StrictValidator();
validator.validate().catch(error => {
  logger.error('❌ Validation failed:', error);
  process.exit(1);
});
