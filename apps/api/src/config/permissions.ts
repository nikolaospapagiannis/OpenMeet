/**
 * Permission Definitions
 * Central configuration for all permissions and default roles
 *
 * This file defines the complete permission matrix for the application.
 * All permissions follow the format: resource.action
 */

export interface PermissionDefinition {
  name: string;
  resource: string;
  action: string;
  description: string;
  category: string;
  isSystem: boolean;
}

export interface RoleDefinition {
  name: string;
  description: string;
  isSystem: boolean;
  isCustom: boolean;
  priority: number;
  permissions: string[];
}

/**
 * All System Permissions
 * These permissions are automatically created during initialization
 */
export const PERMISSIONS: PermissionDefinition[] = [
  // ========================================
  // MEETINGS PERMISSIONS
  // ========================================
  {
    name: 'meetings.create',
    resource: 'meetings',
    action: 'create',
    description: 'Create new meetings',
    category: 'meetings',
    isSystem: true,
  },
  {
    name: 'meetings.read',
    resource: 'meetings',
    action: 'read',
    description: 'View meetings and their details',
    category: 'meetings',
    isSystem: true,
  },
  {
    name: 'meetings.update',
    resource: 'meetings',
    action: 'update',
    description: 'Edit meeting information',
    category: 'meetings',
    isSystem: true,
  },
  {
    name: 'meetings.delete',
    resource: 'meetings',
    action: 'delete',
    description: 'Delete meetings',
    category: 'meetings',
    isSystem: true,
  },
  {
    name: 'meetings.share',
    resource: 'meetings',
    action: 'share',
    description: 'Share meetings with others',
    category: 'meetings',
    isSystem: true,
  },

  // ========================================
  // TRANSCRIPTS PERMISSIONS
  // ========================================
  {
    name: 'transcripts.read',
    resource: 'transcripts',
    action: 'read',
    description: 'View meeting transcripts',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'transcripts.export',
    resource: 'transcripts',
    action: 'export',
    description: 'Export transcripts to various formats',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'transcripts.edit',
    resource: 'transcripts',
    action: 'edit',
    description: 'Edit and correct transcripts',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'transcripts.delete',
    resource: 'transcripts',
    action: 'delete',
    description: 'Delete transcripts',
    category: 'content',
    isSystem: true,
  },

  // ========================================
  // RECORDINGS PERMISSIONS
  // ========================================
  {
    name: 'recordings.read',
    resource: 'recordings',
    action: 'read',
    description: 'View and play recordings',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'recordings.upload',
    resource: 'recordings',
    action: 'upload',
    description: 'Upload new recordings',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'recordings.download',
    resource: 'recordings',
    action: 'download',
    description: 'Download recordings',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'recordings.delete',
    resource: 'recordings',
    action: 'delete',
    description: 'Delete recordings',
    category: 'content',
    isSystem: true,
  },

  // ========================================
  // ANALYTICS PERMISSIONS
  // ========================================
  {
    name: 'analytics.view',
    resource: 'analytics',
    action: 'view',
    description: 'View analytics dashboards and reports',
    category: 'analytics',
    isSystem: true,
  },
  {
    name: 'analytics.export',
    resource: 'analytics',
    action: 'export',
    description: 'Export analytics data',
    category: 'analytics',
    isSystem: true,
  },
  {
    name: 'analytics.advanced',
    resource: 'analytics',
    action: 'advanced',
    description: 'Access advanced analytics features',
    category: 'analytics',
    isSystem: true,
  },

  // ========================================
  // INTEGRATIONS PERMISSIONS
  // ========================================
  {
    name: 'integrations.view',
    resource: 'integrations',
    action: 'view',
    description: 'View connected integrations',
    category: 'integrations',
    isSystem: true,
  },
  {
    name: 'integrations.manage',
    resource: 'integrations',
    action: 'manage',
    description: 'Connect, configure, and disconnect integrations',
    category: 'integrations',
    isSystem: true,
  },

  // ========================================
  // COMMENTS PERMISSIONS
  // ========================================
  {
    name: 'comments.create',
    resource: 'comments',
    action: 'create',
    description: 'Add comments to meetings',
    category: 'collaboration',
    isSystem: true,
  },
  {
    name: 'comments.read',
    resource: 'comments',
    action: 'read',
    description: 'View comments',
    category: 'collaboration',
    isSystem: true,
  },
  {
    name: 'comments.update',
    resource: 'comments',
    action: 'update',
    description: 'Edit own comments',
    category: 'collaboration',
    isSystem: true,
  },
  {
    name: 'comments.delete',
    resource: 'comments',
    action: 'delete',
    description: 'Delete comments',
    category: 'collaboration',
    isSystem: true,
  },
  {
    name: 'comments.resolve',
    resource: 'comments',
    action: 'resolve',
    description: 'Resolve and unresolve comments',
    category: 'collaboration',
    isSystem: true,
  },

  // ========================================
  // SOUNDBITES/CLIPS PERMISSIONS
  // ========================================
  {
    name: 'clips.create',
    resource: 'clips',
    action: 'create',
    description: 'Create video clips and soundbites',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'clips.read',
    resource: 'clips',
    action: 'read',
    description: 'View clips and soundbites',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'clips.share',
    resource: 'clips',
    action: 'share',
    description: 'Share clips publicly',
    category: 'content',
    isSystem: true,
  },
  {
    name: 'clips.delete',
    resource: 'clips',
    action: 'delete',
    description: 'Delete clips',
    category: 'content',
    isSystem: true,
  },

  // ========================================
  // WORKSPACE PERMISSIONS
  // ========================================
  {
    name: 'workspaces.create',
    resource: 'workspaces',
    action: 'create',
    description: 'Create new workspaces',
    category: 'organization',
    isSystem: true,
  },
  {
    name: 'workspaces.read',
    resource: 'workspaces',
    action: 'read',
    description: 'View workspaces',
    category: 'organization',
    isSystem: true,
  },
  {
    name: 'workspaces.update',
    resource: 'workspaces',
    action: 'update',
    description: 'Edit workspace settings',
    category: 'organization',
    isSystem: true,
  },
  {
    name: 'workspaces.delete',
    resource: 'workspaces',
    action: 'delete',
    description: 'Delete workspaces',
    category: 'organization',
    isSystem: true,
  },

  // ========================================
  // USERS/TEAM PERMISSIONS
  // ========================================
  {
    name: 'users.invite',
    resource: 'users',
    action: 'invite',
    description: 'Invite new users to the organization',
    category: 'admin',
    isSystem: true,
  },
  {
    name: 'users.read',
    resource: 'users',
    action: 'read',
    description: 'View team members',
    category: 'admin',
    isSystem: true,
  },
  {
    name: 'users.update',
    resource: 'users',
    action: 'update',
    description: 'Update user information',
    category: 'admin',
    isSystem: true,
  },
  {
    name: 'users.remove',
    resource: 'users',
    action: 'remove',
    description: 'Remove users from the organization',
    category: 'admin',
    isSystem: true,
  },
  {
    name: 'users.manage_roles',
    resource: 'users',
    action: 'manage_roles',
    description: 'Assign and revoke user roles',
    category: 'admin',
    isSystem: true,
  },

  // ========================================
  // SETTINGS PERMISSIONS
  // ========================================
  {
    name: 'settings.view',
    resource: 'settings',
    action: 'view',
    description: 'View organization settings',
    category: 'admin',
    isSystem: true,
  },
  {
    name: 'settings.manage',
    resource: 'settings',
    action: 'manage',
    description: 'Manage organization settings',
    category: 'admin',
    isSystem: true,
  },
  {
    name: 'settings.manage_security',
    resource: 'settings',
    action: 'manage_security',
    description: 'Manage security settings (SSO, MFA, etc.)',
    category: 'admin',
    isSystem: true,
  },

  // ========================================
  // BILLING PERMISSIONS
  // ========================================
  {
    name: 'billing.view',
    resource: 'billing',
    action: 'view',
    description: 'View billing information and invoices',
    category: 'billing',
    isSystem: true,
  },
  {
    name: 'billing.manage',
    resource: 'billing',
    action: 'manage',
    description: 'Manage subscription and payment methods',
    category: 'billing',
    isSystem: true,
  },

  // ========================================
  // API KEYS PERMISSIONS
  // ========================================
  {
    name: 'api_keys.create',
    resource: 'api_keys',
    action: 'create',
    description: 'Create API keys',
    category: 'developer',
    isSystem: true,
  },
  {
    name: 'api_keys.read',
    resource: 'api_keys',
    action: 'read',
    description: 'View API keys',
    category: 'developer',
    isSystem: true,
  },
  {
    name: 'api_keys.revoke',
    resource: 'api_keys',
    action: 'revoke',
    description: 'Revoke API keys',
    category: 'developer',
    isSystem: true,
  },

  // ========================================
  // WEBHOOKS PERMISSIONS
  // ========================================
  {
    name: 'webhooks.create',
    resource: 'webhooks',
    action: 'create',
    description: 'Create webhooks',
    category: 'developer',
    isSystem: true,
  },
  {
    name: 'webhooks.read',
    resource: 'webhooks',
    action: 'read',
    description: 'View webhooks',
    category: 'developer',
    isSystem: true,
  },
  {
    name: 'webhooks.update',
    resource: 'webhooks',
    action: 'update',
    description: 'Update webhook configurations',
    category: 'developer',
    isSystem: true,
  },
  {
    name: 'webhooks.delete',
    resource: 'webhooks',
    action: 'delete',
    description: 'Delete webhooks',
    category: 'developer',
    isSystem: true,
  },

  // ========================================
  // AUDIT LOGS PERMISSIONS
  // ========================================
  {
    name: 'audit_logs.read',
    resource: 'audit_logs',
    action: 'read',
    description: 'View audit logs',
    category: 'admin',
    isSystem: true,
  },
  {
    name: 'audit_logs.export',
    resource: 'audit_logs',
    action: 'export',
    description: 'Export audit logs',
    category: 'admin',
    isSystem: true,
  },

  // ========================================
  // AUTOMATION PERMISSIONS
  // ========================================
  {
    name: 'automation.view',
    resource: 'automation',
    action: 'view',
    description: 'View automation rules',
    category: 'automation',
    isSystem: true,
  },
  {
    name: 'automation.manage',
    resource: 'automation',
    action: 'manage',
    description: 'Create and manage automation rules',
    category: 'automation',
    isSystem: true,
  },

  // ========================================
  // AI FEATURES PERMISSIONS
  // ========================================
  {
    name: 'ai.query',
    resource: 'ai',
    action: 'query',
    description: 'Use AI query features',
    category: 'ai',
    isSystem: true,
  },
  {
    name: 'ai.advanced',
    resource: 'ai',
    action: 'advanced',
    description: 'Access advanced AI features',
    category: 'ai',
    isSystem: true,
  },
  {
    name: 'ai.custom_models',
    resource: 'ai',
    action: 'custom_models',
    description: 'Create and manage custom AI models',
    category: 'ai',
    isSystem: true,
  },

  // ========================================
  // REVENUE INTELLIGENCE PERMISSIONS
  // ========================================
  {
    name: 'revenue.view',
    resource: 'revenue',
    action: 'view',
    description: 'View revenue intelligence features',
    category: 'revenue',
    isSystem: true,
  },
  {
    name: 'revenue.manage_deals',
    resource: 'revenue',
    action: 'manage_deals',
    description: 'Manage deals and opportunities',
    category: 'revenue',
    isSystem: true,
  },
  {
    name: 'revenue.coaching',
    resource: 'revenue',
    action: 'coaching',
    description: 'Access sales coaching features',
    category: 'revenue',
    isSystem: true,
  },

  // ========================================
  // LIVE FEATURES PERMISSIONS
  // ========================================
  {
    name: 'live.start_session',
    resource: 'live',
    action: 'start_session',
    description: 'Start live transcription sessions',
    category: 'live',
    isSystem: true,
  },
  {
    name: 'live.view_session',
    resource: 'live',
    action: 'view_session',
    description: 'View live sessions',
    category: 'live',
    isSystem: true,
  },
  {
    name: 'live.create_bookmarks',
    resource: 'live',
    action: 'create_bookmarks',
    description: 'Create live bookmarks and highlights',
    category: 'live',
    isSystem: true,
  },
];

