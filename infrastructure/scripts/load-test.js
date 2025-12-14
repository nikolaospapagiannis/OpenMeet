/**
 * Load Testing Script for OpenMeet API
 * Uses Artillery for comprehensive load testing
 *
 * Install: npm install -g artillery
 * Run: artillery run load-test.js
 */

const scenario = {
  config: {
    target: process.env.API_URL || 'https://api.openmeet-v2.com',
    phases: [
      // Warm-up phase
      {
        duration: 60,
        arrivalRate: 5,
        name: 'Warm-up'
      },
      // Ramp-up phase
      {
        duration: 300,
        arrivalRate: 5,
        rampTo: 50,
        name: 'Ramp-up to 50 users/sec'
      },
      // Sustained load
      {
        duration: 600,
        arrivalRate: 50,
        name: 'Sustained load - 50 users/sec'
      },
      // Peak load
      {
        duration: 300,
        arrivalRate: 100,
        name: 'Peak load - 100 users/sec'
      },
      // Stress test
      {
        duration: 180,
        arrivalRate: 200,
        name: 'Stress test - 200 users/sec'
      },
      // Cool down
      {
        duration: 120,
        arrivalRate: 10,
        name: 'Cool down'
      }
    ],
    payload: {
      path: './test-data.csv',
      fields: ['email', 'password']
    },
    defaults: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    processor: './load-test-processor.js',
    plugins: {
      expect: {},
      metrics-by-endpoint: {
        stripQueryString: true
      }
    }
  },
  scenarios: [
    // Scenario 1: User Registration and Login
    {
      name: 'User Registration and Login Flow',
      weight: 10,
      flow: [
        {
          post: {
            url: '/api/auth/register',
            json: {
              email: '{{ $randomEmail() }}',
              password: 'Test123!@#',
              firstName: '{{ $randomString() }}',
              lastName: '{{ $randomString() }}'
            },
            capture: {
              json: '$.accessToken',
              as: 'authToken'
            },
            expect: [
              { statusCode: 201 },
              { contentType: 'json' },
              { hasProperty: 'accessToken' }
            ]
          }
        },
        {
          think: 2
        },
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}'
            },
            expect: [
              { statusCode: 200 },
              { hasProperty: 'accessToken' }
            ]
          }
        }
      ]
    },

    // Scenario 2: Meeting Operations
    {
      name: 'Meeting CRUD Operations',
      weight: 40,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: 'test@example.com',
              password: 'Test123!@#'
            },
            capture: {
              json: '$.accessToken',
              as: 'authToken'
            }
          }
        },
        {
          get: {
            url: '/api/meetings',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            expect: [
              { statusCode: 200 },
              { contentType: 'json' }
            ]
          }
        },
        {
          think: 1
        },
        {
          post: {
            url: '/api/meetings',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            json: {
              title: 'Load Test Meeting {{ $randomString() }}',
              scheduledAt: '{{ $timestamp() }}',
              duration: 3600,
              participants: ['user1@example.com', 'user2@example.com']
            },
            capture: {
              json: '$.id',
              as: 'meetingId'
            },
            expect: [
              { statusCode: 201 }
            ]
          }
        },
        {
          think: 2
        },
        {
          get: {
            url: '/api/meetings/{{ meetingId }}',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            expect: [
              { statusCode: 200 }
            ]
          }
        }
      ]
    },

    // Scenario 3: Transcription Search
    {
      name: 'Search and Filter Operations',
      weight: 30,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: 'test@example.com',
              password: 'Test123!@#'
            },
            capture: {
              json: '$.accessToken',
              as: 'authToken'
            }
          }
        },
        {
          get: {
            url: '/api/search?q=project&limit=20',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            expect: [
              { statusCode: 200 }
            ]
          }
        },
        {
          think: 1
        },
        {
          get: {
            url: '/api/meetings?filter=recent&limit=10',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            expect: [
              { statusCode: 200 }
            ]
          }
        }
      ]
    },

    // Scenario 4: Dashboard Analytics
    {
      name: 'Dashboard and Analytics',
      weight: 15,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: 'test@example.com',
              password: 'Test123!@#'
            },
            capture: {
              json: '$.accessToken',
              as: 'authToken'
            }
          }
        },
        {
          get: {
            url: '/api/analytics/overview',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            expect: [
              { statusCode: 200 }
            ]
          }
        },
        {
          get: {
            url: '/api/analytics/meetings/stats',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            expect: [
              { statusCode: 200 }
            ]
          }
        }
      ]
    },

    // Scenario 5: Health Check
    {
      name: 'Health Check',
      weight: 5,
      flow: [
        {
          get: {
            url: '/health',
            expect: [
              { statusCode: 200 },
              { hasProperty: 'status' }
            ]
          }
        }
      ]
    }
  ]
};

module.exports = scenario;
