/**
 * OverageWarning Component
 * Display overage alerts and upgrade CTAs when approaching/exceeding limits
 */

'use client';

import React from 'react';
import { AlertTriangle, TrendingUp, Zap, ArrowRight, X } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface OverageAlert {
  type: 'apiCalls' | 'storage' | 'transcription';
  current: number;
  limit: number;
  percentage: number;
  severity: 'warning' | 'critical' | 'exceeded';
  resetIn?: string;
  overage?: number;
}

export interface OverageWarningProps {
  alerts?: OverageAlert[];
  currentPlan?: string;
  recommendedPlan?: {
    name: string;
    price: number;
    benefits: string[];
  };
  onUpgrade?: () => void;
  onDismiss?: (alertType: string) => void;
  className?: string;
  compact?: boolean;
}

export function OverageWarning({
  alerts = [],
  currentPlan = 'Free',
  recommendedPlan,
  onUpgrade,
  onDismiss,
  className,
  compact = false,
}: OverageWarningProps) {
  if (alerts.length === 0) return null;

  const getAlertColor = (severity: OverageAlert['severity']) => {
    switch (severity) {
      case 'warning':
        return 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5';
      case 'critical':
        return 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5';
      case 'exceeded':
        return 'border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-rose-500/5';
      default:
        return 'border-white/10 bg-slate-800/30';
    }
  };

  const getAlertTextColor = (severity: OverageAlert['severity']) => {
    switch (severity) {
      case 'warning':
        return 'text-amber-400';
      case 'critical':
        return 'text-orange-400';
      case 'exceeded':
        return 'text-rose-400';
      default:
        return 'text-slate-400';
    }
  };

  const getAlertTitle = (severity: OverageAlert['severity']) => {
    switch (severity) {
      case 'warning':
        return 'Approaching Limit';
      case 'critical':
        return 'Critical Usage';
      case 'exceeded':
        return 'Limit Exceeded';
      default:
        return 'Usage Alert';
    }
  };

  const getResourceName = (type: OverageAlert['type']) => {
    switch (type) {
      case 'apiCalls':
        return 'API Calls';
      case 'storage':
        return 'Storage';
      case 'transcription':
        return 'Transcription Minutes';
      default:
        return 'Resource';
    }
  };

  const formatValue = (value: number, type: OverageAlert['type']) => {
    if (type === 'storage') {
      return `${(value / 1024).toFixed(1)} GB`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const mostSevereAlert = alerts.reduce((prev, current) => {
    const severityOrder = { warning: 1, critical: 2, exceeded: 3 };
    return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
  });

  if (compact) {
    return (
      <div className={cn(
        'rounded-xl p-4 animate-fade-in',
        getAlertColor(mostSevereAlert.severity),
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-black/20', getAlertTextColor(mostSevereAlert.severity))}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                {getAlertTitle(mostSevereAlert.severity)}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {alerts.length} resource{alerts.length > 1 ? 's' : ''} at risk
              </p>
            </div>
          </div>
          {onUpgrade && (
            <Button
              variant="gradient-primary"
              size="sm"
              onClick={onUpgrade}
              className="px-4"
            >
              Upgrade
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <CardGlass
      variant="default"
      className={cn(
        'animate-fade-in',
        getAlertColor(mostSevereAlert.severity),
        className
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-black/20', getAlertTextColor(mostSevereAlert.severity))}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {getAlertTitle(mostSevereAlert.severity)}
              </h3>
              <p className="text-sm text-slate-400">
                Current plan: <span className="text-white font-medium">{currentPlan}</span>
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={() => onDismiss('all')}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Alert details */}
        <div className="space-y-3 mb-6">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-black/20 border border-white/5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {getResourceName(alert.type)}
                  </span>
                  <Badge className={cn(
                    'text-xs',
                    alert.severity === 'warning' && 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    alert.severity === 'critical' && 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                    alert.severity === 'exceeded' && 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  )}>
                    {alert.percentage}%
                  </Badge>
                </div>
                {alert.resetIn && (
                  <span className="text-xs text-slate-500">
                    Resets in {alert.resetIn}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        alert.severity === 'warning' && 'bg-gradient-to-r from-amber-500 to-orange-500',
                        alert.severity === 'critical' && 'bg-gradient-to-r from-orange-500 to-red-500',
                        alert.severity === 'exceeded' && 'bg-gradient-to-r from-rose-500 to-red-600'
                      )}
                      style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-400">
                      {formatValue(alert.current, alert.type)} used
                    </span>
                    <span className="text-slate-500">
                      of {formatValue(alert.limit, alert.type)}
                    </span>
                  </div>
                </div>
              </div>

              {alert.overage && alert.overage > 0 && (
                <div className="mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/30">
                  <p className="text-xs text-rose-300">
                    Overage: {formatValue(alert.overage, alert.type)} beyond limit
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recommended upgrade */}
        {recommendedPlan && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-teal-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Recommended: {recommendedPlan.name} Plan
                  </h4>
                </div>
                <p className="text-sm text-teal-300">
                  ${recommendedPlan.price}/month
                </p>
              </div>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">
                Save 20%
              </Badge>
            </div>

            <ul className="space-y-1 mb-4">
              {recommendedPlan.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1 h-1 rounded-full bg-teal-400" />
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <Button
                variant="gradient-primary"
                size="sm"
                onClick={onUpgrade}
                className="flex-1"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
              <Button
                variant="ghost-glass"
                size="sm"
                className="px-4"
              >
                Compare Plans
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!recommendedPlan && (
          <div className="flex gap-3">
            <Button
              variant="gradient-primary"
              size="default"
              onClick={onUpgrade}
              className="flex-1"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
            <Button
              variant="ghost-glass"
              size="default"
              className="px-6"
            >
              View Usage Details
            </Button>
          </div>
        )}
      </div>
    </CardGlass>
  );
}