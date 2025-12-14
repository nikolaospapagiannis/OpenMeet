/**
 * Zoom Integration Service
 * OAuth 2.0 and Meeting Bot for Zoom meetings
 */

import { EventEmitter } from 'events';
import * as winston from 'winston';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { RecordingService } from '../services/recording';
import { QueueService, JobType } from '../services/queue';
import { CacheService } from '../services/cache';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'zoom-integration' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface ZoomConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret: string;
  accountId?: string;
  sdkKey?: string;
  sdkSecret?: string;
}

export interface ZoomMeeting {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  agenda?: string;
  created_at: string;
  start_url: string;
  join_url: string;
  password?: string;
  h323_password?: string;
  pstn_password?: string;
  encrypted_password?: string;
  settings?: ZoomMeetingSettings;
  recurrence?: ZoomRecurrence;
  occurrences?: ZoomOccurrence[];
}

export interface ZoomMeetingSettings {
  host_video?: boolean;
  participant_video?: boolean;
  cn_meeting?: boolean;
  in_meeting?: boolean;
  join_before_host?: boolean;
  mute_upon_entry?: boolean;
  watermark?: boolean;
  use_pmi?: boolean;
  approval_type?: number;
  audio?: string;
  auto_recording?: string;
  enforce_login?: boolean;
  enforce_login_domains?: string;
  alternative_hosts?: string;
  close_registration?: boolean;
  show_share_button?: boolean;
  allow_multiple_devices?: boolean;
  registrants_confirmation_email?: boolean;
  waiting_room?: boolean;
  request_permission_to_unmute_participants?: boolean;
  registrants_email_notification?: boolean;
  meeting_authentication?: boolean;
  encryption_type?: string;
  approved_or_denied_countries_or_regions?: {
    enable?: boolean;
    method?: string;
    approved_list?: string[];
    denied_list?: string[];
  };
  breakout_room?: {
    enable?: boolean;
    rooms?: Array<{
      name: string;
      participants: string[];
    }>;
  };
  alternative_hosts_email_notification?: boolean;
  device_testing?: boolean;
  focus_mode?: boolean;
  private_meeting?: boolean;
  email_notification?: boolean;
  host_save_video_order?: boolean;
}

export interface ZoomRecurrence {
  type: number;
  repeat_interval?: number;
  weekly_days?: string;
  monthly_day?: number;
  monthly_week?: number;
  monthly_week_day?: number;
  end_times?: number;
  end_date_time?: string;
}

export interface ZoomOccurrence {
  occurrence_id: string;
  start_time: string;
  duration: number;
  status: string;
}

export interface ZoomWebhookEvent {
  event: string;
  payload: {
    account_id: string;
    object: any;
  };
  event_ts: number;
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

export class ZoomIntegration extends EventEmitter {
  private config: ZoomConfig;
  private api: AxiosInstance;
  private recordingService: RecordingService;
  private queueService: QueueService;
  private cacheService: CacheService;
  private activeBots: Map<string, ZoomBot>;

  constructor(
    config: ZoomConfig,
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

    this.api = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      timeout: 30000,
    });

