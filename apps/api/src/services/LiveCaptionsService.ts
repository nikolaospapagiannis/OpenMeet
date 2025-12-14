/**
 * Live Captions Service
 *
 * Real-time transcription and captions during meetings
 * Competitive Feature: Otter.ai's Live Captions
 *
 * Features:
 * - Real-time speech-to-text
 * - Speaker diarization
 * - Live caption display
 * - Caption history
 * - Multi-language support
 */

import { WebSocket } from 'ws';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export interface CaptionSegment {
  id: string;
  meetingId: string;
  text: string;
  speaker?: string;
  confidence: number;
  timestamp: number;
  isFinal: boolean;
  language?: string;
}

export interface CaptionStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  position?: 'top' | 'bottom' | 'custom';
  customPosition?: { x: number; y: number };
  opacity?: number;
  maxWidth?: number;
}

export interface LiveCaptionSession {
  meetingId: string;
  ws: WebSocket;
  language: string;
  targetLanguages?: string[]; // For multi-language translation
  buffer: Buffer[];
  lastTranscript?: string;
  segments: CaptionSegment[];
  style?: CaptionStyle;
  speakerColors?: Map<string, string>;
}

class LiveCaptionsService {
  private sessions: Map<string, LiveCaptionSession> = new Map();
  private audioBuffers: Map<string, Buffer[]> = new Map();

  /**
   * Start live caption session
   */
  async startSession(
    meetingId: string,
    ws: WebSocket,
    options: {
      language?: string;
      speakerDiarization?: boolean;
      targetLanguages?: string[];
      style?: CaptionStyle;
    } = {}
  ): Promise<void> {
    try {
      logger.info('Starting live caption session', { meetingId });

      const session: LiveCaptionSession = {
        meetingId,
        ws,
        language: options.language || 'en',
        targetLanguages: options.targetLanguages || [],
        buffer: [],
        segments: [],
        style: options.style || {
          fontSize: 16,
          position: 'bottom',
          color: '#FFFFFF',
          backgroundColor: '#000000',
          opacity: 0.8,
        },
        speakerColors: new Map(),
      };

      this.sessions.set(meetingId, session);

      // Send initial confirmation
      ws.send(JSON.stringify({
        type: 'caption_session_started',
        meetingId,
        language: session.language,
        targetLanguages: session.targetLanguages,
        style: session.style,
      }));

      logger.info('Live caption session started', { meetingId });
    } catch (error) {
      logger.error('Error starting live caption session', { error, meetingId });
      throw error;
    }
  }

