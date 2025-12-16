/**
 * Admin API Key Management Routes
 * API key management for Super Admin Dashboard
 *
 * Endpoints:
 * - GET /api-keys - List all API keys with pagination
 * - GET /api-keys/:id - Get single API key details
 * - POST /api-keys - Create new API key
 * - PUT /api-keys/:id - Update API key
 * - DELETE /api-keys/:id - Revoke API key
 * - POST /api-keys/:id/rotate - Rotate API key
 * - GET /api-keys/:id/usage - Get usage statistics
 * - GET /usage/overview - Platform-wide usage overview
 * - PUT /api-keys/:id/rate-limit - Update rate limits
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { requirePermission, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

// Type for API key with organization relation
type OrgApiKeyWithOrganization = Prisma.OrgApiKeyGetPayload<{
  include: { organization: { select: { id: true; name: true; slug: true } } };
}>;

const router = Router();
const prisma = new PrismaClient();

// Constants for API key generation
const API_KEY_PREFIX = 'om_'; // OpenMeet prefix
const API_KEY_LENGTH = 32;
const DEFAULT_RATE_LIMIT = 1000; // requests per hour

// Available API scopes
const AVAILABLE_SCOPES = [
  'meetings:read',
  'meetings:write',
  'transcripts:read',
  'transcripts:write',
  'analytics:read',
  'users:read',
  'users:write',
  'webhooks:read',
  'webhooks:write',
  'recordings:read',
  'recordings:write',
] as const;

type ApiScope = (typeof AVAILABLE_SCOPES)[number];

// ApiKeyMetadata as a simple record type for Prisma JSON compatibility
type ApiKeyMetadata = Record<string, unknown> & {
  rateLimit?: number;
  rateLimitWindow?: string;
  allowedIps?: string[];
  environment?: 'development' | 'staging' | 'production';
  description?: string;
  createdByAdminId?: string;
  lastRotatedAt?: string;
  rotationCount?: number;
  revokedAt?: string;
  revokedByAdminId?: string;
};

/**
 * Generate a secure API key
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const keyBody = randomBytes.toString('base64url').slice(0, API_KEY_LENGTH);
  const key = `${API_KEY_PREFIX}${keyBody}`;
  const prefix = key.slice(0, 10);
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

/**
 * Validate scopes array
 */
function validateScopes(scopes: string[]): { valid: boolean; invalidScopes: string[] } {
  const invalidScopes = scopes.filter((scope) => !AVAILABLE_SCOPES.includes(scope as ApiScope));
  return { valid: invalidScopes.length === 0, invalidScopes };
}

// List all API keys with pagination, search, and filters
router.get(
  '/api-keys',
  requirePermission('read:organizations'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const organizationId = req.query.organizationId as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { keyPrefix: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (organizationId) {
        where.organizationId = organizationId;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [apiKeys, total] = await Promise.all([
        prisma.orgApiKey.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                tier: true,
              },
            },
          },
        }),
        prisma.orgApiKey.count({ where }),
      ]);

      // Transform data to hide sensitive information
      const transformedKeys = apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        organizationId: key.organizationId,
        organization: key.organization,
        scopes: key.scopes,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        metadata: key.metadata,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      }));

      res.json({
        success: true,
        data: transformedKeys,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing API keys', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list API keys',
      });
    }
  }
);

