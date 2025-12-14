#!/usr/bin/env node

/**
 * ENTERPRISE QUALITY VALIDATION
 * Enterprise-grade validation for production readiness
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class EnterpriseQualityValidation {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.basePath = process.cwd();
  }

  async validate() {
    console.log('🏢 Enterprise Quality Validation Starting...');
    
    // Critical enterprise checks
    await this.validateSecurity();
    await this.validateArchitecture();
    await this.validateCompliance();
    await this.validatePerformance();

    this.generateReport();
  }

  async validateSecurity() {
    console.log('🔒 Validating security compliance...');
    
    const files = glob.sync('src/**/*.{js,ts}', { 
      cwd: this.basePath,
      ignore: ['**/*.test.*', '**/*.spec.*'] 
    });

    for (const file of files) {
      const fullPath = path.join(this.basePath, file);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for security vulnerabilities
      if (content.includes('eval(')) {
        this.addViolation('SECURITY_001', `Critical security risk: eval() usage in ${file}`);
      }
      
      if (content.includes('innerHTML =')) {
        this.addViolation('SECURITY_002', `XSS vulnerability: innerHTML usage in ${file}`);
      }
      
      if (content.match(/password.*=.*['"][^'"]+['"]/i)) {
        this.addViolation('SECURITY_003', `Hardcoded password detected in ${file}`);
      }
    }
  }

  async validateArchitecture() {
    console.log('🏗️ Validating architecture patterns...');
    
    // Check for proper separation of concerns
    const srcFiles = glob.sync('src/**/*.{js,ts}', { cwd: this.basePath });
    
    let hasProperStructure = true;
    const requiredDirs = ['src/core', 'src/shared', 'src/modules'];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(path.join(this.basePath, dir))) {
        hasProperStructure = false;
        this.addViolation('ARCHITECTURE_001', `Missing required directory: ${dir}`);
      }
    }
  }

  async validateCompliance() {
    console.log('📋 Validating compliance standards...');
    
    // Check for proper documentation
    if (!fs.existsSync(path.join(this.basePath, 'README.md'))) {
      this.addViolation('COMPLIANCE_001', 'Missing README.md documentation');
    }
    
    // Check for proper testing
    const testFiles = glob.sync('tests/**/*.{js,ts}', { cwd: this.basePath });
    const srcFiles = glob.sync('src/**/*.{js,ts}', { cwd: this.basePath });
    
    if (testFiles.length === 0) {
      this.addViolation('COMPLIANCE_002', 'No test files found - testing is required');
    } else if (testFiles.length < srcFiles.length * 0.5) {
      this.addViolation('COMPLIANCE_003', 'Insufficient test coverage - less than 50% of source files have tests');
    }
  }

  async validatePerformance() {
    console.log('⚡ Validating performance standards...');
    
    const files = glob.sync('src/**/*.{js,ts}', { cwd: this.basePath });
    
    for (const file of files) {
      const fullPath = path.join(this.basePath, file);
      if (!fs.existsSync(fullPath)) continue;

      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      // Check file size
      if (lines.length > 500) {
        this.addViolation('PERFORMANCE_001', `File too large: ${file} (${lines.length} lines > 500 max)`);
      }
      
      // Check for performance anti-patterns
      if (content.includes('document.getElementById') && !file.includes('test')) {
        this.addWarning('PERFORMANCE_002', `Direct DOM manipulation in ${file} - consider framework patterns`);
      }
    }
  }

  addViolation(code, message) {
    this.violations.push({ code, message, severity: 'CRITICAL' });
  }

  addWarning(code, message) {
    this.warnings.push({ code, message, severity: 'WARNING' });
  }

  generateReport() {
    console.log('\n🏢 ENTERPRISE QUALITY VALIDATION REPORT');
    console.log('=======================================');

    if (this.violations.length > 0) {
      console.log('\n❌ CRITICAL VIOLATIONS:');
      this.violations.forEach((violation, index) => {
        console.log(`❌ ${violation.code}: ${violation.message}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`⚠️ ${warning.code}: ${warning.message}`);
      });
    }

    console.log(`\n📊 Summary: ${this.violations.length} violations, ${this.warnings.length} warnings`);
    
    if (this.violations.length === 0) {
      console.log('✅ Enterprise validation PASSED');
    } else {
      console.log('❌ Enterprise validation FAILED');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new EnterpriseQualityValidation();
  validator.validate().catch(error => {
    console.error('❌ Enterprise validation failed:', error);
    process.exit(1);
  });
}

module.exports = EnterpriseQualityValidation;
