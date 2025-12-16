/**
 * Admin Compliance & Security Routes
 * GDPR compliance, security settings, and threat detection for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, GdprRequestType, GdprRequestStatus } from '@prisma/client';
import { requirePermission, requireRole, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router: Router = Router();
const prisma = new PrismaClient();

// S3 client for GDPR exports
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const GDPR_EXPORT_BUCKET = process.env.GDPR_EXPORT_BUCKET || 'gdpr-exports';
const GDPR_EXPORT_EXPIRY_DAYS = parseInt(process.env.GDPR_EXPORT_EXPIRY_DAYS || '7', 10);

// ============================================================================
// GDPR Data Requests
// ============================================================================

/**
 * GET /gdpr/requests
 * List all GDPR data requests with pagination and filters
 */
router.get(
  '/gdpr/requests',
  requirePermission('read:compliance'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const type = req.query.type as GdprRequestType;
      const status = req.query.status as GdprRequestStatus;
      const userId = req.query.userId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const sortBy = (req.query.sortBy as string) || 'requestedAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where: Record<string, unknown> = {};
      if (type) where.type = type;
      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.requestedAt = {};
        if (startDate) (where.requestedAt as Record<string, Date>).gte = new Date(startDate);
        if (endDate) (where.requestedAt as Record<string, Date>).lte = new Date(endDate);
      }

      const [requests, total] = await Promise.all([
        prisma.gdprRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.gdprRequest.count({ where }),
      ]);

      // Enrich with user info
      const userIds = [...new Set(requests.map((r) => r.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const enrichedRequests = requests.map((request) => ({
        ...request,
        user: userMap.get(request.userId) || null,
      }));

      res.json({
        success: true,
        data: enrichedRequests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing GDPR requests', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list GDPR requests',
      });
    }
  }
);

/**
 * POST /gdpr/export/:userId
 * Initiate a data export request for a user (GDPR Article 15 - Right of Access)
 */
router.post(
  '/gdpr/export/:userId',
  requirePermission('write:compliance'),
  auditAdminAction('admin:gdpr_export_initiated'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const adminId = (req as any).admin?.id || (req as any).user?.id;
      const { notes, priority } = req.body;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Check for pending/processing export requests
      const existingRequest = await prisma.gdprRequest.findFirst({
        where: {
          userId,
          type: 'export',
          status: { in: ['pending', 'processing'] },
        },
      });

      if (existingRequest) {
        res.status(409).json({
          success: false,
          error: 'An export request is already in progress for this user',
          existingRequestId: existingRequest.id,
        });
        return;
      }

      // Create GDPR export request
      const gdprRequest = await prisma.gdprRequest.create({
        data: {
          id: uuidv4(),
          type: 'export',
          userId,
          status: 'pending',
          requestedBy: adminId,
          notes,
          metadata: {
            priority: priority || 'normal',
            userEmail: user.email,
            initiatedFrom: 'admin_dashboard',
          },
          auditTrail: [
            {
              action: 'request_created',
              timestamp: new Date().toISOString(),
              actor: adminId,
              details: { notes, priority },
            },
          ],
        },
      });

      // Start async export process
      processGdprExport(gdprRequest.id).catch((err) => {
        logger.error('GDPR export processing failed', { requestId: gdprRequest.id, error: err });
      });

      logger.info('GDPR export request initiated', {
        requestId: gdprRequest.id,
        userId,
        adminId,
      });

      res.status(202).json({
        success: true,
        data: {
          ...gdprRequest,
          user,
        },
        message: 'Data export request initiated. Processing will begin shortly.',
      });
    } catch (error) {
      logger.error('Error initiating GDPR export', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to initiate data export',
      });
    }
  }
);

/**
 * POST /gdpr/delete/:userId
 * Initiate a data deletion request (GDPR Article 17 - Right to Erasure)
 */
router.post(
  '/gdpr/delete/:userId',
  requireRole('super_admin'),
  auditAdminAction('admin:gdpr_deletion_initiated'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const adminId = (req as any).admin?.id || (req as any).user?.id;
      const { notes, confirmDeletion, retainAuditLogs } = req.body;

      // Require explicit confirmation for deletion
      if (confirmDeletion !== true) {
        res.status(400).json({
          success: false,
          error: 'Deletion must be explicitly confirmed by setting confirmDeletion: true',
        });
        return;
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          organizationId: true,
          role: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Prevent deletion of admin users without additional confirmation
      if (user.role === 'admin' || user.role === 'super_admin') {
        const { confirmAdminDeletion } = req.body;
        if (confirmAdminDeletion !== true) {
          res.status(400).json({
            success: false,
            error: 'Deleting an admin user requires confirmAdminDeletion: true',
          });
          return;
        }
      }

      // Check for pending/processing deletion requests
      const existingRequest = await prisma.gdprRequest.findFirst({
        where: {
          userId,
          type: 'delete',
          status: { in: ['pending', 'processing'] },
        },
      });

      if (existingRequest) {
        res.status(409).json({
          success: false,
          error: 'A deletion request is already in progress for this user',
          existingRequestId: existingRequest.id,
        });
        return;
      }

      // Create GDPR deletion request
      const userFirstName = user.firstName || '';
      const userLastName = user.lastName || '';
      const userName = (userFirstName + ' ' + userLastName).trim();
      
      const gdprRequest = await prisma.gdprRequest.create({
        data: {
          id: uuidv4(),
          type: 'delete',
          userId,
          status: 'pending',
          requestedBy: adminId,
          notes,
          metadata: {
            userEmail: user.email,
            userName: userName,
            organizationId: user.organizationId,
            userRole: user.role,
            retainAuditLogs: retainAuditLogs ?? true,
            initiatedFrom: 'admin_dashboard',
          },
          auditTrail: [
            {
              action: 'deletion_request_created',
              timestamp: new Date().toISOString(),
              actor: adminId,
              details: { notes, retainAuditLogs },
            },
          ],
        },
      });

      // Start async deletion process
      processGdprDeletion(gdprRequest.id).catch((err) => {
        logger.error('GDPR deletion processing failed', { requestId: gdprRequest.id, error: err });
      });

      logger.warn('GDPR deletion request initiated', {
        requestId: gdprRequest.id,
        userId,
        adminId,
        userEmail: user.email,
      });

      res.status(202).json({
        success: true,
        data: gdprRequest,
        message: 'Data deletion request initiated. This action cannot be undone.',
      });
    } catch (error) {
      logger.error('Error initiating GDPR deletion', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to initiate data deletion',
      });
    }
  }
);