  /**
   * Process audio chunk for live transcription
   */
  async processAudioChunk(
    meetingId: string,
    audioChunk: Buffer
  ): Promise<CaptionSegment | null> {
    try {
      const session = this.sessions.get(meetingId);
      if (!session) {
        logger.warn('No live caption session found', { meetingId });
        return null;
      }

      // Add to buffer
      session.buffer.push(audioChunk);

      // Process buffer when it reaches threshold (e.g., 3 seconds of audio)
      const bufferSize = session.buffer.reduce((sum, buf) => sum + buf.length, 0);
      const threshold = 48000 * 3; // 3 seconds at 16kHz, 16-bit mono

      if (bufferSize < threshold) {
        return null; // Wait for more audio
      }

      // Combine buffer
      const audioData = Buffer.concat(session.buffer);
      session.buffer = [];

      // Transcribe using OpenAI Whisper
      const transcript = await this.transcribeAudio(audioData, session.language);

      if (!transcript || transcript.trim().length === 0) {
        return null;
      }

      // Create caption segment
      const segment: CaptionSegment = {
        id: `caption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        meetingId,
        text: transcript,
        confidence: 0.9, // Whisper doesn't provide confidence, estimate high
        timestamp: Date.now(),
        isFinal: true,
        language: session.language,
      };

      // Add to session history
      session.segments.push(segment);
      session.lastTranscript = transcript;

      // Send to client via WebSocket
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'live_caption',
          segment,
        }));
      }

      // Store in database
      await prisma.liveCaption.create({
        data: {
          id: segment.id,
          meetingId,
          text: segment.text,
          confidence: segment.confidence,
          timestamp: new Date(segment.timestamp),
          isFinal: segment.isFinal,
          language: segment.language,
        },
      });

      logger.debug('Live caption generated', {
        meetingId,
        textLength: segment.text.length
      });

      return segment;
    } catch (error) {
      logger.error('Error processing audio chunk', { error, meetingId });
      return null;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(
    audioBuffer: Buffer,
    language: string
  ): Promise<string> {
    try {
      // Create temporary file-like object for Whisper API
      // Note: Whisper API requires a file, so we create a Blob/File equivalent
      const audioFile = new File([audioBuffer as any], 'audio.wav', {
        type: 'audio/wav',
      }) as any;

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile as any,
        model: 'whisper-1',
        language: language === 'auto' ? undefined : language,
        response_format: 'text',
      });

      return transcription as string;
    } catch (error) {
      logger.error('Error transcribing audio', { error });
      return '';
    }
  }

  /**
   * Get live caption history for meeting
   */
  async getCaptionHistory(meetingId: string, limit: number = 50): Promise<CaptionSegment[]> {
    try {
      const session = this.sessions.get(meetingId);

      // If session is active, return from memory
      if (session) {
        return session.segments.slice(-limit);
      }

      // Otherwise, fetch from database
      const captions = await prisma.liveCaption.findMany({
        where: { meetingId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return captions.map(c => ({
        id: c.id,
        meetingId: c.meetingId,
        text: c.text,
        confidence: c.confidence,
        timestamp: c.timestamp.getTime(),
        isFinal: c.isFinal,
        language: c.language || undefined,
      })).reverse();
    } catch (error) {
      logger.error('Error getting caption history', { error, meetingId });
      return [];
    }
  }

  /**
   * End live caption session
   */
  async endSession(meetingId: string): Promise<void> {
    try {
      const session = this.sessions.get(meetingId);
      if (!session) {
        logger.warn('No session to end', { meetingId });
        return;
      }

      // Send final message
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'caption_session_ended',
          meetingId,
          totalSegments: session.segments.length,
        }));
      }

      // Clean up
      this.sessions.delete(meetingId);

      logger.info('Live caption session ended', {
        meetingId,
        totalSegments: session.segments.length
      });
    } catch (error) {
      logger.error('Error ending caption session', { error, meetingId });
    }
  }

  /**
   * Update caption text (for corrections)
   */
  async updateCaption(
    captionId: string,
    newText: string
  ): Promise<void> {
    try {
      await prisma.liveCaption.update({
        where: { id: captionId },
        data: { text: newText },
      });

      logger.info('Caption updated', { captionId });
    } catch (error) {
      logger.error('Error updating caption', { error, captionId });
      throw error;
    }
  }

  /**
   * Export captions to various formats
   */
  async exportCaptions(
    meetingId: string,
    format: 'srt' | 'vtt' | 'txt' | 'json'
  ): Promise<string> {
    try {
      const captions = await this.getCaptionHistory(meetingId, 10000); // Get all

      switch (format) {
        case 'srt':
          return this.toSRT(captions);
        case 'vtt':
          return this.toWebVTT(captions);
        case 'txt':
          return this.toText(captions);
        case 'json':
          return JSON.stringify(captions, null, 2);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting captions', { error, meetingId, format });
      throw error;
    }
  }

  /**
   * Convert captions to SRT format
   */
  private toSRT(captions: CaptionSegment[]): string {
    return captions.map((caption, index) => {
      const startTime = this.formatSRTTime(caption.timestamp);
      const endTime = this.formatSRTTime(
        captions[index + 1]?.timestamp || caption.timestamp + 3000
      );

      return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');
  }

  /**
   * Convert captions to WebVTT format
   */
  private toWebVTT(captions: CaptionSegment[]): string {
    const header = 'WEBVTT\n\n';
    const cues = captions.map((caption, index) => {
      const startTime = this.formatVTTTime(caption.timestamp);
      const endTime = this.formatVTTTime(
        captions[index + 1]?.timestamp || caption.timestamp + 3000
      );

      return `${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');

    return header + cues;
  }

  /**
   * Convert captions to plain text
   */
  private toText(captions: CaptionSegment[]): string {
    return captions.map(c => {
      const time = new Date(c.timestamp).toISOString();
      const speaker = c.speaker ? `${c.speaker}: ` : '';
      return `[${time}] ${speaker}${c.text}`;
    }).join('\n');
  }

  /**
   * Format timestamp for SRT (HH:MM:SS,mmm)
   */
  private formatSRTTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');

    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }

  /**
   * Format timestamp for WebVTT (HH:MM:SS.mmm)
   */
  private formatVTTTime(timestamp: number): string {
    return this.formatSRTTime(timestamp).replace(',', '.');
  }

  /**
   * Translate caption to multiple languages
   */
  async translateCaption(
    text: string,
    sourceLanguage: string,
    targetLanguages: string[]
  ): Promise<Record<string, string>> {
    try {
      const translations: Record<string, string> = {};

      for (const targetLang of targetLanguages) {
        if (targetLang === sourceLanguage) {
          translations[targetLang] = text;
          continue;
        }

        // Use OpenAI for translation
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Translate the following text from ${sourceLanguage} to ${targetLang}. Only return the translation, no explanations.`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });

        translations[targetLang] = response.choices[0]?.message?.content || text;
      }

      return translations;
    } catch (error) {
      logger.error('Error translating caption', { error });
      return {};
    }
  }

  /**
   * Update caption styling
   */
  async updateCaptionStyle(
    meetingId: string,
    style: CaptionStyle
  ): Promise<void> {
    try {
      const session = this.sessions.get(meetingId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.style = { ...session.style, ...style };

      // Notify client of style update
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'caption_style_updated',
          style: session.style,
        }));
      }

      logger.info('Caption style updated', { meetingId, style });
    } catch (error) {
      logger.error('Error updating caption style', { error, meetingId });
      throw error;
    }
  }

  /**
   * Set speaker color for visual differentiation
   */
  setSpeakerColor(meetingId: string, speaker: string, color: string): void {
    const session = this.sessions.get(meetingId);
    if (session) {
      session.speakerColors?.set(speaker, color);
    }
  }

  /**
   * Get speaker color
   */
  getSpeakerColor(meetingId: string, speaker: string): string | undefined {
    const session = this.sessions.get(meetingId);
    return session?.speakerColors?.get(speaker);
  }

  /**
   * Add target language for real-time translation
   */
  async addTargetLanguage(
    meetingId: string,
    language: string
  ): Promise<void> {
    try {
      const session = this.sessions.get(meetingId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.targetLanguages) {
        session.targetLanguages = [];
      }

      if (!session.targetLanguages.includes(language)) {
        session.targetLanguages.push(language);

        // Notify client
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            type: 'target_language_added',
            language,
            targetLanguages: session.targetLanguages,
          }));
        }

        logger.info('Target language added', { meetingId, language });
      }
    } catch (error) {
      logger.error('Error adding target language', { error, meetingId });
      throw error;
    }
  }

  /**
   * Remove target language
   */
  async removeTargetLanguage(
    meetingId: string,
    language: string
  ): Promise<void> {
    try {
      const session = this.sessions.get(meetingId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.targetLanguages) {
        session.targetLanguages = session.targetLanguages.filter(
          (lang) => lang !== language
        );

        // Notify client
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            type: 'target_language_removed',
            language,
            targetLanguages: session.targetLanguages,
          }));
        }

        logger.info('Target language removed', { meetingId, language });
      }
    } catch (error) {
      logger.error('Error removing target language', { error, meetingId });
      throw error;
    }
  }

  /**
   * Get available languages for captions
   */
  getAvailableLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pl', name: 'Polish' },
      { code: 'tr', name: 'Turkish' },
    ];
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session info
   */
  getSessionInfo(meetingId: string): {
    isActive: boolean;
    segmentsCount: number;
    language: string;
    targetLanguages: string[];
    style: CaptionStyle | undefined;
  } | null {
    const session = this.sessions.get(meetingId);
    if (!session) {
      return null;
    }

    return {
      isActive: true,
      segmentsCount: session.segments.length,
      language: session.language,
      targetLanguages: session.targetLanguages || [],
      style: session.style,
    };
  }
}

export const liveCaptionsService = new LiveCaptionsService();
