import { NodeTypeConfig, NodeColorScheme } from '@/types/workflow.types';

// Grid Configuration
export const GRID_SNAP_SIZE = 20;
export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 1.2;

// Canvas Configuration
export const DEFAULT_CANVAS_WIDTH = 800;
export const DEFAULT_CANVAS_HEIGHT = 600;
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 60;
export const NODE_BORDER_RADIUS = 8;

// Node Icons
export const TRIGGER_ICONS: Record<string, string> = {
  meeting_completed: '🏁',
  keyword_detected: '🔍',
  schedule: '⏰',
  webhook: '🔗',
  email_received: '📧',
  form_submitted: '📝',
  api_call: '🔌',
  file_uploaded: '📤',
  default: '⚡'
};

export const ACTION_ICONS: Record<string, string> = {
  send_email: '✉️',
  post_slack: '💬',
  update_crm: '📊',
  call_webhook: '🌐',
  create_task: '✅',
  send_sms: '📱',
  generate_report: '📈',
  update_database: '💾',
  trigger_workflow: '🔄',
  send_notification: '🔔',
  default: '🎯'
};

export const CONDITION_ICON = '🔀';
export const DEFAULT_NODE_ICON = '📦';

// Node Colors
export const NODE_COLORS: Record<string, NodeColorScheme> = {
  trigger: {
    bg: 'var(--ff-purple-500)',
    border: 'var(--ff-purple-400)',
    text: 'white'
  },
  action: {
    bg: 'var(--ff-blue-500)',
    border: 'var(--ff-blue-400)',
    text: 'white'
  },
  condition: {
    bg: 'var(--ff-green-500)',
    border: 'var(--ff-green-400)',
    text: 'white'
  }
};

export const SELECTED_NODE_COLORS: Record<string, NodeColorScheme> = {
  trigger: {
    bg: 'var(--ff-purple-600)',
    border: 'var(--ff-purple-400)',
    text: 'white'
  },
  action: {
    bg: 'var(--ff-blue-600)',
    border: 'var(--ff-blue-400)',
    text: 'white'
  },
  condition: {
    bg: 'var(--ff-green-600)',
    border: 'var(--ff-green-400)',
    text: 'white'
  }
};

// Trigger Configurations
export const TRIGGER_CONFIGS: Record<string, NodeTypeConfig> = {
  meeting_completed: {
    name: 'Meeting Completed',
    icon: '🏁',
    fields: [
      {
        name: 'meetingType',
        label: 'Meeting Type',
        type: 'select',
        options: ['All', 'Team Meeting', 'Client Call', '1-on-1', 'Interview']
      },
      {
        name: 'minDuration',
        label: 'Minimum Duration (min)',
        type: 'number',
        min: 0
      },
      {
        name: 'participantFilter',
        label: 'Participant Filter',
        type: 'text',
        placeholder: 'e.g., @company.com'
      }
    ]
  },
  keyword_detected: {
    name: 'Keyword Detected',
    icon: '🔍',
    fields: [
      {
        name: 'keywords',
        label: 'Keywords (comma separated)',
        type: 'text',
        required: true
      },
      {
        name: 'matchType',
        label: 'Match Type',
        type: 'select',
        options: ['Any', 'All', 'Exact', 'Regex'],
        default: 'Any'
      },
      {
        name: 'caseSensitive',
        label: 'Case Sensitive',
        type: 'checkbox',
        default: false
      },
      {
        name: 'contextWindow',
        label: 'Context Window (words)',
        type: 'number',
        min: 0,
        default: 10
      }
    ]
  },
  schedule: {
    name: 'Scheduled',
    icon: '⏰',
    fields: [
      {
        name: 'frequency',
        label: 'Frequency',
        type: 'select',
        options: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'],
        required: true
      },
      {
        name: 'time',
        label: 'Time',
        type: 'time',
        required: true
      },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'select',
        options: ['UTC', 'EST', 'PST', 'CST', 'GMT', 'CET'],
        default: 'UTC'
      },
      {
        name: 'daysOfWeek',
        label: 'Days (for weekly)',
        type: 'multiselect',
        options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      {
        name: 'cronExpression',
        label: 'Cron Expression',
        type: 'text',
        placeholder: '0 0 * * *',
        condition: 'frequency:Custom'
      }
    ]
  },
  webhook: {
    name: 'Webhook Received',
    icon: '🔗',
    fields: [
      {
        name: 'webhookId',
        label: 'Webhook ID',
        type: 'text',
        required: true,
        placeholder: 'unique-webhook-id'
      },
      {
        name: 'validatePayload',
        label: 'Validate Payload',
        type: 'checkbox',
        default: true
      },
      {
        name: 'expectedHeaders',
        label: 'Expected Headers (JSON)',
        type: 'textarea',
        placeholder: '{"X-Signature": "required"}'
      },
      {
        name: 'authType',
        label: 'Authentication Type',
        type: 'select',
        options: ['None', 'Bearer Token', 'API Key', 'HMAC'],
        default: 'None'
      }
    ]
  }
};