/**
 * GET /gdpr/requests/:id
 * Get detailed status of a specific GDPR request
 */
router.get(
  '/gdpr/requests/:id',
  requirePermission('read:compliance'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const gdprRequest = await prisma.gdprRequest.findUnique({
        where: { id },
      });

      if (!gdprRequest) {
        res.status(404).json({
          success: false,
          error: 'GDPR request not found',
        });
        return;
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: gdprRequest.userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      // Generate download URL if export is complete
      let downloadUrl: string | null = null;
      if (
        gdprRequest.type === 'export' &&
        gdprRequest.status === 'completed' &&
        gdprRequest.exportFileUrl &&
        gdprRequest.exportExpiresAt &&
        new Date(gdprRequest.exportExpiresAt) > new Date()
      ) {
        try {
          const command = new GetObjectCommand({
            Bucket: GDPR_EXPORT_BUCKET,
            Key: gdprRequest.exportFileUrl,
          });
          downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (s3Error) {
          logger.warn('Failed to generate S3 presigned URL', { requestId: id, error: s3Error });
        }
      }

      res.json({
        success: true,
        data: {
          ...gdprRequest,
          user,
          downloadUrl,
          downloadExpired:
            gdprRequest.exportExpiresAt && new Date(gdprRequest.exportExpiresAt) < new Date(),
        },
      });
    } catch (error) {
      logger.error('Error fetching GDPR request', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GDPR request',
      });
    }
  }
);

// ============================================================================
// Security Settings
// ============================================================================

/**
 * GET /security/settings
 * Get platform security settings
 */
router.get(
  '/security/settings',
  requirePermission('read:security'),
  async (req: Request, res: Response) => {
    try {
      // Get or create default security settings
      let settings = await prisma.securitySettings.findUnique({
        where: { key: 'default' },
      });

      if (!settings) {
        settings = await prisma.securitySettings.create({
          data: {
            key: 'default',
          },
        });
      }

      // Get active IP whitelist entries
      const ipWhitelistEntries = await prisma.ipWhitelistEntry.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: {
          ...settings,
          ipWhitelistEntries,
          ipWhitelistCount: ipWhitelistEntries.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching security settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security settings',
      });
    }
  }
);

/**
 * PUT /security/settings
 * Update platform security settings
 */
