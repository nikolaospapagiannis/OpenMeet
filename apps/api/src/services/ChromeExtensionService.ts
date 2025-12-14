/**
 * Chrome Extension Service
 *
 * Backend support for Chrome Extension (Botless Recording)
 * Competitive Feature: Fathom's #1 Differentiator - Botless Meeting Recording
 *
 * Features:
 * - Botless recording (no visible bot in meeting)
 * - Browser-based audio capture
 * - Real-time transcription streaming
 * - Screen capture and slide detection
 * - Cross-platform meeting support (Zoom, Meet, Teams)
 * - Extension settings and preferences
 * - Background audio processing
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import { slideCaptureService } from './SlideCaptureService';
import { StorageService } from './storage';
import * as extensionMethods from './chrome-extension-methods';

const prisma = new PrismaClient();

// Initialize Redis for session persistence
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '4002'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'ext_session:',
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
});

// Redis key prefixes
const SESSION_PREFIX = 'session:';
const AUDIO_BUFFER_PREFIX = 'audio_buffer:';
const SESSION_EXPIRY = 60 * 60 * 24; // 24 hours

// Use the properly configured StorageService for S3/MinIO
const storageService = new StorageService();

// AI Service configuration - use local service, fallback to OpenAI
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:4200';
const USE_LOCAL_AI = process.env.USE_LOCAL_AI !== 'false'; // Default to local AI

export interface ExtensionSession {
  id: string;
  userId: string;
  organizationId: string;
  meetingId?: string;
  platform: 'zoom' | 'google_meet' | 'microsoft_teams' | 'webex' | 'other';
  meetingUrl: string;
  meetingTitle?: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  audioChunks: number;
  transcriptSegments: number;
  capturedSlides: number;
}

export interface AudioChunk {
  sessionId: string;
  chunkIndex: number;
  audioData: Buffer;
  timestamp: number;
  format: 'webm' | 'mp3' | 'wav';
  sampleRate: number;
  channels: number;
}

export interface ExtensionSettings {
  userId: string;
  autoRecordMeetings: boolean;
  recordAudio: boolean;
  recordVideo: boolean;
  captureSlides: boolean;
  enableLiveCaptions: boolean;
  defaultMeetingPrivacy: 'private' | 'team' | 'organization';
  excludedDomains: string[];
  notificationPreferences: {
    showRecordingIndicator: boolean;
    notifyOnMeetingEnd: boolean;
    notifyOnTranscriptReady: boolean;
  };
}

export interface MeetingMetadata {
  platform: string;
  meetingUrl: string;
  meetingId?: string;
  title?: string;
  participants?: Array<{
    name: string;
    email?: string;
    isSelf: boolean;
  }>;
  startTime: Date;
  detectedLanguage?: string;
}

class ChromeExtensionService {
  // In-memory cache for fast access (backed by Redis for persistence)
  private sessionCache: Map<string, ExtensionSession> = new Map();
  private audioBufferCache: Map<string, Buffer[]> = new Map();

  /**
   * Store session in Redis
   */
  private async saveSessionToRedis(session: ExtensionSession): Promise<void> {
    try {
      const key = `${SESSION_PREFIX}${session.id}`;
      await redis.setex(
        key,
        SESSION_EXPIRY,
        JSON.stringify({
          ...session,
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt?.toISOString(),
        })
      );
      // Also track by userId for lookups
      await redis.setex(`user_session:${session.userId}`, SESSION_EXPIRY, session.id);
    } catch (error) {
      logger.error('Failed to save session to Redis', { error, sessionId: session.id });
    }
  }

  /**
   * Load session from Redis
   */
  private async loadSessionFromRedis(sessionId: string): Promise<ExtensionSession | null> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      const data = await redis.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        ...parsed,
        startedAt: new Date(parsed.startedAt),
        endedAt: parsed.endedAt ? new Date(parsed.endedAt) : undefined,
      };
    } catch (error) {
      logger.error('Failed to load session from Redis', { error, sessionId });
      return null;
    }
  }

  /**
   * Delete session from Redis
   */
  private async deleteSessionFromRedis(sessionId: string, userId: string): Promise<void> {
    try {
      await redis.del(`${SESSION_PREFIX}${sessionId}`);
      await redis.del(`user_session:${userId}`);
      await redis.del(`${AUDIO_BUFFER_PREFIX}${sessionId}`);
    } catch (error) {
      logger.error('Failed to delete session from Redis', { error, sessionId });
    }
  }

  /**
   * Get session (from cache or Redis)
   */
  private async getSession(sessionId: string): Promise<ExtensionSession | null> {
    // Check cache first
    let session = this.sessionCache.get(sessionId);
    if (session) return session;

    // Load from Redis
    session = await this.loadSessionFromRedis(sessionId);
    if (session) {
      // Update cache
      this.sessionCache.set(sessionId, session);
    }
    return session;
  }

  /**
   * Get active session for user
   */
  async getActiveSessionForUser(userId: string): Promise<ExtensionSession | null> {
    try {
      const sessionId = await redis.get(`user_session:${userId}`);
      if (!sessionId) return null;
      return this.getSession(sessionId);
    } catch (error) {
      logger.error('Failed to get active session for user', { error, userId });
      return null;
    }
  }

  /**
   * Get audio buffers for session
   */
  private getAudioBuffers(sessionId: string): Buffer[] {
    let buffers = this.audioBufferCache.get(sessionId);
    if (!buffers) {
      buffers = [];
      this.audioBufferCache.set(sessionId, buffers);
    }
    return buffers;
  }

  /**
   * Start new extension recording session
   */
  async startSession(
    userId: string,
    organizationId: string,
    metadata: MeetingMetadata
  ): Promise<ExtensionSession> {
    try {
      const sessionId = `ext_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create meeting record
      let meeting = await prisma.meeting.create({
        data: {
          title: metadata.title || `${metadata.platform} Meeting - ${new Date().toLocaleString()}`,
          platform: metadata.platform,
          meetingUrl: metadata.meetingUrl,
          externalMeetingId: metadata.meetingId,
          scheduledStartAt: metadata.startTime,
          status: 'in_progress',
          organizationId,
          userId,
          recordingSource: 'extension', // Botless recording
        },
      });

      // Create extension session
      const session: ExtensionSession = {
        id: sessionId,
        userId,
        organizationId,
        meetingId: meeting.id,
        platform: this.detectPlatform(metadata.platform),
        meetingUrl: metadata.meetingUrl,
        meetingTitle: metadata.title,
        startedAt: new Date(),
        status: 'recording',
        audioChunks: 0,
        transcriptSegments: 0,
        capturedSlides: 0,
      };

      // Store session in cache and Redis for persistence
      this.sessionCache.set(sessionId, session);
      this.audioBufferCache.set(sessionId, []);
      await this.saveSessionToRedis(session);

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          metadata: {
            ...(meeting.metadata as any),
            extensionSessionId: sessionId,
            extensionStatus: 'recording',
            platform: session.platform,
          } as any,
        },
      });

      // Add participants if provided
      if (metadata.participants) {
        await this.addParticipants(meeting.id, metadata.participants);
      }

      logger.info('Extension session started', {
        sessionId,
        meetingId: meeting.id,
        platform: metadata.platform,
      });

      return session;
    } catch (error) {
      logger.error('Error starting extension session', { error });
      throw error;
    }
  }

  /**
   * Upload audio chunk from extension
   */
  async uploadAudioChunk(chunk: AudioChunk): Promise<void> {
    try {
      const session = await this.getSession(chunk.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Store audio chunk in buffer
      const buffer = this.getAudioBuffers(chunk.sessionId);
      buffer.push(chunk.audioData);

      // Update session
      session.audioChunks++;
      await this.saveSessionToRedis(session); // Persist to Redis

      // Process chunk for transcription (every 3 seconds of audio)
      const totalDuration = this.calculateBufferDuration(buffer, chunk.sampleRate);
      if (totalDuration >= 3) {
        await this.processAudioBuffer(chunk.sessionId, session);
      }

      logger.debug('Audio chunk uploaded', {
        sessionId: chunk.sessionId,
        chunkIndex: chunk.chunkIndex,
        size: chunk.audioData.length,
      });
    } catch (error) {
      logger.error('Error uploading audio chunk', { error });
      throw error;
    }
  }

  /**
   * Process accumulated audio buffer for transcription
   */
  private async processAudioBuffer(
    sessionId: string,
    session: ExtensionSession
  ): Promise<void> {
    try {
      const buffer = this.getAudioBuffers(sessionId);
      if (!buffer || buffer.length === 0) return;

      // Combine audio chunks
      const combinedAudio = Buffer.concat(buffer);

      // Clear buffer
      buffer.length = 0; // Clear the array in place

      // Upload to S3 for processing
      const audioKey = `audio/${sessionId}/${Date.now()}.webm`;
      await this.uploadToS3(audioKey, combinedAudio, 'audio/webm');

      // Transcribe with Whisper
      const transcription = await this.transcribeAudio(combinedAudio);

      if (transcription && session.meetingId) {
        // Find or create LiveSession
        let liveSession = await prisma.liveSession.findFirst({
          where: { meetingId: session.meetingId, status: 'active' },
        });

        if (!liveSession) {
          liveSession = await prisma.liveSession.create({
            data: {
              id: `live_${session.meetingId}_${Date.now()}`,
              meetingId: session.meetingId,
              status: 'active',
            },
          });
        }

        // Store transcript segment
        await prisma.liveTranscriptSegment.create({
          data: {
            id: `seg_${Date.now()}_${Math.random()}`,
            liveSessionId: liveSession.id,
            segmentIndex: session.transcriptSegments,
            text: transcription.text,
            speaker: transcription.speaker || 'Unknown',
            startTime: (Date.now() - 3000) / 1000,
            endTime: Date.now() / 1000,
            confidence: transcription.confidence || 0.9,
            isFinal: true,
          },
        });

        session.transcriptSegments++;

        logger.info('Audio buffer transcribed', {
          sessionId,
          textLength: transcription.text.length,
        });
      }
    } catch (error) {
      logger.error('Error processing audio buffer', { error, sessionId });
    }
  }

  /**
   * Transcribe audio using local AI service (with OpenAI fallback)
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<{
    text: string;
    speaker?: string;
    confidence: number;
  } | null> {
    // Use cross-platform temp directory
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`);

    try {
      // Save to temporary file
      fs.writeFileSync(tempFile, audioBuffer);

      let transcriptionResult: { text: string; confidence: number; speaker?: string } | null = null;

      // Try local AI service first
      if (USE_LOCAL_AI) {
        try {
          transcriptionResult = await this.transcribeWithLocalAI(tempFile);
        } catch (localError) {
          logger.warn('Local AI transcription failed, falling back to OpenAI', { error: localError });
        }
      }

      // Fallback to OpenAI if local AI fails or is disabled
      if (!transcriptionResult && process.env.OPENAI_API_KEY) {
        transcriptionResult = await this.transcribeWithOpenAI(tempFile);
      }

      return transcriptionResult;
    } catch (error) {
      logger.error('Error transcribing audio', { error });
      return null;
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (cleanupError) {
        logger.warn('Failed to clean up temp file', { tempFile, error: cleanupError });
      }
    }
  }

  /**
   * Transcribe using local AI service (ai-service at port 4200)
   */
  private async transcribeWithLocalAI(audioFilePath: string): Promise<{
    text: string;
    speaker?: string;
    confidence: number;
  }> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('language', 'en');

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/transcribe`, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Local AI service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as any;

    logger.info('Audio transcribed via local AI service', {
      textLength: result.text?.length || 0,
    });

    return {
      text: result.text || result.transcription || '',
      speaker: result.speaker,
      confidence: result.confidence || 0.9,
    };
  }

  /**
   * Transcribe using OpenAI Whisper API (fallback)
   */
  private async transcribeWithOpenAI(audioFilePath: string): Promise<{
    text: string;
    speaker?: string;
    confidence: number;
  }> {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
    });

    logger.info('Audio transcribed via OpenAI Whisper', {
      textLength: (transcription as any).text?.length || 0,
    });

    return {
      text: (transcription as any).text || '',
      confidence: 0.9,
    };
  }

  /**
   * Capture screenshot from extension
   */
  async captureScreenshot(
    sessionId: string,
    screenshotData: Buffer,
    timestamp: number
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || !session.meetingId) {
        throw new Error('Session or meeting not found');
      }

      // Check user settings
      const settings = await this.getExtensionSettings(session.userId);
      if (!settings.captureSlides) {
        return; // Slide capture disabled
      }

      // Process as slide
      const transcriptPosition = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
      const slide = await slideCaptureService.processVideoFrame(
        session.meetingId,
        screenshotData,
        timestamp,
        transcriptPosition
      );

      if (slide) {
        session.capturedSlides++;
        await this.saveSessionToRedis(session); // Persist update
        logger.info('Screenshot captured as slide', {
          sessionId,
          slideNumber: slide.slideNumber,
        });
      }
    } catch (error) {
      logger.error('Error capturing screenshot', { error });
    }
  }

  /**
   * End extension recording session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Process any remaining audio
      await this.processAudioBuffer(sessionId, session);

      // Update session status
      session.status = 'processing';
      session.endedAt = new Date();
      await this.saveSessionToRedis(session); // Persist update

      // Update database
      if (session.meetingId) {
        const meeting = await prisma.meeting.findUnique({
          where: { id: session.meetingId },
        });

        if (meeting) {
          await prisma.meeting.update({
            where: { id: session.meetingId },
            data: {
              metadata: {
                ...(meeting.metadata as any),
                extensionStatus: 'completed',
                extensionEndedAt: new Date(),
                audioChunks: session.audioChunks,
                transcriptSegments: session.transcriptSegments,
                capturedSlides: session.capturedSlides,
              } as any,
            },
          });
        }
      }

      // Update meeting
      if (session.meetingId) {
        const duration = Math.floor(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
        );

        await prisma.meeting.update({
          where: { id: session.meetingId },
          data: {
            status: 'completed',
            durationSeconds: duration,
            actualEndAt: new Date(),
          },
        });

        // Trigger post-processing (summary, action items, etc.)
        this.triggerPostProcessing(session.meetingId);
      }

      // Clean up cache and Redis
      this.sessionCache.delete(sessionId);
      this.audioBufferCache.delete(sessionId);
      await this.deleteSessionFromRedis(sessionId, session.userId);

      logger.info('Extension session ended', {
        sessionId,
        duration: session.endedAt.getTime() - session.startedAt.getTime(),
        audioChunks: session.audioChunks,
        transcriptSegments: session.transcriptSegments,
      });
    } catch (error) {
      logger.error('Error ending extension session', { error });
      throw error;
    }
  }

  /**
   * Get extension settings for user
   */
  async getExtensionSettings(userId: string): Promise<ExtensionSettings> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && (user.preferences as any)?.extensionSettings) {
        return (user.preferences as any).extensionSettings;
      }

      // Return defaults if not found
      return {
        userId,
        autoRecordMeetings: false,
        recordAudio: true,
        recordVideo: false,
        captureSlides: true,
        enableLiveCaptions: false,
        defaultMeetingPrivacy: 'private',
        excludedDomains: [],
        notificationPreferences: {
          showRecordingIndicator: true,
          notifyOnMeetingEnd: true,
          notifyOnTranscriptReady: true,
        },
      };
    } catch (error) {
      logger.error('Error getting extension settings', { error });
      throw error;
    }
  }

  /**
   * Update extension settings
   */
  async updateExtensionSettings(
    userId: string,
    updates: Partial<ExtensionSettings>
  ): Promise<ExtensionSettings> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const currentSettings = (user?.preferences as any)?.extensionSettings || {};
      const newSettings = { ...currentSettings, ...updates };

      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...(user?.preferences as any),
            extensionSettings: newSettings,
          } as any,
        },
      });

      logger.info('Extension settings updated', { userId });

      return newSettings;
    } catch (error) {
      logger.error('Error updating extension settings', { error });
      throw error;
    }
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: string): Promise<ExtensionSession | null> {
    // First check Redis for persisted session
    const session = await this.getActiveSessionForUser(userId);
    if (session && session.status === 'recording') {
      return session;
    }

    // Fallback: check cache
    for (const [, cachedSession] of this.sessionCache.entries()) {
      if (cachedSession.userId === userId && cachedSession.status === 'recording') {
        return cachedSession;
      }
    }

    return null;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    duration: number;
    audioChunks: number;
    transcriptSegments: number;
    capturedSlides: number;
    status: string;
  }> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        const duration = Math.floor(
          (Date.now() - session.startedAt.getTime()) / 1000
        );

        return {
          duration,
          audioChunks: session.audioChunks,
          transcriptSegments: session.transcriptSegments,
          capturedSlides: session.capturedSlides,
          status: session.status,
        };
      }

      // Check database - find meeting with this session ID
      const meeting = await prisma.meeting.findFirst({
        where: {
          metadata: {
            path: ['extensionSessionId'],
            equals: sessionId,
          },
        },
      });

      if (!meeting) {
        throw new Error('Session not found');
      }

      const metadata = meeting.metadata as any;

      return {
        duration: metadata.extensionEndedAt
          ? Math.floor(
              (new Date(metadata.extensionEndedAt).getTime() - meeting.createdAt.getTime()) / 1000
            )
          : 0,
        audioChunks: metadata.audioChunks || 0,
        transcriptSegments: metadata.transcriptSegments || 0,
        capturedSlides: metadata.capturedSlides || 0,
        status: metadata.extensionStatus || 'completed',
      };
    } catch (error) {
      logger.error('Error getting session stats', { error });
      throw error;
    }
  }

  /**
   * Check if extension is compatible with meeting platform
   */
  isPlatformSupported(url: string): boolean {
    const supportedPlatforms = [
      /zoom\.us/i,
      /meet\.google\.com/i,
      /teams\.microsoft\.com/i,
      /webex\.com/i,
    ];

    return supportedPlatforms.some(pattern => pattern.test(url));
  }

  /**
   * Get extension installation stats
   */
  async getExtensionStats(organizationId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalMeetingsRecorded: number;
    totalDuration: number;
    avgMeetingDuration: number;
    platformBreakdown: Record<string, number>;
  }> {
    try {
      const meetings = await prisma.meeting.findMany({
        where: {
          organizationId,
          recordingSource: 'extension',
        },
      });

      const activeSessions = meetings.filter(m =>
        (m.metadata as any)?.extensionStatus === 'recording'
      ).length;

      const completedSessions = meetings.filter(m =>
        (m.metadata as any)?.extensionStatus === 'completed'
      );

      const totalDuration = completedSessions.reduce((sum, m) => {
        return sum + (m.durationSeconds || 0);
      }, 0);

      const platformBreakdown: Record<string, number> = {};
      meetings.forEach(m => {
        const platform = m.platform || 'unknown';
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      });

      return {
        totalSessions: meetings.length,
        activeSessions,
        totalMeetingsRecorded: completedSessions.length,
        totalDuration,
        avgMeetingDuration: completedSessions.length
          ? Math.floor(totalDuration / completedSessions.length)
          : 0,
        platformBreakdown,
      };
    } catch (error) {
      logger.error('Error getting extension stats', { error });
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Detect platform from URL or identifier
   */
  private detectPlatform(platform: string): ExtensionSession['platform'] {
    const lower = platform.toLowerCase();
    if (lower.includes('zoom')) return 'zoom';
    if (lower.includes('meet') || lower.includes('google')) return 'google_meet';
    if (lower.includes('teams') || lower.includes('microsoft')) return 'microsoft_teams';
    if (lower.includes('webex')) return 'webex';
    return 'other';
  }

  /**
   * Calculate duration of audio buffer
   */
  private calculateBufferDuration(buffers: Buffer[], sampleRate: number): number {
    const totalBytes = buffers.reduce((sum, buf) => sum + buf.length, 0);
    // Assuming 16-bit audio (2 bytes per sample)
    const samples = totalBytes / 2;
    return samples / sampleRate;
  }

  /**
   * Upload to S3/MinIO using StorageService
   */
  private async uploadToS3(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      const result = await storageService.uploadFile(key, buffer, {
        contentType,
        metadata: {
          'upload-source': 'chrome-extension',
          'upload-timestamp': new Date().toISOString(),
        },
      });

      // Generate a presigned URL for access
      const url = await storageService.generateDownloadUrl(key, 86400); // 24 hours

      logger.info('File uploaded to storage', { key, size: result.size });
      return url;
    } catch (error) {
      logger.error('Error uploading to storage', { error, key });
      throw error;
    }
  }

  /**
   * Add participants to meeting
   */
  private async addParticipants(
    meetingId: string,
    participants: MeetingMetadata['participants']
  ): Promise<void> {
    if (!participants) return;

    for (const participant of participants) {
      try {
        await prisma.meetingParticipant.create({
          data: {
            meetingId,
            name: participant.name,
            email: participant.email,
            role: participant.isSelf ? 'host' : 'attendee',
          },
        });
      } catch (error) {
        logger.warn('Error adding participant', { error, participant });
      }
    }
  }

  /**
   * Trigger post-processing for completed meeting
   */
  private async triggerPostProcessing(meetingId: string): Promise<void> {
    try {
      logger.info('Post-processing triggered', { meetingId });

      // Queue background jobs using setImmediate for proper async handling
      // Job 1: Generate AI summary
      setImmediate(async () => {
        try {
          const { superSummaryService } = await import('./SuperSummaryService');
          await superSummaryService.generateSuperSummary(meetingId);
          logger.info('Summary generated successfully', { meetingId });
        } catch (error) {
          logger.error('Error generating summary', { error, meetingId });
        }
      });

      // Job 2: Extract action items (part of summary generation)
      setImmediate(async () => {
        try {
          // Action items are extracted as part of the super summary
          // This could be enhanced with a dedicated action item service
          logger.info('Action item extraction queued', { meetingId });
        } catch (error) {
          logger.error('Error extracting action items', { error, meetingId });
        }
      });

      // Job 3: Perform sentiment analysis (part of summary)
      setImmediate(async () => {
        try {
          // Sentiment analysis is included in the super summary
          logger.info('Sentiment analysis queued', { meetingId });
        } catch (error) {
          logger.error('Error analyzing sentiment', { error, meetingId });
        }
      });

      logger.info('All post-processing jobs queued', { meetingId });
    } catch (error) {
      logger.error('Error triggering post-processing', { error });
    }
  }

  // ============================================================================
  // Delegate Methods - Call implementations from chrome-extension-methods.ts
  // ============================================================================

  /**
   * Check database connectivity
   */
  async checkDatabaseConnection(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    return extensionMethods.checkDatabaseConnection();
  }

  /**
   * Check storage availability
   */
  async checkStorageAvailability(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    return extensionMethods.checkStorageAvailability();
  }

  /**
   * Check transcription service
   */
  async checkTranscriptionService(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    return extensionMethods.checkTranscriptionService();
  }

  /**
   * Get active user count
   */
  getActiveUserCount(): number {
    return extensionMethods.getActiveUserCountFromSessions(this.sessionCache);
  }

  /**
   * Store error report
   */
  async storeErrorReport(report: {
    userId: string;
    error: any;
    context?: any;
    userAgent?: string;
    extensionVersion?: string;
    timestamp: Date;
  }): Promise<void> {
    return extensionMethods.storeErrorReport(report);
  }

  /**
   * Get user recording history
   */
  async getUserRecordingHistory(
    userId: string,
    options: { limit?: number; offset?: number; platform?: string }
  ): Promise<Array<{
    id: string;
    title: string;
    platform: string;
    startedAt: Date;
    endedAt: Date | null;
    duration: number;
    status: string;
    transcriptAvailable: boolean;
    summaryAvailable: boolean;
  }>> {
    return extensionMethods.getUserRecordingHistory(userId, options);
  }

  /**
   * Get session details
   */
  async getSessionDetails(
    sessionId: string,
    userId: string
  ): Promise<{
    id: string;
    meetingId: string | undefined;
    platform: string;
    meetingUrl: string;
    meetingTitle: string | undefined;
    startedAt: Date;
    endedAt: Date | undefined;
    status: string;
    audioChunks: number;
    transcriptSegments: number;
    capturedSlides: number;
    duration: number;
    participants: Array<{ name: string; email?: string; role: string }>;
  } | null> {
    return extensionMethods.getSessionDetails(sessionId, userId, this.sessionCache);
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    userId: string,
    updates: { title?: string; participants?: Array<{ name: string; email?: string }>; tags?: string[]; notes?: string }
  ): Promise<{ id: string; title: string; tags: string[]; notes: string; updatedAt: Date }> {
    return extensionMethods.updateSessionMetadata(sessionId, userId, updates);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    // Also clean up Redis
    await this.deleteSessionFromRedis(sessionId, userId);
    return extensionMethods.deleteSession(sessionId, userId, this.sessionCache, this.audioBufferCache);
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(
    organizationId: string,
    period: string = '7d'
  ): Promise<{
    totalRecordings: number;
    totalDuration: number;
    avgDuration: number;
    recordingsByPlatform: Record<string, number>;
    recordingsByDay: Array<{ date: string; count: number; duration: number }>;
    topUsers: Array<{ userId: string; name: string; recordingCount: number }>;
    transcriptionStats: { totalWords: number; avgWordsPerMeeting: number };
  }> {
    return extensionMethods.getUsageAnalytics(organizationId, period);
  }

  /**
   * Sync user data
   */
  async syncUserData(userId: string): Promise<{
    settings: extensionMethods.ExtensionSettings;
    recentRecordings: number;
    activeSession: extensionMethods.ExtensionSession | null;
    lastSyncAt: Date;
  }> {
    return extensionMethods.syncUserData(
      userId,
      this.getExtensionSettings.bind(this),
      this.getActiveSession.bind(this)
    );
  }
}

export const chromeExtensionService = new ChromeExtensionService();
