/**
 * Audit Alert Service
 *
 * Real-time security alerting based on audit log patterns:
 * - Failed login attempts (brute force detection)
 * - Unauthorized access attempts
 * - Unusual activity patterns
 * - Data export events
 * - Permission changes
 * - Critical errors
 *
 * Integrations:
 * - Slack notifications
 * - Email alerts
 * - PagerDuty for critical issues
 */

import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import axios from 'axios';
import { AuditService } from './audit-service';
import { emailService, EmailTemplate } from './email';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'audit-alert-service' },
  transports: [new winston.transports.Console()],
});

interface Alert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata: any;
}

export class AuditAlertService {
  // Track failed login attempts in memory for performance
  private static failedLoginAttempts = new Map<string, { count: number; firstAttempt: Date }>();

  /**
   * Monitor failed login attempts
   */
  static async monitorFailedLogins(
    ipAddress: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    const key = `${ipAddress}:${userId || 'anonymous'}`;
    const existing = this.failedLoginAttempts.get(key);

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    if (!existing || existing.firstAttempt < fifteenMinutesAgo) {
      // First attempt or expired window
      this.failedLoginAttempts.set(key, { count: 1, firstAttempt: now });
      return;
    }

    // Increment count
    existing.count++;

    // Alert on threshold
    if (existing.count === 5) {
      await this.sendAlert({
        type: 'multiple_failed_logins',
        severity: 'high',
        title: 'Multiple Failed Login Attempts Detected',
        description: `${existing.count} failed login attempts from IP ${ipAddress} in 15 minutes`,
        metadata: {
          ipAddress,
          userId,
          organizationId,
          attempts: existing.count,
          window: '15 minutes',
        },
      });

      // Log as suspicious activity
      await AuditService.logSuspiciousActivity(
        userId,
        organizationId,
        'brute_force_attempt',
        ipAddress,
        { attempts: existing.count }
      );
    }

    // Alert on critical threshold
    if (existing.count === 10) {
      await this.sendAlert({
        type: 'brute_force_attack',
        severity: 'critical',
        title: 'Potential Brute Force Attack',
        description: `${existing.count} failed login attempts from IP ${ipAddress}`,
        metadata: {
          ipAddress,
          userId,
          organizationId,
          attempts: existing.count,
          action: 'Consider blocking IP address',
        },
      });
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
      for (const [k, v] of this.failedLoginAttempts.entries()) {
        if (v.firstAttempt < fifteenMinutesAgo) {
          this.failedLoginAttempts.delete(k);
        }
      }
    }
  }