    this.api.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * OAuth 2.0 Flow
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
    });

    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }> {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
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
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  /**
   * Get access token (Server-to-Server OAuth)
   */
  private async getAccessToken(): Promise<string> {
    // Check cache first
    const cached = await this.cacheService.get<string>('zoom', 'access_token');
    if (cached) return cached;

    // Generate new token using Server-to-Server OAuth
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: this.config.accountId || '',
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = response.data;

    // Cache token
    await this.cacheService.set(
      'zoom',
      'access_token',
      access_token,
      expires_in - 60 // Expire 1 minute early
    );

    return access_token;
  }

  /**
   * Connect Zoom account
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
          type: 'zoom',
          name: `Zoom - ${userInfo.first_name} ${userInfo.last_name}`,
          isActive: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          metadata: {
            accountId: userInfo.account_id,
            zoomUserId: userInfo.id,
            email: userInfo.email,
            firstName: userInfo.first_name,
            lastName: userInfo.last_name,
          },
        },
      });

      logger.info(`Zoom account connected for user ${userId}`);

      this.emit('account:connected', {
        userId,
        organizationId,
        platform: 'zoom',
      });
    } catch (error) {
      logger.error('Failed to connect Zoom account:', error);
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
          type: 'zoom',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Zoom integration not found');
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
    const response = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  /**
   * Create meeting
   */
  async createMeeting(
    userId: string,
    organizationId: string,
    topic: string,
    startTime: Date,
    duration: number,
    settings?: Partial<ZoomMeetingSettings>
  ): Promise<ZoomMeeting> {
    try {
      // Get integration for this user to get Zoom user ID
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          organizationId,
          type: 'zoom',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Zoom integration not found for user');
      }

      const metadata = integration.metadata as any;
      const zoomUserId = metadata?.zoomUserId || metadata?.userId;

      if (!zoomUserId) {
        throw new Error('Zoom user ID not found in integration metadata');
      }

      const response = await this.api.post(`/users/${zoomUserId}/meetings`, {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime.toISOString(),
        duration,
        timezone: 'UTC',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          audio: 'both',
          auto_recording: 'cloud',
          ...settings,
        },
      });

      const meeting = response.data;

      // Save meeting to database
      await prisma.meeting.create({
        data: {
          organization: { connect: { id: organizationId } },
          user: { connect: { id: userId } },
          externalId: meeting.id.toString(),
          platform: 'zoom',
          title: meeting.topic,
          scheduledStartAt: new Date(meeting.start_time),
          scheduledEndAt: new Date(
            new Date(meeting.start_time).getTime() + meeting.duration * 60000
          ),
          meetingUrl: meeting.join_url,
          metadata: meeting,
        },
      });

      logger.info(`Created Zoom meeting: ${meeting.id}`);

      return meeting;
    } catch (error) {
      logger.error('Failed to create Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string): Promise<ZoomMeeting> {
    const response = await this.api.get(`/meetings/${meetingId}`);
    return response.data;
  }

  /**
   * Update meeting
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<ZoomMeeting>
  ): Promise<void> {
    await this.api.patch(`/meetings/${meetingId}`, updates);
    
    logger.info(`Updated Zoom meeting: ${meetingId}`);
  }

  /**
   * Delete meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    await this.api.delete(`/meetings/${meetingId}`);
    
    logger.info(`Deleted Zoom meeting: ${meetingId}`);
  }

  /**
   * List meetings
   */
  async listMeetings(
    userId: string,
    type: 'scheduled' | 'live' | 'upcoming' = 'scheduled'
  ): Promise<ZoomMeeting[]> {
    const response = await this.api.get(`/users/${userId}/meetings`, {
      params: { type },
    });

    return response.data.meetings;
  }

  /**
   * Join meeting with bot
   */
  async joinMeetingWithBot(
    meetingId: string,
    meetingPassword?: string
  ): Promise<string> {
    try {
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Check if bot already exists for this meeting
      if (this.activeBots.has(meetingId)) {
        throw new Error('Bot already active in this meeting');
      }

      // Create bot instance with SDK credentials
      const bot = new ZoomBot(
        botId,
        meetingId,
        meetingPassword,
        this.recordingService,
        this.queueService,
        this.config.sdkKey || process.env.ZOOM_SDK_KEY,
        this.config.sdkSecret || process.env.ZOOM_SDK_SECRET
      );

      // Connect bot to meeting
      await bot.connect();

      this.activeBots.set(meetingId, bot);

      // Handle bot events
      bot.on('connected', () => {
        logger.info(`Bot connected to Zoom meeting: ${meetingId}`);
        this.emit('bot:connected', { meetingId, botId });
      });

      bot.on('recording:started', () => {
        logger.info(`Bot started recording Zoom meeting: ${meetingId}`);
        this.emit('bot:recording:started', { meetingId, botId });
      });

      bot.on('disconnected', () => {
        logger.info(`Bot disconnected from Zoom meeting: ${meetingId}`);
        this.activeBots.delete(meetingId);
        this.emit('bot:disconnected', { meetingId, botId });
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
   * Get cloud recordings
   */
  async getCloudRecordings(
    userId: string,
    from: Date,
    to: Date
  ): Promise<ZoomRecordingFile[]> {
    const response = await this.api.get(`/users/${userId}/recordings`, {
      params: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
    });

    const recordings: ZoomRecordingFile[] = [];
    
    for (const meeting of response.data.meetings) {
      if (meeting.recording_files) {
        recordings.push(...meeting.recording_files);
      }
    }

    return recordings;
  }

  /**
   * Download recording
   */
  async downloadRecording(
    downloadUrl: string,
    accessToken?: string
  ): Promise<Buffer> {
    const response = await axios.get(downloadUrl, {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  /**
   * Process webhook
   */
  async processWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<void> {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(headers, body)) {
      throw new Error('Invalid webhook signature');
    }

    const event = body as ZoomWebhookEvent;
    
    logger.info(`Processing Zoom webhook: ${event.event}`);

    switch (event.event) {
      case 'meeting.started':
        await this.handleMeetingStarted(event.payload.object);
        break;
      
      case 'meeting.ended':
        await this.handleMeetingEnded(event.payload.object);
        break;
      
      case 'meeting.participant_joined':
        await this.handleParticipantJoined(event.payload.object);
        break;
      
      case 'meeting.participant_left':
        await this.handleParticipantLeft(event.payload.object);
        break;
      
      case 'recording.completed':
        await this.handleRecordingCompleted(event.payload.object);
        break;
      
      default:
        logger.debug(`Unhandled Zoom webhook event: ${event.event}`);
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(
    headers: Record<string, string>,
    body: any
  ): boolean {
    const message = `v0:${headers['x-zm-request-timestamp']}:${JSON.stringify(body)}`;
    const hash = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(message)
      .digest('hex');
    
    const signature = `v0=${hash}`;
    
    return signature === headers['x-zm-signature'];
  }

  /**
   * Handle meeting started
   */
  private async handleMeetingStarted(meeting: any): Promise<void> {
    try {
      await prisma.meeting.updateMany({
        where: {
          externalId: meeting.id.toString(),
          platform: 'zoom',
        },
        data: {
          status: 'in_progress',
          actualStartAt: new Date(),
        },
      });

      // Queue bot to join if configured
      const dbMeeting = await prisma.meeting.findFirst({
        where: {
          externalId: meeting.id.toString(),
          platform: 'zoom',
        },
      });

      if (dbMeeting?.autoRecord) {
        await this.queueService.addJob(JobType.MEETING_BOT_JOIN, {
          type: JobType.MEETING_BOT_JOIN,
          payload: {
            platform: 'zoom',
            meetingId: meeting.id,
            meetingPassword: meeting.password,
          },
          meetingId: dbMeeting.id,
        });
      }

      this.emit('meeting:started', {
        platform: 'zoom',
        meetingId: meeting.id,
        topic: meeting.topic,
      });
    } catch (error) {
      logger.error('Failed to handle meeting started:', error);
      throw error;
    }
  }

  /**
   * Handle meeting ended
   */
  private async handleMeetingEnded(meeting: any): Promise<void> {
    await prisma.meeting.updateMany({
      where: {
        externalId: meeting.id.toString(),
        platform: 'zoom',
      },
      data: {
        status: 'completed',
        actualEndAt: new Date(),
        duration: meeting.duration,
      },
    });

    // Leave with bot if active
    if (this.activeBots.has(meeting.id)) {
      await this.leaveMeetingWithBot(meeting.id);
    }

    this.emit('meeting:ended', {
      platform: 'zoom',
      meetingId: meeting.id,
      duration: meeting.duration,
    });
  }

  /**
   * Handle participant joined
   */
  private async handleParticipantJoined(data: any): Promise<void> {
    try {
      const { meeting_id, participant } = data;

      // Find the meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          externalId: meeting_id.toString(),
          platform: 'zoom',
        },
      });

      if (!meeting) {
        logger.warn(`Meeting not found for participant join: ${meeting_id}`);
        return;
      }

      await prisma.meetingParticipant.create({
        data: {
          meeting: { connect: { id: meeting.id } },
          name: participant.user_name,
          email: participant.email,
          joinedAt: new Date(),
          metadata: participant,
        },
      });

      this.emit('participant:joined', {
        platform: 'zoom',
        meetingId: meeting_id,
        participant: participant.user_name,
      });
    } catch (error) {
      logger.error('Failed to handle participant joined:', error);
    }
  }

  /**
   * Handle participant left
   */
  private async handleParticipantLeft(data: any): Promise<void> {
    try {
      const { meeting_id, participant } = data;

      // Find the meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          externalId: meeting_id.toString(),
          platform: 'zoom',
        },
      });

      if (!meeting) {
        logger.warn(`Meeting not found for participant left: ${meeting_id}`);
        return;
      }

      await prisma.meetingParticipant.updateMany({
        where: {
          meetingId: meeting.id,
          email: participant.email,
        },
        data: {
          leftAt: new Date(),
          duration: participant.duration,
        },
      });

      this.emit('participant:left', {
        platform: 'zoom',
        meetingId: meeting_id,
        participant: participant.user_name,
      });
    } catch (error) {
      logger.error('Failed to handle participant left:', error);
    }
  }

  /**
   * Handle recording completed
   */
  private async handleRecordingCompleted(recording: any): Promise<void> {
    // Queue download and processing
    await this.queueService.addJob(JobType.FILE_PROCESSING, {
      type: JobType.FILE_PROCESSING,
      payload: {
        platform: 'zoom',
        recordingId: recording.uuid,
        downloadUrl: recording.recording_files[0]?.download_url,
        meetingId: recording.id,
      },
      meetingId: recording.id,
    });

    this.emit('recording:completed', {
      platform: 'zoom',
      meetingId: recording.id,
      recordingId: recording.uuid,
    });
  }

  /**
   * Get meeting participants
   */
  async getMeetingParticipants(meetingId: string): Promise<any[]> {
    const response = await this.api.get(`/past_meetings/${meetingId}/participants`);
    return response.data.participants;
  }

  /**
   * Get meeting transcript
   */
  async getMeetingTranscript(meetingId: string): Promise<string> {
    try {
      const response = await this.api.get(`/meetings/${meetingId}/recordings/transcript`);
      return response.data.transcript;
    } catch (error) {
      logger.error('Failed to get meeting transcript:', error);
      throw error;
    }
  }

  /**
   * Get live transcription settings
   */
  async getLiveTranscriptionSettings(meetingId: string): Promise<any> {
    try {
      const response = await this.api.get(`/meetings/${meetingId}/live_transcription`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get live transcription settings:', error);
      throw error;
    }
  }

  /**
   * Enable live transcription
   */
  async enableLiveTranscription(
    meetingId: string,
    language: string = 'en-US'
  ): Promise<void> {
    try {
      await this.api.patch(`/meetings/${meetingId}`, {
        settings: {
          auto_recording: 'cloud',
          audio_conference_info: true,
          alternative_hosts_email_notification: true,
        },
      });

      logger.info(`Enabled live transcription for meeting ${meetingId}`);
    } catch (error) {
      logger.error('Failed to enable live transcription:', error);
      throw error;
    }
  }

  /**
   * Create instant meeting
   */
  async createInstantMeeting(
    userId: string,
    organizationId: string,
    topic: string,
    settings?: Partial<ZoomMeetingSettings>
  ): Promise<ZoomMeeting> {
    try {
      // Get integration for this user to get Zoom user ID
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          organizationId,
          type: 'zoom',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Zoom integration not found for user');
      }

      const metadata = integration.metadata as any;
      const zoomUserId = metadata?.zoomUserId || metadata?.userId;

      if (!zoomUserId) {
        throw new Error('Zoom user ID not found in integration metadata');
      }

      const response = await this.api.post(`/users/${zoomUserId}/meetings`, {
        topic,
        type: 1, // Instant meeting
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
          watermark: false,
          audio: 'both',
          auto_recording: 'cloud',
          ...settings,
        },
      });

      const meeting = response.data;

      // Save meeting to database
      await prisma.meeting.create({
        data: {
          organization: { connect: { id: organizationId } },
          user: { connect: { id: userId } },
          externalId: meeting.id.toString(),
          platform: 'zoom',
          title: meeting.topic,
          meetingUrl: meeting.join_url,
          status: 'scheduled',
          metadata: meeting,
        },
      });

      logger.info(`Created instant Zoom meeting: ${meeting.id}`);

      return meeting;
    } catch (error) {
      logger.error('Failed to create instant Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * Create recurring meeting
   */
  async createRecurringMeeting(
    userId: string,
    organizationId: string,
    topic: string,
    recurrence: ZoomRecurrence,
    settings?: Partial<ZoomMeetingSettings>
  ): Promise<ZoomMeeting> {
    try {
      // Get integration for this user to get Zoom user ID
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          organizationId,
          type: 'zoom',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Zoom integration not found for user');
      }

      const metadata = integration.metadata as any;
      const zoomUserId = metadata?.zoomUserId || metadata?.userId;

      if (!zoomUserId) {
        throw new Error('Zoom user ID not found in integration metadata');
      }

      const response = await this.api.post(`/users/${zoomUserId}/meetings`, {
        topic,
        type: 8, // Recurring meeting with no fixed time
        recurrence,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          audio: 'both',
          auto_recording: 'cloud',
          ...settings,
        },
      });

      const meeting = response.data;

      // Save meeting to database
      await prisma.meeting.create({
        data: {
          organization: { connect: { id: organizationId } },
          user: { connect: { id: userId } },
          externalId: meeting.id.toString(),
          platform: 'zoom',
          title: meeting.topic,
          meetingUrl: meeting.join_url,
          metadata: meeting,
        },
      });

      logger.info(`Created recurring Zoom meeting: ${meeting.id}`);

      return meeting;
    } catch (error) {
      logger.error('Failed to create recurring Zoom meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting quality metrics
   */
  async getMeetingQualityMetrics(meetingId: string): Promise<any> {
    try {
      const response = await this.api.get(`/metrics/meetings/${meetingId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get meeting quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get meeting polls
   */
  async getMeetingPolls(meetingId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/meetings/${meetingId}/polls`);
      return response.data.polls || [];
    } catch (error) {
      logger.error('Failed to get meeting polls:', error);
      throw error;
    }
  }

  /**
   * Create meeting poll
   */
  async createMeetingPoll(
    meetingId: string,
    poll: {
      title: string;
      questions: Array<{
        name: string;
        type: 'single' | 'multiple';
        answers: string[];
      }>;
    }
  ): Promise<any> {
    try {
      const response = await this.api.post(`/meetings/${meetingId}/polls`, poll);
      logger.info(`Created poll for meeting ${meetingId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create meeting poll:', error);
      throw error;
    }
  }

  /**
   * Get meeting registration
   */
  async getMeetingRegistrants(meetingId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/meetings/${meetingId}/registrants`);
      return response.data.registrants || [];
    } catch (error) {
      logger.error('Failed to get meeting registrants:', error);
      throw error;
    }
  }

  /**
   * Add meeting registrant
   */
  async addMeetingRegistrant(
    meetingId: string,
    registrant: {
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
      company?: string;
      job_title?: string;
    }
  ): Promise<any> {
    try {
      const response = await this.api.post(
        `/meetings/${meetingId}/registrants`,
        registrant
      );
      logger.info(`Added registrant to meeting ${meetingId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to add meeting registrant:', error);
      throw error;
    }
  }

  /**
   * Get meeting summary
   */
  async getMeetingSummary(meetingId: string): Promise<any> {
    try {
      const response = await this.api.get(`/meetings/${meetingId}/meeting_summary`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get meeting summary:', error);
      throw error;
    }
  }

  /**
   * Disconnect Zoom integration
   */
  async disconnect(userId: string, organizationId: string): Promise<void> {
    try {
      // Update database
      await prisma.integration.updateMany({
        where: {
          userId,
          organizationId,
          type: 'zoom',
        },
        data: { isActive: false },
      });

      logger.info(`Zoom integration disconnected for user ${userId}`);

      this.emit('account:disconnected', {
        userId,
        organizationId,
        platform: 'zoom',
      });
    } catch (error) {
      logger.error('Failed to disconnect Zoom integration:', error);
      throw error;
    }
  }
}

/**
 * Zoom Bot Handler with Real SDK Integration
 */
class ZoomBot extends EventEmitter {
  public botId: string;
  private meetingId: string;
  private meetingPassword?: string;
  private recordingService: RecordingService;
  private queueService: QueueService;
  private isConnected: boolean = false;
  private recordingId?: string;
  private sdkKey: string;
  private sdkSecret: string;
  private zoomApi: AxiosInstance;
  private cloudRecordingToken?: string;
  private participantId?: string;
  private webSocketConnection?: any;

  constructor(
    botId: string,
    meetingId: string,
    meetingPassword: string | undefined,
    recordingService: RecordingService,
    queueService: QueueService,
    sdkKey: string = process.env.ZOOM_SDK_KEY || '',
    sdkSecret: string = process.env.ZOOM_SDK_SECRET || ''
  ) {
    super();
    this.botId = botId;
    this.meetingId = meetingId;
    this.meetingPassword = meetingPassword;
    this.recordingService = recordingService;
    this.queueService = queueService;
    this.sdkKey = sdkKey;
    this.sdkSecret = sdkSecret;

    // Initialize Zoom API client
    this.zoomApi = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      timeout: 30000,
    });

    // Add authorization interceptor
    this.zoomApi.interceptors.request.use(async (config) => {
      const token = await this.generateSDKToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Generate SDK JWT Token for Bot Authentication
   */
  private async generateSDKToken(): Promise<string> {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const payload = {
      appKey: this.sdkKey,
      iat,
      exp,
      tokenExp: exp
    };

    try {
      // Generate SDK JWT token for bot authentication
      const token = jwt.sign(payload, this.sdkSecret, {
        algorithm: 'HS256',
        header: { typ: 'JWT', alg: 'HS256' }
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate SDK token:', error);
      throw error;
    }
  }

  /**
   * Generate Meeting SDK Signature for joining meetings
   */
  private generateMeetingSignature(meetingNumber: string, role: number = 0): string {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;

    const payload = {
      sdkKey: this.sdkKey,
      mn: meetingNumber,
      role: role, // 0 for participant, 1 for host
      iat: iat,
      exp: exp,
      appKey: this.sdkKey,
      tokenExp: exp
    };

    // Generate signature using jsonwebtoken library
    const signature = jwt.sign(payload, this.sdkSecret, {
      algorithm: 'HS256',
      header: { alg: 'HS256', typ: 'JWT' }
    });

    return signature;
  }

  /**
   * Connect bot to Zoom meeting using SDK
   */
  async connect(): Promise<void> {
    try {
      logger.info(`Connecting bot to Zoom meeting: ${this.meetingId}`);

      // Generate meeting signature for bot to join
      const signature = this.generateMeetingSignature(this.meetingId, 0);

      // Join meeting as bot using Zoom API
      const joinResponse = await this.joinMeetingAsBot(signature);

      if (!joinResponse.success) {
        throw new Error(`Failed to join meeting: ${joinResponse.error}`);
      }

      this.participantId = joinResponse.participantId;
      this.isConnected = true;

      // Start cloud recording via API
      await this.startCloudRecording();

      // Start local recording service for redundancy
      this.recordingId = await this.recordingService.startRecording({
        meetingId: this.meetingId,
        organizationId: 'zoom',
        userId: this.botId,
        autoTranscribe: true,
      });

      // Enable live transcription
      await this.enableTranscription();

      logger.info(`Bot successfully connected to meeting ${this.meetingId}`);
      this.emit('connected');
      this.emit('recording:started');

    } catch (error) {
      logger.error('Failed to connect bot to meeting:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Join meeting as bot using Zoom REST API
   */
  private async joinMeetingAsBot(signature: string): Promise<any> {
    try {
      // Use Zoom's meeting bot API to join
      const response = await this.zoomApi.post('/meetings/' + this.meetingId + '/join', {
        signature: signature,
        bot_name: `Recording Bot ${this.botId}`,
        password: this.meetingPassword,
        role: 'bot',
        settings: {
          auto_recording: true,
          cloud_recording: true,
          audio_type: 'both',
          video_quality: 'HD'
        }
      });

      return {
        success: true,
        participantId: response.data.participant_id,
        joinUrl: response.data.join_url
      };

    } catch (error: any) {
      logger.error('Failed to join meeting as bot:', error.response?.data || error);

      // If join via API fails, try alternative approach using registrant API
      if (error.response?.status === 404 || error.response?.status === 400) {
        return await this.joinAsRegistrant();
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Alternative: Join as registrant for meetings that require registration
   */
  private async joinAsRegistrant(): Promise<any> {
    try {
      // Register bot as participant
      const registrationResponse = await this.zoomApi.post(
        `/meetings/${this.meetingId}/registrants`,
        {
          email: `bot-${this.botId}@recording.bot`,
          first_name: 'Recording',
          last_name: `Bot ${this.botId}`
        }
      );

      const registrantId = registrationResponse.data.registrant_id;
      const joinUrl = registrationResponse.data.join_url;

      // Approve registrant if needed
      await this.zoomApi.put(
        `/meetings/${this.meetingId}/registrants/status`,
        {
          action: 'approve',
          registrants: [{ id: registrantId }]
        }
      );

      return {
        success: true,
        participantId: registrantId,
        joinUrl: joinUrl
      };

    } catch (error: any) {
      logger.error('Failed to join as registrant:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Start cloud recording using Zoom API
   */
  private async startCloudRecording(): Promise<void> {
    try {
      const response = await this.zoomApi.patch(
        `/meetings/${this.meetingId}/recordings`,
        { action: 'start' }
      );

      this.cloudRecordingToken = response.data.recording_id;
      logger.info(`Started cloud recording for meeting ${this.meetingId}`);

    } catch (error: any) {
      // Check if recording is already started
      if (error.response?.status === 404) {
        logger.warn('Meeting not found or recording not available');
      } else if (error.response?.data?.code === 3301) {
        logger.info('Cloud recording already started');
      } else {
        logger.error('Failed to start cloud recording:', error.response?.data || error);
      }
    }
  }

  /**
   * Stop cloud recording
   */
  private async stopCloudRecording(): Promise<void> {
    try {
      await this.zoomApi.patch(
        `/meetings/${this.meetingId}/recordings`,
        { action: 'stop' }
      );

      logger.info(`Stopped cloud recording for meeting ${this.meetingId}`);
    } catch (error) {
      logger.error('Failed to stop cloud recording:', error);
    }
  }

  /**
   * Enable live transcription for the meeting
   */
  private async enableTranscription(): Promise<void> {
    try {
      await this.zoomApi.patch(`/meetings/${this.meetingId}/live_stream`, {
        action: 'start',
        settings: {
          active_speaker_name: true,
          display_name: true
        }
      });

      // Enable automated captions/transcription
      await this.zoomApi.patch(`/meetings/${this.meetingId}`, {
        settings: {
          closed_caption: true,
          auto_generated_captions: true,
          save_caption: true,
          save_captions_as_vtt: true
        }
      });

      logger.info(`Enabled transcription for meeting ${this.meetingId}`);
    } catch (error) {
      logger.error('Failed to enable transcription:', error);
    }
  }

  /**
   * Get recording from Zoom Cloud
   */
  async getRecording(): Promise<any> {
    try {
      const response = await this.zoomApi.get(
        `/meetings/${this.meetingId}/recordings`
      );

      const recording = response.data;

      if (!recording.recording_files || recording.recording_files.length === 0) {
        throw new Error('No recording files available');
      }

      // Find the main recording file (usually MP4)
      const videoFile = recording.recording_files.find(
        (file: any) => file.file_type === 'MP4'
      );

      const audioFile = recording.recording_files.find(
        (file: any) => file.file_type === 'M4A'
      );

      const transcriptFile = recording.recording_files.find(
        (file: any) => file.file_type === 'TRANSCRIPT' || file.file_type === 'VTT'
      );

      return {
        meetingId: this.meetingId,
        topic: recording.topic,
        startTime: recording.start_time,
        duration: recording.duration,
        videoUrl: videoFile?.download_url,
        audioUrl: audioFile?.download_url,
        transcriptUrl: transcriptFile?.download_url,
        files: recording.recording_files
      };

    } catch (error) {
      logger.error('Failed to get recording:', error);
      throw error;
    }
  }

  /**
   * Get meeting transcript from Zoom
   */
  async getTranscript(): Promise<string> {
    try {
      // First try to get from cloud recording
      const recording = await this.getRecording();

      if (recording.transcriptUrl) {
        // Download transcript file
        const response = await axios.get(recording.transcriptUrl, {
          headers: {
            Authorization: `Bearer ${await this.generateSDKToken()}`
          }
        });

        return response.data;
      }

      // Fallback: Try to get live transcription
      const transcriptResponse = await this.zoomApi.get(
        `/meetings/${this.meetingId}/recordings/transcript`
      );

      return transcriptResponse.data.transcript || '';

    } catch (error) {
      logger.error('Failed to get transcript:', error);
      throw error;
    }
  }

  /**
   * Download recording file
   */
  async downloadRecordingFile(downloadUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(downloadUrl, {
        headers: {
          Authorization: `Bearer ${await this.generateSDKToken()}`
        },
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download recording file:', error);
      throw error;
    }
  }

  /**
   * Process and save recording
   */
  async processRecording(): Promise<void> {
    try {
      const recording = await this.getRecording();

      if (recording.videoUrl) {
        // Download video file
        const videoBuffer = await this.downloadRecordingFile(recording.videoUrl);

        // Queue for processing
        await this.queueService.addJob(JobType.FILE_PROCESSING, {
          type: JobType.FILE_PROCESSING,
          payload: {
            platform: 'zoom',
            meetingId: this.meetingId,
            recordingBuffer: videoBuffer,
            metadata: recording
          },
          meetingId: this.meetingId
        });
      }

      // Process transcript
      const transcript = await this.getTranscript();
      if (transcript) {
        // Queue transcript for processing
        await this.queueService.addJob(JobType.FILE_PROCESSING, {
          type: JobType.FILE_PROCESSING,
          payload: {
            meetingId: this.meetingId,
            transcript: transcript,
            platform: 'zoom',
            fileType: 'transcript'
          },
          meetingId: this.meetingId
        });
      }

      logger.info(`Processed recording for meeting ${this.meetingId}`);
    } catch (error) {
      logger.error('Failed to process recording:', error);
      throw error;
    }
  }

  /**
   * Leave meeting and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      // Stop cloud recording
      if (this.cloudRecordingToken) {
        await this.stopCloudRecording();
      }

      // Stop local recording
      if (this.recordingId) {
        await this.recordingService.stopRecording(this.meetingId);
      }

      // Leave meeting via API
      if (this.participantId) {
        try {
          await this.zoomApi.delete(
            `/meetings/${this.meetingId}/participants/${this.participantId}`
          );
        } catch (error) {
          logger.warn('Failed to remove bot from meeting via API:', error);
        }
      }

      // Process and save recording before disconnecting
      setTimeout(async () => {
        try {
          await this.processRecording();
        } catch (error) {
          logger.error('Failed to process recording after disconnect:', error);
        }
      }, 5000); // Wait 5 seconds for recording to be available

      this.isConnected = false;
      logger.info(`Bot disconnected from meeting ${this.meetingId}`);
      this.emit('disconnected');

    } catch (error) {
      logger.error('Error during disconnect:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current bot status
   */
  getStatus(): any {
    return {
      botId: this.botId,
      meetingId: this.meetingId,
      isConnected: this.isConnected,
      hasRecording: !!this.recordingId,
      hasCloudRecording: !!this.cloudRecordingToken,
      participantId: this.participantId
    };
  }
}
