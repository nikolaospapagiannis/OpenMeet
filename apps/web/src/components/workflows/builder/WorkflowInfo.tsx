import React from 'react';

interface WorkflowInfoProps {
  name: string;
  description: string;
  isActive: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onActiveToggle: () => void;
}

export function WorkflowInfo({
  name,
  description,
  isActive,
  onNameChange,
  onDescriptionChange,
  onActiveToggle
}: WorkflowInfoProps) {
  return (
    <div className="bg-[var(--ff-bg-layer)] px-6 py-4 border-b border-[var(--ff-border)]">
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Workflow name..."
            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--ff-text-secondary)]">Active:</label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={onActiveToggle}
            className="w-5 h-5"
          />
        </div>
      </div>
    </div>
  );
}