/**
 * Slide Capture Service
 *
 * Automatically capture presentation slides during meetings
 * Competitive Feature: Otter.ai Automated Slide Capture
 *
 * Features:
 * - Automatic slide detection during screen sharing
 * - Screenshot capture when slides change
 * - OCR text extraction from slides
 * - Slide-to-transcript timeline synchronization
 * - Slide image storage and retrieval
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import OpenAI from 'openai';
import sharp from 'sharp';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface CapturedSlide {
  id: string;
  meetingId: string;
  slideNumber: number;
  timestamp: number;
  imageUrl: string;
  thumbnailUrl: string;
  extractedText: string;
  transcriptPosition: number; // Seconds into meeting
  detectedAt: Date;
  isScreenShare: boolean;
}

export interface SlideChangeDetection {
  hasChanged: boolean;
  similarity: number;
  changeType: 'new_slide' | 'animation' | 'minor_change' | 'no_change';
}

class SlideCaptureService {
  private slideBuffers: Map<string, Buffer> = new Map(); // meetingId -> last captured frame
  private slideCache: Map<string, CapturedSlide[]> = new Map(); // meetingId -> slides[]

  /**
   * Process video frame for slide detection
   * Called periodically during screen sharing
   */
  async processVideoFrame(
    meetingId: string,
    frameBuffer: Buffer,
    timestamp: number,
    transcriptPosition: number
  ): Promise<CapturedSlide | null> {
    try {
      // Check if this is a new slide (detect changes)
      const changeDetection = await this.detectSlideChange(meetingId, frameBuffer);

      if (!changeDetection.hasChanged || changeDetection.changeType === 'minor_change') {
        return null; // Not a new slide, skip capture
      }

      // Capture the slide
      const slide = await this.captureSlide(
        meetingId,
        frameBuffer,
        timestamp,
        transcriptPosition
      );

      // Update buffer with current frame
      this.slideBuffers.set(meetingId, frameBuffer);

      logger.info('Slide captured', {
        meetingId,
        slideNumber: slide.slideNumber,
        timestamp
      });

      return slide;
    } catch (error) {
      logger.error('Error processing video frame', { error, meetingId });
      return null;
    }
  }

  /**
   * Detect if slide has changed from previous frame
   */
  private async detectSlideChange(
    meetingId: string,
    currentFrame: Buffer
  ): Promise<SlideChangeDetection> {
    try {
      const previousFrame = this.slideBuffers.get(meetingId);

      if (!previousFrame) {
        // First frame, consider it a new slide
        return {
          hasChanged: true,
          similarity: 0,
          changeType: 'new_slide',
        };
      }

      // Compute perceptual hash similarity
      const similarity = await this.computeImageSimilarity(previousFrame, currentFrame);

      // Determine change type based on similarity
      let changeType: SlideChangeDetection['changeType'];
      let hasChanged = false;

      if (similarity < 0.5) {
        // Major change - new slide
        changeType = 'new_slide';
        hasChanged = true;
      } else if (similarity < 0.85) {
        // Moderate change - animation or partial update
        changeType = 'animation';
        hasChanged = true;
      } else if (similarity < 0.95) {
        // Minor change - pointer movement, minor edit
        changeType = 'minor_change';
        hasChanged = false;
      } else {
        // No significant change
        changeType = 'no_change';
        hasChanged = false;
      }

      return { hasChanged, similarity, changeType };
    } catch (error) {
      logger.error('Error detecting slide change', { error });
      return { hasChanged: false, similarity: 1, changeType: 'no_change' };
    }
  }

  /**
   * Compute image similarity using perceptual hashing
   */
  private async computeImageSimilarity(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Resize both images to same size for comparison
      const size = 64;
      const img1Resized = await sharp(image1)
        .resize(size, size, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

      const img2Resized = await sharp(image2)
        .resize(size, size, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

      // Compute similarity (simple pixel-by-pixel comparison)
      let matchingPixels = 0;
      const totalPixels = size * size;

      for (let i = 0; i < img1Resized.length; i++) {
        const diff = Math.abs(img1Resized[i] - img2Resized[i]);
        if (diff < 30) { // Threshold for "matching"
          matchingPixels++;
        }
      }

      return matchingPixels / totalPixels;
    } catch (error) {
      logger.error('Error computing image similarity', { error });
      return 0.5; // Default to moderate similarity on error
    }
  }

  /**
   * Capture slide screenshot and extract information
   */
  private async captureSlide(
    meetingId: string,
    frameBuffer: Buffer,
    timestamp: number,
    transcriptPosition: number
  ): Promise<CapturedSlide> {
    try {
      const slideNumber = this.getNextSlideNumber(meetingId);
      const slideId = `slide_${meetingId}_${slideNumber}_${Date.now()}`;

      // Process image: optimize and create thumbnail
      const optimizedImage = await sharp(frameBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const thumbnail = await sharp(frameBuffer)
        .resize(320, 240, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload to S3
      const imageUrl = await this.uploadToS3(
        `slides/${meetingId}/${slideId}.jpg`,
        optimizedImage,
        'image/jpeg'
      );

      const thumbnailUrl = await this.uploadToS3(
        `slides/${meetingId}/${slideId}_thumb.jpg`,
        thumbnail,
        'image/jpeg'
      );

      // Extract text using GPT-4 Vision
      const extractedText = await this.extractTextFromSlide(frameBuffer);

      // Create slide record
      const slide: CapturedSlide = {
        id: slideId,
        meetingId,
        slideNumber,
        timestamp,
        imageUrl,
        thumbnailUrl,
        extractedText,
        transcriptPosition,
        detectedAt: new Date(),
        isScreenShare: true,
      };

      // Store in cache
      if (!this.slideCache.has(meetingId)) {
        this.slideCache.set(meetingId, []);
      }
      this.slideCache.get(meetingId)!.push(slide);

      // Store in database
      await prisma.slide.create({
        data: {
          id: slideId,
          meetingId,
          slideNumber,
          timestamp: new Date(timestamp),
          imageUrl,
          thumbnailUrl,
          extractedText,
          transcriptPosition,
          isScreenShare: true,
        },
      });

      return slide;
    } catch (error) {
      logger.error('Error capturing slide', { error, meetingId });
      throw error;
    }
  }

  /**
   * Extract text from slide using GPT-4 Vision
   */
  private async extractTextFromSlide(imageBuffer: Buffer): Promise<string> {
    try {
      // Convert image to base64
      const base64Image = imageBuffer.toString('base64');

      // Use GPT-4 Vision to extract text
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this presentation slide. Include titles, bullet points, and any visible text. Format as plain text, preserving structure.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('Error extracting text from slide', { error });
      return '[Text extraction failed]';
    }
  }

  /**
   * Upload image to S3
   */
  private async uploadToS3(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      const bucket = process.env.AWS_S3_BUCKET || 'openmeet-slides';

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'private',
        })
      );

      return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } catch (error) {
      logger.error('Error uploading to S3', { error });
      throw error;
    }
  }

  /**
   * Get next slide number for meeting
   */
  private getNextSlideNumber(meetingId: string): number {
    const slides = this.slideCache.get(meetingId) || [];
    return slides.length + 1;
  }

  /**
   * Get all slides for a meeting
   */
  async getSlides(meetingId: string): Promise<CapturedSlide[]> {
    try {
      // Check cache first
      if (this.slideCache.has(meetingId)) {
        return this.slideCache.get(meetingId)!;
      }

      // Fetch from database
      const slides = await prisma.slide.findMany({
        where: { meetingId },
        orderBy: { slideNumber: 'asc' },
      });

      const capturedSlides: CapturedSlide[] = slides.map(s => ({
        id: s.id,
        meetingId: s.meetingId,
        slideNumber: s.slideNumber,
        timestamp: s.timestamp.getTime(),
        imageUrl: s.imageUrl,
        thumbnailUrl: s.thumbnailUrl,
        extractedText: s.extractedText,
        transcriptPosition: s.transcriptPosition,
        detectedAt: s.createdAt,
        isScreenShare: s.isScreenShare,
      }));

      // Update cache
      this.slideCache.set(meetingId, capturedSlides);

      return capturedSlides;
    } catch (error) {
      logger.error('Error getting slides', { error, meetingId });
      return [];
    }
  }

  /**
   * Get slide by number
   */
  async getSlideByNumber(meetingId: string, slideNumber: number): Promise<CapturedSlide | null> {
    try {
      const slide = await prisma.slide.findFirst({
        where: {
          meetingId,
          slideNumber,
        },
      });

      if (!slide) {
        return null;
      }

      return {
        id: slide.id,
        meetingId: slide.meetingId,
        slideNumber: slide.slideNumber,
        timestamp: slide.timestamp.getTime(),
        imageUrl: slide.imageUrl,
        thumbnailUrl: slide.thumbnailUrl,
        extractedText: slide.extractedText,
        transcriptPosition: slide.transcriptPosition,
        detectedAt: slide.createdAt,
        isScreenShare: slide.isScreenShare,
      };
    } catch (error) {
      logger.error('Error getting slide by number', { error });
      return null;
    }
  }

  /**
   * Search slides by text content
   */
  async searchSlides(meetingId: string, query: string): Promise<CapturedSlide[]> {
    try {
      const slides = await prisma.slide.findMany({
        where: {
          meetingId,
          extractedText: {
            contains: query,
            mode: 'insensitive',
          },
        },
        orderBy: { slideNumber: 'asc' },
      });

      return slides.map(s => ({
        id: s.id,
        meetingId: s.meetingId,
        slideNumber: s.slideNumber,
        timestamp: s.timestamp.getTime(),
        imageUrl: s.imageUrl,
        thumbnailUrl: s.thumbnailUrl,
        extractedText: s.extractedText,
        transcriptPosition: s.transcriptPosition,
        detectedAt: s.createdAt,
        isScreenShare: s.isScreenShare,
      }));
    } catch (error) {
      logger.error('Error searching slides', { error });
      return [];
    }
  }

  /**
   * Generate slide deck summary
   */
  async generateSlideDeckSummary(meetingId: string): Promise<string> {
    try {
      const slides = await this.getSlides(meetingId);

      if (slides.length === 0) {
        return 'No slides were captured during this meeting.';
      }

      // Combine all slide text
      const allText = slides
        .map(s => `Slide ${s.slideNumber}:\n${s.extractedText}`)
        .join('\n\n');

      // Use GPT-4 to summarize
      const summary = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a presentation analyst. Summarize the key points from these presentation slides.',
          },
          {
            role: 'user',
            content: `Summarize these presentation slides:\n\n${allText}`,
          },
        ],
        max_tokens: 500,
      });

      return summary.choices[0]?.message?.content || 'Summary generation failed.';
    } catch (error) {
      logger.error('Error generating slide deck summary', { error });
      return 'Error generating summary.';
    }
  }

  /**
   * Clean up slide cache for ended meeting
   */
  async cleanupMeeting(meetingId: string): Promise<void> {
    this.slideBuffers.delete(meetingId);
    this.slideCache.delete(meetingId);
    logger.info('Slide capture cleanup complete', { meetingId });
  }

  /**
   * Get slide statistics
   */
  async getSlideStats(meetingId: string): Promise<{
    totalSlides: number;
    averageTextLength: number;
    slidesWithText: number;
    timeRange: { start: number; end: number };
  }> {
    try {
      const slides = await this.getSlides(meetingId);

      if (slides.length === 0) {
        return {
          totalSlides: 0,
          averageTextLength: 0,
          slidesWithText: 0,
          timeRange: { start: 0, end: 0 },
        };
      }

      const totalTextLength = slides.reduce((sum, s) => sum + s.extractedText.length, 0);
      const slidesWithText = slides.filter(s => s.extractedText.length > 10).length;

      return {
        totalSlides: slides.length,
        averageTextLength: Math.round(totalTextLength / slides.length),
        slidesWithText,
        timeRange: {
          start: slides[0].timestamp,
          end: slides[slides.length - 1].timestamp,
        },
      };
    } catch (error) {
      logger.error('Error getting slide stats', { error });
      return {
        totalSlides: 0,
        averageTextLength: 0,
        slidesWithText: 0,
        timeRange: { start: 0, end: 0 },
      };
    }
  }
}

export const slideCaptureService = new SlideCaptureService();
