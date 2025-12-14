/**
 * Comprehensive Security Scanner
 * Integrates multiple vulnerability scanning tools
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';

const execAsync = promisify(exec);

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'security-scanner' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/security-scan.log' }),
  ],
});

interface VulnerabilityReport {
  scanner: string;
  timestamp: Date;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  package?: string;
  version?: string;
  cve?: string;
  recommendation?: string;
}

class SecurityScanner {
  private projectRoot: string;
  private reportsDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.reportsDir = path.join(projectRoot, 'infrastructure', 'security', 'reports');
  }

  /**
   * Initialize scanner - create reports directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      logger.info('Security scanner initialized', { reportsDir: this.reportsDir });
    } catch (error) {
      logger.error('Failed to initialize scanner', { error });
      throw error;
    }
  }

  /**
   * Run npm audit for dependency vulnerabilities
   */
  async runNpmAudit(): Promise<VulnerabilityReport> {
    logger.info('Running npm audit...');

    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const auditData = JSON.parse(stdout);
      const vulnerabilities: Vulnerability[] = [];

      // Parse npm audit output
      if (auditData.vulnerabilities) {
        for (const [pkg, vuln] of Object.entries<any>(auditData.vulnerabilities)) {
          vulnerabilities.push({
            severity: vuln.severity,
            title: vuln.title || `Vulnerability in ${pkg}`,
            description: vuln.via?.[0]?.title || vuln.via || 'No description available',
            package: pkg,
            version: vuln.range || 'unknown',
            cve: vuln.via?.[0]?.cve || undefined,
            recommendation: `Update ${pkg} to ${vuln.fixAvailable ? 'latest version' : 'patched version'}`,
          });
        }
      }

      const report: VulnerabilityReport = {
        scanner: 'npm-audit',
        timestamp: new Date(),
        vulnerabilities,
        summary: this.calculateSummary(vulnerabilities),
      };

      await this.saveReport('npm-audit', report);
      logger.info('npm audit completed', { summary: report.summary });

      return report;
    } catch (error: any) {
      // npm audit returns exit code 1 if vulnerabilities are found
      if (error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          const vulnerabilities: Vulnerability[] = [];

          if (auditData.vulnerabilities) {
            for (const [pkg, vuln] of Object.entries<any>(auditData.vulnerabilities)) {
              vulnerabilities.push({
                severity: vuln.severity,
                title: vuln.title || `Vulnerability in ${pkg}`,
                description: vuln.via?.[0]?.title || vuln.via || 'No description available',
                package: pkg,
                version: vuln.range || 'unknown',
                cve: vuln.via?.[0]?.cve || undefined,
                recommendation: `Update ${pkg} to patched version`,
              });
            }
          }

          const report: VulnerabilityReport = {
            scanner: 'npm-audit',
            timestamp: new Date(),
            vulnerabilities,
            summary: this.calculateSummary(vulnerabilities),
          };

          await this.saveReport('npm-audit', report);
          logger.warn('npm audit found vulnerabilities', { summary: report.summary });

          return report;
        } catch (parseError) {
          logger.error('Failed to parse npm audit output', { error: parseError });
          throw parseError;
        }
      }

      logger.error('npm audit failed', { error });
      throw error;
    }
  }

  /**
   * Run Snyk vulnerability scan
   */
  async runSnykScan(): Promise<VulnerabilityReport> {
    logger.info('Running Snyk scan...');

    try {
      // Check if Snyk is authenticated
      try {
        await execAsync('snyk auth --version', { cwd: this.projectRoot });
      } catch (authError) {
        logger.warn('Snyk not authenticated - skipping Snyk scan');
        logger.info('To enable Snyk: Run "snyk auth" and follow the instructions');

        return {
          scanner: 'snyk',
          timestamp: new Date(),
          vulnerabilities: [],
          summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        };
      }

      const { stdout } = await execAsync('snyk test --json', {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024,
      });

      const snykData = JSON.parse(stdout);
      const vulnerabilities: Vulnerability[] = [];

      if (snykData.vulnerabilities) {
        for (const vuln of snykData.vulnerabilities) {
          vulnerabilities.push({
            severity: vuln.severity,
            title: vuln.title,
            description: vuln.description || vuln.title,
            package: vuln.packageName,
            version: vuln.version,
            cve: vuln.identifiers?.CVE?.[0] || undefined,
            recommendation: vuln.upgradePath?.join(' -> ') || 'No fix available',
          });
        }
      }

      const report: VulnerabilityReport = {
        scanner: 'snyk',
        timestamp: new Date(),
        vulnerabilities,
        summary: this.calculateSummary(vulnerabilities),
      };

      await this.saveReport('snyk', report);
      logger.info('Snyk scan completed', { summary: report.summary });

      return report;
    } catch (error: any) {
      if (error.stdout) {
        try {
          const snykData = JSON.parse(error.stdout);
          const vulnerabilities: Vulnerability[] = [];

          if (snykData.vulnerabilities) {
            for (const vuln of snykData.vulnerabilities) {
              vulnerabilities.push({
                severity: vuln.severity,
                title: vuln.title,
                description: vuln.description || vuln.title,
                package: vuln.packageName,
                version: vuln.version,
                cve: vuln.identifiers?.CVE?.[0] || undefined,
                recommendation: vuln.upgradePath?.join(' -> ') || 'No fix available',
              });
            }
          }

          const report: VulnerabilityReport = {
            scanner: 'snyk',
            timestamp: new Date(),
            vulnerabilities,
            summary: this.calculateSummary(vulnerabilities),
          };

          await this.saveReport('snyk', report);
          return report;
        } catch (parseError) {
          logger.warn('Snyk scan not available', { error: error.message });
          return {
            scanner: 'snyk',
            timestamp: new Date(),
            vulnerabilities: [],
            summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          };
        }
      }

      logger.warn('Snyk scan skipped', { error: error.message });
      return {
        scanner: 'snyk',
        timestamp: new Date(),
        vulnerabilities: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      };
    }
  }

  /**
   * Scan for hardcoded secrets and credentials
   */
  async scanForSecrets(): Promise<VulnerabilityReport> {
    logger.info('Scanning for hardcoded secrets...');

    const vulnerabilities: Vulnerability[] = [];
    const secretPatterns = [
      { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
      { name: 'AWS Secret Key', pattern: /aws(.{0,20})?['\"][0-9a-zA-Z\/+]{40}['\"]/ },
      { name: 'Private Key', pattern: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/ },
      { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\\-_]{35}/ },
      { name: 'Stripe API Key', pattern: /(sk|pk)_(test|live)_[0-9a-zA-Z]{24}/ },
      { name: 'Generic API Key', pattern: /api[_-]?key['\"]?\s*[:=]\s*['\"][a-zA-Z0-9]{20,}['\"]/ },
      { name: 'Password', pattern: /password['\"]?\s*[:=]\s*['\"][^'\"]{8,}['\"]/ },
      { name: 'Token', pattern: /token['\"]?\s*[:=]\s*['\"][a-zA-Z0-9]{20,}['\"]/ },
    ];

    try {
      const files = await this.getAllSourceFiles();

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');

        for (const { name, pattern } of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            vulnerabilities.push({
              severity: 'critical',
              title: `Potential ${name} found`,
              description: `File ${file} may contain a hardcoded ${name}`,
              recommendation: 'Move secrets to environment variables or secret management system',
            });
          }
        }
      }

      const report: VulnerabilityReport = {
        scanner: 'secrets-scan',
        timestamp: new Date(),
        vulnerabilities,
        summary: this.calculateSummary(vulnerabilities),
      };

      await this.saveReport('secrets-scan', report);
      logger.info('Secrets scan completed', { summary: report.summary });

      return report;
    } catch (error) {
      logger.error('Secrets scan failed', { error });
      throw error;
    }
  }

  /**
   * Run all security scans
   */
  async runAllScans(): Promise<{
    npmAudit: VulnerabilityReport;
    snyk: VulnerabilityReport;
    secrets: VulnerabilityReport;
    combined: VulnerabilityReport;
  }> {
    await this.initialize();

    logger.info('Starting comprehensive security scan...');

    const [npmAudit, snyk, secrets] = await Promise.all([
      this.runNpmAudit(),
      this.runSnykScan(),
      this.scanForSecrets(),
    ]);

    // Combine all vulnerabilities
    const allVulnerabilities = [
      ...npmAudit.vulnerabilities,
      ...snyk.vulnerabilities,
      ...secrets.vulnerabilities,
    ];

    const combined: VulnerabilityReport = {
      scanner: 'combined',
      timestamp: new Date(),
      vulnerabilities: allVulnerabilities,
      summary: this.calculateSummary(allVulnerabilities),
    };

    await this.saveReport('combined', combined);

    // Generate summary
    logger.info('Security scan completed', {
      npmAudit: npmAudit.summary,
      snyk: snyk.summary,
      secrets: secrets.summary,
      total: combined.summary,
    });

    return { npmAudit, snyk, secrets, combined };
  }

  /**
   * Calculate vulnerability summary
   */
  private calculateSummary(vulnerabilities: Vulnerability[]) {
    return {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
    };
  }

  /**
   * Save report to file
   */
  private async saveReport(scanner: string, report: VulnerabilityReport): Promise<void> {
    const filename = `${scanner}-${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    logger.info(`Report saved`, { scanner, filepath });
  }

  /**
   * Get all source files for scanning
   */
  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'coverage'];

    async function walk(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
              await walk(fullPath);
            }
          } else if (entry.isFile()) {
            // Only scan source files
            if (/\.(ts|js|tsx|jsx|env|yml|yaml|json)$/.test(entry.name)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    }

    await walk(process.cwd());
    return files;
  }
}

// CLI execution
if (require.main === module) {
  const scanner = new SecurityScanner();

  scanner
    .runAllScans()
    .then(results => {
      const { combined } = results;

      logger.info('='.repeat(80));
      logger.info('SECURITY SCAN SUMMARY');
      logger.info('='.repeat(80));
      logger.info(`Critical: ${combined.summary.critical}`);
      logger.info(`High: ${combined.summary.high}`);
      logger.info(`Medium: ${combined.summary.medium}`);
      logger.info(`Low: ${combined.summary.low}`);
      logger.info(`Info: ${combined.summary.info}`);
      logger.info('='.repeat(80));

      // Exit with error if critical vulnerabilities found
      if (combined.summary.critical > 0) {
        logger.error('CRITICAL VULNERABILITIES FOUND - BLOCKING DEPLOYMENT');
        process.exit(1);
      }

      if (combined.summary.high > 0) {
        logger.warn('HIGH SEVERITY VULNERABILITIES FOUND');
        process.exit(1);
      }

      logger.info('Security scan passed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Security scan failed', { error });
      process.exit(1);
    });
}

export { SecurityScanner, VulnerabilityReport, Vulnerability };