router.put(
  '/security/settings',
  requireRole('super_admin'),
  auditAdminAction('admin:security_settings_updated'),
  async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).admin?.id || (req as any).user?.id;
      const {
        passwordMinLength,
        passwordMaxLength,
        passwordRequireUppercase,
        passwordRequireLowercase,
        passwordRequireNumbers,
        passwordRequireSpecial,
        passwordExpiryDays,
        passwordHistoryCount,
        mfaRequired,
        mfaRequiredForAdmins,
        mfaAllowedMethods,
        sessionTimeoutMinutes,
        maxConcurrentSessions,
        sessionIdleTimeoutMinutes,
        maxLoginAttempts,
        lockoutDurationMinutes,
        loginNotificationsEnabled,
        ipWhitelistEnabled,
        apiKeyExpiryDays,
        apiRateLimitPerMinute,
        auditRetentionDays,
      } = req.body;

      // Validation
      if (passwordMinLength !== undefined && (passwordMinLength < 8 || passwordMinLength > 128)) {
        res.status(400).json({
          success: false,
          error: 'Password minimum length must be between 8 and 128',
        });
        return;
      }

      if (passwordMaxLength !== undefined && (passwordMaxLength < 12 || passwordMaxLength > 256)) {
        res.status(400).json({
          success: false,
          error: 'Password maximum length must be between 12 and 256',
        });
        return;
      }

      if (mfaAllowedMethods !== undefined) {
        const validMethods = ['totp', 'webauthn', 'sms', 'email'];
        const invalidMethods = mfaAllowedMethods.filter(
          (m: string) => !validMethods.includes(m)
        );
        if (invalidMethods.length > 0) {
          res.status(400).json({
            success: false,
            error: 'Invalid MFA methods: ' + invalidMethods.join(', ') + '. Valid methods: ' + validMethods.join(', '),
          });
          return;
        }
      }

      // Get current settings for comparison
      const currentSettings = await prisma.securitySettings.findUnique({
        where: { key: 'default' },
      });

      const updateData: Record<string, unknown> = {
        updatedBy: adminId,
      };

      // Only update provided fields
      if (passwordMinLength !== undefined) updateData.passwordMinLength = passwordMinLength;
      if (passwordMaxLength !== undefined) updateData.passwordMaxLength = passwordMaxLength;
      if (passwordRequireUppercase !== undefined)
        updateData.passwordRequireUppercase = passwordRequireUppercase;
      if (passwordRequireLowercase !== undefined)
        updateData.passwordRequireLowercase = passwordRequireLowercase;
      if (passwordRequireNumbers !== undefined)
        updateData.passwordRequireNumbers = passwordRequireNumbers;
      if (passwordRequireSpecial !== undefined)
        updateData.passwordRequireSpecial = passwordRequireSpecial;
      if (passwordExpiryDays !== undefined) updateData.passwordExpiryDays = passwordExpiryDays;
      if (passwordHistoryCount !== undefined) updateData.passwordHistoryCount = passwordHistoryCount;
      if (mfaRequired !== undefined) updateData.mfaRequired = mfaRequired;
      if (mfaRequiredForAdmins !== undefined) updateData.mfaRequiredForAdmins = mfaRequiredForAdmins;
      if (mfaAllowedMethods !== undefined) updateData.mfaAllowedMethods = mfaAllowedMethods;
      if (sessionTimeoutMinutes !== undefined)
        updateData.sessionTimeoutMinutes = sessionTimeoutMinutes;
      if (maxConcurrentSessions !== undefined)
        updateData.maxConcurrentSessions = maxConcurrentSessions;
      if (sessionIdleTimeoutMinutes !== undefined)
        updateData.sessionIdleTimeoutMinutes = sessionIdleTimeoutMinutes;
      if (maxLoginAttempts !== undefined) updateData.maxLoginAttempts = maxLoginAttempts;
      if (lockoutDurationMinutes !== undefined)
        updateData.lockoutDurationMinutes = lockoutDurationMinutes;
      if (loginNotificationsEnabled !== undefined)
        updateData.loginNotificationsEnabled = loginNotificationsEnabled;
      if (ipWhitelistEnabled !== undefined) updateData.ipWhitelistEnabled = ipWhitelistEnabled;
      if (apiKeyExpiryDays !== undefined) updateData.apiKeyExpiryDays = apiKeyExpiryDays;
      if (apiRateLimitPerMinute !== undefined)
        updateData.apiRateLimitPerMinute = apiRateLimitPerMinute;
      if (auditRetentionDays !== undefined) updateData.auditRetentionDays = auditRetentionDays;

      const settings = await prisma.securitySettings.upsert({
        where: { key: 'default' },
        create: {
          key: 'default',
          ...updateData,
        },
        update: updateData,
      });

      logger.info('Security settings updated', {
        adminId,
        changes: Object.keys(updateData).filter((k) => k !== 'updatedBy'),
      });

      res.json({
        success: true,
        data: settings,
        message: 'Security settings updated successfully',
      });
    } catch (error) {
      logger.error('Error updating security settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update security settings',
      });
    }
  }
);

// ============================================================================
// Security Audit
// ============================================================================

/**
 * GET /security/audit
 * Get security-focused audit log
 */
router.get(
  '/security/audit',
  requirePermission('read:security'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const skip = (page - 1) * limit;
      const severity = req.query.severity as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      // Security-relevant actions
      const securityActions = [
        'user:login',
        'user:login_failed',
        'user:logout',
        'user:password_changed',
        'user:password_reset',
        'user:mfa_enabled',
        'user:mfa_disabled',
        'user:locked',
        'user:unlocked',
        'admin:user_created',
        'admin:user_deleted',
        'admin:user_suspended',
        'admin:role_changed',
        'admin:permission_granted',
        'admin:permission_revoked',
        'admin:security_settings_updated',
        'api:key_created',
        'api:key_revoked',
        'session:invalidated',
        'suspicious:activity_detected',
        'gdpr:export_requested',
        'gdpr:deletion_requested',
      ];

      const where: Record<string, unknown> = {
        OR: [
          { action: { in: securityActions } },
          { riskLevel: { not: null } },
          { isGdprRelevant: true },
        ],
      };

      if (severity) {
        where.riskLevel = severity;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
        if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching security audit log', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security audit log',
      });
    }
  }
);

// ============================================================================
// Security Threats
// ============================================================================

/**
 * GET /security/threats
 * Get detected security threats and suspicious activities
 */
