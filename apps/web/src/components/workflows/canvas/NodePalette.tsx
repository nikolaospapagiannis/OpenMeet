import React from 'react';

interface NodePaletteProps {
  onAddNode: (type: 'trigger' | 'action' | 'condition') => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-[var(--ff-bg-layer)] p-2 rounded-lg border border-[var(--ff-border)]">
      <button
        onClick={() => onAddNode('trigger')}
        className="px-3 py-2 bg-[var(--ff-purple-500)] text-white rounded-md hover:bg-[var(--ff-purple-600)] transition-colors"
        title="Add Trigger"
      >
        ⚡ Trigger
      </button>
      <button
        onClick={() => onAddNode('condition')}
        className="px-3 py-2 bg-[var(--ff-green-500)] text-white rounded-md hover:bg-[var(--ff-green-600)] transition-colors"
        title="Add Condition"
      >
        🔀 Condition
      </button>
      <button
        onClick={() => onAddNode('action')}
        className="px-3 py-2 bg-[var(--ff-blue-500)] text-white rounded-md hover:bg-[var(--ff-blue-600)] transition-colors"
        title="Add Action"
      >
        🎯 Action
      </button>
    </div>
  );
}