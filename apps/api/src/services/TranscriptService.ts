/**
 * PostgreSQL Transcript Service
 * Handles storage and retrieval of large transcript content in PostgreSQL via Prisma
 * Uses pgvector for semantic search capabilities
 */

import { PrismaClient, TranscriptContent, Prisma } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('TranscriptService');

// Transcript Segment Interface
export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  speakerId?: string;
  confidence?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

// Speaker Information Interface
export interface SpeakerInfo {
  speakerId: string;
  name: string;
  talkTime: number;
}

// Transcript Data Interface for input
export interface TranscriptData {
  transcriptId?: string; // Optional - if provided, links to existing Transcript
  meetingId: string;
  organizationId: string;
  segments: TranscriptSegment[];
  language?: string;
  metadata?: Record<string, any>;
}

// Full Transcript Interface
export interface ITranscript {
  id: string;
  meetingId: string;
  organizationId: string;
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
  wordCount: number;
  duration: number;
  speakerCount: number;
  speakers: SpeakerInfo[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PostgreSQL Transcript Service Class
 */
export class TranscriptService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Log Prisma events
    this.prisma.$on('query' as never, (e: any) => {
      logger.debug('Prisma query', {
        query: e.query,
        params: e.params,
        duration: e.duration,
      });
    });

    this.prisma.$on('error' as never, (e: any) => {
      logger.error('Prisma error', { error: e });
    });

    this.prisma.$on('warn' as never, (e: any) => {
      logger.warn('Prisma warning', { warning: e });
    });
  }

