/**
 * Video Intelligence Service
 *
 * Implements GAP #3: Advanced Video Intelligence & Replay
 * - Smart video clips (AI-generated highlight reels)
 * - Topic-based navigation
 * - Key moment detection
 * - Emotional tone analysis
 * - Screen share detection and analysis
 *
 * Competitive Feature: Matches Grain's video intelligence ($39/month)
 * Our advantage: Integrated with full meeting platform
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { transcriptService } from './TranscriptService';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface VideoClip {
  id: string;
  transcriptId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  category: 'action_item' | 'decision' | 'objection' | 'insight' | 'question' | 'highlight';
  keyPhrases: string[];
  participants: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  importance: number; // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface VideoMoment {
  timestamp: number;
  type: 'topic_change' | 'screen_share' | 'question' | 'action_item' | 'objection' | 'excitement';
  description: string;
  importance: number;
  participants?: string[];
}

export interface EmotionalTone {
  timestamp: number;
  speaker: string;
  emotion: 'excited' | 'concerned' | 'confused' | 'agreeing' | 'neutral' | 'frustrated';
  confidence: number;
  triggerPhrase: string;
}

class VideoIntelligenceService {
  /**
   * Generate smart video clips from a transcript
   * Automatically identifies and extracts key moments
   */
  async generateSmartClips(transcriptId: string, userId: string): Promise<VideoClip[]> {
    try {
      logger.info('Generating smart clips', { transcriptId, userId });

      // Fetch transcript segments
      const segments = await transcriptService.getTranscriptSegments(transcriptId);
      const transcriptText = await transcriptService.getTranscriptText(transcriptId);

      if (!segments || segments.length === 0) {
        throw new Error('No transcript segments found');
      }

      // Use GPT-4 to identify key moments
      const clipsAnalysis = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a video intelligence AI that identifies key moments in meeting transcripts.
Analyze the transcript and identify 5-10 important clips that would be valuable to save and share.

For each clip, identify:
- Start time and end time (in seconds)
- Category: action_item, decision, objection, insight, question, or highlight
- Title (concise, 5-7 words)
- Description (one sentence)
- Key phrases (2-4 important phrases from that segment)
- Participants (speaker names)
- Sentiment: positive, neutral, or negative
- Importance (0-100 score)

Return valid JSON array of clips.`,
          },
          {
            role: 'user',
            content: `Transcript:\n${transcriptText}\n\nSegments with timestamps:\n${JSON.stringify(segments.slice(0, 200), null, 2)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const response = JSON.parse(clipsAnalysis.choices[0]?.message?.content || '{"clips":[]}');
      const clips: VideoClip[] = [];

      // Get meeting record
      const meeting = await prisma.meeting.findFirst({
        where: {
          transcripts: {
            some: { id: transcriptId }
          }
        },
        include: { recordings: true },
      });

      // Process each identified clip
      for (const clip of response.clips || []) {
        const clipId = `clip_${transcriptId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const videoClip: VideoClip = {
          id: clipId,
          transcriptId,
          title: clip.title,
          description: clip.description,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.endTime - clip.startTime,
          category: clip.category,
          keyPhrases: clip.keyPhrases || [],
          participants: clip.participants || [],
          sentiment: clip.sentiment,
          importance: clip.importance,
          createdAt: new Date(),
        };

        // If we have recording URL, generate clip-specific URL
        if (meeting?.recordings?.[0]?.fileUrl) {
          videoClip.videoUrl = await this.generateClipUrl(
            meeting.recordings[0].fileUrl,
            clip.startTime,
            clip.endTime
          );
        }

        clips.push(videoClip);

        // Store in database
        await prisma.videoClip.create({
          data: {
            id: clipId,
            meetingId: meeting?.id || '',
            userId,
            title: videoClip.title,
            description: videoClip.description,
            startTime: videoClip.startTime,
            endTime: videoClip.endTime,
            startTimeSeconds: Math.floor(videoClip.startTime),
            endTimeSeconds: Math.floor(videoClip.endTime),
            category: videoClip.category,
            keyPhrases: videoClip.keyPhrases as any,
            participants: videoClip.participants as any,
            importance: videoClip.importance,
            sentiment: videoClip.sentiment,
          },
        });
      }

      logger.info('Smart clips generated', { transcriptId, clipsCount: clips.length });
      return clips;
    } catch (error) {
      logger.error('Error generating smart clips', { error, transcriptId });
      throw error;
    }
  }

  /**
   * Generate clip-specific video URL with start/end time markers
   */
  private async generateClipUrl(
    originalVideoUrl: string,
    startTime: number,
    endTime: number
  ): Promise<string> {
    // For S3 URLs, append fragment with time markers
    // For HLS/streaming, use media fragments
    const url = new URL(originalVideoUrl);
    url.hash = `t=${startTime},${endTime}`;
    return url.toString();
  }

  /**
   * Detect key moments in video (topic changes, questions, excitement)
   */
  async detectKeyMoments(transcriptId: string): Promise<VideoMoment[]> {
    try {
      logger.info('Detecting key moments', { transcriptId });

      const segments = await transcriptService.getTranscriptSegments(transcriptId);
      const moments: VideoMoment[] = [];

      // Analyze segments for key moment patterns
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const text = segment.text.toLowerCase();

        // Detect questions
        if (text.includes('?') || text.match(/\b(what|when|where|why|how|who)\b/)) {
          moments.push({
            timestamp: segment.startTime,
            type: 'question',
            description: `Question asked: "${segment.text.substring(0, 80)}..."`,
            importance: 60,
            participants: [segment.speaker],
          });
        }

        // Detect action items
        if (text.match(/\b(will|should|need to|have to|let me|i'll|going to)\b.*\b(do|send|create|schedule|follow up|reach out)\b/)) {
          moments.push({
            timestamp: segment.startTime,
            type: 'action_item',
            description: `Action item identified: "${segment.text.substring(0, 80)}..."`,
            importance: 80,
            participants: [segment.speaker],
          });
        }

        // Detect objections
        if (text.match(/\b(concern|worried|problem|issue|challenge|difficult|not sure|hesitant)\b/)) {
          moments.push({
            timestamp: segment.startTime,
            type: 'objection',
            description: `Concern raised: "${segment.text.substring(0, 80)}..."`,
            importance: 85,
            participants: [segment.speaker],
          });
        }

        // Detect excitement (multiple exclamation marks, positive words)
        if (text.match(/!+/) || text.match(/\b(amazing|excellent|perfect|great|love|excited|fantastic)\b/)) {
          moments.push({
            timestamp: segment.startTime,
            type: 'excitement',
            description: `Positive moment: "${segment.text.substring(0, 80)}..."`,
            importance: 70,
            participants: [segment.speaker],
          });
        }

        // Detect topic changes (compare with previous segment)
        if (i > 0 && await this.isTopicChange(segments[i - 1].text, segment.text)) {
          moments.push({
            timestamp: segment.startTime,
            type: 'topic_change',
            description: 'Topic change detected',
            importance: 50,
          });
        }

        // Detect screen share mentions
        if (text.match(/\b(screen|sharing|looking at|see here|this slide|this page)\b/)) {
          moments.push({
            timestamp: segment.startTime,
            type: 'screen_share',
            description: 'Screen share or visual reference',
            importance: 65,
            participants: [segment.speaker],
          });
        }
      }

      // Sort by importance
      moments.sort((a, b) => b.importance - a.importance);

      logger.info('Key moments detected', { transcriptId, momentsCount: moments.length });
      return moments;
    } catch (error) {
      logger.error('Error detecting key moments', { error, transcriptId });
      throw error;
    }
  }

  /**
   * Analyze emotional tone throughout the meeting
   */
  async analyzeEmotionalTone(transcriptId: string): Promise<EmotionalTone[]> {
    try {
      logger.info('Analyzing emotional tone', { transcriptId });

      const segments = await transcriptService.getTranscriptSegments(transcriptId);
      const tones: EmotionalTone[] = [];

      for (const segment of segments) {
        const text = segment.text.toLowerCase();
        let emotion: EmotionalTone['emotion'] = 'neutral';
        let confidence = 0.5;
        let triggerPhrase = '';

        // Detect emotions based on language patterns
        if (text.match(/\b(excited|amazing|excellent|perfect|love|thrilled)\b/)) {
          emotion = 'excited';
          confidence = 0.85;
          triggerPhrase = text.match(/\b(excited|amazing|excellent|perfect|love|thrilled)\b/)?.[0] || '';
        } else if (text.match(/\b(concern|worried|problem|issue|challenge|risk)\b/)) {
          emotion = 'concerned';
          confidence = 0.8;
          triggerPhrase = text.match(/\b(concern|worried|problem|issue|challenge|risk)\b/)?.[0] || '';
        } else if (text.match(/\b(confused|not sure|unclear|don't understand|what do you mean)\b/)) {
          emotion = 'confused';
          confidence = 0.75;
          triggerPhrase = text.match(/\b(confused|not sure|unclear|don't understand)\b/)?.[0] || '';
        } else if (text.match(/\b(agree|exactly|absolutely|right|correct|yes)\b/)) {
          emotion = 'agreeing';
          confidence = 0.7;
          triggerPhrase = text.match(/\b(agree|exactly|absolutely|right|correct)\b/)?.[0] || '';
        } else if (text.match(/\b(frustrated|annoyed|difficult|pain|hate)\b/)) {
          emotion = 'frustrated';
          confidence = 0.8;
          triggerPhrase = text.match(/\b(frustrated|annoyed|difficult|pain|hate)\b/)?.[0] || '';
        }

        if (emotion !== 'neutral') {
          tones.push({
            timestamp: segment.startTime,
            speaker: segment.speaker,
            emotion,
            confidence,
            triggerPhrase,
          });
        }
      }

      logger.info('Emotional tone analyzed', { transcriptId, tonesCount: tones.length });
      return tones;
    } catch (error) {
      logger.error('Error analyzing emotional tone', { error, transcriptId });
      throw error;
    }
  }

  /**
   * Create shareable video clip
   */
  async createShareableClip(
    clipId: string,
    userId: string,
    options: {
      includeTranscript?: boolean;
      includeNotes?: boolean;
      expiresIn?: number; // seconds
    } = {}
  ): Promise<{ shareUrl: string; embedCode: string; expiresAt?: Date }> {
    try {
      logger.info('Creating shareable clip', { clipId, userId });

      const clip = await prisma.videoClip.findUnique({
        where: { id: clipId },
        include: { video: { include: { meeting: { include: { recordings: true } } } } },
      });

      if (!clip) {
        throw new Error('Clip not found');
      }

      // Generate unique share token
      const shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      const expiresAt = options.expiresIn
        ? new Date(Date.now() + options.expiresIn * 1000)
        : undefined;

      // Create share record
      await prisma.sharedClip.create({
        data: {
          id: shareToken,
          clipId,
          userId,
          includeTranscript: options.includeTranscript || false,
          includeNotes: options.includeNotes || false,
          expiresAt,
        },
      });

      const baseUrl = process.env.FRONTEND_URL || 'https://openmeet.com';
      const shareUrl = `${baseUrl}/share/clip/${shareToken}`;

      const embedCode = `<iframe src="${shareUrl}/embed" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

      logger.info('Shareable clip created', { clipId, shareToken });
      return { shareUrl, embedCode, expiresAt };
    } catch (error) {
      logger.error('Error creating shareable clip', { error, clipId });
      throw error;
    }
  }

  /**
   * Navigate to specific topics in video
   */
  async getTopicTimestamps(transcriptId: string): Promise<{ topic: string; timestamp: number; duration: number }[]> {
    try {
      logger.info('Getting topic timestamps', { transcriptId });

      const transcriptText = await transcriptService.getTranscriptText(transcriptId);
      const segments = await transcriptService.getTranscriptSegments(transcriptId);

      // Use GPT-4 to identify topics and their timestamps
      const topicsAnalysis = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Analyze this meeting transcript and identify the main topics discussed.
For each topic, provide:
- Topic name (concise, 3-5 words)
- Start timestamp (in seconds)
- Duration (in seconds)

Return valid JSON array.`,
          },
          {
            role: 'user',
            content: `Transcript:\n${transcriptText}\n\nSegments:\n${JSON.stringify(segments.slice(0, 100), null, 2)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const response = JSON.parse(topicsAnalysis.choices[0]?.message?.content || '{"topics":[]}');
      return response.topics || [];
    } catch (error) {
      logger.error('Error getting topic timestamps', { error, transcriptId });
      throw error;
    }
  }

  /**
   * Check if there's a topic change between two text segments
   */
  private async isTopicChange(text1: string, text2: string): Promise<boolean> {
    // Simple heuristic: compare word overlap
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const similarity = intersection.size / union.size;

    // If similarity is low, likely a topic change
    return similarity < 0.3;
  }

  /**
   * Get video analytics for a meeting
   */
  async getVideoAnalytics(transcriptId: string): Promise<{
    totalClips: number;
    totalKeyMoments: number;
    averageClipImportance: number;
    emotionalBreakdown: Record<string, number>;
    topCategories: { category: string; count: number }[];
  }> {
    try {
      const meeting = await prisma.meeting.findFirst({
        where: {
          transcripts: {
            some: { id: transcriptId }
          }
        },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const clips = await prisma.videoClip.findMany({
        where: { meetingId: meeting.id },
      });

      const totalClips = clips.length;
      const averageClipImportance = clips.reduce((sum, c) => sum + (c.importance || 0), 0) / (totalClips || 1);

      const categoryCount: Record<string, number> = {};
      clips.forEach(clip => {
        const category = clip.category || 'uncategorized';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      const emotions = await this.analyzeEmotionalTone(transcriptId);
      const emotionalBreakdown: Record<string, number> = {};
      emotions.forEach(e => {
        emotionalBreakdown[e.emotion] = (emotionalBreakdown[e.emotion] || 0) + 1;
      });

      const moments = await this.detectKeyMoments(transcriptId);

      return {
        totalClips,
        totalKeyMoments: moments.length,
        averageClipImportance,
        emotionalBreakdown,
        topCategories,
      };
    } catch (error) {
      logger.error('Error getting video analytics', { error, transcriptId });
      throw error;
    }
  }

  /**
   * Get synchronized video + transcript playback data
   * Provides everything needed for synchronized video/transcript player
   */
  async getSynchronizedPlayback(meetingId: string): Promise<{
    videoUrl: string;
    durationSeconds: number;
    transcriptSegments: any[];
    keyMoments: VideoMoment[];
    chapters: { title: string; timestamp: number }[];
    subtitleUrl?: string;
  }> {
    try {
      logger.info('Getting synchronized playback data', { meetingId });

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          recordings: true,
          transcripts: {
            where: { isFinal: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          videos: {
            where: { processingStatus: 'completed' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (!meeting.videos?.[0]) {
        throw new Error('No processed video found for meeting');
      }

      const video = meeting.videos[0];
      const transcript = meeting.transcripts[0];

      // Get transcript segments from database
      const transcriptSegments = transcript?.mongodbId
        ? await transcriptService.getTranscriptSegments(transcript.mongodbId)
        : [];

      // Get key moments for navigation
      const keyMoments = transcript?.id
        ? await this.detectKeyMoments(transcript.id)
        : [];

      // Get topic-based chapters
      const topics = transcript?.id
        ? await this.getTopicTimestamps(transcript.id)
        : [];

      const chapters = topics.map(topic => ({
        title: topic.topic,
        timestamp: topic.timestamp,
      }));

      return {
        videoUrl: video.fileUrl,
        durationSeconds: video.durationSeconds || 0,
        transcriptSegments,
        keyMoments,
        chapters,
        subtitleUrl: video.audioS3Key, // Can be enhanced with WebVTT generation
      };
    } catch (error) {
      logger.error('Error getting synchronized playback', { error, meetingId });
      throw error;
    }
  }

  /**
   * Jump to a specific transcript moment in video
   * Returns the exact timestamp and context for video playback
   */
  async jumpToTranscriptMoment(
    transcriptId: string,
    searchText: string
  ): Promise<{
    timestamp: number;
    speaker: string;
    text: string;
    contextBefore: string[];
    contextAfter: string[];
    videoUrl: string;
  } | null> {
    try {
      logger.info('Jumping to transcript moment', { transcriptId, searchText });

      const segments = await transcriptService.getTranscriptSegments(transcriptId);

      // Find matching segment
      const matchIndex = segments.findIndex(seg =>
        seg.text.toLowerCase().includes(searchText.toLowerCase())
      );

      if (matchIndex === -1) {
        return null;
      }

      const matchedSegment = segments[matchIndex];

      // Get context (2 segments before and after)
      const contextBefore = segments
        .slice(Math.max(0, matchIndex - 2), matchIndex)
        .map(s => s.text);

      const contextAfter = segments
        .slice(matchIndex + 1, Math.min(segments.length, matchIndex + 3))
        .map(s => s.text);

      // Get video URL from meeting
      const meeting = await prisma.meeting.findFirst({
        where: {
          transcripts: {
            some: { id: transcriptId }
          }
        },
        include: {
          videos: {
            where: { processingStatus: 'completed' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const videoUrl = meeting?.videos?.[0]?.fileUrl || '';

      return {
        timestamp: matchedSegment.startTime,
        speaker: matchedSegment.speaker,
        text: matchedSegment.text,
        contextBefore,
        contextAfter,
        videoUrl: `${videoUrl}#t=${matchedSegment.startTime}`,
      };
    } catch (error) {
      logger.error('Error jumping to transcript moment', { error, transcriptId, searchText });
      throw error;
    }
  }

  /**
   * Generate shareable video clip with transcript context
   * Creates a video clip with embedded transcript and context
   */
  async createClipWithContext(
    meetingId: string,
    startTime: number,
    endTime: number,
    options: {
      title?: string;
      includeTranscript?: boolean;
      includeSpeakerLabels?: boolean;
    } = {}
  ): Promise<{
    clipId: string;
    videoUrl: string;
    transcriptSegments?: any[];
    shareUrl: string;
  }> {
    try {
      logger.info('Creating clip with context', { meetingId, startTime, endTime });

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          videos: {
            where: { processingStatus: 'completed' },
            take: 1,
          },
          transcripts: {
            where: { isFinal: true },
            take: 1,
          },
        },
      });

      if (!meeting || !meeting.videos?.[0]) {
        throw new Error('Meeting or video not found');
      }

      const video = meeting.videos[0];
      const transcript = meeting.transcripts[0];

      // Get transcript segments for the clip time range
      let transcriptSegments: any[] = [];
      if (options.includeTranscript && transcript?.mongodbId) {
        const allSegments = await transcriptService.getTranscriptSegments(transcript.mongodbId);
        transcriptSegments = allSegments.filter(
          seg => seg.startTime >= startTime && seg.endTime <= endTime
        );
      }

      // Create video clip record
      const clipId = `clip_${meetingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await prisma.videoClip.create({
        data: {
          id: clipId,
          videoId: video.id,
          meetingId,
          userId: meeting.userId,
          title: options.title || `Clip ${startTime}s - ${endTime}s`,
          startTimeSeconds: Math.floor(startTime),
          endTimeSeconds: Math.floor(endTime),
          transcriptSegment: options.includeTranscript
            ? JSON.stringify(transcriptSegments)
            : undefined,
        },
      });

      // Generate video URL with time fragment
      const videoUrl = `${video.fileUrl}#t=${startTime},${endTime}`;
      const shareUrl = `${process.env.FRONTEND_URL || 'https://openmeet.com'}/clip/${clipId}`;

      return {
        clipId,
        videoUrl,
        transcriptSegments: options.includeTranscript ? transcriptSegments : undefined,
        shareUrl,
      };
    } catch (error) {
      logger.error('Error creating clip with context', { error, meetingId });
      throw error;
    }
  }
}

export const videoIntelligenceService = new VideoIntelligenceService();
