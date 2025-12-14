/**
 * Bot Recording Service - REAL IMPLEMENTATION
 *
 * Integrates with Recall.ai for automatic meeting bot joining and recording
 * Replaces all fake bot join implementations
 *
 * Recall.ai Features:
 * - Automatic bot joining for Zoom, Teams, Google Meet, Webex
 * - Real-time audio/video capture
 * - Webhook notifications for recording events
 * - Cloud storage integration
 * - Transcription pass-through
 *
 * Documentation: https://docs.recall.ai/
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface RecallBotConfig {
  meeting_url: string;
  bot_name?: string;
  transcription_options?: {
    provider: 'meeting_captions' | 'assembly_ai' | 'deepgram';
  };
  chat?: {
    on_bot_join?: {
      send_to: 'host' | 'everyone' | 'no_one';
      message: string;
    };
  };
  automatic_leave?: {
    waiting_room_timeout?: number;
    noone_joined_timeout?: number;
    everyone_left_timeout?: number;
  };
  automatic_video_output?: {
    in_call_recording: {
      kind: 'cloud_storage_location' | 'webhook';
      location?: {
        type: 's3' | 'gcs';
        bucket: string;
        prefix?: string;
      };
    };
  };
  automatic_audio_output?: {
    in_call_recording: {
      kind: 'cloud_storage_location';
      location: {
        type: 's3' | 'gcs';
        bucket: string;
        prefix?: string;
      };
    };
  };
}

export interface RecallBot {
  id: string;
  meeting_url: string;
  status: 'ready' | 'joining' | 'in_call' | 'done' | 'error' | 'fatal';
  join_at?: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  media_retention_end?: string;
  bot_name?: string;
  created_at: string;
  updated_at: string;
}

export interface RecallWebhookEvent {
  event: 'bot.status_change' | 'bot.media_output' | 'bot.error';
  data: {
    bot_id: string;
    status?: RecallBot['status'];
    code?: string;
    sub_code?: string;
    message?: string;
    media_type?: 'video' | 'audio' | 'transcript';
    output_location?: string;
  };
}

class BotRecordingService extends EventEmitter {
  private recallClient: AxiosInstance;
  private isConfigured: boolean = false;

  constructor() {
    super();

    // Initialize Recall.ai client
    const apiKey = process.env.RECALL_API_KEY;

    if (!apiKey) {
      logger.warn('RECALL_API_KEY not configured - bot recording will not work');
      this.isConfigured = false;
    } else {
      this.recallClient = axios.create({
        baseURL: 'https://api.recall.ai/api/v1',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      this.isConfigured = true;
      logger.info('Recall.ai bot recording service initialized');
    }
  }

  /**
   * Check if service is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Create and send a bot to join a meeting
   * REAL IMPLEMENTATION - Actually joins meetings!
   */
  async joinMeeting(
    meetingId: string,
    meetingUrl: string,
    options?: {
      botName?: string;
      onJoinMessage?: string;
      storageLocation?: {
        type: 's3' | 'gcs';
        bucket: string;
        prefix?: string;
      };
    }
  ): Promise<{ botId: string; status: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('Recall.ai is not configured. Set RECALL_API_KEY environment variable.');
      }

      logger.info('Creating Recall.ai bot for meeting', { meetingId, meetingUrl });

      // Build bot configuration
      const botConfig: RecallBotConfig = {
        meeting_url: meetingUrl,
        bot_name: options?.botName || 'OpenMeet Notetaker',
        transcription_options: {
          provider: 'meeting_captions', // Use native meeting captions when available
        },
        chat: {
          on_bot_join: {
            send_to: 'host',
            message:
              options?.onJoinMessage ||
              '👋 OpenMeet Notetaker has joined to record and transcribe this meeting.',
          },
        },
        automatic_leave: {
          waiting_room_timeout: 600, // 10 minutes
          noone_joined_timeout: 180, // 3 minutes
          everyone_left_timeout: 30, // 30 seconds
        },
      };

      // Configure storage location if provided
      if (options?.storageLocation) {
        botConfig.automatic_video_output = {
          in_call_recording: {
            kind: 'cloud_storage_location',
            location: {
              type: options.storageLocation.type,
              bucket: options.storageLocation.bucket,
              prefix: options.storageLocation.prefix || `meetings/${meetingId}/`,
            },
          },
        };

        botConfig.automatic_audio_output = {
          in_call_recording: {
            kind: 'cloud_storage_location',
            location: {
              type: options.storageLocation.type,
              bucket: options.storageLocation.bucket,
              prefix: options.storageLocation.prefix || `meetings/${meetingId}/`,
            },
          },
        };
      }

      // Create bot via Recall.ai API
      const response = await this.recallClient.post<RecallBot>('/bot', botConfig);

      const bot = response.data;

      logger.info('Recall.ai bot created successfully', {
        meetingId,
        botId: bot.id,
        status: bot.status,
      });

      // Store bot information in meeting metadata
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          metadata: {
            botRecording: {
              provider: 'recall_ai',
              externalBotId: bot.id,
              status: bot.status,
              meetingUrl,
              botName: bot.bot_name,
              joinedAt: bot.join_at ? new Date(bot.join_at).toISOString() : null,
              config: botConfig,
              recallData: bot,
            },
          } as any,
        },
      });

      // Emit event
      this.emit('bot-created', { meetingId, botId: bot.id, status: bot.status });

      return {
        botId: bot.id,
        status: bot.status,
      };
    } catch (error: any) {
      logger.error('Error creating Recall.ai bot', {
        error: error.message,
        response: error.response?.data,
        meetingId,
        meetingUrl,
      });

      // Update meeting status to failed
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          metadata: {
            botRecording: {
              status: 'failed',
              error: error.message,
            },
          } as any,
        },
      });

      throw new Error(`Failed to create bot: ${error.message}`);
    }
  }

  /**
   * Get bot status from Recall.ai
   */
  async getBotStatus(botId: string): Promise<RecallBot> {
    try {
      if (!this.isConfigured) {
        throw new Error('Recall.ai is not configured');
      }

      const response = await this.recallClient.get<RecallBot>(`/bot/${botId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Error getting bot status', { error: error.message, botId });
      throw error;
    }
  }

  /**
   * Stop and remove a bot from a meeting
   */
  async leaveBot(botId: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        throw new Error('Recall.ai is not configured');
      }

      logger.info('Removing Recall.ai bot from meeting', { botId });

      // Delete bot via API (this makes it leave the meeting)
      await this.recallClient.delete(`/bot/${botId}`);

      // Update database - find meeting with this bot
      const meeting = await prisma.meeting.findFirst({
        where: {
          metadata: {
            path: ['botRecording', 'externalBotId'],
            equals: botId,
          },
        },
      });

      if (meeting) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            metadata: {
              ...(meeting.metadata as any),
              botRecording: {
                ...((meeting.metadata as any)?.botRecording || {}),
                status: 'done',
                leftAt: new Date().toISOString(),
              },
            } as any,
          },
        });
      }

      logger.info('Recall.ai bot removed successfully', { botId });

      this.emit('bot-left', { botId });
    } catch (error: any) {
      logger.error('Error removing bot', { error: error.message, botId });
      throw error;
    }
  }

  /**
   * Handle webhook from Recall.ai
   * Called when bot status changes or media is available
   */
  async handleWebhook(event: RecallWebhookEvent): Promise<void> {
    try {
      logger.info('Received Recall.ai webhook', { event: event.event, botId: event.data.bot_id });

      const { bot_id, status, media_type, output_location, code, message } = event.data;

      // Find meeting with this bot
      const meeting = await prisma.meeting.findFirst({
        where: {
          metadata: {
            path: ['botRecording', 'externalBotId'],
            equals: bot_id,
          },
        },
      });

      if (!meeting) {
        logger.warn('Meeting not found for bot webhook', { botId: bot_id });
        return;
      }

      // Handle different event types
      switch (event.event) {
        case 'bot.status_change':
          await this.handleStatusChange(meeting, status!);
          break;

        case 'bot.media_output':
          await this.handleMediaOutput(meeting, media_type!, output_location!);
          break;

        case 'bot.error':
          await this.handleBotError(meeting, code!, message!);
          break;
      }
    } catch (error: any) {
      logger.error('Error handling Recall.ai webhook', { error: error.message, event });
    }
  }

  /**
   * Handle bot status change
   */
  private async handleStatusChange(
    meeting: any,
    newStatus: RecallBot['status']
  ): Promise<void> {
    const botRecording = (meeting.metadata as any)?.botRecording;

    logger.info('Bot status changed', {
      botId: botRecording?.externalBotId,
      oldStatus: botRecording?.status,
      newStatus,
    });

    // Update bot recording status in metadata
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        metadata: {
          ...(meeting.metadata as any),
          botRecording: {
            ...botRecording,
            status: newStatus,
            recordingStartedAt: newStatus === 'in_call' ? new Date().toISOString() : botRecording?.recordingStartedAt,
            recordingEndedAt: newStatus === 'done' ? new Date().toISOString() : botRecording?.recordingEndedAt,
          },
        } as any,
      },
    });

    // Emit event
    this.emit('bot-status-change', {
      meetingId: meeting.id,
      botId: botRecording?.externalBotId,
      status: newStatus,
    });
  }

  /**
   * Handle media output (video/audio/transcript available)
   */
  private async handleMediaOutput(
    meeting: any,
    mediaType: 'video' | 'audio' | 'transcript',
    outputLocation: string
  ): Promise<void> {
    const botRecording = (meeting.metadata as any)?.botRecording;

    logger.info('Bot media output available', {
      botId: botRecording?.externalBotId,
      mediaType,
      outputLocation,
    });

    // Store media location in metadata
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        metadata: {
          ...(meeting.metadata as any),
          botRecording: {
            ...botRecording,
            outputs: {
              ...(botRecording?.outputs || {}),
              [mediaType]: outputLocation,
            },
          },
        } as any,
      },
    });

    // If audio is available, trigger transcription
    if (mediaType === 'audio' || mediaType === 'video') {
      this.emit('media-ready', {
        meetingId: meeting.id,
        mediaType,
        location: outputLocation,
      });
    }
  }

  /**
   * Handle bot error
   */
  private async handleBotError(
    meeting: any,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    const botRecording = (meeting.metadata as any)?.botRecording;

    logger.error('Bot encountered error', {
      botId: botRecording?.externalBotId,
      errorCode,
      errorMessage,
    });

    // Update bot recording with error
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        metadata: {
          ...(meeting.metadata as any),
          botRecording: {
            ...botRecording,
            status: 'error',
            error: { code: errorCode, message: errorMessage },
          },
        } as any,
      },
    });

    // Emit event
    this.emit('bot-error', {
      meetingId: meeting.id,
      botId: botRecording?.externalBotId,
      error: { code: errorCode, message: errorMessage },
    });
  }

  /**
   * List all active bots
   */
  async listActiveBots(): Promise<RecallBot[]> {
    try {
      if (!this.isConfigured) {
        throw new Error('Recall.ai is not configured');
      }

      const response = await this.recallClient.get<{ results: RecallBot[] }>('/bot');
      return response.data.results;
    } catch (error: any) {
      logger.error('Error listing active bots', { error: error.message });
      throw error;
    }
  }

  /**
   * Get recording media (audio/video) download URL
   */
  async getRecordingMedia(
    botId: string,
    mediaType: 'video' | 'audio'
  ): Promise<{ url: string; expires_at: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('Recall.ai is not configured');
      }

      const response = await this.recallClient.get(`/bot/${botId}/${mediaType}`);
      return response.data;
    } catch (error: any) {
      logger.error('Error getting recording media', { error: error.message, botId, mediaType });
      throw error;
    }
  }
}

// Singleton instance
export const botRecordingService = new BotRecordingService();