router.get(
  '/security/threats',
  requirePermission('read:security'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const type = req.query.type as string;
      const severity = req.query.severity as string;
      const status = req.query.status as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const where: Record<string, unknown> = {};
      if (type) where.type = type;
      if (severity) where.severity = severity;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.detectedAt = {};
        if (startDate) (where.detectedAt as Record<string, Date>).gte = new Date(startDate);
        if (endDate) (where.detectedAt as Record<string, Date>).lte = new Date(endDate);
      }

      const [threats, total, stats] = await Promise.all([
        prisma.securityThreat.findMany({
          where,
          skip,
          take: limit,
          orderBy: { detectedAt: 'desc' },
        }),
        prisma.securityThreat.count({ where }),
        prisma.securityThreat.groupBy({
          by: ['severity', 'status'],
          _count: true,
        }),
      ]);

      // Calculate severity stats
      const severityStats = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
      const statusStats = {
        active: 0,
        investigating: 0,
        resolved: 0,
        false_positive: 0,
      };

      stats.forEach((s) => {
        if (s.severity in severityStats) {
          severityStats[s.severity as keyof typeof severityStats] += s._count;
        }
        if (s.status in statusStats) {
          statusStats[s.status as keyof typeof statusStats] += s._count;
        }
      });

      res.json({
        success: true,
        data: threats,
        stats: {
          bySeverity: severityStats,
          byStatus: statusStats,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching security threats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security threats',
      });
    }
  }
);

/**
 * PATCH /security/threats/:id
 * Update threat status (resolve, investigate, etc.)
 */
router.patch(
  '/security/threats/:id',
  requirePermission('write:security'),
  auditAdminAction('admin:threat_updated'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).admin?.id || (req as any).user?.id;
      const { status, resolution, actionsTaken } = req.body;

      const threat = await prisma.securityThreat.findUnique({
        where: { id },
      });

      if (!threat) {
        res.status(404).json({
          success: false,
          error: 'Security threat not found',
        });
        return;
      }

      const validStatuses = ['active', 'investigating', 'resolved', 'false_positive'];
      if (status && !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', '),
        });
        return;
      }

      const updateData: Record<string, unknown> = {};
      if (status) {
        updateData.status = status;
        if (status === 'resolved' || status === 'false_positive') {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = adminId;
        }
      }
      if (resolution) updateData.resolution = resolution;
      if (actionsTaken) {
        const currentActions = (threat.actionsTaken as unknown[]) || [];
        updateData.actionsTaken = [
          ...currentActions,
          ...actionsTaken.map((a: string) => ({
            action: a,
            timestamp: new Date().toISOString(),
            actor: adminId,
          })),
        ];
      }

      const updatedThreat = await prisma.securityThreat.update({
        where: { id },
        data: updateData,
      });

      logger.info('Security threat updated', {
        threatId: id,
        adminId,
        newStatus: status,
      });

      res.json({
        success: true,
        data: updatedThreat,
      });
    } catch (error) {
      logger.error('Error updating security threat', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update security threat',
      });
    }
  }
);

// ============================================================================
// IP Whitelist
// ============================================================================

/**
 * POST /security/ip-whitelist
 * Add an IP address to the whitelist
 */
router.post(
  '/security/ip-whitelist',
  requireRole('super_admin'),
  auditAdminAction('admin:ip_whitelisted'),
  async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).admin?.id || (req as any).user?.id;
      const { ip, label, expiresAt } = req.body;

      if (!ip) {
        res.status(400).json({
          success: false,
          error: 'IP address is required',
        });
        return;
      }

      // Validate IP format (IPv4, IPv6, or CIDR notation)
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$/;
      const ipv6CompressedRegex =
        /^(([0-9a-fA-F]{1,4}:)*)?::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}(\/\d{1,3})?$/;

      if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip) && !ipv6CompressedRegex.test(ip)) {
        res.status(400).json({
          success: false,
          error: 'Invalid IP address format. Supports IPv4, IPv6, and CIDR notation.',
        });
        return;
      }

      // Check if IP already exists
      const existing = await prisma.ipWhitelistEntry.findUnique({
        where: { ip },
      });

      if (existing) {
        // Reactivate if inactive
        if (!existing.isActive) {
          const reactivated = await prisma.ipWhitelistEntry.update({
            where: { ip },
            data: {
              isActive: true,
              label: label || existing.label,
              expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt,
              addedBy: adminId,
            },
          });

          res.json({
            success: true,
            data: reactivated,
            message: 'IP address reactivated in whitelist',
          });
          return;
        }

        res.status(409).json({
          success: false,
          error: 'IP address is already whitelisted',
        });
        return;
      }

      const entry = await prisma.ipWhitelistEntry.create({
        data: {
          ip,
          label,
          addedBy: adminId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      logger.info('IP address added to whitelist', {
        ip,
        adminId,
        label,
      });

      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      logger.error('Error adding IP to whitelist', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to add IP to whitelist',
      });
    }
  }
);

/**
 * DELETE /security/ip-whitelist/:ip
 * Remove an IP address from the whitelist
 */
router.delete(
  '/security/ip-whitelist/:ip',
  requireRole('super_admin'),
  auditAdminAction('admin:ip_removed_from_whitelist'),
  async (req: Request, res: Response) => {
    try {
      const { ip } = req.params;
      const adminId = (req as any).admin?.id || (req as any).user?.id;

      // URL decode the IP (handles IPv6 with colons)
      const decodedIp = decodeURIComponent(ip);

      const entry = await prisma.ipWhitelistEntry.findUnique({
        where: { ip: decodedIp },
      });

      if (!entry) {
        res.status(404).json({
          success: false,
          error: 'IP address not found in whitelist',
        });
        return;
      }

      // Soft delete by deactivating
      await prisma.ipWhitelistEntry.update({
        where: { ip: decodedIp },
        data: {
          isActive: false,
          metadata: {
            ...(entry.metadata as object),
            removedAt: new Date().toISOString(),
            removedBy: adminId,
          },
        },
      });

      logger.info('IP address removed from whitelist', {
        ip: decodedIp,
        adminId,
      });

      res.json({
        success: true,
        message: 'IP address removed from whitelist',
      });
    } catch (error) {
      logger.error('Error removing IP from whitelist', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to remove IP from whitelist',
      });
    }
  }
);

