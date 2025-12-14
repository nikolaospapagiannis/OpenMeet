/**
 * Audit Query Service
 *
 * Provides comprehensive querying and filtering capabilities for audit logs.
 * Optimized for fast lookups with proper indexing.
 *
 * Features:
 * - Advanced filtering (by user, action, resource, date range)
 * - Full-text search
 * - Pagination
 * - Aggregations and analytics
 * - Export functionality
 */

import { PrismaClient, AuditLog, AuditStatus } from '@prisma/client';
import winston from 'winston';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'audit-query-service' },
  transports: [new winston.transports.Console()],
});

export interface AuditLogFilters {
  organizationId?: string;
  userId?: string;
  action?: string | string[];
  resourceType?: string;
  resourceId?: string;
  status?: AuditStatus | AuditStatus[];
  riskLevel?: string | string[];
  ipAddress?: string;

  // Date range
  startDate?: Date;
  endDate?: Date;

  // Compliance filters
  isGdprRelevant?: boolean;
  isHipaaRelevant?: boolean;
  isSoc2Relevant?: boolean;
  requiresReview?: boolean;

  // Search
  searchQuery?: string;

  // Pagination
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogResult {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class AuditQueryService {
  /**
   * Get audit logs with comprehensive filtering
   */
  static async getAuditLogs(filters: AuditLogFilters): Promise<AuditLogResult> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...whereFilters
    } = filters;

    const where = this.buildWhereClause(whereFilters);
    const skip = (page - 1) * limit;

    try {
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to query audit logs', { error, filters });
      throw new Error('Failed to query audit logs');
    }
  }

  /**
   * Get audit log by ID
   */
  static async getAuditLogById(id: string): Promise<AuditLog | null> {
    try {
      return await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get audit log', { error, id });
      throw new Error('Failed to get audit log');
    }
  }

  /**
   * Get user activity timeline
   */
  static async getUserActivity(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AuditLog[]> {
    try {
      const where: any = { userId };

      if (dateRange) {
        where.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      return await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 1000, // Limit for performance
      });
    } catch (error) {
      logger.error('Failed to get user activity', { error, userId });
      throw new Error('Failed to get user activity');
    }
  }

