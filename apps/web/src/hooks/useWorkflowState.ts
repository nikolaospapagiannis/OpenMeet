import { useState, useCallback, useEffect } from 'react';
import {
  WorkflowNode,
  WorkflowEdge,
  WorkflowFormData,
  Position
} from '@/types/workflow.types';
import {
  convertLegacyWorkflow,
  generateNodeId,
  validateWorkflow
} from '@/utils/workflow.utils';

interface UseWorkflowStateProps {
  initialWorkflow?: any;
}

export function useWorkflowState({ initialWorkflow }: UseWorkflowStateProps) {
  const [formData, setFormData] = useState<WorkflowFormData>({
    name: initialWorkflow?.name || '',
    description: initialWorkflow?.description || '',
    nodes: [],
    edges: [],
    isActive: initialWorkflow?.isActive ?? true
  });

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize with legacy workflow or existing nodes/edges
  useEffect(() => {
    if (initialWorkflow) {
      const { nodes, edges } = convertLegacyWorkflow(initialWorkflow);
      setFormData(prev => ({
        ...prev,
        name: initialWorkflow.name || prev.name,
        description: initialWorkflow.description || prev.description,
        nodes,
        edges,
        isActive: initialWorkflow.isActive ?? prev.isActive
      }));
    }
  }, [initialWorkflow]);

  // Update workflow name
  const updateName = useCallback((name: string) => {
    setFormData(prev => ({ ...prev, name }));
  }, []);

  // Update workflow description
  const updateDescription = useCallback((description: string) => {
    setFormData(prev => ({ ...prev, description }));
  }, []);

  // Toggle workflow active state
  const toggleActive = useCallback(() => {
    setFormData(prev => ({ ...prev, isActive: !prev.isActive }));
  }, []);

  // Add a new node
  const addNode = useCallback((
    type: 'trigger' | 'action' | 'condition',
    position: Position,
    subType?: string,
    config?: any
  ) => {
    const newNode: WorkflowNode = {
      id: generateNodeId(type),
      type,
      subType,
      position,
      data: {
        label: `New ${type}`,
        config: config || {}
      }
    };

    setFormData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));

    // Auto-select new node
    setSelectedNode(newNode);

    return newNode;
  }, []);

  // Update nodes
  const updateNodes = useCallback((nodes: WorkflowNode[]) => {
    setFormData(prev => ({ ...prev, nodes }));
  }, []);

  // Update a specific node
  const updateNode = useCallback((nodeId: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, data } : node
      )
    }));
  }, []);

  // Delete a node
  const deleteNode = useCallback((nodeId: string) => {
    setFormData(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));

    // Clear selection if deleted node was selected
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  // Update edges
  const updateEdges = useCallback((edges: WorkflowEdge[]) => {
    setFormData(prev => ({ ...prev, edges }));
  }, []);

  // Add an edge
  const addEdge = useCallback((edge: WorkflowEdge) => {
    setFormData(prev => ({
      ...prev,
      edges: [...prev.edges, edge]
    }));
  }, []);

  // Delete an edge
  const deleteEdge = useCallback((edgeId: string) => {
    setFormData(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId)
    }));
  }, []);

  // Select a node
  const selectNode = useCallback((node: WorkflowNode | null) => {
    setSelectedNode(node);
  }, []);

  // Load from template
  const loadTemplate = useCallback((template: any) => {
    setFormData({
      name: template.name,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
      isActive: true
    });
    setSelectedNode(null);
  }, []);

  // Validate the workflow
  const validate = useCallback(() => {
    const { isValid, errors } = validateWorkflow(formData.nodes, formData.edges);

    // Add name validation
    if (!formData.name.trim()) {
      errors.unshift('Workflow name is required');
    }

    setValidationErrors(errors);
    return isValid && formData.name.trim().length > 0;
  }, [formData.nodes, formData.edges, formData.name]);

  // Clear validation errors
  const clearValidationErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  // Get workflow statistics
  const getStatistics = useCallback(() => {
    return {
      triggers: formData.nodes.filter(n => n.type === 'trigger').length,
      conditions: formData.nodes.filter(n => n.type === 'condition').length,
      actions: formData.nodes.filter(n => n.type === 'action').length,
      connections: formData.edges.length,
      totalNodes: formData.nodes.length
    };
  }, [formData.nodes, formData.edges]);

  return {
    formData,
    selectedNode,
    validationErrors,

    // Update methods
    updateName,
    updateDescription,
    toggleActive,

    // Node methods
    addNode,
    updateNodes,
    updateNode,
    deleteNode,
    selectNode,

    // Edge methods
    updateEdges,
    addEdge,
    deleteEdge,

    // Utility methods
    loadTemplate,
    validate,
    clearValidationErrors,
    getStatistics
  };
}