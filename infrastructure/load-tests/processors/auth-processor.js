/**
 * Artillery Processor - Authentication Logic
 * Handles authentication flows and token management
 */

module.exports = {
  /**
   * Validate authentication response
   */
  validateAuthResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode === 200 && response.body) {
      try {
        const body = JSON.parse(response.body);
        if (body.token) {
          context.vars.validToken = body.token;

          // Emit custom metric
          ee.emit('counter', 'auth.success', 1);
        } else {
          ee.emit('counter', 'auth.invalid_response', 1);
        }
      } catch (e) {
        ee.emit('counter', 'auth.parse_error', 1);
      }
    } else if (response.statusCode === 401) {
      ee.emit('counter', 'auth.unauthorized', 1);
    } else {
      ee.emit('counter', 'auth.error', 1);
    }

    return next();
  },

  /**
   * Generate random user credentials
   */
  generateCredentials: function(context, events, done) {
    const randomId = Math.floor(Math.random() * 10000);
    context.vars.testEmail = `loadtest-${randomId}@example.com`;
    context.vars.testPassword = `TestPass${randomId}!`;

    return done();
  },

  /**
   * Setup function - runs once before test
   */
  beforeRequest: function(requestParams, context, ee, next) {
    // Add custom headers
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['X-Load-Test'] = 'true';
    requestParams.headers['X-Test-Run-ID'] = context.vars.$uuid || 'unknown';

    return next();
  },

  /**
   * After response handler
   */
  afterResponse: function(requestParams, response, context, ee, next) {
    // Track response times
    const latency = response.timings?.total || 0;

    if (latency > 1000) {
      ee.emit('counter', 'slow_requests', 1);
    }

    if (response.statusCode >= 500) {
      ee.emit('counter', 'server_errors', 1);
    }

    return next();
  }
};
