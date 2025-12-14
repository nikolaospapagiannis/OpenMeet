'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowTableProps {
  workflows: any[];
  loading: boolean;
  onEdit: (workflow: any) => void;
  onDelete: (workflowId: string) => void;
  onToggleStatus: (workflowId: string, currentStatus: boolean) => void;
  onViewHistory: (workflow: any) => void;
}

export function WorkflowTable({
  workflows,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewHistory,
}: WorkflowTableProps) {
  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      meeting_end: 'Meeting End',
      action_item_created: 'Action Item Created',
      deadline_approaching: 'Deadline Approaching',
      meeting_scheduled: 'Meeting Scheduled',
      custom: 'Custom Trigger',
    };
    return labels[trigger] || trigger;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      send_email: 'Send Email',
      send_sms: 'Send SMS',
      create_calendar_event: 'Create Calendar Event',
      send_webhook: 'Send Webhook',
      create_task: 'Create Task',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ff-purple-500)]"></div>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="card-ff text-center py-16">
        <svg
          className="w-24 h-24 mx-auto mb-4 text-[var(--ff-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <h3 className="heading-s mb-2">No workflows yet</h3>
        <p className="paragraph-m mb-6">
          Create your first workflow to automate tasks based on meeting events
        </p>
      </div>
    );
  }

  return (
    <div className="card-ff overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--ff-border)]">
              <th className="text-left py-3 px-4 label-m text-[var(--ff-text-muted)]">
                Status
              </th>
              <th className="text-left py-3 px-4 label-m text-[var(--ff-text-muted)]">
                Name
              </th>
              <th className="text-left py-3 px-4 label-m text-[var(--ff-text-muted)]">
                Trigger
              </th>
              <th className="text-left py-3 px-4 label-m text-[var(--ff-text-muted)]">
                Action
              </th>
              <th className="text-left py-3 px-4 label-m text-[var(--ff-text-muted)]">
                Last Run
              </th>
              <th className="text-right py-3 px-4 label-m text-[var(--ff-text-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((workflow) => (
              <tr
                key={workflow.id}
                className="border-b border-[var(--ff-border)] hover:bg-[var(--ff-bg-dark)]/50 transition-colors"
              >
                <td className="py-4 px-4">
                  <button
                    onClick={() => onToggleStatus(workflow.id, workflow.isActive)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)] focus:ring-offset-2 focus:ring-offset-[var(--ff-bg-layer)]"
                    style={{
                      backgroundColor: workflow.isActive
                        ? 'var(--ff-purple-500)'
                        : 'var(--ff-border)',
                    }}
                    aria-label={workflow.isActive ? 'Disable workflow' : 'Enable workflow'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        workflow.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-white">{workflow.name}</p>
                    {workflow.description && (
                      <p className="text-sm text-[var(--ff-text-muted)] mt-1">
                        {workflow.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {getTriggerLabel(workflow.trigger)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    {getActionLabel(workflow.action)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm">
                    {workflow.lastRunAt ? (
                      <>
                        <p className="text-[var(--ff-text-secondary)]">
                          {formatDistanceToNow(new Date(workflow.lastRunAt), {
                            addSuffix: true,
                          })}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            workflow.lastRunStatus === 'success'
                              ? 'text-green-400'
                              : workflow.lastRunStatus === 'failed'
                              ? 'text-red-400'
                              : 'text-[var(--ff-text-muted)]'
                          }`}
                        >
                          {workflow.lastRunStatus === 'success' && '✓ Success'}
                          {workflow.lastRunStatus === 'failed' && '✗ Failed'}
                          {!workflow.lastRunStatus && 'Never run'}
                        </p>
                      </>
                    ) : (
                      <span className="text-[var(--ff-text-muted)]">Never run</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewHistory(workflow)}
                      className="p-2 text-[var(--ff-text-muted)] hover:text-white hover:bg-[var(--ff-bg-dark)] rounded-lg transition-colors"
                      title="View History"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onEdit(workflow)}
                      className="p-2 text-[var(--ff-text-muted)] hover:text-white hover:bg-[var(--ff-bg-dark)] rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(workflow.id)}
                      className="p-2 text-[var(--ff-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}