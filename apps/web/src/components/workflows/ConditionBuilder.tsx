'use client';

import React from 'react';

interface Condition {
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

const availableFields = [
  { value: 'meeting.type', label: 'Meeting Type' },
  { value: 'meeting.duration', label: 'Meeting Duration' },
  { value: 'meeting.attendees_count', label: 'Number of Attendees' },
  { value: 'meeting.title', label: 'Meeting Title' },
  { value: 'action_item.priority', label: 'Action Item Priority' },
  { value: 'action_item.assignee', label: 'Action Item Assignee' },
  { value: 'task.status', label: 'Task Status' },
  { value: 'task.due_date', label: 'Task Due Date' },
  { value: 'user.department', label: 'User Department' },
  { value: 'user.role', label: 'User Role' },
];

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'in', label: 'In List' },
  { value: 'not_in', label: 'Not In List' },
];

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    onChange([
      ...conditions,
      {
        field: availableFields[0].value,
        operator: operators[0].value,
        value: '',
        logic: conditions.length > 0 ? 'AND' : undefined,
      },
    ]);
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    // Update logic for first condition if needed
    if (newConditions.length > 0 && index === 0) {
      newConditions[0] = { ...newConditions[0], logic: undefined };
    }
    onChange(newConditions);
  };

  return (
    <div>
      <h2 className="heading-s mb-6">Add Conditions (Optional)</h2>
      <p className="paragraph-m mb-6">
        Add conditions to filter when this workflow should run. Leave empty to run on all events.
      </p>

      {conditions.length === 0 ? (
        <div className="bg-[var(--ff-bg-dark)] rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-[var(--ff-text-muted)] mb-4">
            No conditions added yet. The workflow will run for all matching triggers.
          </p>
          <button onClick={addCondition} className="button-primary">
            Add First Condition
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {conditions.map((condition, index) => (
            <div key={index}>
              {index > 0 && (
                <div className="flex items-center mb-3">
                  <div className="flex-1 h-px bg-[var(--ff-border)]"></div>
                  <select
                    value={condition.logic}
                    onChange={(e) =>
                      updateCondition(index, { logic: e.target.value as 'AND' | 'OR' })
                    }
                    className="mx-4 px-3 py-1 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  <div className="flex-1 h-px bg-[var(--ff-border)]"></div>
                </div>
              )}

              <div className="bg-[var(--ff-bg-dark)] rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Field */}
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)] mb-1 block">
                      Field
                    </label>
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
                    >
                      {availableFields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operator */}
                  <div>
                    <label className="text-xs text-[var(--ff-text-muted)] mb-1 block">
                      Operator
                    </label>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Value */}
                  <div className="relative">
                    <label className="text-xs text-[var(--ff-text-muted)] mb-1 block">
                      Value
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder={
                          condition.operator === 'in' || condition.operator === 'not_in'
                            ? 'Comma separated values'
                            : 'Enter value'
                        }
                        className="flex-1 px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white text-sm placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
                      />
                      <button
                        onClick={() => removeCondition(index)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove condition"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button onClick={addCondition} className="button-secondary w-full">
            + Add Another Condition
          </button>
        </div>
      )}

      {/* Example */}
      <div className="mt-8 bg-[var(--ff-bg-dark)] rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-2">💡 Example Conditions</h4>
        <ul className="text-sm text-[var(--ff-text-muted)] space-y-1">
          <li>• Run only for client meetings: Meeting Type = "client_call"</li>
          <li>• High priority items only: Action Item Priority = "high"</li>
          <li>• Long meetings: Meeting Duration &gt; 60 (minutes)</li>
          <li>• Specific departments: User Department IN "sales,marketing"</li>
        </ul>
      </div>
    </div>
  );
}