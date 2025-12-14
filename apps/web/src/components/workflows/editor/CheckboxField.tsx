import React from 'react';
import { NodeFieldConfig } from '@/types/workflow.types';

interface CheckboxFieldProps {
  field: NodeFieldConfig;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function CheckboxField({ field, value, onChange }: CheckboxFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={field.name}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-[var(--ff-purple-500)] bg-[var(--ff-bg-dark)] border-[var(--ff-border)] rounded focus:ring-[var(--ff-purple-500)]"
      />
      <label
        htmlFor={field.name}
        className="text-sm text-[var(--ff-text-secondary)] cursor-pointer"
      >
        {field.label}
      </label>
    </div>
  );
}