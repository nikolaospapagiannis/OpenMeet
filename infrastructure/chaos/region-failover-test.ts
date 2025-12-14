#!/usr/bin/env ts-node

/**
 * Multi-Region Failover Testing
 * Tests automatic failover between regions with RTO measurement
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import axios from 'axios';

const execAsync = promisify(exec);

interface RegionFailoverResult {
  fromRegion: string;
  toRegion: string;
  startTime: Date;
  endTime: Date;
  rto: number;
  trafficShifted: boolean;
  healthCheckPassed: boolean;
  success: boolean;
  details: string;
}

class RegionFailoverTester {
  private results: RegionFailoverResult[] = [];
  private regions = [
    { name: 'us-east-1', endpoint: 'https://primary.openmeet.ai' },
    { name: 'us-west-2', endpoint: 'https://secondary.openmeet.ai' },
    { name: 'eu-west-1', endpoint: 'https://tertiary.openmeet.ai' }
  ];

  async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async checkRegionHealth(endpoint: string): Promise<boolean> {
    try {
      const response = await axios.get(`${endpoint}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getCurrentPrimaryRegion(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        "aws route53 get-health-check-status --health-check-id <PRIMARY_HEALTH_CHECK_ID> --query 'HealthCheckObservations[0].StatusReport.Status' --output text"
      );
      return stdout.includes('Success') ? 'us-east-1' : 'us-west-2';
    } catch (error) {
      return 'us-east-1'; // Default
    }
  }

  async testRegionFailover(fromRegion: string, toRegion: string): Promise<RegionFailoverResult> {
    this.log('========================================');
    this.log(`Testing Region Failover: ${fromRegion} -> ${toRegion}`);
    this.log('========================================');

    const startTime = new Date();
    let trafficShifted = false;
    let healthCheckPassed = false;
    let success = false;
    let details = '';

    try {
      const fromEndpoint = this.regions.find(r => r.name === fromRegion)?.endpoint;
      const toEndpoint = this.regions.find(r => r.name === toRegion)?.endpoint;

      if (!fromEndpoint || !toEndpoint) {
        throw new Error('Invalid region specified');
      }

      // Verify target region is healthy
      this.log(`Verifying ${toRegion} is healthy...`);
      const targetHealthy = await this.checkRegionHealth(toEndpoint);
      if (!targetHealthy) {
        throw new Error(`Target region ${toRegion} is not healthy`);
      }
      this.log(`✅ ${toRegion} is healthy`);

      // Simulate primary region failure by scaling down all deployments
      this.log(`Simulating failure in ${fromRegion}...`);
      await execAsync(
        `kubectl --context openmeet-primary scale deployment --all --replicas=0 -n openmeet-production`
      );

      // Monitor Route53 health check
      this.log('Monitoring Route53 health check...');
      let healthCheckFailed = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes

      while (attempts < maxAttempts && !healthCheckFailed) {
        try {
          const healthy = await this.checkRegionHealth(fromEndpoint);
          if (!healthy) {
            healthCheckFailed = true;
            this.log('Route53 detected primary region failure');
            break;
          }
        } catch (error) {
          healthCheckFailed = true;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      if (!healthCheckFailed) {
        throw new Error('Health check did not detect failure');
      }

      // Wait for Route53 to failover
      this.log('Waiting for Route53 to failover to secondary region...');
      let failoverCompleted = false;
      attempts = 0;

      while (attempts < maxAttempts && !failoverCompleted) {
        try {
          // Check if global endpoint is now serving from secondary
          const response = await axios.get('https://api.openmeet.ai/health', {
            timeout: 5000,
            headers: { 'User-Agent': 'FailoverTest' }
          });

          const serverRegion = response.headers['x-region'] || response.headers['x-amz-cf-pop'];

          if (serverRegion && serverRegion.includes(toRegion.split('-')[0])) {
            failoverCompleted = true;
            trafficShifted = true;
            this.log(`✅ Traffic shifted to ${toRegion}`);
            break;
          }
        } catch (error) {
          // Continue waiting
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      const endTime = new Date();
      const rto = (endTime.getTime() - startTime.getTime()) / 1000;

      if (!failoverCompleted) {
        throw new Error('Failover did not complete within timeout');
      }

      this.log(`Failover completed in ${rto} seconds`);

      // Verify secondary region is serving traffic
      this.log('Verifying secondary region is healthy and serving traffic...');
      healthCheckPassed = await this.checkRegionHealth('https://api.openmeet.ai');

      if (healthCheckPassed) {
        this.log('✅ Global endpoint is healthy');
      } else {
        this.log('❌ Global endpoint health check failed');
      }

      success = rto < 300 && trafficShifted && healthCheckPassed;
      details = `Route53 automatically failed over from ${fromRegion} to ${toRegion}`;

      // Restore primary region
      this.log('Restoring primary region...');
      await execAsync(
        `kubectl --context openmeet-primary scale deployment api --replicas=3 -n openmeet-production`
      );

      return {
        fromRegion,
        toRegion,
        startTime,
        endTime,
        rto,
        trafficShifted,
        healthCheckPassed,
        success,
        details
      };
    } catch (error) {
      const endTime = new Date();
      const rto = (endTime.getTime() - startTime.getTime()) / 1000;

      // Restore primary region on error
      try {
        await execAsync(
          `kubectl --context openmeet-primary scale deployment --all --replicas=3 -n openmeet-production`
        );
      } catch (restoreError) {
        this.log('ERROR: Failed to restore primary region');
      }

      return {
        fromRegion,
        toRegion,
        startTime,
        endTime,
        rto,
        trafficShifted: false,
        healthCheckPassed: false,
        success: false,
        details: `Region failover failed: ${error.message}`
      };
    }
  }

  async generateReport(): Promise<void> {
    this.log('========================================');
    this.log('Region Failover Test Report');
    this.log('========================================');

    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => r.success === false).length,
        averageRTO: this.results.reduce((sum, r) => sum + r.rto, 0) / this.results.length,
        maxRTO: Math.max(...this.results.map(r => r.rto))
      }
    };

    for (const result of this.results) {
      this.log(`
Failover: ${result.fromRegion} -> ${result.toRegion}
Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}
RTO: ${result.rto.toFixed(2)}s (Target: <300s)
Traffic Shifted: ${result.trafficShifted ? 'YES' : 'NO'}
Health Check: ${result.healthCheckPassed ? 'PASSED' : 'FAILED'}
Details: ${result.details}
      `);
    }

    this.log(`
Summary:
--------
Total Tests: ${report.summary.total}
Passed: ${report.summary.passed}
Failed: ${report.summary.failed}
Average RTO: ${report.summary.averageRTO.toFixed(2)}s
Max RTO: ${report.summary.maxRTO.toFixed(2)}s
    `);

    // Save report
    const reportPath = `/var/log/failover-tests/region_failover_${Date.now()}.json`;
    await fs.mkdir('/var/log/failover-tests', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`Report saved to: ${reportPath}`);

    // Upload to S3
    if (process.env.S3_BUCKET) {
      try {
        await execAsync(
          `aws s3 cp ${reportPath} s3://${process.env.S3_BUCKET}/failover-tests/ --region ${process.env.S3_REGION || 'us-east-1'}`
        );
        this.log('Report uploaded to S3');
      } catch (error) {
        this.log('WARNING: Could not upload report to S3');
      }
    }
  }

  async runAllTests(): Promise<void> {
    try {
      // Test primary to secondary failover
      const result = await this.testRegionFailover('us-east-1', 'us-west-2');
      this.results.push(result);

      // Generate report
      await this.generateReport();

      // Exit with error if any tests failed
      if (this.results.some(r => !r.success)) {
        process.exit(1);
      }
    } catch (error) {
      this.log(`ERROR: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run tests
const tester = new RegionFailoverTester();
tester.runAllTests();
