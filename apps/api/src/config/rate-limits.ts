/**
 * Rate Limiting Configuration
 *
 * Fortune 100-grade distributed rate limiting configuration
 * Defines tiers, endpoint-specific limits, and DDoS protection rules
 */

import { SubscriptionTier } from '@prisma/client';

/**
 * Rate limit tiers based on subscription
 */
export const RATE_LIMIT_TIERS = {
  free: {
    requestsPerHour: 100,
    requestsPerMinute: 10,
    requestsPerSecond: 2,
    concurrentRequests: 5,
    burstSize: 20,
  },
  pro: {
    requestsPerHour: 1000,
    requestsPerMinute: 100,
    requestsPerSecond: 10,
    concurrentRequests: 20,
    burstSize: 100,
  },
  business: {
    requestsPerHour: 5000,
    requestsPerMinute: 500,
    requestsPerSecond: 50,
    concurrentRequests: 50,
    burstSize: 500,
  },
  enterprise: {
    requestsPerHour: 10000,
    requestsPerMinute: 1000,
    requestsPerSecond: 100,
    concurrentRequests: 100,
    burstSize: 1000,
  },
} as const;

/**
 * Endpoint-specific rate limits (overrides tier limits)
 */
export const ENDPOINT_RATE_LIMITS = {
  // Auth endpoints - strict limits to prevent brute force
  '/api/auth/login': {
    points: 5,
    duration: 900, // 15 minutes
    blockDuration: 3600, // 1 hour block after exceeding
    description: 'Login attempts - prevents brute force attacks',
  },
  '/api/auth/register': {
    points: 3,
    duration: 3600, // 1 hour
    blockDuration: 86400, // 24 hour block after exceeding
    description: 'Registration attempts - prevents spam accounts',
  },
  '/api/auth/forgot-password': {
    points: 3,
    duration: 3600, // 1 hour
    blockDuration: 7200, // 2 hour block
    description: 'Password reset requests - prevents abuse',
  },
  '/api/auth/verify-email': {
    points: 5,
    duration: 3600, // 1 hour
    blockDuration: 3600,
    description: 'Email verification attempts',
  },
  '/api/auth/refresh': {
    points: 20,
    duration: 60, // 1 minute
    blockDuration: 300,
    description: 'Token refresh rate limit',
  },

  // Upload endpoints - expensive operations
  '/api/meetings/upload': {
    points: 10,
    duration: 3600, // 1 hour
    blockDuration: 1800,
    description: 'Meeting upload rate limit',
  },
  '/api/video/upload': {
    points: 5,
    duration: 3600, // 1 hour
    blockDuration: 1800,
    description: 'Video upload rate limit',
  },

  // Search endpoints - can be expensive
  '/api/search': {
    points: 100,
    duration: 60, // 1 minute
    blockDuration: 300,
    description: 'Search query rate limit',
  },
  '/api/ai-query': {
    points: 30,
    duration: 60, // 1 minute
    blockDuration: 300,
    description: 'AI query rate limit',
  },
  '/api/ai/analyze': {
    points: 20,
    duration: 3600, // 1 hour
    blockDuration: 1800,
    description: 'AI analysis rate limit',
  },

  // Webhook endpoints
  '/api/webhooks/*': {
    points: 1000,
    duration: 60, // 1 minute
    blockDuration: 300,
    description: 'Webhook delivery rate limit',
  },

  // Public API endpoints
  '/v1/*': {
    points: 100, // Will be overridden by API key tier
    duration: 60,
    blockDuration: 300,
    description: 'Public API rate limit (per API key)',
  },

  // Export endpoints - expensive operations
  '/api/export/*': {
    points: 5,
    duration: 3600, // 1 hour
    blockDuration: 3600,
    description: 'Data export rate limit',
  },

  // Batch operations
  '/api/batch/*': {
    points: 10,
    duration: 300, // 5 minutes
    blockDuration: 900,
    description: 'Batch operation rate limit',
  },
} as const;

/**
 * IP-based rate limits (applies to all requests from an IP)
 */
export const IP_RATE_LIMITS = {
  // General IP limits
  general: {
    points: 1000,
    duration: 60, // 1 minute
    blockDuration: 300,
    description: 'General IP-based rate limit',
  },

  // Strict limits for suspicious activity
  strict: {
    points: 100,
    duration: 60,
    blockDuration: 1800,
    description: 'Strict IP limit for suspicious activity',
  },

  // Very strict for known bad actors
  suspicious: {
    points: 10,
    duration: 60,
    blockDuration: 3600,
    description: 'Very strict limit for suspicious IPs',
  },
} as const;

/**
 * DDoS protection thresholds
 */