// Get single API key details with usage stats
router.get(
  '/api-keys/:id',
  requirePermission('read:organizations'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const apiKey = await prisma.orgApiKey.findUnique({
        where: { id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              tier: true,
              status: true,
            },
          },
        },
      });

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      // Get usage statistics from the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Query audit logs for API key usage
      const [last30Days, last7Days, last24Hours] = await Promise.all([
        prisma.auditLog.count({
          where: {
            apiKeyId: id,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.auditLog.count({
          where: {
            apiKeyId: id,
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.auditLog.count({
          where: {
            apiKeyId: id,
            createdAt: { gte: oneDayAgo },
          },
        }),
      ]);

      // Get recent activity
      const recentActivity = await prisma.auditLog.findMany({
        where: { apiKeyId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          endpoint: true,
          method: true,
          responseStatus: true,
          ipAddress: true,
          createdAt: true,
        },
      });

      const metadata = apiKey.metadata as ApiKeyMetadata;

      res.json({
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          organizationId: apiKey.organizationId,
          organization: apiKey.organization,
          scopes: apiKey.scopes,
          isActive: apiKey.isActive,
          lastUsedAt: apiKey.lastUsedAt,
          expiresAt: apiKey.expiresAt,
          metadata: apiKey.metadata,
          createdAt: apiKey.createdAt,
          updatedAt: apiKey.updatedAt,
          rateLimit: metadata?.rateLimit || DEFAULT_RATE_LIMIT,
          rateLimitWindow: metadata?.rateLimitWindow || '1h',
          usage: {
            last24Hours,
            last7Days,
            last30Days,
          },
          recentActivity,
        },
      });
    } catch (error) {
      logger.error('Error fetching API key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch API key',
      });
    }
  }
);

// Create new API key for organization
router.post(
  '/api-keys',
  requirePermission('write:organizations'),
  auditAdminAction('admin:create_api_key'),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        organizationId,
        scopes = [],
        expiresAt,
        rateLimit = DEFAULT_RATE_LIMIT,
        rateLimitWindow = '1h',
        allowedIps,
        environment = 'production',
        description,
      } = req.body;

      // Validate required fields
      if (!name || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'Name and organizationId are required',
        });
        return;
      }

      // Validate organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      // Validate scopes
      if (scopes.length > 0) {
        const { valid, invalidScopes } = validateScopes(scopes);
        if (!valid) {
          res.status(400).json({
            success: false,
            error: `Invalid scopes: ${invalidScopes.join(', ')}`,
            availableScopes: AVAILABLE_SCOPES,
          });
          return;
        }
      }

      // Generate API key
      const { key, prefix, hash } = generateApiKey();

      // Prepare metadata
      const metadata: ApiKeyMetadata = {
        rateLimit,
        rateLimitWindow,
        allowedIps: allowedIps || [],
        environment,
        description,
        createdByAdminId: (req as any).admin?.id,
        rotationCount: 0,
      };

      // Create API key record
      const apiKey = await prisma.orgApiKey.create({
        data: {
          name,
          organizationId,
          keyHash: hash,
          keyPrefix: prefix,
          scopes: scopes.length > 0 ? scopes : ['meetings:read'],
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
          metadata: metadata as Prisma.InputJsonValue,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.info('API key created by admin', {
        apiKeyId: apiKey.id,
        organizationId,
        adminId: (req as any).admin?.id,
        scopes,
      });

      // Return the full key only once - it cannot be retrieved again
      const apiKeyWithOrg = apiKey as OrgApiKeyWithOrganization;
      res.status(201).json({
        success: true,
        data: {
          id: apiKeyWithOrg.id,
          name: apiKeyWithOrg.name,
          key, // Full key - shown only once
          keyPrefix: apiKeyWithOrg.keyPrefix,
          organizationId: apiKeyWithOrg.organizationId,
          organization: apiKeyWithOrg.organization,
          scopes: apiKeyWithOrg.scopes,
          isActive: apiKeyWithOrg.isActive,
          expiresAt: apiKeyWithOrg.expiresAt,
          metadata: apiKeyWithOrg.metadata,
          createdAt: apiKeyWithOrg.createdAt,
        },
        message: 'API key created successfully. Save the key now - it cannot be retrieved again.',
      });
    } catch (error) {
      logger.error('Error creating API key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create API key',
      });
    }
  }
);