  /**
   * Monitor data export events
   */
  static async monitorDataExport(
    userId: string,
    organizationId: string | undefined,
    dataType: string,
    recordCount: number
  ): Promise<void> {
    // Alert on large exports
    if (recordCount > 1000) {
      await this.sendAlert({
        type: 'large_data_export',
        severity: 'high',
        title: 'Large Data Export Detected',
        description: `User exported ${recordCount} ${dataType} records`,
        metadata: {
          userId,
          organizationId,
          dataType,
          recordCount,
        },
      });
    }

    // Check for unusual export patterns
    const recentExports = await prisma.auditLog.count({
      where: {
        userId,
        organizationId: organizationId || undefined,
        action: 'data_exported',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentExports >= 5) {
      await this.sendAlert({
        type: 'unusual_export_activity',
        severity: 'critical',
        title: 'Unusual Data Export Activity',
        description: `User has performed ${recentExports} data exports in 24 hours`,
        metadata: {
          userId,
          organizationId,
          exportsLast24h: recentExports,
        },
      });
    }
  }

  /**
   * Monitor permission changes
   */
  static async monitorPermissionChange(
    userId: string,
    organizationId: string | undefined,
    targetUserId: string,
    changeType: string
  ): Promise<void> {
    await this.sendAlert({
      type: 'permission_change',
      severity: 'high',
      title: 'User Permission Changed',
      description: `Permission change: ${changeType}`,
      metadata: {
        performedBy: userId,
        targetUser: targetUserId,
        organizationId,
        changeType,
      },
    });
  }

  /**
   * Monitor role changes
   */
  static async monitorRoleChange(
    userId: string,
    organizationId: string | undefined,
    targetUserId: string,
    oldRole: string,
    newRole: string
  ): Promise<void> {
    await this.sendAlert({
      type: 'role_change',
      severity: 'critical',
      title: 'User Role Changed',
      description: `Role changed from ${oldRole} to ${newRole}`,
      metadata: {
        performedBy: userId,
        targetUser: targetUserId,
        organizationId,
        oldRole,
        newRole,
      },
    });
  }

  /**
   * Monitor unauthorized access attempts
   */
  static async monitorUnauthorizedAccess(
    userId: string | undefined,
    organizationId: string | undefined,
    resourceType: string,
    resourceId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.sendAlert({
      type: 'unauthorized_access',
      severity: 'critical',
      title: 'Unauthorized Access Attempt',
      description: `Attempt to access ${resourceType} without permission`,
      metadata: {
        userId,
        organizationId,
        resourceType,
        resourceId,
        ipAddress,
      },
    });

    // Check for repeated unauthorized attempts
    const recentAttempts = await prisma.auditLog.count({
      where: {
        userId: userId || undefined,
        ipAddress: ipAddress || undefined,
        action: 'unauthorized_access',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentAttempts >= 3) {
      await this.sendAlert({
        type: 'repeated_unauthorized_access',
        severity: 'critical',
        title: 'Repeated Unauthorized Access Attempts',
        description: `${recentAttempts} unauthorized access attempts in the last hour`,
        metadata: {
          userId,
          ipAddress,
          attempts: recentAttempts,
        },
      });
    }
  }

  /**
   * Monitor unusual activity patterns
   */
  static async monitorUnusualActivity(
    userId: string,
    organizationId: string | undefined
  ): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check activity volume
    const recentActivity = await prisma.auditLog.count({
      where: {
        userId,
        organizationId: organizationId || undefined,
        createdAt: { gte: oneHourAgo },
      },
    });

    // Alert on unusual volume (> 100 actions/hour)
    if (recentActivity > 100) {
      await this.sendAlert({
        type: 'unusual_activity_volume',
        severity: 'medium',
        title: 'Unusual Activity Volume',
        description: `User performed ${recentActivity} actions in the last hour`,
        metadata: {
          userId,
          organizationId,
          actionCount: recentActivity,
          timeWindow: '1 hour',
        },
      });
    }

    // Check for off-hours activity
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 0 && hour < 6) {
      // Between midnight and 6 AM
      const offHoursActivity = await prisma.auditLog.count({
        where: {
          userId,
          organizationId: organizationId || undefined,
          createdAt: {
            gte: new Date(now.setHours(0, 0, 0, 0)),
          },
        },
      });

      if (offHoursActivity > 10) {
        await this.sendAlert({
          type: 'off_hours_activity',
          severity: 'medium',
          title: 'Off-Hours Activity Detected',
          description: `User active during off-hours (${hour}:00)`,
          metadata: {
            userId,
            organizationId,
            hour,
            actionCount: offHoursActivity,
          },
        });
      }
    }
  }

  /**
   * Send alert through configured channels
   */
  private static async sendAlert(alert: Alert): Promise<void> {
    logger.warn('Security Alert', alert);

    try {
      // Send to all configured channels in parallel
      await Promise.all([
        this.sendSlackAlert(alert),
        this.sendEmailAlert(alert),
        this.sendPagerDutyAlert(alert),
      ]);

      // Log the alert itself
      await prisma.auditLog.create({
        data: {
          action: 'security_alert',
          actionLabel: alert.title,
          status: 'success',
          riskLevel: alert.severity === 'critical' ? 'critical' : 'high',
          requiresReview: true,
          isSoc2Relevant: true,
          metadata: {
            alertType: alert.type,
            ...alert.metadata,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to send alert', { error, alert });
    }
  }

  /**
   * Send Slack notification
   */
  private static async sendSlackAlert(alert: Alert): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
      return;
    }

    const color = {
      low: '#36a64f',
      medium: '#ff9900',
      high: '#ff6600',
      critical: '#ff0000',
    }[alert.severity];

    const payload = {
      username: 'Security Alert Bot',
      icon_emoji: ':warning:',
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.description,
          fields: Object.entries(alert.metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })),
          footer: 'OpenMeet Security',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      // Send to Slack
      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send Slack alert', { error });
    }
  }

  /**
   * Send email notification using EmailService (SendGrid)
   */
  private static async sendEmailAlert(alert: Alert): Promise<void> {
    const alertEmail = process.env.ALERT_EMAIL;
    if (!alertEmail) {
      logger.debug('ALERT_EMAIL not configured, skipping email alert');
      return;
    }

    try {
      const severityColors: Record<Alert['severity'], string> = {
        low: '#36a64f',
        medium: '#ff9900',
        high: '#ff6600',
        critical: '#ff0000',
      };

      const severityBadge = `<span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background-color: ${severityColors[alert.severity]}; color: white; font-weight: bold; text-transform: uppercase;">${alert.severity}</span>`;

      // Build metadata table rows
      const metadataRows = Object.entries(alert.metadata)
        .map(([key, value]) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">${key}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${String(value)}</td>
          </tr>
        `)
        .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              <div style="margin-bottom: 16px;">
                ${severityBadge}
                <span style="margin-left: 8px; color: #6b7280; font-size: 14px;">${new Date().toISOString()}</span>
              </div>

              <h1 style="margin: 0 0 8px 0; color: #1f2937; font-size: 24px;">${alert.title}</h1>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px;">${alert.description}</p>

              <div style="background-color: white; border-radius: 6px; overflow: hidden; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #f3f4f6;">
                      <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Field</th>
                      <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Alert Type</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${alert.type}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Severity</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${alert.severity.toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Timestamp</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${new Date().toISOString()}</td>
                    </tr>
                    ${metadataRows}
                  </tbody>
                </table>
              </div>
            </div>

            <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
              <p>This is an automated security alert from OpenMeet</p>
              <p>Please investigate immediately if this is a critical alert.</p>
            </div>
          </body>
        </html>
      `;

      const textContent = `
SECURITY ALERT - ${alert.severity.toUpperCase()}

${alert.title}

${alert.description}

Alert Type: ${alert.type}
Severity: ${alert.severity}
Timestamp: ${new Date().toISOString()}

Details:
${Object.entries(alert.metadata).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

---
This is an automated security alert from OpenMeet
      `.trim();

      const template: EmailTemplate = {
        subject: `[${alert.severity.toUpperCase()}] Security Alert: ${alert.title}`,
        htmlContent,
        textContent,
      };

      const success = await emailService.sendEmail(template, {
        to: alertEmail,
        metadata: {
          alertType: alert.type,
          severity: alert.severity,
          source: 'audit-alert-service',
        },
      });

      if (success) {
        logger.info('Email alert sent successfully', {
          to: alertEmail,
          alertType: alert.type,
          severity: alert.severity,
        });
      } else {
        logger.error('Failed to send email alert', {
          to: alertEmail,
          alertType: alert.type,
        });
      }
    } catch (error) {
      logger.error('Error sending email alert', { error, alert });
    }
  }

  /**
   * Send PagerDuty alert using Events API v2 (for critical issues)
   * API Documentation: https://developer.pagerduty.com/api-reference/368ae3d938c9e-send-an-event-to-pager-duty
   */
  private static async sendPagerDutyAlert(alert: Alert): Promise<void> {
    const routingKey = process.env.PAGERDUTY_INTEGRATION_KEY;

    // Only send to PagerDuty for critical alerts
    if (alert.severity !== 'critical') {
      logger.debug('Skipping PagerDuty alert for non-critical severity', { severity: alert.severity });
      return;
    }

    if (!routingKey) {
      logger.debug('PAGERDUTY_INTEGRATION_KEY not configured, skipping PagerDuty alert');
      return;
    }

    try {
      const pagerDutyPayload = {
        routing_key: routingKey,
        event_action: 'trigger',
        dedup_key: `${alert.type}-${Date.now()}`, // Unique key for deduplication
        payload: {
          summary: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`,
          source: 'openmeet-audit-alert-service',
          severity: 'critical', // PagerDuty severity: critical, error, warning, info
          timestamp: new Date().toISOString(),
          component: 'security-monitoring',
          group: 'audit-alerts',
          class: alert.type,
          custom_details: {
            alert_type: alert.type,
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            ...alert.metadata,
          },
        },
        links: [
          {
            href: process.env.WEB_URL ? `${process.env.WEB_URL}/admin/security` : 'https://app.openmeet.com/admin/security',
            text: 'View Security Dashboard',
          },
        ],
        images: [],
      };

      const response = await axios.post(
        'https://events.pagerduty.com/v2/enqueue',
        pagerDutyPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.status === 202) {
        logger.info('PagerDuty alert sent successfully', {
          dedupKey: pagerDutyPayload.dedup_key,
          alertType: alert.type,
          status: response.data.status,
          message: response.data.message,
        });
      } else {
        logger.warn('PagerDuty responded with unexpected status', {
          status: response.status,
          data: response.data,
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('PagerDuty API error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
      } else {
        logger.error('Error sending PagerDuty alert', { error, alert });
      }
    }
  }

  /**
   * Get alert statistics
   */
  static async getAlertStatistics(
    organizationId?: string,
    days: number = 7
  ): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      action: 'security_alert',
      createdAt: { gte: startDate },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const alerts = await prisma.auditLog.findMany({
      where,
      select: {
        metadata: true,
        riskLevel: true,
        createdAt: true,
      },
    });

    // Group by alert type
    const byType = alerts.reduce((acc, alert) => {
      const type = (alert.metadata as any).alertType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by severity
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.riskLevel] = (acc[alert.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: alerts.length,
      byType,
      bySeverity,
      period: `Last ${days} days`,
    };
  }
}

export default AuditAlertService;
