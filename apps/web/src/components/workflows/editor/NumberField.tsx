import React from 'react';
import { NodeFieldConfig } from '@/types/workflow.types';

interface NumberFieldProps {
  field: NodeFieldConfig;
  value: number;
  error?: string;
  onChange: (value: number) => void;
}

export function NumberField({ field, value, error, onChange }: NumberFieldProps) {
  return (
    <div>
      <label className="block text-sm text-[var(--ff-text-secondary)] mb-1">
        {field.label} {field.required && '*'}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        className={`w-full px-3 py-2 bg-[var(--ff-bg-dark)] border ${
          error ? 'border-red-500' : 'border-[var(--ff-border)]'
        } rounded-md text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}