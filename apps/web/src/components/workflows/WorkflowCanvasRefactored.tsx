'use client';

import React, { useState, useRef, useCallback, memo } from 'react';
import {
  WorkflowNode,
  WorkflowEdge,
  Position,
  CanvasViewBox,
  DragState,
  ConnectionState,
  TempEdge
} from '@/types/workflow.types';
import {
  snapToGrid,
  getNodeIcon,
  getNodeColors,
  generateEdgePath,
  generateNodeId,
  generateEdgeId
} from '@/utils/workflow.utils';
import {
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_BORDER_RADIUS,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  GRID_SNAP_SIZE
} from '@/constants/workflow.constants';

// Sub-components
import { CanvasToolbar } from './canvas/CanvasToolbar';
import { CanvasInstructions } from './canvas/CanvasInstructions';
import { NodePalette } from './canvas/NodePalette';
import { WorkflowNodeComponent } from './canvas/WorkflowNode';
import { WorkflowEdgeComponent } from './canvas/WorkflowEdge';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onNodeSelect: (node: WorkflowNode | null) => void;
  selectedNodeId?: string;
  onAddNode?: (type: 'trigger' | 'action' | 'condition', position: Position) => void;
  readonly?: boolean;
}

export const WorkflowCanvasRefactored = memo(function WorkflowCanvasRefactored({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  selectedNodeId,
  onAddNode,
  readonly = false
}: WorkflowCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // View state
  const [viewBox, setViewBox] = useState<CanvasViewBox>({
    x: 0,
    y: 0,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT
  });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [gridSnap, setGridSnap] = useState(true);

  // Interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState>({ nodeId: null, offset: { x: 0, y: 0 } });
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [tempEdge, setTempEdge] = useState<TempEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev * ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev / ZOOM_STEP));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  // Grid snap handler
  const handleToggleGridSnap = useCallback(() => {
    setGridSnap(prev => !prev);
  }, []);

  // Node position update
  const updateNodePosition = useCallback((nodeId: string, position: Position) => {
    const snappedPosition = gridSnap ? snapToGrid(position, GRID_SNAP_SIZE) : position;
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, position: snappedPosition } : node
    );
    onNodesChange(updatedNodes);
  }, [nodes, onNodesChange, gridSnap]);

  // Node drag start
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readonly) return;
    e.stopPropagation();

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (e.shiftKey) {
      // Start connection mode
      setConnectionState({ nodeId, handle: 'output' });
      setTempEdge({
        x1: node.position.x + NODE_WIDTH,
        y1: node.position.y + NODE_HEIGHT / 2,
        x2: e.clientX,
        y2: e.clientY
      });
    } else {
      // Start drag mode
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setDragState({
          nodeId,
          offset: {
            x: (e.clientX - rect.left) / zoom - node.position.x,
            y: (e.clientY - rect.top) / zoom - node.position.y
          }
        });
        onNodeSelect(node);
      }
    }
  }, [nodes, readonly, zoom, onNodeSelect]);

  // Node connection complete
  const handleNodeConnectionEnd = useCallback((nodeId: string) => {
    if (!connectionState || connectionState.nodeId === nodeId) {
      setConnectionState(null);
      setTempEdge(null);
      return;
    }

    // Create new edge
    const newEdge: WorkflowEdge = {
      id: generateEdgeId(),
      source: connectionState.nodeId,
      target: nodeId,
      sourceHandle: connectionState.handle,
      targetHandle: 'input'
    };

    onEdgesChange([...edges, newEdge]);
    setConnectionState(null);
    setTempEdge(null);
  }, [connectionState, edges, onEdgesChange]);

  // Canvas mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left) / zoom;
    const canvasY = (e.clientY - rect.top) / zoom;

    if (dragState.nodeId) {
      // Update dragged node position
      updateNodePosition(dragState.nodeId, {
        x: canvasX - dragState.offset.x,
        y: canvasY - dragState.offset.y
      });
    } else if (isPanning) {
      // Pan the canvas
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx / zoom,
        y: prev.y - dy / zoom
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (tempEdge) {
      // Update temporary edge endpoint
      setTempEdge(prev => prev ? { ...prev, x2: canvasX, y2: canvasY } : null);
    }
  }, [dragState, isPanning, panStart, zoom, tempEdge, updateNodePosition]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setDragState({ nodeId: null, offset: { x: 0, y: 0 } });
    setIsPanning(false);
    setConnectionState(null);
    setTempEdge(null);
  }, []);

  // Canvas pan start
  const handleCanvasPanStart = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * delta)));
  }, []);

  // Edge deletion
  const handleEdgeDelete = useCallback((edgeId: string) => {
    if (readonly) return;
    if (confirm('Delete this connection?')) {
      onEdgesChange(edges.filter(e => e.id !== edgeId));
    }
  }, [readonly, edges, onEdgesChange]);

  // Double-click to add node
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readonly || !onAddNode) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const position = {
      x: (e.clientX - rect.left + viewBox.x) / zoom,
      y: (e.clientY - rect.top + viewBox.y) / zoom
    };

    // Default to adding an action node
    onAddNode('action', position);
  }, [readonly, onAddNode, viewBox, zoom]);

  // Quick add node handlers
  const handleQuickAddNode = useCallback((type: 'trigger' | 'action' | 'condition') => {
    if (!onAddNode) return;

    // Calculate position based on existing nodes
    const baseX = 100 + nodes.length * 150;
    const baseY = 100;

    onAddNode(type, { x: baseX, y: baseY });
  }, [onAddNode, nodes.length]);

  return (
    <div className="relative w-full h-[600px] bg-[var(--ff-bg-dark)] rounded-lg border border-[var(--ff-border)] overflow-hidden">
      <CanvasToolbar
        zoom={zoom}
        gridSnap={gridSnap}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onToggleGridSnap={handleToggleGridSnap}
      />

      {!readonly && <CanvasInstructions />}

      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasPanStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleCanvasDoubleClick}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoom} ${viewBox.height / zoom}`}
      >
        {/* Grid Pattern */}
        <defs>
          <pattern id="grid" width={GRID_SNAP_SIZE} height={GRID_SNAP_SIZE} patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="var(--ff-border)" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Edges Layer */}
        <g className="edges-layer">
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (!sourceNode || !targetNode) return null;

            return (
              <WorkflowEdgeComponent
                key={edge.id}
                edge={edge}
                sourcePosition={sourceNode.position}
                targetPosition={targetNode.position}
                onDelete={handleEdgeDelete}
              />
            );
          })}

          {/* Temporary edge while connecting */}
          {tempEdge && (
            <line
              x1={tempEdge.x1}
              y1={tempEdge.y1}
              x2={tempEdge.x2}
              y2={tempEdge.y2}
              stroke="var(--ff-purple-500)"
              strokeWidth="2"
              strokeDasharray="5,5"
              pointerEvents="none"
            />
          )}
        </g>

        {/* Nodes Layer */}
        <g className="nodes-layer">
          {nodes.map(node => (
            <WorkflowNodeComponent
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              isHovered={node.id === hoveredNode}
              readonly={readonly}
              onDragStart={handleNodeDragStart}
              onConnectionEnd={handleNodeConnectionEnd}
              onHover={setHoveredNode}
            />
          ))}
        </g>
      </svg>

      {!readonly && (
        <NodePalette onAddNode={handleQuickAddNode} />
      )}
    </div>
  );
});