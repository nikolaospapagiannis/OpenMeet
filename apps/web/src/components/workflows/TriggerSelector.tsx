'use client';

import React from 'react';

interface TriggerSelectorProps {
  selectedTrigger: string;
  triggerConfig: any;
  onSelect: (trigger: string, config: any) => void;
}

const triggers = [
  {
    id: 'meeting_end',
    name: 'Meeting End',
    description: 'Triggered when a meeting ends',
    icon: '🏁',
    color: 'blue',
    config: {
      meetingType: {
        label: 'Meeting Type Filter',
        type: 'select',
        options: ['all', 'one_on_one', 'team_meeting', 'client_call', 'interview'],
      },
      minimumDuration: {
        label: 'Minimum Duration (minutes)',
        type: 'number',
        placeholder: '15',
      },
    },
  },
  {
    id: 'action_item_created',
    name: 'Action Item Created',
    description: 'Triggered when a new action item is created',
    icon: '✅',
    color: 'green',
    config: {
      priority: {
        label: 'Priority Filter',
        type: 'select',
        options: ['all', 'low', 'medium', 'high', 'critical'],
      },
      assigneeFilter: {
        label: 'Assignee Filter',
        type: 'select',
        options: ['all', 'me', 'my_team', 'specific_user'],
      },
    },
  },
  {
    id: 'deadline_approaching',
    name: 'Deadline Approaching',
    description: 'Triggered when a deadline is approaching',
    icon: '⏰',
    color: 'orange',
    config: {
      daysBefore: {
        label: 'Days Before Deadline',
        type: 'number',
        placeholder: '3',
      },
      taskType: {
        label: 'Task Type Filter',
        type: 'select',
        options: ['all', 'action_items', 'projects', 'milestones'],
      },
    },
  },
  {
    id: 'meeting_scheduled',
    name: 'Meeting Scheduled',
    description: 'Triggered when a new meeting is scheduled',
    icon: '📅',
    color: 'purple',
    config: {
      attendeeFilter: {
        label: 'Attendee Filter',
        type: 'select',
        options: ['all', 'internal', 'external', 'vip'],
      },
      leadTime: {
        label: 'Lead Time (hours before)',
        type: 'number',
        placeholder: '24',
      },
    },
  },
  {
    id: 'custom',
    name: 'Custom Trigger',
    description: 'Create a custom trigger with webhook',
    icon: '🔧',
    color: 'gray',
    config: {
      webhookUrl: {
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'https://your-webhook-url.com',
      },
      secret: {
        label: 'Secret Key',
        type: 'password',
        placeholder: 'Enter secret key for validation',
      },
    },
  },
];

export function TriggerSelector({ selectedTrigger, triggerConfig, onSelect }: TriggerSelectorProps) {
  const selectedTriggerData = triggers.find(t => t.id === selectedTrigger);

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, string> = {
      blue: isSelected
        ? 'bg-blue-500/20 border-blue-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-blue-500/50',
      green: isSelected
        ? 'bg-green-500/20 border-green-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-green-500/50',
      orange: isSelected
        ? 'bg-orange-500/20 border-orange-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-orange-500/50',
      purple: isSelected
        ? 'bg-purple-500/20 border-purple-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-purple-500/50',
      gray: isSelected
        ? 'bg-gray-500/20 border-gray-500'
        : 'bg-[var(--ff-bg-layer)] border-[var(--ff-border)] hover:border-gray-500/50',
    };
    return colors[color] || colors.gray;
  };

  return (
    <div>
      <h2 className="heading-s mb-6">Select a Trigger</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {triggers.map((trigger) => {
          const isSelected = selectedTrigger === trigger.id;
          return (
            <div
              key={trigger.id}
              onClick={() => onSelect(trigger.id, {})}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${getColorClasses(
                trigger.color,
                isSelected
              )}`}
            >
              <div className="flex items-start">
                <span className="text-3xl mr-3">{trigger.icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-white mb-1">{trigger.name}</h3>
                  <p className="text-sm text-[var(--ff-text-muted)]">
                    {trigger.description}
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
      {selectedTriggerData && (
        <div className="bg-[var(--ff-bg-dark)] rounded-lg p-6">
          <h3 className="font-medium text-white mb-4">Configure {selectedTriggerData.name}</h3>
          <div className="space-y-4">
            {Object.entries(selectedTriggerData.config).map(([key, config]: [string, any]) => (
              <div key={key}>
                <label className="label-m text-[var(--ff-text-secondary)] block mb-2">
                  {config.label}
                </label>
                {config.type === 'select' ? (
                  <select
                    value={triggerConfig[key] || config.options[0]}
                    onChange={(e) =>
                      onSelect(selectedTrigger, {
                        ...triggerConfig,
                        [key]: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)] focus:border-transparent"
                  >
                    {config.options.map((option: string) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                ) : config.type === 'number' ? (
                  <input
                    type="number"
                    value={triggerConfig[key] || ''}
                    onChange={(e) =>
                      onSelect(selectedTrigger, {
                        ...triggerConfig,
                        [key]: e.target.value,
                      })
                    }
                    placeholder={config.placeholder}
                    className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)] focus:border-transparent"
                  />
                ) : (
                  <input
                    type={config.type}
                    value={triggerConfig[key] || ''}
                    onChange={(e) =>
                      onSelect(selectedTrigger, {
                        ...triggerConfig,
                        [key]: e.target.value,
                      })
                    }
                    placeholder={config.placeholder}
                    className="w-full px-4 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)] focus:border-transparent"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}