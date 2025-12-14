/**
 * Admin Alerts Routes
 * Alerting system for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Alert severity levels
type AlertSeverity = 'critical' | 'warning' | 'info';

// In-memory alert store (in production, use Redis or database)
interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

// Alert store using audit logs for persistence
const ALERT_ENTITY_TYPE = 'system_alert';

// Get all active alerts
router.get(
  '/',
  requirePermission('read:alerts'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const severity = req.query.severity as AlertSeverity;
      const acknowledged = req.query.acknowledged === 'true';

      // Get alerts from audit logs
      const where: any = {
        entityType: ALERT_ENTITY_TYPE,
      };

      if (severity) {
        where.action = { contains: severity };
      }

      const [alerts, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      // Transform audit logs to alerts
      const transformedAlerts = alerts.map((log) => {
        const changes = log.changes as any;
        return {
          id: log.id,
          type: log.action,
          severity: changes?.severity || 'info',
          title: changes?.title || log.action,
          message: changes?.message || '',
          metadata: changes?.metadata || {},
          acknowledged: changes?.acknowledged || false,
          acknowledgedBy: changes?.acknowledgedBy,
          acknowledgedAt: changes?.acknowledgedAt,
          createdAt: log.createdAt,
        };
      });

      res.json({
        success: true,
        data: transformedAlerts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching alerts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
      });
    }
  }
);

// Get alert statistics
router.get(
  '/stats',
  requirePermission('read:alerts'),
  async (req: Request, res: Response) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [totalAlerts, alertsToday, alertsThisWeek] = await Promise.all([
        prisma.auditLog.count({
          where: { entityType: ALERT_ENTITY_TYPE },
        }),
        prisma.auditLog.count({
          where: {
            entityType: ALERT_ENTITY_TYPE,
            createdAt: { gte: oneDayAgo },
          },
        }),
        prisma.auditLog.count({
          where: {
            entityType: ALERT_ENTITY_TYPE,
            createdAt: { gte: oneWeekAgo },
          },
        }),
      ]);

      // Get severity distribution
      const bySeverity = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          entityType: ALERT_ENTITY_TYPE,
          createdAt: { gte: oneWeekAgo },
        },
        _count: true,
      });

      res.json({
        success: true,
        data: {
          total: totalAlerts,
          today: alertsToday,
          thisWeek: alertsThisWeek,
          bySeverity: bySeverity.map((s) => ({
            severity: s.action.replace('alert:', ''),
            count: s._count,
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching alert stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alert stats',
      });
    }
  }
);

// Create a new alert
router.post(
  '/',
  requirePermission('write:alerts'),
  auditAdminAction('admin:create_alert'),
  async (req: Request, res: Response) => {
    try {
      const { type, severity, title, message, metadata, expiresAt } = req.body;

      if (!type || !severity || !title) {
        res.status(400).json({
          success: false,
          error: 'type, severity, and title are required',
        });
        return;
      }

      const validSeverities: AlertSeverity[] = ['critical', 'warning', 'info'];
      if (!validSeverities.includes(severity)) {
        res.status(400).json({
          success: false,
          error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
        });
        return;
      }

      // Create alert as audit log
      const alert = await prisma.auditLog.create({
        data: {
          userId: (req as any).admin?.id,
          action: `alert:${severity}:${type}`,
          entityType: ALERT_ENTITY_TYPE,
          entityId: type,
          changes: {
            severity,
            title,
            message,
            metadata: metadata || {},
            acknowledged: false,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('Alert created', {
        alertId: alert.id,
        type,
        severity,
        adminId: (req as any).admin?.id,
      });

      res.status(201).json({
        success: true,
        data: {
          id: alert.id,
          type,
          severity,
          title,
          message,
          metadata: metadata || {},
          acknowledged: false,
          createdAt: alert.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error creating alert', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create alert',
      });
    }
  }
);

// Acknowledge an alert
router.post(
  '/:id/acknowledge',
  requirePermission('write:alerts'),
  auditAdminAction('admin:acknowledge_alert'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const alert = await prisma.auditLog.findUnique({
        where: { id },
      });

      if (!alert || alert.entityType !== ALERT_ENTITY_TYPE) {
        res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
        return;
      }

      const changes = alert.changes as any;
      if (changes?.acknowledged) {
        res.status(400).json({
          success: false,
          error: 'Alert already acknowledged',
        });
        return;
      }

      // Update alert
      const updatedAlert = await prisma.auditLog.update({
        where: { id },
        data: {
          changes: {
            ...changes,
            acknowledged: true,
            acknowledgedBy: (req as any).admin?.id,
            acknowledgedAt: new Date(),
          },
        },
      });

      logger.info('Alert acknowledged', {
        alertId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Alert acknowledged',
        data: {
          id: updatedAlert.id,
          acknowledged: true,
          acknowledgedBy: (req as any).admin?.id,
          acknowledgedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error acknowledging alert', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
      });
    }
  }
);

// Delete an alert
router.delete(
  '/:id',
  requirePermission('write:alerts'),
  auditAdminAction('admin:delete_alert'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const alert = await prisma.auditLog.findUnique({
        where: { id },
      });

      if (!alert || alert.entityType !== ALERT_ENTITY_TYPE) {
        res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
        return;
      }

      await prisma.auditLog.delete({
        where: { id },
      });

      logger.info('Alert deleted', {
        alertId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Alert deleted',
      });
    } catch (error) {
      logger.error('Error deleting alert', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert',
      });
    }
  }
);

// Bulk acknowledge alerts
router.post(
  '/bulk-acknowledge',
  requirePermission('write:alerts'),
  auditAdminAction('admin:bulk_acknowledge_alerts'),
  async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'ids must be a non-empty array',
        });
        return;
      }

      const alerts = await prisma.auditLog.findMany({
        where: {
          id: { in: ids },
          entityType: ALERT_ENTITY_TYPE,
        },
      });

      const updatePromises = alerts.map((alert) => {
        const changes = alert.changes as any;
        return prisma.auditLog.update({
          where: { id: alert.id },
          data: {
            changes: {
              ...changes,
              acknowledged: true,
              acknowledgedBy: (req as any).admin?.id,
              acknowledgedAt: new Date(),
            },
          },
        });
      });

      await Promise.all(updatePromises);

      logger.info('Alerts bulk acknowledged', {
        count: alerts.length,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: `${alerts.length} alerts acknowledged`,
      });
    } catch (error) {
      logger.error('Error bulk acknowledging alerts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to bulk acknowledge alerts',
      });
    }
  }
);

export default router;
