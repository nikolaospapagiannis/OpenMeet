/**
 * Admin Settings Routes
 * System settings management for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import * as crypto from 'crypto';
import { EmailService } from '../../services/email';
import { StorageService } from '../../services/storage';

const router = Router();
const prisma = new PrismaClient();

// Encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Sensitive field identifiers
const SENSITIVE_FIELDS = [
  'apiKey',
  'secretKey',
  'password',
  'token',
  'secret',
  'privateKey',
  'smtpPassword',
  'sendgridApiKey',
  'stripeSecretKey',
  'openaiApiKey',
  'anthropicApiKey',
  'awsSecretKey',
  's3SecretKey',
];

/**
 * Encrypt a value using AES-256-GCM
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  const ivHex = iv.toString('hex');
  const authTagHex = authTag.toString('hex');

  return ivHex + ':' + authTagHex + ':' + encrypted;
}

/**
 * Decrypt a value using AES-256-GCM
 */
function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive => lowerName.includes(sensitive.toLowerCase()));
}

/**
 * Encrypt sensitive values in an object
 */
function encryptSensitiveValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && isSensitiveField(key) && value.length > 0) {
      result[key] = encrypt(value);
      result[key + '_encrypted'] = true;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = encryptSensitiveValues(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Decrypt sensitive values in an object
 */
function decryptSensitiveValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.endsWith('_encrypted')) {
      continue;
    }

    if (typeof value === 'string' && obj[key + '_encrypted'] === true) {
      try {
        result[key] = decrypt(value);
      } catch {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = decryptSensitiveValues(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Mask sensitive values for display
 */
function maskSensitiveValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.endsWith('_encrypted')) {
      continue;
    }

    if (typeof value === 'string' && isSensitiveField(key) && value.length > 0) {
      result[key] = value.length > 8 ? value.slice(0, 4) + '********' + value.slice(-4) : '********';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = maskSensitiveValues(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get or create a setting
 */
async function getOrCreateSetting(
  key: string,
  category: string,
  defaultValue: unknown,
  description?: string
): Promise<{ key: string; value: unknown; category: string; description: string | null }> {
  let setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    setting = await prisma.systemSetting.create({
      data: {
        key,
        value: defaultValue as any,
        category,
        description,
        isPublic: false,
      },
    });
  }

  return {
    key: setting.key,
    value: setting.value,
    category: setting.category,
    description: setting.description,
  };
}

// Zod validation schemas
const GeneralSettingsSchema = z.object({
  platformName: z.string().min(1).max(100).optional(),
  platformDescription: z.string().max(500).optional(),
  supportEmail: z.string().email().optional(),
  defaultTimezone: z.string().optional(),
  defaultLanguage: z.string().min(2).max(10).optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
  analyticsEnabled: z.boolean().optional(),
  allowPublicRegistration: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
});

const EmailSettingsSchema = z.object({
  provider: z.enum(['sendgrid', 'ses', 'smtp', 'postmark']).optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().max(100).optional(),
  replyToEmail: z.string().email().optional(),
  sendgridApiKey: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  dailySendLimit: z.number().int().min(0).optional(),
  rateLimitPerMinute: z.number().int().min(0).optional(),
});

const StorageSettingsSchema = z.object({
  provider: z.enum(['s3', 'minio', 'gcs', 'azure', 'local']).optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  endpoint: z.string().url().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  maxFileSize: z.number().int().min(1).optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  cdnUrl: z.string().url().optional(),
  publicReadEnabled: z.boolean().optional(),
});

const IntegrationSettingsSchema = z.object({
  stripeEnabled: z.boolean().optional(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  openaiEnabled: z.boolean().optional(),
  openaiApiKey: z.string().optional(),
  openaiOrganization: z.string().optional(),
  openaiDefaultModel: z.string().optional(),
  anthropicEnabled: z.boolean().optional(),
  anthropicApiKey: z.string().optional(),
  slackEnabled: z.boolean().optional(),
  slackWebhookUrl: z.string().url().optional(),
  slackBotToken: z.string().optional(),
  googleOAuthEnabled: z.boolean().optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  microsoftOAuthEnabled: z.boolean().optional(),
  microsoftClientId: z.string().optional(),
  microsoftClientSecret: z.string().optional(),
});

const MaintenanceSettingsSchema = z.object({
  scheduledMaintenanceEnabled: z.boolean().optional(),
  scheduledMaintenanceStart: z.string().datetime().optional(),
  scheduledMaintenanceEnd: z.string().datetime().optional(),
  maintenanceNotificationSent: z.boolean().optional(),
  allowAdminAccessDuringMaintenance: z.boolean().optional(),
  maintenanceBypassIPs: z.array(z.string()).optional(),
  autoBackupBeforeMaintenance: z.boolean().optional(),
});

const LimitsSettingsSchema = z.object({
  maxOrganizations: z.number().int().min(0).optional(),
  maxUsersPerOrganization: z.number().int().min(1).optional(),
  maxMeetingsPerUser: z.number().int().min(0).optional(),
  maxRecordingMinutesPerMonth: z.number().int().min(0).optional(),
  maxStoragePerOrganization: z.number().int().min(0).optional(),
  maxApiRequestsPerMinute: z.number().int().min(1).optional(),
  maxConcurrentMeetings: z.number().int().min(1).optional(),
  maxParticipantsPerMeeting: z.number().int().min(1).optional(),
  maxTranscriptionMinutesPerMonth: z.number().int().min(0).optional(),
  maxAiSummariesPerMonth: z.number().int().min(0).optional(),
});

const BackupSettingsSchema = z.object({
  autoBackupEnabled: z.boolean().optional(),
  backupFrequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  backupRetentionDays: z.number().int().min(1).max(365).optional(),
  backupStorageProvider: z.enum(['s3', 'gcs', 'azure', 'local']).optional(),
  backupStorageBucket: z.string().optional(),
  backupEncryptionEnabled: z.boolean().optional(),
  backupNotificationEmail: z.string().email().optional(),
  lastBackupAt: z.string().datetime().optional(),
  lastBackupStatus: z.enum(['success', 'failed', 'in_progress']).optional(),
});

// Default settings values
const DEFAULT_SETTINGS = {
  general: {
    platformName: 'OpenMeet',
    platformDescription: 'Open-Source Meeting Intelligence Platform',
    supportEmail: 'support@openmeet.io',
    defaultTimezone: 'UTC',
    defaultLanguage: 'en',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing scheduled maintenance. Please try again later.',
    analyticsEnabled: true,
    allowPublicRegistration: true,
    requireEmailVerification: true,
  },
  email: {
    provider: 'sendgrid',
    fromEmail: 'noreply@openmeet.io',
    fromName: 'OpenMeet',
    replyToEmail: 'support@openmeet.io',
    sendgridApiKey: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true,
    dailySendLimit: 10000,
    rateLimitPerMinute: 100,
  },
  storage: {
    provider: 's3',
    bucket: 'openmeet-storage',
    region: 'us-east-1',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    maxFileSize: 104857600,
    allowedFileTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
    cdnUrl: '',
    publicReadEnabled: false,
  },
  integrations: {
    stripeEnabled: false,
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    openaiEnabled: false,
    openaiApiKey: '',
    openaiOrganization: '',
    openaiDefaultModel: 'gpt-4o',
    anthropicEnabled: false,
    anthropicApiKey: '',
    slackEnabled: false,
    slackWebhookUrl: '',
    slackBotToken: '',
    googleOAuthEnabled: false,
    googleClientId: '',
    googleClientSecret: '',
    microsoftOAuthEnabled: false,
    microsoftClientId: '',
    microsoftClientSecret: '',
  },
  maintenance: {
    scheduledMaintenanceEnabled: false,
    scheduledMaintenanceStart: null,
    scheduledMaintenanceEnd: null,
    maintenanceNotificationSent: false,
    allowAdminAccessDuringMaintenance: true,
    maintenanceBypassIPs: [] as string[],
    autoBackupBeforeMaintenance: true,
  },
  limits: {
    maxOrganizations: 0,
    maxUsersPerOrganization: 100,
    maxMeetingsPerUser: 0,
    maxRecordingMinutesPerMonth: 1000,
    maxStoragePerOrganization: 10737418240,
    maxApiRequestsPerMinute: 1000,
    maxConcurrentMeetings: 10,
    maxParticipantsPerMeeting: 100,
    maxTranscriptionMinutesPerMonth: 500,
    maxAiSummariesPerMonth: 100,
  },
  backup: {
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    backupRetentionDays: 30,
    backupStorageProvider: 's3',
    backupStorageBucket: 'openmeet-backups',
    backupEncryptionEnabled: true,
    backupNotificationEmail: '',
    lastBackupAt: null,
    lastBackupStatus: null,
  },
};

// GET /settings - List all settings (grouped by category)
router.get(
  '/',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const settings = await prisma.systemSetting.findMany({
        orderBy: { category: 'asc' },
      });

      const grouped: Record<string, Record<string, unknown>> = {};

      for (const setting of settings) {
        if (!grouped[setting.category]) {
          grouped[setting.category] = {};
        }

        const value = setting.value as Record<string, unknown>;
        const decrypted = decryptSensitiveValues(value);
        grouped[setting.category][setting.key] = maskSensitiveValues(decrypted);
      }

      for (const category of Object.keys(DEFAULT_SETTINGS)) {
        if (!grouped[category]) {
          grouped[category] = maskSensitiveValues(
            DEFAULT_SETTINGS[category as keyof typeof DEFAULT_SETTINGS] as Record<string, unknown>
          );
        }
      }

      res.json({
        success: true,
        data: grouped,
      });
    } catch (error) {
      logger.error('Error listing settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list settings',
      });
    }
  }
);

// GET /settings/:category - Get settings by category
router.get(
  '/:category',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;

      const validCategories = Object.keys(DEFAULT_SETTINGS);
      if (!validCategories.includes(category)) {
        res.status(400).json({
          success: false,
          error: 'Invalid category. Must be one of: ' + validCategories.join(', '),
        });
        return;
      }

      const setting = await prisma.systemSetting.findFirst({
        where: { category },
      });

      let value: Record<string, unknown>;
      if (setting) {
        const decrypted = decryptSensitiveValues(setting.value as Record<string, unknown>);
        value = maskSensitiveValues(decrypted);
      } else {
        value = maskSensitiveValues(
          DEFAULT_SETTINGS[category as keyof typeof DEFAULT_SETTINGS] as Record<string, unknown>
        );
      }

      res.json({
        success: true,
        data: {
          category,
          settings: value,
          updatedAt: setting?.updatedAt || null,
        },
      });
    } catch (error) {
      logger.error('Error fetching settings', { error, category: req.params.category });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settings',
      });
    }
  }
);