/**
 * Default System Roles
 * These roles are created automatically and cannot be deleted
 */
export const DEFAULT_ROLES: RoleDefinition[] = [
  // ========================================
  // OWNER ROLE - Full access to everything
  // ========================================
  {
    name: 'Owner',
    description: 'Organization owner with full access to all features and settings',
    isSystem: true,
    isCustom: false,
    priority: 100,
    permissions: PERMISSIONS.map((p) => p.name), // All permissions
  },

  // ========================================
  // ADMIN ROLE - Administrative access
  // ========================================
  {
    name: 'Admin',
    description: 'Administrator with access to most features except billing',
    isSystem: true,
    isCustom: false,
    priority: 80,
    permissions: [
      // Meetings
      'meetings.create',
      'meetings.read',
      'meetings.update',
      'meetings.delete',
      'meetings.share',
      // Transcripts
      'transcripts.read',
      'transcripts.export',
      'transcripts.edit',
      'transcripts.delete',
      // Recordings
      'recordings.read',
      'recordings.upload',
      'recordings.download',
      'recordings.delete',
      // Analytics
      'analytics.view',
      'analytics.export',
      'analytics.advanced',
      // Integrations
      'integrations.view',
      'integrations.manage',
      // Comments
      'comments.create',
      'comments.read',
      'comments.update',
      'comments.delete',
      'comments.resolve',
      // Clips
      'clips.create',
      'clips.read',
      'clips.share',
      'clips.delete',
      // Workspaces
      'workspaces.create',
      'workspaces.read',
      'workspaces.update',
      'workspaces.delete',
      // Users
      'users.invite',
      'users.read',
      'users.update',
      'users.manage_roles',
      // Settings
      'settings.view',
      'settings.manage',
      // API Keys
      'api_keys.create',
      'api_keys.read',
      'api_keys.revoke',
      // Webhooks
      'webhooks.create',
      'webhooks.read',
      'webhooks.update',
      'webhooks.delete',
      // Audit Logs
      'audit_logs.read',
      'audit_logs.export',
      // Automation
      'automation.view',
      'automation.manage',
      // AI
      'ai.query',
      'ai.advanced',
      // Revenue
      'revenue.view',
      'revenue.manage_deals',
      'revenue.coaching',
      // Live
      'live.start_session',
      'live.view_session',
      'live.create_bookmarks',
    ],
  },

  // ========================================
  // MEMBER ROLE - Standard user access
  // ========================================
  {
    name: 'Member',
    description: 'Standard team member with access to core features',
    isSystem: true,
    isCustom: false,
    priority: 50,
    permissions: [
      // Meetings
      'meetings.create',
      'meetings.read',
      'meetings.update',
      'meetings.share',
      // Transcripts
      'transcripts.read',
      'transcripts.export',
      // Recordings
      'recordings.read',
      'recordings.upload',
      'recordings.download',
      // Analytics
      'analytics.view',
      // Integrations
      'integrations.view',
      // Comments
      'comments.create',
      'comments.read',
      'comments.update',
      'comments.resolve',
      // Clips
      'clips.create',
      'clips.read',
      'clips.share',
      // Workspaces
      'workspaces.read',
      // Users
      'users.read',
      // Settings
      'settings.view',
      // API Keys
      'api_keys.create',
      'api_keys.read',
      'api_keys.revoke',
      // AI
      'ai.query',
      // Revenue
      'revenue.view',
      'revenue.manage_deals',
      // Live
      'live.start_session',
      'live.view_session',
      'live.create_bookmarks',
    ],
  },

  // ========================================
  // GUEST ROLE - Read-only access
  // ========================================
  {
    name: 'Guest',
    description: 'Limited read-only access for external collaborators',
    isSystem: true,
    isCustom: false,
    priority: 10,
    permissions: [
      'meetings.read',
      'transcripts.read',
      'recordings.read',
      'comments.read',
      'comments.create',
      'clips.read',
      'workspaces.read',
      'users.read',
    ],
  },
];

