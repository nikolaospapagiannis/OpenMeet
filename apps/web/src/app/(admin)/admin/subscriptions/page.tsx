'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Edit,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Receipt,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  tier: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  features: {
    maxUsers: number;
    maxMeetings: number;
    maxStorage: number;
    features: string[];
  };
}

interface SubscriptionStats {
  totalMRR: number;
  totalARR: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnedThisMonth: number;
  mrrGrowth: number;
}

const SUBSCRIPTION_TIERS = [
  { value: 'free', label: 'Free', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  { value: 'starter', label: 'Starter', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'professional', label: 'Professional', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'enterprise', label: 'Enterprise', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'custom', label: 'Custom', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'trialing', label: 'Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'past_due', label: 'Past Due', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'canceled', label: 'Canceled', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'unpaid', label: 'Unpaid', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'paused', label: 'Paused', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);

  // Dialog states
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [changeTierDialogOpen, setChangeTierDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [newTier, setNewTier] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [extendDays, setExtendDays] = useState('7');

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (searchQuery) params.set('search', searchQuery);
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/subscriptions?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch subscriptions');

      const data = await response.json();
      setSubscriptions(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalSubscriptions(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, tierFilter, statusFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions/stats', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, [fetchSubscriptions]);

  const handleChangeTier = async () => {
    if (!selectedSubscription || !newTier) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier: newTier }),
      });

      if (!response.ok) throw new Error('Failed to change tier');

      setChangeTierDialogOpen(false);
      setSelectedSubscription(null);
      setNewTier('');
      fetchSubscriptions();
      fetchStats();
    } catch (error) {
      console.error('Error changing tier:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!selectedSubscription) return;
    try {
      setActionLoading(true);
      const action = selectedSubscription.status === 'paused' ? 'resume' : 'pause';
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`Failed to ${action} subscription`);

      setPauseDialogOpen(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error pausing/resuming subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedSubscription) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      setCancelDialogOpen(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
      fetchStats();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedSubscription || !refundAmount) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: parseFloat(refundAmount) }),
      });

      if (!response.ok) throw new Error('Failed to issue refund');

      setRefundDialogOpen(false);
      setSelectedSubscription(null);
      setRefundAmount('');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error issuing refund:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedSubscription || !extendDays) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/extend-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ days: parseInt(extendDays) }),
      });

      if (!response.ok) throw new Error('Failed to extend trial');

      setExtendTrialDialogOpen(false);
      setSelectedSubscription(null);
      setExtendDays('7');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error extending trial:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency = 'USD') => {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTierBadge = (tier: string) => {
    const config = SUBSCRIPTION_TIERS.find(t => t.value === tier);
    return config?.color || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getStatusBadge = (status: string) => {
    const config = SUBSCRIPTION_STATUSES.find(s => s.value === status);
    return config?.color || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'trialing':
        return <Clock className="h-3 w-3" />;
      case 'past_due':
      case 'unpaid':
        return <AlertTriangle className="h-3 w-3" />;
      case 'canceled':
        return <XCircle className="h-3 w-3" />;
      case 'paused':
        return <Pause className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
          <p className="text-slate-400 mt-1">Manage billing and subscriptions</p>
        </div>
        <Button
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          onClick={() => {
            fetchSubscriptions();
            fetchStats();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Monthly Recurring Revenue</p>
                <p className="text-xl font-bold text-white">
                  {stats ? formatCurrency(stats.totalMRR) : '—'}
                </p>
              </div>
            </div>
            {stats && stats.mrrGrowth !== undefined && stats.mrrGrowth !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${stats.mrrGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.mrrGrowth > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(stats.mrrGrowth).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Annual Recurring Revenue</p>
              <p className="text-xl font-bold text-white">
                {stats ? formatCurrency(stats.totalARR) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Subscriptions</p>
              <p className="text-xl font-bold text-white">
                {stats?.activeSubscriptions.toLocaleString() || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Churned This Month</p>
              <p className="text-xl font-bold text-white">
                {stats?.churnedThisMonth.toLocaleString() || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by organization name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-white/10"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {SUBSCRIPTION_TIERS.map(tier => (
                <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {SUBSCRIPTION_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Organization</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Period</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Limits</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr
                    key={subscription.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{subscription.organizationName}</p>
                          <p className="text-xs text-slate-400">ID: {subscription.organizationId.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getTierBadge(subscription.tier)}`}>
                        {SUBSCRIPTION_TIERS.find(t => t.value === subscription.tier)?.label || subscription.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadge(subscription.status)}`}>
                          {getStatusIcon(subscription.status)}
                          {SUBSCRIPTION_STATUSES.find(s => s.value === subscription.status)?.label || subscription.status}
                        </span>
                        {subscription.cancelAtPeriodEnd && (
                          <p className="text-xs text-amber-400">Cancels at period end</p>
                        )}
                        {subscription.trialEndsAt && new Date(subscription.trialEndsAt) > new Date() && (
                          <p className="text-xs text-blue-400">
                            Trial ends: {formatDate(subscription.trialEndsAt)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">
                          {formatCurrency(subscription.amount, subscription.currency)}
                        </p>
                        <p className="text-xs text-slate-400">
                          per {subscription.interval}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(subscription.currentPeriodStart)}</span>
                        <span>-</span>
                        <span>{formatDate(subscription.currentPeriodEnd)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-400 space-y-0.5">
                        <p>{subscription.features.maxUsers} users</p>
                        <p>{subscription.features.maxMeetings} meetings/mo</p>
                        <p>{subscription.features.maxStorage}GB storage</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Receipt className="h-4 w-4 mr-2" />
                            View Invoices
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setNewTier(subscription.tier);
                              setChangeTierDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Change Plan
                          </DropdownMenuItem>
                          {subscription.status === 'trialing' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSubscription(subscription);
                                setExtendTrialDialogOpen(true);
                              }}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Extend Trial
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setPauseDialogOpen(true);
                            }}
                          >
                            {subscription.status === 'paused' ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Resume Subscription
                              </>
                            ) : (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause Subscription
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setRefundAmount(subscription.amount.toString());
                              setRefundDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Issue Refund
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setCancelDialogOpen(true);
                            }}
                            className="text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && subscriptions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-sm text-slate-400">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalSubscriptions)} of {totalSubscriptions} subscriptions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-white/10 hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-white/10 hover:bg-white/5"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Change Tier Dialog */}
      <Dialog open={changeTierDialogOpen} onClose={() => setChangeTierDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Change the subscription tier for {selectedSubscription?.organizationName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newTier} onValueChange={setNewTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_TIERS.map(tier => (
                  <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                The change will take effect immediately. Prorated charges may apply.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeTier} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={extendTrialDialogOpen} onClose={() => setExtendTrialDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial Period</DialogTitle>
            <DialogDescription>
              Extend the trial for {selectedSubscription?.organizationName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={extendDays} onValueChange={setExtendDays}>
              <SelectTrigger>
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTrialDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendTrial} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Extend Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause/Resume Dialog */}
      <AlertDialog open={pauseDialogOpen} onClose={() => setPauseDialogOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedSubscription?.status === 'paused' ? 'Resume' : 'Pause'} Subscription
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSubscription?.status === 'paused'
                ? `This will resume billing for ${selectedSubscription?.organizationName}. They will be charged on their next billing date.`
                : `This will pause billing for ${selectedSubscription?.organizationName}. They will retain access until the current period ends.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePauseResume} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedSubscription?.status === 'paused' ? 'Resume' : 'Pause'} Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Issue a refund for {selectedSubscription?.organizationName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-400">Refund Amount</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-white/10"
                  min="0"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Max refundable: {selectedSubscription ? formatCurrency(selectedSubscription.amount) : '—'}
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Refunds are processed through Stripe and may take 5-10 business days to appear.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={actionLoading || !refundAmount}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the subscription for {selectedSubscription?.organizationName}?
              They will retain access until the end of the current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
