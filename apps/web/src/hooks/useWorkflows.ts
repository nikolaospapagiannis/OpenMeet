import { useState, useEffect, useCallback } from 'react';

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

interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  executionCount?: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
}

interface UseWorkflowsReturn {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  selectedWorkflow: Workflow | null;
  executions: WorkflowExecution[];

  // Actions
  createWorkflow: (workflow: Partial<Workflow>) => Promise<Workflow>;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  toggleWorkflowStatus: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<Workflow>;
  testWorkflow: (workflow: Workflow) => Promise<any>;
  executeWorkflow: (id: string) => Promise<WorkflowExecution>;

  // Node operations
  addNode: (workflowId: string, node: Node) => void;
  updateNode: (workflowId: string, nodeId: string, updates: Partial<Node>) => void;
  deleteNode: (workflowId: string, nodeId: string) => void;

  // Edge operations
  addEdge: (workflowId: string, edge: Edge) => void;
  deleteEdge: (workflowId: string, edgeId: string) => void;

  // Selection
  selectWorkflow: (workflow: Workflow | null) => void;

  // Utility
  refreshWorkflows: () => Promise<void>;
  validateWorkflow: (workflow: Workflow) => { valid: boolean; errors: string[] };
  exportWorkflow: (id: string) => Promise<string>;
  importWorkflow: (data: string) => Promise<Workflow>;
}

