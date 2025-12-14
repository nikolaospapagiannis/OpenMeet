'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Download,
} from 'lucide-react';
import Link from 'next/link';

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

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending' | 'cancelled';
  tier: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
  healthScore: number;
  createdAt: string;
  suspendedAt?: string;
  suspendedReason?: string;
  _count: {
    users: number;
    meetings: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'reactivate' | 'delete' | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (tierFilter !== 'all') params.append('tier', tierFilter);

      const response = await fetch(`/api/admin/organizations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, tierFilter]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleAction = async () => {
    if (!selectedOrg || !actionType) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let method = 'POST';
      let body: Record<string, string> | undefined;

      switch (actionType) {
        case 'suspend':
          endpoint = `/api/admin/organizations/${selectedOrg.id}/suspend`;
          body = { reason: suspendReason };
          break;
        case 'reactivate':
          endpoint = `/api/admin/organizations/${selectedOrg.id}/reactivate`;
          break;
        case 'delete':
          endpoint = `/api/admin/organizations/${selectedOrg.id}`;
          method = 'DELETE';
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        setActionDialogOpen(false);
        setSelectedOrg(null);
        setActionType(null);
        setSuspendReason('');
        fetchOrganizations();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (org: Organization, type: 'suspend' | 'reactivate' | 'delete') => {
    setSelectedOrg(org);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const getStatusBadge = (status: Organization['status']) => {
    const configs = {
      active: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      suspended: { icon: AlertTriangle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      cancelled: { icon: XCircle, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    };
    const config = configs[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTierBadge = (tier: Organization['tier']) => {
    const colors: Record<string, string> = {
      free: 'bg-slate-500/20 text-slate-400',
      starter: 'bg-blue-500/20 text-blue-400',
      professional: 'bg-purple-500/20 text-purple-400',
      enterprise: 'bg-amber-500/20 text-amber-400',
      custom: 'bg-pink-500/20 text-pink-400',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${colors[tier]}`}>
        {tier === 'enterprise' && <Crown className="h-3 w-3" />}
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-slate-400 mt-1">Manage all organizations on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={fetchOrganizations}
            variant="outline"
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-white/5">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-slate-800/50 border-white/10 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[140px] bg-slate-800/50 border-white/10 text-white">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <p className="text-sm text-slate-400">Total Organizations</p>
          <p className="text-2xl font-bold text-white">{pagination.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-400">Active</p>
          <p className="text-2xl font-bold text-green-400">
            {organizations.filter(o => o.status === 'active').length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">Suspended</p>
          <p className="text-2xl font-bold text-red-400">
            {organizations.filter(o => o.status === 'suspended').length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-400">Enterprise</p>
          <p className="text-2xl font-bold text-amber-400">
            {organizations.filter(o => o.tier === 'enterprise').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-slate-800/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Organization</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Tier</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Users</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Meetings</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Health</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Created</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mx-auto mb-2" />
                    <p className="text-slate-400">Loading organizations...</p>
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Building2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400">No organizations found</p>
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{org.name}</p>
                          <p className="text-xs text-slate-400">/{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(org.status)}</td>
                    <td className="py-4 px-6">{getTierBadge(org.tier)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Users className="h-4 w-4 text-slate-500" />
                        {org._count?.users || 0}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        {org._count?.meetings || 0}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-medium ${getHealthColor(org.healthScore)}`}>
                        {org.healthScore}%
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/organizations/${org.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/organizations/${org.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/organizations/${org.id}/edit`} className="flex items-center">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {org.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => openActionDialog(org, 'suspend')}
                                className="text-yellow-400 focus:text-yellow-400"
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            ) : org.status === 'suspended' ? (
                              <DropdownMenuItem
                                onClick={() => openActionDialog(org, 'reactivate')}
                                className="text-green-400 focus:text-green-400"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              onClick={() => openActionDialog(org, 'delete')}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <p className="text-sm text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
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
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="border-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'suspend' && 'Suspend Organization'}
              {actionType === 'reactivate' && 'Reactivate Organization'}
              {actionType === 'delete' && 'Delete Organization'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'suspend' && (
                <>Are you sure you want to suspend <strong>{selectedOrg?.name}</strong>? Users will lose access.</>
              )}
              {actionType === 'reactivate' && (
                <>Are you sure you want to reactivate <strong>{selectedOrg?.name}</strong>? Access will be restored.</>
              )}
              {actionType === 'delete' && (
                <>
                  Are you sure you want to delete <strong>{selectedOrg?.name}</strong>?
                  This action cannot be undone and all data will be permanently removed.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'suspend' && (
            <div className="space-y-2 py-4">
              <Label htmlFor="reason">Suspension Reason</Label>
              <Input
                id="reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason for suspension..."
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading || (actionType === 'suspend' && !suspendReason)}
              className={
                actionType === 'delete'
                  ? 'bg-red-500 hover:bg-red-600'
                  : actionType === 'suspend'
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-green-500 hover:bg-green-600'
              }
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {actionType === 'suspend' && 'Suspend'}
              {actionType === 'reactivate' && 'Reactivate'}
              {actionType === 'delete' && 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
