/**
 * Live Highlight Service
 *
 * Live highlight/bookmark creation during active meetings
 * Feature: Live Bookmarking
 *
 * Features:
 * - Live highlight/bookmark during meeting
 * - Instant bookmark creation
 * - Tag important moments live
 * - Share highlights in real-time
 * - Auto-detection of key moments
 * - Smart categorization
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { WebSocket } from 'ws';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export interface LiveHighlight {
  id: string;
  sessionId: string;
  meetingId: string;
  userId?: string;
  type: 'manual' | 'action_item' | 'decision' | 'question' | 'key_moment';
  title: string;
  description?: string;
  transcriptSnippet?: string;
  timestampSeconds: number;
  tags: string[];
  autoDetected: boolean;
  confidence?: number;
  sharedWith?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface HighlightSession {
  sessionId: string;
  meetingId: string;
  ws?: WebSocket;
  highlights: LiveHighlight[];
  autoDetectionEnabled: boolean;
  lastAnalysisTime: number;
  transcriptBuffer: Array<{ speaker: string; text: string; timestamp: number }>;
}

export interface AutoDetectionRules {
  actionItems: boolean;
  decisions: boolean;
  questions: boolean;
  keyMoments: boolean; // Includes objections, commitments, and other critical moments
  minConfidence: number;
}

class LiveHighlightService {
  private sessions: Map<string, HighlightSession> = new Map();

  /**
   * Start highlight session
   */
  async startSession(
    sessionId: string,
    meetingId: string,
    ws?: WebSocket,
    options: {
      autoDetectionEnabled?: boolean;
      autoDetectionRules?: Partial<AutoDetectionRules>;
    } = {}
  ): Promise<void> {
    try {
      logger.info('Starting highlight session', { sessionId, meetingId });

      const session: HighlightSession = {
        sessionId,
        meetingId,
        ws,
        highlights: [],
        autoDetectionEnabled: options.autoDetectionEnabled ?? true,
        lastAnalysisTime: Date.now(),
        transcriptBuffer: [],
      };

      this.sessions.set(sessionId, session);

      if (ws) {
        ws.send(JSON.stringify({
          type: 'highlight_session_started',
          sessionId,
          meetingId,
          autoDetectionEnabled: session.autoDetectionEnabled,
        }));
      }

      logger.info('Highlight session started', { sessionId });
    } catch (error) {
      logger.error('Error starting highlight session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Create manual highlight
   */
  async createHighlight(
    sessionId: string,
    data: {
      userId?: string;
      type: LiveHighlight['type'];
      title: string;
      description?: string;
      timestampSeconds: number;
      tags?: string[];
      transcriptSnippet?: string;
      sharedWith?: string[];
    }
  ): Promise<LiveHighlight> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Highlight session not found');
      }

      const highlight: LiveHighlight = {
        id: `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        meetingId: session.meetingId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        transcriptSnippet: data.transcriptSnippet,
        timestampSeconds: data.timestampSeconds,
        tags: data.tags || [],
        autoDetected: false,
        sharedWith: data.sharedWith || [],
        createdAt: new Date(),
      };

      // Add to session
      session.highlights.push(highlight);

      // Store in database
      await prisma.liveBookmark.create({
        data: {
          id: highlight.id,
          liveSessionId: sessionId,
          meetingId: session.meetingId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          description: data.description,
          timestampSeconds: data.timestampSeconds,
          tags: data.tags || [],
          autoDetected: false,
          metadata: {
            transcriptSnippet: data.transcriptSnippet,
            sharedWith: data.sharedWith,
          },
        },
      });

      // Notify via WebSocket
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'highlight_created',
          highlight,
        }));
      }

      logger.info('Manual highlight created', {
        sessionId,
        highlightId: highlight.id,
        type: highlight.type,
      });

      return highlight;
    } catch (error) {
      logger.error('Error creating highlight', { error, sessionId });
      throw error;
    }
  }

  /**
   * Process transcript for auto-detection
   */
  async processTranscript(
    sessionId: string,
    transcript: { speaker: string; text: string; timestamp: number }
  ): Promise<LiveHighlight[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.autoDetectionEnabled) {
        return [];
      }

      // Add to buffer
      session.transcriptBuffer.push(transcript);

      // Keep last 10 transcripts for context
      if (session.transcriptBuffer.length > 10) {
        session.transcriptBuffer.shift();
      }

      // Auto-detect every 20 seconds
      const timeSinceLastAnalysis = Date.now() - session.lastAnalysisTime;
      if (timeSinceLastAnalysis < 20000) {
        return [];
      }

      session.lastAnalysisTime = Date.now();

      // Detect key moments
      const detectedHighlights = await this.autoDetectKeyMoments(session);

      // Add to session and database
      for (const highlight of detectedHighlights) {
        session.highlights.push(highlight);

        await prisma.liveBookmark.create({
          data: {
            id: highlight.id,
            liveSessionId: sessionId,
            meetingId: session.meetingId,
            userId: highlight.userId,
            type: highlight.type,
            title: highlight.title,
            description: highlight.description,
            timestampSeconds: highlight.timestampSeconds,
            tags: highlight.tags,
            autoDetected: true,
            metadata: {
              confidence: highlight.confidence,
              transcriptSnippet: highlight.transcriptSnippet,
            },
          },
        });

        // Notify via WebSocket
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            type: 'auto_highlight_detected',
            highlight,
          }));
        }
      }

      return detectedHighlights;
    } catch (error) {
      logger.error('Error processing transcript for highlights', { error, sessionId });
      return [];
    }
  }

  /**
   * Auto-detect key moments using AI
   */
  private async autoDetectKeyMoments(
    session: HighlightSession
  ): Promise<LiveHighlight[]> {
    try {
      const conversationContext = session.transcriptBuffer
        .map((t) => `[${t.timestamp}s] ${t.speaker}: ${t.text}`)
        .join('\n');

      const systemPrompt = `You are an AI assistant that identifies key moments in meeting conversations.

Analyze the following conversation and identify important moments in these categories:
- action_item: Tasks or action items discussed
- decision: Decisions made during the conversation
- question: Important questions raised
- key_moment: Critical discussion points (use this for objections, concerns, commitments, or other important moments)

Return a JSON object with this structure:
{
  "highlights": [
    {
      "type": "action_item" | "decision" | "question" | "key_moment",
      "title": "Brief title (5-8 words)",
      "description": "Detailed description",
      "timestamp": timestamp in seconds,
      "tags": ["tag1", "tag2"],
      "confidence": 0.0-1.0
    }
  ]
}

Only identify truly significant moments. Max 2 highlights.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Conversation:\n${conversationContext}\n\nIdentify key moments:`,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"highlights":[]}');
      const highlights: LiveHighlight[] = [];

      for (const h of result.highlights || []) {
        // Only create if confidence is high enough
        if (h.confidence < 0.75) {
          continue;
        }

        highlights.push({
          id: `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: session.sessionId,
          meetingId: session.meetingId,
          type: h.type,
          title: h.title,
          description: h.description,
          transcriptSnippet: conversationContext.slice(-300), // Last 300 chars
          timestampSeconds: h.timestamp || session.transcriptBuffer[session.transcriptBuffer.length - 1]?.timestamp || 0,
          tags: h.tags || [],
          autoDetected: true,
          confidence: h.confidence,
          createdAt: new Date(),
        });
      }

      logger.debug('Auto-detected highlights', {
        sessionId: session.sessionId,
        count: highlights.length,
      });

      return highlights;
    } catch (error) {
      logger.error('Error auto-detecting key moments', { error });
      return [];
    }
  }

  /**
   * Get all highlights for session
   */
  async getHighlights(
    sessionId: string,
    filters?: {
      type?: string;
      autoDetected?: boolean;
      tags?: string[];
      userId?: string;
    }
  ): Promise<LiveHighlight[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        // Try to fetch from database
        const whereClause: any = {
          liveSessionId: sessionId,
        };

        if (filters?.type) {
          whereClause.type = filters.type;
        }

        if (filters?.autoDetected !== undefined) {
          whereClause.autoDetected = filters.autoDetected;
        }

        if (filters?.userId) {
          whereClause.userId = filters.userId;
        }

        const dbHighlights = await prisma.liveBookmark.findMany({
          where: whereClause,
          orderBy: { timestampSeconds: 'asc' },
        });

        return dbHighlights.map((h) => ({
          id: h.id,
          sessionId,
          meetingId: h.meetingId,
          userId: h.userId || undefined,
          type: h.type as LiveHighlight['type'],
          title: h.title,
          description: h.description || undefined,
          transcriptSnippet: (h.metadata as any)?.transcriptSnippet,
          timestampSeconds: h.timestampSeconds,
          tags: h.tags,
          autoDetected: h.autoDetected,
          confidence: (h.metadata as any)?.confidence,
          sharedWith: (h.metadata as any)?.sharedWith,
          createdAt: h.createdAt,
        }));
      }

      let highlights = [...session.highlights];

      if (filters?.type) {
        highlights = highlights.filter((h) => h.type === filters.type);
      }

      if (filters?.autoDetected !== undefined) {
        highlights = highlights.filter((h) => h.autoDetected === filters.autoDetected);
      }

      if (filters?.tags && filters.tags.length > 0) {
        highlights = highlights.filter((h) =>
          filters.tags!.some((tag) => h.tags.includes(tag))
        );
      }

      if (filters?.userId) {
        highlights = highlights.filter((h) => h.userId === filters.userId);
      }

      return highlights.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    } catch (error) {
      logger.error('Error getting highlights', { error, sessionId });
      return [];
    }
  }

  /**
   * Update highlight
   */
  async updateHighlight(
    sessionId: string,
    highlightId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      type?: LiveHighlight['type'];
    }
  ): Promise<LiveHighlight> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const highlightIndex = session.highlights.findIndex((h) => h.id === highlightId);
      if (highlightIndex === -1) {
        throw new Error('Highlight not found');
      }

      // Update in memory
      const highlight = session.highlights[highlightIndex];
      Object.assign(highlight, updates);

      // Update in database
      await prisma.liveBookmark.update({
        where: { id: highlightId },
        data: {
          title: updates.title,
          description: updates.description,
          tags: updates.tags,
          type: updates.type,
        },
      });

      // Notify via WebSocket
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'highlight_updated',
          highlight,
        }));
      }

      logger.info('Highlight updated', { sessionId, highlightId });

      return highlight;
    } catch (error) {
      logger.error('Error updating highlight', { error, sessionId, highlightId });
      throw error;
    }
  }

  /**
   * Delete highlight
   */
  async deleteHighlight(sessionId: string, highlightId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Remove from memory
      session.highlights = session.highlights.filter((h) => h.id !== highlightId);

      // Remove from database
      await prisma.liveBookmark.delete({
        where: { id: highlightId },
      });

      // Notify via WebSocket
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'highlight_deleted',
          highlightId,
        }));
      }

      logger.info('Highlight deleted', { sessionId, highlightId });
    } catch (error) {
      logger.error('Error deleting highlight', { error, sessionId, highlightId });
      throw error;
    }
  }

  /**
   * Share highlight with users
   */
  async shareHighlight(
    sessionId: string,
    highlightId: string,
    userIds: string[]
  ): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const highlight = session.highlights.find((h) => h.id === highlightId);
      if (!highlight) {
        throw new Error('Highlight not found');
      }

      // Update shared list
      highlight.sharedWith = [...(highlight.sharedWith || []), ...userIds];

      // Update in database
      await prisma.liveBookmark.update({
        where: { id: highlightId },
        data: {
          metadata: {
            ...(highlight.metadata || {}),
            sharedWith: highlight.sharedWith,
          },
        },
      });

      logger.info('Highlight shared', { sessionId, highlightId, userIds });
    } catch (error) {
      logger.error('Error sharing highlight', { error, sessionId, highlightId });
      throw error;
    }
  }

  /**
   * Toggle auto-detection
   */
  async toggleAutoDetection(sessionId: string, enabled: boolean): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.autoDetectionEnabled = enabled;

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'auto_detection_toggled',
          enabled,
        }));
      }

      logger.info('Auto-detection toggled', { sessionId, enabled });
    } catch (error) {
      logger.error('Error toggling auto-detection', { error, sessionId });
      throw error;
    }
  }

  /**
   * End highlight session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'highlight_session_ended',
          sessionId,
          totalHighlights: session.highlights.length,
        }));
      }

      // Clean up after 5 minutes
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 300000);

      logger.info('Highlight session ended', {
        sessionId,
        totalHighlights: session.highlights.length,
      });
    } catch (error) {
      logger.error('Error ending highlight session', { error, sessionId });
    }
  }

  /**
   * Get highlight statistics
   */
  async getStatistics(sessionId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    autoDetected: number;
    manual: number;
  }> {
    try {
      const highlights = await this.getHighlights(sessionId);

      const byType: Record<string, number> = {};
      let autoDetected = 0;
      let manual = 0;

      for (const highlight of highlights) {
        byType[highlight.type] = (byType[highlight.type] || 0) + 1;
        if (highlight.autoDetected) {
          autoDetected++;
        } else {
          manual++;
        }
      }

      return {
        total: highlights.length,
        byType,
        autoDetected,
        manual,
      };
    } catch (error) {
      logger.error('Error getting highlight statistics', { error, sessionId });
      throw error;
    }
  }
}

export const liveHighlightService = new LiveHighlightService();