// Update API key (name, scopes, rate limits)
router.put(
  '/api-keys/:id',
  requirePermission('write:organizations'),
  auditAdminAction('admin:update_api_key'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        scopes,
        isActive,
        expiresAt,
        rateLimit,
        rateLimitWindow,
        allowedIps,
        environment,
        description,
      } = req.body;

      // Check if API key exists
      const existingKey = await prisma.orgApiKey.findUnique({
        where: { id },
      });

      if (!existingKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      // Validate scopes if provided
      if (scopes) {
        const { valid, invalidScopes } = validateScopes(scopes);
        if (!valid) {
          res.status(400).json({
            success: false,
            error: `Invalid scopes: ${invalidScopes.join(', ')}`,
            availableScopes: AVAILABLE_SCOPES,
          });
          return;
        }
      }

      // Prepare metadata update
      const existingMetadata = (existingKey.metadata as ApiKeyMetadata) || {};
      const updatedMetadata: ApiKeyMetadata = {
        ...existingMetadata,
        ...(rateLimit !== undefined && { rateLimit }),
        ...(rateLimitWindow && { rateLimitWindow }),
        ...(allowedIps !== undefined && { allowedIps }),
        ...(environment && { environment }),
        ...(description !== undefined && { description }),
      };

      // Update API key
      const apiKey = await prisma.orgApiKey.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(scopes && { scopes }),
          ...(isActive !== undefined && { isActive }),
          ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
          metadata: updatedMetadata as Prisma.InputJsonValue,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.info('API key updated by admin', {
        apiKeyId: id,
        adminId: (req as any).admin?.id,
        changes: req.body,
      });

      const apiKeyWithOrg = apiKey as OrgApiKeyWithOrganization;
      res.json({
        success: true,
        data: {
          id: apiKeyWithOrg.id,
          name: apiKeyWithOrg.name,
          keyPrefix: apiKeyWithOrg.keyPrefix,
          organizationId: apiKeyWithOrg.organizationId,
          organization: apiKeyWithOrg.organization,
          scopes: apiKeyWithOrg.scopes,
          isActive: apiKeyWithOrg.isActive,
          expiresAt: apiKeyWithOrg.expiresAt,
          metadata: apiKeyWithOrg.metadata,
          updatedAt: apiKeyWithOrg.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating API key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update API key',
      });
    }
  }
);

// Revoke (delete) API key
router.delete(
  '/api-keys/:id',
  requirePermission('write:organizations'),
  auditAdminAction('admin:revoke_api_key'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { hardDelete } = req.query;

      // Check if API key exists
      const existingKey = await prisma.orgApiKey.findUnique({
        where: { id },
      });

      if (!existingKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      if (hardDelete === 'true') {
        // Permanently delete the API key
        await prisma.orgApiKey.delete({
          where: { id },
        });

        logger.warn('API key permanently deleted by admin', {
          apiKeyId: id,
          organizationId: existingKey.organizationId,
          adminId: (req as any).admin?.id,
        });

        res.json({
          success: true,
          message: 'API key permanently deleted',
        });
      } else {
        // Soft delete - deactivate the key
        await prisma.orgApiKey.update({
          where: { id },
          data: {
            isActive: false,
            metadata: {
              ...(existingKey.metadata as object),
              revokedAt: new Date().toISOString(),
              revokedByAdminId: (req as any).admin?.id,
            },
          },
        });

        logger.warn('API key revoked by admin', {
          apiKeyId: id,
          organizationId: existingKey.organizationId,
          adminId: (req as any).admin?.id,
        });

        res.json({
          success: true,
          message: 'API key revoked successfully',
        });
      }
    } catch (error) {
      logger.error('Error revoking API key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key',
      });
    }
  }
);

