'use client';

import React, { useState, useCallback } from 'react';
import { useWorkflowState } from '@/hooks/useWorkflowState';
import { WorkflowCanvasRefactored } from './WorkflowCanvasRefactored';
import { NodeEditorRefactored } from './NodeEditorRefactored';
import { WorkflowTemplates } from './WorkflowTemplates';
import { TestWorkflow } from './TestWorkflow';
import { ExecutionLogs } from './ExecutionLogs';
import { WorkflowHeader } from './builder/WorkflowHeader';
import { WorkflowInfo } from './builder/WorkflowInfo';
import { WorkflowStats } from './builder/WorkflowStats';
import { ValidationErrors } from './builder/ValidationErrors';

interface WorkflowBuilderProps {
  workflow?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

type ViewMode = 'builder' | 'test' | 'history';

export function WorkflowBuilderRefactored({
  workflow,
  onSave,
  onCancel
}: WorkflowBuilderProps) {
  // State management
  const workflowState = useWorkflowState({ initialWorkflow: workflow });
  const [view, setView] = useState<ViewMode>('builder');
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Save workflow
  const handleSave = useCallback(async () => {
    // Clear previous errors
    workflowState.clearValidationErrors();

    // Validate workflow
    if (!workflowState.validate()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(workflowState.formData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [workflowState, onSave]);

  // Handle node selection
  const handleNodeSelect = useCallback((node: any) => {
    workflowState.selectNode(node);
    if (node) {
      setShowNodeEditor(true);
    }
  }, [workflowState]);

  // Handle node update
  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    workflowState.updateNode(nodeId, data);
  }, [workflowState]);

  // Handle node deletion
  const handleNodeDelete = useCallback((nodeId: string) => {
    workflowState.deleteNode(nodeId);
    setShowNodeEditor(false);
  }, [workflowState]);

  // Handle template selection
  const handleLoadTemplate = useCallback((template: any) => {
    workflowState.loadTemplate(template);
    setShowTemplates(false);
  }, [workflowState]);

  // Handle node addition
  const handleAddNode = useCallback((type: 'trigger' | 'action' | 'condition', position: any) => {
    const newNode = workflowState.addNode(type, position);
    setShowNodeEditor(true);
  }, [workflowState]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with controls */}
      <WorkflowHeader
        isEdit={!!workflow}
        view={view}
        saving={saving}
        onViewChange={setView}
        onShowTemplates={() => setShowTemplates(true)}
        onSave={handleSave}
        onCancel={onCancel}
      />

      {/* Workflow info inputs */}
      <WorkflowInfo
        name={workflowState.formData.name}
        description={workflowState.formData.description}
        isActive={workflowState.formData.isActive}
        onNameChange={workflowState.updateName}
        onDescriptionChange={workflowState.updateDescription}
        onActiveToggle={workflowState.toggleActive}
      />

      {/* Validation errors */}
      {workflowState.validationErrors.length > 0 && (
        <ValidationErrors errors={workflowState.validationErrors} />
      )}

      {/* Main content area */}
      <div className="flex-1 p-6 overflow-auto">
        {view === 'builder' && (
          <>
            {/* Workflow Canvas */}
            <WorkflowCanvasRefactored
              nodes={workflowState.formData.nodes}
              edges={workflowState.formData.edges}
              onNodesChange={workflowState.updateNodes}
              onEdgesChange={workflowState.updateEdges}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={workflowState.selectedNode?.id}
              onAddNode={handleAddNode}
            />

            {/* Workflow Statistics */}
            <WorkflowStats statistics={workflowState.getStatistics()} />
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
            workflowName={workflowState.formData.name || 'New Workflow'}
          />
        )}
      </div>

      {/* Modals */}
      {showNodeEditor && workflowState.selectedNode && (
        <NodeEditorRefactored
          node={workflowState.selectedNode}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
          onClose={() => {
            setShowNodeEditor(false);
            workflowState.selectNode(null);
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
          workflowData={workflowState.formData}
          onClose={() => setShowTestPanel(false)}
        />
      )}
    </div>
  );
}