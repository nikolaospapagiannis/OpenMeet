/**
 * Rate Limit Monitor Service
 *
 * Monitors rate limiting metrics and generates alerts:
 * - Track rate limit hits
 * - Track blocked IPs
 * - Monitor top consumers
 * - Export metrics to Prometheus
 * - Generate alerts for anomalies
 */

import Redis from 'ioredis';
import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import { logger } from '../utils/logger';
import { RATE_LIMIT_MONITORING } from '../config/rate-limits';

export interface RateLimitMetrics {
  totalRequests: number;
  rateLimitHits: number;
  blockedRequests: number;
  topConsumers: Array<{ identifier: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; hits: number }>;
  blockedIPs: Array<{ ip: string; reason: string; blockedAt: Date }>;
  averageResponseTime: number;
}

export interface Alert {
  id: string;
  type: 'rate_limit_spike' | 'ddos_attack' | 'blocked_ips_spike' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
}

export class RateLimitMonitorService {
  private redis: Redis;
  private registry: Registry;

  // Prometheus metrics
  private rateLimitHitsCounter: Counter;
  private blockedRequestsCounter: Counter;
  private requestDurationHistogram: Histogram;
  private activeConnectionsGauge: Gauge;
  private blockedIPsGauge: Gauge;
  private trustScoreGauge: Gauge;

