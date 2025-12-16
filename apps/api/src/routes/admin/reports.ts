/**
 * Admin Reports & Exports Routes
 * Comprehensive reporting and data export for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma, OrgStatus, OrgTier, SubStatus, MeetingStatus, SystemRole } from '@prisma/client';
import { z } from 'zod';

// Helper type for subscription plan pricing from JSON field
interface PlanPricing {
  monthly?: number;
  yearly?: number;
  tier?: string;
  interval?: string;
}

// Helper to extract price from plan pricing JSON
function getPlanPrice(pricing: unknown): number {
  if (!pricing || typeof pricing !== 'object') return 0;
  const p = pricing as PlanPricing;
  return p.monthly || p.yearly || 0;
}

// Helper to extract tier from plan pricing JSON or name
function getPlanTier(plan: { name: string; pricing: unknown }): string {
  if (plan.pricing && typeof plan.pricing === 'object') {
    const p = plan.pricing as PlanPricing;
    if (p.tier) return p.tier;
  }
  // Infer from plan name
  const name = plan.name.toLowerCase();
  if (name.includes('enterprise')) return 'enterprise';
  if (name.includes('professional') || name.includes('pro')) return 'professional';
  if (name.includes('starter') || name.includes('basic')) return 'starter';
  return 'free';
}

// Helper to extract interval from plan pricing JSON
function getPlanInterval(pricing: unknown): string {
  if (!pricing || typeof pricing !== 'object') return 'monthly';
  const p = pricing as PlanPricing;
  return p.interval || 'monthly';
}
import { requirePermission, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';
import { QueueService, JobType, JobPriority } from '../../services/queue';
import { StorageService } from '../../services/storage';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Parser as Json2CsvParser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

const router = Router();
const prisma = new PrismaClient();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const storageService = new StorageService();
const queueService = new QueueService(redis);

// Report Types
const ReportType = z.enum([
  'usage_summary',
  'revenue_report',
  'growth_metrics',
  'user_activity',
  'organization_health',
  'compliance_audit',
  'security_events',
  'billing_summary',
  'subscription_metrics',
]);

type ReportTypeValue = z.infer<typeof ReportType>;

// Export Formats
const ExportFormat = z.enum(['csv', 'excel', 'pdf', 'json']);
type ExportFormatValue = z.infer<typeof ExportFormat>;

// Schedule Frequency
const ScheduleFrequency = z.enum(['daily', 'weekly', 'monthly', 'custom']);

// Validation Schemas
const scheduledReportSchema = z.object({
  name: z.string().min(1).max(255),
  reportType: ReportType,
  format: ExportFormat,
  frequency: ScheduleFrequency,
  cronExpression: z.string().optional(),
  recipients: z.array(z.string().email()).min(1),
  filters: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true),
});

const generateReportSchema = z.object({
  reportType: ReportType,
  format: ExportFormat,
  dateRange: z.object({
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
  }),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const exportDataSchema = z.object({
  format: ExportFormat,
  filters: z.record(z.string(), z.unknown()).optional(),
  fields: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
  }).optional(),
});

// Report Template Definitions
const REPORT_TEMPLATES: Record<ReportTypeValue, {
  name: string;
  description: string;
  defaultFields: string[];
  supportedFormats: ExportFormatValue[];
  estimatedDuration: string;
}> = {
  usage_summary: {
    name: 'Usage Summary Report',
    description: 'Overview of platform usage including meetings, users, and API calls',
    defaultFields: ['date', 'totalMeetings', 'totalUsers', 'totalApiCalls', 'storageUsed'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '1-5 minutes',
  },
  revenue_report: {
    name: 'Revenue Report',
    description: 'Detailed revenue breakdown by subscription tier and organization',
    defaultFields: ['date', 'tier', 'revenue', 'newSubscriptions', 'churnedSubscriptions', 'mrr'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '2-10 minutes',
  },
  growth_metrics: {
    name: 'Growth Metrics Report',
    description: 'Platform growth indicators including user acquisition and retention',
    defaultFields: ['date', 'newUsers', 'activeUsers', 'churnRate', 'retentionRate', 'growthRate'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '1-5 minutes',
  },
  user_activity: {
    name: 'User Activity Report',
    description: 'Detailed user engagement and activity metrics',
    defaultFields: ['userId', 'email', 'lastLogin', 'meetingsAttended', 'meetingsHosted', 'totalMinutes'],
    supportedFormats: ['csv', 'excel', 'json'],
    estimatedDuration: '5-15 minutes',
  },
  organization_health: {
    name: 'Organization Health Report',
    description: 'Health scores and metrics for all organizations',
    defaultFields: ['orgId', 'name', 'healthScore', 'activeUsers', 'meetings', 'storageUsed', 'riskLevel'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '3-10 minutes',
  },
  compliance_audit: {
    name: 'Compliance Audit Report',
    description: 'Audit trail for compliance requirements (GDPR, HIPAA, SOC2)',
    defaultFields: ['timestamp', 'action', 'actor', 'resource', 'ipAddress', 'complianceFlags'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '5-20 minutes',
  },
  security_events: {
    name: 'Security Events Report',
    description: 'Security-related events including login attempts and access violations',
    defaultFields: ['timestamp', 'eventType', 'severity', 'actor', 'ipAddress', 'details'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '3-10 minutes',
  },
  billing_summary: {
    name: 'Billing Summary Report',
    description: 'Billing overview including invoices, payments, and outstanding balances',
    defaultFields: ['orgId', 'orgName', 'currentPlan', 'billingAmount', 'status', 'nextBillingDate'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '2-8 minutes',
  },
  subscription_metrics: {
    name: 'Subscription Metrics Report',
    description: 'Subscription analytics including MRR, ARR, and churn analysis',
    defaultFields: ['date', 'mrr', 'arr', 'newMrr', 'churnedMrr', 'netMrr', 'subscriberCount'],
    supportedFormats: ['csv', 'excel', 'pdf', 'json'],
    estimatedDuration: '2-8 minutes',
  },
};

// Helper Functions

function getCronFromFrequency(frequency: string, customCron?: string): string {
  switch (frequency) {
    case 'daily':
      return '0 6 * * *';
    case 'weekly':
      return '0 6 * * 1';
    case 'monthly':
      return '0 6 1 * *';
    case 'custom':
      return customCron || '0 6 * * *';
    default:
      return '0 6 * * *';
  }
}

async function generateReportData(
  reportType: ReportTypeValue,
  dateRange: { start: Date; end: Date },
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  switch (reportType) {
    case 'usage_summary':
      return generateUsageSummaryData(startDate, endDate, filters);
    case 'revenue_report':
      return generateRevenueData(startDate, endDate, filters);
    case 'growth_metrics':
      return generateGrowthMetricsData(startDate, endDate, filters);
    case 'user_activity':
      return generateUserActivityData(startDate, endDate, filters);
    case 'organization_health':
      return generateOrgHealthData(filters);
    case 'compliance_audit':
      return generateComplianceAuditData(startDate, endDate, filters);
    case 'security_events':
      return generateSecurityEventsData(startDate, endDate, filters);
    case 'billing_summary':
      return generateBillingSummaryData(filters);
    case 'subscription_metrics':
      return generateSubscriptionMetricsData(startDate, endDate, filters);
    default:
      throw new Error('Unsupported report type: ' + reportType);
  }
}

async function generateUsageSummaryData(
  startDate: Date,
  endDate: Date,
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const days: Record<string, unknown>[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const orgFilter = filters?.organizationId ? { organizationId: filters.organizationId as string } : {};

    const [meetingsCount, usersCount, apiCallsMetric, storageMetric] = await Promise.all([
      prisma.meeting.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          ...orgFilter,
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          ...orgFilter,
        },
      }),
      prisma.usageMetric.aggregate({
        where: {
          metricType: 'api_calls',
          createdAt: { gte: dayStart, lte: dayEnd },
          ...orgFilter,
        },
        _sum: { metricValue: true },
      }),
      prisma.usageMetric.aggregate({
        where: {
          metricType: 'storage',
          createdAt: { gte: dayStart, lte: dayEnd },
          ...orgFilter,
        },
        _sum: { metricValue: true },
      }),
    ]);

    days.push({
      date: currentDate.toISOString().split('T')[0],
      totalMeetings: meetingsCount,
      totalUsers: usersCount,
      totalApiCalls: Number(apiCallsMetric._sum.metricValue || 0),
      storageUsed: Number(storageMetric._sum.metricValue || 0),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

async function generateRevenueData(
  startDate: Date,
  endDate: Date,
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      plan: true,
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Filter by tier if specified (tier is in pricing JSON)
  const filteredSubscriptions = filters?.tier
    ? subscriptions.filter(sub => getPlanTier(sub.plan) === filters.tier)
    : subscriptions;

  const revenueByDate = new Map<string, {
    revenue: number;
    newSubscriptions: number;
    churnedSubscriptions: number;
    mrr: number;
    tierBreakdown: Record<string, number>;
  }>();

  for (const sub of filteredSubscriptions) {
    const dateKey = sub.createdAt.toISOString().split('T')[0];
    const existing = revenueByDate.get(dateKey) || {
      revenue: 0,
      newSubscriptions: 0,
      churnedSubscriptions: 0,
      mrr: 0,
      tierBreakdown: {},
    };

    const monthlyAmount = getPlanPrice(sub.plan.pricing);
    const tier = getPlanTier(sub.plan);
    existing.revenue += monthlyAmount;
    existing.mrr += monthlyAmount;
    existing.newSubscriptions += 1;
    existing.tierBreakdown[tier] = (existing.tierBreakdown[tier] || 0) + monthlyAmount;

    if (sub.status === SubStatus.cancelled && sub.cancelledAt) {
      existing.churnedSubscriptions += 1;
    }

    revenueByDate.set(dateKey, existing);
  }

  return Array.from(revenueByDate.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));
}

async function generateGrowthMetricsData(
  startDate: Date,
  endDate: Date,
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const days: Record<string, unknown>[] = [];
  const currentDate = new Date(startDate);
  const orgFilter = filters?.organizationId ? { organizationId: filters.organizationId as string } : {};

  const totalUsersAtStart = await prisma.user.count({
    where: {
      createdAt: { lt: startDate },
      ...orgFilter,
    },
  });

  let runningUserTotal = totalUsersAtStart;

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newUsers, activeUsers, totalUsersNow] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          ...orgFilter,
        },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: { gte: thirtyDaysAgo, lte: dayEnd },
          ...orgFilter,
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { lte: dayEnd },
          ...orgFilter,
        },
      }),
    ]);

    runningUserTotal += newUsers;
    const churnRate = runningUserTotal > 0 ? ((runningUserTotal - activeUsers) / runningUserTotal) * 100 : 0;
    const retentionRate = 100 - churnRate;
    const growthRate = totalUsersAtStart > 0 ? ((totalUsersNow - totalUsersAtStart) / totalUsersAtStart) * 100 : 0;

    days.push({
      date: currentDate.toISOString().split('T')[0],
      newUsers,
      activeUsers,
      totalUsers: totalUsersNow,
      churnRate: Math.round(churnRate * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

async function generateUserActivityData(
  startDate: Date,
  endDate: Date,
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const whereClause: Prisma.UserWhereInput = {};
  if (filters?.organizationId) whereClause.organizationId = filters.organizationId as string;
  if (filters?.isActive !== undefined) whereClause.isActive = filters.isActive as boolean;

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      lastLoginAt: true,
      loginCount: true,
      organization: { select: { name: true } },
      _count: {
        select: {
          meetings: true,
        },
      },
    },
    take: filters?.limit ? Number(filters.limit) : 10000,
  });

  const userActivityData: Record<string, unknown>[] = [];

  for (const user of users) {
    const meetingsAttended = await prisma.meetingParticipant.count({
      where: {
        userId: user.id,
        meeting: { createdAt: { gte: startDate, lte: endDate } },
      },
    });

    const meetingsHosted = await prisma.meeting.count({
      where: {
        userId: user.id,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A';

    userActivityData.push({
      userId: user.id,
      email: user.email,
      name: displayName,
      organization: user.organization?.name || 'N/A',
      lastLogin: user.lastLoginAt?.toISOString() || 'Never',
      loginCount: user.loginCount,
      meetingsHosted,
      meetingsAttended,
    });
  }

  return userActivityData;
}

async function generateOrgHealthData(
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const whereClause: Prisma.OrganizationWhereInput = {};
  if (filters?.status) whereClause.status = filters.status as OrgStatus;
  if (filters?.tier) whereClause.tier = filters.tier as OrgTier;

  const organizations = await prisma.organization.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          users: true,
          meetings: true,
        },
      },
      subscription: {
        select: { status: true, plan: { select: { name: true, pricing: true } } },
      },
    },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orgHealthData: Record<string, unknown>[] = [];

  for (const org of organizations) {
    const activeUsers = await prisma.user.count({
      where: {
        organizationId: org.id,
        lastLoginAt: { gte: thirtyDaysAgo },
      },
    });

    const recentMeetings = await prisma.meeting.count({
      where: {
        organizationId: org.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const storageUsed = await prisma.usageMetric.aggregate({
      where: {
        organizationId: org.id,
        metricType: 'storage',
      },
      _sum: { metricValue: true },
    });

    let riskLevel = 'low';
    if (org.healthScore < 30) riskLevel = 'critical';
    else if (org.healthScore < 50) riskLevel = 'high';
    else if (org.healthScore < 70) riskLevel = 'medium';

    const subscriptionTier = org.subscription?.plan
      ? getPlanTier(org.subscription.plan)
      : org.tier;

    orgHealthData.push({
      orgId: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      tier: subscriptionTier,
      healthScore: org.healthScore,
      totalUsers: org._count.users,
      activeUsers,
      totalMeetings: org._count.meetings,
      recentMeetings,
      storageUsedBytes: Number(storageUsed._sum.metricValue || 0),
      riskLevel,
      createdAt: org.createdAt.toISOString(),
    });
  }

  return orgHealthData;
}

async function generateComplianceAuditData(
  startDate: Date,
  endDate: Date,
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const whereClause: Prisma.AuditLogWhereInput = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (filters?.complianceType) {
    switch (filters.complianceType) {
      case 'gdpr':
        whereClause.isGdprRelevant = true;
        break;
      case 'hipaa':
        whereClause.isHipaaRelevant = true;
        break;
      case 'soc2':
        whereClause.isSoc2Relevant = true;
        break;
    }
  }

  if (filters?.organizationId) {
    whereClause.organizationId = filters.organizationId as string;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ? Number(filters.limit) : 50000,
  });

  return auditLogs.map((log) => {
    const actorName = log.user
      ? [log.user.firstName, log.user.lastName, '(' + log.user.email + ')'].filter(Boolean).join(' ')
      : log.userEmail || 'System';

    return {
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      action: log.action,
      actionLabel: log.actionLabel,
      actor: actorName,
      userEmail: log.userEmail,
      organization: log.organization?.name || 'N/A',
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      complianceFlags: {
        gdpr: log.isGdprRelevant,
        hipaa: log.isHipaaRelevant,
        soc2: log.isSoc2Relevant,
      },
      riskLevel: log.riskLevel,
      status: log.status,
      entityType: log.entityType,
      entityId: log.entityId,
    };
  });
}

async function generateSecurityEventsData(
  startDate: Date,
  endDate: Date,
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const securityActions = ['login', 'logout', 'login_failed', 'password_change', 'mfa_enable', 'mfa_disable', 'api_key_create', 'api_key_revoke', 'permission_change', 'role_change'];

  const whereClause: Prisma.AuditLogWhereInput = {
    createdAt: { gte: startDate, lte: endDate },
    OR: [
      { action: { in: securityActions } },
      { riskLevel: { in: ['high', 'critical'] } },
    ],
  };

  if (filters?.riskLevel) whereClause.riskLevel = filters.riskLevel as string;
  if (filters?.organizationId) whereClause.organizationId = filters.organizationId as string;

  const auditLogs = await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      user: { select: { email: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ? Number(filters.limit) : 50000,
  });

  return auditLogs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt.toISOString(),
    eventType: log.action,
    actionLabel: log.actionLabel,
    riskLevel: log.riskLevel,
    actor: log.user?.email || log.userEmail || 'System',
    organization: log.organization?.name || 'N/A',
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    status: log.status,
    errorMessage: log.errorMessage,
    requiresReview: log.requiresReview,
  }));
}

async function generateBillingSummaryData(
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const whereClause: Prisma.OrganizationWhereInput = {};
  if (filters?.status) whereClause.status = filters.status as OrgStatus;
  if (filters?.tier) whereClause.tier = filters.tier as OrgTier;

  const organizations = await prisma.organization.findMany({
    where: whereClause,
    include: {
      subscription: {
        include: {
          plan: true,
        },
      },
    },
  });

  return organizations.map((org) => {
    const plan = org.subscription?.plan;
    return {
      orgId: org.id,
      orgName: org.name,
      status: org.status,
      currentPlan: plan?.name || 'Free',
      planTier: plan ? getPlanTier(plan) : 'free',
      billingAmount: plan ? getPlanPrice(plan.pricing) : 0,
      billingInterval: plan ? getPlanInterval(plan.pricing) : 'N/A',
      subscriptionStatus: org.subscription?.status || 'none',
      currentPeriodStart: org.subscription?.currentPeriodStart?.toISOString() || 'N/A',
      currentPeriodEnd: org.subscription?.currentPeriodEnd?.toISOString() || 'N/A',
      cancelAtPeriodEnd: org.subscription?.cancelAtPeriodEnd || false,
      createdAt: org.createdAt.toISOString(),
    };
  });
}

async function generateSubscriptionMetricsData(
  startDate: Date,
  endDate: Date,
  filters?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const days: Record<string, unknown>[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    let activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubStatus.active,
        createdAt: { lte: dayEnd },
      },
      include: { plan: true },
    });

    let newSubscriptions = await prisma.subscription.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      include: { plan: true },
    });

    let cancelledSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubStatus.cancelled,
        cancelledAt: { gte: dayStart, lte: dayEnd },
      },
      include: { plan: true },
    });

    // Filter by tier if specified (tier is in pricing JSON)
    if (filters?.tier) {
      activeSubscriptions = activeSubscriptions.filter(sub => getPlanTier(sub.plan) === filters.tier);
      newSubscriptions = newSubscriptions.filter(sub => getPlanTier(sub.plan) === filters.tier);
      cancelledSubscriptions = cancelledSubscriptions.filter(sub => getPlanTier(sub.plan) === filters.tier);
    }

    const mrr = activeSubscriptions.reduce((sum, sub) => sum + getPlanPrice(sub.plan.pricing), 0);
    const newMrr = newSubscriptions.reduce((sum, sub) => sum + getPlanPrice(sub.plan.pricing), 0);
    const churnedMrr = cancelledSubscriptions.reduce((sum, sub) => sum + getPlanPrice(sub.plan.pricing), 0);

    days.push({
      date: currentDate.toISOString().split('T')[0],
      mrr,
      arr: mrr * 12,
      newMrr,
      churnedMrr,
      netMrr: newMrr - churnedMrr,
      subscriberCount: activeSubscriptions.length,
      newSubscribers: newSubscriptions.length,
      churnedSubscribers: cancelledSubscriptions.length,
      churnRate: activeSubscriptions.length > 0
        ? Math.round((cancelledSubscriptions.length / activeSubscriptions.length) * 10000) / 100
        : 0,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

async function convertToFormat(
  data: Record<string, unknown>[],
  format: ExportFormatValue,
  reportName: string
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  switch (format) {
    case 'csv':
      return convertToCsv(data);
    case 'excel':
      return convertToExcel(data, reportName);
    case 'pdf':
      return convertToPdf(data, reportName);
    case 'json':
      return convertToJson(data);
    default:
      throw new Error('Unsupported format: ' + format);
  }
}

async function convertToCsv(
  data: Record<string, unknown>[]
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  if (data.length === 0) {
    return {
      buffer: Buffer.from(''),
      contentType: 'text/csv',
      extension: 'csv',
    };
  }

  const fields = Object.keys(data[0]);
  const parser = new Json2CsvParser({ fields });
  const csv = parser.parse(data);

  return {
    buffer: Buffer.from(csv, 'utf-8'),
    contentType: 'text/csv',
    extension: 'csv',
  };
}

async function convertToExcel(
  data: Record<string, unknown>[],
  reportName: string
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OpenMeet Admin';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(reportName);

  if (data.length > 0) {
    const columns = Object.keys(data[0]).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      key,
      width: 20,
    }));
    worksheet.columns = columns;

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((row) => {
      worksheet.addRow(row);
    });

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  };
}

async function convertToPdf(
  data: Record<string, unknown>[],
  reportName: string
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        contentType: 'application/pdf',
        extension: 'pdf',
      });
    });
    doc.on('error', reject);

    doc.fontSize(20).text(reportName, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text('Generated: ' + new Date().toISOString(), { align: 'center' });
    doc.moveDown(2);

    if (data.length === 0) {
      doc.fontSize(12).text('No data available for this report.', { align: 'center' });
    } else {
      const headers = Object.keys(data[0]);
      const tableTop = doc.y;
      const columnWidth = (doc.page.width - 100) / Math.min(headers.length, 8);

      doc.fontSize(8).font('Helvetica-Bold');
      headers.slice(0, 8).forEach((header, i) => {
        doc.text(
          header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
          50 + i * columnWidth,
          tableTop,
          { width: columnWidth - 5, align: 'left' }
        );
      });

      doc.font('Helvetica').fontSize(7);
      let yPosition = tableTop + 20;

      const maxRows = Math.min(data.length, 50);
      data.slice(0, maxRows).forEach((row) => {
        if (yPosition > doc.page.height - 50) {
          doc.addPage();
          yPosition = 50;
        }

        headers.slice(0, 8).forEach((header, i) => {
          const value = row[header];
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
          doc.text(displayValue.substring(0, 30), 50 + i * columnWidth, yPosition, {
            width: columnWidth - 5,
            align: 'left',
          });
        });

        yPosition += 15;
      });

      if (data.length > maxRows) {
        doc.moveDown(2);
        doc.fontSize(10).text('... and ' + (data.length - maxRows) + ' more rows. Download CSV or Excel for complete data.', {
          align: 'center',
        });
      }
    }

    doc.end();
  });
}

async function convertToJson(
  data: Record<string, unknown>[]
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  return {
    buffer: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
    contentType: 'application/json',
    extension: 'json',
  };
}

// Routes

// GET /templates - List available report templates
router.get(
  '/templates',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const templates = Object.entries(REPORT_TEMPLATES).map(([type, template]) => ({
        type,
        ...template,
      }));

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error('Error listing report templates', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list report templates',
      });
    }
  }
);

// GET /scheduled - List scheduled reports
router.get(
  '/scheduled',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      const scheduledReportsKey = 'admin:scheduled_reports';
      const allReports = await redis.hgetall(scheduledReportsKey);

      const reports = Object.entries(allReports)
        .map(([id, data]) => ({ id, ...JSON.parse(data) }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const paginatedReports = reports.slice(skip, skip + limit);

      res.json({
        success: true,
        data: paginatedReports,
        pagination: {
          page,
          limit,
          total: reports.length,
          totalPages: Math.ceil(reports.length / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing scheduled reports', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list scheduled reports',
      });
    }
  }
);

// POST /scheduled - Create scheduled report
router.post(
  '/scheduled',
  requirePermission('write:analytics'),
  auditAdminAction('admin:create_scheduled_report'),
  async (req: Request, res: Response) => {
    try {
      const validation = scheduledReportSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { name, reportType, format, frequency, cronExpression, recipients, filters, enabled } = validation.data;

      const id = uuidv4();
      const scheduledReport = {
        name,
        reportType,
        format,
        frequency,
        cronExpression: getCronFromFrequency(frequency, cronExpression),
        recipients,
        filters: filters || {},
        enabled,
        createdAt: new Date().toISOString(),
        createdBy: (req as any).admin?.id,
        lastRun: null,
        nextRun: null,
      };

      await redis.hset('admin:scheduled_reports', id, JSON.stringify(scheduledReport));

      logger.info('Scheduled report created', {
        reportId: id,
        reportType,
        adminId: (req as any).admin?.id,
      });

      res.status(201).json({
        success: true,
        data: { id, ...scheduledReport },
      });
    } catch (error) {
      logger.error('Error creating scheduled report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create scheduled report',
      });
    }
  }
);

// PUT /scheduled/:id - Update scheduled report
router.put(
  '/scheduled/:id',
  requirePermission('write:analytics'),
  auditAdminAction('admin:update_scheduled_report'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = scheduledReportSchema.partial().safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const existing = await redis.hget('admin:scheduled_reports', id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Scheduled report not found',
        });
        return;
      }

      const existingReport = JSON.parse(existing);
      const updates = validation.data;

      if (updates.frequency || updates.cronExpression) {
        (updates as any).cronExpression = getCronFromFrequency(
          updates.frequency || existingReport.frequency,
          updates.cronExpression
        );
      }

      const updatedReport = {
        ...existingReport,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: (req as any).admin?.id,
      };

      await redis.hset('admin:scheduled_reports', id, JSON.stringify(updatedReport));

      logger.info('Scheduled report updated', {
        reportId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: { id, ...updatedReport },
      });
    } catch (error) {
      logger.error('Error updating scheduled report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update scheduled report',
      });
    }
  }
);

// DELETE /scheduled/:id - Delete scheduled report
router.delete(
  '/scheduled/:id',
  requirePermission('write:analytics'),
  auditAdminAction('admin:delete_scheduled_report'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await redis.hget('admin:scheduled_reports', id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Scheduled report not found',
        });
        return;
      }

      await redis.hdel('admin:scheduled_reports', id);

      logger.info('Scheduled report deleted', {
        reportId: id,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        message: 'Scheduled report deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting scheduled report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete scheduled report',
      });
    }
  }
);

// POST /generate - Generate report on-demand
router.post(
  '/generate',
  requirePermission('read:analytics'),
  auditAdminAction('admin:generate_report'),
  async (req: Request, res: Response) => {
    try {
      const validation = generateReportSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { reportType, format, dateRange, filters } = validation.data;

      const reportId = uuidv4();
      const template = REPORT_TEMPLATES[reportType];

      const reportMetadata = {
        id: reportId,
        reportType,
        format,
        status: 'processing',
        createdAt: new Date().toISOString(),
        createdBy: (req as any).admin?.id,
        dateRange,
        filters: filters || {},
        progress: 0,
      };

      await redis.hset('admin:report_history', reportId, JSON.stringify(reportMetadata));

      logger.info('Report generation started', {
        reportId,
        reportType,
        format,
        adminId: (req as any).admin?.id,
      });

      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      try {
        const data = await generateReportData(reportType, { start: startDate, end: endDate }, filters);

        await redis.hset(
          'admin:report_history',
          reportId,
          JSON.stringify({ ...reportMetadata, progress: 50 })
        );

        const { buffer, contentType, extension } = await convertToFormat(data, format, template.name);

        const fileName = 'reports/' + reportType + '/' + reportId + '.' + extension;
        await storageService.uploadFile(fileName, buffer, {
          contentType,
          metadata: {
            reportId,
            reportType,
            format,
            generatedAt: new Date().toISOString(),
            recordCount: String(data.length),
          },
        });

        const completedMetadata = {
          ...reportMetadata,
          status: 'completed',
          completedAt: new Date().toISOString(),
          progress: 100,
          fileName,
          fileSize: buffer.length,
          recordCount: data.length,
        };

        await redis.hset('admin:report_history', reportId, JSON.stringify(completedMetadata));

        logger.info('Report generation completed', {
          reportId,
          recordCount: data.length,
          fileSize: buffer.length,
        });

        res.json({
          success: true,
          data: completedMetadata,
        });
      } catch (genError) {
        const failedMetadata = {
          ...reportMetadata,
          status: 'failed',
          failedAt: new Date().toISOString(),
          error: genError instanceof Error ? genError.message : 'Unknown error',
        };

        await redis.hset('admin:report_history', reportId, JSON.stringify(failedMetadata));

        throw genError;
      }
    } catch (error) {
      logger.error('Error generating report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
      });
    }
  }
);

// GET /history - List generated reports history
router.get(
  '/history',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const reportType = req.query.reportType as string;
      const status = req.query.status as string;

      const allReports = await redis.hgetall('admin:report_history');

      let reports = Object.entries(allReports)
        .map(([id, data]) => ({ id, ...JSON.parse(data) }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (reportType) {
        reports = reports.filter((r) => r.reportType === reportType);
      }
      if (status) {
        reports = reports.filter((r) => r.status === status);
      }

      const paginatedReports = reports.slice(skip, skip + limit);

      res.json({
        success: true,
        data: paginatedReports,
        pagination: {
          page,
          limit,
          total: reports.length,
          totalPages: Math.ceil(reports.length / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing report history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list report history',
      });
    }
  }
);

// GET /download/:id - Download generated report
router.get(
  '/download/:id',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const reportData = await redis.hget('admin:report_history', id);
      if (!reportData) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      const report = JSON.parse(reportData);

      if (report.status !== 'completed') {
        res.status(400).json({
          success: false,
          error: 'Report is not ready for download',
          status: report.status,
        });
        return;
      }

      const downloadUrl = await storageService.generateDownloadUrl(report.fileName, 3600);

      logger.info('Report download URL generated', {
        reportId: id,
        adminId: (req as any).admin?.id,
      });

      let contentType = 'application/octet-stream';
      if (report.format === 'excel') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (report.format === 'pdf') {
        contentType = 'application/pdf';
      } else if (report.format === 'csv') {
        contentType = 'text/csv';
      } else if (report.format === 'json') {
        contentType = 'application/json';
      }

      res.json({
        success: true,
        data: {
          downloadUrl,
          expiresIn: 3600,
          fileName: report.fileName.split('/').pop(),
          fileSize: report.fileSize,
          contentType,
        },
      });
    } catch (error) {
      logger.error('Error generating download URL', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate download URL',
      });
    }
  }
);

// GET /analytics/usage - Platform usage analytics
router.get(
  '/analytics/usage',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const organizationId = req.query.organizationId as string;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const filters: Record<string, unknown> = {};
      if (organizationId) filters.organizationId = organizationId;

      const data = await generateUsageSummaryData(startDate, endDate, filters);

      interface UsageTotals { totalMeetings: number; totalUsers: number; totalApiCalls: number; totalStorage: number; }
      const totals = data.reduce<UsageTotals>(
        (acc, day) => {
          const meetings = typeof day.totalMeetings === 'number' ? day.totalMeetings : 0;
          const users = typeof day.totalUsers === 'number' ? day.totalUsers : 0;
          const apiCalls = typeof day.totalApiCalls === 'number' ? day.totalApiCalls : 0;
          const storage = typeof day.storageUsed === 'number' ? day.storageUsed : 0;
          return {
            totalMeetings: acc.totalMeetings + meetings,
            totalUsers: acc.totalUsers + users,
            totalApiCalls: acc.totalApiCalls + apiCalls,
            totalStorage: acc.totalStorage + storage,
          };
        },
        { totalMeetings: 0, totalUsers: 0, totalApiCalls: 0, totalStorage: 0 }
      );

      res.json({
        success: true,
        data: {
          summary: totals,
          daily: data,
          period: { start: startDate.toISOString(), end: endDate.toISOString(), days },
        },
      });
    } catch (error) {
      logger.error('Error fetching usage analytics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage analytics',
      });
    }
  }
);

// GET /analytics/revenue - Revenue analytics
router.get(
  '/analytics/revenue',
  requirePermission('read:billing'),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const tier = req.query.tier as string;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const filters: Record<string, unknown> = {};
      if (tier) filters.tier = tier;

      const data = await generateRevenueData(startDate, endDate, filters);

      interface RevenueTotals { totalRevenue: number; totalNewSubscriptions: number; totalChurnedSubscriptions: number; }
      const totals = data.reduce<RevenueTotals>(
        (acc, day) => {
          const revenue = typeof day.revenue === 'number' ? day.revenue : 0;
          const newSubs = typeof day.newSubscriptions === 'number' ? day.newSubscriptions : 0;
          const churnedSubs = typeof day.churnedSubscriptions === 'number' ? day.churnedSubscriptions : 0;
          return {
            totalRevenue: acc.totalRevenue + revenue,
            totalNewSubscriptions: acc.totalNewSubscriptions + newSubs,
            totalChurnedSubscriptions: acc.totalChurnedSubscriptions + churnedSubs,
          };
        },
        { totalRevenue: 0, totalNewSubscriptions: 0, totalChurnedSubscriptions: 0 }
      );

      const lastDay = data[data.length - 1];
      const latestMrr = data.length > 0 && typeof lastDay?.mrr === 'number' ? lastDay.mrr : 0;

      res.json({
        success: true,
        data: {
          summary: {
            ...totals,
            currentMrr: latestMrr,
            currentArr: latestMrr * 12,
          },
          daily: data,
          period: { start: startDate.toISOString(), end: endDate.toISOString(), days },
        },
      });
    } catch (error) {
      logger.error('Error fetching revenue analytics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue analytics',
      });
    }
  }
);

// GET /analytics/growth - Growth metrics
router.get(
  '/analytics/growth',
  requirePermission('read:analytics'),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const organizationId = req.query.organizationId as string;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const filters: Record<string, unknown> = {};
      if (organizationId) filters.organizationId = organizationId;

      const data = await generateGrowthMetricsData(startDate, endDate, filters);

      const latestData = data.length > 0 ? data[data.length - 1] : null;

      const summary = {
        currentUsers: latestData?.totalUsers || 0,
        currentActiveUsers: latestData?.activeUsers || 0,
        periodNewUsers: data.reduce((sum, d) => sum + (d.newUsers as number), 0),
        averageRetentionRate:
          data.length > 0
            ? Math.round((data.reduce((sum, d) => sum + (d.retentionRate as number), 0) / data.length) * 100) / 100
            : 0,
        overallGrowthRate: latestData?.growthRate || 0,
      };

      res.json({
        success: true,
        data: {
          summary,
          daily: data,
          period: { start: startDate.toISOString(), end: endDate.toISOString(), days },
        },
      });
    } catch (error) {
      logger.error('Error fetching growth metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch growth metrics',
      });
    }
  }
);

// POST /export/users - Export users data
router.post(
  '/export/users',
  requirePermission('export:data'),
  auditAdminAction('admin:export_users'),
  async (req: Request, res: Response) => {
    try {
      const validation = exportDataSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { format, filters, fields, dateRange } = validation.data;

      const whereClause: Prisma.UserWhereInput = {};
      if (filters?.organizationId) whereClause.organizationId = filters.organizationId as string;
      if (filters?.isActive !== undefined) whereClause.isActive = filters.isActive as boolean;
      if (filters?.systemRole) whereClause.systemRole = filters.systemRole as SystemRole;
      if (dateRange) {
        whereClause.createdAt = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end),
        };
      }

      const totalCount = await prisma.user.count({ where: whereClause });

      if (totalCount > 10000) {
        const jobId = await queueService.addJob(
          JobType.DATA_EXPORT,
          {
            type: JobType.DATA_EXPORT,
            payload: {
              exportType: 'users',
              format,
              filters,
              fields,
              dateRange,
              whereClause,
            },
            userId: (req as any).admin?.id,
          },
          { priority: JobPriority.NORMAL }
        );

        res.status(202).json({
          success: true,
          data: {
            jobId,
            status: 'queued',
            estimatedRecords: totalCount,
            message: 'Export queued for background processing due to large dataset',
          },
        });
        return;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          systemRole: true,
          isActive: true,
          emailVerified: true,
          mfaEnabled: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true,
          organization: { select: { name: true, slug: true } },
        },
      });

      const exportData = users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        systemRole: user.systemRole,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt?.toISOString() || '',
        loginCount: user.loginCount,
        organizationName: user.organization?.name || '',
        organizationSlug: user.organization?.slug || '',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));

      const { buffer, contentType, extension } = await convertToFormat(exportData, format, 'Users Export');

      const exportId = uuidv4();
      const fileName = 'exports/users/' + exportId + '.' + extension;

      await storageService.uploadFile(fileName, buffer, {
        contentType,
        metadata: {
          exportType: 'users',
          recordCount: String(exportData.length),
          exportedAt: new Date().toISOString(),
          exportedBy: (req as any).admin?.id,
        },
      });

      const downloadUrl = await storageService.generateDownloadUrl(fileName, 3600);

      logger.info('Users export completed', {
        exportId,
        recordCount: exportData.length,
        format,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          exportId,
          downloadUrl,
          expiresIn: 3600,
          recordCount: exportData.length,
          fileSize: buffer.length,
          format,
        },
      });
    } catch (error) {
      logger.error('Error exporting users', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export users',
      });
    }
  }
);

// POST /export/organizations - Export organizations data
router.post(
  '/export/organizations',
  requirePermission('export:data'),
  auditAdminAction('admin:export_organizations'),
  async (req: Request, res: Response) => {
    try {
      const validation = exportDataSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { format, filters, dateRange } = validation.data;

      const whereClause: Prisma.OrganizationWhereInput = {};
      if (filters?.status) whereClause.status = filters.status as OrgStatus;
      if (filters?.tier) whereClause.tier = filters.tier as OrgTier;
      if (dateRange) {
        whereClause.createdAt = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end),
        };
      }

      const organizations = await prisma.organization.findMany({
        where: whereClause,
        include: {
          _count: { select: { users: true, meetings: true } },
          subscription: { include: { plan: true } },
        },
      });

      const exportData = organizations.map((org) => {
        const plan = org.subscription?.plan;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          domain: org.domain || '',
          status: org.status,
          tier: org.tier,
          healthScore: org.healthScore,
          userCount: org._count.users,
          meetingCount: org._count.meetings,
          subscriptionPlan: plan?.name || 'Free',
          subscriptionStatus: org.subscription?.status || 'none',
          subscriptionAmount: plan ? getPlanPrice(plan.pricing) : 0,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
        };
      });

      const { buffer, contentType, extension } = await convertToFormat(exportData, format, 'Organizations Export');

      const exportId = uuidv4();
      const fileName = 'exports/organizations/' + exportId + '.' + extension;

      await storageService.uploadFile(fileName, buffer, {
        contentType,
        metadata: {
          exportType: 'organizations',
          recordCount: String(exportData.length),
          exportedAt: new Date().toISOString(),
          exportedBy: (req as any).admin?.id,
        },
      });

      const downloadUrl = await storageService.generateDownloadUrl(fileName, 3600);

      logger.info('Organizations export completed', {
        exportId,
        recordCount: exportData.length,
        format,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          exportId,
          downloadUrl,
          expiresIn: 3600,
          recordCount: exportData.length,
          fileSize: buffer.length,
          format,
        },
      });
    } catch (error) {
      logger.error('Error exporting organizations', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export organizations',
      });
    }
  }
);

// POST /export/meetings - Export meetings data
router.post(
  '/export/meetings',
  requirePermission('export:data'),
  auditAdminAction('admin:export_meetings'),
  async (req: Request, res: Response) => {
    try {
      const validation = exportDataSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { format, filters, dateRange } = validation.data;

      const whereClause: Prisma.MeetingWhereInput = {};
      if (filters?.organizationId) whereClause.organizationId = filters.organizationId as string;
      if (filters?.status) whereClause.status = filters.status as MeetingStatus;
      if (filters?.platform) whereClause.platform = filters.platform as string;
      if (dateRange) {
        whereClause.createdAt = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end),
        };
      }

      const totalCount = await prisma.meeting.count({ where: whereClause });

      if (totalCount > 10000) {
        const jobId = await queueService.addJob(
          JobType.DATA_EXPORT,
          {
            type: JobType.DATA_EXPORT,
            payload: {
              exportType: 'meetings',
              format,
              filters,
              dateRange,
              whereClause,
            },
            userId: (req as any).admin?.id,
          },
          { priority: JobPriority.NORMAL }
        );

        res.status(202).json({
          success: true,
          data: {
            jobId,
            status: 'queued',
            estimatedRecords: totalCount,
            message: 'Export queued for background processing due to large dataset',
          },
        });
        return;
      }

      const meetings = await prisma.meeting.findMany({
        where: whereClause,
        include: {
          organization: { select: { name: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
          _count: { select: { participants: true } },
        },
      });

      const exportData = meetings.map((meeting) => {
        const hostName = [meeting.user?.firstName, meeting.user?.lastName].filter(Boolean).join(' ');
        return {
          id: meeting.id,
          title: meeting.title,
          status: meeting.status,
          platform: meeting.platform,
          scheduledStart: meeting.scheduledStartAt?.toISOString() || '',
          scheduledEnd: meeting.scheduledEndAt?.toISOString() || '',
          actualStart: meeting.actualStartAt?.toISOString() || '',
          actualEnd: meeting.actualEndAt?.toISOString() || '',
          duration: meeting.duration || 0,
          organizationName: meeting.organization?.name || '',
          hostEmail: meeting.user?.email || meeting.hostEmail || '',
          hostName,
          participantCount: meeting._count.participants,
          createdAt: meeting.createdAt.toISOString(),
        };
      });

      const { buffer, contentType, extension } = await convertToFormat(exportData, format, 'Meetings Export');

      const exportId = uuidv4();
      const fileName = 'exports/meetings/' + exportId + '.' + extension;

      await storageService.uploadFile(fileName, buffer, {
        contentType,
        metadata: {
          exportType: 'meetings',
          recordCount: String(exportData.length),
          exportedAt: new Date().toISOString(),
          exportedBy: (req as any).admin?.id,
        },
      });

      const downloadUrl = await storageService.generateDownloadUrl(fileName, 3600);

      logger.info('Meetings export completed', {
        exportId,
        recordCount: exportData.length,
        format,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          exportId,
          downloadUrl,
          expiresIn: 3600,
          recordCount: exportData.length,
          fileSize: buffer.length,
          format,
        },
      });
    } catch (error) {
      logger.error('Error exporting meetings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export meetings',
      });
    }
  }
);

// POST /export/billing - Export billing data
router.post(
  '/export/billing',
  requirePermission('export:data'),
  auditAdminAction('admin:export_billing'),
  async (req: Request, res: Response) => {
    try {
      const validation = exportDataSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const { format, filters, dateRange } = validation.data;

      const subscriptionWhere: Prisma.SubscriptionWhereInput = {};
      if (filters?.status) subscriptionWhere.status = filters.status as SubStatus;
      // Note: tier filter applied post-query since SubscriptionPlan.pricing is a Json field
      const tierFilter = filters?.tier;
      if (dateRange) {
        subscriptionWhere.createdAt = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end),
        };
      }

      const allSubscriptions = await prisma.subscription.findMany({
        where: subscriptionWhere,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          plan: { select: { name: true, pricing: true } },
        },
      });

      // Apply tier filter post-query
      const subscriptions = tierFilter
        ? allSubscriptions.filter((sub) => getPlanTier(sub.plan) === tierFilter)
        : allSubscriptions;

      const exportData = subscriptions.map((sub) => ({
        subscriptionId: sub.id,
        organizationId: sub.organization?.id || '',
        organizationName: sub.organization?.name || '',
        organizationSlug: sub.organization?.slug || '',
        planName: sub.plan.name,
        planTier: getPlanTier(sub.plan),
        planPrice: getPlanPrice(sub.plan.pricing),
        planInterval: getPlanInterval(sub.plan.pricing),
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() || '',
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || '',
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        cancelledAt: sub.cancelledAt?.toISOString() || '',
        stripeSubscriptionId: sub.stripeSubId || '',
        stripeCustomerId: sub.stripeCustomerId || '',
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
      }));

      const { buffer, contentType, extension } = await convertToFormat(exportData, format, 'Billing Export');

      const exportId = uuidv4();
      const fileName = 'exports/billing/' + exportId + '.' + extension;

      await storageService.uploadFile(fileName, buffer, {
        contentType,
        metadata: {
          exportType: 'billing',
          recordCount: String(exportData.length),
          exportedAt: new Date().toISOString(),
          exportedBy: (req as any).admin?.id,
        },
      });

      const downloadUrl = await storageService.generateDownloadUrl(fileName, 3600);

      logger.info('Billing export completed', {
        exportId,
        recordCount: exportData.length,
        format,
        adminId: (req as any).admin?.id,
      });

      res.json({
        success: true,
        data: {
          exportId,
          downloadUrl,
          expiresIn: 3600,
          recordCount: exportData.length,
          fileSize: buffer.length,
          format,
        },
      });
    } catch (error) {
      logger.error('Error exporting billing data', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export billing data',
      });
    }
  }
);

export default router;