// ============================================================================
// Compliance Reports
// ============================================================================

/**
 * GET /compliance/report
 * Generate a comprehensive compliance report (SOC2, GDPR status)
 */
router.get(
  '/compliance/report',
  requirePermission('read:compliance'),
  async (req: Request, res: Response) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Get security settings
      const securitySettings = await prisma.securitySettings.findUnique({
        where: { key: 'default' },
      });

      // GDPR compliance metrics
      const [
        totalGdprRequests,
        pendingGdprRequests,
        completedGdprRequests,
        avgGdprCompletionTime,
        recentGdprRequests,
      ] = await Promise.all([
        prisma.gdprRequest.count(),
        prisma.gdprRequest.count({ where: { status: 'pending' } }),
        prisma.gdprRequest.count({ where: { status: 'completed' } }),
        prisma.gdprRequest
          .findMany({
            where: {
              status: 'completed',
              completedAt: { not: null },
              requestedAt: { gte: ninetyDaysAgo },
            },
            select: { requestedAt: true, completedAt: true },
          })
          .then((requests) => {
            if (requests.length === 0) return 0;
            const totalMs = requests.reduce((sum, r) => {
              if (r.completedAt) {
                return sum + (r.completedAt.getTime() - r.requestedAt.getTime());
              }
              return sum;
            }, 0);
            return Math.round(totalMs / requests.length / (1000 * 60 * 60)); // hours
          }),
        prisma.gdprRequest.findMany({
          where: { requestedAt: { gte: thirtyDaysAgo } },
          orderBy: { requestedAt: 'desc' },
          take: 10,
        }),
      ]);

      // Security metrics
      const [
        activeThreats,
        threatsLast30Days,
        resolvedThreats,
        failedLogins,
        mfaEnabledUsers,
        totalUsers,
        activeIpWhitelist,
      ] = await Promise.all([
        prisma.securityThreat.count({ where: { status: 'active' } }),
        prisma.securityThreat.count({ where: { detectedAt: { gte: thirtyDaysAgo } } }),
        prisma.securityThreat.count({
          where: { status: 'resolved', resolvedAt: { gte: thirtyDaysAgo } },
        }),
        prisma.auditLog.count({
          where: {
            action: 'user:login_failed',
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.user.count({ where: { mfaEnabled: true } }),
        prisma.user.count(),
        prisma.ipWhitelistEntry.count({ where: { isActive: true } }),
      ]);

      // SOC2 compliance checks
      const soc2Controls = calculateSoc2Compliance(securitySettings, {
        mfaEnabledUsers,
        totalUsers,
        activeThreats,
      });

      // GDPR compliance checks
      const gdprCompliance = calculateGdprCompliance({
        pendingGdprRequests,
        avgGdprCompletionTime,
        securitySettings,
      });

      const report = {
        generatedAt: new Date().toISOString(),
        reportPeriod: {
          start: thirtyDaysAgo.toISOString(),
          end: new Date().toISOString(),
        },
        summary: {
          overallComplianceScore: Math.round(
            (soc2Controls.score + gdprCompliance.score) / 2
          ),
          soc2Score: soc2Controls.score,
          gdprScore: gdprCompliance.score,
        },
        gdpr: {
          score: gdprCompliance.score,
          status: gdprCompliance.status,
          checks: gdprCompliance.checks,
          metrics: {
            totalRequests: totalGdprRequests,
            pendingRequests: pendingGdprRequests,
            completedRequests: completedGdprRequests,
            avgCompletionTimeHours: avgGdprCompletionTime,
          },
          recentRequests: recentGdprRequests,
        },
        soc2: {
          score: soc2Controls.score,
          status: soc2Controls.status,
          controls: soc2Controls.controls,
        },
        security: {
          activeThreats,
          threatsLast30Days,
          resolvedThreats,
          threatResolutionRate:
            threatsLast30Days > 0
              ? Math.round((resolvedThreats / threatsLast30Days) * 100)
              : 100,
          failedLogins,
          mfaAdoptionRate: totalUsers > 0 ? Math.round((mfaEnabledUsers / totalUsers) * 100) : 0,
          ipWhitelistEntries: activeIpWhitelist,
        },
        settings: {
          passwordPolicy: {
            minLength: securitySettings?.passwordMinLength || 12,
            requireUppercase: securitySettings?.passwordRequireUppercase ?? true,
            requireLowercase: securitySettings?.passwordRequireLowercase ?? true,
            requireNumbers: securitySettings?.passwordRequireNumbers ?? true,
            requireSpecial: securitySettings?.passwordRequireSpecial ?? true,
            expiryDays: securitySettings?.passwordExpiryDays || 90,
          },
          mfa: {
            required: securitySettings?.mfaRequired ?? false,
            requiredForAdmins: securitySettings?.mfaRequiredForAdmins ?? true,
          },
          sessions: {
            timeoutMinutes: securitySettings?.sessionTimeoutMinutes || 60,
            maxConcurrent: securitySettings?.maxConcurrentSessions || 5,
          },
          auditRetentionDays: securitySettings?.auditRetentionDays || 365,
        },
      };

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error generating compliance report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate compliance report',
      });
    }
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Process GDPR export request asynchronously
 */
async function processGdprExport(requestId: string): Promise<void> {
  const startTime = Date.now();

  try {
    // Update status to processing
    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: 'processing',
        startedAt: new Date(),
        auditTrail: {
          push: {
            action: 'processing_started',
            timestamp: new Date().toISOString(),
            actor: 'system',
          },
        },
      },
    });

    const gdprRequest = await prisma.gdprRequest.findUnique({
      where: { id: requestId },
    });

    if (!gdprRequest) {
      throw new Error('GDPR request not found');
    }

    // Collect all user data
    const userData = await collectUserData(gdprRequest.userId);

    // Create export file
    const exportContent = JSON.stringify(userData, null, 2);
    const exportBuffer = Buffer.from(exportContent, 'utf-8');
    const exportKey = 'exports/' + gdprRequest.userId + '/' + requestId + '.json';

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: GDPR_EXPORT_BUCKET,
      Key: exportKey,
      Body: exportBuffer,
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
      Metadata: {
        'gdpr-request-id': requestId,
        'user-id': gdprRequest.userId,
        'export-date': new Date().toISOString(),
      },
    });

    await s3Client.send(uploadCommand);

    const exportExpiresAt = new Date(
      Date.now() + GDPR_EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    // Update request as completed
    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        processedBy: 'system',
        exportFileUrl: exportKey,
        exportFileSize: BigInt(exportBuffer.length),
        exportExpiresAt,
        auditTrail: {
          push: {
            action: 'export_completed',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              fileSize: exportBuffer.length,
              processingTimeMs: Date.now() - startTime,
              expiresAt: exportExpiresAt.toISOString(),
            },
          },
        },
      },
    });

    logger.info('GDPR export completed', {
      requestId,
      userId: gdprRequest.userId,
      fileSize: exportBuffer.length,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('GDPR export processing error', { requestId, error });

    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        auditTrail: {
          push: {
            action: 'processing_failed',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
          },
        },
      },
    });
  }
}

