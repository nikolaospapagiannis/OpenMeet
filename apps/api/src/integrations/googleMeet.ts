/**
 * Google Meet Integration Service
 * REAL implementation using Google Calendar API v3 and Google Meet REST API v2
 *
 * Required OAuth Scopes:
 * - https://www.googleapis.com/auth/calendar
 * - https://www.googleapis.com/auth/calendar.events
 * - https://www.googleapis.com/auth/drive.readonly
 * - https://www.googleapis.com/auth/meetings.space.readonly
 * - https://www.googleapis.com/auth/meetings.space.created
 */

import { EventEmitter } from 'events';
import * as winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { google, calendar_v3, drive_v3, oauth2_v2, Auth } from 'googleapis';
import { Credentials } from 'google-auth-library';
import { RecordingService, RecordingOptions } from '../services/recording';
import { QueueService, JobType } from '../services/queue';
import { CacheService } from '../services/cache';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'google-meet-integration' },
  transports: [new winston.transports.Console()],
});

// Lazy initialization of Prisma client to allow mocking in tests
let prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// Configuration interface
export interface GoogleMeetConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiKey?: string;
  serviceAccountKey?: {
    client_email: string;
    private_key: string;
    project_id: string;
  };
}

// OAuth token response
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

// Google Calendar Event interface (with Meet conference data)
export interface GoogleMeetEvent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  organizer: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  endTimeUnspecified?: boolean;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  transparency?: string;
  visibility?: string;
  iCalUID: string;
  sequence?: number;
  attendees?: Array<{
    email: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    responseStatus: string;
    comment?: string;
    additionalGuests?: number;
  }>;
  attendeesOmitted?: boolean;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
      status?: {
        statusCode: string;
      };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }>;
    conferenceSolution?: {
      key: {
        type: string;
      };
      name: string;
      iconUri: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  };
  gadget?: any;
  anyoneCanAddSelf?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  privateCopy?: boolean;
  locked?: boolean;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  source?: {
    url: string;
    title: string;
  };
  attachments?: Array<{
    fileUrl: string;
    title: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }>;
  eventType?: string;
  [key: string]: any;
}

// Google Meet Recording from Drive
export interface GoogleMeetRecording {
  id: string;
  name: string;
  driveId?: string;
  mimeType: string;
  webContentLink?: string;
  webViewLink?: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  md5Checksum?: string;
}

// Meet API v2 types (for direct REST API calls)
export interface MeetSpace {
  name: string;
  meetingUri?: string;
  meetingCode?: string;
  config?: {
    accessType?: 'ACCESS_TYPE_UNSPECIFIED' | 'OPEN' | 'TRUSTED' | 'RESTRICTED';
    entryPointAccess?: 'ENTRY_POINT_ACCESS_UNSPECIFIED' | 'ALL' | 'CREATOR_APP_ONLY';
  };
  activeConference?: {
    conferenceRecord?: string;
  };
}

export interface MeetRecording {
  name: string;
  state?: 'STATE_UNSPECIFIED' | 'STARTED' | 'ENDED' | 'FILE_GENERATED';
  startTime?: string;
  endTime?: string;
  driveDestination?: {
    file?: string;
    exportUri?: string;
  };
}

export interface MeetTranscript {
  name: string;
  state?: 'STATE_UNSPECIFIED' | 'STARTED' | 'ENDED' | 'FILE_GENERATED';
  startTime?: string;
  endTime?: string;
  docsDestination?: {
    document?: string;
    exportUri?: string;
  };
}

export interface MeetTranscriptEntry {
  name: string;
  participant?: string;
  text?: string;
  languageCode?: string;
  startTime?: string;
  endTime?: string;
}

export interface MeetParticipant {
  name: string;
  earliestStartTime?: string;
  latestEndTime?: string;
  signedinUser?: {
    user?: string;
    displayName?: string;
  };
  anonymousUser?: {
    displayName?: string;
  };
  phoneUser?: {
    displayName?: string;
  };
}

export interface MeetConferenceRecord {
  name: string;
  startTime?: string;
  endTime?: string;
  expireTime?: string;
  space?: string;
}

