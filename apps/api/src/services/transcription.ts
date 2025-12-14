/**
 * Transcription Service
 * AI-powered speech-to-text with OpenAI Whisper and speaker diarization
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { StorageService } from './storage';
import { QueueService, JobType } from './queue';
import { SearchService, SearchIndex } from './search';
import { speakerDiarizationService, DiarizationResult } from './SpeakerDiarizationService';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import PDFDocument from 'pdfkit';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'transcription-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface TranscriptionOptions {
  recordingId: string;
  meetingId: string;
  organizationId: string;
  audioUrl: string;
  language?: string;
  enableDiarization?: boolean;
  enablePunctuation?: boolean;
  enableTimestamps?: boolean;
  vocabularyBoost?: string[];
  speakerLabels?: Array<{ speakerId: string; name: string }>;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  speaker?: string;
  speakerId?: string;
  startTime: number;
  endTime: number;
  confidence: number;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

export interface TranscriptionResult {
  id: string;
  meetingId: string;
  recordingId: string;
  fullText: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  speakers: Array<{
    speakerId: string;
    name?: string;
    totalSpeakingTime: number;
    segmentCount: number;
  }>;
  keywords?: string[];
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  metadata: {
    model: string;
    processingTime: number;
    wordCount: number;
    accuracy?: number;
  };
}

export class TranscriptionService extends EventEmitter {
  private storageService: StorageService;
  private queueService: QueueService;
  private searchService: SearchService;
  private whisperApiUrl: string;
  private openaiApiKey: string;
  private activeTranscriptions: Map<string, TranscriptionJob>;

  constructor(
    storageService: StorageService,
    queueService: QueueService,
    searchService: SearchService
  ) {
    super();
    this.storageService = storageService;
    this.queueService = queueService;
    this.searchService = searchService;
    this.whisperApiUrl = process.env.WHISPER_API_URL || process.env.WHISPER_API_URL || 'https://api.openai.com/v1/audio/transcriptions';
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.activeTranscriptions = new Map();
  }

  /**
   * Start transcription process
   */
  async startTranscription(options: TranscriptionOptions): Promise<string> {
    try {
      const transcriptionId = `trans_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Check if already transcribing
      if (this.activeTranscriptions.has(options.recordingId)) {
        throw new Error('Recording is already being transcribed');
      }

      // Create transcription record
      const transcription = await prisma.transcript.create({
        data: {
          id: transcriptionId,
          meetingId: options.meetingId,
          recordingId: options.recordingId,
          language: options.language || 'auto',
          isFinal: false,
          metadata: {
            organizationId: options.organizationId,
            status: 'processing',
            startedAt: new Date().toISOString(),
            enableDiarization: options.enableDiarization,
            enablePunctuation: options.enablePunctuation,
            enableTimestamps: options.enableTimestamps,
          } as any,
        },
      });

      // Create transcription job
      const job = new TranscriptionJob(
        transcriptionId,
        options,
        this.storageService,
        this.openaiApiKey
      );

      this.activeTranscriptions.set(options.recordingId, job);

      // Process transcription
      const result = await job.process();

      // Save transcription result
      await this.saveTranscription(transcriptionId, result);

      // Index in search service
      await this.indexTranscription(result);

      // Queue post-processing
      await this.queuePostProcessing(result);

      // Remove from active transcriptions
      this.activeTranscriptions.delete(options.recordingId);

      logger.info(`Transcription completed: ${transcriptionId}`);
      
      this.emit('transcription:completed', {
        transcriptionId,
        meetingId: options.meetingId,
        recordingId: options.recordingId,
      });

      return transcriptionId;
    } catch (error) {
      logger.error('Transcription failed:', error);
      
      // Update status to failed
      if (options.recordingId) {
        await prisma.transcript.updateMany({
          where: { recordingId: options.recordingId },
          data: {
            isFinal: false,
            metadata: {
              status: 'failed',
              completedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            } as any,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Save transcription result to database
   */
  private async saveTranscription(
    transcriptionId: string,
    result: TranscriptionResult
  ): Promise<void> {
    // Update main transcription record
    await prisma.transcript.update({
      where: { id: transcriptionId },
      data: {
        wordCount: result.metadata.wordCount,
        language: result.language,
        confidenceScore: result.metadata.accuracy,
        processingTimeMs: result.metadata.processingTime,
        isFinal: true,
        metadata: {
          ...result.metadata,
          transcriptUrl: await this.uploadTranscript(result),
          fullText: result.fullText,
          duration: result.duration,
          speakers: result.speakers as any,
          keywords: result.keywords as any,
          segments: result.segments as any,
        } as any,
      },
    });
  }

  /**
   * Upload transcript to storage
   */
  private async uploadTranscript(result: TranscriptionResult): Promise<string> {
    const transcriptKey = `transcripts/${result.meetingId}/${result.id}.json`;
    
    await this.storageService.uploadFile(
      transcriptKey,
      Buffer.from(JSON.stringify(result)),
      {
        contentType: 'application/json',
        metadata: {
          meetingId: result.meetingId,
          recordingId: result.recordingId,
          transcriptionId: result.id,
        },
      }
    );

    return this.storageService.generateDownloadUrl(transcriptKey, 30 * 24 * 60 * 60); // 30 days
  }

  /**
   * Index transcription in search service
   */
  private async indexTranscription(result: TranscriptionResult): Promise<void> {
    // Index each segment for searchability
    const documents = result.segments.map(segment => ({
      id: `${result.id}_${segment.id}`,
      document: {
        id: segment.id,
        meetingId: result.meetingId,
        organizationId: result.recordingId,
        content: segment.text,
        speaker: segment.speaker,
        timestamp: segment.startTime,
        confidence: segment.confidence,
        language: result.language,
        keywords: result.keywords,
        entities: result.entities,
        sentiment: 0, // Will be calculated in post-processing
        createdAt: new Date(),
      },
    }));

    await this.searchService.bulkIndex(SearchIndex.TRANSCRIPTS, documents);
  }

  /**
   * Queue post-processing jobs
   */
  private async queuePostProcessing(result: TranscriptionResult): Promise<void> {
    const jobs = [];

    // Queue summary generation
    jobs.push(
      this.queueService.addJob(JobType.SUMMARY_GENERATION, {
        type: JobType.SUMMARY_GENERATION,
        payload: {
          transcriptionId: result.id,
          meetingId: result.meetingId,
          fullText: result.fullText,
        },
        meetingId: result.meetingId,
      })
    );

    // Queue analytics processing
    jobs.push(
      this.queueService.addJob(JobType.ANALYTICS_PROCESSING, {
        type: JobType.ANALYTICS_PROCESSING,
        payload: {
          transcriptionId: result.id,
          meetingId: result.meetingId,
          speakers: result.speakers,
          wordCount: result.metadata.wordCount,
          duration: result.duration,
        },
        meetingId: result.meetingId,
      })
    );

    await Promise.all(jobs);
  }

  /**
   * Get transcription status
   */
  async getTranscriptionStatus(recordingId: string): Promise<{
    isTranscribing: boolean;
    transcriptionId?: string;
    progress?: number;
    status?: string;
  }> {
    const job = this.activeTranscriptions.get(recordingId);

    if (!job) {
      // Check database for completed transcription
      const transcription = await prisma.transcript.findFirst({
        where: { recordingId },
        orderBy: { createdAt: 'desc' },
      });

      if (transcription) {
        const metadata = transcription.metadata as any;
        const status = metadata?.status || (transcription.isFinal ? 'completed' : 'processing');
        return {
          isTranscribing: status === 'processing',
          transcriptionId: transcription.id,
          status,
        };
      }

      return { isTranscribing: false };
    }

    return {
      isTranscribing: true,
      transcriptionId: job.transcriptionId,
      progress: job.getProgress(),
      status: 'processing',
    };
  }

  /**
   * Search transcriptions
   */
  async searchTranscriptions(
    query: string,
    organizationId: string,
    options?: {
      meetingId?: string;
      speaker?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
    }
  ): Promise<any> {
    const filters: Record<string, any> = { organizationId };
    
    if (options?.meetingId) filters.meetingId = options.meetingId;
    if (options?.speaker) filters.speaker = options.speaker;
    if (options?.dateFrom || options?.dateTo) {
      filters.createdAt = {};
      if (options.dateFrom) filters.createdAt.gte = options.dateFrom;
      if (options.dateTo) filters.createdAt.lte = options.dateTo;
    }

    return this.searchService.search(
      SearchIndex.TRANSCRIPTS,
      query,
      {
        filters,
        size: options?.limit || 20,
        highlight: true,
      }
    );
  }

  /**
   * Export transcription in various formats
   */
  async exportTranscription(
    transcriptionId: string,
    format: 'txt' | 'srt' | 'vtt' | 'json' | 'pdf'
  ): Promise<Buffer> {
    const transcription = await prisma.transcript.findUnique({
      where: { id: transcriptionId },
    });

    if (!transcription) {
      throw new Error('Transcription not found');
    }

    // Extract segments from metadata
    const transcriptionWithSegments = {
      ...transcription,
      segments: (transcription.metadata as any)?.segments || [],
    };

    switch (format) {
      case 'txt':
        return this.exportAsText(transcriptionWithSegments);
      case 'srt':
        return this.exportAsSRT(transcriptionWithSegments);
      case 'vtt':
        return this.exportAsVTT(transcriptionWithSegments);
      case 'json':
        return this.exportAsJSON(transcriptionWithSegments);
      case 'pdf':
        return this.exportAsPDF(transcriptionWithSegments);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Export as plain text
   */
  private exportAsText(transcription: any): Buffer {
    const lines = transcription.segments.map((segment: any) => {
      const speaker = segment.speaker ? `${segment.speaker}: ` : '';
      return `${speaker}${segment.text}`;
    });

    return Buffer.from(lines.join('\n\n'));
  }

  /**
   * Export as SRT subtitle format
   */
  private exportAsSRT(transcription: any): Buffer {
    const lines: string[] = [];
    
    transcription.segments.forEach((segment: any, index: number) => {
      lines.push(`${index + 1}`);
      lines.push(`${this.formatSRTTime(segment.startTime)} --> ${this.formatSRTTime(segment.endTime)}`);
      lines.push(segment.text);
      lines.push('');
    });

    return Buffer.from(lines.join('\n'));
  }

  /**
   * Export as WebVTT format
   */
  private exportAsVTT(transcription: any): Buffer {
    const lines = ['WEBVTT', ''];
    
    transcription.segments.forEach((segment: any) => {
      lines.push(`${this.formatVTTTime(segment.startTime)} --> ${this.formatVTTTime(segment.endTime)}`);
      if (segment.speaker) {
        lines.push(`<v ${segment.speaker}>${segment.text}`);
      } else {
        lines.push(segment.text);
      }
      lines.push('');
    });

    return Buffer.from(lines.join('\n'));
  }

  /**
   * Export as JSON
   */
  private exportAsJSON(transcription: any): Buffer {
    return Buffer.from(JSON.stringify(transcription, null, 2));
  }

  /**
   * Export as PDF with professional formatting using pdfkit
   */
  private async exportAsPDF(transcription: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
          info: {
            Title: `Meeting Transcript - ${transcription.id}`,
            Author: 'OpenMeet Meeting Intelligence',
            Creator: 'OpenMeet Transcription Service',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const metadata = transcription.metadata || {};
        const segments = metadata.segments || transcription.segments || [];
        const speakers = metadata.speakers || [];
        const fullText = metadata.fullText || '';
        const duration = metadata.duration || 0;
        const summary = metadata.summary;
        const actionItems = metadata.actionItems || [];

        // Color scheme
        const colors = {
          primary: '#1a365d',
          secondary: '#2b6cb0',
          accent: '#4299e1',
          text: '#2d3748',
          lightText: '#718096',
          border: '#e2e8f0',
          background: '#f7fafc',
        };

        // Header section
        doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);

        doc.fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(24)
          .text('Meeting Transcript', 50, 40);

        doc.fontSize(12)
          .font('Helvetica')
          .text(`ID: ${transcription.id}`, 50, 75);

        const meetingDate = transcription.createdAt
          ? new Date(transcription.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Date not available';
        doc.text(meetingDate, 50, 92);

        // Reset position after header
        doc.y = 140;

        // Meeting metadata box
        doc.fillColor(colors.background)
          .rect(50, doc.y, doc.page.width - 100, 80)
          .fill();

        doc.fillColor(colors.text);
        const metaY = doc.y + 15;

        doc.font('Helvetica-Bold').fontSize(10).text('Duration:', 65, metaY);
        doc.font('Helvetica').text(this.formatDuration(duration), 130, metaY);

        doc.font('Helvetica-Bold').text('Language:', 250, metaY);
        doc.font('Helvetica').text(transcription.language || 'en', 310, metaY);

        doc.font('Helvetica-Bold').text('Word Count:', 400, metaY);
        doc.font('Helvetica').text(String(transcription.wordCount || 0), 470, metaY);

        if (transcription.confidenceScore) {
          doc.font('Helvetica-Bold').text('Confidence:', 65, metaY + 20);
          doc.font('Helvetica').text(`${(transcription.confidenceScore * 100).toFixed(1)}%`, 130, metaY + 20);
        }

        doc.y = metaY + 70;

        // Participants section
        if (speakers.length > 0) {
          doc.fillColor(colors.primary)
            .font('Helvetica-Bold')
            .fontSize(14)
            .text('Participants', 50, doc.y);

          doc.y += 5;
          doc.moveTo(50, doc.y).lineTo(150, doc.y).strokeColor(colors.accent).lineWidth(2).stroke();
          doc.y += 15;

          speakers.forEach((speaker: any) => {
            const speakingTime = this.formatDuration(speaker.totalSpeakingTime || 0);
            doc.fillColor(colors.text)
              .font('Helvetica-Bold')
              .fontSize(10)
              .text(`${speaker.name || speaker.speakerId}`, 60, doc.y, { continued: true })
              .font('Helvetica')
              .fillColor(colors.lightText)
              .text(` - ${speakingTime} speaking time, ${speaker.segmentCount || 0} segments`);
            doc.y += 5;
          });

          doc.y += 20;
        }

        // Summary section
        if (summary) {
          this.addPDFSection(doc, 'Summary', colors);
          doc.fillColor(colors.text)
            .font('Helvetica')
            .fontSize(10)
            .text(summary, 50, doc.y, {
              width: doc.page.width - 100,
              align: 'justify',
            });
          doc.y += 20;
        }

        // Action items section
        if (actionItems.length > 0) {
          this.addPDFSection(doc, 'Action Items', colors);

          actionItems.forEach((item: any, index: number) => {
            const checkBox = '\u2610'; // Empty checkbox unicode
            doc.fillColor(colors.text)
              .font('Helvetica')
              .fontSize(10)
              .text(`${checkBox} ${typeof item === 'string' ? item : item.text || item.description}`, 60, doc.y, {
                width: doc.page.width - 120,
              });
            doc.y += 5;
          });

          doc.y += 20;
        }

        // Transcript section
        this.addPDFSection(doc, 'Full Transcript', colors);

        if (segments.length > 0) {
          segments.forEach((segment: any, index: number) => {
            // Check for page break
            if (doc.y > doc.page.height - 100) {
              doc.addPage();
              doc.y = 50;
            }

            const timestamp = this.formatTimestamp(segment.startTime || 0);
            const speakerName = segment.speaker || segment.speakerId || 'Unknown';

            // Timestamp and speaker
            doc.fillColor(colors.lightText)
              .font('Helvetica')
              .fontSize(8)
              .text(`[${timestamp}]`, 50, doc.y);

            doc.fillColor(colors.secondary)
              .font('Helvetica-Bold')
              .fontSize(10)
              .text(speakerName, 95, doc.y);

            doc.y += 3;

            // Segment text
            doc.fillColor(colors.text)
              .font('Helvetica')
              .fontSize(10)
              .text(segment.text, 50, doc.y, {
                width: doc.page.width - 100,
                align: 'left',
              });

            doc.y += 15;
          });
        } else if (fullText) {
          // Fallback to full text if no segments
          doc.fillColor(colors.text)
            .font('Helvetica')
            .fontSize(10)
            .text(fullText, 50, doc.y, {
              width: doc.page.width - 100,
              align: 'justify',
            });
        }

        // Add page numbers
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          // Footer line
          doc.moveTo(50, doc.page.height - 40)
            .lineTo(doc.page.width - 50, doc.page.height - 40)
            .strokeColor(colors.border)
            .lineWidth(1)
            .stroke();

          // Page number
          doc.fillColor(colors.lightText)
            .font('Helvetica')
            .fontSize(9)
            .text(
              `Page ${i + 1} of ${pages.count}`,
              50,
              doc.page.height - 30,
              { width: doc.page.width - 100, align: 'center' }
            );

          // Footer text
          doc.text(
            'Generated by OpenMeet Meeting Intelligence',
            50,
            doc.page.height - 30,
            { width: doc.page.width - 100, align: 'left' }
          );

          doc.text(
            new Date().toISOString().split('T')[0],
            50,
            doc.page.height - 30,
            { width: doc.page.width - 100, align: 'right' }
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add a section header to the PDF
   */
  private addPDFSection(doc: PDFKit.PDFDocument, title: string, colors: Record<string, string>): void {
    // Check for page break before section
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
      doc.y = 50;
    }

    doc.fillColor(colors.primary)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(title, 50, doc.y);

    doc.y += 5;
    doc.moveTo(50, doc.y).lineTo(50 + title.length * 8, doc.y).strokeColor(colors.accent).lineWidth(2).stroke();
    doc.y += 15;
  }

  /**
   * Format duration in seconds to HH:MM:SS
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Format timestamp for transcript display
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Format time for SRT
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Format time for VTT
   */
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
}

/**
 * Transcription Job Handler
 */
class TranscriptionJob {
  public transcriptionId: string;
  private options: TranscriptionOptions;
  private storageService: StorageService;
  private openaiApiKey: string;
  private progress: number = 0;

  constructor(
    transcriptionId: string,
    options: TranscriptionOptions,
    storageService: StorageService,
    openaiApiKey: string
  ) {
    this.transcriptionId = transcriptionId;
    this.options = options;
    this.storageService = storageService;
    this.openaiApiKey = openaiApiKey;
  }

  async process(): Promise<TranscriptionResult> {
    const startTime = Date.now();

    // Download audio file
    this.progress = 10;
    const audioBuffer = await this.downloadAudio();

    // Transcribe with Whisper
    this.progress = 30;
    const whisperResult = await this.transcribeWithWhisper(audioBuffer);

    // Perform speaker diarization if enabled
    this.progress = 60;
    let segments = whisperResult.segments;
    let speakers: any[] = [];
    
    if (this.options.enableDiarization) {
      const diarizationResult = await this.performDiarization(audioBuffer);
      segments = this.mergeDiarizationWithTranscription(segments, diarizationResult);
      speakers = this.extractSpeakers(segments);
    }

    // Extract keywords and entities
    this.progress = 80;
    const { keywords, entities } = await this.extractKeywordsAndEntities(whisperResult.text);

    // Calculate duration
    const duration = segments.length > 0 
      ? segments[segments.length - 1].endTime 
      : 0;

    // Build result
    this.progress = 100;
    const result: TranscriptionResult = {
      id: this.transcriptionId,
      meetingId: this.options.meetingId,
      recordingId: this.options.recordingId,
      fullText: whisperResult.text,
      segments,
      language: whisperResult.language || this.options.language || 'en',
      duration,
      speakers,
      keywords,
      entities,
      metadata: {
        model: 'whisper-1',
        processingTime: Date.now() - startTime,
        wordCount: whisperResult.text.split(/\s+/).length,
        accuracy: whisperResult.confidence,
      },
    };

    return result;
  }

  private async downloadAudio(): Promise<Buffer> {
    return this.storageService.downloadFile(this.options.audioUrl);
  }

  private async transcribeWithWhisper(audioBuffer: Buffer): Promise<any> {
    const whisperApiUrl = process.env.WHISPER_API_URL || 'https://api.openai.com/v1/audio/transcriptions';
    const aiServiceUrl = process.env.AI_SERVICE_URL;

    // Check if using local AI service (JSON format) vs OpenAI (multipart form)
    const useLocalAIService = aiServiceUrl && (
      whisperApiUrl.includes('localhost:8888') ||
      whisperApiUrl.includes('/api/v1/transcribe') ||
      process.env.USE_LOCAL_TRANSCRIPTION === 'true'
    );

    if (useLocalAIService) {
      // Use local AI service with JSON format
      try {
        // Generate presigned URL for the audio file
        let audioUrl = await this.storageService.generateDownloadUrl(this.options.audioUrl, 3600);

        // AI service runs in Docker, so it cannot access localhost:4006
        // Rewrite URL to use host.docker.internal so container can reach host's MinIO
        // Also strip query params since bucket is public (avoids signature mismatch)
        if (process.env.USE_LOCAL_TRANSCRIPTION === 'true') {
          // Extract just the path without query params (bucket is public)
          const urlObj = new URL(audioUrl);
          const cleanPath = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
          // Replace localhost with host.docker.internal for Docker access
          audioUrl = cleanPath.replace(/localhost/g, 'host.docker.internal');
        }

        logger.info('Transcription audio URL:', { audioUrl: audioUrl.substring(0, 100) + '...' });

        const response = await axios.post(
          aiServiceUrl ? `${aiServiceUrl}/api/v1/transcribe` : whisperApiUrl,
          {
            audio_url: audioUrl,
            language: this.options.language !== 'auto' ? this.options.language : null,
            enable_diarization: this.options.enableDiarization || true,
            enable_timestamps: this.options.enableTimestamps || true,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 600000,
          }
        );

        const data = response.data;
        return {
          text: data.text,
          segments: data.segments.map((seg: any) => ({
            id: `seg_${seg.id}`,
            text: seg.text.trim(),
            speaker: seg.speaker,
            startTime: seg.start_time,
            endTime: seg.end_time,
            confidence: seg.confidence || 0.95,
          })),
          language: data.language,
          confidence: data.confidence || 0.95,
        };
      } catch (error) {
        logger.error('Local AI service transcription failed:', error);
        throw error;
      }
    }

    // Fall back to OpenAI format (multipart form upload)
    const tempFile = path.join('/tmp', `${this.transcriptionId}.mp3`);
    fs.writeFileSync(tempFile, audioBuffer);

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempFile));
      formData.append('model', 'whisper-1');

      if (this.options.language && this.options.language !== 'auto') {
        formData.append('language', this.options.language);
      }

      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', JSON.stringify(['segment', 'word']));

      const response = await axios.post(
        whisperApiUrl,
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

      fs.unlinkSync(tempFile);
      const segments = this.parseWhisperResponse(response.data);

      return {
        text: response.data.text,
        segments,
        language: response.data.language,
        confidence: 0.95,
      };
    } catch (error) {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw error;
    }
  }


  private parseWhisperResponse(data: any): TranscriptionSegment[] {
    const segments: TranscriptionSegment[] = [];

    if (data.segments) {
      data.segments.forEach((segment: any) => {
        segments.push({
          id: `seg_${segments.length}`,
          text: segment.text.trim(),
          startTime: segment.start,
          endTime: segment.end,
          confidence: 0.95,
          words: segment.words?.map((word: any) => ({
            word: word.word,
            startTime: word.start,
            endTime: word.end,
            confidence: 0.95,
          })),
        });
      });
    }

    return segments;
  }

  private async performDiarization(audioBuffer: Buffer): Promise<DiarizationResult> {
    try {
      logger.info('Starting REAL speaker diarization', {
        audioSize: audioBuffer.length,
        speakerLabels: this.options.speakerLabels,
      });

      // Use the REAL SpeakerDiarizationService
      // Supports: vLLM + pyannote, pyannote.audio, Whisper fallback
      const result = await speakerDiarizationService.diarize(audioBuffer, {
        minSpeakers: 1,
        maxSpeakers: 10,
        language: this.options.language,
        speakerLabels: this.options.speakerLabels,
      });

      logger.info('Speaker diarization complete', {
        provider: result.provider,
        speakerCount: result.speakers.length,
        segmentCount: result.segments.length,
        processingTime: result.processingTime,
      });

      return result;

    } catch (error) {
      logger.error('Error performing diarization:', error);

      // Return empty result - will use basic speaker detection
      return {
        speakers: [],
        segments: [],
        provider: 'whisper',
        processingTime: 0,
      };
    }
  }

  private mergeDiarizationWithTranscription(
    segments: TranscriptionSegment[],
    diarization: DiarizationResult
  ): TranscriptionSegment[] {
    // If no diarization segments, return original with default speaker
    if (!diarization.segments || diarization.segments.length === 0) {
      logger.warn('No diarization segments available, using default speaker');
      return segments.map(segment => ({
        ...segment,
        speakerId: 'SPEAKER_0',
        speaker: this.options.speakerLabels?.find(l => l.speakerId === 'SPEAKER_0')?.name || 'Speaker 1',
      }));
    }

    // Use the REAL diarization service to merge segments
    const mergedSegments = speakerDiarizationService.mergeWithTranscription(
      segments.map(s => ({ start: s.startTime, end: s.endTime, text: s.text })),
      diarization
    );

    // Map back to TranscriptionSegment format
    return segments.map((segment, index) => {
      const merged = mergedSegments[index];
      const speakerId = merged?.speakerId || 'SPEAKER_0';
      const speakerLabel = this.options.speakerLabels?.find(l => l.speakerId === speakerId)?.name;

      return {
        ...segment,
        speakerId,
        speaker: speakerLabel || merged?.speaker || `Speaker ${parseInt(speakerId.replace('SPEAKER_', '')) + 1}`,
      };
    });
  }

  private extractSpeakers(segments: TranscriptionSegment[]): any[] {
    const speakerMap = new Map<string, any>();

    segments.forEach(segment => {
      if (segment.speakerId) {
        if (!speakerMap.has(segment.speakerId)) {
          speakerMap.set(segment.speakerId, {
            speakerId: segment.speakerId,
            name: segment.speaker,
            totalSpeakingTime: 0,
            segmentCount: 0,
          });
        }

        const speaker = speakerMap.get(segment.speakerId);
        speaker.totalSpeakingTime += segment.endTime - segment.startTime;
        speaker.segmentCount++;
      }
    });

    return Array.from(speakerMap.values());
  }

  private async extractKeywordsAndEntities(text: string): Promise<{
    keywords: string[];
    entities: Array<{ type: string; value: string; confidence: number }>;
  }> {
    // Extract simple keywords using frequency analysis
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();

    words.forEach(word => {
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      if (cleaned.length > 4) {
        wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1);
      }
    });

    const keywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    // Extract entities using real NER from AI service (spaCy)
    let entities: Array<{ type: string; value: string; confidence: number }> = [];

    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

      const response = await axios.post(`${aiServiceUrl}/api/v1/extract-entities`, {
        text: text,
        min_confidence: 0.7,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.entities) {
        // Map spaCy entities to our format
        entities = response.data.entities.map((entity: any) => ({
          type: entity.type,
          value: entity.value,
          confidence: entity.confidence,
        }));

        logger.info(`Extracted ${entities.length} entities using spaCy NER`);
      }
    } catch (error) {
      logger.warn('Failed to extract entities from AI service, using fallback:', error);

      // Fallback to simple regex-based entity extraction
      entities = this.extractEntitiesFallback(text);
    }

    return { keywords, entities };
  }

  private extractEntitiesFallback(text: string): Array<{ type: string; value: string; confidence: number }> {
    const entities: Array<{ type: string; value: string; confidence: number }> = [];

    // Email pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      entities.push({ type: 'EMAIL', value: email, confidence: 0.95 });
    });

    // URL pattern
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
      entities.push({ type: 'URL', value: url, confidence: 0.95 });
    });

    // Phone pattern (simple)
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const phones = text.match(phoneRegex) || [];
    phones.forEach(phone => {
      entities.push({ type: 'PHONE', value: phone, confidence: 0.90 });
    });

    // Money pattern
    const moneyRegex = /\$\d+(?:,\d{3})*(?:\.\d{2})?/g;
    const amounts = text.match(moneyRegex) || [];
    amounts.forEach(amount => {
      entities.push({ type: 'MONEY', value: amount, confidence: 0.85 });
    });

    logger.info(`Fallback extraction found ${entities.length} entities`);
    return entities;
  }

  getProgress(): number {
    return this.progress;
  }
}

// Note: TranscriptionService requires services to be injected
// Consumers should create instances as needed with required dependencies
// Example: new TranscriptionService(storageService, queueService, searchService)
