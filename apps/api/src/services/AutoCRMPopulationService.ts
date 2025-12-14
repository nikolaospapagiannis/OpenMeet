/**
 * Auto CRM Population Service
 *
 * REAL CRM integration using actual SDK clients:
 * - jsforce for Salesforce
 * - @hubspot/api-client for HubSpot
 *
 * Features:
 * - Extract contact info from conversations
 * - Update deal stages automatically
 * - Populate custom fields
 * - Activity logging
 * - Multi-CRM support
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import jsforce, { Connection as SalesforceConnection, QueryResult } from 'jsforce';
import { Client as HubSpotClient } from '@hubspot/api-client';
import {
  FilterOperatorEnum,
  AssociationSpecAssociationCategoryEnum,
} from '@hubspot/api-client/lib/codegen/crm/contacts';

const prisma = new PrismaClient();

// Connection pools for CRM clients
const salesforceConnections = new Map<string, SalesforceConnection>();
const hubspotClients = new Map<string, HubSpotClient>();

export interface CRMConfig {
  id: string;
  organizationId: string;
  userId: string;
  isActive: boolean;
  platform: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'dynamics' | 'custom';
  platformConfig: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
    domain?: string;
    customFields?: Record<string, string>;
  };
  autoPopulate: boolean;
  populationRules: Array<{
    field: string;
    source: 'transcript' | 'summary' | 'participant' | 'metadata';
    extractionMethod: 'keyword' | 'regex' | 'ai' | 'manual';
    pattern?: string;
    keywords?: string[];
    aiPrompt?: string;
  }>;
  autoDealStage: boolean;
  dealStageRules: Array<{
    trigger: string;
    currentStage: string;
    newStage: string;
    confidence?: number;
  }>;
  logActivities: boolean;
  activityMapping: {
    meetingType?: string;
    includeTranscript?: boolean;
    includeSummary?: boolean;
    includeActionItems?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedData {
  field: string;
  value: any;
  confidence: number;
  source: string;
  context?: string;
}

export interface CRMUpdate {
  id: string;
  configId: string;
  meetingId: string;
  crmRecordId?: string;
  crmRecordType: 'contact' | 'lead' | 'deal' | 'account' | 'opportunity';
  updateType: 'create' | 'update' | 'activity';
  fieldsUpdated: Array<{
    field: string;
    oldValue?: any;
    newValue: any;
    confidence: number;
  }>;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  syncedAt?: Date;
  createdAt: Date;
}

interface SalesforceContact {
  Id?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  AccountId?: string;
  Description?: string;
  [key: string]: any;
}

interface SalesforceEvent {
  Id?: string;
  Subject: string;
  Description?: string;
  StartDateTime: string;
  EndDateTime: string;
  WhoId?: string;
  WhatId?: string;
  Type?: string;
  [key: string]: any;
}

interface SalesforceTask {
  Id?: string;
  Subject: string;
  Description?: string;
  Priority?: string;
  Status?: string;
  WhoId?: string;
  WhatId?: string;
  ActivityDate?: string;
  [key: string]: any;
}

interface SalesforceOpportunity {
  Id?: string;
  Name?: string;
  StageName?: string;
  Amount?: number;
  CloseDate?: string;
  AccountId?: string;
  Description?: string;
  [key: string]: any;
}

interface HubSpotContactInput {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  jobtitle?: string;
  company?: string;
  [key: string]: any;
}

interface HubSpotMeetingInput {
  hs_meeting_title: string;
  hs_meeting_body?: string;
  hs_meeting_start_time: string;
  hs_meeting_end_time: string;
  hs_meeting_outcome?: string;
  [key: string]: any;
}

interface HubSpotTaskInput {
  hs_task_subject: string;
  hs_task_body?: string;
  hs_task_status?: string;
  hs_task_priority?: string;
  hs_timestamp?: string;
  [key: string]: any;
}

interface HubSpotDealInput {
  dealname?: string;
  dealstage?: string;
  amount?: string;
  closedate?: string;
  pipeline?: string;
  [key: string]: any;
}

class AutoCRMPopulationService {
  /**
   * Initialize Salesforce connection for a user
   */
  initSalesforce(
    userId: string,
    accessToken: string,
    instanceUrl: string,
    refreshToken?: string
  ): SalesforceConnection {
    const existingConn = salesforceConnections.get(userId);
    if (existingConn && existingConn.accessToken === accessToken) {
      return existingConn;
    }

    const conn = new jsforce.Connection({
      instanceUrl,
      accessToken,
      refreshToken,
      oauth2: refreshToken
        ? {
            clientId: process.env.SALESFORCE_CLIENT_ID!,
            clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
            redirectUri: process.env.SALESFORCE_REDIRECT_URI!,
          }
        : undefined,
    });

    conn.on('refresh', (newAccessToken: string, res: any) => {
      logger.info('Salesforce token refreshed', { userId });
    });

    salesforceConnections.set(userId, conn);
    logger.info('Salesforce connection initialized', { userId, instanceUrl });
    return conn;
  }

  /**
   * Initialize HubSpot client for a user
   */
  initHubSpot(userId: string, accessToken: string): HubSpotClient {
    const existingClient = hubspotClients.get(userId);
    if (existingClient) {
      return existingClient;
    }

    const client = new HubSpotClient({ accessToken });
    hubspotClients.set(userId, client);
    logger.info('HubSpot client initialized', { userId });
    return client;
  }

  private getSalesforceConnection(userId: string): SalesforceConnection | null {
    return salesforceConnections.get(userId) || null;
  }

  private getHubSpotClient(userId: string): HubSpotClient | null {
    return hubspotClients.get(userId) || null;
  }

  /**
   * Sync contact to Salesforce - REAL IMPLEMENTATION using jsforce
   */
  async syncContactToSalesforce(
    userId: string,
    contact: SalesforceContact
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const conn = this.getSalesforceConnection(userId);
    if (!conn) {
      return { success: false, error: 'Salesforce connection not initialized' };
    }

    try {
      if (contact.Email) {
        const query = `SELECT Id, FirstName, LastName, Email FROM Contact WHERE Email = '${contact.Email}' LIMIT 1`;
        const result: QueryResult<SalesforceContact> = await conn.query(query);

        if (result.records && result.records.length > 0) {
          const existingId = result.records[0].Id!;
          const updateData = { ...contact };
          delete updateData.Id;
          delete updateData.Email;

          await conn.sobject('Contact').update({ Id: existingId, ...updateData });
          logger.info('Salesforce contact updated', { userId, contactId: existingId });
          return { success: true, id: existingId };
        }
      }

      const createResult = await conn.sobject('Contact').create(contact);
      if (createResult.success) {
        logger.info('Salesforce contact created', { userId, contactId: createResult.id });
        return { success: true, id: createResult.id };
      } else {
        const errors = createResult.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
        return { success: false, error: errors };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Salesforce contact sync failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sync contact to HubSpot - REAL IMPLEMENTATION using @hubspot/api-client
   */
  async syncContactToHubSpot(
    userId: string,
    contact: HubSpotContactInput
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const client = this.getHubSpotClient(userId);
    if (!client) {
      return { success: false, error: 'HubSpot client not initialized' };
    }

    try {
      if (contact.email) {
        try {
          const searchResponse = await client.crm.contacts.searchApi.doSearch({
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: FilterOperatorEnum.Eq,
                value: contact.email,
              }],
            }],
            properties: ['email', 'firstname', 'lastname'],
            limit: 1,
            after: '0',
            sorts: [],
          });

          if (searchResponse.results && searchResponse.results.length > 0) {
            const existingId = searchResponse.results[0].id;
            const updateProperties = { ...contact };
            delete updateProperties.email;

            await client.crm.contacts.basicApi.update(existingId, { properties: updateProperties });
            logger.info('HubSpot contact updated', { userId, contactId: existingId });
            return { success: true, id: existingId };
          }
        } catch (searchError) {
          logger.debug('HubSpot contact not found, creating new', { email: contact.email });
        }
      }

      const createResponse = await client.crm.contacts.basicApi.create({
        properties: contact,
        associations: [],
      });
      logger.info('HubSpot contact created', { userId, contactId: createResponse.id });
      return { success: true, id: createResponse.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('HubSpot contact sync failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Log meeting to Salesforce as Event - REAL IMPLEMENTATION
   */
  async logMeetingToSalesforce(
    userId: string,
    meeting: { subject: string; description?: string; startTime: Date; endTime: Date; type?: string },
    contactId?: string,
    accountId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const conn = this.getSalesforceConnection(userId);
    if (!conn) {
      return { success: false, error: 'Salesforce connection not initialized' };
    }

    try {
      const eventData: SalesforceEvent = {
        Subject: meeting.subject,
        Description: meeting.description,
        StartDateTime: meeting.startTime.toISOString(),
        EndDateTime: meeting.endTime.toISOString(),
        Type: meeting.type || 'Meeting',
      };

      if (contactId) eventData.WhoId = contactId;
      if (accountId) eventData.WhatId = accountId;

      const result = await conn.sobject('Event').create(eventData);
      if (result.success) {
        logger.info('Salesforce event created', { userId, eventId: result.id });
        return { success: true, id: result.id };
      } else {
        const errors = result.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
        return { success: false, error: errors };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Salesforce event creation failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Log meeting to HubSpot - REAL IMPLEMENTATION
   */
  async logMeetingToHubSpot(
    userId: string,
    meeting: { title: string; body?: string; startTime: Date; endTime: Date; outcome?: string },
    contactId?: string,
    dealId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const client = this.getHubSpotClient(userId);
    if (!client) {
      return { success: false, error: 'HubSpot client not initialized' };
    }

    try {
      const meetingProperties: HubSpotMeetingInput = {
        hs_meeting_title: meeting.title,
        hs_meeting_body: meeting.body || '',
        hs_meeting_start_time: meeting.startTime.getTime().toString(),
        hs_meeting_end_time: meeting.endTime.getTime().toString(),
        hs_meeting_outcome: meeting.outcome || 'COMPLETED',
      };

      const associations: any[] = [];
      if (contactId) {
        associations.push({
          to: { id: contactId },
          types: [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 200 }],
        });
      }
      if (dealId) {
        associations.push({
          to: { id: dealId },
          types: [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 206 }],
        });
      }

      const response = await client.crm.objects.meetings.basicApi.create({
        properties: meetingProperties,
        associations,
      });
      logger.info('HubSpot meeting created', { userId, meetingId: response.id });
      return { success: true, id: response.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('HubSpot meeting creation failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create task in Salesforce - REAL IMPLEMENTATION
   */
  async createSalesforceTask(
    userId: string,
    task: { subject: string; description?: string; priority?: 'High' | 'Normal' | 'Low'; dueDate?: Date; status?: string },
    contactId?: string,
    accountId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const conn = this.getSalesforceConnection(userId);
    if (!conn) {
      return { success: false, error: 'Salesforce connection not initialized' };
    }

    try {
      const taskData: SalesforceTask = {
        Subject: task.subject,
        Description: task.description,
        Priority: task.priority || 'Normal',
        Status: task.status || 'Not Started',
      };

      if (task.dueDate) taskData.ActivityDate = task.dueDate.toISOString().split('T')[0];
      if (contactId) taskData.WhoId = contactId;
      if (accountId) taskData.WhatId = accountId;

      const result = await conn.sobject('Task').create(taskData);
      if (result.success) {
        logger.info('Salesforce task created', { userId, taskId: result.id });
        return { success: true, id: result.id };
      } else {
        const errors = result.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
        return { success: false, error: errors };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Salesforce task creation failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create task in HubSpot - REAL IMPLEMENTATION
   */
  async createHubSpotTask(
    userId: string,
    task: { subject: string; body?: string; priority?: 'HIGH' | 'MEDIUM' | 'LOW'; dueDate?: Date; status?: string },
    contactId?: string,
    dealId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const client = this.getHubSpotClient(userId);
    if (!client) {
      return { success: false, error: 'HubSpot client not initialized' };
    }

    try {
      const taskProperties: HubSpotTaskInput = {
        hs_task_subject: task.subject,
        hs_task_body: task.body || '',
        hs_task_status: task.status || 'NOT_STARTED',
        hs_task_priority: task.priority || 'MEDIUM',
      };

      if (task.dueDate) taskProperties.hs_timestamp = task.dueDate.getTime().toString();

      const associations: any[] = [];
      if (contactId) {
        associations.push({
          to: { id: contactId },
          types: [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 204 }],
        });
      }
      if (dealId) {
        associations.push({
          to: { id: dealId },
          types: [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 216 }],
        });
      }

      const response = await client.crm.objects.tasks.basicApi.create({
        properties: taskProperties,
        associations,
      });
      logger.info('HubSpot task created', { userId, taskId: response.id });
      return { success: true, id: response.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('HubSpot task creation failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update Salesforce Opportunity - REAL IMPLEMENTATION
   */
  async updateSalesforceOpportunity(
    userId: string,
    opportunityId: string,
    data: Partial<SalesforceOpportunity>
  ): Promise<{ success: boolean; error?: string }> {
    const conn = this.getSalesforceConnection(userId);
    if (!conn) {
      return { success: false, error: 'Salesforce connection not initialized' };
    }

    try {
      const updateData = { ...data, Id: opportunityId };
      const result = await conn.sobject('Opportunity').update(updateData);
      if (result.success) {
        logger.info('Salesforce opportunity updated', { userId, opportunityId });
        return { success: true };
      } else {
        const errors = result.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
        return { success: false, error: errors };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Salesforce opportunity update failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update HubSpot Deal - REAL IMPLEMENTATION
   */
  async updateHubSpotDeal(
    userId: string,
    dealId: string,
    data: Partial<HubSpotDealInput>
  ): Promise<{ success: boolean; error?: string }> {
    const client = this.getHubSpotClient(userId);
    if (!client) {
      return { success: false, error: 'HubSpot client not initialized' };
    }

    try {
      await client.crm.deals.basicApi.update(dealId, { properties: data });
      logger.info('HubSpot deal updated', { userId, dealId });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('HubSpot deal update failed', { userId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Search Salesforce contacts by email - REAL IMPLEMENTATION
   */
  async searchSalesforceContactByEmail(userId: string, email: string): Promise<SalesforceContact | null> {
    const conn = this.getSalesforceConnection(userId);
    if (!conn) return null;

    try {
      const query = `SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId FROM Contact WHERE Email = '${email}' LIMIT 1`;
      const result: QueryResult<SalesforceContact> = await conn.query(query);
      return result.records && result.records.length > 0 ? result.records[0] : null;
    } catch (error) {
      logger.error('Salesforce contact search failed', { userId, email, error });
      return null;
    }
  }

  /**
   * Search HubSpot contacts by email - REAL IMPLEMENTATION
   */
  async searchHubSpotContactByEmail(userId: string, email: string): Promise<{ id: string; properties: any } | null> {
    const client = this.getHubSpotClient(userId);
    if (!client) return null;

    try {
      const searchResponse = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{ propertyName: 'email', operator: FilterOperatorEnum.Eq, value: email }],
        }],
        properties: ['email', 'firstname', 'lastname', 'phone', 'jobtitle', 'company'],
        limit: 1,
        after: '0',
        sorts: [],
      });
      return searchResponse.results && searchResponse.results.length > 0 ? searchResponse.results[0] : null;
    } catch (error) {
      logger.error('HubSpot contact search failed', { userId, email, error });
      return null;
    }
  }

  /**
   * Create CRM configuration
   */
  async createConfig(
    organizationId: string,
    userId: string,
    data: {
      platform: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'dynamics' | 'custom';
      platformConfig: Record<string, any>;
      autoPopulate?: boolean;
      populationRules?: any[];
      autoDealStage?: boolean;
      dealStageRules?: any[];
      logActivities?: boolean;
      activityMapping?: Record<string, any>;
    }
  ): Promise<CRMConfig> {
    try {
      const configId = `crm_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      const settings = (org?.settings as any) || {};
      const crmConfigs = settings.crmConfigs || [];

      const config: CRMConfig = {
        id: configId,
        organizationId,
        userId,
        isActive: true,
        platform: data.platform,
        platformConfig: data.platformConfig,
        autoPopulate: data.autoPopulate ?? true,
        populationRules: data.populationRules || [],
        autoDealStage: data.autoDealStage ?? false,
        dealStageRules: data.dealStageRules || [],
        logActivities: data.logActivities ?? true,
        activityMapping: data.activityMapping || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crmConfigs.push(config);
      settings.crmConfigs = crmConfigs;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { settings: settings as any },
      });

      if (data.platform === 'salesforce' && data.platformConfig.accessToken && data.platformConfig.instanceUrl) {
        this.initSalesforce(userId, data.platformConfig.accessToken, data.platformConfig.instanceUrl, data.platformConfig.refreshToken);
      } else if (data.platform === 'hubspot' && data.platformConfig.accessToken) {
        this.initHubSpot(userId, data.platformConfig.accessToken);
      }

      logger.info('CRM config created', { configId: config.id, platform: data.platform });
      return config;
    } catch (error) {
      logger.error('Error creating CRM config', { error });
      throw error;
    }
  }

  /**
   * Get CRM configurations
   */
  async getConfigs(organizationId: string, filters?: { platform?: string; isActive?: boolean }): Promise<CRMConfig[]> {
    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      const settings = (org?.settings as any) || {};
      let configs: CRMConfig[] = settings.crmConfigs || [];

      if (filters?.platform) configs = configs.filter(c => c.platform === filters.platform);
      if (filters?.isActive !== undefined) configs = configs.filter(c => c.isActive === filters.isActive);
      configs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return configs;
    } catch (error) {
      logger.error('Error getting CRM configs', { error });
      throw error;
    }
  }

  /**
   * Update CRM configuration
   */
  async updateConfig(configId: string, data: Partial<CRMConfig>): Promise<CRMConfig> {
    try {
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const settings = (org.settings as any) || {};
        const crmConfigs: CRMConfig[] = settings.crmConfigs || [];
        const configIndex = crmConfigs.findIndex(c => c.id === configId);

        if (configIndex >= 0) {
          crmConfigs[configIndex] = { ...crmConfigs[configIndex], ...data, updatedAt: new Date() };
          settings.crmConfigs = crmConfigs;
          await prisma.organization.update({ where: { id: org.id }, data: { settings: settings as any } });
          logger.info('CRM config updated', { configId });
          return crmConfigs[configIndex];
        }
      }

      throw new Error('CRM config not found');
    } catch (error) {
      logger.error('Error updating CRM config', { error, configId });
      throw error;
    }
  }

  /**
   * Delete CRM configuration
   */
  async deleteConfig(configId: string): Promise<boolean> {
    try {
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const settings = (org.settings as any) || {};
        const crmConfigs: CRMConfig[] = settings.crmConfigs || [];
        const configIndex = crmConfigs.findIndex(c => c.id === configId);

        if (configIndex >= 0) {
          crmConfigs.splice(configIndex, 1);
          settings.crmConfigs = crmConfigs;
          await prisma.organization.update({ where: { id: org.id }, data: { settings: settings as any } });
          logger.info('CRM config deleted', { configId });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error deleting CRM config', { error, configId });
      throw error;
    }
  }

  /**
   * Extract data from meeting based on rules
   */
  async extractDataFromMeeting(meetingId: string, rules: any[]): Promise<ExtractedData[]> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { summaries: true, participants: true, transcripts: true },
      });

      if (!meeting) return [];

      const extractedData: ExtractedData[] = [];
      const summary = meeting.summaries[0];
      const transcript = meeting.transcripts[0];

      for (const rule of rules) {
        let value: any;
        let confidence = 0.5;
        let context: string | undefined;

        switch (rule.source) {
          case 'transcript':
            if (transcript && transcript.mongodbId) {
              const { transcriptService } = await import('./TranscriptService');
              const transcriptText = await transcriptService.getTranscriptText(transcript.mongodbId);
              const result = this.extractFromTranscript(transcriptText, rule.extractionMethod, rule);
              value = result.value;
              confidence = result.confidence;
              context = result.context;
            }
            break;
          case 'summary':
            if (summary) {
              const result = this.extractFromSummary(summary, rule.extractionMethod, rule);
              value = result.value;
              confidence = result.confidence;
              context = result.context;
            }
            break;
          case 'participant':
            const result = this.extractFromParticipants(meeting.participants, rule);
            value = result.value;
            confidence = result.confidence;
            break;
          case 'metadata':
            const metadata = meeting.metadata as any;
            value = metadata?.[rule.field];
            confidence = value ? 1.0 : 0.0;
            break;
        }

        if (value !== undefined && value !== null) {
          extractedData.push({ field: rule.field, value, confidence, source: rule.source, context });
        }
      }

      logger.info('Data extracted from meeting', { meetingId, fieldsExtracted: extractedData.length });
      return extractedData;
    } catch (error) {
      logger.error('Error extracting data from meeting', { error, meetingId });
      return [];
    }
  }

  private extractFromTranscript(transcript: string, method: string, rule: any): { value: any; confidence: number; context?: string } {
    let value: any;
    let confidence = 0.5;
    let context: string | undefined;

    switch (method) {
      case 'keyword':
        if (rule.keywords && Array.isArray(rule.keywords)) {
          for (const keyword of rule.keywords) {
            const regex = new RegExp(`${keyword}[:\\s]+([^.!?]+)`, 'i');
            const match = transcript.match(regex);
            if (match) {
              value = match[1].trim();
              confidence = 0.7;
              context = match[0];
              break;
            }
          }
        }
        break;
      case 'regex':
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern, 'i');
          const match = transcript.match(regex);
          if (match) {
            value = match[1] || match[0];
            confidence = 0.8;
            context = match[0];
          }
        }
        break;
      case 'ai':
        if (rule.keywords) {
          for (const keyword of rule.keywords) {
            if (transcript.toLowerCase().includes(keyword.toLowerCase())) {
              const sentences = transcript.split(/[.!?]+/);
              const matchingSentence = sentences.find(s => s.toLowerCase().includes(keyword.toLowerCase()));
              if (matchingSentence) {
                value = matchingSentence.trim();
                confidence = 0.6;
                context = matchingSentence;
                break;
              }
            }
          }
        }
        break;
    }

    return { value, confidence, context };
  }

  private extractFromSummary(summary: any, method: string, rule: any): { value: any; confidence: number; context?: string } {
    let value: any;
    let confidence = 0.7;
    let context: string | undefined;
    const keyPoints = Array.isArray(summary.keyPoints) ? summary.keyPoints : [];

    if (method === 'keyword' && rule.keywords) {
      for (const keyword of rule.keywords) {
        for (const point of keyPoints) {
          if (point.toLowerCase().includes(keyword.toLowerCase())) {
            value = point;
            confidence = 0.8;
            context = point;
            break;
          }
        }
        if (value) break;
      }
    }

    return { value, confidence, context };
  }

  private extractFromParticipants(participants: any[], rule: any): { value: any; confidence: number } {
    let value: any;
    let confidence = 0.0;

    if (rule.field.toLowerCase().includes('email')) {
      value = participants.map(p => p.email).filter(Boolean);
      confidence = value.length > 0 ? 1.0 : 0.0;
    } else if (rule.field.toLowerCase().includes('name')) {
      value = participants.map(p => p.name).filter(Boolean);
      confidence = value.length > 0 ? 1.0 : 0.0;
    } else if (rule.field.toLowerCase().includes('phone')) {
      value = participants.map(p => p.phoneNumber).filter(Boolean);
      confidence = value.length > 0 ? 1.0 : 0.0;
    }

    return { value, confidence };
  }

  /**
   * Auto-populate CRM from meeting - REAL IMPLEMENTATION
   */
  async autoPopulateCRM(
    meetingId: string,
    organizationId: string,
    crmRecordId?: string,
    crmRecordType?: 'contact' | 'lead' | 'deal' | 'account' | 'opportunity'
  ): Promise<CRMUpdate[]> {
    try {
      const configs = await this.getConfigs(organizationId, { isActive: true });
      if (configs.length === 0) {
        logger.info('No active CRM configs found', { organizationId });
        return [];
      }

      const updates: CRMUpdate[] = [];

      for (const config of configs) {
        if (!config.autoPopulate) continue;

        try {
          const platformConfig = config.platformConfig as any;
          if (config.platform === 'salesforce' && platformConfig.accessToken && platformConfig.instanceUrl) {
            this.initSalesforce(config.userId, platformConfig.accessToken, platformConfig.instanceUrl, platformConfig.refreshToken);
          } else if (config.platform === 'hubspot' && platformConfig.accessToken) {
            this.initHubSpot(config.userId, platformConfig.accessToken);
          }

          const extractedData = await this.extractDataFromMeeting(meetingId, config.populationRules as any[]);
          if (extractedData.length === 0) continue;

          const highConfidenceData = extractedData.filter(d => d.confidence >= 0.6);
          if (highConfidenceData.length === 0) continue;

          const update = await this.createCRMUpdate(config, meetingId, crmRecordId, crmRecordType || 'contact', highConfidenceData);
          if (update) updates.push(update);

          if (config.logActivities) {
            await this.logCRMActivity(config, meetingId, crmRecordId);
          }

          if (config.autoDealStage && crmRecordType === 'deal') {
            await this.autoUpdateDealStage(config, meetingId, crmRecordId);
          }
        } catch (error) {
          logger.error('Error processing CRM config', { error, configId: config.id });
        }
      }

      logger.info('CRM auto-population completed', { meetingId, updatesCreated: updates.length });
      return updates;
    } catch (error) {
      logger.error('Error auto-populating CRM', { error, meetingId });
      return [];
    }
  }

  private async createCRMUpdate(
    config: CRMConfig,
    meetingId: string,
    crmRecordId: string | undefined,
    crmRecordType: 'contact' | 'lead' | 'deal' | 'account' | 'opportunity',
    extractedData: ExtractedData[]
  ): Promise<CRMUpdate | null> {
    try {
      const fieldsUpdated = extractedData.map(d => ({
        field: d.field,
        oldValue: undefined,
        newValue: d.value,
        confidence: d.confidence,
      }));

      let status: 'pending' | 'success' | 'failed' = 'pending';
      let errorMessage: string | undefined;
      let syncedCrmRecordId = crmRecordId;

      try {
        const syncResult = await this.syncToCRM(config, crmRecordId, crmRecordType, fieldsUpdated);
        if (syncResult.success) {
          status = 'success';
          syncedCrmRecordId = syncResult.recordId;
        } else {
          status = 'failed';
          errorMessage = syncResult.error;
        }
      } catch (error) {
        status = 'failed';
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }

      const updateId = `crm_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const update: CRMUpdate = {
        id: updateId,
        configId: config.id,
        meetingId,
        crmRecordId: syncedCrmRecordId,
        crmRecordType,
        updateType: crmRecordId ? 'update' : 'create',
        fieldsUpdated,
        status,
        errorMessage,
        syncedAt: status === 'success' ? new Date() : undefined,
        createdAt: new Date(),
      };

      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
      const metadata = (meeting?.metadata as any) || {};
      const crmUpdates = metadata.crmUpdates || [];
      crmUpdates.push(update);
      metadata.crmUpdates = crmUpdates;

      await prisma.meeting.update({ where: { id: meetingId }, data: { metadata: metadata as any } });
      logger.info('CRM update created', { updateId: update.id, status, fieldsCount: fieldsUpdated.length });
      return update;
    } catch (error) {
      logger.error('Error creating CRM update', { error });
      return null;
    }
  }

  private async syncToCRM(
    config: CRMConfig,
    recordId: string | undefined,
    recordType: string,
    fields: any[]
  ): Promise<{ success: boolean; recordId?: string; error?: string }> {
    try {
      const fieldData: Record<string, any> = {};
      for (const field of fields) {
        fieldData[field.field] = field.newValue;
      }

      switch (config.platform) {
        case 'salesforce':
          return await this.syncToSalesforceReal(config.userId, recordId, recordType, fieldData);
        case 'hubspot':
          return await this.syncToHubSpotReal(config.userId, recordId, recordType, fieldData);
        default:
          return { success: false, error: `Platform ${config.platform} not yet implemented with real SDK` };
      }
    } catch (error) {
      logger.error('Error syncing to CRM', { error, platform: config.platform });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async syncToSalesforceReal(
    userId: string,
    recordId: string | undefined,
    recordType: string,
    fieldData: Record<string, any>
  ): Promise<{ success: boolean; recordId?: string; error?: string }> {
    const conn = this.getSalesforceConnection(userId);
    if (!conn) {
      return { success: false, error: 'Salesforce connection not initialized. Call initSalesforce() first.' };
    }

    try {
      const sobjectMap: Record<string, string> = {
        contact: 'Contact',
        lead: 'Lead',
        deal: 'Opportunity',
        opportunity: 'Opportunity',
        account: 'Account',
      };
      const sobjectName = sobjectMap[recordType] || 'Contact';

      if (recordId) {
        const updateData = { Id: recordId, ...fieldData };
        const result = await conn.sobject(sobjectName).update(updateData);
        if (result.success) {
          logger.info('Salesforce record updated', { userId, sobjectName, recordId });
          return { success: true, recordId };
        } else {
          const errors = result.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
          return { success: false, error: errors };
        }
      } else {
        const result = await conn.sobject(sobjectName).create(fieldData);
        if (result.success) {
          logger.info('Salesforce record created', { userId, sobjectName, newId: result.id });
          return { success: true, recordId: result.id };
        } else {
          const errors = result.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
          return { success: false, error: errors };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Salesforce sync failed', { userId, recordType, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  private async syncToHubSpotReal(
    userId: string,
    recordId: string | undefined,
    recordType: string,
    fieldData: Record<string, any>
  ): Promise<{ success: boolean; recordId?: string; error?: string }> {
    const client = this.getHubSpotClient(userId);
    if (!client) {
      return { success: false, error: 'HubSpot client not initialized. Call initHubSpot() first.' };
    }

    try {
      if (recordId) {
        switch (recordType) {
          case 'contact':
            await client.crm.contacts.basicApi.update(recordId, { properties: fieldData });
            break;
          case 'deal':
          case 'opportunity':
            await client.crm.deals.basicApi.update(recordId, { properties: fieldData });
            break;
          case 'account':
            await client.crm.companies.basicApi.update(recordId, { properties: fieldData });
            break;
          default:
            await client.crm.contacts.basicApi.update(recordId, { properties: fieldData });
        }
        logger.info('HubSpot record updated', { userId, recordType, recordId });
        return { success: true, recordId };
      } else {
        let response: any;
        switch (recordType) {
          case 'contact':
            response = await client.crm.contacts.basicApi.create({ properties: fieldData, associations: [] });
            break;
          case 'deal':
          case 'opportunity':
            response = await client.crm.deals.basicApi.create({ properties: fieldData, associations: [] });
            break;
          case 'account':
            response = await client.crm.companies.basicApi.create({ properties: fieldData, associations: [] });
            break;
          default:
            response = await client.crm.contacts.basicApi.create({ properties: fieldData, associations: [] });
        }
        logger.info('HubSpot record created', { userId, recordType, newId: response.id });
        return { success: true, recordId: response.id };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('HubSpot sync failed', { userId, recordType, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  private async logCRMActivity(config: CRMConfig, meetingId: string, crmRecordId?: string): Promise<void> {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId }, include: { summaries: true } });
      if (!meeting) return;

      const activityMapping = config.activityMapping as any;
      const summary = meeting.summaries[0];

      const meetingData = {
        subject: meeting.title,
        title: meeting.title,
        description: '',
        body: '',
        startTime: meeting.actualStartAt || meeting.scheduledStartAt,
        endTime: meeting.actualEndAt || new Date(meeting.scheduledStartAt.getTime() + (meeting.durationSeconds || 3600) * 1000),
        type: activityMapping.meetingType || 'Meeting',
        outcome: 'COMPLETED',
      };

      if (activityMapping.includeSummary && summary) {
        meetingData.description = summary.overview || '';
        meetingData.body = summary.overview || '';
      }

      if (activityMapping.includeActionItems && summary) {
        const actionItems = (summary.actionItems as any) || [];
        if (Array.isArray(actionItems) && actionItems.length > 0) {
          const actionItemsText = actionItems.map((item: any) => `- ${item.text || item}`).join('\n');
          meetingData.description += `\n\nAction Items:\n${actionItemsText}`;
          meetingData.body += `\n\nAction Items:\n${actionItemsText}`;
        }
      }

      if (config.platform === 'salesforce') {
        await this.logMeetingToSalesforce(config.userId, {
          subject: meetingData.subject,
          description: meetingData.description,
          startTime: meetingData.startTime,
          endTime: meetingData.endTime,
          type: meetingData.type,
        }, crmRecordId);
      } else if (config.platform === 'hubspot') {
        await this.logMeetingToHubSpot(config.userId, {
          title: meetingData.title,
          body: meetingData.body,
          startTime: meetingData.startTime,
          endTime: meetingData.endTime,
          outcome: meetingData.outcome,
        }, crmRecordId);
      }

      logger.info('CRM activity logged', { platform: config.platform, meetingId, crmRecordId });
    } catch (error) {
      logger.error('Error logging CRM activity', { error, meetingId });
    }
  }

  private async autoUpdateDealStage(config: CRMConfig, meetingId: string, dealId?: string): Promise<void> {
    try {
      if (!dealId) {
        logger.debug('No deal ID provided for stage update', { meetingId });
        return;
      }

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { summaries: true, transcripts: true },
      });

      if (!meeting) return;

      const transcriptRecord = meeting.transcripts[0];
      let transcript = '';

      if (transcriptRecord?.mongodbId) {
        const { transcriptService } = await import('./TranscriptService');
        transcript = await transcriptService.getTranscriptText(transcriptRecord.mongodbId);
      }

      const summary = meeting.summaries[0];
      const dealStageRules = config.dealStageRules as any[];

      for (const rule of dealStageRules) {
        let shouldUpdate = false;

        if (transcript.toLowerCase().includes(rule.trigger.toLowerCase())) {
          shouldUpdate = true;
        }

        if (!shouldUpdate && summary?.overview) {
          if (summary.overview.toLowerCase().includes(rule.trigger.toLowerCase())) {
            shouldUpdate = true;
          }
        }

        if (shouldUpdate) {
          if (config.platform === 'salesforce') {
            await this.updateSalesforceOpportunity(config.userId, dealId, { StageName: rule.newStage });
          } else if (config.platform === 'hubspot') {
            await this.updateHubSpotDeal(config.userId, dealId, { dealstage: rule.newStage });
          }

          logger.info('Deal stage updated automatically', {
            platform: config.platform,
            dealId,
            currentStage: rule.currentStage,
            newStage: rule.newStage,
            trigger: rule.trigger,
          });

          break;
        }
      }
    } catch (error) {
      logger.error('Error auto-updating deal stage', { error, meetingId });
    }
  }

  /**
   * Get CRM updates for a meeting
   */
  async getCRMUpdates(meetingId: string): Promise<CRMUpdate[]> {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
      const metadata = (meeting?.metadata as any) || {};
      const updates: CRMUpdate[] = metadata.crmUpdates || [];
      updates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return updates;
    } catch (error) {
      logger.error('Error getting CRM updates', { error, meetingId });
      return [];
    }
  }

  /**
   * Retry failed CRM update
   */
  async retryFailedUpdate(updateId: string): Promise<boolean> {
    try {
      const meetings = await prisma.meeting.findMany();
      let foundUpdate: CRMUpdate | null = null;
      let foundMeetingId: string | null = null;

      for (const meeting of meetings) {
        const metadata = (meeting.metadata as any) || {};
        const crmUpdates: CRMUpdate[] = metadata.crmUpdates || [];
        const update = crmUpdates.find(u => u.id === updateId);
        if (update) {
          foundUpdate = update;
          foundMeetingId = meeting.id;
          break;
        }
      }

      if (!foundUpdate || foundUpdate.status !== 'failed' || !foundMeetingId) return false;

      const orgs = await prisma.organization.findMany();
      let foundConfig: CRMConfig | null = null;

      for (const org of orgs) {
        const settings = (org.settings as any) || {};
        const crmConfigs: CRMConfig[] = settings.crmConfigs || [];
        const config = crmConfigs.find(c => c.id === foundUpdate.configId);
        if (config) {
          foundConfig = config;
          break;
        }
      }

      if (!foundConfig) return false;

      const platformConfig = foundConfig.platformConfig as any;
      if (foundConfig.platform === 'salesforce' && platformConfig.accessToken && platformConfig.instanceUrl) {
        this.initSalesforce(foundConfig.userId, platformConfig.accessToken, platformConfig.instanceUrl, platformConfig.refreshToken);
      } else if (foundConfig.platform === 'hubspot' && platformConfig.accessToken) {
        this.initHubSpot(foundConfig.userId, platformConfig.accessToken);
      }

      const syncResult = await this.syncToCRM(foundConfig, foundUpdate.crmRecordId, foundUpdate.crmRecordType, foundUpdate.fieldsUpdated);

      const meeting = await prisma.meeting.findUnique({ where: { id: foundMeetingId } });
      const metadata = (meeting?.metadata as any) || {};
      const crmUpdates: CRMUpdate[] = metadata.crmUpdates || [];
      const updateIndex = crmUpdates.findIndex(u => u.id === updateId);

      if (updateIndex >= 0) {
        if (syncResult.success) {
          crmUpdates[updateIndex].status = 'success';
          crmUpdates[updateIndex].errorMessage = undefined;
          crmUpdates[updateIndex].syncedAt = new Date();
          crmUpdates[updateIndex].crmRecordId = syncResult.recordId || foundUpdate.crmRecordId;
          metadata.crmUpdates = crmUpdates;
          await prisma.meeting.update({ where: { id: foundMeetingId }, data: { metadata: metadata as any } });
          logger.info('Failed CRM update retry successful', { updateId });
          return true;
        } else {
          crmUpdates[updateIndex].errorMessage = syncResult.error;
          metadata.crmUpdates = crmUpdates;
          await prisma.meeting.update({ where: { id: foundMeetingId }, data: { metadata: metadata as any } });
          return false;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error retrying failed CRM update', { error, updateId });
      return false;
    }
  }

  /**
   * Auto-sync meeting to CRM - Comprehensive sync that handles the full flow
   */
  async autoSyncMeeting(
    meetingId: string,
    userId: string,
    organizationId: string,
    crmType: 'salesforce' | 'hubspot'
  ): Promise<{ success: boolean; contactId?: string; meetingId?: string; tasksCreated?: number; error?: string }> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { participants: true, summaries: true },
      });

      if (!meeting) return { success: false, error: 'Meeting not found' };

      let contactId: string | undefined;
      let crmMeetingId: string | undefined;
      let tasksCreated = 0;

      const externalParticipant = meeting.participants.find(p => !p.userId);
      if (externalParticipant?.email) {
        if (crmType === 'salesforce') {
          const existingContact = await this.searchSalesforceContactByEmail(userId, externalParticipant.email);
          if (existingContact) {
            contactId = existingContact.Id;
          } else {
            const nameParts = (externalParticipant.name || '').split(' ');
            const createResult = await this.syncContactToSalesforce(userId, {
              FirstName: nameParts[0] || '',
              LastName: nameParts.slice(1).join(' ') || externalParticipant.email.split('@')[0],
              Email: externalParticipant.email,
            });
            if (createResult.success) contactId = createResult.id;
          }

          if (contactId) {
            const eventResult = await this.logMeetingToSalesforce(userId, {
              subject: meeting.title,
              description: meeting.summaries[0]?.overview || '',
              startTime: meeting.actualStartAt || meeting.scheduledStartAt,
              endTime: meeting.actualEndAt || new Date(meeting.scheduledStartAt.getTime() + (meeting.durationSeconds || 3600) * 1000),
              type: 'Meeting',
            }, contactId);
            if (eventResult.success) crmMeetingId = eventResult.id;
          }

          const actionItems = (meeting.summaries[0]?.actionItems as any[]) || [];
          for (const item of actionItems) {
            const taskText = typeof item === 'string' ? item : item.text || item.description;
            if (taskText) {
              const taskResult = await this.createSalesforceTask(userId, {
                subject: taskText.substring(0, 255),
                description: taskText,
                priority: 'Normal',
                dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
              }, contactId);
              if (taskResult.success) tasksCreated++;
            }
          }
        } else if (crmType === 'hubspot') {
          const existingContact = await this.searchHubSpotContactByEmail(userId, externalParticipant.email);
          if (existingContact) {
            contactId = existingContact.id;
          } else {
            const nameParts = (externalParticipant.name || '').split(' ');
            const createResult = await this.syncContactToHubSpot(userId, {
              firstname: nameParts[0] || '',
              lastname: nameParts.slice(1).join(' ') || externalParticipant.email.split('@')[0],
              email: externalParticipant.email,
            });
            if (createResult.success) contactId = createResult.id;
          }

          if (contactId) {
            const meetingResult = await this.logMeetingToHubSpot(userId, {
              title: meeting.title,
              body: meeting.summaries[0]?.overview || '',
              startTime: meeting.actualStartAt || meeting.scheduledStartAt,
              endTime: meeting.actualEndAt || new Date(meeting.scheduledStartAt.getTime() + (meeting.durationSeconds || 3600) * 1000),
              outcome: 'COMPLETED',
            }, contactId);
            if (meetingResult.success) crmMeetingId = meetingResult.id;
          }

          const actionItems = (meeting.summaries[0]?.actionItems as any[]) || [];
          for (const item of actionItems) {
            const taskText = typeof item === 'string' ? item : item.text || item.description;
            if (taskText) {
              const taskResult = await this.createHubSpotTask(userId, {
                subject: taskText.substring(0, 255),
                body: taskText,
                priority: 'MEDIUM',
                dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
              }, contactId);
              if (taskResult.success) tasksCreated++;
            }
          }
        }
      }

      logger.info('Meeting auto-synced to CRM', { meetingId, crmType, contactId, crmMeetingId, tasksCreated });
      return { success: true, contactId, meetingId: crmMeetingId, tasksCreated };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error auto-syncing meeting to CRM', { meetingId, crmType, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Disconnect CRM client for user
   */
  disconnectUser(userId: string): void {
    salesforceConnections.delete(userId);
    hubspotClients.delete(userId);
    logger.info('CRM clients disconnected for user', { userId });
  }
}

export const autoCRMPopulationService = new AutoCRMPopulationService();
