/**
 * GeoIP Service - Enterprise-Grade Geolocation
 * Uses MaxMind GeoLite2 database for IP geolocation
 *
 * Features:
 * - Automatic database updates (weekly)
 * - Redis-based caching with TTL
 * - Multi-tenant session tracking
 * - GDPR-compliant IP hashing
 * - Graceful fallback when database unavailable
 *
 * ============================================================================
 * MAXMIND GEOLITE2 DATABASE SETUP
 * ============================================================================
 *
 * This service requires the MaxMind GeoLite2-City database (.mmdb file).
 * The database is NOT included in the repository due to licensing.
 *
 * DOWNLOAD INSTRUCTIONS:
 *
 * 1. Create a free MaxMind account:
 *    https://www.maxmind.com/en/geolite2/signup
 *
 * 2. Generate a license key:
 *    - Log in to your MaxMind account
 *    - Go to "My License Key" under Services
 *    - Click "Generate new license key"
 *    - Save the key securely
 *
 * 3. Download the database using one of these methods:
 *
 *    METHOD A - Direct Download:
 *    https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=YOUR_LICENSE_KEY&suffix=tar.gz
 *
 *    METHOD B - Using geoipupdate tool (recommended for automation):
 *    ```bash
 *    # Install geoipupdate
 *    # macOS: brew install geoipupdate
 *    # Ubuntu: apt-get install geoipupdate
 *
 *    # Create config file at /etc/GeoIP.conf or ~/.config/GeoIP.conf:
 *    AccountID YOUR_ACCOUNT_ID
 *    LicenseKey YOUR_LICENSE_KEY
 *    EditionIDs GeoLite2-City
 *    DatabaseDirectory /path/to/your/data/dir
 *
 *    # Run update
 *    geoipupdate
 *    ```
 *
 * 4. Place the extracted GeoLite2-City.mmdb file in:
 *    - Default: ./data/GeoLite2-City.mmdb (relative to API root)
 *    - Or set GEOIP_DB_PATH environment variable to custom path
 *
 * 5. Set up automatic updates (recommended):
 *    - Add geoipupdate to weekly cron job
 *    - The service will automatically reload the database
 *
 * ENVIRONMENT VARIABLES:
 *   GEOIP_DB_PATH     - Path to GeoLite2-City.mmdb (default: ./data/GeoLite2-City.mmdb)
 *   IP_HASH_SALT      - Salt for IP hashing (GDPR compliance)
 *   LOG_LEVEL         - Logging level (default: info)
 *
 * LICENSE:
 *   GeoLite2 databases are free but require attribution:
 *   "This product includes GeoLite2 data created by MaxMind, available from https://www.maxmind.com"
 *
 * ============================================================================
 */

import { Reader, ReaderModel, City } from '@maxmind/geoip2-node';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as winston from 'winston';
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'geoip-service' },
  transports: [new winston.transports.Console()],
});

// GeoLocation interface
export interface GeoLocation {
  country: string;
  countryCode: string;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  accuracy: number | null; // km radius
  continent: string | null;
  continentCode: string | null;
}

// Session location for tracking
export interface SessionLocation {
  sessionId: string;
  userId: string;
  organizationId: string;
  location: GeoLocation;
  ipHash: string;
  createdAt: Date;
}

// Country aggregation stats
export interface CountryStats {
  countryCode: string;
  country: string;
  count: number;
  percentage: number;
}

// Region aggregation stats
export interface RegionStats {
  countryCode: string;
  region: string;
  count: number;
  percentage: number;
}

// Heatmap data point
export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

