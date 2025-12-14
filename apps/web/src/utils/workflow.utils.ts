import {
  WorkflowNode,
  WorkflowEdge,
  Position,
  NodeColorScheme,
  NodeType
} from '@/types/workflow.types';
import {
  TRIGGER_ICONS,
  ACTION_ICONS,
  CONDITION_ICON,
  DEFAULT_NODE_ICON,
  NODE_COLORS,
  SELECTED_NODE_COLORS,
  GRID_SNAP_SIZE
} from '@/constants/workflow.constants';

/**
 * Snap a position to the grid
 */
export function snapToGrid(position: Position, snapSize: number = GRID_SNAP_SIZE): Position {
  return {
    x: Math.round(position.x / snapSize) * snapSize,
    y: Math.round(position.y / snapSize) * snapSize
  };
}

/**
 * Get the appropriate icon for a node
 */
export function getNodeIcon(node: WorkflowNode): string {
  if (node.data.icon) return node.data.icon;

  if (node.type === 'trigger') {
    return TRIGGER_ICONS[node.subType || 'default'] || TRIGGER_ICONS.default;
  }

  if (node.type === 'action') {
    return ACTION_ICONS[node.subType || 'default'] || ACTION_ICONS.default;
  }

  if (node.type === 'condition') {
    return CONDITION_ICON;
  }

  return DEFAULT_NODE_ICON;
}

/**
 * Get node colors based on type and selection state
 */
export function getNodeColors(node: WorkflowNode): NodeColorScheme {
  const colorSet = node.selected ? SELECTED_NODE_COLORS : NODE_COLORS;
  return colorSet[node.type] || colorSet.action;
}

/**
 * Generate a Bezier curve path for edges
 */
export function generateEdgePath(
  source: Position,
  target: Position,
  nodeWidth: number = 200,
  nodeHeight: number = 60
): string {
  const x1 = source.x + nodeWidth;
  const y1 = source.y + nodeHeight / 2;
  const x2 = target.x;
  const y2 = target.y + nodeHeight / 2;

  // Control points for smooth curve
  const cx1 = x1 + Math.abs(x2 - x1) * 0.5;
  const cy1 = y1;
  const cx2 = x2 - Math.abs(x2 - x1) * 0.5;
  const cy2 = y2;

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

/**
 * Find connected nodes (for validation and flow analysis)
 */
export function findConnectedNodes(
  nodeId: string,
  edges: WorkflowEdge[],
  direction: 'source' | 'target' | 'both' = 'both'
): string[] {
  const connected: string[] = [];

  edges.forEach(edge => {
    if (direction !== 'target' && edge.source === nodeId) {
      connected.push(edge.target);
    }
    if (direction !== 'source' && edge.target === nodeId) {
      connected.push(edge.source);
    }
  });

  return connected;
}

/**
 * Validate workflow structure
 */
export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for at least one trigger
  const triggers = nodes.filter(n => n.type === 'trigger');
  if (triggers.length === 0) {
    errors.push('Workflow must have at least one trigger');
  }

  // Check for at least one action
  const actions = nodes.filter(n => n.type === 'action');
  if (actions.length === 0) {
    errors.push('Workflow must have at least one action');
  }

  // Check for orphaned nodes (not connected)
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
      errors.push(`Node "${node.data.label}" is not connected to the workflow`);
    }
  });

  // Check for circular dependencies
  if (hasCircularDependency(nodes, edges)) {
    errors.push('Workflow contains circular dependencies');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check for circular dependencies in workflow
 */
function hasCircularDependency(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) return true;
    }
  }

  return false;
}

/**
 * Auto-layout nodes in a workflow
 */
export function autoLayoutNodes(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  // Find starting nodes (triggers or nodes with no incoming edges)
  const startNodes = nodes.filter(node => {
    const hasIncoming = edges.some(edge => edge.target === node.id);
    return node.type === 'trigger' || !hasIncoming;
  });

  // BFS to assign levels
  const queue: { nodeId: string; level: number }[] = [];
  startNodes.forEach(node => {
    queue.push({ nodeId: node.id, level: 0 });
    levels.set(node.id, 0);
  });

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    outgoingEdges.forEach(edge => {
      const currentLevel = levels.get(edge.target) || Infinity;
      if (level + 1 < currentLevel) {
        levels.set(edge.target, level + 1);
        queue.push({ nodeId: edge.target, level: level + 1 });
      }
    });
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, WorkflowNode[]>();
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Position nodes
  const horizontalSpacing = 250;
  const verticalSpacing = 100;
  const updatedNodes: WorkflowNode[] = [];

  nodesByLevel.forEach((nodesAtLevel, level) => {
    const x = 100 + level * horizontalSpacing;
    nodesAtLevel.forEach((node, index) => {
      const y = 100 + index * verticalSpacing;
      updatedNodes.push({
        ...node,
        position: snapToGrid({ x, y })
      });
    });
  });

  return updatedNodes;
}

/**
 * Convert legacy workflow format to nodes and edges
 */
export function convertLegacyWorkflow(workflow: any): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  if (workflow?.nodes && workflow?.edges) {
    return { nodes: workflow.nodes, edges: workflow.edges };
  }

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let xPos = 100;

  // Add trigger node if exists
  if (workflow?.trigger) {
    nodes.push({
      id: 'trigger-1',
      type: 'trigger',
      subType: workflow.trigger,
      position: { x: xPos, y: 100 },
      data: {
        label: formatLabel(workflow.trigger),
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
        label: formatLabel(workflow.action),
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
}

/**
 * Format a snake_case or camelCase string to Title Case
 */
function formatLabel(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

/**
 * Generate a unique node ID
 */
export function generateNodeId(type: NodeType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique edge ID
 */
export function generateEdgeId(): string {
  return `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clone a workflow (for templates)
 */
export function cloneWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodeIdMap = new Map<string, string>();

  // Clone nodes with new IDs
  const clonedNodes = nodes.map(node => {
    const newId = generateNodeId(node.type);
    nodeIdMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      data: { ...node.data }
    };
  });

  // Clone edges with updated node references
  const clonedEdges = edges.map(edge => ({
    ...edge,
    id: generateEdgeId(),
    source: nodeIdMap.get(edge.source) || edge.source,
    target: nodeIdMap.get(edge.target) || edge.target
  }));

  return { nodes: clonedNodes, edges: clonedEdges };
}

/**
 * Calculate workflow complexity score
 */
export function calculateComplexity(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
  const nodeWeight = {
    trigger: 1,
    condition: 2,
    action: 1.5
  };

  const nodeScore = nodes.reduce((sum, node) =>
    sum + (nodeWeight[node.type] || 1), 0
  );

  const edgeScore = edges.length * 0.5;

  return Math.round(nodeScore + edgeScore);
}