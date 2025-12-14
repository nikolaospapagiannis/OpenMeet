/**
 * Filler Word Service
 * Detect, count, and remove filler words from transcripts
 *
 * Enterprise Feature: Clean transcripts and analyze speaking clarity
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { transcriptService } from './TranscriptService';

const prisma = new PrismaClient();

export interface FillerWordAnalysis {
  meetingId: string;
  totalFillerWords: number;
  fillerWordRate: number; // filler words per minute
  fillerWordsByType: Record<string, number>;
  fillerWordsBySpeaker: Record<string, FillerWordSpeakerStats>;
  topOffenders: string[];
  recommendations: string[];
  cleanedTranscript: string;
  originalWordCount: number;
  cleanedWordCount: number;
  reductionPercentage: number;
}

export interface FillerWordSpeakerStats {
  speaker: string;
  totalFillerWords: number;
  fillerWordRate: number; // per minute
  topFillerWords: Record<string, number>;
  talkTime: number; // seconds
  clarity: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface FillerWordOccurrence {
  word: string;
  timestamp: number;
  speaker: string;
  context: string;
  segment: string;
}

// Comprehensive list of filler words
const FILLER_WORDS = {
  basic: ['um', 'uh', 'ah', 'er', 'hmm', 'mm', 'mhm', 'uh-huh', 'mm-hmm'],
  conversational: ['like', 'you know', 'i mean', 'so', 'basically', 'actually', 'literally', 'right', 'yeah'],
  hesitation: ['well', 'kind of', 'sort of', 'i think', 'i guess', 'i suppose', 'maybe', 'probably'],
  intensifiers: ['very', 'really', 'just', 'quite', 'pretty', 'totally', 'absolutely'],
  transitional: ['anyway', 'anyways', 'anyhow', 'alright', 'okay', 'so yeah'],
};

const ALL_FILLER_WORDS = [
  ...FILLER_WORDS.basic,
  ...FILLER_WORDS.conversational,
  ...FILLER_WORDS.hesitation,
  ...FILLER_WORDS.intensifiers,
  ...FILLER_WORDS.transitional,
];

class FillerWordService {
  /**
   * Analyze filler words in a meeting
   */
  async analyzeMeeting(meetingId: string): Promise<FillerWordAnalysis> {
    try {
      logger.info('Starting filler word analysis', { meetingId });

      // Get meeting and transcript
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const transcriptRecord = await prisma.transcript.findFirst({
        where: { meetingId },
        orderBy: { createdAt: 'desc' },
      });

      if (!transcriptRecord || !transcriptRecord.mongodbId) {
        throw new Error('Transcript not found');
      }

      const transcript = await transcriptService.getTranscriptText(transcriptRecord.mongodbId);
      const segments = await transcriptService.getTranscriptSegments(transcriptRecord.mongodbId);

      // Analyze
      const fillerWordsByType = this.detectFillerWords(transcript);
      const fillerWordsBySpeaker = this.analyzeFillerWordsBySpeaker(segments);
      const totalFillerWords = Object.values(fillerWordsByType).reduce((sum, count) => sum + count, 0);

      const duration = meeting.durationSeconds || meeting.duration || 0;
      const fillerWordRate = duration > 0 ? (totalFillerWords / duration) * 60 : 0;

      const topOffenders = Object.entries(fillerWordsByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

      const cleanedTranscript = this.removeFillerWords(transcript);
      const originalWordCount = transcript.split(/\s+/).length;
      const cleanedWordCount = cleanedTranscript.split(/\s+/).length;
      const reductionPercentage = originalWordCount > 0
        ? ((originalWordCount - cleanedWordCount) / originalWordCount) * 100
        : 0;

      const recommendations = this.generateRecommendations(
        totalFillerWords,
        fillerWordRate,
        fillerWordsByType,
        fillerWordsBySpeaker
      );

      const result: FillerWordAnalysis = {
        meetingId,
        totalFillerWords,
        fillerWordRate: Math.round(fillerWordRate * 10) / 10,
        fillerWordsByType,
        fillerWordsBySpeaker,
        topOffenders,
        recommendations,
        cleanedTranscript,
        originalWordCount,
        cleanedWordCount,
        reductionPercentage: Math.round(reductionPercentage * 10) / 10,
      };

      // Store results
      await this.storeAnalysisResults(meetingId, transcriptRecord.id, result);

      logger.info('Filler word analysis completed', {
        meetingId,
        totalFillerWords,
        reductionPercentage,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing filler words', { error, meetingId });
      throw error;
    }
  }

  /**
   * Detect filler words in text
   */
  private detectFillerWords(text: string): Record<string, number> {
    const fillerCounts: Record<string, number> = {};
    const lowerText = text.toLowerCase();

    for (const filler of ALL_FILLER_WORDS) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        fillerCounts[filler] = matches.length;
      }
    }

    return fillerCounts;
  }

  /**
   * Analyze filler words by speaker
   */
  private analyzeFillerWordsBySpeaker(segments: any[]): Record<string, FillerWordSpeakerStats> {
    const speakerStats: Record<string, {
      fillerWords: Record<string, number>;
      talkTime: number;
      totalWords: number;
    }> = {};

    for (const segment of segments) {
      if (!speakerStats[segment.speaker]) {
        speakerStats[segment.speaker] = {
          fillerWords: {},
          talkTime: 0,
          totalWords: 0,
        };
      }

      const duration = (segment.endTime || segment.startTime + 3) - segment.startTime;
      speakerStats[segment.speaker].talkTime += duration;
      speakerStats[segment.speaker].totalWords += (segment.text || '').split(/\s+/).length;

      // Detect fillers in segment
      const lowerText = (segment.text || '').toLowerCase();
      for (const filler of ALL_FILLER_WORDS) {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          speakerStats[segment.speaker].fillerWords[filler] =
            (speakerStats[segment.speaker].fillerWords[filler] || 0) + matches.length;
        }
      }
    }

    // Convert to FillerWordSpeakerStats
    const result: Record<string, FillerWordSpeakerStats> = {};

    for (const [speaker, stats] of Object.entries(speakerStats)) {
      const totalFillerWords = Object.values(stats.fillerWords).reduce((sum, count) => sum + count, 0);
      const fillerWordRate = stats.talkTime > 0 ? (totalFillerWords / stats.talkTime) * 60 : 0;

      // Determine clarity
      let clarity: 'excellent' | 'good' | 'fair' | 'poor';
      const fillerPercentage = stats.totalWords > 0 ? (totalFillerWords / stats.totalWords) * 100 : 0;

      if (fillerPercentage < 2) {
        clarity = 'excellent';
      } else if (fillerPercentage < 5) {
        clarity = 'good';
      } else if (fillerPercentage < 10) {
        clarity = 'fair';
      } else {
        clarity = 'poor';
      }

      result[speaker] = {
        speaker,
        totalFillerWords,
        fillerWordRate: Math.round(fillerWordRate * 10) / 10,
        topFillerWords: stats.fillerWords,
        talkTime: Math.round(stats.talkTime),
        clarity,
      };
    }

    return result;
  }

  /**
   * Remove filler words from transcript
   */
  removeFillerWords(text: string): string {
    let cleaned = text;

    // Remove filler words while preserving sentence structure
    for (const filler of ALL_FILLER_WORDS) {
      // Match filler words with word boundaries
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Clean up spaces before punctuation
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');

    // Clean up sentence starts
    cleaned = cleaned.replace(/([.!?])\s+/g, '$1 ');

    return cleaned.trim();
  }

  /**
   * Generate cleaned transcript with speaker labels
   */
  async generateCleanedTranscript(meetingId: string): Promise<string> {
    try {
      const transcriptRecord = await prisma.transcript.findFirst({
        where: { meetingId },
        orderBy: { createdAt: 'desc' },
      });

      if (!transcriptRecord || !transcriptRecord.mongodbId) {
        throw new Error('Transcript not found');
      }

      const segments = await transcriptService.getTranscriptSegments(transcriptRecord.mongodbId);

      let cleanedTranscript = '';

      for (const segment of segments) {
        const cleanedText = this.removeFillerWords(segment.text || '');
        if (cleanedText.trim()) {
          const timestamp = this.formatTimestamp(segment.startTime);
          cleanedTranscript += `[${timestamp}] ${segment.speaker}: ${cleanedText}\n\n`;
        }
      }

      return cleanedTranscript;
    } catch (error) {
      logger.error('Error generating cleaned transcript', { error, meetingId });
      throw error;
    }
  }

  /**
   * Format timestamp (seconds to MM:SS)
   */
  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    totalFillerWords: number,
    fillerWordRate: number,
    byType: Record<string, number>,
    bySpeaker: Record<string, FillerWordSpeakerStats>
  ): string[] {
    const recommendations: string[] = [];

    // Overall rate
    if (fillerWordRate > 5) {
      recommendations.push('High filler word rate detected. Practice pausing instead of using filler words.');
    } else if (fillerWordRate > 3) {
      recommendations.push('Moderate filler word usage. Be mindful of common fillers like "um" and "like".');
    }

    // Most common fillers
    const sortedFillers = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (sortedFillers.length > 0) {
      const topFiller = sortedFillers[0];
      recommendations.push(`Most common filler: "${topFiller[0]}" (${topFiller[1]} times). Try to reduce usage of this word.`);
    }

    // Speaker-specific
    const poorClaritySpeakers = Object.values(bySpeaker).filter(s => s.clarity === 'poor');
    if (poorClaritySpeakers.length > 0) {
      recommendations.push(
        `${poorClaritySpeakers.length} speaker(s) have poor clarity. Consider coaching on reducing filler words.`
      );
    }

    // Type-specific
    const conversationalFillers = Object.entries(byType)
      .filter(([word]) => FILLER_WORDS.conversational.includes(word))
      .reduce((sum, [, count]) => sum + count, 0);

    if (conversationalFillers > totalFillerWords * 0.5) {
      recommendations.push('High use of conversational fillers (like, you know). Practice more formal speech patterns.');
    }

    // Positive feedback
    if (fillerWordRate < 2) {
      recommendations.push('Excellent clarity! Filler word usage is minimal.');
    }

    return recommendations;
  }

  /**
   * Store analysis results
   */
  private async storeAnalysisResults(
    meetingId: string,
    transcriptId: string,
    result: FillerWordAnalysis
  ): Promise<void> {
    try {
      // Store in transcript metadata
      await prisma.transcript.update({
        where: { id: transcriptId },
        data: {
          metadata: {
            fillerWordAnalysis: {
              totalFillerWords: result.totalFillerWords,
              fillerWordRate: result.fillerWordRate,
              reductionPercentage: result.reductionPercentage,
              topOffenders: result.topOffenders,
              analyzedAt: new Date().toISOString(),
            },
          },
        },
      });

      // Cleaned transcripts are generated on-demand via generateCleanedTranscript()
      // This approach reduces storage overhead and ensures the latest filler word list is always applied
    } catch (error) {
      logger.error('Error storing filler word analysis', { error });
    }
  }

  /**
   * Get filler word analysis
   */
  async getAnalysis(meetingId: string): Promise<FillerWordAnalysis | null> {
    try {
      const transcriptRecord = await prisma.transcript.findFirst({
        where: { meetingId },
        orderBy: { createdAt: 'desc' },
      });

      if (!transcriptRecord?.metadata) {
        return null;
      }

      const metadata = transcriptRecord.metadata as any;
      return metadata.fillerWordAnalysis || null;
    } catch (error) {
      logger.error('Error getting filler word analysis', { error });
      return null;
    }
  }

  /**
   * Export cleaned transcript to file
   */
  async exportCleanedTranscript(
    meetingId: string,
    format: 'txt' | 'srt' | 'vtt' = 'txt'
  ): Promise<string> {
    try {
      const cleanedTranscript = await this.generateCleanedTranscript(meetingId);

      switch (format) {
        case 'txt':
          return cleanedTranscript;

        case 'srt':
          return this.convertToSRT(meetingId);

        case 'vtt':
          return this.convertToVTT(meetingId);

        default:
          return cleanedTranscript;
      }
    } catch (error) {
      logger.error('Error exporting cleaned transcript', { error, meetingId, format });
      throw error;
    }
  }

  /**
   * Convert to SRT format
   */
  private async convertToSRT(meetingId: string): Promise<string> {
    const transcriptRecord = await prisma.transcript.findFirst({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    if (!transcriptRecord || !transcriptRecord.mongodbId) {
      throw new Error('Transcript not found');
    }

    const segments = await transcriptService.getTranscriptSegments(transcriptRecord.mongodbId);
    let srt = '';
    let index = 1;

    for (const segment of segments) {
      const cleanedText = this.removeFillerWords(segment.text || '');
      if (!cleanedText.trim()) continue;

      const startTime = this.formatSRTTimestamp(segment.startTime);
      const endTime = this.formatSRTTimestamp(segment.endTime || segment.startTime + 3);

      srt += `${index}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${segment.speaker}: ${cleanedText}\n\n`;

      index++;
    }

    return srt;
  }

  /**
   * Convert to VTT format
   */
  private async convertToVTT(meetingId: string): Promise<string> {
    const srt = await this.convertToSRT(meetingId);
    return 'WEBVTT\n\n' + srt;
  }

  /**
   * Format timestamp for SRT (HH:MM:SS,mmm)
   */
  private formatSRTTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  }
}

export const fillerWordService = new FillerWordService();