  constructor(redis: Redis, registry?: Registry) {
    this.redis = redis;
    this.registry = registry || new Registry();

    // Initialize Prometheus metrics
    this.rateLimitHitsCounter = new Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['type', 'endpoint', 'tier'],
      registers: [this.registry],
    });

    this.blockedRequestsCounter = new Counter({
      name: 'blocked_requests_total',
      help: 'Total number of blocked requests',
      labelNames: ['reason', 'ip'],
      registers: [this.registry],
    });

    this.requestDurationHistogram = new Histogram({
      name: 'request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['endpoint', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.activeConnectionsGauge = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['ip'],
      registers: [this.registry],
    });

    this.blockedIPsGauge = new Gauge({
      name: 'blocked_ips_total',
      help: 'Total number of blocked IPs',
      registers: [this.registry],
    });

    this.trustScoreGauge = new Gauge({
      name: 'trust_score',
      help: 'Trust score for identifiers',
      labelNames: ['identifier', 'type'],
      registers: [this.registry],
    });
  }

  /**
   * Record rate limit hit
   */
  async recordRateLimitHit(
    identifier: string,
    endpoint: string,
    type: 'user' | 'ip' | 'apikey',
    tier?: string
  ): Promise<void> {
    try {
      // Increment Prometheus counter
      this.rateLimitHitsCounter.inc({
        type,
        endpoint,
        tier: tier || 'unknown',
      });

      // Store in Redis for time-series analysis
      const timestamp = Date.now();
      const key = `metrics:rate_limit_hits`;

      await this.redis.zadd(key, timestamp, JSON.stringify({
        identifier,
        endpoint,
        type,
        tier,
        timestamp,
      }));

      // Keep only last 24 hours
      const cutoff = timestamp - 24 * 60 * 60 * 1000;
      await this.redis.zremrangebyscore(key, '-inf', cutoff);

      // Increment endpoint-specific counter
      const endpointKey = `metrics:endpoint_hits:${endpoint}`;
      await this.redis.hincrby(endpointKey, identifier, 1);
      await this.redis.expire(endpointKey, 86400);

      // Check for alert conditions
      await this.checkRateLimitSpike();
    } catch (error) {
      logger.error('Record rate limit hit error:', error);
    }
  }

  /**
   * Record blocked request
   */
  async recordBlockedRequest(
    ip: string,
    reason: string,
    endpoint?: string
  ): Promise<void> {
    try {
      // Increment Prometheus counter
      this.blockedRequestsCounter.inc({ reason, ip });

      // Store in Redis
      const timestamp = Date.now();
      const key = `metrics:blocked_requests`;

      await this.redis.zadd(key, timestamp, JSON.stringify({
        ip,
        reason,
        endpoint,
        timestamp,
      }));

      // Keep only last 24 hours
      const cutoff = timestamp - 24 * 60 * 60 * 1000;
      await this.redis.zremrangebyscore(key, '-inf', cutoff);

      // Update blocked IPs gauge
      const blockedIPs = await this.redis.scard('ip:blacklisted');
      this.blockedIPsGauge.set(blockedIPs);

      // Check for alert conditions
      await this.checkBlockedIPsSpike();
    } catch (error) {
      logger.error('Record blocked request error:', error);
    }
  }

  /**
   * Record request duration
   */
  recordRequestDuration(
    endpoint: string,
    durationSeconds: number,
    statusCode: number
  ): void {
    try {
      this.requestDurationHistogram.observe(
        { endpoint, status: statusCode.toString() },
        durationSeconds
      );
    } catch (error) {
      logger.error('Record request duration error:', error);
    }
  }

  /**
   * Update active connections
   */
  updateActiveConnections(ip: string, count: number): void {
    try {
      this.activeConnectionsGauge.set({ ip }, count);
    } catch (error) {
      logger.error('Update active connections error:', error);
    }
  }

  /**
   * Update trust score metric
   */
  updateTrustScore(
    identifier: string,
    type: 'user' | 'ip' | 'apikey',
    score: number
  ): void {
    try {
      this.trustScoreGauge.set({ identifier, type }, score);
    } catch (error) {
      logger.error('Update trust score error:', error);
    }
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<RateLimitMetrics> {
    try {
      const now = Date.now();
      const hourAgo = now - 60 * 60 * 1000;

      // Get rate limit hits in last hour
      const rateLimitHitsKey = 'metrics:rate_limit_hits';
      const hits = await this.redis.zrangebyscore(
        rateLimitHitsKey,
        hourAgo,
        now
      );

      // Get blocked requests in last hour
      const blockedRequestsKey = 'metrics:blocked_requests';
      const blocked = await this.redis.zrangebyscore(
        blockedRequestsKey,
        hourAgo,
        now
      );

      // Calculate top consumers
      const consumerCounts: Record<string, number> = {};
      hits.forEach((hit) => {
        try {
          const data = JSON.parse(hit);
          consumerCounts[data.identifier] = (consumerCounts[data.identifier] || 0) + 1;
        } catch (error) {
          // Skip invalid entries
        }
      });

      const topConsumers = Object.entries(consumerCounts)
        .map(([identifier, count]) => ({ identifier, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, RATE_LIMIT_MONITORING.dashboard.topConsumersLimit);

      // Calculate top endpoints
      const endpointCounts: Record<string, number> = {};
      hits.forEach((hit) => {
        try {
          const data = JSON.parse(hit);
          endpointCounts[data.endpoint] = (endpointCounts[data.endpoint] || 0) + 1;
        } catch (error) {
          // Skip invalid entries
        }
      });

      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, hits]) => ({ endpoint, hits }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10);

      // Get blocked IPs
      const blockedIPsSet = await this.redis.smembers('ip:blacklisted');
      const blockedIPs = [];

      for (const ip of blockedIPsSet.slice(0, RATE_LIMIT_MONITORING.dashboard.recentBlocksLimit)) {
        const blockKey = `ip:blacklist:${ip}`;
        const blockData = await this.redis.get(blockKey);
        if (blockData) {
          const block = JSON.parse(blockData);
          blockedIPs.push({
            ip,
            reason: block.reason,
            blockedAt: new Date(block.blockedAt),
          });
        }
      }

      return {
        totalRequests: hits.length + blocked.length,
        rateLimitHits: hits.length,
        blockedRequests: blocked.length,
        topConsumers,
        topEndpoints,
        blockedIPs,
        averageResponseTime: 0, // Calculate from histogram if needed
      };
    } catch (error) {
      logger.error('Get metrics error:', error);
      return {
        totalRequests: 0,
        rateLimitHits: 0,
        blockedRequests: 0,
        topConsumers: [],
        topEndpoints: [],
        blockedIPs: [],
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Check for rate limit spike (potential attack)
   */
  private async checkRateLimitSpike(): Promise<void> {
    try {
      const now = Date.now();
      const minuteAgo = now - 60 * 1000;

      const key = 'metrics:rate_limit_hits';
      const recentHits = await this.redis.zcount(key, minuteAgo, now);

      const { rateLimitHitsPerMinute } = RATE_LIMIT_MONITORING.alertThresholds;

      if (recentHits > rateLimitHitsPerMinute) {
        await this.createAlert({
          type: 'rate_limit_spike',
          severity: 'warning',
          message: `Rate limit hits spike detected: ${recentHits} hits in last minute`,
          details: {
            hits: recentHits,
            threshold: rateLimitHitsPerMinute,
            timestamp: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Check rate limit spike error:', error);
    }
  }

  /**
   * Check for blocked IPs spike
   */
  private async checkBlockedIPsSpike(): Promise<void> {
    try {
      const now = Date.now();
      const hourAgo = now - 60 * 60 * 1000;

      const key = 'metrics:blocked_requests';
      const recentBlocks = await this.redis.zcount(key, hourAgo, now);

      const { blockedIPsPerHour } = RATE_LIMIT_MONITORING.alertThresholds;

      if (recentBlocks > blockedIPsPerHour) {
        await this.createAlert({
          type: 'blocked_ips_spike',
          severity: 'critical',
          message: `Blocked IPs spike detected: ${recentBlocks} blocks in last hour`,
          details: {
            blocks: recentBlocks,
            threshold: blockedIPsPerHour,
            timestamp: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Check blocked IPs spike error:', error);
    }
  }

  /**
   * Create alert
   */
  private async createAlert(
    alert: Omit<Alert, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const alertData: Alert = {
        id: `alert:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...alert,
      };

      // Store alert in Redis
      const key = 'alerts:rate_limit';
      await this.redis.zadd(
        key,
        alertData.timestamp.getTime(),
        JSON.stringify(alertData)
      );

      // Keep only last 1000 alerts
      await this.redis.zremrangebyrank(key, 0, -1001);

      logger.warn('Rate limit alert created', {
        type: alertData.type,
        severity: alertData.severity,
        message: alertData.message,
      });

      // Send alert via configured notification channels
      await this.sendAlertNotifications(alertData);
    } catch (error) {
      logger.error('Create alert error:', error);
    }
  }

  /**
   * Get recent alerts
   */
  async getAlerts(limit: number = 100): Promise<Alert[]> {
    try {
      const key = 'alerts:rate_limit';
      const alertsData = await this.redis.zrevrange(key, 0, limit - 1);

      return alertsData.map((data) => JSON.parse(data));
    } catch (error) {
      logger.error('Get alerts error:', error);
      return [];
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  async exportPrometheusMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      logger.error('Export Prometheus metrics error:', error);
      return '';
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData() {
    try {
      const [metrics, alerts] = await Promise.all([
        this.getMetrics(),
        this.getAlerts(10),
      ]);

      return {
        metrics,
        alerts,
        refreshInterval: RATE_LIMIT_MONITORING.dashboard.refreshIntervalMs,
      };
    } catch (error) {
      logger.error('Get dashboard data error:', error);
      return {
        metrics: await this.getMetrics(),
        alerts: [],
        refreshInterval: 5000,
      };
    }
  }

  /**
   * Clear old metrics (cleanup job)
   */
  async clearOldMetrics(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      const keys = [
        'metrics:rate_limit_hits',
        'metrics:blocked_requests',
        'alerts:rate_limit',
      ];

      for (const key of keys) {
        await this.redis.zremrangebyscore(key, '-inf', cutoff);
      }

      logger.info('Old metrics cleared', { daysToKeep });
    } catch (error) {
      logger.error('Clear old metrics error:', error);
    }
  }

  /**
   * Get time-series data for charting
   */
  async getTimeSeries(
    metricType: 'hits' | 'blocks',
    intervalMinutes: number = 60,
    durationHours: number = 24
  ) {
    try {
      const now = Date.now();
      const start = now - durationHours * 60 * 60 * 1000;
      const interval = intervalMinutes * 60 * 1000;

      const key = metricType === 'hits'
        ? 'metrics:rate_limit_hits'
        : 'metrics:blocked_requests';

      const data = await this.redis.zrangebyscore(key, start, now);

      // Group by time interval
      const buckets: Record<number, number> = {};
      data.forEach((entry) => {
        try {
          const parsed = JSON.parse(entry);
          const bucketTime = Math.floor(parsed.timestamp / interval) * interval;
          buckets[bucketTime] = (buckets[bucketTime] || 0) + 1;
        } catch (error) {
          // Skip invalid entries
        }
      });

      // Convert to array format
      return Object.entries(buckets)
        .map(([timestamp, count]) => ({
          timestamp: parseInt(timestamp, 10),
          count,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('Get time series error:', error);
      return [];
    }
  }

  /**
   * Send alert notifications via configured channels
   */
  private async sendAlertNotifications(alertData: Alert): Promise<void> {
    try {
      // Only send for high/critical severity
      if (alertData.severity !== "warning" && alertData.severity !== "critical") return;

      // Log to structured logger for log aggregation (Datadog, Splunk, etc.)
      logger.warn("Rate limit alert triggered", {
        alertType: alertData.type,
        severity: alertData.severity,
        message: alertData.message,
        details: alertData.details,
        timestamp: alertData.timestamp,
      });

      // Push to Prometheus for alertmanager integration
      if (this.blockedRequestsCounter) {
        this.blockedRequestsCounter.labels(alertData.type).inc();
      }

      // Future: Integrate with SlackBotService, SendGrid, PagerDuty
      // const { slackBotService } = await import("./SlackBotService");
      // await slackBotService.sendAlert(alertData);
    } catch (error) {
      logger.error("Failed to send alert notifications:", error);
    }
  }
}

// Export singleton instance
let rateLimitMonitorService: RateLimitMonitorService | null = null;

export function getRateLimitMonitorService(
  redis: Redis,
  registry?: Registry
): RateLimitMonitorService {
  if (!rateLimitMonitorService) {
    rateLimitMonitorService = new RateLimitMonitorService(redis, registry);
  }
  return rateLimitMonitorService;
}
