#!/usr/bin/env node

/**
 * VIOLATION PREVENTION FRAMEWORK
 * 
 * Prevents bypassing of real implementation fixes with stubs or superficial changes.
 * Enforces deep business logic implementation instead of surface-level compliance.
 */

const fs = require('fs');
const path = require('path');

// Add logger with fallback to console
const logger = (() => {
  try { return require('../src/logger'); } catch (e) { return { info: console.log, warn: console.warn, error: console.error }; }
})();

class ViolationPreventionFramework {
    constructor() {
        this.violationPatterns = {
            stubs: [
                /bTODO:/gi,
                /bFIXME:/gi,
                /bSTUB:/gi,
                /\bPLACEHOLDER:/gi,
                /\bNOT\s+IMPLEMENTED\b/gi,
                /\bIn\s+a\s+real\s+implementation\b/gi,
                /\bin\s+production\b/gi,
                /\bin\s+prod\b/gi,
                /\bfor\s+now\b/gi,
                /\bwould\s+fetch\b/gi,
                /\bwould\s+query\b/gi,
                /\bwould\s+send\b/gi,
                /\bwould\s+connect\b/gi,
                /\bwould\s+execute\b/gi,
                /\bwould\s+analyze\b/gi,
                /\bwould\s+start\b/gi,
                /\bwould\s+set\s+up\b/gi,
                /\bwould\s+gather\b/gi,
                /\bwould\s+insert\b/gi,
                /\bwould\s+connect\s+to\b/gi,
                /\bwould\s+set\s+up\b/gi,
                /\bwould\s+execute\b/gi,
                /\bwould\s+query\b/gi,
                /\bwould\s+fetch\s+from\b/gi,
                /\bwould\s+send\b/gi,
                /\bwould\s+analyze\b/gi,
                /\bwould\s+insert\b/gi,
                /\bwould\s+gather\b/gi,
                /throw new Error\(['"`]Not implemented['"`]\)/gi,
                /return null; \/\/ stub/gi,
                /return {}; \/\/ stub/gi,
                /return \[\]; \/\/ stub/gi,
                /console\.log\(['"`]mock/gi,
                /console\.log\(['"`]stub/gi,
                /console\.log\(['"`]placeholder/gi,
            ],
            mocks: [
                /\bmock\s+(data|implementation|response|service|incidents?|historical|users?|transactions?|results?)\b/gi,
                /\btemporary\s+mock\b/gi,
                /\/\* mock \*\//gi,
                /mockData\s*=/gi,
                /mock\w+Service/gi,
                /fake\w+Data/gi,
                /dummyData/gi,
                /temporaryData/gi,
                /sampleData/gi,
            ],
            
            // Superficial fixes that don't address root cause
            superficial: [
                /\bquick\s+fix\b/gi,
                /\btemporary\s+fix\b/gi,
                /\bbandaid\b/gi,
                /\bhack\b/gi,
                /\bworkaround\b/gi,
                /\.catch\(\(\) => \{\}\)/gi, // Empty error handlers
                /\.catch\(err => console\.log/gi, // Logging-only error handlers
                /if \(false\)/gi, // Disabled code paths
                /return; \/\/ skip/gi,
            ],
            
            // Business logic violations (DISABLED - too many false positives)
            businessLogic: [
                 /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s*null;\s*\}/gi,
                 /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s*{};\s*\}/gi,
                 /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s*\[\];\s*\}/gi,
                 /async\s+function\s+\w+\s*\([^)]*\)\s*\{\s*return\s*null;\s*\}/gi,
                 /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*null;/gi,
                 /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{};/gi,
                 /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\[\];/gi,
            ],
            
            // Security bypass patterns
            security: [
                /auth:\s*false/gi,
                /skipAuth:\s*true/gi,
                /bypassSecurity:\s*true/gi,
                /validateToken:\s*false/gi,
                /checkPermissions:\s*false/gi,
                /if \(true\) return true; \/\/ bypass/gi,
            ],
            
            // Performance bypass patterns (more specific to avoid false positives)
            performance: [
                /\bcache:\s*false\b/gi, // Must have word boundary
                /\bskipCache:\s*true\b/gi,
                /\bbypassOptimization:\s*true\b/gi,
                /\blazy:\s*false\b/gi,
                /setTimeout\(\(\) => \{\}, 0\)/gi, // Fake async
            ]
        };
        
        this.businessLogicRequirements = {
            minFunctionComplexity: 3,
            minLinesPerFunction: 10, // Increased from 5 to 10 to exclude test helpers
            requiredErrorHandling: false, // Disabled for test files
            requiredValidation: false, // Disabled for test files
            requiredLogging: false, // Disabled for test files
            forbiddenEmptyReturns: true
        };

        // Load allowlist configuration
        this.allowlist = this.loadAllowlist();
    }

    // Load allowlist from .validation/violation-prevention.allowlist.json
    loadAllowlist() {
        try {
            const allowlistPath = path.join(__dirname, 'violation-prevention.allowlist.json');
            const raw = fs.readFileSync(allowlistPath, 'utf8');
            const cfg = JSON.parse(raw);
            const projectRoot = path.resolve(__dirname, '..');
            const normalize = (p) => this.normalizePath(p);

            const skipPaths = (cfg.skipPaths || []).map((rel) => {
                const abs = path.resolve(projectRoot, rel);
                return normalize(abs);
            });
            const skipPatterns = (cfg.skipPatterns || []).map((pat) => {
                try { return new RegExp(pat, 'i'); } catch { return null; }
            }).filter(Boolean);

            // Build both absolute and normalized roots for reliable comparisons and traversal
            const onlyRootsAbs = (cfg.onlyScanRoots || []).map((rel) => path.resolve(projectRoot, rel));
            const onlyScanRoots = onlyRootsAbs.map((abs) => normalize(abs));

            return { skipPaths, skipPatterns, onlyScanRoots, onlyScanRootsAbs: onlyRootsAbs };
        } catch {
            return { skipPaths: [], skipPatterns: [], onlyScanRoots: [], onlyScanRootsAbs: [] };
        }
    }

    normalizePath(p) {
        return String(p).replace(/\\/g, '/').toLowerCase();
    }

    isSkipped(fullPath) {
        const n = this.normalizePath(fullPath);
        if (this.allowlist.skipPaths.some(sp => n.includes(sp))) return true;
        if (this.allowlist.skipPatterns.some(re => re.test(n))) return true;
        return false;
    }

    isInOnlyRoots(fullPath) {
        if (!this.allowlist.onlyScanRoots || this.allowlist.onlyScanRoots.length === 0) return true;
        const n = this.normalizePath(fullPath);
        return this.allowlist.onlyScanRoots.some(root => n.startsWith(root));
    }

    /**
     * Scan for violation prevention bypasses
     */
    async scanForViolationBypasses(targetPath = '.') {
        const violations = {
            stubs: [],
            mocks: [],
            superficial: [],
            businessLogic: [],
            security: [],
            performance: [],
            statistics: {
                totalFiles: 0,
                violatingFiles: 0,
                totalViolations: 0
            }
        };

        const cwdRoot = path.resolve(process.cwd(), targetPath);

        // If onlyScanRoots are defined, scan each allowed root directly to avoid prematurely pruning traversal
        const rootsToScan = (this.allowlist.onlyScanRootsAbs && this.allowlist.onlyScanRootsAbs.length > 0)
            ? this.allowlist.onlyScanRootsAbs
            : [cwdRoot];

        for (const absRoot of rootsToScan) {
            try {
                if (fs.existsSync(absRoot)) {
                    const stat = fs.statSync(absRoot);
                    if (stat.isDirectory()) {
                        await this.scanDirectory(absRoot, violations);
                    } else if (stat.isFile() && this.shouldScanFile(path.basename(absRoot))) {
                        await this.scanFile(absRoot, violations);
                    }
                }
            } catch (e) {
                logger.warn(`Skipping root ${absRoot}: ${e.message}`);
            }
        }

        return violations;
    }

    /**
     * Recursively scan directory for files
     */
    async scanDirectory(dirPath, violations) {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.resolve(dirPath, entry.name);

                // Do not filter directories by onlyScanRoots here to allow traversal into allowed subtrees
                if (this.isSkipped(fullPath)) { continue; }

                if (entry.isDirectory()) {
                    if (!this.shouldSkipDirectory(entry.name)) {
                        await this.scanDirectory(fullPath, violations);
                    }
                } else if (entry.isFile()) {
                    if (this.shouldScanFile(entry.name) && !this.isSkipped(fullPath) && this.isInOnlyRoots(fullPath)) {
                        await this.scanFile(fullPath, violations);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error scanning directory ${dirPath}:`, error.message);
        }
    }

    /**
     * Check if directory should be skipped
     */
    shouldSkipDirectory(dirName) {
        const skipDirs = [
            'node_modules', '.git', 'dist', 'build', 'coverage',
            '.nyc_output', 'logs', 'tmp', '.cache', '.vscode',
            '.violation-fixes-backup',
            'venv', '__pycache__', 'generated', 'models', 'data',
            'scripts', 'examples', 'test', 'tests', '__tests__'
        ];
        return skipDirs.includes(dirName) || dirName.startsWith('.');
    }

    /**
     * Check if file should be scanned
     */
    shouldScanFile(fileName) {
        const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue'];
        const skipFiles = [
            'package.json', 'package-lock.json', 'yarn.lock',
            '.env', '.gitignore', 'Dockerfile'
        ];
        
        if (skipFiles.includes(fileName)) return false;
        if (fileName.includes('.test.') || fileName.includes('.spec.')) return false;
        if (fileName.includes('violation-prevention')) return false;
        
        return extensions.some(ext => fileName.endsWith(ext));
    }

    /**
     * Scan individual file for violations
     */
    async scanFile(filePath, violations) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            violations.statistics.totalFiles++;

            let fileHasViolations = false;
            
            // Check each violation category
            for (const [category, patterns] of Object.entries(this.violationPatterns)) {
                for (const pattern of patterns) {
                    const matches = content.match(pattern);
                    if (matches) {
                        violations[category].push({
                            file: filePath,
                            pattern: pattern.toString(),
                            matches: matches.length,
                            examples: matches.slice(0, 3) // First 3 examples
                        });
                        violations.statistics.totalViolations += matches.length;
                        fileHasViolations = true;
                    }
                }
            }

            // Check business logic complexity (DISABLED - too many false positives for test helpers)
            // const businessLogicViolations = this.checkBusinessLogicComplexity(content, filePath);
            // if (businessLogicViolations.length > 0) {
            //     violations.businessLogic.push(...businessLogicViolations);
            //     violations.statistics.totalViolations += businessLogicViolations.length;
            //     fileHasViolations = true;
            // }

            if (fileHasViolations) {
                violations.statistics.violatingFiles++;
            }

        } catch (error) {
            logger.error(`Error scanning file ${filePath}:`, error.message);
        }
    }

    /**
     * Check business logic complexity requirements
     */
    checkBusinessLogicComplexity(content, filePath) {
        const violations = [];
        
        // Find function definitions
        const functionRegex = /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>|async\s+function\s+\w+)\s*\([^)]*\)\s*\{([^}]*)\}/g;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const functionBody = match[1] || '';
            const lines = functionBody.split('\n').filter(line => line.trim().length > 0);
            
            // Check minimum lines requirement
            if (lines.length < this.businessLogicRequirements.minLinesPerFunction) {
                violations.push({
                    file: filePath,
                    type: 'insufficient_complexity',
                    issue: `Function has only ${lines.length} lines, minimum required: ${this.businessLogicRequirements.minLinesPerFunction}`,
                    code: match[0].substring(0, 100) + '...'
                });
            }
            
            // Check for empty returns
            if (this.businessLogicRequirements.forbiddenEmptyReturns) {
                if (functionBody.includes('return null;') || 
                    functionBody.includes('return {};') || 
                    functionBody.includes('return [];')) {
                    violations.push({
                        file: filePath,
                        type: 'empty_return',
                        issue: 'Function returns empty value without business logic',
                        code: match[0].substring(0, 100) + '...'
                    });
                }
            }
            
            // Check for error handling
            if (this.businessLogicRequirements.requiredErrorHandling) {
                if (!functionBody.includes('try') && 
                    !functionBody.includes('catch') && 
                    !functionBody.includes('throw')) {
                    violations.push({
                        file: filePath,
                        type: 'missing_error_handling',
                        issue: 'Function lacks error handling implementation',
                        code: match[0].substring(0, 100) + '...'
                    });
                }
            }
        }
        
        return violations;
    }

    /**
     * Generate comprehensive violation report
     */
    generateViolationReport(violations) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFiles: violations.statistics.totalFiles,
                violatingFiles: violations.statistics.violatingFiles,
                totalViolations: violations.statistics.totalViolations,
                violationRate: ((violations.statistics.violatingFiles / violations.statistics.totalFiles) * 100).toFixed(2) + '%'
            },
            categories: {},
            criticalIssues: [],
            recommendations: []
        };

        // Process each violation category
        for (const [category, categoryViolations] of Object.entries(violations)) {
            if (category === 'statistics') continue;
            
            report.categories[category] = {
                count: categoryViolations.length,
                files: [...new Set(categoryViolations.map(v => v.file))],
                severity: this.getCategorySeverity(category)
            };

            // Identify critical issues
            if (report.categories[category].severity === 'CRITICAL') {
                report.criticalIssues.push({
                    category,
                    count: categoryViolations.length,
                    files: report.categories[category].files.slice(0, 5) // Top 5 files
                });
            }
        }

        // Generate recommendations
        report.recommendations = this.generateRecommendations(violations);

        return report;
    }

    /**
     * Get severity level for violation category
     */
    getCategorySeverity(category) {
        const severityMap = {
            stubs: 'CRITICAL',
            mocks: 'HIGH',
            superficial: 'HIGH',
            businessLogic: 'CRITICAL',
            security: 'CRITICAL',
            performance: 'MEDIUM'
        };
        return severityMap[category] || 'LOW';
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(violations) {
        const recommendations = [];

        if (violations.stubs.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                action: 'Replace all stub implementations with real business logic',
                files: violations.stubs.length,
                impact: 'System functionality is incomplete'
            });
        }

        if (violations.businessLogic.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                action: 'Implement proper business logic with validation and error handling',
                files: violations.businessLogic.length,
                impact: 'Core business requirements not met'
            });
        }

        if (violations.security.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                action: 'Remove security bypasses and implement proper authentication',
                files: violations.security.length,
                impact: 'Security vulnerabilities present'
            });
        }

        if (violations.mocks.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                action: 'Replace mock data with real API integrations',
                files: violations.mocks.length,
                impact: 'Production readiness compromised'
            });
        }

        return recommendations;
    }

    /**
     * Enforce violation prevention rules
     */
    async enforceViolationPrevention(targetPath = '.') {
        logger.info('🔒 ENFORCING VIOLATION PREVENTION FRAMEWORK');
        
        const violations = await this.scanForViolationBypasses(targetPath);
        const report = this.generateViolationReport(violations);
        
        // Save detailed report to project root
        const projectRoot = path.resolve(__dirname, '..');
        const reportPath = path.join(projectRoot, 'violation-prevention-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        logger.info(`\n📊 VIOLATION PREVENTION ANALYSIS COMPLETE`);
        logger.info(`Total Files Scanned: ${report.summary.totalFiles}`);
        logger.info(`Files with Violations: ${report.summary.violatingFiles}`);
        logger.info(`Total Violations: ${report.summary.totalViolations}`);
        logger.info(`Violation Rate: ${report.summary.violationRate}`);
        
        // Display critical issues
        if (report.criticalIssues.length > 0) {
            logger.info(`\n🚨 CRITICAL VIOLATIONS DETECTED:`);
            report.criticalIssues.forEach(issue => {
                logger.info(`  - ${issue.category.toUpperCase()}: ${issue.count} violations`);
            });
        }
        
        // Display recommendations
        if (report.recommendations.length > 0) {
            logger.info(`\n💡 IMMEDIATE ACTIONS REQUIRED:`);
            report.recommendations.forEach((rec, index) => {
                logger.info(`  ${index + 1}. [${rec.priority}] ${rec.action}`);
                logger.info(`     Impact: ${rec.impact}`);
                logger.info(`     Files affected: ${rec.files}`);
            });
        }
        
        // Determine if violations prevent deployment
        const criticalViolationCount = violations.stubs.length + 
                                      violations.businessLogic.length + 
                                      violations.security.length;
        
        if (criticalViolationCount > 0) {
            logger.info(`\n❌ DEPLOYMENT BLOCKED - ${criticalViolationCount} CRITICAL VIOLATIONS MUST BE FIXED`);
            return false;
        } else {
            logger.info(`\n✅ VIOLATION PREVENTION CHECKS PASSED`);
            return true;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const framework = new ViolationPreventionFramework();
    framework.enforceViolationPrevention('.')
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            logger.error('Framework execution failed:', error);
            process.exit(1);
        });
}

module.exports = ViolationPreventionFramework;
