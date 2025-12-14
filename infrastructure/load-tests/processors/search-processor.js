/**
 * Artillery Processor - Search Operations
 * Handles search query generation and result validation
 */

module.exports = {
  /**
   * Generate realistic search queries
   */
  generateSearchQuery: function(context, events, done) {
    const searchTerms = [
      'action items',
      'quarterly results',
      'budget discussion',
      'product roadmap',
      'customer feedback',
      'pricing strategy',
      'market analysis',
      'team collaboration',
      'project timeline',
      'risk assessment',
      'compliance review',
      'performance metrics',
      'strategic planning',
      'revenue forecast',
      'technical debt',
      'user research',
      'competitive analysis',
      'stakeholder meeting',
      'resource allocation',
      'process improvement'
    ];

    const categories = [
      'sales',
      'engineering',
      'product',
      'marketing',
      'finance',
      'operations',
      'hr',
      'customer-success'
    ];

    // Select random search term
    context.vars.searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    context.vars.category = categories[Math.floor(Math.random() * categories.length)];

    // Add complexity variations
    if (Math.random() > 0.7) {
      // Multi-word search
      const term2 = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      context.vars.searchTerm = `${context.vars.searchTerm} ${term2}`;
    }

    return done();
  },

  /**
   * Validate search response
   */
  validateSearchResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode === 200) {
      try {
        const body = JSON.parse(response.body);

        // Track search result metrics
        const resultCount = body.results?.length || body.total || 0;
        ee.emit('histogram', 'search.result_count', resultCount);

        if (resultCount === 0) {
          ee.emit('counter', 'search.no_results', 1);
        } else if (resultCount > 0 && resultCount <= 10) {
          ee.emit('counter', 'search.few_results', 1);
        } else {
          ee.emit('counter', 'search.many_results', 1);
        }

        // Track search performance
        const latency = response.timings?.total || 0;
        if (latency < 50) {
          ee.emit('counter', 'search.very_fast', 1);
        } else if (latency < 100) {
          ee.emit('counter', 'search.fast', 1);
        } else if (latency < 200) {
          ee.emit('counter', 'search.acceptable', 1);
        } else {
          ee.emit('counter', 'search.slow', 1);
        }

      } catch (e) {
        ee.emit('counter', 'search.parse_error', 1);
      }
    } else {
      ee.emit('counter', 'search.error', 1);
    }

    return next();
  },

  /**
   * Generate filter combinations
   */
  generateFilters: function(context, events, done) {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

    const timeRanges = [
      { start: new Date(dayAgo).toISOString(), end: new Date(now).toISOString() },
      { start: new Date(weekAgo).toISOString(), end: new Date(now).toISOString() },
      { start: new Date(monthAgo).toISOString(), end: new Date(now).toISOString() }
    ];

    const range = timeRanges[Math.floor(Math.random() * timeRanges.length)];
    context.vars.startDate = range.start;
    context.vars.endDate = range.end;

    // Duration filters (in seconds)
    const durations = [
      { min: 300, max: 1800 },   // 5-30 min
      { min: 1800, max: 3600 },  // 30-60 min
      { min: 3600, max: 7200 }   // 1-2 hours
    ];

    const duration = durations[Math.floor(Math.random() * durations.length)];
    context.vars.minDuration = duration.min;
    context.vars.maxDuration = duration.max;

    return done();
  },

  /**
   * Track search cache hits
   */
  trackCacheHits: function(requestParams, response, context, ee, next) {
    const cacheHeader = response.headers['x-cache-status'] ||
                       response.headers['x-cache'] || 'MISS';

    if (cacheHeader.toUpperCase().includes('HIT')) {
      ee.emit('counter', 'search.cache_hit', 1);
    } else {
      ee.emit('counter', 'search.cache_miss', 1);
    }

    return next();
  }
};
