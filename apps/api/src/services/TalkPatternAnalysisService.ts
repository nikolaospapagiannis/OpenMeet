/**
 * Talk Pattern Analysis Service
 * Analyze speaking patterns, pace, interruptions, monologues, questions, and silence
 *
 * Enterprise Feature: Advanced conversation analytics for coaching and insights
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { transcriptService } from './TranscriptService';

const prisma = new PrismaClient();

export interface TalkPatternAnalysis {
  meetingId: string;
  overallMetrics: OverallMetrics;
  speakerMetrics: SpeakerMetrics[];
  paceAnalysis: PaceAnalysis;
  interruptions: Interruption[];
  monologues: Monologue[];
  questions: QuestionAnalysis;
  silences: SilenceAnalysis;
  recommendations: string[];
  analysisTimestamp: Date;
}

export interface OverallMetrics {
  totalDuration: number; // seconds
  totalSpeakers: number;
  talkToListenRatio: number;
  averageSpeakingPace: number; // words per minute
  totalInterruptions: number;
  totalMonologues: number;
  totalQuestions: number;
  silencePercentage: number;
}

export interface SpeakerMetrics {
  speaker: string;
  talkTime: number; // seconds
  talkTimePercentage: number;
  wordCount: number;
  averagePace: number; // words per minute
  turnCount: number;
  averageTurnDuration: number; // seconds
  longestTurn: number; // seconds
  interruptionsMade: number;
  interruptionsReceived: number;
  questionsAsked: number;
  monologueCount: number;
}

export interface PaceAnalysis {
  overallPace: number; // words per minute
  paceBySegment: PaceSegment[];
  paceVariation: 'consistent' | 'variable' | 'erratic';
  fastSegments: PaceSegment[]; // pace > 160 wpm
  slowSegments: PaceSegment[]; // pace < 120 wpm
  recommendations: string[];
}

export interface PaceSegment {
  startTime: number;
  endTime: number;
  speaker: string;
  pace: number; // words per minute
  text: string;
}

export interface Interruption {
  id: string;
  timestamp: number;
  interrupter: string;
  interrupted: string;
  context: string;
  gapTime: number; // seconds between speakers (negative for overlaps)
  type: 'overlap' | 'quick_takeover' | 'normal';
}

export interface Monologue {
  id: string;
  speaker: string;
  startTime: number;
  endTime: number;
  duration: number; // seconds
  wordCount: number;
  text: string;
  severity: 'excessive' | 'moderate' | 'acceptable';
  impact: string;
}

export interface QuestionAnalysis {
  totalQuestions: number;
  questionRate: number; // questions per minute
  questionsByType: {
    openEnded: number;
    closed: number;
    rhetorical: number;
  };
  questionsBySpeaker: Record<string, number>;
  questionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  examples: QuestionExample[];
}

export interface QuestionExample {
  question: string;
  speaker: string;
  timestamp: number;
  type: 'open' | 'closed' | 'rhetorical';
  quality: 'high' | 'medium' | 'low';
}

export interface SilenceAnalysis {
  totalSilenceDuration: number; // seconds
  silencePercentage: number;
  silenceCount: number;
  averageSilenceDuration: number; // seconds
  longestSilence: number; // seconds
  silenceSegments: SilenceSegment[];
  interpretation: string;
}

export interface SilenceSegment {
  startTime: number;
  endTime: number;
  duration: number; // seconds
  context: 'before_response' | 'mid_conversation' | 'awkward_pause' | 'natural';
}

class TalkPatternAnalysisService {
  /**
   * Analyze talk patterns for a meeting
   */
  async analyzeMeeting(meetingId: string): Promise<TalkPatternAnalysis> {
    try {
      logger.info('Starting talk pattern analysis', { meetingId });

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

      const segments = await transcriptService.getTranscriptSegments(transcriptRecord.mongodbId);

      if (!segments || segments.length === 0) {
        throw new Error('No transcript segments found');
      }

      // Perform analysis
      const speakerMetrics = this.analyzeSpeakerMetrics(segments);
      const paceAnalysis = this.analyzePace(segments);
      const interruptions = this.detectInterruptions(segments);
      const monologues = this.detectMonologues(segments);
      const questions = this.analyzeQuestions(segments);
      const silences = this.analyzeSilences(segments);
      const overallMetrics = this.calculateOverallMetrics(segments, speakerMetrics, interruptions, monologues, questions, silences);
      const recommendations = this.generateRecommendations(overallMetrics, speakerMetrics, paceAnalysis, interruptions, monologues, questions);

      const result: TalkPatternAnalysis = {
        meetingId,
        overallMetrics,
        speakerMetrics,
        paceAnalysis,
        interruptions,
        monologues,
        questions,
        silences,
        recommendations,
        analysisTimestamp: new Date(),
      };

      // Store results
      await this.storeAnalysisResults(meetingId, result);

      logger.info('Talk pattern analysis completed', { meetingId });
      return result;
    } catch (error) {
      logger.error('Error analyzing talk patterns', { error, meetingId });
      throw error;
    }
  }

  /**
   * Analyze speaker metrics
   */
  private analyzeSpeakerMetrics(segments: any[]): SpeakerMetrics[] {
    const speakerData: Record<string, {
      talkTime: number;
      wordCount: number;
      turns: number[];
      interruptionsMade: number;
      interruptionsReceived: number;
      questionsAsked: number;
      monologues: number;
    }> = {};

    // Initialize speaker data
    for (const segment of segments) {
      if (!speakerData[segment.speaker]) {
        speakerData[segment.speaker] = {
          talkTime: 0,
          wordCount: 0,
          turns: [],
          interruptionsMade: 0,
          interruptionsReceived: 0,
          questionsAsked: 0,
          monologues: 0,
        };
      }

      const duration = (segment.endTime || segment.startTime + 3) - segment.startTime;
      speakerData[segment.speaker].talkTime += duration;
      speakerData[segment.speaker].wordCount += (segment.text || '').split(/\s+/).length;
      speakerData[segment.speaker].turns.push(duration);

      if (segment.text && segment.text.includes('?')) {
        speakerData[segment.speaker].questionsAsked++;
      }
    }

    const totalTalkTime = Object.values(speakerData).reduce((sum, s) => sum + s.talkTime, 0);

    return Object.entries(speakerData).map(([speaker, data]) => {
      const avgPace = data.talkTime > 0 ? (data.wordCount / data.talkTime) * 60 : 0;
      const avgTurnDuration = data.turns.length > 0 ? data.turns.reduce((a, b) => a + b, 0) / data.turns.length : 0;
      const longestTurn = data.turns.length > 0 ? Math.max(...data.turns) : 0;

      return {
        speaker,
        talkTime: Math.round(data.talkTime),
        talkTimePercentage: totalTalkTime > 0 ? Math.round((data.talkTime / totalTalkTime) * 100) : 0,
        wordCount: data.wordCount,
        averagePace: Math.round(avgPace),
        turnCount: data.turns.length,
        averageTurnDuration: Math.round(avgTurnDuration * 10) / 10,
        longestTurn: Math.round(longestTurn),
        interruptionsMade: data.interruptionsMade,
        interruptionsReceived: data.interruptionsReceived,
        questionsAsked: data.questionsAsked,
        monologueCount: data.monologues,
      };
    });
  }

  /**
   * Analyze speaking pace
   */
  private analyzePace(segments: any[]): PaceAnalysis {
    const paceSegments: PaceSegment[] = [];

    for (const segment of segments) {
      const duration = (segment.endTime || segment.startTime + 3) - segment.startTime;
      const wordCount = (segment.text || '').split(/\s+/).length;
      const pace = duration > 0 ? (wordCount / duration) * 60 : 0;

      paceSegments.push({
        startTime: segment.startTime,
        endTime: segment.endTime || segment.startTime + 3,
        speaker: segment.speaker,
        pace: Math.round(pace),
        text: segment.text.substring(0, 100),
      });
    }

    const overallPace = paceSegments.length > 0
      ? Math.round(paceSegments.reduce((sum, s) => sum + s.pace, 0) / paceSegments.length)
      : 0;

    const fastSegments = paceSegments.filter(s => s.pace > 160);
    const slowSegments = paceSegments.filter(s => s.pace < 120 && s.pace > 0);

    // Determine variation
    const stdDev = this.calculateStandardDeviation(paceSegments.map(s => s.pace));
    let paceVariation: 'consistent' | 'variable' | 'erratic';
    if (stdDev < 20) {
      paceVariation = 'consistent';
    } else if (stdDev < 40) {
      paceVariation = 'variable';
    } else {
      paceVariation = 'erratic';
    }

    const recommendations: string[] = [];
    if (overallPace > 160) {
      recommendations.push('Overall speaking pace is fast. Consider slowing down for better comprehension.');
    } else if (overallPace < 120) {
      recommendations.push('Overall speaking pace is slow. Consider increasing energy and pace.');
    }

    if (fastSegments.length > paceSegments.length * 0.3) {
      recommendations.push('Frequent fast-paced segments detected. Ensure clarity isn\'t sacrificed for speed.');
    }

    return {
      overallPace,
      paceBySegment: paceSegments,
      paceVariation,
      fastSegments: fastSegments.slice(0, 5),
      slowSegments: slowSegments.slice(0, 5),
      recommendations,
    };
  }

  /**
   * Detect interruptions
   */
  private detectInterruptions(segments: any[]): Interruption[] {
    const interruptions: Interruption[] = [];

    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1];
      const curr = segments[i];

      if (prev.speaker !== curr.speaker) {
        const gapTime = curr.startTime - (prev.endTime || prev.startTime + 3);

        // Interruption detection: gap < 0.5 seconds
        if (gapTime < 0.5) {
          let type: 'overlap' | 'quick_takeover' | 'normal';
          if (gapTime < 0) {
            type = 'overlap';
          } else if (gapTime < 0.3) {
            type = 'quick_takeover';
          } else {
            type = 'normal';
          }

          interruptions.push({
            id: `int_${i}`,
            timestamp: curr.startTime,
            interrupter: curr.speaker,
            interrupted: prev.speaker,
            context: `${prev.text.substring(prev.text.length - 50)} -> ${curr.text.substring(0, 50)}`,
            gapTime: Math.round(gapTime * 1000) / 1000,
            type,
          });
        }
      }
    }

    return interruptions;
  }

  /**
   * Detect monologues
   */
  private detectMonologues(segments: any[]): Monologue[] {
    const monologues: Monologue[] = [];
    let currentMonologue: any = null;

    for (const segment of segments) {
      if (!currentMonologue || currentMonologue.speaker !== segment.speaker) {
        // Save previous monologue if it exists and is long enough
        if (currentMonologue && currentMonologue.duration > 30) {
          let severity: 'excessive' | 'moderate' | 'acceptable';
          if (currentMonologue.duration > 120) {
            severity = 'excessive';
          } else if (currentMonologue.duration > 60) {
            severity = 'moderate';
          } else {
            severity = 'acceptable';
          }

          monologues.push({
            id: `mono_${monologues.length}`,
            speaker: currentMonologue.speaker,
            startTime: currentMonologue.startTime,
            endTime: currentMonologue.endTime,
            duration: currentMonologue.duration,
            wordCount: currentMonologue.wordCount,
            text: currentMonologue.text.substring(0, 200),
            severity,
            impact: severity === 'excessive' ? 'May lose audience engagement' : 'Acceptable for detailed explanations',
          });
        }

        // Start new monologue
        currentMonologue = {
          speaker: segment.speaker,
          startTime: segment.startTime,
          endTime: segment.endTime || segment.startTime + 3,
          duration: (segment.endTime || segment.startTime + 3) - segment.startTime,
          wordCount: (segment.text || '').split(/\s+/).length,
          text: segment.text,
        };
      } else {
        // Continue monologue
        currentMonologue.endTime = segment.endTime || segment.startTime + 3;
        currentMonologue.duration = currentMonologue.endTime - currentMonologue.startTime;
        currentMonologue.wordCount += (segment.text || '').split(/\s+/).length;
        currentMonologue.text += ' ' + segment.text;
      }
    }

    // Handle last monologue
    if (currentMonologue && currentMonologue.duration > 30) {
      let severity: 'excessive' | 'moderate' | 'acceptable';
      if (currentMonologue.duration > 120) {
        severity = 'excessive';
      } else if (currentMonologue.duration > 60) {
        severity = 'moderate';
      } else {
        severity = 'acceptable';
      }

      monologues.push({
        id: `mono_${monologues.length}`,
        speaker: currentMonologue.speaker,
        startTime: currentMonologue.startTime,
        endTime: currentMonologue.endTime,
        duration: currentMonologue.duration,
        wordCount: currentMonologue.wordCount,
        text: currentMonologue.text.substring(0, 200),
        severity,
        impact: severity === 'excessive' ? 'May lose audience engagement' : 'Acceptable for detailed explanations',
      });
    }

    return monologues;
  }

  /**
   * Analyze questions
   */
  private analyzeQuestions(segments: any[]): QuestionAnalysis {
    const questionExamples: QuestionExample[] = [];
    const questionsBySpeaker: Record<string, number> = {};
    let openEnded = 0;
    let closed = 0;
    let rhetorical = 0;

    const totalDuration = segments.length > 0
      ? (segments[segments.length - 1].endTime || segments[segments.length - 1].startTime) - segments[0].startTime
      : 0;

    for (const segment of segments) {
      const text = segment.text || '';
      const questions = text.split(/[.!]/).filter((s: string) => s.trim().endsWith('?'));

      for (const question of questions) {
        questionsBySpeaker[segment.speaker] = (questionsBySpeaker[segment.speaker] || 0) + 1;

        // Classify question type
        const lowerQ = question.toLowerCase();
        let type: 'open' | 'closed' | 'rhetorical';
        let quality: 'high' | 'medium' | 'low';

        if (lowerQ.match(/\b(how|why|what.*think|tell me|describe|explain|walk me through)\b/)) {
          type = 'open';
          openEnded++;
          quality = 'high';
        } else if (lowerQ.match(/\b(is|are|do|does|did|can|could|would|will|should)\b/)) {
          type = 'closed';
          closed++;
          quality = 'medium';
        } else {
          type = 'rhetorical';
          rhetorical++;
          quality = 'low';
        }

        if (questionExamples.length < 10) {
          questionExamples.push({
            question: question.trim(),
            speaker: segment.speaker,
            timestamp: segment.startTime,
            type,
            quality,
          });
        }
      }
    }

    const totalQuestions = openEnded + closed + rhetorical;
    const questionRate = totalDuration > 0 ? (totalQuestions / totalDuration) * 60 : 0;

    let questionQuality: 'excellent' | 'good' | 'fair' | 'poor';
    const openEndedRatio = totalQuestions > 0 ? openEnded / totalQuestions : 0;
    if (openEndedRatio > 0.6) {
      questionQuality = 'excellent';
    } else if (openEndedRatio > 0.4) {
      questionQuality = 'good';
    } else if (openEndedRatio > 0.2) {
      questionQuality = 'fair';
    } else {
      questionQuality = 'poor';
    }

    return {
      totalQuestions,
      questionRate: Math.round(questionRate * 10) / 10,
      questionsByType: {
        openEnded,
        closed,
        rhetorical,
      },
      questionsBySpeaker,
      questionQuality,
      examples: questionExamples,
    };
  }

  /**
   * Analyze silences
   */
  private analyzeSilences(segments: any[]): SilenceAnalysis {
    const silenceSegments: SilenceSegment[] = [];
    let totalSilence = 0;

    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1];
      const curr = segments[i];
      const gap = curr.startTime - (prev.endTime || prev.startTime + 3);

      // Silence detection: gap > 2 seconds
      if (gap > 2) {
        let context: 'before_response' | 'mid_conversation' | 'awkward_pause' | 'natural';
        if (gap > 5) {
          context = 'awkward_pause';
        } else if (prev.speaker !== curr.speaker) {
          context = 'before_response';
        } else {
          context = 'natural';
        }

        silenceSegments.push({
          startTime: prev.endTime || prev.startTime + 3,
          endTime: curr.startTime,
          duration: gap,
          context,
        });

        totalSilence += gap;
      }
    }

    const meetingDuration = segments.length > 0
      ? (segments[segments.length - 1].endTime || segments[segments.length - 1].startTime) - segments[0].startTime
      : 0;

    const silencePercentage = meetingDuration > 0 ? (totalSilence / meetingDuration) * 100 : 0;
    const avgSilence = silenceSegments.length > 0 ? totalSilence / silenceSegments.length : 0;
    const longestSilence = silenceSegments.length > 0 ? Math.max(...silenceSegments.map(s => s.duration)) : 0;

    let interpretation = '';
    if (silencePercentage > 20) {
      interpretation = 'High silence percentage may indicate disengagement or technical issues.';
    } else if (silencePercentage > 10) {
      interpretation = 'Moderate silence is normal for thoughtful conversations.';
    } else {
      interpretation = 'Low silence indicates high engagement and active discussion.';
    }

    return {
      totalSilenceDuration: Math.round(totalSilence),
      silencePercentage: Math.round(silencePercentage * 10) / 10,
      silenceCount: silenceSegments.length,
      averageSilenceDuration: Math.round(avgSilence * 10) / 10,
      longestSilence: Math.round(longestSilence * 10) / 10,
      silenceSegments: silenceSegments.slice(0, 10),
      interpretation,
    };
  }

  /**
   * Calculate overall metrics
   */
  private calculateOverallMetrics(
    segments: any[],
    speakerMetrics: SpeakerMetrics[],
    interruptions: Interruption[],
    monologues: Monologue[],
    questions: QuestionAnalysis,
    silences: SilenceAnalysis
  ): OverallMetrics {
    const totalDuration = segments.length > 0
      ? (segments[segments.length - 1].endTime || segments[segments.length - 1].startTime) - segments[0].startTime
      : 0;

    const totalSpeakers = speakerMetrics.length;
    const totalWords = speakerMetrics.reduce((sum, s) => sum + s.wordCount, 0);
    const avgPace = totalDuration > 0 ? (totalWords / totalDuration) * 60 : 0;

    // Calculate talk-to-listen ratio (assuming first speaker is main presenter)
    const sortedSpeakers = [...speakerMetrics].sort((a, b) => b.talkTime - a.talkTime);
    const mainSpeakerTime = sortedSpeakers[0]?.talkTime || 0;
    const otherSpeakersTime = sortedSpeakers.slice(1).reduce((sum, s) => sum + s.talkTime, 0);
    const talkToListenRatio = otherSpeakersTime > 0 ? mainSpeakerTime / otherSpeakersTime : 0;

    return {
      totalDuration: Math.round(totalDuration),
      totalSpeakers,
      talkToListenRatio: Math.round(talkToListenRatio * 100) / 100,
      averageSpeakingPace: Math.round(avgPace),
      totalInterruptions: interruptions.length,
      totalMonologues: monologues.filter(m => m.severity !== 'acceptable').length,
      totalQuestions: questions.totalQuestions,
      silencePercentage: silences.silencePercentage,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    overall: OverallMetrics,
    speakers: SpeakerMetrics[],
    pace: PaceAnalysis,
    interruptions: Interruption[],
    monologues: Monologue[],
    questions: QuestionAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Talk-to-listen ratio
    if (overall.talkToListenRatio > 1.5) {
      recommendations.push('Talk-to-listen ratio is high. Allow more time for others to speak.');
    } else if (overall.talkToListenRatio < 0.5) {
      recommendations.push('Talk-to-listen ratio is low. Consider being more active in the conversation.');
    }

    // Interruptions
    if (overall.totalInterruptions > 10) {
      recommendations.push('High number of interruptions detected. Practice active listening and wait for pauses.');
    }

    // Monologues
    if (overall.totalMonologues > 3) {
      recommendations.push('Multiple long monologues detected. Break down information into smaller chunks and check for understanding.');
    }

    // Questions
    if (questions.totalQuestions < 5) {
      recommendations.push('Low question count. Ask more questions to engage participants and gather information.');
    }

    if (questions.questionQuality === 'poor' || questions.questionQuality === 'fair') {
      recommendations.push('Focus on asking more open-ended questions to encourage detailed responses.');
    }

    // Pace
    if (pace.recommendations.length > 0) {
      recommendations.push(...pace.recommendations);
    }

    // Silence
    if (overall.silencePercentage > 15) {
      recommendations.push('Significant silence detected. Ensure all participants are engaged and address any technical issues.');
    }

    return recommendations;
  }

  /**
   * Store analysis results
   */
  private async storeAnalysisResults(meetingId: string, result: TalkPatternAnalysis): Promise<void> {
    try {
      await prisma.meetingAnalytics.upsert({
        where: { meetingId },
        update: {
          interruptionCount: result.overallMetrics.totalInterruptions,
          questionCount: result.overallMetrics.totalQuestions,
          monologueCount: result.overallMetrics.totalMonologues,
          paceWpmAverage: result.overallMetrics.averageSpeakingPace,
          metadata: {
            talkPatternAnalysis: result,
          } as any,
        },
        create: {
          meetingId,
          interruptionCount: result.overallMetrics.totalInterruptions,
          questionCount: result.overallMetrics.totalQuestions,
          monologueCount: result.overallMetrics.totalMonologues,
          paceWpmAverage: result.overallMetrics.averageSpeakingPace,
          metadata: {
            talkPatternAnalysis: result,
          } as any,
        },
      });
    } catch (error) {
      logger.error('Error storing talk pattern analysis', { error });
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Get analysis results
   */
  async getAnalysisResults(meetingId: string): Promise<TalkPatternAnalysis | null> {
    try {
      const analytics = await prisma.meetingAnalytics.findUnique({
        where: { meetingId },
      });

      if (!analytics?.metadata) {
        return null;
      }

      const metadata = analytics.metadata as any;
      return metadata.talkPatternAnalysis || null;
    } catch (error) {
      logger.error('Error getting talk pattern analysis', { error });
      return null;
    }
  }
}

export const talkPatternAnalysisService = new TalkPatternAnalysisService();
