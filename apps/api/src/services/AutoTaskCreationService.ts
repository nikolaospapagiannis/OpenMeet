/**
 * Auto Task Creation Service
 *
 * Auto-task creation in PM tools (Asana, Jira, Linear)
 * Features:
 * - Extract action items from transcripts
 * - Create tasks automatically
 * - Assign tasks to participants
 * - Sync task status
 * - Multi-platform support
 */

import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import { logger } from '../utils/logger';
import { Version3Client } from 'jira.js';
import axios from 'axios';
import Asana from 'asana';
import JiraApi from 'jira-client';
import { LinearClient } from '@linear/sdk';
import mondaySDK from 'monday-sdk-js';

const prisma = new PrismaClient();

// Asana API Response Types
interface AsanaTaskResponse {
  gid: string;
  name: string;
  permalink_url: string;
  completed: boolean;
  assignee?: {
    gid: string;
    name: string;
  };
  due_on?: string;
  notes?: string;
}

export interface ActionItem {
  text: string;
  assignee?: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  context?: string;
}

export interface TaskCreationConfig {
  id: string;
  organizationId: string;
  userId: string;
  isActive: boolean;

  // PM Tool settings
  platform: 'asana' | 'jira' | 'linear' | 'monday' | 'clickup' | 'internal';
  platformConfig: {
    apiKey?: string;
    workspaceId?: string;
    projectId?: string;
    boardId?: string;
    teamId?: string;
    defaultAssignee?: string;
    defaultPriority?: string;
    customFields?: Record<string, any>;
  };

  // Auto-creation settings
  autoCreate: boolean;
  requireApproval: boolean;
  minConfidence?: number; // AI confidence threshold (0-1)

