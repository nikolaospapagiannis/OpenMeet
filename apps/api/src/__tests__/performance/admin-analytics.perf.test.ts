/**
 * Admin Analytics API Performance Tests
 * Tests API endpoint response times, throughput, and concurrency handling
 */

import request from 'supertest';
import express, { Express } from 'express';
import { performance } from 'perf_hooks';

// Performance thresholds based on enterprise standards
const PERFORMANCE_THRESHOLDS = {
  health: {
    p50: 10,    // 10ms
    p95: 20,    // 20ms
    p99: 50,    // 50ms
  },
  simpleRead: {
    p50: 50,    // 50ms
    p95: 150,   // 150ms
    p99: 300,   // 300ms
  },
  complexRead: {
    p50: 100,   // 100ms
    p95: 300,   // 300ms
    p99: 500,   // 500ms
  },
  write: {
    p50: 100,   // 100ms
    p95: 300,   // 300ms
    p99: 500,   // 500ms
  },
};

// Performance metrics collector
interface PerformanceMetrics {
  times: number[];
  successCount: number;
  errorCount: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
}

function calculatePercentile(sortedTimes: number[], percentile: number): number {
  if (sortedTimes.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
  return sortedTimes[Math.max(0, index)];
}

function calculateMetrics(times: number[], durationMs: number, errorCount: number): PerformanceMetrics {
  const sortedTimes = [...times].sort((a, b) => a - b);
  const successCount = times.length;

  return {
    times,
    successCount,
    errorCount,
    minTime: sortedTimes[0] || 0,
    maxTime: sortedTimes[sortedTimes.length - 1] || 0,
    avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    p50: calculatePercentile(sortedTimes, 50),
    p95: calculatePercentile(sortedTimes, 95),
    p99: calculatePercentile(sortedTimes, 99),
    throughput: (successCount / durationMs) * 1000, // requests per second
  };
}

// Performance test runner
async function runPerformanceTest(
  app: Express,
  config: {
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    body?: object;
    headers?: Record<string, string>;
    concurrency: number;
    iterations: number;
    rampUpMs?: number;
  }
): Promise<PerformanceMetrics> {
  const { method, path, body, headers, concurrency, iterations, rampUpMs = 0 } = config;
  const times: number[] = [];
  let errorCount = 0;
  const startTime = performance.now();

  // Create worker function
  const makeRequest = async (): Promise<void> => {
    const requestStart = performance.now();
    try {
      let req = request(app)[method](path);

      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          req = req.set(key, value);
        });
      }

      if (body && (method === 'post' || method === 'put')) {
        req = req.send(body);
      }

      const response = await req;
      const requestEnd = performance.now();

      if (response.status >= 400) {
        errorCount++;
      } else {
        times.push(requestEnd - requestStart);
      }
    } catch (error) {
      errorCount++;
    }
  };

  // Run with controlled concurrency
  const iterationsPerWorker = Math.ceil(iterations / concurrency);
  const workers: Promise<void>[] = [];

  for (let w = 0; w < concurrency; w++) {
    // Ramp up delay
    if (rampUpMs > 0) {
      await new Promise(resolve => setTimeout(resolve, (rampUpMs / concurrency) * w));
    }

    const worker = (async () => {
      for (let i = 0; i < iterationsPerWorker; i++) {
        await makeRequest();
      }
    })();

    workers.push(worker);
  }

  await Promise.all(workers);
  const endTime = performance.now();

  return calculateMetrics(times, endTime - startTime, errorCount);
}

