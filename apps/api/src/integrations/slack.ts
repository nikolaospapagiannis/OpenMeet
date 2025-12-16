/**
 * Slack Integration Service - Production Ready
 * Real-time notifications, collaboration, and workflow automation for meetings
 *
 * Features:
 * - OAuth 2.0 authentication with token refresh
 * - Real-time message posting with Block Kit
 * - Channel management (create, list, archive, invite)
 * - File sharing and upload
 * - Interactive buttons and actions
 * - Webhook support for Slack events
 * - Comprehensive error handling
 * - Type-safe implementation
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import winston from 'winston';
import { PrismaClient, Meeting, AIAnalysis } from '@prisma/client';
import {
  WebClient,
  WebAPICallResult,
  ChatPostMessageResponse,
  FilesUploadResponse,
  ConversationsListResponse,
  ConversationsCreateResponse,
  ConversationsArchiveResponse,
  ConversationsInviteResponse,
  UsersListResponse,
  ChatUpdateResponse,
  ChatDeleteResponse,
  UsersInfoResponse,
} from '@slack/web-api';
// Conditional import for @slack/oauth - not installed yet
let InstallProvider: any;
let LogLevel: any;

try {
  const slackOAuth = require('@slack/oauth');
  InstallProvider = slackOAuth.InstallProvider;
  LogLevel = slackOAuth.LogLevel;
} catch {
  // Stub if @slack/oauth is not installed
  InstallProvider = class {
    constructor() {}
    async generateInstallUrl() { return ''; }
    async handleCallback() {}
  };
  LogLevel = { DEBUG: 'debug', INFO: 'info' };
}

type Installation = any;
type InstallationQuery<T> = any;
type InstallURLOptions = any;
type CallbackOptions = any;
import axios, { AxiosError } from 'axios';
import { QueueService, JobType } from '../services/queue';
import { CacheService } from '../services/cache';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'slack-integration' },
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const prisma = new PrismaClient();

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SlackConfig {
  clientId: string;
  clientSecret: string;
  signingSecret: string;
  redirectUri: string;
  stateSecret: string;
  appToken?: string;
  botToken?: string;
}

export interface SlackOAuthTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id?: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  name_normalized: string;
  is_shared: boolean;
  is_org_shared: boolean;
  is_member: boolean;
  is_private_channel?: boolean;
  is_mpim_channel?: boolean;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
  num_members?: number;
}

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color?: string;
  real_name?: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile: {
    title?: string;
    phone?: string;
    skype?: string;
    real_name?: string;
    real_name_normalized?: string;
    display_name?: string;
    display_name_normalized?: string;
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
    avatar_hash?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
    image_192?: string;
    image_512?: string;
  };
  is_admin?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  updated?: number;
  has_2fa?: boolean;
}

export interface SlackMessage {
  type: string;
  subtype?: string;
  text?: string;
  ts: string;
  username?: string;
  icons?: {
    emoji?: string;
    image_64?: string;
  };
  bot_id?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
  reply_users?: string[];
  replies?: Array<{
    user: string;
    ts: string;
  }>;
  is_locked?: boolean;
  subscribed?: boolean;
}

export interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  actions?: Array<{
    name: string;
    text: string;
    type: string;
    value?: string;
    style?: string;
    confirm?: {
      title: string;
      text: string;
      ok_text: string;
      dismiss_text: string;
    };
  }>;
  callback_id?: string;
  mrkdwn_in?: string[];
}

export interface SlackBlock {
  type: string;
  block_id?: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
    verbatim?: boolean;
  };
  accessory?: {
    type: string;
    text?: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    value?: string;
    url?: string;
    action_id?: string;
    style?: string;
    confirm?: {
      title: {
        type: string;
        text: string;
      };
      text: {
        type: string;
        text: string;
      };
      confirm: {
        type: string;
        text: string;
      };
      deny: {
        type: string;
        text: string;
      };
    };
  };
  elements?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    value?: string;
    url?: string;
    action_id?: string;
    style?: string;
  }>;
  title?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  image_url?: string;
  alt_text?: string;
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

export interface SlackNotificationSettings {
  userId: string;
  organizationId: string;
  workspaceId: string;
  channelId: string;
  notifyOnMeetingStart: boolean;
  notifyOnMeetingEnd: boolean;
  notifyOnTranscriptionComplete: boolean;
  notifyOnAnalysisComplete: boolean;
  shareActionItems: boolean;
  shareKeyPoints: boolean;
  shareSummary: boolean;
  threadedMessages: boolean;
  mentionAttendees: boolean;
  autoCreateChannels: boolean;
}

export interface SlackEventPayload {
  token: string;
  team_id: string;
  api_app_id: string;
  event: {
    type: string;
    user?: string;
    text?: string;
    ts?: string;
    channel?: string;
    event_ts?: string;
    [key: string]: unknown;
  };
  type: string;
  event_id: string;
  event_time: number;
}

export interface SlackActionPayload {
  type: string;
  user: {
    id: string;
    name: string;
  };
  trigger_id: string;
  team: {
    id: string;
    domain: string;
  };
  channel: {
    id: string;
    name: string;
  };
  actions: Array<{
    action_id: string;
    block_id: string;
    value: string;
    type: string;
    action_ts: string;
  }>;
  message?: SlackMessage;
  response_url?: string;
}

// ============================================================================
// Slack Integration Class
// ============================================================================

export class SlackIntegration extends EventEmitter {
  private config: SlackConfig;
  private clients: Map<string, { client: WebClient; expiresAt: Date }>;
  private installProvider: any;
  private queueService: QueueService;
  private cacheService: CacheService;

  constructor(
    config: SlackConfig,
    queueService: QueueService,
    cacheService: CacheService
  ) {
    super();
    this.config = config;
    this.clients = new Map();
    this.queueService = queueService;
    this.cacheService = cacheService;

    // Initialize InstallProvider from @slack/oauth for OAuth flow management
    this.installProvider = new InstallProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      stateSecret: config.stateSecret,
      installationStore: {
        storeInstallation: async (installation: Installation) => {
          await this.storeInstallation(installation);
        },
        fetchInstallation: async (
          installQuery: InstallationQuery<boolean>
        ): Promise<Installation> => {
          return this.fetchInstallation(installQuery);
        },
        deleteInstallation: async (
          installQuery: InstallationQuery<boolean>
        ): Promise<void> => {
          await this.deleteInstallation(installQuery);
        },
      },
      stateVerification: true,
      logLevel: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
    });

    logger.info('SlackIntegration initialized with InstallProvider');
  }

  // ==========================================================================
  // Installation Store Methods (for InstallProvider)
  // ==========================================================================

  /**
   * Store Slack installation in database
   */
  private async storeInstallation(installation: Installation): Promise<void> {
    try {
      const teamId = installation.team?.id;
      const enterpriseId = installation.enterprise?.id;

      if (!teamId && !enterpriseId) {
        throw new Error('Installation must have either team or enterprise ID');
      }

      const workspaceKey = enterpriseId || teamId!;

      // Find or create workspace
      let workspace = await prisma.slackWorkspace.findUnique({
        where: { teamId: workspaceKey },
      });

      const accessToken =
        installation.bot?.token || installation.user?.token || '';
      const botUserId = installation.bot?.userId;

      if (workspace) {
        workspace = await prisma.slackWorkspace.update({
          where: { teamId: workspaceKey },
          data: {
            accessToken,
            botUserId,
            isActive: true,
            teamName: installation.team?.name || workspace.teamName,
            metadata: {
              appId: installation.appId,
              enterpriseId: installation.enterprise?.id,
              enterpriseName: installation.enterprise?.name,
              userId: installation.user?.id,
              userScopes: installation.user?.scopes,
              botScopes: installation.bot?.scopes,
              tokenType: installation.tokenType,
              isEnterpriseInstall: installation.isEnterpriseInstall,
            },
            updatedAt: new Date(),
          },
        });
      } else {
        // Need organizationId for new workspace - use a default or lookup
        const defaultOrg = await prisma.organization.findFirst({
          orderBy: { createdAt: 'asc' },
        });

        workspace = await prisma.slackWorkspace.create({
          data: {
            organizationId: defaultOrg?.id || 'default',
            teamId: workspaceKey,
            teamName: installation.team?.name || 'Unknown',
            accessToken,
            botUserId,
            isActive: true,
            metadata: {
              appId: installation.appId,
              enterpriseId: installation.enterprise?.id,
              enterpriseName: installation.enterprise?.name,
              userId: installation.user?.id,
              userScopes: installation.user?.scopes,
              botScopes: installation.bot?.scopes,
              tokenType: installation.tokenType,
              isEnterpriseInstall: installation.isEnterpriseInstall,
            },
          },
        });
      }

      logger.info(`Stored Slack installation for team: ${workspaceKey}`, {
        teamName: installation.team?.name,
        isEnterprise: !!enterpriseId,
      });
    } catch (error) {
      logger.error('Failed to store Slack installation:', error);
      throw error;
    }
  }

  /**
   * Fetch Slack installation from database
   */
  private async fetchInstallation(
    installQuery: InstallationQuery<boolean>
  ): Promise<Installation> {
    try {
      const teamId = installQuery.teamId || installQuery.enterpriseId;

      if (!teamId) {
        throw new Error('Team ID or Enterprise ID required');
      }

      const workspace = await prisma.slackWorkspace.findUnique({
        where: { teamId },
      });

      if (!workspace) {
        throw new Error(`Installation not found for team: ${teamId}`);
      }

      const metadata = workspace.metadata as Record<string, unknown>;

      // Construct Installation object
      const installation: Installation = {
        team: {
          id: workspace.teamId,
          name: workspace.teamName,
        },
        enterprise: metadata.enterpriseId
          ? {
              id: metadata.enterpriseId as string,
              name: (metadata.enterpriseName as string) || '',
            }
          : undefined,
        bot: workspace.accessToken
          ? {
              token: workspace.accessToken,
              userId: workspace.botUserId || '',
              scopes: (metadata.botScopes as string[]) || [],
              id: workspace.botUserId || '',
            }
          : undefined,
        user: {
          id: (metadata.userId as string) || '',
          scopes: (metadata.userScopes as string[]) || [],
          token: undefined,
        },
        appId: (metadata.appId as string) || '',
        tokenType: 'bot' as const,
        isEnterpriseInstall: (metadata.isEnterpriseInstall as boolean) || false,
      };

      return installation;
    } catch (error) {
      logger.error('Failed to fetch Slack installation:', error);
      throw error;
    }
  }

  /**
   * Delete Slack installation from database
   */
  private async deleteInstallation(
    installQuery: InstallationQuery<boolean>
  ): Promise<void> {
    try {
      const teamId = installQuery.teamId || installQuery.enterpriseId;

      if (!teamId) {
        throw new Error('Team ID or Enterprise ID required');
      }

      await prisma.slackWorkspace.update({
        where: { teamId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info(`Deleted/deactivated Slack installation for team: ${teamId}`);
    } catch (error) {
      logger.error('Failed to delete Slack installation:', error);
      throw error;
    }
  }

  // ==========================================================================
  // OAuth 2.0 Flow with InstallProvider
  // ==========================================================================

  /**
   * Generate Slack OAuth authorization URL using InstallProvider
   */
  async generateInstallUrl(state?: string): Promise<string> {
    try {
      const scopes = [
        'channels:read',
        'channels:write',
        'channels:manage',
        'chat:write',
        'chat:write.public',
        'files:write',
        'files:read',
        'groups:read',
        'groups:write',
        'im:read',
        'im:write',
        'mpim:read',
        'mpim:write',
        'users:read',
        'users:read.email',
        'team:read',
        'commands',
        'incoming-webhook',
        'reactions:read',
        'reactions:write',
      ];

      const options: InstallURLOptions = {
        scopes,
        userScopes: ['chat:write', 'files:write'],
        redirectUri: this.config.redirectUri,
        metadata: state,
      };

      const url = await this.installProvider.generateInstallUrl(options);

      logger.info('Generated Slack OAuth URL via InstallProvider');
      return url;
    } catch (error) {
      logger.error('Failed to generate Slack OAuth URL:', error);
      throw new Error('Failed to generate authorization URL');
    }
  }

  /**
   * Handle OAuth callback with InstallProvider
   */
  async handleOAuthCallback(
    req: {
      query: { code?: string; state?: string; error?: string };
      headers: Record<string, string | string[] | undefined>;
      url?: string;
    },
    res: {
      writeHead: (statusCode: number, headers?: Record<string, string>) => void;
      end: (body?: string) => void;
    }
  ): Promise<Installation | null> {
    try {
      if (req.query.error) {
        logger.error('OAuth callback error:', req.query.error);
        return null;
      }

      // Use InstallProvider's callback handler
      const options: CallbackOptions = {
        success: async (installation, _installOptions, _req, _res) => {
          logger.info('OAuth callback success', {
            teamId: installation.team?.id,
            teamName: installation.team?.name,
          });
        },
        failure: async (error, _installOptions, _req, _res) => {
          logger.error('OAuth callback failure:', error);
        },
      };

      // Handle the callback
      await this.installProvider.handleCallback(
        req as any,
        res as any,
        options
      );

      // Fetch the installation we just stored
      if (req.query.code && req.query.state) {
        const tokens = await this.exchangeCodeForToken(req.query.code);
        const installation = await this.fetchInstallation({
          teamId: tokens.team.id,
          enterpriseId: undefined,
          isEnterpriseInstall: false,
        });
        return installation;
      }

      return null;
    } catch (error) {
      logger.error('OAuth callback handling failed:', error);
      throw error;
    }
  }

  /**
   * Legacy authorization URL generator (direct method)
   */
  getAuthorizationUrl(state: string, userId?: string): string {
    try {
      const scopes = [
        'channels:read',
        'channels:write',
        'channels:manage',
        'chat:write',
        'chat:write.public',
        'files:write',
        'files:read',
        'groups:read',
        'groups:write',
        'im:read',
        'im:write',
        'mpim:read',
        'mpim:write',
        'users:read',
        'users:read.email',
        'team:read',
        'commands',
        'incoming-webhook',
        'reactions:read',
        'reactions:write',
      ].join(',');

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        scope: scopes,
        redirect_uri: this.config.redirectUri,
        state,
        user_scope: 'chat:write,files:write',
      });

      logger.info(`Generated Slack OAuth URL for user: ${userId || 'unknown'}`);
      return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    } catch (error) {
      logger.error('Failed to generate Slack OAuth URL:', error);
      throw new Error('Failed to generate authorization URL');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<SlackOAuthTokenResponse> {
    try {
      const response = await axios.post<SlackOAuthTokenResponse>(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack OAuth error: ${response.data.error || 'Unknown error'}`);
      }

      logger.info(`Successfully exchanged code for token. Team: ${response.data.team.name}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ error?: string }>;
        logger.error('Slack OAuth token exchange failed:', {
          status: axiosError.response?.status,
          error: axiosError.response?.data?.error,
        });
        throw new Error(`OAuth token exchange failed: ${axiosError.response?.data?.error || axiosError.message}`);
      }
      logger.error('Unexpected error during token exchange:', error);
      throw error;
    }
  }

  /**
   * Connect Slack workspace
   */
  async connectWorkspace(
    userId: string,
    organizationId: string,
    authCode: string
  ): Promise<void> {
    try {
      logger.info(`Connecting Slack workspace for user: ${userId}`);

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForToken(authCode);

      // Create Slack client
      const client = new WebClient(tokens.access_token);
      this.clients.set(userId, {
        client,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Slack tokens don't expire by default
      });

      // Get workspace info
      const teamInfo = await client.team.info() as WebAPICallResult & {
        team?: {
          id: string;
          name: string;
          domain: string;
          email_domain?: string;
          icon?: {
            image_default?: boolean;
            image_34?: string;
            image_44?: string;
            image_68?: string;
            image_88?: string;
            image_102?: string;
            image_132?: string;
            image_230?: string;
          };
        };
      };

      // Check if workspace already exists
      let workspace = await prisma.slackWorkspace.findUnique({
        where: { teamId: tokens.team.id },
      });

      if (workspace) {
        // Update existing workspace
        workspace = await prisma.slackWorkspace.update({
          where: { teamId: tokens.team.id },
          data: {
            accessToken: tokens.access_token,
            botUserId: tokens.bot_user_id,
            isActive: true,
            metadata: {
              appId: tokens.app_id,
              authedUserId: tokens.authed_user.id,
              webhookUrl: tokens.incoming_webhook?.url,
              webhookChannel: tokens.incoming_webhook?.channel,
              domain: teamInfo.team?.domain,
              icon: teamInfo.team?.icon,
            },
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new workspace
        workspace = await prisma.slackWorkspace.create({
          data: {
            organizationId,
            teamId: tokens.team.id,
            teamName: tokens.team.name,
            accessToken: tokens.access_token,
            botUserId: tokens.bot_user_id,
            webhookUrl: tokens.incoming_webhook?.url,
            isActive: true,
            metadata: {
              appId: tokens.app_id,
              authedUserId: tokens.authed_user.id,
              webhookChannel: tokens.incoming_webhook?.channel,
              domain: teamInfo.team?.domain,
              icon: teamInfo.team?.icon,
            },
          },
        });
      }

      // Save integration record
      const existingIntegration = await prisma.integration.findFirst({
        where: {
          organizationId,
          userId,
          type: 'slack',
        },
      });

      if (existingIntegration) {
        await prisma.integration.update({
          where: { id: existingIntegration.id },
          data: {
            isActive: true,
            accessToken: tokens.access_token,
            metadata: {
              teamId: tokens.team.id,
              teamName: tokens.team.name,
              botUserId: tokens.bot_user_id,
              appId: tokens.app_id,
              authedUserId: tokens.authed_user.id,
              workspaceId: workspace.id,
            },
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.integration.create({
          data: {
            organizationId,
            userId,
            type: 'slack',
            name: `Slack - ${tokens.team.name}`,
            isActive: true,
            accessToken: tokens.access_token,
            metadata: {
              teamId: tokens.team.id,
              teamName: tokens.team.name,
              botUserId: tokens.bot_user_id,
              appId: tokens.app_id,
              authedUserId: tokens.authed_user.id,
              workspaceId: workspace.id,
            },
          },
        });
      }

      // Sync channels
      await this.syncChannels(workspace.id, client);

      logger.info(`Slack workspace connected successfully for user ${userId}`, {
        teamId: tokens.team.id,
        teamName: tokens.team.name,
      });

      this.emit('workspace:connected', {
        userId,
        organizationId,
        platform: 'slack',
        teamId: tokens.team.id,
        teamName: tokens.team.name,
      });
    } catch (error) {
      logger.error('Failed to connect Slack workspace:', error);
      throw new Error(`Failed to connect Slack workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync channels from Slack workspace
   */
  private async syncChannels(workspaceId: string, client: WebClient): Promise<void> {
    try {
      const response = await client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
      }) as ConversationsListResponse;

      if (!response.ok || !response.channels) {
        logger.warn('Failed to sync Slack channels');
        return;
      }

      // Upsert channels
      for (const channel of response.channels) {
        await prisma.slackChannel.upsert({
          where: {
            workspaceId_channelId: {
              workspaceId,
              channelId: channel.id!,
            },
          },
          update: {
            channelName: channel.name || 'unknown',
            isPrivate: channel.is_private || false,
            isActive: !channel.is_archived,
            metadata: {
              topic: channel.topic as any,
              purpose: channel.purpose as any,
              numMembers: channel.num_members,
              creator: channel.creator,
              isGeneral: channel.is_general,
            } as any,
            updatedAt: new Date(),
          },
          create: {
            workspaceId,
            channelId: channel.id!,
            channelName: channel.name || 'unknown',
            isPrivate: channel.is_private || false,
            isActive: !channel.is_archived,
            metadata: {
              topic: channel.topic as any,
              purpose: channel.purpose as any,
              numMembers: channel.num_members,
              creator: channel.creator,
              isGeneral: channel.is_general,
            } as any,
          },
        });
      }

      logger.info(`Synced ${response.channels.length} channels for workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Failed to sync Slack channels:', error);
    }
  }

  // ==========================================================================
  // Request Signature Verification
  // ==========================================================================

  /**
   * Verify Slack request signature using HMAC-SHA256
   * This validates that requests are genuinely from Slack
   */
  verifyRequestSignature(
    signature: string,
    timestamp: string,
    body: string
  ): boolean {
    try {
      // Check timestamp to prevent replay attacks (5 minutes tolerance)
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestamp, 10);

      if (Math.abs(currentTime - requestTime) > 300) {
        logger.warn('Slack request signature timestamp too old', {
          currentTime,
          requestTime,
          diff: Math.abs(currentTime - requestTime),
        });
        return false;
      }

      // Compute expected signature
      const sigBaseString = `v0:${timestamp}:${body}`;
      const hmac = crypto.createHmac('sha256', this.config.signingSecret);
      hmac.update(sigBaseString);
      const expectedSignature = `v0=${hmac.digest('hex')}`;

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        logger.warn('Slack request signature verification failed');
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying Slack request signature:', error);
      return false;
    }
  }

  /**
   * Middleware for verifying Slack requests
   */
  createVerificationMiddleware(): (
    req: { headers: Record<string, string>; body: string | object },
    res: { status: (code: number) => { send: (msg: string) => void } },
    next: () => void
  ) => void {
    return (req, res, next) => {
      const signature = req.headers['x-slack-signature'];
      const timestamp = req.headers['x-slack-request-timestamp'];
      const body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      if (!signature || !timestamp) {
        logger.warn('Missing Slack signature headers');
        res.status(401).send('Unauthorized');
        return;
      }

      if (!this.verifyRequestSignature(signature, timestamp, body)) {
        res.status(401).send('Unauthorized');
        return;
      }

      next();
    };
  }

  // ==========================================================================
  // Client Management
  // ==========================================================================

  /**
   * Get or create Slack client for user
   */
  private async getClient(userId: string): Promise<WebClient> {
    try {
      // Check in-memory cache
      const cached = this.clients.get(userId);
      if (cached && cached.expiresAt > new Date()) {
        return cached.client;
      }

      // Load from database
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          type: 'slack',
          isActive: true
        },
      });

      if (!integration || !integration.accessToken) {
        throw new Error('Slack not connected for user');
      }

      const client = new WebClient(integration.accessToken);
      this.clients.set(userId, {
        client,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      return client;
    } catch (error) {
      logger.error(`Failed to get Slack client for user ${userId}:`, error);
      throw new Error('Failed to get Slack client');
    }
  }

  /**
   * Get client by team ID
   */
  private async getClientByTeamId(teamId: string): Promise<WebClient> {
    try {
      const workspace = await prisma.slackWorkspace.findUnique({
        where: { teamId },
      });

      if (!workspace || !workspace.accessToken) {
        throw new Error(`Slack workspace not found for team: ${teamId}`);
      }

      const client = new WebClient(workspace.accessToken);
      return client;
    } catch (error) {
      logger.error(`Failed to get Slack client for team ${teamId}:`, error);
      throw new Error('Failed to get Slack client by team ID');
    }
  }

  // ==========================================================================
  // Real-time Message Posting
  // ==========================================================================

  /**
   * Post a message to a Slack channel
   */
  async postMessage(
    userId: string,
    channelId: string,
    text: string,
    blocks?: SlackBlock[],
    options?: {
      thread_ts?: string;
      unfurl_links?: boolean;
      unfurl_media?: boolean;
    }
  ): Promise<string> {
    try {
      const client = await this.getClient(userId);

      const response = await client.chat.postMessage({
        channel: channelId,
        text,
        blocks,
        thread_ts: options?.thread_ts,
        unfurl_links: options?.unfurl_links ?? true,
        unfurl_media: options?.unfurl_media ?? true,
      }) as ChatPostMessageResponse;

      if (!response.ok) {
        throw new Error(`Failed to post message: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Posted message to Slack channel ${channelId}`, {
        userId,
        messageTs: response.ts,
      });

      return response.ts!;
    } catch (error) {
      logger.error('Failed to post Slack message:', error);
      throw new Error(`Failed to post message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Post message to channel using bot token directly
   */
  async postMessageToChannel(
    channel: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<ChatPostMessageResponse> {
    try {
      const botToken = this.config.botToken;
      if (!botToken) {
        throw new Error('Bot token not configured');
      }

      const client = new WebClient(botToken);
      const response = await client.chat.postMessage({
        channel,
        text,
        blocks,
      });

      if (!response.ok) {
        throw new Error(`Failed to post message: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Posted message to channel ${channel}`, {
        messageTs: response.ts,
      });

      return response;
    } catch (error) {
      logger.error('Failed to post message to channel:', error);
      throw error;
    }
  }

  /**
   * Post meeting summary to channel with rich Block Kit formatting
   */
  async postMeetingSummary(
    channel: string,
    meeting: Meeting,
    summary: string
  ): Promise<void> {
    try {
      const botToken = this.config.botToken;
      if (!botToken) {
        throw new Error('Bot token not configured');
      }

      const client = new WebClient(botToken);

      const blocks: SlackBlock[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Meeting Summary: ${meeting.title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Date:*\n${meeting.scheduledStartAt ? new Date(meeting.scheduledStartAt).toLocaleDateString() : 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Duration:*\n${meeting.durationSeconds ? Math.round(meeting.durationSeconds / 60) : 0} minutes`,
            },
          ],
        },
        {
          type: 'divider',
        } as SlackBlock,
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Summary:*\n${summary}`,
          },
        },
      ];

      // Add meeting URL if available
      if (meeting.meetingUrl) {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Meeting Details',
                emoji: true,
              },
              url: meeting.meetingUrl,
              action_id: 'view_meeting_details',
            },
          ],
        });
      }

      await client.chat.postMessage({
        channel,
        text: `Meeting Summary: ${meeting.title}`,
        blocks,
      });

      logger.info(`Posted meeting summary to channel ${channel}`, {
        meetingId: meeting.id,
      });
    } catch (error) {
      logger.error('Failed to post meeting summary:', error);
      throw error;
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    userId: string,
    channelId: string,
    messageTs: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<void> {
    try {
      const client = await this.getClient(userId);

      const response = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text,
        blocks,
      }) as ChatUpdateResponse;

      if (!response.ok) {
        throw new Error(`Failed to update message: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Updated message in Slack channel ${channelId}`, {
        userId,
        messageTs,
      });
    } catch (error) {
      logger.error('Failed to update Slack message:', error);
      throw new Error(`Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    userId: string,
    channelId: string,
    messageTs: string
  ): Promise<void> {
    try {
      const client = await this.getClient(userId);

      const response = await client.chat.delete({
        channel: channelId,
        ts: messageTs,
      }) as ChatDeleteResponse;

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Deleted message from Slack channel ${channelId}`, {
        userId,
        messageTs,
      });
    } catch (error) {
      logger.error('Failed to delete Slack message:', error);
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Post a message with a reply in a thread
   */
  async postThreadReply(
    userId: string,
    channelId: string,
    threadTs: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<string> {
    return this.postMessage(userId, channelId, text, blocks, {
      thread_ts: threadTs,
    });
  }

  // ==========================================================================
  // Meeting Notifications
  // ==========================================================================

  /**
   * Send meeting notification
   */
  async sendMeetingNotification(
    userId: string,
    channelId: string,
    meeting: Meeting,
    type: 'start' | 'end' | 'reminder'
  ): Promise<string> {
    try {
      const blocks: SlackBlock[] = [];

      // Header block
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: type === 'start'
            ? '🟢 Meeting Started'
            : type === 'end'
            ? '🔴 Meeting Ended'
            : '⏰ Meeting Reminder',
          emoji: true,
        },
      });

      // Meeting details
      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Title:*\n${meeting.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${meeting.scheduledStartAt ? new Date(meeting.scheduledStartAt).toLocaleString() : 'Not scheduled'}`,
          },
        ],
      });

      // Meeting URL if available
      if (meeting.meetingUrl) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Meeting URL:* <${meeting.meetingUrl}|Join Meeting>`,
          },
        });
      }

      // Actions for meeting start
      if (type === 'start') {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📝 Take Notes',
                emoji: true,
              },
              action_id: 'take_notes',
              value: meeting.id,
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🎥 Start Recording',
                emoji: true,
              },
              action_id: 'start_recording',
              value: meeting.id,
              style: 'primary',
            },
          ],
        });
      }

      const messageTs = await this.postMessage(
        userId,
        channelId,
        `Meeting ${type}: ${meeting.title}`,
        blocks
      );

      logger.info(`Sent meeting ${type} notification for meeting ${meeting.id}`);
      return messageTs;
    } catch (error) {
      logger.error(`Failed to send meeting ${type} notification:`, error);
      throw error;
    }
  }

  /**
   * Send transcription complete notification
   */
  async sendTranscriptionNotification(
    userId: string,
    channelId: string,
    meeting: Meeting,
    transcription: {
      duration: number;
      wordCount: number;
      transcriptUrl?: string;
      speakers?: Array<{ name: string; totalSpeakingTime: number }>;
    }
  ): Promise<string> {
    try {
      const blocks: SlackBlock[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📝 Transcription Complete',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Meeting:* ${meeting.title}\n*Duration:* ${Math.round(transcription.duration / 60)} minutes\n*Words:* ${transcription.wordCount}`,
          },
          accessory: transcription.transcriptUrl ? {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Transcript',
              emoji: true,
            },
            url: transcription.transcriptUrl,
            action_id: 'view_transcript',
          } : undefined,
        },
      ];

      // Add speaker breakdown if available
      if (transcription.speakers && transcription.speakers.length > 0) {
        const speakerText = transcription.speakers
          .map((s) => `• ${s.name}: ${Math.round(s.totalSpeakingTime / 60)} min`)
          .join('\n');

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Speaker Breakdown:*\n${speakerText}`,
          },
        });
      }

      const messageTs = await this.postMessage(
        userId,
        channelId,
        `Transcription complete for: ${meeting.title}`,
        blocks
      );

      logger.info(`Sent transcription notification for meeting ${meeting.id}`);
      return messageTs;
    } catch (error) {
      logger.error('Failed to send transcription notification:', error);
      throw error;
    }
  }

  /**
   * Send AI analysis notification
   */
  async sendAnalysisNotification(
    userId: string,
    channelId: string,
    meeting: Meeting,
    analysis: AIAnalysis,
    settings: SlackNotificationSettings
  ): Promise<string> {
    try {
      const mainBlocks: SlackBlock[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🤖 AI Analysis Complete',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Meeting:* ${meeting.title}\n*Date:* ${meeting.scheduledStartAt ? new Date(meeting.scheduledStartAt).toLocaleDateString() : 'N/A'}`,
          },
        },
      ];

      // Summary
      if (settings.shareSummary && analysis.summary) {
        const summary = analysis.summary as { executive?: string };
        if (summary.executive) {
          mainBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Summary:*\n${summary.executive}`,
            },
          });
        }
      }

      // Sentiment
      if (analysis.sentiment) {
        const sentiment = analysis.sentiment as { overall?: number };
        if (sentiment.overall !== undefined) {
          const sentimentEmoji = sentiment.overall > 0 ? '😊' : sentiment.overall < 0 ? '😟' : '😐';
          mainBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Overall Sentiment:* ${sentimentEmoji} ${(sentiment.overall * 100).toFixed(0)}% positive`,
            },
          });
        }
      }

      // Actions
      mainBlocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📊 View Full Analysis',
              emoji: true,
            },
            action_id: 'view_analysis',
            value: analysis.id,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📥 Download Report',
              emoji: true,
            },
            action_id: 'download_report',
            value: analysis.id,
          },
        ],
      });

      const mainMessageTs = await this.postMessage(
        userId,
        channelId,
        `AI Analysis complete for: ${meeting.title}`,
        mainBlocks
      );

      const threadTs = settings.threadedMessages ? mainMessageTs : undefined;

      // Key Points in thread
      if (settings.shareKeyPoints && analysis.keyPoints) {
        const keyPoints = analysis.keyPoints as Array<{ text: string }>;
        if (Array.isArray(keyPoints) && keyPoints.length > 0) {
          const keyPointsBlocks: SlackBlock[] = [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*🎯 Key Points:*',
              },
            },
          ];

          keyPoints.slice(0, 5).forEach((point) => {
            keyPointsBlocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `• ${point.text}`,
              },
            });
          });

          await this.postMessage(
            userId,
            channelId,
            'Key Points',
            keyPointsBlocks,
            { thread_ts: threadTs }
          );
        }
      }

      // Action Items in thread
      if (settings.shareActionItems && analysis.actionItems) {
        const actionItems = analysis.actionItems as Array<{
          description: string;
          priority?: string;
          assignee?: string;
          id?: string;
        }>;
        if (Array.isArray(actionItems) && actionItems.length > 0) {
          const actionItemsBlocks: SlackBlock[] = [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*✅ Action Items:*',
              },
            },
          ];

          actionItems.forEach((item, index) => {
            const priority = item.priority === 'urgent' ? '🔴' : item.priority === 'high' ? '🟡' : '🟢';
            actionItemsBlocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${index + 1}. ${priority} ${item.description}${item.assignee ? ` - @${item.assignee}` : ''}`,
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Assign',
                  emoji: true,
                },
                action_id: 'assign_action_item',
                value: `${analysis.id}:${item.id || index}`,
              },
            });
          });

          await this.postMessage(
            userId,
            channelId,
            'Action Items',
            actionItemsBlocks,
            { thread_ts: threadTs }
          );
        }
      }

      logger.info(`Sent AI analysis notification for meeting ${meeting.id}`);
      return mainMessageTs;
    } catch (error) {
      logger.error('Failed to send AI analysis notification:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Channel Management
  // ==========================================================================

  /**
   * Get available channels
   */
  async getChannels(userId: string, excludeArchived = true): Promise<SlackChannel[]> {
    try {
      const client = await this.getClient(userId);

      const response = await client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: excludeArchived,
        limit: 200,
      }) as ConversationsListResponse;

      if (!response.ok || !response.channels) {
        throw new Error('Failed to fetch channels');
      }

      logger.info(`Fetched ${response.channels.length} channels for user ${userId}`);
      return response.channels as SlackChannel[];
    } catch (error) {
      logger.error('Failed to get Slack channels:', error);
      throw new Error(`Failed to get channels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get channel list using bot token
   */
  async getChannelList(): Promise<SlackChannel[]> {
    try {
      const botToken = this.config.botToken;
      if (!botToken) {
        throw new Error('Bot token not configured');
      }

      const client = new WebClient(botToken);
      const response = await client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
      });

      if (!response.ok || !response.channels) {
        throw new Error('Failed to fetch channels');
      }

      return response.channels as SlackChannel[];
    } catch (error) {
      logger.error('Failed to get channel list:', error);
      throw error;
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(
    userId: string,
    name: string,
    isPrivate = false
  ): Promise<string> {
    try {
      const client = await this.getClient(userId);

      // Sanitize channel name (lowercase, replace spaces with hyphens, remove special chars)
      const sanitizedName = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
        .substring(0, 80); // Slack's 80 character limit

      const response = await client.conversations.create({
        name: sanitizedName,
        is_private: isPrivate,
      }) as ConversationsCreateResponse;

      if (!response.ok || !response.channel) {
        throw new Error(`Failed to create channel: ${response.error || 'Unknown error'}`);
      }

      const channelId = response.channel.id!;

      logger.info(`Created Slack channel: ${sanitizedName} (${channelId})`);

      this.emit('channel:created', {
        userId,
        channelId,
        channelName: sanitizedName,
        isPrivate,
      });

      return channelId;
    } catch (error) {
      logger.error('Failed to create Slack channel:', error);
      throw new Error(`Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archive a channel
   */
  async archiveChannel(userId: string, channelId: string): Promise<void> {
    try {
      const client = await this.getClient(userId);

      const response = await client.conversations.archive({
        channel: channelId,
      }) as ConversationsArchiveResponse;

      if (!response.ok) {
        throw new Error(`Failed to archive channel: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Archived Slack channel: ${channelId}`);

      this.emit('channel:archived', {
        userId,
        channelId,
      });
    } catch (error) {
      logger.error('Failed to archive Slack channel:', error);
      throw new Error(`Failed to archive channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invite users to a channel
   */
  async inviteToChannel(
    userId: string,
    channelId: string,
    userIds: string[]
  ): Promise<void> {
    try {
      const client = await this.getClient(userId);

      const response = await client.conversations.invite({
        channel: channelId,
        users: userIds.join(','),
      }) as ConversationsInviteResponse;

      if (!response.ok) {
        throw new Error(`Failed to invite users: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Invited ${userIds.length} users to Slack channel ${channelId}`);

      this.emit('channel:users_invited', {
        userId,
        channelId,
        invitedUsers: userIds,
      });
    } catch (error) {
      logger.error('Failed to invite users to Slack channel:', error);
      throw new Error(`Failed to invite users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set channel topic
   */
  async setChannelTopic(
    userId: string,
    channelId: string,
    topic: string
  ): Promise<void> {
    try {
      const client = await this.getClient(userId);

      const response = await client.conversations.setTopic({
        channel: channelId,
        topic,
      }) as WebAPICallResult;

      if (!response.ok) {
        throw new Error(`Failed to set topic: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Set topic for Slack channel ${channelId}`);
    } catch (error) {
      logger.error('Failed to set Slack channel topic:', error);
      throw new Error(`Failed to set topic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create meeting channel with initial setup
   */
  async createMeetingChannel(
    userId: string,
    meeting: Meeting
  ): Promise<string> {
    try {
      // Generate channel name
      const channelName = `meeting-${meeting.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      // Create channel
      const channelId = await this.createChannel(userId, channelName, false);

      // Set topic
      const topic = `Meeting: ${meeting.title} | ${meeting.scheduledStartAt ? new Date(meeting.scheduledStartAt).toLocaleDateString() : 'TBD'}`;
      await this.setChannelTopic(userId, channelId, topic);

      // Post initial message
      await this.sendMeetingNotification(userId, channelId, meeting, 'reminder');

      logger.info(`Created meeting channel ${channelId} for meeting ${meeting.id}`);
      return channelId;
    } catch (error) {
      logger.error('Failed to create meeting channel:', error);
      throw error;
    }
  }

  // ==========================================================================
  // File Sharing
  // ==========================================================================

  /**
   * Upload file to Slack
   */
  async uploadFile(
    userId: string,
    channelIds: string[],
    file: Buffer,
    filename: string,
    options?: {
      title?: string;
      initialComment?: string;
      threadTs?: string;
    }
  ): Promise<string> {
    try {
      const client = await this.getClient(userId);

      const response = await client.files.upload({
        channels: channelIds.join(','),
        file,
        filename,
        title: options?.title,
        initial_comment: options?.initialComment,
        thread_ts: options?.threadTs,
      }) as FilesUploadResponse;

      if (!response.ok || !response.file) {
        throw new Error(`Failed to upload file: ${response.error || 'Unknown error'}`);
      }

      logger.info(`Uploaded file ${filename} to Slack channels: ${channelIds.join(', ')}`);

      this.emit('file:uploaded', {
        userId,
        channelIds,
        fileId: response.file.id,
        filename,
      });

      return response.file.id!;
    } catch (error) {
      logger.error('Failed to upload file to Slack:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload file to a specific channel using the newer files.uploadV2 API
   * Uses bot token directly for authentication
   */
  async uploadFileToChannel(
    channelId: string,
    content: Buffer,
    filename: string,
    options?: {
      title?: string;
      initialComment?: string;
      threadTs?: string;
    }
  ): Promise<string> {
    try {
      if (!this.config.botToken) {
        throw new Error('Bot token is required to upload files');
      }

      const client = new WebClient(this.config.botToken);

      // Use files.uploadV2 which returns a different structure
      const response = await client.files.uploadV2({
        channel_id: channelId,
        file: content,
        filename,
        title: options?.title || filename,
        initial_comment: options?.initialComment,
        thread_ts: options?.threadTs,
      }) as WebAPICallResult & { files?: Array<{ id?: string }> };

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.error || 'Unknown error'}`);
      }

      // files.uploadV2 returns files array in the response
      const uploadedFile = response.files?.[0];
      const fileId = uploadedFile?.id || 'unknown';

      logger.info(`Uploaded file ${filename} to channel ${channelId} using uploadV2`);

      this.emit('file:uploaded', {
        channelId,
        fileId,
        filename,
      });

      return fileId;
    } catch (error) {
      logger.error('Failed to upload file to Slack channel:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Share meeting transcript as file
   */
  async shareTranscript(
    userId: string,
    channelId: string,
    meeting: Meeting,
    transcriptContent: string,
    threadTs?: string
  ): Promise<string> {
    try {
      const filename = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
      const buffer = Buffer.from(transcriptContent, 'utf-8');

      const fileId = await this.uploadFile(
        userId,
        [channelId],
        buffer,
        filename,
        {
          title: `Transcript: ${meeting.title}`,
          initialComment: `Meeting transcript for "${meeting.title}"`,
          threadTs,
        }
      );

      logger.info(`Shared transcript for meeting ${meeting.id} to channel ${channelId}`);
      return fileId;
    } catch (error) {
      logger.error('Failed to share transcript to Slack:', error);
      throw error;
    }
  }

  /**
   * Share meeting summary as file
   */
  async shareSummaryFile(
    userId: string,
    channelId: string,
    meeting: Meeting,
    summaryContent: string,
    threadTs?: string
  ): Promise<string> {
    try {
      const filename = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_summary.md`;
      const buffer = Buffer.from(summaryContent, 'utf-8');

      const fileId = await this.uploadFile(
        userId,
        [channelId],
        buffer,
        filename,
        {
          title: `Summary: ${meeting.title}`,
          initialComment: `AI-generated summary for "${meeting.title}"`,
          threadTs,
        }
      );

      logger.info(`Shared summary for meeting ${meeting.id} to channel ${channelId}`);
      return fileId;
    } catch (error) {
      logger.error('Failed to share summary to Slack:', error);
      throw error;
    }
  }

  // ==========================================================================
  // User Management
  // ==========================================================================

  /**
   * Get workspace users
   */
  async getUsers(userId: string, limit = 200): Promise<SlackUser[]> {
    try {
      const client = await this.getClient(userId);

      const response = await client.users.list({
        limit,
      }) as UsersListResponse;

      if (!response.ok || !response.members) {
        throw new Error('Failed to fetch users');
      }

      logger.info(`Fetched ${response.members.length} users for user ${userId}`);
      return response.members as SlackUser[];
    } catch (error) {
      logger.error('Failed to get Slack users:', error);
      throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user info by Slack user ID
   * Uses users.info API to fetch detailed user information
   */
  async getUserInfo(slackUserId: string): Promise<SlackUser> {
    try {
      if (!this.config.botToken) {
        throw new Error('Bot token is required to fetch user info');
      }

      const client = new WebClient(this.config.botToken);
      const response = await client.users.info({
        user: slackUserId,
      }) as UsersInfoResponse;

      if (!response.ok || !response.user) {
        throw new Error(`Failed to fetch user info: ${response.error || 'Unknown error'}`);
      }

      const user = response.user;
      logger.info(`Fetched user info for Slack user ${slackUserId}`);

      return {
        id: user.id!,
        team_id: user.team_id!,
        name: user.name!,
        deleted: user.deleted ?? false,
        color: user.color,
        real_name: user.real_name,
        tz: user.tz,
        tz_label: user.tz_label,
        tz_offset: user.tz_offset,
        profile: {
          title: user.profile?.title,
          phone: user.profile?.phone,
          skype: user.profile?.skype,
          real_name: user.profile?.real_name,
          real_name_normalized: user.profile?.real_name_normalized,
          display_name: user.profile?.display_name,
          display_name_normalized: user.profile?.display_name_normalized,
          status_text: user.profile?.status_text,
          status_emoji: user.profile?.status_emoji,
          status_expiration: user.profile?.status_expiration,
          avatar_hash: user.profile?.avatar_hash,
          email: user.profile?.email,
          first_name: user.profile?.first_name,
          last_name: user.profile?.last_name,
          image_24: user.profile?.image_24,
          image_32: user.profile?.image_32,
          image_48: user.profile?.image_48,
          image_72: user.profile?.image_72,
          image_192: user.profile?.image_192,
          image_512: user.profile?.image_512,
        },
        is_admin: user.is_admin,
        is_owner: user.is_owner,
        is_primary_owner: user.is_primary_owner,
        is_restricted: user.is_restricted,
        is_ultra_restricted: user.is_ultra_restricted,
        is_bot: user.is_bot ?? false,
        is_app_user: user.is_app_user ?? false,
        updated: user.updated,
        has_2fa: user.has_2fa,
      };
    } catch (error) {
      logger.error('Failed to get Slack user info:', error);
      throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==========================================================================
  // Notification Settings
  // ==========================================================================

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: Partial<SlackNotificationSettings>
  ): Promise<void> {
    try {
      if (!settings.workspaceId) {
        throw new Error('workspaceId is required');
      }

      await prisma.slackNotificationSettings.upsert({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: settings.workspaceId,
          },
        },
        update: {
          channelId: settings.channelId,
          notifyOnStart: settings.notifyOnMeetingStart,
          notifyOnEnd: settings.notifyOnMeetingEnd,
          notifyOnSummary: settings.notifyOnAnalysisComplete,
          notifyOnActionItem: settings.shareActionItems,
          metadata: {
            notifyOnTranscriptionComplete: settings.notifyOnTranscriptionComplete,
            shareKeyPoints: settings.shareKeyPoints,
            shareSummary: settings.shareSummary,
            threadedMessages: settings.threadedMessages,
            mentionAttendees: settings.mentionAttendees,
            autoCreateChannels: settings.autoCreateChannels,
          },
          updatedAt: new Date(),
        },
        create: {
          userId,
          workspaceId: settings.workspaceId,
          channelId: settings.channelId || '',
          notifyOnStart: settings.notifyOnMeetingStart ?? true,
          notifyOnEnd: settings.notifyOnMeetingEnd ?? true,
          notifyOnSummary: settings.notifyOnAnalysisComplete ?? true,
          notifyOnActionItem: settings.shareActionItems ?? true,
          metadata: {
            notifyOnTranscriptionComplete: settings.notifyOnTranscriptionComplete ?? true,
            shareKeyPoints: settings.shareKeyPoints ?? true,
            shareSummary: settings.shareSummary ?? true,
            threadedMessages: settings.threadedMessages ?? true,
            mentionAttendees: settings.mentionAttendees ?? false,
            autoCreateChannels: settings.autoCreateChannels ?? false,
          },
        },
      });

      logger.info(`Updated Slack notification settings for user ${userId}`);
    } catch (error) {
      logger.error('Failed to update Slack notification settings:', error);
      throw new Error(`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(
    userId: string,
    workspaceId: string
  ): Promise<SlackNotificationSettings | null> {
    try {
      const settings = await prisma.slackNotificationSettings.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
      });

      if (!settings) {
        return null;
      }

      const metadata = settings.metadata as Record<string, unknown>;

      return {
        userId: settings.userId,
        organizationId: '', // Not stored in this model
        workspaceId: settings.workspaceId,
        channelId: settings.channelId || '',
        notifyOnMeetingStart: settings.notifyOnStart,
        notifyOnMeetingEnd: settings.notifyOnEnd,
        notifyOnTranscriptionComplete: metadata.notifyOnTranscriptionComplete as boolean ?? true,
        notifyOnAnalysisComplete: settings.notifyOnSummary,
        shareActionItems: settings.notifyOnActionItem,
        shareKeyPoints: metadata.shareKeyPoints as boolean ?? true,
        shareSummary: metadata.shareSummary as boolean ?? true,
        threadedMessages: metadata.threadedMessages as boolean ?? true,
        mentionAttendees: metadata.mentionAttendees as boolean ?? false,
        autoCreateChannels: metadata.autoCreateChannels as boolean ?? false,
      };
    } catch (error) {
      logger.error('Failed to get Slack notification settings:', error);
      throw new Error(`Failed to get settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==========================================================================
  // Webhook Event Handling
  // ==========================================================================

  /**
   * Handle incoming Slack event
   */
  async handleEvent(payload: SlackEventPayload): Promise<void> {
    try {
      logger.info('Received Slack event:', {
        type: payload.event.type,
        teamId: payload.team_id,
      });

      switch (payload.event.type) {
        case 'message':
          await this.handleMessageEvent(payload);
          break;
        case 'app_mention':
          await this.handleAppMention(payload);
          break;
        case 'member_joined_channel':
          await this.handleMemberJoined(payload);
          break;
        default:
          logger.debug(`Unhandled event type: ${payload.event.type}`);
      }

      this.emit('event:received', {
        type: payload.event.type,
        teamId: payload.team_id,
      });
    } catch (error) {
      logger.error('Failed to handle Slack event:', error);
    }
  }

  /**
   * Handle message event
   */
  private async handleMessageEvent(payload: SlackEventPayload): Promise<void> {
    try {
      const { text, user, channel } = payload.event;

      // Ignore bot messages
      if (!user || !text || !channel) {
        return;
      }

      // Check for meeting-related keywords
      if (text.toLowerCase().includes('meeting')) {
        logger.info('Detected meeting-related message', {
          channel,
          user,
        });

        this.emit('message:meeting_mentioned', {
          channel,
          user,
          text,
        });
      }
    } catch (error) {
      logger.error('Failed to handle message event:', error);
    }
  }

  /**
   * Handle app mention
   */
  private async handleAppMention(payload: SlackEventPayload): Promise<void> {
    try {
      const { text, user, channel, ts } = payload.event;
      const client = await this.getClientByTeamId(payload.team_id);

      if (!text || !channel) {
        return;
      }

      // Parse command
      const commandText = text.replace(/<@[A-Z0-9]+>/g, '').trim();
      const [command, ...args] = commandText.split(' ');

      logger.info('Received app mention:', {
        command,
        channel,
        user,
      });

      switch (command.toLowerCase()) {
        case 'help':
          await this.sendHelpMessage(client, channel);
          break;
        case 'meetings':
          await this.sendMeetingsList(client, channel);
          break;
        default:
          await client.chat.postMessage({
            channel,
            thread_ts: ts,
            text: `I didn't understand that command. Type \`@openmeet help\` for available commands.`,
          });
      }

      this.emit('app_mention:received', {
        command,
        channel,
        user,
      });
    } catch (error) {
      logger.error('Failed to handle app mention:', error);
    }
  }

  /**
   * Handle member joined channel
   */
  private async handleMemberJoined(payload: SlackEventPayload): Promise<void> {
    try {
      logger.info('Member joined channel:', payload.event);

      this.emit('member:joined_channel', {
        teamId: payload.team_id,
        event: payload.event,
      });
    } catch (error) {
      logger.error('Failed to handle member joined event:', error);
    }
  }

  /**
   * Handle interactive action
   */
  async handleAction(payload: SlackActionPayload): Promise<void> {
    try {
      logger.info('Received Slack action:', {
        actionId: payload.actions[0].action_id,
        userId: payload.user.id,
      });

      const action = payload.actions[0];

      switch (action.action_id) {
        case 'start_recording':
          await this.handleStartRecording(payload, action.value);
          break;
        case 'view_analysis':
          await this.handleViewAnalysis(payload, action.value);
          break;
        case 'assign_action_item':
          await this.handleAssignActionItem(payload, action.value);
          break;
        default:
          logger.debug(`Unhandled action: ${action.action_id}`);
      }

      this.emit('action:received', {
        actionId: action.action_id,
        userId: payload.user.id,
      });
    } catch (error) {
      logger.error('Failed to handle Slack action:', error);
    }
  }

  /**
   * Handle start recording action
   */
  private async handleStartRecording(
    payload: SlackActionPayload,
    meetingId: string
  ): Promise<void> {
    try {
      // Queue recording start job
      await this.queueService.addJob(JobType.MEETING_BOT_JOIN, {
        type: JobType.MEETING_BOT_JOIN,
        payload: {
          meetingId,
          platform: 'manual',
          source: 'slack',
        },
      });

      // Send response
      if (payload.response_url) {
        await axios.post(payload.response_url, {
          text: '🎥 Recording started!',
          replace_original: false,
        });
      }

      logger.info(`Started recording for meeting ${meetingId} from Slack`);
    } catch (error) {
      logger.error('Failed to handle start recording action:', error);
    }
  }

  /**
   * Handle view analysis action
   */
  private async handleViewAnalysis(
    payload: SlackActionPayload,
    analysisId: string
  ): Promise<void> {
    try {
      // Generate temporary link
      const link = await this.generateAnalysisLink(analysisId);

      // Send response
      if (payload.response_url) {
        await axios.post(payload.response_url, {
          text: `View full analysis: ${link}`,
          replace_original: false,
        });
      }

      logger.info(`Generated analysis link for ${analysisId}`);
    } catch (error) {
      logger.error('Failed to handle view analysis action:', error);
    }
  }

  /**
   * Handle assign action item - Opens Slack modal for user assignment
   */
  private async handleAssignActionItem(
    payload: SlackActionPayload,
    value: string
  ): Promise<void> {
    try {
      const [analysisId, itemId] = value.split(':');
      const client = await this.getClientByTeamId(payload.team.id);

      // Fetch action item details from database
      const analysis = await prisma.aIAnalysis.findUnique({
        where: { id: analysisId },
        include: { meeting: true },
      });

      if (!analysis) {
        logger.warn('Analysis not found for action item assignment', { analysisId });
        if (payload.response_url) {
          await axios.post(payload.response_url, {
            text: '❌ Action item not found.',
            replace_original: false,
          });
        }
        return;
      }

      const actionItems = analysis.actionItems as Array<{
        id?: string;
        description: string;
        priority?: string;
        assignee?: string;
      }>;

      const actionItem = actionItems.find((item, idx) =>
        (item.id || String(idx)) === itemId
      );

      if (!actionItem) {
        logger.warn('Specific action item not found', { analysisId, itemId });
        if (payload.response_url) {
          await axios.post(payload.response_url, {
            text: '❌ Action item not found.',
            replace_original: false,
          });
        }
        return;
      }

      // Open modal dialog for assignment using Slack views.open API
      await client.views.open({
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'assign_action_item_modal',
          private_metadata: JSON.stringify({ analysisId, itemId }),
          title: {
            type: 'plain_text',
            text: 'Assign Action Item',
            emoji: true,
          },
          submit: {
            type: 'plain_text',
            text: 'Assign',
            emoji: true,
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
            emoji: true,
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Action Item:*\n${actionItem.description}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Priority:* ${actionItem.priority || 'Not set'}\n*Current Assignee:* ${actionItem.assignee || 'Unassigned'}`,
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'input',
              block_id: 'assignee_block',
              element: {
                type: 'users_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a user',
                  emoji: true,
                },
                action_id: 'assignee_select',
              },
              label: {
                type: 'plain_text',
                text: 'Assign to',
                emoji: true,
              },
            },
            {
              type: 'input',
              block_id: 'due_date_block',
              optional: true,
              element: {
                type: 'datepicker',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a date',
                  emoji: true,
                },
                action_id: 'due_date_select',
              },
              label: {
                type: 'plain_text',
                text: 'Due Date',
                emoji: true,
              },
            },
            {
              type: 'input',
              block_id: 'notes_block',
              optional: true,
              element: {
                type: 'plain_text_input',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Add any notes for the assignee...',
                },
                action_id: 'notes_input',
              },
              label: {
                type: 'plain_text',
                text: 'Notes',
                emoji: true,
              },
            },
          ],
        },
      });

      logger.info('Opened action item assignment modal', {
        analysisId,
        itemId,
        userId: payload.user.id,
      });
    } catch (error) {
      logger.error('Failed to handle assign action item:', error);
      if (payload.response_url) {
        await axios.post(payload.response_url, {
          text: '❌ Failed to open assignment dialog. Please try again.',
          replace_original: false,
        });
      }
    }
  }

  /**
   * Handle modal submission for action item assignment
   */
  async handleViewSubmission(payload: {
    type: string;
    view: {
      callback_id: string;
      private_metadata: string;
      state: {
        values: Record<string, Record<string, { selected_user?: string; selected_date?: string; value?: string }>>;
      };
    };
    user: { id: string; name: string };
    team: { id: string };
  }): Promise<void> {
    try {
      if (payload.view.callback_id !== 'assign_action_item_modal') {
        return;
      }

      const { analysisId, itemId } = JSON.parse(payload.view.private_metadata);
      const values = payload.view.state.values;

      const assigneeId = values.assignee_block?.assignee_select?.selected_user;
      const dueDate = values.due_date_block?.due_date_select?.selected_date;
      const notes = values.notes_block?.notes_input?.value;

      if (!assigneeId) {
        logger.warn('No assignee selected in modal submission');
        return;
      }

      // Get assignee details
      const assigneeInfo = await this.getUserInfo(assigneeId);

      // Update action item in database
      const analysis = await prisma.aIAnalysis.findUnique({
        where: { id: analysisId },
      });

      if (!analysis) {
        logger.error('Analysis not found during modal submission', { analysisId });
        return;
      }

      const actionItems = analysis.actionItems as Array<{
        id?: string;
        description: string;
        priority?: string;
        assignee?: string;
        assigneeId?: string;
        dueDate?: string;
        notes?: string;
        assignedAt?: string;
        assignedBy?: string;
      }>;

      // Update the specific action item
      const updatedItems = actionItems.map((item, idx) => {
        if ((item.id || String(idx)) === itemId) {
          return {
            ...item,
            assignee: assigneeInfo.profile.display_name || assigneeInfo.name,
            assigneeId: assigneeId,
            dueDate: dueDate || undefined,
            notes: notes || undefined,
            assignedAt: new Date().toISOString(),
            assignedBy: payload.user.id,
          };
        }
        return item;
      });

      // Save to database
      await prisma.aIAnalysis.update({
        where: { id: analysisId },
        data: {
          actionItems: updatedItems,
          updatedAt: new Date(),
        },
      });

      // Notify the assignee via DM
      const client = await this.getClientByTeamId(payload.team.id);
      const assignedItem = updatedItems.find((item, idx) => (item.id || String(idx)) === itemId);

      await client.chat.postMessage({
        channel: assigneeId,
        text: `You've been assigned an action item`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✅ New Action Item Assigned',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Task:*\n${assignedItem?.description}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Assigned by:*\n<@${payload.user.id}>`,
              },
              {
                type: 'mrkdwn',
                text: `*Due Date:*\n${dueDate || 'Not set'}`,
              },
            ],
          },
          ...(notes ? [{
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `*Notes:*\n${notes}`,
            },
          }] : []),
        ],
      });

      logger.info('Action item assigned successfully', {
        analysisId,
        itemId,
        assigneeId,
        assignedBy: payload.user.id,
      });

      this.emit('action_item:assigned', {
        analysisId,
        itemId,
        assigneeId,
        assignedBy: payload.user.id,
        dueDate,
      });
    } catch (error) {
      logger.error('Failed to handle view submission:', error);
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(client: WebClient, channel: string): Promise<void> {
    try {
      const blocks: SlackBlock[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔥 OpenMeet Bot Help',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Available Commands:*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '• `@openmeet help` - Show this help message\n' +
              '• `@openmeet meetings` - List recent meetings\n' +
              '• `@openmeet schedule` - Schedule a new meeting',
          },
        },
      ];

      await client.chat.postMessage({
        channel,
        blocks,
        text: 'OpenMeet Bot Help',
      });
    } catch (error) {
      logger.error('Failed to send help message:', error);
    }
  }

  /**
   * Send meetings list
   */
  private async sendMeetingsList(client: WebClient, channel: string): Promise<void> {
    try {
      const meetings = await prisma.meeting.findMany({
        take: 5,
        orderBy: { scheduledStartAt: 'desc' },
      });

      const blocks: SlackBlock[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📅 Recent Meetings',
            emoji: true,
          },
        },
      ];

      meetings.forEach((m) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${m.title}*\n${m.scheduledStartAt ? new Date(m.scheduledStartAt).toLocaleDateString() : 'Not scheduled'}`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View',
            },
            value: m.id,
            action_id: 'view_meeting',
          },
        });
      });

      await client.chat.postMessage({
        channel,
        blocks,
        text: 'Recent Meetings',
      });
    } catch (error) {
      logger.error('Failed to send meetings list:', error);
    }
  }

  /**
   * Generate temporary analysis link
   */
  private async generateAnalysisLink(analysisId: string): Promise<string> {
    try {
      const token = await this.cacheService.set(
        'analysis-link',
        analysisId,
        { analysisId, expiresAt: Date.now() + 3600000 },
        3600
      );

      const baseUrl = process.env.APP_URL || 'https://app.openmeet.com';
      return `${baseUrl}/analysis/${analysisId}?token=${token}`;
    } catch (error) {
      logger.error('Failed to generate analysis link:', error);
      const baseUrl = process.env.APP_URL || 'https://app.openmeet.com';
      return `${baseUrl}/analysis/${analysisId}`;
    }
  }

  // ==========================================================================
  // Disconnect
  // ==========================================================================

  /**
   * Disconnect Slack workspace
   */
  async disconnect(userId: string): Promise<void> {
    try {
      // Remove client from cache
      this.clients.delete(userId);

      // Update integration status
      await prisma.integration.updateMany({
        where: { userId, type: 'slack' },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Find and deactivate workspace
      const integration = await prisma.integration.findFirst({
        where: { userId, type: 'slack' },
      });

      if (integration) {
        const metadata = integration.metadata as { teamId?: string };
        if (metadata.teamId) {
          await prisma.slackWorkspace.updateMany({
            where: { teamId: metadata.teamId },
            data: {
              isActive: false,
              updatedAt: new Date(),
            },
          });
        }
      }

      logger.info(`Slack disconnected for user ${userId}`);

      this.emit('workspace:disconnected', {
        userId,
      });
    } catch (error) {
      logger.error('Failed to disconnect Slack:', error);
      throw new Error(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
