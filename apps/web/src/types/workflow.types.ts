// Workflow Type Definitions

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  config?: Record<string, any>;
  icon?: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  subType?: string;
  position: Position;
  data: NodeData;
  selected?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface WorkflowFormData {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  timestamp: Date;
  status: ExecutionStatus;
  trigger: string;
  duration: number;
  steps: ExecutionStep[];
  error?: string;
}

export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  status: StepStatus;
  startTime: Date;
  endTime: Date;
  output?: any;
  error?: string;
}

export type NodeType = 'trigger' | 'action' | 'condition';
export type ExecutionStatus = 'success' | 'failed' | 'running' | 'pending';
export type StepStatus = 'completed' | 'failed' | 'skipped' | 'running';
export type ViewType = 'list' | 'builder' | 'history';

export interface NodeColorScheme {
  bg: string;
  border: string;
  text: string;
}

export interface NodeFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  default?: any;
  min?: number;
  max?: number;
  condition?: string;
}

export interface NodeTypeConfig {
  name: string;
  icon: string;
  fields: NodeFieldConfig[];
}

export interface CanvasViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragState {
  nodeId: string | null;
  offset: Position;
}

export interface ConnectionState {
  nodeId: string;
  handle: string;
}

export interface TempEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}