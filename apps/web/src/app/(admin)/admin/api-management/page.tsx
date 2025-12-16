'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Plus,
  Search,
  MoreVertical,
  Copy,
  RefreshCw,
  Trash2,
  Edit,
  BarChart3,
  Clock,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  organizationId: string;
  organizationName: string;
  scopes: string[];
  rateLimit: number;
  rateLimitWindow: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  createdBy: string;
  totalRequests: number;
}

interface Organization {
  id: string;
  name: string;
}

interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  totalRequests24h: number;
  avgResponseTime: number;
}

interface UsageDataPoint {
  timestamp: string;
  requests: number;
  errors: number;
  avgLatency: number;
}

interface CreateApiKeyResponse {
  id: string;
  key: string;
  name: string;
}

const API_SCOPES = [
  { id: 'meetings:read', name: 'Read Meetings', description: 'View meeting data and transcripts' },
  { id: 'meetings:write', name: 'Write Meetings', description: 'Create and modify meetings' },
  { id: 'analytics:read', name: 'Read Analytics', description: 'Access analytics and reports' },
  { id: 'users:read', name: 'Read Users', description: 'View user information' },
  { id: 'users:write', name: 'Write Users', description: 'Manage user accounts' },
  { id: 'organizations:read', name: 'Read Organizations', description: 'View organization data' },
  { id: 'organizations:write', name: 'Write Organizations', description: 'Manage organizations' },
  { id: 'webhooks:manage', name: 'Manage Webhooks', description: 'Create and manage webhooks' },
];

const RATE_LIMIT_PRESETS = [
  { value: 100, label: '100 requests/minute', window: '1m' },
  { value: 1000, label: '1,000 requests/minute', window: '1m' },
  { value: 10000, label: '10,000 requests/minute', window: '1m' },
  { value: 60000, label: '60,000 requests/hour', window: '1h' },
  { value: 0, label: 'Unlimited', window: 'unlimited' },
];

