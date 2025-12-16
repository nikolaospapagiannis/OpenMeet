/**
 * Geographic Distribution Map Component
 * Enterprise-grade geographic visualization with real-time updates
 *
 * Features:
 * - Interactive world map with country highlighting
 * - Heatmap visualization by user/meeting density
 * - Region breakdown with drill-down
 * - Real-time data refresh
 * - Multi-tenant organization support
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Globe,
  MapPin,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Geographic data types
interface CountryData {
  countryCode: string;
  countryName: string;
  userCount: number;
  meetingCount: number;
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
  regions?: RegionData[];
}

interface RegionData {
  regionCode: string;
  regionName: string;
  userCount: number;
  meetingCount: number;
}

interface GeoDistributionData {
  totalUsers: number;
  totalMeetings: number;
  countries: CountryData[];
  lastUpdated: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  label?: string;
}

interface GeoDistributionMapProps {
  authToken?: string;
  organizationId?: string;
  metric?: 'users' | 'meetings';
  refreshInterval?: number;
  showHeatmap?: boolean;
  showTopCountries?: number;
  className?: string;
}

// Country code to approximate center coordinates
const COUNTRY_CENTERS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.8, lng: -98.5 },
  GB: { lat: 54.0, lng: -2.0 },
  DE: { lat: 51.2, lng: 10.4 },
  FR: { lat: 46.2, lng: 2.2 },
  JP: { lat: 36.2, lng: 138.3 },
  AU: { lat: -25.3, lng: 133.8 },
  CA: { lat: 56.1, lng: -106.3 },
  BR: { lat: -14.2, lng: -51.9 },
  IN: { lat: 20.6, lng: 78.9 },
  CN: { lat: 35.9, lng: 104.2 },
  KR: { lat: 35.9, lng: 127.8 },
  MX: { lat: 23.6, lng: -102.5 },
  ES: { lat: 40.5, lng: -3.7 },
  IT: { lat: 41.9, lng: 12.6 },
  NL: { lat: 52.1, lng: 5.3 },
  SG: { lat: 1.4, lng: 103.8 },
  SE: { lat: 60.1, lng: 18.6 },
  CH: { lat: 46.8, lng: 8.2 },
  PL: { lat: 51.9, lng: 19.1 },
  AR: { lat: -38.4, lng: -63.6 },
};

// SVG world map paths (simplified for performance)
const WORLD_MAP_VIEWBOX = '0 0 1000 500';

export function GeoDistributionMap({
  authToken,
  organizationId,
  metric = 'users',
  refreshInterval = 60000,
  showHeatmap = true,
  showTopCountries = 10,
  className,
}: GeoDistributionMapProps) {
  const [data, setData] = useState<GeoDistributionData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch geographic distribution data
  const fetchGeoData = useCallback(async () => {
    try {
      setError(null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const params = new URLSearchParams();
      if (organizationId) {
        params.append('organizationId', organizationId);
      }
      params.append('metric', metric);

      const response = await fetch(
        `/api/admin/analytics/geo/distribution?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch geo data: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
      } else {
        throw new Error(result.error?.message || 'Failed to fetch data');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, organizationId, metric]);

  // Fetch heatmap data
  const fetchHeatmapData = useCallback(async () => {
    if (!showHeatmap) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const params = new URLSearchParams();
      if (organizationId) {
        params.append('organizationId', organizationId);
      }
      params.append('metric', metric);
      params.append('resolution', 'country');

      const response = await fetch(
        `/api/admin/analytics/geo/heatmap?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        return; // Heatmap is optional, don't throw
      }

      const result = await response.json();
      if (result.success && result.data?.points) {
        setHeatmapData(result.data.points);
      }
    } catch {
      // Heatmap fetch is optional, ignore errors
    }
  }, [authToken, organizationId, metric, showHeatmap]);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchGeoData();
    fetchHeatmapData();

    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchGeoData();
        fetchHeatmapData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [fetchGeoData, fetchHeatmapData, refreshInterval]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    fetchGeoData();
    fetchHeatmapData();
  }, [fetchGeoData, fetchHeatmapData]);

  // Calculate color intensity based on value
  const getIntensityColor = useCallback((percentage: number): string => {
    if (percentage >= 30) return 'fill-blue-500';
    if (percentage >= 20) return 'fill-blue-400';
    if (percentage >= 10) return 'fill-blue-300';
    if (percentage >= 5) return 'fill-blue-200';
    return 'fill-blue-100';
  }, []);

  // Get heatmap point color
  const getHeatmapColor = useCallback((intensity: number): string => {
    if (intensity >= 0.8) return 'bg-red-500';
    if (intensity >= 0.6) return 'bg-orange-500';
    if (intensity >= 0.4) return 'bg-yellow-500';
    if (intensity >= 0.2) return 'bg-green-400';
    return 'bg-green-200';
  }, []);

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Top countries for display
  const topCountries = useMemo(() => {
    if (!data?.countries) return [];
    const sorted = [...data.countries].sort((a, b) => {
      const aValue = metric === 'users' ? a.userCount : a.meetingCount;
      const bValue = metric === 'users' ? b.userCount : b.meetingCount;
      return bValue - aValue;
    });
    return showAllCountries ? sorted : sorted.slice(0, showTopCountries);
  }, [data, metric, showAllCountries, showTopCountries]);

  // Convert lat/lng to SVG coordinates
  const latLngToSvg = useCallback((lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 1000;
    const y = ((90 - lat) / 180) * 500;
    return { x, y };
  }, []);

  if (isLoading && !data) {
    return (
      <div className={cn('p-6 rounded-xl bg-slate-800/50 border border-white/5', className)}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          <span className="ml-3 text-slate-400">Loading geographic data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-6 rounded-xl bg-slate-800/50 border border-white/5', className)}>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-red-400">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-6 rounded-xl bg-slate-800/50 border border-white/5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Geographic Distribution</h3>
            <p className="text-sm text-slate-400">
              {metric === 'users' ? 'User' : 'Meeting'} distribution by country
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Metric Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-700/50 rounded-lg">
            <button
              type="button"
              onClick={() => setData(d => d ? { ...d } : d)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                metric === 'users'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => setData(d => d ? { ...d } : d)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                metric === 'meetings'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Meetings
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4 text-slate-400', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Map Visualization */}
      <div className="relative mb-6 bg-slate-900/50 rounded-lg overflow-hidden">
        <svg
          viewBox={WORLD_MAP_VIEWBOX}
          className="w-full h-64"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background */}
          <rect width="1000" height="500" fill="transparent" />

          {/* Grid lines */}
          {[...Array(7)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={i * 71.4}
              x2="1000"
              y2={i * 71.4}
              stroke="currentColor"
              strokeOpacity="0.1"
              className="text-slate-600"
            />
          ))}
          {[...Array(13)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 77}
              y1="0"
              x2={i * 77}
              y2="500"
              stroke="currentColor"
              strokeOpacity="0.1"
              className="text-slate-600"
            />
          ))}

          {/* Heatmap points */}
          {showHeatmap && heatmapData.map((point, index) => {
            const { x, y } = latLngToSvg(point.lat, point.lng);
            const radius = 10 + point.intensity * 30;
            return (
              <circle
                key={`heatmap-${index}`}
                cx={x}
                cy={y}
                r={radius}
                className={cn(
                  'transition-all duration-300',
                  point.intensity >= 0.7 ? 'fill-red-500' :
                  point.intensity >= 0.4 ? 'fill-orange-400' :
                  'fill-green-400'
                )}
                fillOpacity={0.3 + point.intensity * 0.4}
              />
            );
          })}

          {/* Country markers */}
          {data?.countries.map((country) => {
            const coords = COUNTRY_CENTERS[country.countryCode];
            if (!coords) return null;
            const { x, y } = latLngToSvg(coords.lat, coords.lng);
            const isSelected = selectedCountry === country.countryCode;
            const size = Math.max(8, Math.min(20, country.percentage * 2));

            return (
              <g
                key={country.countryCode}
                className="cursor-pointer"
                onClick={() => setSelectedCountry(
                  isSelected ? null : country.countryCode
                )}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  className={cn(
                    'transition-all duration-300',
                    isSelected ? 'fill-blue-400' : getIntensityColor(country.percentage)
                  )}
                  fillOpacity={isSelected ? 0.9 : 0.7}
                  stroke={isSelected ? '#60a5fa' : 'transparent'}
                  strokeWidth={2}
                />
                {isSelected && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r={size + 5}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth={1}
                      className="animate-ping"
                    />
                    <text
                      x={x}
                      y={y - size - 8}
                      textAnchor="middle"
                      className="fill-white text-xs font-medium"
                    >
                      {country.countryName}
                    </text>
                    <text
                      x={x}
                      y={y - size - 22}
                      textAnchor="middle"
                      className="fill-blue-300 text-xs"
                    >
                      {formatNumber(metric === 'users' ? country.userCount : country.meetingCount)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-2 bg-slate-900/80 rounded-lg">
          <span className="text-xs text-slate-400">Density:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-100" />
            <div className="w-3 h-3 rounded-full bg-blue-200" />
            <div className="w-3 h-3 rounded-full bg-blue-300" />
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <div className="w-3 h-3 rounded-full bg-blue-500" />
          </div>
          <span className="text-xs text-slate-400">High</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-slate-900/50">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-slate-400">Total Users</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {formatNumber(data?.totalUsers ?? 0)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/50">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-green-400" />
            <span className="text-xs text-slate-400">Countries</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {data?.countries.length ?? 0}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-slate-400">Total Meetings</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {formatNumber(data?.totalMeetings ?? 0)}
          </p>
        </div>
      </div>

      {/* Country List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white">Top Countries</h4>
          {(data?.countries.length ?? 0) > showTopCountries && (
            <button
              type="button"
              onClick={() => setShowAllCountries(!showAllCountries)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showAllCountries ? 'Show Less' : `Show All (${data?.countries.length})`}
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {topCountries.map((country, index) => {
            const value = metric === 'users' ? country.userCount : country.meetingCount;
            const maxValue = Math.max(
              ...topCountries.map(c => metric === 'users' ? c.userCount : c.meetingCount)
            );
            const barWidth = (value / maxValue) * 100;

            return (
              <div
                key={country.countryCode}
                className={cn(
                  'p-3 rounded-lg transition-colors cursor-pointer',
                  selectedCountry === country.countryCode
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'bg-slate-900/50 hover:bg-slate-900/70'
                )}
                onClick={() => setSelectedCountry(
                  selectedCountry === country.countryCode ? null : country.countryCode
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-5">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {country.countryName}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({country.countryCode})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {country.trend && country.trend !== 'stable' && (
                      <TrendingUp
                        className={cn(
                          'h-3 w-3',
                          country.trend === 'up' ? 'text-green-400' : 'text-red-400 rotate-180'
                        )}
                      />
                    )}
                    <span className="text-sm font-semibold text-white">
                      {formatNumber(value)}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({country.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* Expanded region details */}
                {selectedCountry === country.countryCode && country.regions && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-400 mb-2">Regions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {country.regions.slice(0, 6).map((region) => (
                        <div
                          key={region.regionCode}
                          className="p-2 rounded bg-slate-800/50"
                        >
                          <p className="text-xs text-slate-300 truncate">
                            {region.regionName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatNumber(metric === 'users' ? region.userCount : region.meetingCount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Last Updated */}
      {lastRefresh && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-slate-500 text-center">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default GeoDistributionMap;
