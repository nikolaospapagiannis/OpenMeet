'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  FileText,
  AlertTriangle,
  Settings,
  Download,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Check,
  X,
  Eye,
  Trash2,
  Lock,
  Unlock,
  Users,
  Clock,
  Globe,
  Key,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Building2,
  UserX,
  ShieldAlert,
  ShieldCheck,
  FileWarning,
  Database,
  Fingerprint,
  MailWarning,
  Ban,
  CircleSlash,
  Loader2,
  Save,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface GDPRRequest {
  id: string;
  type: 'SAR' | 'DELETION' | 'RECTIFICATION' | 'PORTABILITY' | 'CONSENT_WITHDRAWAL';
  requestType: 'access' | 'deletion' | 'rectification' | 'portability' | 'restriction' | 'objection';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  requesterEmail: string;
  subjectEmail: string;
  requesterName: string;
  organizationId: string;
  organizationName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  assignedTo?: string;
  notes?: string;
  dataCategories: string[];
}

interface SOC2Control {
  id: string;
  controlId: string;
  name: string;
  category: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  evidenceCount: number;
  lastReviewedAt: string;
}

interface SOC2Category {
  name: string;
  score: number;
  maxScore: number;
  status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  findings: number;
  criticalFindings: number;
  controlsPassed: number;
  totalControls: number;
}

interface SOC2Score {
  overallScore: number;
  maxScore: number;
  lastAuditDate: string;
  nextAuditDate: string;
  certificationStatus: 'certified' | 'pending' | 'expired' | 'none';
  categories: SOC2Category[];
  controls: SOC2Control[];
  complianceItems: {
    id: string;
    control: string;
    description: string;
    status: 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE';
    evidence?: string;
    lastChecked: string;
  }[];
}

interface SecuritySettings {
  ipAllowlist: string[];
  ipBlocklist: string[];
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  forceLogoutOnIdle: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays: number;
    historyCount: number;
    maxFailedAttempts: number;
  };
  mfaEnforced: boolean;
  mfaMethods: string[];
  apiRateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

interface ThreatEvent {
  id: string;
  eventType: 'failed_login' | 'suspicious_activity' | 'brute_force' | 'unauthorized_access' | 'rate_limit_exceeded' | 'malware_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  source: string;
  sourceIp: string;
  target: string;
  description: string;
  organizationId: string;
  organizationName: string;
  timestamp: string;
  detectedAt: string;
  resolvedAt?: string;
  resolved: boolean;
  blocked: boolean;
  ipAddress?: string;
  userAgent?: string;
  userEmail?: string;
  geoLocation?: string;
  actionsTaken?: string[];
  metadata?: Record<string, unknown>;
}

interface FailedLoginAttempt {
  organizationId: string;
  organizationName: string;
  count: number;
  lastAttempt: string;
  uniqueIPs: number;
  topIPs: { ip: string; count: number }[];
}

interface DataProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  retentionPeriod: string;
  recipients: string[];
  crossBorderTransfers: boolean;
  lastReviewed: string;
}