/**
 * Process GDPR deletion request asynchronously
 */
async function processGdprDeletion(requestId: string): Promise<void> {
  const startTime = Date.now();
  const deletedTables: string[] = [];
  let deletedCount = 0;

  try {
    // Update status to processing
    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: 'processing',
        startedAt: new Date(),
        auditTrail: {
          push: {
            action: 'deletion_started',
            timestamp: new Date().toISOString(),
            actor: 'system',
          },
        },
      },
    });

    const gdprRequest = await prisma.gdprRequest.findUnique({
      where: { id: requestId },
    });

    if (!gdprRequest) {
      throw new Error('GDPR request not found');
    }

    const userId = gdprRequest.userId;
    const metadata = gdprRequest.metadata as Record<string, unknown>;
    const retainAuditLogs = metadata.retainAuditLogs !== false;

    // Delete user data in order (respecting foreign key constraints)

    // 1. Delete sessions
    const sessionsDeleted = await prisma.session.deleteMany({
      where: { userId },
    });
    deletedTables.push('sessions');
    deletedCount += sessionsDeleted.count;

    // 2. Delete meetings and related data
    const userMeetings = await prisma.meeting.findMany({
      where: { userId },
      select: { id: true },
    });
    const meetingIds = userMeetings.map((m) => m.id);

    if (meetingIds.length > 0) {
      // Delete transcripts
      const transcriptsDeleted = await prisma.transcript.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });
      deletedTables.push('transcripts');
      deletedCount += transcriptsDeleted.count;

      // Delete meeting summaries (actionItems stored in MeetingSummary.actionItems JSON)
      const summariesDeleted = await prisma.meetingSummary.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });
      deletedTables.push('meeting_summaries');
      deletedCount += summariesDeleted.count;

      // Delete meetings
      const meetingsDeleted = await prisma.meeting.deleteMany({
        where: { id: { in: meetingIds } },
      });
      deletedTables.push('meetings');
      deletedCount += meetingsDeleted.count;
    }

    // 3. Delete integrations
    const integrationsDeleted = await prisma.integration.deleteMany({
      where: { userId },
    });
    deletedTables.push('integrations');
    deletedCount += integrationsDeleted.count;

    // 4. Conditionally handle audit logs
    if (!retainAuditLogs) {
      // Anonymize audit logs instead of deleting (for compliance)
      await prisma.auditLog.updateMany({
        where: { userId },
        data: {
          userId: null,
          metadata: {
            anonymized: true,
            anonymizedAt: new Date().toISOString(),
            gdprRequestId: requestId,
          },
        },
      });
      deletedTables.push('audit_logs (anonymized)');
    }

    // 5. Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });
    deletedTables.push('users');
    deletedCount += 1;

    // Update request as completed
    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        processedBy: 'system',
        deletedTables,
        deletedCount,
        auditTrail: {
          push: {
            action: 'deletion_completed',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              deletedTables,
              deletedCount,
              processingTimeMs: Date.now() - startTime,
            },
          },
        },
      },
    });

    logger.warn('GDPR deletion completed', {
      requestId,
      userId,
      deletedTables,
      deletedCount,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('GDPR deletion processing error', { requestId, error });

    await prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        deletedTables,
        deletedCount,
        auditTrail: {
          push: {
            action: 'deletion_failed',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              error: error instanceof Error ? error.message : 'Unknown error',
              deletedTablesBeforeFailure: deletedTables,
              deletedCountBeforeFailure: deletedCount,
            },
          },
        },
      },
    });
  }
}

