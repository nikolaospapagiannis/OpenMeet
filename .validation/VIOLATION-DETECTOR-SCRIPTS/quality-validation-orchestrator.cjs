#!/usr/bin/env node

/**
 * COMPREHENSIVE QUALITY VALIDATION ORCHESTRATOR
 * Runs all enhanced validation scripts and generates systematic fix checklists
 * Provides precise location tracking for all violations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QualityValidationOrchestrator {
  constructor() {
    this.results = {
      enhanced: null,
      enterprise: null,
      strict: null,
      combined: {
        totalViolations: 0,
        totalWarnings: 0,
        filesAffected: new Set(),
        violationsByType: {},
        violationsByFile: {}
      }
    };
    this.validationDir = path.join(process.cwd(), '.validation');
    this.scriptsDir = path.join(this.validationDir, 'VIOLATION-DETECTOR-SCRIPTS');
  }

  async runComprehensiveValidation() {
    console.log('🏗️  COMPREHENSIVE QUALITY VALIDATION ORCHESTRATOR');
    console.log('==================================================\n');

    // Ensure validation directory exists
    if (!fs.existsSync(this.validationDir)) {
      fs.mkdirSync(this.validationDir, { recursive: true });
    }

    try {
      // Run enhanced quality detector
      console.log('1️⃣  Running Enhanced Quality Detector...');
      await this.runEnhancedQualityDetector();

      // Run enterprise quality validation
      console.log('\n2️⃣  Running Enterprise Quality Validation...');
      await this.runEnterpriseValidation();

      // Run strict validator
      console.log('\n3️⃣  Running Strict Validator...');
      await this.runStrictValidator();

      // Combine all results
      console.log('\n4️⃣  Combining Results...');
      this.combineResults();

      // Generate master checklist
      console.log('\n5️⃣  Generating Master Systematic Fix Checklist...');
      this.generateMasterChecklist();

      // Generate summary report
      console.log('\n6️⃣  Generating Summary Report...');
      this.generateSummaryReport();

    } catch (error) {
      console.error('❌ Validation orchestration failed:', error);
      process.exit(1);
    }
  }

  async runEnhancedQualityDetector() {
    try {
      const scriptPath = path.join(this.scriptsDir, 'enhanced-quality-detector.cjs');
      if (fs.existsSync(scriptPath)) {
        const output = execSync(`node "${scriptPath}"`, { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        console.log('✅ Enhanced Quality Detector completed');
        this.results.enhanced = this.parseEnhancedOutput(output);
      } else {
        console.log('⚠️  Enhanced quality detector script not found');
      }
    } catch (error) {
      console.log('❌ Enhanced quality detector failed:', error.message);
    }
  }

  async runEnterpriseValidation() {
    try {
      const scriptPath = path.join(this.scriptsDir, 'enterprise-quality-validation.cjs');
      if (fs.existsSync(scriptPath)) {
        const output = execSync(`node "${scriptPath}"`, { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        console.log('✅ Enterprise Quality Validation completed');
        this.results.enterprise = this.parseEnterpriseOutput(output);
      } else {
        console.log('⚠️  Enterprise validation script not found');
      }
    } catch (error) {
      console.log('❌ Enterprise validation failed:', error.message);
    }
  }

  async runStrictValidator() {
    try {
      const scriptPath = path.join(this.scriptsDir, 'strict-validator.js');
      if (fs.existsSync(scriptPath)) {
        const output = execSync(`node "${scriptPath}"`, { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        console.log('✅ Strict Validator completed');
        this.results.strict = this.parseStrictOutput(output);
      } else {
        console.log('⚠️  Strict validator script not found');
      }
    } catch (error) {
      console.log('❌ Strict validator failed:', error.message);
    }
  }

  parseEnhancedOutput(output) {
    // Extract metrics and violations from enhanced detector output
    const violations = [];
    const warnings = [];
    
    const lines = output.split('\n');
    let currentViolation = null;
    
    for (const line of lines) {
      if (line.includes('📁 File:')) {
        if (currentViolation) violations.push(currentViolation);
        currentViolation = {
          file: line.split('📁 File:')[1]?.trim(),
          lineNumber: null,
          class: null,
          method: null,
          violation: null,
          type: 'ENHANCED_DETECTOR'
        };
      } else if (line.includes('📍 Line:') && currentViolation) {
        currentViolation.lineNumber = parseInt(line.split('📍 Line:')[1]?.trim());
      } else if (line.includes('🏗️  Class:') && currentViolation) {
        currentViolation.class = line.split('🏗️  Class:')[1]?.trim();
      } else if (line.includes('🔧 Method:') && currentViolation) {
        currentViolation.method = line.split('🔧 Method:')[1]?.trim();
      } else if (line.includes('. ') && currentViolation && !currentViolation.violation) {
        currentViolation.violation = line.split('. ')[1]?.trim();
      }
    }
    
    if (currentViolation) violations.push(currentViolation);
    
    return { violations, warnings };
  }

  parseEnterpriseOutput(output) {
    // Extract violations from enterprise validation output
    const violations = [];
    const criticalPattern = /❌ (.+): (.+)/g;
    let match;
    
    while ((match = criticalPattern.exec(output)) !== null) {
      violations.push({
        type: 'ENTERPRISE_VALIDATION',
        code: match[1],
        violation: match[2],
        severity: 'CRITICAL'
      });
    }
    
    return { violations, warnings: [] };
  }

  parseStrictOutput(output) {
    // Extract violations from strict validator output
    const violations = [];
    const errorPattern = /ERROR: (.+)/g;
    let match;
    
    while ((match = errorPattern.exec(output)) !== null) {
      violations.push({
        type: 'STRICT_VALIDATION',
        violation: match[1],
        severity: 'HIGH'
      });
    }
    
    return { violations, warnings: [] };
  }

  combineResults() {
    const allViolations = [];
    const allWarnings = [];

    // Combine violations from all validators
    if (this.results.enhanced) {
      allViolations.push(...this.results.enhanced.violations);
      allWarnings.push(...this.results.enhanced.warnings);
    }

    if (this.results.enterprise) {
      allViolations.push(...this.results.enterprise.violations);
      allWarnings.push(...this.results.enterprise.warnings);
    }

    if (this.results.strict) {
      allViolations.push(...this.results.strict.violations);
      allWarnings.push(...this.results.strict.warnings);
    }

    // Aggregate statistics
    this.results.combined.totalViolations = allViolations.length;
    this.results.combined.totalWarnings = allWarnings.length;

    // Group by type
    allViolations.forEach(violation => {
      const type = violation.type || 'UNKNOWN';
      if (!this.results.combined.violationsByType[type]) {
        this.results.combined.violationsByType[type] = [];
      }
      this.results.combined.violationsByType[type].push(violation);

      if (violation.file) {
        this.results.combined.filesAffected.add(violation.file);
        
        if (!this.results.combined.violationsByFile[violation.file]) {
          this.results.combined.violationsByFile[violation.file] = [];
        }
        this.results.combined.violationsByFile[violation.file].push(violation);
      }
    });
  }

  generateMasterChecklist() {
    const checklistPath = path.join(this.validationDir, 'MASTER_SYSTEMATIC_FIX_CHECKLIST.md');
    
    let checklist = `# MASTER SYSTEMATIC FIX CHECKLIST\n`;
    checklist += `Generated: ${new Date().toISOString()}\n\n`;
    
    checklist += `## 📊 COMPREHENSIVE SUMMARY\n`;
    checklist += `- **Total Critical Violations:** ${this.results.combined.totalViolations}\n`;
    checklist += `- **Total Warnings:** ${this.results.combined.totalWarnings}\n`;
    checklist += `- **Files Affected:** ${this.results.combined.filesAffected.size}\n`;
    checklist += `- **Violation Types:** ${Object.keys(this.results.combined.violationsByType).length}\n\n`;

    checklist += `## 🎯 PRIORITY MATRIX\n\n`;
    
    // Critical violations first
    const criticalViolations = Object.values(this.results.combined.violationsByType)
      .flat()
      .filter(v => v.severity === 'CRITICAL');
    
    if (criticalViolations.length > 0) {
      checklist += `### 🚨 CRITICAL - MUST FIX IMMEDIATELY (${criticalViolations.length} items)\n`;
      criticalViolations.forEach((violation, index) => {
        checklist += `- [ ] **${violation.file || 'Unknown File'}:${violation.lineNumber || 'N/A'}** `;
        checklist += `(${violation.class || 'N/A'}.${violation.method || 'N/A'}): ${violation.violation}\n`;
      });
      checklist += '\n';
    }

    // High priority violations
    const highViolations = Object.values(this.results.combined.violationsByType)
      .flat()
      .filter(v => v.severity === 'HIGH');
    
    if (highViolations.length > 0) {
      checklist += `### 🔥 HIGH PRIORITY (${highViolations.length} items)\n`;
      highViolations.slice(0, 20).forEach((violation, index) => {
        checklist += `- [ ] **${violation.file || 'Unknown File'}:${violation.lineNumber || 'N/A'}** `;
        checklist += `(${violation.class || 'N/A'}.${violation.method || 'N/A'}): ${violation.violation}\n`;
      });
      if (highViolations.length > 20) {
        checklist += `... and ${highViolations.length - 20} more high priority items\n`;
      }
      checklist += '\n';
    }

    // Violations by file for systematic fixing
    checklist += `## 📁 VIOLATIONS BY FILE (for systematic fixing)\n\n`;
    
    Object.entries(this.results.combined.violationsByFile)
      .sort(([,a], [,b]) => b.length - a.length) // Sort by violation count
      .slice(0, 20) // Top 20 most problematic files
      .forEach(([file, violations]) => {
        checklist += `### ${file} (${violations.length} violations)\n`;
        violations.forEach((violation, index) => {
          checklist += `- [ ] **Line ${violation.lineNumber || 'N/A'}** `;
          checklist += `(${violation.class || 'N/A'}.${violation.method || 'N/A'}): ${violation.violation}\n`;
        });
        checklist += '\n';
      });

    checklist += `## 🔄 PROGRESS TRACKING\n`;
    checklist += `- [ ] Critical Security Violations Fixed\n`;
    checklist += `- [ ] Architecture Violations Resolved\n`;
    checklist += `- [ ] Code Quality Issues Addressed\n`;
    checklist += `- [ ] All TypeScript Errors Fixed\n`;
    checklist += `- [ ] Test Coverage Improved\n`;
    checklist += `- [ ] Documentation Updated\n`;
    checklist += `- [ ] Code Review Completed\n`;
    checklist += `- [ ] All Validation Scripts Pass\n\n`;

    checklist += `## 📈 QUALITY METRICS TO ACHIEVE\n`;
    checklist += `- [ ] Zero Critical Violations\n`;
    checklist += `- [ ] Less than 50 Warnings\n`;
    checklist += `- [ ] All Files Under 300 Lines\n`;
    checklist += `- [ ] All Functions Under 50 Lines\n`;
    checklist += `- [ ] Cyclomatic Complexity < 10\n`;
    checklist += `- [ ] Test Coverage > 80%\n`;
    checklist += `- [ ] Enterprise Quality Score > 80/100\n`;

    try {
      fs.writeFileSync(checklistPath, checklist);
      console.log(`✅ Master checklist generated: ${checklistPath}`);
    } catch (error) {
      console.log('❌ Could not generate master checklist');
    }
  }

  generateSummaryReport() {
    console.log('\n🏆 COMPREHENSIVE VALIDATION SUMMARY');
    console.log('=====================================\n');

    console.log('📊 AGGREGATE METRICS:');
    console.log(`Total Violations: ${this.results.combined.totalViolations}`);
    console.log(`Total Warnings: ${this.results.combined.totalWarnings}`);
    console.log(`Files Affected: ${this.results.combined.filesAffected.size}`);
    console.log(`Violation Types: ${Object.keys(this.results.combined.violationsByType).length}\n`);

    console.log('🎯 VIOLATION BREAKDOWN BY TYPE:');
    Object.entries(this.results.combined.violationsByType)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([type, violations]) => {
        console.log(`  ${type}: ${violations.length} violations`);
      });

    console.log('\n📁 TOP 10 MOST PROBLEMATIC FILES:');
    Object.entries(this.results.combined.violationsByFile)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 10)
      .forEach(([file, violations], index) => {
        console.log(`  ${index + 1}. ${file}: ${violations.length} violations`);
      });

    // Overall quality assessment
    const totalIssues = this.results.combined.totalViolations + this.results.combined.totalWarnings;
    const qualityScore = Math.max(0, 100 - Math.min(100, totalIssues / 10));
    
    console.log('\n🎯 OVERALL QUALITY ASSESSMENT:');
    console.log(`Quality Score: ${qualityScore.toFixed(1)}/100`);
    
    if (this.results.combined.totalViolations > 0) {
      console.log('Status: ❌ NOT READY FOR PRODUCTION');
      console.log('Action Required: Fix all critical violations before deployment');
    } else if (totalIssues > 100) {
      console.log('Status: ⚠️  NEEDS IMPROVEMENT');
      console.log('Action Required: Address warnings for production readiness');
    } else {
      console.log('Status: ✅ PRODUCTION READY');
      console.log('Action: Continue monitoring and maintaining quality');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Review Master Systematic Fix Checklist');
    console.log('2. Fix critical violations first');
    console.log('3. Address high-priority issues');
    console.log('4. Improve most problematic files');
    console.log('5. Run validation again to measure progress');
  }
}

// Run the orchestrator
if (require.main === module) {
  const orchestrator = new QualityValidationOrchestrator();
  orchestrator.runComprehensiveValidation().catch(error => {
    console.error('Orchestration failed:', error);
    process.exit(1);
  });
}

module.exports = QualityValidationOrchestrator;