export function useWorkflows(): UseWorkflowsReturn {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workflows', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }

      const data = await response.json();
      setWorkflows(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Create workflow
  const createWorkflow = async (workflow: Partial<Workflow>): Promise<Workflow> => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      const data = await response.json();
      const newWorkflow = data.data;

      setWorkflows(prev => [...prev, newWorkflow]);
      return newWorkflow;
    } catch (err) {
      console.error('Error creating workflow:', err);
      throw err;
    }
  };

  // Update workflow
  const updateWorkflow = async (id: string, updates: Partial<Workflow>): Promise<Workflow> => {
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }

      const data = await response.json();
      const updatedWorkflow = data.data;

      setWorkflows(prev => prev.map(w => w.id === id ? updatedWorkflow : w));

      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(updatedWorkflow);
      }

      return updatedWorkflow;
    } catch (err) {
      console.error('Error updating workflow:', err);
      throw err;
    }
  };

  // Delete workflow
  const deleteWorkflow = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      setWorkflows(prev => prev.filter(w => w.id !== id));

      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
      }
    } catch (err) {
      console.error('Error deleting workflow:', err);
      throw err;
    }
  };

  // Toggle workflow status
  const toggleWorkflowStatus = async (id: string): Promise<void> => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;

    await updateWorkflow(id, { isActive: !workflow.isActive });
  };

  // Duplicate workflow
  const duplicateWorkflow = async (id: string): Promise<Workflow> => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const duplicate = {
      ...workflow,
      id: undefined,
      name: `${workflow.name} (Copy)`,
      isActive: false,
    };

    return createWorkflow(duplicate);
  };

  // Test workflow
  const testWorkflow = async (workflow: Workflow): Promise<any> => {
    try {
      const response = await fetch('/api/workflows/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
        }),
      });

      if (!response.ok) {
        throw new Error('Test failed');
      }

      return response.json();
    } catch (err) {
      console.error('Error testing workflow:', err);
      throw err;
    }
  };

  // Execute workflow
  const executeWorkflow = async (id: string): Promise<WorkflowExecution> => {
    try {
      const response = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Execution failed');
      }

      const data = await response.json();
      const execution = data.data;

      setExecutions(prev => [execution, ...prev]);
      return execution;
    } catch (err) {
      console.error('Error executing workflow:', err);
      throw err;
    }
  };

  // Add node to workflow
  const addNode = (workflowId: string, node: Node) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        return {
          ...w,
          nodes: [...w.nodes, node],
        };
      }
      return w;
    }));

    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(prev => prev ? {
        ...prev,
        nodes: [...prev.nodes, node],
      } : null);
    }
  };

  // Update node in workflow
  const updateNode = (workflowId: string, nodeId: string, updates: Partial<Node>) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        return {
          ...w,
          nodes: w.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
        };
      }
      return w;
    }));

    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(prev => prev ? {
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
      } : null);
    }
  };

  // Delete node from workflow
  const deleteNode = (workflowId: string, nodeId: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        return {
          ...w,
          nodes: w.nodes.filter(n => n.id !== nodeId),
          edges: w.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
        };
      }
      return w;
    }));

    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(prev => prev ? {
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== nodeId),
        edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      } : null);
    }
  };

  // Add edge to workflow
  const addEdge = (workflowId: string, edge: Edge) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        // Check for duplicate edges
        const exists = w.edges.some(e =>
          e.source === edge.source && e.target === edge.target
        );
        if (exists) return w;

        return {
          ...w,
          edges: [...w.edges, edge],
        };
      }
      return w;
    }));

    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(prev => {
        if (!prev) return null;
        const exists = prev.edges.some(e =>
          e.source === edge.source && e.target === edge.target
        );
        if (exists) return prev;

        return {
          ...prev,
          edges: [...prev.edges, edge],
        };
      });
    }
  };

  // Delete edge from workflow
  const deleteEdge = (workflowId: string, edgeId: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        return {
          ...w,
          edges: w.edges.filter(e => e.id !== edgeId),
        };
      }
      return w;
    }));

    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(prev => prev ? {
        ...prev,
        edges: prev.edges.filter(e => e.id !== edgeId),
      } : null);
    }
  };

  // Select workflow
  const selectWorkflow = (workflow: Workflow | null) => {
    setSelectedWorkflow(workflow);
  };

  // Refresh workflows
  const refreshWorkflows = async () => {
    await fetchWorkflows();
  };

  // Validate workflow
  const validateWorkflow = (workflow: Workflow): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check for name
    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }

    // Check for at least one trigger
    const triggers = workflow.nodes.filter(n => n.type === 'trigger');
    if (triggers.length === 0) {
      errors.push('Workflow must have at least one trigger');
    }

    // Check for at least one action
    const actions = workflow.nodes.filter(n => n.type === 'action');
    if (actions.length === 0) {
      errors.push('Workflow must have at least one action');
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    workflow.edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const disconnectedNodes = workflow.nodes.filter(node =>
      !connectedNodeIds.has(node.id) && workflow.nodes.length > 1
    );

    if (disconnectedNodes.length > 0) {
      errors.push(`${disconnectedNodes.length} node(s) are not connected`);
    }

    // Check for cycles (simple check)
    const hasCycle = checkForCycles(workflow.nodes, workflow.edges);
    if (hasCycle) {
      errors.push('Workflow contains a cycle');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // Check for cycles in workflow
  const checkForCycles = (nodes: Node[], edges: Edge[]): boolean => {
    const adjacency: Record<string, string[]> = {};
    nodes.forEach(node => {
      adjacency[node.id] = [];
    });
    edges.forEach(edge => {
      adjacency[edge.source].push(edge.target);
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of adjacency[nodeId]) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycleDFS(node.id)) return true;
      }
    }

    return false;
  };

  // Export workflow
  const exportWorkflow = async (id: string): Promise<string> => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const exportData = {
      version: '1.0.0',
      workflow: {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  };

  // Import workflow
  const importWorkflow = async (data: string): Promise<Workflow> => {
    try {
      const importData = JSON.parse(data);

      if (!importData.workflow) {
        throw new Error('Invalid workflow data');
      }

      const workflow = {
        name: importData.workflow.name || 'Imported Workflow',
        description: importData.workflow.description || '',
        nodes: importData.workflow.nodes || [],
        edges: importData.workflow.edges || [],
        isActive: false,
      };

      return createWorkflow(workflow);
    } catch (err) {
      console.error('Error importing workflow:', err);
      throw new Error('Failed to import workflow: Invalid format');
    }
  };

  return {
    workflows,
    loading,
    error,
    selectedWorkflow,
    executions,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflowStatus,
    duplicateWorkflow,
    testWorkflow,
    executeWorkflow,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge,
    selectWorkflow,
    refreshWorkflows,
    validateWorkflow,
    exportWorkflow,
    importWorkflow,
  };
}