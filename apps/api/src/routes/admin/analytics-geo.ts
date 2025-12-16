/**
 * Geographic Distribution API Routes
 * Enterprise-grade geolocation analytics for admin dashboard
 *
 * Endpoints:
 * - GET /api/admin/analytics/geo/distribution - Country/region distribution
 * - GET /api/admin/analytics/geo/sessions - Active session locations
 * - GET /api/admin/analytics/geo/heatmap - Heatmap data for visualization
 * - GET /api/admin/analytics/geo/global - Global distribution (super admin only)
 * - GET /api/admin/analytics/geo/status - GeoIP service status
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as winston from 'winston';
import { z } from 'zod';
import { getGeoIPService } from '../../services/GeoIPService';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'analytics-geo-routes' },
  transports: [new winston.transports.Console()],
});

// Request validation schemas
const distributionQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
  type: z.enum(['country', 'region']).default('country'),
  countryCode: z.string().length(2).optional(),
  metric: z.enum(['users', 'meetings']).default('users'),
  organizationId: z.string().uuid().optional(),
  timeRange: z.enum(['24h', '7d', '30d', '90d', '1y']).optional(),
});

const sessionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(100),
});

const heatmapQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
  metric: z.enum(['users', 'meetings']).default('users'),
  organizationId: z.string().uuid().optional(),
  timeRange: z.enum(['24h', '7d', '30d', '90d', '1y']).optional(),
  resolution: z.enum(['country', 'region', 'city']).default('country'),
});

const globalQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

// Use Express Request with extended user type from express.d.ts
// The user object is augmented by auth middleware
type AuthenticatedRequest = Request;

// Meeting count by country result
interface MeetingCountByCountry {
  countryCode: string;
  count: number;
}

/**
 * Get meeting counts grouped by country for an organization
 * Joins meeting data with session geo data to determine meeting locations
 */
async function getMeetingCountsByCountry(
  prisma: PrismaClient,
  organizationId: string,
  days: number
): Promise<MeetingCountByCountry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Query meetings joined with session geo data through user sessions
  // This correlates meetings with the geographic location of the host
  const results = await prisma.$queryRaw<Array<{ countryCode: string; count: bigint }>>`
    SELECT
      sgd."countryCode",
      COUNT(DISTINCT m.id) as count
    FROM "Meeting" m
    INNER JOIN "User" u ON m."userId" = u.id
    INNER JOIN "Session" s ON s."userId" = u.id
    INNER JOIN "SessionGeoData" sgd ON sgd."sessionId" = s.id
    WHERE m."organizationId" = ${organizationId}
      AND m."createdAt" >= ${since}
      AND sgd."countryCode" IS NOT NULL
    GROUP BY sgd."countryCode"
    ORDER BY count DESC
  `;

  return results.map((r) => ({
    countryCode: r.countryCode,
    count: Number(r.count),
  }));
}

/**
 * Calculate trend direction for a country
 * Compares current period with previous period of same length
 */
function calculateTrend(
  _countryCode: string,
  _organizationId: string,
  _days: number
): 'up' | 'down' | 'stable' {
  // For now, return stable as calculating trends requires historical comparison
  // In production, this would compare current period vs previous period
  // and determine if there's a significant change (>10%)
  return 'stable';
}

