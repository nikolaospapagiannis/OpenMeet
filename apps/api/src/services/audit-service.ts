/**
 * Audit Service - Fortune 100 Compliance-Grade Audit Logging
 *
 * Captures ALL user actions, system events, and data access for:
 * - GDPR compliance (right to access, data portability)
 * - SOC2 compliance (access control, monitoring)
 * - HIPAA compliance (PHI access tracking)
 *
 * Features:
 * - Immutable audit logs
 * - Comprehensive change tracking (before/after)
 * - Security risk assessment
 * - Compliance categorization
 */

import { PrismaClient, AuditStatus } from '@prisma/client';
import winston from 'winston';
import { Request } from 'express';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'audit-service' },
  transports: [new winston.transports.Console()],
});

export interface AuditLogData {
  organizationId?: string;
  userId?: string;
  action: string;
  actionLabel?: string;
  resourceType?: string;
  resourceId?: string;
  status?: AuditStatus;

  // Request details
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  queryParams?: any;
  requestBody?: any;
  responseStatus?: number;

  // Change tracking
  before?: any;
  after?: any;
  changes?: any;

  // Context
  sessionId?: string;
  apiKeyId?: string;
  impersonatedBy?: string;

  // Security
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  requiresReview?: boolean;

  // Metadata
  metadata?: any;
  duration?: number;
  errorMessage?: string;
  stackTrace?: string;

  // Compliance flags
  isGdprRelevant?: boolean;
  isHipaaRelevant?: boolean;
  isSoc2Relevant?: boolean;
}

export class AuditService {
  /**
   * Core logging function - ALL audit logs go through this
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      // Sanitize sensitive data
      const sanitizedData = this.sanitizeData(data);

      // Calculate retention period based on compliance requirements
      const retainUntil = this.calculateRetentionDate(data);

      await prisma.auditLog.create({
        data: {
          ...sanitizedData,
          retainUntil,
        },
      });

      // Log to application logger as well for real-time monitoring
      logger.info('Audit log created', {
        action: data.action,
        resourceType: data.resourceType,
        userId: data.userId,
      });
    } catch (error) {
      // CRITICAL: Audit logging failure should not break the application
      // But we must log it for investigation
      logger.error('CRITICAL: Audit log creation failed', {
        error,
        data: this.sanitizeData(data), // Still sanitize even for error logging
      });

      // In production, you might want to:
      // 1. Send alert to security team
      // 2. Write to backup audit log file
      // 3. Queue for retry
    }
  }

  /**
   * Log with automatic request context extraction
   */
  static async logFromRequest(
    req: Request,
    action: string,
    data: Partial<AuditLogData> = {}
  ): Promise<void> {
    const user = (req as any).user;

    await this.log({
      userId: user?.id,
      organizationId: user?.organizationId,
      action,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      method: req.method,
      endpoint: req.path,
      queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
      ...data,
    });
  }

  // ========================================================================
  // AUTHENTICATION & SESSION LOGGING
  // ========================================================================

