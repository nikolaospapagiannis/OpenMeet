/**
 * Live Meeting WebSocket Handler
 * Manages real-time collaboration, transcription, and AI assistance during live meetings
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import LiveTranscriptionService from '../services/LiveTranscriptionService';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'live-meeting-handler' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

interface LiveParticipant {
  userId?: string;
  userName: string;
  socketId: string;
  joinedAt: Date;
  isActive: boolean;
}

interface LiveBookmarkData {
  title: string;
  description?: string;
  type?: 'manual' | 'action_item' | 'decision' | 'question' | 'key_moment';
  tags?: string[];
}

interface LiveReactionData {
  emoji: string;
  userName?: string;
}

interface LiveNote {
  userId?: string;
  userName: string;
  content: string;
  timestamp: number;
}

/**
 * Live Meeting Handler
 * Manages WebSocket connections for live meetings
 */
export class LiveMeetingHandler {
  private io: SocketIOServer;
  private liveTranscriptionService: LiveTranscriptionService;
  private meetingRooms: Map<string, Set<string>>;
  private meetingParticipants: Map<string, Map<string, LiveParticipant>>;
  private meetingNotes: Map<string, LiveNote[]>;
  private aiServiceUrl: string;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.liveTranscriptionService = new LiveTranscriptionService(io);
    this.meetingRooms = new Map();
    this.meetingParticipants = new Map();
    this.meetingNotes = new Map();
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        (socket as any).user = decoded;

        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user;
      logger.info(`Client connected: ${socket.id} (User: ${user?.id})`);

      // Join live meeting room
      socket.on('live:join', async (data: { meetingId: string; userName: string }) => {
        await this.handleJoinMeeting(socket, data);
      });

      // Leave live meeting room
      socket.on('live:leave', async (data: { meetingId: string }) => {
        await this.handleLeaveMeeting(socket, data);
      });

      // Start live transcription
      socket.on('live:start-transcription', async (data: { liveSessionId: string; meetingId: string; language?: string }) => {
        await this.handleStartTranscription(socket, data);
      });

      // Audio chunk for transcription
      socket.on('live:audio-chunk', async (data: { liveSessionId: string; audioData: Buffer; timestamp: number }) => {
        await this.handleAudioChunk(socket, data);
      });

      // Stop live transcription
      socket.on('live:stop-transcription', async (data: { liveSessionId: string }) => {
        await this.handleStopTranscription(socket, data);
      });

      // Create bookmark
      socket.on('live:create-bookmark', async (data: { meetingId: string; liveSessionId: string; bookmark: LiveBookmarkData; timestamp: number }) => {
        await this.handleCreateBookmark(socket, data);
      });

      // Get live AI suggestions
      socket.on('live:get-suggestions', async (data: { meetingId: string; liveSessionId: string; context: string }) => {
        await this.handleGetSuggestions(socket, data);
      });

      // Send reaction/emoji
      socket.on('live:reaction', async (data: { meetingId: string; liveSessionId: string; reaction: LiveReactionData; timestamp: number }) => {
        await this.handleReaction(socket, data);
      });

      // Collaborative note
      socket.on('live:note', async (data: { meetingId: string; note: string; timestamp: number }) => {
        await this.handleNote(socket, data);
      });

      // Request participant list
      socket.on('live:get-participants', async (data: { meetingId: string }) => {
        await this.handleGetParticipants(socket, data);
      });

