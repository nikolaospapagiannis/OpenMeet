/**
 * Asana Integration Service - REAL IMPLEMENTATION
 *
 * Full Asana API integration for task management from meeting action items
 *
 * Features:
 * - OAuth 2.0 authentication
 * - Create tasks from meeting action items
 * - Sync meeting metadata to Asana
 * - Workspace and project management
 * - Task assignment and due dates
 * - Custom fields support
 * - Webhook notifications
 *
 * API Documentation: https://developers.asana.com/docs
 */

import asana from 'asana';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface AsanaWorkspace {
  id: string;
  organizationId: string;
  workspaceGid: string;
  workspaceName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  defaultProjectGid?: string;
  isActive: boolean;
  installedBy: string;
  installedAt: Date;
}

export interface AsanaTaskData {
  name: string;
  notes?: string;
  assignee?: string;
  due_on?: string;
  projects?: string[];
  workspace: string;
  custom_fields?: Record<string, any>;
  followers?: string[];
}

export interface CreateTaskFromActionItemOptions {
  meetingId: string;
  actionItem: {
    task: string;
    owner?: string;
    deadline?: string;
    priority?: string;
  };
  workspaceGid: string;
  projectGid?: string;
  assigneeEmail?: string;
}

class AsanaIntegrationService extends EventEmitter {
  private clients: Map<string, asana.Client> = new Map();

  constructor() {
    super();
    logger.info('Asana Integration Service initialized');
  }

  /**
   * Get Asana client for workspace
   */
  private async getClient(workspaceId: string): Promise<asana.Client> {
    // Check if client already exists
    if (this.clients.has(workspaceId)) {
      return this.clients.get(workspaceId)!;
    }

    // Load workspace from database
    const workspace = await prisma.asanaWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error(`Asana workspace not found: ${workspaceId}`);
    }

    if (!workspace.isActive) {
      throw new Error(`Asana workspace is inactive: ${workspaceId}`);
    }

    // Check if token needs refresh
    if (workspace.tokenExpiresAt && workspace.tokenExpiresAt < new Date()) {
      logger.info('Asana token expired, refreshing...', { workspaceId });
      await this.refreshAccessToken(workspaceId);
      return this.getClient(workspaceId); // Recursive call with fresh token
    }

    // Create Asana client
    const client = asana.Client.create({
      defaultHeaders: { 'asana-enable': 'new_user_task_lists' },
      logAsanaChangeWarnings: false,
    }).useAccessToken(workspace.accessToken);

    this.clients.set(workspaceId, client);

    logger.info('Asana client created', { workspaceId, workspaceGid: workspace.workspaceGid });

