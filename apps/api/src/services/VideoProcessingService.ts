/**
 * Video Processing Service
 * FFmpeg-based video processing for thumbnails, audio extraction, and metadata
 */

import { spawn } from 'child_process';
import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';
import { StorageService } from './storage';
import { Readable } from 'stream';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'video-processing-service' },
  transports: [new winston.transports.Console()],
});

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  format: string;
  bitrate: number;
  hasAudio: boolean;
}

export interface ThumbnailOptions {
  count?: number;
  width?: number;
  quality?: number;
  timestamps?: number[];
}

export interface VideoProcessingProgress {
  stage: 'download' | 'metadata' | 'thumbnails' | 'audio' | 'upload' | 'complete';
  progress: number;
  message: string;
}

export class VideoProcessingService {
  private storageService: StorageService;
  private tempDir: string;

  constructor(storageService?: StorageService) {
    this.storageService = storageService || new StorageService();
    this.tempDir = process.env.VIDEO_TEMP_DIR || '/tmp/video-processing';
  }

  /**
   * Initialize temp directory
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
      throw error;
    }
  }

  /**
   * Extract video metadata using FFprobe
   */
  async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath,
      ]);

      let output = '';
      let error = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          logger.error('FFprobe failed:', error);
          reject(new Error(`FFprobe failed with code ${code}: ${error}`));
          return;
        }

        try {
          const data = JSON.parse(output);
          const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
          const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          const metadata: VideoMetadata = {
            duration: parseFloat(data.format?.duration || '0'),
            width: parseInt(videoStream.width || '0'),
            height: parseInt(videoStream.height || '0'),
            fps: this.parseFps(videoStream.r_frame_rate || '0/0'),
            codec: videoStream.codec_name || 'unknown',
            format: data.format?.format_name || 'unknown',
            bitrate: parseInt(data.format?.bit_rate || '0'),
            hasAudio: !!audioStream,
          };

          logger.info('Video metadata extracted:', metadata);
          resolve(metadata);
        } catch (err) {
          logger.error('Failed to parse FFprobe output:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * Parse FPS string (e.g., "30/1" => 30)
   */
  private parseFps(fpsString: string): number {
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(fpsString) || 0;
  }

  /**
   * Generate thumbnails at specific timestamps
   */
  async generateThumbnails(
    videoPath: string,
    options: ThumbnailOptions = {}
  ): Promise<string[]> {
    await this.ensureTempDir();

    const {
      count = 5,
      width = 320,
      quality = 2,
      timestamps,
    } = options;

    const outputFiles: string[] = [];

    try {
      // If specific timestamps provided, use them
      if (timestamps && timestamps.length > 0) {
        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i];
          const outputPath = path.join(this.tempDir, `thumb_${Date.now()}_${i}.jpg`);

          await this.generateThumbnailAtTimestamp(videoPath, timestamp, outputPath, width, quality);
          outputFiles.push(outputPath);
        }
      } else {
        // Generate evenly spaced thumbnails
        const metadata = await this.extractMetadata(videoPath);
        const interval = metadata.duration / (count + 1);

        for (let i = 0; i < count; i++) {
          const timestamp = interval * (i + 1);
          const outputPath = path.join(this.tempDir, `thumb_${Date.now()}_${i}.jpg`);

          await this.generateThumbnailAtTimestamp(videoPath, timestamp, outputPath, width, quality);
          outputFiles.push(outputPath);
        }
      }

      logger.info(`Generated ${outputFiles.length} thumbnails`);
      return outputFiles;
    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      // Clean up any generated files
      await this.cleanupFiles(outputFiles);
      throw error;
    }
  }

  /**
   * Generate single thumbnail at specific timestamp
   */
  private async generateThumbnailAtTimestamp(
    videoPath: string,
    timestamp: number,
    outputPath: string,
    width: number,
    quality: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-ss', timestamp.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-vf', `scale=${width}:-1`,
        '-q:v', quality.toString(),
        '-y',
        outputPath,
      ]);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          logger.error('FFmpeg thumbnail generation failed:', error);
          reject(new Error(`FFmpeg failed with code ${code}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Extract audio from video
   */
  async extractAudio(videoPath: string, outputPath?: string): Promise<string> {
    await this.ensureTempDir();

    const audioPath = outputPath || path.join(
      this.tempDir,
      `audio_${Date.now()}.mp3`
    );

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vn', // No video
        '-acodec', 'libmp3lame',
        '-ab', '192k',
        '-ar', '44100',
        '-y',
        audioPath,
      ]);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          logger.error('FFmpeg audio extraction failed:', error);
          reject(new Error(`FFmpeg failed with code ${code}: ${error}`));
          return;
        }

        logger.info('Audio extracted successfully:', audioPath);
        resolve(audioPath);
      });
    });
  }

  /**
   * Create video clip from timestamp range
   */
  async createClip(
    videoPath: string,
    startTime: number,
    endTime: number,
    outputPath?: string
  ): Promise<string> {
    await this.ensureTempDir();

    const clipPath = outputPath || path.join(
      this.tempDir,
      `clip_${Date.now()}.mp4`
    );

    const duration = endTime - startTime;

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-ss', startTime.toString(),
        '-i', videoPath,
        '-t', duration.toString(),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-strict', 'experimental',
        '-b:a', '192k',
        '-y',
        clipPath,
      ]);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          logger.error('FFmpeg clip creation failed:', error);
          reject(new Error(`FFmpeg failed with code ${code}: ${error}`));
          return;
        }

        logger.info('Video clip created successfully:', clipPath);
        resolve(clipPath);
      });
    });
  }

  /**
   * Generate WebVTT subtitle file from transcript segments
   */
  async generateWebVTT(
    segments: Array<{ text: string; startTime: number; endTime: number; speaker?: string }>,
    outputPath?: string
  ): Promise<string> {
    await this.ensureTempDir();

    const vttPath = outputPath || path.join(
      this.tempDir,
      `subtitles_${Date.now()}.vtt`
    );

    let vttContent = 'WEBVTT\n\n';

    segments.forEach((segment, index) => {
      const startTime = this.formatVTTTime(segment.startTime);
      const endTime = this.formatVTTTime(segment.endTime);
      const speaker = segment.speaker ? `<v ${segment.speaker}>` : '';

      vttContent += `${index + 1}\n`;
      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${speaker}${segment.text}\n\n`;
    });

    await fs.writeFile(vttPath, vttContent, 'utf-8');
    logger.info('WebVTT file generated:', vttPath);

    return vttPath;
  }

  /**
   * Format time in seconds to WebVTT format (HH:MM:SS.mmm)
   */
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }

  /**
   * Detect screen share segments (simplified - detects scene changes)
   */
  async detectScreenShares(videoPath: string): Promise<Array<{ start: number; end: number }>> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vf', 'select=gt(scene\\,0.4),showinfo',
        '-f', 'null',
        '-',
      ]);

      const sceneChanges: number[] = [];
      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        error += output;

        // Parse scene change timestamps
        const matches = output.matchAll(/pts_time:([\d.]+)/g);
        for (const match of matches) {
          sceneChanges.push(parseFloat(match[1]));
        }
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0 && code !== 1) { // Code 1 is acceptable for this filter
          logger.error('FFmpeg scene detection failed:', error);
          reject(new Error(`FFmpeg failed with code ${code}`));
          return;
        }

        // Group scene changes into segments (simplified logic)
        const segments: Array<{ start: number; end: number }> = [];
        let currentStart = sceneChanges[0];

        for (let i = 1; i < sceneChanges.length; i++) {
          if (sceneChanges[i] - sceneChanges[i - 1] > 5) {
            // Gap > 5 seconds indicates end of segment
            segments.push({
              start: currentStart,
              end: sceneChanges[i - 1],
            });
            currentStart = sceneChanges[i];
          }
        }

        logger.info(`Detected ${segments.length} potential screen share segments`);
        resolve(segments);
      });
    });
  }

  /**
   * Upload file to S3 storage
   */
  async uploadToStorage(
    filePath: string,
    s3Key: string,
    contentType: string
  ): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);

      await this.storageService.uploadFile(s3Key, fileBuffer, {
        contentType,
        metadata: {
          'uploaded-at': new Date().toISOString(),
        },
      });

      const url = await this.storageService.generateDownloadUrl(s3Key, 86400 * 365); // 1 year

      logger.info('File uploaded to storage:', { s3Key, url });
      return url;
    } catch (error) {
      logger.error('Storage upload failed:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        logger.debug('Cleaned up temp file:', filePath);
      } catch (error) {
        logger.warn('Failed to cleanup file:', { filePath, error });
      }
    }
  }

  /**
   * Check if FFmpeg is available
   */
  async checkFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);

      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Compress video for storage optimization
   * Reduces file size while maintaining reasonable quality
   */
  async compressVideo(
    inputPath: string,
    outputPath?: string,
    options: {
      quality?: 'low' | 'medium' | 'high';
      targetBitrate?: string;
      maxWidth?: number;
    } = {}
  ): Promise<string> {
    await this.ensureTempDir();

    const compressedPath = outputPath || path.join(
      this.tempDir,
      `compressed_${Date.now()}.mp4`
    );

    const { quality = 'medium', targetBitrate, maxWidth = 1280 } = options;

    // Quality presets
    const qualitySettings = {
      low: { crf: '28', preset: 'faster' },
      medium: { crf: '23', preset: 'medium' },
      high: { crf: '18', preset: 'slow' },
    };

    const settings = qualitySettings[quality];

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', inputPath,
        '-vf', `scale='min(${maxWidth},iw)':-2`, // Scale down if larger than maxWidth
        '-c:v', 'libx264',
        '-crf', settings.crf,
        '-preset', settings.preset,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart', // Enable streaming
        '-y',
        compressedPath,
      ];

      // Add target bitrate if specified
      if (targetBitrate) {
        ffmpegArgs.splice(ffmpegArgs.indexOf('-crf'), 2, '-b:v', targetBitrate);
      }

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          logger.error('FFmpeg compression failed:', error);
          reject(new Error(`FFmpeg compression failed with code ${code}`));
          return;
        }

        logger.info('Video compressed successfully:', compressedPath);
        resolve(compressedPath);
      });
    });
  }

  /**
   * Generate playback URL with timestamp markers
   * Creates URLs that support direct jumping to specific timestamps
   */
  generatePlaybackUrl(
    baseUrl: string,
    options: {
      startTime?: number;
      endTime?: number;
      autoplay?: boolean;
      muted?: boolean;
      loop?: boolean;
    } = {}
  ): string {
    try {
      const url = new URL(baseUrl);
      const params = new URLSearchParams();

      // Add timestamp fragment (standard HTML5 video)
      if (options.startTime !== undefined) {
        if (options.endTime !== undefined) {
          url.hash = `t=${options.startTime},${options.endTime}`;
        } else {
          url.hash = `t=${options.startTime}`;
        }
      }

      // Add query parameters for player options
      if (options.autoplay) {
        params.set('autoplay', '1');
      }
      if (options.muted) {
        params.set('muted', '1');
      }
      if (options.loop) {
        params.set('loop', '1');
      }

      if (params.toString()) {
        url.search = params.toString();
      }

      return url.toString();
    } catch (error) {
      logger.error('Error generating playback URL:', error);
      return baseUrl;
    }
  }

  /**
   * Create HLS (HTTP Live Streaming) playlist for adaptive bitrate streaming
   * Generates multiple quality variants for optimal playback
   */
  async createHLSPlaylist(
    inputPath: string,
    outputDir?: string
  ): Promise<{
    masterPlaylistPath: string;
    variants: Array<{ quality: string; path: string; bandwidth: number }>;
  }> {
    await this.ensureTempDir();

    const hlsDir = outputDir || path.join(this.tempDir, `hls_${Date.now()}`);
    await fs.mkdir(hlsDir, { recursive: true });

    const masterPlaylistPath = path.join(hlsDir, 'master.m3u8');

    // Define quality variants
    const variants = [
      { quality: '360p', width: 640, bitrate: '800k', bandwidth: 800000 },
      { quality: '720p', width: 1280, bitrate: '2500k', bandwidth: 2500000 },
      { quality: '1080p', width: 1920, bitrate: '5000k', bandwidth: 5000000 },
    ];

    try {
      // Generate each variant
      const generatedVariants = [];

      for (const variant of variants) {
        const variantPath = path.join(hlsDir, `${variant.quality}.m3u8`);
        const segmentPattern = path.join(hlsDir, `${variant.quality}_%03d.ts`);

        await new Promise<void>((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', [
            '-i', inputPath,
            '-vf', `scale=${variant.width}:-2`,
            '-c:v', 'libx264',
            '-b:v', variant.bitrate,
            '-c:a', 'aac',
            '-b:a', '128k',
            '-f', 'hls',
            '-hls_time', '10',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segmentPattern,
            variantPath,
          ]);

          let error = '';

          ffmpeg.stderr.on('data', (data) => {
            error += data.toString();
          });

          ffmpeg.on('close', (code) => {
            if (code !== 0) {
              logger.error(`HLS variant ${variant.quality} generation failed:`, error);
              reject(new Error(`FFmpeg HLS failed with code ${code}`));
              return;
            }
            resolve();
          });
        });

        generatedVariants.push({
          quality: variant.quality,
          path: variantPath,
          bandwidth: variant.bandwidth,
        });
      }

      // Create master playlist
      let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

      for (const variant of generatedVariants) {
        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variants.find(v => v.quality === variant.quality)?.width}x${Math.floor((variants.find(v => v.quality === variant.quality)?.width || 640) * 9 / 16)}\n`;
        masterPlaylist += `${variant.quality}.m3u8\n\n`;
      }

      await fs.writeFile(masterPlaylistPath, masterPlaylist, 'utf-8');

      logger.info('HLS playlist created successfully:', { masterPlaylistPath, variants: generatedVariants.length });

      return {
        masterPlaylistPath,
        variants: generatedVariants,
      };
    } catch (error) {
      logger.error('HLS playlist creation failed:', error);
      throw error;
    }
  }

  /**
   * Generate sprite sheet for video scrubbing/preview
   * Creates a single image with thumbnails at regular intervals
   */
  async generateSpriteSheet(
    videoPath: string,
    options: {
      interval?: number; // Seconds between thumbnails
      columns?: number;
      thumbnailWidth?: number;
    } = {}
  ): Promise<{
    spritePath: string;
    vttPath: string;
    thumbnailCount: number;
    columns: number;
    thumbnailWidth: number;
    thumbnailHeight: number;
  }> {
    await this.ensureTempDir();

    const { interval = 10, columns = 10, thumbnailWidth = 160 } = options;

    // Get video duration
    const metadata = await this.extractMetadata(videoPath);
    const duration = metadata.duration;
    const thumbnailCount = Math.floor(duration / interval);

    const spritePath = path.join(this.tempDir, `sprite_${Date.now()}.jpg`);
    const vttPath = path.join(this.tempDir, `sprite_${Date.now()}.vtt`);

    // Calculate thumbnail dimensions
    const aspectRatio = metadata.width / metadata.height;
    const thumbnailHeight = Math.floor(thumbnailWidth / aspectRatio);

    return new Promise((resolve, reject) => {
      // Generate sprite sheet using FFmpeg
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vf', `fps=1/${interval},scale=${thumbnailWidth}:${thumbnailHeight},tile=${columns}x${Math.ceil(thumbnailCount / columns)}`,
        '-y',
        spritePath,
      ]);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', async (code) => {
        if (code !== 0) {
          logger.error('Sprite sheet generation failed:', error);
          reject(new Error(`FFmpeg sprite failed with code ${code}`));
          return;
        }

        // Generate WebVTT file for sprite sheet navigation
        let vttContent = 'WEBVTT\n\n';

        for (let i = 0; i < thumbnailCount; i++) {
          const startTime = i * interval;
          const endTime = (i + 1) * interval;
          const row = Math.floor(i / columns);
          const col = i % columns;
          const x = col * thumbnailWidth;
          const y = row * thumbnailHeight;

          vttContent += `${this.formatVTTTime(startTime)} --> ${this.formatVTTTime(endTime)}\n`;
          vttContent += `sprite.jpg#xywh=${x},${y},${thumbnailWidth},${thumbnailHeight}\n\n`;
        }

        await fs.writeFile(vttPath, vttContent, 'utf-8');

        logger.info('Sprite sheet generated successfully:', { spritePath, thumbnailCount });

        resolve({
          spritePath,
          vttPath,
          thumbnailCount,
          columns,
          thumbnailWidth,
          thumbnailHeight,
        });
      });
    });
  }

  /**
   * Process video completely (metadata + thumbnails + audio)
   */
  async processVideo(
    videoPath: string,
    options: {
      organizationId: string;
      videoId: string;
      generateThumbnails?: boolean;
      extractAudio?: boolean;
      thumbnailCount?: number;
    },
    progressCallback?: (progress: VideoProcessingProgress) => void
  ): Promise<{
    metadata: VideoMetadata;
    thumbnails?: { s3Key: string; url: string }[];
    audio?: { s3Key: string; url: string };
  }> {
    const { organizationId, videoId, generateThumbnails = true, extractAudio = true, thumbnailCount = 5 } = options;

    try {
      // Extract metadata
      progressCallback?.({
        stage: 'metadata',
        progress: 20,
        message: 'Extracting video metadata...',
      });

      const metadata = await this.extractMetadata(videoPath);

      const result: any = { metadata };

      // Generate thumbnails
      if (generateThumbnails) {
        progressCallback?.({
          stage: 'thumbnails',
          progress: 40,
          message: 'Generating thumbnails...',
        });

        const thumbnailPaths = await this.generateThumbnails(videoPath, { count: thumbnailCount });
        const thumbnails = [];

        for (let i = 0; i < thumbnailPaths.length; i++) {
          const s3Key = `videos/${organizationId}/${videoId}/thumbnails/thumb_${i}.jpg`;
          const url = await this.uploadToStorage(thumbnailPaths[i], s3Key, 'image/jpeg');
          thumbnails.push({ s3Key, url });
        }

        await this.cleanupFiles(thumbnailPaths);
        result.thumbnails = thumbnails;
      }

      // Extract audio
      if (extractAudio && metadata.hasAudio) {
        progressCallback?.({
          stage: 'audio',
          progress: 70,
          message: 'Extracting audio...',
        });

        const audioPath = await this.extractAudio(videoPath);
        const s3Key = `videos/${organizationId}/${videoId}/audio.mp3`;
        const url = await this.uploadToStorage(audioPath, s3Key, 'audio/mpeg');

        await this.cleanupFiles([audioPath]);
        result.audio = { s3Key, url };
      }

      progressCallback?.({
        stage: 'complete',
        progress: 100,
        message: 'Video processing complete',
      });

      return result;
    } catch (error) {
      logger.error('Video processing failed:', error);
      throw error;
    }
  }
}
