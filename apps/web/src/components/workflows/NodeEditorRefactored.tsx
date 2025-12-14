'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WorkflowNode, NodeFieldConfig } from '@/types/workflow.types';
import {
  TRIGGER_CONFIGS,
  ACTION_CONFIGS,
  CONDITION_CONFIGS
} from '@/constants/workflow.constants';

// Form field components
import { TextField } from './editor/TextField';
import { SelectField } from './editor/SelectField';
import { CheckboxField } from './editor/CheckboxField';
import { TextAreaField } from './editor/TextAreaField';
import { NumberField } from './editor/NumberField';
import { MultiSelectField } from './editor/MultiSelectField';

interface NodeEditorProps {
  node: WorkflowNode | null;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeEditorRefactored({
  node,
  onUpdate,
  onDelete,
  onClose
}: NodeEditorProps) {
  const [formData, setFormData] = useState({
    label: '',
    subType: '',
    config: {} as Record<string, any>
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get configuration based on node type and subtype
  const nodeConfig = useMemo(() => {
    if (!node) return null;

    const configs = {
      trigger: TRIGGER_CONFIGS,
      action: ACTION_CONFIGS,
      condition: CONDITION_CONFIGS
    };

    const typeConfigs = configs[node.type];
    return typeConfigs?.[node.subType || ''] || null;
  }, [node]);

  // Get available subtypes for the node type
  const availableSubTypes = useMemo(() => {
    if (!node) return [];

    const configs = {
      trigger: TRIGGER_CONFIGS,
      action: ACTION_CONFIGS,
      condition: CONDITION_CONFIGS
    };

    return Object.keys(configs[node.type] || {});
  }, [node]);

  // Initialize form data when node changes
  useEffect(() => {
    if (node) {
      setFormData({
        label: node.data.label || '',
        subType: node.subType || '',
        config: node.data.config || {}
      });
      setErrors({});
    }
  }, [node]);

  // Field change handler
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [fieldName]: value
      }
    }));

    // Clear field error
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Subtype change handler
  const handleSubTypeChange = (subType: string) => {
    setFormData(prev => ({
      ...prev,
      subType,
      config: {} // Reset config when subtype changes
    }));
  };

  // Label change handler
  const handleLabelChange = (label: string) => {
    setFormData(prev => ({
      ...prev,
      label
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
    }

    if (!formData.subType && availableSubTypes.length > 0) {
      newErrors.subType = 'Please select a type';
    }

    // Validate required fields
    if (nodeConfig?.fields) {
      nodeConfig.fields.forEach(field => {
        if (field.required && !formData.config[field.name]) {
          newErrors[field.name] = `${field.label} is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save handler
  const handleSave = () => {
    if (!node || !validateForm()) return;

    const updatedData = {
      ...node.data,
      label: formData.label,
      config: formData.config
    };

    // Update node with subtype if changed
    if (formData.subType !== node.subType) {
      const updatedNode = {
        ...node,
        subType: formData.subType,
        data: updatedData
      };
      onUpdate(node.id, updatedNode.data);
    } else {
      onUpdate(node.id, updatedData);
    }

    onClose();
  };

  // Delete handler
  const handleDelete = () => {
    if (!node) return;

    if (confirm(`Delete node "${formData.label}"?`)) {
      onDelete(node.id);
      onClose();
    }
  };

  // Check if field should be shown based on conditions
  const shouldShowField = (field: NodeFieldConfig): boolean => {
    if (!field.condition) return true;

    const [conditionField, conditionValue] = field.condition.split(':');
    return formData.config[conditionField] === conditionValue;
  };

  // Render field based on type
  const renderField = (field: NodeFieldConfig) => {
    if (!shouldShowField(field)) return null;

    const value = formData.config[field.name] ?? field.default ?? '';
    const error = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'time':
        return (
          <TextField
            key={field.name}
            field={field}
            value={value}
            error={error}
            onChange={(val) => handleFieldChange(field.name, val)}
          />
        );

      case 'number':
        return (
          <NumberField
            key={field.name}
            field={field}
            value={value}
            error={error}
            onChange={(val) => handleFieldChange(field.name, val)}
          />
        );

      case 'select':
        return (
          <SelectField
            key={field.name}
            field={field}
            value={value}
            error={error}
            onChange={(val) => handleFieldChange(field.name, val)}
          />
        );

      case 'multiselect':
        return (
          <MultiSelectField
            key={field.name}
            field={field}
            value={value}
            error={error}
            onChange={(val) => handleFieldChange(field.name, val)}
          />
        );

      case 'checkbox':
        return (
          <CheckboxField
            key={field.name}
            field={field}
            value={value}
            onChange={(val) => handleFieldChange(field.name, val)}
          />
        );

      case 'textarea':
        return (
          <TextAreaField
            key={field.name}
            field={field}
            value={value}
            error={error}
            onChange={(val) => handleFieldChange(field.name, val)}
          />
        );

      default:
        return null;
    }
  };

  if (!node) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--ff-bg-layer)] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Edit {node.type.charAt(0).toUpperCase() + node.type.slice(1)} Node
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Label Field */}
          <div>
            <label className="block text-sm text-[var(--ff-text-secondary)] mb-1">
              Label *
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Node label..."
              className={`w-full px-3 py-2 bg-[var(--ff-bg-dark)] border ${
                errors.label ? 'border-red-500' : 'border-[var(--ff-border)]'
              } rounded-md text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]`}
            />
            {errors.label && (
              <p className="text-red-400 text-xs mt-1">{errors.label}</p>
            )}
          </div>

          {/* SubType Selector */}
          {availableSubTypes.length > 0 && (
            <div>
              <label className="block text-sm text-[var(--ff-text-secondary)] mb-1">
                Type *
              </label>
              <select
                value={formData.subType}
                onChange={(e) => handleSubTypeChange(e.target.value)}
                className={`w-full px-3 py-2 bg-[var(--ff-bg-dark)] border ${
                  errors.subType ? 'border-red-500' : 'border-[var(--ff-border)]'
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]`}
              >
                <option value="">Select type...</option>
                {availableSubTypes.map(subType => {
                  const config = {
                    trigger: TRIGGER_CONFIGS,
                    action: ACTION_CONFIGS,
                    condition: CONDITION_CONFIGS
                  }[node.type]?.[subType];
                  return (
                    <option key={subType} value={subType}>
                      {config?.name || subType}
                    </option>
                  );
                })}
              </select>
              {errors.subType && (
                <p className="text-red-400 text-xs mt-1">{errors.subType}</p>
              )}
            </div>
          )}

          {/* Configuration Fields */}
          {nodeConfig?.fields && (
            <div className="space-y-4 pt-2 border-t border-[var(--ff-border)]">
              <h4 className="text-sm font-medium text-[var(--ff-text-secondary)]">
                Configuration
              </h4>
              {nodeConfig.fields.map(field => renderField(field))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 mt-6">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors border border-red-500/20"
          >
            Delete Node
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--ff-bg-dark)] text-[var(--ff-text-secondary)] rounded-md hover:bg-[var(--ff-bg-dark)]/80 transition-colors border border-[var(--ff-border)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-md hover:bg-[var(--ff-purple-600)] transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}