/**
 * Secrets Scanner
 * Scans codebase for exposed secrets, API keys, and credentials
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
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
  defaultMeta: { service: 'secrets-scanner' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/secrets-scan.log' }),
  ],
});

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  description: string;
}

interface SecretFinding {
  file: string;
  line: number;
  column: number;
  type: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  evidence: string;
  recommendation: string;
}

interface SecretsReport {
  timestamp: Date;
  totalFiles: number;
  filesWithSecrets: number;
  findings: SecretFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
  };
}

class SecretsScanner {
  private projectRoot: string;
  private reportsDir: string;
  private patterns: SecretPattern[];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.reportsDir = path.join(projectRoot, 'infrastructure', 'security', 'reports');

    // Define secret patterns
    this.patterns = [
      {
        name: 'AWS Access Key ID',
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: 'critical',
        description: 'AWS Access Key ID detected',
      },
      {
        name: 'AWS Secret Access Key',
        pattern: /aws[_-]?secret[_-]?access[_-]?key['\"]?\s*[:=]\s*['\"][0-9a-zA-Z\/+]{40}['\"]/gi,
        severity: 'critical',
        description: 'AWS Secret Access Key detected',
      },
      {
        name: 'Google API Key',
        pattern: /AIza[0-9A-Za-z\-_]{35}/g,
        severity: 'critical',
        description: 'Google API Key detected',
      },
      {
        name: 'Google OAuth',
        pattern: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g,
        severity: 'high',
        description: 'Google OAuth Client ID detected',
      },
      {
        name: 'Stripe API Key',
        pattern: /(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}/g,
        severity: 'critical',
        description: 'Stripe API Key detected',
      },
      {
        name: 'Private Key',
        pattern: /-----BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g,
        severity: 'critical',
        description: 'Private Key detected',
      },
      {
        name: 'GitHub Token',
        pattern: /gh[ps]_[0-9a-zA-Z]{36}/g,
        severity: 'critical',
        description: 'GitHub Personal Access Token detected',
      },
      {
        name: 'Slack Token',
        pattern: /xox[baprs]-[0-9a-zA-Z\-]+/g,
        severity: 'high',
        description: 'Slack Token detected',
      },
      {
        name: 'Twilio API Key',
        pattern: /SK[0-9a-fA-F]{32}/g,
        severity: 'critical',
        description: 'Twilio API Key detected',
      },
      {
        name: 'SendGrid API Key',
        pattern: /SG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}/g,
        severity: 'critical',
        description: 'SendGrid API Key detected',
      },
      {
        name: 'Mailgun API Key',
        pattern: /key-[0-9a-zA-Z]{32}/g,
        severity: 'high',
        description: 'Mailgun API Key detected',
      },
      {
        name: 'JWT Token',
        pattern: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
        severity: 'high',
        description: 'JWT Token detected',
      },
      {
        name: 'Generic API Key',
        pattern: /api[_-]?key['\"]?\s*[:=]\s*['\"][a-zA-Z0-9]{20,}['\"]/gi,
        severity: 'high',
        description: 'Generic API Key pattern detected',
      },
      {
        name: 'Generic Secret',
        pattern: /secret['\"]?\s*[:=]\s*['\"][a-zA-Z0-9]{20,}['\"]/gi,
        severity: 'medium',
        description: 'Generic Secret pattern detected',
      },
      {
        name: 'Password',
        pattern: /password['\"]?\s*[:=]\s*['\"][^'\"]{8,}['\"]/gi,
        severity: 'high',
        description: 'Hardcoded password detected',
      },
      {
        name: 'Database URL',
        pattern: /(mongodb|postgres|mysql):\/\/[^\s]+:[^\s]+@[^\s]+/gi,
        severity: 'critical',
        description: 'Database connection string with credentials detected',
      },
      {
        name: 'OAuth Token',
        pattern: /oauth[_-]?token['\"]?\s*[:=]\s*['\"][a-zA-Z0-9\-._~+/]+=*['\"]/gi,
        severity: 'high',
        description: 'OAuth Token detected',
      },
    ];
  }

  /**
   * Initialize scanner
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      logger.info('Secrets scanner initialized', { reportsDir: this.reportsDir });
    } catch (error) {
      logger.error('Failed to initialize scanner', { error });
      throw error;
    }
  }

  /**
   * Scan all files for secrets
   */
  async scanAll(): Promise<SecretsReport> {
    await this.initialize();

    logger.info('Starting secrets scan...');

    const files = await this.getAllSourceFiles();
    const findings: SecretFinding[] = [];

    logger.info(`Scanning ${files.length} files...`);

    for (const file of files) {
      const fileFindings = await this.scanFile(file);
      findings.push(...fileFindings);
    }

    const filesWithSecrets = new Set(findings.map(f => f.file)).size;

    const summary = {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
    };

    const report: SecretsReport = {
      timestamp: new Date(),
      totalFiles: files.length,
      filesWithSecrets,
      findings,
      summary,
    };

    await this.saveReport(report);

    logger.info('Secrets scan completed', {
      totalFiles: files.length,
      filesWithSecrets,
      summary,
    });

    return report;
  }

  /**
   * Scan individual file for secrets
   */
  private async scanFile(filePath: string): Promise<SecretFinding[]> {
    const findings: SecretFinding[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const pattern of this.patterns) {
        // Reset regex lastIndex
        pattern.pattern.lastIndex = 0;

        let match;
        while ((match = pattern.pattern.exec(content)) !== null) {
          // Calculate line and column
          const lineNumber = this.getLineNumber(content, match.index);
          const column = this.getColumnNumber(content, match.index);

          // Skip if it's in a comment or example
          const line = lines[lineNumber - 1] || '';
          if (this.isLikelyFalsePositive(line, match[0])) {
            continue;
          }

          findings.push({
            file: filePath,
            line: lineNumber,
            column,
            type: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            evidence: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : ''),
            recommendation: 'Move secret to environment variables or secure vault. Never commit secrets to version control.',
          });

          logger.warn('Secret detected', {
            file: filePath,
            line: lineNumber,
            type: pattern.name,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to scan file', { file: filePath, error });
    }

    return findings;
  }

  /**
   * Check if finding is likely a false positive
   */
  private isLikelyFalsePositive(line: string, evidence: string): boolean {
    const falsePositiveIndicators = [
      '// example',
      '// sample',
      '// test',
      '// placeholder',
      '// dummy',
      'EXAMPLE',
      'PLACEHOLDER',
      'YOUR_',
      'REPLACE_',
      'xxx',
      '***',
      '...',
    ];

    const lineLower = line.toLowerCase();
    const evidenceLower = evidence.toLowerCase();

    return falsePositiveIndicators.some(
      indicator => lineLower.includes(indicator.toLowerCase()) || evidenceLower.includes(indicator.toLowerCase())
    );
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get column number from character index
   */
  private getColumnNumber(content: string, index: number): number {
    const lastNewline = content.lastIndexOf('\n', index);
    return index - lastNewline;
  }

  /**
   * Get all source files to scan
   */
  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'coverage', 'logs'];
    const excludeFiles = ['.min.js', '.map', 'package-lock.json', 'pnpm-lock.yaml'];

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
            // Skip excluded file types
            if (excludeFiles.some(ext => entry.name.endsWith(ext))) {
              continue;
            }

            // Include source files and config files
            if (/\.(ts|js|tsx|jsx|env|yml|yaml|json|md|sh)$/.test(entry.name)) {
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

  /**
   * Save report to file
   */
  private async saveReport(report: SecretsReport): Promise<void> {
    const filename = `secrets-scan-${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));

    // Also save text report
    const textReport = this.generateTextReport(report);
    const textFilename = `secrets-scan-${Date.now()}.txt`;
    const textFilepath = path.join(this.reportsDir, textFilename);

    await fs.writeFile(textFilepath, textReport);

    logger.info('Reports saved', { json: filepath, text: textFilepath });
  }

  /**
   * Generate text report
   */
  private generateTextReport(report: SecretsReport): string {
    let text = '='.repeat(80) + '\n';
    text += 'SECRETS SCAN REPORT\n';
    text += '='.repeat(80) + '\n';
    text += `Timestamp: ${report.timestamp.toISOString()}\n`;
    text += `Total Files Scanned: ${report.totalFiles}\n`;
    text += `Files with Secrets: ${report.filesWithSecrets}\n`;
    text += '\n';
    text += 'SUMMARY:\n';
    text += `  Critical: ${report.summary.critical}\n`;
    text += `  High: ${report.summary.high}\n`;
    text += `  Medium: ${report.summary.medium}\n`;
    text += '='.repeat(80) + '\n\n';

    if (report.findings.length === 0) {
      text += '✅ No secrets detected!\n';
    } else {
      text += 'FINDINGS:\n\n';

      for (const finding of report.findings) {
        text += `-`.repeat(80) + '\n';
        text += `[${finding.severity.toUpperCase()}] ${finding.type}\n`;
        text += `File: ${finding.file}:${finding.line}:${finding.column}\n`;
        text += `Description: ${finding.description}\n`;
        text += `Evidence: ${finding.evidence}\n`;
        text += `Recommendation: ${finding.recommendation}\n`;
        text += '\n';
      }
    }

    return text;
  }

  /**
   * Create pre-commit hook to prevent secret commits
   */
  async createPreCommitHook(): Promise<void> {
    const hookPath = path.join(this.projectRoot, '.git', 'hooks', 'pre-commit');

    const hookScript = `#!/bin/bash
# Pre-commit hook to prevent committing secrets

echo "🔍 Scanning for secrets before commit..."

# Run secrets scanner
ts-node infrastructure/security/secrets-scanner.ts

if [ $? -ne 0 ]; then
  echo "❌ Secret detected! Commit blocked."
  echo "Please remove secrets and use environment variables instead."
  exit 1
fi

echo "✅ No secrets detected"
exit 0
`;

    try {
      await fs.writeFile(hookPath, hookScript, { mode: 0o755 });
      logger.info('Pre-commit hook created', { path: hookPath });
    } catch (error) {
      logger.warn('Failed to create pre-commit hook', { error });
    }
  }
}

// CLI execution
if (require.main === module) {
  const scanner = new SecretsScanner();

  scanner
    .scanAll()
    .then(report => {
      logger.info('='.repeat(80));
      logger.info('SECRETS SCAN SUMMARY');
      logger.info('='.repeat(80));
      logger.info(`Total Files: ${report.totalFiles}`);
      logger.info(`Files with Secrets: ${report.filesWithSecrets}`);
      logger.info(`Critical: ${report.summary.critical}`);
      logger.info(`High: ${report.summary.high}`);
      logger.info(`Medium: ${report.summary.medium}`);
      logger.info('='.repeat(80));

      if (report.findings.length > 0) {
        logger.error('SECRETS DETECTED IN CODEBASE!');
        logger.error('See report for details');

        // Create pre-commit hook
        scanner.createPreCommitHook().catch(err => {
          logger.error('Failed to create pre-commit hook', { error: err });
        });

        process.exit(1);
      }

      logger.info('✅ No secrets detected');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Secrets scan failed', { error });
      process.exit(1);
    });
}

export { SecretsScanner, SecretsReport, SecretFinding };