/**
 * Permission Categories
 * Used for organizing permissions in the UI
 */
export const PERMISSION_CATEGORIES = [
  { id: 'meetings', name: 'Meetings', description: 'Meeting management and access' },
  { id: 'content', name: 'Content', description: 'Transcripts, recordings, and clips' },
  { id: 'collaboration', name: 'Collaboration', description: 'Comments and sharing' },
  { id: 'analytics', name: 'Analytics', description: 'Reports and insights' },
  { id: 'integrations', name: 'Integrations', description: 'Third-party integrations' },
  { id: 'organization', name: 'Organization', description: 'Workspaces and organization structure' },
  { id: 'admin', name: 'Administration', description: 'User and settings management' },
  { id: 'billing', name: 'Billing', description: 'Subscription and payments' },
  { id: 'developer', name: 'Developer', description: 'API keys and webhooks' },
  { id: 'automation', name: 'Automation', description: 'Workflow automation' },
  { id: 'ai', name: 'AI Features', description: 'AI-powered features' },
  { id: 'revenue', name: 'Revenue Intelligence', description: 'Sales and deal tracking' },
  { id: 'live', name: 'Live Features', description: 'Real-time transcription and collaboration' },
];

/**
 * Helper function to get permission by name
 */
export function getPermission(name: string): PermissionDefinition | undefined {
  return PERMISSIONS.find((p) => p.name === name);
}

/**
 * Helper function to get role by name
 */
export function getRole(name: string): RoleDefinition | undefined {
  return DEFAULT_ROLES.find((r) => r.name === name);
}

/**
 * Helper function to get all permissions for a category
 */
export function getPermissionsByCategory(category: string): PermissionDefinition[] {
  return PERMISSIONS.filter((p) => p.category === category);
}
