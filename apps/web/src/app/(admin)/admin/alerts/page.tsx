'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Search,
  MoreHorizontal,
  Eye,
  CheckCheck,
  Bell,
  BellOff,
  Settings,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AlertStats {
  critical: number;
  warning: number;
  info: number;
  resolvedToday: number;
  totalActive: number;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  source: string;
  component: string;
  createdAt: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'snoozed';
  snoozedUntil?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  condition: string;
  threshold?: number;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    label: 'Critical',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    label: 'Info',
  },
};

const STATUS_CONFIG = {
  active: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    label: 'Active',
  },
  acknowledged: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    label: 'Acknowledged',
  },
  resolved: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    label: 'Resolved',
  },
  snoozed: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
    label: 'Snoozed',
  },
};

const SOURCE_ICONS: Record<string, typeof Server> = {
  server: Server,
  database: Database,
  api: Globe,
  security: Shield,
  performance: Zap,
  system: Cpu,
};

const SNOOZE_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
  { value: '1440', label: '24 hours' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    critical: 0,
    warning: 0,
    info: 0,
    resolvedToday: 0,
    totalActive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeAlertId, setSnoozeAlertId] = useState<string | null>(null);
  const [snoozeDuration, setSnoozeDuration] = useState('60');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(severityFilter !== 'all' && { severity: severityFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(sourceFilter !== 'all' && { source: sourceFilter }),
        ...(dateRange !== 'all' && { dateRange }),
      });

      const response = await fetch('/api/admin/alerts?' + params.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setStats(data.stats || stats);
      setAlertRules(data.rules || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Set mock data for development
      setAlerts([
        {
          id: '1',
          severity: 'critical',
          title: 'High CPU Usage',
          description: 'CPU usage exceeded 90% threshold on production server',
          source: 'performance',
          component: 'prod-server-01',
          createdAt: new Date().toISOString(),
          status: 'active',
        },
        {
          id: '2',
          severity: 'warning',
          title: 'Database Connection Pool',
          description: 'Connection pool utilization at 75%',
          source: 'database',
          component: 'postgres-primary',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'acknowledged',
          acknowledgedBy: 'admin@example.com',
          acknowledgedAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: '3',
          severity: 'info',
          title: 'SSL Certificate Expiring',
          description: 'SSL certificate will expire in 30 days',
          source: 'security',
          component: 'api.example.com',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'snoozed',
          snoozedUntil: new Date(Date.now() + 604800000).toISOString(),
        },
      ]);
      setStats({
        critical: 3,
        warning: 7,
        info: 12,
        resolvedToday: 5,
        totalActive: 22,
      });
      setAlertRules([
        {
          id: '1',
          name: 'High CPU Alert',
          description: 'Alert when CPU usage exceeds threshold',
          severity: 'critical',
          source: 'performance',
          condition: 'cpu_usage > threshold',
          threshold: 90,
          enabled: true,
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
          lastTriggered: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Database Connection Alert',
          description: 'Alert when connection pool is near capacity',
          severity: 'warning',
          source: 'database',
          condition: 'connection_pool_usage > threshold',
          threshold: 75,
          enabled: true,
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
        },
        {
          id: '3',
          name: 'Security Scan Alert',
          description: 'Alert on security vulnerabilities detected',
          severity: 'critical',
          source: 'security',
          condition: 'vulnerabilities_detected > 0',
          enabled: false,
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, severityFilter, statusFilter, sourceFilter, dateRange]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/alerts/' + alertId + '/acknowledge', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'acknowledged' as const,
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy: 'admin@example.com',
              }
            : alert
        )
      );
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/alerts/' + alertId + '/resolve', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'resolved' as const,
                resolvedAt: new Date().toISOString(),
                resolvedBy: 'admin@example.com',
              }
            : alert
        )
      );
      setStats(prev => ({
        ...prev,
        resolvedToday: prev.resolvedToday + 1,
        totalActive: prev.totalActive - 1,
      }));
    }
  };

  const handleSnooze = async () => {
    if (!snoozeAlertId) {
      return;
    }
    try {
      const response = await fetch('/api/admin/alerts/' + snoozeAlertId + '/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: parseInt(snoozeDuration) }),
      });
      if (!response.ok) {
        throw new Error('Failed to snooze alert');
      }
      fetchAlerts();
    } catch (error) {
      console.error('Error snoozing alert:', error);
      const snoozedUntil = new Date(Date.now() + parseInt(snoozeDuration) * 60000).toISOString();
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === snoozeAlertId
            ? { ...alert, status: 'snoozed' as const, snoozedUntil }
            : alert
        )
      );
    } finally {
      setSnoozeDialogOpen(false);
      setSnoozeAlertId(null);
      setSnoozeDuration('60');
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/alerts/rules/' + ruleId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error('Failed to update rule');
      }
      fetchAlerts();
    } catch (error) {
      console.error('Error updating rule:', error);
      setAlertRules(prev =>
        prev.map(rule => (rule.id === ruleId ? { ...rule, enabled } : rule))
      );
    }
  };

  const openSnoozeDialog = (alertId: string) => {
    setSnoozeAlertId(alertId);
    setSnoozeDialogOpen(true);
  };

  const openDetailsDialog = (alert: Alert) => {
    setSelectedAlert(alert);
    setDetailsDialogOpen(true);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatRelativeTime = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return diffMins + ' min ago';
    }
    if (diffHours < 24) {
      return diffHours + 'h ago';
    }
    return diffDays + 'd ago';
  };

  const getSourceIcon = (source: string) => {
    const Icon = SOURCE_ICONS[source.toLowerCase()] || Server;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400">Monitor and manage system alerts</p>
        </div>
        <Button
          onClick={() => fetchAlerts()}
          variant="outline"
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-500/20 p-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Critical</p>
              <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-500/20 p-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Warning</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-500/20 p-2">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Info</p>
              <p className="text-2xl font-bold text-blue-400">{stats.info}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500/20 p-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Resolved Today</p>
              <p className="text-2xl font-bold text-green-400">{stats.resolvedToday}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/10 p-2">
              <Bell className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Active</p>
              <p className="text-2xl font-bold text-white">{stats.totalActive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 border-white/10 bg-slate-800/50 text-white placeholder:text-slate-500"
          />
        </div>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px] border-white/10 bg-slate-800/50 text-white">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-800 text-white">
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] border-white/10 bg-slate-800/50 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-800 text-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px] border-white/10 bg-slate-800/50 text-white">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-800 text-white">
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="server">Server</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="api">API</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px] border-white/10 bg-slate-800/50 text-white">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-800 text-white">
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts Table */}
      <div className="rounded-lg border border-white/10 bg-slate-800/50">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Severity</TableHead>
              <TableHead className="text-slate-400">Title</TableHead>
              <TableHead className="text-slate-400">Description</TableHead>
              <TableHead className="text-slate-400">Source</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading alerts...
                  </div>
                </TableCell>
              </TableRow>
            ) : alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Bell className="h-8 w-8" />
                    <p>No alerts found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              alerts.map(alert => {
                const severityConfig = SEVERITY_CONFIG[alert.severity];
                const statusConfig = STATUS_CONFIG[alert.status];
                const SeverityIcon = severityConfig.icon;

                return (
                  <TableRow key={alert.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium ${severityConfig.bgColor} ${severityConfig.borderColor} ${severityConfig.color}`}
                      >
                        <SeverityIcon className="h-3 w-3" />
                        {severityConfig.label}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white">{alert.title}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-400">
                      {alert.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400">
                        {getSourceIcon(alert.source)}
                        <span className="capitalize">{alert.source}</span>
                        {alert.component && (
                          <span className="text-xs text-slate-500">({alert.component})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeTime(alert.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="border-white/10 bg-slate-800 text-white"
                        >
                          <DropdownMenuItem
                            onClick={() => openDetailsDialog(alert)}
                            className="hover:bg-white/10"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {alert.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => handleAcknowledge(alert.id)}
                              className="hover:bg-white/10"
                            >
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Acknowledge
                            </DropdownMenuItem>
                          )}
                          {alert.status !== 'resolved' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleResolve(alert.id)}
                                className="hover:bg-white/10"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Resolve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openSnoozeDialog(alert.id)}
                                className="hover:bg-white/10"
                              >
                                <BellOff className="mr-2 h-4 w-4" />
                                Snooze
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <p className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Alert Rules Configuration */}
      <Collapsible open={rulesExpanded} onOpenChange={setRulesExpanded}>
        <div className="rounded-lg border border-white/10 bg-slate-800/50">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between p-4 text-left hover:bg-white/5">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-slate-400" />
                <div>
                  <h3 className="font-medium text-white">Alert Rules Configuration</h3>
                  <p className="text-sm text-slate-400">
                    {alertRules.filter(r => r.enabled).length} of {alertRules.length} rules enabled
                  </p>
                </div>
              </div>
              {rulesExpanded ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t border-white/10 p-4">
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </div>

              <div className="space-y-3">
                {alertRules.map(rule => {
                  const severityConfig = SEVERITY_CONFIG[rule.severity];

                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            rule.enabled ? 'bg-purple-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                              rule.enabled ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{rule.name}</span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${severityConfig.bgColor} ${severityConfig.borderColor} ${severityConfig.color}`}
                            >
                              {severityConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{rule.description}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Condition: {rule.condition}
                            {rule.threshold && ` (threshold: ${rule.threshold})`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rule.lastTriggered && (
                          <span className="text-xs text-slate-500">
                            Last triggered: {formatRelativeTime(rule.lastTriggered)}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Alert Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)}>
        <DialogContent className="border-white/10 bg-slate-900 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alert Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              Detailed information about this alert
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const config = SEVERITY_CONFIG[selectedAlert.severity];
                  const Icon = config.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium ${config.bgColor} ${config.borderColor} ${config.color}`}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  );
                })()}
                {(() => {
                  const config = STATUS_CONFIG[selectedAlert.status];
                  return (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${config.bgColor} ${config.borderColor} ${config.color}`}
                    >
                      {config.label}
                    </span>
                  );
                })()}
              </div>

              <div>
                <h4 className="text-lg font-medium">{selectedAlert.title}</h4>
                <p className="mt-1 text-slate-400">{selectedAlert.description}</p>
              </div>

              <div className="grid gap-3 rounded-lg border border-white/10 bg-slate-800/50 p-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Source</span>
                  <span className="flex items-center gap-2 capitalize">
                    {getSourceIcon(selectedAlert.source)}
                    {selectedAlert.source}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Component</span>
                  <span>{selectedAlert.component}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span>{formatDate(selectedAlert.createdAt)}</span>
                </div>
                {selectedAlert.acknowledgedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Acknowledged</span>
                    <span>
                      {formatDate(selectedAlert.acknowledgedAt)} by {selectedAlert.acknowledgedBy}
                    </span>
                  </div>
                )}
                {selectedAlert.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolved</span>
                    <span>
                      {formatDate(selectedAlert.resolvedAt)} by {selectedAlert.resolvedBy}
                    </span>
                  </div>
                )}
                {selectedAlert.snoozedUntil && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Snoozed Until</span>
                    <span>{formatDate(selectedAlert.snoozedUntil)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailsDialogOpen(false)}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Close
            </Button>
            {selectedAlert && selectedAlert.status !== 'resolved' && (
              <Button
                onClick={() => {
                  handleResolve(selectedAlert.id);
                  setDetailsDialogOpen(false);
                }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Resolve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialogOpen} onClose={() => setSnoozeDialogOpen(false)}>
        <DialogContent className="border-white/10 bg-slate-900 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Snooze Alert</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose how long to snooze this alert
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={snoozeDuration} onValueChange={setSnoozeDuration}>
              <SelectTrigger className="w-full border-white/10 bg-slate-800/50 text-white">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-800 text-white">
                {SNOOZE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSnoozeDialogOpen(false)}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button onClick={handleSnooze} className="bg-purple-600 text-white hover:bg-purple-700">
              <BellOff className="mr-2 h-4 w-4" />
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
