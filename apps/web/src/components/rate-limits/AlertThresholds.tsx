/**
 * AlertThresholds Component
 * Configure alert thresholds for rate limit monitoring
 */

'use client';

import React, { useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, Mail, MessageSquare, Webhook } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface AlertThreshold {
  id: string;
  name: string;
  percentage: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  channels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    inApp: boolean;
  };
  message?: string;
}

export interface AlertThresholdsProps {
  thresholds?: AlertThreshold[];
  onUpdate?: (thresholds: AlertThreshold[]) => void;
  className?: string;
}

const defaultThresholds: AlertThreshold[] = [
  {
    id: 'info',
    name: 'Information',
    percentage: 50,
    severity: 'info',
    enabled: true,
    channels: {
      email: false,
      slack: false,
      webhook: false,
      inApp: true,
    },
    message: 'You have used 50% of your rate limits',
  },
  {
    id: 'warning',
    name: 'Warning',
    percentage: 80,
    severity: 'warning',
    enabled: true,
    channels: {
      email: true,
      slack: false,
      webhook: false,
      inApp: true,
    },
    message: 'Warning: You have used 80% of your rate limits',
  },
  {
    id: 'critical',
    name: 'Critical',
    percentage: 90,
    severity: 'critical',
    enabled: true,
    channels: {
      email: true,
      slack: true,
      webhook: true,
      inApp: true,
    },
    message: 'Critical: You have used 90% of your rate limits',
  },
  {
    id: 'exceeded',
    name: 'Limit Exceeded',
    percentage: 100,
    severity: 'critical',
    enabled: true,
    channels: {
      email: true,
      slack: true,
      webhook: true,
      inApp: true,
    },
    message: 'Your rate limit has been exceeded',
  },
];

export function AlertThresholds({
  thresholds = defaultThresholds,
  onUpdate,
  className,
}: AlertThresholdsProps) {
  const [alerts, setAlerts] = useState<AlertThreshold[]>(thresholds);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const handleThresholdChange = (id: string, field: keyof AlertThreshold, value: any) => {
    const updated = alerts.map(alert => {
      if (alert.id === id) {
        return { ...alert, [field]: value };
      }
      return alert;
    });
    setAlerts(updated);
    onUpdate?.(updated);
  };

  const handleChannelChange = (id: string, channel: keyof AlertThreshold['channels'], value: boolean) => {
    const updated = alerts.map(alert => {
      if (alert.id === id) {
        return {
          ...alert,
          channels: {
            ...alert.channels,
            [channel]: value,
          },
        };
      }
      return alert;
    });
    setAlerts(updated);
    onUpdate?.(updated);
  };

  const getSeverityIcon = (severity: AlertThreshold['severity']) => {
    switch (severity) {
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: AlertThreshold['severity']) => {
    switch (severity) {
      case 'info':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'warning':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'critical':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'from-rose-500 to-red-500';
    if (percentage >= 80) return 'from-amber-500 to-orange-500';
    if (percentage >= 50) return 'from-cyan-500 to-blue-500';
    return 'from-teal-500 to-emerald-500';
  };

  return (
    <CardGlass variant="default" hover className={className}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-semibold text-white">Alert Thresholds</h3>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            {alerts.filter(a => a.enabled).length} Active
          </Badge>
        </div>

        <div className="space-y-4">
          {alerts.map((alert) => {
            const isExpanded = expandedAlert === alert.id;

            return (
              <div
                key={alert.id}
                className={cn(
                  'rounded-xl border transition-all',
                  alert.enabled
                    ? `${getSeverityColor(alert.severity)} bg-opacity-50`
                    : 'bg-slate-800/30 border-white/5'
                )}
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        alert.enabled ? getSeverityColor(alert.severity) : 'bg-slate-800 text-slate-500'
                      )}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white">{alert.name}</h4>
                          <Badge className={cn(
                            'text-xs',
                            alert.enabled
                              ? getSeverityColor(alert.severity)
                              : 'bg-slate-700/50 text-slate-400 border-slate-600'
                          )}>
                            {alert.percentage}%
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {alert.message || `Alert at ${alert.percentage}% usage`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Channel indicators */}
                      <div className="flex items-center gap-2">
                        {alert.channels.email && (
                          <Mail className="w-4 h-4 text-slate-400" />
                        )}
                        {alert.channels.slack && (
                          <MessageSquare className="w-4 h-4 text-slate-400" />
                        )}
                        {alert.channels.webhook && (
                          <Webhook className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={(checked) => handleThresholdChange(alert.id, 'enabled', checked)}
                        className={cn(
                          'data-[state=checked]:bg-teal-500',
                          alert.severity === 'warning' && 'data-[state=checked]:bg-amber-500',
                          alert.severity === 'critical' && 'data-[state=checked]:bg-rose-500'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full bg-gradient-to-r transition-all',
                          getProgressColor(alert.percentage)
                        )}
                        style={{ width: `${alert.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/10">
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Threshold Percentage
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={alert.percentage}
                          onChange={(e) => handleThresholdChange(alert.id, 'percentage', parseInt(e.target.value))}
                          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:cursor-pointer"
                          disabled={!alert.enabled}
                        />
                        <span className="text-sm font-medium text-white w-12 text-right">
                          {alert.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Notification Channels
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alert.channels.inApp}
                            onChange={(e) => handleChannelChange(alert.id, 'inApp', e.target.checked)}
                            disabled={!alert.enabled}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500
                              focus:ring-teal-500/50 focus:ring-offset-0 disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-300">In-App</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alert.channels.email}
                            onChange={(e) => handleChannelChange(alert.id, 'email', e.target.checked)}
                            disabled={!alert.enabled}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500
                              focus:ring-teal-500/50 focus:ring-offset-0 disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-300">Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alert.channels.slack}
                            onChange={(e) => handleChannelChange(alert.id, 'slack', e.target.checked)}
                            disabled={!alert.enabled}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500
                              focus:ring-teal-500/50 focus:ring-offset-0 disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-300">Slack</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alert.channels.webhook}
                            onChange={(e) => handleChannelChange(alert.id, 'webhook', e.target.checked)}
                            disabled={!alert.enabled}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500
                              focus:ring-teal-500/50 focus:ring-offset-0 disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-300">Webhook</span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Custom Message
                      </label>
                      <input
                        type="text"
                        value={alert.message || ''}
                        onChange={(e) => handleThresholdChange(alert.id, 'message', e.target.value)}
                        placeholder={`Alert at ${alert.percentage}% usage`}
                        disabled={!alert.enabled}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10
                          text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50
                          focus:border-teal-500/50 outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <Button variant="gradient-primary" size="default" className="w-full">
            Save Alert Settings
          </Button>
        </div>
      </div>
    </CardGlass>
  );
}