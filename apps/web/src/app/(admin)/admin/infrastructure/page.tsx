'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  Activity,
  Cloud,
  Wifi,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  MemoryStick,
  Network,
  GitBranch,
  RotateCcw,
  AlertCircle,
  Timer,
  Gauge,
  Bot,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  uptime: number;
  responseTime: number;
  details: Record<string, string | number>;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    read: number;
    write: number;
    iops: number;
  };
  network: {
    inbound: number;
    outbound: number;
    connections: number;
  };
}

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  service: string;
  status: 'ongoing' | 'investigating' | 'resolved';
  startedAt: string;
  resolvedAt: string | null;
  description: string;
}

interface DeploymentInfo {
  version: string;
  commit: string;
  branch: string;
  deployedAt: string;
  deployedBy: string;
  environment: string;
  canRollback: boolean;
  previousVersion: string | null;
}

interface InfrastructureData {
  services: ServiceHealth[];
  metrics: SystemMetrics;
  incidents: Incident[];
  deployment: DeploymentInfo;
}

const REFRESH_INTERVALS = [
  { value: '5000', label: '5 seconds' },
  { value: '10000', label: '10 seconds' },
  { value: '30000', label: '30 seconds' },
  { value: '60000', label: '1 minute' },
  { value: '300000', label: '5 minutes' },
];

