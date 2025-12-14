'use client';

import React from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  nodes: any[];
  edges: any[];
  popularity?: number;
  estimatedTime?: string;
}

interface WorkflowTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  onClose?: () => void;
}

const templates: Template[] = [
  {
    id: 'meeting-followup',
    name: 'Meeting Follow-up',
    description: 'Automatically send summary and action items after meetings',
    category: 'Productivity',
    icon: '📧',
    popularity: 95,
    estimatedTime: '2 min',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        subType: 'meeting_completed',
        position: { x: 50, y: 100 },
        data: {
          label: 'Meeting Ends',
          config: {
            meetingType: 'All',
            minDuration: 15
          }
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 300, y: 100 },
        data: {
          label: 'Has Action Items',
          config: {
            conditionType: 'keyword_present',
            operator: 'contains',
            value: 'action item'
          }
        }
      },
      {
        id: 'action-1',
        type: 'action',
        subType: 'send_email',
        position: { x: 550, y: 50 },
        data: {
          label: 'Send Summary Email',
          config: {
            recipients: '{{participants}}',
            subject: 'Meeting Summary: {{title}}',
            template: 'Summary',
            attachTranscript: true
          }
        }
      },
      {
        id: 'action-2',
        type: 'action',
        subType: 'create_task',
        position: { x: 550, y: 150 },
        data: {
          label: 'Create Tasks',
          config: {
            taskSystem: 'Jira',
            title: 'Follow-up: {{title}}',
            description: '{{action_items}}',
            priority: 'Medium'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'condition-1' },
      { id: 'e2', source: 'condition-1', target: 'action-1', label: 'true' },
      { id: 'e3', source: 'condition-1', target: 'action-2', label: 'true' }
    ]
  },
  {
    id: 'slack-notification',
    name: 'Slack Team Update',
    description: 'Post meeting highlights to team Slack channel',
    category: 'Communication',
    icon: '💬',
    popularity: 88,
    estimatedTime: '1 min',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        subType: 'meeting_completed',
        position: { x: 50, y: 100 },
        data: {
          label: 'Team Meeting Ends',
          config: {
            meetingType: 'Team Meeting',
            minDuration: 30
          }
        }
      },
      {
        id: 'action-1',
        type: 'action',
        subType: 'post_slack',
        position: { x: 350, y: 100 },
        data: {
          label: 'Post to Slack',
          config: {
            channel: '#team-updates',
            message: '🎯 Meeting completed: {{title}}\\n\\n📝 Key Points:\\n{{summary}}\\n\\n✅ Action Items:\\n{{action_items}}',
            mentionUsers: true,
            includeLink: true
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' }
    ]
  },
  {
    id: 'crm-update',
    name: 'CRM Auto-Update',
    description: 'Update CRM records after client calls',
    category: 'Sales',
    icon: '📊',
    popularity: 76,
    estimatedTime: '3 min',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        subType: 'meeting_completed',
        position: { x: 50, y: 100 },
        data: {
          label: 'Client Call Ends',
          config: {
            meetingType: 'Client Call',
            participantFilter: '@client.com'
          }
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 300, y: 100 },
        data: {
          label: 'Check Sentiment',
          config: {
            conditionType: 'sentiment',
            operator: 'positive',
            value: 0.6
          }
        }
      },
      {
        id: 'action-1',
        type: 'action',
        subType: 'update_crm',
        position: { x: 550, y: 50 },
        data: {
          label: 'Update Deal',
          config: {
            crmSystem: 'Salesforce',
            recordType: 'Deal',
            fields: '{"status": "progressing", "last_contact": "{{date}}", "notes": "{{summary}}"}'
          }
        }
      },
      {
        id: 'action-2',
        type: 'action',
        subType: 'send_email',
        position: { x: 550, y: 150 },
        data: {
          label: 'Alert Sales Team',
          config: {
            recipients: 'sales-team@company.com',
            subject: 'Positive Client Call: {{title}}',
            template: 'Custom',
            customBody: 'Great news! The call with {{participants}} went well. Sentiment was positive. See summary attached.'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'condition-1' },
      { id: 'e2', source: 'condition-1', target: 'action-1', label: 'true' },
      { id: 'e3', source: 'condition-1', target: 'action-2', label: 'true' }
    ]
  },
  {
    id: 'interview-feedback',
    name: 'Interview Feedback Loop',
    description: 'Collect and distribute interview feedback',
    category: 'HR',
    icon: '👥',
    popularity: 72,
    estimatedTime: '4 min',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        subType: 'meeting_completed',
        position: { x: 50, y: 100 },
        data: {
          label: 'Interview Ends',
          config: {
            meetingType: 'Interview',
            minDuration: 20
          }
        }
      },
      {
        id: 'action-1',
        type: 'action',
        subType: 'send_email',
        position: { x: 300, y: 50 },
        data: {
          label: 'Send Feedback Form',
          config: {
            recipients: '{{interviewer}}',
            subject: 'Interview Feedback: {{candidate_name}}',
            template: 'Custom',
            customBody: 'Please provide feedback for {{candidate_name}} interview.\\n\\nFeedback form: https://forms.company.com/interview-feedback'
          }
        }
      },
      {
        id: 'action-2',
        type: 'action',
        subType: 'create_task',
        position: { x: 300, y: 150 },
        data: {
          label: 'Create HR Task',
          config: {
            taskSystem: 'Asana',
            project: 'Recruiting',
            title: 'Process feedback for {{candidate_name}}',
            assignTo: 'hr-team',
            priority: 'High'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
      { id: 'e2', source: 'trigger-1', target: 'action-2' }
    ]
  },
  {
    id: 'daily-standup',
    name: 'Daily Standup Tracker',
    description: 'Track and report daily standup outcomes',
    category: 'Agile',
    icon: '🏃',
    popularity: 84,
    estimatedTime: '2 min',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        subType: 'schedule',
        position: { x: 50, y: 100 },
        data: {
          label: 'Daily at 9:30 AM',
          config: {
            frequency: 'Daily',
            time: '09:30',
            timezone: 'PST',
            daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          }
        }
      },
      {
        id: 'action-1',
        type: 'action',
        subType: 'post_slack',
        position: { x: 300, y: 100 },
        data: {
          label: 'Standup Reminder',
          config: {
            channel: '#dev-team',
            message: '🏃 Daily Standup starting in 5 minutes!\\n\\nJoin here: {{meeting_link}}',
            mentionUsers: false
          }
        }
      },
      {
        id: 'trigger-2',
        type: 'trigger',
        subType: 'meeting_completed',
        position: { x: 50, y: 250 },
        data: {
          label: 'Standup Ends',
          config: {
            meetingType: 'Standup',
            minDuration: 10
          }
        }
      },
      {
        id: 'action-2',
        type: 'action',
        subType: 'create_task',
        position: { x: 300, y: 250 },
        data: {
          label: 'Update Sprint Board',
          config: {
            taskSystem: 'Jira',
            project: 'SPRINT-{{sprint_number}}',
            title: 'Standup Notes {{date}}',
            description: '{{summary}}'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
      { id: 'e2', source: 'trigger-2', target: 'action-2' }
    ]
  },
  {
    id: 'escalation-workflow',
    name: 'Issue Escalation',
    description: 'Escalate critical issues detected in meetings',
    category: 'Support',
    icon: '🚨',
    popularity: 65,
    estimatedTime: '3 min',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        subType: 'keyword_detected',
        position: { x: 50, y: 100 },
        data: {
          label: 'Critical Issue Detected',
          config: {
            keywords: 'critical, urgent, emergency, blocker, down',
            matchType: 'Any',
            caseSensitive: false
          }
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 300, y: 100 },
        data: {
          label: 'Check Participants',
          config: {
            conditionType: 'participant_count',
            operator: 'greater_than',
            value: 2
          }
        }
      },
      {
        id: 'action-1',
        type: 'action',
        subType: 'send_email',
        position: { x: 550, y: 50 },
        data: {
          label: 'Alert Management',
          config: {
            recipients: 'management@company.com',
            subject: '🚨 URGENT: Critical Issue in {{title}}',
            template: 'Custom',
            customBody: 'A critical issue was detected in the meeting.\\n\\nKeywords detected: {{matched_keywords}}\\n\\nPlease review immediately.'
          }
        }
      },
      {
        id: 'action-2',
        type: 'action',
        subType: 'call_webhook',
        position: { x: 550, y: 150 },
        data: {
          label: 'Trigger PagerDuty',
          config: {
            url: 'https://events.pagerduty.com/v2/enqueue',
            method: 'POST',
            headers: '{"Content-Type": "application/json"}',
            payload: '{"routing_key": "{{pagerduty_key}}", "event_action": "trigger", "payload": {"summary": "{{title}}", "severity": "critical"}}'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'condition-1' },
      { id: 'e2', source: 'condition-1', target: 'action-1', label: 'true' },
      { id: 'e3', source: 'condition-1', target: 'action-2', label: 'true' }
    ]
  }
];

const categories = [
  { id: 'all', name: 'All Templates', icon: '📚' },
  { id: 'Productivity', name: 'Productivity', icon: '⚡' },
  { id: 'Communication', name: 'Communication', icon: '💬' },
  { id: 'Sales', name: 'Sales', icon: '💰' },
  { id: 'HR', name: 'HR', icon: '👥' },
  { id: 'Agile', name: 'Agile', icon: '🏃' },
  { id: 'Support', name: 'Support', icon: '🛟' }
];

export function WorkflowTemplates({ onSelectTemplate, onClose }: WorkflowTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(null);

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--ff-bg-layer)] rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--ff-border)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-m text-white">Workflow Templates</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ff-purple-500)]"
            />
            <span className="absolute left-3 top-2.5 text-[var(--ff-text-muted)]">🔍</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-48 bg-[var(--ff-bg-dark)] p-4 overflow-y-auto">
            <h3 className="label-m text-[var(--ff-text-secondary)] mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full px-3 py-2 text-left rounded-md transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-[var(--ff-purple-500)] text-white'
                      : 'text-[var(--ff-text-secondary)] hover:bg-[var(--ff-bg-layer)] hover:text-white'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--ff-text-muted)]">No templates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className="bg-[var(--ff-bg-dark)] rounded-lg p-4 border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)] transition-all cursor-pointer group"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{template.icon}</span>
                        <h4 className="font-medium text-white group-hover:text-[var(--ff-purple-400)]">
                          {template.name}
                        </h4>
                      </div>
                      {template.popularity && (
                        <span className="text-xs text-[var(--ff-text-muted)] bg-[var(--ff-bg-layer)] px-2 py-1 rounded">
                          {template.popularity}% popular
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[var(--ff-text-secondary)] mb-3">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--ff-text-muted)]">
                        {template.category} • {template.estimatedTime}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplate(template);
                        }}
                        className="text-xs px-3 py-1 bg-[var(--ff-purple-500)] text-white rounded-md hover:bg-[var(--ff-purple-600)] transition-colors"
                      >
                        Use Template
                      </button>
                    </div>

                    {/* Mini workflow preview */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-[var(--ff-text-muted)]">
                      <span>{template.nodes.filter(n => n.type === 'trigger').length} triggers</span>
                      <span>•</span>
                      <span>{template.nodes.filter(n => n.type === 'condition').length} conditions</span>
                      <span>•</span>
                      <span>{template.nodes.filter(n => n.type === 'action').length} actions</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="absolute inset-0 bg-[var(--ff-bg-layer)] flex flex-col">
            <div className="p-6 border-b border-[var(--ff-border)] flex justify-between items-center">
              <div>
                <h3 className="heading-s text-white flex items-center">
                  <span className="text-2xl mr-2">{previewTemplate.icon}</span>
                  {previewTemplate.name}
                </h3>
                <p className="text-sm text-[var(--ff-text-secondary)] mt-1">
                  {previewTemplate.description}
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {/* Workflow visualization would go here */}
              <div className="bg-[var(--ff-bg-dark)] rounded-lg p-8 border border-[var(--ff-border)] min-h-[300px]">
                <div className="text-center text-[var(--ff-text-muted)]">
                  <p className="mb-4">Workflow Preview</p>
                  <div className="flex justify-center items-center gap-4">
                    {previewTemplate.nodes.map((node, index) => (
                      <React.Fragment key={node.id}>
                        <div className={`px-4 py-2 rounded-lg ${
                          node.type === 'trigger' ? 'bg-[var(--ff-purple-500)]' :
                          node.type === 'condition' ? 'bg-[var(--ff-green-500)]' :
                          'bg-[var(--ff-blue-500)]'
                        } text-white text-sm`}>
                          {node.data.label}
                        </div>
                        {index < previewTemplate.nodes.length - 1 && (
                          <span className="text-[var(--ff-text-muted)]">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-[var(--ff-bg-dark)] rounded-lg p-4 border border-[var(--ff-border)]">
                  <h4 className="label-m text-[var(--ff-text-secondary)] mb-2">Triggers</h4>
                  <ul className="space-y-1">
                    {previewTemplate.nodes
                      .filter(n => n.type === 'trigger')
                      .map(node => (
                        <li key={node.id} className="text-sm text-white">
                          • {node.data.label}
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="bg-[var(--ff-bg-dark)] rounded-lg p-4 border border-[var(--ff-border)]">
                  <h4 className="label-m text-[var(--ff-text-secondary)] mb-2">Conditions</h4>
                  <ul className="space-y-1">
                    {previewTemplate.nodes
                      .filter(n => n.type === 'condition')
                      .map(node => (
                        <li key={node.id} className="text-sm text-white">
                          • {node.data.label}
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="bg-[var(--ff-bg-dark)] rounded-lg p-4 border border-[var(--ff-border)]">
                  <h4 className="label-m text-[var(--ff-text-secondary)] mb-2">Actions</h4>
                  <ul className="space-y-1">
                    {previewTemplate.nodes
                      .filter(n => n.type === 'action')
                      .map(node => (
                        <li key={node.id} className="text-sm text-white">
                          • {node.data.label}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--ff-border)] flex justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="button-secondary"
              >
                Back
              </button>
              <button
                onClick={() => handleSelectTemplate(previewTemplate)}
                className="button-primary"
              >
                Use This Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}