import React from 'react';
import { NodeFieldConfig } from '@/types/workflow.types';

interface SelectFieldProps {
  field: NodeFieldConfig;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function SelectField({ field, value, error, onChange }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm text-[var(--ff-text-secondary)] mb-1">
        {field.label} {field.required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 bg-[var(--ff-bg-dark)] border ${
          error ? 'border-red-500' : 'border-[var(--ff-border)]'
        } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]`}
      >
        <option value="">Select {field.label}...</option>
        {field.options?.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}