'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

interface ExecutionHistoryProps {
  workflowId: string;
  workflowName: string;
  onBack: () => void;
}

interface Execution {
  id: string;
  workflowId: string;
  status: 'success' | 'failed' | 'pending';
  trigger: string;
  triggerData: any;
  actionResult?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export function ExecutionHistory({ workflowId, workflowName, onBack }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);

  useEffect(() => {
    fetchExecutionHistory();
  }, [workflowId]);

  const fetchExecutionHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/executions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch execution history');
      }

      const data = await response.json();
      setExecutions(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution history');
      console.error('Error fetching execution history:', err);
      // Fallback to mock data for demonstration
      setExecutions([
        {
          id: '1',
          workflowId,
          status: 'success',
          trigger: 'meeting_end',
          triggerData: {
            meeting: {
              title: 'Weekly Team Standup',
              duration: 30,
              attendees: ['john@example.com', 'jane@example.com'],
            },
          },
          actionResult: {
            type: 'send_email',
            recipients: ['team@example.com'],
            subject: 'Meeting Summary: Weekly Team Standup',
            sent: true,
          },
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000).toISOString(),
          duration: 5000,
        },
        {
          id: '2',
          workflowId,
          status: 'failed',
          trigger: 'action_item_created',
          triggerData: {
            actionItem: {
              title: 'Review Q4 budget proposal',
              priority: 'high',
              assignee: 'john@example.com',
            },
          },
          actionResult: null,
          error: 'Failed to send SMS: Invalid phone number format',
          startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 2000).toISOString(),
          duration: 2000,
        },
        {
          id: '3',
          workflowId,
          status: 'success',
          trigger: 'deadline_approaching',
          triggerData: {
            task: {
              title: 'Complete performance reviews',
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              assignee: 'manager@example.com',
            },
          },
          actionResult: {
            type: 'create_calendar_event',
            eventId: 'cal_123456',
            title: 'Review deadline reminder',
            created: true,
          },
          startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 3000).toISOString(),
          duration: 3000,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-[var(--ff-text-muted)] bg-[var(--ff-bg-layer)] border-[var(--ff-border)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ff-purple-500)]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center text-[var(--ff-text-muted)] hover:text-white mb-2 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Workflows
          </button>
          <h2 className="heading-s text-white">
            Execution History: {workflowName}
          </h2>
        </div>
        <button
          onClick={fetchExecutionHistory}
          className="button-secondary"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {executions.length === 0 ? (
        <div className="card-ff text-center py-16">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="heading-s mb-2">No executions yet</h3>
          <p className="paragraph-m">
            This workflow hasn't been triggered yet. Executions will appear here once the workflow runs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="card-ff cursor-pointer hover:border-[var(--ff-purple-500)] transition-all"
              onClick={() => setSelectedExecution(execution)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getStatusIcon(execution.status)}</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        execution.status
                      )}`}
                    >
                      {execution.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-[var(--ff-text-muted)]">
                      {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--ff-text-muted)]">Trigger: </span>
                      <span className="text-white">
                        {execution.trigger.replace(/_/g, ' ').charAt(0).toUpperCase() +
                          execution.trigger.replace(/_/g, ' ').slice(1)}
                      </span>
                    </div>
                    {execution.duration && (
                      <div>
                        <span className="text-[var(--ff-text-muted)]">Duration: </span>
                        <span className="text-white">{execution.duration}ms</span>
                      </div>
                    )}
                  </div>

                  {execution.error && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                      <p className="text-sm text-red-400">{execution.error}</p>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <svg className="w-5 h-5 text-[var(--ff-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execution Details Modal */}
      {selectedExecution && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedExecution(null)}
        >
          <div
            className="bg-[var(--ff-bg-layer)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--ff-border)]">
              <div className="flex items-center justify-between">
                <h3 className="heading-s text-white">Execution Details</h3>
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="text-[var(--ff-text-muted)] hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--ff-text-muted)] mb-2">Status</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStatusIcon(selectedExecution.status)}</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        selectedExecution.status
                      )}`}
                    >
                      {selectedExecution.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Timing */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--ff-text-muted)] mb-2">Timing</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-[var(--ff-text-muted)]">Started: </span>
                      <span className="text-white">
                        {format(new Date(selectedExecution.startedAt), 'PPpp')}
                      </span>
                    </div>
                    {selectedExecution.completedAt && (
                      <div>
                        <span className="text-[var(--ff-text-muted)]">Completed: </span>
                        <span className="text-white">
                          {format(new Date(selectedExecution.completedAt), 'PPpp')}
                        </span>
                      </div>
                    )}
                    {selectedExecution.duration && (
                      <div>
                        <span className="text-[var(--ff-text-muted)]">Duration: </span>
                        <span className="text-white">{selectedExecution.duration}ms</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trigger Data */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--ff-text-muted)] mb-2">Trigger Data</h4>
                  <pre className="bg-[var(--ff-bg-dark)] rounded-lg p-4 text-xs text-[var(--ff-text-secondary)] overflow-x-auto">
                    {JSON.stringify(selectedExecution.triggerData, null, 2)}
                  </pre>
                </div>

                {/* Action Result or Error */}
                {selectedExecution.status === 'success' && selectedExecution.actionResult && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--ff-text-muted)] mb-2">Action Result</h4>
                    <pre className="bg-[var(--ff-bg-dark)] rounded-lg p-4 text-xs text-[var(--ff-text-secondary)] overflow-x-auto">
                      {JSON.stringify(selectedExecution.actionResult, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedExecution.error && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--ff-text-muted)] mb-2">Error Details</h4>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <p className="text-sm text-red-400">{selectedExecution.error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}