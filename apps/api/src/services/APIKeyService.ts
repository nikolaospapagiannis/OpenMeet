/**
 * API Key Management Service
 *
 * Public Developer Platform - Critical Competitive Feature
 * Matches: Fathom's Public API
 *
 * Features:
 * - API key generation and management
 * - Scoped permissions
 * - Usage tracking
 * - Rate limiting per key
 * - Key rotation
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface APIKey {
  id: string;
  key: string;
  name: string;
  organizationId: string;
  userId: string;
  scopes: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  rateLimit: number; // requests per hour
  isActive: boolean;
  createdAt: Date;
}

export interface APIKeyUsage {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

class APIKeyService {
  /**
   * Generate new API key
   */
  async generateAPIKey(
    organizationId: string,
    userId: string,
    options: {
      name: string;
      scopes?: string[];
      expiresInDays?: number;
      rateLimit?: number;
    }
  ): Promise<{ apiKey: APIKey; plainKey: string }> {
    try {
      // Generate cryptographically secure API key
      const plainKey = `ff_${crypto.randomBytes(32).toString('hex')}`;

      // Hash the key for storage
      const hashedKey = crypto
        .createHash('sha256')
        .update(plainKey)
        .digest('hex');

      // Calculate expiration
      const expiresAt = options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Create API key record
      const apiKey = await prisma.apiKey.create({
        data: {
          organization: { connect: { id: organizationId } },
          user: { connect: { id: userId } },
          name: options.name,
          keyHash: hashedKey,
          keyPrefix: plainKey.substring(0, 10),
          expiresAt,
          isActive: true,
          permissions: {
            scopes: options.scopes || ['read', 'write'],
            rateLimit: options.rateLimit || 1000,
          } as any,
          metadata: {
            usageCount: 0,
          } as any,
        },
      });

      logger.info('API key generated', {
        apiKeyId: apiKey.id,
        organizationId,
        userId
      });

      return {
        apiKey: apiKey as any,
        plainKey, // Return only once - never stored in plain text
      };
    } catch (error) {
      logger.error('Error generating API key', { error });
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(plainKey: string): Promise<APIKey | null> {
    try {
      // Hash the provided key
      const hashedKey = crypto
        .createHash('sha256')
        .update(plainKey)
        .digest('hex');

      // Find matching key
      const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash: hashedKey },
      });

      if (!apiKey) {
        return null;
      }

      // Check if key is active
      if (!apiKey.isActive) {
        logger.warn('Inactive API key used', { apiKeyId: apiKey.id });
        return null;
      }

      // Check if key is expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        logger.warn('Expired API key used', { apiKeyId: apiKey.id });
        return null;
      }

      // Update last used timestamp
      const usageCount = ((apiKey.metadata as any)?.usageCount || 0) + 1;
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: {
          lastUsedAt: new Date(),
          metadata: {
            ...(apiKey.metadata as any),
            usageCount,
          } as any,
        },
      });

      return apiKey as any;
    } catch (error) {
      logger.error('Error validating API key', { error });
      return null;
    }
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKeyId: string): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: Date;
  }> {
    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!apiKey) {
        return { allowed: false, limit: 0, remaining: 0, resetAt: new Date() };
      }

      const limit = ((apiKey.permissions as any)?.rateLimit || 1000) as number;
      const usageLog = ((apiKey.metadata as any)?.usageLog || []) as Array<{ timestamp: string }>;

      // Get usage in current hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const usageCount = usageLog.filter(u => new Date(u.timestamp) >= hourAgo).length;

      const remaining = Math.max(0, limit - usageCount);
      const resetAt = new Date(Math.ceil(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000);

      return {
        allowed: usageCount < limit,
        limit,
        remaining,
        resetAt,
      };
    } catch (error) {
      logger.error('Error checking rate limit', { error });
      return { allowed: false, limit: 0, remaining: 0, resetAt: new Date() };
    }
  }

  /**
   * Log API key usage
   */
  async logUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!apiKey) return;

      const usageLog = ((apiKey.metadata as any)?.usageLog || []) as any[];
      usageLog.push({
        endpoint,
        method,
        statusCode,
        timestamp: new Date().toISOString(),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      // Keep only last 1000 entries to prevent unbounded growth
      const recentUsage = usageLog.slice(-1000);

      await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
          metadata: {
            ...(apiKey.metadata as any),
            usageLog: recentUsage,
          } as any,
        },
      });
    } catch (error) {
      logger.error('Error logging API usage', { error });
    }
  }

  /**
   * List API keys for organization
   */
  async listAPIKeys(organizationId: string, userId?: string): Promise<APIKey[]> {
    try {
      const where: any = { organizationId };
      if (userId) {
        where.userId = userId;
      }

      const apiKeys = await prisma.apiKey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return apiKeys as any[];
    } catch (error) {
      logger.error('Error listing API keys', { error });
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(apiKeyId: string, organizationId: string): Promise<void> {
    try {
      await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: { isActive: false },
      });

      logger.info('API key revoked', { apiKeyId, organizationId });
    } catch (error) {
      logger.error('Error revoking API key', { error });
      throw error;
    }
  }

  /**
   * Rotate API key (create new, revoke old)
   */
  async rotateAPIKey(
    oldApiKeyId: string,
    organizationId: string,
    userId: string
  ): Promise<{ apiKey: APIKey; plainKey: string }> {
    try {
      // Get old API key details
      const oldKey = await prisma.apiKey.findUnique({
        where: { id: oldApiKeyId },
      });

      if (!oldKey) {
        throw new Error('API key not found');
      }

      const permissions = (oldKey.permissions as any) || {};
      const scopes = permissions.scopes || ['read', 'write'];
      const rateLimit = permissions.rateLimit || 1000;

      // Generate new key with same settings
      const newKey = await this.generateAPIKey(organizationId, userId, {
        name: `${oldKey.name} (rotated)`,
        scopes,
        rateLimit,
      });

      // Revoke old key
      await this.revokeAPIKey(oldApiKeyId, organizationId);

      logger.info('API key rotated', {
        oldApiKeyId,
        newApiKeyId: newKey.apiKey.id
      });

      return newKey;
    } catch (error) {
      logger.error('Error rotating API key', { error });
      throw error;
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(apiKeyId: string, days: number = 30): Promise<{
    totalRequests: number;
    successRate: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    dailyUsage: Array<{ date: string; count: number }>;
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get API key with usage log
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!apiKey) {
        return {
          totalRequests: 0,
          successRate: 0,
          topEndpoints: [],
          dailyUsage: [],
        };
      }

      const usageLog = ((apiKey.metadata as any)?.usageLog || []) as Array<{
        endpoint: string;
        statusCode: number;
        timestamp: string;
      }>;

      // Filter by date range
      const usage = usageLog.filter(u => new Date(u.timestamp) >= since);

      const totalRequests = usage.length;
      const successCount = usage.filter(u => u.statusCode >= 200 && u.statusCode < 300).length;
      const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;

      // Count by endpoint
      const endpointCounts: Record<string, number> = {};
      usage.forEach(u => {
        endpointCounts[u.endpoint] = (endpointCounts[u.endpoint] || 0) + 1;
      });

      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Count by day
      const dailyCounts: Record<string, number> = {};
      usage.forEach(u => {
        const date = u.timestamp.split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      const dailyUsage = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalRequests,
        successRate,
        topEndpoints,
        dailyUsage,
      };
    } catch (error) {
      logger.error('Error getting usage stats', { error });
      throw error;
    }
  }

  /**
   * Check if API key has required scopes
   */
  hasScopes(apiKey: APIKey, requiredScopes: string[]): boolean {
    const scopes = ((apiKey as any).permissions?.scopes || apiKey.scopes || []) as string[];
    return requiredScopes.every(scope => scopes.includes(scope));
  }
}

export const apiKeyService = new APIKeyService();