  // Task settings
  taskPrefix?: string;
  taskTemplate?: string;
  defaultDueDays?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreatedTask {
  id: string;
  configId: string;
  meetingId: string;
  actionItemText: string;
  internalTaskId?: string; // Our database task ID
  externalTaskId?: string; // External platform task ID
  externalUrl?: string;
  platform: string;
  status: 'pending' | 'created' | 'synced' | 'failed';
  assignedTo?: string;
  dueDate?: Date;
  priority: string;
  errorMessage?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class AutoTaskCreationService {
  // Client instances for each platform (REAL SDKs)
  private asanaClient: Asana.Client | null = null;
  private jiraClient: JiraApi | null = null;
  private linearClient: LinearClient | null = null;
  private mondayApiToken: string | null = null;
  private clickupApiToken: string | null = null;

  // ASANA - REAL SDK
  initAsana(accessToken: string): void {
    if (!accessToken) throw new Error('Asana access token is required');
    this.asanaClient = Asana.Client.create({ defaultHeaders: { 'asana-enable': 'new_user_task_lists' }, logAsanaChangeWarnings: false }).useAccessToken(accessToken);
    logger.info('Asana client initialized');
  }

  async getAsanaWorkspaces(): Promise<any[]> {
    if (!this.asanaClient) throw new Error('Asana not initialized');
    const response = await this.asanaClient.workspaces.findAll();
    return response.data || [];
  }

  async getAsanaProjects(workspaceGid: string): Promise<any[]> {
    if (!this.asanaClient) throw new Error('Asana not initialized');
    const response = await this.asanaClient.projects.findByWorkspace(workspaceGid);
    return response.data || [];
  }

  async createAsanaTaskNew(actionItem: ActionItem, projectGid: string): Promise<string> {
    if (!this.asanaClient) throw new Error('Asana not initialized');
    const taskData: any = { name: actionItem.text || 'Untitled', notes: actionItem.context || '', projects: [projectGid] };
    if (actionItem.dueDate) taskData.due_on = actionItem.dueDate instanceof Date ? actionItem.dueDate.toISOString().split('T')[0] : String(actionItem.dueDate);
    if (actionItem.assignee) taskData.assignee = actionItem.assignee;
    const response = await this.asanaClient.tasks.create(taskData) as AsanaTaskResponse;
    return response.gid;
  }

  async updateAsanaTask(taskGid: string, updates: Partial<ActionItem>): Promise<void> {
    if (!this.asanaClient) throw new Error('Asana not initialized');
    const updateData: any = {};
    if (updates.text !== undefined) updateData.name = updates.text;
    await this.asanaClient.tasks.update(taskGid, updateData);
  }

  // JIRA - REAL jira-client SDK
  initJira(config: { host: string; username: string; password: string; apiVersion?: string }): void {
    if (!config.host || !config.username || !config.password) throw new Error('Jira config incomplete');
    const host = config.host.replace(/^https?:\/\//, '');
    this.jiraClient = new JiraApi({ protocol: 'https', host, username: config.username, password: config.password, apiVersion: config.apiVersion || '2', strictSSL: true });
    logger.info('Jira client initialized', { host });
  }

  async getJiraProjects(): Promise<any[]> {
    if (!this.jiraClient) throw new Error('Jira not initialized');
    return await this.jiraClient.listProjects();
  }

  async createJiraIssueNew(actionItem: ActionItem, projectKey: string): Promise<string> {
    if (!this.jiraClient) throw new Error('Jira not initialized');
    const priorityMap: Record<string, string> = { urgent: 'Highest', high: 'High', medium: 'Medium', low: 'Low' };
    const issueData: any = { fields: { project: { key: projectKey }, summary: actionItem.text || 'Untitled', description: actionItem.context || '', issuetype: { name: 'Task' }, priority: { name: priorityMap[actionItem.priority || 'medium'] } } };
    if (actionItem.dueDate) issueData.fields.duedate = actionItem.dueDate instanceof Date ? actionItem.dueDate.toISOString().split('T')[0] : String(actionItem.dueDate);
    if (actionItem.assignee) issueData.fields.assignee = { name: actionItem.assignee };
    const issue = await this.jiraClient.addNewIssue(issueData);
    return issue.key;
  }

  async searchJiraIssues(jql: string): Promise<any[]> {
    if (!this.jiraClient) throw new Error('Jira not initialized');
    const result = await this.jiraClient.searchJira(jql);
    return result.issues || [];
  }

  async updateJiraIssue(issueKey: string, updates: any): Promise<void> {
    if (!this.jiraClient) throw new Error('Jira not initialized');
    await this.jiraClient.updateIssue(issueKey, { fields: updates });
  }

  async addJiraComment(issueKey: string, comment: string): Promise<void> {
    if (!this.jiraClient) throw new Error('Jira not initialized');
    await this.jiraClient.addComment(issueKey, comment);
  }

  // MONDAY.COM - REAL GraphQL API
  initMonday(apiToken: string): void {
    if (!apiToken) throw new Error('Monday.com API token required');
    this.mondayApiToken = apiToken;
    logger.info('Monday.com initialized');
  }

  async getMondayBoards(): Promise<any[]> {
    if (!this.mondayApiToken) throw new Error('Monday.com not initialized');
    const response = await axios.post('https://api.monday.com/v2', { query: 'query { boards { id name } }' }, { headers: { 'Content-Type': 'application/json', Authorization: this.mondayApiToken } });
    if (response.data.errors) throw new Error(response.data.errors[0]?.message);
    return response.data.data?.boards || [];
  }

  async createMondayItemNew(actionItem: ActionItem, boardId: string, groupId?: string): Promise<string> {
    if (!this.mondayApiToken) throw new Error('Monday.com not initialized');
    const itemName = (actionItem.text || 'Untitled').replace(/"/g, '\\"');
    const columnValues: Record<string, any> = {};
    if (actionItem.priority) columnValues.status = { label: actionItem.priority.charAt(0).toUpperCase() + actionItem.priority.slice(1) };
    if (actionItem.dueDate) columnValues.date = { date: actionItem.dueDate instanceof Date ? actionItem.dueDate.toISOString().split('T')[0] : String(actionItem.dueDate) };
    const columnValuesJson = Object.keys(columnValues).length > 0 ? JSON.stringify(JSON.stringify(columnValues)) : '""';
    const groupIdClause = groupId ? `group_id: "${groupId}",` : '';
    const query = `mutation { create_item(board_id: ${boardId}, ${groupIdClause} item_name: "${itemName}", column_values: ${columnValuesJson}) { id } }`;
    const response = await axios.post('https://api.monday.com/v2', { query }, { headers: { 'Content-Type': 'application/json', Authorization: this.mondayApiToken } });
    if (response.data.errors) throw new Error(response.data.errors[0]?.message);
    return response.data.data?.create_item?.id;
  }

  // LINEAR - REAL SDK
  initLinear(apiKey: string): void {
    if (!apiKey) throw new Error('Linear API key required');
    this.linearClient = new LinearClient({ apiKey });
    logger.info('Linear initialized');
  }

  async getLinearTeams(): Promise<any[]> {
    if (!this.linearClient) throw new Error('Linear not initialized');
    const teams = await this.linearClient.teams();
    return teams.nodes;
  }

  async createLinearIssueNew(actionItem: ActionItem, teamId: string): Promise<string> {
    if (!this.linearClient) throw new Error('Linear not initialized');
    let priority: number | undefined;
    switch (actionItem.priority) { case 'urgent': priority = 1; break; case 'high': priority = 2; break; case 'medium': priority = 3; break; case 'low': priority = 4; break; default: priority = 0; }
    const issuePayload = await this.linearClient.createIssue({ teamId, title: actionItem.text || 'Untitled', description: actionItem.context || '', priority });
    const issue = await issuePayload.issue;
    if (!issue) throw new Error('Linear issue creation failed');
    return issue.id;
  }

  // CLICKUP - REAL REST API
  initClickUp(apiToken: string): void {
    if (!apiToken) throw new Error('ClickUp API token required');
    this.clickupApiToken = apiToken;
    logger.info('ClickUp initialized');
  }

  async getClickUpWorkspaces(): Promise<any[]> {
    if (!this.clickupApiToken) throw new Error('ClickUp not initialized');
    const response = await axios.get('https://api.clickup.com/api/v2/team', { headers: { Authorization: this.clickupApiToken } });
    return response.data?.teams || [];
  }

  async createClickUpTaskNew(actionItem: ActionItem, listId: string): Promise<string> {
    if (!this.clickupApiToken) throw new Error('ClickUp not initialized');
    const priorityMap: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };
    const payload: any = { name: actionItem.text || 'Untitled', description: actionItem.context || '', priority: priorityMap[actionItem.priority || 'medium'] };
    if (actionItem.dueDate) payload.due_date = actionItem.dueDate instanceof Date ? actionItem.dueDate.getTime() : new Date(String(actionItem.dueDate)).getTime();
    const response = await axios.post(`https://api.clickup.com/api/v2/list/${listId}/task`, payload, { headers: { Authorization: this.clickupApiToken, 'Content-Type': 'application/json' } });
    return response.data?.id;
  }

  // AUTO-CREATE TASKS FROM MEETING
  async autoCreateTasksDirectFromMeeting(
    meeting: { id: string; title: string; scheduledStartAt: Date; actionItems: ActionItem[] },
    provider: 'asana' | 'jira' | 'monday' | 'linear' | 'clickup',
    config: { projectId?: string; projectKey?: string; boardId?: string; groupId?: string; teamId?: string; listId?: string }
  ): Promise<string[]> {
    if (!meeting.actionItems?.length) return [];
    const createdTaskIds: string[] = [];
    for (const actionItem of meeting.actionItems) {
      try {
        let taskId: string;
        switch (provider) {
          case 'asana': if (!config.projectId) throw new Error('projectId required'); taskId = await this.createAsanaTaskNew(actionItem, config.projectId); break;
          case 'jira': if (!config.projectKey) throw new Error('projectKey required'); taskId = await this.createJiraIssueNew(actionItem, config.projectKey); break;
          case 'monday': if (!config.boardId) throw new Error('boardId required'); taskId = await this.createMondayItemNew(actionItem, config.boardId, config.groupId); break;
          case 'linear': if (!config.teamId) throw new Error('teamId required'); taskId = await this.createLinearIssueNew(actionItem, config.teamId); break;
          case 'clickup': if (!config.listId) throw new Error('listId required'); taskId = await this.createClickUpTaskNew(actionItem, config.listId); break;
          default: throw new Error(`Unsupported: ${provider}`);
        }
        createdTaskIds.push(taskId);
      } catch (error) { logger.error('Task creation error', { error: error instanceof Error ? error.message : String(error) }); }
    }
    return createdTaskIds;
  }

  /**
   * Create task creation configuration
   * Stored in Organization.settings
   */
  async createConfig(
    organizationId: string,
    userId: string,
    data: {
      platform: 'asana' | 'jira' | 'linear' | 'monday' | 'clickup' | 'internal';
      platformConfig: Record<string, any>;
      autoCreate?: boolean;
      requireApproval?: boolean;
      minConfidence?: number;
      taskPrefix?: string;
      taskTemplate?: string;
      defaultDueDays?: number;
    }
  ): Promise<TaskCreationConfig> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const configId = `task_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const config: TaskCreationConfig = {
        id: configId,
        organizationId,
        userId,
        isActive: true,
        platform: data.platform,
        platformConfig: data.platformConfig,
        autoCreate: data.autoCreate ?? true,
        requireApproval: data.requireApproval ?? false,
        minConfidence: data.minConfidence ?? 0.7,
        taskPrefix: data.taskPrefix,
        taskTemplate: data.taskTemplate,
        defaultDueDays: data.defaultDueDays ?? 7,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in Organization.settings
      const settings = (org.settings as any) || {};
      const taskConfigs = settings.taskCreationConfigs || [];
      taskConfigs.push(config);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            taskCreationConfigs: taskConfigs,
          },
        },
      });

      logger.info('Task creation config created', {
        configId: config.id,
        platform: data.platform,
      });

      return config;
    } catch (error) {
      logger.error('Error creating task creation config', { error });
      throw error;
    }
  }

  /**
   * Get configurations
   * Retrieved from Organization.settings
   */
  async getConfigs(
    organizationId: string,
    filters?: {
      platform?: string;
      isActive?: boolean;
    }
  ): Promise<TaskCreationConfig[]> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        return [];
      }

      const settings = (org.settings as any) || {};
      let configs: TaskCreationConfig[] = settings.taskCreationConfigs || [];

      // Apply filters
      if (filters?.platform) {
        configs = configs.filter((c) => c.platform === filters.platform);
      }

      if (filters?.isActive !== undefined) {
        configs = configs.filter((c) => c.isActive === filters.isActive);
      }

      // Sort by createdAt desc
      configs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return configs;
    } catch (error) {
      logger.error('Error getting task creation configs', { error });
      throw error;
    }
  }

  /**
   * Update configuration
   * Updates in Organization.settings
   */
  async updateConfig(
    configId: string,
    organizationId: string,
    data: Partial<{
      platformConfig: Record<string, any>;
      isActive: boolean;
      autoCreate: boolean;
      requireApproval: boolean;
      minConfidence: number;
      taskPrefix: string;
      taskTemplate: string;
      defaultDueDays: number;
    }>
  ): Promise<TaskCreationConfig> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const configs: TaskCreationConfig[] = settings.taskCreationConfigs || [];
      const configIndex = configs.findIndex((c) => c.id === configId);

      if (configIndex === -1) {
        throw new Error('Config not found');
      }

      // Update config
      configs[configIndex] = {
        ...configs[configIndex],
        ...data,
        updatedAt: new Date(),
      };

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            taskCreationConfigs: configs,
          },
        },
      });

      logger.info('Task creation config updated', { configId });

      return configs[configIndex];
    } catch (error) {
      logger.error('Error updating task creation config', { error, configId });
      throw error;
    }
  }

  /**
   * Delete configuration
   * Removes from Organization.settings
   */
  async deleteConfig(configId: string, organizationId: string): Promise<boolean> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const configs: TaskCreationConfig[] = settings.taskCreationConfigs || [];
      const filteredConfigs = configs.filter((c) => c.id !== configId);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            taskCreationConfigs: filteredConfigs,
          },
        },
      });

      logger.info('Task creation config deleted', { configId });

      return true;
    } catch (error) {
      logger.error('Error deleting task creation config', { error, configId });
      throw error;
    }
  }

  /**
   * Extract action items from meeting
   */
  async extractActionItems(meetingId: string): Promise<ActionItem[]> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          summaries: true,
          participants: true,
        },
      });

      if (!meeting || !meeting.summaries.length) {
        return [];
      }

      const summary = meeting.summaries[0];
      const actionItemsData = summary.actionItems as any;

      if (!Array.isArray(actionItemsData)) {
        return [];
      }

      // Parse and enhance action items
      const actionItems: ActionItem[] = actionItemsData.map((item: any) => {
        // Determine priority from keywords
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
        const textLower = (item.text || '').toLowerCase();

        if (
          textLower.includes('urgent') ||
          textLower.includes('asap') ||
          textLower.includes('immediately')
        ) {
          priority = 'urgent';
        } else if (textLower.includes('important') || textLower.includes('critical')) {
          priority = 'high';
        } else if (textLower.includes('when possible') || textLower.includes('eventually')) {
          priority = 'low';
        }

        // Parse due date if mentioned
        let dueDate: Date | undefined;
        if (item.dueDate) {
          dueDate = new Date(item.dueDate);
        }

        return {
          text: item.text || item,
          assignee: item.assignee,
          dueDate,
          priority,
          context: item.context,
          tags: item.tags || [],
        };
      });

      logger.info('Action items extracted', {
        meetingId,
        count: actionItems.length,
      });

      return actionItems;
    } catch (error) {
      logger.error('Error extracting action items', { error, meetingId });
      return [];
    }
  }

  /**
   * Auto-create tasks from meeting
   */
  async autoCreateTasks(meetingId: string, organizationId: string): Promise<CreatedTask[]> {
    try {
      const configs = await this.getConfigs(organizationId, { isActive: true });

      if (configs.length === 0) {
        logger.info('No active task creation configs found', { organizationId });
        return [];
      }

      const actionItems = await this.extractActionItems(meetingId);

      if (actionItems.length === 0) {
        logger.info('No action items to create tasks from', { meetingId });
        return [];
      }

      const createdTasks: CreatedTask[] = [];

      for (const config of configs) {
        if (!config.autoCreate) {
          continue;
        }

        for (const actionItem of actionItems) {
          try {
            const task = await this.createTask(
              config,
              meetingId,
              actionItem,
              organizationId
            );

            if (task) {
              createdTasks.push(task);
            }
          } catch (error) {
            logger.error('Error creating task from action item', {
              error,
              configId: config.id,
              actionItem: actionItem.text,
            });
          }
        }
      }

      logger.info('Tasks auto-created from meeting', {
        meetingId,
        totalTasks: createdTasks.length,
      });

      return createdTasks;
    } catch (error) {
      logger.error('Error auto-creating tasks', { error, meetingId });
      return [];
    }
  }

  /**
   * Create a single task
   */
  async createTask(
    config: TaskCreationConfig,
    meetingId: string,
    actionItem: ActionItem,
    organizationId: string
  ): Promise<CreatedTask | null> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return null;
      }

      // Generate task title
      let taskTitle = actionItem.text;
      if (config.taskPrefix) {
        taskTitle = `${config.taskPrefix} ${taskTitle}`;
      }

      // Apply template if available
      if (config.taskTemplate) {
        taskTitle = config.taskTemplate
          .replace('{{action}}', actionItem.text)
          .replace('{{meeting}}', meeting.title)
          .replace('{{date}}', meeting.scheduledStartAt.toLocaleDateString());
      }

      // Calculate due date
      let dueDate = actionItem.dueDate;
      if (!dueDate && config.defaultDueDays) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + config.defaultDueDays);
      }

      // Find assignee user ID
      let assignedToUserId: string | undefined;
      if (actionItem.assignee) {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { contains: actionItem.assignee, mode: 'insensitive' } },
              { firstName: { contains: actionItem.assignee, mode: 'insensitive' } },
              { lastName: { contains: actionItem.assignee, mode: 'insensitive' } },
            ],
            organizationId,
          },
        });
        assignedToUserId = user?.id;
      }

      // Convert priority
      const priorityMap: Record<string, TaskPriority> = {
        low: TaskPriority.low,
        medium: TaskPriority.medium,
        high: TaskPriority.high,
        urgent: TaskPriority.urgent,
      };

      const priority = priorityMap[actionItem.priority || 'medium'];

      // Create internal task
      const internalTask = await prisma.task.create({
        data: {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: taskTitle,
          description: `Action item from meeting: ${meeting.title}\n\nContext: ${actionItem.context || actionItem.text}`,
          status: TaskStatus.open,
          priority,
          dueDate,
          assignedTo: assignedToUserId,
          organizationId,
          createdBy: meeting.userId || config.userId,
          sourceType: 'meeting',
          sourceId: meetingId,
          metadata: {
            meetingId,
            meetingTitle: meeting.title,
            actionItemText: actionItem.text,
            autoCreated: true,
            configId: config.id,
          },
        },
      });

      let externalTaskId: string | undefined;
      let externalUrl: string | undefined;
      let status: 'pending' | 'created' | 'synced' | 'failed' = 'created';
      let errorMessage: string | undefined;

      // Sync to external platform if not internal
      if (config.platform !== 'internal') {
        try {
          const externalTask = await this.syncToExternalPlatform(
            config,
            taskTitle,
            actionItem,
            meeting
          );

          if (externalTask) {
            externalTaskId = externalTask.id;
            externalUrl = externalTask.url;
            status = 'synced';

            // Update internal task with external reference in metadata
            await prisma.task.update({
              where: { id: internalTask.id },
              data: {
                externalSystem: config.platform,
                externalSyncedAt: new Date(),
                metadata: {
                  ...(internalTask.metadata as any || {}),
                  externalId: externalTaskId,
                  externalUrl,
                },
              },
            });
          }
        } catch (error) {
          logger.error('Error syncing to external platform', {
            error,
            platform: config.platform,
          });
          status = 'failed';
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      // Store creation info in task metadata
      const createdTask: CreatedTask = {
        id: `created_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        configId: config.id,
        meetingId,
        actionItemText: actionItem.text,
        internalTaskId: internalTask.id,
        externalTaskId,
        externalUrl,
        platform: config.platform,
        status,
        assignedTo: actionItem.assignee,
        dueDate,
        priority: actionItem.priority || 'medium',
        errorMessage,
        lastSyncedAt: status === 'synced' ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Task created', {
        taskId: internalTask.id,
        platform: config.platform,
        status,
      });

      return createdTask;
    } catch (error) {
      logger.error('Error creating task', { error });
      return null;
    }
  }

  /**
   * Sync task to external platform
   */
  private async syncToExternalPlatform(
    config: TaskCreationConfig,
    title: string,
    actionItem: ActionItem,
    meeting: any
  ): Promise<{ id: string; url: string } | null> {
    try {
      const platformConfig = config.platformConfig as any;

      switch (config.platform) {
        case 'asana':
          return await this.syncToAsana(platformConfig, title, actionItem, meeting);

        case 'jira':
          return await this.syncToJira(platformConfig, title, actionItem, meeting);

        case 'linear':
          return await this.syncToLinear(platformConfig, title, actionItem, meeting);

        case 'monday':
          return await this.syncToMonday(platformConfig, title, actionItem, meeting);

        case 'clickup':
          return await this.syncToClickUp(platformConfig, title, actionItem, meeting);

        default:
          logger.warn('Unknown platform', { platform: config.platform });
          return null;
      }
    } catch (error) {
      logger.error('Error syncing to external platform', { error, platform: config.platform });
      throw error;
    }
  }

  /**
   * Sync to Asana
   */
  private async syncToAsana(
    config: any,
    title: string,
    actionItem: ActionItem,
    meeting: any
  ): Promise<{ id: string; url: string }> {
    try {
      // Get API token from config or environment
      const apiToken = config.apiKey || process.env.ASANA_ACCESS_TOKEN;

      if (!apiToken) {
        throw new Error('Asana API token not configured');
      }

      if (!config.projectId) {
        throw new Error('Asana project ID not configured');
      }

      // Initialize Asana client
      const client = Asana.Client.create({
        defaultHeaders: { 'asana-enable': 'new_user_task_lists' },
        logAsanaChangeWarnings: false,
      }).useAccessToken(apiToken);

      // Build task description
      const description = [
        `Action item from meeting: ${meeting.title}`,
        actionItem.context ? `\nContext: ${actionItem.context}` : '',
        `\nMeeting Date: ${new Date(meeting.scheduledStartAt).toLocaleDateString()}`,
      ].filter(Boolean).join('\n');

      // Map priority to Asana (Asana doesn't have native priority, but we can add it to notes)
      const priorityLabel = actionItem.priority ? `Priority: ${actionItem.priority.toUpperCase()}` : '';

      // Build task data
      const taskData: any = {
        name: title,
        notes: [description, priorityLabel].filter(Boolean).join('\n\n'),
        projects: [config.projectId],
      };

      // Add due date if available
      if (actionItem.dueDate) {
        // Asana expects YYYY-MM-DD format
        const dueDate = new Date(actionItem.dueDate);
        taskData.due_on = dueDate.toISOString().split('T')[0];
      }

      // Add assignee if configured
      if (config.defaultAssignee) {
        taskData.assignee = config.defaultAssignee;
      }

      // Add custom fields if configured
      if (config.customFields) {
        taskData.custom_fields = config.customFields;
      }

      // Create task in Asana
      logger.info('Creating task in Asana', {
        projectId: config.projectId,
        taskName: title
      });

      const response = await client.tasks.create(taskData) as AsanaTaskResponse;

      logger.info('Task created in Asana successfully', {
        taskId: response.gid,
        taskUrl: response.permalink_url
      });

      return {
        id: response.gid,
        url: response.permalink_url,
      };
    } catch (error) {
      logger.error('Error creating task in Asana', {
        error: error instanceof Error ? error.message : String(error),
        title,
        projectId: config.projectId
      });
      throw new Error(`Failed to create Asana task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync to Jira
   */
  private async syncToJira(
    config: any,
    title: string,
    actionItem: ActionItem,
    meeting: any
  ): Promise<{ id: string; url: string }> {
    try {
      // Validate required configuration
      if (!config.host) {
        throw new Error('Jira host is required in platformConfig');
      }
      if (!config.email) {
        throw new Error('Jira email is required in platformConfig');
      }
      if (!config.apiToken) {
        throw new Error('Jira API token is required in platformConfig');
      }
      if (!config.projectKey) {
        throw new Error('Jira project key is required in platformConfig');
      }

      // Initialize Jira client
      const jiraClient = new Version3Client({
        host: config.host, // e.g., 'your-domain.atlassian.net' or 'jira.yourcompany.com'
        authentication: {
          basic: {
            email: config.email,
            apiToken: config.apiToken,
          },
        },
      });

      // Map priority to Jira priority
      const priorityMap: Record<string, string> = {
        urgent: 'Highest',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      };
      const jiraPriority = priorityMap[actionItem.priority || 'medium'] || 'Medium';

      // Build description with meeting context
      const description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Action item from meeting: ${meeting.title}`,
                marks: [{ type: 'strong' }],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `\n${actionItem.context || actionItem.text}`,
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `\nMeeting Date: ${meeting.scheduledStartAt ? new Date(meeting.scheduledStartAt).toLocaleString() : 'N/A'}`,
              },
            ],
          },
        ],
      };

      // Build issue data
      const issueData: any = {
        fields: {
          project: {
            key: config.projectKey,
          },
          summary: title,
          description,
          issuetype: {
            name: config.issueType || 'Task',
          },
        },
      };

      // Add priority if supported
      if (jiraPriority) {
        issueData.fields.priority = { name: jiraPriority };
      }

      // Add due date if available
      if (actionItem.dueDate) {
        issueData.fields.duedate = actionItem.dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      // Add assignee if specified
      if (config.defaultAssignee) {
        issueData.fields.assignee = {
          accountId: config.defaultAssignee, // Jira Cloud uses accountId
        };
      }

      // Add labels/tags if available
      if (actionItem.tags && actionItem.tags.length > 0) {
        issueData.fields.labels = actionItem.tags;
      }

      // Add custom fields if configured
      if (config.customFields) {
        Object.entries(config.customFields).forEach(([key, value]) => {
          issueData.fields[key] = value;
        });
      }

      logger.info('Creating Jira issue', {
        projectKey: config.projectKey,
        summary: title,
        host: config.host,
      });

      // Create the issue
      const createdIssue = await jiraClient.issues.createIssue(issueData);

      if (!createdIssue.key) {
        throw new Error('Jira API did not return an issue key');
      }

      // Construct the issue URL
      const issueUrl = `https://${config.host}/browse/${createdIssue.key}`;

      logger.info('Jira issue created successfully', {
        key: createdIssue.key,
        url: issueUrl,
      });

      return {
        id: createdIssue.key,
        url: issueUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating Jira issue', {
        error: errorMessage,
        host: config.host,
        projectKey: config.projectKey,
      });

      // Provide more specific error messages
      if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
        throw new Error('Jira authentication failed. Please check your email and API token.');
      } else if (errorMessage.includes('404')) {
        throw new Error('Jira project not found. Please check your project key.');
      } else if (errorMessage.includes('403')) {
        throw new Error('Jira access denied. Please check your permissions.');
      } else if (errorMessage.includes('required in platformConfig')) {
        throw error; // Re-throw configuration errors as-is
      } else {
        throw new Error(`Failed to create Jira issue: ${errorMessage}`);
      }
    }
  }

  /**
   * Sync to Linear
   */
  private async syncToLinear(
    config: any,
    title: string,
    actionItem: ActionItem,
    meeting: any
  ): Promise<{ id: string; url: string }> {
    try {
      const apiKey = config.apiKey || process.env.LINEAR_API_KEY;

      if (!apiKey) {
        throw new Error('Linear API key not configured');
      }

      if (!config.teamId) {
        throw new Error('Linear team ID not configured');
      }

      // Initialize Linear client
      const linear = new LinearClient({ apiKey });

      // Build issue description
      const description = [
        `Action item from meeting: ${meeting.title}`,
        actionItem.context ? `\nContext: ${actionItem.context}` : '',
        `\nMeeting Date: ${new Date(meeting.scheduledStartAt).toLocaleDateString()}`,
      ].filter(Boolean).join('\n');

      // Map priority to Linear priority (1 = urgent, 2 = high, 3 = medium, 4 = low)
      let priority: number | undefined;
      switch (actionItem.priority) {
        case 'urgent':
          priority = 1;
          break;
        case 'high':
          priority = 2;
          break;
        case 'medium':
          priority = 3;
          break;
        case 'low':
          priority = 4;
          break;
      }

      // Create issue in Linear
      const issuePayload = await linear.createIssue({
        teamId: config.teamId,
        title,
        description,
        priority,
      });

      const issue = await issuePayload.issue;

      if (!issue) {
        throw new Error('Failed to create Linear issue');
      }

      logger.info('Linear issue created successfully', {
        issueId: issue.id,
        title,
      });

      return {
        id: issue.id,
        url: issue.url,
      };
    } catch (error) {
      logger.error('Error syncing to Linear', { error, title });
      throw error;
    }
  }

  /**
   * Sync to Monday.com
   */
  private async syncToMonday(
    config: any,
    title: string,
    actionItem: ActionItem,
    meeting: any
  ): Promise<{ id: string; url: string }> {
    try {
      // Get API token from config or environment
      const apiToken = config.apiKey || process.env.MONDAY_API_TOKEN;

      if (!apiToken) {
        throw new Error('Monday.com API token not configured');
      }

      if (!config.boardId) {
        throw new Error('Monday.com board ID not configured');
      }

      // Initialize Monday SDK
      const monday = mondaySDK();
      monday.setToken(apiToken);

      // Escape special characters in GraphQL string
      const escapedTitle = title.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      const escapedDescription = `Action item from meeting: ${meeting.title}\\n\\nContext: ${
        actionItem.context || actionItem.text
      }\\n\\nMeeting Date: ${new Date(meeting.scheduledStartAt).toLocaleDateString()}`;

      // Map priority to Monday.com status labels (can be customized based on board configuration)
      const priorityMap: Record<string, string> = {
        urgent: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      };
      const mondayPriority = priorityMap[actionItem.priority || 'medium'];

      // Build column values JSON for Monday.com
      const columnValues: Record<string, any> = {};

      // Add status/priority if configured
      if (config.priorityColumnId && mondayPriority) {
        columnValues[config.priorityColumnId] = { label: mondayPriority };
      }

      // Add due date if available
      if (actionItem.dueDate && config.dueDateColumnId) {
        columnValues[config.dueDateColumnId] = {
          date: actionItem.dueDate.toISOString().split('T')[0],
        };
      }

      // Add description/notes if configured
      if (config.notesColumnId) {
        columnValues[config.notesColumnId] = escapedDescription;
      }

      // Add custom fields if configured
      if (config.customFields) {
        Object.entries(config.customFields).forEach(([columnId, value]) => {
          columnValues[columnId] = value;
        });
      }

      // Prepare column values as JSON string
      const columnValuesJson = JSON.stringify(columnValues).replace(/"/g, '\\"');

      // Build GraphQL mutation
      const mutation = `mutation {
        create_item (
          board_id: ${config.boardId},
          ${config.groupId ? `group_id: "${config.groupId}",` : ''}
          item_name: "${escapedTitle}"
          ${Object.keys(columnValues).length > 0 ? `,column_values: "${columnValuesJson}"` : ''}
        ) {
          id
        }
      }`;

      logger.info('Creating item in Monday.com', {
        boardId: config.boardId,
        groupId: config.groupId,
        title,
      });

      // Execute GraphQL mutation
      const response = await monday.api(mutation);

      if (!response || !response.data || !response.data.create_item) {
        throw new Error('Invalid response from Monday.com API');
      }

      const itemId = response.data.create_item.id;
      const itemUrl = `https://view.monday.com/boards/${config.boardId}/pulses/${itemId}`;

      logger.info('Item created in Monday.com successfully', {
        itemId,
        itemUrl,
      });

      return {
        id: itemId,
        url: itemUrl,
      };
    } catch (error) {
      logger.error('Error creating item in Monday.com', {
        error: error instanceof Error ? error.message : String(error),
        title,
        boardId: config.boardId,
      });
      throw new Error(
        `Failed to create Monday.com item: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Sync to ClickUp
   */
  private async syncToClickUp(
    config: any,
    title: string,
    actionItem: ActionItem,
    meeting: any
  ): Promise<{ id: string; url: string }> {
    try {
      const apiToken = config.apiKey || process.env.CLICKUP_API_TOKEN;

      if (!apiToken) {
        throw new Error('ClickUp API token not configured');
      }

      if (!config.listId) {
        throw new Error('ClickUp list ID not configured');
      }

      // Map priority levels to ClickUp priority values (1=urgent, 2=high, 3=normal, 4=low)
      const priorityMap: Record<string, number> = {
        urgent: 1,
        high: 2,
        medium: 3,
        low: 4,
      };

      const priority = priorityMap[actionItem.priority || 'medium'];

      // Build task description
      const description = `Action item from meeting: ${meeting.title}\n\n${actionItem.context || actionItem.text}\n\nMeeting Date: ${new Date(meeting.scheduledStartAt).toLocaleString()}`;

      // Build request payload
      const payload: any = {
        name: title,
        description: description,
        priority: priority,
      };

      // Add due date if available (ClickUp expects Unix timestamp in milliseconds)
      if (actionItem.dueDate) {
        payload.due_date = new Date(actionItem.dueDate).getTime();
      }

      // Add assignees if configured
      if (config.defaultAssignee) {
        payload.assignees = [config.defaultAssignee];
      }

      // Add custom fields if configured
      if (config.customFields) {
        payload.custom_fields = config.customFields;
      }

      // Add tags if available
      if (actionItem.tags && actionItem.tags.length > 0) {
        payload.tags = actionItem.tags;
      }

      logger.info('Creating task in ClickUp', {
        listId: config.listId,
        title,
      });

      // Make API request to ClickUp
      const response = await axios.post(
        `https://api.clickup.com/api/v2/list/${config.listId}/task`,
        payload,
        {
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (!response.data || !response.data.id) {
        throw new Error('Invalid response from ClickUp API');
      }

      logger.info('Task created in ClickUp', {
        taskId: response.data.id,
        url: response.data.url,
      });

      return {
        id: response.data.id,
        url: response.data.url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.err || error.message;

        logger.error('ClickUp API error', {
          status,
          message,
          listId: config.listId,
        });

        throw new Error(`ClickUp API error (${status}): ${message}`);
      }

      logger.error('Error syncing to ClickUp', { error });
      throw error;
    }
  }

  /**
   * Get created tasks for a meeting
   * Retrieved from Task.metadata
   */
  async getCreatedTasks(meetingId: string): Promise<CreatedTask[]> {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          sourceType: 'meeting',
          sourceId: meetingId,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Map Task to CreatedTask format
      const createdTasks: CreatedTask[] = tasks.map((task) => {
        const metadata = task.metadata as any || {};
        return {
          id: task.id,
          configId: metadata.configId || '',
          meetingId,
          actionItemText: metadata.actionItemText || task.title,
          internalTaskId: task.id,
          externalTaskId: metadata.externalId,
          externalUrl: metadata.externalUrl,
          platform: task.externalSystem || 'internal',
          status: metadata.syncStatus || 'created',
          assignedTo: task.assignedTo,
          dueDate: task.dueDate || undefined,
          priority: task.priority,
          errorMessage: metadata.errorMessage,
          lastSyncedAt: task.externalSyncedAt || undefined,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      });

      return createdTasks;
    } catch (error) {
      logger.error('Error getting created tasks', { error, meetingId });
      return [];
    }
  }

  /**
   * Sync task status from external platform
   * REAL IMPLEMENTATION - Actually fetches status from external platforms
   */
  async syncTaskStatus(taskId: string, organizationId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const metadata = task.metadata as any || {};
      const externalTaskId = metadata.externalId;

      if (!externalTaskId) {
        throw new Error(`Task ${taskId} is not linked to an external system`);
      }

      if (!task.externalSystem) {
        throw new Error(`Task ${taskId} has no external system specified`);
      }

      // Get config from organization settings
      const configs = await this.getConfigs(organizationId);
      const config = configs.find((c) => c.id === metadata.configId);

      if (!config) {
        throw new Error(`Configuration not found for task ${taskId}`);
      }

      const platformConfig = config.platformConfig as any;
      let externalStatus: string;
      let isCompleted = false;
      let updatedData: any = {};

      logger.info('Fetching real status from external platform', {
        taskId,
        platform: task.externalSystem,
        externalId: externalTaskId,
      });

      // REAL status fetching based on platform
      switch (task.externalSystem) {
        case 'asana': {
          // Initialize Asana client with real credentials
          const apiToken = platformConfig.apiKey || process.env.ASANA_ACCESS_TOKEN;
          if (!apiToken) {
            throw new Error('Asana API token not configured');
          }

          const asanaClient = Asana.Client.create({
            defaultHeaders: { 'asana-enable': 'new_user_task_lists' },
            logAsanaChangeWarnings: false,
          }).useAccessToken(apiToken);

          // Fetch REAL task status from Asana
          const asanaTask = await asanaClient.tasks.findById(externalTaskId);

          isCompleted = asanaTask.completed;
          externalStatus = isCompleted ? 'completed' : 'in_progress';

          // Store additional Asana metadata
          updatedData = {
            lastAsanaStatus: {
              completed: asanaTask.completed,
              completed_at: asanaTask.completed_at,
              modified_at: asanaTask.modified_at,
              assignee: asanaTask.assignee,
              due_on: asanaTask.due_on,
              notes: asanaTask.notes,
            },
          };

          logger.info('Asana task status fetched', {
            taskId,
            externalId: externalTaskId,
            completed: isCompleted,
            externalStatus,
          });
          break;
        }

        case 'jira': {
          // Initialize Jira client with real credentials
          if (!platformConfig.host || !platformConfig.username || !platformConfig.password) {
            throw new Error('Jira configuration incomplete');
          }

          const jiraClient = new JiraApi({
            protocol: 'https',
            host: platformConfig.host.replace(/^https?:\/\//, ''),
            username: platformConfig.username,
            password: platformConfig.password,
            apiVersion: '2',
            strictSSL: true,
          });

          // Fetch REAL issue status from Jira
          const jiraIssue = await jiraClient.findIssue(externalTaskId);
          const jiraStatus = jiraIssue.fields.status.name.toLowerCase();

          // Map Jira status to our internal status
          if (jiraStatus === 'done' || jiraStatus === 'closed' || jiraStatus === 'resolved') {
            isCompleted = true;
            externalStatus = 'completed';
          } else if (jiraStatus === 'in progress' || jiraStatus === 'in review') {
            externalStatus = 'in_progress';
          } else if (jiraStatus === 'blocked') {
            externalStatus = 'blocked';
          } else {
            externalStatus = 'open';
          }

          // Store additional Jira metadata
          updatedData = {
            lastJiraStatus: {
              status: jiraIssue.fields.status.name,
              statusCategory: jiraIssue.fields.status.statusCategory?.name,
              resolution: jiraIssue.fields.resolution?.name,
              updated: jiraIssue.fields.updated,
              assignee: jiraIssue.fields.assignee?.name,
              priority: jiraIssue.fields.priority?.name,
            },
          };

          logger.info('Jira issue status fetched', {
            taskId,
            externalId: externalTaskId,
            jiraStatus,
            mappedStatus: externalStatus,
          });
          break;
        }

        case 'linear': {
          // Initialize Linear client with real credentials
          const apiKey = platformConfig.apiKey || process.env.LINEAR_API_KEY;
          if (!apiKey) {
            throw new Error('Linear API key not configured');
          }

          const linearClient = new LinearClient({ apiKey });

          // Fetch REAL issue status from Linear
          const linearIssue = await linearClient.issue(externalTaskId);
          const state = await linearIssue.state;
          const stateName = state?.name.toLowerCase() || '';
          const stateType = state?.type.toLowerCase() || '';

          // Map Linear state to our internal status
          if (stateType === 'completed' || stateType === 'canceled') {
            isCompleted = true;
            externalStatus = 'completed';
          } else if (stateType === 'started' || stateName.includes('progress')) {
            externalStatus = 'in_progress';
          } else if (stateName.includes('blocked')) {
            externalStatus = 'blocked';
          } else {
            externalStatus = 'open';
          }

          // Store additional Linear metadata
          updatedData = {
            lastLinearStatus: {
              state: state?.name,
              stateType: state?.type,
              priority: await linearIssue.priority,
              estimate: await linearIssue.estimate,
              assignee: (await linearIssue.assignee)?.name,
              updatedAt: linearIssue.updatedAt,
            },
          };

          logger.info('Linear issue status fetched', {
            taskId,
            externalId: externalTaskId,
            linearState: state?.name,
            mappedStatus: externalStatus,
          });
          break;
        }

        case 'monday': {
          // Initialize Monday.com API with real credentials
          const apiToken = platformConfig.apiKey || process.env.MONDAY_API_TOKEN;
          if (!apiToken) {
            throw new Error('Monday.com API token not configured');
          }

          // Fetch REAL item status from Monday.com via GraphQL
          const query = `query {
            items(ids: [${externalTaskId}]) {
              id
              name
              state
              column_values {
                id
                text
                value
              }
              updated_at
            }
          }`;

          const response = await axios.post(
            'https://api.monday.com/v2',
            { query },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: apiToken,
              },
            }
          );

          if (response.data.errors) {
            throw new Error(`Monday.com API error: ${response.data.errors[0]?.message}`);
          }

          const item = response.data.data?.items?.[0];
          if (!item) {
            throw new Error(`Monday.com item not found: ${externalTaskId}`);
          }

          // Parse status from column values
          const statusColumn = item.column_values?.find((col: any) =>
            col.id === 'status' || col.id === platformConfig.statusColumnId
          );

          const mondayStatus = statusColumn?.text?.toLowerCase() || item.state?.toLowerCase() || 'active';

          // Map Monday.com status to our internal status
          if (mondayStatus === 'done' || mondayStatus === 'complete' || mondayStatus === 'completed') {
            isCompleted = true;
            externalStatus = 'completed';
          } else if (mondayStatus === 'working on it' || mondayStatus === 'in progress') {
            externalStatus = 'in_progress';
          } else if (mondayStatus === 'stuck' || mondayStatus === 'blocked') {
            externalStatus = 'blocked';
          } else {
            externalStatus = 'open';
          }

          // Store additional Monday.com metadata
          updatedData = {
            lastMondayStatus: {
              state: item.state,
              statusText: statusColumn?.text,
              updatedAt: item.updated_at,
              columnValues: item.column_values,
            },
          };

          logger.info('Monday.com item status fetched', {
            taskId,
            externalId: externalTaskId,
            mondayStatus,
            mappedStatus: externalStatus,
          });
          break;
        }

        case 'clickup': {
          // Initialize ClickUp API with real credentials
          const apiToken = platformConfig.apiKey || process.env.CLICKUP_API_TOKEN;
          if (!apiToken) {
            throw new Error('ClickUp API token not configured');
          }

          // Fetch REAL task status from ClickUp
          const response = await axios.get(
            `https://api.clickup.com/api/v2/task/${externalTaskId}`,
            {
              headers: {
                Authorization: apiToken,
              },
            }
          );

          const clickUpTask = response.data;
          const clickUpStatus = clickUpTask.status?.status?.toLowerCase() || '';

          // Map ClickUp status to our internal status
          if (clickUpStatus === 'closed' || clickUpStatus === 'complete' || clickUpStatus === 'done') {
            isCompleted = true;
            externalStatus = 'completed';
          } else if (clickUpStatus === 'in progress' || clickUpStatus === 'in review') {
            externalStatus = 'in_progress';
          } else if (clickUpStatus === 'blocked' || clickUpStatus === 'on hold') {
            externalStatus = 'blocked';
          } else {
            externalStatus = 'open';
          }

          // Store additional ClickUp metadata
          updatedData = {
            lastClickUpStatus: {
              status: clickUpTask.status?.status,
              statusType: clickUpTask.status?.type,
              priority: clickUpTask.priority?.priority,
              assignees: clickUpTask.assignees,
              due_date: clickUpTask.due_date,
              date_updated: clickUpTask.date_updated,
            },
          };

          logger.info('ClickUp task status fetched', {
            taskId,
            externalId: externalTaskId,
            clickUpStatus,
            mappedStatus: externalStatus,
          });
          break;
        }

        default:
          throw new Error(`Unsupported external system: ${task.externalSystem}`);
      }

      // Map external status to TaskStatus enum
      let taskStatus: TaskStatus;
      switch (externalStatus) {
        case 'completed':
          taskStatus = TaskStatus.completed;
          break;
        case 'in_progress':
          taskStatus = TaskStatus.in_progress;
          break;
        case 'blocked':
          // Map 'blocked' to 'open' as TaskStatus doesn't have 'blocked' value
          taskStatus = TaskStatus.open;
          break;
        default:
          taskStatus = TaskStatus.open;
      }

      // Update task with REAL synced status
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: taskStatus,
          externalSyncedAt: new Date(),
          metadata: {
            ...metadata,
            syncStatus: 'synced',
            lastSyncedStatus: externalStatus,
            lastSyncedAt: new Date().toISOString(),
            isCompleted,
            ...updatedData,
          },
        },
      });

      logger.info('Task status successfully synced from external platform', {
        taskId,
        platform: task.externalSystem,
        externalId: externalTaskId,
        externalStatus,
        internalStatus: taskStatus,
        isCompleted,
      });

      return true;
    } catch (error) {
      logger.error('Error syncing task status from external platform', {
        error: error instanceof Error ? error.message : String(error),
        taskId,
        organizationId,
      });

      // Mark sync as failed in metadata
      try {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (task) {
          const metadata = task.metadata as any || {};
          await prisma.task.update({
            where: { id: taskId },
            data: {
              metadata: {
                ...metadata,
                syncStatus: 'failed',
                lastSyncError: error instanceof Error ? error.message : String(error),
                lastSyncAttempt: new Date().toISOString(),
              },
            },
          });
        }
      } catch (updateError) {
        logger.error('Failed to update sync error status', { updateError, taskId });
      }

      return false;
    }
  }

  /**
   * Batch sync multiple task statuses from external platforms
   * REAL IMPLEMENTATION - Efficiently syncs multiple tasks
   */
  async batchSyncTaskStatuses(taskIds: string[], organizationId: string): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    logger.info('Starting batch sync of task statuses', {
      organizationId,
      taskCount: taskIds.length,
    });

    // Process tasks in parallel with a concurrency limit
    const concurrencyLimit = 5;
    const chunks: string[][] = [];
    for (let i = 0; i < taskIds.length; i += concurrencyLimit) {
      chunks.push(taskIds.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (taskId) => {
        try {
          const result = await this.syncTaskStatus(taskId, organizationId);
          if (result) {
            successful.push(taskId);
          } else {
            failed.push(taskId);
          }
        } catch (error) {
          logger.error('Error in batch sync for task', {
            taskId,
            error: error instanceof Error ? error.message : String(error),
          });
          failed.push(taskId);
        }
      });

      await Promise.all(promises);
    }

    logger.info('Batch sync completed', {
      organizationId,
      successful: successful.length,
      failed: failed.length,
    });

    return { successful, failed };
  }

  /**
   * Sync all external tasks for an organization
   * REAL IMPLEMENTATION - Syncs all tasks linked to external systems
   */
  async syncAllOrganizationTasks(organizationId: string): Promise<{
    totalTasks: number;
    synced: number;
    failed: number;
    skipped: number;
  }> {
    try {
      logger.info('Starting organization-wide task sync', { organizationId });

      // Find all tasks with external systems
      const tasks = await prisma.task.findMany({
        where: {
          organizationId,
          externalSystem: {
            not: null,
          },
        },
        select: {
          id: true,
          externalSystem: true,
          metadata: true,
          externalSyncedAt: true,
        },
      });

      let synced = 0;
      let failed = 0;
      let skipped = 0;

      for (const task of tasks) {
        const metadata = task.metadata as any || {};

        // Skip if no external ID
        if (!metadata.externalId) {
          skipped++;
          logger.debug('Skipping task without external ID', { taskId: task.id });
          continue;
        }

        // Skip if recently synced (within last 5 minutes) to avoid rate limiting
        if (task.externalSyncedAt) {
          const lastSyncTime = new Date(task.externalSyncedAt).getTime();
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          if (lastSyncTime > fiveMinutesAgo) {
            skipped++;
            logger.debug('Skipping recently synced task', {
              taskId: task.id,
              lastSynced: task.externalSyncedAt,
            });
            continue;
          }
        }

        // Attempt to sync
        try {
          const result = await this.syncTaskStatus(task.id, organizationId);
          if (result) {
            synced++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          logger.error('Failed to sync task in organization sync', {
            taskId: task.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const result = {
        totalTasks: tasks.length,
        synced,
        failed,
        skipped,
      };

      logger.info('Organization-wide task sync completed', {
        organizationId,
        ...result,
      });

      return result;
    } catch (error) {
      logger.error('Error in organization-wide task sync', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Verify external task still exists
   * REAL IMPLEMENTATION - Checks if task exists in external system
   */
  async verifyExternalTaskExists(taskId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task || !task.externalSystem) {
        return false;
      }

      const metadata = task.metadata as any || {};
      const externalId = metadata.externalId;

      if (!externalId) {
        return false;
      }

      // Get the configuration
      const configs = await this.getConfigs(task.organizationId);
      const config = configs.find((c) => c.id === metadata.configId);

      if (!config) {
        return false;
      }

      const platformConfig = config.platformConfig as any;

      logger.info('Verifying external task exists', {
        taskId,
        platform: task.externalSystem,
        externalId,
      });

      try {
        switch (task.externalSystem) {
          case 'asana': {
            const apiToken = platformConfig.apiKey || process.env.ASANA_ACCESS_TOKEN;
            if (!apiToken) return false;

            const asanaClient = Asana.Client.create({
              defaultHeaders: { 'asana-enable': 'new_user_task_lists' },
              logAsanaChangeWarnings: false,
            }).useAccessToken(apiToken);

            const asanaTask = await asanaClient.tasks.findById(externalId);
            return !!asanaTask;
          }

          case 'jira': {
            if (!platformConfig.host || !platformConfig.username || !platformConfig.password) {
              return false;
            }

            const jiraClient = new JiraApi({
              protocol: 'https',
              host: platformConfig.host.replace(/^https?:\/\//, ''),
              username: platformConfig.username,
              password: platformConfig.password,
              apiVersion: '2',
              strictSSL: true,
            });

            const issue = await jiraClient.findIssue(externalId);
            return !!issue;
          }

          case 'linear': {
            const apiKey = platformConfig.apiKey || process.env.LINEAR_API_KEY;
            if (!apiKey) return false;

            const linearClient = new LinearClient({ apiKey });
            const issue = await linearClient.issue(externalId);
            return !!issue;
          }

          case 'monday': {
            const apiToken = platformConfig.apiKey || process.env.MONDAY_API_TOKEN;
            if (!apiToken) return false;

            const query = `query { items(ids: [${externalId}]) { id } }`;
            const response = await axios.post(
              'https://api.monday.com/v2',
              { query },
              { headers: { 'Content-Type': 'application/json', Authorization: apiToken } }
            );

            return !!(response.data?.data?.items?.[0]);
          }

          case 'clickup': {
            const apiToken = platformConfig.apiKey || process.env.CLICKUP_API_TOKEN;
            if (!apiToken) return false;

            const response = await axios.get(
              `https://api.clickup.com/api/v2/task/${externalId}`,
              { headers: { Authorization: apiToken } }
            );

            return !!response.data;
          }

          default:
            return false;
        }
      } catch (error) {
        // Task doesn't exist in external system
        logger.warn('External task not found', {
          taskId,
          externalId,
          platform: task.externalSystem,
          error: error instanceof Error ? error.message : String(error),
        });

        // Update metadata to reflect task is missing
        await prisma.task.update({
          where: { id: taskId },
          data: {
            metadata: {
              ...metadata,
              externalTaskMissing: true,
              externalTaskMissingAt: new Date().toISOString(),
            },
          },
        });

        return false;
      }
    } catch (error) {
      logger.error('Error verifying external task existence', {
        error: error instanceof Error ? error.message : String(error),
        taskId,
      });
      return false;
    }
  }

  /**
   * Retry failed task creation
   */
  async retryFailedTask(taskId: string, organizationId: string): Promise<boolean> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return false;
      }

      const metadata = task.metadata as any || {};
      if (metadata.syncStatus !== 'failed') {
        return false;
      }

      // Get config from organization settings
      const configs = await this.getConfigs(organizationId);
      const config = configs.find((c) => c.id === metadata.configId);

      if (!config) {
        return false;
      }

      const meeting = await prisma.meeting.findUnique({
        where: { id: task.sourceId! },
      });

      if (!meeting) {
        return false;
      }

      // Retry external sync
      const externalTask = await this.syncToExternalPlatform(
        config as any,
        task.title,
        {
          text: metadata.actionItemText || task.title,
          assignee: task.assignedTo || undefined,
          dueDate: task.dueDate || undefined,
          priority: task.priority as any,
        },
        meeting
      );

      if (externalTask) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            externalSystem: config.platform,
            externalSyncedAt: new Date(),
            metadata: {
              ...metadata,
              externalId: externalTask.id,
              externalUrl: externalTask.url,
              syncStatus: 'synced',
              errorMessage: null,
            },
          },
        });

        logger.info('Failed task retry successful', { taskId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error retrying failed task', { error, taskId });
      return false;
    }
  }
}

export const autoTaskCreationService = new AutoTaskCreationService();