// Create meeting options
export interface CreateMeetingOptions {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
  timeZone?: string;
  attendees?: string[];
  sendInvitations?: boolean;
  reminders?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  recurrence?: string[];
  accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
}

// User info from OAuth2
export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

// Google Meet REST API v2 base URL
const MEET_API_BASE = 'https://meet.googleapis.com/v2';

/**
 * Google Meet Integration - REAL Implementation
 * Uses actual Google APIs for all operations
 */
export class GoogleMeetIntegration extends EventEmitter {
  private config: GoogleMeetConfig;
  private oauth2Client: Auth.OAuth2Client;
  private calendar: calendar_v3.Calendar;
  private drive: drive_v3.Drive;
  private oauth2Api: oauth2_v2.Oauth2;
  private meetApiClient: AxiosInstance;
  private recordingService: RecordingService;
  private queueService: QueueService;
  private cacheService: CacheService;
  private activeBots: Map<string, GoogleMeetBot>;

  // OAuth scopes required for full functionality
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/meetings.space.readonly',
    'https://www.googleapis.com/auth/meetings.space.created',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  constructor(
    config: GoogleMeetConfig,
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

    // Initialize OAuth2 client with REAL Google credentials
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    // Initialize Google Calendar API v3
    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client as any,
    });

    // Initialize Google Drive API v3
    this.drive = google.drive({
      version: 'v3',
      auth: this.oauth2Client as any,
    });

    // Initialize OAuth2 API for user info
    this.oauth2Api = google.oauth2({
      version: 'v2',
      auth: this.oauth2Client as any,
    });

    // Initialize Meet REST API client (Google Meet API v2 is accessed via REST)
    this.meetApiClient = axios.create({
      baseURL: MEET_API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Set up token refresh handler
    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        logger.info('New refresh token received');
        this.emit('tokens:refreshed', tokens);
      }
    });

    logger.info('GoogleMeetIntegration initialized with REAL Google APIs');
  }

  /**
   * Get authorization header for Meet API calls
   */
  private async getAuthHeader(): Promise<{ Authorization: string }> {
    const { token } = await this.oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Generate OAuth2 authorization URL
   * REAL: Uses actual Google OAuth2 endpoint
   */
  generateAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GoogleMeetIntegration.SCOPES,
      state,
      prompt: 'consent',
      include_granted_scopes: true,
    });
  }

  /**
   * Get authorization URL (alias)
   */
  getAuthorizationUrl(state: string): string {
    return this.generateAuthUrl(state);
  }

  /**
   * Exchange authorization code for tokens
   * REAL: Calls Google OAuth2 token endpoint
   */
  async getTokens(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Exchange code for token (alias with formatted response)
   */
  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const tokens = await this.getTokens(code);

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || undefined,
      expires_in: tokens.expiry_date
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
        : 3600,
      scope: tokens.scope!,
      token_type: tokens.token_type || 'Bearer',
      id_token: tokens.id_token || undefined,
    };
  }

  /**
   * Set credentials on the OAuth2 client
   * REAL: Configures the client for authenticated requests
   */
  setCredentials(tokens: Credentials): void {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Refresh access token
   * REAL: Calls Google OAuth2 refresh endpoint
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || refreshToken,
      expires_in: credentials.expiry_date
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : 3600,
      scope: credentials.scope!,
      token_type: credentials.token_type || 'Bearer',
    };
  }

  /**
   * Get user info from OAuth2
   * REAL: Calls Google OAuth2 userinfo endpoint
   */
  async getUserInfo(): Promise<GoogleUserInfo> {
    const response = await this.oauth2Api.userinfo.get();
    return response.data as GoogleUserInfo;
  }

  /**
   * Connect Google account and save to database
   * REAL: Uses actual Google APIs and Prisma database
   */
  async connectAccount(
    userId: string,
    organizationId: string,
    authCode: string
  ): Promise<void> {
    try {
      const tokens = await this.exchangeCodeForToken(authCode);
      const userInfo = await this.getUserInfo();

      // Save integration to Prisma database
      await getPrisma().integration.create({
        data: {
          user: { connect: { id: userId } },
          organization: { connect: { id: organizationId } },
          type: 'google_meet',
          name: `Google Meet - ${userInfo.email}`,
          isActive: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          metadata: {
            googleUserId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            verified: userInfo.verified_email,
          },
        },
      });

      logger.info(`Google Meet account connected for user ${userId}`, {
        email: userInfo.email,
      });

      this.emit('account:connected', {
        userId,
        organizationId,
        platform: 'google_meet',
        email: userInfo.email,
      });
    } catch (error) {
      logger.error('Failed to connect Google Meet account:', error);
      throw error;
    }
  }

  /**
   * Disconnect Google account
   * REAL: Revokes token and removes from database
   */
  async disconnectAccount(integrationId: string): Promise<void> {
    try {
      const integration = await getPrisma().integration.findUnique({
        where: { id: integrationId },
      });

      if (integration?.accessToken) {
        // Revoke the token with Google
        await this.oauth2Client.revokeToken(integration.accessToken);
      }

      // Delete from database
      await getPrisma().integration.delete({
        where: { id: integrationId },
      });

      logger.info(`Google Meet account disconnected: ${integrationId}`);

      this.emit('account:disconnected', {
        integrationId,
        platform: 'google_meet',
      });
    } catch (error) {
      logger.error('Failed to disconnect Google Meet account:', error);
      throw error;
    }
  }

  // ==========================================
  // CALENDAR API METHODS (REAL)
  // ==========================================

  /**
   * Create a meeting with Google Meet conference
   * REAL: Calls Google Calendar API to create event with Meet link
   */
  async createMeeting(options: CreateMeetingOptions): Promise<GoogleMeetEvent>;
  async createMeeting(
    summary: string,
    startTime: Date,
    endTime: Date,
    attendees?: string[],
    description?: string,
    organizationId?: string,
    userId?: string
  ): Promise<GoogleMeetEvent>;
  async createMeeting(
    summaryOrOptions: string | CreateMeetingOptions,
    startTime?: Date,
    endTime?: Date,
    attendees?: string[],
    description?: string,
    organizationId?: string,
    userId?: string
  ): Promise<GoogleMeetEvent> {
    try {
      let options: CreateMeetingOptions;

      if (typeof summaryOrOptions === 'string') {
        options = {
          title: summaryOrOptions,
          startTime: startTime!,
          endTime: endTime!,
          attendees,
          description,
        };
      } else {
        options = summaryOrOptions;
      }

      const startDateTime = typeof options.startTime === 'string'
        ? options.startTime
        : options.startTime.toISOString();
      const endDateTime = typeof options.endTime === 'string'
        ? options.endTime
        : options.endTime.toISOString();

      const event: calendar_v3.Schema$Event = {
        summary: options.title,
        description: options.description,
        start: {
          dateTime: startDateTime,
          timeZone: options.timeZone || 'UTC',
        },
        end: {
          dateTime: endDateTime,
          timeZone: options.timeZone || 'UTC',
        },
        attendees: options.attendees?.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        reminders: options.reminders ? {
          useDefault: false,
          overrides: options.reminders,
        } : {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
        recurrence: options.recurrence,
      };

      // REAL API call to Google Calendar
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: options.sendInvitations ? 'all' : 'none',
      });

      const createdEvent = response.data as GoogleMeetEvent;

      // Save to database if organizationId and userId provided
      if (organizationId && userId) {
        await getPrisma().meeting.create({
          data: {
            organization: { connect: { id: organizationId } },
            user: { connect: { id: userId } },
            externalId: createdEvent.id,
            platform: 'google_meet',
            title: options.title,
            description: options.description,
            scheduledStartAt: new Date(startDateTime),
            scheduledEndAt: new Date(endDateTime),
            meetingUrl: createdEvent.hangoutLink ||
              createdEvent.conferenceData?.entryPoints?.[0]?.uri,
            metadata: createdEvent as any,
          },
        });
      }

      logger.info(`Created Google Meet meeting: ${createdEvent.id}`, {
        meetingCode: createdEvent.conferenceData?.conferenceId,
        hangoutLink: createdEvent.hangoutLink,
      });

      return createdEvent;
    } catch (error) {
      logger.error('Failed to create Google Meet meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting details from Calendar
   * REAL: Calls Google Calendar API
   */
  async getMeeting(eventId: string, calendarId: string = 'primary'): Promise<GoogleMeetEvent> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      return response.data as GoogleMeetEvent;
    } catch (error) {
      logger.error(`Failed to get meeting ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Update meeting
   * REAL: Calls Google Calendar API
   */
  async updateMeeting(
    eventId: string,
    updates: Partial<calendar_v3.Schema$Event>,
    calendarId: string = 'primary',
    sendUpdates: 'all' | 'externalOnly' | 'none' = 'none'
  ): Promise<GoogleMeetEvent> {
    try {
      const response = await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: updates,
        conferenceDataVersion: 1,
        sendUpdates,
      });

      logger.info(`Updated Google Meet meeting: ${eventId}`);
      return response.data as GoogleMeetEvent;
    } catch (error) {
      logger.error(`Failed to update meeting ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Delete meeting
   * REAL: Calls Google Calendar API
   */
  async deleteMeeting(
    eventId: string,
    calendarId: string = 'primary',
    sendUpdates: 'all' | 'externalOnly' | 'none' = 'all'
  ): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates,
      });

      // Update database
      await getPrisma().meeting.updateMany({
        where: {
          externalId: eventId,
          platform: 'google_meet',
        },
        data: {
          status: 'cancelled',
        },
      });

      logger.info(`Deleted Google Meet meeting: ${eventId}`);
    } catch (error) {
      logger.error(`Failed to delete meeting ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * List calendar events with Google Meet
   * REAL: Calls Google Calendar API
   */
  async listMeetings(
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 10,
    calendarId: string = 'primary'
  ): Promise<GoogleMeetEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      // Filter for events with Google Meet
      const events = (response.data.items || []).filter(
        event => event.hangoutLink || event.conferenceData?.conferenceSolution?.key?.type === 'hangoutsMeet'
      );

      return events as GoogleMeetEvent[];
    } catch (error) {
      logger.error('Failed to list meetings:', error);
      throw error;
    }
  }

  /**
   * List all calendar events (not just Meet)
   * REAL: Calls Google Calendar API
   */
  async listCalendarEvents(
    calendarId: string = 'primary',
    options?: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      pageToken?: string;
      q?: string;
    }
  ): Promise<{
    events: calendar_v3.Schema$Event[];
    nextPageToken?: string;
  }> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: options?.timeMin?.toISOString() || new Date().toISOString(),
        timeMax: options?.timeMax?.toISOString(),
        maxResults: options?.maxResults || 250,
        singleEvents: true,
        orderBy: 'startTime',
        pageToken: options?.pageToken,
        q: options?.q,
      });

      return {
        events: response.data.items || [],
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      logger.error('Failed to list calendar events:', error);
      throw error;
    }
  }

  // ==========================================
  // MEET API v2 METHODS (REAL - via REST)
  // ==========================================

  /**
   * Create a new Meet space
   * REAL: Calls Google Meet REST API v2
   */
  async createMeetSpace(config?: {
    accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
    entryPointAccess?: 'ALL' | 'CREATOR_APP_ONLY';
  }): Promise<MeetSpace> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.post<MeetSpace>(
        '/spaces',
        {
          config: config ? {
            accessType: config.accessType,
            entryPointAccess: config.entryPointAccess,
          } : undefined,
        },
        { headers }
      );

      logger.info('Created Meet space', {
        name: response.data.name,
        meetingCode: response.data.meetingCode,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create Meet space:', error);
      throw error;
    }
  }

  /**
   * Get Meet space details
   * REAL: Calls Google Meet REST API v2
   */
  async getMeetSpace(spaceName: string): Promise<MeetSpace> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<MeetSpace>(
        `/${spaceName}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get Meet space ${spaceName}:`, error);
      throw error;
    }
  }

  /**
   * Update Meet space configuration
   * REAL: Calls Google Meet REST API v2
   */
  async updateMeetSpace(
    spaceName: string,
    config: {
      accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
      entryPointAccess?: 'ALL' | 'CREATOR_APP_ONLY';
    }
  ): Promise<MeetSpace> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.patch<MeetSpace>(
        `/${spaceName}`,
        {
          config: {
            accessType: config.accessType,
            entryPointAccess: config.entryPointAccess,
          },
        },
        {
          headers,
          params: {
            updateMask: 'config.accessType,config.entryPointAccess',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to update Meet space ${spaceName}:`, error);
      throw error;
    }
  }

  /**
   * End active conference in a Meet space
   * REAL: Calls Google Meet REST API v2
   */
  async endActiveConference(spaceName: string): Promise<void> {
    try {
      const headers = await this.getAuthHeader();

      await this.meetApiClient.post(
        `/${spaceName}:endActiveConference`,
        {},
        { headers }
      );

      logger.info(`Ended active conference in space: ${spaceName}`);
    } catch (error) {
      logger.error(`Failed to end active conference in ${spaceName}:`, error);
      throw error;
    }
  }

  /**
   * List conference records
   * REAL: Calls Google Meet REST API v2
   */
  async listConferenceRecords(options?: {
    filter?: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<{
    conferenceRecords: MeetConferenceRecord[];
    nextPageToken?: string;
  }> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<{
        conferenceRecords?: MeetConferenceRecord[];
        nextPageToken?: string;
      }>('/conferenceRecords', {
        headers,
        params: {
          filter: options?.filter,
          pageSize: options?.pageSize || 25,
          pageToken: options?.pageToken,
        },
      });

      return {
        conferenceRecords: response.data.conferenceRecords || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      logger.error('Failed to list conference records:', error);
      throw error;
    }
  }

  /**
   * Get conference record details
   * REAL: Calls Google Meet REST API v2
   */
  async getConferenceRecord(recordName: string): Promise<MeetConferenceRecord> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<MeetConferenceRecord>(
        `/${recordName}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get conference record ${recordName}:`, error);
      throw error;
    }
  }

  /**
   * List participants in a conference
   * REAL: Calls Google Meet REST API v2
   */
  async listParticipants(
    conferenceRecordName: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
      filter?: string;
    }
  ): Promise<{
    participants: MeetParticipant[];
    nextPageToken?: string;
  }> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<{
        participants?: MeetParticipant[];
        nextPageToken?: string;
      }>(`/${conferenceRecordName}/participants`, {
        headers,
        params: {
          pageSize: options?.pageSize || 100,
          pageToken: options?.pageToken,
          filter: options?.filter,
        },
      });

      return {
        participants: response.data.participants || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      logger.error(`Failed to list participants for ${conferenceRecordName}:`, error);
      throw error;
    }
  }

  /**
   * Get participant details
   * REAL: Calls Google Meet REST API v2
   */
  async getParticipant(participantName: string): Promise<MeetParticipant> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<MeetParticipant>(
        `/${participantName}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get participant ${participantName}:`, error);
      throw error;
    }
  }

  /**
   * List recordings for a conference
   * REAL: Calls Google Meet REST API v2
   */
  async listRecordings(
    conferenceRecordName: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<{
    recordings: MeetRecording[];
    nextPageToken?: string;
  }> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<{
        recordings?: MeetRecording[];
        nextPageToken?: string;
      }>(`/${conferenceRecordName}/recordings`, {
        headers,
        params: {
          pageSize: options?.pageSize || 25,
          pageToken: options?.pageToken,
        },
      });

      return {
        recordings: response.data.recordings || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      logger.error(`Failed to list recordings for ${conferenceRecordName}:`, error);
      throw error;
    }
  }

  /**
   * Get recording details
   * REAL: Calls Google Meet REST API v2
   */
  async getRecording(recordingName: string): Promise<MeetRecording> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<MeetRecording>(
        `/${recordingName}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get recording ${recordingName}:`, error);
      throw error;
    }
  }

  /**
   * List transcripts for a conference
   * REAL: Calls Google Meet REST API v2
   */
  async listTranscripts(
    conferenceRecordName: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<{
    transcripts: MeetTranscript[];
    nextPageToken?: string;
  }> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<{
        transcripts?: MeetTranscript[];
        nextPageToken?: string;
      }>(`/${conferenceRecordName}/transcripts`, {
        headers,
        params: {
          pageSize: options?.pageSize || 25,
          pageToken: options?.pageToken,
        },
      });

      return {
        transcripts: response.data.transcripts || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      logger.error(`Failed to list transcripts for ${conferenceRecordName}:`, error);
      throw error;
    }
  }

  /**
   * Get transcript details
   * REAL: Calls Google Meet REST API v2
   */
  async getTranscript(transcriptName: string): Promise<MeetTranscript> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<MeetTranscript>(
        `/${transcriptName}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get transcript ${transcriptName}:`, error);
      throw error;
    }
  }

  /**
   * List transcript entries
   * REAL: Calls Google Meet REST API v2
   */
  async listTranscriptEntries(
    transcriptName: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<{
    entries: MeetTranscriptEntry[];
    nextPageToken?: string;
  }> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<{
        transcriptEntries?: MeetTranscriptEntry[];
        nextPageToken?: string;
      }>(`/${transcriptName}/entries`, {
        headers,
        params: {
          pageSize: options?.pageSize || 250,
          pageToken: options?.pageToken,
        },
      });

      return {
        entries: response.data.transcriptEntries || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      logger.error(`Failed to list transcript entries for ${transcriptName}:`, error);
      throw error;
    }
  }

  /**
   * Get transcript entry details
   * REAL: Calls Google Meet REST API v2
   */
  async getTranscriptEntry(entryName: string): Promise<MeetTranscriptEntry> {
    try {
      const headers = await this.getAuthHeader();

      const response = await this.meetApiClient.get<MeetTranscriptEntry>(
        `/${entryName}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get transcript entry ${entryName}:`, error);
      throw error;
    }
  }

  // ==========================================
  // DRIVE API METHODS (REAL)
  // ==========================================

  /**
   * Get meeting recordings from Google Drive
   * REAL: Calls Google Drive API
   */
  async getMeetingRecordings(
    meetingTitle: string,
    date?: Date
  ): Promise<GoogleMeetRecording[]> {
    try {
      let query = `name contains '${meetingTitle}' and mimeType contains 'video'`;

      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        query += ` and createdTime >= '${dateStr}T00:00:00'`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, webContentLink, webViewLink, createdTime, modifiedTime, size, md5Checksum)',
        orderBy: 'createdTime desc',
        pageSize: 100,
      });

      return (response.data.files || []) as GoogleMeetRecording[];
    } catch (error) {
      logger.error('Failed to get meeting recordings:', error);
      throw error;
    }
  }

  /**
   * Download recording from Google Drive
   * REAL: Calls Google Drive API
   */
  async downloadRecording(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        {
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      logger.error(`Failed to download recording ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata from Drive
   * REAL: Calls Google Drive API
   */
  async getDriveFile(fileId: string): Promise<drive_v3.Schema$File> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, webContentLink, webViewLink, createdTime, modifiedTime, size, md5Checksum, parents',
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to get Drive file ${fileId}:`, error);
      throw error;
    }
  }

  // ==========================================
  // WEBHOOK METHODS (REAL)
  // ==========================================

  /**
   * Set up calendar watch for changes
   * REAL: Calls Google Calendar API
   */
  async watchCalendar(
    webhookUrl: string,
    calendarId: string = 'primary'
  ): Promise<calendar_v3.Schema$Channel> {
    try {
      const channelId = `watch_${Date.now()}_${crypto.randomUUID()}`;

      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          params: {
            ttl: '2592000', // 30 days
          },
        },
      });

      const channel = response.data;

      // Cache the watch info
      await this.cacheService.set(
        'google_watch',
        channelId,
        {
          channelId: channel.id,
          resourceId: channel.resourceId,
          resourceUri: channel.resourceUri,
          expiration: channel.expiration,
        },
        2592000
      );

      logger.info('Created Google Calendar watch', {
        channelId: channel.id,
        expiration: channel.expiration,
      });

      return channel;
    } catch (error) {
      logger.error('Failed to watch calendar:', error);
      throw error;
    }
  }

  /**
   * Stop calendar watch
   * REAL: Calls Google Calendar API
   */
  async stopCalendarWatch(
    channelId: string,
    resourceId: string
  ): Promise<void> {
    try {
      await this.calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId,
        },
      });

      await this.cacheService.delete('google_watch', channelId);

      logger.info('Stopped Google Calendar watch', { channelId });
    } catch (error) {
      logger.error('Failed to stop calendar watch:', error);
      throw error;
    }
  }

  /**
   * Process webhook notification
   * REAL: Handles actual Google webhook payloads
   */
  async processWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<void> {
    const channelId = headers['x-goog-channel-id'];
    const resourceState = headers['x-goog-resource-state'];
    const resourceId = headers['x-goog-resource-id'];
    const messageNumber = headers['x-goog-message-number'];

    logger.info('Processing Google webhook', {
      channelId,
      resourceState,
      resourceId,
      messageNumber,
    });

    switch (resourceState) {
      case 'exists':
        await this.handleEventChange(resourceId);
        break;

      case 'not_exists':
        await this.handleEventDeleted(resourceId);
        break;

      case 'sync':
        logger.info('Google Calendar sync message received');
        break;

      default:
        logger.debug(`Unhandled resource state: ${resourceState}`);
    }
  }

  private async handleEventChange(eventId: string): Promise<void> {
    try {
      const event = await this.getMeeting(eventId);

      await getPrisma().meeting.updateMany({
        where: {
          externalId: eventId,
          platform: 'google_meet',
        },
        data: {
          title: event.summary,
          scheduledStartAt: event.start.dateTime ? new Date(event.start.dateTime) : undefined,
          scheduledEndAt: event.end.dateTime ? new Date(event.end.dateTime) : undefined,
          meetingUrl: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
          metadata: event as any,
        },
      });

      this.emit('meeting:updated', {
        platform: 'google_meet',
        eventId,
        event,
      });
    } catch (error) {
      logger.error(`Failed to handle event change for ${eventId}:`, error);
    }
  }

  private async handleEventDeleted(eventId: string): Promise<void> {
    await getPrisma().meeting.updateMany({
      where: {
        externalId: eventId,
        platform: 'google_meet',
      },
      data: {
        status: 'cancelled',
      },
    });

    this.emit('meeting:cancelled', {
      platform: 'google_meet',
      eventId,
    });
  }

  // ==========================================
  // BOT METHODS
  // ==========================================

  /**
   * Join meeting with bot
   * Creates a recording bot for the meeting
   */
  async joinMeetingWithBot(
    meetingUrl: string,
    meetingId?: string
  ): Promise<string> {
    try {
      const botId = `bot_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;

      if (meetingId && this.activeBots.has(meetingId)) {
        throw new Error('Bot already active in this meeting');
      }

      const bot = new GoogleMeetBot(
        botId,
        meetingUrl,
        this.recordingService,
        this.queueService
      );

      await bot.connect();

      if (meetingId) {
        this.activeBots.set(meetingId, bot);
      }

      bot.on('connected', () => {
        logger.info(`Bot connected to Google Meet: ${meetingUrl}`);
        this.emit('bot:connected', { meetingUrl, botId });
      });

      bot.on('recording:started', () => {
        logger.info(`Bot started recording: ${meetingUrl}`);
        this.emit('bot:recording:started', { meetingUrl, botId });
      });

      bot.on('disconnected', () => {
        logger.info(`Bot disconnected from Google Meet: ${meetingUrl}`);
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
   * Get bot status
   */
  getBotStatus(meetingId: string): {
    active: boolean;
    botId?: string;
    isRecording?: boolean;
  } {
    const bot = this.activeBots.get(meetingId);

    if (!bot) {
      return { active: false };
    }

    return {
      active: true,
      botId: bot.botId,
      isRecording: bot.isRecording,
    };
  }

  // ==========================================
  // ATTENDEE METHODS
  // ==========================================

  /**
   * Get meeting attendance from calendar event
   */
  async getMeetingAttendance(eventId: string): Promise<Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional: boolean;
    organizer: boolean;
  }>> {
    const event = await this.getMeeting(eventId);

    return (event.attendees || []).map(attendee => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus,
      optional: attendee.optional || false,
      organizer: attendee.organizer || false,
    }));
  }

  /**
   * Add attendee to meeting
   * REAL: Calls Google Calendar API
   */
  async addAttendee(
    eventId: string,
    email: string,
    sendNotification: boolean = true
  ): Promise<void> {
    try {
      const event = await this.getMeeting(eventId);
      const attendees = event.attendees || [];

      if (attendees.some(a => a.email === email)) {
        logger.info(`Attendee ${email} already exists in meeting ${eventId}`);
        return;
      }

      attendees.push({
        email,
        responseStatus: 'needsAction',
      });

      await this.updateMeeting(
        eventId,
        { attendees },
        'primary',
        sendNotification ? 'all' : 'none'
      );

      logger.info(`Added attendee ${email} to meeting ${eventId}`);
    } catch (error) {
      logger.error(`Failed to add attendee to meeting ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Remove attendee from meeting
   * REAL: Calls Google Calendar API
   */
  async removeAttendee(
    eventId: string,
    email: string,
    sendNotification: boolean = true
  ): Promise<void> {
    try {
      const event = await this.getMeeting(eventId);
      const attendees = (event.attendees || []).filter(
        attendee => attendee.email !== email
      );

      await this.updateMeeting(
        eventId,
        { attendees },
        'primary',
        sendNotification ? 'all' : 'none'
      );

      logger.info(`Removed attendee ${email} from meeting ${eventId}`);
    } catch (error) {
      logger.error(`Failed to remove attendee from meeting ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Send meeting invitation/update
   * REAL: Triggers notification via Calendar API
   */
  async sendInvitation(
    eventId: string,
    emailMessage?: string
  ): Promise<void> {
    try {
      const updates: calendar_v3.Schema$Event = {};

      if (emailMessage) {
        updates.description = emailMessage;
      }

      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
        requestBody: updates,
      });

      logger.info(`Sent invitation for meeting ${eventId}`);
    } catch (error) {
      logger.error(`Failed to send invitation for meeting ${eventId}:`, error);
      throw error;
    }
  }
}

/**
 * Google Meet Bot Handler
 * Handles meeting recording via bot
 */
export class GoogleMeetBot extends EventEmitter {
  public botId: string;
  public isRecording: boolean = false;
  private meetingUrl: string;
  private recordingService: RecordingService;
  private queueService: QueueService;
  private isConnected: boolean = false;
  private recordingId?: string;

  constructor(
    botId: string,
    meetingUrl: string,
    recordingService: RecordingService,
    queueService: QueueService
  ) {
    super();
    this.botId = botId;
    this.meetingUrl = meetingUrl;
    this.recordingService = recordingService;
    this.queueService = queueService;
  }

  async connect(): Promise<void> {
    const meetingId = this.extractMeetingId(this.meetingUrl);

    // Queue the bot join job for processing
    await this.queueService.addJob(JobType.MEETING_BOT_JOIN, {
      type: JobType.MEETING_BOT_JOIN,
      payload: {
        botId: this.botId,
        meetingUrl: this.meetingUrl,
        meetingId,
        platform: 'google_meet',
      },
    });

    this.isConnected = true;

    // Start recording
    const options: RecordingOptions = {
      meetingId,
      organizationId: 'google_meet',
      userId: this.botId,
      autoTranscribe: true,
      videoQuality: 'high',
    };

    this.recordingId = await this.recordingService.startRecording(options);
    this.isRecording = true;

    this.emit('connected');
    this.emit('recording:started');
  }

  async disconnect(): Promise<void> {
    if (this.recordingId) {
      const meetingId = this.extractMeetingId(this.meetingUrl);
      await this.recordingService.stopRecording(meetingId);
      this.isRecording = false;
    }

    this.isConnected = false;
    this.emit('disconnected');
  }

  private extractMeetingId(url: string): string {
    // Extract meeting code from Google Meet URL
    // Format: https://meet.google.com/xxx-xxxx-xxx
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return match ? match[1] : `gmeet_${Date.now()}`;
  }
}