// Rotate API key (generate new secret)
router.post(
  '/api-keys/:id/rotate',
  requirePermission('write:organizations'),
  auditAdminAction('admin:rotate_api_key'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if API key exists and is active
      const existingKey = await prisma.orgApiKey.findUnique({
        where: { id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!existingKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      if (!existingKey.isActive) {
        res.status(400).json({
          success: false,
          error: 'Cannot rotate a revoked API key',
        });
        return;
      }

      // Generate new API key
      const { key, prefix, hash } = generateApiKey();

      // Update metadata with rotation info
      const existingMetadata = (existingKey.metadata as ApiKeyMetadata) || {};
      const rotationCount = (existingMetadata.rotationCount || 0) + 1;
      const updatedMetadata: ApiKeyMetadata = {
        ...existingMetadata,
        lastRotatedAt: new Date().toISOString(),
        rotationCount,
      };

      // Update API key with new hash and prefix
      const apiKey = await prisma.orgApiKey.update({
        where: { id },
        data: {
          keyHash: hash,
          keyPrefix: prefix,
          metadata: updatedMetadata as Prisma.InputJsonValue,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.warn('API key rotated by admin', {
        apiKeyId: id,
        organizationId: existingKey.organizationId,
        adminId: (req as any).admin?.id,
        rotationCount,
      });

      // Return the new full key - it cannot be retrieved again
      const apiKeyWithOrg = apiKey as OrgApiKeyWithOrganization;
      res.json({
        success: true,
        data: {
          id: apiKeyWithOrg.id,
          name: apiKeyWithOrg.name,
          key, // New full key - shown only once
          keyPrefix: apiKeyWithOrg.keyPrefix,
          organizationId: apiKeyWithOrg.organizationId,
          organization: apiKeyWithOrg.organization,
          scopes: apiKeyWithOrg.scopes,
          rotationCount,
        },
        message: 'API key rotated successfully. Save the new key now - it cannot be retrieved again.',
      });
    } catch (error) {
      logger.error('Error rotating API key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to rotate API key',
      });
    }
  }
);

// Get usage statistics for specific API key
router.get(
  '/api-keys/:id/usage',
  requirePermission('read:organizations'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const period = (req.query.period as string) || '30d';

      // Calculate date range based on period
      let startDate: Date;
      const now = new Date();
      switch (period) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }

      // Check if API key exists
      const apiKey = await prisma.orgApiKey.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          organizationId: true,
          metadata: true,
        },
      });

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      // Get total requests in period
      const totalRequests = await prisma.auditLog.count({
        where: {
          apiKeyId: id,
          createdAt: { gte: startDate },
        },
      });

      // Get requests by status code
      const requestsByStatus = await prisma.auditLog.groupBy({
        by: ['responseStatus'],
        where: {
          apiKeyId: id,
          createdAt: { gte: startDate },
        },
        _count: true,
      });

      // Get requests by endpoint
      const requestsByEndpoint = await prisma.auditLog.groupBy({
        by: ['endpoint'],
        where: {
          apiKeyId: id,
          createdAt: { gte: startDate },
          endpoint: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            endpoint: 'desc',
          },
        },
        take: 10,
      });

      // Get requests by method
      const requestsByMethod = await prisma.auditLog.groupBy({
        by: ['method'],
        where: {
          apiKeyId: id,
          createdAt: { gte: startDate },
          method: { not: null },
        },
        _count: true,
      });

      // Get daily request counts for chart
      const dailyRequests = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_logs
        WHERE api_key_id = ${id}
          AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      // Calculate success rate
      const successfulRequests = requestsByStatus
        .filter((s) => s.responseStatus && s.responseStatus >= 200 && s.responseStatus < 400)
        .reduce((sum, s) => sum + s._count, 0);
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

      // Calculate error rate
      const errorRequests = requestsByStatus
        .filter((s) => s.responseStatus && s.responseStatus >= 400)
        .reduce((sum, s) => sum + s._count, 0);
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

      const metadata = apiKey.metadata as ApiKeyMetadata;

      res.json({
        success: true,
        data: {
          apiKeyId: id,
          apiKeyName: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          summary: {
            totalRequests,
            successfulRequests,
            errorRequests,
            successRate: Math.round(successRate * 100) / 100,
            errorRate: Math.round(errorRate * 100) / 100,
            rateLimit: metadata?.rateLimit || DEFAULT_RATE_LIMIT,
            rateLimitWindow: metadata?.rateLimitWindow || '1h',
          },
          breakdown: {
            byStatus: requestsByStatus.map((s) => ({
              status: s.responseStatus,
              count: s._count,
            })),
            byEndpoint: requestsByEndpoint.map((e) => ({
              endpoint: e.endpoint,
              count: e._count,
            })),
            byMethod: requestsByMethod.map((m) => ({
              method: m.method,
              count: m._count,
            })),
          },
          timeline: dailyRequests.map((d) => ({
            date: d.date,
            count: Number(d.count),
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching API key usage', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch API key usage',
      });
    }
  }
);

// Platform-wide API usage overview
router.get(
  '/usage/overview',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || '30d';

      // Calculate date range
      let startDate: Date;
      const now = new Date();
      switch (period) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get total API keys stats
      const [totalKeys, activeKeys, expiredKeys] = await Promise.all([
        prisma.orgApiKey.count(),
        prisma.orgApiKey.count({ where: { isActive: true } }),
        prisma.orgApiKey.count({
          where: {
            OR: [
              { isActive: false },
              { expiresAt: { lt: now } },
            ],
          },
        }),
      ]);

      // Get total API requests in period
      const totalRequests = await prisma.auditLog.count({
        where: {
          apiKeyId: { not: null },
          createdAt: { gte: startDate },
        },
      });

      // Get requests by organization
      const requestsByOrg = await prisma.$queryRaw<{ organization_id: string; org_name: string; count: bigint }[]>`
        SELECT
          o.id as organization_id,
          o.name as org_name,
          COUNT(a.id) as count
        FROM audit_logs a
        INNER JOIN org_api_keys k ON a.api_key_id = k.id
        INNER JOIN organizations o ON k.organization_id = o.id
        WHERE a.api_key_id IS NOT NULL
          AND a.created_at >= ${startDate}
        GROUP BY o.id, o.name
        ORDER BY count DESC
        LIMIT 10
      `;

      // Get most active API keys
      const mostActiveKeys = await prisma.$queryRaw<{ api_key_id: string; key_name: string; org_name: string; count: bigint }[]>`
        SELECT
          k.id as api_key_id,
          k.name as key_name,
          o.name as org_name,
          COUNT(a.id) as count
        FROM audit_logs a
        INNER JOIN org_api_keys k ON a.api_key_id = k.id
        INNER JOIN organizations o ON k.organization_id = o.id
        WHERE a.api_key_id IS NOT NULL
          AND a.created_at >= ${startDate}
        GROUP BY k.id, k.name, o.name
        ORDER BY count DESC
        LIMIT 10
      `;

      // Get error rate by status code
      const errorsByStatus = await prisma.auditLog.groupBy({
        by: ['responseStatus'],
        where: {
          apiKeyId: { not: null },
          createdAt: { gte: startDate },
          responseStatus: { gte: 400 },
        },
        _count: true,
        orderBy: {
          _count: {
            responseStatus: 'desc',
          },
        },
      });

      // Get daily request trend
      const dailyTrend = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_logs
        WHERE api_key_id IS NOT NULL
          AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      // Get recently created API keys
      const recentlyCreatedKeys = await prisma.orgApiKey.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Calculate total errors
      const totalErrors = errorsByStatus.reduce((sum, e) => sum + e._count, 0);
      const platformErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      res.json({
        success: true,
        data: {
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          summary: {
            totalApiKeys: totalKeys,
            activeApiKeys: activeKeys,
            expiredOrRevokedKeys: expiredKeys,
            totalRequests,
            totalErrors,
            platformErrorRate: Math.round(platformErrorRate * 100) / 100,
          },
          topOrganizations: requestsByOrg.map((r) => ({
            organizationId: r.organization_id,
            organizationName: r.org_name,
            requestCount: Number(r.count),
          })),
          mostActiveKeys: mostActiveKeys.map((k) => ({
            apiKeyId: k.api_key_id,
            keyName: k.key_name,
            organizationName: k.org_name,
            requestCount: Number(k.count),
          })),
          errorBreakdown: errorsByStatus.map((e) => ({
            statusCode: e.responseStatus,
            count: e._count,
          })),
          dailyTrend: dailyTrend.map((d) => ({
            date: d.date,
            count: Number(d.count),
          })),
          recentlyCreatedKeys: recentlyCreatedKeys.map((k) => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.keyPrefix,
            organization: k.organization,
            createdAt: k.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching platform API usage overview', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch platform API usage overview',
      });
    }
  }
);

// Update rate limits for specific API key
router.put(
  '/api-keys/:id/rate-limit',
  requirePermission('write:organizations'),
  auditAdminAction('admin:update_api_key_rate_limit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rateLimit, rateLimitWindow, allowedIps } = req.body;

      // Validate rate limit
      if (rateLimit !== undefined && (typeof rateLimit !== 'number' || rateLimit < 0)) {
        res.status(400).json({
          success: false,
          error: 'Rate limit must be a non-negative number',
        });
        return;
      }

      // Validate rate limit window
      const validWindows = ['1m', '5m', '15m', '1h', '24h'];
      if (rateLimitWindow && !validWindows.includes(rateLimitWindow)) {
        res.status(400).json({
          success: false,
          error: `Rate limit window must be one of: ${validWindows.join(', ')}`,
        });
        return;
      }

      // Check if API key exists
      const existingKey = await prisma.orgApiKey.findUnique({
        where: { id },
      });

      if (!existingKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      // Update metadata with new rate limit settings
      const existingMetadata = (existingKey.metadata as ApiKeyMetadata) || {};
      const updatedMetadata: ApiKeyMetadata = {
        ...existingMetadata,
        ...(rateLimit !== undefined && { rateLimit }),
        ...(rateLimitWindow && { rateLimitWindow }),
        ...(allowedIps !== undefined && { allowedIps }),
      };

      const apiKey = await prisma.orgApiKey.update({
        where: { id },
        data: {
          metadata: updatedMetadata as Prisma.InputJsonValue,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.info('API key rate limit updated by admin', {
        apiKeyId: id,
        adminId: (req as any).admin?.id,
        newRateLimit: rateLimit,
        newWindow: rateLimitWindow,
      });

      const apiKeyWithOrg = apiKey as OrgApiKeyWithOrganization;
      res.json({
        success: true,
        data: {
          id: apiKeyWithOrg.id,
          name: apiKeyWithOrg.name,
          keyPrefix: apiKeyWithOrg.keyPrefix,
          organizationId: apiKeyWithOrg.organizationId,
          organization: apiKeyWithOrg.organization,
          rateLimit: updatedMetadata.rateLimit || DEFAULT_RATE_LIMIT,
          rateLimitWindow: updatedMetadata.rateLimitWindow || '1h',
          allowedIps: updatedMetadata.allowedIps || [],
          updatedAt: apiKeyWithOrg.updatedAt,
        },
        message: 'Rate limits updated successfully',
      });
    } catch (error) {
      logger.error('Error updating API key rate limit', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update rate limits',
      });
    }
  }
);

// Get available scopes
router.get(
  '/scopes/available',
  requirePermission('read:organizations'),
  async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        scopes: AVAILABLE_SCOPES,
        descriptions: {
          'meetings:read': 'Read meeting data',
          'meetings:write': 'Create and update meetings',
          'transcripts:read': 'Read transcript data',
          'transcripts:write': 'Create and update transcripts',
          'analytics:read': 'Read analytics data',
          'users:read': 'Read user data',
          'users:write': 'Create and update users',
          'webhooks:read': 'Read webhook configurations',
          'webhooks:write': 'Create and update webhooks',
          'recordings:read': 'Read recording data',
          'recordings:write': 'Create and upload recordings',
        },
      },
    });
  }
);

export default router;
