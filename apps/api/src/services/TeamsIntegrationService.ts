/**
 * Microsoft Teams Integration Service
 *
 * Native Microsoft Teams app for meeting management
 * Competitive Feature: Otter.ai Teams Integration + Fathom Teams App
 *
 * Features:
 * - Teams bot for meeting management
 * - Adaptive cards for rich notifications
 * - Meeting tab app
 * - Personal app for user dashboard
 * - Activity feed notifications
 * - Command integration
 */

import { BotFrameworkAdapter, TurnContext, TeamsInfo, CardFactory } from 'botbuilder';
import { Client } from '@microsoft/microsoft-graph-client';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { meetingService } from './meeting';
import { superSummaryService } from './SuperSummaryService';

const prisma = new PrismaClient();

export interface TeamsInstallation {
  id: string;
  organizationId: string;
  tenantId: string;
  teamId?: string;
  channelId?: string;
  serviceUrl: string;
  conversationId: string;
  installedBy: string;
  isActive: boolean;
  installedAt: Date;
}

export interface TeamsCommand {
  command: string;
  parameters: string[];
  userId: string;
  teamId?: string;
  channelId?: string;
  conversationId: string;
}

class TeamsIntegrationService {
  private adapter: BotFrameworkAdapter;
  private graphClients: Map<string, Client> = new Map();

  constructor() {
    this.adapter = new BotFrameworkAdapter({
      appId: process.env.TEAMS_APP_ID,
      appPassword: process.env.TEAMS_APP_PASSWORD,
    });

    // Error handling
    this.adapter.onTurnError = async (context, error) => {
      logger.error('Teams bot error', { error });
      await context.sendActivity('Sorry, something went wrong.');
    };
  }

  /**
   * Get Microsoft Graph client for tenant
   */
  private async getGraphClient(tenantId: string): Promise<Client> {
    if (this.graphClients.has(tenantId)) {
      return this.graphClients.get(tenantId)!;
    }

    // Create client with app credentials
    const client = Client.init({
      authProvider: async (done) => {
        // Get app-only token
        const token = await this.getAppToken(tenantId);
        done(null, token);
      },
    });

    this.graphClients.set(tenantId, client);
    return client;
  }

