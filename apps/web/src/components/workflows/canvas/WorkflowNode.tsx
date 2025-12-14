import React, { memo } from 'react';
import { WorkflowNode } from '@/types/workflow.types';
import { getNodeIcon, getNodeColors } from '@/utils/workflow.utils';
import { NODE_WIDTH, NODE_HEIGHT, NODE_BORDER_RADIUS } from '@/constants/workflow.constants';

interface WorkflowNodeComponentProps {
  node: WorkflowNode;
  isSelected: boolean;
  isHovered: boolean;
  readonly: boolean;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onConnectionEnd: (nodeId: string) => void;
  onHover: (nodeId: string | null) => void;
}

export const WorkflowNodeComponent = memo(function WorkflowNodeComponent({
  node,
  isSelected,
  isHovered,
  readonly,
  onDragStart,
  onConnectionEnd,
  onHover
}: WorkflowNodeComponentProps) {
  const colors = getNodeColors({ ...node, selected: isSelected });
  const icon = getNodeIcon(node);

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={(e) => onDragStart(e, node.id)}
      onMouseUp={() => onConnectionEnd(node.id)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className="cursor-move transition-transform"
      style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
    >
      {/* Node shadow */}
      <rect
        x="2"
        y="2"
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={NODE_BORDER_RADIUS}
        fill="black"
        opacity="0.2"
      />

      {/* Node background */}
      <rect
        x="0"
        y="0"
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={NODE_BORDER_RADIUS}
        fill={colors.bg}
        stroke={isSelected ? 'var(--ff-purple-400)' : colors.border}
        strokeWidth={isSelected ? "3" : "2"}
        className="transition-all"
      />

      {/* Node icon */}
      <text
        x="30"
        y="35"
        fill={colors.text}
        fontSize="24"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {icon}
      </text>

      {/* Node label */}
      <text
        x="60"
        y="30"
        fill={colors.text}
        fontSize="14"
        fontWeight="500"
      >
        {node.data.label}
      </text>

      {/* Node type */}
      <text
        x="60"
        y="45"
        fill={colors.text}
        fontSize="12"
        opacity="0.8"
      >
        {node.type}
      </text>

      {/* Connection handles */}
      {!readonly && (
        <>
          {/* Input handle - shown for non-trigger nodes */}
          {node.type !== 'trigger' && (
            <circle
              cx="0"
              cy={NODE_HEIGHT / 2}
              r="6"
              fill="var(--ff-bg-layer)"
              stroke={colors.border}
              strokeWidth="2"
              className="cursor-crosshair"
            />
          )}

          {/* Output handle - shown for non-action nodes */}
          {node.type !== 'action' && (
            <circle
              cx={NODE_WIDTH}
              cy={NODE_HEIGHT / 2}
              r="6"
              fill="var(--ff-bg-layer)"
              stroke={colors.border}
              strokeWidth="2"
              className="cursor-crosshair"
            />
          )}
        </>
      )}
    </g>
  );
});