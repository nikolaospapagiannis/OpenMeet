/**
 * Real-time Analytics Stream Component
 * Enterprise-grade real-time event streaming visualization
 *
 * Features:
 * - Live WebSocket event streaming
 * - Event type filtering
 * - Organization filtering for super admins
 * - Event statistics and counters
 * - Pause/resume functionality
 * - Event details expansion
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Activity,
  Pause,
  Play,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Building2,
  Tag,
  Eye,
  EyeOff,
  Trash2,
  Download,
} from 'lucide-react';
import { useAnalyticsStreamSocket, type ConnectionState } from '@/hooks/useAdminWebSocket';
import { cn } from '@/lib/utils';

// Event types
interface AnalyticsEvent {
  id: string;
  type: string;
  organizationId: string;
  organizationName?: string;
  data: Record<string, unknown>;
  timestamp: string;
  _channel?: string;
}

interface EventTypeStats {
  type: string;
  count: number;
  lastSeen: Date;
}

interface RealtimeAnalyticsStreamProps {
  authToken?: string;
  organizationId?: string;
  maxEvents?: number;
  eventTypes?: string[];
  showFilters?: boolean;
  showStats?: boolean;
  className?: string;
}

// Event type configurations
const EVENT_TYPE_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: string;
}> = {
  'meeting.started': { label: 'Meeting Started', color: 'bg-green-500', icon: '🎥' },
  'meeting.ended': { label: 'Meeting Ended', color: 'bg-red-500', icon: '🔚' },
  'user.joined': { label: 'User Joined', color: 'bg-blue-500', icon: '👤' },
  'user.left': { label: 'User Left', color: 'bg-orange-500', icon: '👋' },
  'transcription.completed': { label: 'Transcription Done', color: 'bg-purple-500', icon: '📝' },
  'ai.query': { label: 'AI Query', color: 'bg-cyan-500', icon: '🤖' },
  'ai.response': { label: 'AI Response', color: 'bg-teal-500', icon: '💬' },
  'recording.started': { label: 'Recording Started', color: 'bg-pink-500', icon: '⏺️' },
  'recording.stopped': { label: 'Recording Stopped', color: 'bg-rose-500', icon: '⏹️' },
  'integration.sync': { label: 'Integration Sync', color: 'bg-indigo-500', icon: '🔄' },
  'billing.event': { label: 'Billing Event', color: 'bg-yellow-500', icon: '💳' },
  'error': { label: 'Error', color: 'bg-red-600', icon: '⚠️' },
  default: { label: 'Event', color: 'bg-slate-500', icon: '📊' },
};

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

export function RealtimeAnalyticsStream({
  authToken,
  organizationId,
  maxEvents = 100,
  eventTypes,
  showFilters = true,
  showStats = true,
  className,
}: RealtimeAnalyticsStreamProps) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    eventTypes ? new Set(eventTypes) : new Set()
  );
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [eventStats, setEventStats] = useState<Map<string, EventTypeStats>>(new Map());
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const pausedEventsRef = useRef<AnalyticsEvent[]>([]);

  const {
    connectionState,
    isConnected,
    on,
    off,
    emit,
    error,
    reconnectAttempts,
  } = useAnalyticsStreamSocket(authToken);

  // Handle incoming events
  const handleEvent = useCallback((data: unknown) => {
    const event = data as AnalyticsEvent;

    // Filter by organization if specified
    if (organizationId && event.organizationId !== organizationId) {
      return;
    }

    // Filter by event type if filter is active
    if (selectedTypes.size > 0 && !selectedTypes.has(event.type)) {
      return;
    }

    if (isPaused) {
      // Store events while paused
      pausedEventsRef.current.push(event);
      return;
    }

    // Add to events list
    setEvents((prev) => {
      const newEvents = [event, ...prev].slice(0, maxEvents);
      return newEvents;
    });

    // Update statistics
    setEventStats((prev) => {
      const stats = new Map(prev);
      const existing = stats.get(event.type);
      stats.set(event.type, {
        type: event.type,
        count: (existing?.count ?? 0) + 1,
        lastSeen: new Date(),
      });
      return stats;
    });
  }, [organizationId, selectedTypes, isPaused, maxEvents]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Listen for analytics events
    on('analytics:event', handleEvent);
    on('analytics:stream', handleEvent);
    on('analytics-stream:event', handleEvent);

    // Subscribe to analytics stream
    emit('analytics:subscribe', { organizationId });

    return () => {
      off('analytics:event');
      off('analytics:stream');
      off('analytics-stream:event');
      emit('analytics:unsubscribe', { organizationId });
    };
  }, [isConnected, on, off, emit, handleEvent, organizationId]);

  // Resume and add paused events
  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (pausedEventsRef.current.length > 0) {
      setEvents((prev) => {
        const combined = [...pausedEventsRef.current.reverse(), ...prev];
        pausedEventsRef.current = [];
        return combined.slice(0, maxEvents);
      });
    }
  }, [maxEvents]);

  // Toggle event expansion
  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  // Toggle event type filter
  const toggleTypeFilter = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
    pausedEventsRef.current = [];
  }, []);

  // Export events as JSON
  const exportEvents = useCallback(() => {
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-events-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [events]);

  // Get event type config
  const getEventConfig = useCallback((type: string) => {
    return EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.default;
  }, []);

  // Format timestamp
  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }, []);

  // Available event types for filter
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((e) => types.add(e.type));
    eventStats.forEach((_, type) => types.add(type));
    return Array.from(types).sort();
  }, [events, eventStats]);

  // Events per second calculation
  const eventsPerSecond = useMemo(() => {
    const recentEvents = events.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime();
      const now = Date.now();
      return now - eventTime < 60000; // Last minute
    });
    return (recentEvents.length / 60).toFixed(2);
  }, [events]);

  const statusConfig = CONNECTION_STATUS_CONFIG[connectionState];
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn('rounded-xl bg-slate-800/50 border border-white/5 overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Real-time Analytics</h3>
              <p className="text-sm text-slate-400">
                Live event stream • {eventsPerSecond} events/sec
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            {/* Pause/Resume */}
            <button
              type="button"
              onClick={() => isPaused ? handleResume() : setIsPaused(true)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isPaused
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
              )}
              aria-label={isPaused ? 'Resume stream' : 'Pause stream'}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>

            {/* Filter Toggle */}
            {showFilters && (
              <button
                type="button"
                onClick={() => setShowTypeFilter(!showTypeFilter)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  showTypeFilter || selectedTypes.size > 0
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                )}
                aria-label="Toggle filters"
              >
                <Filter className="h-4 w-4" />
                {selectedTypes.size > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white">
                    {selectedTypes.size}
                  </span>
                )}
              </button>
            )}

            {/* Export */}
            <button
              type="button"
              onClick={exportEvents}
              disabled={events.length === 0}
              className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
              aria-label="Export events"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={clearEvents}
              disabled={events.length === 0}
              className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
              aria-label="Clear events"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Paused Banner */}
        {isPaused && (
          <div className="mt-3 p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pause className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">
                Stream paused • {pausedEventsRef.current.length} events buffered
              </span>
            </div>
            <button
              type="button"
              onClick={handleResume}
              className="text-xs text-yellow-400 hover:text-yellow-300 underline"
            >
              Resume
            </button>
          </div>
        )}

        {/* Filter Panel */}
        {showTypeFilter && (
          <div className="mt-3 p-3 rounded-lg bg-slate-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Filter by event type</span>
              {selectedTypes.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTypes(new Set())}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((type) => {
                const config = getEventConfig(type);
                const isSelected = selectedTypes.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleTypeFilter(type)}
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
                      isSelected
                        ? `${config.color} text-white`
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                    {isSelected && <X className="h-3 w-3 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {showStats && eventStats.size > 0 && (
        <div className="p-3 border-b border-white/5 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {Array.from(eventStats.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 8)
              .map(([type, stats]) => {
                const config = getEventConfig(type);
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50"
                  >
                    <span className="text-sm">{config.icon}</span>
                    <span className="text-xs text-slate-400">{config.label}</span>
                    <span className="text-xs font-semibold text-white">{stats.count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Events List */}
      <div
        ref={eventsContainerRef}
        className="h-96 overflow-y-auto"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Activity className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Waiting for events...</p>
            <p className="text-xs mt-1">
              {isConnected ? 'Connected and listening' : 'Connecting to stream...'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((event) => {
              const config = getEventConfig(event.type);
              const isExpanded = expandedEvents.has(event.id);

              return (
                <div
                  key={event.id}
                  className={cn(
                    'p-3 transition-colors',
                    isExpanded ? 'bg-slate-900/50' : 'hover:bg-slate-900/30'
                  )}
                >
                  {/* Event Header */}
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleEventExpansion(event.id)}
                  >
                    {/* Type Badge */}
                    <div className={cn('w-2 h-2 rounded-full', config.color)} />

                    {/* Icon */}
                    <span className="text-sm">{config.icon}</span>

                    {/* Type Label */}
                    <span className="text-sm font-medium text-white">
                      {config.label}
                    </span>

                    {/* Organization */}
                    {event.organizationName && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Building2 className="h-3 w-3" />
                        <span>{event.organizationName}</span>
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(event.timestamp)}</span>
                    </div>

                    {/* Expand Toggle */}
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-700/50 transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-3 pl-8">
                      {/* Event ID */}
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-500">ID: {event.id}</span>
                      </div>

                      {/* Event Data */}
                      <div className="p-3 rounded-lg bg-slate-950/50 font-mono text-xs overflow-x-auto">
                        <pre className="text-slate-300">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </div>

                      {/* Channel (if present) */}
                      {event._channel && (
                        <div className="mt-2 text-xs text-slate-500">
                          Channel: {event._channel}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Showing {events.length} of {maxEvents} max events
        </span>
        <span className="text-xs text-slate-500">
          Total received: {Array.from(eventStats.values()).reduce((sum, s) => sum + s.count, 0)}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border-t border-red-500/20">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}
    </div>
  );
}

export default RealtimeAnalyticsStream;
