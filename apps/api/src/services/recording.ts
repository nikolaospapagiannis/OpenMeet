/**
 * Recording Service
 * WebRTC-based meeting recording with audio/video capture
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { StorageService } from './storage';
import { QueueService, JobType } from './queue';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import { Readable, Writable } from 'stream';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'recording-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface RecordingOptions {
  meetingId: string;
  organizationId: string;
  userId: string;
  audioOnly?: boolean;
  videoQuality?: 'low' | 'medium' | 'high' | '4k';
  maxDuration?: number; // in seconds
  autoTranscribe?: boolean;
  saveChat?: boolean;
  saveScreenShare?: boolean;
  metadata?: Record<string, unknown>; // Additional metadata for integrations
}

export interface RecordingStream {
  id: string;
  meetingId: string;
  type: 'audio' | 'video' | 'screen';
  codec: string;
  bitrate: number;
  sampleRate?: number;
  resolution?: { width: number; height: number };
  frameRate?: number;
}

export interface RecordingMetadata {
  meetingId: string;
  organizationId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  fileSize?: number;
  participants: Array<{
    userId: string;
    name: string;
    joinTime: Date;
    leaveTime?: Date;
    speakingDuration?: number;
  }>;
  streams: RecordingStream[];
  transcriptionEnabled: boolean;
  storageUrl?: string;
}

export class RecordingService extends EventEmitter {
  private activeRecordings: Map<string, RecordingSession>;
  private storageService: StorageService;
  private queueService: QueueService;
  private wsServer?: WebSocket.Server;

  constructor(
    storageService: StorageService,
    queueService: QueueService
  ) {
    super();
    this.activeRecordings = new Map();
    this.storageService = storageService;
    this.queueService = queueService;
    this.initializeWebSocketServer();
  }

  /**
   * Initialize WebSocket server for real-time streaming
   */
  private initializeWebSocketServer(): void {
    this.wsServer = new WebSocket.Server({
      port: parseInt(process.env.WS_PORT || '8080'),
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      },
    });

    this.wsServer.on('connection', (ws, req) => {
      const meetingId = this.extractMeetingId(req.url || '');
      
      if (!meetingId) {
        ws.close(1008, 'Meeting ID required');
        return;
      }

      logger.info(`WebSocket connection established for meeting: ${meetingId}`);

      ws.on('message', async (data) => {
        await this.handleStreamData(meetingId, data);
      });

      ws.on('close', () => {
        logger.info(`WebSocket connection closed for meeting: ${meetingId}`);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for meeting ${meetingId}:`, error);
      });
    });
  }

  /**
   * Start recording a meeting
   */
  async startRecording(options: RecordingOptions): Promise<string> {
    try {
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Check if already recording
      if (this.activeRecordings.has(options.meetingId)) {
        throw new Error('Meeting is already being recorded');
      }

      // Create recording record in database
      const recording = await prisma.meetingRecording.create({
        data: {
          id: recordingId,
          meetingId: options.meetingId,
          fileUrl: '', // Will be updated when recording completes
          isVideo: !(options.audioOnly || false),
          transcriptionStatus: options.autoTranscribe ? 'pending' : 'not_requested',
          metadata: {
            organizationId: options.organizationId,
            startedAt: new Date().toISOString(),
            status: 'recording',
            isAudioOnly: options.audioOnly || false,
            quality: options.videoQuality || 'high',
            autoTranscribe: options.autoTranscribe,
            saveChat: options.saveChat,
            saveScreenShare: options.saveScreenShare,
          } as any,
        },
      });

      // Initialize recording session
      const session = new RecordingSession(
        recordingId,
        options,
        this.storageService,
        this.queueService
      );

      await session.initialize();
      
      this.activeRecordings.set(options.meetingId, session);

      // Start recording
      await session.start();

      // Set max duration timeout if specified
      if (options.maxDuration) {
        setTimeout(() => {
          this.stopRecording(options.meetingId);
        }, options.maxDuration * 1000);
      }

      logger.info(`Recording started for meeting: ${options.meetingId}`);
      
      this.emit('recording:started', {
        recordingId,
        meetingId: options.meetingId,
      });

      return recordingId;
    } catch (error) {
      logger.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording a meeting
   */
  async stopRecording(meetingId: string): Promise<void> {
    try {
      const session = this.activeRecordings.get(meetingId);
      
      if (!session) {
        throw new Error('No active recording found for this meeting');
      }

      // Stop the recording
      const metadata = await session.stop();

      // Update recording record
      await prisma.meetingRecording.update({
        where: { id: session.recordingId },
        data: {
          fileUrl: metadata.storageUrl || '',
          durationSeconds: metadata.duration,
          fileSizeBytes: metadata.fileSize ? BigInt(metadata.fileSize) : null,
          transcriptionStatus: metadata.transcriptionEnabled ? 'pending' : 'not_requested',
          metadata: {
            ...(await prisma.meetingRecording.findUnique({ where: { id: session.recordingId } }).then(r => r?.metadata || {})) as any,
            endedAt: new Date().toISOString(),
            status: 'processing',
          } as any,
        },
      });

      // Remove from active recordings
      this.activeRecordings.delete(meetingId);

      // Queue post-processing jobs
      await this.queuePostProcessing(session.recordingId, metadata);

      logger.info(`Recording stopped for meeting: ${meetingId}`);
      
      this.emit('recording:stopped', {
        recordingId: session.recordingId,
        meetingId,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(meetingId: string): Promise<void> {
    const session = this.activeRecordings.get(meetingId);

    if (!session) {
      throw new Error('No active recording found');
    }

    await session.pause();

    const currentRecording = await prisma.meetingRecording.findUnique({
      where: { id: session.recordingId },
    });

    await prisma.meetingRecording.update({
      where: { id: session.recordingId },
      data: {
        metadata: {
          ...(currentRecording?.metadata as any || {}),
          status: 'paused',
        } as any,
      },
    });

    this.emit('recording:paused', { meetingId });
  }

  /**
   * Resume recording
   */
  async resumeRecording(meetingId: string): Promise<void> {
    const session = this.activeRecordings.get(meetingId);

    if (!session) {
      throw new Error('No active recording found');
    }

    await session.resume();

    const currentRecording = await prisma.meetingRecording.findUnique({
      where: { id: session.recordingId },
    });

    await prisma.meetingRecording.update({
      where: { id: session.recordingId },
      data: {
        metadata: {
          ...(currentRecording?.metadata as any || {}),
          status: 'recording',
        } as any,
      },
    });

    this.emit('recording:resumed', { meetingId });
  }

  /**
   * Handle incoming stream data
   */
  private async handleStreamData(
    meetingId: string,
    data: WebSocket.Data
  ): Promise<void> {
    const session = this.activeRecordings.get(meetingId);
    
    if (!session) {
      logger.warn(`No active recording for meeting: ${meetingId}`);
      return;
    }

    await session.processStreamData(data);
  }

  /**
   * Queue post-processing jobs
   */
  private async queuePostProcessing(
    recordingId: string,
    metadata: RecordingMetadata
  ): Promise<void> {
    const jobs = [];

    // Queue transcription job if enabled
    if (metadata.transcriptionEnabled) {
      jobs.push(
        this.queueService.addJob(JobType.TRANSCRIPTION, {
          type: JobType.TRANSCRIPTION,
          payload: {
            recordingId,
            meetingId: metadata.meetingId,
            audioUrl: metadata.storageUrl,
            language: 'auto',
          },
          organizationId: metadata.organizationId,
        })
      );
    }

    // Queue video processing job
    jobs.push(
      this.queueService.addJob(JobType.FILE_PROCESSING, {
        type: JobType.FILE_PROCESSING,
        payload: {
          recordingId,
          task: 'compress',
          inputUrl: metadata.storageUrl,
        },
        organizationId: metadata.organizationId,
      })
    );

    // Queue analytics processing
    jobs.push(
      this.queueService.addJob(JobType.ANALYTICS_PROCESSING, {
        type: JobType.ANALYTICS_PROCESSING,
        payload: {
          recordingId,
          meetingId: metadata.meetingId,
          participants: metadata.participants,
        },
        organizationId: metadata.organizationId,
      })
    );

    await Promise.all(jobs);
  }

  /**
   * Extract meeting ID from WebSocket URL
   */
  private extractMeetingId(url: string): string | null {
    const match = url.match(/\/record\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get recording status
   */
  async getRecordingStatus(meetingId: string): Promise<{
    isRecording: boolean;
    recordingId?: string;
    duration?: number;
    status?: string;
  }> {
    const session = this.activeRecordings.get(meetingId);
    
    if (!session) {
      return { isRecording: false };
    }

    return {
      isRecording: true,
      recordingId: session.recordingId,
      duration: session.getDuration(),
      status: session.getStatus(),
    };
  }

  /**
   * Get all active recordings
   */
  getActiveRecordings(): Array<{
    meetingId: string;
    recordingId: string;
    startTime: Date;
    duration: number;
  }> {
    const recordings: Array<any> = [];
    
    this.activeRecordings.forEach((session, meetingId) => {
      recordings.push({
        meetingId,
        recordingId: session.recordingId,
        startTime: session.startTime,
        duration: session.getDuration(),
      });
    });

    return recordings;
  }

  /**
   * Cleanup orphaned recordings
   */
  async cleanupOrphanedRecordings(): Promise<number> {
    try {
      const orphanedRecordings = await prisma.meetingRecording.findMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        },
      });

      // Filter orphaned recordings based on metadata status
      const actuallyOrphaned = orphanedRecordings.filter(r => {
        const metadata = r.metadata as any;
        return metadata?.status === 'recording';
      });

      for (const recording of actuallyOrphaned) {
        await prisma.meetingRecording.update({
          where: { id: recording.id },
          data: {
            transcriptionStatus: 'failed',
            metadata: {
              ...(recording.metadata as any),
              status: 'failed',
              endedAt: new Date().toISOString(),
              error: 'Recording orphaned and cleaned up',
            } as any,
          },
        });
      }

      logger.info(`Cleaned up ${actuallyOrphaned.length} orphaned recordings`);
      return actuallyOrphaned.length;
    } catch (error) {
      logger.error('Failed to cleanup orphaned recordings:', error);
      return 0;
    }
  }
}

/**
 * Recording Session Handler
 */
class RecordingSession {
  public recordingId: string;
  public startTime: Date;
  private options: RecordingOptions;
  private storageService: StorageService;
  private queueService: QueueService;
  private ffmpegProcess?: ChildProcess;
  private outputStream?: Writable;
  private status: 'initializing' | 'recording' | 'paused' | 'stopped';
  private tempFilePath: string;
  private metadata: RecordingMetadata;

  constructor(
    recordingId: string,
    options: RecordingOptions,
    storageService: StorageService,
    queueService: QueueService
  ) {
    this.recordingId = recordingId;
    this.options = options;
    this.storageService = storageService;
    this.queueService = queueService;
    this.startTime = new Date();
    this.status = 'initializing';
    this.tempFilePath = path.join(
      process.env.TEMP_DIR || '/tmp',
      `${recordingId}.webm`
    );
    
    this.metadata = {
      meetingId: options.meetingId,
      organizationId: options.organizationId,
      startTime: this.startTime,
      participants: [],
      streams: [],
      transcriptionEnabled: options.autoTranscribe || false,
    };
  }

  async initialize(): Promise<void> {
    // Create temp directory if it doesn't exist
    const tempDir = path.dirname(this.tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Initialize output stream
    this.outputStream = fs.createWriteStream(this.tempFilePath);
  }

  async start(): Promise<void> {
    const videoQualityMap = {
      'low': { resolution: '640x360', bitrate: '500k', fps: 15 },
      'medium': { resolution: '1280x720', bitrate: '1500k', fps: 30 },
      'high': { resolution: '1920x1080', bitrate: '3000k', fps: 30 },
      '4k': { resolution: '3840x2160', bitrate: '8000k', fps: 30 },
    };

    const quality = videoQualityMap[this.options.videoQuality || 'high'];

    // FFmpeg command for recording
    const ffmpegArgs = [
      '-f', 'webm',
      '-i', 'pipe:0',
      '-c:v', this.options.audioOnly ? 'none' : 'libvpx-vp9',
      '-c:a', 'libopus',
    ];

    if (!this.options.audioOnly) {
      ffmpegArgs.push(
        '-s', quality.resolution,
        '-b:v', quality.bitrate,
        '-r', quality.fps.toString(),
        '-quality', 'realtime',
        '-speed', '6',
        '-tile-columns', '2',
        '-threads', '4'
      );
    }

    ffmpegArgs.push(
      '-b:a', '128k',
      '-ar', '48000',
      '-ac', '2',
      '-f', 'webm',
      this.tempFilePath
    );

    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    this.ffmpegProcess.stderr?.on('data', (data) => {
      logger.debug(`FFmpeg: ${data}`);
    });

    this.ffmpegProcess.on('error', (error) => {
      logger.error('FFmpeg error:', error);
    });

    this.ffmpegProcess.on('close', (code) => {
      logger.info(`FFmpeg process closed with code ${code}`);
    });

    this.status = 'recording';
  }

  async stop(): Promise<RecordingMetadata> {
    this.status = 'stopped';
    this.metadata.endTime = new Date();
    this.metadata.duration = Math.floor(
      (this.metadata.endTime.getTime() - this.startTime.getTime()) / 1000
    );

    // Stop FFmpeg process
    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdin?.end();
      this.ffmpegProcess.kill('SIGTERM');
    }

    // Close output stream
    if (this.outputStream) {
      this.outputStream.end();
    }

    // Wait for file to be written
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Upload to storage
    const stats = fs.statSync(this.tempFilePath);
    this.metadata.fileSize = stats.size;

    const storageKey = `recordings/${this.options.organizationId}/${this.recordingId}.webm`;
    
    await this.storageService.uploadFile(
      storageKey,
      fs.createReadStream(this.tempFilePath),
      {
        contentType: 'video/webm',
        metadata: {
          meetingId: this.options.meetingId,
          recordingId: this.recordingId,
          duration: this.metadata.duration.toString(),
        },
      }
    );

    this.metadata.storageUrl = await this.storageService.generateDownloadUrl(
      storageKey,
      7 * 24 * 60 * 60 // 7 days
    );

    // Cleanup temp file
    fs.unlinkSync(this.tempFilePath);

    return this.metadata;
  }

  async pause(): Promise<void> {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGSTOP');
    }
    this.status = 'paused';
  }

  async resume(): Promise<void> {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGCONT');
    }
    this.status = 'recording';
  }

  async processStreamData(data: WebSocket.Data): Promise<void> {
    if (this.status !== 'recording' || !this.ffmpegProcess?.stdin) {
      return;
    }

    if (Buffer.isBuffer(data)) {
      this.ffmpegProcess.stdin.write(data);
    } else if (data instanceof ArrayBuffer) {
      this.ffmpegProcess.stdin.write(Buffer.from(data));
    }
  }

  getDuration(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  getStatus(): string {
    return this.status;
  }
}
