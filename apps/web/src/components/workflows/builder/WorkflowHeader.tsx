import React from 'react';

interface WorkflowHeaderProps {
  isEdit: boolean;
  view: 'builder' | 'test' | 'history';
  saving: boolean;
  onViewChange: (view: 'builder' | 'test' | 'history') => void;
  onShowTemplates: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function WorkflowHeader({
  isEdit,
  view,
  saving,
  onViewChange,
  onShowTemplates,
  onSave,
  onCancel
}: WorkflowHeaderProps) {
  return (
    <div className="bg-[var(--ff-bg-layer)] p-4 border-b border-[var(--ff-border)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="heading-s text-white">
            {isEdit ? 'Edit Workflow' : 'Create Workflow'}
          </h2>

          {/* View Tabs */}
          <div className="flex gap-1 bg-[var(--ff-bg-dark)] rounded-md p-1">
            <button
              onClick={() => onViewChange('builder')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                view === 'builder'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-[var(--ff-text-muted)] hover:text-white'
              }`}
            >
              Builder
            </button>
            <button
              onClick={() => onViewChange('test')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                view === 'test'
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'text-[var(--ff-text-muted)] hover:text-white'
              }`}
            >
              Test
            </button>
            <button
              onClick={() => onViewChange('history')}
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
            onClick={onShowTemplates}
            className="button-secondary"
          >
            📚 Templates
          </button>

          {/* Save/Cancel */}
          <button onClick={onCancel} className="button-secondary">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="button-primary"
          >
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'} Workflow
          </button>
        </div>
      </div>
    </div>
  );
}