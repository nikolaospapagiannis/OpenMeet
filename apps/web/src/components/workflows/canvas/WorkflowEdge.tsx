import React, { memo } from 'react';
import { WorkflowEdge, Position } from '@/types/workflow.types';
import { generateEdgePath } from '@/utils/workflow.utils';

interface WorkflowEdgeComponentProps {
  edge: WorkflowEdge;
  sourcePosition: Position;
  targetPosition: Position;
  onDelete: (edgeId: string) => void;
}

export const WorkflowEdgeComponent = memo(function WorkflowEdgeComponent({
  edge,
  sourcePosition,
  targetPosition,
  onDelete
}: WorkflowEdgeComponentProps) {
  const path = generateEdgePath(sourcePosition, targetPosition);

  return (
    <g>
      {/* Edge path */}
      <path
        d={path}
        stroke="var(--ff-border)"
        strokeWidth="2"
        fill="none"
        className="cursor-pointer hover:stroke-[var(--ff-purple-500)] transition-colors"
        onClick={() => onDelete(edge.id)}
      />

      {/* Edge label */}
      {edge.label && (
        <text
          x={sourcePosition.x + (targetPosition.x - sourcePosition.x) / 2}
          y={sourcePosition.y + (targetPosition.y - sourcePosition.y) / 2 - 10}
          fill="var(--ff-text-muted)"
          fontSize="12"
          textAnchor="middle"
        >
          {edge.label}
        </text>
      )}
    </g>
  );
});