// PUT /settings/general - Update general settings
router.put(
  '/general',
  requireRole('super_admin'),
  auditAdminAction('admin:update_general_settings'),
  async (req: Request, res: Response) => {
    try {
      const validation = GeneralSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const currentSetting = await getOrCreateSetting(
        'general',
        'general',
        DEFAULT_SETTINGS.general,
        'General platform settings'
      );

      const currentValue = currentSetting.value as Record<string, unknown>;
      const newValue = { ...currentValue, ...validation.data };

      const updated = await prisma.systemSetting.upsert({
        where: { key: 'general' },
        update: {
          value: newValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'general',
          value: newValue as any,
          category: 'general',
          description: 'General platform settings',
          isPublic: false,
        },
      });

      logger.info('General settings updated', {
        adminId: (req as any).admin?.id,
        changes: Object.keys(validation.data),
      });

      res.json({
        success: true,
        data: {
          category: 'general',
          settings: maskSensitiveValues(newValue),
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating general settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update general settings',
      });
    }
  }
);

// PUT /settings/email - Update email settings
router.put(
  '/email',
  requireRole('super_admin'),
  auditAdminAction('admin:update_email_settings'),
  async (req: Request, res: Response) => {
    try {
      const validation = EmailSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const currentSetting = await getOrCreateSetting(
        'email',
        'email',
        DEFAULT_SETTINGS.email,
        'Email configuration settings'
      );

      const currentValue = currentSetting.value as Record<string, unknown>;
      const mergedValue = { ...currentValue, ...validation.data };
      const encryptedValue = encryptSensitiveValues(mergedValue);

      const updated = await prisma.systemSetting.upsert({
        where: { key: 'email' },
        update: {
          value: encryptedValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'email',
          value: encryptedValue as any,
          category: 'email',
          description: 'Email configuration settings',
          isPublic: false,
        },
      });

      logger.info('Email settings updated', {
        adminId: (req as any).admin?.id,
        changes: Object.keys(validation.data),
      });

      res.json({
        success: true,
        data: {
          category: 'email',
          settings: maskSensitiveValues(mergedValue),
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating email settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update email settings',
      });
    }
  }
);

// PUT /settings/storage - Update storage settings
router.put(
  '/storage',
  requireRole('super_admin'),
  auditAdminAction('admin:update_storage_settings'),
  async (req: Request, res: Response) => {
    try {
      const validation = StorageSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const currentSetting = await getOrCreateSetting(
        'storage',
        'storage',
        DEFAULT_SETTINGS.storage,
        'Storage configuration settings'
      );

      const currentValue = currentSetting.value as Record<string, unknown>;
      const mergedValue = { ...currentValue, ...validation.data };
      const encryptedValue = encryptSensitiveValues(mergedValue);

      const updated = await prisma.systemSetting.upsert({
        where: { key: 'storage' },
        update: {
          value: encryptedValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'storage',
          value: encryptedValue as any,
          category: 'storage',
          description: 'Storage configuration settings',
          isPublic: false,
        },
      });

      logger.info('Storage settings updated', {
        adminId: (req as any).admin?.id,
        changes: Object.keys(validation.data),
      });

      res.json({
        success: true,
        data: {
          category: 'storage',
          settings: maskSensitiveValues(mergedValue),
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating storage settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update storage settings',
      });
    }
  }
);

// PUT /settings/integrations - Update integration settings
router.put(
  '/integrations',
  requireRole('super_admin'),
  auditAdminAction('admin:update_integration_settings'),
  async (req: Request, res: Response) => {
    try {
      const validation = IntegrationSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const currentSetting = await getOrCreateSetting(
        'integrations',
        'integrations',
        DEFAULT_SETTINGS.integrations,
        'Third-party integration settings'
      );

      const currentValue = currentSetting.value as Record<string, unknown>;
      const mergedValue = { ...currentValue, ...validation.data };
      const encryptedValue = encryptSensitiveValues(mergedValue);

      const updated = await prisma.systemSetting.upsert({
        where: { key: 'integrations' },
        update: {
          value: encryptedValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'integrations',
          value: encryptedValue as any,
          category: 'integrations',
          description: 'Third-party integration settings',
          isPublic: false,
        },
      });

      logger.info('Integration settings updated', {
        adminId: (req as any).admin?.id,
        changes: Object.keys(validation.data),
      });

      res.json({
        success: true,
        data: {
          category: 'integrations',
          settings: maskSensitiveValues(mergedValue),
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating integration settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update integration settings',
      });
    }
  }
);

// PUT /settings/maintenance - Update maintenance settings
router.put(
  '/maintenance',
  requireRole('super_admin'),
  auditAdminAction('admin:update_maintenance_settings'),
  async (req: Request, res: Response) => {
    try {
      const validation = MaintenanceSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const currentSetting = await getOrCreateSetting(
        'maintenance',
        'maintenance',
        DEFAULT_SETTINGS.maintenance,
        'Maintenance mode settings'
      );

      const currentValue = currentSetting.value as Record<string, unknown>;
      const newValue = { ...currentValue, ...validation.data };

      const updated = await prisma.systemSetting.upsert({
        where: { key: 'maintenance' },
        update: {
          value: newValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'maintenance',
          value: newValue as any,
          category: 'maintenance',
          description: 'Maintenance mode settings',
          isPublic: false,
        },
      });

      logger.info('Maintenance settings updated', {
        adminId: (req as any).admin?.id,
        changes: Object.keys(validation.data),
      });

      res.json({
        success: true,
        data: {
          category: 'maintenance',
          settings: newValue,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating maintenance settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update maintenance settings',
      });
    }
  }
);

// PUT /settings/limits - Update platform limits
router.put(
  '/limits',
  requireRole('super_admin'),
  auditAdminAction('admin:update_limit_settings'),
  async (req: Request, res: Response) => {
    try {
      const validation = LimitsSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const currentSetting = await getOrCreateSetting(
        'limits',
        'limits',
        DEFAULT_SETTINGS.limits,
        'Platform usage limits'
      );

      const currentValue = currentSetting.value as Record<string, unknown>;
      const newValue = { ...currentValue, ...validation.data };

      const updated = await prisma.systemSetting.upsert({
        where: { key: 'limits' },
        update: {
          value: newValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'limits',
          value: newValue as any,
          category: 'limits',
          description: 'Platform usage limits',
          isPublic: false,
        },
      });

      logger.info('Limits settings updated', {
        adminId: (req as any).admin?.id,
        changes: Object.keys(validation.data),
      });

      res.json({
        success: true,
        data: {
          category: 'limits',
          settings: newValue,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating limits settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update limits settings',
      });
    }
  }
);

// PUT /settings/backup - Update backup settings
router.put(
  '/backup',
  requireRole('super_admin'),
  auditAdminAction('admin:update_backup_settings'),
  async (req: Request, res: Response) => {
    try {
      const validation = BackupSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const currentSetting = await getOrCreateSetting(
        'backup',
        'backup',
        DEFAULT_SETTINGS.backup,
        'Backup configuration settings'
      );

      const currentValue = currentSetting.value as Record<string, unknown>;
      const newValue = { ...currentValue, ...validation.data };

      const updated = await prisma.systemSetting.upsert({
        where: { key: 'backup' },
        update: {
          value: newValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'backup',
          value: newValue as any,
          category: 'backup',
          description: 'Backup configuration settings',
          isPublic: false,
        },
      });

      logger.info('Backup settings updated', {
        adminId: (req as any).admin?.id,
        changes: Object.keys(validation.data),
      });

      res.json({
        success: true,
        data: {
          category: 'backup',
          settings: newValue,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating backup settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update backup settings',
      });
    }
  }
);

// POST /settings/email/test - Test email configuration
router.post(
  '/email/test',
  requireRole('super_admin'),
  auditAdminAction('admin:test_email_settings'),
  async (req: Request, res: Response) => {
    try {
      const { testEmail } = req.body;

      if (!testEmail || !z.string().email().safeParse(testEmail).success) {
        res.status(400).json({
          success: false,
          error: 'Valid test email address is required',
        });
        return;
      }

      const setting = await prisma.systemSetting.findFirst({
        where: { category: 'email' },
      });

      if (!setting) {
        res.status(400).json({
          success: false,
          error: 'Email settings not configured',
        });
        return;
      }

      const emailService = new EmailService();

      const emailTemplate = {
        subject: 'OpenMeet Email Configuration Test',
        htmlContent: '<h1>Email Configuration Test</h1><p>This is a test email to verify your email configuration is working correctly.</p><p>If you received this email, your configuration is correct.</p><hr><p><small>Sent from OpenMeet Admin Dashboard</small></p>',
      };

      await emailService.sendEmail(emailTemplate, {
        to: testEmail,
      });

      logger.info('Email test sent', {
        adminId: (req as any).admin?.id,
        testEmail,
      });

      res.json({
        success: true,
        message: 'Test email sent to ' + testEmail,
      });
    } catch (error: any) {
      logger.error('Error testing email settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        details: error.message,
      });
    }
  }
);

// POST /settings/storage/test - Test storage configuration
router.post(
  '/storage/test',
  requireRole('super_admin'),
  auditAdminAction('admin:test_storage_settings'),
  async (req: Request, res: Response) => {
    try {
      const setting = await prisma.systemSetting.findFirst({
        where: { category: 'storage' },
      });

      if (!setting) {
        res.status(400).json({
          success: false,
          error: 'Storage settings not configured',
        });
        return;
      }

      const storageSettings = decryptSensitiveValues(setting.value as Record<string, unknown>);

      const storageService = new StorageService({
        endpoint: storageSettings.endpoint as string,
        region: storageSettings.region as string,
        accessKeyId: storageSettings.accessKeyId as string,
        secretAccessKey: storageSettings.secretAccessKey as string,
        bucket: storageSettings.bucket as string,
        forcePathStyle: true,
      });

      const isHealthy = await storageService.healthCheck();

      if (!isHealthy) {
        res.status(500).json({
          success: false,
          error: 'Storage health check failed',
        });
        return;
      }

      const testKey = '__test_' + Date.now() + '.txt';
      const testContent = Buffer.from('OpenMeet storage test');

      await storageService.uploadFile(testKey, testContent, {
        contentType: 'text/plain',
      });

      const exists = await storageService.fileExists(testKey);

      if (exists) {
        await storageService.deleteFile(testKey);
      }

      logger.info('Storage test completed', {
        adminId: (req as any).admin?.id,
        bucket: storageSettings.bucket,
      });

      res.json({
        success: true,
        message: 'Storage configuration test passed',
        details: {
          bucket: storageSettings.bucket,
          region: storageSettings.region,
          uploadTest: exists ? 'passed' : 'failed',
        },
      });
    } catch (error: any) {
      logger.error('Error testing storage settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to test storage configuration',
        details: error.message,
      });
    }
  }
);

// POST /settings/integrations/:provider/test - Test integration
router.post(
  '/integrations/:provider/test',
  requireRole('super_admin'),
  auditAdminAction('admin:test_integration'),
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const validProviders = ['stripe', 'openai', 'anthropic', 'slack'];

      if (!validProviders.includes(provider)) {
        res.status(400).json({
          success: false,
          error: 'Invalid provider. Must be one of: ' + validProviders.join(', '),
        });
        return;
      }

      const setting = await prisma.systemSetting.findFirst({
        where: { category: 'integrations' },
      });

      if (!setting) {
        res.status(400).json({
          success: false,
          error: 'Integration settings not configured',
        });
        return;
      }

      const integrationSettings = decryptSensitiveValues(setting.value as Record<string, unknown>);

      let testResult: { success: boolean; message: string; details?: unknown } = {
        success: false,
        message: 'Unknown provider',
      };

      switch (provider) {
        case 'stripe': {
          const apiKey = integrationSettings.stripeSecretKey as string;
          if (!apiKey) {
            testResult = { success: false, message: 'Stripe API key not configured' };
            break;
          }

          try {
            const response = await fetch('https://api.stripe.com/v1/balance', {
              headers: {
                'Authorization': 'Bearer ' + apiKey,
              },
            });

            if (response.ok) {
              const data = await response.json();
              testResult = {
                success: true,
                message: 'Stripe connection successful',
                details: { available: data.available },
              };
            } else {
              const error = await response.json();
              testResult = {
                success: false,
                message: 'Stripe connection failed',
                details: error,
              };
            }
          } catch (error: any) {
            testResult = { success: false, message: error.message };
          }
          break;
        }

        case 'openai': {
          const apiKey = integrationSettings.openaiApiKey as string;
          if (!apiKey) {
            testResult = { success: false, message: 'OpenAI API key not configured' };
            break;
          }

          try {
            const response = await fetch('https://api.openai.com/v1/models', {
              headers: {
                'Authorization': 'Bearer ' + apiKey,
              },
            });

            if (response.ok) {
              const data = await response.json();
              testResult = {
                success: true,
                message: 'OpenAI connection successful',
                details: { modelsAvailable: data.data?.length || 0 },
              };
            } else {
              const error = await response.json();
              testResult = {
                success: false,
                message: 'OpenAI connection failed',
                details: error,
              };
            }
          } catch (error: any) {
            testResult = { success: false, message: error.message };
          }
          break;
        }

        case 'anthropic': {
          const apiKey = integrationSettings.anthropicApiKey as string;
          if (!apiKey) {
            testResult = { success: false, message: 'Anthropic API key not configured' };
            break;
          }

          try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }],
              }),
            });

            if (response.ok) {
              testResult = {
                success: true,
                message: 'Anthropic connection successful',
              };
            } else {
              const error = await response.json();
              testResult = {
                success: false,
                message: 'Anthropic connection failed',
                details: error,
              };
            }
          } catch (error: any) {
            testResult = { success: false, message: error.message };
          }
          break;
        }

        case 'slack': {
          const webhookUrl = integrationSettings.slackWebhookUrl as string;
          if (!webhookUrl) {
            testResult = { success: false, message: 'Slack webhook URL not configured' };
            break;
          }

          try {
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: 'OpenMeet Admin: Slack integration test successful!',
              }),
            });

            if (response.ok) {
              testResult = {
                success: true,
                message: 'Slack webhook test successful',
              };
            } else {
              testResult = {
                success: false,
                message: 'Slack webhook test failed',
                details: { status: response.status },
              };
            }
          } catch (error: any) {
            testResult = { success: false, message: error.message };
          }
          break;
        }
      }

      logger.info('Integration test completed', {
        adminId: (req as any).admin?.id,
        provider,
        success: testResult.success,
      });

      if (testResult.success) {
        res.json(testResult);
      } else {
        res.status(400).json(testResult);
      }
    } catch (error: any) {
      logger.error('Error testing integration', { error, provider: req.params.provider });
      res.status(500).json({
        success: false,
        error: 'Failed to test integration',
        details: error.message,
      });
    }
  }
);

