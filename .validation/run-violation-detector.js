#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

// Define logger fallback
const logger = {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    debug: (...args) => console.debug('[DEBUG]', ...args),
    success: (...args) => console.log('[SUCCESS]', ...args)
};

// Import the violation detector
const ViolationPreventionFramework = require('./violation-prevention-framework');

async function runViolationDetection() {
    logger.info('🔍 Starting Violation Detection...');
    
    const rootPath = path.resolve(__dirname, '..');
    logger.info(`📁 Analyzing directory: ${rootPath}`);
    
    try {
        const framework = new ViolationPreventionFramework();
        const violations = await framework.scanForViolationBypasses(rootPath);
        const report = framework.generateViolationReport(violations);
        
        // Create results object in expected format
        const results = {
            violations: [],
            summary: {
                totalFiles: violations.statistics.totalFiles,
                filesWithViolations: violations.statistics.violatingFiles,
                totalViolations: violations.statistics.totalViolations,
                byCategory: {}
            }
        };
        
        // Process violations into flat array
        for (const [category, categoryViolations] of Object.entries(violations)) {
            if (category === 'statistics') continue;
            
            results.summary.byCategory[category.toUpperCase()] = categoryViolations.length;
            
            for (const violation of categoryViolations) {
                if (violation.file) {
                    // Add each match as a separate violation
                    const matches = violation.matches || 1;
                    for (let i = 0; i < matches; i++) {
                        results.violations.push({
                            file: violation.file,
                            line: 0, // Line number not tracked in current implementation
                            category: category.toUpperCase(),
                            message: violation.issue || violation.type || `${category} violation detected`,
                            code: violation.code || violation.examples?.[i] || ''
                        });
                    }
                }
            }
        }
        
        // Display summary
        logger.info('\n📊 VIOLATION DETECTION RESULTS:');
        logger.info('='.repeat(50));
        logger.info(`Total Files Scanned: ${results.summary.totalFiles}`);
        logger.info(`Files with Violations: ${results.summary.filesWithViolations}`);
        logger.info(`Total Violations: ${results.summary.totalViolations}`);
        
        // Show violations by category
        logger.info('\n📋 VIOLATIONS BY CATEGORY:');
        Object.entries(results.summary.byCategory).forEach(([category, count]) => {
            const isCritical = ['STUBS', 'BUSINESSLOGIC', 'SECURITY'].includes(category);
            const marker = isCritical ? '🚨' : '⚠️';
            logger.info(`  ${marker} ${category}: ${count}`);
        });
        
        // Show critical violations
        const criticalViolations = results.violations.filter(v => 
            ['STUBS', 'BUSINESSLOGIC', 'SECURITY'].includes(v.category)
        );
        
        if (criticalViolations.length > 0) {
            logger.error('\n🚨 CRITICAL VIOLATIONS FOUND:');
            const byFile = {};
            criticalViolations.forEach(v => {
                if (!byFile[v.file]) byFile[v.file] = [];
                byFile[v.file].push(v);
            });
            
            Object.entries(byFile).slice(0, 10).forEach(([file, violations]) => {
                logger.error(`\n  ${path.relative(rootPath, file)} (${violations.length} violations)`);
                violations.slice(0, 3).forEach(v => {
                    logger.error(`    Line ${v.line}: ${v.message} [${v.category}]`);
                });
            });
        }
        
        // Save detailed report
        const reportPath = path.join(rootPath, 'violation-prevention-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        logger.info(`\n💾 Detailed report saved to: ${reportPath}`);
        
        // Exit code based on critical violations
        const hasCritical = results.summary.byCategory.STUBS > 0 || 
                           results.summary.byCategory.BUSINESSLOGIC > 0 ||
                           results.summary.byCategory.SECURITY > 0;
        
        if (hasCritical) {
            logger.error('\n❌ DEPLOYMENT BLOCKED: Critical violations must be fixed');
            return 1;
        } else {
            logger.success('\n✅ No critical violations found');
            return 0;
        }
        
    } catch (error) {
        logger.error('❌ Error during violation detection:', error.message);
        logger.error(error.stack);
        return 1;
    }
}

// Run if called directly
if (require.main === module) {
    runViolationDetection().then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        logger.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { runViolationDetection };
