import React from 'react';

interface CanvasToolbarProps {
  zoom: number;
  gridSnap: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleGridSnap: () => void;
}

export function CanvasToolbar({
  zoom,
  gridSnap,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleGridSnap
}: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2">
      <button
        onClick={onZoomReset}
        className="px-3 py-1 bg-[var(--ff-bg-layer)] text-white rounded-md hover:bg-[var(--ff-bg-dark)] transition-colors border border-[var(--ff-border)]"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="px-3 py-1 bg-[var(--ff-bg-layer)] text-white rounded-md hover:bg-[var(--ff-bg-dark)] transition-colors border border-[var(--ff-border)]"
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className="px-3 py-1 bg-[var(--ff-bg-layer)] text-white rounded-md hover:bg-[var(--ff-bg-dark)] transition-colors border border-[var(--ff-border)]"
        title="Zoom Out"
      >
        -
      </button>
      <div className="border-l border-[var(--ff-border)] mx-1"></div>
      <button
        onClick={onToggleGridSnap}
        className={`px-3 py-1 ${
          gridSnap ? 'bg-[var(--ff-purple-500)]' : 'bg-[var(--ff-bg-layer)]'
        } text-white rounded-md hover:opacity-80 transition-all border border-[var(--ff-border)]`}
        title={gridSnap ? 'Disable Grid Snap' : 'Enable Grid Snap'}
      >
        {gridSnap ? '⊞' : '⊡'} Grid
      </button>
    </div>
  );
}