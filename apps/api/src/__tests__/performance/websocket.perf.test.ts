/**
 * WebSocket Performance Tests
 * Tests WebSocket connection handling, message throughput, and concurrent connections
 */

import { Server as HttpServer, createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { performance } from 'perf_hooks';

// Performance thresholds for WebSocket operations
const WS_PERFORMANCE_THRESHOLDS = {
  connectionTime: {
    p50: 50,    // 50ms
    p95: 100,   // 100ms
    p99: 200,   // 200ms
  },
  messageLatency: {
    p50: 10,    // 10ms
    p95: 30,    // 30ms
    p99: 50,    // 50ms
  },
  broadcastLatency: {
    p50: 20,    // 20ms
    p95: 50,    // 50ms
    p99: 100,   // 100ms
  },
};

interface WebSocketMetrics {
  connectionTimes: number[];
  messageTimes: number[];
  successCount: number;
  errorCount: number;
  p50: number;
  p95: number;
  p99: number;
  avgTime: number;
  throughput: number;
}

function calculatePercentile(sortedTimes: number[], percentile: number): number {
  if (sortedTimes.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
  return sortedTimes[Math.max(0, index)];
}

function calculateWsMetrics(times: number[], durationMs: number, errorCount: number): WebSocketMetrics {
  const sortedTimes = [...times].sort((a, b) => a - b);
  const successCount = times.length;

  return {
    connectionTimes: [],
    messageTimes: times,
    successCount,
    errorCount,
    p50: calculatePercentile(sortedTimes, 50),
    p95: calculatePercentile(sortedTimes, 95),
    p99: calculatePercentile(sortedTimes, 99),
    avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    throughput: (successCount / durationMs) * 1000,
  };
}

describe('WebSocket Performance Tests', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Set up server-side handlers
    ioServer.on('connection', (socket: Socket) => {
      // Echo handler for latency testing
      socket.on('ping', (data, callback) => {
        if (typeof callback === 'function') {
          callback({ ...data, serverTime: Date.now() });
        }
      });

      // Concurrent users subscription
      socket.on('concurrent-users:get', () => {
        socket.emit('concurrent-users:init', {
          type: 'global',
          totalUsers: 1234,
          serverCount: 5,
          byOrganization: [],
          timestamp: new Date().toISOString(),
        });
      });

      // Analytics stream subscription
      socket.on('analytics:subscribe', (options) => {
        socket.join('analytics-room');
        socket.emit('analytics:subscribed', { success: true });
      });

      socket.on('analytics:unsubscribe', () => {
        socket.leave('analytics-room');
      });

      // Message echo for throughput testing
      socket.on('message', (data) => {
        socket.emit('message:ack', { id: data.id, receivedAt: Date.now() });
      });
    });

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 3000;
      done();
    });
  });

  afterAll((done) => {
    ioServer.close(() => {
      httpServer.close(done);
    });
  });

  describe('Connection Performance', () => {
    it('should establish connections within threshold', async () => {
      const connectionTimes: number[] = [];
      const clients: ClientSocket[] = [];

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        const client = ioc(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true,
        });

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
          client.on('connect', () => {
            clearTimeout(timeout);
            connectionTimes.push(performance.now() - start);
            clients.push(client);
            resolve();
          });
          client.on('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      }

      const metrics = calculateWsMetrics(connectionTimes, 0, 0);

      expect(metrics.p95).toBeLessThan(WS_PERFORMANCE_THRESHOLDS.connectionTime.p95);
      expect(metrics.p99).toBeLessThan(WS_PERFORMANCE_THRESHOLDS.connectionTime.p99);

      // Cleanup
      clients.forEach(client => client.close());
    });

    it('should handle concurrent connection establishment', async () => {
      const connectionTimes: number[] = [];
      const clients: ClientSocket[] = [];
      const connectionPromises: Promise<void>[] = [];
      const concurrentCount = 100;

      const startTime = performance.now();

      for (let i = 0; i < concurrentCount; i++) {
        const connStart = performance.now();
        const client = ioc(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true,
        });

        const promise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
          client.on('connect', () => {
            clearTimeout(timeout);
            connectionTimes.push(performance.now() - connStart);
            clients.push(client);
            resolve();
          });
          client.on('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        connectionPromises.push(promise);
      }

      await Promise.all(connectionPromises);
      const totalTime = performance.now() - startTime;

      const metrics = calculateWsMetrics(connectionTimes, totalTime, 0);

      expect(clients.length).toBe(concurrentCount);
      expect(metrics.throughput).toBeGreaterThan(10); // At least 10 connections/second

      // Cleanup
      clients.forEach(client => client.close());
    });
  });

  describe('Message Latency Performance', () => {
    let testClient: ClientSocket;

    beforeAll((done) => {
      testClient = ioc(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
      });
      testClient.on('connect', done);
    });

    afterAll(() => {
      testClient.close();
    });

    it('should have low message round-trip latency', async () => {
      const latencies: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await new Promise<void>((resolve) => {
          testClient.emit('ping', { sentAt: start }, () => {
            latencies.push(performance.now() - start);
            resolve();
          });
        });
      }

      const metrics = calculateWsMetrics(latencies, 0, 0);

      expect(metrics.p95).toBeLessThan(WS_PERFORMANCE_THRESHOLDS.messageLatency.p95);
      expect(metrics.p99).toBeLessThan(WS_PERFORMANCE_THRESHOLDS.messageLatency.p99);
    });

    it('should maintain low latency under sustained message load', async () => {
      const latencies: number[] = [];
      const messageCount = 500;
      const startTime = performance.now();

      for (let i = 0; i < messageCount; i++) {
        const start = performance.now();
        await new Promise<void>((resolve) => {
          testClient.emit('ping', { id: i, sentAt: start }, () => {
            latencies.push(performance.now() - start);
            resolve();
          });
        });
      }

      const totalTime = performance.now() - startTime;
      const metrics = calculateWsMetrics(latencies, totalTime, 0);

      expect(metrics.avgTime).toBeLessThan(50); // Average under 50ms
      expect(metrics.throughput).toBeGreaterThan(50); // At least 50 messages/second
    });
  });

  describe('Message Throughput Performance', () => {
    it('should handle high message throughput', async () => {
      const client = ioc(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      const receivedTimes: Map<number, number> = new Map();
      const messageCount = 1000;

      client.on('message:ack', (data: { id: number; receivedAt: number }) => {
        receivedTimes.set(data.id, performance.now());
      });

      const startTime = performance.now();

      // Send all messages
      for (let i = 0; i < messageCount; i++) {
        client.emit('message', { id: i, sentAt: Date.now() });
      }

      // Wait for all acknowledgments
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (receivedTimes.size >= messageCount) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 10);

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 30000);
      });

      const totalTime = performance.now() - startTime;
      const throughput = (receivedTimes.size / totalTime) * 1000;

      expect(receivedTimes.size).toBe(messageCount);
      expect(throughput).toBeGreaterThan(100); // At least 100 messages/second

      client.close();
    });
  });

  describe('Broadcast Performance', () => {
    it('should broadcast to multiple clients efficiently', async () => {
      const clientCount = 50;
      const clients: ClientSocket[] = [];
      const receivedTimes: Map<string, number[]> = new Map();

      // Create clients and subscribe to analytics room
      for (let i = 0; i < clientCount; i++) {
        const client = ioc(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true,
        });

        await new Promise<void>((resolve) => {
          client.on('connect', () => {
            client.emit('analytics:subscribe', {});
            receivedTimes.set(client.id!, []);
            clients.push(client);
            resolve();
          });
        });

        client.on('analytics:event', () => {
          const times = receivedTimes.get(client.id!) || [];
          times.push(performance.now());
          receivedTimes.set(client.id!, times);
        });
      }

      // Wait for all subscriptions
      await new Promise(resolve => setTimeout(resolve, 100));

      // Broadcast messages
      const broadcastCount = 10;
      const broadcastLatencies: number[] = [];

      for (let i = 0; i < broadcastCount; i++) {
        const broadcastStart = performance.now();
        ioServer.to('analytics-room').emit('analytics:event', {
          id: `evt-${i}`,
          type: 'test.event',
          timestamp: new Date().toISOString(),
        });

        // Wait for propagation
        await new Promise(resolve => setTimeout(resolve, 100));

        // Calculate broadcast completion time
        let maxReceiveTime = 0;
        receivedTimes.forEach((times) => {
          if (times.length > i) {
            maxReceiveTime = Math.max(maxReceiveTime, times[i]);
          }
        });

        if (maxReceiveTime > 0) {
          broadcastLatencies.push(maxReceiveTime - broadcastStart);
        }
      }

      const metrics = calculateWsMetrics(broadcastLatencies, 0, 0);

      expect(metrics.p95).toBeLessThan(WS_PERFORMANCE_THRESHOLDS.broadcastLatency.p95);

      // Cleanup
      clients.forEach(client => client.close());
    });
  });

  describe('Connection Stress Test', () => {
    it('should handle connection churn', async () => {
      const churnCount = 50;
      const errors: Error[] = [];
      const connectionTimes: number[] = [];

      for (let i = 0; i < churnCount; i++) {
        try {
          const start = performance.now();
          const client = ioc(`http://localhost:${port}`, {
            transports: ['websocket'],
            forceNew: true,
          });

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
            client.on('connect', () => {
              clearTimeout(timeout);
              connectionTimes.push(performance.now() - start);
              resolve();
            });
            client.on('connect_error', reject);
          });

          // Immediately disconnect
          client.close();

          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (err) {
          errors.push(err as Error);
        }
      }

      const metrics = calculateWsMetrics(connectionTimes, 0, errors.length);

      expect(errors.length).toBeLessThan(churnCount * 0.05); // Less than 5% failures
      expect(metrics.avgTime).toBeLessThan(200); // Average connection under 200ms
    });

    it('should maintain performance with reconnections', async () => {
      const client = ioc(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 100,
      });

      let reconnectCount = 0;
      const reconnectTimes: number[] = [];

      client.on('connect', () => {
        reconnectCount++;
      });

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      // Force disconnection and reconnection cycle
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        client.disconnect();

        await new Promise<void>((resolve) => {
          client.once('connect', () => {
            reconnectTimes.push(performance.now() - start);
            resolve();
          });
          client.connect();
        });
      }

      const metrics = calculateWsMetrics(reconnectTimes, 0, 0);

      expect(reconnectCount).toBeGreaterThan(1);
      expect(metrics.avgTime).toBeLessThan(500); // Reconnection under 500ms average

      client.close();
    });
  });

  describe('Memory Stability', () => {
    it('should not leak memory with repeated connections', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const client = ioc(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true,
        });

        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });

        // Do some work
        await new Promise<void>((resolve) => {
          client.emit('ping', { data: 'test' }, () => resolve());
        });

        client.close();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Allow cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;

      // Memory should not grow more than 50% (accounting for normal runtime variance)
      expect(memoryGrowth).toBeLessThan(0.5);
    });
  });
});

describe('WebSocket Metrics Calculation', () => {
  it('should calculate percentiles correctly', () => {
    const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const metrics = calculateWsMetrics(times, 1000, 0);

    expect(metrics.p50).toBe(50);
    expect(metrics.p95).toBe(100);
    expect(metrics.p99).toBe(100);
    expect(metrics.avgTime).toBe(55);
  });

  it('should calculate throughput correctly', () => {
    const times = Array(100).fill(10);
    const metrics = calculateWsMetrics(times, 1000, 0);

    expect(metrics.throughput).toBe(100);
  });
});
