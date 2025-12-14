/**
 * Live Transcription Service
 * Real-time audio streaming and transcription with OpenAI Whisper
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import axios from 'axios';
import * as stream from 'stream';
import FormData from 'form-data';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'live-transcription-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface LiveTranscriptionOptions {
  liveSessionId: string;
  meetingId: string;
  language?: string;
  enableDiarization?: boolean;
  sampleRate?: number;
  channels?: number;
}

export interface LiveTranscriptSegment {
  id: string;
  text: string;
  speaker?: string;
  speakerId?: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isFinal: boolean;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  duration?: number;
}

/**
 * Live Transcription Service
 * Handles real-time audio streaming and transcription
 */
export class LiveTranscriptionService extends EventEmitter {
  private io: SocketIOServer;
  private openaiApiKey: string;
  private activeSessions: Map<string, LiveTranscriptionSession>;

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.activeSessions = new Map();
  }

  /**
   * Start a live transcription session
   */
  async startSession(options: LiveTranscriptionOptions): Promise<void> {
    try {
      logger.info(`Starting live transcription session: ${options.liveSessionId}`);

      // Check if session already exists
      if (this.activeSessions.has(options.liveSessionId)) {
        throw new Error('Live transcription session already active');
      }

      // Create session in database
      await prisma.liveSession.update({
        where: { id: options.liveSessionId },
        data: {
          status: 'active',
          startedAt: new Date(),
          language: options.language || 'en',
        },
      });

      // Create and start transcription session
      const session = new LiveTranscriptionSession(
        options,
        this.openaiApiKey,
        this.io,
        prisma
      );

      this.activeSessions.set(options.liveSessionId, session);

      session.on('segment', (segment: LiveTranscriptSegment) => {
        this.emit('segment', { liveSessionId: options.liveSessionId, segment });
      });

      session.on('error', (error: Error) => {
        logger.error(`Live transcription error: ${error.message}`);
        this.emit('error', { liveSessionId: options.liveSessionId, error });
      });

      await session.start();

      logger.info(`Live transcription session started: ${options.liveSessionId}`);
    } catch (error) {
      logger.error('Failed to start live transcription session:', error);
      throw error;
    }
  }

  /**
   * Process audio chunk
   */
  async processAudioChunk(liveSessionId: string, chunk: AudioChunk): Promise<void> {
    const session = this.activeSessions.get(liveSessionId);

    if (!session) {
      throw new Error('Live transcription session not found');
    }

    await session.processAudioChunk(chunk);
  }

  /**
   * Stop a live transcription session
   */
  async stopSession(liveSessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(liveSessionId);

      if (!session) {
        logger.warn(`Live transcription session not found: ${liveSessionId}`);
        return;
      }

      await session.stop();
      this.activeSessions.delete(liveSessionId);

      // Update session in database
      await prisma.liveSession.update({
        where: { id: liveSessionId },
        data: {
          status: 'completed',
          endedAt: new Date(),
        },
      });

      logger.info(`Live transcription session stopped: ${liveSessionId}`);
    } catch (error) {
      logger.error('Failed to stop live transcription session:', error);
      throw error;
    }
  }

  /**
   * Pause a live transcription session
   */
  async pauseSession(liveSessionId: string): Promise<void> {
    const session = this.activeSessions.get(liveSessionId);

    if (!session) {
      throw new Error('Live transcription session not found');
    }

    await session.pause();

    await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { status: 'paused' },
    });

    logger.info(`Live transcription session paused: ${liveSessionId}`);
  }

  /**
   * Resume a live transcription session
   */
  async resumeSession(liveSessionId: string): Promise<void> {
    const session = this.activeSessions.get(liveSessionId);

    if (!session) {
      throw new Error('Live transcription session not found');
    }

    await session.resume();

    await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: { status: 'active' },
    });

    logger.info(`Live transcription session resumed: ${liveSessionId}`);
  }

  /**
   * Get session status
   */
  getSessionStatus(liveSessionId: string): {
    isActive: boolean;
    isPaused: boolean;
    segmentCount: number;
  } | null {
    const session = this.activeSessions.get(liveSessionId);

    if (!session) {
      return null;
    }

    return session.getStatus();
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }
}

/**
 * Live Transcription Session
 * Manages a single live transcription session
 */
class LiveTranscriptionSession extends EventEmitter {
  private options: LiveTranscriptionOptions;
  private openaiApiKey: string;
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private audioBuffer: Buffer[];
  private bufferDuration: number;
  private isActive: boolean;
  private isPaused: boolean;
  private segmentCount: number;
  private processingInterval: NodeJS.Timeout | null;
  private currentTimestamp: number;
  private speakerMap: Map<string, string>;
  private currentSpeakerId: string;
  private lastSegmentEndTime: number;

  constructor(
    options: LiveTranscriptionOptions,
    openaiApiKey: string,
    io: SocketIOServer,
    prisma: PrismaClient
  ) {
    super();
    this.options = options;
    this.openaiApiKey = openaiApiKey;
    this.io = io;
    this.prisma = prisma;
    this.audioBuffer = [];
    this.bufferDuration = 0;
    this.isActive = false;
    this.isPaused = false;
    this.segmentCount = 0;
    this.processingInterval = null;
    this.currentTimestamp = 0;
    this.speakerMap = new Map();
    this.currentSpeakerId = '1';
    this.lastSegmentEndTime = 0;
  }