interface ConsentRecord {
  id: string;
  userId: string;
  userEmail: string;
  consentType: string;
  granted: boolean;
  grantedAt: string;
  withdrawnAt?: string;
  version: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState('gdpr');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');

  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([]);
  const [gdprPage, setGdprPage] = useState(1);
  const [gdprTotalPages, setGdprTotalPages] = useState(1);
  const [gdprTypeFilter, setGdprTypeFilter] = useState<string>('all');
  const [gdprStatusFilter, setGdprStatusFilter] = useState<string>('all');
  const [gdprSearch, setGdprSearch] = useState('');
  const [selectedGdprRequest, setSelectedGdprRequest] = useState<GDPRRequest | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processNote, setProcessNote] = useState('');
  const [processAction, setProcessAction] = useState<'approve' | 'reject'>('approve');

  const [dataProcessingActivities, setDataProcessingActivities] = useState<DataProcessingActivity[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);

  const [soc2Score, setSoc2Score] = useState<SOC2Score | null>(null);
  const [soc2Loading, setSoc2Loading] = useState(false);

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [editedSettings, setEditedSettings] = useState<SecuritySettings | null>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [newAllowlistIP, setNewAllowlistIP] = useState('');
  const [newBlocklistIP, setNewBlocklistIP] = useState('');

  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>([]);
  const [threatPage, setThreatPage] = useState(1);
  const [threatTotalPages, setThreatTotalPages] = useState(1);
  const [threatSeverityFilter, setThreatSeverityFilter] = useState<string>('all');
  const [threatFilter, setThreatFilter] = useState<string>('all');
  const [threatStatusFilter, setThreatStatusFilter] = useState<string>('all');
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);
  const [showThreatDialog, setShowThreatDialog] = useState(false);
  const [threatDialogOpen, setThreatDialogOpen] = useState(false);
  const [threatsLoading, setThreatsLoading] = useState(false);
  const [failedLogins, setFailedLogins] = useState<FailedLoginAttempt[]>([]);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  const [exportDateRange, setExportDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [exportType, setExportType] = useState<string>('full');
  const [exporting, setExporting] = useState(false);

  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('pending');
  const [processNotes, setProcessNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedGDPRRequest, setSelectedGDPRRequest] = useState<GDPRRequest | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch(API_BASE_URL + '/api/admin/organizations', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch organizations');
      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  }, []);

  const fetchGDPRRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: gdprPage.toString(),
        limit: '10',
      });
      if (selectedOrganization !== 'all') params.append('organizationId', selectedOrganization);
      if (gdprTypeFilter !== 'all') params.append('type', gdprTypeFilter);
      if (gdprStatusFilter !== 'all') params.append('status', gdprStatusFilter);
      if (gdprSearch) params.append('search', gdprSearch);

      const response = await fetch(API_BASE_URL + '/api/admin/compliance/gdpr?' + params, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch GDPR requests');
      const data = await response.json();
      setGdprRequests(data.requests || []);
      setGdprTotalPages(data.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GDPR requests');
    } finally {
      setLoading(false);
    }
  }, [gdprPage, selectedOrganization, gdprTypeFilter, gdprStatusFilter, gdprSearch]);

  const fetchDataProcessingActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOrganization !== 'all') params.append('organizationId', selectedOrganization);

      const response = await fetch(API_BASE_URL + '/api/admin/compliance/gdpr/activities?' + params, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch data processing activities');
      const data = await response.json();
      setDataProcessingActivities(data.activities || []);
    } catch (err) {
      console.error('Error fetching data processing activities:', err);
    }
  }, [selectedOrganization]);

  const fetchConsentRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (selectedOrganization !== 'all') params.append('organizationId', selectedOrganization);

      const response = await fetch(API_BASE_URL + '/api/admin/compliance/gdpr/consents?' + params, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch consent records');
      const data = await response.json();
      setConsentRecords(data.consents || []);
    } catch (err) {
      console.error('Error fetching consent records:', err);
    }
  }, [selectedOrganization]);

  const fetchSOC2Score = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedOrganization !== 'all') params.append('organizationId', selectedOrganization);

      const response = await fetch(API_BASE_URL + '/api/admin/compliance/soc2?' + params, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch SOC2 score');
      const data = await response.json();
      setSoc2Score(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SOC2 score');
    } finally {
      setLoading(false);
    }
  }, [selectedOrganization]);

  const fetchSecuritySettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE_URL + '/api/admin/compliance/security', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch security settings');
      const data = await response.json();
      setSecuritySettings(data);
      setEditedSettings(JSON.parse(JSON.stringify(data)));
      setSettingsChanged(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchThreats = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: threatPage.toString(),
        limit: '10',
      });
      if (selectedOrganization !== 'all') params.append('organizationId', selectedOrganization);
      if (threatSeverityFilter !== 'all') params.append('severity', threatSeverityFilter);
      if (threatStatusFilter !== 'all') params.append('status', threatStatusFilter);

      const response = await fetch(API_BASE_URL + '/api/admin/compliance/threats?' + params, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch threats');
      const data = await response.json();
      setThreats(data.threats || []);
      setThreatTotalPages(data.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load threats');
    } finally {
      setLoading(false);
    }
  }, [threatPage, selectedOrganization, threatSeverityFilter, threatStatusFilter]);

  const fetchFailedLogins = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOrganization !== 'all') params.append('organizationId', selectedOrganization);

      const response = await fetch(API_BASE_URL + '/api/admin/compliance/threats/failed-logins?' + params, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch failed logins');
      const data = await response.json();
      setFailedLogins(data.failedLogins || []);
    } catch (err) {
      console.error('Error fetching failed logins:', err);
    }
  }, [selectedOrganization]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (activeTab === 'gdpr') {
      fetchGDPRRequests();
      fetchDataProcessingActivities();
      fetchConsentRecords();
    } else if (activeTab === 'soc2') {
      fetchSOC2Score();
    } else if (activeTab === 'security') {
      fetchSecuritySettings();
    } else if (activeTab === 'threats') {
      fetchThreats();
      fetchFailedLogins();
    }
  }, [activeTab, fetchGDPRRequests, fetchDataProcessingActivities, fetchConsentRecords, fetchSOC2Score, fetchSecuritySettings, fetchThreats, fetchFailedLogins]);

  const handleProcessGDPRRequest = async () => {
    if (!selectedGdprRequest) return;

    try {
      const response = await fetch(API_BASE_URL + '/api/admin/compliance/gdpr/' + selectedGdprRequest.id, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: processAction,
          notes: processNote,
        }),
      });

      if (!response.ok) throw new Error('Failed to process request');

      setShowProcessDialog(false);
      setSelectedGdprRequest(null);
      setProcessNote('');
      fetchGDPRRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    }
  };

  const handleSaveSecuritySettings = async () => {
    if (!editedSettings) return;

    try {
      setSettingsSaving(true);
      const response = await fetch(API_BASE_URL + '/api/admin/compliance/security', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSettings),
      });

      if (!response.ok) throw new Error('Failed to save security settings');

      const data = await response.json();
      setSecuritySettings(data);
      setEditedSettings(JSON.parse(JSON.stringify(data)));
      setSettingsChanged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAddAllowlistIP = () => {
    if (!editedSettings || !newAllowlistIP) return;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
    if (!ipRegex.test(newAllowlistIP)) {
      setError('Invalid IP address format');
      return;
    }
    if (editedSettings.ipAllowlist.includes(newAllowlistIP)) {
      setError('IP already in allowlist');
      return;
    }
    setEditedSettings({
      ...editedSettings,
      ipAllowlist: [...editedSettings.ipAllowlist, newAllowlistIP],
    });
    setNewAllowlistIP('');
    setSettingsChanged(true);
    setError(null);
  };

  const handleRemoveAllowlistIP = (ip: string) => {
    if (!editedSettings) return;
    setEditedSettings({
      ...editedSettings,
      ipAllowlist: editedSettings.ipAllowlist.filter(i => i !== ip),
    });
    setSettingsChanged(true);
  };

  const handleAddBlocklistIP = () => {
    if (!editedSettings || !newBlocklistIP) return;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
    if (!ipRegex.test(newBlocklistIP)) {
      setError('Invalid IP address format');
      return;
    }
    if (editedSettings.ipBlocklist.includes(newBlocklistIP)) {
      setError('IP already in blocklist');
      return;
    }
    setEditedSettings({
      ...editedSettings,
      ipBlocklist: [...editedSettings.ipBlocklist, newBlocklistIP],
    });
    setNewBlocklistIP('');
    setSettingsChanged(true);
    setError(null);
  };

  const handleRemoveBlocklistIP = (ip: string) => {
    if (!editedSettings) return;
    setEditedSettings({
      ...editedSettings,
      ipBlocklist: editedSettings.ipBlocklist.filter(i => i !== ip),
    });
    setSettingsChanged(true);
  };

  const handleExportReport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append('format', exportFormat);
      params.append('dateStart', exportDateRange.start);
      params.append('dateEnd', exportDateRange.end);
      params.append('type', exportType);
      if (selectedOrganization !== 'all') params.append('organizationId', selectedOrganization);

      const response = await fetch(API_BASE_URL + '/api/admin/compliance/export?' + params, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compliance-report-' + new Date().toISOString().split('T')[0] + '.' + exportFormat;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowExportDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleBlockIP = async (ip: string) => {
    try {
      const response = await fetch(API_BASE_URL + '/api/admin/compliance/security/block-ip', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      if (!response.ok) throw new Error('Failed to block IP');
      if (editedSettings) {
        setEditedSettings({
          ...editedSettings,
          ipBlocklist: [...editedSettings.ipBlocklist, ip],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block IP');
    }
  };

  const handleResolveThreat = async (threatId: string) => {
    try {
      const response = await fetch(API_BASE_URL + '/api/admin/compliance/threats/' + threatId + '/resolve', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to resolve threat');
      setThreatEvents(prev => prev.map(t =>
        t.id === threatId ? { ...t, resolved: true, status: 'RESOLVED' as const } : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve threat');
    }
  };

  const getGDPRTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SAR: 'Subject Access Request',
      DELETION: 'Data Deletion',
      RECTIFICATION: 'Data Rectification',
      PORTABILITY: 'Data Portability',
      CONSENT_WITHDRAWAL: 'Consent Withdrawal',
    };
    return labels[type] || type;
  };

  const getGDPRTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      SAR: <FileText className="w-4 h-4" />,
      DELETION: <Trash2 className="w-4 h-4" />,
      RECTIFICATION: <FileWarning className="w-4 h-4" />,
      PORTABILITY: <Database className="w-4 h-4" />,
      CONSENT_WITHDRAWAL: <UserX className="w-4 h-4" />,
    };
    return icons[type] || <FileText className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
      REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
      ACTIVE: 'bg-red-500/20 text-red-400 border-red-500/30',
      INVESTIGATING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      RESOLVED: 'bg-green-500/20 text-green-400 border-green-500/30',
      FALSE_POSITIVE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[severity] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getThreatIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      BRUTE_FORCE: <Lock className="w-4 h-4" />,
      SUSPICIOUS_LOGIN: <AlertTriangle className="w-4 h-4" />,
      DATA_EXFILTRATION: <Database className="w-4 h-4" />,
      PRIVILEGE_ESCALATION: <ShieldAlert className="w-4 h-4" />,
      ANOMALOUS_ACTIVITY: <Activity className="w-4 h-4" />,
      MALWARE_DETECTED: <Ban className="w-4 h-4" />,
    };
    return icons[type] || <AlertTriangle className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const gdprStats = {
    total: gdprRequests.length,
    pending: gdprRequests.filter(r => r.status === 'PENDING').length,
    inProgress: gdprRequests.filter(r => r.status === 'IN_PROGRESS').length,
    completed: gdprRequests.filter(r => r.status === 'COMPLETED').length,
    overdue: gdprRequests.filter(r => new Date(r.dueDate) < new Date() && r.status !== 'COMPLETED').length,
  };

  const threatStats = {
    total: threats.length,
    active: threats.filter(t => t.status === 'ACTIVE').length,
    critical: threats.filter(t => t.severity === 'critical').length,
    resolved: threats.filter(t => t.status === 'RESOLVED').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-400" />
              Compliance & Security
            </h1>
            <p className="text-slate-400 mt-1">
              Monitor GDPR compliance, SOC2 status, security settings, and threat detection
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
              <SelectTrigger className="w-[200px] bg-slate-800/50 border-slate-700 text-white">
                <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white hover:bg-slate-700">
                  All Organizations
                </SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id} className="text-white hover:bg-slate-700">
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 p-1">
            <TabsTrigger
              value="gdpr"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400"
            >
              <FileText className="w-4 h-4 mr-2" />
              GDPR Compliance
            </TabsTrigger>
            <TabsTrigger
              value="soc2"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              SOC2 Status
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400"
            >
              <Settings className="w-4 h-4 mr-2" />
              Security Settings
            </TabsTrigger>
            <TabsTrigger
              value="threats"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Threat Detection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gdpr" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Total Requests</span>
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-2xl font-bold text-white mt-2">{gdprStats.total}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Pending</span>
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-400 mt-2">{gdprStats.pending}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">In Progress</span>
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-400 mt-2">{gdprStats.inProgress}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Completed</span>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-400 mt-2">{gdprStats.completed}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Overdue</span>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-400 mt-2">{gdprStats.overdue}</p>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Data Subject Requests</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search requests..."
                      value={gdprSearch}
                      onChange={(e) => setGdprSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <Select value={gdprTypeFilter} onValueChange={setGdprTypeFilter}>
                    <SelectTrigger className="w-[180px] bg-slate-900/50 border-slate-600 text-white">
                      <Filter className="w-4 h-4 mr-2 text-slate-400" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all" className="text-white hover:bg-slate-700">All Types</SelectItem>
                      <SelectItem value="SAR" className="text-white hover:bg-slate-700">Subject Access Request</SelectItem>
                      <SelectItem value="DELETION" className="text-white hover:bg-slate-700">Data Deletion</SelectItem>
                      <SelectItem value="RECTIFICATION" className="text-white hover:bg-slate-700">Data Rectification</SelectItem>
                      <SelectItem value="PORTABILITY" className="text-white hover:bg-slate-700">Data Portability</SelectItem>
                      <SelectItem value="CONSENT_WITHDRAWAL" className="text-white hover:bg-slate-700">Consent Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={gdprStatusFilter} onValueChange={setGdprStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-slate-900/50 border-slate-600 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all" className="text-white hover:bg-slate-700">All Status</SelectItem>
                      <SelectItem value="PENDING" className="text-white hover:bg-slate-700">Pending</SelectItem>
                      <SelectItem value="IN_PROGRESS" className="text-white hover:bg-slate-700">In Progress</SelectItem>
                      <SelectItem value="COMPLETED" className="text-white hover:bg-slate-700">Completed</SelectItem>
                      <SelectItem value="REJECTED" className="text-white hover:bg-slate-700">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => fetchGDPRRequests()}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <RefreshCw className={'w-4 h-4 text-slate-300 ' + (loading ? 'animate-spin' : '')} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              ) : gdprRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No GDPR requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-400">Type</TableHead>
                      <TableHead className="text-slate-400">Requester</TableHead>
                      <TableHead className="text-slate-400">Organization</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Due Date</TableHead>
                      <TableHead className="text-slate-400">Created</TableHead>
                      <TableHead className="text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gdprRequests.map((request) => (
                      <TableRow key={request.id} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getGDPRTypeIcon(request.type)}
                            <span className="text-white">{getGDPRTypeLabel(request.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white">{request.requesterName}</p>
                            <p className="text-slate-400 text-sm">{request.requesterEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{request.organizationName}</TableCell>
                        <TableCell>
                          <span className={'px-2 py-1 rounded-full text-xs font-medium border ' + getStatusBadge(request.status)}>
                            {request.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={'text-sm ' + (new Date(request.dueDate) < new Date() && request.status !== 'COMPLETED' ? 'text-red-400' : 'text-slate-300')}>
                            {formatDate(request.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedGdprRequest(request);
                                setProcessAction('approve');
                                setShowProcessDialog(true);
                              }}
                              className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
                              title="Process Request"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGdprRequest(request);
                                setProcessAction('reject');
                                setShowProcessDialog(true);
                              }}
                              className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                              title="Reject Request"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedGdprRequest(request)}
                              className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {gdprTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">
                    Page {gdprPage} of {gdprTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGdprPage(p => Math.max(1, p - 1))}
                      disabled={gdprPage === 1}
                      className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-300" />
                    </button>
                    <button
                      onClick={() => setGdprPage(p => Math.min(gdprTotalPages, p + 1))}
                      disabled={gdprPage === gdprTotalPages}
                      className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Data Processing Activities
                </h3>
                {dataProcessingActivities.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No activities found</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {dataProcessingActivities.map((activity) => (
                      <div key={activity.id} className="p-3 bg-slate-900/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-medium">{activity.name}</h4>
                          {activity.crossBorderTransfers && (
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              <Globe className="w-3 h-3 mr-1" />
                              Cross-Border
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{activity.purpose}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Legal Basis: {activity.legalBasis}</span>
                          <span>Retention: {activity.retentionPeriod}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-emerald-400" />
                  Recent Consent Records
                </h3>
                {consentRecords.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No consent records found</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {consentRecords.slice(0, 10).map((consent) => (
                      <div key={consent.id} className="p-3 bg-slate-900/50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm">{consent.userEmail}</p>
                          <p className="text-slate-400 text-xs">{consent.consentType}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {consent.granted ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                              <Check className="w-3 h-3 mr-1" />
                              Granted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                              <X className="w-3 h-3 mr-1" />
                              Withdrawn
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* SOC2 Compliance Tab */}
          <TabsContent value="soc2" className="space-y-6">
            {soc2Loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : soc2Score ? (
              <>
                {/* Overall Score Card */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-blue-500" />
                      Overall SOC2 Compliance Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      {/* Circular Progress */}
                      <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            className="text-slate-700"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 56}
                            strokeDashoffset={2 * Math.PI * 56 * (1 - soc2Score.overallScore / 100)}
                            className={
                              soc2Score.overallScore >= 90 ? 'text-green-500' :
                              soc2Score.overallScore >= 70 ? 'text-yellow-500' : 'text-red-500'
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">{soc2Score.overallScore}%</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-sm text-slate-400">Certification Status</p>
                          <p className={
                            soc2Score.certificationStatus === 'certified' ? 'text-green-400 font-medium' :
                            soc2Score.certificationStatus === 'pending' ? 'text-yellow-400 font-medium' :
                            'text-red-400 font-medium'
                          }>
                            {soc2Score.certificationStatus.charAt(0).toUpperCase() + soc2Score.certificationStatus.slice(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Last Audit</p>
                          <p className="text-white">{formatDate(soc2Score.lastAuditDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Next Audit Due</p>
                          <p className="text-white">{formatDate(soc2Score.nextAuditDate)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {soc2Score.categories.map((category) => (
                    <Card key={category.name} className="bg-slate-900/50 border-slate-800">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-slate-400 mb-2">{category.name}</p>
                          <div className="relative w-20 h-20 mx-auto">
                            <svg className="w-20 h-20 transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-slate-700"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={2 * Math.PI * 32}
                                strokeDashoffset={2 * Math.PI * 32 * (1 - category.score / 100)}
                                className={
                                  category.score >= 90 ? 'text-green-500' :
                                  category.score >= 70 ? 'text-yellow-500' : 'text-red-500'
                                }
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-white">{category.score}%</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            {category.controlsPassed}/{category.totalControls} controls
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Compliance Controls Table */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Compliance Controls</CardTitle>
                    <CardDescription className="text-slate-400">
                      Detailed view of all SOC2 compliance controls
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-slate-800/50">
                          <TableHead className="text-slate-400">Control ID</TableHead>
                          <TableHead className="text-slate-400">Control Name</TableHead>
                          <TableHead className="text-slate-400">Category</TableHead>
                          <TableHead className="text-slate-400">Status</TableHead>
                          <TableHead className="text-slate-400">Evidence</TableHead>
                          <TableHead className="text-slate-400">Last Reviewed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {soc2Score.controls.map((control) => (
                          <TableRow key={control.id} className="border-slate-800 hover:bg-slate-800/50">
                            <TableCell className="text-white font-mono">{control.controlId}</TableCell>
                            <TableCell className="text-white">{control.name}</TableCell>
                            <TableCell className="text-slate-300">{control.category}</TableCell>
                            <TableCell>
                              <Badge className={
                                control.status === 'compliant' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                control.status === 'partial' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }>
                                {control.status.charAt(0).toUpperCase() + control.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-slate-400 border-slate-600">
                                {control.evidenceCount} items
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-400">{formatDate(control.lastReviewedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-12 text-center">
                  <ShieldAlert className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No SOC2 compliance data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : securitySettings ? (
              <>
                {/* IP Access Control */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      IP Access Control
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Manage IP allowlist and blocklist for access control
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* IP Allowlist */}
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          IP Allowlist (one per line)
                        </label>
                        <textarea
                          className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.ipAllowlist.join('\n') || ''}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            ipAllowlist: e.target.value.split('\n').filter(ip => ip.trim())
                          } : null)}
                          placeholder="e.g., 192.168.1.0/24"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Leave empty to allow all IPs (not recommended for production)
                        </p>
                      </div>
                      {/* IP Blocklist */}
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          IP Blocklist (one per line)
                        </label>
                        <textarea
                          className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.ipBlocklist.join('\n') || ''}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            ipBlocklist: e.target.value.split('\n').filter(ip => ip.trim())
                          } : null)}
                          placeholder="e.g., 10.0.0.1"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Blocked IPs will be denied access immediately
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Management */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      Session Management
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure session timeout and idle settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="1440"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.sessionTimeoutMinutes || 30}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            sessionTimeoutMinutes: parseInt(e.target.value) || 30
                          } : null)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Max Concurrent Sessions
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.maxConcurrentSessions || 3}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            maxConcurrentSessions: parseInt(e.target.value) || 3
                          } : null)}
                        />
                      </div>
                      <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-300">Force Logout on Idle</p>
                          <p className="text-xs text-slate-500">Automatically logout inactive users</p>
                        </div>
                        <Switch
                          checked={editedSettings?.forceLogoutOnIdle || false}
                          onCheckedChange={(checked) => setEditedSettings(prev => prev ? {
                            ...prev,
                            forceLogoutOnIdle: checked
                          } : null)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Password Policy */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Key className="h-5 w-5 text-blue-500" />
                      Password Policy
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure password strength and expiration requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Minimum Length
                        </label>
                        <input
                          type="number"
                          min="8"
                          max="128"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.passwordPolicy.minLength || 12}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              minLength: parseInt(e.target.value) || 12
                            }
                          } : null)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Password History
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.passwordPolicy.historyCount || 5}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              historyCount: parseInt(e.target.value) || 5
                            }
                          } : null)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Previous passwords to remember</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Expiry (days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="365"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.passwordPolicy.expiryDays || 90}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              expiryDays: parseInt(e.target.value) || 90
                            }
                          } : null)}
                        />
                        <p className="text-xs text-slate-500 mt-1">0 = never expires</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Max Failed Attempts
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="20"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.passwordPolicy.maxFailedAttempts || 5}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              maxFailedAttempts: parseInt(e.target.value) || 5
                            }
                          } : null)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
                        <Checkbox
                          id="requireUppercase"
                          checked={editedSettings?.passwordPolicy.requireUppercase || false}
                          onCheckedChange={(checked) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              requireUppercase: !!checked
                            }
                          } : null)}
                        />
                        <label htmlFor="requireUppercase" className="text-sm text-slate-300">Require Uppercase</label>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
                        <Checkbox
                          id="requireLowercase"
                          checked={editedSettings?.passwordPolicy.requireLowercase || false}
                          onCheckedChange={(checked) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              requireLowercase: !!checked
                            }
                          } : null)}
                        />
                        <label htmlFor="requireLowercase" className="text-sm text-slate-300">Require Lowercase</label>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
                        <Checkbox
                          id="requireNumbers"
                          checked={editedSettings?.passwordPolicy.requireNumbers || false}
                          onCheckedChange={(checked) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              requireNumbers: !!checked
                            }
                          } : null)}
                        />
                        <label htmlFor="requireNumbers" className="text-sm text-slate-300">Require Numbers</label>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
                        <Checkbox
                          id="requireSpecialChars"
                          checked={editedSettings?.passwordPolicy.requireSpecialChars || false}
                          onCheckedChange={(checked) => setEditedSettings(prev => prev ? {
                            ...prev,
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              requireSpecialChars: !!checked
                            }
                          } : null)}
                        />
                        <label htmlFor="requireSpecialChars" className="text-sm text-slate-300">Require Special</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* MFA Enforcement */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Fingerprint className="h-5 w-5 text-blue-500" />
                      Multi-Factor Authentication
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure MFA requirements for users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-300">Enforce MFA</p>
                          <p className="text-xs text-slate-500">Require MFA for all users</p>
                        </div>
                        <Switch
                          checked={editedSettings?.mfaEnforced || false}
                          onCheckedChange={(checked) => setEditedSettings(prev => prev ? {
                            ...prev,
                            mfaEnforced: checked
                          } : null)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Allowed MFA Methods
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['totp', 'sms', 'email', 'webauthn'].map(method => (
                            <Badge
                              key={method}
                              variant={editedSettings?.mfaMethods.includes(method) ? 'default' : 'outline'}
                              className={
                                editedSettings?.mfaMethods.includes(method)
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 cursor-pointer'
                                  : 'text-slate-400 border-slate-600 cursor-pointer hover:bg-slate-800'
                              }
                              onClick={() => {
                                if (!editedSettings) return;
                                const methods = editedSettings.mfaMethods.includes(method)
                                  ? editedSettings.mfaMethods.filter(m => m !== method)
                                  : [...editedSettings.mfaMethods, method];
                                setEditedSettings({ ...editedSettings, mfaMethods: methods });
                              }}
                            >
                              {method.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* API Rate Limiting */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                      API Rate Limiting
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure rate limiting for API endpoints
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Requests per Minute
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="10000"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.apiRateLimit.requestsPerMinute || 100}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            apiRateLimit: {
                              ...prev.apiRateLimit,
                              requestsPerMinute: parseInt(e.target.value) || 100
                            }
                          } : null)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Burst Limit
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="1000"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editedSettings?.apiRateLimit.burstLimit || 50}
                          onChange={(e) => setEditedSettings(prev => prev ? {
                            ...prev,
                            apiRateLimit: {
                              ...prev.apiRateLimit,
                              burstLimit: parseInt(e.target.value) || 50
                            }
                          } : null)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Maximum requests in a short burst</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveSecuritySettings}
                    disabled={settingsSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {settingsSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Security Settings
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-12 text-center">
                  <Settings className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No security settings available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Threat Detection Tab */}
          <TabsContent value="threats" className="space-y-6">
            {threatsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Threat Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Total Events (24h)</p>
                          <p className="text-2xl font-bold text-white">{threatEvents.length}</p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Critical Events</p>
                          <p className="text-2xl font-bold text-red-400">
                            {threatEvents.filter(e => e.severity === 'critical').length}
                          </p>
                        </div>
                        <ShieldAlert className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Failed Logins</p>
                          <p className="text-2xl font-bold text-yellow-400">
                            {threatEvents.filter(e => e.eventType === 'failed_login').length}
                          </p>
                        </div>
                        <Lock className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Blocked IPs</p>
                          <p className="text-2xl font-bold text-orange-400">
                            {threatEvents.filter(e => e.blocked).length}
                          </p>
                        </div>
                        <Ban className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Failed Logins by Organization */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Lock className="h-5 w-5 text-yellow-500" />
                      Failed Login Attempts by Organization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {organizations.slice(0, 5).map(org => {
                        const failedCount = threatEvents.filter(
                          e => e.organizationId === org.id && e.eventType === 'failed_login'
                        ).length;
                        const maxFailed = Math.max(
                          ...organizations.map(o => 
                            threatEvents.filter(e => e.organizationId === o.id && e.eventType === 'failed_login').length
                          ),
                          1
                        );
                        return (
                          <div key={org.id} className="flex items-center gap-4">
                            <div className="w-32 truncate text-sm text-slate-300">{org.name}</div>
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                                style={{ width: (failedCount / maxFailed * 100) + '%' }}
                              />
                            </div>
                            <div className="w-12 text-right text-sm text-slate-400">{failedCount}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Security Events Table */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <CardTitle className="text-white">Security Events</CardTitle>
                        <CardDescription className="text-slate-400">
                          Real-time security event monitoring
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Select value={threatFilter} onValueChange={setThreatFilter}>
                          <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="All Severities" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-white hover:bg-slate-700">All Severities</SelectItem>
                            <SelectItem value="critical" className="text-white hover:bg-slate-700">Critical</SelectItem>
                            <SelectItem value="high" className="text-white hover:bg-slate-700">High</SelectItem>
                            <SelectItem value="medium" className="text-white hover:bg-slate-700">Medium</SelectItem>
                            <SelectItem value="low" className="text-white hover:bg-slate-700">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-slate-800/50">
                          <TableHead className="text-slate-400">Timestamp</TableHead>
                          <TableHead className="text-slate-400">Event Type</TableHead>
                          <TableHead className="text-slate-400">Severity</TableHead>
                          <TableHead className="text-slate-400">Source IP</TableHead>
                          <TableHead className="text-slate-400">User</TableHead>
                          <TableHead className="text-slate-400">Status</TableHead>
                          <TableHead className="text-slate-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {threatEvents
                          .filter(e => threatFilter === 'all' || e.severity === threatFilter)
                          .slice(0, 20)
                          .map((event) => (
                          <TableRow key={event.id} className="border-slate-800 hover:bg-slate-800/50">
                            <TableCell className="text-slate-400 text-sm">
                              {formatDate(event.timestamp)}
                            </TableCell>
                            <TableCell className="text-white">
                              <div className="flex items-center gap-2">
                                {event.eventType === 'failed_login' && <Lock className="h-4 w-4 text-yellow-500" />}
                                {event.eventType === 'suspicious_activity' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                {event.eventType === 'brute_force' && <ShieldAlert className="h-4 w-4 text-red-500" />}
                                {event.eventType === 'unauthorized_access' && <Ban className="h-4 w-4 text-red-500" />}
                                {event.eventType === 'rate_limit_exceeded' && <Zap className="h-4 w-4 text-blue-500" />}
                                <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSeverityBadge(event.severity)}>
                                {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300 font-mono text-sm">{event.sourceIp}</TableCell>
                            <TableCell className="text-slate-300">{event.userEmail || 'N/A'}</TableCell>
                            <TableCell>
                              {event.blocked ? (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Blocked</Badge>
                              ) : event.resolved ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Resolved</Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedThreat(event);
                                  setThreatDialogOpen(true);
                                }}
                                className="text-slate-400 hover:text-white hover:bg-slate-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {threatEvents.length === 0 && (
                      <div className="text-center py-8">
                        <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-slate-400">No security events detected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Process GDPR Request Dialog */}
        <Dialog open={processDialogOpen} onClose={() => setProcessDialogOpen(false)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Process GDPR Request</DialogTitle>
              <DialogDescription className="text-slate-400">
                Update the status of this data subject request
              </DialogDescription>
            </DialogHeader>
            {selectedGDPRRequest && (
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Request ID</span>
                    <span className="text-white font-mono">{selectedGDPRRequest.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white">{getGDPRTypeLabel(selectedGDPRRequest.requestType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subject Email</span>
                    <span className="text-white">{selectedGDPRRequest.subjectEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Status</span>
                    {getStatusBadge(selectedGDPRRequest.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    New Status
                  </label>
                  <Select value={processStatus} onValueChange={setProcessStatus}>
                    <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="pending" className="text-white hover:bg-slate-700">Pending</SelectItem>
                      <SelectItem value="in_progress" className="text-white hover:bg-slate-700">In Progress</SelectItem>
                      <SelectItem value="completed" className="text-white hover:bg-slate-700">Completed</SelectItem>
                      <SelectItem value="rejected" className="text-white hover:bg-slate-700">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Notes
                  </label>
                  <textarea
                    className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={processNotes}
                    onChange={(e) => setProcessNotes(e.target.value)}
                    placeholder="Add notes about this action..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setProcessDialogOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessGDPRRequest}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Threat Details Dialog */}
        <Dialog open={threatDialogOpen} onClose={() => setThreatDialogOpen(false)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Security Event Details
              </DialogTitle>
            </DialogHeader>
            {selectedThreat && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Event Type</p>
                    <p className="text-white capitalize">{selectedThreat.eventType.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Severity</p>
                    <Badge className={getSeverityBadge(selectedThreat.severity)}>
                      {selectedThreat.severity.charAt(0).toUpperCase() + selectedThreat.severity.slice(1)}
                    </Badge>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Source IP</p>
                    <p className="text-white font-mono">{selectedThreat.sourceIp}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Timestamp</p>
                    <p className="text-white text-sm">{formatDate(selectedThreat.timestamp)}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">User Agent</p>
                    <p className="text-white text-xs truncate">{selectedThreat.userAgent || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">User Email</p>
                    <p className="text-white">{selectedThreat.userEmail || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  <p className="text-white text-sm">{selectedThreat.description}</p>
                </div>
                {selectedThreat.metadata && Object.keys(selectedThreat.metadata).length > 0 && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Additional Details</p>
                    <pre className="text-xs text-slate-300 overflow-auto max-h-32">
                      {JSON.stringify(selectedThreat.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="flex gap-2">
                  {!selectedThreat.blocked && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleBlockIP(selectedThreat.sourceIp);
                        setThreatDialogOpen(false);
                      }}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Block IP
                    </Button>
                  )}
                  {!selectedThreat.resolved && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleResolveThreat(selectedThreat.id);
                        setThreatDialogOpen(false);
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Export Report Dialog */}
        <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Export Compliance Report
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Generate and download a compliance report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Report Type
                </label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="gdpr" className="text-white hover:bg-slate-700">GDPR Compliance</SelectItem>
                    <SelectItem value="soc2" className="text-white hover:bg-slate-700">SOC2 Compliance</SelectItem>
                    <SelectItem value="security" className="text-white hover:bg-slate-700">Security Audit</SelectItem>
                    <SelectItem value="threats" className="text-white hover:bg-slate-700">Threat Report</SelectItem>
                    <SelectItem value="full" className="text-white hover:bg-slate-700">Full Compliance Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Export Format
                </label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pdf" className="text-white hover:bg-slate-700">PDF Document</SelectItem>
                    <SelectItem value="csv" className="text-white hover:bg-slate-700">CSV Spreadsheet</SelectItem>
                    <SelectItem value="json" className="text-white hover:bg-slate-700">JSON Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={exportDateRange.start}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={exportDateRange.end}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportReport}
                disabled={exporting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
