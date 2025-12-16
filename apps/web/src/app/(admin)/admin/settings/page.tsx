'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mail,
  Database,
  Link,
  Gauge,
  Wrench,
  Archive,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  TestTube,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Globe,
  Clock,
  Shield,
  Server,
  HardDrive,
  Zap,
  Users,
  FileText,
  Calendar,
  Play,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';

interface GeneralSettings {
  platformName: string;
  supportEmail: string;
  defaultTimezone: string;
  defaultDateFormat: string;
  defaultTimeFormat: string;
  defaultLanguage: string;
  defaultCurrency: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireMfa: boolean;
  allowPublicSignup: boolean;
  requireEmailVerification: boolean;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  emailTemplatesPath: string;
}

interface StorageSettings {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  localPath: string;
  s3Bucket: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  gcsBucket: string;
  gcsProjectId: string;
  gcsKeyFile: string;
  azureContainer: string;
  azureConnectionString: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  cdnEnabled: boolean;
  cdnUrl: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  lastSyncAt: string | null;
  status: 'connected' | 'disconnected' | 'error';
}

interface PlatformLimits {
  maxUsersPerOrganization: number;
  maxOrganizations: number;
  maxStoragePerOrg: number;
  maxApiRequestsPerMinute: number;
  maxConcurrentMeetings: number;
  maxMeetingDuration: number;
  maxParticipantsPerMeeting: number;
  maxRecordingStoragePerOrg: number;
  maxWebhooksPerOrg: number;
  maxIntegrationsPerOrg: number;
}

interface MaintenanceSettings {
  enabled: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  message: string;
  allowAdminAccess: boolean;
  notifyUsersBefore: number;
  bypassIps: string[];
}

interface BackupConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeMedia: boolean;
  includeAuditLogs: boolean;
  encryptBackups: boolean;
  encryptionKey: string;
  storageLocation: string;
  notifyOnComplete: boolean;
  notifyOnFailure: boolean;
  notificationEmail: string;
}

interface BackupHistory {
  id: string;
  createdAt: string;
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  type: 'scheduled' | 'manual';
  downloadUrl: string | null;
  errorMessage: string | null;
}

interface ValidationError {
  field: string;
  message: string;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

const DATE_FORMATS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-01-15)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/15/2025)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/01/2025)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (15.01.2025)' },
];