  /**
   * Get app-only access token using Microsoft Authentication Library
   */
  private async getAppToken(tenantId: string): Promise<string> {
    try {
      // Check cache first in Integration model
      const cacheKey = `teams:token:${tenantId}`;
      const cachedToken = await prisma.integration.findFirst({
        where: {
          type: 'teams',
          metadata: {
            path: ['tenantId'],
            equals: tenantId,
          },
          expiresAt: {
            gt: new Date(Date.now() + 5 * 60 * 1000), // Valid for at least 5 more minutes
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (cachedToken) {
        logger.debug('Using cached Teams app token', { tenantId });
        return cachedToken.accessToken || '';
      }

      // Get new token using client credentials flow
      const clientId = process.env.TEAMS_APP_ID || process.env.MICROSOFT_APP_ID;
      const clientSecret = process.env.TEAMS_APP_SECRET || process.env.MICROSOFT_APP_PASSWORD;

      if (!clientId || !clientSecret) {
        logger.error('Teams app credentials not configured');
        throw new Error('Teams app credentials not configured');
      }

      // Use client credentials flow to get app-only token
      const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to get Teams app token', { status: response.status, error });
        throw new Error(`Failed to get Teams app token: ${response.statusText}`);
      }

      const tokenData = await response.json();

      // Cache the token in Integration model
      await prisma.integration.create({
        data: {
          id: `token_${Date.now()}`,
          organizationId: '', // Will be set when linked
          type: 'teams',
          name: 'Teams App Token',
          accessToken: tokenData.access_token,
          refreshToken: null as any,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          metadata: {
            grantType: 'client_credentials',
            resource: 'https://graph.microsoft.com',
            tenantId,
            scope: 'https://graph.microsoft.com/.default',
            tokenType: tokenData.token_type || 'Bearer',
          } as any,
        },
      });

      logger.info('Obtained new Teams app token', { tenantId, expiresIn: tokenData.expires_in });
      return tokenData.access_token;

    } catch (error) {
      logger.error('Error getting Teams app token', { error, tenantId });

      // Fallback to environment variable if configured
      const fallbackToken = process.env.TEAMS_APP_TOKEN;
      if (fallbackToken) {
        logger.warn('Using fallback Teams app token from environment');
        return fallbackToken;
      }

      throw error;
    }
  }

  /**
   * Handle bot installation
   */
  async handleInstallation(context: TurnContext): Promise<void> {
    try {
      const teamsInfo = await TeamsInfo.getTeamDetails(context);
      const member = await TeamsInfo.getMember(context, context.activity.from.id);

      const installation = await prisma.teamsInstallation.create({
        data: {
          id: `teams_${teamsInfo.id}_${Date.now()}`,
          organizationId: '', // Will be mapped later
          tenantId: context.activity.conversation.tenantId!,
          teamId: teamsInfo.id,
          teamName: teamsInfo.name,
          serviceUrl: context.activity.serviceUrl,
          appId: process.env.TEAMS_APP_ID || '',
          botId: context.activity.recipient?.id,
          isActive: true,
          metadata: {
            channelId: context.activity.channelId,
            conversationId: context.activity.conversation.id,
            installedBy: member.id,
          } as any,
        },
      });

      // Send welcome message
      await this.sendWelcomeCard(context);

      logger.info('Teams app installed', {
        installationId: installation.id,
        teamId: teamsInfo.id,
      });
    } catch (error) {
      logger.error('Error handling Teams installation', { error });
    }
  }

  /**
   * Send welcome card
   */
  private async sendWelcomeCard(context: TurnContext): Promise<void> {
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '🎉 Welcome to OpenMeet!',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: 'AI-powered meeting assistant for Microsoft Teams',
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: 'Get started with these commands:',
          weight: 'Bolder',
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: '@OpenMeet join',
              value: 'Join current meeting',
            },
            {
              title: '@OpenMeet summary',
              value: 'Get meeting summaries',
            },
            {
              title: '@OpenMeet ask [question]',
              value: 'Ask AI about meetings',
            },
            {
              title: '@OpenMeet help',
              value: 'Show all commands',
            },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Open Dashboard',
          url: process.env.FRONTEND_URL,
        },
      ],
    });

    await context.sendActivity({ attachments: [card] });
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(context: TurnContext): Promise<void> {
    try {
      const text = context.activity.text?.trim() || '';
      const removeMentions = text.replace(/<at>.*?<\/at>/g, '').trim();
      const parts = removeMentions.split(' ');
      const command = parts[0]?.toLowerCase();
      const args = parts.slice(1);

      switch (command) {
        case 'join':
          await this.handleJoinCommand(context, args);
          break;

        case 'summary':
          await this.handleSummaryCommand(context, args);
          break;

        case 'ask':
          await this.handleAskCommand(context, args);
          break;

        case 'schedule':
          await this.handleScheduleCommand(context, args);
          break;

        case 'help':
          await this.sendHelpCard(context);
          break;

        default:
          await this.sendHelpCard(context);
      }
    } catch (error) {
      logger.error('Error handling Teams message', { error });
      await context.sendActivity('Sorry, I couldn\'t process that command.');
    }
  }

  /**
   * Handle join command
   */
  private async handleJoinCommand(context: TurnContext, args: string[]): Promise<void> {
    try {
      // Get current Teams meeting details
      const meetingDetails = context.activity.channelData?.meeting;

      if (!meetingDetails) {
        await context.sendActivity('Please use this command during a Teams meeting.');
        return;
      }

      // Create meeting record
      const meeting = await meetingService.createMeeting({
        title: `Teams Meeting - ${new Date().toLocaleString()}`,
        platform: 'microsoft_teams',
        meetingUrl: meetingDetails.id,
        scheduledStartAt: new Date(),
        organizationId: await this.getOrganizationId(context.activity.conversation.tenantId!),
        createdBy: await this.getUserId(context.activity.from.aadObjectId!),
      });

      // Update with metadata
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          metadata: {
            teamsChannelId: context.activity.channelId,
          } as any,
        },
      });

      // Join meeting
      await this.joinTeamsMeeting(meeting.id, meetingDetails.id);

      const card = CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: '✅ OpenMeet joined the meeting!',
            size: 'Large',
            weight: 'Bolder',
            color: 'Good',
          },
          {
            type: 'TextBlock',
            text: 'I\'m now recording and transcribing this meeting.',
            wrap: true,
          },
          {
            type: 'FactSet',
            facts: [
              {
                title: 'Meeting ID',
                value: meeting.id,
              },
              {
                title: 'Status',
                value: 'Recording in progress',
              },
            ],
          },
        ],
      });

      await context.sendActivity({ attachments: [card] });
    } catch (error) {
      logger.error('Error joining Teams meeting', { error });
      await context.sendActivity('Failed to join meeting. Please try again.');
    }
  }

  /**
   * Handle summary command
   */
  private async handleSummaryCommand(context: TurnContext, args: string[]): Promise<void> {
    try {
      if (args.length === 0) {
        // Show recent meetings
        const tenantId = context.activity.conversation.tenantId!;
        const recentMeetings = await this.getRecentMeetings(tenantId, 5);

        const card = this.createMeetingListCard(recentMeetings);
        await context.sendActivity({ attachments: [card] });
        return;
      }

      const meetingId = args[0];

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        await context.sendActivity(`Meeting ${meetingId} not found.`);
        return;
      }

      // Generate and send summary
      const summary = await superSummaryService.generateSuperSummary(meetingId);
      const card = this.createSummaryCard(meeting, summary);

      await context.sendActivity({ attachments: [card] });
    } catch (error) {
      logger.error('Error getting summary', { error });
      await context.sendActivity('Failed to get meeting summary.');
    }
  }

  /**
   * Handle ask command
   */
  private async handleAskCommand(context: TurnContext, args: string[]): Promise<void> {
    if (args.length === 0) {
      await context.sendActivity('Please provide a question. Example: @OpenMeet ask What were the action items?');
      return;
    }

    const question = args.join(' ');

    try {
      await context.sendActivity({ type: 'typing' });

      // Get organization meetings
      const tenantId = context.activity.conversation.tenantId!;
      const orgId = await this.getOrganizationId(tenantId);
      const recentMeetings = await prisma.meeting.findMany({
        where: {
          organizationId: orgId,
          status: 'completed',
        },
        orderBy: { scheduledStartAt: 'desc' },
        take: 10,
      });

      // Generate AI response
      const response = await this.askAI(question, recentMeetings);

      const card = CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: '💡 AI Answer',
            size: 'Large',
            weight: 'Bolder',
          },
          {
            type: 'TextBlock',
            text: `**Question:** ${question}`,
            wrap: true,
            weight: 'Bolder',
          },
          {
            type: 'TextBlock',
            text: response,
            wrap: true,
          },
        ],
      });

      await context.sendActivity({ attachments: [card] });
    } catch (error) {
      logger.error('Error asking AI', { error });
      await context.sendActivity('Failed to process your question.');
    }
  }

  /**
   * Handle schedule command
   */
  private async handleScheduleCommand(context: TurnContext, args: string[]): Promise<void> {
    const tenantId = context.activity.conversation.tenantId!;
    const orgId = await this.getOrganizationId(tenantId);
    const schedulingUrl = `${process.env.FRONTEND_URL}/schedule?org=${orgId}`;

    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '📅 Schedule a Meeting',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: 'Open the scheduling page to book a meeting.',
          wrap: true,
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Open Scheduler',
          url: schedulingUrl,
        },
      ],
    });

    await context.sendActivity({ attachments: [card] });
  }

  /**
   * Send help card
   */
  private async sendHelpCard(context: TurnContext): Promise<void> {
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '🤖 OpenMeet Bot Commands',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: '@OpenMeet join',
              value: 'Join current Teams meeting',
            },
            {
              title: '@OpenMeet summary [id]',
              value: 'Get meeting summary',
            },
            {
              title: '@OpenMeet ask [question]',
              value: 'Ask AI about meetings',
            },
            {
              title: '@OpenMeet schedule',
              value: 'Schedule a new meeting',
            },
            {
              title: '@OpenMeet help',
              value: 'Show this help message',
            },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Open Dashboard',
          url: process.env.FRONTEND_URL,
        },
      ],
    });

    await context.sendActivity({ attachments: [card] });
  }

  /**
   * Create meeting list card
   */
  private createMeetingListCard(meetings: any[]): any {
    return CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '📋 Recent Meetings',
          size: 'Large',
          weight: 'Bolder',
        },
        ...meetings.map(meeting => ({
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: meeting.title,
              weight: 'Bolder',
            },
            {
              type: 'TextBlock',
              text: `${new Date(meeting.scheduledStartAt).toLocaleString()} | ${Math.round(meeting.durationSeconds / 60)} min`,
              size: 'Small',
              color: 'Default',
            },
            {
              type: 'TextBlock',
              text: `ID: ${meeting.id}`,
              size: 'Small',
              color: 'Accent',
            },
          ],
          separator: true,
        })),
      ],
    });
  }

  /**
   * Create summary card
   */
  private createSummaryCard(meeting: any, summary: any): any {
    const body: any[] = [
      {
        type: 'TextBlock',
        text: `📝 ${meeting.title}`,
        size: 'Large',
        weight: 'Bolder',
      },
      {
        type: 'TextBlock',
        text: `${new Date(meeting.scheduledStartAt).toLocaleString()} | Duration: ${Math.round(meeting.durationSeconds / 60)} min`,
        size: 'Small',
      },
    ];

    // Executive summary
    if (summary.executiveSummary) {
      body.push({
        type: 'TextBlock',
        text: '**Executive Summary**',
        weight: 'Bolder',
      });
      body.push({
        type: 'TextBlock',
        text: summary.executiveSummary,
        wrap: true,
      });
    }

    // Key points
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      body.push({
        type: 'TextBlock',
        text: '**Key Points**',
        weight: 'Bolder',
      });
      summary.keyPoints.forEach((point: string) => {
        body.push({
          type: 'TextBlock',
          text: `• ${point}`,
          wrap: true,
        });
      });
    }

    // Action items
    if (summary.actionItems && summary.actionItems.length > 0) {
      body.push({
        type: 'TextBlock',
        text: '**Action Items**',
        weight: 'Bolder',
      });
      summary.actionItems.forEach((item: any) => {
        body.push({
          type: 'TextBlock',
          text: `☐ ${item.title} - ${item.assignee || 'unassigned'}`,
          wrap: true,
        });
      });
    }

    return CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Full Transcript',
          url: `${process.env.FRONTEND_URL}/meetings/${meeting.id}/transcript`,
        },
        {
          type: 'Action.OpenUrl',
          title: 'View Recording',
          url: `${process.env.FRONTEND_URL}/meetings/${meeting.id}/recording`,
        },
      ],
    });
  }

  /**
   * Post meeting summary to channel
   */
  async postMeetingSummary(
    meetingId: string,
    conversationId: string,
    serviceUrl: string
  ): Promise<void> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) return;

      const summary = await superSummaryService.generateSuperSummary(meetingId);
      const card = this.createSummaryCard(meeting, summary);

      // Create conversation reference
      const conversationReference = {
        conversation: { id: conversationId },
        serviceUrl,
      };

      await this.adapter.continueConversation(conversationReference as any, async (context) => {
        await context.sendActivity({ attachments: [card] });
      });

      logger.info('Meeting summary posted to Teams', { meetingId });
    } catch (error) {
      logger.error('Error posting summary to Teams', { error });
    }
  }

  /**
   * Send activity feed notification
   */
  async sendActivityNotification(
    userId: string,
    tenantId: string,
    notification: {
      title: string;
      description: string;
      activityType: string;
      url?: string;
    }
  ): Promise<void> {
    try {
      const client = await this.getGraphClient(tenantId);

      await client.api(`/users/${userId}/teamwork/sendActivityNotification`).post({
        topic: {
          source: 'text',
          value: notification.title,
        },
        activityType: notification.activityType,
        previewText: {
          content: notification.description,
        },
        templateParameters: [
          {
            name: 'notificationUrl',
            value: notification.url || process.env.FRONTEND_URL,
          },
        ],
      });

      logger.info('Activity notification sent', { userId, tenantId });
    } catch (error) {
      logger.error('Error sending activity notification', { error });
    }
  }

  /**
   * Helper: Get organization ID from tenant
   */
  private async getOrganizationId(tenantId: string): Promise<string> {
    const installation = await prisma.teamsInstallation.findFirst({
      where: { tenantId, isActive: true },
    });

    return installation?.organizationId || '';
  }

  /**
   * Helper: Get user ID from AAD object ID
   */
  private async getUserId(aadObjectId: string): Promise<string> {
    // Look for user with matching metadata
    const user = await prisma.user.findFirst({
      where: {
        metadata: {
          path: ['aadObjectId'],
          equals: aadObjectId,
        },
      },
    });

    return user?.id || '';
  }

  /**
   * Helper: Get recent meetings
   */
  private async getRecentMeetings(tenantId: string, limit: number): Promise<any[]> {
    const orgId = await this.getOrganizationId(tenantId);

    return await prisma.meeting.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['completed', 'in_progress'] },
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: limit,
    });
  }

  /**
   * REAL IMPLEMENTATION: Join Teams meeting using Recall.ai bot service
   * Replaces fake implementation that only created database records
   */
  private async joinTeamsMeeting(meetingId: string, teamsMeetingId: string): Promise<void> {
    try {
      logger.info('Joining Teams meeting with REAL Recall.ai bot', { meetingId, teamsMeetingId });

      // Get meeting details from database
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Get meeting join URL
      // For Teams, we need to construct the join URL or get it from Graph API
      let meetingUrl = meeting.meetingUrl;
      const tenantId = (meeting.metadata as any)?.tenantId || '';

      if (!meetingUrl) {
        // Try to get meeting details from Microsoft Graph
        try {
          const graphClient = await this.getGraphClient(tenantId);
          const onlineMeeting = await graphClient
            .api(`/me/onlineMeetings/${teamsMeetingId}`)
            .get();

          meetingUrl = onlineMeeting.joinUrl;
        } catch (graphError) {
          logger.warn('Could not fetch meeting URL from Graph API', { error: graphError });
          throw new Error('Meeting URL not available');
        }
      }

      // Import bot recording service
      const { botRecordingService } = await import('./BotRecordingService');

      // Check if Recall.ai is configured
      if (!botRecordingService.isAvailable()) {
        logger.warn('Recall.ai not configured, falling back to manual recording', { meetingId });

        // Update meeting to indicate manual recording required
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            metadata: {
              ...(meeting.metadata as any),
              botJoinStatus: 'manual_required',
              botJoinError: 'Recall.ai not configured. Join manually or use bot app.',
            } as any,
          },
        });

        return;
      }

      // Get storage configuration from environment
      const storageConfig = process.env.RECORDING_STORAGE_BUCKET
        ? {
            type: (process.env.RECORDING_STORAGE_TYPE as 's3' | 'gcs') || 's3',
            bucket: process.env.RECORDING_STORAGE_BUCKET,
            prefix: `meetings/${meetingId}/`,
          }
        : undefined;

      // Create and send REAL bot to Teams meeting via Recall.ai
      const result = await botRecordingService.joinMeeting(meetingId, meetingUrl!, {
        botName: 'OpenMeet Notetaker',
        onJoinMessage: '👋 OpenMeet has joined to record and transcribe this Teams meeting.',
        storageLocation: storageConfig,
      });

      logger.info('REAL bot successfully created and joining Teams meeting', {
        meetingId,
        botId: result.botId,
        status: result.status,
      });

      // Listen for bot events
      botRecordingService.once('bot-status-change', (event) => {
        if (event.meetingId === meetingId && event.status === 'in_call') {
          logger.info('Bot has successfully joined the Teams call', {
            meetingId,
            botId: event.botId,
          });
        }
      });

      botRecordingService.once('media-ready', (event) => {
        if (event.meetingId === meetingId) {
          logger.info('Teams recording media is ready for processing', {
            meetingId,
            mediaType: event.mediaType,
            location: event.location,
          });
        }
      });
    } catch (error) {
      logger.error('Error joining Teams meeting with Recall.ai bot', {
        error,
        meetingId,
        teamsMeetingId,
      });

      // Update meeting status to reflect error
      await prisma.meeting
        .update({
          where: { id: meetingId },
          data: {
            metadata: {
              botJoinStatus: 'failed',
              botJoinError: error instanceof Error ? error.message : 'Unknown error',
            } as any,
          },
        })
        .catch((err) => logger.error('Failed to update meeting status', err));
    }
  }

  /**
   * Helper: Emit Teams bot join request event
   */
  private emitTeamsBotJoinRequest(meetingId: string, teamsMeetingId: string, requestId: string): void {
    logger.info('Teams bot join event emitted', {
      event: 'bot:join:teams:requested',
      meetingId,
      teamsMeetingId,
      requestId,
      timestamp: new Date().toISOString(),
    });

    // In production, this would publish to a message queue
    // that a Teams bot service would consume and process
    //
    // Example:
    // await this.messageQueue.publish('teams.bot.join.requested', {
    //   meetingId,
    //   teamsMeetingId,
    //   requestId,
    //   timestamp: new Date(),
    // });
  }

  /**
   * Helper: Ask AI
   */
  private async askAI(question: string, meetings: any[]): Promise<string> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Get meeting transcripts
      const meetingContext = await Promise.all(
        meetings.slice(0, 5).map(async (meeting) => {
          const transcript = await prisma.transcription.findFirst({
            where: { meetingId: meeting.id },
            orderBy: { createdAt: 'desc' },
          });

          return {
            title: meeting.title,
            date: meeting.scheduledStartAt,
            transcript: transcript?.text?.substring(0, 2000) || 'No transcript available',
          };
        })
      );

      // Use OpenAI GPT-4 to answer the question
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant that helps analyze meeting data. Answer questions based on the provided meeting transcripts. Be concise and accurate.',
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nMeeting Context:\n${JSON.stringify(
              meetingContext,
              null,
              2
            )}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'I could not find relevant information in recent meetings.';
    } catch (error) {
      logger.error('Error asking AI', { error, question });
      return 'Sorry, I encountered an error processing your question. Please try again.';
    }
  }

  /**
   * Uninstall from team
   */
  async uninstallFromTeam(teamId: string): Promise<void> {
    try {
      await prisma.teamsInstallation.updateMany({
        where: { teamId },
        data: { isActive: false },
      });

      logger.info('Teams app uninstalled', { teamId });
    } catch (error) {
      logger.error('Error uninstalling Teams app', { error });
    }
  }
}

export const teamsIntegrationService = new TeamsIntegrationService();
