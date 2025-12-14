/**
 * Health Checker Library
 * Comprehensive health checks for all system dependencies
 */

import { logger } from './logger';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import axios from 'axios';
import os from 'os';
import { execSync } from 'child_process';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      responseTime?: number;
      details?: any;
    };
  };
  system?: {
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      loadAverage: number[];
      cores: number;
    };
    disk?: {
      total: string;
      free: string;
      usagePercent: string;
    };
  };
}

/**
 * Health Checker Class
 */
export class HealthChecker {
  private prisma?: PrismaClient;
  private redis?: Redis;

  constructor(options?: {
    prisma?: PrismaClient;
    redis?: Redis;
  }) {
    this.prisma = options?.prisma;
    this.redis = options?.redis;
  }

  /**
   * Run all health checks
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheckResult['checks'] = {};

    // Database checks
    if (this.prisma) {
      checks.database = await this.checkDatabase();
    }

    // Redis check
    if (this.redis) {
      checks.redis = await this.checkRedis();
    }

    // System checks
    checks.system = this.checkSystem();

    // Disk check
    checks.disk = this.checkDisk();

    // Calculate overall status
    const status = this.calculateOverallStatus(checks);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      system: this.getSystemInfo(),
    };
  }

  /**
   * Readiness probe - checks if app is ready to serve traffic
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Critical dependencies that must be available
    if (this.prisma) {
      checks.database = await this.checkDatabase();
    }

    if (this.redis) {
      checks.redis = await this.checkRedis();
    }

    const status = this.calculateOverallStatus(checks);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }

  /**
   * Liveness probe - checks if app is alive (simple check)
   */
  checkLiveness(): HealthCheckResult {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        liveness: {
          status: 'pass',
          message: 'Application is alive',
        },
      },
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheckResult['checks'][string]> {
    const startTime = Date.now();

    try {
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
      }
      const responseTime = Date.now() - startTime;

      return {
        status: 'pass',
        message: 'Database connection successful',
        responseTime,
      };
    } catch (error: any) {
      logger.error('Database health check failed', {
        error: error.message,
      });

      return {
        status: 'fail',
        message: `Database connection failed: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheckResult['checks'][string]> {
    const startTime = Date.now();

    try {
      const result = await this.redis?.ping();
      const responseTime = Date.now() - startTime;

      if (result === 'PONG') {
        return {
          status: 'pass',
          message: 'Redis connection successful',
          responseTime,
        };
      }

      return {
        status: 'fail',
        message: 'Redis ping failed',
        responseTime,
      };
    } catch (error: any) {
      logger.error('Redis health check failed', {
        error: error.message,
      });

      return {
        status: 'fail',
        message: `Redis connection failed: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }


  /**
   * Check external service connectivity
   */
  async checkExternalService(
    name: string,
    url: string,
    timeout = 5000
  ): Promise<HealthCheckResult['checks'][string]> {
    const startTime = Date.now();

    try {
      const response = await axios.get(url, {
        timeout,
        validateStatus: (status) => status < 500,
      });

      const responseTime = Date.now() - startTime;

      return {
        status: response.status < 400 ? 'pass' : 'warn',
        message: `${name} responded with status ${response.status}`,
        responseTime,
        details: {
          statusCode: response.status,
        },
      };
    } catch (error: any) {
      logger.error(`External service check failed: ${name}`, {
        error: error.message,
      });

      return {
        status: 'fail',
        message: `${name} check failed: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check system resources
   */
  private checkSystem(): HealthCheckResult['checks'][string] {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      const loadAverage = os.loadavg();
      const cpuCount = os.cpus().length;

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = 'System resources normal';

      // Warn if memory usage > 80%
      if (memoryUsagePercent > 80) {
        status = 'warn';
        message = `High memory usage: ${memoryUsagePercent.toFixed(2)}%`;
      }

      // Fail if memory usage > 95%
      if (memoryUsagePercent > 95) {
        status = 'fail';
        message = `Critical memory usage: ${memoryUsagePercent.toFixed(2)}%`;
      }

      // Warn if load average is high
      const loadPerCore = loadAverage[0] / cpuCount;
      if (loadPerCore > 0.8) {
        status = 'warn';
        message = `High CPU load: ${loadPerCore.toFixed(2)} per core`;
      }

      return {
        status,
        message,
        details: {
          memory: {
            total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
            free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
            usagePercent: memoryUsagePercent.toFixed(2),
          },
          cpu: {
            loadAverage,
            cores: cpuCount,
            loadPerCore: loadPerCore.toFixed(2),
          },
        },
      };
    } catch (error: any) {
      return {
        status: 'fail',
        message: `System check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check disk space
   */
  private checkDisk(): HealthCheckResult['checks'][string] {
    try {
      // This is platform-specific, works on Linux/Mac
      const diskUsage = execSync('df -h / | tail -1').toString().trim();
      const parts = diskUsage.split(/\s+/);

      const total = parts[1];
      const used = parts[2];
      const available = parts[3];
      const usagePercent = parts[4];

      const usageNumber = parseInt(usagePercent.replace('%', ''));

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = 'Disk space sufficient';

      if (usageNumber > 80) {
        status = 'warn';
        message = `Disk usage high: ${usagePercent}`;
      }

      if (usageNumber > 90) {
        status = 'fail';
        message = `Critical disk usage: ${usagePercent}`;
      }

      return {
        status,
        message,
        details: {
          total,
          used,
          available,
          usagePercent,
        },
      };
    } catch (error: any) {
      // Disk check is not critical, just warn
      return {
        status: 'warn',
        message: 'Disk check unavailable on this platform',
      };
    }
  }

  /**
   * Get system information
   */
  private getSystemInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercent: (usedMemory / totalMemory) * 100,
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
    };
  }

  /**
   * Calculate overall status from individual checks
   */
  private calculateOverallStatus(
    checks: HealthCheckResult['checks']
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map((check) => check.status);

    if (statuses.some((status) => status === 'fail')) {
      return 'unhealthy';
    }

    if (statuses.some((status) => status === 'warn')) {
      return 'degraded';
    }

    return 'healthy';
  }
}

export default HealthChecker;