    return client;
  }

  /**
   * OAuth 2.0 authorization URL
   */
  getAuthorizationUrl(organizationId: string, redirectUri: string): string {
    const clientId = process.env.ASANA_CLIENT_ID;

    if (!clientId) {
      throw new Error('ASANA_CLIENT_ID not configured');
    }

    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'default',
    });

    return `https://app.asana.com/-/oauth_authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(
    code: string,
    state: string,
    redirectUri: string
  ): Promise<AsanaWorkspace> {
    try {
      const clientId = process.env.ASANA_CLIENT_ID;
      const clientSecret = process.env.ASANA_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Asana OAuth credentials not configured');
      }

      // Decode state
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const { organizationId } = stateData;

      logger.info('Exchanging Asana OAuth code for tokens', { organizationId });

      // Exchange code for tokens
      const client = asana.Client.create();
      const credentials = await client.app.accessTokenFromCode(code, {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      });

      const accessToken = credentials.access_token;
      const refreshToken = credentials.refresh_token;

      // Get user and workspace info
      const authenticatedClient = asana.Client.create().useAccessToken(accessToken);
      const user = await authenticatedClient.users.me();
      const workspaces = await authenticatedClient.workspaces.findAll();

      // Use first workspace (or user can select later)
      const workspace = workspaces.data[0];

      if (!workspace) {
        throw new Error('No Asana workspaces found');
      }

      // Store in database
      const asanaWorkspace = await prisma.asanaWorkspace.create({
        data: {
          id: `asana_${workspace.gid}_${Date.now()}`,
          organizationId,
          workspaceGid: workspace.gid,
          workspaceName: workspace.name,
          accessToken,
          refreshToken,
          tokenExpiresAt: credentials.expires_in
            ? new Date(Date.now() + credentials.expires_in * 1000)
            : undefined,
          isActive: true,
          installedBy: user.gid,
        },
      });

      logger.info('Asana workspace connected', {
        workspaceId: asanaWorkspace.id,
        workspaceName: workspace.name,
        organizationId,
      });

      this.emit('workspace-connected', {
        workspaceId: asanaWorkspace.id,
        organizationId,
      });

      return asanaWorkspace as any;
    } catch (error: any) {
      logger.error('Error handling Asana OAuth callback', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(workspaceId: string): Promise<void> {
    const workspace = await prisma.asanaWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || !workspace.refreshToken) {
      throw new Error('Cannot refresh token: workspace or refresh token not found');
    }

    const clientId = process.env.ASANA_CLIENT_ID;
    const clientSecret = process.env.ASANA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Asana OAuth credentials not configured');
    }

    logger.info('Refreshing Asana access token', { workspaceId });

    const client = asana.Client.create();
    const credentials = await client.app.accessTokenFromRefreshToken(workspace.refreshToken, {
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Update workspace with new tokens
    await prisma.asanaWorkspace.update({
      where: { id: workspaceId },
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || workspace.refreshToken,
        tokenExpiresAt: credentials.expires_in
          ? new Date(Date.now() + credentials.expires_in * 1000)
          : undefined,
      },
    });

    // Clear cached client to force recreation with new token
    this.clients.delete(workspaceId);

    logger.info('Asana access token refreshed', { workspaceId });
  }

  /**
   * Create task in Asana
   */
  async createTask(
    workspaceId: string,
    taskData: AsanaTaskData
  ): Promise<{ taskGid: string; taskUrl: string }> {
    try {
      const client = await this.getClient(workspaceId);

      logger.info('Creating Asana task', {
        workspaceId,
        taskName: taskData.name,
      });

      // Create task
      const task = await client.tasks.create(taskData);

      const taskUrl = `https://app.asana.com/0/${task.gid}/${task.gid}`;

      logger.info('Asana task created', {
        taskGid: task.gid,
        taskName: task.name,
        taskUrl,
      });

      this.emit('task-created', {
        workspaceId,
        taskGid: task.gid,
        taskUrl,
      });

      return {
        taskGid: task.gid,
        taskUrl,
      };
    } catch (error: any) {
      logger.error('Error creating Asana task', {
        error: error.message,
        workspaceId,
        taskData,
      });
      throw error;
    }
  }

  /**
   * Create task from meeting action item
   */
  async createTaskFromActionItem(
    options: CreateTaskFromActionItemOptions
  ): Promise<{ taskGid: string; taskUrl: string }> {
    try {
      const { meetingId, actionItem, workspaceGid, projectGid, assigneeEmail } = options;

      logger.info('Creating Asana task from action item', {
        meetingId,
        actionItem: actionItem.task,
      });

      // Get meeting details
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Find workspace by workspaceGid
      const workspace = await prisma.asanaWorkspace.findFirst({
        where: {
          workspaceGid,
          isActive: true,
        },
      });

      if (!workspace) {
        throw new Error(`Asana workspace not found: ${workspaceGid}`);
      }

      const client = await this.getClient(workspace.id);

      // Find assignee by email if provided
      let assigneeGid: string | undefined;
      if (assigneeEmail) {
        try {
          const users = await client.users.findByWorkspace(workspaceGid);
          const assignee = users.data.find((u: any) => u.email === assigneeEmail);
          if (assignee) {
            assigneeGid = assignee.gid;
          }
        } catch (error) {
          logger.warn('Could not find Asana user by email', { assigneeEmail });
        }
      }

      // Parse deadline
      let dueDate: string | undefined;
      if (actionItem.deadline) {
        try {
          const deadline = new Date(actionItem.deadline);
          dueDate = deadline.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (error) {
          logger.warn('Could not parse deadline', { deadline: actionItem.deadline });
        }
      }

      // Build task data
      const taskData: AsanaTaskData = {
        name: actionItem.task,
        notes: [
          `From meeting: ${meeting.title}`,
          `Meeting date: ${meeting.scheduledStartAt?.toLocaleString() || 'N/A'}`,
          meeting.meetingUrl ? `Meeting URL: ${meeting.meetingUrl}` : '',
          actionItem.owner ? `Owner: ${actionItem.owner}` : '',
          actionItem.priority ? `Priority: ${actionItem.priority}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        workspace: workspaceGid,
      };

      if (assigneeGid) {
        taskData.assignee = assigneeGid;
      }

      if (dueDate) {
        taskData.due_on = dueDate;
      }

      if (projectGid) {
        taskData.projects = [projectGid];
      } else if (workspace.defaultProjectGid) {
        taskData.projects = [workspace.defaultProjectGid];
      }

      // Create task
      const result = await this.createTask(workspace.id, taskData);

      // Store mapping in database
      await prisma.asanaTask.create({
        data: {
          id: `asana_task_${Date.now()}`,
          meetingId,
          workspaceId: workspace.id,
          taskGid: result.taskGid,
          taskName: actionItem.task,
          taskUrl: result.taskUrl,
          assignee: actionItem.owner,
          dueDate: actionItem.deadline,
          metadata: {
            actionItem,
            meeting: {
              title: meeting.title,
              date: meeting.scheduledStartAt,
            },
          } as any,
        },
      });

      logger.info('Asana task created from action item', {
        meetingId,
        taskGid: result.taskGid,
        taskUrl: result.taskUrl,
      });

      return result;
    } catch (error: any) {
      logger.error('Error creating task from action item', {
        error: error.message,
        meetingId: options.meetingId,
      });
      throw error;
    }
  }

  /**
   * Get all projects in workspace
   */
  async getProjects(workspaceId: string): Promise<Array<{ gid: string; name: string }>> {
    try {
      const client = await this.getClient(workspaceId);

      const workspace = await prisma.asanaWorkspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const projects = await client.projects.findByWorkspace(workspace.workspaceGid);

      return projects.data.map((p: any) => ({
        gid: p.gid,
        name: p.name,
      }));
    } catch (error: any) {
      logger.error('Error fetching Asana projects', { error: error.message, workspaceId });
      throw error;
    }
  }

  /**
   * Set default project for workspace
   */
  async setDefaultProject(workspaceId: string, projectGid: string): Promise<void> {
    await prisma.asanaWorkspace.update({
      where: { id: workspaceId },
      data: { defaultProjectGid: projectGid },
    });

    logger.info('Default Asana project set', { workspaceId, projectGid });
  }

  /**
   * Bulk create tasks from meeting
   */
  async createTasksFromMeeting(
    meetingId: string,
    workspaceGid: string,
    projectGid?: string
  ): Promise<Array<{ taskGid: string; taskUrl: string; actionItem: string }>> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { transcripts: true },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Extract action items from meeting metadata
    const actionItems =
      (meeting.metadata as any)?.actionItems ||
      (meeting.transcripts?.[0]?.metadata as any)?.actionItems ||
      [];

    if (actionItems.length === 0) {
      logger.info('No action items found in meeting', { meetingId });
      return [];
    }

    logger.info(`Creating ${actionItems.length} Asana tasks from meeting`, {
      meetingId,
      actionItemCount: actionItems.length,
    });

    const results = [];

    for (const actionItem of actionItems) {
      try {
        const result = await this.createTaskFromActionItem({
          meetingId,
          actionItem,
          workspaceGid,
          projectGid,
          assigneeEmail: actionItem.owner,
        });

        results.push({
          ...result,
          actionItem: actionItem.task,
        });
      } catch (error: any) {
        logger.error('Failed to create task for action item', {
          error: error.message,
          actionItem: actionItem.task,
        });
        // Continue with other action items
      }
    }

    logger.info(`Created ${results.length}/${actionItems.length} Asana tasks`, { meetingId });

    return results;
  }

  /**
   * Disconnect workspace
   */
  async disconnectWorkspace(workspaceId: string): Promise<void> {
    await prisma.asanaWorkspace.update({
      where: { id: workspaceId },
      data: { isActive: false },
    });

    this.clients.delete(workspaceId);

    logger.info('Asana workspace disconnected', { workspaceId });

    this.emit('workspace-disconnected', { workspaceId });
  }
}

// Singleton instance
export const asanaIntegrationService = new AsanaIntegrationService();
