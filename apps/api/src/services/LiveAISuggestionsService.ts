/**
 * Live AI Suggestions Service
 *
 * Real-time AI suggestions during active meetings
 * Competitive Feature: Gong.io's Real-time Sales Assistance
 *
 * Features:
 * - Real-time AI suggestions during calls
 * - Conversation flow analysis
 * - Next best action recommendations
 * - Question suggestions based on context
 * - Talk track adherence
 * - Objection handling suggestions
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { WebSocket } from 'ws';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export interface AISuggestion {
  id: string;
  sessionId: string;
  type: 'question' | 'action' | 'objection_handler' | 'talk_track' | 'next_step' | 'warning';
  content: string;
  reasoning: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: number;
  context?: string;
  relatedTranscript?: string;
}

export interface ConversationContext {
  recentTranscripts: Array<{ speaker: string; text: string; timestamp: number }>;
  meetingType?: string;
  dealStage?: string;
  customerProfile?: any;
  objectives?: string[];
  detectedTopics?: string[];
  speakingRatio?: Record<string, number>;
  sentiment?: string;
}

export interface SuggestionSession {
  sessionId: string;
  ws?: WebSocket;
  context: ConversationContext;
  suggestions: AISuggestion[];
  lastAnalysisTime: number;
  isActive: boolean;
  settings: {
    suggestionTypes: string[];
    minConfidence: number;
    maxSuggestionsPerMinute: number;
  };
}

class LiveAISuggestionsService {
  private sessions: Map<string, SuggestionSession> = new Map();
  private suggestionCount: Map<string, number> = new Map();

  /**
   * Start AI suggestions session
   */
  async startSession(
    sessionId: string,
    ws?: WebSocket,
    options: {
      meetingType?: string;
      dealStage?: string;
      objectives?: string[];
      suggestionTypes?: string[];
      minConfidence?: number;
    } = {}
  ): Promise<void> {
    try {
      logger.info('Starting AI suggestions session', { sessionId });

      const session: SuggestionSession = {
        sessionId,
        ws,
        context: {
          recentTranscripts: [],
          meetingType: options.meetingType,
          dealStage: options.dealStage,
          objectives: options.objectives || [],
          detectedTopics: [],
          speakingRatio: {},
        },
        suggestions: [],
        lastAnalysisTime: Date.now(),
        isActive: true,
        settings: {
          suggestionTypes: options.suggestionTypes || [
            'question',
            'action',
            'objection_handler',
            'next_step',
          ],
          minConfidence: options.minConfidence || 0.7,
          maxSuggestionsPerMinute: 3,
        },
      };

      this.sessions.set(sessionId, session);
      this.suggestionCount.set(sessionId, 0);

      if (ws) {
        ws.send(JSON.stringify({
          type: 'ai_suggestions_started',
          sessionId,
          settings: session.settings,
        }));
      }

      logger.info('AI suggestions session started', { sessionId });
    } catch (error) {
      logger.error('Error starting AI suggestions session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Process new transcript and generate suggestions
   */
  async processTranscript(
    sessionId: string,
    transcript: { speaker: string; text: string; timestamp: number }
  ): Promise<AISuggestion[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn('Session not found for transcript processing', { sessionId });
        throw new Error(`Session ${sessionId} not found`);
      }
      if (!session.isActive) {
        logger.info('Session is not active, skipping suggestions', { sessionId });
        return []; // This is OK - inactive sessions return empty
      }

      // Add to context
      session.context.recentTranscripts.push(transcript);

      // Keep only last 20 transcripts for context
      if (session.context.recentTranscripts.length > 20) {
        session.context.recentTranscripts.shift();
      }

      // Update speaking ratio
      const speakerTime = session.context.speakingRatio || {};
      speakerTime[transcript.speaker] = (speakerTime[transcript.speaker] || 0) + 1;
      session.context.speakingRatio = speakerTime;

      // Check rate limiting
      const currentMinute = Math.floor(Date.now() / 60000);
      const countKey = `${sessionId}_${currentMinute}`;
      const currentCount = this.suggestionCount.get(countKey) || 0;

      if (currentCount >= session.settings.maxSuggestionsPerMinute) {
        logger.info('Rate limit reached for suggestions', {
          sessionId,
          currentCount,
          limit: session.settings.maxSuggestionsPerMinute
        });
        return []; // This is OK - rate limiting is expected behavior
      }

      // Generate suggestions every 30 seconds or on trigger words
      const timeSinceLastAnalysis = Date.now() - session.lastAnalysisTime;
      const shouldAnalyze = timeSinceLastAnalysis > 30000 || this.hasTriggerWords(transcript.text);

      if (!shouldAnalyze) {
        logger.debug('Skipping analysis - conditions not met', {
          sessionId,
          timeSinceLastAnalysis,
          hasTriggerWords: this.hasTriggerWords(transcript.text)
        });
        return []; // This is OK - optimizing for performance
      }

      session.lastAnalysisTime = Date.now();

      // Generate AI suggestions
      const suggestions = await this.generateSuggestions(session);

      // Filter by confidence
      const filteredSuggestions = suggestions.filter(
        (s) => s.confidence >= session.settings.minConfidence
      );

      // Store suggestions
      session.suggestions.push(...filteredSuggestions);

      // Update suggestion count
      this.suggestionCount.set(countKey, currentCount + filteredSuggestions.length);

      // Send to client via WebSocket
      if (session.ws && filteredSuggestions.length > 0) {
        for (const suggestion of filteredSuggestions) {
          if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'ai_suggestion',
              suggestion,
            }));
          }

          // Store in database
          await prisma.liveInsight.create({
            data: {
              liveSessionId: sessionId,
              insightType: 'ai_suggestion',
              content: suggestion.content,
              confidence: suggestion.confidence,
              timestampSeconds: suggestion.timestamp / 1000,
              metadata: {
                suggestionType: suggestion.type,
                reasoning: suggestion.reasoning,
                priority: suggestion.priority,
                context: suggestion.context,
              },
            },
          });
        }
      }

      return filteredSuggestions;
    } catch (error) {
      logger.error('Error processing transcript for suggestions', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to process transcript for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate AI suggestions based on conversation context
   */
  private async generateSuggestions(
    session: SuggestionSession
  ): Promise<AISuggestion[]> {
    try {
      const { context } = session;
      const conversationHistory = context.recentTranscripts
        .map((t) => `${t.speaker}: ${t.text}`)
        .join('\n');

      // Build prompt for AI
      const systemPrompt = `You are an AI sales/meeting assistant providing real-time suggestions during a live meeting.

Meeting Context:
- Type: ${context.meetingType || 'general'}
- Deal Stage: ${context.dealStage || 'unknown'}
- Objectives: ${context.objectives?.join(', ') || 'none specified'}

Based on the recent conversation, provide actionable suggestions in the following categories:
1. Questions to ask next
2. Actions to take
3. Objection handling strategies
4. Next steps to propose
5. Warnings about conversation flow

Return a JSON array of suggestions with this structure:
{
  "suggestions": [
    {
      "type": "question" | "action" | "objection_handler" | "next_step" | "warning",
      "content": "The actual suggestion text",
      "reasoning": "Why this suggestion is relevant",
      "confidence": 0.0-1.0,
      "priority": "low" | "medium" | "high" | "urgent"
    }
  ]
}

Only suggest if truly relevant. Max 3 suggestions.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Recent conversation:\n${conversationHistory}\n\nProvide relevant suggestions:`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"suggestions":[]}');
      const suggestions: AISuggestion[] = [];

      for (const suggestion of result.suggestions || []) {
        // Filter by enabled types
        if (!session.settings.suggestionTypes.includes(suggestion.type)) {
          continue;
        }

        suggestions.push({
          id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: session.sessionId,
          type: suggestion.type,
          content: suggestion.content,
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence,
          priority: suggestion.priority || 'medium',
          timestamp: Date.now(),
          relatedTranscript: conversationHistory.slice(-500), // Last 500 chars
        });
      }

      logger.debug('Generated AI suggestions', {
        sessionId: session.sessionId,
        count: suggestions.length,
      });

      return suggestions;
    } catch (error) {
      logger.error('Error generating AI suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: session.sessionId
      });
      throw new Error(`Failed to generate AI suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if transcript contains trigger words
   */
  private hasTriggerWords(text: string): boolean {
    const triggerWords = [
      'question',
      'concern',
      'issue',
      'problem',
      'budget',
      'price',
      'cost',
      'timeline',
      'competitor',
      'alternative',
      'objection',
      'worried',
      'unsure',
      'hesitant',
    ];

    const lowerText = text.toLowerCase();
    return triggerWords.some((word) => lowerText.includes(word));
  }

  /**
   * Get conversation flow analysis
   */
  async getConversationFlow(sessionId: string): Promise<{
    speakingRatio: Record<string, number>;
    dominantSpeaker: string;
    conversationBalance: number;
    topics: string[];
    engagement: string;
  }> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const speakingRatio = session.context.speakingRatio || {};
      const totalCount = Object.values(speakingRatio).reduce((a, b) => a + b, 0);

      const normalizedRatio: Record<string, number> = {};
      let dominantSpeaker = '';
      let maxRatio = 0;

      for (const [speaker, count] of Object.entries(speakingRatio)) {
        const ratio = totalCount > 0 ? count / totalCount : 0;
        normalizedRatio[speaker] = ratio;
        if (ratio > maxRatio) {
          maxRatio = ratio;
          dominantSpeaker = speaker;
        }
      }

      // Calculate balance (0-1, where 1 is perfectly balanced)
      const speakerCount = Object.keys(speakingRatio).length;
      const idealRatio = speakerCount > 0 ? 1 / speakerCount : 0;
      const deviations = Object.values(normalizedRatio).map(
        (ratio) => Math.abs(ratio - idealRatio)
      );
      const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
      const conversationBalance = Math.max(0, 1 - avgDeviation * 2);

      // Determine engagement level
      let engagement = 'low';
      if (conversationBalance > 0.7) engagement = 'high';
      else if (conversationBalance > 0.4) engagement = 'medium';

      return {
        speakingRatio: normalizedRatio,
        dominantSpeaker,
        conversationBalance,
        topics: session.context.detectedTopics || [],
        engagement,
      };
    } catch (error) {
      logger.error('Error analyzing conversation flow', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get next best action recommendation
   */
  async getNextBestAction(sessionId: string): Promise<AISuggestion | null> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return null;
      }

      const suggestions = session.suggestions.filter((s) => s.type === 'action' || s.type === 'next_step');

      if (suggestions.length === 0) {
        return null;
      }

      // Return highest priority and confidence
      suggestions.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

      return suggestions[0];
    } catch (error) {
      logger.error('Error getting next best action', { error, sessionId });
      return null;
    }
  }

  /**
   * Get all suggestions for session
   */
  async getSuggestions(
    sessionId: string,
    filters?: {
      type?: string;
      minConfidence?: number;
      priority?: string;
    }
  ): Promise<AISuggestion[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn('Session not found when getting suggestions', { sessionId });
        throw new Error(`Session ${sessionId} not found`);
      }

      let suggestions = [...session.suggestions];

      if (filters?.type) {
        suggestions = suggestions.filter((s) => s.type === filters.type);
      }

      if (filters?.minConfidence) {
        suggestions = suggestions.filter((s) => s.confidence >= filters.minConfidence);
      }

      if (filters?.priority) {
        suggestions = suggestions.filter((s) => s.priority === filters.priority);
      }

      return suggestions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error('Error getting suggestions', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to retrieve suggestions for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(sessionId: string, suggestionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.suggestions = session.suggestions.filter((s) => s.id !== suggestionId);

      logger.info('Suggestion dismissed', { sessionId, suggestionId });
    } catch (error) {
      logger.error('Error dismissing suggestion', { error, sessionId });
      throw error;
    }
  }

  /**
   * End AI suggestions session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }

      session.isActive = false;

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'ai_suggestions_ended',
          sessionId,
          totalSuggestions: session.suggestions.length,
        }));
      }

      // Clean up after 5 minutes
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 300000);

      logger.info('AI suggestions session ended', {
        sessionId,
        totalSuggestions: session.suggestions.length,
      });
    } catch (error) {
      logger.error('Error ending AI suggestions session', { error, sessionId });
    }
  }

  /**
   * Update session settings
   */
  async updateSettings(
    sessionId: string,
    settings: {
      suggestionTypes?: string[];
      minConfidence?: number;
      maxSuggestionsPerMinute?: number;
    }
  ): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.settings = { ...session.settings, ...settings };

      logger.info('AI suggestions settings updated', { sessionId, settings });
    } catch (error) {
      logger.error('Error updating AI suggestions settings', { error, sessionId });
      throw error;
    }
  }
}

export const liveAISuggestionsService = new LiveAISuggestionsService();
