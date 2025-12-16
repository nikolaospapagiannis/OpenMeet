'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  FileType,
  Mail,
  Building2,
  Users,
  CreditCard,
  Video,
  TrendingUp,
  DollarSign,
  BarChart3,
  Plus,
  Send,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'usage' | 'billing' | 'compliance' | 'analytics' | 'audit' | 'custom';
  category: string;
  estimatedTime: string;
  formats: string[];
  parameters: {
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }[];
  createdAt: string;
}

interface ScheduledReport {
  id: string;
  templateId: string;
  templateName: string;
  schedule: string;
  nextRunAt: string;
  lastRunAt: string | null;
  enabled: boolean;
  format: string;
  recipients: string[];
  filters: {
    organizationIds?: string[];
    dateRange?: string;
  };
  createdAt: string;
  createdBy: string;
}

interface GeneratedReport {
  id: string;
  templateId: string;
  templateName: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  format: string;
  fileSize: number | null;
  downloadUrl: string | null;
  generatedAt: string;
  completedAt: string | null;
  error: string | null;
  generatedBy: string;
  parameters: Record<string, unknown>;
}

interface UsageAnalytics {
  totalReportsGenerated: number;
  reportsThisMonth: number;
  avgGenerationTime: number;
  mostUsedTemplate: string;
  trendData: { date: string; count: number }[];
}

interface RevenueMetrics {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueGrowth: number;
  avgRevenuePerOrg: number;
  topOrganizations: { name: string; revenue: number }[];
}

interface GrowthIndicators {
  userGrowth: number;
  orgGrowth: number;
  meetingGrowth: number;
  activeUsersPercent: number;
  retentionRate: number;
}

