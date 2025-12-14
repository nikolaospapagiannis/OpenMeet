import React from 'react';
import { NodeFieldConfig } from '@/types/workflow.types';

interface TextAreaFieldProps {
  field: NodeFieldConfig;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function TextAreaField({ field, value, error, onChange }: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm text-[var(--ff-text-secondary)] mb-1">
        {field.label} {field.required && '*'}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={`w-full px-3 py-2 bg-[var(--ff-bg-dark)] border ${
          error ? 'border-red-500' : 'border-[var(--ff-border)]'
        } rounded-md text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)] resize-y`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}