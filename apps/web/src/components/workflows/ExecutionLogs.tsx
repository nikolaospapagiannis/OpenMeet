'use client';

import React, { useState, useEffect } from 'react';

interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  trigger: string;
  triggerData?: any;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  steps: ExecutionStep[];
  error?: string;
  retryCount?: number;
}

interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

interface ExecutionLogsProps {
  workflowId?: string;
  workflowName?: string;
  limit?: number;
  onSelectExecution?: (execution: Execution) => void;
}

export function ExecutionLogs({ workflowId, workflowName, limit = 50, onSelectExecution }: ExecutionLogsProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'running'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(5000);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data generator
  const generateMockExecutions = (): Execution[] => {
    const statuses: Execution['status'][] = ['success', 'failed', 'running', 'partial'];
    const triggers = ['meeting_completed', 'schedule', 'keyword_detected', 'webhook'];
    const mockExecutions: Execution[] = [];

    for (let i = 0; i < 20; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const duration = status === 'running' ? undefined : Math.floor(Math.random() * 10000 + 1000);
      const endTime = status === 'running' ? undefined : new Date(startTime.getTime() + (duration || 0));

      mockExecutions.push({
        id: `exec-${Date.now()}-${i}`,
        workflowId: workflowId || `workflow-${Math.floor(Math.random() * 5)}`,
        workflowName: workflowName || `Workflow ${Math.floor(Math.random() * 5) + 1}`,
        status,
        trigger: triggers[Math.floor(Math.random() * triggers.length)],
        triggerData: {
          meetingId: `meeting-${i}`,
          participants: ['user1@example.com', 'user2@example.com']
        },
        startTime,
        endTime,
        duration,
        steps: [
          {
            nodeId: 'node-1',
            nodeName: 'Meeting Completed Trigger',
            nodeType: 'trigger',
            status: status === 'failed' && Math.random() > 0.5 ? 'failed' : 'success',
            startTime,
            endTime: endTime ? new Date(startTime.getTime() + 1000) : undefined
          },
          {
            nodeId: 'node-2',
            nodeName: 'Check Participants',
            nodeType: 'condition',
            status: status === 'running' ? 'running' : status === 'failed' && Math.random() > 0.5 ? 'failed' : 'success',
            startTime: new Date(startTime.getTime() + 1000),
            endTime: endTime ? new Date(startTime.getTime() + 2000) : undefined
          },
          {
            nodeId: 'node-3',
            nodeName: 'Send Email',
            nodeType: 'action',
            status: status === 'running' ? 'pending' : status === 'failed' ? 'failed' : 'success',
            startTime: status === 'running' ? undefined : new Date(startTime.getTime() + 2000),
            endTime: endTime ? new Date(startTime.getTime() + 4000) : undefined
          }
        ],
        error: status === 'failed' ? 'Email service temporarily unavailable' : undefined,
        retryCount: status === 'failed' ? Math.floor(Math.random() * 3) : undefined
      });
    }

    return mockExecutions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  };

  // Fetch executions
  const fetchExecutions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // In real implementation, this would be an API call:
      // const response = await fetch(`/api/workflows/executions?workflowId=${workflowId}&limit=${limit}`);
      // const data = await response.json();

      const mockData = generateMockExecutions();
      setExecutions(mockData);
    } catch (err) {
      setError('Failed to load execution history');
      console.error('Error fetching executions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [workflowId, limit]);

  // Auto-refresh for running executions
  useEffect(() => {
    if (!refreshInterval) return;

    const hasRunning = executions.some(e => e.status === 'running');
    if (!hasRunning) return;

    const interval = setInterval(fetchExecutions, refreshInterval);
    return () => clearInterval(interval);
  }, [executions, refreshInterval]);

  // Filter executions
  const filteredExecutions = executions.filter(execution => {
    // Status filter
    if (filter !== 'all' && execution.status !== filter) {
      return false;
    }

    // Time range filter
    const now = new Date();
    const executionTime = execution.startTime;
    switch (timeRange) {
      case 'today':
        if (executionTime.toDateString() !== now.toDateString()) return false;
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (executionTime < weekAgo) return false;
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (executionTime < monthAgo) return false;
        break;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        execution.workflowName.toLowerCase().includes(query) ||
        execution.trigger.toLowerCase().includes(query) ||
        execution.id.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Get status color
  const getStatusColor = (status: Execution['status']) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-500/10';
      case 'failed': return 'text-red-400 bg-red-500/10';
      case 'running': return 'text-blue-400 bg-blue-500/10';
      case 'partial': return 'text-yellow-400 bg-yellow-500/10';
      default: return 'text-[var(--ff-text-muted)] bg-[var(--ff-bg-layer)]';
    }
  };

  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      case 'partial': return '⚠️';
      default: return '❓';
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTime = (date?: Date): string => {
    if (!date) return '-';
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="bg-[var(--ff-bg-layer)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search executions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 bg-[var(--ff-bg-dark)] rounded-md p-1">
            {(['all', 'success', 'failed', 'running'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded transition-colors text-sm ${
                  filter === status
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-muted)] hover:text-white'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="all">All time</option>
          </select>

          {/* Auto-refresh */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--ff-text-secondary)]">Auto-refresh:</label>
            <select
              value={refreshInterval || ''}
              onChange={(e) => setRefreshInterval(e.target.value ? parseInt(e.target.value) : null)}
              className="px-2 py-1 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white text-sm"
            >
              <option value="">Off</option>
              <option value="5000">5s</option>
              <option value="10000">10s</option>
              <option value="30000">30s</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchExecutions}
            className="px-3 py-2 bg-[var(--ff-bg-dark)] text-white rounded-md hover:bg-[var(--ff-purple-500)] transition-colors border border-[var(--ff-border)]"
            title="Refresh"
          >
            🔄
          </button>
        </div>

        {/* Statistics */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--ff-border)]">
          <div className="text-sm">
            <span className="text-[var(--ff-text-muted)]">Total:</span>
            <span className="ml-2 text-white font-medium">{filteredExecutions.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-[var(--ff-text-muted)]">Success:</span>
            <span className="ml-2 text-green-400 font-medium">
              {filteredExecutions.filter(e => e.status === 'success').length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-[var(--ff-text-muted)]">Failed:</span>
            <span className="ml-2 text-red-400 font-medium">
              {filteredExecutions.filter(e => e.status === 'failed').length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-[var(--ff-text-muted)]">Running:</span>
            <span className="ml-2 text-blue-400 font-medium">
              {filteredExecutions.filter(e => e.status === 'running').length}
            </span>
          </div>
        </div>
      </div>

      {/* Execution List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl">⚙️</div>
          <p className="text-[var(--ff-text-muted)] mt-4">Loading execution history...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--ff-text-muted)]">No executions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExecutions.map((execution) => (
            <div
              key={execution.id}
              className="bg-[var(--ff-bg-layer)] rounded-lg p-4 border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)] transition-all cursor-pointer"
              onClick={() => {
                setSelectedExecution(execution);
                if (onSelectExecution) onSelectExecution(execution);
              }}
            >
              <div className="flex items-start justify-between">
                {/* Left side */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-lg ${getStatusColor(execution.status).split(' ')[0]}`}>
                      {getStatusIcon(execution.status)}
                    </span>
                    <h4 className="font-medium text-white">
                      {execution.workflowName}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                    {execution.status === 'running' && (
                      <span className="animate-pulse text-xs text-blue-400">
                        Running for {formatDuration(Date.now() - execution.startTime.getTime())}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-[var(--ff-text-secondary)]">
                    <span>
                      ID: <span className="font-mono text-xs">{execution.id}</span>
                    </span>
                    <span>
                      Trigger: <span className="text-[var(--ff-text-primary)]">{execution.trigger}</span>
                    </span>
                    <span>
                      Started: <span className="text-[var(--ff-text-primary)]">{formatTime(execution.startTime)}</span>
                    </span>
                    {execution.duration && (
                      <span>
                        Duration: <span className="text-[var(--ff-text-primary)]">{formatDuration(execution.duration)}</span>
                      </span>
                    )}
                    {execution.retryCount && execution.retryCount > 0 && (
                      <span className="text-yellow-400">
                        Retries: {execution.retryCount}
                      </span>
                    )}
                  </div>

                  {/* Steps Summary */}
                  <div className="flex gap-2 mt-3">
                    {execution.steps.map((step, index) => (
                      <div
                        key={step.nodeId}
                        className={`flex items-center text-xs ${
                          step.status === 'success' ? 'text-green-400' :
                          step.status === 'failed' ? 'text-red-400' :
                          step.status === 'running' ? 'text-blue-400' :
                          step.status === 'skipped' ? 'text-yellow-400' :
                          'text-[var(--ff-text-muted)]'
                        }`}
                      >
                        <span className="mr-1">
                          {step.status === 'success' ? '✓' :
                           step.status === 'failed' ? '✗' :
                           step.status === 'running' ? '○' :
                           step.status === 'skipped' ? '⟩' : '·'}
                        </span>
                        <span>{step.nodeName}</span>
                        {index < execution.steps.length - 1 && (
                          <span className="mx-2 text-[var(--ff-text-muted)]">→</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Error Message */}
                  {execution.error && (
                    <div className="mt-3 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                      Error: {execution.error}
                    </div>
                  )}
                </div>

                {/* Right side - Actions */}
                <div className="ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedExecution(execution);
                    }}
                    className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
                    title="View Details"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a1 1 0 11-2 0 1 1 0 012 0zM9 10a1 1 0 11-2 0 1 1 0 012 0zM9 14a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execution Detail Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--ff-bg-layer)] rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[var(--ff-border)]">
              <div className="flex justify-between items-center">
                <h3 className="heading-s text-white">Execution Details</h3>
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Execution Info */}
              <div className="bg-[var(--ff-bg-dark)] rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)]">Workflow</label>
                    <p className="text-white">{selectedExecution.workflowName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)]">Status</label>
                    <p className={`${getStatusColor(selectedExecution.status).split(' ')[0]}`}>
                      {getStatusIcon(selectedExecution.status)} {selectedExecution.status}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)]">Started</label>
                    <p className="text-white">{formatTime(selectedExecution.startTime)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)]">Duration</label>
                    <p className="text-white">{formatDuration(selectedExecution.duration)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)]">Trigger</label>
                    <p className="text-white">{selectedExecution.trigger}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)]">Execution ID</label>
                    <p className="text-white font-mono text-xs">{selectedExecution.id}</p>
                  </div>
                </div>
              </div>

              {/* Trigger Data */}
              {selectedExecution.triggerData && (
                <div className="bg-[var(--ff-bg-dark)] rounded-lg p-4 mb-4">
                  <h4 className="label-m text-[var(--ff-text-secondary)] mb-2">Trigger Data</h4>
                  <pre className="text-xs text-[var(--ff-text-primary)] overflow-x-auto">
                    {JSON.stringify(selectedExecution.triggerData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Steps */}
              <div>
                <h4 className="label-m text-[var(--ff-text-secondary)] mb-3">Execution Steps</h4>
                <div className="space-y-2">
                  {selectedExecution.steps.map((step, index) => (
                    <div
                      key={step.nodeId}
                      className="bg-[var(--ff-bg-dark)] rounded-lg p-3 border border-[var(--ff-border)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`text-lg mr-2 ${
                            step.status === 'success' ? 'text-green-400' :
                            step.status === 'failed' ? 'text-red-400' :
                            step.status === 'running' ? 'text-blue-400' :
                            step.status === 'skipped' ? 'text-yellow-400' :
                            'text-[var(--ff-text-muted)]'
                          }`}>
                            {step.status === 'success' ? '✅' :
                             step.status === 'failed' ? '❌' :
                             step.status === 'running' ? '🔄' :
                             step.status === 'skipped' ? '⏭️' : '⏳'}
                          </span>
                          <div>
                            <p className="text-white font-medium">
                              {index + 1}. {step.nodeName}
                            </p>
                            <p className="text-xs text-[var(--ff-text-muted)]">
                              {step.nodeType.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          step.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          step.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          step.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          step.status === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)]'
                        }`}>
                          {step.status}
                        </span>
                      </div>

                      {step.error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                          {step.error}
                        </div>
                      )}

                      {step.result && (
                        <details className="mt-2">
                          <summary className="text-xs text-[var(--ff-text-muted)] cursor-pointer hover:text-white">
                            View Result
                          </summary>
                          <pre className="mt-1 text-xs text-[var(--ff-text-secondary)] bg-black p-2 rounded overflow-x-auto">
                            {JSON.stringify(step.result, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--ff-border)]">
              <button
                onClick={() => setSelectedExecution(null)}
                className="button-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}