class GeoIPService {
  private reader: ReaderModel | null = null;
  private prisma: PrismaClient;
  private redis: Redis;
  private dbPath: string;
  private cachePrefix = 'geoip:';
  private cacheTTL = 86400; // 24 hours
  private initialized = false;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.dbPath = process.env.GEOIP_DB_PATH ||
                  path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb');
  }

  /**
   * Initialize the GeoIP service
   */
  async initialize(): Promise<void> {
    try {
      // Check if database exists
      if (fs.existsSync(this.dbPath)) {
        this.reader = await Reader.open(this.dbPath);
        this.initialized = true;
        logger.info('GeoIP database loaded successfully', { path: this.dbPath });
      } else {
        logger.warn('GeoIP database not found. Please download GeoLite2-City.mmdb', {
          expectedPath: this.dbPath,
          downloadUrl: 'https://dev.maxmind.com/geoip/geoip2/geolite2/',
        });
        // Service will work without database, returning null for lookups
      }

      // Schedule weekly database update check (Sundays at 3 AM)
      this.scheduleUpdates();
    } catch (error) {
      logger.error('Failed to initialize GeoIP service:', error);
      throw error;
    }
  }

  /**
   * Schedule weekly database updates
   */
  private scheduleUpdates(): void {
    // Run every Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      logger.info('Running scheduled GeoIP database update check');
      try {
        await this.checkAndUpdateDatabase();
      } catch (error) {
        logger.error('Scheduled GeoIP update failed:', error);
      }
    });

    logger.info('GeoIP weekly update scheduled for Sundays at 3 AM');
  }

  /**
   * Check if database needs update and reload if necessary
   */
  async checkAndUpdateDatabase(): Promise<void> {
    // Note: Actual download requires MaxMind license key
    // This is a placeholder for the update logic
    const dbExists = fs.existsSync(this.dbPath);

    if (dbExists) {
      const stats = fs.statSync(this.dbPath);
      const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > 7) {
        logger.warn('GeoIP database is more than 7 days old', {
          ageInDays: Math.round(ageInDays),
          lastModified: stats.mtime,
        });
        // In production, trigger download here with MaxMind API
      }

      // Reload database
      if (this.reader) {
        this.reader = await Reader.open(this.dbPath);
        logger.info('GeoIP database reloaded');
      }
    }
  }

  /**
   * Lookup IP address and return geolocation
   */
  async lookupIP(ip: string): Promise<GeoLocation | null> {
    // Skip private/local IPs
    if (this.isPrivateIP(ip)) {
      return null;
    }

    // Check cache first
    const cacheKey = `${this.cachePrefix}${this.hashIP(ip)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Lookup in database
    if (!this.reader) {
      logger.debug('GeoIP reader not initialized, skipping lookup');
      return null;
    }

    try {
      const response = this.reader.city(ip);
      const location = this.mapResponseToLocation(response);

      // Cache the result
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(location));

      return location;
    } catch (error: unknown) {
      // AddressNotFoundError is expected for some IPs
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('AddressNotFoundError')) {
        logger.error('GeoIP lookup error:', { ip: this.maskIP(ip), error: errorMessage });
      }
      return null;
    }
  }

  /**
   * Map MaxMind response to our GeoLocation interface
   */
  private mapResponseToLocation(response: City): GeoLocation {
    return {
      country: response.country?.names?.en || 'Unknown',
      countryCode: response.country?.isoCode || 'XX',
      region: response.subdivisions?.[0]?.names?.en || null,
      city: response.city?.names?.en || null,
      latitude: response.location?.latitude || null,
      longitude: response.location?.longitude || null,
      timezone: response.location?.timeZone || null,
      accuracy: response.location?.accuracyRadius || null,
      continent: response.continent?.names?.en || null,
      continentCode: response.continent?.code || null,
    };
  }

  /**
   * Get country information for an IP address
   * Convenience method returning just country data
   */
  async getCountry(ip: string): Promise<{ country: string; countryCode: string } | null> {
    const location = await this.lookupIP(ip);
    if (!location) {
      return null;
    }
    return {
      country: location.country,
      countryCode: location.countryCode,
    };
  }

  /**
   * Get city information for an IP address
   * Convenience method returning city-level data
   */
  async getCity(ip: string): Promise<{
    city: string | null;
    region: string | null;
    country: string;
    countryCode: string;
  } | null> {
    const location = await this.lookupIP(ip);
    if (!location) {
      return null;
    }
    return {
      city: location.city,
      region: location.region,
      country: location.country,
      countryCode: location.countryCode,
    };
  }

  /**
   * Get geographic coordinates for an IP address
   * Convenience method returning lat/lng with accuracy
   */
  async getCoordinates(ip: string): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timezone: string | null;
  } | null> {
    const location = await this.lookupIP(ip);
    if (!location || location.latitude === null || location.longitude === null) {
      return null;
    }
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timezone: location.timezone,
    };
  }

  /**
   * Alias for lookupIP - maintains backward compatibility
   * and provides consistent naming with other methods
   */
  async lookup(ip: string): Promise<GeoLocation | null> {
    return this.lookupIP(ip);
  }

  /**
   * Track session location for analytics
   */
  async trackSessionLocation(
    sessionId: string,
    userId: string,
    organizationId: string,
    ip: string
  ): Promise<void> {
    const location = await this.lookupIP(ip);

    if (!location) {
      return;
    }

    const ipHash = this.hashIP(ip);

    try {
      // Upsert session geo data
      await this.prisma.sessionGeoData.upsert({
        where: { sessionId },
        update: {
          country: location.country,
          countryCode: location.countryCode,
          region: location.region,
          city: location.city,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone,
          updatedAt: new Date(),
        },
        create: {
          sessionId,
          organizationId,
          country: location.country,
          countryCode: location.countryCode,
          region: location.region,
          city: location.city,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone,
          ipHash,
        },
      });

      logger.debug('Session location tracked', {
        sessionId,
        organizationId,
        country: location.countryCode,
      });
    } catch (error) {
      logger.error('Failed to track session location:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Get session locations for an organization
   */
  async getSessionLocations(organizationId: string): Promise<SessionLocation[]> {
    const sessions = await this.prisma.sessionGeoData.findMany({
      where: { organizationId },
      include: {
        session: {
          select: {
            userId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit for performance
    });

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      userId: s.session.userId,
      organizationId: s.organizationId,
      location: {
        country: s.country,
        countryCode: s.countryCode,
        region: s.region,
        city: s.city,
        latitude: s.latitude,
        longitude: s.longitude,
        timezone: s.timezone,
        accuracy: null,
        continent: null,
        continentCode: null,
      },
      ipHash: s.ipHash,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Aggregate sessions by country for an organization
   */
  async aggregateByCountry(organizationId: string, days = 30): Promise<CountryStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.prisma.sessionGeoData.groupBy({
      by: ['countryCode', 'country'],
      where: {
        organizationId,
        createdAt: { gte: since },
      },
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
    });

    const total = results.reduce((sum, r) => sum + r._count.sessionId, 0);

    return results.map((r) => ({
      countryCode: r.countryCode,
      country: r.country,
      count: r._count.sessionId,
      percentage: total > 0 ? (r._count.sessionId / total) * 100 : 0,
    }));
  }

  /**
   * Aggregate sessions by region for an organization
   */
  async aggregateByRegion(
    organizationId: string,
    countryCode?: string,
    days = 30
  ): Promise<RegionStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = {
      organizationId,
      createdAt: { gte: since },
      region: { not: null },
    };

    if (countryCode) {
      where.countryCode = countryCode;
    }

    const results = await this.prisma.sessionGeoData.groupBy({
      by: ['countryCode', 'region'],
      where,
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
    });

    const total = results.reduce((sum, r) => sum + r._count.sessionId, 0);

    return results.map((r) => ({
      countryCode: r.countryCode,
      region: r.region || 'Unknown',
      count: r._count.sessionId,
      percentage: total > 0 ? (r._count.sessionId / total) * 100 : 0,
    }));
  }

  /**
   * Get heatmap data for visualization
   */
  async getHeatmapData(
    organizationId: string,
    days = 30
  ): Promise<HeatmapPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await this.prisma.sessionGeoData.findMany({
      where: {
        organizationId,
        createdAt: { gte: since },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        latitude: true,
        longitude: true,
      },
    });

    // Aggregate points that are close together
    const aggregatedPoints = new Map<string, { lat: number; lng: number; count: number }>();

    for (const session of sessions) {
      if (session.latitude && session.longitude) {
        // Round to 1 decimal place for aggregation (~11km precision)
        const key = `${session.latitude.toFixed(1)},${session.longitude.toFixed(1)}`;
        const existing = aggregatedPoints.get(key);

        if (existing) {
          existing.count++;
        } else {
          aggregatedPoints.set(key, {
            lat: session.latitude,
            lng: session.longitude,
            count: 1,
          });
        }
      }
    }

    return Array.from(aggregatedPoints.values()).map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
      weight: p.count,
    }));
  }

  /**
   * Get global distribution for super admins
   */
  async getGlobalDistribution(days = 30): Promise<CountryStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.prisma.sessionGeoData.groupBy({
      by: ['countryCode', 'country'],
      where: {
        createdAt: { gte: since },
      },
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
    });

    const total = results.reduce((sum, r) => sum + r._count.sessionId, 0);

    return results.map((r) => ({
      countryCode: r.countryCode,
      country: r.country,
      count: r._count.sessionId,
      percentage: total > 0 ? (r._count.sessionId / total) * 100 : 0,
    }));
  }

  /**
   * Hash IP address for GDPR compliance
   * Uses SHA-256 with salt
   */
  hashIP(ip: string): string {
    const salt = process.env.IP_HASH_SALT || 'openmeet-geoip-salt';
    return crypto.createHash('sha256').update(`${ip}${salt}`).digest('hex');
  }

  /**
   * Mask IP address for logging (privacy)
   */
  private maskIP(ip: string): string {
    if (ip.includes('.')) {
      // IPv4: mask last octet
      const parts = ip.split('.');
      parts[3] = 'xxx';
      return parts.join('.');
    } else {
      // IPv6: mask last 4 groups
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + ':xxxx:xxxx:xxxx:xxxx';
    }
  }

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    if (ip.startsWith('10.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.') ||
        ip.startsWith('192.168.') ||
        ip === '127.0.0.1' ||
        ip === 'localhost' ||
        ip === '::1') {
      return true;
    }

    return false;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    databaseExists: boolean;
    databaseAge?: number;
    lastUpdate?: Date;
  }> {
    const databaseExists = fs.existsSync(this.dbPath);
    let databaseAge: number | undefined;
    let lastUpdate: Date | undefined;

    if (databaseExists) {
      const stats = fs.statSync(this.dbPath);
      databaseAge = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
      lastUpdate = stats.mtime;
    }

    return {
      initialized: this.initialized,
      databaseExists,
      databaseAge,
      lastUpdate,
    };
  }
}

// Singleton instance
let geoIPServiceInstance: GeoIPService | null = null;

export function getGeoIPService(prisma: PrismaClient, redis: Redis): GeoIPService {
  if (!geoIPServiceInstance) {
    geoIPServiceInstance = new GeoIPService(prisma, redis);
  }
  return geoIPServiceInstance;
}

export { GeoIPService };
export default GeoIPService;
