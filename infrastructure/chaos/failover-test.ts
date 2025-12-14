#!/usr/bin/env ts-node

/**
 * Automated Database Failover Testing
 * Tests automatic failover of PostgreSQL and Redis with RTO/RPO measurement
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface FailoverResult {
  component: string;
  startTime: Date;
  endTime: Date;
  rto: number; // Recovery Time Objective in seconds
  rpo: number; // Recovery Point Objective in seconds
  dataLoss: boolean;
  success: boolean;
  details: string;
}

class FailoverTester {
  private results: FailoverResult[] = [];

  async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async testPostgreSQLFailover(): Promise<FailoverResult> {
    this.log('========================================');
    this.log('Testing PostgreSQL Failover');
    this.log('========================================');

    const startTime = new Date();
    let dataLoss = false;
    let success = false;
    let details = '';

    try {
      // Get current primary
      const { stdout: primaryBefore } = await execAsync(
        "kubectl exec -n openmeet-production postgres-patroni-0 -- patronictl list -f json | jq -r '.[] | select(.Role==\"Leader\") | .Member'"
      );
      const currentPrimary = primaryBefore.trim();
      this.log(`Current primary: ${currentPrimary}`);

      // Insert test data to measure RPO
      const testValue = `failover_test_${Date.now()}`;
      await execAsync(
        `kubectl exec -n openmeet-production ${currentPrimary} -- psql -U postgres -d openmeet -c "CREATE TABLE IF NOT EXISTS failover_test (id SERIAL PRIMARY KEY, value TEXT, created_at TIMESTAMP DEFAULT NOW())"`
      );

      const { stdout: insertResult } = await execAsync(
        `kubectl exec -n openmeet-production ${currentPrimary} -- psql -U postgres -d openmeet -c "INSERT INTO failover_test (value) VALUES ('${testValue}') RETURNING id"`
      );
      const testId = insertResult.match(/\d+/)?.[0];
      this.log(`Inserted test data with ID: ${testId}`);

      // Kill the primary pod
      this.log(`Killing primary pod: ${currentPrimary}`);
      await execAsync(`kubectl delete pod -n openmeet-production ${currentPrimary}`);

      // Wait for failover to complete
      this.log('Waiting for failover...');
      let newPrimary = '';
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (attempts < maxAttempts) {
        try {
          const { stdout } = await execAsync(
            "kubectl exec -n openmeet-production postgres-patroni-1 -- patronictl list -f json | jq -r '.[] | select(.Role==\"Leader\") | .Member'"
          );
          newPrimary = stdout.trim();

          if (newPrimary && newPrimary !== currentPrimary) {
            break;
          }
        } catch (error) {
          // Patroni might not be available during failover
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      const endTime = new Date();
      const rto = (endTime.getTime() - startTime.getTime()) / 1000;

      if (!newPrimary) {
        throw new Error('Failover did not complete within timeout');
      }

      this.log(`New primary: ${newPrimary}`);
      this.log(`Failover completed in ${rto} seconds`);

      // Verify data integrity
      this.log('Verifying data integrity...');
      const { stdout: verifyResult } = await execAsync(
        `kubectl exec -n openmeet-production ${newPrimary} -- psql -U postgres -d openmeet -c "SELECT value FROM failover_test WHERE id = ${testId}"`
      );

      if (verifyResult.includes(testValue)) {
        this.log('✅ No data loss detected');
        dataLoss = false;
      } else {
        this.log('❌ Data loss detected');
        dataLoss = true;
      }

      success = rto < 300; // RTO target: 5 minutes
      details = `Failover from ${currentPrimary} to ${newPrimary}`;

      return {
        component: 'PostgreSQL',
        startTime,
        endTime,
        rto,
        rpo: dataLoss ? rto : 0,
        dataLoss,
        success,
        details
      };
    } catch (error) {
      const endTime = new Date();
      const rto = (endTime.getTime() - startTime.getTime()) / 1000;

      return {
        component: 'PostgreSQL',
        startTime,
        endTime,
        rto,
        rpo: rto,
        dataLoss: true,
        success: false,
        details: `Failover failed: ${error.message}`
      };
    }
  }

  async testRedisFailover(): Promise<FailoverResult> {
    this.log('========================================');
    this.log('Testing Redis Failover');
    this.log('========================================');

    const startTime = new Date();
    let dataLoss = false;
    let success = false;
    let details = '';

    try {
      // Get current master
      const { stdout: masterInfo } = await execAsync(
        "kubectl exec -n openmeet-production redis-sentinel-0 -- redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster"
      );
      const currentMaster = masterInfo.split('\n')[0];
      this.log(`Current master: ${currentMaster}`);

      // Set test data
      const testKey = `failover_test_${Date.now()}`;
      const testValue = `value_${Date.now()}`;
      await execAsync(
        `kubectl exec -n openmeet-production redis-master-0 -- redis-cli -a $REDIS_PASSWORD SET ${testKey} ${testValue}`
      );
      this.log(`Set test key: ${testKey}`);

      // Kill master pod
      this.log('Killing Redis master pod...');
      await execAsync('kubectl delete pod -n openmeet-production redis-master-0');

      // Wait for Sentinel to promote a new master
      this.log('Waiting for Sentinel to promote new master...');
      let newMaster = '';
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        try {
          const { stdout } = await execAsync(
            "kubectl exec -n openmeet-production redis-sentinel-0 -- redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster"
          );
          newMaster = stdout.split('\n')[0];

          if (newMaster && newMaster !== currentMaster) {
            break;
          }
        } catch (error) {
          // Sentinel might be reconfiguring
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      const endTime = new Date();
      const rto = (endTime.getTime() - startTime.getTime()) / 1000;

      if (!newMaster) {
        throw new Error('Sentinel failover did not complete within timeout');
      }

      this.log(`New master: ${newMaster}`);
      this.log(`Failover completed in ${rto} seconds`);

      // Verify data
      this.log('Verifying data integrity...');
      const { stdout: getValue } = await execAsync(
        `kubectl exec -n openmeet-production redis-replica-0 -- redis-cli -a $REDIS_PASSWORD GET ${testKey}`
      );

      if (getValue.trim() === testValue) {
        this.log('✅ No data loss detected');
        dataLoss = false;
      } else {
        this.log('❌ Data loss detected');
        dataLoss = true;
      }

      success = rto < 300;
      details = `Sentinel promoted new master: ${newMaster}`;

      return {
        component: 'Redis',
        startTime,
        endTime,
        rto,
        rpo: dataLoss ? rto : 0,
        dataLoss,
        success,
        details
      };
    } catch (error) {
      const endTime = new Date();
      const rto = (endTime.getTime() - startTime.getTime()) / 1000;

      return {
        component: 'Redis',
        startTime,
        endTime,
        rto,
        rpo: rto,
        dataLoss: true,
        success: false,
        details: `Failover failed: ${error.message}`
      };
    }
  }

  async generateReport(): Promise<void> {
    this.log('========================================');
    this.log('Failover Test Report');
    this.log('========================================');

    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => r.success === false).length,
        averageRTO: this.results.reduce((sum, r) => sum + r.rto, 0) / this.results.length,
        maxRTO: Math.max(...this.results.map(r => r.rto)),
        dataLossIncidents: this.results.filter(r => r.dataLoss).length
      }
    };

    for (const result of this.results) {
      this.log(`
Component: ${result.component}
Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}
RTO: ${result.rto.toFixed(2)}s (Target: <300s)
RPO: ${result.rpo.toFixed(2)}s (Target: <60s)
Data Loss: ${result.dataLoss ? 'YES' : 'NO'}
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
Data Loss Incidents: ${report.summary.dataLossIncidents}
    `);

    // Save report to file
    const reportPath = `/var/log/failover-tests/failover_${Date.now()}.json`;
    await fs.mkdir('/var/log/failover-tests', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`Report saved to: ${reportPath}`);

    // Upload to S3 if configured
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

    // Notify if configured
    if (process.env.NOTIFICATION_WEBHOOK) {
      const status = report.summary.failed === 0 ? '✅' : '❌';
      const message = `${status} Failover tests completed: ${report.summary.passed}/${report.summary.total} passed, Avg RTO: ${report.summary.averageRTO.toFixed(2)}s`;

      try {
        await execAsync(
          `curl -X POST "${process.env.NOTIFICATION_WEBHOOK}" -H 'Content-Type: application/json' -d '{"text": "${message}"}'`
        );
      } catch (error) {
        // Ignore notification errors
      }
    }
  }

  async runAllTests(): Promise<void> {
    try {
      // Test PostgreSQL failover
      const pgResult = await this.testPostgreSQLFailover();
      this.results.push(pgResult);

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Test Redis failover
      const redisResult = await this.testRedisFailover();
      this.results.push(redisResult);

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
const tester = new FailoverTester();
tester.runAllTests();
