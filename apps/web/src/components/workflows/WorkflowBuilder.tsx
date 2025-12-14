'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodeEditor } from './NodeEditor';
import { WorkflowTemplates } from './WorkflowTemplates';
import { TestWorkflow } from './TestWorkflow';
import { ExecutionLogs } from './ExecutionLogs';

interface Node {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  subType?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: any;
    icon?: string;
  };
  selected?: boolean;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

interface WorkflowBuilderProps {
  workflow?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [view, setView] = useState<'builder' | 'test' | 'history'>('builder');
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Convert legacy workflow format to nodes and edges
  const convertLegacyWorkflow = (workflow: any): { nodes: Node[], edges: Edge[] } => {
    if (workflow?.nodes && workflow?.edges) {
      return { nodes: workflow.nodes, edges: workflow.edges };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let xPos = 100;

    // Add trigger node if exists
    if (workflow?.trigger) {
      nodes.push({
        id: 'trigger-1',
        type: 'trigger',
        subType: workflow.trigger,
        position: { x: xPos, y: 100 },
        data: {
          label: workflow.trigger.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          config: workflow.triggerConfig || {}
        }
      });
      xPos += 250;
    }

    // Add condition nodes if exists
    if (workflow?.conditions && workflow.conditions.length > 0) {
      workflow.conditions.forEach((condition: any, index: number) => {
        const conditionId = `condition-${index + 1}`;
        nodes.push({
          id: conditionId,
          type: 'condition',
          position: { x: xPos, y: 100 + (index * 100) },
          data: {
            label: condition.field || 'Condition',
            config: condition
          }
        });

        // Connect to previous node
        if (nodes.length > 1) {
          edges.push({
            id: `edge-${edges.length + 1}`,
            source: nodes[nodes.length - 2].id,
            target: conditionId
          });
        }
      });
      xPos += 250;
    }

    // Add action node if exists
    if (workflow?.action) {
      const actionId = 'action-1';
      nodes.push({
        id: actionId,
        type: 'action',
        subType: workflow.action,
        position: { x: xPos, y: 100 },
        data: {
          label: workflow.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          config: workflow.actionConfig || {}
        }
      });

      // Connect to previous node
      if (nodes.length > 1) {
        edges.push({
          id: `edge-${edges.length + 1}`,
          source: nodes[nodes.length - 2].id,
          target: actionId
        });
      }
    }

    return { nodes, edges };
  };

  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    nodes: [] as Node[],
    edges: [] as Edge[],
    isActive: workflow?.isActive ?? true,
  });

  // Initialize with legacy workflow or existing nodes/edges
  useEffect(() => {
    if (workflow) {
      const { nodes, edges } = convertLegacyWorkflow(workflow);
      setFormData(prev => ({
        ...prev,
        nodes,
        edges
      }));
    }
  }, [workflow]);

  // Add new node
  const handleAddNode = (type: 'trigger' | 'action' | 'condition', position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: {
        label: `New ${type}`,
        config: {}
      }
    };

    setFormData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));

    // Auto-select new node for editing
    setSelectedNode(newNode);
    setShowNodeEditor(true);
  };

  // Update node
  const handleUpdateNode = (nodeId: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, data } : node
      )
    }));
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    setFormData(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
    setSelectedNode(null);
    setShowNodeEditor(false);
  };

  // Handle node selection
  const handleNodeSelect = (node: Node | null) => {
    setSelectedNode(node);
    if (node) {
      setShowNodeEditor(true);
    }
  };

  // Load template
  const handleLoadTemplate = (template: any) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges
    }));
    setShowTemplates(false);
  };

  const handleSave = async () => {
    // Validate workflow
    const triggers = formData.nodes.filter(n => n.type === 'trigger');
    const actions = formData.nodes.filter(n => n.type === 'action');

    if (triggers.length === 0) {
      alert('Workflow must have at least one trigger');
      return;
    }

    if (actions.length === 0) {
      alert('Workflow must have at least one action');
      return;
    }

    if (!formData.name.trim()) {
      alert('Workflow name is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-[var(--ff-bg-layer)] p-4 border-b border-[var(--ff-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="heading-s text-white">
              {workflow ? 'Edit Workflow' : 'Create Workflow'}
            </h2>
            {/* View Tabs */}
            <div className="flex gap-1 bg-[var(--ff-bg-dark)] rounded-md p-1">
              <button
                onClick={() => setView('builder')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  view === 'builder'
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-muted)] hover:text-white'
                }`}
              >
                Builder
              </button>
              <button
                onClick={() => setView('test')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  view === 'test'
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-muted)] hover:text-white'
                }`}
              >
                Test
              </button>
              <button
                onClick={() => setView('history')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  view === 'history'
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-[var(--ff-text-muted)] hover:text-white'
                }`}
              >
                History
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Template Button */}
            <button
              onClick={() => setShowTemplates(true)}
              className="button-secondary"
            >
              📚 Templates
            </button>

            {/* Save/Cancel */}
            <button onClick={onCancel} className="button-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="button-primary"
            >
              {saving ? 'Saving...' : workflow ? 'Update' : 'Create'} Workflow
            </button>
          </div>
        </div>

        {/* Workflow Info */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Workflow name..."
              className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optional)..."
              className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--ff-text-secondary)]">Active:</label>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {view === 'builder' && (
          <>
            {/* Workflow Canvas */}
            <WorkflowCanvas
              nodes={formData.nodes}
              edges={formData.edges}
              onNodesChange={(nodes) => setFormData({ ...formData, nodes })}
              onEdgesChange={(edges) => setFormData({ ...formData, edges })}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNode?.id}
              onAddNode={handleAddNode}
            />

            {/* Quick Stats */}
            <div className="flex gap-4 mt-4 text-sm text-[var(--ff-text-secondary)]">
              <span>
                Triggers: {formData.nodes.filter(n => n.type === 'trigger').length}
              </span>
              <span>•</span>
              <span>
                Conditions: {formData.nodes.filter(n => n.type === 'condition').length}
              </span>
              <span>•</span>
              <span>
                Actions: {formData.nodes.filter(n => n.type === 'action').length}
              </span>
              <span>•</span>
              <span>
                Connections: {formData.edges.length}
              </span>
            </div>
          </>
        )}

        {view === 'test' && (
          <div className="bg-[var(--ff-bg-layer)] rounded-lg p-6">
            <h3 className="heading-s text-white mb-4">Test Workflow</h3>
            <p className="text-[var(--ff-text-secondary)] mb-6">
              Test your workflow with sample data before activating it.
            </p>
            <button
              onClick={() => setShowTestPanel(true)}
              className="button-primary"
            >
              🧪 Open Test Panel
            </button>
          </div>
        )}

        {view === 'history' && (
          <ExecutionLogs
            workflowId={workflow?.id}
            workflowName={formData.name || 'New Workflow'}
          />
        )}
      </div>

      {/* Modals */}
      {showNodeEditor && selectedNode && (
        <NodeEditor
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onClose={() => {
            setShowNodeEditor(false);
            setSelectedNode(null);
          }}
        />
      )}

      {showTemplates && (
        <WorkflowTemplates
          onSelectTemplate={handleLoadTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showTestPanel && (
        <TestWorkflow
          workflowData={formData}
          onClose={() => setShowTestPanel(false)}
        />
      )}
    </div>
  );
}