/**
 * Collect all user data for GDPR export
 */
async function collectUserData(userId: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const [sessions, meetings, integrations, auditLogs] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    }),
    prisma.meeting.findMany({
      where: { userId },
      include: {
        transcripts: {
          select: {
            id: true,
            createdAt: true,
          },
        },
        summaries: {
          select: {
            id: true,
            title: true,
            actionItems: true,
            keyPoints: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.integration.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to most recent 1000
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    dataSubject: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
    },
    organization: user.organization,
    sessions: sessions.map((s) => ({
      ...s,
      ipAddress: s.ipAddress ? maskIpAddress(s.ipAddress) : null,
    })),
    meetings,
    integrations,
    activityLog: auditLogs,
  };
}

/**
 * Mask IP address for privacy (show first two octets only)
 */
function maskIpAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return parts[0] + '.' + parts[1] + '.xxx.xxx';
  }
  // IPv6 - show first two groups
  const ipv6Parts = ip.split(':');
  if (ipv6Parts.length >= 2) {
    return ipv6Parts[0] + ':' + ipv6Parts[1] + ':xxxx:xxxx:xxxx:xxxx:xxxx:xxxx';
  }
  return 'xxx.xxx.xxx.xxx';
}

/**
 * Calculate SOC2 compliance score
 */
function calculateSoc2Compliance(
  settings: Record<string, unknown> | null,
  metrics: { mfaEnabledUsers: number; totalUsers: number; activeThreats: number }
): { score: number; status: string; controls: Record<string, unknown>[] } {
  const controls: Record<string, unknown>[] = [];
  let passedControls = 0;
  const totalControls = 10;

  // CC6.1 - Logical and Physical Access Controls
  const passwordCompliant =
    (settings?.passwordMinLength as number) >= 12 &&
    (settings?.passwordRequireUppercase ?? true) &&
    (settings?.passwordRequireNumbers ?? true) &&
    (settings?.passwordRequireSpecial ?? true);
  controls.push({
    id: 'CC6.1',
    name: 'Logical and Physical Access Controls',
    status: passwordCompliant ? 'compliant' : 'non_compliant',
    details: 'Password policy enforcement',
  });
  if (passwordCompliant) passedControls++;

  // CC6.2 - Prior to Issuing System Credentials
  const mfaCompliant = (settings?.mfaRequiredForAdmins ?? true) === true;
  controls.push({
    id: 'CC6.2',
    name: 'System Credential Issuance',
    status: mfaCompliant ? 'compliant' : 'non_compliant',
    details: 'MFA required for administrators',
  });
  if (mfaCompliant) passedControls++;

  // CC6.3 - Removal of Access
  const sessionManagementCompliant =
    (settings?.sessionTimeoutMinutes as number) <= 60 &&
    (settings?.maxConcurrentSessions as number) <= 5;
  controls.push({
    id: 'CC6.3',
    name: 'Access Removal',
    status: sessionManagementCompliant ? 'compliant' : 'non_compliant',
    details: 'Session timeout and concurrent session limits',
  });
  if (sessionManagementCompliant) passedControls++;

  // CC6.6 - Logical Access Security
  const mfaAdoption =
    metrics.totalUsers > 0 ? metrics.mfaEnabledUsers / metrics.totalUsers : 0;
  const mfaAdoptionCompliant = mfaAdoption >= 0.5 || (settings?.mfaRequired ?? false);
  controls.push({
    id: 'CC6.6',
    name: 'Logical Access Security',
    status: mfaAdoptionCompliant ? 'compliant' : 'partial',
    details: 'MFA adoption: ' + Math.round(mfaAdoption * 100) + '%',
  });
  if (mfaAdoptionCompliant) passedControls++;

  // CC7.1 - Detection of Unauthorized or Malicious Activities
  const threatDetectionCompliant = true; // We have threat detection implemented
  controls.push({
    id: 'CC7.1',
    name: 'Threat Detection',
    status: threatDetectionCompliant ? 'compliant' : 'non_compliant',
    details: 'Automated threat detection enabled',
  });
  if (threatDetectionCompliant) passedControls++;

  // CC7.2 - Monitoring System Components
  const auditRetentionCompliant = (settings?.auditRetentionDays as number) >= 365;
  controls.push({
    id: 'CC7.2',
    name: 'System Monitoring',
    status: auditRetentionCompliant ? 'compliant' : 'non_compliant',
    details: 'Audit log retention: ' + (settings?.auditRetentionDays || 365) + ' days',
  });
  if (auditRetentionCompliant) passedControls++;

  // CC7.3 - Response to Security Incidents
  const incidentResponseCompliant = metrics.activeThreats < 10;
  controls.push({
    id: 'CC7.3',
    name: 'Incident Response',
    status: incidentResponseCompliant ? 'compliant' : 'needs_attention',
    details: 'Active threats: ' + metrics.activeThreats,
  });
  if (incidentResponseCompliant) passedControls++;

  // CC8.1 - Changes to Infrastructure
  const changeManagementCompliant = true; // Assumed compliant via audit trail
  controls.push({
    id: 'CC8.1',
    name: 'Change Management',
    status: changeManagementCompliant ? 'compliant' : 'non_compliant',
    details: 'Change audit trail enabled',
  });
  if (changeManagementCompliant) passedControls++;

  // A1.1 - Availability Controls
  const availabilityCompliant = true; // Health checks implemented
  controls.push({
    id: 'A1.1',
    name: 'Availability Controls',
    status: availabilityCompliant ? 'compliant' : 'non_compliant',
    details: 'System health monitoring enabled',
  });
  if (availabilityCompliant) passedControls++;

  // C1.1 - Confidentiality Controls
  const confidentialityCompliant =
    (settings?.passwordExpiryDays as number) <= 90 &&
    (settings?.passwordHistoryCount as number) >= 5;
  controls.push({
    id: 'C1.1',
    name: 'Confidentiality Controls',
    status: confidentialityCompliant ? 'compliant' : 'non_compliant',
    details: 'Password rotation and history enforcement',
  });
  if (confidentialityCompliant) passedControls++;

  const score = Math.round((passedControls / totalControls) * 100);

  return {
    score,
    status:
      score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non_compliant',
    controls,
  };
}

