'use client';

import { useState } from 'react';
import { Shield, Activity, TrendingUp, Clock, AlertTriangle, Settings, BarChart3, HardDrive, Mic } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { UsageGauge } from '@/components/rate-limits/UsageGauge';
import { UsageHistory } from '@/components/rate-limits/UsageHistory';
import { LimitConfiguration } from '@/components/rate-limits/LimitConfiguration';
import { AlertThresholds } from '@/components/rate-limits/AlertThresholds';
import { OverageWarning } from '@/components/rate-limits/OverageWarning';
import { useRateLimits, useUpgradeRecommendation } from '@/hooks/useRateLimits';

export default function RateLimitsPage() {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [perUserEnabled, setPerUserEnabled] = useState(true);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'configuration' | 'alerts'>('overview');

  // Use the rate limits hook
  const {
    data,
    history,
    isLoading,
    isRefreshing,
    percentages,
    alerts,
    resetTimes,
    refresh
  } = useRateLimits({ enableAutoRefresh: true });

  const { shouldUpgrade, criticalResources, recommendedPlan } = useUpgradeRecommendation();

  const currentUsage = {
    requests: 45234,
    limit: 100000,
    percentage: 45,
    resetIn: '14h 23m'
  };

  const endpoints = [
    { path: '/api/meetings', requests: 12453, limit: 50000, status: 'healthy' },
    { path: '/api/transcriptions', requests: 8932, limit: 30000, status: 'healthy' },
    { path: '/api/uploads', requests: 23849, limit: 25000, status: 'warning' },
    { path: '/api/users', requests: 567, limit: 10000, status: 'healthy' },
  ];

  const recentBlocks = [
    { ip: '192.168.1.100', reason: 'Rate limit exceeded', endpoint: '/api/uploads', time: '2 minutes ago' },
    { ip: '10.0.0.45', reason: 'Suspicious activity', endpoint: '/api/meetings', time: '15 minutes ago' },
  ];

  // Generate overage alerts based on current data
  const overageAlerts = criticalResources.map(resource => ({
    type: resource as 'apiCalls' | 'storage' | 'transcription',
    current: data?.[resource === 'apiCalls' ? 'apiCalls' : resource === 'storage' ? 'storage' : 'transcription']?.current || 0,
    limit: data?.[resource === 'apiCalls' ? 'apiCalls' : resource === 'storage' ? 'storage' : 'transcription']?.limit || 0,
    percentage: percentages[resource as keyof typeof percentages],
    severity: alerts[resource as keyof typeof alerts] as 'warning' | 'critical' | 'exceeded',
    resetIn: resource === 'storage' ? undefined : resetTimes[resource === 'apiCalls' ? 'apiCalls' : 'transcription'],
  }));

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-teal-400" />
            <h1 className="text-3xl font-bold text-white">Rate Limits</h1>
          </div>
          <p className="text-slate-400">Monitor and configure API rate limits and security settings</p>
        </div>

        {/* Overage Warning if needed */}
        {shouldUpgrade && (
          <div className="mb-6">
            <OverageWarning
              alerts={overageAlerts}
              currentPlan="Free"
              recommendedPlan={recommendedPlan}
              onUpgrade={() => console.log('Upgrade clicked')}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-8 p-1 rounded-xl bg-slate-800/30 border border-white/10 inline-flex">
          <Button
            variant={selectedTab === 'overview' ? 'gradient-primary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('overview')}
            className="px-4 py-2"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={selectedTab === 'configuration' ? 'gradient-primary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('configuration')}
            className="px-4 py-2"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuration
          </Button>
          <Button
            variant={selectedTab === 'alerts' ? 'gradient-primary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('alerts')}
            className="px-4 py-2"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
          </Button>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Usage Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <CardGlass variant="default" hover>
                <div className="p-6">
                  <UsageGauge
                    label="API Calls"
                    current={data?.apiCalls?.current || 0}
                    limit={data?.apiCalls?.limit || 10000}
                    unit="calls/hour"
                    size="md"
                    showPercentage
                    colorScheme={alerts.apiCalls === 'exceeded' ? 'danger' : alerts.apiCalls === 'critical' ? 'danger' : alerts.apiCalls === 'warning' ? 'warning' : 'default'}
                  />
                  {resetTimes.apiCalls && (
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        Resets in {resetTimes.apiCalls}
                      </div>
                    </div>
                  )}
                </div>
              </CardGlass>

              <CardGlass variant="default" hover>
                <div className="p-6">
                  <UsageGauge
                    label="Storage"
                    current={data?.storage?.current || 0}
                    limit={data?.storage?.limit || 5120}
                    unit="MB"
                    size="md"
                    showPercentage
                    colorScheme={alerts.storage === 'exceeded' ? 'danger' : alerts.storage === 'critical' ? 'danger' : alerts.storage === 'warning' ? 'warning' : 'default'}
                  />
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                      <HardDrive className="w-4 h-4" />
                      {((data?.storage?.limit || 5120) - (data?.storage?.current || 0)) / 1024} GB available
                    </div>
                  </div>
                </div>
              </CardGlass>

              <CardGlass variant="default" hover>
                <div className="p-6">
                  <UsageGauge
                    label="Transcription"
                    current={data?.transcription?.current || 0}
                    limit={data?.transcription?.limit || 500}
                    unit="minutes"
                    size="md"
                    showPercentage
                    colorScheme={alerts.transcription === 'exceeded' ? 'danger' : alerts.transcription === 'critical' ? 'danger' : alerts.transcription === 'warning' ? 'warning' : 'default'}
                  />
                  {resetTimes.transcription && (
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                        <Mic className="w-4 h-4" />
                        Resets in {resetTimes.transcription}
                      </div>
                    </div>
                  )}
                </div>
              </CardGlass>
            </div>

            {/* Usage History Chart */}
            <div className="mb-8">
              <UsageHistory
                period="day"
                chartType="area"
                showLegend
                height={350}
              />
            </div>


            {/* Endpoint Usage */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <CardGlass variant="default" hover>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                      <h2 className="text-xl font-semibold text-white">Endpoint Usage</h2>
                    </div>
                    <Button
                      variant="ghost-glass"
                      size="sm"
                      onClick={refresh}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {endpoints.map((endpoint, idx) => {
                      const percentage = (endpoint.requests / endpoint.limit) * 100;
                      const statusColor =
                        endpoint.status === 'healthy' ? 'text-green-400' :
                        endpoint.status === 'warning' ? 'text-amber-400' :
                        'text-rose-400';

                      return (
                        <div key={idx} className="p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <code className="text-sm font-mono text-teal-300">{endpoint.path}</code>
                              <div className="text-xs text-slate-500 mt-1">
                                {endpoint.requests.toLocaleString()} / {endpoint.limit.toLocaleString()} requests
                              </div>
                            </div>
                            <Badge className={
                              endpoint.status === 'healthy' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                              endpoint.status === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }>
                              {endpoint.status}
                            </Badge>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percentage < 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                percentage < 90 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                                'bg-gradient-to-r from-rose-500 to-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>{percentage.toFixed(1)}% used</span>
                            <span>{endpoint.limit - endpoint.requests} remaining</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardGlass>
              </div>

              <div className="space-y-6">
                <CardGlass variant="default" hover>
                  <div className="flex items-center gap-2 mb-6">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <h2 className="text-xl font-semibold text-white">Recent Blocks</h2>
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">
                      {recentBlocks.length}
                    </Badge>
                  </div>

                  {recentBlocks.length > 0 ? (
                    <div className="space-y-3">
                      {recentBlocks.map((block, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <code className="text-sm font-mono text-rose-300">{block.ip}</code>
                              <div className="text-xs text-slate-400 mt-1">{block.endpoint}</div>
                            </div>
                            <span className="text-xs text-slate-500">{block.time}</span>
                          </div>
                          <div className="text-sm text-slate-300">{block.reason}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No blocked requests in the last hour</p>
                    </div>
                  )}
                </CardGlass>
              </div>
            </div>
          </>
        )}

        {/* Configuration Tab */}
        {selectedTab === 'configuration' && (
          <LimitConfiguration
            onSave={(config) => {
              console.log('Configuration saved:', config);
            }}
          />
        )}

        {/* Alerts Tab */}
        {selectedTab === 'alerts' && (
          <AlertThresholds
            onUpdate={(thresholds) => {
              console.log('Alert thresholds updated:', thresholds);
            }}
          />
        )}
      </div>
    </div>
  );
}