const TIME_FORMATS = [
  { value: 'HH:mm', label: '24-hour (14:30)' },
  { value: 'hh:mm A', label: '12-hour (02:30 PM)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'JPY', label: 'JPY' },
  { value: 'CNY', label: 'CNY' },
];

const STORAGE_PROVIDERS = [
  { value: 'local', label: 'Local Storage' },
  { value: 's3', label: 'Amazon S3' },
  { value: 'gcs', label: 'Google Cloud Storage' },
  { value: 'azure', label: 'Azure Blob Storage' },
];

const BACKUP_FREQUENCIES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    platformName: '',
    supportEmail: '',
    defaultTimezone: 'UTC',
    defaultDateFormat: 'YYYY-MM-DD',
    defaultTimeFormat: 'HH:mm',
    defaultLanguage: 'en',
    defaultCurrency: 'USD',
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireMfa: false,
    allowPublicSignup: true,
    requireEmailVerification: true,
  });
  const [originalGeneralSettings, setOriginalGeneralSettings] = useState<GeneralSettings | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true,
    fromEmail: '',
    fromName: '',
    replyToEmail: '',
    emailTemplatesPath: '/templates/email',
  });
  const [originalEmailSettings, setOriginalEmailSettings] = useState<EmailSettings | null>(null);
  const [storageSettings, setStorageSettings] = useState<StorageSettings>({
    provider: 'local',
    localPath: '/data/uploads',
    s3Bucket: '',
    s3Region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    gcsBucket: '',
    gcsProjectId: '',
    gcsKeyFile: '',
    azureContainer: '',
    azureConnectionString: '',
    maxFileSize: 100,
    allowedFileTypes: ['image/*', 'application/pdf', 'video/*', 'audio/*'],
    cdnEnabled: false,
    cdnUrl: '',
  });
  const [originalStorageSettings, setOriginalStorageSettings] = useState<StorageSettings | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [originalIntegrations, setOriginalIntegrations] = useState<Integration[]>([]);
  const [platformLimits, setPlatformLimits] = useState<PlatformLimits>({
    maxUsersPerOrganization: 100,
    maxOrganizations: 1000,
    maxStoragePerOrg: 10,
    maxApiRequestsPerMinute: 1000,
    maxConcurrentMeetings: 50,
    maxMeetingDuration: 480,
    maxParticipantsPerMeeting: 100,
    maxRecordingStoragePerOrg: 50,
    maxWebhooksPerOrg: 10,
    maxIntegrationsPerOrg: 20,
  });
  const [originalPlatformLimits, setOriginalPlatformLimits] = useState<PlatformLimits | null>(null);
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    enabled: false,
    scheduledStart: '',
    scheduledEnd: '',
    message: 'The platform is currently undergoing scheduled maintenance. Please check back soon.',
    allowAdminAccess: true,
    notifyUsersBefore: 24,
    bypassIps: [],
  });
  const [originalMaintenanceSettings, setOriginalMaintenanceSettings] = useState<MaintenanceSettings | null>(null);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    enabled: true,
    frequency: 'daily',
    retentionDays: 30,
    includeMedia: true,
    includeAuditLogs: true,
    encryptBackups: true,
    encryptionKey: '',
    storageLocation: '/backups',
    notifyOnComplete: true,
    notifyOnFailure: true,
    notificationEmail: '',
  });
  const [originalBackupConfig, setOriginalBackupConfig] = useState<BackupConfig | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [maintenancePreviewOpen, setMaintenancePreviewOpen] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all([
        fetch('/api/admin/settings/general', { credentials: 'include' }),
        fetch('/api/admin/settings/email', { credentials: 'include' }),
        fetch('/api/admin/settings/storage', { credentials: 'include' }),
        fetch('/api/admin/settings/integrations', { credentials: 'include' }),
        fetch('/api/admin/settings/limits', { credentials: 'include' }),
        fetch('/api/admin/settings/maintenance', { credentials: 'include' }),
        fetch('/api/admin/settings/backups/config', { credentials: 'include' }),
        fetch('/api/admin/settings/backups/history', { credentials: 'include' }),
      ]);
      if (responses[0].ok) {
        const data = await responses[0].json();
        setGeneralSettings(data);
        setOriginalGeneralSettings(data);
      }
      if (responses[1].ok) {
        const data = await responses[1].json();
        setEmailSettings(data);
        setOriginalEmailSettings(data);
      }
      if (responses[2].ok) {
        const data = await responses[2].json();
        setStorageSettings(data);
        setOriginalStorageSettings(data);
      }
      if (responses[3].ok) {
        const data = await responses[3].json();
        setIntegrations(data);
        setOriginalIntegrations(data);
      }
      if (responses[4].ok) {
        const data = await responses[4].json();
        setPlatformLimits(data);
        setOriginalPlatformLimits(data);
      }
      if (responses[5].ok) {
        const data = await responses[5].json();
        setMaintenanceSettings(data);
        setOriginalMaintenanceSettings(data);
      }
      if (responses[6].ok) {
        const data = await responses[6].json();
        setBackupConfig(data);
        setOriginalBackupConfig(data);
      }
      if (responses[7].ok) {
        const data = await responses[7].json();
        setBackupHistory(data);
      }
    } catch {
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateGeneralSettings = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!generalSettings.platformName.trim()) {
      errors.push({ field: 'platformName', message: 'Platform name is required' });
    }
    if (!generalSettings.supportEmail.trim()) {
      errors.push({ field: 'supportEmail', message: 'Support email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(generalSettings.supportEmail)) {
      errors.push({ field: 'supportEmail', message: 'Invalid email format' });
    }
    if (generalSettings.sessionTimeout < 5 || generalSettings.sessionTimeout > 1440) {
      errors.push({ field: 'sessionTimeout', message: 'Session timeout must be between 5 and 1440 minutes' });
    }
    if (generalSettings.maxLoginAttempts < 1 || generalSettings.maxLoginAttempts > 20) {
      errors.push({ field: 'maxLoginAttempts', message: 'Max login attempts must be between 1 and 20' });
    }
    if (generalSettings.passwordMinLength < 6 || generalSettings.passwordMinLength > 128) {
      errors.push({ field: 'passwordMinLength', message: 'Password minimum length must be between 6 and 128' });
    }
    return errors;
  };

  const validateEmailSettings = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!emailSettings.smtpHost.trim()) {
      errors.push({ field: 'smtpHost', message: 'SMTP host is required' });
    }
    if (emailSettings.smtpPort < 1 || emailSettings.smtpPort > 65535) {
      errors.push({ field: 'smtpPort', message: 'SMTP port must be between 1 and 65535' });
    }
    if (!emailSettings.fromEmail.trim()) {
      errors.push({ field: 'fromEmail', message: 'From email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSettings.fromEmail)) {
      errors.push({ field: 'fromEmail', message: 'Invalid email format' });
    }
    if (!emailSettings.fromName.trim()) {
      errors.push({ field: 'fromName', message: 'From name is required' });
    }
    return errors;
  };

  const saveGeneralSettings = async () => {
    const errors = validateGeneralSettings();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setSaving('general');
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(generalSettings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save settings');
      }
      setOriginalGeneralSettings({ ...generalSettings });
      setSuccess('General settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const saveEmailSettings = async () => {
    const errors = validateEmailSettings();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setSaving('email');
    try {
      const res = await fetch('/api/admin/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(emailSettings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save settings');
      }
      setOriginalEmailSettings({ ...emailSettings });
      setSuccess('Email settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const saveStorageSettings = async () => {
    setSaving('storage');
    try {
      const res = await fetch('/api/admin/settings/storage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(storageSettings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save settings');
      }
      setOriginalStorageSettings({ ...storageSettings });
      setSuccess('Storage settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const saveIntegration = async (integration: Integration) => {
    const savingKey = 'integration-' + integration.id;
    setSaving(savingKey);
    try {
      const res = await fetch('/api/admin/settings/integrations/' + integration.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(integration),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save integration');
      }
      setOriginalIntegrations(integrations.map((i) => (i.id === integration.id ? { ...integration } : i)));
      setSuccess(integration.name + ' integration saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integration');
    } finally {
      setSaving(null);
    }
  };

  const savePlatformLimits = async () => {
    setSaving('limits');
    try {
      const res = await fetch('/api/admin/settings/limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(platformLimits),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save settings');
      }
      setOriginalPlatformLimits({ ...platformLimits });
      setSuccess('Platform limits saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const saveMaintenanceSettings = async () => {
    if (maintenanceSettings.enabled && !maintenanceSettings.message.trim()) {
      setValidationErrors([{ field: 'maintenanceMessage', message: 'Maintenance message is required' }]);
      return;
    }
    setValidationErrors([]);
    setSaving('maintenance');
    try {
      const res = await fetch('/api/admin/settings/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(maintenanceSettings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save settings');
      }
      setOriginalMaintenanceSettings({ ...maintenanceSettings });
      setSuccess('Maintenance settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const saveBackupConfig = async () => {
    if (backupConfig.encryptBackups && !backupConfig.encryptionKey.trim()) {
      setValidationErrors([{ field: 'encryptionKey', message: 'Encryption key is required when encryption is enabled' }]);
      return;
    }
    setValidationErrors([]);
    setSaving('backups');
    try {
      const res = await fetch('/api/admin/settings/backups/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(backupConfig),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save settings');
      }
      setOriginalBackupConfig({ ...backupConfig });
      setSuccess('Backup configuration saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const testEmailConnection = async () => {
    setTestingConnection('email');
    setConnectionTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(emailSettings),
      });
      const data = await res.json();
      setConnectionTestResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Connection successful' : 'Connection failed'),
      });
    } catch {
      setConnectionTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const testIntegrationConnection = async (integration: Integration) => {
    const testingKey = 'integration-' + integration.id;
    setTestingConnection(testingKey);
    setConnectionTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/integrations/' + integration.id + '/test', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setConnectionTestResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Connection successful' : 'Connection failed'),
      });
    } catch {
      setConnectionTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const toggleIntegration = async (integration: Integration, enabled: boolean) => {
    const updatedIntegration = { ...integration, enabled };
    setIntegrations(integrations.map((i) => (i.id === integration.id ? updatedIntegration : i)));
    await saveIntegration(updatedIntegration);
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const triggerBackup = async () => {
    setConfirmDialog({
      open: true,
      title: 'Trigger Manual Backup',
      message: 'Are you sure you want to start a manual backup? This may take several minutes depending on the data size.',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setTriggeringBackup(true);
        try {
          const res = await fetch('/api/admin/settings/backups/trigger', {
            method: 'POST',
            credentials: 'include',
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to trigger backup');
          }
          setSuccess('Backup started successfully');
          setTimeout(() => setSuccess(null), 3000);
          const historyRes = await fetch('/api/admin/settings/backups/history', { credentials: 'include' });
          if (historyRes.ok) {
            const data = await historyRes.json();
            setBackupHistory(data);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to trigger backup');
        } finally {
          setTriggeringBackup(false);
        }
      },
    });
  };

  const resetSettings = (section: string) => {
    setConfirmDialog({
      open: true,
      title: 'Reset Settings',
      message: 'Are you sure you want to reset ' + section + ' settings to their last saved values? Any unsaved changes will be lost.',
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setValidationErrors([]);
        if (section === 'general' && originalGeneralSettings) {
          setGeneralSettings({ ...originalGeneralSettings });
        } else if (section === 'email' && originalEmailSettings) {
          setEmailSettings({ ...originalEmailSettings });
        } else if (section === 'storage' && originalStorageSettings) {
          setStorageSettings({ ...originalStorageSettings });
        } else if (section === 'limits' && originalPlatformLimits) {
          setPlatformLimits({ ...originalPlatformLimits });
        } else if (section === 'maintenance' && originalMaintenanceSettings) {
          setMaintenanceSettings({ ...originalMaintenanceSettings });
        } else if (section === 'backups' && originalBackupConfig) {
          setBackupConfig({ ...originalBackupConfig });
        }
      },
    });
  };

  const getValidationError = (field: string): string | undefined => {
    const found = validationErrors.find((e) => e.field === field);
    return found ? found.message : undefined;
  };

  const formatBytes = (bytes: number | undefined | null): string => {
    if (bytes === undefined || bytes === null || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30">
              <Settings className="w-6 h-6 text-teal-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">System Settings</h1>
          </div>
          <p className="text-slate-400">Configure platform-wide settings and preferences</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-green-400">{success}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-white/5 p-1 rounded-lg flex flex-wrap gap-1">
            <TabsTrigger value="general" className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-slate-400 hover:text-white transition-colors">
              <Globe className="w-4 h-4" />General
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-slate-400 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />Email
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-slate-400 hover:text-white transition-colors">
              <Database className="w-4 h-4" />Storage
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-slate-400 hover:text-white transition-colors">
              <Link className="w-4 h-4" />Integrations
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-slate-400 hover:text-white transition-colors">
              <Gauge className="w-4 h-4" />Limits
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-slate-400 hover:text-white transition-colors">
              <Wrench className="w-4 h-4" />Maintenance
            </TabsTrigger>
            <TabsTrigger value="backups" className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-slate-400 hover:text-white transition-colors">
              <Archive className="w-4 h-4" />Backups
            </TabsTrigger>
          </TabsList>
          {/* General Settings Tab */}
          <TabsContent value="general" className="mt-0">
            <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-400" />
                  General Settings
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => resetSettings('general')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    onClick={saveGeneralSettings}
                    disabled={saving === 'general'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving === 'general' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {/* Platform Information */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-400" />
                    Platform Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="platformName" className="text-slate-300">Platform Name *</Label>
                      <Input
                        id="platformName"
                        value={generalSettings.platformName}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, platformName: e.target.value })}
                        placeholder="My Platform"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                      {getValidationError('platformName') && (
                        <p className="text-sm text-red-400">{getValidationError('platformName')}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail" className="text-slate-300">Support Email *</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        value={generalSettings.supportEmail}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                        placeholder="support@example.com"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                      {getValidationError('supportEmail') && (
                        <p className="text-sm text-red-400">{getValidationError('supportEmail')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Localization */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Localization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="text-slate-300">Default Timezone</Label>
                      <Select
                        value={generalSettings.defaultTimezone}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultTimezone: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value} className="text-white hover:bg-slate-700">
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat" className="text-slate-300">Date Format</Label>
                      <Select
                        value={generalSettings.defaultDateFormat}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultDateFormat: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {DATE_FORMATS.map((fmt) => (
                            <SelectItem key={fmt.value} value={fmt.value} className="text-white hover:bg-slate-700">
                              {fmt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeFormat" className="text-slate-300">Time Format</Label>
                      <Select
                        value={generalSettings.defaultTimeFormat}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultTimeFormat: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {TIME_FORMATS.map((fmt) => (
                            <SelectItem key={fmt.value} value={fmt.value} className="text-white hover:bg-slate-700">
                              {fmt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language" className="text-slate-300">Default Language</Label>
                      <Select
                        value={generalSettings.defaultLanguage}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultLanguage: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value} className="text-white hover:bg-slate-700">
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-slate-300">Default Currency</Label>
                      <Select
                        value={generalSettings.defaultCurrency}
                        onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultCurrency: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr.value} value={curr.value} className="text-white hover:bg-slate-700">
                              {curr.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    Security Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout" className="text-slate-300">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        min={5}
                        max={1440}
                        value={generalSettings.sessionTimeout}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      {getValidationError('sessionTimeout') && (
                        <p className="text-sm text-red-400">{getValidationError('sessionTimeout')}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxLoginAttempts" className="text-slate-300">Max Login Attempts</Label>
                      <Input
                        id="maxLoginAttempts"
                        type="number"
                        min={1}
                        max={20}
                        value={generalSettings.maxLoginAttempts}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      {getValidationError('maxLoginAttempts') && (
                        <p className="text-sm text-red-400">{getValidationError('maxLoginAttempts')}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passwordMinLength" className="text-slate-300">Password Min Length</Label>
                      <Input
                        id="passwordMinLength"
                        type="number"
                        min={6}
                        max={128}
                        value={generalSettings.passwordMinLength}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, passwordMinLength: parseInt(e.target.value) || 8 })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      {getValidationError('passwordMinLength') && (
                        <p className="text-sm text-red-400">{getValidationError('passwordMinLength')}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div>
                        <p className="text-white font-medium">Require Multi-Factor Authentication</p>
                        <p className="text-sm text-slate-400">Require MFA for all user accounts</p>
                      </div>
                      <Switch
                        checked={generalSettings.requireMfa}
                        onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, requireMfa: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div>
                        <p className="text-white font-medium">Allow Public Signup</p>
                        <p className="text-sm text-slate-400">Allow users to create accounts without invitation</p>
                      </div>
                      <Switch
                        checked={generalSettings.allowPublicSignup}
                        onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, allowPublicSignup: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div>
                        <p className="text-white font-medium">Require Email Verification</p>
                        <p className="text-sm text-slate-400">Require email verification before account activation</p>
                      </div>
                      <Switch
                        checked={generalSettings.requireEmailVerification}
                        onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, requireEmailVerification: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
