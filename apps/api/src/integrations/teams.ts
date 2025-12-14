/**
 * Microsoft Teams Integration Service
 * REAL Implementation using Microsoft Graph API and MSAL-Node
 *
 * Uses:
 * - @microsoft/microsoft-graph-client for Graph API calls
 * - @azure/msal-node for authentication (ConfidentialClientApplication)
 * - @azure/identity for alternative credential management
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { Client, ResponseType } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import { ConfidentialClientApplication, Configuration, AuthenticationResult } from '@azure/msal-node';
import crypto from 'crypto';
import { RecordingService } from '../services/recording';
import { QueueService, JobType } from '../services/queue';
import { CacheService } from '../services/cache';
import { publisher as redisPublisher, subscriber as redisSubscriber } from '../graphql/pubsub';
import Redis from 'ioredis';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'teams-integration' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface TeamsConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  botId?: string;
  botPassword?: string;
}

export interface TeamsMeeting {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  changeKey: string;
  categories: string[];
  transactionId: string;
  originalStartTimeZone: string;
  originalEndTimeZone: string;
  iCalUId: string;
  reminderMinutesBeforeStart: number;
  isReminderOn: boolean;
  hasAttachments: boolean;
  subject: string;
  bodyPreview: string;
  importance: string;
  sensitivity: string;
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  responseRequested: boolean;
  seriesMasterId: string | null;
  showAs: string;
  type: string;
  webLink: string;
  onlineMeetingUrl: string;
  isOnlineMeeting: boolean;
  onlineMeetingProvider: string;
  allowNewTimeProposals: boolean;
  isDraft: boolean;
  hideAttendees: boolean;
  responseStatus: {
    response: string;
    time: string;
  };
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: {
    displayName: string;
    locationType: string;
    uniqueId: string;
    uniqueIdType: string;
  };
  locations: Array<{
    displayName: string;
    locationType: string;
    uniqueId: string;
    uniqueIdType: string;
  }>;
  recurrence: any | null;
  attendees: Array<{
    type: string;
    status: {
      response: string;
      time: string;
    };
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  organizer: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  onlineMeeting?: {
    joinUrl: string;
    conferenceId: string;
    tollNumber?: string;
    tollFreeNumbers?: string[];
    quickDial?: string;
  };
}

export interface TeamsRecording {
  id: string;
  meetingId: string;
  meetingOrganizer: {
    application: any | null;
    device: any | null;
    user: {
      id: string;
      displayName: string;
      userPrincipalName: string;
    };
  };
  recordingContentUrl: string;
  createdDateTime: string;
}

export interface TeamsTranscript {
  id: string;
  meetingId: string;
  transcriptContentUrl: string;
  createdDateTime: string;
  meetingOrganizer: {
    application: any | null;
    device: any | null;
    user: {
      id: string;
      displayName: string;
      userPrincipalName: string;
    };
  };
}

export interface TranscriptSegment {
  text: string;
  speaker?: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  language?: string;
}

export interface TeamsCallRecord {
  id: string;
  version: number;
  type: string;
  modalities: string[];
  lastModifiedDateTime: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl: string;
  organizer: {
    user: {
      id: string;
      displayName: string;
      userPrincipalName: string;
    };
  };
  participants: Array<{
    user?: {
      id: string;
      displayName: string;
      userPrincipalName: string;
    };
    guest?: {
      id: string;
      displayName: string;
    };
  }>;
  sessions: Array<{
    id: string;
    caller: any;
    callee: any;
    startDateTime: string;
    endDateTime: string;
    modalities: string[];
  }>;
  [key: string]: any; // Add index signature for Prisma Json compatibility
}

export class TeamsIntegration extends EventEmitter {
  private config: TeamsConfig;
  private msalClient: ConfidentialClientApplication;
  private credential: ClientSecretCredential;
  private graphClient: Client;
  private recordingService: RecordingService;
  private queueService: QueueService;
  private cacheService: CacheService;
  private activeBots: Map<string, TeamsBot>;
  private redis: Redis;
  private redisSubscriber: Redis;

  constructor(
    config: TeamsConfig,
    recordingService: RecordingService,
    queueService: QueueService,
    cacheService: CacheService
  ) {
    super();
    this.config = config;
    this.recordingService = recordingService;
    this.queueService = queueService;
    this.cacheService = cacheService;
    this.activeBots = new Map();

    // Initialize Redis connections for transcription pub/sub
    this.redis = redisPublisher;
    this.redisSubscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    });

    // Initialize MSAL ConfidentialClientApplication for authentication
    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (!containsPii) {
              logger.debug(`MSAL: ${message}`);
            }
          },
          piiLoggingEnabled: false,
          logLevel: 3,
        },
      },
    };

    this.msalClient = new ConfidentialClientApplication(msalConfig);

    // Also initialize Azure Identity credential for TokenCredentialAuthenticationProvider
    this.credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );

    // Initialize Graph client with TokenCredentialAuthenticationProvider
    const authProvider = new TokenCredentialAuthenticationProvider(this.credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    this.graphClient = Client.initWithMiddleware({
      authProvider,
    });
  }

  /**
   * Get access token using MSAL client credentials flow
   * REAL implementation using @azure/msal-node ConfidentialClientApplication
   */
  async getAccessToken(): Promise<string> {
    try {
      const result: AuthenticationResult | null = await this.msalClient.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!result || !result.accessToken) {
        throw new Error('Failed to acquire access token from MSAL');
      }

      logger.debug('MSAL: Successfully acquired access token', {
        expiresOn: result.expiresOn,
        tokenType: result.tokenType,
      });

      return result.accessToken;
    } catch (error) {
      logger.error('MSAL: Failed to acquire access token', { error });
      throw error;
    }
  }

  /**
   * Get Graph client with fresh token from MSAL
   */
  async getGraphClientWithMsal(): Promise<Client> {
    const token = await this.getAccessToken();

    return Client.init({
      authProvider: (done) => {
        done(null, token);
      },
    });
  }

  /**
   * OAuth 2.0 Flow
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      response_mode: 'query',
      scope: 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite CallRecords.Read.All',
      state,
    });

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }> {
    const response = await axios.post(
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
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
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
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
   * Connect Teams account
   */
  async connectAccount(
    userId: string,
    organizationId: string,
    authCode: string
  ): Promise<void> {
    try {
      const tokens = await this.exchangeCodeForToken(authCode);

      // Get user info
      const userInfo = await this.getUserInfo(tokens.access_token);

      // Save integration
      await prisma.integration.create({
        data: {
          user: { connect: { id: userId } },
          organization: { connect: { id: organizationId } },
          type: 'teams',
          name: `Teams - ${userInfo.displayName || userInfo.mail}`,
          isActive: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          metadata: {
            teamsUserId: userInfo.id,
            email: userInfo.mail || userInfo.userPrincipalName,
            displayName: userInfo.displayName,
          },
        },
      });

      logger.info(`Teams account connected for user ${userId}`);

      this.emit('account:connected', {
        userId,
        organizationId,
        platform: 'teams',
      });
    } catch (error) {
      logger.error('Failed to connect Teams account:', error);
      throw error;
    }
  }

  /**
   * Ensure valid access token with auto-refresh
   */
  async ensureValidToken(userId: string, organizationId: string): Promise<string> {
    try {
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          organizationId,
          type: 'teams',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Teams integration not found');
      }

      // Check if token is expired or about to expire (within 5 minutes)
      const expiresAt = integration.expiresAt;
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (!expiresAt || expiresAt <= fiveMinutesFromNow) {
        logger.info('Access token expired or expiring soon, refreshing...');

        // Refresh token
        const tokens = await this.refreshAccessToken(integration.refreshToken!);

        // Update integration
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });

        return tokens.access_token;
      }

      return integration.accessToken!;
    } catch (error) {
      logger.error('Failed to ensure valid token:', error);
      throw error;
    }
  }

  /**
   * Get user info
   */
  private async getUserInfo(accessToken: string): Promise<any> {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  /**
   * Create online meeting
   */
  async createOnlineMeeting(
    userId: string,
    organizationId: string,
    subject: string,
    startDateTime: Date,
    endDateTime: Date,
    attendees?: string[]
  ): Promise<TeamsMeeting> {
    try {
      // Get integration for this user to get Teams user ID
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          organizationId,
          type: 'teams',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Teams integration not found for user');
      }

      const metadata = integration.metadata as any;
      const teamsUserId = metadata?.teamsUserId;

      if (!teamsUserId) {
        throw new Error('Teams user ID not found in integration metadata');
      }

      const meeting = await this.graphClient
        .api(`/users/${teamsUserId}/onlineMeetings`)
        .post({
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          subject,
          participants: {
            attendees: attendees?.map(email => ({
              upn: email,
            })) || [],
          },
        });

      // Save meeting to database
      await prisma.meeting.create({
        data: {
          organization: { connect: { id: organizationId } },
          user: { connect: { id: userId } },
          externalId: meeting.id,
          platform: 'teams',
          title: subject,
          scheduledStartAt: startDateTime,
          scheduledEndAt: endDateTime,
          meetingUrl: meeting.joinWebUrl,
          metadata: meeting,
        },
      });

      logger.info(`Created Teams meeting: ${meeting.id}`);

      return meeting;
    } catch (error) {
      logger.error('Failed to create Teams meeting:', error);
      throw error;
    }
  }

  /**
   * Create calendar event with Teams meeting
   */
  async createCalendarEvent(
    userId: string,
    organizationId: string,
    subject: string,
    startDateTime: Date,
    endDateTime: Date,
    attendees?: string[],
    body?: string
  ): Promise<TeamsMeeting> {
    try {
      // Get integration for this user to get Teams user ID
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          organizationId,
          type: 'teams',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Teams integration not found for user');
      }

      const metadata = integration.metadata as any;
      const teamsUserId = metadata?.teamsUserId;

      if (!teamsUserId) {
        throw new Error('Teams user ID not found in integration metadata');
      }

      const event = await this.graphClient
        .api(`/users/${teamsUserId}/events`)
        .post({
          subject,
          body: {
            contentType: 'HTML',
            content: body || '',
          },
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'UTC',
          },
          attendees: attendees?.map(email => ({
            emailAddress: {
              address: email,
            },
            type: 'required',
          })) || [],
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness',
        });

      // Save meeting to database
      await prisma.meeting.create({
        data: {
          organization: { connect: { id: organizationId } },
          user: { connect: { id: userId } },
          externalId: event.id,
          platform: 'teams',
          title: subject,
          scheduledStartAt: startDateTime,
          scheduledEndAt: endDateTime,
          meetingUrl: event.onlineMeetingUrl,
          metadata: event,
        },
      });

      logger.info(`Created Teams calendar event: ${event.id}`);

      return event;
    } catch (error) {
      logger.error('Failed to create Teams calendar event:', error);
      throw error;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string): Promise<TeamsMeeting> {
    const meeting = await this.graphClient
      .api(`/me/onlineMeetings/${meetingId}`)
      .get();
    
    return meeting;
  }

  /**
   * Update meeting
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<TeamsMeeting>
  ): Promise<void> {
    await this.graphClient
      .api(`/me/onlineMeetings/${meetingId}`)
      .patch(updates);
    
    logger.info(`Updated Teams meeting: ${meetingId}`);
  }

  /**
   * Delete meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    await this.graphClient
      .api(`/me/onlineMeetings/${meetingId}`)
      .delete();
    
    logger.info(`Deleted Teams meeting: ${meetingId}`);
  }

  /**
   * List meetings
   */
  async listMeetings(userId: string): Promise<TeamsMeeting[]> {
    const meetings = await this.graphClient
      .api(`/users/${userId}/onlineMeetings`)
      .get();
    
    return meetings.value;
  }

  /**
   * Join meeting with bot
   */
  async joinMeetingWithBot(
    meetingUrl: string,
    meetingId?: string
  ): Promise<string> {
    try {
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Check if bot already exists for this meeting
      if (meetingId && this.activeBots.has(meetingId)) {
        throw new Error('Bot already active in this meeting');
      }

      // Create bot instance
      const bot = new TeamsBot(
        botId,
        meetingUrl,
        this.config,
        this.recordingService,
        this.queueService
      );

      // Connect bot to meeting
      await bot.connect();
      
      if (meetingId) {
        this.activeBots.set(meetingId, bot);
      }

      // Handle bot events
      bot.on('connected', () => {
        logger.info(`Bot connected to Teams meeting: ${meetingUrl}`);
        this.emit('bot:connected', { meetingUrl, botId });
      });

      bot.on('recording:started', () => {
        logger.info(`Bot started recording Teams meeting: ${meetingUrl}`);
        this.emit('bot:recording:started', { meetingUrl, botId });
      });

      bot.on('disconnected', () => {
        logger.info(`Bot disconnected from Teams meeting: ${meetingUrl}`);
        if (meetingId) {
          this.activeBots.delete(meetingId);
        }
        this.emit('bot:disconnected', { meetingUrl, botId });
      });

      return botId;
    } catch (error) {
      logger.error('Failed to join meeting with bot:', error);
      throw error;
    }
  }

  /**
   * Leave meeting with bot
   */
  async leaveMeetingWithBot(meetingId: string): Promise<void> {
    const bot = this.activeBots.get(meetingId);
    
    if (!bot) {
      throw new Error('No active bot found for this meeting');
    }

    await bot.disconnect();
    this.activeBots.delete(meetingId);
  }

  /**
   * Get call records
   */
  async getCallRecords(
    fromDateTime?: Date,
    toDateTime?: Date
  ): Promise<TeamsCallRecord[]> {
    let filter = '';
    
    if (fromDateTime && toDateTime) {
      filter = `?$filter=startDateTime ge ${fromDateTime.toISOString()} and startDateTime le ${toDateTime.toISOString()}`;
    }

    const records = await this.graphClient
      .api(`/communications/callRecords${filter}`)
      .get();
    
    return records.value;
  }

  /**
   * Get call record details
   */
  async getCallRecord(callRecordId: string): Promise<TeamsCallRecord> {
    const record = await this.graphClient
      .api(`/communications/callRecords/${callRecordId}`)
      .expand('sessions($expand=segments)')
      .get();
    
    return record;
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(meetingId: string): Promise<TeamsRecording[]> {
    const recordings = await this.graphClient
      .api(`/me/onlineMeetings/${meetingId}/recordings`)
      .get();
    
    return recordings.value;
  }

  /**
   * Download recording
   */
  async downloadRecording(recordingUrl: string): Promise<Buffer> {
    const token = await this.credential.getToken(['https://graph.microsoft.com/.default']);
    
    const response = await axios.get(recordingUrl, {
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  /**
   * Get meeting transcript
   */
  async getMeetingTranscript(meetingId: string): Promise<TeamsTranscript[]> {
    const transcripts = await this.graphClient
      .api(`/me/onlineMeetings/${meetingId}/transcripts`)
      .get();
    
    return transcripts.value;
  }

  /**
   * Download transcript
   */
  async downloadTranscript(transcriptUrl: string): Promise<string> {
    const token = await this.credential.getToken(['https://graph.microsoft.com/.default']);
    
    const response = await axios.get(transcriptUrl, {
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
    });

    return response.data;
  }

  /**
   * Process change notification (webhook)
   */
  async processChangeNotification(notification: any): Promise<void> {
    logger.info(`Processing Teams change notification: ${notification.changeType}`);

    switch (notification.changeType) {
      case 'created':
        if (notification.resource.includes('callRecords')) {
          await this.handleCallRecordCreated(notification);
        } else if (notification.resource.includes('transcription')) {
          await this.handleTranscriptionSegment(notification);
        }
        break;

      case 'updated':
        if (notification.resource.includes('callRecords')) {
          await this.handleCallRecordUpdated(notification);
        }
        break;

      default:
        logger.debug(`Unhandled change type: ${notification.changeType}`);
    }
  }

  /**
   * Handle incoming transcription segment from webhook
   * Pushes segment to Redis for consumption by getRealtimeTranscription
   */
  private async handleTranscriptionSegment(notification: any): Promise<void> {
    try {
      // Extract call ID from resource path
      const resourceParts = notification.resource.split('/');
      const callIndex = resourceParts.indexOf('calls');
      if (callIndex === -1 || callIndex + 1 >= resourceParts.length) {
        logger.warn('Invalid transcription resource path', { resource: notification.resource });
        return;
      }
      const callId = resourceParts[callIndex + 1];

      // Extract transcription data from notification
      const transcriptionData = notification.resourceData;

      if (!transcriptionData || !transcriptionData.transcript) {
        logger.warn('No transcript data in notification', { callId });
        return;
      }

      // Format transcript segment
      const segment: TranscriptSegment = {
        text: transcriptionData.transcript,
        speaker: transcriptionData.speakerId || transcriptionData.speaker,
        startTime: transcriptionData.startDateTime
          ? new Date(transcriptionData.startDateTime).getTime()
          : Date.now(),
        endTime: transcriptionData.endDateTime
          ? new Date(transcriptionData.endDateTime).getTime()
          : Date.now(),
        confidence: transcriptionData.confidence || 1.0,
        language: transcriptionData.language || 'en-US',
      };

      // Push to Redis for the waiting getRealtimeTranscription method
      const transcriptChannel = `teams:transcription:${callId}`;
      await this.redis.rpush(transcriptChannel, JSON.stringify(segment));

      // Set expiry on the channel (1 hour)
      await this.redis.expire(transcriptChannel, 3600);

      logger.info('Pushed transcription segment to Redis', {
        callId,
        speaker: segment.speaker,
        textLength: segment.text.length,
        channel: transcriptChannel
      });

      // Also emit event for other listeners
      this.emit('transcription:segment', {
        callId,
        segment,
        organizationId: notification.clientState
      });
    } catch (error) {
      logger.error('Failed to handle transcription segment', {
        error,
        notification
      });
    }
  }

  /**
   * Handle call record created
   */
  private async handleCallRecordCreated(notification: any): Promise<void> {
    try {
      const callRecordId = notification.resourceData.id;

      // Get call record details
      const callRecord = await this.getCallRecord(callRecordId);

      // Try to find related integration/organization
      const integration = await prisma.integration.findFirst({
        where: {
          type: 'teams',
          isActive: true,
        },
      });

      if (!integration) {
        logger.warn('No active Teams integration found for call record');
        return;
      }

      // Save to database
      await prisma.meeting.create({
        data: {
          organization: { connect: { id: integration.organizationId } },
          user: { connect: { id: integration.userId } },
          externalId: callRecord.id,
          platform: 'teams',
          title: `Teams Call ${callRecord.id}`,
          actualStartAt: new Date(callRecord.startDateTime),
          actualEndAt: new Date(callRecord.endDateTime),
          status: 'completed',
          metadata: callRecord,
        },
      });

      // Queue processing
      await this.queueService.addJob(JobType.FILE_PROCESSING, {
        type: JobType.FILE_PROCESSING,
        payload: {
          platform: 'teams',
          callRecordId,
        },
        meetingId: callRecord.id,
      });

      this.emit('call:completed', {
        platform: 'teams',
        callRecordId,
      });
    } catch (error) {
      logger.error('Failed to handle call record created:', error);
      throw error;
    }
  }

  /**
   * Handle call record updated
   */
  private async handleCallRecordUpdated(notification: any): Promise<void> {
    const callRecordId = notification.resourceData.id;
    
    // Get updated call record
    const callRecord = await this.getCallRecord(callRecordId);

    // Update database
    await prisma.meeting.updateMany({
      where: {
        externalId: callRecord.id,
        platform: 'teams',
      },
      data: {
        metadata: callRecord as any,
      },
    });

    this.emit('call:updated', {
      platform: 'teams',
      callRecordId,
    });
  }

  /**
   * Subscribe to change notifications
   */
  async subscribeToChangeNotifications(
    webhookUrl: string,
    resource: string = '/communications/callRecords',
    expirationMinutes: number = 4230
  ): Promise<void> {
    const subscription = await this.graphClient
      .api('/subscriptions')
      .post({
        changeType: 'created,updated',
        notificationUrl: webhookUrl,
        resource,
        expirationDateTime: new Date(
          Date.now() + expirationMinutes * 60 * 1000
        ).toISOString(),
        clientState: crypto.randomBytes(16).toString('hex'),
      });

    logger.info(`Created Teams subscription: ${subscription.id}`);
    
    // Save subscription info
    await this.cacheService.set(
      'teams',
      `subscription_${subscription.id}`,
      subscription,
      expirationMinutes * 60
    );
  }

  /**
   * Get meeting attendance report
   */
  async getMeetingAttendanceReport(meetingId: string): Promise<any> {
    const report = await this.graphClient
      .api(`/me/onlineMeetings/${meetingId}/attendanceReports`)
      .get();
    
    return report.value;
  }

  /**
   * Search meetings
   */
  async searchMeetings(query: string): Promise<TeamsMeeting[]> {
    const meetings = await this.graphClient
      .api('/me/events')
      .filter(`contains(subject,'${query}') and isOnlineMeeting eq true`)
      .get();

    return meetings.value;
  }

  /**
   * Get real-time transcription for meeting
   * REAL implementation using Microsoft Graph Communications API with Redis pub/sub
   */
  async *getRealtimeTranscription(
    callId: string,
    organizationId: string
  ): AsyncIterable<TranscriptSegment> {
    try {
      // Create webhook subscription for transcription events
      const webhookUrl = `${process.env.API_URL}/webhooks/teams/transcription`;
      const subscription = await this.graphClient
        .api(`/communications/calls/${callId}/subscriptions`)
        .post({
          changeType: 'created',
          notificationUrl: webhookUrl,
          resource: `/communications/calls/${callId}/transcription`,
          expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          clientState: organizationId,
        });

      logger.info('Subscribed to Teams transcription via webhook', {
        callId,
        subscriptionId: subscription.id,
        webhookUrl
      });

      // Start transcription for the call
      await this.startLiveTranscription(callId);

      // Create Redis channel for this call's transcription segments
      const transcriptChannel = `teams:transcription:${callId}`;

      // Set up timeout tracking
      let lastSegmentTime = Date.now();
      const TIMEOUT_MS = 30000; // 30 seconds timeout

      // Yield transcript segments as they arrive via Redis pub/sub
      while (true) {
        try {
          // Use blpop with timeout to wait for segments
          const segment = await this.redis.blpop(transcriptChannel, 30);

          if (segment) {
            lastSegmentTime = Date.now();

            // Parse and yield the transcript segment
            const transcriptSegment: TranscriptSegment = JSON.parse(segment[1]);
            yield transcriptSegment;

            logger.debug('Yielded transcript segment', {
              callId,
              speaker: transcriptSegment.speaker,
              textLength: transcriptSegment.text.length
            });
          } else {
            // No segment received within timeout
            const timeSinceLastSegment = Date.now() - lastSegmentTime;

            if (timeSinceLastSegment > TIMEOUT_MS) {
              // Check if call is still active
              try {
                const call = await this.graphClient
                  .api(`/communications/calls/${callId}`)
                  .get();

                if (call.state === 'terminated' || call.state === 'terminating') {
                  logger.info('Call terminated, ending transcription stream', { callId });
                  break;
                }
              } catch (callError) {
                if ((callError as any).statusCode === 404) {
                  logger.info('Call no longer exists, ending transcription stream', { callId });
                  break;
                }
                logger.warn('Failed to check call status', { callId, error: callError });
              }
            }
          }
        } catch (error) {
          logger.error('Error processing transcript segment', {
            callId,
            error
          });

          // Check if this is a recoverable error
          if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ETIMEDOUT') {
            // Redis connection issue, try to reconnect
            logger.warn('Redis connection issue, attempting to continue', { callId });
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // Non-recoverable error, re-throw
          throw error;
        }
      }

      // Clean up subscription
      try {
        await this.graphClient
          .api(`/subscriptions/${subscription.id}`)
          .delete();
        logger.info('Cleaned up transcription subscription', {
          callId,
          subscriptionId: subscription.id
        });
      } catch (cleanupError) {
        logger.warn('Failed to clean up subscription', {
          subscriptionId: subscription.id,
          error: cleanupError
        });
      }

      // Stop transcription if still active
      try {
        await this.stopLiveTranscription(callId);
      } catch (stopError) {
        logger.warn('Failed to stop transcription', { callId, error: stopError });
      }
    } catch (error) {
      logger.error('Failed to get real-time transcription', {
        callId,
        organizationId,
        error
      });
      throw error;
    }
  }

  /**
   * Start live transcription for meeting
   */
  async startLiveTranscription(
    callId: string,
    locale: string = 'en-US'
  ): Promise<void> {
    try {
      await this.graphClient
        .api(`/communications/calls/${callId}/startTranscription`)
        .post({
          locale,
        });

      logger.info(`Started live transcription for call ${callId} with locale ${locale}`);
    } catch (error) {
      logger.error('Failed to start live transcription:', error);
      throw error;
    }
  }

  /**
   * Stop live transcription for meeting
   */
  async stopLiveTranscription(callId: string): Promise<void> {
    try {
      await this.graphClient
        .api(`/communications/calls/${callId}/stopTranscription`)
        .post({});

      logger.info(`Stopped live transcription for call ${callId}`);
    } catch (error) {
      logger.error('Failed to stop live transcription:', error);
      throw error;
    }
  }

  /**
   * Get transcription metadata for call
   */
  async getTranscriptionMetadata(callId: string): Promise<any> {
    try {
      const metadata = await this.graphClient
        .api(`/communications/calls/${callId}/transcription`)
        .get();

      return metadata;
    } catch (error) {
      logger.error('Failed to get transcription metadata:', error);
      throw error;
    }
  }

  /**
   * Validate webhook endpoint for Microsoft Graph subscriptions
   * Microsoft requires webhook validation before accepting subscriptions
   */
  async validateWebhook(validationToken: string): Promise<string> {
    // Microsoft Graph sends a validation token that must be returned
    // in plain text with status 200 to validate the webhook endpoint
    logger.info('Validating Teams webhook endpoint', {
      tokenLength: validationToken.length
    });

    return validationToken;
  }

  /**
   * Process transcription webhook from Microsoft Graph
   * This is called when transcription segments arrive via webhook
   */
  async processTranscriptionWebhook(body: any, headers: any): Promise<void> {
    try {
      // Validate the webhook signature if provided
      if (headers['x-microsoft-signature']) {
        // Validate signature using client secret
        const isValid = this.validateWebhookSignature(
          headers['x-microsoft-signature'],
          body
        );

        if (!isValid) {
          logger.warn('Invalid webhook signature received');
          throw new Error('Invalid webhook signature');
        }
      }

      // Process each notification in the batch
      const notifications = body.value || [];

      for (const notification of notifications) {
        await this.processChangeNotification(notification);
      }

      logger.info('Processed transcription webhook', {
        notificationCount: notifications.length
      });
    } catch (error) {
      logger.error('Failed to process transcription webhook', { error });
      throw error;
    }
  }

  /**
   * Validate webhook signature from Microsoft
   */
  private validateWebhookSignature(signature: string, body: any): boolean {
    try {
      // Create HMAC using client secret as key
      const hmac = crypto.createHmac('sha256', this.config.clientSecret);
      hmac.update(JSON.stringify(body));
      const computedSignature = hmac.digest('base64');

      // Compare signatures
      return signature === computedSignature;
    } catch (error) {
      logger.error('Failed to validate webhook signature', { error });
      return false;
    }
  }

  /**
   * Disconnect Teams integration
   */
  async disconnect(userId: string, organizationId: string): Promise<void> {
    try {
      // Update database
      await prisma.integration.updateMany({
        where: {
          userId,
          organizationId,
          type: 'teams',
        },
        data: { isActive: false },
      });

      logger.info(`Teams integration disconnected for user ${userId}`);

      this.emit('account:disconnected', {
        userId,
        organizationId,
        platform: 'teams',
      });
    } catch (error) {
      logger.error('Failed to disconnect Teams integration:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources (Redis connections, active bots, etc.)
   */
  async cleanup(): Promise<void> {
    try {
      // Disconnect all active bots
      for (const [meetingId, bot] of this.activeBots.entries()) {
        try {
          await bot.disconnect();
        } catch (error) {
          logger.warn('Failed to disconnect bot during cleanup', {
            meetingId,
            botId: bot.botId,
            error
          });
        }
      }
      this.activeBots.clear();

      // Close Redis subscriber connection
      if (this.redisSubscriber) {
        await this.redisSubscriber.quit();
      }

      logger.info('Teams integration cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup Teams integration', { error });
      throw error;
    }
  }
}

/**
 * Teams Bot Handler
 */
class TeamsBot extends EventEmitter {
  public botId: string;
  private meetingUrl: string;
  private config: TeamsConfig;
  private recordingService: RecordingService;
  private queueService: QueueService;
  private isConnected: boolean = false;
  private recordingId?: string;

  constructor(
    botId: string,
    meetingUrl: string,
    config: TeamsConfig,
    recordingService: RecordingService,
    queueService: QueueService
  ) {
    super();
    this.botId = botId;
    this.meetingUrl = meetingUrl;
    this.config = config;
    this.recordingService = recordingService;
    this.queueService = queueService;
  }

  async connect(): Promise<void> {
    try {
      // Parse meeting ID from URL
      const meetingId = this.extractMeetingId(this.meetingUrl);

      // Join the meeting using Microsoft Graph Communications API
      const graphClient = await this.getGraphClient();

      // Create a call to join the meeting
      const callRequest = {
        '@odata.type': '#microsoft.graph.call',
        callbackUri: `${process.env.API_URL}/webhooks/teams/bot/${this.botId}`,
        requestedModalities: ['audio', 'video', 'videoBasedScreenSharing'],
        mediaConfig: {
          '@odata.type': '#microsoft.graph.serviceHostedMediaConfig',
          preFetchMedia: []
        },
        chatInfo: {
          '@odata.type': '#microsoft.graph.chatInfo',
          threadId: meetingId,
          messageId: '0'
        },
        meetingInfo: {
          '@odata.type': '#microsoft.graph.organizerMeetingInfo',
          organizer: {
            '@odata.type': '#microsoft.graph.identitySet',
            application: {
              '@odata.type': '#microsoft.graph.identity',
              displayName: 'ExAI Guard Bot',
              id: this.config.botId
            }
          },
          allowConversationWithoutHost: true
        },
        tenantId: this.config.tenantId,
        subject: `Bot joining meeting ${meetingId}`
      };

      // For meetings with join URL, use joinMeetingIdSettings
      if (this.meetingUrl.includes('teams.microsoft.com')) {
        const joinInfo = this.parseTeamsJoinUrl(this.meetingUrl);
        if (joinInfo) {
          callRequest.chatInfo = {
            '@odata.type': '#microsoft.graph.chatInfo',
            threadId: joinInfo.threadId,
            messageId: joinInfo.messageId || '0'
          };

          if (joinInfo.meetingId) {
            callRequest.meetingInfo = {
              '@odata.type': '#microsoft.graph.joinMeetingIdMeetingInfo',
              joinMeetingId: joinInfo.meetingId,
              passcode: joinInfo.passcode
            } as any;
          }
        }
      }

      // Create the call (join the meeting)
      const call = await graphClient
        .api('/communications/calls')
        .post(callRequest);

      logger.info('Bot joined Teams meeting', {
        botId: this.botId,
        callId: call.id,
        meetingId
      });

      this.isConnected = true;

      // Start recording
      this.recordingId = await this.recordingService.startRecording({
        meetingId,
        organizationId: 'teams',
        userId: this.botId,
        autoTranscribe: true,
        metadata: {
          callId: call.id,
          botId: this.botId,
          joinTime: new Date().toISOString()
        }
      });

      // Enable transcription for the bot's call
      await graphClient
        .api(`/communications/calls/${call.id}/unmute`)
        .post({});

      this.emit('connected');
      this.emit('recording:started');

      // Store call ID for later use
      (this as any).callId = call.id;
    } catch (error) {
      logger.error('Failed to connect bot to Teams meeting', {
        botId: this.botId,
        meetingUrl: this.meetingUrl,
        error
      });
      throw error;
    }
  }

  /**
   * Parse Teams join URL to extract meeting information
   */
  private parseTeamsJoinUrl(url: string): {
    threadId?: string;
    messageId?: string;
    meetingId?: string;
    passcode?: string;
  } | null {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      // Extract from URL patterns
      // Pattern 1: meetup-join/{threadId}/{messageId}
      const meetupMatch = url.match(/meetup-join\/([^/]+)\/([^/?]+)/);
      if (meetupMatch) {
        return {
          threadId: decodeURIComponent(meetupMatch[1]),
          messageId: decodeURIComponent(meetupMatch[2])
        };
      }

      // Pattern 2: URL parameters
      return {
        threadId: params.get('threadId') || undefined,
        messageId: params.get('messageId') || undefined,
        meetingId: params.get('meetingId') || undefined,
        passcode: params.get('passcode') || undefined
      };
    } catch (error) {
      logger.warn('Failed to parse Teams join URL', { url, error });
      return null;
    }
  }

  /**
   * Get Graph client for bot operations
   */
  private async getGraphClient(): Promise<Client> {
    // Use bot credentials for authentication
    const credential = new ClientSecretCredential(
      this.config.tenantId,
      this.config.botId || this.config.clientId,
      this.config.botPassword || this.config.clientSecret
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default']
    });

    return Client.initWithMiddleware({ authProvider });
  }

  async disconnect(): Promise<void> {
    try {
      // Get the call ID if stored
      const callId = (this as any).callId;

      if (callId) {
        // Leave the meeting by deleting the call
        const graphClient = await this.getGraphClient();

        try {
          await graphClient
            .api(`/communications/calls/${callId}`)
            .delete();

          logger.info('Bot left Teams meeting', {
            botId: this.botId,
            callId
          });
        } catch (error) {
          logger.warn('Error leaving Teams meeting (call may have already ended)', {
            botId: this.botId,
            callId,
            error
          });
        }
      }

      // Stop recording if active
      if (this.recordingId) {
        const meetingId = this.extractMeetingId(this.meetingUrl);
        await this.recordingService.stopRecording(meetingId);
      }

      this.isConnected = false;
      this.emit('disconnected');
    } catch (error) {
      logger.error('Failed to disconnect bot from Teams meeting', {
        botId: this.botId,
        error
      });
      throw error;
    }
  }

  private extractMeetingId(url: string): string {
    // Extract meeting ID from Teams URL
    const match = url.match(/meetup-join\/([^/]+)/);
    return match ? match[1] : `teams_${Date.now()}`;
  }
}

// ============================================================================
// Factory function for creating TeamsIntegration instance
// ============================================================================

export function createTeamsIntegration(
  recordingService: RecordingService,
  queueService: QueueService,
  cacheService: CacheService
): TeamsIntegration {
  const config: TeamsConfig = {
    tenantId: process.env.AZURE_TENANT_ID!,
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    redirectUri: process.env.TEAMS_REDIRECT_URI || `${process.env.API_URL}/api/integrations/teams/callback`,
    botId: process.env.TEAMS_BOT_ID,
    botPassword: process.env.TEAMS_BOT_PASSWORD,
  };

  return new TeamsIntegration(config, recordingService, queueService, cacheService);
}
