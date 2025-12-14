/**
 * Slack Bot Integration Service - REAL IMPLEMENTATION
 *
 * Native Slack bot using @slack/bolt SDK for meeting management and notifications
 * Competitive Feature: Otter.ai Slack Integration + Fathom Slack Bot
 *
 * Features:
 * - Slash commands (/openmeet join, /openmeet summary, etc.)
 * - Meeting notifications to channels
 * - Interactive message components (buttons, modals, select menus)
 * - Action item sharing
 * - OAuth workspace installation
 * - Event subscriptions (app_mention, message, reactions)
 * - Socket Mode support for development
 *
 * @slack/bolt Documentation: https://slack.dev/bolt-js/
 */

import {
  App,
  ExpressReceiver,
  SlackCommandMiddlewareArgs,
  SlackEventMiddlewareArgs,
  SlackViewMiddlewareArgs,
  SlackActionMiddlewareArgs,
  BlockAction,
  ViewSubmitAction,
  ButtonAction,
  StaticSelectAction,
} from '@slack/bolt';
import { WebClient, ChatPostMessageResponse } from '@slack/web-api';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { meetingService } from './meeting';
import { superSummaryService } from './SuperSummaryService';

const prisma = new PrismaClient();

// ============================================================================
// Type Definitions
// ============================================================================

export interface SlackWorkspace {
  id: string;
  organizationId: string;
  teamId: string;
  teamName: string;
  accessToken: string;
  botUserId: string;
  scope: string;
  defaultChannel?: string;
  isActive: boolean;
  installedAt: Date;
  installedBy: string;
  settings?: SlackWorkspaceSettings;
}

export interface SlackWorkspaceSettings {
  autoPostSummaries: boolean;
  notifyOnMeetingStart: boolean;
  notifyOnMeetingEnd: boolean;
  defaultSummaryFormat: 'full' | 'brief' | 'action_items_only';
  allowedChannels?: string[];
  mentionAssignees: boolean;
}

export interface SlackCommand {
  command: string;
  text: string;
  userId: string;
  userName: string;
  channelId: string;
  channelName: string;
  teamId: string;
  teamDomain: string;
  triggerId: string;
  responseUrl: string;
}

export interface SlackNotification {
  workspaceId: string;
  channel: string;
  message: string;
  blocks?: any[];
  attachments?: any[];
  threadTs?: string;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
}

export interface MeetingSummaryData {
  executiveSummary?: string;
  keyPoints?: string[];
  actionItems?: Array<{
    title: string;
    assignee?: string;
    dueDate?: string;
  }>;
  decisions?: string[];
  nextSteps?: string[];
  sentiment?: string;
}

// ============================================================================
// SlackBotService Class - REAL @slack/bolt Implementation
// ============================================================================

class SlackBotService {
  private app: App | null = null;
  private receiver: ExpressReceiver | null = null;
  private clients: Map<string, WebClient> = new Map();
  private openai: OpenAI | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the Slack Bolt app and register all handlers
   */
  private initializeService(): void {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const botToken = process.env.SLACK_BOT_TOKEN;

    if (!signingSecret) {
      logger.warn('SLACK_SIGNING_SECRET not configured - Slack bot will not work');
      return;
    }

    // Initialize OpenAI client for AI features
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    try {
      // Create ExpressReceiver for custom routes and webhook handling
      this.receiver = new ExpressReceiver({
        signingSecret,
        endpoints: '/slack/events',
        processBeforeResponse: true,
      });

      // Initialize Bolt App with proper configuration
      const appConfig: any = {
        receiver: this.receiver,
        processBeforeResponse: true,
      };

      // Use bot token if available (single workspace mode)
      if (botToken) {
        appConfig.token = botToken;
      }

      // Enable Socket Mode for development if configured
      if (process.env.SLACK_APP_TOKEN && process.env.SLACK_SOCKET_MODE === 'true') {
        appConfig.socketMode = true;
        appConfig.appToken = process.env.SLACK_APP_TOKEN;
        logger.info('Slack Socket Mode enabled for development');
      }

      this.app = new App(appConfig);

      // Register all handlers
      this.registerEventHandlers();
      this.registerCommands();
      this.registerActions();
      this.registerViews();
      this.registerShortcuts();

      this.isInitialized = true;
      logger.info('SlackBotService initialized successfully with @slack/bolt');
    } catch (error) {
      logger.error('Failed to initialize SlackBotService', { error });
      this.isInitialized = false;
    }
  }

  /**
   * Check if service is properly initialized
   */
  isAvailable(): boolean {
    return this.isInitialized && this.app !== null;
  }

  // ============================================================================
  // Event Handlers - REAL Implementation
  // ============================================================================

