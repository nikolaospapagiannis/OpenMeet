import React from 'react';

export function CanvasInstructions() {
  return (
    <div className="absolute top-4 right-4 z-10 text-xs text-[var(--ff-text-muted)] bg-[var(--ff-bg-layer)] px-3 py-2 rounded-md border border-[var(--ff-border)]">
      <div>Drag nodes to move</div>
      <div>Shift+Drag to connect</div>
      <div>Double-click to add node</div>
    </div>
  );
}