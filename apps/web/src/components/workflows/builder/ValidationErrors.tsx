import React from 'react';

interface ValidationErrorsProps {
  errors: string[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 mx-6 mt-4 p-4 rounded-lg">
      <h4 className="text-red-400 font-medium mb-2">Please fix the following issues:</h4>
      <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
}