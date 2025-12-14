/**
 * UsageMetrics Component
 * Displays usage statistics with progress bars and usage history
 */

'use client';

import { Activity, Database, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Usage } from '@/hooks/useSubscription';

interface UsageMetricsProps {
  usage: Usage | null;
  loading: boolean;
}

export function UsageMetrics({ usage, loading }: UsageMetricsProps) {
  const formatBytes = (mb: number) => {
    if (mb < 1024) return `${mb.toFixed(0)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0 || limit === Infinity) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-teal-500';
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 90)
      return { label: 'Critical', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
    if (percentage >= 75)
      return { label: 'High', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    if (percentage >= 50)
      return { label: 'Moderate', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    return { label: 'Low', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
  };

  if (loading) {
    return (
      <CardGlass variant="default" className="animate-pulse">
        <div className="h-96 bg-slate-800/30 rounded-xl" />
      </CardGlass>
    );
  }

  if (!usage) {
    return (
      <CardGlass variant="default">
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No usage data available</p>
        </div>
      </CardGlass>
    );
  }

  const meetingsPercentage = getUsagePercentage(usage.meetingsRecorded, usage.meetingsLimit);
  const storagePercentage = getUsagePercentage(usage.storageUsedMB, usage.storageLimitMB);
  const aiMinutesPercentage = getUsagePercentage(usage.aiMinutesUsed, usage.aiMinutesLimit);

  const usageItems = [
    {
      icon: Activity,
      label: 'Meetings Recorded',
      used: usage.meetingsRecorded,
      limit: usage.meetingsLimit,
      unit: 'meetings',
      percentage: meetingsPercentage,
      color: getUsageColor(meetingsPercentage),
    },
    {
      icon: Database,
      label: 'Storage Used',
      used: usage.storageUsedMB,
      limit: usage.storageLimitMB,
      unit: 'storage',
      percentage: storagePercentage,
      color: getUsageColor(storagePercentage),
      formatter: formatBytes,
    },
    {
      icon: Clock,
      label: 'AI Minutes Used',
      used: usage.aiMinutesUsed,
      limit: usage.aiMinutesLimit,
      unit: 'minutes',
      percentage: aiMinutesPercentage,
      color: getUsageColor(aiMinutesPercentage),
    },
  ];

  const overallUsage = (meetingsPercentage + storagePercentage + aiMinutesPercentage) / 3;
  const overallStatus = getUsageStatus(overallUsage);

  return (
    <CardGlass variant="default">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-white">Usage Metrics</h2>
            <Badge className={overallStatus.color}>{overallStatus.label}</Badge>
          </div>
          <p className="text-sm text-slate-400">
            Billing period: {formatDate(usage.periodStart)} - {formatDate(usage.periodEnd)}
          </p>
        </div>
        <TrendingUp className="w-6 h-6 text-teal-400" />
      </div>

      {/* Usage items */}
      <div className="space-y-6">
        {usageItems.map((item, index) => {
          const Icon = item.icon;
          const formattedUsed = item.formatter ? item.formatter(item.used) : item.used;
          const formattedLimit =
            item.limit === Infinity
              ? 'Unlimited'
              : item.formatter
              ? item.formatter(item.limit)
              : item.limit;

          const isOverLimit = item.used > item.limit && item.limit !== Infinity;

          return (
            <div key={index} className="space-y-3">
              {/* Label and values */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {formattedUsed}
                  </span>
                  <span className="text-sm text-slate-500">/</span>
                  <span className="text-sm text-slate-400">{formattedLimit}</span>
                  {isOverLimit && (
                    <AlertTriangle className="w-4 h-4 text-red-400 ml-1" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative">
                <Progress value={item.percentage} className="h-2 bg-slate-800/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </Progress>
                {item.percentage > 0 && (
                  <div className="absolute -top-1 text-xs text-slate-400 right-0">
                    {item.percentage.toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Warning for high usage */}
              {item.percentage >= 90 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-red-300">
                    You're approaching your {item.label.toLowerCase()} limit. Consider
                    upgrading to avoid service interruption.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Usage summary */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-purple-500/10 border border-white/5">
          <div>
            <div className="text-sm font-medium text-white mb-1">Overall Usage</div>
            <div className="text-xs text-slate-400">
              Average usage across all resources
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{overallUsage.toFixed(0)}%</div>
            <div className="text-xs text-slate-400 mt-1">of total capacity</div>
          </div>
        </div>
      </div>

      {/* Tips */}
      {overallUsage > 75 && (
        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-300 mb-1">Usage Tip</div>
              <div className="text-xs text-blue-400/80">
                Your usage is higher than usual. Consider upgrading to a higher tier plan
                for better performance and additional features.
              </div>
            </div>
          </div>
        </div>
      )}
    </CardGlass>
  );
}
