/**
 * Salesforce CRM Integration Service
 * Sync meetings, contacts, and opportunities with Salesforce
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import jsforce from 'jsforce';
import { QueueService, JobType } from '../services/queue';
import { CacheService } from '../services/cache';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'salesforce-integration' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  loginUrl?: string; // sandbox or production
  apiVersion?: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  Title?: string;
  Department?: string;
  AccountId?: string;
  OwnerId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Description?: string;
  MailingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  Website?: string;
  Phone?: string;
  BillingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  OwnerId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Description?: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  AccountId?: string;
  Amount?: number;
  CloseDate: string;
  StageName: string;
  Probability?: number;
  Type?: string;
  LeadSource?: string;
  Description?: string;
  OwnerId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  IsClosed: boolean;
  IsWon: boolean;
}

export interface SalesforceTask {
  Id?: string;
  Subject: string;
  Description?: string;
  Status: string;
  Priority?: string;
  ActivityDate?: string;
  WhoId?: string; // Contact or Lead ID
  WhatId?: string; // Account or Opportunity ID
  OwnerId?: string;
  Type?: string;
  IsReminderSet?: boolean;
  ReminderDateTime?: string;
}

export interface SalesforceEvent {
  Id?: string;
  Subject: string;
  Description?: string;
  Location?: string;
  StartDateTime: string;
  EndDateTime: string;
  IsAllDayEvent?: boolean;
  WhoId?: string; // Contact or Lead ID
  WhatId?: string; // Account or Opportunity ID
  OwnerId?: string;
  Type?: string;
  IsPrivate?: boolean;
  ShowAs?: string;
  IsReminderSet?: boolean;
  ReminderDateTime?: string;
  MeetingUrl__c?: string; // Custom field for meeting URL
  MeetingRecordingUrl__c?: string; // Custom field for recording URL
  MeetingTranscriptUrl__c?: string; // Custom field for transcript URL
}

export interface SalesforceLead {
  Id: string;
  FirstName?: string;
  LastName: string;
  Company: string;
  Title?: string;
  Email?: string;
  Phone?: string;
  Website?: string;
  Status: string;
  Rating?: string;
  Industry?: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  LeadSource?: string;
  Description?: string;
  OwnerId?: string;
  IsConverted: boolean;
  ConvertedAccountId?: string;
  ConvertedContactId?: string;
  ConvertedOpportunityId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceMeetingSync {
  meetingId: string;
  salesforceEventId?: string;
  accountIds?: string[];
  contactIds?: string[];
  opportunityIds?: string[];
  leadIds?: string[];
  syncStatus: 'pending' | 'synced' | 'failed';
  lastSyncAt?: Date;
  syncErrors?: string[];
}

export class SalesforceIntegration extends EventEmitter {
  private config: SalesforceConfig;
  private connections: Map<string, any>;
  private queueService: QueueService;
  private cacheService: CacheService;

  constructor(
    config: SalesforceConfig,
    queueService: QueueService,
    cacheService: CacheService
  ) {
    super();
    this.config = config;
    this.connections = new Map();
    this.queueService = queueService;
    this.cacheService = cacheService;
  }

  /**
   * OAuth 2.0 Flow
   */
  getAuthorizationUrl(state: string): string {
    const oauth2 = new jsforce.OAuth2({
      loginUrl: this.config.loginUrl || 'https://login.salesforce.com',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
    });

    return oauth2.getAuthorizationUrl({ 
      scope: 'api refresh_token offline_access',
      state,
    });
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    instance_url: string;
    id: string;
  }> {
    const oauth2 = new jsforce.OAuth2({
      loginUrl: this.config.loginUrl || 'https://login.salesforce.com',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
    });

    const conn = new jsforce.Connection({ oauth2 });
    const userInfo = await conn.authorize(code);

    return {
      access_token: conn.accessToken,
      refresh_token: conn.refreshToken!,
      instance_url: conn.instanceUrl,
      id: userInfo.id,
    };
  }

  /**
   * Connect Salesforce account
   */
  async connectAccount(
    userId: string,
    organizationId: string,
    authCode: string
  ): Promise<void> {
    try {
      const tokens = await this.exchangeCodeForToken(authCode);

      // Create connection
      const conn = await this.createConnection(
        userId,
        tokens.instance_url,
        tokens.access_token,
        tokens.refresh_token
      );

      // Get user info
      const identity = await conn.identity();

      // Save integration
      await prisma.integration.create({
        data: {
          organizationId,
          userId,
          type: 'salesforce',
          name: 'Salesforce',
          isActive: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          metadata: {
            instanceUrl: tokens.instance_url,
            salesforceUserId: identity.user_id,
            username: identity.username,
            displayName: identity.display_name,
            email: identity.email,
            salesforceOrgId: identity.organization_id,
          },
        },
      });

      logger.info(`Salesforce account connected for user ${userId}`);
      
      this.emit('account:connected', {
        userId,
        organizationId,
        platform: 'salesforce',
      });
    } catch (error) {
      logger.error('Failed to connect Salesforce account:', error);
      throw error;
    }
  }

  /**
   * Create or get connection
   */
  private async createConnection(
    userId: string,
    instanceUrl: string,
    accessToken: string,
    refreshToken: string
  ): Promise<any> {
    const existingConn = this.connections.get(userId);
    if (existingConn) {
      return existingConn;
    }

    const oauth2 = new jsforce.OAuth2({
      loginUrl: this.config.loginUrl || 'https://login.salesforce.com',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
    });

    const conn = new jsforce.Connection({
      oauth2,
      instanceUrl,
      accessToken,
      refreshToken,
      version: this.config.apiVersion || '58.0',
    });

    // Handle refresh token
    conn.on('refresh', async (newAccessToken: string) => {
      await prisma.integration.updateMany({
        where: { userId, type: 'salesforce' },
        data: { accessToken: newAccessToken },
      });

      logger.info(`Refreshed Salesforce token for user ${userId}`);
    });

    this.connections.set(userId, conn);
    return conn;
  }

  /**
   * Get connection for user
   */
  private async getConnection(userId: string): Promise<any> {
    const conn = this.connections.get(userId);
    if (conn) return conn;

    // Load from database
    const integration = await prisma.integration.findFirst({
      where: { userId, type: 'salesforce', isActive: true },
    });

    if (!integration) {
      throw new Error('Salesforce not connected for user');
    }

    const metadata = integration.metadata as any;
    return this.createConnection(
      userId,
      metadata.instanceUrl,
      integration.accessToken!,
      integration.refreshToken!
    );
  }

  /**
   * Sync meeting to Salesforce
   */
  async syncMeeting(
    userId: string,
    meetingId: string,
    attendeeEmails: string[]
  ): Promise<SalesforceMeetingSync> {
    try {
      const conn = await this.getConnection(userId);
      
      // Get meeting details
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          recordings: true,
          transcripts: true,
          aiAnalyses: true,
        },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Find related contacts and accounts
      const contacts = await this.findContactsByEmail(conn, attendeeEmails);
      const accountIds = [...new Set(contacts.map(c => c.AccountId).filter(Boolean))];
      
      // Find related opportunities
      const opportunities = await this.findRelatedOpportunities(conn, accountIds);

      // Create or update Salesforce Event
      const sfEvent: SalesforceEvent = {
        Subject: meeting.title,
        Description: meeting.description || `Meeting recorded and transcribed by OpenMeet`,
        Location: meeting.location || undefined,
        StartDateTime: meeting.scheduledStartAt?.toISOString() || new Date().toISOString(),
        EndDateTime: meeting.scheduledEndAt?.toISOString() || new Date().toISOString(),
        Type: 'Meeting',
        MeetingUrl__c: meeting.meetingUrl || undefined,
        MeetingRecordingUrl__c: meeting.recordings && meeting.recordings.length > 0 ? (meeting.recordings[0] as any).fileUrl : undefined,
        MeetingTranscriptUrl__c: meeting.transcripts && meeting.transcripts.length > 0 ? (meeting.transcripts[0] as any).fileUrl : undefined,
      };

      // Associate with first contact if available
      if (contacts.length > 0) {
        sfEvent.WhoId = contacts[0].Id;
      }

      // Associate with first account if available
      if (accountIds.length > 0) {
        sfEvent.WhatId = accountIds[0];
      }

      let salesforceEventId: string;

      // Check if event already exists
      const existingSync = await prisma.salesforceMeetingSync.findFirst({
        where: { meetingId },
      });

      if (existingSync?.salesforceEventId) {
        // Update existing event
        await conn.sobject('Event').update({
          Id: existingSync.salesforceEventId,
          ...sfEvent,
        });
        salesforceEventId = existingSync.salesforceEventId;
      } else {
        // Create new event
        const result = await conn.sobject('Event').create(sfEvent);
        salesforceEventId = result.id;
      }

      // Create tasks for action items if AI analysis available
      const actionItems = meeting.aiAnalyses?.[0]?.actionItems;
      if (meeting.aiAnalyses && meeting.aiAnalyses.length > 0 && Array.isArray(actionItems)) {
        await this.createActionItemTasks(
          conn,
          actionItems as any[],
          salesforceEventId,
          contacts
        );
      }

      // Save sync record
      const syncRecord = await prisma.salesforceMeetingSync.upsert({
        where: { id: existingSync?.id || 'new' },
        update: {
          salesforceEventId,
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
          metadata: {
            accountIds,
            contactIds: contacts.map(c => c.Id),
            opportunityIds: opportunities.map(o => o.Id),
            syncedAt: new Date().toISOString(),
          },
        },
        create: {
          meetingId,
          salesforceEventId,
          syncStatus: 'synced',
          metadata: {
            accountIds,
            contactIds: contacts.map(c => c.Id),
            opportunityIds: opportunities.map(o => o.Id),
            syncedAt: new Date().toISOString(),
          },
        },
      });

      logger.info(`Synced meeting ${meetingId} to Salesforce`);

      this.emit('meeting:synced', {
        meetingId,
        salesforceEventId,
        platform: 'salesforce',
      });

      return syncRecord as any;
    } catch (error) {
      logger.error('Failed to sync meeting to Salesforce:', error);

      // Save error
      const errorRecord = await prisma.salesforceMeetingSync.findFirst({ where: { meetingId } });
      await prisma.salesforceMeetingSync.upsert({
        where: { id: errorRecord?.id || 'new' },
        update: {
          syncStatus: 'failed',
          metadata: {
            syncErrors: [error instanceof Error ? error.message : 'Unknown error'],
            lastErrorAt: new Date().toISOString(),
          },
        },
        create: {
          meetingId,
          salesforceEventId: `temp-${meetingId}`,
          syncStatus: 'failed',
          metadata: {
            syncErrors: [error instanceof Error ? error.message : 'Unknown error'],
            lastErrorAt: new Date().toISOString(),
          },
        },
      });

      throw error;
    }
  }

  /**
   * Find contacts by email
   */
  private async findContactsByEmail(
    conn: any,
    emails: string[]
  ): Promise<SalesforceContact[]> {
    if (emails.length === 0) return [];

    const emailList = emails.map(e => `'${e}'`).join(',');
    const query = `
      SELECT Id, FirstName, LastName, Email, Phone, Title,
             Department, AccountId, OwnerId
      FROM Contact
      WHERE Email IN (${emailList})
    `;

    const result = await conn.query(query);
    return result.records;
  }

  /**
   * Find related opportunities
   */
  private async findRelatedOpportunities(
    conn: any,
    accountIds: string[]
  ): Promise<SalesforceOpportunity[]> {
    if (accountIds.length === 0) return [];

    const idList = accountIds.map(id => `'${id}'`).join(',');
    const query = `
      SELECT Id, Name, AccountId, Amount, CloseDate,
             StageName, Probability, Type, LeadSource,
             Description, OwnerId, IsClosed, IsWon
      FROM Opportunity
      WHERE AccountId IN (${idList})
        AND IsClosed = false
      ORDER BY CloseDate ASC
      LIMIT 10
    `;

    const result = await conn.query(query);
    return result.records;
  }

  /**
   * Create tasks for action items
   */
  private async createActionItemTasks(
    conn: any,
    actionItems: any[],
    eventId: string,
    contacts: SalesforceContact[]
  ): Promise<void> {
    const tasks: SalesforceTask[] = actionItems.map(item => ({
      Subject: `Action Item: ${item.description}`,
      Description: item.details || item.description,
      Status: 'Not Started',
      Priority: item.priority === 'urgent' ? 'High' : 'Normal',
      ActivityDate: item.dueDate,
      Type: 'Task',
      WhatId: eventId,
      WhoId: contacts.length > 0 ? contacts[0].Id : undefined,
    }));

    if (tasks.length > 0) {
      await conn.sobject('Task').create(tasks);
      logger.info(`Created ${tasks.length} tasks for action items`);
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(
    userId: string,
    searchTerm: string,
    limit: number = 10
  ): Promise<SalesforceContact[]> {
    const conn = await this.getConnection(userId);

    const query = `
      SELECT Id, FirstName, LastName, Email, Phone,
             Title, Department, AccountId, Account.Name
      FROM Contact
      WHERE Name LIKE '%${searchTerm}%'
         OR Email LIKE '%${searchTerm}%'
         OR Phone LIKE '%${searchTerm}%'
      LIMIT ${limit}
    `;

    const result = await conn.query(query);
    return result.records;
  }

  /**
   * Search accounts
   */
  async searchAccounts(
    userId: string,
    searchTerm: string,
    limit: number = 10
  ): Promise<SalesforceAccount[]> {
    const conn = await this.getConnection(userId);

    const query = `
      SELECT Id, Name, Type, Industry, Website, Phone,
             AnnualRevenue, NumberOfEmployees, OwnerId
      FROM Account
      WHERE Name LIKE '%${searchTerm}%'
         OR Website LIKE '%${searchTerm}%'
      LIMIT ${limit}
    `;

    const result = await conn.query(query);
    return result.records;
  }

  /**
   * Search opportunities
   */
  async searchOpportunities(
    userId: string,
    searchTerm: string,
    limit: number = 10
  ): Promise<SalesforceOpportunity[]> {
    const conn = await this.getConnection(userId);

    const query = `
      SELECT Id, Name, AccountId, Account.Name, Amount,
             CloseDate, StageName, Probability, Type,
             LeadSource, IsClosed, IsWon
      FROM Opportunity
      WHERE Name LIKE '%${searchTerm}%'
         OR Account.Name LIKE '%${searchTerm}%'
      ORDER BY CloseDate ASC
      LIMIT ${limit}
    `;

    const result = await conn.query(query);
    return result.records;
  }

  /**
   * Create lead from meeting
   */
  async createLeadFromMeeting(
    userId: string,
    meetingId: string,
    leadData: Partial<SalesforceLead>
  ): Promise<string> {
    const conn = await this.getConnection(userId);
    
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const lead: Partial<SalesforceLead> = {
      LastName: leadData.LastName || 'Unknown',
      Company: leadData.Company || 'Unknown Company',
      Status: 'New',
      LeadSource: 'Meeting',
      Description: `Lead generated from meeting: ${meeting.title}\n\nMeeting Date: ${meeting.scheduledStartAt}`,
      ...leadData,
    };

    const result = await conn.sobject('Lead').create(lead);
    
    logger.info(`Created lead ${result.id} from meeting ${meetingId}`);
    
    return result.id;
  }

  /**
   * Get meeting insights for account
   */
  async getAccountMeetingInsights(
    userId: string,
    accountId: string
  ): Promise<{
    totalMeetings: number;
    lastMeetingDate?: Date;
    averageSentiment?: number;
    keyTopics: string[];
    actionItemsCount: number;
    decisionsCount: number;
  }> {
    const conn = await this.getConnection(userId);

    // Get all events for account
    const events = await conn.query(`
      SELECT Id, Subject, StartDateTime, EndDateTime,
             MeetingRecordingUrl__c, MeetingTranscriptUrl__c
      FROM Event
      WHERE WhatId = '${accountId}'
        AND Type = 'Meeting'
      ORDER BY StartDateTime DESC
    `);

    // Get synced meetings
    const syncedMeetings = await prisma.salesforceMeetingSync.findMany({
      where: {
        OR: [
          { salesforceAccountId: accountId },
          {
            metadata: {
              path: ['accountIds'],
              array_contains: accountId,
            },
          },
        ],
      },
      include: {
        meeting: {
          include: {
            aiAnalyses: true,
          },
        },
      },
    });

    // Calculate insights
    const insights = {
      totalMeetings: events.totalSize,
      lastMeetingDate: events.records[0]?.StartDateTime
        ? new Date(events.records[0].StartDateTime)
        : undefined,
      averageSentiment: 0,
      keyTopics: [] as string[],
      actionItemsCount: 0,
      decisionsCount: 0,
    };

    // Aggregate AI analysis data
    if (syncedMeetings.length > 0) {
      let totalSentiment = 0;
      const allTopics = new Set<string>();

      syncedMeetings.forEach(sync => {
        if (sync.meeting?.aiAnalyses && sync.meeting.aiAnalyses.length > 0) {
          const analysis = sync.meeting.aiAnalyses[0];
          const sentiment = analysis.sentiment as any;
          const topics = analysis.topics as any;
          const actionItems = analysis.actionItems as any;
          const decisions = analysis.decisions as any;

          if (sentiment?.overall) {
            totalSentiment += sentiment.overall;
          }

          if (Array.isArray(topics)) {
            topics.forEach((topic: any) => {
              allTopics.add(topic.name);
            });
          }

          insights.actionItemsCount += (Array.isArray(actionItems) ? actionItems.length : 0);
          insights.decisionsCount += (Array.isArray(decisions) ? decisions.length : 0);
        }
      });

      insights.averageSentiment = totalSentiment / syncedMeetings.length;
      insights.keyTopics = Array.from(allTopics).slice(0, 10);
    }

    return insights;
  }

  /**
   * Disconnect Salesforce
   */
  async disconnect(userId: string): Promise<void> {
    // Close connection
    const conn = this.connections.get(userId);
    if (conn) {
      await conn.logout();
      this.connections.delete(userId);
    }

    // Update database
    await prisma.integration.updateMany({
      where: { userId, type: 'salesforce' },
      data: { isActive: false },
    });

    logger.info(`Salesforce disconnected for user ${userId}`);
  }
}