// POST /settings/backup/trigger - Trigger manual backup
router.post(
  '/backup/trigger',
  requireRole('super_admin'),
  auditAdminAction('admin:trigger_backup'),
  async (req: Request, res: Response) => {
    try {
      const setting = await prisma.systemSetting.findFirst({
        where: { category: 'backup' },
      });

      const backupSettings = setting
        ? (setting.value as Record<string, unknown>)
        : DEFAULT_SETTINGS.backup;

      await prisma.systemSetting.upsert({
        where: { key: 'backup' },
        update: {
          value: {
            ...backupSettings,
            lastBackupAt: new Date().toISOString(),
            lastBackupStatus: 'in_progress',
          } as any,
          updatedAt: new Date(),
        },
        create: {
          key: 'backup',
          value: {
            ...backupSettings,
            lastBackupAt: new Date().toISOString(),
            lastBackupStatus: 'in_progress',
          } as any,
          category: 'backup',
          description: 'Backup configuration settings',
          isPublic: false,
        },
      });

      const backupJob = await prisma.systemSetting.create({
        data: {
          key: 'backup_job_' + Date.now(),
          value: {
            triggeredBy: (req as any).admin?.id,
            triggeredAt: new Date().toISOString(),
            status: 'pending',
            type: 'manual',
          } as any,
          category: 'backup_jobs',
          description: 'Manual backup job',
          isPublic: false,
        },
      });

      logger.info('Manual backup triggered', {
        adminId: (req as any).admin?.id,
        jobId: backupJob.id,
      });

      res.json({
        success: true,
        message: 'Backup job started',
        data: {
          jobId: backupJob.id,
          status: 'pending',
          triggeredAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error triggering backup', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to trigger backup',
      });
    }
  }
);

// GET /settings/backup/history - Get backup history
router.get(
  '/backup/history',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const [jobs, total] = await Promise.all([
        prisma.systemSetting.findMany({
          where: { category: 'backup_jobs' },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.systemSetting.count({
          where: { category: 'backup_jobs' },
        }),
      ]);

      res.json({
        success: true,
        data: jobs.map(job => ({
          id: job.id,
          ...job.value as Record<string, unknown>,
          createdAt: job.createdAt,
        })),
        pagination: {
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Error fetching backup history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch backup history',
      });
    }
  }
);

// DELETE /settings/:category/reset - Reset settings to defaults
router.delete(
  '/:category/reset',
  requireRole('super_admin'),
  auditAdminAction('admin:reset_settings'),
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;

      const validCategories = Object.keys(DEFAULT_SETTINGS);
      if (!validCategories.includes(category)) {
        res.status(400).json({
          success: false,
          error: 'Invalid category. Must be one of: ' + validCategories.join(', '),
        });
        return;
      }

      const defaultValue = DEFAULT_SETTINGS[category as keyof typeof DEFAULT_SETTINGS];

      await prisma.systemSetting.upsert({
        where: { key: category },
        update: {
          value: defaultValue as any,
          updatedAt: new Date(),
        },
        create: {
          key: category,
          value: defaultValue as any,
          category,
          description: category + ' settings',
          isPublic: false,
        },
      });

      logger.warn('Settings reset to defaults', {
        adminId: (req as any).admin?.id,
        category,
      });

      res.json({
        success: true,
        message: category + ' settings reset to defaults',
        data: {
          category,
          settings: maskSensitiveValues(defaultValue as Record<string, unknown>),
        },
      });
    } catch (error) {
      logger.error('Error resetting settings', { error, category: req.params.category });
      res.status(500).json({
        success: false,
        error: 'Failed to reset settings',
      });
    }
  }
);

