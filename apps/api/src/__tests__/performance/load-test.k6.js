/**
 * k6 Load Testing Script for Admin Analytics API
 * Run with: k6 run --vus 50 --duration 5m load-test.k6.js
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiRequestDuration = new Trend('api_request_duration');
const apiRequestErrors = new Counter('api_request_errors');
const apiRequestSuccess = new Rate('api_request_success');
const wsConnectionDuration = new Trend('ws_connection_duration');
const wsMessageLatency = new Trend('ws_message_latency');

// Test configuration
export const options = {
  scenarios: {
    // Ramp up scenario for gradual load increase
    gradual_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Ramp up to 20 users
        { duration: '3m', target: 50 },   // Ramp up to 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 50 },   // Ramp down to 50
        { duration: '1m', target: 0 },    // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },

    // Spike test scenario
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // Baseline
        { duration: '10s', target: 200 },  // Spike to 200 users
        { duration: '1m', target: 200 },   // Stay at spike
        { duration: '10s', target: 10 },   // Drop back
        { duration: '30s', target: 10 },   // Stabilize
        { duration: '30s', target: 0 },    // Ramp down
      ],
      startTime: '15m', // Start after gradual load
    },

    // Constant load for baseline
    constant_load: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      startTime: '30m', // Start after spike test
    },
  },

  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],                   // Less than 1% failure rate
    api_request_success: ['rate>0.99'],               // 99% success rate
    ws_message_latency: ['p(95)<100'],                // 95% WebSocket latency under 100ms
    ws_connection_duration: ['p(95)<500'],            // 95% connection time under 500ms
  },
};

// Base URL configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';

// Authentication token (would be obtained from auth endpoint in production)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-super-admin-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

// Helper function to make API requests
function makeRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const start = Date.now();

  let response;
  if (method === 'GET') {
    response = http.get(url, { headers });
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(body), { headers });
  }

  const duration = Date.now() - start;
  apiRequestDuration.add(duration);

  const success = response.status >= 200 && response.status < 300;
  apiRequestSuccess.add(success);

  if (!success) {
    apiRequestErrors.add(1);
  }

  return response;
}

// Main test function
export default function() {
  // Randomly select test scenarios
  const scenarios = [
    testHealthCheck,
    testConcurrentUsersEndpoint,
    testGeoDistributionEndpoint,
    testAnalyticsStreamEndpoint,
    testWebSocketConnection,
  ];

  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  randomScenario();

  // Add some variability to request timing
  sleep(Math.random() * 2 + 0.5); // Sleep 0.5-2.5 seconds
}

// Test Scenarios

function testHealthCheck() {
  group('Health Check', function() {
    const response = http.get(`${BASE_URL}/health`, { headers });

    check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
      'health check has valid body': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy';
        } catch {
          return false;
        }
      },
    });
  });
}

function testConcurrentUsersEndpoint() {
  group('Concurrent Users', function() {
    const response = makeRequest('GET', '/api/admin/analytics/concurrent-users');

    check(response, {
      'concurrent users status is 200': (r) => r.status === 200,
      'concurrent users response time < 200ms': (r) => r.timings.duration < 200,
      'concurrent users has valid data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data !== undefined;
        } catch {
          return false;
        }
      },
    });
  });
}

function testGeoDistributionEndpoint() {
  group('Geographic Distribution', function() {
    const response = makeRequest('GET', '/api/admin/analytics/geo/distribution');

    check(response, {
      'geo distribution status is 200': (r) => r.status === 200,
      'geo distribution response time < 500ms': (r) => r.timings.duration < 500,
      'geo distribution has valid data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data?.countries !== undefined;
        } catch {
          return false;
        }
      },
    });

    // Also test heatmap endpoint
    const heatmapResponse = makeRequest('GET', '/api/admin/analytics/geo/heatmap');

    check(heatmapResponse, {
      'heatmap status is 200': (r) => r.status === 200,
      'heatmap response time < 500ms': (r) => r.timings.duration < 500,
    });
  });
}

function testAnalyticsStreamEndpoint() {
  group('Analytics Stream', function() {
    const response = makeRequest('GET', '/api/admin/analytics/stream/recent?limit=50');

    check(response, {
      'analytics stream status is 200': (r) => r.status === 200,
      'analytics stream response time < 300ms': (r) => r.timings.duration < 300,
      'analytics stream has valid data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data?.events);
        } catch {
          return false;
        }
      },
    });
  });
}

function testWebSocketConnection() {
  group('WebSocket Connection', function() {
    const connectionStart = Date.now();

    const res = ws.connect(WS_URL, { headers }, function(socket) {
      const connectionTime = Date.now() - connectionStart;
      wsConnectionDuration.add(connectionTime);

      socket.on('open', function() {
        check(null, {
          'websocket connection established': () => true,
          'websocket connection time < 500ms': () => connectionTime < 500,
        });

        // Test message latency
        const messageStart = Date.now();
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: messageStart,
        }));
      });

      socket.on('message', function(message) {
        try {
          const data = JSON.parse(message);
          if (data.type === 'pong') {
            const latency = Date.now() - data.timestamp;
            wsMessageLatency.add(latency);

            check(null, {
              'websocket message latency < 100ms': () => latency < 100,
            });
          }
        } catch {
          // Ignore parsing errors
        }
      });

      socket.on('error', function(e) {
        check(null, {
          'websocket no errors': () => false,
        });
      });

      // Keep connection open for a bit
      socket.setTimeout(function() {
        socket.close();
      }, 2000);
    });

    check(res, {
      'websocket connection successful': (r) => r && r.status === 101,
    });
  });
}

// Lifecycle hooks

export function setup() {
  // Verify the API is accessible
  const healthResponse = http.get(`${BASE_URL}/health`);

  if (healthResponse.status !== 200) {
    throw new Error(`API not accessible: ${healthResponse.status}`);
  }

  console.log('Load test setup complete');
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
}

// Text summary generator
function textSummary(data, options) {
  const { metrics, root_group } = data;

  let summary = '\n=== Load Test Summary ===\n\n';

  // Request metrics
  if (metrics.http_req_duration) {
    summary += 'HTTP Request Duration:\n';
    summary += `  avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `  min: ${metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
    summary += `  max: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
    summary += `  p(95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `  p(99): ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  // Success rate
  if (metrics.api_request_success) {
    summary += `API Success Rate: ${(metrics.api_request_success.values.rate * 100).toFixed(2)}%\n`;
  }

  // Error count
  if (metrics.api_request_errors) {
    summary += `API Errors: ${metrics.api_request_errors.values.count}\n`;
  }

  // WebSocket metrics
  if (metrics.ws_message_latency) {
    summary += '\nWebSocket Message Latency:\n';
    summary += `  avg: ${metrics.ws_message_latency.values.avg.toFixed(2)}ms\n`;
    summary += `  p(95): ${metrics.ws_message_latency.values['p(95)'].toFixed(2)}ms\n`;
  }

  // Throughput
  if (metrics.http_reqs) {
    const throughput = metrics.http_reqs.values.rate;
    summary += `\nThroughput: ${throughput.toFixed(2)} req/s\n`;
  }

  // Threshold results
  summary += '\n=== Threshold Results ===\n';
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const passed = threshold.ok ? '✓' : '✗';
    summary += `${passed} ${name}\n`;
  }

  return summary;
}