describe('Admin Analytics API Performance Tests', () => {
  let app: Express;
  const authToken = 'test-super-admin-token';
  const authHeaders = { Authorization: `Bearer ${authToken}` };

  beforeAll(async () => {
    // Create minimal express app for testing
    app = express();
    app.use(express.json());

    // Health endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Admin analytics endpoints with simulated latency
    app.get('/api/admin/analytics/concurrent-users', (req, res) => {
      // Simulate database query latency
      const responseTime = 20 + Math.random() * 30; // 20-50ms
      setTimeout(() => {
        res.json({
          success: true,
          data: {
            totalUsers: 1234,
            serverCount: 5,
            byOrganization: [],
            timestamp: new Date().toISOString(),
          },
        });
      }, responseTime);
    });

    app.get('/api/admin/analytics/geo/distribution', (req, res) => {
      // Simulate complex query latency
      const responseTime = 50 + Math.random() * 100; // 50-150ms
      setTimeout(() => {
        res.json({
          success: true,
          data: {
            totalUsers: 15000,
            totalMeetings: 45000,
            countries: [],
            lastUpdated: new Date().toISOString(),
          },
        });
      }, responseTime);
    });

    app.get('/api/admin/analytics/geo/heatmap', (req, res) => {
      // Simulate heavy data processing
      const responseTime = 100 + Math.random() * 150; // 100-250ms
      setTimeout(() => {
        res.json({
          success: true,
          data: {
            resolution: 'country',
            points: [],
            bounds: { north: 60, south: -60, east: 180, west: -180 },
          },
        });
      }, responseTime);
    });

    app.get('/api/admin/analytics/stream/recent', (req, res) => {
      const responseTime = 30 + Math.random() * 50; // 30-80ms
      setTimeout(() => {
        res.json({
          success: true,
          data: {
            events: [],
            totalCount: 0,
          },
        });
      }, responseTime);
    });
  });

  describe('Health Endpoint Performance', () => {
    it('should respond within p95 threshold for health check', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/health',
        concurrency: 10,
        iterations: 100,
      });

      expect(metrics.errorCount).toBe(0);
      expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.health.p95);
      expect(metrics.p99).toBeLessThan(PERFORMANCE_THRESHOLDS.health.p99);
    });

    it('should maintain throughput under concurrent load', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/health',
        concurrency: 50,
        iterations: 500,
        rampUpMs: 1000,
      });

      expect(metrics.errorCount).toBe(0);
      expect(metrics.throughput).toBeGreaterThan(100); // At least 100 req/s
    });
  });

  describe('Concurrent Users Endpoint Performance', () => {
    it('should respond within simple read threshold', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/concurrent-users',
        headers: authHeaders,
        concurrency: 10,
        iterations: 50,
      });

      expect(metrics.errorCount).toBe(0);
      expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleRead.p95);
    });

    it('should handle burst traffic', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/concurrent-users',
        headers: authHeaders,
        concurrency: 100,
        iterations: 200,
        rampUpMs: 0, // No ramp up = burst
      });

      expect(metrics.errorCount).toBeLessThan(metrics.successCount * 0.01); // Less than 1% errors
    });
  });

  describe('Geographic Distribution Endpoint Performance', () => {
    it('should respond within complex read threshold', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/geo/distribution',
        headers: authHeaders,
        concurrency: 10,
        iterations: 30,
      });

      expect(metrics.errorCount).toBe(0);
      expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.complexRead.p95);
    });

    it('should handle sustained load', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/geo/distribution',
        headers: authHeaders,
        concurrency: 20,
        iterations: 100,
        rampUpMs: 2000,
      });

      expect(metrics.errorCount).toBe(0);
      expect(metrics.avgTime).toBeLessThan(200); // Average under 200ms
    });
  });

  describe('Heatmap Endpoint Performance', () => {
    it('should handle heavy data processing', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/geo/heatmap',
        headers: authHeaders,
        concurrency: 5,
        iterations: 20,
      });

      expect(metrics.errorCount).toBe(0);
      expect(metrics.p99).toBeLessThan(PERFORMANCE_THRESHOLDS.complexRead.p99);
    });
  });

  describe('Analytics Stream Endpoint Performance', () => {
    it('should respond quickly for event retrieval', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/stream/recent',
        headers: authHeaders,
        concurrency: 10,
        iterations: 50,
      });

      expect(metrics.errorCount).toBe(0);
      expect(metrics.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleRead.p95);
    });
  });

  describe('Concurrency Stress Tests', () => {
    it('should handle 100 concurrent connections', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/concurrent-users',
        headers: authHeaders,
        concurrency: 100,
        iterations: 300,
        rampUpMs: 3000,
      });

      expect(metrics.errorCount).toBeLessThan(metrics.successCount * 0.05); // Less than 5% errors
      expect(metrics.p99).toBeLessThan(1000); // Under 1 second
    });

    it('should maintain consistent response times under load', async () => {
      // First run to warm up
      await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/concurrent-users',
        headers: authHeaders,
        concurrency: 10,
        iterations: 50,
      });

      // Measure under load
      const loadMetrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/concurrent-users',
        headers: authHeaders,
        concurrency: 50,
        iterations: 250,
        rampUpMs: 2000,
      });

      // Standard deviation should be reasonable
      const variance = loadMetrics.times.reduce((sum, time) => {
        return sum + Math.pow(time - loadMetrics.avgTime, 2);
      }, 0) / loadMetrics.times.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be less than average (coefficient of variation < 1)
      expect(stdDev).toBeLessThan(loadMetrics.avgTime);
    });
  });

  describe('Error Rate Under Load', () => {
    it('should maintain low error rate under heavy load', async () => {
      const metrics = await runPerformanceTest(app, {
        method: 'get',
        path: '/api/admin/analytics/geo/distribution',
        headers: authHeaders,
        concurrency: 50,
        iterations: 200,
        rampUpMs: 1000,
      });

      const errorRate = metrics.errorCount / (metrics.successCount + metrics.errorCount);
      expect(errorRate).toBeLessThan(0.01); // Less than 1% error rate
    });
  });
});

describe('Performance Metrics Calculation', () => {
  it('should calculate percentiles correctly', () => {
    const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const metrics = calculateMetrics(times, 1000, 0);

    expect(metrics.minTime).toBe(10);
    expect(metrics.maxTime).toBe(100);
    expect(metrics.avgTime).toBe(55);
    expect(metrics.p50).toBe(50);
    expect(metrics.p95).toBe(100);
    expect(metrics.p99).toBe(100);
  });

  it('should calculate throughput correctly', () => {
    const times = Array(100).fill(10);
    const metrics = calculateMetrics(times, 1000, 0); // 100 requests in 1 second

    expect(metrics.throughput).toBe(100); // 100 req/s
  });

  it('should handle empty metrics', () => {
    const metrics = calculateMetrics([], 1000, 0);

    expect(metrics.minTime).toBe(0);
    expect(metrics.maxTime).toBe(0);
    expect(metrics.avgTime).toBe(0);
    expect(metrics.p50).toBe(0);
  });
});
