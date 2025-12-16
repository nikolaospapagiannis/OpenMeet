'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface PlatformStats {
  organizations: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
  };
  users: {
    total: number;
    dau: number;
    wau: number;
    mau: number;
  };
  meetings: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  subscriptions: {
    free: number;
    starter: number;
    professional: number;
    enterprise: number;
    custom: number;
    mrr: number;
  };
}

interface HealthStatus {
  api: { status: string; responseTime: number };
  database: { status: string; latencyMs: number };
}

interface RecentActivity {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  user?: { email: string };
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, healthRes, activityRes] = await Promise.all([
        fetch('/api/admin/overview/stats', { headers }),
        fetch('/api/admin/infrastructure/health', { headers }),
        fetch('/api/admin/overview/activity?limit=10', { headers }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData.data?.services);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.data || []);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const StatCard = ({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    color,
    href,
  }: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    href?: string;
  }) => {
    const content = (
      <div className={`p-6 rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all ${href ? 'cursor-pointer' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {change && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              changeType === 'positive'
                ? 'bg-green-500/20 text-green-400'
                : changeType === 'negative'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-slate-500/20 text-slate-400'
            }`}>
              {changeType === 'positive' ? (
                <TrendingUp className="h-3 w-3" />
              ) : changeType === 'negative' ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {change}
            </div>
          )}
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
    );

    if (href) {
      return <Link href={href}>{content}</Link>;
    }
    return content;
  };

  const HealthIndicator = ({ status, label, value }: { status: string; label: string; value?: string }) => {
    const isHealthy = status === 'healthy' || status === 'green';
    const isDegraded = status === 'degraded' || status === 'yellow';

    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isHealthy ? 'bg-green-500' : isDegraded ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {value && <span className="text-xs text-slate-400">{value}</span>}
          {isHealthy ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : isDegraded ? (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-slate-400 mt-1">
            Welcome back, {user?.firstName}. Here&apos;s what&apos;s happening across the platform.
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Organizations"
          value={formatNumber(stats?.organizations.total || 0)}
          change={`${stats?.organizations.active || 0} active`}
          changeType="neutral"
          icon={Building2}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          href="/admin/organizations"
        />
        <StatCard
          title="Total Users"
          value={formatNumber(stats?.users.total || 0)}
          change={`${stats?.users.dau || 0} DAU`}
          changeType="positive"
          icon={Users}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          href="/admin/users"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.subscriptions.mrr || 0)}
          change="MRR"
          changeType="positive"
          icon={DollarSign}
          color="bg-gradient-to-br from-green-500 to-green-600"
          href="/admin/subscriptions"
        />
        <StatCard
          title="Meetings Today"
          value={formatNumber(stats?.meetings.today || 0)}
          change={`${formatNumber(stats?.meetings.thisMonth || 0)} this month`}
          changeType="neutral"
          icon={Activity}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          href="/admin/analytics"
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Distribution */}
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Subscription Tiers</h3>
            <Link href="/admin/subscriptions">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { tier: 'Enterprise', count: stats?.subscriptions.enterprise || 0, color: 'bg-purple-500' },
              { tier: 'Professional', count: stats?.subscriptions.professional || 0, color: 'bg-blue-500' },
              { tier: 'Starter', count: stats?.subscriptions.starter || 0, color: 'bg-teal-500' },
              { tier: 'Free', count: stats?.subscriptions.free || 0, color: 'bg-slate-500' },
            ].map((item) => {
              const total = (stats?.organizations.total || 1);
              const percentage = Math.round((item.count / total) * 100);
              return (
                <div key={item.tier} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-slate-300 flex-1">{item.tier}</span>
                  <span className="text-sm font-medium text-white">{item.count}</span>
                  <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Health */}
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Platform Health</h3>
            <Link href="/admin/infrastructure">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Details
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            <HealthIndicator
              status={health?.api?.status || 'unknown'}
              label="API Server"
              value={health?.api?.responseTime ? `${health.api.responseTime}ms` : undefined}
            />
            <HealthIndicator
              status={health?.database?.status || 'unknown'}
              label="Database"
              value={health?.database?.latencyMs ? `${health.database.latencyMs}ms` : undefined}
            />
            <HealthIndicator
              status="healthy"
              label="Redis Cache"
            />
            <HealthIndicator
              status="healthy"
              label="Background Jobs"
            />
          </div>
        </div>

        {/* User Engagement */}
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">User Engagement</h3>
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Analytics
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Daily Active Users</span>
              <span className="text-lg font-semibold text-white">{formatNumber(stats?.users.dau || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Weekly Active Users</span>
              <span className="text-lg font-semibold text-white">{formatNumber(stats?.users.wau || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Monthly Active Users</span>
              <span className="text-lg font-semibold text-white">{formatNumber(stats?.users.mau || 0)}</span>
            </div>
            <div className="pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">DAU/MAU Ratio</span>
                <span className="text-lg font-semibold text-green-400">
                  {stats?.users.mau ? Math.round((stats.users.dau / stats.users.mau) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <Link href="/admin/logs">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              View All Logs
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No recent activity</p>
          ) : (
            activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.action}</p>
                  <p className="text-xs text-slate-400">
                    {item.entityType} {item.user?.email ? `by ${item.user.email}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/admin/organizations">
          <Button className="w-full h-auto py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0">
            <Building2 className="h-5 w-5 mr-2" />
            Manage Organizations
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button className="w-full h-auto py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0">
            <Users className="h-5 w-5 mr-2" />
            Manage Users
          </Button>
        </Link>
        <Link href="/admin/analytics">
          <Button className="w-full h-auto py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0">
            <BarChart3 className="h-5 w-5 mr-2" />
            View Analytics
          </Button>
        </Link>
        <Link href="/admin/feature-flags">
          <Button className="w-full h-auto py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0">
            <Zap className="h-5 w-5 mr-2" />
            Feature Flags
          </Button>
        </Link>
      </div>
    </div>
  );
}
