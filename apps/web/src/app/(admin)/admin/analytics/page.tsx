'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Globe,
  Building2,
  Activity,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Zap,
  Target,
  Clock,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AnalyticsOverview {
  totalUsers: number;
  totalOrganizations: number;
  totalMeetings: number;
  totalRevenue: number;
  userGrowthPercent: number;
  meetingGrowthPercent: number;
  revenueGrowthPercent: number;
  avgMeetingsPerUser: number;
}

interface EngagementMetrics {
  dau: number;
  wau: number;
  mau: number;
  dauPercent: number;
  wauPercent: number;
  dauMauRatio: number;
  avgSessionDuration: number;
  avgSessionsPerUser: number;
}

interface RevenueMetrics {
  mrr: number;
  arr: number;
  mrrGrowth: number;
  arrGrowth: number;
  arpu: number;
  ltv: number;
  churnRate: number;
  netRevenueRetention: number;
}

interface UserGrowthData {
  date: string;
  users: number;
  newUsers: number;
}

interface MeetingActivityData {
  date: string;
  meetings: number;
  participants: number;
}

interface RevenueData {
  date: string;
  mrr: number;
  arr: number;
}

interface FeatureUsage {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  percentOfUsers: number;
}

interface RetentionCohort {
  cohort: string;
  totalUsers: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  week8: number;
  week12: number;
}

interface GeoDistribution {
  country: string;
  countryCode: string;
  users: number;
  percentOfTotal: number;
}

interface TopOrganization {
  id: string;
  name: string;
  tier: string;
  users: number;
  meetings: number;
  revenue: number;
}