interface Organization {
  id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BulkExportJob {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl: string | null;
  error: string | null;
}

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportHistory, setReportHistory] = useState<GeneratedReport[]>([]);
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [growthIndicators, setGrowthIndicators] = useState<GrowthIndicators | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [scheduledLoading, setScheduledLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('templates');

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [deleteScheduleDialogOpen, setDeleteScheduleDialogOpen] = useState(false);
  const [bulkExportDialogOpen, setBulkExportDialogOpen] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedScheduledReport, setSelectedScheduledReport] = useState<ScheduledReport | null>(null);

  const [generateForm, setGenerateForm] = useState({
    templateId: '',
    startDate: '',
    endDate: '',
    organizationIds: [] as string[],
    format: 'csv',
    emailDelivery: false,
    emailRecipients: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    templateId: '',
    schedule: 'daily',
    startDate: '',
    endDate: '',
    organizationIds: [] as string[],
    format: 'csv',
    emailRecipients: '',
  });

  const [editScheduleForm, setEditScheduleForm] = useState({
    schedule: '',
    organizationIds: [] as string[],
    format: '',
    emailRecipients: '',
    enabled: true,
  });

  const [bulkExportForm, setBulkExportForm] = useState({
    type: 'users',
    format: 'csv',
    includeDeleted: false,
  });

  const [bulkExportJob, setBulkExportJob] = useState<BulkExportJob | null>(null);
  const bulkExportPollRef = useRef<NodeJS.Timeout | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch('/api/admin/reports/templates?' + params.toString(), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  }, [searchQuery, typeFilter]);

  const fetchScheduledReports = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const response = await fetch('/api/admin/reports/scheduled', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledReports(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const fetchReportHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch('/api/admin/reports/history?' + params.toString(), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setReportHistory(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Failed to fetch report history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [usageRes, revenueRes, growthRes] = await Promise.all([
        fetch('/api/admin/reports/analytics/usage', { credentials: 'include' }),
        fetch('/api/admin/reports/analytics/revenue', { credentials: 'include' }),
        fetch('/api/admin/reports/analytics/growth', { credentials: 'include' }),
      ]);

      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsageAnalytics(data.data);
      }
      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueMetrics(data.data);
      }
      if (growthRes.ok) {
        const data = await growthRes.json();
        setGrowthIndicators(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/organizations?limit=1000', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTemplates(),
        fetchScheduledReports(),
        fetchReportHistory(),
        fetchAnalytics(),
        fetchOrganizations(),
      ]);
      setLoading(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab, searchQuery, typeFilter, fetchTemplates]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchReportHistory();
    }
  }, [activeTab, pagination.page, statusFilter, fetchReportHistory]);

  const handleGenerateReport = async () => {
    if (!generateForm.templateId) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: generateForm.templateId,
          startDate: generateForm.startDate,
          endDate: generateForm.endDate,
          organizationIds: generateForm.organizationIds,
          format: generateForm.format,
          emailDelivery: generateForm.emailDelivery,
          emailRecipients: generateForm.emailDelivery
            ? generateForm.emailRecipients.split(',').map((e) => e.trim())
            : [],
        }),
      });

      if (response.ok) {
        setGenerateDialogOpen(false);
        setSelectedTemplate(null);
        setGenerateForm({
          templateId: '',
          startDate: '',
          endDate: '',
          organizationIds: [],
          format: 'csv',
          emailDelivery: false,
          emailRecipients: '',
        });
        fetchReportHistory();
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleReport = async () => {
    if (!scheduleForm.templateId) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/reports/scheduled', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: scheduleForm.templateId,
          schedule: scheduleForm.schedule,
          filters: {
            startDate: scheduleForm.startDate,
            endDate: scheduleForm.endDate,
            organizationIds: scheduleForm.organizationIds,
          },
          format: scheduleForm.format,
          recipients: scheduleForm.emailRecipients.split(',').map((e) => e.trim()),
        }),
      });

      if (response.ok) {
        setScheduleDialogOpen(false);
        setSelectedTemplate(null);
        setScheduleForm({
          templateId: '',
          schedule: 'daily',
          startDate: '',
          endDate: '',
          organizationIds: [],
          format: 'csv',
          emailRecipients: '',
        });
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Failed to schedule report:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateScheduledReport = async () => {
    if (!selectedScheduledReport) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/reports/scheduled/' + selectedScheduledReport.id, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: editScheduleForm.schedule,
          filters: {
            organizationIds: editScheduleForm.organizationIds,
          },
          format: editScheduleForm.format,
          recipients: editScheduleForm.emailRecipients.split(',').map((e) => e.trim()),
          enabled: editScheduleForm.enabled,
        }),
      });

      if (response.ok) {
        setEditScheduleDialogOpen(false);
        setSelectedScheduledReport(null);
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Failed to update scheduled report:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteScheduledReport = async () => {
    if (!selectedScheduledReport) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/reports/scheduled/' + selectedScheduledReport.id, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setDeleteScheduleDialogOpen(false);
        setSelectedScheduledReport(null);
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Failed to delete scheduled report:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleScheduledReport = async (report: ScheduledReport) => {
    try {
      const response = await fetch('/api/admin/reports/scheduled/' + report.id, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !report.enabled,
        }),
      });

      if (response.ok) {
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Failed to toggle scheduled report:', error);
    }
  };

  const handleDownloadReport = async (report: GeneratedReport) => {
    if (!report.downloadUrl) return;

    try {
      const response = await fetch(report.downloadUrl, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = report.templateName + '-' + report.id + '.' + report.format;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const handleBulkExport = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/exports/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: bulkExportForm.type,
          format: bulkExportForm.format,
          includeDeleted: bulkExportForm.includeDeleted,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBulkExportJob(data.data);
        pollBulkExportStatus(data.data.id);
      }
    } catch (error) {
      console.error('Failed to start bulk export:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const pollBulkExportStatus = (jobId: string) => {
    if (bulkExportPollRef.current) {
      clearInterval(bulkExportPollRef.current);
    }

    bulkExportPollRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/exports/bulk/' + jobId, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setBulkExportJob(data.data);

          if (data.data.status === 'completed' || data.data.status === 'failed') {
            if (bulkExportPollRef.current) {
              clearInterval(bulkExportPollRef.current);
              bulkExportPollRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll bulk export status:', error);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (bulkExportPollRef.current) {
        clearInterval(bulkExportPollRef.current);
      }
    };
  }, []);

  const handleDownloadBulkExport = async () => {
    if (!bulkExportJob?.downloadUrl) return;

    try {
      const response = await fetch(bulkExportJob.downloadUrl, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-export-' + bulkExportJob.type + '-' + bulkExportJob.id + '.' + bulkExportForm.format;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download bulk export:', error);
    }
  };

  const openGenerateDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setGenerateForm({
      ...generateForm,
      templateId: template.id,
    });
    setGenerateDialogOpen(true);
  };

  const openScheduleDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setScheduleForm({
      ...scheduleForm,
      templateId: template.id,
    });
    setScheduleDialogOpen(true);
  };

  const openEditScheduleDialog = (report: ScheduledReport) => {
    setSelectedScheduledReport(report);
    setEditScheduleForm({
      schedule: report.schedule,
      organizationIds: report.filters.organizationIds || [],
      format: report.format,
      emailRecipients: report.recipients.join(', '),
      enabled: report.enabled,
    });
    setEditScheduleDialogOpen(true);
  };

  const openDeleteScheduleDialog = (report: ScheduledReport) => {
    setSelectedScheduledReport(report);
    setDeleteScheduleDialogOpen(true);
  };

  const toggleOrganization = (orgId: string, form: 'generate' | 'schedule' | 'edit') => {
    if (form === 'generate') {
      setGenerateForm((prev) => ({
        ...prev,
        organizationIds: prev.organizationIds.includes(orgId)
          ? prev.organizationIds.filter((id) => id !== orgId)
          : [...prev.organizationIds, orgId],
      }));
    } else if (form === 'schedule') {
      setScheduleForm((prev) => ({
        ...prev,
        organizationIds: prev.organizationIds.includes(orgId)
          ? prev.organizationIds.filter((id) => id !== orgId)
          : [...prev.organizationIds, orgId],
      }));
    } else {
      setEditScheduleForm((prev) => ({
        ...prev,
        organizationIds: prev.organizationIds.includes(orgId)
          ? prev.organizationIds.filter((id) => id !== orgId)
          : [...prev.organizationIds, orgId],
      }));
    }
  };

  const getTypeBadge = (type: ReportTemplate['type']) => {
    const configs = {
      usage: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      billing: { color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      compliance: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      analytics: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      audit: { color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      custom: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    };
    const config = configs[type];

    return (
      <span
        className={'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ' + config.color}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (reportStatus: GeneratedReport['status']) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      generating: { icon: RefreshCw, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      completed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      failed: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };
    const config = configs[reportStatus];
    const Icon = config.icon;

    return (
      <span
        className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ' + config.color}
      >
        <Icon className={'h-3 w-3' + (reportStatus === 'generating' ? ' animate-spin' : '')} />
        {reportStatus.charAt(0).toUpperCase() + reportStatus.slice(1)}
      </span>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (ms: number | undefined | null) => {
    if (ms === undefined || ms === null) return '-';
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return (ms / 60000).toFixed(1) + 'm';
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'csv':
      case 'excel':
        return FileSpreadsheet;
      case 'json':
        return FileJson;
      case 'pdf':
        return FileType;
      default:
        return FileText;
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !template.name.toLowerCase().includes(query) &&
        !template.description.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (typeFilter !== 'all' && template.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Exports</h1>
          <p className="text-slate-400 mt-1">Generate reports, manage schedules, and export data</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setBulkExportDialogOpen(true)}
            variant="outline"
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <Download className="h-4 w-4 mr-2" />
            Bulk Export
          </Button>
          <Button
            onClick={() => {
              fetchTemplates();
              fetchScheduledReports();
              fetchReportHistory();
              fetchAnalytics();
            }}
            variant="outline"
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={'h-4 w-4 mr-2' + (loading ? ' animate-spin' : '')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Reports Generated</p>
              <p className="text-xl font-bold text-white">
                {analyticsLoading ? '-' : usageAnalytics?.totalReportsGenerated || 0}
              </p>
            </div>
          </div>
          {usageAnalytics && (
            <p className="text-xs text-slate-500 mt-2">
              {usageAnalytics.reportsThisMonth} this month
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Revenue</p>
              <p className="text-xl font-bold text-white">
                {analyticsLoading
                  ? '-'
                  : '$' + (revenueMetrics?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
          {revenueMetrics && revenueMetrics.revenueGrowth !== undefined && (
            <p
              className={'text-xs mt-2 ' + (revenueMetrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400')}
            >
              {revenueMetrics.revenueGrowth >= 0 ? '+' : ''}
              {revenueMetrics.revenueGrowth.toFixed(1)}% growth
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">User Growth</p>
              <p className="text-xl font-bold text-white">
                {analyticsLoading
                  ? '-'
                  : (growthIndicators?.userGrowth?.toFixed(1) || 0) + '%'}
              </p>
            </div>
          </div>
          {growthIndicators && growthIndicators.activeUsersPercent !== undefined && (
            <p className="text-xs text-slate-500 mt-2">
              {growthIndicators.activeUsersPercent.toFixed(0)}% active users
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Generation Time</p>
              <p className="text-xl font-bold text-white">
                {analyticsLoading
                  ? '-'
                  : formatDuration(usageAnalytics?.avgGenerationTime || 0)}
              </p>
            </div>
          </div>
          {usageAnalytics && (
            <p className="text-xs text-slate-500 mt-2">
              Most used: {usageAnalytics.mostUsedTemplate}
            </p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/50 border border-white/5 p-1">
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="scheduled"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Scheduled Reports
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
          >
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-white/5 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] bg-slate-800/50 border-white/10 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="usage">Usage</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mr-2" />
              <p className="text-slate-400">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-5 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                    {getTypeBadge(template.type)}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <Clock className="h-3 w-3" />
                    <span>Est. {template.estimatedTime}</span>
                    <span className="mx-1">|</span>
                    <span>{template.formats.join(', ').toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => openGenerateDialog(template)}
                      size="sm"
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                    <Button
                      onClick={() => openScheduleDialog(template)}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <div className="rounded-xl border border-white/5 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-800/50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Report</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Schedule</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Next Run</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Last Run</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Format</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Recipients</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Enabled</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mx-auto mb-2" />
                        <p className="text-slate-400">Loading scheduled reports...</p>
                      </td>
                    </tr>
                  ) : scheduledReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400">No scheduled reports</p>
                      </td>
                    </tr>
                  ) : (
                    scheduledReports.map((report) => {
                      const FormatIcon = getFormatIcon(report.format);
                      return (
                        <tr
                          key={report.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <p className="text-sm font-medium text-white">{report.templateName}</p>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-700/50 text-xs text-slate-300">
                              {report.schedule.charAt(0).toUpperCase() + report.schedule.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-400">
                            {new Date(report.nextRunAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-400">
                            {report.lastRunAt
                              ? new Date(report.lastRunAt).toLocaleString()
                              : 'Never'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <FormatIcon className="h-4 w-4 text-slate-500" />
                              <span className="text-sm uppercase">{report.format}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Mail className="h-4 w-4 text-slate-500" />
                              <span className="text-sm">{report.recipients.length}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <Switch
                              checked={report.enabled}
                              onCheckedChange={() => handleToggleScheduledReport(report)}
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-white"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => openEditScheduleDialog(report)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Schedule
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteScheduleDialog(report)}
                                    className="text-red-400 focus:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-white/5 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-slate-800/50 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="generating">Generating</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-800/50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Report</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Format</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Size</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Generated</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Duration</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mx-auto mb-2" />
                        <p className="text-slate-400">Loading report history...</p>
                      </td>
                    </tr>
                  ) : reportHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400">No reports generated yet</p>
                      </td>
                    </tr>
                  ) : (
                    reportHistory.map((report) => {
                      const FormatIcon = getFormatIcon(report.format);
                      const duration =
                        report.completedAt && report.generatedAt
                          ? new Date(report.completedAt).getTime() -
                            new Date(report.generatedAt).getTime()
                          : null;
                      return (
                        <tr
                          key={report.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <p className="text-sm font-medium text-white">{report.templateName}</p>
                            <p className="text-xs text-slate-500">{report.id}</p>
                          </td>
                          <td className="py-4 px-6">{getStatusBadge(report.status)}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <FormatIcon className="h-4 w-4 text-slate-500" />
                              <span className="text-sm uppercase">{report.format}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-400">
                            {formatFileSize(report.fileSize)}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-400">
                            {new Date(report.generatedAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-400">
                            {duration !== null ? formatDuration(duration) : '-'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-2">
                              {report.status === 'completed' && report.downloadUrl && (
                                <Button
                                  onClick={() => handleDownloadReport(report)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-white"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {report.status === 'failed' && report.error && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-300"
                                  title={report.error}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <p className="text-sm text-slate-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    className="border-white/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="border-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Configure and generate {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={generateForm.startDate}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, startDate: e.target.value })
                  }
                  className="bg-slate-800/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={generateForm.endDate}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, endDate: e.target.value })
                  }
                  className="bg-slate-800/50 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Organizations (optional)</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-3 rounded-lg bg-slate-800/50 border border-white/10">
                {organizations.length === 0 ? (
                  <p className="text-sm text-slate-500">No organizations available</p>
                ) : (
                  organizations.map((org) => (
                    <div key={org.id} className="flex items-center gap-2">
                      <Checkbox
                        id={'gen-org-' + org.id}
                        checked={generateForm.organizationIds.includes(org.id)}
                        onCheckedChange={() => toggleOrganization(org.id, 'generate')}
                      />
                      <label
                        htmlFor={'gen-org-' + org.id}
                        className="text-sm text-slate-300 cursor-pointer"
                      >
                        {org.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {generateForm.organizationIds.length > 0 && (
                <p className="text-xs text-slate-500">
                  {generateForm.organizationIds.length} organization(s) selected
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={generateForm.format}
                onValueChange={(value) => setGenerateForm({ ...generateForm, format: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 p-3 rounded-lg bg-slate-800/30 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <Label htmlFor="emailDelivery" className="cursor-pointer">
                    Email Delivery
                  </Label>
                </div>
                <Switch
                  id="emailDelivery"
                  checked={generateForm.emailDelivery}
                  onCheckedChange={(checked) =>
                    setGenerateForm({ ...generateForm, emailDelivery: checked })
                  }
                />
              </div>
              {generateForm.emailDelivery && (
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients (comma-separated)</Label>
                  <Input
                    id="recipients"
                    type="text"
                    placeholder="email1@example.com, email2@example.com"
                    value={generateForm.emailRecipients}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, emailRecipients: e.target.value })
                    }
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateDialogOpen(false)}
              disabled={actionLoading}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={actionLoading || !generateForm.startDate || !generateForm.endDate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
            <DialogDescription>
              Set up recurring generation for {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Schedule Frequency</Label>
              <Select
                value={scheduleForm.schedule}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, schedule: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range (relative)</Label>
              <Select
                value={scheduleForm.startDate || 'last-30-days'}
                onValueChange={(value) =>
                  setScheduleForm({ ...scheduleForm, startDate: value, endDate: value })
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Organizations (optional)</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-3 rounded-lg bg-slate-800/50 border border-white/10">
                {organizations.length === 0 ? (
                  <p className="text-sm text-slate-500">No organizations available</p>
                ) : (
                  organizations.map((org) => (
                    <div key={org.id} className="flex items-center gap-2">
                      <Checkbox
                        id={'sched-org-' + org.id}
                        checked={scheduleForm.organizationIds.includes(org.id)}
                        onCheckedChange={() => toggleOrganization(org.id, 'schedule')}
                      />
                      <label
                        htmlFor={'sched-org-' + org.id}
                        className="text-sm text-slate-300 cursor-pointer"
                      >
                        {org.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={scheduleForm.format}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, format: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedRecipients">Email Recipients (comma-separated)</Label>
              <Input
                id="schedRecipients"
                type="text"
                placeholder="email1@example.com, email2@example.com"
                value={scheduleForm.emailRecipients}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, emailRecipients: e.target.value })
                }
                className="bg-slate-800/50 border-white/10 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
              disabled={actionLoading}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleReport}
              disabled={actionLoading || !scheduleForm.emailRecipients}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Schedule Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editScheduleDialogOpen} onClose={() => setEditScheduleDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update schedule for {selectedScheduledReport?.templateName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Schedule Frequency</Label>
              <Select
                value={editScheduleForm.schedule}
                onValueChange={(value) =>
                  setEditScheduleForm({ ...editScheduleForm, schedule: value })
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Organizations (optional)</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-3 rounded-lg bg-slate-800/50 border border-white/10">
                {organizations.length === 0 ? (
                  <p className="text-sm text-slate-500">No organizations available</p>
                ) : (
                  organizations.map((org) => (
                    <div key={org.id} className="flex items-center gap-2">
                      <Checkbox
                        id={'edit-org-' + org.id}
                        checked={editScheduleForm.organizationIds.includes(org.id)}
                        onCheckedChange={() => toggleOrganization(org.id, 'edit')}
                      />
                      <label
                        htmlFor={'edit-org-' + org.id}
                        className="text-sm text-slate-300 cursor-pointer"
                      >
                        {org.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={editScheduleForm.format}
                onValueChange={(value) =>
                  setEditScheduleForm({ ...editScheduleForm, format: value })
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRecipients">Email Recipients (comma-separated)</Label>
              <Input
                id="editRecipients"
                type="text"
                placeholder="email1@example.com, email2@example.com"
                value={editScheduleForm.emailRecipients}
                onChange={(e) =>
                  setEditScheduleForm({ ...editScheduleForm, emailRecipients: e.target.value })
                }
                className="bg-slate-800/50 border-white/10 text-white"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-white/5">
              <Label htmlFor="editEnabled" className="cursor-pointer">
                Schedule Enabled
              </Label>
              <Switch
                id="editEnabled"
                checked={editScheduleForm.enabled}
                onCheckedChange={(checked) =>
                  setEditScheduleForm({ ...editScheduleForm, enabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditScheduleDialogOpen(false)}
              disabled={actionLoading}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateScheduledReport}
              disabled={actionLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              Update Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteScheduleDialogOpen} onClose={() => setDeleteScheduleDialogOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the schedule for{' '}
              <strong>{selectedScheduledReport?.templateName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteScheduleDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScheduledReport}
              variant="destructive"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkExportDialogOpen} onClose={() => setBulkExportDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Export</DialogTitle>
            <DialogDescription>Export large datasets from the platform</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'users', label: 'Users', icon: Users },
                  { value: 'organizations', label: 'Organizations', icon: Building2 },
                  { value: 'meetings', label: 'Meetings', icon: Video },
                  { value: 'billing', label: 'Billing', icon: CreditCard },
                ].map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() =>
                        setBulkExportForm({ ...bulkExportForm, type: type.value })
                      }
                      className={'flex items-center gap-3 p-4 rounded-lg border transition-all ' +
                        (bulkExportForm.type === type.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-slate-800/30 hover:bg-slate-800/50')}
                    >
                      <Icon
                        className={'h-5 w-5 ' +
                          (bulkExportForm.type === type.value
                            ? 'text-purple-400'
                            : 'text-slate-400')}
                      />
                      <span
                        className={
                          bulkExportForm.type === type.value
                            ? 'text-white'
                            : 'text-slate-300'
                        }
                      >
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={bulkExportForm.format}
                onValueChange={(value) =>
                  setBulkExportForm({ ...bulkExportForm, format: value })
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-white/5">
              <Label htmlFor="includeDeleted" className="cursor-pointer">
                Include Deleted Records
              </Label>
              <Switch
                id="includeDeleted"
                checked={bulkExportForm.includeDeleted}
                onCheckedChange={(checked) =>
                  setBulkExportForm({ ...bulkExportForm, includeDeleted: checked })
                }
              />
            </div>

            {bulkExportJob && (
              <div className="space-y-3 p-4 rounded-lg bg-slate-800/50 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Export Progress</span>
                  <span className="text-sm text-slate-400">{bulkExportJob.progress}%</span>
                </div>
                <Progress value={bulkExportJob.progress} className="h-2 bg-slate-700" />
                <div className="flex items-center gap-2">
                  {bulkExportJob.status === 'processing' && (
                    <>
                      <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-400">Processing...</span>
                    </>
                  )}
                  {bulkExportJob.status === 'completed' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400">Completed</span>
                    </>
                  )}
                  {bulkExportJob.status === 'failed' && (
                    <>
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">
                        Failed: {bulkExportJob.error}
                      </span>
                    </>
                  )}
                </div>
                {bulkExportJob.status === 'completed' && bulkExportJob.downloadUrl && (
                  <Button
                    onClick={handleDownloadBulkExport}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Export
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkExportDialogOpen(false);
                setBulkExportJob(null);
              }}
              className="border-white/10"
            >
              Close
            </Button>
            {!bulkExportJob && (
              <Button
                onClick={handleBulkExport}
                disabled={actionLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {actionLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Start Export
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
