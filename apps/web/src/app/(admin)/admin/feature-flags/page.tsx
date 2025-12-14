'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Target,
  Percent,
  Clock,
  CheckCircle,
  AlertTriangle,
  History,
  Building2,
  Users,
  Crown,
  Globe,
  Server,
  Loader2,
  Copy,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type RolloutStrategy = 'all' | 'percentage' | 'targeted';
type Environment = 'development' | 'staging' | 'production';
type TargetTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

interface TargetingRule {
  type: 'organization' | 'user' | 'tier';
  values: string[];
}

interface AuditLogEntry {
  id: string;
  action: 'created' | 'updated' | 'enabled' | 'disabled' | 'deleted';
  changes: Record<string, { from: unknown; to: unknown }>;
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  performedAt: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: Environment;
  rolloutStrategy: RolloutStrategy;
  rolloutPercentage: number;
  targetingRules: TargetingRule[];
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  auditLog?: AuditLogEntry[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ENVIRONMENTS: { value: Environment; label: string; color: string }[] = [
  { value: 'development', label: 'Development', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'staging', label: 'Staging', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'production', label: 'Production', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

const TIERS: { value: TargetTier; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'custom', label: 'Custom' },
];

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    environment: 'development' as Environment,
    rolloutStrategy: 'all' as RolloutStrategy,
    rolloutPercentage: 100,
    targetOrganizations: '',
    targetUsers: '',
    targetTiers: [] as TargetTier[],
  });

