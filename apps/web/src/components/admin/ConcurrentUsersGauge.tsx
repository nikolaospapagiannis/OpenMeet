/**
 * Concurrent Users Gauge Component
 * Real-time concurrent users visualization with WebSocket connection
 *
 * Features:
 * - Real-time updates via WebSocket
 * - Animated gauge visualization
 * - Organization breakdown for super admins
 * - Connection status indicator
 * - Historical trend mini-chart
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users,
  Activity,
  Building2,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useConcurrentUsersSocket, type ConnectionState } from '@/hooks/useAdminWebSocket';
import { cn } from '@/lib/utils';

interface ConcurrentUsersData {
  type: 'global' | 'organization';
  totalUsers?: number;
  organizationId?: string;
  count?: number;
  byOrganization?: Array<{
    organizationId: string;
    organizationName?: string;
    count: number;
  }>;
  serverCount?: number;
  timestamp: string;
}

interface HistoricalDataPoint {
  timestamp: number;
  count: number;
}

interface ConcurrentUsersGaugeProps {
  authToken?: string;
  maxCapacity?: number;
  showOrganizations?: boolean;
  showTrend?: boolean;
  className?: string;
}

const CONNECTION_STATUS_CONFIG: Record<ConnectionState, {
  label: string;
  color: string;
  icon: typeof Wifi;
}> = {
  connected: { label: 'Live', color: 'text-green-400', icon: Wifi },
  connecting: { label: 'Connecting...', color: 'text-yellow-400', icon: RefreshCw },
  reconnecting: { label: 'Reconnecting...', color: 'text-yellow-400', icon: RefreshCw },
  disconnected: { label: 'Disconnected', color: 'text-slate-400', icon: WifiOff },
  error: { label: 'Error', color: 'text-red-400', icon: WifiOff },
};

export function ConcurrentUsersGauge({
  authToken,
  maxCapacity = 10000,
  showOrganizations = true,
  showTrend = true,
  className,
}: ConcurrentUsersGaugeProps) {
  const [currentData, setCurrentData] = useState<ConcurrentUsersData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [showOrgBreakdown, setShowOrgBreakdown] = useState(false);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const previousCountRef = useRef<number | null>(null);

  const {
    connectionState,
    isConnected,
    on,
    off,
    emit,
    error,
    reconnectAttempts,
  } = useConcurrentUsersSocket(authToken);

  // Handle incoming data
  const handleDataUpdate = useCallback((data: unknown) => {
    const typedData = data as ConcurrentUsersData;
    setCurrentData(typedData);

    // Update historical data (keep last 30 data points for trend)
    const currentCount = typedData.totalUsers ?? typedData.count ?? 0;
    setHistoricalData((prev) => {
      const newData = [...prev, { timestamp: Date.now(), count: currentCount }];
      return newData.slice(-30);
    });

    // Calculate trend
    if (previousCountRef.current !== null) {
      if (currentCount > previousCountRef.current) {
        setTrend('up');
      } else if (currentCount < previousCountRef.current) {
        setTrend('down');
      } else {
        setTrend('stable');
      }
    }
    previousCountRef.current = currentCount;
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Listen for initial data
    on('concurrent-users:init', handleDataUpdate);
    on('concurrent-users:update', handleDataUpdate);
    on('concurrent-users:global', handleDataUpdate);

    // Request current stats
    emit('concurrent-users:get');

    return () => {
      off('concurrent-users:init');
      off('concurrent-users:update');
      off('concurrent-users:global');
    };
  }, [isConnected, on, off, emit, handleDataUpdate]);

  // Calculate gauge percentage
  const currentCount = currentData?.totalUsers ?? currentData?.count ?? 0;
  const gaugePercentage = Math.min((currentCount / maxCapacity) * 100, 100);

  // Calculate gauge color based on capacity
  const getGaugeColor = (percentage: number): string => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 70) return 'from-yellow-500 to-orange-500';
    if (percentage >= 50) return 'from-blue-500 to-blue-600';
    return 'from-green-500 to-green-600';
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Calculate trend line data
  const trendLinePoints = historicalData.length > 1
    ? historicalData.map((point, index) => {
        const x = (index / (historicalData.length - 1)) * 100;
        const maxCount = Math.max(...historicalData.map(p => p.count), 1);
        const y = 100 - ((point.count / maxCount) * 80 + 10); // 10-90 range
        return `${x},${y}`;
      }).join(' ')
    : '';

  const statusConfig = CONNECTION_STATUS_CONFIG[connectionState];
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn('p-6 rounded-xl bg-slate-800/50 border border-white/5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Concurrent Users</h3>
            <p className="text-sm text-slate-400">
              {currentData?.type === 'global' ? 'Platform-wide' : 'Organization'}
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
          connectionState === 'connected' ? 'bg-green-500/20' : 'bg-slate-700/50'
        )}>
          <StatusIcon className={cn('h-3.5 w-3.5', statusConfig.color, {
            'animate-spin': connectionState === 'connecting' || connectionState === 'reconnecting',
          })} />
          <span className={statusConfig.color}>{statusConfig.label}</span>
          {reconnectAttempts > 0 && (
            <span className="text-slate-500">({reconnectAttempts})</span>
          )}
        </div>
      </div>

      {/* Main Gauge */}
      <div className="relative flex flex-col items-center mb-6">
        {/* Circular Gauge Background */}
        <div className="relative w-48 h-24 overflow-hidden">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              className="text-slate-700"
              strokeLinecap="round"
            />
            {/* Filled arc */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${gaugePercentage * 2.83} 283`}
              className="transition-all duration-500"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={`stop-color-start ${getGaugeColor(gaugePercentage).split(' ')[0].replace('from-', '')}`} />
                <stop offset="100%" className={`stop-color-end ${getGaugeColor(gaugePercentage).split(' ')[1].replace('to-', '')}`} />
              </linearGradient>
            </defs>
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold text-white">
                {formatNumber(currentCount)}
              </span>
              {trend !== 'stable' && (
                <span className={cn('flex items-center', {
                  'text-green-400': trend === 'up',
                  'text-red-400': trend === 'down',
                })}>
                  {trend === 'up' ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Capacity label */}
        <div className="text-center mt-2">
          <p className="text-sm text-slate-400">
            of {formatNumber(maxCapacity)} capacity ({gaugePercentage.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Trend Mini Chart */}
      {showTrend && historicalData.length > 1 && (
        <div className="mb-6">
          <p className="text-xs text-slate-400 mb-2">Recent trend</p>
          <svg viewBox="0 0 100 40" className="w-full h-10" preserveAspectRatio="none">
            <polyline
              points={trendLinePoints}
              fill="none"
              stroke="url(#trendGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Server Stats */}
      {currentData?.type === 'global' && currentData.serverCount && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">Servers</span>
            </div>
            <p className="text-lg font-semibold text-white">{currentData.serverCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Organizations</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {currentData.byOrganization?.length ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Organization Breakdown */}
      {showOrganizations && currentData?.type === 'global' && currentData.byOrganization && (
        <div>
          <button
            onClick={() => setShowOrgBreakdown(!showOrgBreakdown)}
            className="flex items-center justify-between w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <span>Organization Breakdown</span>
            {showOrgBreakdown ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showOrgBreakdown && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {currentData.byOrganization
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map((org, index) => (
                  <div
                    key={org.organizationId}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 w-5">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-slate-300 truncate max-w-[150px]">
                        {org.organizationName || org.organizationId.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                          style={{
                            width: `${Math.min((org.count / currentCount) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white w-12 text-right">
                        {formatNumber(org.count)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {/* Timestamp */}
      {currentData?.timestamp && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-slate-500 text-center">
            Last updated: {new Date(currentData.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default ConcurrentUsersGauge;
