/**
 * HubSpot CRM Integration Service
 * Sync meetings, contacts, and deals with HubSpot
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { QueueService, JobType } from '../services/queue';
import { CacheService } from '../services/cache';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'hubspot-integration' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface HubSpotConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  appId?: string;
  apiKey?: string; // For private apps
}

export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
    createdate?: string;
    lastmodifieddate?: string;
    notes_last_contacted?: string;
    notes_last_updated?: string;
    num_contacted_notes?: string;
    num_notes?: string;
    hs_email_domain?: string;
    hubspot_owner_id?: string;
    associatedcompanyid?: string;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name: string;
    domain?: string;
    industry?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    numberofemployees?: number;
    annualrevenue?: number;
    description?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    hubspot_owner_id?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount?: number;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    hubspot_owner_id?: string;
    dealtype?: string;
    description?: string;
    hs_forecast_category?: string;
    hs_forecast_probability?: number;
    hs_manual_forecast_category?: string;
    hs_next_step?: string;
    num_associated_contacts?: number;
    num_contacted_notes?: number;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotEngagement {
  id?: string;
  properties?: {
    hs_timestamp?: string;
    hs_engagement_type?: string;
    hs_meeting_title?: string;
    hs_meeting_body?: string;
    hs_meeting_start_time?: string;
    hs_meeting_end_time?: string;
    hs_meeting_location?: string;
    hs_meeting_outcome?: string;
    hs_meeting_notes?: string;
    hubspot_owner_id?: string;
  };
  associations?: {
    contacts?: string[];
    companies?: string[];
    deals?: string[];
  };
}

export interface HubSpotNote {
  properties: {
    hs_timestamp: string;
    hs_note_body: string;
    hubspot_owner_id?: string;
  };
  associations?: {
    contacts?: string[];
    companies?: string[];
    deals?: string[];
  };
}

export interface HubSpotTask {
  properties: {
    hs_task_subject: string;
    hs_task_body?: string;
    hs_task_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING' | 'DEFERRED';
    hs_task_priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    hs_task_type?: string;
    hs_timestamp?: string;
    hs_task_reminders?: string;
    hubspot_owner_id?: string;
  };
  associations?: {
    contacts?: string[];
    companies?: string[];
    deals?: string[];
  };
}

export interface HubSpotMeetingSync {
  meetingId: string;
  hubspotEngagementId?: string;
  contactIds?: string[];
  companyIds?: string[];
  dealIds?: string[];
  syncStatus: 'pending' | 'synced' | 'failed';
  lastSyncAt?: Date;
  syncErrors?: string[];
}

export class HubSpotIntegration extends EventEmitter {
  private config: HubSpotConfig;
  private api: AxiosInstance;
  private queueService: QueueService;
  private cacheService: CacheService;
  private accessTokens: Map<string, { token: string; expiresAt: Date }>;

  constructor(
    config: HubSpotConfig,
    queueService: QueueService,
    cacheService: CacheService
  ) {
    super();
    this.config = config;
    this.queueService = queueService;
    this.cacheService = cacheService;
    this.accessTokens = new Map();

    this.api = axios.create({
      baseURL: 'https://api.hubapi.com',
      timeout: 30000,
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use(async (config) => {
      // Get token from first user in map (for multi-tenant, this needs modification)
      const [userId, tokenData] = this.accessTokens.entries().next().value || [];
      if (tokenData) {
        config.headers.Authorization = `Bearer ${tokenData.token}`;
      }
      return config;
    });
  }

  /**
   * OAuth 2.0 Flow
   */
  getAuthorizationUrl(state: string): string {
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'sales-email-read',
      'crm.objects.owners.read',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scopes,
      state,
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  /**
   * Connect HubSpot account
   */
  async connectAccount(
    userId: string,
    organizationId: string,
    authCode: string
  ): Promise<void> {
    try {
      const tokens = await this.exchangeCodeForToken(authCode);

      // Store access token in memory
      this.accessTokens.set(userId, {
        token: tokens.access_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      });

      // Get account info
      const accountInfo = await this.getAccountInfo(tokens.access_token);

      // Save integration
      await prisma.integration.create({
        data: {
          organizationId,
          userId,
          type: 'hubspot',
          name: 'HubSpot',
          isActive: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          metadata: {
            portalId: accountInfo.portalId,
            appId: accountInfo.appId,
            hubId: accountInfo.hub_id,
            timeZone: accountInfo.timeZone,
            currency: accountInfo.currency,
          },
        },
      });

      logger.info(`HubSpot account connected for user ${userId}`);
      
      this.emit('account:connected', {
        userId,
        organizationId,
        platform: 'hubspot',
      });
    } catch (error) {
      logger.error('Failed to connect HubSpot account:', error);
      throw error;
    }
  }

  /**
   * Get account info
   */
  private async getAccountInfo(accessToken: string): Promise<any> {
    const response = await axios.get(
      'https://api.hubapi.com/account-info/v3/details',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Set access token for user
   */
  async setAccessToken(userId: string, accessToken: string, expiresIn?: number): Promise<void> {
    this.accessTokens.set(userId, {
      token: accessToken,
      expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000),
    });
  }

  /**
   * Sync meeting to HubSpot
   */
  async syncMeeting(
    userId: string,
    meetingId: string,
    attendeeEmails: string[]
  ): Promise<HubSpotMeetingSync> {
    try {
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

      // Find related contacts and companies
      const contacts = await this.findContactsByEmail(attendeeEmails);
      const contactIds = contacts.map(c => c.id);
      
      // Get associated companies
      const companyIds = await this.getAssociatedCompanies(contactIds);
      
      // Get associated deals
      const dealIds = await this.getAssociatedDeals(contactIds, companyIds);

      // Create or update HubSpot engagement
      const engagement: HubSpotEngagement = {
        properties: {
          hs_engagement_type: 'MEETING',
          hs_meeting_title: meeting.title,
          hs_meeting_body: meeting.description || 'Meeting recorded and transcribed by OpenMeet',
          hs_meeting_start_time: meeting.scheduledStartAt.toISOString(),
          hs_meeting_end_time: meeting.scheduledEndAt.toISOString(),
          hs_meeting_location: meeting.location || meeting.meetingUrl || undefined,
          hs_meeting_notes: await this.generateMeetingNotes(meeting),
        },
        associations: {
          contacts: contactIds,
          companies: companyIds,
          deals: dealIds,
        },
      };

      let hubspotEngagementId: string;
      
      // Check if engagement already exists
      const existingSync = await prisma.hubspotMeetingSync.findFirst({
        where: { meetingId },
      });

      if (existingSync?.hubspotEngagementId) {
        // Update existing engagement
        await this.api.patch(
          `/crm/v3/objects/meetings/${existingSync.hubspotEngagementId}`,
          engagement
        );
        hubspotEngagementId = existingSync.hubspotEngagementId;
      } else {
        // Create new engagement
        const response = await this.api.post('/crm/v3/objects/meetings', engagement);
        hubspotEngagementId = response.data.id;
      }

      // Create notes for key insights
      if (meeting.aiAnalyses && meeting.aiAnalyses.length > 0) {
        await this.createInsightNotes(
          meeting.aiAnalyses[0],
          hubspotEngagementId,
          contactIds,
          companyIds
        );
      }

      // Create tasks for action items
      const actionItems = meeting.aiAnalyses?.[0]?.actionItems;
      if (meeting.aiAnalyses && meeting.aiAnalyses.length > 0 && Array.isArray(actionItems)) {
        await this.createActionItemTasks(
          actionItems as any[],
          contactIds,
          companyIds,
          dealIds
        );
      }

      // Save sync record
      const existingRecord = await prisma.hubspotMeetingSync.findFirst({ where: { meetingId } });
      const syncRecord = await prisma.hubspotMeetingSync.upsert({
        where: { id: existingRecord?.id || 'new' },
        update: {
          hubspotEngagementId,
          hubspotContactIds: contactIds,
          hubspotDealId: dealIds.length > 0 ? dealIds[0] : undefined,
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
          metadata: {
            companyIds,
            dealIds,
            syncedAt: new Date().toISOString(),
          },
        },
        create: {
          meetingId,
          hubspotMeetingId: hubspotEngagementId,
          hubspotEngagementId,
          hubspotContactIds: contactIds,
          hubspotDealId: dealIds.length > 0 ? dealIds[0] : undefined,
          syncStatus: 'synced',
          metadata: {
            companyIds,
            dealIds,
            syncedAt: new Date().toISOString(),
          },
        },
      });

      logger.info(`Synced meeting ${meetingId} to HubSpot`);
      
      this.emit('meeting:synced', {
        meetingId,
        hubspotEngagementId,
        platform: 'hubspot',
      });

      return syncRecord as any;
    } catch (error) {
      logger.error('Failed to sync meeting to HubSpot:', error);
      
      // Save error
      const errorRecord = await prisma.hubspotMeetingSync.findFirst({ where: { meetingId } });
      await prisma.hubspotMeetingSync.upsert({
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
          hubspotMeetingId: `temp-${meetingId}`,
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
   * Generate meeting notes from AI analysis
   */
  private async generateMeetingNotes(meeting: any): Promise<string> {
    let notes = `# Meeting Summary\n\n`;

    if (meeting.aiAnalyses && meeting.aiAnalyses.length > 0) {
      const analysis = meeting.aiAnalyses[0];
      
      // Add summary
      if (analysis.summary?.executive) {
        notes += `## Executive Summary\n${analysis.summary.executive}\n\n`;
      }
      
      // Add key points
      if (analysis.keyPoints?.length > 0) {
        notes += `## Key Points\n`;
        analysis.keyPoints.forEach((point: any) => {
          notes += `- ${point.text}\n`;
        });
        notes += '\n';
      }
      
      // Add decisions
      if (analysis.decisions?.length > 0) {
        notes += `## Decisions Made\n`;
        analysis.decisions.forEach((decision: any) => {
          notes += `- ${decision.description}\n`;
        });
        notes += '\n';
      }
      
      // Add action items
      if (analysis.actionItems?.length > 0) {
        notes += `## Action Items\n`;
        analysis.actionItems.forEach((item: any) => {
          notes += `- ${item.description} (Priority: ${item.priority})\n`;
        });
        notes += '\n';
      }
    }

    // Add recording and transcript links
    if (meeting.recordings && meeting.recordings.length > 0) {
      notes += `\n[View Recording](${meeting.recordings[0].fileUrl})\n`;
    }

    if (meeting.transcripts && meeting.transcripts.length > 0) {
      notes += `[View Transcript](${meeting.transcripts[0].fileUrl})\n`;
    }
    
    return notes;
  }

  /**
   * Find contacts by email
   */
  private async findContactsByEmail(emails: string[]): Promise<HubSpotContact[]> {
    const contacts: HubSpotContact[] = [];
    
    for (const email of emails) {
      try {
        const response = await this.api.post('/crm/v3/objects/contacts/search', {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            }],
          }],
          properties: ['firstname', 'lastname', 'email', 'company', 'jobtitle'],
          limit: 1,
        });
        
        if (response.data.results.length > 0) {
          contacts.push(response.data.results[0]);
        }
      } catch (error) {
        logger.debug(`Contact not found for email: ${email}`);
      }
    }
    
    return contacts;
  }

  /**
   * Get associated companies
   */
  private async getAssociatedCompanies(contactIds: string[]): Promise<string[]> {
    const companyIds = new Set<string>();
    
    for (const contactId of contactIds) {
      try {
        const response = await this.api.get(
          `/crm/v3/objects/contacts/${contactId}/associations/companies`
        );
        
        response.data.results.forEach((association: any) => {
          companyIds.add(association.id);
        });
      } catch (error) {
        logger.debug(`No companies found for contact: ${contactId}`);
      }
    }
    
    return Array.from(companyIds);
  }

  /**
   * Get associated deals
   */
  private async getAssociatedDeals(
    contactIds: string[],
    companyIds: string[]
  ): Promise<string[]> {
    const dealIds = new Set<string>();
    
    // Get deals from contacts
    for (const contactId of contactIds) {
      try {
        const response = await this.api.get(
          `/crm/v3/objects/contacts/${contactId}/associations/deals`
        );
        
        response.data.results.forEach((association: any) => {
          dealIds.add(association.id);
        });
      } catch (error) {
        logger.debug(`No deals found for contact: ${contactId}`);
      }
    }
    
    // Get deals from companies
    for (const companyId of companyIds) {
      try {
        const response = await this.api.get(
          `/crm/v3/objects/companies/${companyId}/associations/deals`
        );
        
        response.data.results.forEach((association: any) => {
          dealIds.add(association.id);
        });
      } catch (error) {
        logger.debug(`No deals found for company: ${companyId}`);
      }
    }
    
    return Array.from(dealIds);
  }

  /**
   * Create insight notes
   */
  private async createInsightNotes(
    analysis: any,
    engagementId: string,
    contactIds: string[],
    companyIds: string[]
  ): Promise<void> {
    const notes: HubSpotNote[] = [];
    
    // Create note for sentiment analysis
    if (analysis.sentiment) {
      notes.push({
        properties: {
          hs_timestamp: new Date().toISOString(),
          hs_note_body: `Meeting Sentiment: ${analysis.sentiment.overall > 0 ? 'Positive' : 'Negative'} (${analysis.sentiment.overall})`,
        },
        associations: {
          contacts: contactIds,
          companies: companyIds,
        },
      });
    }
    
    // Create note for risks
    if (analysis.risks?.length > 0) {
      const riskNote = analysis.risks.map((risk: any) => 
        `- ${risk.description} (Impact: ${risk.impact})`
      ).join('\n');
      
      notes.push({
        properties: {
          hs_timestamp: new Date().toISOString(),
          hs_note_body: `Identified Risks:\n${riskNote}`,
        },
        associations: {
          contacts: contactIds,
          companies: companyIds,
        },
      });
    }
    
    // Create note for opportunities
    if (analysis.opportunities?.length > 0) {
      const oppNote = analysis.opportunities.map((opp: any) => 
        `- ${opp.description} (Potential: ${opp.potential})`
      ).join('\n');
      
      notes.push({
        properties: {
          hs_timestamp: new Date().toISOString(),
          hs_note_body: `Identified Opportunities:\n${oppNote}`,
        },
        associations: {
          contacts: contactIds,
          companies: companyIds,
        },
      });
    }
    
    // Create all notes
    for (const note of notes) {
      try {
        await this.api.post('/crm/v3/objects/notes', note);
      } catch (error) {
        logger.error('Failed to create note:', error);
      }
    }
  }

  /**
   * Create tasks for action items
   */
  private async createActionItemTasks(
    actionItems: any[],
    contactIds: string[],
    companyIds: string[],
    dealIds: string[]
  ): Promise<void> {
    for (const item of actionItems) {
      const task: HubSpotTask = {
        properties: {
          hs_task_subject: `Action Item: ${item.description}`,
          hs_task_body: item.details || item.description,
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: item.priority === 'urgent' ? 'HIGH' : 'MEDIUM',
          hs_timestamp: item.dueDate || new Date().toISOString(),
        },
        associations: {
          contacts: contactIds.slice(0, 1), // Associate with first contact
          companies: companyIds.slice(0, 1),
          deals: dealIds.slice(0, 1),
        },
      };
      
      try {
        await this.api.post('/crm/v3/objects/tasks', task);
      } catch (error) {
        logger.error('Failed to create task:', error);
      }
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(searchTerm: string, limit: number = 10): Promise<HubSpotContact[]> {
    const response = await this.api.post('/crm/v3/objects/contacts/search', {
      query: searchTerm,
      properties: ['firstname', 'lastname', 'email', 'company', 'jobtitle', 'phone'],
      limit,
    });
    
    return response.data.results;
  }

  /**
   * Search companies
   */
  async searchCompanies(searchTerm: string, limit: number = 10): Promise<HubSpotCompany[]> {
    const response = await this.api.post('/crm/v3/objects/companies/search', {
      query: searchTerm,
      properties: ['name', 'domain', 'industry', 'numberofemployees', 'annualrevenue'],
      limit,
    });
    
    return response.data.results;
  }

  /**
   * Search deals
   */
  async searchDeals(searchTerm: string, limit: number = 10): Promise<HubSpotDeal[]> {
    const response = await this.api.post('/crm/v3/objects/deals/search', {
      query: searchTerm,
      properties: ['dealname', 'amount', 'dealstage', 'closedate', 'pipeline'],
      limit,
    });
    
    return response.data.results;
  }

  /**
   * Get deal insights from meetings
   */
  async getDealMeetingInsights(dealId: string): Promise<{
    totalMeetings: number;
    lastMeetingDate?: Date;
    averageSentiment?: number;
    keyTopics: string[];
    actionItemsCount: number;
    decisionsCount: number;
  }> {
    // Get all meetings associated with deal
    const syncedMeetings = await prisma.hubspotMeetingSync.findMany({
      where: {
        OR: [
          { hubspotDealId: dealId },
          {
            metadata: {
              path: ['dealIds'],
              array_contains: dealId,
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
      totalMeetings: syncedMeetings.length,
      lastMeetingDate: syncedMeetings[0]?.meeting.scheduledStartAt,
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
        if (sync.meeting.aiAnalyses && sync.meeting.aiAnalyses.length > 0) {
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
   * Create contact from meeting attendee
   */
  async createContactFromAttendee(
    email: string,
    firstName?: string,
    lastName?: string,
    company?: string
  ): Promise<string> {
    const response = await this.api.post('/crm/v3/objects/contacts', {
      properties: {
        email,
        firstname: firstName || '',
        lastname: lastName || 'Unknown',
        company: company || '',
        lifecyclestage: 'lead',
      },
    });
    
    logger.info(`Created HubSpot contact: ${response.data.id}`);
    
    return response.data.id;
  }

  /**
   * Update deal stage based on meeting outcomes
   */
  async updateDealStageFromMeeting(
    dealId: string,
    meetingAnalysis: any
  ): Promise<void> {
    // Analyze meeting sentiment and decisions to suggest deal stage
    const sentiment = meetingAnalysis.sentiment?.overall || 0;
    const hasPositiveDecisions = meetingAnalysis.decisions?.some(
      (d: any) => d.impact === 'high'
    );
    
    let suggestedStage;
    
    if (sentiment > 0.7 && hasPositiveDecisions) {
      suggestedStage = 'contractsent';
    } else if (sentiment > 0.3) {
      suggestedStage = 'presentationscheduled';
    } else if (sentiment < -0.3) {
      suggestedStage = 'closedlost';
    }
    
    if (suggestedStage) {
      await this.api.patch(`/crm/v3/objects/deals/${dealId}`, {
        properties: {
          dealstage: suggestedStage,
          hs_next_step: `Follow up based on meeting insights`,
        },
      });
      
      logger.info(`Updated deal ${dealId} stage to ${suggestedStage}`);
    }
  }

  /**
   * Disconnect HubSpot
   */
  async disconnect(userId: string): Promise<void> {
    // Remove access token
    this.accessTokens.delete(userId);

    // Update database
    await prisma.integration.updateMany({
      where: { userId, type: 'hubspot' },
      data: { isActive: false },
    });

    logger.info(`HubSpot disconnected for user ${userId}`);
  }
}
