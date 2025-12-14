'use client';

import React from 'react';

interface ActionSelectorProps {
  selectedAction: string;
  actionConfig: any;
  onSelect: (action: string, config: any) => void;
}

const actions = [
  {
    id: 'send_email',
    name: 'Send Email',
    description: 'Send an automated email notification',
    icon: '📧',
    color: 'blue',
    config: {
      template: {
        label: 'Email Template',
        type: 'select',
        options: ['follow_up', 'meeting_summary', 'action_items', 'reminder', 'custom'],
      },
      recipients: {
        label: 'Recipients',
        type: 'multiselect',
        options: ['attendees', 'organizer', 'assignee', 'manager', 'custom'],
        placeholder: 'Select recipients or enter email addresses',
      },
      subject: {
        label: 'Subject Line',
        type: 'text',
        placeholder: 'Meeting Follow-up: {{meeting.title}}',
      },
      includeTranscript: {
        label: 'Include Transcript',
        type: 'checkbox',
      },
      includeActionItems: {
        label: 'Include Action Items',
        type: 'checkbox',
      },
    },
  },
  {
    id: 'send_sms',
    name: 'Send SMS',
    description: 'Send a text message notification',
    icon: '💬',
    color: 'green',
    config: {
      phoneNumbers: {
        label: 'Phone Numbers',
        type: 'text',
        placeholder: 'Enter phone numbers (comma separated)',
      },
      message: {
        label: 'Message Template',
        type: 'textarea',
        placeholder: 'Meeting {{meeting.title}} has ended. View summary: {{meeting.url}}',
      },
    },
  },
  {
    id: 'create_calendar_event',
    name: 'Create Calendar Event',
    description: 'Create a follow-up calendar event',
    icon: '📅',
    color: 'purple',
    config: {
      title: {
        label: 'Event Title',
        type: 'text',
        placeholder: 'Follow-up: {{meeting.title}}',
      },
      daysAfter: {
        label: 'Days After Trigger',
        type: 'number',
        placeholder: '7',
      },
      duration: {
        label: 'Duration (minutes)',
        type: 'number',
        placeholder: '30',
      },
      attendees: {
        label: 'Attendees',
        type: 'multiselect',
        options: ['same_as_original', 'organizer_only', 'custom'],
      },
      description: {
        label: 'Event Description',
        type: 'textarea',
        placeholder: 'Follow-up meeting for {{meeting.title}}',
      },
    },
  },
  {
    id: 'send_webhook',
    name: 'Send Webhook',
    description: 'Send data to an external webhook URL',
    icon: '🔗',
    color: 'orange',
    config: {
      url: {
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'https://your-webhook-endpoint.com',
      },
      method: {
        label: 'HTTP Method',
        type: 'select',
        options: ['POST', 'PUT', 'PATCH'],
      },
      headers: {
        label: 'Headers (JSON)',
        type: 'textarea',
        placeholder: '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN"}',
      },
      payload: {
        label: 'Payload Template',
        type: 'textarea',
        placeholder: '{\n  "meeting": "{{meeting.title}}",\n  "duration": {{meeting.duration}},\n  "attendees": {{meeting.attendees}}\n}',
      },
    },
  },
  {
    id: 'create_task',
    name: 'Create Task',
    description: 'Create a task in your task management system',
    icon: '✏️',
    color: 'teal',
    config: {
      title: {
        label: 'Task Title',
        type: 'text',
        placeholder: 'Review notes from {{meeting.title}}',
      },
      assignee: {
        label: 'Assign To',
        type: 'select',
        options: ['me', 'meeting_organizer', 'specific_user', 'team'],
      },
      priority: {
        label: 'Priority',
        type: 'select',
        options: ['low', 'medium', 'high', 'critical'],
      },
      dueInDays: {
        label: 'Due In (days)',
        type: 'number',
        placeholder: '3',
      },
      project: {
        label: 'Project',
        type: 'text',
        placeholder: 'Enter project name or ID',
      },
      description: {
        label: 'Task Description',
        type: 'textarea',
        placeholder: 'Review and follow up on action items from {{meeting.title}}',
      },
    },
  },
];