      // Disconnect handler
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });

    // Live transcription events
    this.liveTranscriptionService.on('segment', (data) => {
      logger.info(`New transcript segment for session ${data.liveSessionId}`);
    });

    this.liveTranscriptionService.on('error', (data) => {
      logger.error(`Transcription error for session ${data.liveSessionId}:`, data.error);
    });
  }

  /**
   * Handle join meeting
   */
  private async handleJoinMeeting(socket: Socket, data: { meetingId: string; userName: string }): Promise<void> {
    try {
      const { meetingId, userName } = data;
      const user = (socket as any).user;

      logger.info(`User ${userName} joining meeting ${meetingId}`);

      // Verify meeting exists
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        socket.emit('error', { message: 'Meeting not found' });
        return;
      }

      // Join Socket.IO room
      socket.join(`live:${meetingId}`);

      // Track room membership
      if (!this.meetingRooms.has(meetingId)) {
        this.meetingRooms.set(meetingId, new Set());
      }
      this.meetingRooms.get(meetingId)!.add(socket.id);

      // Track participant
      if (!this.meetingParticipants.has(meetingId)) {
        this.meetingParticipants.set(meetingId, new Map());
      }

      const participant: LiveParticipant = {
        userId: user?.id,
        userName,
        socketId: socket.id,
        joinedAt: new Date(),
        isActive: true,
      };

      this.meetingParticipants.get(meetingId)!.set(socket.id, participant);

      // Broadcast participant joined
      this.io.to(`live:${meetingId}`).emit('live:participant-joined', {
        participant: {
          userName: participant.userName,
          userId: participant.userId,
          joinedAt: participant.joinedAt,
        },
        participantCount: this.meetingParticipants.get(meetingId)!.size,
      });

      // Send current participants to new joiner
      socket.emit('live:joined', {
        meetingId,
        participants: Array.from(this.meetingParticipants.get(meetingId)!.values()).map(p => ({
          userName: p.userName,
          userId: p.userId,
          joinedAt: p.joinedAt,
          isActive: p.isActive,
        })),
        notes: this.meetingNotes.get(meetingId) || [],
      });

      logger.info(`User ${userName} joined meeting ${meetingId}. Total participants: ${this.meetingParticipants.get(meetingId)!.size}`);
    } catch (error) {
      logger.error('Error joining meeting:', error);
      socket.emit('error', { message: 'Failed to join meeting' });
    }
  }

  /**
   * Handle leave meeting
   */
  private async handleLeaveMeeting(socket: Socket, data: { meetingId: string }): Promise<void> {
    try {
      const { meetingId } = data;

      socket.leave(`live:${meetingId}`);

      // Remove from room tracking
      this.meetingRooms.get(meetingId)?.delete(socket.id);

      // Remove participant
      const participant = this.meetingParticipants.get(meetingId)?.get(socket.id);
      if (participant) {
        this.meetingParticipants.get(meetingId)?.delete(socket.id);

        // Broadcast participant left
        this.io.to(`live:${meetingId}`).emit('live:participant-left', {
          participant: {
            userName: participant.userName,
            userId: participant.userId,
          },
          participantCount: this.meetingParticipants.get(meetingId)?.size || 0,
        });
      }

      logger.info(`User left meeting ${meetingId}`);
    } catch (error) {
      logger.error('Error leaving meeting:', error);
    }
  }

  /**
   * Handle start transcription
   */
  private async handleStartTranscription(socket: Socket, data: { liveSessionId: string; meetingId: string; language?: string }): Promise<void> {
    try {
      const { liveSessionId, meetingId, language } = data;

      logger.info(`Starting live transcription for session ${liveSessionId}`);

      // Start transcription service
      await this.liveTranscriptionService.startSession({
        liveSessionId,
        meetingId,
        language: language || 'en',
        enableDiarization: true,
      });

      // Notify room
      this.io.to(`live:${meetingId}`).emit('live:transcription-started', {
        liveSessionId,
        language: language || 'en',
      });

      socket.emit('live:transcription-started', { liveSessionId });
    } catch (error: any) {
      logger.error('Error starting transcription:', error);
      socket.emit('error', { message: error.message || 'Failed to start transcription' });
    }
  }

  /**
   * Handle audio chunk
   */
  private async handleAudioChunk(socket: Socket, data: { liveSessionId: string; audioData: Buffer; timestamp: number }): Promise<void> {
    try {
      const { liveSessionId, audioData, timestamp } = data;

      await this.liveTranscriptionService.processAudioChunk(liveSessionId, {
        data: Buffer.from(audioData),
        timestamp,
      });
    } catch (error) {
      logger.error('Error processing audio chunk:', error);
    }
  }

  /**
   * Handle stop transcription
   */
  private async handleStopTranscription(socket: Socket, data: { liveSessionId: string }): Promise<void> {
    try {
      const { liveSessionId } = data;

      await this.liveTranscriptionService.stopSession(liveSessionId);

      socket.emit('live:transcription-stopped', { liveSessionId });
    } catch (error: any) {
      logger.error('Error stopping transcription:', error);
      socket.emit('error', { message: error.message || 'Failed to stop transcription' });
    }
  }

  /**
   * Handle create bookmark
   */
  private async handleCreateBookmark(socket: Socket, data: { meetingId: string; liveSessionId: string; bookmark: LiveBookmarkData; timestamp: number }): Promise<void> {
    try {
      const { meetingId, liveSessionId, bookmark, timestamp } = data;
      const user = (socket as any).user;

      // Create bookmark in database
      const newBookmark = await prisma.liveBookmark.create({
        data: {
          liveSessionId,
          meetingId,
          userId: user?.id,
          type: bookmark.type || 'manual',
          title: bookmark.title,
          description: bookmark.description,
          timestampSeconds: timestamp,
          autoDetected: false,
          tags: bookmark.tags || [],
        },
      });

      // Broadcast to room
      this.io.to(`live:${meetingId}`).emit('live:bookmark-created', {
        bookmark: newBookmark,
      });

      logger.info(`Bookmark created for meeting ${meetingId} at ${timestamp}s`);
    } catch (error) {
      logger.error('Error creating bookmark:', error);
      socket.emit('error', { message: 'Failed to create bookmark' });
    }
  }

  /**
   * Handle get AI suggestions
   */
  private async handleGetSuggestions(socket: Socket, data: { meetingId: string; liveSessionId: string; context: string }): Promise<void> {
    try {
      const { meetingId, liveSessionId, context } = data;

      logger.info(`Getting AI suggestions for meeting ${meetingId}`);

      // Call AI service for live analysis
      const response = await axios.post(`${this.aiServiceUrl}/api/v1/live-analyze`, {
        liveSessionId,
        meetingId,
        context,
        analysisTypes: ['action_items', 'questions', 'decisions', 'tone_analysis'],
      });

      const insights = response.data;

      // Save insights to database
      for (const insight of insights.actionItems || []) {
        await prisma.liveInsight.create({
          data: {
            liveSessionId,
            insightType: 'action_item',
            content: insight.content,
            confidence: insight.confidence || 0.8,
            timestampSeconds: insight.timestamp || Date.now() / 1000,
            metadata: insight,
          },
        });
      }

      // Broadcast to room
      this.io.to(`live:${meetingId}`).emit('live:suggestions', insights);

      socket.emit('live:suggestions', insights);
    } catch (error: any) {
      logger.error('Error getting AI suggestions:', error);
      socket.emit('error', { message: error.message || 'Failed to get suggestions' });
    }
  }

  /**
   * Handle reaction
   */
  private async handleReaction(socket: Socket, data: { meetingId: string; liveSessionId: string; reaction: LiveReactionData; timestamp: number }): Promise<void> {
    try {
      const { meetingId, liveSessionId, reaction, timestamp } = data;
      const user = (socket as any).user;

      // Save reaction
      const newReaction = await prisma.liveReaction.create({
        data: {
          liveSessionId,
          userId: user?.id,
          userName: reaction.userName,
          emoji: reaction.emoji,
          timestampSeconds: timestamp,
        },
      });

      // Broadcast to room
      this.io.to(`live:${meetingId}`).emit('live:reaction', {
        reaction: newReaction,
      });
    } catch (error) {
      logger.error('Error handling reaction:', error);
    }
  }

  /**
   * Handle collaborative note
   */
  private async handleNote(socket: Socket, data: { meetingId: string; note: string; timestamp: number }): Promise<void> {
    try {
      const { meetingId, note, timestamp } = data;
      const user = (socket as any).user;
      const participant = this.meetingParticipants.get(meetingId)?.get(socket.id);

      if (!participant) {
        return;
      }

      const newNote: LiveNote = {
        userId: user?.id,
        userName: participant.userName,
        content: note,
        timestamp,
      };

      // Store note
      if (!this.meetingNotes.has(meetingId)) {
        this.meetingNotes.set(meetingId, []);
      }
      this.meetingNotes.get(meetingId)!.push(newNote);

      // Broadcast to room
      this.io.to(`live:${meetingId}`).emit('live:note', { note: newNote });
    } catch (error) {
      logger.error('Error handling note:', error);
    }
  }

  /**
   * Handle get participants
   */
  private async handleGetParticipants(socket: Socket, data: { meetingId: string }): Promise<void> {
    try {
      const { meetingId } = data;

      const participants = Array.from(this.meetingParticipants.get(meetingId)?.values() || []).map(p => ({
        userName: p.userName,
        userId: p.userId,
        joinedAt: p.joinedAt,
        isActive: p.isActive,
      }));

      socket.emit('live:participants', { participants });
    } catch (error) {
      logger.error('Error getting participants:', error);
    }
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(socket: Socket): Promise<void> {
    logger.info(`Client disconnected: ${socket.id}`);

    // Find and remove from all meetings
    for (const [meetingId, participants] of this.meetingParticipants.entries()) {
      const participant = participants.get(socket.id);
      if (participant) {
        participants.delete(socket.id);

        // Broadcast participant left
        this.io.to(`live:${meetingId}`).emit('live:participant-left', {
          participant: {
            userName: participant.userName,
            userId: participant.userId,
          },
          participantCount: participants.size,
        });
      }
    }

    // Clean up room tracking
    for (const [meetingId, sockets] of this.meetingRooms.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.meetingRooms.delete(meetingId);
        this.meetingParticipants.delete(meetingId);
        this.meetingNotes.delete(meetingId);
      }
    }
  }

  /**
   * Broadcast event to meeting room
   */
  public broadcastToMeeting(meetingId: string, event: string, data: any): void {
    this.io.to(`live:${meetingId}`).emit(event, data);
  }

  /**
   * Get active meetings
   */
  public getActiveMeetings(): string[] {
    return Array.from(this.meetingRooms.keys());
  }

  /**
   * Get meeting participant count
   */
  public getMeetingParticipantCount(meetingId: string): number {
    return this.meetingParticipants.get(meetingId)?.size || 0;
  }
}

export default LiveMeetingHandler;