// GET /settings/export - Export all settings
router.get(
  '/export',
  requireRole('super_admin'),
  auditAdminAction('admin:export_settings'),
  async (req: Request, res: Response) => {
    try {
      const includeSensitive = req.query.includeSensitive === 'true';

      const settings = await prisma.systemSetting.findMany({
        where: {
          category: {
            in: Object.keys(DEFAULT_SETTINGS),
          },
        },
      });

      const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        settings: {},
      };

      for (const setting of settings) {
        const value = setting.value as Record<string, unknown>;
        const decrypted = decryptSensitiveValues(value);
        (exportData.settings as Record<string, unknown>)[setting.category] = includeSensitive
          ? decrypted
          : maskSensitiveValues(decrypted);
      }

      logger.info('Settings exported', {
        adminId: (req as any).admin?.id,
        includeSensitive,
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=openmeet-settings-' + Date.now() + '.json');
      res.json(exportData);
    } catch (error) {
      logger.error('Error exporting settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export settings',
      });
    }
  }
);

// POST /settings/import - Import settings
router.post(
  '/import',
  requireRole('super_admin'),
  auditAdminAction('admin:import_settings'),
  async (req: Request, res: Response) => {
    try {
      const { settings, overwrite = false } = req.body;

      if (!settings || typeof settings !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid settings format',
        });
        return;
      }

      const validCategories = Object.keys(DEFAULT_SETTINGS);
      const imported: string[] = [];
      const skipped: string[] = [];
      const errors: string[] = [];

      for (const [category, value] of Object.entries(settings)) {
        if (!validCategories.includes(category)) {
          skipped.push(category);
          continue;
        }

        try {
          const existing = await prisma.systemSetting.findFirst({
            where: { category },
          });

          if (existing && !overwrite) {
            skipped.push(category);
            continue;
          }

          const encryptedValue = encryptSensitiveValues(value as Record<string, unknown>);

          await prisma.systemSetting.upsert({
            where: { key: category },
            update: {
              value: encryptedValue as any,
              updatedAt: new Date(),
            },
            create: {
              key: category,
              value: encryptedValue as any,
              category,
              description: category + ' settings',
              isPublic: false,
            },
          });

          imported.push(category);
        } catch (err: any) {
          errors.push(category + ': ' + err.message);
        }
      }

      logger.info('Settings imported', {
        adminId: (req as any).admin?.id,
        imported,
        skipped,
        errors,
      });

      res.json({
        success: true,
        message: 'Settings import completed',
        data: {
          imported,
          skipped,
          errors,
        },
      });
    } catch (error) {
      logger.error('Error importing settings', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to import settings',
      });
    }
  }
);

export default router;