export default function ApiManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<CreateApiKeyResponse | null>(null);
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    organizationId: '',
    scopes: [] as string[],
    rateLimit: 1000,
    rateLimitWindow: '1m',
    expiresAt: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (organizationFilter !== 'all') {
        params.append('organizationId', organizationFilter);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/api-keys?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const data = await response.json();
      setApiKeys(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, organizationFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/api-keys/stats`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/organizations?limit=100`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.data);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  }, []);

  const fetchUsageData = useCallback(async (keyId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/api-keys/${keyId}/usage?period=7d`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setUsageData(data.data);
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
      setUsageData([]);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
    fetchStats();
    fetchOrganizations();
  }, [fetchApiKeys, fetchStats, fetchOrganizations]);

  const handleCreateApiKey = async () => {
    try {
      setActionLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/api-keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            organizationId: formData.organizationId,
            scopes: formData.scopes,
            rateLimit: formData.rateLimit,
            rateLimitWindow: formData.rateLimitWindow,
            expiresAt: formData.expiresAt || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create API key');
      }

      const data = await response.json();
      setNewKeyData(data);
      setShowCreateModal(false);
      setShowNewKeyModal(true);
      setFormData({
        name: '',
        organizationId: '',
        scopes: [],
        rateLimit: 1000,
        rateLimitWindow: '1m',
        expiresAt: '',
      });
      fetchApiKeys();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditApiKey = async () => {
    if (!selectedKey) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/api-keys/${selectedKey.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            scopes: formData.scopes,
            rateLimit: formData.rateLimit,
            rateLimitWindow: formData.rateLimitWindow,
            expiresAt: formData.expiresAt || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update API key');
      }

      setShowEditModal(false);
      setSelectedKey(null);
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!selectedKey) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/api-keys/${selectedKey.id}/revoke`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to revoke API key');
      }

      setShowRevokeDialog(false);
      setSelectedKey(null);
      fetchApiKeys();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateApiKey = async () => {
    if (!selectedKey) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/api-keys/${selectedKey.id}/rotate`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to rotate API key');
      }

      const data = await response.json();
      setNewKeyData(data);
      setShowRotateDialog(false);
      setShowNewKeyModal(true);
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate API key');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (key: ApiKey) => {
    setSelectedKey(key);
    setFormData({
      name: key.name,
      organizationId: key.organizationId,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
      rateLimitWindow: key.rateLimitWindow,
      expiresAt: key.expiresAt ? key.expiresAt.split('T')[0] : '',
    });
    setShowEditModal(true);
    setOpenDropdownId(null);
  };

  const openUsageModal = async (key: ApiKey) => {
    setSelectedKey(key);
    setShowUsageModal(true);
    await fetchUsageData(key.id);
    setOpenDropdownId(null);
  };

  const openRevokeDialog = (key: ApiKey) => {
    setSelectedKey(key);
    setShowRevokeDialog(true);
    setOpenDropdownId(null);
  };

  const openRotateDialog = (key: ApiKey) => {
    setSelectedKey(key);
    setShowRotateDialog(true);
    setOpenDropdownId(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getStatusBadge = (status: ApiKey['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" />
            Revoked
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
            <AlertCircle className="w-3 h-3" />
            Expired
          </span>
        );
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleScope = (scopeId: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  };

  const handleRateLimitChange = (value: string) => {
    const preset = RATE_LIMIT_PRESETS.find((p) => p.value.toString() === value);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        rateLimit: preset.value,
        rateLimitWindow: preset.window,
      }));
    }
  };

  const maxUsageValue = Math.max(...usageData.map((d) => d.requests), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Management</h1>
          <p className="text-slate-400 mt-1">Manage API keys and monitor usage across organizations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total API Keys</p>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.totalKeys)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Active Keys</p>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.activeKeys)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Requests (24h)</p>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.totalRequests24h)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">{stats.avgResponseTime}ms</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Select
            value={organizationFilter}
            onValueChange={(value) => {
              setOrganizationFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-48 bg-slate-900/50 border-slate-700 text-white">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-36 bg-slate-900/50 border-slate-700 text-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No API Keys Found</h3>
            <p className="text-slate-400 mb-4">
              {searchQuery || statusFilter !== 'all' || organizationFilter !== 'all'
                ? 'No API keys match your filters.'
                : 'Get started by creating your first API key.'}
            </p>
            {!searchQuery && statusFilter === 'all' && organizationFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create API Key
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Organization</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Scopes</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Rate Limit</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Last Used</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-white font-medium">{key.name}</p>
                          <p className="text-sm text-slate-400 font-mono">{key.keyPrefix}...</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300">{key.organizationName}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.slice(0, 2).map((scope) => (
                            <span
                              key={scope}
                              className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded"
                            >
                              {scope}
                            </span>
                          ))}
                          {key.scopes.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                              +{key.scopes.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {key.rateLimit === 0
                          ? 'Unlimited'
                          : `${formatNumber(key.rateLimit)}/${key.rateLimitWindow}`}
                      </td>
                      <td className="px-4 py-4 text-slate-300">{formatDate(key.lastUsedAt)}</td>
                      <td className="px-4 py-4">{getStatusBadge(key.status)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setOpenDropdownId(openDropdownId === key.id ? null : key.id)
                            }
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                          {openDropdownId === key.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                              <button
                                onClick={() => openUsageModal(key)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                              >
                                <BarChart3 className="w-4 h-4" />
                                View Usage
                              </button>
                              {key.status === 'active' && (
                                <>
                                  <button
                                    onClick={() => openEditModal(key)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => openRotateDialog(key)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Rotate Key
                                  </button>
                                  <button
                                    onClick={() => openRevokeDialog(key)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Revoke
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
              <p className="text-sm text-slate-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        className="w-full max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My API Key"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="bg-slate-900/50 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Select
              value={formData.organizationId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, organizationId: value }))
              }
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/50 rounded-lg border border-slate-700">
              {API_SCOPES.map((scope) => (
                <label
                  key={scope.id}
                  className="flex items-start gap-3 p-2 hover:bg-slate-800/50 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={formData.scopes.includes(scope.id)}
                    onCheckedChange={() => toggleScope(scope.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{scope.name}</p>
                    <p className="text-xs text-slate-400">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rateLimit">Rate Limit</Label>
            <Select
              value={formData.rateLimit.toString()}
              onValueChange={handleRateLimitChange}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATE_LIMIT_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
              className="bg-slate-900/50 border-slate-700 text-white"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => setShowCreateModal(false)}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateApiKey}
            disabled={!formData.name || !formData.organizationId || formData.scopes.length === 0 || actionLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Creating...' : 'Create API Key'}
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedKey(null);
        }}
        className="w-full max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Edit API Key</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editName">Name</Label>
            <Input
              id="editName"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="bg-slate-900/50 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/50 rounded-lg border border-slate-700">
              {API_SCOPES.map((scope) => (
                <label
                  key={scope.id}
                  className="flex items-start gap-3 p-2 hover:bg-slate-800/50 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={formData.scopes.includes(scope.id)}
                    onCheckedChange={() => toggleScope(scope.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{scope.name}</p>
                    <p className="text-xs text-slate-400">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editRateLimit">Rate Limit</Label>
            <Select
              value={formData.rateLimit.toString()}
              onValueChange={handleRateLimitChange}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATE_LIMIT_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editExpiresAt">Expiration Date (Optional)</Label>
            <Input
              id="editExpiresAt"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
              className="bg-slate-900/50 border-slate-700 text-white"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => {
              setShowEditModal(false);
              setSelectedKey(null);
            }}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleEditApiKey}
            disabled={!formData.name || formData.scopes.length === 0 || actionLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={showUsageModal}
        onClose={() => {
          setShowUsageModal(false);
          setSelectedKey(null);
          setUsageData([]);
        }}
        className="w-full max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>API Key Usage - {selectedKey?.name}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {selectedKey && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-sm text-slate-400">Total Requests</p>
                  <p className="text-xl font-bold text-white">{formatNumber(selectedKey.totalRequests)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-sm text-slate-400">Last Used</p>
                  <p className="text-sm font-medium text-white">{formatDate(selectedKey.lastUsedAt)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-sm text-slate-400">Created</p>
                  <p className="text-sm font-medium text-white">{formatDate(selectedKey.createdAt)}</p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-4">Requests (Last 7 Days)</h4>
                {usageData.length > 0 ? (
                  <div className="h-48 flex items-end gap-1">
                    {usageData.map((point, index) => (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-400"
                          style={{
                            height: `${(point.requests / maxUsageValue) * 100}%`,
                            minHeight: point.requests > 0 ? '4px' : '0px',
                          }}
                          title={`${point.requests} requests`}
                        />
                        <span className="text-xs text-slate-500 transform -rotate-45 origin-left">
                          {new Date(point.timestamp).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-500">
                    No usage data available
                  </div>
                )}
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">Key Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Key Prefix</span>
                    <span className="text-white font-mono">{selectedKey.keyPrefix}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rate Limit</span>
                    <span className="text-white">
                      {selectedKey.rateLimit === 0
                        ? 'Unlimited'
                        : `${formatNumber(selectedKey.rateLimit)}/${selectedKey.rateLimitWindow}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expires</span>
                    <span className="text-white">
                      {selectedKey.expiresAt ? formatDate(selectedKey.expiresAt) : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scopes</span>
                    <span className="text-white">{selectedKey.scopes.length} permissions</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => {
              setShowUsageModal(false);
              setSelectedKey(null);
              setUsageData([]);
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={showNewKeyModal}
        onClose={() => {
          setShowNewKeyModal(false);
          setNewKeyData(null);
          setShowApiKey(false);
        }}
        className="w-full max-w-lg"
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {newKeyData && (
            <div className="space-y-4">
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-500 font-medium">Important</p>
                    <p className="text-yellow-400/80 text-sm mt-1">
                      This is the only time you will see this API key. Please copy it and store it securely.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={newKeyData.key}
                      readOnly
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm pr-20"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => copyToClipboard(newKeyData.key)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <Copy className={`w-4 h-4 ${copySuccess ? 'text-green-400' : 'text-slate-400'}`} />
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-sm text-green-400">Copied to clipboard!</p>
                )}
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Name</span>
                  <span className="text-white">{newKeyData.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Key ID</span>
                  <span className="text-white font-mono">{newKeyData.id}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => {
              setShowNewKeyModal(false);
              setNewKeyData(null);
              setShowApiKey(false);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </DialogFooter>
      </Dialog>

      <AlertDialog
        open={showRevokeDialog}
        onClose={() => {
          setShowRevokeDialog(false);
          setSelectedKey(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the API key &quot;{selectedKey?.name}&quot;? This action cannot be undone and any applications using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowRevokeDialog(false);
                setSelectedKey(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeApiKey}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
            >
              {actionLoading ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showRotateDialog}
        onClose={() => {
          setShowRotateDialog(false);
          setSelectedKey(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new API key and invalidate the current key for &quot;{selectedKey?.name}&quot;. Make sure to update any applications using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowRotateDialog(false);
                setSelectedKey(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRotateApiKey}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={actionLoading}
            >
              {actionLoading ? 'Rotating...' : 'Rotate Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {openDropdownId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenDropdownId(null)}
        />
      )}
    </div>
  );
}