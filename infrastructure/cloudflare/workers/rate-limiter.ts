/**
 * CloudFlare Edge Rate Limiter Worker
 *
 * Provides edge-level rate limiting before requests reach origin server
 * - Token bucket algorithm at the edge
 * - DDoS protection
 * - Bot detection
 * - GeoIP blocking
 */

interface Env {
  RATE_LIMIT_KV: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  DB: D1Database;
  ANALYTICS: AnalyticsEngineDataset;
  API_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const country = request.headers.get('CF-IPCountry') || 'unknown';

    // Check if IP is blocked
    const blocked = await env.RATE_LIMIT_KV.get(`blocked:${ip}`);
    if (blocked) {
      return new Response('Your IP has been blocked', { status: 403 });
    }

    // GeoIP blocking (if configured)
    const blockedCountries = ['CN', 'RU']; // Example
    if (blockedCountries.includes(country)) {
      await env.RATE_LIMIT_KV.put(`blocked:${ip}`, '1', { expirationTtl: 3600 });
      return new Response('Access from your country is not allowed', { status: 403 });
    }

    // Bot detection
    const userAgent = request.headers.get('User-Agent') || '';
    if (isSuspiciousBot(userAgent)) {
      await recordSuspiciousActivity(env, ip, 'bot_detected');
      return new Response('Bot traffic detected', { status: 403 });
    }

    // Rate limiting using Durable Objects
    const rateLimiterId = env.RATE_LIMITER.idFromName(ip);
    const rateLimiter = env.RATE_LIMITER.get(rateLimiterId);

    const allowed = await rateLimiter.fetch(
      new Request('http://internal/check', {
        method: 'POST',
        body: JSON.stringify({
          ip,
          path: url.pathname,
          timestamp: Date.now(),
        }),
      })
    );

    if (!allowed.ok) {
      // Rate limit exceeded
      await recordRateLimitViolation(env, ip, url.pathname);

      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    // Forward to origin
    const originRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    });

    const response = await fetch(originRequest);

    // Record analytics
    ctx.waitUntil(
      env.ANALYTICS.writeDataPoint({
        blobs: [ip, url.pathname, country],
        doubles: [response.status],
        indexes: [ip],
      })
    );

    return response;
  },
};

/**
 * Durable Object for distributed rate limiting
 */
export class RateLimiter {
  state: DurableObjectState;
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.maxTokens = 100; // Max requests
    this.refillRate = 100 / 60; // 100 requests per minute
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  async fetch(request: Request): Promise<Response> {
    const data = await request.json<any>();

    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;

    // Check if enough tokens
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return new Response(JSON.stringify({ allowed: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ allowed: false }), { status: 429 });
  }
}

/**
 * Check if user agent looks like a suspicious bot
 */
function isSuspiciousBot(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl\//i,
    /python-requests/i,
    /wget/i,
    /masscan/i,
    /nmap/i,
  ];

  // Allow legitimate bots
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slackbot/i,
    /twitterbot/i,
    /facebookexternalhit/i,
  ];

  const isLegitimate = legitimateBots.some((pattern) => pattern.test(userAgent));
  if (isLegitimate) {
    return false;
  }

  return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Record suspicious activity
 */
async function recordSuspiciousActivity(
  env: Env,
  ip: string,
  activityType: string
): Promise<void> {
  const key = `suspicious:${ip}:${activityType}`;
  const count = parseInt((await env.RATE_LIMIT_KV.get(key)) || '0', 10) + 1;

  await env.RATE_LIMIT_KV.put(key, count.toString(), { expirationTtl: 3600 });

  // Auto-block after threshold
  if (count >= 5) {
    await env.RATE_LIMIT_KV.put(`blocked:${ip}`, '1', { expirationTtl: 3600 });
  }
}

/**
 * Record rate limit violation
 */
async function recordRateLimitViolation(
  env: Env,
  ip: string,
  path: string
): Promise<void> {
  const key = `violations:${ip}`;
  const count = parseInt((await env.RATE_LIMIT_KV.get(key)) || '0', 10) + 1;

  await env.RATE_LIMIT_KV.put(key, count.toString(), { expirationTtl: 3600 });

  // Auto-block after 10 violations
  if (count >= 10) {
    await env.RATE_LIMIT_KV.put(`blocked:${ip}`, '1', { expirationTtl: 7200 });
  }
}