export function ActionSelector({ selectedAction, actionConfig, onSelect }: ActionSelectorProps) {
  const selectedActionData = actions.find(a => a.id === selectedAction);

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, string> = {
      blue: isSelected
        ? 'bg-blue-500/20 border-blue-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-blue-500/50',
      green: isSelected
        ? 'bg-green-500/20 border-green-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-green-500/50',
      purple: isSelected
        ? 'bg-purple-500/20 border-purple-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-purple-500/50',
      orange: isSelected
        ? 'bg-orange-500/20 border-orange-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-orange-500/50',
      teal: isSelected
        ? 'bg-teal-500/20 border-teal-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-teal-500/50',
    };
    return colors[color] || colors.blue;
  };

  const renderConfigField = (key: string, config: any) => {
    const value = actionConfig[key] || '';

    switch (config.type) {
      case 'select':
        return (
          <select
            value={value || config.options[0]}
            onChange={(e) =>
              onSelect(selectedAction, {
                ...actionConfig,
                [key]: e.target.value,
              })
            }
            className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          >
            {config.options.map((option: string) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              onSelect(selectedAction, {
                ...actionConfig,
                [key]: e.target.value,
              })
            }
            placeholder={config.placeholder || 'Enter comma-separated values'}
            className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) =>
              onSelect(selectedAction, {
                ...actionConfig,
                [key]: e.target.value,
              })
            }
            placeholder={config.placeholder}
            rows={4}
            className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)] resize-none font-mono text-sm"
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) =>
                onSelect(selectedAction, {
                  ...actionConfig,
                  [key]: e.target.checked,
                })
              }
              className="mr-2 w-4 h-4 text-[var(--ff-purple-500)] bg-[var(--ff-bg-layer)] border-[var(--ff-border)] rounded focus:ring-[var(--ff-purple-500)]"
            />
            <span className="text-white">Enable</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              onSelect(selectedAction, {
                ...actionConfig,
                [key]: e.target.value,
              })
            }
            placeholder={config.placeholder}
            className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              onSelect(selectedAction, {
                ...actionConfig,
                [key]: e.target.value,
              })
            }
            placeholder={config.placeholder}
            className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
          />
        );
    }
  };

  return (
    <div>
      <h2 className="heading-s mb-6">Select an Action</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {actions.map((action) => {
          const isSelected = selectedAction === action.id;
          return (
            <div
              key={action.id}
              onClick={() => onSelect(action.id, {})}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${getColorClasses(
                action.color,
                isSelected
              )}`}
            >
              <div className="flex items-start">
                <span className="text-3xl mr-3">{action.icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-white mb-1">{action.name}</h3>
                  <p className="text-sm text-[var(--ff-text-muted)]">
                    {action.description}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-green-400 text-xl">✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Options */}
      {selectedActionData && (
        <div className="bg-[var(--ff-bg-dark)] rounded-lg p-6">
          <h3 className="font-medium text-white mb-4">Configure {selectedActionData.name}</h3>
          <div className="space-y-4">
            {Object.entries(selectedActionData.config).map(([key, config]: [string, any]) => (
              <div key={key}>
                <label className="label-m text-[var(--ff-text-secondary)] block mb-2">
                  {config.label}
                </label>
                {renderConfigField(key, config)}
              </div>
            ))}
          </div>

          {/* Template Variables Help */}
          <div className="mt-6 p-4 bg-[var(--ff-bg-layer)] rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">📝 Available Variables</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-[var(--ff-text-muted)]">
              <div>• {'{{meeting.title}}'}</div>
              <div>• {'{{meeting.duration}}'}</div>
              <div>• {'{{meeting.attendees}}'}</div>
              <div>• {'{{meeting.organizer}}'}</div>
              <div>• {'{{meeting.url}}'}</div>
              <div>• {'{{meeting.date}}'}</div>
              <div>• {'{{action_items}}'}</div>
              <div>• {'{{transcript}}'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}