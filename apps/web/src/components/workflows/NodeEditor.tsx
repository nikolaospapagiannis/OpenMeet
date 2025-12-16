'use client';

import React, { useState, useEffect } from 'react';

interface NodeData {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  subType?: string;
  data: {
    label: string;
    config?: any;
    icon?: string;
  };
}

interface NodeEditorProps {
  node: NodeData | null;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

// Trigger configurations
const triggerConfigs: Record<string, any> = {
  meeting_completed: {
    name: 'Meeting Completed',
    icon: '🏁',
    fields: [
      { name: 'meetingType', label: 'Meeting Type', type: 'select', options: ['All', 'Team Meeting', 'Client Call', '1-on-1', 'Interview'] },
      { name: 'minDuration', label: 'Minimum Duration (min)', type: 'number', min: 0 },
      { name: 'participantFilter', label: 'Participant Filter', type: 'text', placeholder: 'e.g., @company.com' }
    ]
  },
  keyword_detected: {
    name: 'Keyword Detected',
    icon: '🔍',
    fields: [
      { name: 'keywords', label: 'Keywords (comma separated)', type: 'text', required: true },
      { name: 'matchType', label: 'Match Type', type: 'select', options: ['Any', 'All', 'Exact', 'Regex'], default: 'Any' },
      { name: 'caseSensitive', label: 'Case Sensitive', type: 'checkbox', default: false },
      { name: 'contextWindow', label: 'Context Window (words)', type: 'number', min: 0, default: 10 }
    ]
  },
  schedule: {
    name: 'Scheduled',
    icon: '⏰',
    fields: [
      { name: 'frequency', label: 'Frequency', type: 'select', options: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'], required: true },
      { name: 'time', label: 'Time', type: 'time', required: true },
      { name: 'timezone', label: 'Timezone', type: 'select', options: ['UTC', 'EST', 'PST', 'CST', 'GMT', 'CET'], default: 'UTC' },
      { name: 'daysOfWeek', label: 'Days (for weekly)', type: 'multiselect', options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      { name: 'cronExpression', label: 'Cron Expression', type: 'text', placeholder: '0 0 * * *', condition: 'frequency:Custom' }
    ]
  },
  webhook: {
    name: 'Webhook Received',
    icon: '🔗',
    fields: [
      { name: 'webhookId', label: 'Webhook ID', type: 'text', required: true, placeholder: 'unique-webhook-id' },
      { name: 'validatePayload', label: 'Validate Payload', type: 'checkbox', default: true },
      { name: 'expectedHeaders', label: 'Expected Headers (JSON)', type: 'textarea', placeholder: '{"X-Signature": "required"}' },
      { name: 'authType', label: 'Authentication Type', type: 'select', options: ['None', 'Bearer Token', 'API Key', 'HMAC'], default: 'None' }
    ]
  },
  email_received: {
    name: 'Email Received',
    icon: '📧',
    fields: [
      { name: 'fromFilter', label: 'From Address Filter', type: 'text', placeholder: '*@example.com' },
      { name: 'subjectFilter', label: 'Subject Filter', type: 'text', placeholder: 'Contains text...' },
      { name: 'hasAttachment', label: 'Has Attachment', type: 'checkbox', default: false },
      { name: 'folder', label: 'Email Folder', type: 'select', options: ['Inbox', 'Sent', 'Drafts', 'Spam', 'All'], default: 'Inbox' }
    ]
  },
  form_submitted: {
    name: 'Form Submitted',
    icon: '📝',
    fields: [
      { name: 'formId', label: 'Form ID', type: 'text', required: true },
      { name: 'requiredFields', label: 'Required Fields (comma separated)', type: 'text' },
      { name: 'submitAction', label: 'Submit Action', type: 'select', options: ['Store', 'Process', 'Forward'], default: 'Store' }
    ]
  }
};

// Action configurations
const actionConfigs: Record<string, any> = {
  send_email: {
    name: 'Send Email',
    icon: '✉️',
    fields: [
      { name: 'recipients', label: 'Recipients', type: 'text', required: true, placeholder: 'email@example.com, ...' },
      { name: 'subject', label: 'Subject', type: 'text', required: true },
      { name: 'template', label: 'Email Template', type: 'select', options: ['Summary', 'Action Items', 'Follow-up', 'Custom'], default: 'Summary' },
      { name: 'customBody', label: 'Custom Body', type: 'textarea', condition: 'template:Custom' },
      { name: 'attachTranscript', label: 'Attach Transcript', type: 'checkbox', default: false }
    ]
  },
  post_slack: {
    name: 'Post to Slack',
    icon: '💬',
    fields: [
      { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#channel-name' },
      { name: 'message', label: 'Message Template', type: 'textarea', required: true },
      { name: 'mentionUsers', label: 'Mention Users', type: 'checkbox', default: false },
      { name: 'includeLink', label: 'Include Meeting Link', type: 'checkbox', default: true }
    ]
  },
  update_crm: {
    name: 'Update CRM',
    icon: '📊',
    fields: [
      { name: 'crmSystem', label: 'CRM System', type: 'select', options: ['Salesforce', 'HubSpot', 'Pipedrive'], required: true },
      { name: 'recordType', label: 'Record Type', type: 'select', options: ['Contact', 'Deal', 'Activity'], default: 'Activity' },
      { name: 'recordId', label: 'Record ID', type: 'text', placeholder: 'Leave empty to auto-detect' },
      { name: 'fields', label: 'Fields to Update (JSON)', type: 'textarea', placeholder: '{"status": "completed", "notes": "{{summary}}"}' }
    ]
  },
  call_webhook: {
    name: 'Call Webhook',
    icon: '🌐',
    fields: [
      { name: 'url', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://...' },
      { name: 'method', label: 'HTTP Method', type: 'select', options: ['POST', 'PUT', 'PATCH'], default: 'POST' },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
      { name: 'payload', label: 'Payload Template', type: 'textarea', required: true },
      { name: 'retryOnFailure', label: 'Retry on Failure', type: 'checkbox', default: true }
    ]
  },
  create_task: {
    name: 'Create Task',
    icon: '✅',
    fields: [
      { name: 'taskSystem', label: 'Task System', type: 'select', options: ['Jira', 'Asana', 'Trello', 'GitHub'], required: true },
      { name: 'project', label: 'Project/Board', type: 'text', required: true },
      { name: 'title', label: 'Task Title', type: 'text', required: true },
      { name: 'description', label: 'Description Template', type: 'textarea' },
      { name: 'assignTo', label: 'Assign To', type: 'text', placeholder: 'username or email' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' }
    ]
  }
};

// Condition configurations
interface ConditionType {
  name: string;
  operators: string[];
  valueType: string;
  unit?: string;
  options?: string[];
}

const conditionTypes: Record<string, ConditionType> = {
  participant_count: {
    name: 'Participant Count',
    operators: ['equals', 'greater_than', 'less_than', 'between'],
    valueType: 'number'
  },
  meeting_duration: {
    name: 'Meeting Duration',
    operators: ['greater_than', 'less_than', 'between'],
    valueType: 'number',
    unit: 'minutes'
  },
  keyword_present: {
    name: 'Keyword Present',
    operators: ['contains', 'not_contains', 'matches_regex'],
    valueType: 'text'
  },
  sentiment: {
    name: 'Sentiment Score',
    operators: ['positive', 'negative', 'neutral', 'above_threshold', 'below_threshold'],
    valueType: 'number'
  },
  time_of_day: {
    name: 'Time of Day',
    operators: ['before', 'after', 'between'],
    valueType: 'time'
  },
  day_of_week: {
    name: 'Day of Week',
    operators: ['is', 'is_not', 'is_weekend', 'is_weekday'],
    valueType: 'select',
    options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }
};

export function NodeEditor({ node, onUpdate, onDelete, onClose }: NodeEditorProps) {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (node) {
      setFormData(node.data.config || {});
    }
  }, [node]);

  if (!node) {
    return null;
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let fields: any[] = [];

    if (node.type === 'trigger' && node.subType) {
      fields = triggerConfigs[node.subType]?.fields || [];
    } else if (node.type === 'action' && node.subType) {
      fields = actionConfigs[node.subType]?.fields || [];
    }

    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onUpdate(node.id, {
        ...node.data,
        config: formData
      });
      onClose();
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.name] || field.default || '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value))}
            min={field.min}
            max={field.max}
            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)] resize-none"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          >
            <option value="">Select...</option>
            {field.options.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options.map((option: string) => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(value as string[])?.includes(option) || false}
                  onChange={(e) => {
                    const currentValues = value as string[] || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v) => v !== option);
                    handleFieldChange(field.name, newValues);
                  }}
                  className="mr-2"
                />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="mr-2"
            />
            <span className="text-white">{field.label}</span>
          </label>
        );

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        );

      default:
        return null;
    }
  };

  const getNodeConfig = () => {
    if (node.type === 'trigger' && node.subType) {
      return triggerConfigs[node.subType];
    }
    if (node.type === 'action' && node.subType) {
      return actionConfigs[node.subType];
    }
    return null;
  };

  const config = getNodeConfig();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--ff-bg-layer)] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="heading-s text-white">
            {config?.icon} {config?.name || 'Edit Node'}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Node Type Badge */}
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            node.type === 'trigger' ? 'bg-[var(--ff-purple-500)] text-white' :
            node.type === 'action' ? 'bg-[var(--ff-blue-500)] text-white' :
            'bg-[var(--ff-green-500)] text-white'
          }`}>
            {node.type.toUpperCase()}
          </span>
        </div>

        {/* Form Fields */}
        {node.type === 'condition' ? (
          <div className="space-y-4">
            <div>
              <label className="label-m text-[var(--ff-text-secondary)] block mb-2">
                Condition Type
              </label>
              <select
                value={formData.conditionType || ''}
                onChange={(e) => handleFieldChange('conditionType', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
              >
                <option value="">Select condition...</option>
                {Object.entries(conditionTypes).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.conditionType && (
              (() => {
                const currentCondition = conditionTypes[formData.conditionType as keyof typeof conditionTypes];
                return (
                  <>
                    <div>
                      <label className="label-m text-[var(--ff-text-secondary)] block mb-2">
                        Operator
                      </label>
                      <select
                        value={formData.operator || ''}
                        onChange={(e) => handleFieldChange('operator', e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
                      >
                        <option value="">Select operator...</option>
                        {currentCondition.operators.map((op: string) => (
                          <option key={op} value={op}>
                            {op.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.operator && !['is_weekend', 'is_weekday'].includes(formData.operator) && (
                      <div>
                        <label className="label-m text-[var(--ff-text-secondary)] block mb-2">
                          Value {currentCondition.unit && `(${currentCondition.unit})`}
                        </label>
                        {currentCondition.valueType === 'select' ? (
                          <select
                            value={formData.value || ''}
                            onChange={(e) => handleFieldChange('value', e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
                          >
                            <option value="">Select...</option>
                            {currentCondition.options?.map((option: string) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={currentCondition.valueType}
                            value={formData.value || ''}
                            onChange={(e) => handleFieldChange('value', e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
                          />
                        )}
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {config?.fields?.map((field: any) => (
              <div key={field.name}>
                {field.type !== 'checkbox' && (
                  <label className="label-m text-[var(--ff-text-secondary)] block mb-2">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                )}
                {renderField(field)}
                {errors[field.name] && (
                  <p className="text-red-400 text-sm mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => {
              if (confirm('Delete this node?')) {
                onDelete(node.id);
                onClose();
              }
            }}
            className="px-4 py-2 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
          >
            Delete Node
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="button-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="button-primary"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}