type DateRange = '7d' | '30d' | '90d' | '1y';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [meetingActivity, setMeetingActivity] = useState<MeetingActivityData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [retentionCohorts, setRetentionCohorts] = useState<RetentionCohort[]>([]);
  const [geoDistribution, setGeoDistribution] = useState<GeoDistribution[]>([]);
  const [topOrganizations, setTopOrganizations] = useState<TopOrganization[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: dateRange });

      const [
        overviewRes,
        engagementRes,
        revenueRes,
        userGrowthRes,
        meetingActivityRes,
        revenueDataRes,
        featureUsageRes,
        retentionRes,
        geoRes,
        topOrgsRes,
      ] = await Promise.all([
        fetch('/api/admin/analytics/overview?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/engagement?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/revenue?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/user-growth?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/meeting-activity?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/revenue-trends?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/feature-usage?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/retention?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/geo-distribution?' + params, { credentials: 'include' }),
        fetch('/api/admin/analytics/top-organizations?' + params, { credentials: 'include' }),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.data);
      }
      if (engagementRes.ok) {
        const data = await engagementRes.json();
        setEngagement(data.data);
      }
      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenue(data.data);
      }
      if (userGrowthRes.ok) {
        const data = await userGrowthRes.json();
        setUserGrowth(data.data || []);
      }
      if (meetingActivityRes.ok) {
        const data = await meetingActivityRes.json();
        setMeetingActivity(data.data || []);
      }
      if (revenueDataRes.ok) {
        const data = await revenueDataRes.json();
        setRevenueData(data.data || []);
      }
      if (featureUsageRes.ok) {
        const data = await featureUsageRes.json();
        setFeatureUsage(data.data || []);
      }
      if (retentionRes.ok) {
        const data = await retentionRes.json();
        setRetentionCohorts(data.data || []);
      }
      if (geoRes.ok) {
        const data = await geoRes.json();
        setGeoDistribution(data.data || []);
      }
      if (topOrgsRes.ok) {
        const data = await topOrgsRes.json();
        setTopOrganizations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ range: dateRange });
      const response = await fetch('/api/admin/analytics/export?' + params, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analytics-' + dateRange + '-' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
  };

  const getGrowthColor = (value: number): string => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getGrowthBgColor = (value: number): string => {
    if (value > 0) return 'bg-green-500/20';
    if (value < 0) return 'bg-red-500/20';
    return 'bg-slate-500/20';
  };

  const getTierColor = (tier: string): string => {
    const colors: Record<string, string> = {
      free: 'bg-slate-500/20 text-slate-400',
      starter: 'bg-blue-500/20 text-blue-400',
      professional: 'bg-purple-500/20 text-purple-400',
      enterprise: 'bg-amber-500/20 text-amber-400',
      custom: 'bg-pink-500/20 text-pink-400',
    };
    return colors[tier.toLowerCase()] || colors.free;
  };

  const getRetentionColor = (value: number): string => {
    if (value >= 70) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const dateRangeLabels: Record<DateRange, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
  };

  const getCountryFlag = (code: string): string => {
    const flags: Record<string, string> = {
      US: '\u{1F1FA}\u{1F1F8}',
      GB: '\u{1F1EC}\u{1F1E7}',
      CA: '\u{1F1E8}\u{1F1E6}',
      AU: '\u{1F1E6}\u{1F1FA}',
      DE: '\u{1F1E9}\u{1F1EA}',
      FR: '\u{1F1EB}\u{1F1F7}',
      JP: '\u{1F1EF}\u{1F1F5}',
      IN: '\u{1F1EE}\u{1F1F3}',
      BR: '\u{1F1E7}\u{1F1F7}',
    };
    return flags[code] || '\u{1F30D}';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
          <p className="text-slate-400 mt-1">
            Comprehensive insights into platform performance and user behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
            <SelectTrigger className="w-[160px] bg-slate-800/50 border-white/10 text-white">
              <Calendar className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
          <Button
            variant="outline"
            onClick={fetchAnalytics}
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={'h-4 w-4 mr-2' + (loading ? ' animate-spin' : '')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <Users className="h-6 w-6 text-white" />
            </div>
            {overview && (
              <div className={'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ' + getGrowthBgColor(overview.userGrowthPercent) + ' ' + getGrowthColor(overview.userGrowthPercent)}>
                {overview.userGrowthPercent >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {formatPercent(overview.userGrowthPercent)}
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {overview ? formatNumber(overview.totalUsers) : '---'}
          </p>
          <p className="text-sm text-slate-400">Total Users</p>
        </div>

        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {overview ? formatNumber(overview.totalOrganizations) : '---'}
          </p>
          <p className="text-sm text-slate-400">Organizations</p>
        </div>

        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600">
              <Activity className="h-6 w-6 text-white" />
            </div>
            {overview && (
              <div className={'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ' + getGrowthBgColor(overview.meetingGrowthPercent) + ' ' + getGrowthColor(overview.meetingGrowthPercent)}>
                {overview.meetingGrowthPercent >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {formatPercent(overview.meetingGrowthPercent)}
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {overview ? formatNumber(overview.totalMeetings) : '---'}
          </p>
          <p className="text-sm text-slate-400">Total Meetings</p>
        </div>

        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            {overview && (
              <div className={'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ' + getGrowthBgColor(overview.revenueGrowthPercent) + ' ' + getGrowthColor(overview.revenueGrowthPercent)}>
                {overview.revenueGrowthPercent >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {formatPercent(overview.revenueGrowthPercent)}
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {overview ? formatCurrency(overview.totalRevenue) : '---'}
          </p>
          <p className="text-sm text-slate-400">Total Revenue</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">User Growth</h3>
            <span className="text-xs text-slate-400">{dateRangeLabels[dateRange]}</span>
          </div>
          {userGrowth.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No user growth data available</p>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-1 px-2">
              {userGrowth.slice(-14).map((item, index) => {
                const maxUsers = Math.max(...userGrowth.map(d => d.users));
                const height = maxUsers > 0 ? (item.users / maxUsers) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
                      style={{ height: height + '%', minHeight: '4px' }}
                      title={item.date + ': ' + item.users + ' users'}
                    />
                    {index % 2 === 0 && (
                      <span className="text-[10px] text-slate-500 truncate w-full text-center">
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Meeting Activity Chart */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Meeting Activity</h3>
            <span className="text-xs text-slate-400">{dateRangeLabels[dateRange]}</span>
          </div>
          {meetingActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No meeting activity data available</p>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-1 px-2">
              {meetingActivity.slice(-14).map((item, index) => {
                const maxMeetings = Math.max(...meetingActivity.map(d => d.meetings));
                const height = maxMeetings > 0 ? (item.meetings / maxMeetings) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t transition-all hover:from-orange-500 hover:to-orange-300"
                      style={{ height: height + '%', minHeight: '4px' }}
                      title={item.date + ': ' + item.meetings + ' meetings'}
                    />
                    {index % 2 === 0 && (
                      <span className="text-[10px] text-slate-500 truncate w-full text-center">
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Revenue Metrics</h3>
          <span className="text-xs text-slate-400">{dateRangeLabels[dateRange]}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-400 mb-1">Monthly Recurring Revenue</p>
            <p className="text-2xl font-bold text-white">
              {revenue ? formatCurrency(revenue.mrr) : '---'}
            </p>
            {revenue && (
              <p className={'text-sm ' + getGrowthColor(revenue.mrrGrowth)}>
                {formatPercent(revenue.mrrGrowth)} vs last period
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Annual Recurring Revenue</p>
            <p className="text-2xl font-bold text-white">
              {revenue ? formatCurrency(revenue.arr) : '---'}
            </p>
            {revenue && (
              <p className={'text-sm ' + getGrowthColor(revenue.arrGrowth)}>
                {formatPercent(revenue.arrGrowth)} vs last period
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">ARPU</p>
            <p className="text-2xl font-bold text-white">
              {revenue ? formatCurrency(revenue.arpu) : '---'}
            </p>
            <p className="text-sm text-slate-400">Average Revenue Per User</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Churn Rate</p>
            <p className="text-2xl font-bold text-white">
              {revenue ? revenue.churnRate.toFixed(1) + '%' : '---'}
            </p>
            <p className="text-sm text-slate-400">Monthly churn</p>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        {revenueData.length > 0 && (
          <div className="mt-8">
            <p className="text-sm text-slate-400 mb-4">Revenue Trend</p>
            <div className="h-48 flex items-end justify-between gap-1 px-2">
              {revenueData.slice(-12).map((item, index) => {
                const maxMrr = Math.max(...revenueData.map(d => d.mrr));
                const height = maxMrr > 0 ? (item.mrr / maxMrr) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all hover:from-green-500 hover:to-green-300"
                      style={{ height: height + '%', minHeight: '4px' }}
                      title={item.date + ': ' + formatCurrency(item.mrr)}
                    />
                    <span className="text-[10px] text-slate-500 truncate w-full text-center">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Engagement & Feature Usage Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Metrics */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-6">Engagement Metrics</h3>
          {engagement ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-slate-900/50">
                  <p className="text-2xl font-bold text-white">{formatNumber(engagement.dau)}</p>
                  <p className="text-xs text-slate-400 mt-1">DAU</p>
                  <p className="text-xs text-blue-400">{engagement.dauPercent.toFixed(1)}% of total</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-slate-900/50">
                  <p className="text-2xl font-bold text-white">{formatNumber(engagement.wau)}</p>
                  <p className="text-xs text-slate-400 mt-1">WAU</p>
                  <p className="text-xs text-purple-400">{engagement.wauPercent.toFixed(1)}% of total</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-slate-900/50">
                  <p className="text-2xl font-bold text-white">{formatNumber(engagement.mau)}</p>
                  <p className="text-xs text-slate-400 mt-1">MAU</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">DAU/MAU Ratio</span>
                  <span className="text-lg font-semibold text-green-400">
                    {(engagement.dauMauRatio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Avg Session Duration</span>
                  <span className="text-lg font-semibold text-white">
                    {Math.round(engagement.avgSessionDuration / 60)}m {engagement.avgSessionDuration % 60}s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Sessions per User (Daily)</span>
                  <span className="text-lg font-semibold text-white">
                    {engagement.avgSessionsPerUser.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No engagement data available</p>
            </div>
          )}
        </div>

        {/* Feature Usage */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-6">Feature Usage Breakdown</h3>
          {featureUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No feature usage data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {featureUsage.map((feature, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{feature.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {formatNumber(feature.uniqueUsers)} users
                      </span>
                      <span className="text-sm font-medium text-white">
                        {feature.percentOfUsers.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                      style={{ width: feature.percentOfUsers + '%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Retention Cohorts */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-6">Retention Cohorts</h3>
        {retentionCohorts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400">No retention data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Cohort</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Users</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Week 1</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Week 2</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Week 3</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Week 4</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Week 8</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Week 12</th>
                </tr>
              </thead>
              <tbody>
                {retentionCohorts.map((cohort, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-white">{cohort.cohort}</td>
                    <td className="py-3 px-4 text-center text-sm text-slate-300">{formatNumber(cohort.totalUsers)}</td>
                    {[cohort.week1, cohort.week2, cohort.week3, cohort.week4, cohort.week8, cohort.week12].map((value, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        <span
                          className={'inline-block px-2 py-1 rounded text-xs font-medium ' + getRetentionColor(value) + ' bg-opacity-20 text-white'}
                          style={{ backgroundColor: getRetentionColor(value) + '33' }}
                        >
                          {value.toFixed(0)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Geographic Distribution & Top Organizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Distribution */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-6">Geographic Distribution</h3>
          {geoDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No geographic data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {geoDistribution.slice(0, 10).map((geo, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-8 text-center text-lg">
                    {getCountryFlag(geo.countryCode)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{geo.country}</span>
                      <span className="text-sm text-white font-medium">
                        {formatNumber(geo.users)} ({geo.percentOfTotal.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                        style={{ width: geo.percentOfTotal + '%' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Organizations by Usage */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Top Organizations</h3>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          {topOrganizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No organization data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topOrganizations.slice(0, 8).map((org, index) => (
                <div
                  key={org.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{org.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={'px-1.5 py-0.5 rounded text-[10px] font-medium ' + getTierColor(org.tier)}>
                        {org.tier}
                      </span>
                      <span className="text-xs text-slate-400">
                        {org.users} users
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatNumber(org.meetings)}</p>
                    <p className="text-xs text-slate-400">meetings</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-400">{formatCurrency(org.revenue)}</p>
                    <p className="text-xs text-slate-400">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
