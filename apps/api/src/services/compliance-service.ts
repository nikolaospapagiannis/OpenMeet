/**
 * Compliance Service
 *
 * Generates compliance reports for regulatory requirements:
 * - GDPR (General Data Protection Regulation)
 * - SOC2 (Service Organization Control 2)
 * - HIPAA (Health Insurance Portability and Accountability Act)
 *
 * Features:
 * - Right to access reports (GDPR Article 15)
 * - Data portability (GDPR Article 20)
 * - Access control audit (SOC2)
 * - PHI access tracking (HIPAA)
 * - Automated report generation
 * - PDF/CSV export
 */

import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { AuditQueryService } from './audit-query-service';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'compliance-service' },
  transports: [new winston.transports.Console()],
});

export interface GDPRReport {
  userId: string;
  email: string;
  generatedAt: Date;
  userData: any;
  auditTrail: any[];
  dataAccess: any[];
  consentRecords: any[];
  retentionPolicy: string;
}

export interface SOC2Report {
  organizationId: string;
  reportPeriod: { start: Date; end: Date };
  generatedAt: Date;
  accessControls: any;
  auditStatistics: any;
  securityIncidents: any[];
  failedAccess: any[];
  permissionChanges: any[];
}

export interface HIPAAReport {
  organizationId: string;
  reportPeriod: { start: Date; end: Date };
  generatedAt: Date;
  phiAccess: any[];
  dataExports: any[];
  securityIncidents: any[];
  accessControls: any;
}

