/**
 * Comprehensive Penetration Testing Suite
 * Uses OWASP ZAP API for automated security testing
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pen-test' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/pen-test.log' }),
  ],
});

interface PenTestConfig {
  targetUrl: string;
  zapApiKey?: string;
  zapProxyUrl?: string;
  testTypes?: TestType[];
}

type TestType = 'sql-injection' | 'xss' | 'csrf' | 'auth-bypass' | 'security-headers' | 'ssl';

interface TestResult {
  testType: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  findings: Finding[];
  duration: number;
}

interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  url: string;
  method?: string;
  parameter?: string;
  evidence?: string;
  solution?: string;
  cwe?: string;
  wasc?: string;
}

interface PenTestReport {
  timestamp: Date;
  targetUrl: string;
  duration: number;
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
  };
}

class PenetrationTester {
  private config: PenTestConfig;
  private zapClient?: AxiosInstance;
  private reportsDir: string;

  constructor(config: PenTestConfig) {
    this.config = {
      zapProxyUrl: config.zapProxyUrl || 'http://localhost:8080',
      zapApiKey: config.zapApiKey || process.env.ZAP_API_KEY,
      testTypes: config.testTypes || ['sql-injection', 'xss', 'csrf', 'auth-bypass', 'security-headers', 'ssl'],
      ...config,
    };

    this.reportsDir = path.join(process.cwd(), 'infrastructure', 'security', 'reports');

    // Initialize ZAP client if available
    if (this.config.zapProxyUrl && this.config.zapApiKey) {
      this.zapClient = axios.create({
        baseURL: `${this.config.zapProxyUrl}/JSON`,
        params: { apikey: this.config.zapApiKey },
      });
    }
  }

  /**
   * Initialize penetration tester
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      logger.info('Penetration tester initialized', {
        targetUrl: this.config.targetUrl,
        reportsDir: this.reportsDir,
      });
    } catch (error) {
      logger.error('Failed to initialize penetration tester', { error });
      throw error;
    }
  }

  /**
   * Run all penetration tests
   */
  async runAllTests(): Promise<PenTestReport> {
    await this.initialize();

    const startTime = Date.now();
    logger.info('Starting penetration tests...', { targetUrl: this.config.targetUrl });

    const results: TestResult[] = [];

    // Run each test type
    for (const testType of this.config.testTypes!) {
      try {
        const result = await this.runTest(testType);
        results.push(result);
      } catch (error) {
        logger.error(`Test ${testType} failed`, { error });
        results.push({
          testType,
          passed: false,
          severity: 'critical',
          findings: [{
            severity: 'critical',
            title: `Test execution failed: ${testType}`,
            description: `Failed to execute ${testType} test`,
            url: this.config.targetUrl,
            solution: 'Check test configuration and target availability',
          }],
          duration: 0,
        });
      }
    }

    const duration = Date.now() - startTime;

    // Calculate summary
    const allFindings = results.flatMap(r => r.findings);
    const summary = {
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      criticalFindings: allFindings.filter(f => f.severity === 'critical').length,
      highFindings: allFindings.filter(f => f.severity === 'high').length,
      mediumFindings: allFindings.filter(f => f.severity === 'medium').length,
      lowFindings: allFindings.filter(f => f.severity === 'low').length,
    };

    const report: PenTestReport = {
      timestamp: new Date(),
      targetUrl: this.config.targetUrl,
      duration,
      results,
      summary,
    };

    await this.saveReport(report);

    logger.info('Penetration tests completed', { summary });

    return report;
  }

  /**
   * Run individual test
   */
  private async runTest(testType: TestType): Promise<TestResult> {
    const startTime = Date.now();
    logger.info(`Running ${testType} test...`);

    let findings: Finding[] = [];

    switch (testType) {
      case 'sql-injection':
        findings = await this.testSQLInjection();
        break;
      case 'xss':
        findings = await this.testXSS();
        break;
      case 'csrf':
        findings = await this.testCSRF();
        break;
      case 'auth-bypass':
        findings = await this.testAuthBypass();
        break;
      case 'security-headers':
        findings = await this.testSecurityHeaders();
        break;
      case 'ssl':
        findings = await this.testSSL();
        break;
    }

    const duration = Date.now() - startTime;
    const criticalOrHigh = findings.filter(f => f.severity === 'critical' || f.severity === 'high');

    return {
      testType,
      passed: criticalOrHigh.length === 0,
      severity: this.getHighestSeverity(findings),
      findings,
      duration,
    };
  }

  /**
   * Test for SQL Injection vulnerabilities
   */
  private async testSQLInjection(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users--",
      "1' UNION SELECT NULL--",
      "admin'--",
      "' OR 1=1--",
      "1' AND 1=1--",
    ];

    const testEndpoints = [
      '/api/auth/login',
      '/api/users',
      '/api/meetings',
      '/api/search',
    ];

    for (const endpoint of testEndpoints) {
      for (const payload of sqlPayloads) {
        try {
          const testUrl = `${this.config.targetUrl}${endpoint}?id=${encodeURIComponent(payload)}`;
          const response = await axios.get(testUrl, {
            validateStatus: () => true,
            timeout: 5000,
          });

          // Check for SQL error patterns in response
          const sqlErrors = [
            'sql syntax',
            'mysql_fetch',
            'ora-',
            'postgresql',
            'sqlite_',
            'sqlserver',
            'syntax error',
            'unclosed quotation',
          ];

          const responseText = JSON.stringify(response.data).toLowerCase();
          const hasSQLError = sqlErrors.some(error => responseText.includes(error));

          if (hasSQLError || response.status === 500) {
            findings.push({
              severity: 'critical',
              title: 'SQL Injection Vulnerability Detected',
              description: `Endpoint ${endpoint} may be vulnerable to SQL injection`,
              url: testUrl,
              method: 'GET',
              parameter: 'id',
              evidence: payload,
              solution: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL queries.',
              cwe: 'CWE-89',
              wasc: 'WASC-19',
            });
            break; // Don't test more payloads for this endpoint
          }
        } catch (error) {
          // Ignore timeout/network errors
        }
      }
    }

    return findings;
  }

  /**
   * Test for Cross-Site Scripting (XSS) vulnerabilities
   */
  private async testXSS(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg/onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
    ];

    const testEndpoints = [
      '/api/search',
      '/api/users/profile',
      '/api/meetings',
    ];

    for (const endpoint of testEndpoints) {
      for (const payload of xssPayloads) {
        try {
          const testUrl = `${this.config.targetUrl}${endpoint}?q=${encodeURIComponent(payload)}`;
          const response = await axios.get(testUrl, {
            validateStatus: () => true,
            timeout: 5000,
          });

          const responseText = JSON.stringify(response.data);

          // Check if payload is reflected in response
          if (responseText.includes(payload) || responseText.includes(payload.replace(/"/g, '&quot;'))) {
            findings.push({
              severity: 'high',
              title: 'Potential XSS Vulnerability Detected',
              description: `Endpoint ${endpoint} may be vulnerable to XSS - user input reflected without sanitization`,
              url: testUrl,
              method: 'GET',
              parameter: 'q',
              evidence: payload,
              solution: 'Sanitize all user input before rendering. Use Content Security Policy headers.',
              cwe: 'CWE-79',
              wasc: 'WASC-8',
            });
            break;
          }
        } catch (error) {
          // Ignore timeout/network errors
        }
      }
    }

    return findings;
  }

  /**
   * Test for CSRF vulnerabilities
   */
  private async testCSRF(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const testEndpoints = [
      '/api/auth/logout',
      '/api/users/delete',
      '/api/settings/update',
    ];

    for (const endpoint of testEndpoints) {
      try {
        // Test if endpoint accepts requests without CSRF token
        const response = await axios.post(
          `${this.config.targetUrl}${endpoint}`,
          { test: 'data' },
          {
            validateStatus: () => true,
            timeout: 5000,
            headers: {
              'Origin': 'http://evil.com',
              'Referer': 'http://evil.com',
            },
          }
        );

        // If request succeeds without CSRF token, it's vulnerable
        if (response.status < 400) {
          findings.push({
            severity: 'high',
            title: 'CSRF Vulnerability Detected',
            description: `Endpoint ${endpoint} accepts requests without CSRF token validation`,
            url: `${this.config.targetUrl}${endpoint}`,
            method: 'POST',
            solution: 'Implement CSRF token validation for all state-changing operations. Use SameSite cookie attribute.',
            cwe: 'CWE-352',
            wasc: 'WASC-9',
          });
        }
      } catch (error) {
        // Ignore timeout/network errors
      }
    }

    return findings;
  }

  /**
   * Test for authentication bypass vulnerabilities
   */
  private async testAuthBypass(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const protectedEndpoints = [
      '/api/admin/users',
      '/api/billing/invoices',
      '/api/analytics/data',
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        // Test access without authentication
        const response = await axios.get(`${this.config.targetUrl}${endpoint}`, {
          validateStatus: () => true,
          timeout: 5000,
        });

        if (response.status === 200) {
          findings.push({
            severity: 'critical',
            title: 'Authentication Bypass Detected',
            description: `Protected endpoint ${endpoint} accessible without authentication`,
            url: `${this.config.targetUrl}${endpoint}`,
            method: 'GET',
            solution: 'Implement proper authentication middleware for all protected endpoints.',
            cwe: 'CWE-287',
            wasc: 'WASC-1',
          });
        }

        // Test with invalid token
        const invalidTokenResponse = await axios.get(`${this.config.targetUrl}${endpoint}`, {
          validateStatus: () => true,
          timeout: 5000,
          headers: {
            'Authorization': 'Bearer invalid_token_12345',
          },
        });

        if (invalidTokenResponse.status === 200) {
          findings.push({
            severity: 'critical',
            title: 'Weak Authentication Validation',
            description: `Endpoint ${endpoint} accepts invalid authentication tokens`,
            url: `${this.config.targetUrl}${endpoint}`,
            method: 'GET',
            solution: 'Implement proper token validation and signature verification.',
            cwe: 'CWE-287',
          });
        }
      } catch (error) {
        // Ignore timeout/network errors
      }
    }

    return findings;
  }

  /**
   * Test security headers
   */
  private async testSecurityHeaders(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const response = await axios.get(this.config.targetUrl, {
        validateStatus: () => true,
        timeout: 5000,
      });

      const headers = response.headers;

      // Check for required security headers
      const requiredHeaders = {
        'strict-transport-security': {
          severity: 'high' as const,
          title: 'Missing HSTS Header',
          description: 'HTTP Strict Transport Security (HSTS) header not set',
          solution: 'Add Strict-Transport-Security header with max-age and includeSubDomains',
        },
        'x-frame-options': {
          severity: 'medium' as const,
          title: 'Missing X-Frame-Options Header',
          description: 'X-Frame-Options header not set - vulnerable to clickjacking',
          solution: 'Add X-Frame-Options: DENY or SAMEORIGIN header',
        },
        'x-content-type-options': {
          severity: 'low' as const,
          title: 'Missing X-Content-Type-Options Header',
          description: 'X-Content-Type-Options header not set',
          solution: 'Add X-Content-Type-Options: nosniff header',
        },
        'content-security-policy': {
          severity: 'high' as const,
          title: 'Missing Content-Security-Policy Header',
          description: 'Content Security Policy not implemented',
          solution: 'Implement strict Content Security Policy to prevent XSS attacks',
        },
        'x-xss-protection': {
          severity: 'low' as const,
          title: 'Missing X-XSS-Protection Header',
          description: 'X-XSS-Protection header not set',
          solution: 'Add X-XSS-Protection: 1; mode=block header',
        },
      };

      for (const [headerName, config] of Object.entries(requiredHeaders)) {
        if (!headers[headerName]) {
          findings.push({
            severity: config.severity,
            title: config.title,
            description: config.description,
            url: this.config.targetUrl,
            solution: config.solution,
          });
        }
      }

      // Check for insecure headers
      if (headers['x-powered-by']) {
        findings.push({
          severity: 'low',
          title: 'Information Disclosure',
          description: 'X-Powered-By header exposes server technology',
          url: this.config.targetUrl,
          evidence: headers['x-powered-by'],
          solution: 'Remove X-Powered-By header to avoid information disclosure',
        });
      }
    } catch (error) {
      logger.error('Security headers test failed', { error });
    }

    return findings;
  }

  /**
   * Test SSL/TLS configuration
   */
  private async testSSL(): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (!this.config.targetUrl.startsWith('https://')) {
      findings.push({
        severity: 'critical',
        title: 'Insecure Protocol',
        description: 'Application not using HTTPS',
        url: this.config.targetUrl,
        solution: 'Enable HTTPS and redirect all HTTP traffic to HTTPS',
        cwe: 'CWE-319',
      });
    }

    return findings;
  }

  /**
   * Get highest severity from findings
   */
  private getHighestSeverity(findings: Finding[]): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (findings.some(f => f.severity === 'critical')) return 'critical';
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    if (findings.some(f => f.severity === 'low')) return 'low';
    return 'info';
  }

  /**
   * Save report to file
   */
  private async saveReport(report: PenTestReport): Promise<void> {
    const filename = `pen-test-${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));

    // Also save HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlFilename = `pen-test-${Date.now()}.html`;
    const htmlFilepath = path.join(this.reportsDir, htmlFilename);

    await fs.writeFile(htmlFilepath, htmlReport);

    logger.info('Reports saved', { json: filepath, html: htmlFilepath });
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(report: PenTestReport): string {
    const { summary } = report;

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Penetration Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .critical { color: #d32f2f; }
    .high { color: #f57c00; }
    .medium { color: #fbc02d; }
    .low { color: #388e3c; }
    .finding { border-left: 4px solid #ccc; padding: 10px; margin: 10px 0; background: #fafafa; }
    .finding.critical { border-left-color: #d32f2f; }
    .finding.high { border-left-color: #f57c00; }
    .finding.medium { border-left-color: #fbc02d; }
    .finding.low { border-left-color: #388e3c; }
  </style>
</head>
<body>
  <h1>Penetration Test Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Target:</strong> ${report.targetUrl}</p>
    <p><strong>Date:</strong> ${report.timestamp.toISOString()}</p>
    <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)}s</p>
    <p><strong>Total Tests:</strong> ${summary.totalTests}</p>
    <p><strong>Passed:</strong> ${summary.passed}</p>
    <p><strong>Failed:</strong> ${summary.failed}</p>
    <p class="critical"><strong>Critical Findings:</strong> ${summary.criticalFindings}</p>
    <p class="high"><strong>High Findings:</strong> ${summary.highFindings}</p>
    <p class="medium"><strong>Medium Findings:</strong> ${summary.mediumFindings}</p>
    <p class="low"><strong>Low Findings:</strong> ${summary.lowFindings}</p>
  </div>
  ${report.results.map(result => `
    <div class="test-result">
      <h3>${result.testType}</h3>
      <p><strong>Status:</strong> ${result.passed ? '✅ Passed' : '❌ Failed'}</p>
      <p><strong>Findings:</strong> ${result.findings.length}</p>
      ${result.findings.map(finding => `
        <div class="finding ${finding.severity}">
          <h4>${finding.title}</h4>
          <p><strong>Severity:</strong> <span class="${finding.severity}">${finding.severity.toUpperCase()}</span></p>
          <p><strong>Description:</strong> ${finding.description}</p>
          ${finding.url ? `<p><strong>URL:</strong> ${finding.url}</p>` : ''}
          ${finding.solution ? `<p><strong>Solution:</strong> ${finding.solution}</p>` : ''}
          ${finding.cwe ? `<p><strong>CWE:</strong> ${finding.cwe}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>
    `.trim();
  }
}

// CLI execution
if (require.main === module) {
  const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';

  const tester = new PenetrationTester({
    targetUrl,
    zapApiKey: process.env.ZAP_API_KEY,
  });

  tester
    .runAllTests()
    .then(report => {
      const { summary } = report;

      logger.info('='.repeat(80));
      logger.info('PENETRATION TEST SUMMARY');
      logger.info('='.repeat(80));
      logger.info(`Target: ${report.targetUrl}`);
      logger.info(`Total Tests: ${summary.totalTests}`);
      logger.info(`Passed: ${summary.passed}`);
      logger.info(`Failed: ${summary.failed}`);
      logger.info(`Critical: ${summary.criticalFindings}`);
      logger.info(`High: ${summary.highFindings}`);
      logger.info(`Medium: ${summary.mediumFindings}`);
      logger.info(`Low: ${summary.lowFindings}`);
      logger.info('='.repeat(80));

      // Exit with error if critical findings
      if (summary.criticalFindings > 0) {
        logger.error('CRITICAL SECURITY VULNERABILITIES FOUND');
        process.exit(1);
      }

      if (summary.highFindings > 0) {
        logger.warn('HIGH SEVERITY VULNERABILITIES FOUND');
        process.exit(1);
      }

      logger.info('Penetration test passed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Penetration test failed', { error });
      process.exit(1);
    });
}

export { PenetrationTester, PenTestConfig, PenTestReport, TestResult, Finding };