  /**
   * Get resource history (all actions on a specific resource)
   */
  static async getResourceHistory(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> {
    try {
      return await prisma.auditLog.findMany({
        where: {
          resourceType,
          resourceId,
        },
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
        orderBy: { createdAt: 'asc' }, // Chronological order
      });
    } catch (error) {
      logger.error('Failed to get resource history', { error, resourceType, resourceId });
      throw new Error('Failed to get resource history');
    }
  }

  /**
   * Get failed login attempts
   */
  static async getFailedLoginAttempts(
    dateRange: { start: Date; end: Date },
    organizationId?: string
  ): Promise<AuditLog[]> {
    try {
      const where: any = {
        action: 'login_failed',
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      return await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get failed login attempts', { error });
      throw new Error('Failed to get failed login attempts');
    }
  }

  /**
   * Get data access logs (GDPR/HIPAA)
   */
  static async getDataAccessLogs(
    dateRange: { start: Date; end: Date },
    organizationId?: string,
    complianceType?: 'gdpr' | 'hipaa' | 'soc2'
  ): Promise<AuditLog[]> {
    try {
      const where: any = {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      // Filter by compliance type
      if (complianceType === 'gdpr') {
        where.isGdprRelevant = true;
      } else if (complianceType === 'hipaa') {
        where.isHipaaRelevant = true;
      } else if (complianceType === 'soc2') {
        where.isSoc2Relevant = true;
      }

      return await prisma.auditLog.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get data access logs', { error });
      throw new Error('Failed to get data access logs');
    }
  }

  /**
   * Search audit logs by query string
   */
  static async searchAuditLogs(
    query: string,
    organizationId?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      // Simple search implementation
      // In production, you'd use full-text search (PostgreSQL FTS, Elasticsearch, etc.)
      const where: any = {
        OR: [
          { action: { contains: query, mode: 'insensitive' } },
          { actionLabel: { contains: query, mode: 'insensitive' } },
          { resourceType: { contains: query, mode: 'insensitive' } },
          { resourceId: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      return await prisma.auditLog.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to search audit logs', { error, query });
      throw new Error('Failed to search audit logs');
    }
  }

  /**
   * Get audit logs that require review
   */
  static async getLogsRequiringReview(organizationId?: string): Promise<AuditLog[]> {
    try {
      const where: any = {
        requiresReview: true,
        reviewedAt: null,
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      return await prisma.auditLog.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get logs requiring review', { error });
      throw new Error('Failed to get logs requiring review');
    }
  }

  /**
   * Mark audit log as reviewed
   */
  static async markAsReviewed(
    id: string,
    reviewedBy: string
  ): Promise<AuditLog> {
    try {
      return await prisma.auditLog.update({
        where: { id },
        data: {
          reviewedAt: new Date(),
          reviewedBy,
        },
      });
    } catch (error) {
      logger.error('Failed to mark as reviewed', { error, id });
      throw new Error('Failed to mark as reviewed');
    }
  }

  /**
   * Get audit statistics
   */
  static async getStatistics(
    organizationId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    try {
      const where: any = {};

      if (organizationId) {
        where.organizationId = organizationId;
      }

      if (dateRange) {
        where.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      const [
        total,
        byAction,
        byStatus,
        byRiskLevel,
        failedLogins,
        requiresReview,
      ] = await Promise.all([
        // Total count
        prisma.auditLog.count({ where }),

        // Count by action
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: true,
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),

        // Count by status
        prisma.auditLog.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),

        // Count by risk level
        prisma.auditLog.groupBy({
          by: ['riskLevel'],
          where,
          _count: true,
        }),

        // Failed login count
        prisma.auditLog.count({
          where: {
            ...where,
            action: 'login_failed',
          },
        }),

        // Logs requiring review
        prisma.auditLog.count({
          where: {
            ...where,
            requiresReview: true,
            reviewedAt: null,
          },
        }),
      ]);

      return {
        total,
        byAction,
        byStatus,
        byRiskLevel,
        failedLogins,
        requiresReview,
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      throw new Error('Failed to get audit statistics');
    }
  }

  /**
   * Get activity by day (for charts)
   */
  static async getActivityByDay(
    organizationId: string,
    days: number = 30
  ): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // This is a simplified version. In production, you'd use raw SQL for better performance
      const logs = await prisma.auditLog.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
          action: true,
        },
      });

      // Group by day
      const byDay = logs.reduce((acc, log) => {
        const day = log.createdAt.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { date: day, count: 0, actions: {} };
        }
        acc[day].count++;
        acc[day].actions[log.action] = (acc[day].actions[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, any>);

      return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Failed to get activity by day', { error });
      throw new Error('Failed to get activity by day');
    }
  }

  /**
   * Export audit logs to CSV
   */
  static async exportToCSV(filters: AuditLogFilters): Promise<string> {
    try {
      const where = this.buildWhereClause(filters);

      const logs = await prisma.auditLog.findMany({
        where,
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
        take: 10000, // Limit for performance
      });

      // Build CSV
      const headers = [
        'Timestamp',
        'User Email',
        'User Name',
        'Action',
        'Resource Type',
        'Resource ID',
        'Status',
        'IP Address',
        'Risk Level',
      ];

      const rows = logs.map((log) => [
        log.createdAt.toISOString(),
        log.user?.email || 'N/A',
        `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim() || 'N/A',
        log.actionLabel || log.action,
        log.resourceType || 'N/A',
        log.resourceId || 'N/A',
        log.status,
        log.ipAddress || 'N/A',
        log.riskLevel,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      return csv;
    } catch (error) {
      logger.error('Failed to export to CSV', { error });
      throw new Error('Failed to export to CSV');
    }
  }

  /**
   * Build Prisma where clause from filters
   */
  private static buildWhereClause(filters: Omit<AuditLogFilters, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): any {
    const where: any = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = Array.isArray(filters.action)
        ? { in: filters.action }
        : filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }

    if (filters.riskLevel) {
      where.riskLevel = Array.isArray(filters.riskLevel)
        ? { in: filters.riskLevel }
        : filters.riskLevel;
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters.isGdprRelevant !== undefined) {
      where.isGdprRelevant = filters.isGdprRelevant;
    }

    if (filters.isHipaaRelevant !== undefined) {
      where.isHipaaRelevant = filters.isHipaaRelevant;
    }

    if (filters.isSoc2Relevant !== undefined) {
      where.isSoc2Relevant = filters.isSoc2Relevant;
    }

    if (filters.requiresReview !== undefined) {
      where.requiresReview = filters.requiresReview;
    }

    if (filters.searchQuery) {
      where.OR = [
        { action: { contains: filters.searchQuery, mode: 'insensitive' } },
        { actionLabel: { contains: filters.searchQuery, mode: 'insensitive' } },
        { resourceType: { contains: filters.searchQuery, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}

export default AuditQueryService;
