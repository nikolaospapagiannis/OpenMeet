#!/usr/bin/env node

/**
 * VIOLATION PREVENTION FRAMEWORK
 * 
 * Prevents bypassing of real implementation fixes with stubs or superficial changes.
 * Enforces deep business logic implementation instead of surface-level compliance.
 */

const fs = require('fs');
const path = require('path');

const logger = {
    info: (...args) => console.warn(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args)
};

class ViolationPreventionFramework {
    constructor() {
        this.violationPatterns = {

            stubs: [
                /\/\/ TODO:/gi,
                /\/\/ FIXME:/gi,
                /\/\/ STUB:/gi,
                /\/\/ PLACEHOLDER:/gi,
                /\/\/ NOT IMPLEMENTED/gi,
                /throw new Error\(['"`]Not implemented['"`]\)/gi,
                /return null; \/\/ stub/gi,
                /return {}; \/\/ stub/gi,
                /return \[\]; \/\/ stub/gi,
                /console\.log\(['"`]mock/gi,
                /console\.log\(['"`]stub/gi,
                /console\.log\(['"`]placeholder/gi,
            ],

            mocks: [
                /\/\/ Mock data/gi,
                /\/\/ Temporary mock/gi,
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
                /\/\/ Quick fix/gi,
                /\/\/ Temporary fix/gi,
                /\/\/ Bandaid/gi,
                /\/\/ Hack/gi,
                /\/\/ Workaround/gi,
                /\.catch\(\(\) => \{\}\)/gi, // Empty error handlers
                /\.catch\(err => console\.log/gi, // Logging-only error handlers
                /if \(false\)/gi, // Disabled code paths
                /return; \/\/ skip/gi,
            ],
            
            // Business logic violations
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
            
            // Performance bypass patterns
            performance: [
                /cache:\s*false/gi,
                /skipCache:\s*true/gi,
                /bypassOptimization:\s*true/gi,
                /lazy:\s*false/gi,
                /setTimeout\(\(\) => \{\}, 0\)/gi, // Fake async
            ]
        };
        
        this.businessLogicRequirements = {
            minFunctionComplexity: 3,
            minLinesPerFunction: 5,
            requiredErrorHandling: true,
            requiredValidation: true,
            requiredLogging: true,
            forbiddenEmptyReturns: true
        };
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

        await this.scanDirectory(targetPath, violations);
        return violations;
    }

    /**
     * Recursively scan directory for files
     */
    async scanDirectory(dirPath, violations) {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    if (!this.shouldSkipDirectory(entry.name)) {
                        await this.scanDirectory(fullPath, violations);
                    }
                } else if (entry.isFile()) {
                    if (this.shouldScanFile(entry.name)) {
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
            '.violation-fixes-backup'
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

            // Check business logic complexity
            const businessLogicViolations = this.checkBusinessLogicComplexity(content, filePath);
            if (businessLogicViolations.length > 0) {
                violations.businessLogic.push(...businessLogicViolations);
                violations.statistics.totalViolations += businessLogicViolations.length;
                fileHasViolations = true;
            }

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
        // Debug output removed
        
        const violations = await this.scanForViolationBypasses(targetPath);
        const report = this.generateViolationReport(violations);
        
        // Save detailed report
        const reportPath = 'violation-prevention-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Debug output removed
        // Debug output removed
        // Debug output removed
        // Debug output removed
        // Debug output removed
        
        // Display critical issues
        if (report.criticalIssues.length > 0) {
            // Debug output removed
            report.criticalIssues.forEach(issue => {
                // Debug output removed}: ${issue.count} violations`);
            });
        }
        
        // Display recommendations
        if (report.recommendations.length > 0) {
            // Debug output removed
            report.recommendations.forEach((rec, index) => {
                // Debug output removed
                // Debug output removed
                // Debug output removed
            });
        }
        
        // Determine if violations prevent deployment
        const criticalViolationCount = violations.stubs.length + 
                                      violations.businessLogic.length + 
                                      violations.security.length;
        
        if (criticalViolationCount > 0) {
            // Debug output removed
            return false;
        } else {
            // Debug output removed
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