export const DDOS_PROTECTION = {
  // Burst detection
  burstDetection: {
    threshold: 100, // requests
    windowSeconds: 1,
    blockDurationSeconds: 300,
  },

  // Connection flood detection
  connectionFlood: {
    maxConnectionsPerIP: 50,
    windowSeconds: 60,
    blockDurationSeconds: 600,
  },

  // Request pattern detection
  patternDetection: {
    identicalRequestThreshold: 10, // Same request more than X times
    windowSeconds: 60,
    blockDurationSeconds: 900,
  },

  // Slow request attack protection
  slowRequestProtection: {
    maxRequestDurationMs: 30000, // 30 seconds
    maxConcurrentSlowRequests: 5,
    blockDurationSeconds: 600,
  },

  // Rate limit violation threshold
  rateLimitViolation: {
    violationsBeforeBlock: 5,
    windowSeconds: 300,
    blockDurationSeconds: 1800,
  },
} as const;

/**
 * Whitelist/Blacklist configuration
 */
export const IP_LIST_CONFIG = {
  // Whitelisted IPs bypass all rate limits
  whitelist: {
    enabled: true,
    ips: ['127.0.0.1', '::1', '::ffff:127.0.0.1', ...(process.env.WHITELISTED_IPS?.split(',') || [])],
    cidrRanges: process.env.WHITELISTED_CIDRS?.split(',') || [],
  },

  // Blacklisted IPs are completely blocked
  blacklist: {
    enabled: true,
    ips: process.env.BLACKLISTED_IPS?.split(',') || [],
    cidrRanges: process.env.BLACKLISTED_CIDRS?.split(',') || [],
  },

  // GeoIP blocking
  geoBlocking: {
    enabled: process.env.GEO_BLOCKING_ENABLED === 'true',
    blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || [],
    allowedCountries: process.env.ALLOWED_COUNTRIES?.split(',') || [],
  },
} as const;

/**
 * Adaptive rate limiting configuration
 */
export const ADAPTIVE_RATE_LIMITING = {
  // Trust score based rate limiting
  trustScore: {
    enabled: true,
    minScore: 0,
    maxScore: 100,

    // Score modifiers
    modifiers: {
      successfulRequests: 0.1,
      failedRequests: -2,
      rateLimitViolations: -10,
      longTermUser: 5,
      verifiedEmail: 5,
      paidSubscription: 10,
      apiKeyUsage: 5,
    },

    // Rate limit multipliers based on trust score
    multipliers: {
      veryHigh: 2.0, // 80-100 score
      high: 1.5,     // 60-79 score
      medium: 1.0,   // 40-59 score
      low: 0.5,      // 20-39 score
      veryLow: 0.25, // 0-19 score
    },
  },

  // Scraper detection
  scraperDetection: {
    enabled: true,
    patterns: [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl\//i,
      /python-requests/i,
      /wget/i,
    ],
    maxRequestsPerMinute: 10,
    blockDurationSeconds: 3600,
  },

  // Credential stuffing detection
  credentialStuffingDetection: {
    enabled: true,
    failedLoginThreshold: 10,
    windowSeconds: 300,
    blockDurationSeconds: 3600,
    monitorEndpoints: ['/api/auth/login', '/api/auth/register'],
  },
} as const;

/**
 * Monitoring and alerting configuration
 */
export const RATE_LIMIT_MONITORING = {
  // Alert thresholds
  alertThresholds: {
    rateLimitHitsPerMinute: 100,
    blockedIPsPerHour: 50,
    ddosAttackIndicators: 10,
  },

  // Metrics collection
  metrics: {
    enabled: true,
    collectInterval: 60000, // 1 minute
    retentionDays: 30,
  },

  // Dashboard refresh rate
  dashboard: {
    refreshIntervalMs: 5000, // 5 seconds
    topConsumersLimit: 100,
    recentBlocksLimit: 100,
  },
} as const;

/**
 * Get rate limit for subscription tier
 */
export function getRateLimitForTier(tier: SubscriptionTier) {
  return RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.free;
}

/**
 * Get endpoint-specific rate limit
 */
export function getEndpointRateLimit(endpoint: string) {
  // Exact match
  if (ENDPOINT_RATE_LIMITS[endpoint as keyof typeof ENDPOINT_RATE_LIMITS]) {
    return ENDPOINT_RATE_LIMITS[endpoint as keyof typeof ENDPOINT_RATE_LIMITS];
  }

  // Wildcard match
  for (const [pattern, limit] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      if (regex.test(endpoint)) {
        return limit;
      }
    }
  }

  return null;
}

/**
 * Check if IP is whitelisted
 */
export function isIPWhitelisted(ip: string): boolean {
  if (!IP_LIST_CONFIG.whitelist.enabled) {
    return false;
  }

  // Check exact IP match
  if (IP_LIST_CONFIG.whitelist.ips.includes(ip)) {
    return true;
  }

  // Check CIDR ranges
  // In production, use a proper CIDR matching library like 'ip-range-check'
  return false;
}

/**
 * Check if IP is blacklisted
 */
export function isIPBlacklisted(ip: string): boolean {
  if (!IP_LIST_CONFIG.blacklist.enabled) {
    return false;
  }

  // Check exact IP match
  if (IP_LIST_CONFIG.blacklist.ips.includes(ip)) {
    return true;
  }

  // Check CIDR ranges
  // In production, use a proper CIDR matching library like 'ip-range-check'
  return false;
}