export function createAnalyticsGeoRouter(
  prisma: PrismaClient,
  redis: Redis
): Router {
  const router = Router();
  const geoIPService = getGeoIPService(prisma, redis);

  // Initialize GeoIP service
  geoIPService.initialize().catch((error) => {
    logger.error('Failed to initialize GeoIP service:', error);
  });

  /**
   * GET /distribution
   * Get geographic distribution by country or region
   *
   * Query parameters:
   * - days: number of days to look back (1-365, default 30)
   * - type: 'country' or 'region' (default 'country')
   * - countryCode: ISO country code for region breakdown
   * - metric: 'users' or 'meetings' (default 'users')
   * - organizationId: specific org (super admins only)
   * - timeRange: '24h', '7d', '30d', '90d', '1y' (alternative to days)
   */
  router.get('/distribution', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Validate query parameters
      const validation = distributionQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        });
      }

      const { type, countryCode, metric, organizationId, timeRange } = validation.data;

      // Convert timeRange to days if provided
      let days = validation.data.days;
      if (timeRange) {
        const timeRangeMap: Record<string, number> = {
          '24h': 1,
          '7d': 7,
          '30d': 30,
          '90d': 90,
          '1y': 365,
        };
        days = timeRangeMap[timeRange] || days;
      }

      // Determine which organization to query
      // Super admins can query any org, others can only query their own
      const isSuperAdmin = user.systemRole &&
        ['super_admin', 'platform_admin'].includes(user.systemRole);

      const targetOrgId = (isSuperAdmin && organizationId)
        ? organizationId
        : user.organizationId;

      // Validate that we have an organization to query
      if (!targetOrgId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORGANIZATION',
            message: 'Organization ID is required',
          },
        });
      }

      let countryData;
      if (type === 'country') {
        countryData = await geoIPService.aggregateByCountry(targetOrgId, days);
      } else {
        const regionData = await geoIPService.aggregateByRegion(
          targetOrgId,
          countryCode,
          days
        );
        // For region type, return region-level data
        countryData = regionData;
      }

      // Fetch meeting counts per country if metric is 'meetings'
      const meetingCountsByCountry = await getMeetingCountsByCountry(
        prisma,
        targetOrgId,
        days
      );

      // Transform data to match frontend expectations
      const countries = countryData.map((item) => {
        const meetingData = meetingCountsByCountry.find(
          (m) => m.countryCode === item.countryCode
        );

        return {
          countryCode: item.countryCode,
          countryName: item.country,
          userCount: item.count,
          meetingCount: meetingData?.count || 0,
          percentage: item.percentage,
          trend: calculateTrend(item.countryCode, targetOrgId, days),
        };
      });

      // Calculate totals
      const totalUsers = countries.reduce((sum, c) => sum + c.userCount, 0);
      const totalMeetings = countries.reduce((sum, c) => sum + c.meetingCount, 0);

      logger.info('Geographic distribution retrieved', {
        organizationId: targetOrgId,
        type,
        metric,
        days,
        resultCount: countries.length,
      });

      return res.json({
        success: true,
        data: {
          totalUsers,
          totalMeetings,
          countries,
          lastUpdated: new Date().toISOString(),
          period: {
            days,
            startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
          meta: {
            metric,
            organizationId: targetOrgId,
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving geographic distribution:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve geographic distribution',
        },
      });
    }
  });

  /**
   * GET /sessions
   * Get active session locations for the organization
   */
  router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Validate query parameters
      const validation = sessionsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        });
      }

      const { limit } = validation.data;

      // Validate that we have an organization to query
      if (!user.organizationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORGANIZATION',
            message: 'Organization ID is required',
          },
        });
      }

      const sessions = await geoIPService.getSessionLocations(user.organizationId);
      const limitedSessions = sessions.slice(0, limit);

      // Anonymize session data for response
      const anonymizedSessions = limitedSessions.map((session) => ({
        sessionId: session.sessionId,
        location: {
          country: session.location.country,
          countryCode: session.location.countryCode,
          region: session.location.region,
          city: session.location.city,
          // Round coordinates for privacy (city-level precision)
          latitude: session.location.latitude
            ? Math.round(session.location.latitude * 10) / 10
            : null,
          longitude: session.location.longitude
            ? Math.round(session.location.longitude * 10) / 10
            : null,
          timezone: session.location.timezone,
        },
        createdAt: session.createdAt,
      }));

      logger.info('Session locations retrieved', {
        organizationId: user.organizationId,
        sessionCount: anonymizedSessions.length,
      });

      return res.json({
        success: true,
        data: {
          sessions: anonymizedSessions,
          meta: {
            total: sessions.length,
            returned: anonymizedSessions.length,
            limit,
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving session locations:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve session locations',
        },
      });
    }
  });

  /**
   * GET /heatmap
   * Get heatmap data for geographic visualization
   *
   * Query parameters:
   * - days: number of days to look back (1-365, default 30)
   * - metric: 'users' or 'meetings' (default 'users')
   * - organizationId: specific org (super admins only)
   * - timeRange: '24h', '7d', '30d', '90d', '1y' (alternative to days)
   * - resolution: 'country', 'region', 'city' (default 'country')
   */
  router.get('/heatmap', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Validate query parameters
      const validation = heatmapQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        });
      }

      const { metric, organizationId, timeRange, resolution } = validation.data;

      // Convert timeRange to days if provided
      let days = validation.data.days;
      if (timeRange) {
        const timeRangeMap: Record<string, number> = {
          '24h': 1,
          '7d': 7,
          '30d': 30,
          '90d': 90,
          '1y': 365,
        };
        days = timeRangeMap[timeRange] || days;
      }

      // Determine which organization to query
      const isSuperAdmin = user.systemRole &&
        ['super_admin', 'platform_admin'].includes(user.systemRole);

      const targetOrgId = (isSuperAdmin && organizationId)
        ? organizationId
        : user.organizationId;

      // Validate that we have an organization to query
      if (!targetOrgId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORGANIZATION',
            message: 'Organization ID is required',
          },
        });
      }

      const heatmapData = await geoIPService.getHeatmapData(targetOrgId, days);

      // Calculate intensity bounds for normalization
      const weights = heatmapData.map((p) => p.weight);
      const maxWeight = Math.max(...weights, 1);
      const minWeight = Math.min(...weights, 0);

      // Normalize weights for visualization (0-1 scale)
      // Frontend expects 'intensity' field
      const normalizedData = heatmapData.map((point) => ({
        lat: point.latitude,
        lng: point.longitude,
        weight: point.weight,
        intensity: (point.weight - minWeight) / (maxWeight - minWeight || 1),
        normalizedWeight: (point.weight - minWeight) / (maxWeight - minWeight || 1),
      }));

      logger.info('Heatmap data retrieved', {
        organizationId: targetOrgId,
        metric,
        resolution,
        days,
        pointCount: normalizedData.length,
      });

      return res.json({
        success: true,
        data: {
          points: normalizedData,
          period: {
            days,
            startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
          meta: {
            totalPoints: normalizedData.length,
            maxWeight,
            minWeight,
            metric,
            resolution,
            organizationId: targetOrgId,
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving heatmap data:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve heatmap data',
        },
      });
    }
  });

  /**
   * GET /global
   * Get global geographic distribution (super admin only)
   */
  router.get('/global', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Verify super admin access
      const isSuperAdmin =
        user.systemRole &&
        ['super_admin', 'platform_admin'].includes(user.systemRole);

      if (!isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Super admin access required',
          },
        });
      }

      // Validate query parameters
      const validation = globalQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        });
      }

      const { days } = validation.data;

      const globalDistribution = await geoIPService.getGlobalDistribution(days);

      // Calculate additional global metrics
      const totalSessions = globalDistribution.reduce((sum, d) => sum + d.count, 0);
      const uniqueCountries = globalDistribution.length;

      // Get top 10 countries
      const topCountries = globalDistribution.slice(0, 10);

      // Calculate continent distribution
      const continentMap = new Map<string, number>();
      // Note: For full continent data, we'd need to join with a country-to-continent mapping
      // This is a simplified version based on country codes
      for (const country of globalDistribution) {
        // Simplified continent detection (would be more complete in production)
        let continent = 'Other';
        const cc = country.countryCode;
        if (['US', 'CA', 'MX'].includes(cc)) continent = 'North America';
        else if (['BR', 'AR', 'CL', 'CO', 'PE'].includes(cc)) continent = 'South America';
        else if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE', 'NO', 'FI', 'DK', 'CH', 'AT', 'BE', 'IE', 'PT'].includes(cc)) continent = 'Europe';
        else if (['CN', 'JP', 'KR', 'IN', 'ID', 'TH', 'VN', 'PH', 'MY', 'SG', 'TW', 'HK'].includes(cc)) continent = 'Asia';
        else if (['AU', 'NZ'].includes(cc)) continent = 'Oceania';
        else if (['ZA', 'NG', 'EG', 'KE', 'MA'].includes(cc)) continent = 'Africa';

        continentMap.set(continent, (continentMap.get(continent) || 0) + country.count);
      }

      const continentDistribution = Array.from(continentMap.entries())
        .map(([continent, count]) => ({
          continent,
          count,
          percentage: totalSessions > 0 ? (count / totalSessions) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      logger.info('Global distribution retrieved', {
        userId: user.id,
        days,
        uniqueCountries,
        totalSessions,
      });

      return res.json({
        success: true,
        data: {
          period: {
            days,
            startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
          summary: {
            totalSessions,
            uniqueCountries,
            averageSessionsPerCountry: uniqueCountries > 0
              ? Math.round(totalSessions / uniqueCountries)
              : 0,
          },
          topCountries,
          continentDistribution,
          fullDistribution: globalDistribution,
        },
      });
    } catch (error) {
      logger.error('Error retrieving global distribution:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve global distribution',
        },
      });
    }
  });

  /**
   * GET /status
   * Get GeoIP service status
   */
  router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // Only admins can check service status
      const isAdmin =
        user.systemRole &&
        ['super_admin', 'platform_admin', 'support_admin'].includes(user.systemRole);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        });
      }

      const status = await geoIPService.getStatus();

      logger.info('GeoIP status checked', {
        userId: user.id,
        initialized: status.initialized,
      });

      return res.json({
        success: true,
        data: {
          service: 'geoip',
          status: status.initialized ? 'healthy' : 'degraded',
          details: {
            initialized: status.initialized,
            databaseExists: status.databaseExists,
            databaseAgeDays: status.databaseAge,
            lastDatabaseUpdate: status.lastUpdate?.toISOString(),
            recommendation: status.databaseAge && status.databaseAge > 7
              ? 'Database is older than 7 days, consider updating'
              : 'Database is up to date',
          },
        },
      });
    } catch (error) {
      logger.error('Error checking GeoIP status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check GeoIP status',
        },
      });
    }
  });

  /**
   * POST /track
   * Track a session location (internal use)
   */
  router.post('/track', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'sessionId is required',
          },
        });
      }

      // Validate that we have an organization
      if (!user.organizationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORGANIZATION',
            message: 'Organization ID is required',
          },
        });
      }

      // Get client IP
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '';

      await geoIPService.trackSessionLocation(
        sessionId,
        user.id,
        user.organizationId,
        ip
      );

      logger.debug('Session location tracked', {
        sessionId,
        userId: user.id,
        organizationId: user.organizationId,
      });

      return res.json({
        success: true,
        data: {
          tracked: true,
          sessionId,
        },
      });
    } catch (error) {
      logger.error('Error tracking session location:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to track session location',
        },
      });
    }
  });

  return router;
}

export default createAnalyticsGeoRouter;