// Action Configurations
export const ACTION_CONFIGS: Record<string, NodeTypeConfig> = {
  send_email: {
    name: 'Send Email',
    icon: '✉️',
    fields: [
      {
        name: 'recipients',
        label: 'Recipients',
        type: 'text',
        required: true,
        placeholder: 'email@example.com, ...'
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        required: true
      },
      {
        name: 'template',
        label: 'Email Template',
        type: 'select',
        options: ['Summary', 'Action Items', 'Follow-up', 'Custom'],
        default: 'Summary'
      },
      {
        name: 'customBody',
        label: 'Custom Body',
        type: 'textarea',
        condition: 'template:Custom'
      },
      {
        name: 'attachTranscript',
        label: 'Attach Transcript',
        type: 'checkbox',
        default: false
      }
    ]
  },
  post_slack: {
    name: 'Post to Slack',
    icon: '💬',
    fields: [
      {
        name: 'channel',
        label: 'Slack Channel',
        type: 'text',
        required: true,
        placeholder: '#channel-name'
      },
      {
        name: 'message',
        label: 'Message Template',
        type: 'textarea',
        required: true
      },
      {
        name: 'includeTranscript',
        label: 'Include Transcript',
        type: 'checkbox',
        default: false
      },
      {
        name: 'notifyChannel',
        label: 'Notify Channel (@channel)',
        type: 'checkbox',
        default: false
      }
    ]
  },
  update_crm: {
    name: 'Update CRM',
    icon: '📊',
    fields: [
      {
        name: 'crmSystem',
        label: 'CRM System',
        type: 'select',
        options: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho'],
        required: true
      },
      {
        name: 'recordType',
        label: 'Record Type',
        type: 'select',
        options: ['Contact', 'Lead', 'Opportunity', 'Account', 'Deal'],
        required: true
      },
      {
        name: 'updateFields',
        label: 'Fields to Update (JSON)',
        type: 'textarea',
        placeholder: '{"status": "Qualified", "notes": "..."}'
      }
    ]
  },
  create_task: {
    name: 'Create Task',
    icon: '✅',
    fields: [
      {
        name: 'taskTitle',
        label: 'Task Title',
        type: 'text',
        required: true
      },
      {
        name: 'assignee',
        label: 'Assignee',
        type: 'text',
        placeholder: 'user@example.com'
      },
      {
        name: 'dueDate',
        label: 'Due Date',
        type: 'text',
        placeholder: 'YYYY-MM-DD'
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
      }
    ]
  }
};

// Condition Configurations
export const CONDITION_CONFIGS: Record<string, NodeTypeConfig> = {
  field_comparison: {
    name: 'Field Comparison',
    icon: '🔀',
    fields: [
      {
        name: 'field',
        label: 'Field',
        type: 'text',
        required: true
      },
      {
        name: 'operator',
        label: 'Operator',
        type: 'select',
        options: ['equals', 'not equals', 'contains', 'starts with', 'ends with', 'greater than', 'less than'],
        required: true
      },
      {
        name: 'value',
        label: 'Value',
        type: 'text',
        required: true
      },
      {
        name: 'dataType',
        label: 'Data Type',
        type: 'select',
        options: ['string', 'number', 'boolean', 'date'],
        default: 'string'
      }
    ]
  }
};

// Workflow Templates
export const DEFAULT_TEMPLATES = [
  {
    id: 'meeting-summary',
    name: 'Meeting Summary Email',
    description: 'Send meeting summary after completion',
    category: 'Communication',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger' as const,
        subType: 'meeting_completed',
        position: { x: 100, y: 100 },
        data: {
          label: 'Meeting Completed',
          icon: '🏁',
          config: { meetingType: 'All' }
        }
      },
      {
        id: 'action-1',
        type: 'action' as const,
        subType: 'send_email',
        position: { x: 400, y: 100 },
        data: {
          label: 'Send Summary Email',
          icon: '✉️',
          config: { template: 'Summary' }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'action-1'
      }
    ]
  },
  {
    id: 'keyword-alert',
    name: 'Keyword Alert',
    description: 'Alert on specific keywords in meetings',
    category: 'Monitoring',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger' as const,
        subType: 'keyword_detected',
        position: { x: 100, y: 100 },
        data: {
          label: 'Keyword Detected',
          icon: '🔍',
          config: { matchType: 'Any' }
        }
      },
      {
        id: 'action-1',
        type: 'action' as const,
        subType: 'post_slack',
        position: { x: 400, y: 100 },
        data: {
          label: 'Post to Slack',
          icon: '💬',
          config: { notifyChannel: true }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'action-1'
      }
    ]
  }
];