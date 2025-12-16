/**
 * Admin Logs Routes
 * Logging and audit trail for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();

// Get audit logs with filtering
router.get(
  '/audit',
  requirePermission('read:logs'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const skip = (page - 1) * limit;
      const userId = req.query.userId as string;
      const organizationId = req.query.organizationId as string;
      const action = req.query.action as string;
      const entityType = req.query.entityType as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const where: any = {};
      if (userId) where.userId = userId;
      if (organizationId) where.organizationId = organizationId;
      if (action) where.action = { contains: action, mode: 'insensitive' };
      if (entityType) where.entityType = entityType;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
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
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
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
      logger.error('Error fetching audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
      });
    }
  }
);

// Get single audit log entry
router.get(
  '/audit/:id',
  requirePermission('read:logs'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const log = await prisma.auditLog.findUnique({
        where: { id },
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
              slug: true,
            },
          },
        },
      });

      if (!log) {
        res.status(404).json({
          success: false,
          error: 'Audit log not found',
        });
        return;
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      logger.error('Error fetching audit log', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit log',
      });
    }
  }
);

// Get audit log statistics
router.get(
  '/audit/stats',
  requirePermission('read:logs'),
  async (req: Request, res: Response) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalLogs,
        logsToday,
        logsThisWeek,
        byAction,
        byEntityType,
      ] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        prisma.auditLog.count({
          where: { createdAt: { gte: oneWeekAgo } },
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: true,
          where: { createdAt: { gte: oneWeekAgo } },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
        prisma.auditLog.groupBy({
          by: ['entityType'],
          _count: true,
          where: { createdAt: { gte: oneWeekAgo } },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalLogs,
          logsToday,
          logsThisWeek,
          topActions: byAction.map((a) => ({
            action: a.action,
            count: a._count,
          })),
          entityTypes: byEntityType.map((e) => ({
            type: e.entityType,
            count: e._count,
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching audit stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit stats',
      });
    }
  }
);

// Search audit logs
router.get(
  '/audit/search',
  requirePermission('read:logs'),
  async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (!query || query.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters',
        });
        return;
      }

      const logs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: query, mode: 'insensitive' } },
            { entityType: { contains: query, mode: 'insensitive' } },
            { entityId: { contains: query, mode: 'insensitive' } },
            { ipAddress: { contains: query } },
          ],
        },
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
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('Error searching audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to search audit logs',
      });
    }
  }
);

// Export audit logs
router.get(
  '/audit/export',
  requirePermission('read:logs'),
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const format = req.query.format as string || 'json';

      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000, // Limit export to 10k records
        include: {
          user: {
            select: {
              id: true,
              email: true,
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

      if (format === 'csv') {
        const csv = [
          'id,timestamp,action,entityType,entityId,userId,userEmail,organizationId,organizationName,ipAddress',
          ...logs.map((log) =>
            [
              log.id,
              log.createdAt.toISOString(),
              log.action,
              log.entityType,
              log.entityId || '',
              log.userId || '',
              log.user?.email || '',
              log.organizationId || '',
              log.organization?.name || '',
              log.ipAddress || '',
            ].join(',')
          ),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
        );
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: logs,
          exportedAt: new Date().toISOString(),
          recordCount: logs.length,
        });
      }
    } catch (error) {
      logger.error('Error exporting audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export audit logs',
      });
    }
  }
);

// Get admin action logs
router.get(
  '/admin-actions',
  requirePermission('read:logs'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            action: { startsWith: 'admin:' },
          },
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
                systemRole: true,
              },
            },
          },
        }),
        prisma.auditLog.count({
          where: { action: { startsWith: 'admin:' } },
        }),
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
      logger.error('Error fetching admin action logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin action logs',
      });
    }
  }
);

export default router;
