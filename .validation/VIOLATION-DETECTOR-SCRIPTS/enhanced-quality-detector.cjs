#!/usr/bin/env node

/**
 * ENHANCED QUALITY DETECTOR
 * Provides detailed violation detection with precise location tracking
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class EnhancedQualityDetector {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.basePath = process.cwd();
  }

  async detect() {
    console.log('🔍 Enhanced Quality Detection Starting...');
    
    const files = glob.sync('src/**/*.{js,ts,jsx,tsx}', {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
      cwd: this.basePath
    });

    console.log(`📊 Analyzing ${files.length} source files...`);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    this.generateReport();
  }

  async analyzeFile(file) {
    const fullPath = path.join(this.basePath, file);
    if (!fs.existsSync(fullPath)) return;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    // Analyze each line
    lines.forEach((line, index) => {
      this.checkLine(file, index + 1, line, content);
    });

    // File-level checks
    this.checkFileStructure(file, content, lines);
  }

  checkLine(file, lineNumber, line, fullContent) {
    // Check for critical patterns
    const criticalPatterns = [
      { pattern: /console\.(log|error|warn|info)/, message: 'Console statement in production code' },
      { pattern: /eval\(/, message: 'Security risk: eval() usage detected' },
      { pattern: /innerHTML\s*=/, message: 'Security risk: innerHTML usage' },
      { pattern: /var\s+/, message: 'Use const/let instead of var' },
      { pattern: /==(?!=)/, message: 'Use === instead of ==' },
      { pattern: /TODO|FIXME|HACK/, message: 'Unresolved TODO/FIXME comment' }
    ];

    criticalPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(line)) {
        this.addViolation(file, lineNumber, null, null, message);
      }
    });
  }

  checkFileStructure(file, content, lines) {
    // Check file size
    if (lines.length > 300) {
      this.addViolation(file, 1, null, null, `File too large: ${lines.length} lines (max 300)`);
    }

    // Check for proper imports
    if (content.includes('require(') && !file.includes('test')) {
      this.addViolation(file, 1, null, null, 'Use ES6 imports instead of require()');
    }

    // Check for TypeScript any usage
    if (content.includes(': any') || content.includes('any[]')) {
      this.addViolation(file, 1, null, null, 'Avoid using TypeScript any type');
    }
  }

  addViolation(file, lineNumber, className, methodName, message) {
    this.violations.push({
      file,
      lineNumber,
      class: className,
      method: methodName,
      violation: message
    });
  }

  generateReport() {
    console.log('\n📋 ENHANCED QUALITY DETECTOR REPORT');
    console.log('=====================================');

    this.violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.violation}`);
      console.log(`📁 File: ${violation.file}`);
      console.log(`📍 Line: ${violation.lineNumber}`);
      if (violation.class) console.log(`🏗️  Class: ${violation.class}`);
      if (violation.method) console.log(`🔧 Method: ${violation.method}`);
    });

    console.log(`\n📊 Total Violations Found: ${this.violations.length}`);
  }
}

// Run if called directly
if (require.main === module) {
  const detector = new EnhancedQualityDetector();
  detector.detect().catch(error => {
    console.error('❌ Detection failed:', error);
    process.exit(1);
  });
}

module.exports = EnhancedQualityDetector;
