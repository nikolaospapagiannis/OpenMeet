import React from 'react';

interface WorkflowStatsProps {
  statistics: {
    triggers: number;
    conditions: number;
    actions: number;
    connections: number;
    totalNodes: number;
  };
}

export function WorkflowStats({ statistics }: WorkflowStatsProps) {
  return (
    <div className="flex gap-4 mt-4 text-sm text-[var(--ff-text-secondary)]">
      <span>
        Triggers: {statistics.triggers}
      </span>
      <span>•</span>
      <span>
        Conditions: {statistics.conditions}
      </span>
      <span>•</span>
      <span>
        Actions: {statistics.actions}
      </span>
      <span>•</span>
      <span>
        Connections: {statistics.connections}
      </span>
      <span>•</span>
      <span>
        Total Nodes: {statistics.totalNodes}
      </span>
    </div>
  );
}