  static async logLogin(
    userId: string,
    organizationId: string | undefined,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: success ? 'login' : 'login_failed',
      actionLabel: success ? 'User logged in' : 'Login attempt failed',
      status: success ? 'success' : 'failure',
      ipAddress,
      userAgent,
      riskLevel: success ? 'low' : 'medium',
      requiresReview: !success,
      isSoc2Relevant: true,
      metadata,
    });
  }

  static async logLogout(
    userId: string,
    organizationId: string | undefined,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'logout',
      actionLabel: 'User logged out',
      ipAddress,
      userAgent,
      isSoc2Relevant: true,
    });
  }

  static async logPasswordReset(
    userId: string,
    organizationId: string | undefined,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'password_reset',
      actionLabel: 'Password reset',
      ipAddress,
      userAgent,
      riskLevel: 'medium',
      requiresReview: true,
      isSoc2Relevant: true,
    });
  }

  static async logMfaChange(
    userId: string,
    organizationId: string | undefined,
    enabled: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: enabled ? 'mfa_enabled' : 'mfa_disabled',
      actionLabel: enabled ? 'MFA enabled' : 'MFA disabled',
      ipAddress,
      userAgent,
      riskLevel: enabled ? 'low' : 'high',
      requiresReview: !enabled,
      isSoc2Relevant: true,
    });
  }

  // ========================================================================
  // DATA OPERATIONS (CRUD)
  // ========================================================================

  static async logCreate(
    userId: string,
    organizationId: string | undefined,
    resourceType: string,
    resourceId: string,
    data: any,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'create',
      actionLabel: `Created ${resourceType}`,
      resourceType,
      resourceId,
      after: data,
      metadata,
      isSoc2Relevant: true,
      isGdprRelevant: this.isPersonalData(resourceType),
    });
  }

  static async logRead(
    userId: string,
    organizationId: string | undefined,
    resourceType: string,
    resourceId: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'read',
      actionLabel: `Accessed ${resourceType}`,
      resourceType,
      resourceId,
      metadata,
      isSoc2Relevant: true,
      isGdprRelevant: this.isPersonalData(resourceType),
      isHipaaRelevant: this.isPhiData(resourceType),
    });
  }

  static async logUpdate(
    userId: string,
    organizationId: string | undefined,
    resourceType: string,
    resourceId: string,
    before: any,
    after: any,
    metadata?: any
  ): Promise<void> {
    const changes = this.calculateChanges(before, after);

    await this.log({
      userId,
      organizationId,
      action: 'update',
      actionLabel: `Updated ${resourceType}`,
      resourceType,
      resourceId,
      before,
      after,
      changes,
      metadata,
      riskLevel: this.assessUpdateRisk(resourceType, changes),
      isSoc2Relevant: true,
      isGdprRelevant: this.isPersonalData(resourceType),
    });
  }

  static async logDelete(
    userId: string,
    organizationId: string | undefined,
    resourceType: string,
    resourceId: string,
    data: any,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'delete',
      actionLabel: `Deleted ${resourceType}`,
      resourceType,
      resourceId,
      before: data,
      riskLevel: 'high',
      requiresReview: true,
      metadata,
      isSoc2Relevant: true,
      isGdprRelevant: this.isPersonalData(resourceType),
    });
  }

  // ========================================================================
  // DATA ACCESS & EXPORT (GDPR/HIPAA)
  // ========================================================================

  static async logDataAccess(
    userId: string,
    organizationId: string | undefined,
    resourceType: string,
    resourceId: string,
    ipAddress?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'data_accessed',
      actionLabel: `Accessed sensitive data: ${resourceType}`,
      resourceType,
      resourceId,
      ipAddress,
      riskLevel: 'medium',
      metadata,
      isGdprRelevant: true,
      isHipaaRelevant: this.isPhiData(resourceType),
      isSoc2Relevant: true,
    });
  }

  static async logDataExport(
    userId: string,
    organizationId: string | undefined,
    dataType: string,
    recordCount: number,
    ipAddress?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'data_exported',
      actionLabel: `Exported ${recordCount} ${dataType} records`,
      resourceType: dataType,
      ipAddress,
      riskLevel: 'high',
      requiresReview: true,
      metadata: { recordCount, ...metadata },
      isGdprRelevant: true,
      isHipaaRelevant: this.isPhiData(dataType),
      isSoc2Relevant: true,
    });
  }

  static async logGdprRequest(
    userId: string,
    organizationId: string | undefined,
    requestType: 'access' | 'delete' | 'portability',
    ipAddress?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'gdpr_request',
      actionLabel: `GDPR ${requestType} request`,
      ipAddress,
      riskLevel: 'high',
      requiresReview: true,
      metadata: { requestType, ...metadata },
      isGdprRelevant: true,
      isSoc2Relevant: true,
    });
  }

  // ========================================================================
  // PERMISSION & ROLE CHANGES
  // ========================================================================

  static async logPermissionChange(
    userId: string,
    organizationId: string | undefined,
    targetUserId: string,
    permissionType: string,
    granted: boolean,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: granted ? 'permission_granted' : 'permission_revoked',
      actionLabel: `${granted ? 'Granted' : 'Revoked'} ${permissionType} permission`,
      resourceType: 'permission',
      resourceId: targetUserId,
      riskLevel: 'high',
      requiresReview: true,
      metadata: { targetUserId, permissionType, ...metadata },
      isSoc2Relevant: true,
    });
  }

  static async logRoleChange(
    userId: string,
    organizationId: string | undefined,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'user_role_changed',
      actionLabel: `Changed user role from ${oldRole} to ${newRole}`,
      resourceType: 'user',
      resourceId: targetUserId,
      before: { role: oldRole },
      after: { role: newRole },
      changes: { role: { from: oldRole, to: newRole } },
      riskLevel: 'critical',
      requiresReview: true,
      metadata: { targetUserId, ...metadata },
      isSoc2Relevant: true,
    });
  }

  // ========================================================================
  // INTEGRATION OPERATIONS
  // ========================================================================

  static async logIntegrationConnect(
    userId: string,
    organizationId: string | undefined,
    integrationType: string,
    integrationId: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'integration_connected',
      actionLabel: `Connected ${integrationType} integration`,
      resourceType: 'integration',
      resourceId: integrationId,
      riskLevel: 'medium',
      metadata: { integrationType, ...metadata },
      isSoc2Relevant: true,
    });
  }

  static async logIntegrationDisconnect(
    userId: string,
    organizationId: string | undefined,
    integrationType: string,
    integrationId: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'integration_disconnected',
      actionLabel: `Disconnected ${integrationType} integration`,
      resourceType: 'integration',
      resourceId: integrationId,
      riskLevel: 'medium',
      metadata: { integrationType, ...metadata },
      isSoc2Relevant: true,
    });
  }

  // ========================================================================
  // API KEY OPERATIONS
  // ========================================================================

  static async logApiKeyCreated(
    userId: string,
    organizationId: string | undefined,
    apiKeyId: string,
    apiKeyName: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'api_key_created',
      actionLabel: `Created API key: ${apiKeyName}`,
      resourceType: 'api_key',
      resourceId: apiKeyId,
      riskLevel: 'high',
      requiresReview: true,
      metadata: { apiKeyName, ...metadata },
      isSoc2Relevant: true,
    });
  }

  static async logApiKeyRevoked(
    userId: string,
    organizationId: string | undefined,
    apiKeyId: string,
    apiKeyName: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'api_key_revoked',
      actionLabel: `Revoked API key: ${apiKeyName}`,
      resourceType: 'api_key',
      resourceId: apiKeyId,
      riskLevel: 'medium',
      metadata: { apiKeyName, ...metadata },
      isSoc2Relevant: true,
    });
  }

  // ========================================================================
  // SECURITY EVENTS
  // ========================================================================

  static async logSuspiciousActivity(
    userId: string | undefined,
    organizationId: string | undefined,
    activityType: string,
    ipAddress?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'suspicious_activity',
      actionLabel: `Suspicious activity detected: ${activityType}`,
      ipAddress,
      riskLevel: 'critical',
      requiresReview: true,
      metadata: { activityType, ...metadata },
      isSoc2Relevant: true,
    });
  }

  static async logUnauthorizedAccess(
    userId: string | undefined,
    organizationId: string | undefined,
    resourceType: string,
    resourceId: string,
    ipAddress?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'unauthorized_access',
      actionLabel: `Unauthorized access attempt to ${resourceType}`,
      resourceType,
      resourceId,
      ipAddress,
      riskLevel: 'critical',
      requiresReview: true,
      status: 'failure',
      metadata,
      isSoc2Relevant: true,
    });
  }

  static async logRateLimitExceeded(
    userId: string | undefined,
    organizationId: string | undefined,
    endpoint: string,
    ipAddress?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'rate_limit_exceeded',
      actionLabel: `Rate limit exceeded for ${endpoint}`,
      endpoint,
      ipAddress,
      riskLevel: 'medium',
      status: 'failure',
      metadata,
      isSoc2Relevant: true,
    });
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Sanitize sensitive data before logging
   */
  private static sanitizeData(data: AuditLogData): any {
    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'mfaSecret',
    ];

    const sanitize = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      const sanitized = { ...obj };
      for (const key of Object.keys(sanitized)) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitize(sanitized[key]);
        }
      }
      return sanitized;
    };

    return {
      ...data,
      requestBody: data.requestBody ? sanitize(data.requestBody) : undefined,
      metadata: data.metadata ? sanitize(data.metadata) : undefined,
      before: data.before ? sanitize(data.before) : undefined,
      after: data.after ? sanitize(data.after) : undefined,
    };
  }

  /**
   * Calculate what changed between before and after
   */
  private static calculateChanges(before: any, after: any): any {
    if (!before || !after) return null;

    const changes: any = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = {
          from: before[key],
          to: after[key],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Assess risk level of update operation
   */
  private static assessUpdateRisk(resourceType: string, changes: any): 'low' | 'medium' | 'high' | 'critical' {
    const highRiskResources = ['user', 'permission', 'api_key', 'integration', 'billing'];
    const highRiskFields = ['role', 'permissions', 'isActive', 'subscriptionTier'];

    if (highRiskResources.includes(resourceType)) {
      return 'high';
    }

    if (changes) {
      const changedFields = Object.keys(changes);
      if (changedFields.some((field) => highRiskFields.includes(field))) {
        return 'high';
      }
    }

    return 'low';
  }

  /**
   * Check if resource type contains personal data (GDPR)
   */
  private static isPersonalData(resourceType: string): boolean {
    const personalDataTypes = ['user', 'profile', 'contact', 'participant', 'attendee'];
    return personalDataTypes.includes(resourceType.toLowerCase());
  }

  /**
   * Check if resource type contains PHI (HIPAA)
   */
  private static isPhiData(resourceType: string): boolean {
    // This would be customized based on your specific data types
    const phiDataTypes = ['medical', 'health', 'patient'];
    return phiDataTypes.includes(resourceType.toLowerCase());
  }

  /**
   * Calculate retention date based on compliance requirements
   */
  private static calculateRetentionDate(data: AuditLogData): Date | undefined {
    const now = new Date();
    let retentionDays = 365; // Default 1 year

    // GDPR: 6 years for personal data
    if (data.isGdprRelevant) {
      retentionDays = Math.max(retentionDays, 365 * 6);
    }

    // HIPAA: 6 years for PHI
    if (data.isHipaaRelevant) {
      retentionDays = Math.max(retentionDays, 365 * 6);
    }

    // SOC2: 1 year for access logs
    if (data.isSoc2Relevant) {
      retentionDays = Math.max(retentionDays, 365);
    }

    // High-risk events: 7 years
    if (data.riskLevel === 'critical' || data.riskLevel === 'high') {
      retentionDays = Math.max(retentionDays, 365 * 7);
    }

    const retentionDate = new Date(now);
    retentionDate.setDate(retentionDate.getDate() + retentionDays);
    return retentionDate;
  }
}

export default AuditService;