  const resetFormData = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      enabled: false,
      environment: 'development',
      rolloutStrategy: 'all',
      rolloutPercentage: 100,
      targetOrganizations: '',
      targetUsers: '',
      targetTiers: [],
    });
  };

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (statusFilter !== 'all') {
        params.append('enabled', statusFilter === 'enabled' ? 'true' : 'false');
      }
      if (environmentFilter !== 'all') {
        params.append('environment', environmentFilter);
      }

      const response = await fetch(`/api/admin/feature-flags?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFlags(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, environmentFilter]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      const response = await fetch(`/api/admin/feature-flags/${flag.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !flag.enabled }),
      });

      if (response.ok) {
        fetchFlags();
      }
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  const handleCreateFlag = async () => {
    setActionLoading(true);
    try {
      const targetingRules: TargetingRule[] = [];

      if (formData.rolloutStrategy === 'targeted') {
        if (formData.targetOrganizations.trim()) {
          targetingRules.push({
            type: 'organization',
            values: formData.targetOrganizations.split(',').map((s) => s.trim()).filter(Boolean),
          });
        }
        if (formData.targetUsers.trim()) {
          targetingRules.push({
            type: 'user',
            values: formData.targetUsers.split(',').map((s) => s.trim()).filter(Boolean),
          });
        }
        if (formData.targetTiers.length > 0) {
          targetingRules.push({
            type: 'tier',
            values: formData.targetTiers,
          });
        }
      }

      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: formData.key,
          name: formData.name,
          description: formData.description,
          enabled: formData.enabled,
          environment: formData.environment,
          rolloutStrategy: formData.rolloutStrategy,
          rolloutPercentage: formData.rolloutStrategy === 'percentage' ? formData.rolloutPercentage : 100,
          targetingRules,
        }),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        resetFormData();
        fetchFlags();
      }
    } catch (error) {
      console.error('Failed to create flag:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditFlag = async () => {
    if (!selectedFlag) {
      return;
    }

    setActionLoading(true);
    try {
      const targetingRules: TargetingRule[] = [];

      if (formData.rolloutStrategy === 'targeted') {
        if (formData.targetOrganizations.trim()) {
          targetingRules.push({
            type: 'organization',
            values: formData.targetOrganizations.split(',').map((s) => s.trim()).filter(Boolean),
          });
        }
        if (formData.targetUsers.trim()) {
          targetingRules.push({
            type: 'user',
            values: formData.targetUsers.split(',').map((s) => s.trim()).filter(Boolean),
          });
        }
        if (formData.targetTiers.length > 0) {
          targetingRules.push({
            type: 'tier',
            values: formData.targetTiers,
          });
        }
      }

      const response = await fetch(`/api/admin/feature-flags/${selectedFlag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: formData.key,
          name: formData.name,
          description: formData.description,
          enabled: formData.enabled,
          environment: formData.environment,
          rolloutStrategy: formData.rolloutStrategy,
          rolloutPercentage: formData.rolloutStrategy === 'percentage' ? formData.rolloutPercentage : 100,
          targetingRules,
        }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setSelectedFlag(null);
        resetFormData();
        fetchFlags();
      }
    } catch (error) {
      console.error('Failed to update flag:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFlag = async () => {
    if (!selectedFlag) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/feature-flags/${selectedFlag.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setSelectedFlag(null);
        fetchFlags();
      }
    } catch (error) {
      console.error('Failed to delete flag:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    const orgRule = flag.targetingRules.find((r) => r.type === 'organization');
    const userRule = flag.targetingRules.find((r) => r.type === 'user');
    const tierRule = flag.targetingRules.find((r) => r.type === 'tier');

    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      environment: flag.environment,
      rolloutStrategy: flag.rolloutStrategy,
      rolloutPercentage: flag.rolloutPercentage,
      targetOrganizations: orgRule?.values.join(', ') || '',
      targetUsers: userRule?.values.join(', ') || '',
      targetTiers: (tierRule?.values as TargetTier[]) || [],
    });
    setEditDialogOpen(true);
  };

  const toggleExpandFlag = (flagId: string) => {
    setExpandedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) {
        next.delete(flagId);
      } else {
        next.add(flagId);
      }
      return next;
    });
  };

  const copyFlagKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getEnvironmentBadge = (env: Environment) => {
    const config = ENVIRONMENTS.find((e) => e.value === env);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config?.color}`}
      >
        {env === 'development' && <Server className="h-3 w-3" />}
        {env === 'staging' && <Globe className="h-3 w-3" />}
        {env === 'production' && <CheckCircle className="h-3 w-3" />}
        {config?.label}
      </span>
    );
  };

  const getStrategyBadge = (strategy: RolloutStrategy, percentage: number) => {
    switch (strategy) {
      case 'all':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Users className="h-3 w-3" />
            All Users
          </span>
        );
      case 'percentage':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Percent className="h-3 w-3" />
            {percentage}% Rollout
          </span>
        );
      case 'targeted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <Target className="h-3 w-3" />
            Targeted
          </span>
        );
    }
  };

  const formatAuditAction = (action: AuditLogEntry['action']) => {
    const configs = {
      created: { label: 'Created', color: 'text-green-400' },
      updated: { label: 'Updated', color: 'text-blue-400' },
      enabled: { label: 'Enabled', color: 'text-green-400' },
      disabled: { label: 'Disabled', color: 'text-amber-400' },
      deleted: { label: 'Deleted', color: 'text-red-400' },
    };
    const config = configs[action];
    return <span className={config.color}>{config.label}</span>;
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

  const handleTierToggle = (tier: TargetTier) => {
    setFormData((prev) => ({
      ...prev,
      targetTiers: prev.targetTiers.includes(tier)
        ? prev.targetTiers.filter((t) => t !== tier)
        : [...prev.targetTiers, tier],
    }));
  };

  const enabledCount = flags.filter((f) => f.enabled).length;
  const disabledCount = flags.filter((f) => !f.enabled).length;
  const hasFilters = searchQuery || statusFilter !== 'all' || environmentFilter !== 'all';

  const renderFlagsList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      );
    }

    if (flags.length === 0) {
      return (
        <div className="text-center py-12">
          <Flag className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No feature flags found</h3>
          <p className="text-gray-400 mb-4">
            {hasFilters ? 'Try adjusting your filters' : 'Create your first feature flag to get started'}
          </p>
          {!hasFilters && (
            <Button
              onClick={() => {
                resetFormData();
                setCreateDialogOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Flag
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-800">
        {flags.map((flag) => (
          <Collapsible
            key={flag.id}
            open={expandedFlags.has(flag.id)}
            onOpenChange={() => toggleExpandFlag(flag.id)}
          >
            <div className="p-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggleFlag(flag)}
                      />
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          flag.enabled
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {flag.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <h3 className="text-white font-medium truncate">{flag.name}</h3>
                    {getEnvironmentBadge(flag.environment)}
                    {getStrategyBadge(flag.rolloutStrategy, flag.rolloutPercentage)}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-sm text-gray-400 bg-gray-800 px-2 py-0.5 rounded font-mono">
                      {flag.key}
                    </code>
                    <button
                      onClick={() => copyFlagKey(flag.key)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {flag.description && (
                    <p className="text-sm text-gray-400 mb-2">{flag.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(flag.updatedAt)}
                    </span>
                    <span>Created by {flag.createdBy.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                      {expandedFlags.has(flag.id) ? (
                        <ChevronUp className="h-4 w-4 ml-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(flag)}
                        className="text-white hover:bg-gray-700 cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedFlag(flag);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-400 hover:bg-gray-700 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Targeting Rules Display */}
              {flag.targetingRules.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="flex flex-wrap gap-2">
                    {flag.targetingRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-xs bg-gray-800 px-2 py-1 rounded"
                      >
                        {rule.type === 'organization' && (
                          <Building2 className="h-3 w-3 text-blue-400" />
                        )}
                        {rule.type === 'user' && (
                          <Users className="h-3 w-3 text-purple-400" />
                        )}
                        {rule.type === 'tier' && (
                          <Crown className="h-3 w-3 text-amber-400" />
                        )}
                        <span className="text-gray-400 capitalize">{rule.type}:</span>
                        <span className="text-white">{rule.values.length} targets</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <CollapsibleContent>
              <div className="px-4 pb-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-gray-400" />
                    Audit Log
                  </h4>
                  {flag.auditLog && flag.auditLog.length > 0 ? (
                    <div className="space-y-3">
                      {flag.auditLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 text-sm border-l-2 border-gray-700 pl-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {formatAuditAction(entry.action)}
                              <span className="text-gray-400">by</span>
                              <span className="text-white">{entry.performedBy.name}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDate(entry.performedAt)}
                            </p>
                            {Object.keys(entry.changes).length > 0 && (
                              <div className="mt-2 text-xs">
                                {Object.entries(entry.changes).map(([key, change]) => (
                                  <div key={key} className="text-gray-400">
                                    <span className="text-gray-500">{key}:</span>{' '}
                                    <span className="text-red-400 line-through">
                                      {String(change.from)}
                                    </span>{' '}
                                    <span className="text-green-400">{String(change.to)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No audit history available</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
          <p className="text-gray-400 mt-1">Manage feature rollouts and experiments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFlags()}
            disabled={loading}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              resetFormData();
              setCreateDialogOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Flag
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800 rounded-lg">
              <Flag className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Flags</p>
              <p className="text-xl font-semibold text-white">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ToggleRight className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Enabled</p>
              <p className="text-xl font-semibold text-green-400">{enabledCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <ToggleLeft className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Disabled</p>
              <p className="text-xl font-semibold text-gray-400">{disabledCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Percent className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Partial Rollout</p>
              <p className="text-xl font-semibold text-amber-400">
                {flags.filter((f) => f.rolloutStrategy === 'percentage').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name or key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white hover:bg-gray-700">All Status</SelectItem>
              <SelectItem value="enabled" className="text-white hover:bg-gray-700">Enabled</SelectItem>
              <SelectItem value="disabled" className="text-white hover:bg-gray-700">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white hover:bg-gray-700">All Environments</SelectItem>
              {ENVIRONMENTS.map((env) => (
                <SelectItem key={env.value} value={env.value} className="text-white hover:bg-gray-700">
                  {env.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Flags List */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        {renderFlagsList()}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            flags
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Flag Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-teal-500" />
              Create Feature Flag
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new feature flag for controlled rollouts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Flag Key</Label>
                <Input
                  value={formData.key}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
                    }))
                  }
                  placeholder="my_feature_flag"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Display Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Feature Flag"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this flag controls..."
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value: Environment) =>
                    setFormData((prev) => ({ ...prev, environment: value }))
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {ENVIRONMENTS.map((env) => (
                      <SelectItem
                        key={env.value}
                        value={env.value}
                        className="text-white hover:bg-gray-700"
                      >
                        {env.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Default State</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                  <span className="text-sm text-gray-400">
                    {formData.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Rollout Strategy</Label>
              <Select
                value={formData.rolloutStrategy}
                onValueChange={(value: RolloutStrategy) =>
                  setFormData((prev) => ({ ...prev, rolloutStrategy: value }))
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Users
                    </div>
                  </SelectItem>
                  <SelectItem value="percentage" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentage Rollout
                    </div>
                  </SelectItem>
                  <SelectItem value="targeted" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Targeted Rollout
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.rolloutStrategy === 'percentage' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Rollout Percentage</Label>
                  <span className="text-sm text-teal-400 font-medium">
                    {formData.rolloutPercentage}%
                  </span>
                </div>
                <Slider
                  value={[formData.rolloutPercentage]}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, rolloutPercentage: value[0] }))
                  }
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-teal-500"
                />
              </div>
            )}

            {formData.rolloutStrategy === 'targeted' && (
              <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-pink-400" />
                  Targeting Rules
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Organization IDs (comma-separated)
                    </Label>
                    <Input
                      value={formData.targetOrganizations}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, targetOrganizations: e.target.value }))
                      }
                      placeholder="org-123, org-456"
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      User IDs (comma-separated)
                    </Label>
                    <Input
                      value={formData.targetUsers}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, targetUsers: e.target.value }))
                      }
                      placeholder="user-123, user-456"
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Subscription Tiers
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {TIERS.map((tier) => (
                        <button
                          key={tier.value}
                          onClick={() => handleTierToggle(tier.value)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            formData.targetTiers.includes(tier.value)
                              ? 'bg-teal-500/20 border-teal-500/50 text-teal-400'
                              : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFlag}
              disabled={actionLoading || !formData.key || !formData.name}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Flag
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Flag Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              Edit Feature Flag
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update feature flag configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Flag Key</Label>
                <Input
                  value={formData.key}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
                    }))
                  }
                  placeholder="my_feature_flag"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Display Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Feature Flag"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this flag controls..."
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value: Environment) =>
                    setFormData((prev) => ({ ...prev, environment: value }))
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {ENVIRONMENTS.map((env) => (
                      <SelectItem
                        key={env.value}
                        value={env.value}
                        className="text-white hover:bg-gray-700"
                      >
                        {env.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                  <span className="text-sm text-gray-400">
                    {formData.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Rollout Strategy</Label>
              <Select
                value={formData.rolloutStrategy}
                onValueChange={(value: RolloutStrategy) =>
                  setFormData((prev) => ({ ...prev, rolloutStrategy: value }))
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Users
                    </div>
                  </SelectItem>
                  <SelectItem value="percentage" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentage Rollout
                    </div>
                  </SelectItem>
                  <SelectItem value="targeted" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Targeted Rollout
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.rolloutStrategy === 'percentage' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Rollout Percentage</Label>
                  <span className="text-sm text-teal-400 font-medium">
                    {formData.rolloutPercentage}%
                  </span>
                </div>
                <Slider
                  value={[formData.rolloutPercentage]}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, rolloutPercentage: value[0] }))
                  }
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-teal-500"
                />
              </div>
            )}

            {formData.rolloutStrategy === 'targeted' && (
              <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-pink-400" />
                  Targeting Rules
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Organization IDs (comma-separated)
                    </Label>
                    <Input
                      value={formData.targetOrganizations}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, targetOrganizations: e.target.value }))
                      }
                      placeholder="org-123, org-456"
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      User IDs (comma-separated)
                    </Label>
                    <Input
                      value={formData.targetUsers}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, targetUsers: e.target.value }))
                      }
                      placeholder="user-123, user-456"
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Subscription Tiers
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {TIERS.map((tier) => (
                        <button
                          key={tier.value}
                          onClick={() => handleTierToggle(tier.value)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            formData.targetTiers.includes(tier.value)
                              ? 'bg-teal-500/20 border-teal-500/50 text-teal-400'
                              : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedFlag(null);
                resetFormData();
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditFlag}
              disabled={actionLoading || !formData.key || !formData.name}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Feature Flag
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this feature flag? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedFlag && (
            <div className="py-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Flag className="h-5 w-5 text-gray-400" />
                  <span className="text-white font-medium">{selectedFlag.name}</span>
                </div>
                <code className="text-sm text-gray-400 bg-gray-900 px-2 py-0.5 rounded font-mono">
                  {selectedFlag.key}
                </code>
                <p className="text-sm text-gray-500 mt-2">{selectedFlag.description}</p>
              </div>
              <p className="text-sm text-amber-400 mt-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Any code referencing this flag will receive the default value.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedFlag(null);
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteFlag}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Flag
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}