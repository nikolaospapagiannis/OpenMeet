'use client';

import React, { useState, useEffect } from 'react';
import { colorPresets, isValidHexColor, calculateContrast } from '@/lib/theme';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  showPresets?: boolean;
  showContrast?: boolean;
  contrastWith?: string;
  description?: string;
}

export function ColorPicker({
  label,
  value,
  onChange,
  showPresets = true,
  showContrast = false,
  contrastWith,
  description,
}: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const [contrast, setContrast] = useState<number | null>(null);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  useEffect(() => {
    if (showContrast && contrastWith && isValidHexColor(value) && isValidHexColor(contrastWith)) {
      const ratio = calculateContrast(value, contrastWith);
      setContrast(ratio);
    } else {
      setContrast(null);
    }
  }, [value, contrastWith, showContrast]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexInput(newValue);

    if (isValidHexColor(newValue)) {
      setIsValid(true);
      onChange(newValue);
    } else {
      setIsValid(false);
    }
  };

  const handlePresetClick = (color: string) => {
    setHexInput(color);
    setIsValid(true);
    onChange(color);
  };

  const getContrastLabel = (ratio: number): { text: string; className: string } => {
    if (ratio >= 7) {
      return { text: 'AAA', className: 'text-green-600 bg-green-100' };
    } else if (ratio >= 4.5) {
      return { text: 'AA', className: 'text-blue-600 bg-blue-100' };
    } else {
      return { text: 'Fail', className: 'text-red-600 bg-red-100' };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {contrast !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Contrast: {contrast.toFixed(2)}:1</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                getContrastLabel(contrast).className
              }`}
            >
              {getContrastLabel(contrast).text}
            </span>
          </div>
        )}
      </div>

      {description && <p className="text-xs text-gray-500">{description}</p>}

      <div className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              placeholder="#000000"
              className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${
                isValid
                  ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  : 'border-red-300 focus:border-red-500 focus:ring-red-500'
              }`}
            />
            {!isValid && (
              <p className="mt-1 text-xs text-red-600">Invalid hex color format</p>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => {
              const newColor = e.target.value.toUpperCase();
              setHexInput(newColor);
              setIsValid(true);
              onChange(newColor);
            }}
            className="w-16 h-10 rounded-md border border-gray-300 cursor-pointer"
          />
          <div
            className="absolute inset-0 rounded-md border-2 pointer-events-none"
            style={{ borderColor: value }}
          />
        </div>
      </div>

      {showPresets && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">Quick colors:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(colorPresets).map(([name, color]) => (
              <button
                key={name}
                onClick={() => handlePresetClick(color)}
                className="group relative"
                title={name}
              >
                <div
                  className="w-8 h-8 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: value === color ? '#000' : '#e5e7eb',
                  }}
                />
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