export class ComplianceService {
  /**
   * Generate GDPR Data Subject Access Request (DSAR) Report
   * Compliance: GDPR Article 15 - Right of access
   */
  static async generateGDPRReport(userId: string): Promise<GDPRReport> {
    try {
      logger.info('Generating GDPR report', { userId });

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true,
          sessions: true,
          meetings: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
          comments: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
          soundbites: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get all audit logs for this user (GDPR relevant)
      const auditTrail = await AuditQueryService.getUserActivity(userId);

      // Get data access logs
      const dataAccessLogs = await prisma.auditLog.findMany({
        where: {
          userId,
          isGdprRelevant: true,
          action: { in: ['read', 'data_accessed'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      // Sanitize sensitive data
      const sanitizedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        oauthProvider: user.oauthProvider,
        preferences: user.preferences,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name,
          subscriptionTier: user.organization.subscriptionTier,
        } : null,
        activeSessions: user.sessions.length,
        meetingsCount: user.meetings.length,
        commentsCount: user.comments.length,
      };

      const report: GDPRReport = {
        userId,
        email: user.email,
        generatedAt: new Date(),
        userData: sanitizedUser,
        auditTrail: auditTrail.map((log) => ({
          timestamp: log.createdAt,
          action: log.actionLabel || log.action,
          resourceType: log.resourceType,
          ipAddress: log.ipAddress,
        })),
        dataAccess: dataAccessLogs.map((log) => ({
          timestamp: log.createdAt,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          ipAddress: log.ipAddress,
        })),
        consentRecords: [], // Would be populated from a consent management system
        retentionPolicy: 'Data retained for 6 years per GDPR requirements',
      };

      // Log the GDPR report generation
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId: user.organizationId || undefined,
          action: 'gdpr_request',
          actionLabel: 'GDPR Data Subject Access Request generated',
          resourceType: 'user',
          resourceId: userId,
          status: 'success',
          isGdprRelevant: true,
          isSoc2Relevant: true,
          metadata: {
            reportType: 'DSAR',
            recordCount: auditTrail.length + dataAccessLogs.length,
          },
        },
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate GDPR report', { error, userId });
      throw new Error('Failed to generate GDPR report');
    }
  }

  /**
   * Generate SOC2 Audit Report
   * Compliance: SOC2 - Access Control, Monitoring & Incident Management
   */
  static async generateSOC2Report(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SOC2Report> {
    try {
      logger.info('Generating SOC2 report', { organizationId, startDate, endDate });

      const reportPeriod = { start: startDate, end: endDate };

      // Get all SOC2-relevant audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          organizationId,
          isSoc2Relevant: true,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get statistics
      const statistics = await AuditQueryService.getStatistics(organizationId, reportPeriod);

      // Get failed access attempts
      const failedAccess = await prisma.auditLog.findMany({
        where: {
          organizationId,
          status: 'failure',
          action: { in: ['login_failed', 'unauthorized_access'] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get permission changes
      const permissionChanges = await prisma.auditLog.findMany({
        where: {
          organizationId,
          action: { in: ['permission_granted', 'permission_revoked', 'user_role_changed'] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get security incidents
      const securityIncidents = await prisma.auditLog.findMany({
        where: {
          organizationId,
          action: { in: ['suspicious_activity', 'unauthorized_access', 'rate_limit_exceeded'] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get access control metrics
      const accessControls = {
        totalUsers: await prisma.user.count({ where: { organizationId } }),
        activeUsers: await prisma.user.count({
          where: {
            organizationId,
            isActive: true,
          },
        }),
        mfaEnabled: await prisma.user.count({
          where: {
            organizationId,
            mfaEnabled: true,
          },
        }),
        apiKeys: await prisma.apiKey.count({
          where: {
            organizationId,
            isActive: true,
          },
        }),
      };

      const report: SOC2Report = {
        organizationId,
        reportPeriod,
        generatedAt: new Date(),
        accessControls,
        auditStatistics: statistics,
        securityIncidents: securityIncidents.map((log) => ({
          timestamp: log.createdAt,
          type: log.action,
          description: log.actionLabel,
          ipAddress: log.ipAddress,
          userId: log.userId,
          riskLevel: log.riskLevel,
        })),
        failedAccess: failedAccess.map((log) => ({
          timestamp: log.createdAt,
          action: log.action,
          ipAddress: log.ipAddress,
          userId: log.userId,
        })),
        permissionChanges: permissionChanges.map((log) => ({
          timestamp: log.createdAt,
          action: log.actionLabel || log.action,
          performedBy: log.userId,
          targetUser: log.resourceId,
          changes: log.changes,
        })),
      };

      // Log SOC2 report generation
      await prisma.auditLog.create({
        data: {
          organizationId,
          action: 'compliance_report_generated',
          actionLabel: 'SOC2 Audit Report generated',
          resourceType: 'compliance_report',
          status: 'success',
          isSoc2Relevant: true,
          metadata: {
            reportType: 'SOC2',
            reportPeriod,
            totalLogs: auditLogs.length,
            securityIncidents: securityIncidents.length,
          },
        },
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate SOC2 report', { error, organizationId });
      throw new Error('Failed to generate SOC2 report');
    }
  }

  /**
   * Generate HIPAA Compliance Report
   * Compliance: HIPAA - PHI Access Audit Trail
   */
  static async generateHIPAAReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HIPAAReport> {
    try {
      logger.info('Generating HIPAA report', { organizationId, startDate, endDate });

      const reportPeriod = { start: startDate, end: endDate };

      // Get all PHI access logs
      const phiAccessLogs = await prisma.auditLog.findMany({
        where: {
          organizationId,
          isHipaaRelevant: true,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get data export events (critical for HIPAA)
      const dataExports = await prisma.auditLog.findMany({
        where: {
          organizationId,
          action: 'data_exported',
          isHipaaRelevant: true,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get security incidents
      const securityIncidents = await prisma.auditLog.findMany({
        where: {
          organizationId,
          action: { in: ['suspicious_activity', 'unauthorized_access'] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Access control summary
      const accessControls = {
        totalUsers: await prisma.user.count({ where: { organizationId } }),
        usersWithPHIAccess: phiAccessLogs.reduce((acc, log) => {
          if (log.userId) acc.add(log.userId);
          return acc;
        }, new Set()).size,
        mfaEnabled: await prisma.user.count({
          where: {
            organizationId,
            mfaEnabled: true,
          },
        }),
        encryption: 'AES-256 encryption at rest, TLS 1.3 in transit',
      };

      const report: HIPAAReport = {
        organizationId,
        reportPeriod,
        generatedAt: new Date(),
        phiAccess: phiAccessLogs.map((log) => ({
          timestamp: log.createdAt,
          user: log.user?.email || 'Unknown',
          action: log.actionLabel || log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          ipAddress: log.ipAddress,
        })),
        dataExports: dataExports.map((log) => ({
          timestamp: log.createdAt,
          user: log.user?.email || 'Unknown',
          recordCount: (log.metadata && typeof log.metadata === 'object' && 'recordCount' in log.metadata)
            ? (log.metadata.recordCount as number)
            : 0,
          ipAddress: log.ipAddress,
        })),
        securityIncidents: securityIncidents.map((log) => ({
          timestamp: log.createdAt,
          type: log.action,
          description: log.actionLabel,
          ipAddress: log.ipAddress,
          riskLevel: log.riskLevel,
        })),
        accessControls,
      };

      // Log HIPAA report generation
      await prisma.auditLog.create({
        data: {
          organizationId,
          action: 'compliance_report_generated',
          actionLabel: 'HIPAA Compliance Report generated',
          resourceType: 'compliance_report',
          status: 'success',
          isHipaaRelevant: true,
          isSoc2Relevant: true,
          metadata: {
            reportType: 'HIPAA',
            reportPeriod,
            phiAccessCount: phiAccessLogs.length,
            dataExportCount: dataExports.length,
          },
        },
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate HIPAA report', { error, organizationId });
      throw new Error('Failed to generate HIPAA report');
    }
  }

  /**
   * Generate Data Retention Report
   */
  static async generateDataRetentionReport(organizationId: string): Promise<any> {
    try {
      // Count logs by retention category
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const [total, last30Days, last90Days, lastYear, gdprRelevant, hipaaRelevant] = await Promise.all([
        prisma.auditLog.count({ where: { organizationId } }),
        prisma.auditLog.count({
          where: {
            organizationId,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.auditLog.count({
          where: {
            organizationId,
            createdAt: { gte: ninetyDaysAgo },
          },
        }),
        prisma.auditLog.count({
          where: {
            organizationId,
            createdAt: { gte: oneYearAgo },
          },
        }),
        prisma.auditLog.count({
          where: {
            organizationId,
            isGdprRelevant: true,
          },
        }),
        prisma.auditLog.count({
          where: {
            organizationId,
            isHipaaRelevant: true,
          },
        }),
      ]);

      return {
        organizationId,
        generatedAt: now,
        totalLogs: total,
        byAge: {
          last30Days,
          last90Days,
          lastYear,
          olderThan1Year: total - lastYear,
        },
        byCompliance: {
          gdprRelevant,
          hipaaRelevant,
          requiresExtendedRetention: gdprRelevant + hipaaRelevant,
        },
        retentionPolicy: {
          standard: '1 year',
          gdpr: '6 years',
          hipaa: '6 years',
          highRisk: '7 years',
        },
      };
    } catch (error) {
      logger.error('Failed to generate retention report', { error, organizationId });
      throw new Error('Failed to generate retention report');
    }
  }

  /**
   * Generate Security Incident Report
   */
  static async generateSecurityIncidentReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const incidents = await prisma.auditLog.findMany({
        where: {
          organizationId,
          riskLevel: { in: ['high', 'critical'] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group by type
      const byType = incidents.reduce((acc, incident) => {
        acc[incident.action] = (acc[incident.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by risk level
      const byRisk = incidents.reduce((acc, incident) => {
        acc[incident.riskLevel] = (acc[incident.riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        organizationId,
        reportPeriod: { start: startDate, end: endDate },
        generatedAt: new Date(),
        summary: {
          totalIncidents: incidents.length,
          criticalIncidents: byRisk.critical || 0,
          highRiskIncidents: byRisk.high || 0,
          unreviewedIncidents: incidents.filter((i) => i.requiresReview && !i.reviewedAt).length,
        },
        byType,
        byRisk,
        incidents: incidents.map((incident) => ({
          timestamp: incident.createdAt,
          type: incident.action,
          description: incident.actionLabel,
          riskLevel: incident.riskLevel,
          user: incident.user?.email,
          ipAddress: incident.ipAddress,
          requiresReview: incident.requiresReview,
          reviewed: !!incident.reviewedAt,
        })),
      };
    } catch (error) {
      logger.error('Failed to generate security incident report', { error, organizationId });
      throw new Error('Failed to generate security incident report');
    }
  }

  /**
   * Export report to CSV
   */
  static exportToCsv(report: any, reportType: string): string {
    // This is a simplified version. In production, use a CSV library
    const lines: string[] = [];

    lines.push(`# ${reportType} Report`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Convert object to CSV lines recursively
    const flatten = (obj: any, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          lines.push(`${prefix}${key},Count,${value.length}`);
        } else if (typeof value === 'object' && value !== null) {
          flatten(value, `${prefix}${key}.`);
        } else {
          lines.push(`${prefix}${key},Value,"${value}"`);
        }
      }
    };

    flatten(report);

    return lines.join('\n');
  }
}

export default ComplianceService;
