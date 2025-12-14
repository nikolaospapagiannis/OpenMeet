import React from 'react';
import { NodeFieldConfig } from '@/types/workflow.types';

interface MultiSelectFieldProps {
  field: NodeFieldConfig;
  value: string[];
  error?: string;
  onChange: (value: string[]) => void;
}

export function MultiSelectField({ field, value, error, onChange }: MultiSelectFieldProps) {
  const handleToggleOption = (option: string) => {
    const currentValues = Array.isArray(value) ? value : [];
    const newValues = currentValues.includes(option)
      ? currentValues.filter(v => v !== option)
      : [...currentValues, option];
    onChange(newValues);
  };

  const currentValues = Array.isArray(value) ? value : [];

  return (
    <div>
      <label className="block text-sm text-[var(--ff-text-secondary)] mb-2">
        {field.label} {field.required && '*'}
      </label>
      <div className="space-y-2">
        {field.options?.map(option => (
          <label
            key={option}
            className="flex items-center gap-2 cursor-pointer hover:bg-[var(--ff-bg-dark)] p-1 rounded"
          >
            <input
              type="checkbox"
              checked={currentValues.includes(option)}
              onChange={() => handleToggleOption(option)}
              className="w-4 h-4 text-[var(--ff-purple-500)] bg-[var(--ff-bg-dark)] border-[var(--ff-border)] rounded focus:ring-[var(--ff-purple-500)]"
            />
            <span className="text-sm text-[var(--ff-text-secondary)]">
              {option}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}