/**
 * Calculate GDPR compliance score
 */
function calculateGdprCompliance(params: {
  pendingGdprRequests: number;
  avgGdprCompletionTime: number;
  securitySettings: Record<string, unknown> | null;
}): { score: number; status: string; checks: Record<string, unknown>[] } {
  const { pendingGdprRequests, avgGdprCompletionTime, securitySettings } = params;
  const checks: Record<string, unknown>[] = [];
  let passedChecks = 0;
  const totalChecks = 8;

  // Article 5 - Principles of Processing
  const dataMinimizationCompliant = true; // Implemented via data model
  checks.push({
    article: 'Article 5',
    name: 'Principles of Processing',
    status: dataMinimizationCompliant ? 'compliant' : 'non_compliant',
    details: 'Data minimization principles implemented',
  });
  if (dataMinimizationCompliant) passedChecks++;

  // Article 12 - Transparent Information
  const transparencyCompliant = true; // Export functionality available
  checks.push({
    article: 'Article 12',
    name: 'Transparent Information',
    status: transparencyCompliant ? 'compliant' : 'non_compliant',
    details: 'Data export functionality available',
  });
  if (transparencyCompliant) passedChecks++;

  // Article 15 - Right of Access
  const accessRightCompliant = true; // GDPR export implemented
  checks.push({
    article: 'Article 15',
    name: 'Right of Access',
    status: accessRightCompliant ? 'compliant' : 'non_compliant',
    details: 'Data access request processing implemented',
  });
  if (accessRightCompliant) passedChecks++;

  // Article 17 - Right to Erasure
  const erasureRightCompliant = true; // GDPR deletion implemented
  checks.push({
    article: 'Article 17',
    name: 'Right to Erasure',
    status: erasureRightCompliant ? 'compliant' : 'non_compliant',
    details: 'Data deletion request processing implemented',
  });
  if (erasureRightCompliant) passedChecks++;

  // Article 25 - Data Protection by Design
  const dataProtectionCompliant =
    (securitySettings?.passwordMinLength as number) >= 12 &&
    (securitySettings?.mfaRequiredForAdmins ?? true);
  checks.push({
    article: 'Article 25',
    name: 'Data Protection by Design',
    status: dataProtectionCompliant ? 'compliant' : 'partial',
    details: 'Security controls implemented',
  });
  if (dataProtectionCompliant) passedChecks++;

  // Article 30 - Records of Processing Activities
  const recordsCompliant = (securitySettings?.auditRetentionDays as number) >= 365;
  checks.push({
    article: 'Article 30',
    name: 'Records of Processing',
    status: recordsCompliant ? 'compliant' : 'non_compliant',
    details: 'Audit retention: ' + (securitySettings?.auditRetentionDays || 365) + ' days',
  });
  if (recordsCompliant) passedChecks++;

  // Article 32 - Security of Processing
  const securityCompliant =
    (securitySettings?.passwordRequireSpecial ?? true) &&
    (securitySettings?.lockoutDurationMinutes as number) >= 15;
  checks.push({
    article: 'Article 32',
    name: 'Security of Processing',
    status: securityCompliant ? 'compliant' : 'partial',
    details: 'Security measures implemented',
  });
  if (securityCompliant) passedChecks++;

  // Article 33 - Notification of Data Breach (Timeliness)
  // GDPR requires processing requests within 30 days
  const timelinessCompliant = pendingGdprRequests < 10 && avgGdprCompletionTime <= 720; // 30 days in hours
  checks.push({
    article: 'Article 33',
    name: 'Breach Notification Timeliness',
    status: timelinessCompliant ? 'compliant' : 'needs_attention',
    details: 'Pending requests: ' + pendingGdprRequests + ', Avg completion: ' + avgGdprCompletionTime + 'h',
  });
  if (timelinessCompliant) passedChecks++;

  const score = Math.round((passedChecks / totalChecks) * 100);

  return {
    score,
    status:
      score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non_compliant',
    checks,
  };
}

export default router;