export default function AdminInfrastructurePage() {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('30000');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/infrastructure', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch infrastructure data');
      }

      const result = await response.json();
      setData(result.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, parseInt(refreshInterval));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  const handleRollback = async () => {
    if (!data?.deployment.canRollback) return;

    try {
      setRollbackLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/infrastructure/rollback', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate rollback');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setRollbackLoading(false);
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBgColor = (status: ServiceStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20';
      case 'degraded':
        return 'bg-yellow-500/20';
      case 'down':
        return 'bg-red-500/20';
      default:
        return 'bg-slate-500/20';
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('api')) return <Server className="h-5 w-5" />;
    if (name.includes('database') || name.includes('postgres') || name.includes('mysql'))
      return <Database className="h-5 w-5" />;
    if (name.includes('redis') || name.includes('cache')) return <Zap className="h-5 w-5" />;
    if (name.includes('job') || name.includes('queue') || name.includes('worker'))
      return <Activity className="h-5 w-5" />;
    if (name.includes('storage') || name.includes('s3')) return <HardDrive className="h-5 w-5" />;
    if (name.includes('ai') || name.includes('llm') || name.includes('ml'))
      return <Bot className="h-5 w-5" />;
    return <Cloud className="h-5 w-5" />;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return days + 'd ' + hours + 'h';
    if (hours > 0) return hours + 'h ' + minutes + 'm';
    return minutes + 'm';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatBytesPerSecond = (bytes: number) => {
    return formatBytes(bytes) + '/s';
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    return diffDays + 'd ago';
  };

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getIncidentStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'ongoing':
        return 'bg-red-500/20 text-red-400';
      case 'investigating':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'resolved':
        return 'bg-green-500/20 text-green-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Infrastructure Monitoring</h1>
          <p className="text-slate-400 mt-1">
            Real-time health and performance metrics for all platform services
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            {lastUpdated && <span>Updated {formatRelativeTime(lastUpdated.toISOString())}</span>}
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={'h-4 w-4 mr-2' + (loading ? ' animate-spin' : '')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Auto-refresh Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-white/5">
        <div className="flex items-center gap-3">
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          <span className="text-sm text-slate-300">Auto-refresh</span>
        </div>
        {autoRefresh && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Interval:</span>
            <Select value={refreshInterval} onValueChange={setRefreshInterval}>
              <SelectTrigger className="w-[140px] bg-slate-900/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_INTERVALS.map((interval) => (
                  <SelectItem key={interval.value} value={interval.value}>
                    {interval.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {autoRefresh && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Service Health Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Service Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.services.map((service) => (
            <div
              key={service.name}
              className="p-5 rounded-xl border border-white/5 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={'p-2.5 rounded-lg ' + getStatusBgColor(service.status)}>
                    {getServiceIcon(service.name)}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{service.name}</h3>
                    <p className={'text-sm capitalize ' + getStatusColor(service.status)}>
                      {service.status}
                    </p>
                  </div>
                </div>
                {getStatusIcon(service.status)}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Uptime</span>
                  <span className="text-white font-medium">{formatUptime(service.uptime)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Response Time</span>
                  <span
                    className={'font-medium ' + (
                      service.responseTime < 100
                        ? 'text-green-400'
                        : service.responseTime < 500
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    )}
                  >
                    {service.responseTime}ms
                  </span>
                </div>

                {Object.entries(service.details).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-slate-300">
                      {typeof value === 'number'
                        ? value.toLocaleString()
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )) ?? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
              <Server className="h-12 w-12 mb-4 opacity-50" />
              <p>No service data available</p>
            </div>
          )}
        </div>
      </div>

      {/* System Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">System Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU */}
          <div className="p-5 rounded-xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-purple-500/20">
                <Cpu className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">CPU Usage</h3>
                <p className="text-sm text-slate-400">{data?.metrics.cpu.cores ?? 0} cores</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {data?.metrics.cpu.usage?.toFixed(1) ?? 0}%
                </span>
                <span
                  className={'text-sm ' + (
                    (data?.metrics.cpu.usage ?? 0) < 60
                      ? 'text-green-400'
                      : (data?.metrics.cpu.usage ?? 0) < 80
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  )}
                >
                  {(data?.metrics.cpu.usage ?? 0) < 60
                    ? 'Normal'
                    : (data?.metrics.cpu.usage ?? 0) < 80
                      ? 'Elevated'
                      : 'High'}
                </span>
              </div>
              <Progress
                value={data?.metrics.cpu.usage ?? 0}
                className="h-2 bg-slate-700"
              />
              {data?.metrics.cpu.load && (
                <p className="text-xs text-slate-400">
                  Load: {data.metrics.cpu.load.map((l) => l.toFixed(2)).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Memory */}
          <div className="p-5 rounded-xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-blue-500/20">
                <MemoryStick className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Memory Usage</h3>
                <p className="text-sm text-slate-400">
                  {formatBytes(data?.metrics.memory.used ?? 0)} /{' '}
                  {formatBytes(data?.metrics.memory.total ?? 0)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {data?.metrics.memory.percentage?.toFixed(1) ?? 0}%
                </span>
                <span
                  className={'text-sm ' + (
                    (data?.metrics.memory.percentage ?? 0) < 70
                      ? 'text-green-400'
                      : (data?.metrics.memory.percentage ?? 0) < 85
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  )}
                >
                  {(data?.metrics.memory.percentage ?? 0) < 70
                    ? 'Normal'
                    : (data?.metrics.memory.percentage ?? 0) < 85
                      ? 'Elevated'
                      : 'High'}
                </span>
              </div>
              <Progress
                value={data?.metrics.memory.percentage ?? 0}
                className="h-2 bg-slate-700"
              />
            </div>
          </div>

          {/* Disk I/O */}
          <div className="p-5 rounded-xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-green-500/20">
                <HardDrive className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Disk I/O</h3>
                <p className="text-sm text-slate-400">
                  {data?.metrics.disk.iops?.toLocaleString() ?? 0} IOPS
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Read
                </span>
                <span className="text-white">
                  {formatBytesPerSecond(data?.metrics.disk.read ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Write
                </span>
                <span className="text-white">
                  {formatBytesPerSecond(data?.metrics.disk.write ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="p-5 rounded-xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-orange-500/20">
                <Network className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Network</h3>
                <p className="text-sm text-slate-400">
                  {data?.metrics.network.connections?.toLocaleString() ?? 0} connections
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Inbound
                </span>
                <span className="text-white">
                  {formatBytesPerSecond(data?.metrics.network.inbound ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Outbound
                </span>
                <span className="text-white">
                  {formatBytesPerSecond(data?.metrics.network.outbound ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Incidents & Deployment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="p-6 rounded-xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Incidents</h2>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              View All
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {data?.incidents && data.incidents.length > 0 ? (
            <div className="space-y-3">
              {data.incidents.slice(0, 5).map((incident) => (
                <div
                  key={incident.id}
                  className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={'px-2 py-0.5 rounded text-xs font-medium border ' + getSeverityColor(incident.severity)}
                      >
                        {incident.severity}
                      </span>
                      <span
                        className={'px-2 py-0.5 rounded text-xs font-medium ' + getIncidentStatusColor(incident.status)}
                      >
                        {incident.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(incident.startedAt)}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-white mb-1">{incident.title}</h4>
                  <p className="text-xs text-slate-400">{incident.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>Service: {incident.service}</span>
                    {incident.resolvedAt && (
                      <>
                        <span>|</span>
                        <span>Resolved: {formatRelativeTime(incident.resolvedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <CheckCircle2 className="h-10 w-10 mb-3 text-green-400 opacity-50" />
              <p className="text-sm">No recent incidents</p>
              <p className="text-xs text-slate-500">All systems are operating normally</p>
            </div>
          )}
        </div>

        {/* Deployment Status */}
        <div className="p-6 rounded-xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-4">Deployment Status</h2>

          {data?.deployment ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Gauge className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Current Version</p>
                    <p className="font-medium text-white">{data.deployment.version}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                  {data.deployment.environment}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <GitBranch className="h-4 w-4" />
                    Branch
                  </div>
                  <p className="text-white font-medium">{data.deployment.branch}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Timer className="h-4 w-4" />
                    Deployed
                  </div>
                  <p className="text-white font-medium">
                    {formatRelativeTime(data.deployment.deployedAt)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Commit</span>
                  <code className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                    {data.deployment.commit.slice(0, 8)}
                  </code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Deployed by</span>
                  <span className="text-white">{data.deployment.deployedBy}</span>
                </div>
              </div>

              {data.deployment.canRollback && data.deployment.previousVersion && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-400 font-medium">Rollback Available</p>
                      <p className="text-xs text-slate-400">
                        Previous version: {data.deployment.previousVersion}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRollback}
                      disabled={rollbackLoading}
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                    >
                      {rollbackLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Rollback
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Wifi className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Deployment information unavailable</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