  async start(): Promise<void> {
    this.isActive = true;

    // Start processing audio buffer at regular intervals (every 2 seconds)
    this.processingInterval = setInterval(() => {
      if (!this.isPaused && this.audioBuffer.length > 0) {
        this.processBufferedAudio().catch(err => {
          logger.error('Error processing buffered audio:', err);
          this.emit('error', err);
        });
      }
    }, 2000);
  }

  async stop(): Promise<void> {
    this.isActive = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process any remaining audio in buffer
    if (this.audioBuffer.length > 0) {
      await this.processBufferedAudio();
    }
  }

  async pause(): Promise<void> {
    this.isPaused = true;
  }

  async resume(): Promise<void> {
    this.isPaused = false;
  }

  async processAudioChunk(chunk: AudioChunk): Promise<void> {
    if (!this.isActive || this.isPaused) {
      return;
    }

    // Add chunk to buffer
    this.audioBuffer.push(chunk.data);
    this.bufferDuration += chunk.duration || 0;
  }

  private async processBufferedAudio(): Promise<void> {
    if (this.audioBuffer.length === 0) {
      return;
    }

    try {
      // Concatenate all buffered audio chunks
      const audioData = Buffer.concat(this.audioBuffer);

      // Clear buffer
      this.audioBuffer = [];
      const processingDuration = this.bufferDuration;
      this.bufferDuration = 0;

      // Transcribe using OpenAI Whisper
      const segments = await this.transcribeAudio(audioData);

      // Process and save segments
      for (const segment of segments) {
        await this.processSegment(segment, processingDuration);
      }
    } catch (error) {
      logger.error('Error processing buffered audio:', error);
      this.emit('error', error);
    }
  }

  private async transcribeAudio(audioData: Buffer): Promise<any[]> {
    try {
      const whisperUrl = process.env.WHISPER_STREAM_URL || 'https://api.openai.com/v1/audio/transcriptions';

      // Create form data for Whisper API
      const formData = new FormData();
      formData.append('file', audioData, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });
      formData.append('model', 'whisper-1');

      if (this.options.language) {
        formData.append('language', this.options.language);
      }

      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', JSON.stringify(['segment', 'word']));

      // Call OpenAI Whisper API
      const response = await axios.post(
        whisperUrl,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      return response.data.segments || [];
    } catch (error: any) {
      logger.error('Whisper API error:', error.response?.data || error.message);
      throw error;
    }
  }

  private async processSegment(whisperSegment: any, duration: number): Promise<void> {
    const segmentId = `seg_${this.options.liveSessionId}_${this.segmentCount}`;
    this.segmentCount++;

    // Simple speaker detection based on pauses
    // In production, use proper diarization service
    const speakerId = this.detectSpeaker(whisperSegment);
    const speaker = this.speakerMap.get(speakerId) || `Speaker ${speakerId}`;

    const segment: LiveTranscriptSegment = {
      id: segmentId,
      text: whisperSegment.text.trim(),
      speaker,
      speakerId,
      startTime: this.currentTimestamp + (whisperSegment.start || 0),
      endTime: this.currentTimestamp + (whisperSegment.end || duration),
      confidence: whisperSegment.avg_logprob ? Math.exp(whisperSegment.avg_logprob) : 0.9,
      isFinal: true,
      words: whisperSegment.words?.map((word: any) => ({
        word: word.word,
        startTime: this.currentTimestamp + word.start,
        endTime: this.currentTimestamp + word.end,
        confidence: 0.9,
      })),
    };

    // Save to database
    await this.prisma.liveTranscriptSegment.create({
      data: {
        id: segmentId,
        liveSessionId: this.options.liveSessionId,
        segmentIndex: this.segmentCount,
        text: segment.text,
        speaker: segment.speaker,
        speakerId: segment.speakerId,
        startTime: segment.startTime,
        endTime: segment.endTime,
        confidence: segment.confidence,
        isFinal: segment.isFinal,
        language: this.options.language,
        words: segment.words || [],
      },
    });

    // Broadcast to WebSocket clients
    this.io.to(`live:${this.options.meetingId}`).emit('live:transcript', segment);

    // Emit event
    this.emit('segment', segment);

    // Update current timestamp
    this.currentTimestamp = segment.endTime;
  }

  private detectSpeaker(segment: any): string {
    // Use Whisper's speaker information if available
    if (segment.speaker_id) {
      return segment.speaker_id;
    }

    // Use voice activity detection and pause-based speaker change detection
    // This is a simplified but functional approach
    const currentTime = this.currentTimestamp + (segment.start || 0);

    // Check if there was a long pause since last segment (>2 seconds)
    if (this.lastSegmentEndTime && (currentTime - this.lastSegmentEndTime) > 2.0) {
      // Long pause detected - likely speaker change
      this.currentSpeakerId = (parseInt(this.currentSpeakerId || '1') % 4 + 1).toString();
    }

    this.lastSegmentEndTime = this.currentTimestamp + (segment.end || currentTime);

    return this.currentSpeakerId || '1';
  }

  getStatus(): {
    isActive: boolean;
    isPaused: boolean;
    segmentCount: number;
  } {
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      segmentCount: this.segmentCount,
    };
  }
}

export default LiveTranscriptionService;