  /**
   * Convert Prisma TranscriptContent to ITranscript interface
   */
  private toTranscriptInterface(content: TranscriptContent): ITranscript {
    return {
      id: content.id,
      meetingId: content.meetingId,
      organizationId: content.organizationId,
      segments: content.segments as unknown as TranscriptSegment[],
      fullText: content.fullText,
      language: content.language,
      wordCount: content.wordCount,
      duration: content.duration,
      speakerCount: content.speakerCount,
      speakers: content.speakers as unknown as SpeakerInfo[],
      metadata: content.metadata as Record<string, any>,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }

  /**
   * Calculate derived fields from segments
   */
  private calculateDerivedFields(segments: TranscriptSegment[]) {
    const fullText = segments.map(s => s.text).join(' ');
    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
    const duration = segments.length > 0
      ? segments[segments.length - 1].endTime
      : 0;

    // Extract speaker information
    const speakerMap = new Map<string, { name: string; talkTime: number }>();
    segments.forEach(segment => {
      if (segment.speakerId && segment.speaker) {
        const existing = speakerMap.get(segment.speakerId);
        const talkTime = segment.endTime - segment.startTime;

        if (existing) {
          existing.talkTime += talkTime;
        } else {
          speakerMap.set(segment.speakerId, {
            name: segment.speaker,
            talkTime,
          });
        }
      }
    });

    const speakers: SpeakerInfo[] = Array.from(speakerMap.entries()).map(([speakerId, data]) => ({
      speakerId,
      name: data.name,
      talkTime: data.talkTime,
    }));

    return {
      fullText,
      wordCount,
      duration,
      speakerCount: speakers.length,
      speakers,
    };
  }

  /**
   * Store transcript in PostgreSQL
   */
  async storeTranscript(data: TranscriptData): Promise<string> {
    try {
      // Calculate derived fields
      const derived = this.calculateDerivedFields(data.segments);

      // Use transaction to create both Transcript and TranscriptContent
      const result = await this.prisma.$transaction(async (tx) => {
        // If transcriptId is provided, use it; otherwise create a new Transcript
        let transcriptId = data.transcriptId;

        if (!transcriptId) {
          // Create parent Transcript record first
          const transcript = await tx.transcript.create({
            data: {
              meetingId: data.meetingId,
              language: data.language || 'en',
              wordCount: derived.wordCount,
              isFinal: true,
              metadata: (data.metadata || {}) as Prisma.JsonObject,
            },
          });
          transcriptId = transcript.id;
        }

        // Create TranscriptContent with the transcript relation
        const transcriptContent = await tx.transcriptContent.create({
          data: {
            transcriptId: transcriptId,
            meetingId: data.meetingId,
            organizationId: data.organizationId,
            segments: data.segments as unknown as Prisma.JsonArray,
            fullText: derived.fullText,
            language: data.language || 'en',
            wordCount: derived.wordCount,
            duration: derived.duration,
            speakerCount: derived.speakerCount,
            speakers: derived.speakers as unknown as Prisma.JsonArray,
            metadata: (data.metadata || {}) as Prisma.JsonObject,
          },
        });

        return transcriptContent;
      });

      logger.info('Transcript stored in PostgreSQL', {
        transcriptId: result.id,
        meetingId: data.meetingId,
        wordCount: derived.wordCount,
        duration: derived.duration,
      });

      return result.id;
    } catch (error) {
      logger.error('Error storing transcript in PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Get transcript by ID
   */
  async getTranscript(transcriptId: string): Promise<ITranscript | null> {
    try {
      const transcript = await this.prisma.transcriptContent.findUnique({
        where: { id: transcriptId },
      });

      if (!transcript) {
        logger.warn('Transcript not found', { transcriptId });
        return null;
      }

      return this.toTranscriptInterface(transcript);
    } catch (error) {
      logger.error('Error fetching transcript from PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Get transcript full text by ID
   */
  async getTranscriptText(transcriptId: string): Promise<string> {
    try {
      const transcript = await this.prisma.transcriptContent.findUnique({
        where: { id: transcriptId },
        select: { fullText: true },
      });

      if (!transcript) {
        throw new Error(`Transcript not found: ${transcriptId}`);
      }

      return transcript.fullText;
    } catch (error) {
      logger.error('Error fetching transcript text from PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Get transcript segments by ID
   */
  async getTranscriptSegments(transcriptId: string): Promise<TranscriptSegment[]> {
    try {
      const transcript = await this.prisma.transcriptContent.findUnique({
        where: { id: transcriptId },
        select: { segments: true },
      });

      if (!transcript) {
        throw new Error(`Transcript not found: ${transcriptId}`);
      }

      return transcript.segments as unknown as TranscriptSegment[];
    } catch (error) {
      logger.error('Error fetching transcript segments from PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Get transcript by meeting ID
   */
  async getTranscriptByMeetingId(meetingId: string, organizationId: string): Promise<ITranscript | null> {
    try {
      const transcript = await this.prisma.transcriptContent.findFirst({
        where: {
          meetingId,
          organizationId,
        },
        orderBy: {
          createdAt: 'desc', // Get latest
        },
      });

      if (!transcript) {
        return null;
      }

      return this.toTranscriptInterface(transcript);
    } catch (error) {
      logger.error('Error fetching transcript by meeting ID:', error);
      throw error;
    }
  }

  /**
   * Update transcript segments
   */
  async updateTranscriptSegments(
    transcriptId: string,
    segments: TranscriptSegment[]
  ): Promise<void> {
    try {
      // Recalculate derived fields
      const derived = this.calculateDerivedFields(segments);

      await this.prisma.transcriptContent.update({
        where: { id: transcriptId },
        data: {
          segments: segments as unknown as Prisma.JsonArray,
          fullText: derived.fullText,
          wordCount: derived.wordCount,
          duration: derived.duration,
          speakerCount: derived.speakerCount,
          speakers: derived.speakers as unknown as Prisma.JsonArray,
        },
      });

      logger.info('Transcript updated in PostgreSQL', { transcriptId });
    } catch (error) {
      logger.error('Error updating transcript in PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Search transcripts by text using PostgreSQL full-text search
   */
  async searchTranscripts(
    organizationId: string,
    searchQuery: string,
    limit: number = 20
  ): Promise<Array<{ meetingId: string; segments: TranscriptSegment[] }>> {
    try {
      // Escape special characters for PostgreSQL full-text search
      const sanitizedQuery = searchQuery.replace(/['"\\]/g, '');

      // Use raw SQL for full-text search with PostgreSQL's to_tsvector and to_tsquery
      const results = await this.prisma.$queryRaw<Array<{
        id: string;
        meetingId: string;
        segments: Prisma.JsonValue;
        rank: number;
      }>>`
        SELECT
          id,
          "meetingId",
          segments,
          ts_rank(to_tsvector('english', "fullText"), to_tsquery('english', ${sanitizedQuery})) as rank
        FROM "TranscriptContent"
        WHERE
          "organizationId" = ${organizationId}
          AND to_tsvector('english', "fullText") @@ to_tsquery('english', ${sanitizedQuery})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

      return results.map(r => ({
        meetingId: r.meetingId,
        segments: r.segments as unknown as TranscriptSegment[],
      }));
    } catch (error) {
      logger.error('Error searching transcripts in PostgreSQL:', error);

      // Fallback to simple LIKE search if full-text search fails
      try {
        logger.info('Falling back to LIKE search');
        const results = await this.prisma.transcriptContent.findMany({
          where: {
            organizationId,
            fullText: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          select: {
            meetingId: true,
            segments: true,
          },
          take: limit,
        });

        return results.map(r => ({
          meetingId: r.meetingId,
          segments: r.segments as unknown as TranscriptSegment[],
        }));
      } catch (fallbackError) {
        logger.error('Fallback search also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Delete transcript
   */
  async deleteTranscript(transcriptId: string): Promise<void> {
    try {
      await this.prisma.transcriptContent.delete({
        where: { id: transcriptId },
      });

      logger.info('Transcript deleted from PostgreSQL', { transcriptId });
    } catch (error) {
      logger.error('Error deleting transcript from PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info('PostgreSQL disconnected');
  }
}

// Export singleton instance
export const transcriptService = new TranscriptService();

// Default export
export default transcriptService;