'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Node {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  subType?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: any;
    icon?: string;
  };
  selected?: boolean;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
  selectedNodeId?: string;
  onAddNode?: (type: 'trigger' | 'action' | 'condition', position: { x: number; y: number }) => void;
  readonly?: boolean;
}

export function WorkflowCanvas({
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
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<{ nodeId: string; handle: string } | null>(null);
  const [tempEdge, setTempEdge] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [gridSnap, setGridSnap] = useState(true);
  const [snapSize] = useState(20);

  // Snap position to grid
  const snapToGrid = (position: { x: number; y: number }): { x: number; y: number } => {
    if (!gridSnap) return position;
    return {
      x: Math.round(position.x / snapSize) * snapSize,
      y: Math.round(position.y / snapSize) * snapSize
    };
  };

  // Get node icon based on type and subtype
  const getNodeIcon = (node: Node): string => {
    if (node.data.icon) return node.data.icon;

    if (node.type === 'trigger') {
      const triggerIcons: Record<string, string> = {
        meeting_completed: '🏁',
        keyword_detected: '🔍',
        schedule: '⏰',
        webhook: '🔗',
        email_received: '📧',
        form_submitted: '📝',
        api_call: '🔌',
        file_uploaded: '📤',
        default: '⚡'
      };
      return triggerIcons[node.subType || 'default'] || triggerIcons.default;
    }

    if (node.type === 'action') {
      const actionIcons: Record<string, string> = {
        send_email: '✉️',
        post_slack: '💬',
        update_crm: '📊',
        call_webhook: '🌐',
        create_task: '✅',
        send_sms: '📱',
        generate_report: '📈',
        update_database: '💾',
        trigger_workflow: '🔄',
        send_notification: '🔔',
        default: '🎯'
      };
      return actionIcons[node.subType || 'default'] || actionIcons.default;
    }

    if (node.type === 'condition') {
      return '🔀';
    }

    return '📦';
  };

  // Get node color based on type
  const getNodeColor = (node: Node): { bg: string; border: string; text: string } => {
    const colors = {
      trigger: {
        bg: node.selected ? 'var(--ff-purple-600)' : 'var(--ff-purple-500)',
        border: 'var(--ff-purple-400)',
        text: 'white'
      },
      action: {
        bg: node.selected ? 'var(--ff-blue-600)' : 'var(--ff-blue-500)',
        border: 'var(--ff-blue-400)',
        text: 'white'
      },
      condition: {
        bg: node.selected ? 'var(--ff-green-600)' : 'var(--ff-green-500)',
        border: 'var(--ff-green-400)',
        text: 'white'
      }
    };
    return colors[node.type] || colors.action;
  };

  // Handle mouse down on node
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (readonly) return;
    e.stopPropagation();

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (e.shiftKey) {
      // Start connection
      setConnecting({ nodeId, handle: 'output' });
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      setTempEdge({
        x1: node.position.x + 100,
        y1: node.position.y + 30,
        x2: e.clientX - rect.left,
        y2: e.clientY - rect.top
      });
    } else {
      // Start dragging
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setDraggedNode(nodeId);
        setDragOffset({
          x: e.clientX - rect.left - node.position.x,
          y: e.clientY - rect.top - node.position.y
        });
        onNodeSelect(node);
      }
    }
  };

  // Handle mouse up on node (for connections)
  const handleNodeMouseUp = (e: React.MouseEvent, nodeId: string) => {
    if (connecting && connecting.nodeId !== nodeId) {
      // Create new edge
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: connecting.nodeId,
        target: nodeId,
        sourceHandle: connecting.handle,
        targetHandle: 'input'
      };
      onEdgesChange([...edges, newEdge]);
    }
    setConnecting(null);
    setTempEdge(null);
  };

  // Handle canvas mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (draggedNode) {
      // Update node position with grid snapping
      const newPosition = snapToGrid({
        x: x - dragOffset.x,
        y: y - dragOffset.y
      });
      const updatedNodes = nodes.map(node =>
        node.id === draggedNode
          ? { ...node, position: newPosition }
          : node
      );
      onNodesChange(updatedNodes);
    } else if (isPanning) {
      // Pan view
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx / zoom,
        y: prev.y - dy / zoom
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (tempEdge) {
      // Update temp edge endpoint
      setTempEdge(prev => prev ? { ...prev, x2: x, y2: y } : null);
    }
  }, [draggedNode, isPanning, panStart, dragOffset, nodes, onNodesChange, zoom, tempEdge]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setIsPanning(false);
    setConnecting(null);
    setTempEdge(null);
  }, []);

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      onNodeSelect(null);
    }
  };

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(2, prev * delta)));
  }, []);

  // Handle edge click for deletion
  const handleEdgeClick = (edgeId: string) => {
    if (readonly) return;
    if (confirm('Delete this connection?')) {
      onEdgesChange(edges.filter(e => e.id !== edgeId));
    }
  };

  // Handle double click to add node
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (readonly || !onAddNode) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left + viewBox.x) / zoom;
    const y = (e.clientY - rect.top + viewBox.y) / zoom;

    // Show node type selector (simplified for now, defaults to action)
    onAddNode('action', { x, y });
  };

  // Render edge path
  const renderEdgePath = (edge: Edge): string => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return '';

    const x1 = sourceNode.position.x + 100;
    const y1 = sourceNode.position.y + 30;
    const x2 = targetNode.position.x;
    const y2 = targetNode.position.y + 30;

    // Bezier curve for smooth edges
    const cx1 = x1 + Math.abs(x2 - x1) * 0.5;
    const cy1 = y1;
    const cx2 = x2 - Math.abs(x2 - x1) * 0.5;
    const cy2 = y2;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  return (
    <div className="relative w-full h-[600px] bg-[var(--ff-bg-dark)] rounded-lg border border-[var(--ff-border)] overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setZoom(1)}
          className="px-3 py-1 bg-[var(--ff-bg-layer)] text-white rounded-md hover:bg-[var(--ff-bg-dark)] transition-colors border border-[var(--ff-border)]"
          title="Reset Zoom"
        >
          100%
        </button>
        <button
          onClick={() => setZoom(prev => Math.min(2, prev * 1.2))}
          className="px-3 py-1 bg-[var(--ff-bg-layer)] text-white rounded-md hover:bg-[var(--ff-bg-dark)] transition-colors border border-[var(--ff-border)]"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev / 1.2))}
          className="px-3 py-1 bg-[var(--ff-bg-layer)] text-white rounded-md hover:bg-[var(--ff-bg-dark)] transition-colors border border-[var(--ff-border)]"
          title="Zoom Out"
        >
          -
        </button>
        <div className="border-l border-[var(--ff-border)] mx-1"></div>
        <button
          onClick={() => setGridSnap(!gridSnap)}
          className={`px-3 py-1 ${gridSnap ? 'bg-[var(--ff-purple-500)]' : 'bg-[var(--ff-bg-layer)]'} text-white rounded-md hover:opacity-80 transition-all border border-[var(--ff-border)]`}
          title={gridSnap ? 'Disable Grid Snap' : 'Enable Grid Snap'}
        >
          {gridSnap ? '⊞' : '⊡'} Grid
        </button>
      </div>

      {/* Instructions */}
      {!readonly && (
        <div className="absolute top-4 right-4 z-10 text-xs text-[var(--ff-text-muted)] bg-[var(--ff-bg-layer)] px-3 py-2 rounded-md border border-[var(--ff-border)]">
          <div>Drag nodes to move</div>
          <div>Shift+Drag to connect</div>
          <div>Double-click to add node</div>
        </div>
      )}

      {/* Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleCanvasDoubleClick}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoom} ${viewBox.height / zoom}`}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="var(--ff-border)" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Render edges */}
        <g className="edges">
          {edges.map(edge => (
            <g key={edge.id}>
              <path
                d={renderEdgePath(edge)}
                stroke="var(--ff-border)"
                strokeWidth="2"
                fill="none"
                className="cursor-pointer hover:stroke-[var(--ff-purple-500)] transition-colors"
                onClick={() => handleEdgeClick(edge.id)}
              />
              {edge.label && (
                <text
                  x={(nodes.find(n => n.id === edge.source)?.position.x || 0) + 50}
                  y={(nodes.find(n => n.id === edge.source)?.position.y || 0) + 20}
                  fill="var(--ff-text-muted)"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          ))}

          {/* Temp edge while connecting */}
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

        {/* Render nodes */}
        <g className="nodes">
          {nodes.map(node => {
            const colors = getNodeColor(node);
            const isSelected = node.id === selectedNodeId;

            return (
              <g
                key={node.id}
                transform={`translate(${node.position.x}, ${node.position.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-move transition-transform"
                style={{ transform: hoveredNode === node.id ? 'scale(1.05)' : 'scale(1)' }}
              >
                {/* Node shadow */}
                <rect
                  x="2"
                  y="2"
                  width="200"
                  height="60"
                  rx="8"
                  fill="black"
                  opacity="0.2"
                />

                {/* Node background */}
                <rect
                  x="0"
                  y="0"
                  width="200"
                  height="60"
                  rx="8"
                  fill={colors.bg}
                  stroke={isSelected ? 'var(--ff-purple-400)' : colors.border}
                  strokeWidth={isSelected ? "3" : "2"}
                  className="transition-all"
                />

                {/* Node content */}
                <text
                  x="30"
                  y="35"
                  fill={colors.text}
                  fontSize="24"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {getNodeIcon(node)}
                </text>
                <text
                  x="60"
                  y="30"
                  fill={colors.text}
                  fontSize="14"
                  fontWeight="500"
                >
                  {node.data.label}
                </text>
                <text
                  x="60"
                  y="45"
                  fill={colors.text}
                  fontSize="12"
                  opacity="0.8"
                >
                  {node.type}
                </text>

                {/* Connection points */}
                {!readonly && (
                  <>
                    {/* Input handle */}
                    {node.type !== 'trigger' && (
                      <circle
                        cx="0"
                        cy="30"
                        r="6"
                        fill="var(--ff-bg-layer)"
                        stroke={colors.border}
                        strokeWidth="2"
                        className="cursor-crosshair"
                      />
                    )}
                    {/* Output handle */}
                    {node.type !== 'action' && (
                      <circle
                        cx="200"
                        cy="30"
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
          })}
        </g>
      </svg>

      {/* Node Palette */}
      {!readonly && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-[var(--ff-bg-layer)] p-2 rounded-lg border border-[var(--ff-border)]">
          <button
            onClick={() => onAddNode?.('trigger', { x: 100, y: 100 })}
            className="px-3 py-2 bg-[var(--ff-purple-500)] text-white rounded-md hover:bg-[var(--ff-purple-600)] transition-colors"
            title="Add Trigger"
          >
            ⚡ Trigger
          </button>
          <button
            onClick={() => onAddNode?.('condition', { x: 300, y: 100 })}
            className="px-3 py-2 bg-[var(--ff-green-500)] text-white rounded-md hover:bg-[var(--ff-green-600)] transition-colors"
            title="Add Condition"
          >
            🔀 Condition
          </button>
          <button
            onClick={() => onAddNode?.('action', { x: 500, y: 100 })}
            className="px-3 py-2 bg-[var(--ff-blue-500)] text-white rounded-md hover:bg-[var(--ff-blue-600)] transition-colors"
            title="Add Action"
          >
            🎯 Action
          </button>
        </div>
      )}
    </div>
  );
}