  /**
   * Register all event listeners using @slack/bolt
   */
  private registerEventHandlers(): void {
    if (!this.app) return;

    // Handle messages sent directly to the bot (DMs)
    this.app.message(async ({ message, say, client }) => {
      try {
        // Only handle direct messages (DMs)
        if (message.channel_type !== 'im') return;

        const userMessage = (message as any).text || '';
        logger.info('Received DM to bot', { userId: (message as any).user, text: userMessage });

        // Process natural language commands
        const response = await this.processNaturalLanguageCommand(
          userMessage,
          (message as any).user,
          (message as any).team
        );

        await say({
          text: response.text,
          blocks: response.blocks,
        });
      } catch (error) {
        logger.error('Error handling message event', { error });
        await say('Sorry, I encountered an error processing your message. Please try again.');
      }
    });

    // Handle @mentions of the bot
    this.app.event('app_mention', async ({ event, say, client }) => {
      try {
        logger.info('Bot mentioned', { channel: event.channel, user: event.user });

        const mentionText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

        if (!mentionText) {
          await say({
            text: "Hello! I'm OpenMeet Notetaker. Here's what I can do:",
            blocks: this.getHelpBlocks(),
          });
          return;
        }

        // Process the mention as a command
        const response = await this.processNaturalLanguageCommand(
          mentionText,
          event.user,
          event.team || ''
        );

        await say({
          text: response.text,
          blocks: response.blocks,
          thread_ts: event.ts,
        });
      } catch (error) {
        logger.error('Error handling app_mention event', { error });
        await say({
          text: 'Sorry, I encountered an error. Please try again or use `/openmeet help`.',
          thread_ts: event.ts,
        });
      }
    });

    // Handle new channel member joins (for welcome messages)
    this.app.event('member_joined_channel', async ({ event, client }) => {
      try {
        // Check if the bot was added to a channel
        const authResult = await client.auth.test();
        if (event.user === authResult.user_id) {
          logger.info('Bot added to channel', { channel: event.channel });

          await client.chat.postMessage({
            channel: event.channel,
            text: "Hello! I'm OpenMeet Notetaker. I can help you record and summarize meetings.",
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: "*Hello!* I'm OpenMeet Notetaker. Here's what I can do in this channel:",
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '- `/openmeet join <meeting-url>` - Join and record a meeting\n- `/openmeet summary` - Get recent meeting summaries\n- `/openmeet ask <question>` - Ask about your meetings\n- `/openmeet schedule` - Schedule a new meeting',
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'View Dashboard' },
                    url: process.env.FRONTEND_URL || 'https://app.openmeet.com',
                    action_id: 'open_dashboard',
                  },
                ],
              },
            ],
          });
        }
      } catch (error) {
        logger.error('Error handling member_joined_channel event', { error });
      }
    });

    // Track reactions for engagement analytics
    this.app.event('reaction_added', async ({ event, client }) => {
      try {
        // Check if reaction is on a bot message (for tracking user engagement)
        if (event.item.type === 'message') {
          logger.debug('Reaction added to message', {
            reaction: event.reaction,
            user: event.user,
            channel: event.item.channel,
          });

          // Track engagement in analytics
          await this.trackEngagement('reaction_added', {
            reaction: event.reaction,
            userId: event.user,
            channelId: event.item.channel,
            messageTs: event.item.ts,
          });
        }
      } catch (error) {
        logger.error('Error handling reaction_added event', { error });
      }
    });

    // Handle app uninstallation
    this.app.event('app_uninstalled', async ({ event, context }) => {
      try {
        logger.info('App uninstalled from workspace', { teamId: context.teamId });
        if (context.teamId) {
          await this.uninstallWorkspace(context.teamId);
        }
      } catch (error) {
        logger.error('Error handling app_uninstalled event', { error });
      }
    });

    // Handle tokens revoked
    this.app.event('tokens_revoked', async ({ event, context }) => {
      try {
        logger.info('Tokens revoked', { teamId: context.teamId, tokens: event.tokens });
        if (context.teamId) {
          await this.handleTokensRevoked(context.teamId, event.tokens);
        }
      } catch (error) {
        logger.error('Error handling tokens_revoked event', { error });
      }
    });
  }

  // ============================================================================
  // Slash Commands - REAL Implementation
  // ============================================================================

  /**
   * Register slash commands using @slack/bolt
   */
  private registerCommands(): void {
    if (!this.app) return;

    // /openmeet - Main command with subcommands
    this.app.command('/openmeet', async ({ command, ack, respond, client }) => {
      await ack();

      try {
        const slackCommand = this.parseCommand(command);
        const response = await this.handleCommand(slackCommand);
        await respond(response);
      } catch (error) {
        logger.error('Error handling /openmeet command', { error, command });
        await respond({
          response_type: 'ephemeral',
          text: 'Sorry, something went wrong processing your command. Please try again.',
        });
      }
    });

    // /meeting-summary - Quick summary command
    this.app.command('/meeting-summary', async ({ command, ack, respond, client }) => {
      await ack();

      try {
        const meetingId = command.text.trim();
        if (!meetingId) {
          // Show meeting picker modal
          await client.views.open({
            trigger_id: command.trigger_id,
            view: await this.buildMeetingPickerModal(command.team_id, 'get_summary'),
          });
          return;
        }

        const response = await this.handleSummaryCommand(
          {
            command: '/meeting-summary',
            text: meetingId,
            userId: command.user_id,
            userName: command.user_name,
            channelId: command.channel_id,
            channelName: command.channel_name,
            teamId: command.team_id,
            teamDomain: command.team_domain || '',
            triggerId: command.trigger_id,
            responseUrl: command.response_url,
          },
          [meetingId]
        );
        await respond(response);
      } catch (error) {
        logger.error('Error handling /meeting-summary command', { error });
        await respond({
          response_type: 'ephemeral',
          text: 'Failed to get meeting summary. Please try again.',
        });
      }
    });

    // /search-meetings - Search across meetings
    this.app.command('/search-meetings', async ({ command, ack, respond, client }) => {
      await ack();

      try {
        const query = command.text.trim();
        if (!query) {
          await respond({
            response_type: 'ephemeral',
            text: 'Usage: `/search-meetings <query>`\nExample: `/search-meetings budget discussion`',
          });
          return;
        }

        const response = await this.handleSearchCommand(
          {
            command: '/search-meetings',
            text: query,
            userId: command.user_id,
            userName: command.user_name,
            channelId: command.channel_id,
            channelName: command.channel_name,
            teamId: command.team_id,
            teamDomain: command.team_domain || '',
            triggerId: command.trigger_id,
            responseUrl: command.response_url,
          },
          query
        );
        await respond(response);
      } catch (error) {
        logger.error('Error handling /search-meetings command', { error });
        await respond({
          response_type: 'ephemeral',
          text: 'Search failed. Please try again.',
        });
      }
    });

    // /action-items - List action items
    this.app.command('/action-items', async ({ command, ack, respond, client }) => {
      await ack();

      try {
        const response = await this.handleActionItemsCommand({
          command: '/action-items',
          text: command.text,
          userId: command.user_id,
          userName: command.user_name,
          channelId: command.channel_id,
          channelName: command.channel_name,
          teamId: command.team_id,
          teamDomain: command.team_domain || '',
          triggerId: command.trigger_id,
          responseUrl: command.response_url,
        });
        await respond(response);
      } catch (error) {
        logger.error('Error handling /action-items command', { error });
        await respond({
          response_type: 'ephemeral',
          text: 'Failed to get action items. Please try again.',
        });
      }
    });

    // /schedule-meeting - Open scheduling modal
    this.app.command('/schedule-meeting', async ({ command, ack, client }) => {
      await ack();

      try {
        await client.views.open({
          trigger_id: command.trigger_id,
          view: this.buildScheduleMeetingModal(command.channel_id),
        });
      } catch (error) {
        logger.error('Error opening schedule meeting modal', { error });
      }
    });
  }

  // ============================================================================
  // Interactive Actions - REAL Implementation
  // ============================================================================

  /**
   * Register interactive action handlers using @slack/bolt
   */
  private registerActions(): void {
    if (!this.app) return;

    // Button: View full transcript
    this.app.action<BlockAction<ButtonAction>>('view_transcript', async ({ action, ack, body, client }) => {
      await ack();

      try {
        const meetingId = action.value;
        logger.info('View transcript button clicked', { meetingId, userId: body.user.id });

        // Open transcript modal
        await client.views.open({
          trigger_id: (body as any).trigger_id,
          view: await this.buildTranscriptModal(meetingId),
        });
      } catch (error) {
        logger.error('Error handling view_transcript action', { error });
      }
    });

    // Button: Get summary for a specific meeting
    this.app.action<BlockAction<ButtonAction>>('get_summary', async ({ action, ack, body, respond }) => {
      await ack();

      try {
        const meetingId = action.value;
        logger.info('Get summary button clicked', { meetingId, userId: body.user.id });

        const meeting = await prisma.meeting.findUnique({
          where: { id: meetingId },
        });

        if (!meeting) {
          await respond({
            response_type: 'ephemeral',
            replace_original: false,
            text: `Meeting \`${meetingId}\` not found.`,
          });
          return;
        }

        const summary = await superSummaryService.generateSuperSummary(meetingId);
        const message = this.formatSummaryMessage(meeting, summary);

        await respond({
          response_type: 'in_channel',
          replace_original: false,
          ...message,
        });
      } catch (error) {
        logger.error('Error handling get_summary action', { error });
        await respond({
          response_type: 'ephemeral',
          replace_original: false,
          text: 'Failed to get summary. Please try again.',
        });
      }
    });

    // Button: Share action items
    this.app.action<BlockAction<ButtonAction>>('share_action_items', async ({ action, ack, body, client }) => {
      await ack();

      try {
        const meetingId = action.value;
        logger.info('Share action items clicked', { meetingId, userId: body.user.id });

        // Open modal to select channel and customize sharing
        await client.views.open({
          trigger_id: (body as any).trigger_id,
          view: await this.buildShareActionItemsModal(meetingId),
        });
      } catch (error) {
        logger.error('Error handling share_action_items action', { error });
      }
    });

    // Button: Join meeting now
    this.app.action<BlockAction<ButtonAction>>('join_meeting_now', async ({ action, ack, body, respond }) => {
      await ack();

      try {
        const meetingUrl = action.value;
        logger.info('Join meeting now clicked', { meetingUrl, userId: body.user.id });

        // Create meeting and join
        const meeting = await meetingService.createMeeting({
          title: `Slack Meeting - ${new Date().toLocaleString()}`,
          platform: this.detectPlatform(meetingUrl),
          meetingUrl,
          scheduledStartAt: new Date(),
          organizationId: await this.getOrganizationId((body as any).team?.id || ''),
          createdBy: await this.getUserId(body.user.id, (body as any).team?.id || ''),
        });

        // Join the meeting
        this.joinMeetingAsync(meeting.id, meetingUrl);

        await respond({
          response_type: 'in_channel',
          replace_original: false,
          text: `OpenMeet is joining the meeting!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*OpenMeet is joining your meeting!*\n\nMeeting ID: \`${meeting.id}\`\nI'll post the summary here when the meeting ends.`,
              },
            },
          ],
        });
      } catch (error) {
        logger.error('Error handling join_meeting_now action', { error });
        await respond({
          response_type: 'ephemeral',
          replace_original: false,
          text: 'Failed to join meeting. Please try again.',
        });
      }
    });

    // Select menu: Select meeting from dropdown
    this.app.action<BlockAction<StaticSelectAction>>('select_meeting', async ({ action, ack, body, respond }) => {
      await ack();

      try {
        const meetingId = action.selected_option.value;
        logger.info('Meeting selected from dropdown', { meetingId, userId: body.user.id });

        const meeting = await prisma.meeting.findUnique({
          where: { id: meetingId },
        });

        if (!meeting) {
          await respond({
            response_type: 'ephemeral',
            replace_original: false,
            text: 'Meeting not found.',
          });
          return;
        }

        // Show meeting details
        await respond({
          response_type: 'ephemeral',
          replace_original: true,
          blocks: this.buildMeetingDetailsBlocks(meeting),
        });
      } catch (error) {
        logger.error('Error handling select_meeting action', { error });
      }
    });

    // Button: Refresh summary
    this.app.action<BlockAction<ButtonAction>>('refresh_summary', async ({ action, ack, body, respond }) => {
      await ack();

      try {
        const meetingId = action.value;
        logger.info('Refresh summary clicked', { meetingId });

        await respond({
          response_type: 'ephemeral',
          replace_original: false,
          text: 'Regenerating summary... This may take a moment.',
        });

        // Force regenerate summary
        const summary = await superSummaryService.generateSuperSummary(meetingId);
        const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });

        if (meeting) {
          const message = this.formatSummaryMessage(meeting, summary);
          await respond({
            response_type: 'ephemeral',
            replace_original: true,
            ...message,
          });
        }
      } catch (error) {
        logger.error('Error refreshing summary', { error });
        await respond({
          response_type: 'ephemeral',
          replace_original: false,
          text: 'Failed to refresh summary.',
        });
      }
    });

    // Button: Open dashboard (external link - just acknowledge)
    this.app.action('open_dashboard', async ({ ack }) => {
      await ack();
    });

    // Overflow menu actions
    this.app.action<BlockAction>('meeting_overflow', async ({ action, ack, body, client }) => {
      await ack();

      try {
        const selectedOption = (action as any).selected_option?.value;
        const [actionType, meetingId] = selectedOption?.split(':') || [];

        logger.info('Overflow menu action', { actionType, meetingId });

        switch (actionType) {
          case 'delete':
            await client.views.open({
              trigger_id: (body as any).trigger_id,
              view: this.buildDeleteConfirmModal(meetingId),
            });
            break;
          case 'share':
            await client.views.open({
              trigger_id: (body as any).trigger_id,
              view: await this.buildShareModal(meetingId),
            });
            break;
          case 'export':
            // Handle export
            break;
        }
      } catch (error) {
        logger.error('Error handling overflow menu action', { error });
      }
    });
  }

  // ============================================================================
  // View Submissions (Modals) - REAL Implementation
  // ============================================================================

  /**
   * Register modal view submission handlers
   */
  private registerViews(): void {
    if (!this.app) return;

    // Schedule meeting modal submission
    this.app.view('schedule_meeting_modal', async ({ ack, body, view, client }) => {
      await ack();

      try {
        const values = view.state.values;
        const title = values.title_block?.title_input?.value || 'Untitled Meeting';
        const meetingUrl = values.url_block?.url_input?.value;
        const dateTime = values.datetime_block?.datetime_input?.selected_date_time;
        const channelId = values.channel_block?.channel_select?.selected_channel;

        logger.info('Schedule meeting modal submitted', {
          userId: body.user.id,
          title,
          meetingUrl,
          dateTime,
        });

        const orgId = await this.getOrganizationId(body.team?.id || '');
        const userId = await this.getUserId(body.user.id, body.team?.id || '');

        // Create the meeting
        const meeting = await meetingService.createMeeting({
          title,
          platform: meetingUrl ? this.detectPlatform(meetingUrl) : 'unknown',
          meetingUrl: meetingUrl || undefined,
          scheduledStartAt: dateTime ? new Date(parseInt(String(dateTime)) * 1000) : new Date(),
          organizationId: orgId,
          createdBy: userId,
        });

        // Store Slack channel in metadata
        if (channelId) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
              metadata: {
                slackChannelId: channelId,
              } as any,
            },
          });
        }

        // Notify in channel
        if (channelId) {
          await client.chat.postMessage({
            channel: channelId,
            text: `New meeting scheduled: ${title}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*New Meeting Scheduled*\n\n*Title:* ${title}\n*When:* ${dateTime ? new Date(parseInt(String(dateTime)) * 1000).toLocaleString() : 'Now'}\n*Meeting ID:* \`${meeting.id}\``,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Join Meeting' },
                    url: meetingUrl || `${process.env.FRONTEND_URL}/meetings/${meeting.id}`,
                    action_id: 'open_meeting_link',
                  },
                ],
              },
            ],
          });
        }

        // Send confirmation DM to user
        await client.chat.postMessage({
          channel: body.user.id,
          text: `Your meeting "${title}" has been scheduled. Meeting ID: ${meeting.id}`,
        });
      } catch (error) {
        logger.error('Error handling schedule_meeting_modal submission', { error });
      }
    });

    // Meeting picker modal submission
    this.app.view('meeting_picker_modal', async ({ ack, body, view, client }) => {
      try {
        const values = view.state.values;
        const selectedMeetingId = values.meeting_select_block?.meeting_select?.selected_option?.value;
        const action = view.private_metadata;

        logger.info('Meeting picker modal submitted', {
          userId: body.user.id,
          selectedMeetingId,
          action,
        });

        if (!selectedMeetingId) {
          await ack({
            response_action: 'errors',
            errors: {
              meeting_select_block: 'Please select a meeting',
            },
          });
          return;
        }

        await ack();

        // Handle based on action type
        switch (action) {
          case 'get_summary':
            const meeting = await prisma.meeting.findUnique({
              where: { id: selectedMeetingId },
            });
            if (meeting) {
              const summary = await superSummaryService.generateSuperSummary(selectedMeetingId);
              const message = this.formatSummaryMessage(meeting, summary);
              await client.chat.postMessage({
                channel: body.user.id,
                ...message,
              });
            }
            break;
          case 'view_transcript':
            // Send transcript
            break;
        }
      } catch (error) {
        logger.error('Error handling meeting_picker_modal submission', { error });
        await ack();
      }
    });

    // Share action items modal submission
    this.app.view('share_action_items_modal', async ({ ack, body, view, client }) => {
      await ack();

      try {
        const values = view.state.values;
        const channelId = values.channel_block?.channel_select?.selected_channel;
        const meetingId = view.private_metadata;
        const mentionAssignees = values.mention_block?.mention_checkbox?.selected_options?.length > 0;

        if (!channelId || !meetingId) return;

        const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
        const summary = await superSummaryService.getSuperSummary(meetingId);

        if (!meeting || !summary) return;

        // Format action items message
        const actionItemsText = ((summary as any).actionItems || [])
          .map((item: any, idx: number) => {
            let text = `${idx + 1}. ${item.title || item.text}`;
            if (item.assignee && mentionAssignees) {
              text += ` - @${item.assignee}`;
            }
            if (item.dueDate) {
              text += ` (Due: ${new Date(item.dueDate).toLocaleDateString()})`;
            }
            return text;
          })
          .join('\n');

        await client.chat.postMessage({
          channel: channelId,
          text: `Action items from ${meeting.title}`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: `Action Items: ${meeting.title}` },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: actionItemsText || 'No action items found.' },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `From meeting on ${new Date(meeting.scheduledStartAt).toLocaleDateString()}`,
                },
              ],
            },
          ],
        });
      } catch (error) {
        logger.error('Error handling share_action_items_modal submission', { error });
      }
    });

    // Delete confirmation modal
    this.app.view('delete_confirm_modal', async ({ ack, body, view }) => {
      await ack();
      // Handle delete - for now just log
      logger.info('Delete confirmed', { meetingId: view.private_metadata, userId: body.user.id });
    });
  }

  // ============================================================================
  // Shortcuts - REAL Implementation
  // ============================================================================

  /**
   * Register global and message shortcuts
   */
  private registerShortcuts(): void {
    if (!this.app) return;

    // Global shortcut: Quick meeting join
    this.app.shortcut('join_meeting_shortcut', async ({ shortcut, ack, client }) => {
      await ack();

      try {
        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: {
            type: 'modal',
            callback_id: 'quick_join_modal',
            title: { type: 'plain_text', text: 'Join Meeting' },
            submit: { type: 'plain_text', text: 'Join' },
            blocks: [
              {
                type: 'input',
                block_id: 'url_block',
                element: {
                  type: 'url_text_input',
                  action_id: 'url_input',
                  placeholder: { type: 'plain_text', text: 'Paste meeting URL' },
                },
                label: { type: 'plain_text', text: 'Meeting URL' },
              },
            ],
          },
        });
      } catch (error) {
        logger.error('Error handling join_meeting_shortcut', { error });
      }
    });

    // Message shortcut: Summarize thread
    this.app.shortcut('summarize_thread', async ({ shortcut, ack, client }) => {
      await ack();

      try {
        const messageShortcut = shortcut as any;
        logger.info('Summarize thread shortcut triggered', {
          channel: messageShortcut.channel?.id,
          message_ts: messageShortcut.message_ts,
        });

        // Get thread messages and summarize
        const result = await client.conversations.replies({
          channel: messageShortcut.channel?.id,
          ts: messageShortcut.message_ts,
        });

        if (result.messages && result.messages.length > 0) {
          const threadText = result.messages.map((m) => (m as any).text || '').join('\n');
          const summary = await this.summarizeText(threadText);

          await client.chat.postMessage({
            channel: messageShortcut.channel?.id,
            thread_ts: messageShortcut.message_ts,
            text: `*Thread Summary:*\n${summary}`,
          });
        }
      } catch (error) {
        logger.error('Error handling summarize_thread shortcut', { error });
      }
    });
  }

  // ============================================================================
  // Command Handlers - REAL Implementation
  // ============================================================================

  /**
   * Parse Slack command into internal format
   */
  private parseCommand(command: any): SlackCommand {
    return {
      command: command.command,
      text: command.text || '',
      userId: command.user_id,
      userName: command.user_name,
      channelId: command.channel_id,
      channelName: command.channel_name,
      teamId: command.team_id,
      teamDomain: command.team_domain || '',
      triggerId: command.trigger_id,
      responseUrl: command.response_url,
    };
  }

  /**
   * Handle main /openmeet command with subcommands
   */
  async handleCommand(command: SlackCommand): Promise<any> {
    try {
      const args = command.text.trim().split(/\s+/);
      const subCommand = args[0]?.toLowerCase() || 'help';

      logger.info('Processing Slack command', {
        command: command.command,
        subCommand,
        userId: command.userId,
        channelId: command.channelId,
      });

      switch (subCommand) {
        case 'join':
          return await this.handleJoinCommand(command, args.slice(1));
        case 'summary':
          return await this.handleSummaryCommand(command, args.slice(1));
        case 'ask':
          return await this.handleAskCommand(command, args.slice(1));
        case 'schedule':
          return await this.handleScheduleCommand(command, args.slice(1));
        case 'search':
          return await this.handleSearchCommand(command, args.slice(1).join(' '));
        case 'actions':
        case 'action-items':
          return await this.handleActionItemsCommand(command);
        case 'settings':
          return await this.handleSettingsCommand(command);
        case 'status':
          return await this.handleStatusCommand(command);
        case 'help':
        default:
          return this.getHelpMessage();
      }
    } catch (error) {
      logger.error('Error handling Slack command', { error, command });
      return {
        response_type: 'ephemeral',
        text: 'Sorry, something went wrong processing your command.',
      };
    }
  }

  /**
   * Handle /openmeet join <meeting-url>
   */
  private async handleJoinCommand(command: SlackCommand, args: string[]): Promise<any> {
    if (args.length === 0) {
      return {
        response_type: 'ephemeral',
        text: 'Usage: `/openmeet join <meeting-url>`\nExample: `/openmeet join https://zoom.us/j/123456789`',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Usage:* `/openmeet join <meeting-url>`\n\n*Supported Platforms:*\n- Zoom\n- Google Meet\n- Microsoft Teams\n- Webex',
            },
          },
          {
            type: 'input',
            dispatch_action: true,
            element: {
              type: 'url_text_input',
              action_id: 'quick_join_url',
              placeholder: { type: 'plain_text', text: 'Paste meeting URL here' },
            },
            label: { type: 'plain_text', text: 'Or paste URL below:' },
          },
        ],
      };
    }

    const meetingUrl = args[0];

    if (!this.isValidMeetingUrl(meetingUrl)) {
      return {
        response_type: 'ephemeral',
        text: 'Invalid meeting URL. Supported platforms: Zoom, Google Meet, Microsoft Teams, Webex',
      };
    }

    try {
      const orgId = await this.getOrganizationId(command.teamId);
      const userId = await this.getUserId(command.userId, command.teamId);

      const meeting = await meetingService.createMeeting({
        title: `Slack Meeting - ${new Date().toLocaleString()}`,
        platform: this.detectPlatform(meetingUrl),
        meetingUrl,
        scheduledStartAt: new Date(),
        organizationId: orgId,
        createdBy: userId,
      });

      // Store Slack channel in metadata
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          metadata: {
            slackChannelId: command.channelId,
            slackUserId: command.userId,
            slackTeamId: command.teamId,
          } as any,
        },
      });

      // Join meeting asynchronously
      this.joinMeetingAsync(meeting.id, meetingUrl);

      return {
        response_type: 'in_channel',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*OpenMeet is joining your meeting!*\n\nMeeting URL: <${meetingUrl}|Open Meeting>\nMeeting ID: \`${meeting.id}\``,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Requested by <@${command.userId}> | I'll post the summary here when the meeting ends.`,
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Dashboard' },
                url: `${process.env.FRONTEND_URL}/meetings/${meeting.id}`,
                action_id: 'open_dashboard',
              },
            ],
          },
        ],
      };
    } catch (error) {
      logger.error('Error joining meeting', { error, meetingUrl });
      return {
        response_type: 'ephemeral',
        text: 'Failed to join meeting. Please try again.',
      };
    }
  }

  /**
   * Handle /openmeet summary [meeting-id]
   */
  private async handleSummaryCommand(command: SlackCommand, args: string[]): Promise<any> {
    if (args.length === 0) {
      // Show recent meetings with summary buttons
      const recentMeetings = await this.getRecentMeetings(command.teamId, 5);

      if (recentMeetings.length === 0) {
        return {
          response_type: 'ephemeral',
          text: "You don't have any recent meetings. Use `/openmeet join <url>` to record a meeting.",
        };
      }

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*Recent Meetings:*' },
          },
          ...recentMeetings.map((meeting: any) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${meeting.title}*\n${new Date(meeting.scheduledStartAt).toLocaleString()} | ${Math.round((meeting.durationSeconds || 0) / 60)} min`,
            },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'Get Summary' },
              value: meeting.id,
              action_id: 'get_summary',
            },
          })),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Use `/openmeet summary <meeting-id>` to get a specific summary',
              },
            ],
          },
        ],
      };
    }

    const meetingId = args[0];

    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return {
          response_type: 'ephemeral',
          text: `Meeting \`${meetingId}\` not found.`,
        };
      }

      const summary = await superSummaryService.generateSuperSummary(meetingId);
      return this.formatSummaryMessage(meeting, summary);
    } catch (error) {
      logger.error('Error getting summary', { error, meetingId });
      return {
        response_type: 'ephemeral',
        text: 'Failed to get meeting summary. Please try again.',
      };
    }
  }

  /**
   * Handle /openmeet ask <question>
   */
  private async handleAskCommand(command: SlackCommand, args: string[]): Promise<any> {
    if (args.length === 0) {
      return {
        response_type: 'ephemeral',
        text: "Usage: `/openmeet ask <question>`\nExample: `/openmeet ask What were the action items from yesterday's meeting?`",
      };
    }

    const question = args.join(' ');

    try {
      const orgId = await this.getOrganizationId(command.teamId);

      // Get recent meetings for context
      const recentMeetings = await prisma.meeting.findMany({
        where: {
          organizationId: orgId,
          status: 'completed',
        },
        orderBy: { scheduledStartAt: 'desc' },
        take: 10,
      });

      const response = await this.askAI(question, recentMeetings);

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Question:* ${question}`,
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Answer:*\n${response}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Based on ${recentMeetings.length} recent meetings | <${process.env.FRONTEND_URL}/ai-search|Ask more questions>`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      logger.error('Error asking AI', { error, question });
      return {
        response_type: 'ephemeral',
        text: 'Failed to process your question. Please try again.',
      };
    }
  }

  /**
   * Handle /openmeet schedule
   */
  private async handleScheduleCommand(command: SlackCommand, args: string[]): Promise<any> {
    const orgId = await this.getOrganizationId(command.teamId);
    const schedulingUrl = `${process.env.FRONTEND_URL}/schedule?org=${orgId}`;

    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Schedule a Meeting*\n\nYou can schedule a meeting directly from Slack or use our web dashboard.',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Open Scheduler' },
              url: schedulingUrl,
              style: 'primary',
              action_id: 'open_scheduler',
            },
          ],
        },
      ],
    };
  }

  /**
   * Handle /search-meetings <query>
   */
  private async handleSearchCommand(command: SlackCommand, query: string): Promise<any> {
    try {
      const orgId = await this.getOrganizationId(command.teamId);

      // Search meetings by title and content
      const meetings = await prisma.meeting.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { scheduledStartAt: 'desc' },
        take: 10,
      });

      if (meetings.length === 0) {
        return {
          response_type: 'ephemeral',
          text: `No meetings found matching "${query}".`,
        };
      }

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Search Results for "${query}":*`,
            },
          },
          ...meetings.map((meeting: any) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${meeting.title}*\n${new Date(meeting.scheduledStartAt).toLocaleString()}`,
            },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View' },
              url: `${process.env.FRONTEND_URL}/meetings/${meeting.id}`,
              action_id: 'view_meeting',
            },
          })),
        ],
      };
    } catch (error) {
      logger.error('Error searching meetings', { error, query });
      return {
        response_type: 'ephemeral',
        text: 'Search failed. Please try again.',
      };
    }
  }

  /**
   * Handle /action-items command
   */
  private async handleActionItemsCommand(command: SlackCommand): Promise<any> {
    try {
      const orgId = await this.getOrganizationId(command.teamId);
      const userId = await this.getUserId(command.userId, command.teamId);

      // Get action items from recent meetings
      const recentSummaries = await prisma.meetingSummary.findMany({
        where: {
          meeting: {
            organizationId: orgId,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { meeting: true },
      });

      const actionItems: Array<{ title: string; assignee?: string; meetingTitle: string; meetingDate: Date }> = [];

      for (const summary of recentSummaries) {
        const items = (summary.actionItems as any[]) || [];
        for (const item of items) {
          actionItems.push({
            title: item.title || item.text || item,
            assignee: item.assignee,
            meetingTitle: summary.meeting?.title || 'Unknown Meeting',
            meetingDate: summary.meeting?.scheduledStartAt || new Date(),
          });
        }
      }

      if (actionItems.length === 0) {
        return {
          response_type: 'ephemeral',
          text: 'No action items found in recent meetings.',
        };
      }

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'Your Action Items' },
          },
          ...actionItems.slice(0, 10).map((item, idx) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${idx + 1}. *${item.title}*${item.assignee ? ` - @${item.assignee}` : ''}\n   _From: ${item.meetingTitle}_`,
            },
          })),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Showing ${Math.min(10, actionItems.length)} of ${actionItems.length} action items`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      logger.error('Error getting action items', { error });
      return {
        response_type: 'ephemeral',
        text: 'Failed to get action items. Please try again.',
      };
    }
  }

  /**
   * Handle /openmeet settings
   */
  private async handleSettingsCommand(command: SlackCommand): Promise<any> {
    const workspace = await prisma.slackWorkspace.findFirst({
      where: { teamId: command.teamId },
    });

    const settings = (workspace?.settings as unknown as SlackWorkspaceSettings) || {
      autoPostSummaries: true,
      notifyOnMeetingStart: true,
      notifyOnMeetingEnd: true,
      defaultSummaryFormat: 'full',
      mentionAssignees: true,
    };

    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: 'OpenMeet Settings' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Auto-post summaries:* ${settings.autoPostSummaries ? 'On' : 'Off'}\n*Notify on meeting start:* ${settings.notifyOnMeetingStart ? 'On' : 'Off'}\n*Notify on meeting end:* ${settings.notifyOnMeetingEnd ? 'On' : 'Off'}\n*Summary format:* ${settings.defaultSummaryFormat}\n*Mention assignees:* ${settings.mentionAssignees ? 'On' : 'Off'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Edit Settings' },
              url: `${process.env.FRONTEND_URL}/integrations/slack/settings`,
              action_id: 'edit_settings',
            },
          ],
        },
      ],
    };
  }

  /**
   * Handle /openmeet status
   */
  private async handleStatusCommand(command: SlackCommand): Promise<any> {
    try {
      const orgId = await this.getOrganizationId(command.teamId);

      // Get active meetings
      const activeMeetings = await prisma.meeting.findMany({
        where: {
          organizationId: orgId,
          status: 'in_progress',
        },
      });

      // Get today's completed meetings
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaysMeetings = await prisma.meeting.count({
        where: {
          organizationId: orgId,
          status: 'completed',
          scheduledStartAt: { gte: today },
        },
      });

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'OpenMeet Status' },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Active Recordings:* ${activeMeetings.length}`,
              },
              {
                type: 'mrkdwn',
                text: `*Today's Meetings:* ${todaysMeetings}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: activeMeetings.length > 0
                ? `*Currently Recording:*\n${activeMeetings.map((m) => `- ${m.title}`).join('\n')}`
                : 'No active recordings.',
            },
          },
        ],
      };
    } catch (error) {
      logger.error('Error getting status', { error });
      return {
        response_type: 'ephemeral',
        text: 'Failed to get status. Please try again.',
      };
    }
  }

  // ============================================================================
  // Notification Methods - REAL Implementation
  // ============================================================================

  /**
   * Post meeting summary to channel
   */
  async postMeetingSummary(meetingId: string, channelId: string, workspaceId: string): Promise<void> {
    try {
      const client = await this.getClientAsync(workspaceId);
      if (!client) {
        throw new Error('Slack client not found');
      }

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const summary = await superSummaryService.generateSuperSummary(meetingId);
      const message = this.formatSummaryMessage(meeting, summary);

      await client.chat.postMessage({
        channel: channelId,
        text: `Meeting Summary: ${meeting.title}`,
        ...message,
      });

      logger.info('Meeting summary posted to Slack', { meetingId, channelId, workspaceId });
    } catch (error) {
      logger.error('Error posting meeting summary', { error, meetingId, channelId });
    }
  }

  /**
   * Send notification to channel
   */
  async sendNotification(notification: SlackNotification): Promise<ChatPostMessageResponse | null> {
    try {
      const client = await this.getClientAsync(notification.workspaceId);
      if (!client) {
        throw new Error('Slack client not found');
      }

      const result = await client.chat.postMessage({
        channel: notification.channel,
        text: notification.message,
        blocks: notification.blocks,
        attachments: notification.attachments,
        thread_ts: notification.threadTs,
        unfurl_links: notification.unfurlLinks ?? false,
        unfurl_media: notification.unfurlMedia ?? true,
      });

      logger.info('Slack notification sent', {
        workspaceId: notification.workspaceId,
        channel: notification.channel,
        ts: result.ts,
      });

      return result;
    } catch (error) {
      logger.error('Error sending Slack notification', { error, notification });
      return null;
    }
  }

  /**
   * Notify channel when meeting starts
   */
  async notifyMeetingStarted(meetingId: string, channelId: string, workspaceId: string): Promise<void> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) return;

    await this.sendNotification({
      workspaceId,
      channel: channelId,
      message: `Meeting started: ${meeting.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Meeting Started*\n\n*${meeting.title}*\nOpenMeet is now recording and transcribing.`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'View Live' },
            url: `${process.env.FRONTEND_URL}/meetings/${meeting.id}/live`,
            action_id: 'view_live',
          },
        },
      ],
    });
  }

  /**
   * Notify channel when meeting ends
   */
  async notifyMeetingEnded(meetingId: string, channelId: string, workspaceId: string): Promise<void> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) return;

    const result = await this.sendNotification({
      workspaceId,
      channel: channelId,
      message: `Meeting ended: ${meeting.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Meeting Ended*\n\n*${meeting.title}*\nDuration: ${Math.round((meeting.durationSeconds || 0) / 60)} minutes\n\n_Processing summary..._`,
          },
        },
      ],
    });

    // Post summary after processing (delayed)
    if (result?.ts) {
      setTimeout(async () => {
        try {
          await this.postMeetingSummary(meetingId, channelId, workspaceId);
        } catch (error) {
          logger.error('Error posting delayed summary', { error, meetingId });
        }
      }, 30000); // 30 second delay for processing
    }
  }

  // ============================================================================
  // OAuth and Workspace Management
  // ============================================================================

  /**
   * Handle OAuth installation callback
   */
  async handleOAuthCallback(code: string, state?: string): Promise<SlackWorkspace> {
    try {
      const client = new WebClient();

      const result = await client.oauth.v2.access({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
      });

      if (!result.ok) {
        throw new Error(`OAuth exchange failed: ${result.error}`);
      }

      const { team, access_token, bot_user_id, scope, authed_user } = result as any;

      // Check if workspace already exists
      const existingWorkspace = await prisma.slackWorkspace.findFirst({
        where: { teamId: team.id },
      });

      let workspace: any;

      if (existingWorkspace) {
        // Update existing workspace
        workspace = await prisma.slackWorkspace.update({
          where: { id: existingWorkspace.id },
          data: {
            accessToken: access_token,
            botUserId: bot_user_id,
            isActive: true,
            metadata: {
              scope,
              installedBy: authed_user.id,
              updatedAt: new Date().toISOString(),
            } as any,
          },
        });
      } else {
        // Create new workspace
        workspace = await prisma.slackWorkspace.create({
          data: {
            id: `slack_${team.id}_${Date.now()}`,
            organizationId: state || '', // Organization ID from state parameter
            teamId: team.id,
            teamName: team.name,
            accessToken: access_token,
            botUserId: bot_user_id,
            isActive: true,
            settings: {
              autoPostSummaries: true,
              notifyOnMeetingStart: true,
              notifyOnMeetingEnd: true,
              defaultSummaryFormat: 'full',
              mentionAssignees: true,
            } as any,
            metadata: {
              scope,
              installedBy: authed_user.id,
            } as any,
          },
        });
      }

      // Cache the client
      this.clients.set(workspace.id, new WebClient(access_token));

      logger.info('Slack workspace installed/updated', {
        workspaceId: workspace.id,
        teamId: team.id,
        teamName: team.name,
      });

      return workspace as SlackWorkspace;
    } catch (error) {
      logger.error('Error handling OAuth callback', { error });
      throw error;
    }
  }

  /**
   * Uninstall workspace
   */
  async uninstallWorkspace(teamId: string): Promise<void> {
    try {
      const workspace = await prisma.slackWorkspace.findFirst({
        where: { teamId },
      });

      if (workspace) {
        await prisma.slackWorkspace.update({
          where: { id: workspace.id },
          data: { isActive: false },
        });

        // Clear client cache
        this.clients.delete(workspace.id);
      }

      logger.info('Slack workspace uninstalled', { teamId });
    } catch (error) {
      logger.error('Error uninstalling workspace', { error, teamId });
    }
  }

  /**
   * Handle tokens revoked event
   */
  private async handleTokensRevoked(teamId: string, tokens: any): Promise<void> {
    logger.info('Tokens revoked for workspace', { teamId, tokens });
    // Mark workspace as needing re-authentication
    await prisma.slackWorkspace.updateMany({
      where: { teamId },
      data: {
        metadata: {
          tokenRevoked: true,
          revokedAt: new Date().toISOString(),
        } as any,
      },
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get Slack client for workspace (async)
   */
  private async getClientAsync(workspaceId: string): Promise<WebClient | null> {
    if (this.clients.has(workspaceId)) {
      return this.clients.get(workspaceId)!;
    }

    try {
      const workspace = await prisma.slackWorkspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace || !workspace.isActive) {
        logger.warn('Slack workspace not found or inactive', { workspaceId });
        return null;
      }

      const client = new WebClient(workspace.accessToken);
      this.clients.set(workspaceId, client);
      return client;
    } catch (error) {
      logger.error('Error getting Slack client', { error, workspaceId });
      return null;
    }
  }

  /**
   * Get organization ID from Slack team
   */
  private async getOrganizationId(teamId: string): Promise<string> {
    const workspace = await prisma.slackWorkspace.findFirst({
      where: { teamId },
    });
    return workspace?.organizationId || '';
  }

  /**
   * Get user ID from Slack user
   */
  private async getUserId(slackUserId: string, teamId: string): Promise<string> {
    const user = await prisma.user.findFirst({
      where: {
        metadata: {
          path: ['slackUserId'],
          equals: slackUserId,
        },
      },
    });
    return user?.id || '';
  }

  /**
   * Get recent meetings for organization
   */
  private async getRecentMeetings(teamId: string, limit: number): Promise<any[]> {
    const orgId = await this.getOrganizationId(teamId);
    return prisma.meeting.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['completed', 'in_progress'] },
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Validate meeting URL
   */
  private isValidMeetingUrl(url: string): boolean {
    const validPlatforms = [
      /zoom\.us/i,
      /meet\.google\.com/i,
      /teams\.microsoft\.com/i,
      /teams\.live\.com/i,
      /webex\.com/i,
    ];
    return validPlatforms.some((pattern) => pattern.test(url));
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): string {
    if (/zoom\.us/i.test(url)) return 'zoom';
    if (/meet\.google\.com/i.test(url)) return 'google_meet';
    if (/teams\.(microsoft|live)\.com/i.test(url)) return 'microsoft_teams';
    if (/webex\.com/i.test(url)) return 'webex';
    return 'unknown';
  }

  /**
   * Join meeting asynchronously using BotRecordingService
   */
  private async joinMeetingAsync(meetingId: string, meetingUrl: string): Promise<void> {
    try {
      logger.info('Joining meeting', { meetingId, meetingUrl });

      const { botRecordingService } = await import('./BotRecordingService');

      if (!botRecordingService.isAvailable()) {
        logger.warn('Bot recording service not available', { meetingId });
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            metadata: {
              botJoinStatus: 'manual_required',
              botJoinError: 'Recall.ai not configured',
            } as any,
          },
        });
        return;
      }

      const result = await botRecordingService.joinMeeting(meetingId, meetingUrl, {
        botName: 'OpenMeet Notetaker',
        onJoinMessage: 'OpenMeet is now recording and transcribing this meeting.',
      });

      logger.info('Bot joined meeting', { meetingId, botId: result.botId });
    } catch (error) {
      logger.error('Error joining meeting', { error, meetingId, meetingUrl });
    }
  }

  /**
   * Process natural language command
   */
  private async processNaturalLanguageCommand(
    text: string,
    userId: string,
    teamId: string
  ): Promise<{ text: string; blocks?: any[] }> {
    const lowerText = text.toLowerCase();

    // Simple keyword matching for common requests
    if (lowerText.includes('summary') || lowerText.includes('summarize')) {
      return {
        text: 'Use `/openmeet summary` to get meeting summaries.',
        blocks: this.getHelpBlocks(),
      };
    }

    if (lowerText.includes('join') || lowerText.includes('record')) {
      return {
        text: 'Use `/openmeet join <meeting-url>` to have me join and record a meeting.',
      };
    }

    if (lowerText.includes('help')) {
      return {
        text: "Here's what I can do:",
        blocks: this.getHelpBlocks(),
      };
    }

    // Default response
    return {
      text: "I'm not sure what you're asking. Here's what I can help with:",
      blocks: this.getHelpBlocks(),
    };
  }

  /**
   * Ask AI using OpenAI
   */
  private async askAI(question: string, meetings: any[]): Promise<string> {
    if (!this.openai) {
      return 'AI features are not configured. Please contact your administrator.';
    }

    try {
      // Get meeting transcripts for context
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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant that helps analyze meeting data. Answer questions based on the provided meeting transcripts. Be concise and accurate. If you cannot find relevant information, say so.',
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nMeeting Context:\n${JSON.stringify(meetingContext, null, 2)}`,
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
   * Summarize text using AI
   */
  private async summarizeText(text: string): Promise<string> {
    if (!this.openai) {
      return 'AI features are not configured.';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following thread in 2-3 sentences. Be concise.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        max_tokens: 150,
        temperature: 0.5,
      });

      return response.choices[0]?.message?.content || 'Could not generate summary.';
    } catch (error) {
      logger.error('Error summarizing text', { error });
      return 'Failed to generate summary.';
    }
  }

  /**
   * Track user engagement
   */
  private async trackEngagement(eventType: string, data: any): Promise<void> {
    // Log for analytics - in production, send to analytics service
    logger.debug('User engagement tracked', { eventType, ...data });
  }

  // ============================================================================
  // Message Formatting
  // ============================================================================

  /**
   * Format summary message with Slack blocks
   */
  private formatSummaryMessage(meeting: any, summary: any): any {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: meeting.title,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${new Date(meeting.scheduledStartAt).toLocaleString()} | Duration: ${Math.round((meeting.durationSeconds || 0) / 60)} min`,
          },
        ],
      },
      { type: 'divider' },
    ];

    // Executive summary
    if (summary.overview || summary.executiveSummary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary*\n${summary.overview || summary.executiveSummary}`,
        },
      });
    }

    // Key points
    const keyPoints = summary.keyPoints || [];
    if (keyPoints.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Key Points*\n${keyPoints.map((p: string) => `- ${p}`).join('\n')}`,
        },
      });
    }

    // Action items
    const actionItems = summary.actionItems || [];
    if (actionItems.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Action Items*\n${actionItems.map((item: any) => `- ${item.title || item.text || item}${item.assignee ? ` (@${item.assignee})` : ''}`).join('\n')}`,
        },
      });
    }

    // Decisions
    const decisions = summary.decisions || [];
    if (decisions.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Decisions*\n${decisions.map((d: string) => `- ${d}`).join('\n')}`,
        },
      });
    }

    // Actions
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Full Transcript' },
          url: `${process.env.FRONTEND_URL}/meetings/${meeting.id}/transcript`,
          action_id: 'open_transcript',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Recording' },
          url: `${process.env.FRONTEND_URL}/meetings/${meeting.id}/recording`,
          action_id: 'open_recording',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Share Action Items' },
          value: meeting.id,
          action_id: 'share_action_items',
        },
      ],
    });

    return {
      response_type: 'in_channel',
      blocks,
    };
  }

  /**
   * Get help message blocks
   */
  private getHelpBlocks(): any[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*OpenMeet Slack Bot Commands*',
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '`/openmeet join <meeting-url>`\nJoin and record a Zoom, Google Meet, or Teams meeting\n\n`/openmeet summary [meeting-id]`\nGet a meeting summary (shows recent meetings if no ID)\n\n`/openmeet ask <question>`\nAsk AI about your meetings\n\n`/openmeet search <query>`\nSearch across all your meetings\n\n`/openmeet actions`\nList action items from recent meetings\n\n`/openmeet schedule`\nSchedule a new meeting\n\n`/openmeet status`\nView current recording status\n\n`/openmeet settings`\nView and edit settings\n\n`/openmeet help`\nShow this help message',
        },
      },
    ];
  }

  /**
   * Get help message (simple format)
   */
  private getHelpMessage(): any {
    return {
      response_type: 'ephemeral',
      blocks: this.getHelpBlocks(),
    };
  }

  // ============================================================================
  // Modal Builders
  // ============================================================================

  /**
   * Build meeting picker modal
   */
  private async buildMeetingPickerModal(teamId: string, action: string): Promise<any> {
    const meetings = await this.getRecentMeetings(teamId, 10);

    return {
      type: 'modal',
      callback_id: 'meeting_picker_modal',
      private_metadata: action,
      title: { type: 'plain_text', text: 'Select Meeting' },
      submit: { type: 'plain_text', text: 'Select' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'input',
          block_id: 'meeting_select_block',
          element: {
            type: 'static_select',
            action_id: 'meeting_select',
            placeholder: { type: 'plain_text', text: 'Choose a meeting' },
            options: meetings.map((m: any) => ({
              text: { type: 'plain_text', text: `${m.title} (${new Date(m.scheduledStartAt).toLocaleDateString()})` },
              value: m.id,
            })),
          },
          label: { type: 'plain_text', text: 'Meeting' },
        },
      ],
    };
  }

  /**
   * Build schedule meeting modal
   */
  private buildScheduleMeetingModal(defaultChannel?: string): any {
    return {
      type: 'modal',
      callback_id: 'schedule_meeting_modal',
      title: { type: 'plain_text', text: 'Schedule Meeting' },
      submit: { type: 'plain_text', text: 'Schedule' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'input',
          block_id: 'title_block',
          element: {
            type: 'plain_text_input',
            action_id: 'title_input',
            placeholder: { type: 'plain_text', text: 'Meeting title' },
          },
          label: { type: 'plain_text', text: 'Title' },
        },
        {
          type: 'input',
          block_id: 'url_block',
          optional: true,
          element: {
            type: 'url_text_input',
            action_id: 'url_input',
            placeholder: { type: 'plain_text', text: 'Zoom, Meet, or Teams URL' },
          },
          label: { type: 'plain_text', text: 'Meeting URL (optional)' },
        },
        {
          type: 'input',
          block_id: 'datetime_block',
          optional: true,
          element: {
            type: 'datetimepicker',
            action_id: 'datetime_input',
          },
          label: { type: 'plain_text', text: 'Date & Time' },
        },
        {
          type: 'input',
          block_id: 'channel_block',
          optional: true,
          element: {
            type: 'channels_select',
            action_id: 'channel_select',
            placeholder: { type: 'plain_text', text: 'Select channel for notifications' },
            ...(defaultChannel && { initial_channel: defaultChannel }),
          },
          label: { type: 'plain_text', text: 'Notification Channel' },
        },
      ],
    };
  }

  /**
   * Build transcript modal
   */
  private async buildTranscriptModal(meetingId: string): Promise<any> {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    const transcript = await prisma.transcription.findFirst({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    const transcriptText = transcript?.text || 'No transcript available.';
    const truncatedText = transcriptText.length > 3000 ? transcriptText.substring(0, 3000) + '...' : transcriptText;

    return {
      type: 'modal',
      title: { type: 'plain_text', text: 'Transcript' },
      close: { type: 'plain_text', text: 'Close' },
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: meeting?.title || 'Meeting Transcript' },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: truncatedText },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: transcriptText.length > 3000
                ? `_Transcript truncated. <${process.env.FRONTEND_URL}/meetings/${meetingId}/transcript|View full transcript>_`
                : '',
            },
          ],
        },
      ],
    };
  }

  /**
   * Build share action items modal
   */
  private async buildShareActionItemsModal(meetingId: string): Promise<any> {
    return {
      type: 'modal',
      callback_id: 'share_action_items_modal',
      private_metadata: meetingId,
      title: { type: 'plain_text', text: 'Share Action Items' },
      submit: { type: 'plain_text', text: 'Share' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'input',
          block_id: 'channel_block',
          element: {
            type: 'channels_select',
            action_id: 'channel_select',
            placeholder: { type: 'plain_text', text: 'Select channel' },
          },
          label: { type: 'plain_text', text: 'Share to Channel' },
        },
        {
          type: 'input',
          block_id: 'mention_block',
          optional: true,
          element: {
            type: 'checkboxes',
            action_id: 'mention_checkbox',
            options: [
              {
                text: { type: 'plain_text', text: 'Mention assignees' },
                value: 'mention_assignees',
              },
            ],
          },
          label: { type: 'plain_text', text: 'Options' },
        },
      ],
    };
  }

  /**
   * Build share modal
   */
  private async buildShareModal(meetingId: string): Promise<any> {
    return {
      type: 'modal',
      callback_id: 'share_modal',
      private_metadata: meetingId,
      title: { type: 'plain_text', text: 'Share Meeting' },
      submit: { type: 'plain_text', text: 'Share' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'input',
          block_id: 'channel_block',
          element: {
            type: 'channels_select',
            action_id: 'channel_select',
            placeholder: { type: 'plain_text', text: 'Select channel' },
          },
          label: { type: 'plain_text', text: 'Share to Channel' },
        },
        {
          type: 'input',
          block_id: 'content_block',
          element: {
            type: 'checkboxes',
            action_id: 'content_checkbox',
            options: [
              { text: { type: 'plain_text', text: 'Summary' }, value: 'summary' },
              { text: { type: 'plain_text', text: 'Action Items' }, value: 'action_items' },
              { text: { type: 'plain_text', text: 'Transcript Link' }, value: 'transcript' },
            ],
            initial_options: [
              { text: { type: 'plain_text', text: 'Summary' }, value: 'summary' },
            ],
          },
          label: { type: 'plain_text', text: 'Include' },
        },
      ],
    };
  }

  /**
   * Build delete confirmation modal
   */
  private buildDeleteConfirmModal(meetingId: string): any {
    return {
      type: 'modal',
      callback_id: 'delete_confirm_modal',
      private_metadata: meetingId,
      title: { type: 'plain_text', text: 'Delete Meeting' },
      submit: { type: 'plain_text', text: 'Delete', emoji: true },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Are you sure you want to delete this meeting?*\n\nThis action cannot be undone. All recordings, transcripts, and summaries will be permanently deleted.',
          },
        },
      ],
    };
  }

  /**
   * Build meeting details blocks
   */
  private buildMeetingDetailsBlocks(meeting: any): any[] {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: meeting.title },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Date:*\n${new Date(meeting.scheduledStartAt).toLocaleString()}` },
          { type: 'mrkdwn', text: `*Duration:*\n${Math.round((meeting.durationSeconds || 0) / 60)} minutes` },
          { type: 'mrkdwn', text: `*Platform:*\n${meeting.platform}` },
          { type: 'mrkdwn', text: `*Status:*\n${meeting.status}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Get Summary' },
            value: meeting.id,
            action_id: 'get_summary',
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Transcript' },
            value: meeting.id,
            action_id: 'view_transcript',
          },
        ],
      },
    ];
  }

  // ============================================================================
  // Express Router Integration
  // ============================================================================

  /**
   * Get Express router for custom routes
   */
  getRouter(): Router {
    if (!this.receiver) {
      const router = Router();
      router.use((req, res) => {
        res.status(503).json({ error: 'Slack service not initialized' });
      });
      return router;
    }
    return this.receiver.router;
  }

  /**
   * Start the Slack bot (if using Socket Mode or standalone)
   */
  async start(port: number = 3001): Promise<void> {
    if (!this.app) {
      throw new Error('Slack app not initialized');
    }

    await this.app.start(port);
    logger.info(`Slack bot running on port ${port}`);
  }
}

// Export singleton instance
export const slackBotService = new SlackBotService();
