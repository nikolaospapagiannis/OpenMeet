'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowTable } from '@/components/workflows/WorkflowTable';
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';
import { ExecutionHistory } from '@/components/workflows/ExecutionHistory';

type ViewType = 'list' | 'builder' | 'history';

export default function WorkflowsPage() {
  const [view, setView] = useState<ViewType>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch workflows from API
  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workflows', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }

      const data = await response.json();
      setWorkflows(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [refreshTrigger]);

  const handleCreateNew = () => {
    setSelectedWorkflow(null);
    setView('builder');
  };

  const handleEdit = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setView('builder');
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error deleting workflow:', err);
      alert('Failed to delete workflow');
    }
  };

  const handleToggleStatus = async (workflowId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow status');
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error updating workflow:', err);
      alert('Failed to update workflow status');
    }
  };

  const handleSaveWorkflow = async (workflowData: any) => {
    try {
      const method = selectedWorkflow ? 'PATCH' : 'POST';
      const url = selectedWorkflow
        ? `/api/workflows/${selectedWorkflow.id}`
        : '/api/workflows';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save workflow');
      }

      setView('list');
      setSelectedWorkflow(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error saving workflow:', err);
      throw err;
    }
  };

  const handleViewHistory = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setView('history');
  };

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <div className="container-ff py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="heading-l text-white">Workflow Automation</h1>
            {view === 'list' && (
              <button
                onClick={handleCreateNew}
                className="button-primary"
              >
                Create Workflow
              </button>
            )}
          </div>
          <p className="paragraph-l">
            Automate your meeting workflows with triggers and actions
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 mb-8 bg-[var(--ff-bg-layer)] rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-md transition-all ${
              view === 'list'
                ? 'bg-[var(--ff-purple-500)] text-white'
                : 'text-[var(--ff-text-muted)] hover:text-white'
            }`}
          >
            Workflows
          </button>
          {selectedWorkflow && view === 'builder' && (
            <button
              onClick={() => setView('builder')}
              className={`px-4 py-2 rounded-md transition-all ${
                view === 'builder'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-[var(--ff-text-muted)] hover:text-white'
              }`}
            >
              Edit Workflow
            </button>
          )}
          {selectedWorkflow && view === 'history' && (
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded-md transition-all ${
                view === 'history'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-[var(--ff-text-muted)] hover:text-white'
              }`}
            >
              Execution History
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        {view === 'list' && (
          <WorkflowTable
            workflows={workflows}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onViewHistory={handleViewHistory}
          />
        )}

        {view === 'builder' && (
          <WorkflowBuilder
            workflow={selectedWorkflow}
            onSave={handleSaveWorkflow}
            onCancel={() => {
              setView('list');
              setSelectedWorkflow(null);
            }}
          />
        )}

        {view === 'history' && selectedWorkflow && (
          <ExecutionHistory
            workflowId={selectedWorkflow.id}
            workflowName={selectedWorkflow.name}
            onBack={() => setView('list')}
          />
        )}
      </div>
    </div>
  );
}