/**
 * Real-time Coaching Service
 * Enterprise-grade real-time coaching during live calls
 *
 * REAL IMPLEMENTATION with:
 * - WebSocket server (ws library) for real-time communication
 * - OpenAI GPT-4 for AI-powered coaching suggestions
 * - Redis for session state management and persistence
 * - Real sentiment analysis and pattern detection
 */

import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocket, WebSocketServer, RawData } from 'ws';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { URL } from 'url';

// Initialize clients
const prisma = new PrismaClient();

// ====================================
// Type Definitions
// ====================================

export interface TranscriptChunk {
  text: string;
  speaker: string;
  timestamp: number;
  confidence?: number;
  duration?: number;
}

export interface CoachingSuggestion {
  id: string;
  type: 'question' | 'objection_handler' | 'talking_point' | 'warning' | 'encouragement' | 'next_step';
  content: string;
  reasoning: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  relatedContext?: string;
}

export interface TalkTimeAnalysis {
  sessionId: string;
  participants: Record<string, {
    name: string;
    talkTimeSeconds: number;
    percentage: number;
    role: 'rep' | 'prospect' | 'unknown';
  }>;
  balance: number; // 0-1, where 1 is perfectly balanced
  recommendation?: string;
  timestamp: Date;
}

export interface PatternAnalysis {
  sessionId: string;
  patterns: {
    type: 'interruption' | 'monologue' | 'rapid_exchange' | 'silence' | 'question_asked' | 'objection_raised';
    description: string;
    timestamp: number;
    participants?: string[];
    severity: 'info' | 'warning' | 'critical';
  }[];
  overallEngagement: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  confidence: number;
  emotions: string[];
  timestamp: Date;
}

export interface CoachingSession {
  sessionId: string;
  meetingId: string;
  organizationId: string;
  userId?: string;
  ws: WebSocket;
  startedAt: Date;
  isActive: boolean;
  config: CoachingConfig;
}

export interface CoachingConfig {
  enableCompetitorAlerts: boolean;
  enableObjectionDetection: boolean;
  enableSentimentMonitoring: boolean;
  enableTalkTimeAlerts: boolean;
  enableQuestionSuggestions: boolean;
  competitors: string[];
  maxRepTalkRatio: number;
  sentimentThreshold: number;
  suggestionCooldownMs: number;
}

interface WebSocketMessage {
  type: string;
  payload: any;
}

// Coaching system prompts
const COACHING_SYSTEM_PROMPT = `You are an expert real-time sales coach analyzing live meeting conversations.
Your role is to provide actionable, concise coaching suggestions to help sales representatives succeed.

Guidelines:
1. Keep suggestions brief (1-2 sentences max)
2. Focus on immediate, actionable advice
3. Be specific to the conversation context
4. Prioritize based on urgency and impact
5. Consider the deal stage and customer signals

Output Format (JSON):
{
  "suggestion": {
    "type": "question" | "objection_handler" | "talking_point" | "warning" | "encouragement" | "next_step",
    "content": "The specific suggestion text",
    "reasoning": "Brief explanation why this is relevant",
    "confidence": 0.0-1.0,
    "priority": "low" | "medium" | "high" | "urgent"
  }
}

Return null if no suggestion is warranted.`;

const SENTIMENT_SYSTEM_PROMPT = `Analyze the sentiment of the following conversation segment.
Consider tone, word choice, and context.

Output Format (JSON):
{
  "score": -1.0 to 1.0 (negative to positive),
  "label": "very_negative" | "negative" | "neutral" | "positive" | "very_positive",
  "confidence": 0.0-1.0,
  "emotions": ["list", "of", "detected", "emotions"]
}`;

// ====================================
// RealtimeCoachingService Class
// ====================================

export class RealtimeCoachingService {
  private wss: WebSocketServer | null = null;
  private openai: OpenAI;
  private redis: Redis;
  private sessions: Map<string, CoachingSession> = new Map();
  private lastSuggestionTime: Map<string, number> = new Map();

  constructor() {
    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OPENAI_API_KEY not set - AI coaching will be limited');
    }
    this.openai = new OpenAI({ apiKey: apiKey || '' });

    // Initialize Redis client
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error in RealtimeCoachingService', { error: err.message });
    });

    this.redis.on('connect', () => {
      logger.info('RealtimeCoachingService connected to Redis');
    });
  }

  /**
   * Initialize WebSocket server for real-time coaching
   */
  initWebSocket(server: HttpServer): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/coaching',
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });

    logger.info('RealtimeCoachingService WebSocket server initialized on /ws/coaching');
  }

  /**
   * Verify WebSocket client authentication
   */
  private verifyClient(
    info: { origin: string; secure: boolean; req: IncomingMessage },
    callback: (result: boolean, code?: number, message?: string) => void
  ): void {
    try {
      const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        callback(false, 401, 'Authentication token required');
        return;
      }

      // Verify JWT token
      const secret = process.env.JWT_SECRET || 'secret';
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          logger.warn('WebSocket authentication failed', { error: err.message });
          callback(false, 401, 'Invalid authentication token');
          return;
        }

        // Attach user info to request for later use
        (info.req as any).user = decoded;
        callback(true);
      });
    } catch (error) {
      logger.error('Error verifying WebSocket client', { error });
      callback(false, 500, 'Authentication error');
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const user = (req as any).user;
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const meetingId = url.searchParams.get('meetingId');
    const organizationId = url.searchParams.get('organizationId');

    if (!meetingId || !organizationId) {
      ws.close(4000, 'meetingId and organizationId are required');
      return;
    }

    const sessionId = `coaching-${meetingId}-${Date.now()}`;

    logger.info('New coaching WebSocket connection', {
      sessionId,
      meetingId,
      organizationId,
      userId: user?.id,
    });

    // Create session with default config
    const session: CoachingSession = {
      sessionId,
      meetingId,
      organizationId,
      userId: user?.id,
      ws,
      startedAt: new Date(),
      isActive: true,
      config: {
        enableCompetitorAlerts: true,
        enableObjectionDetection: true,
        enableSentimentMonitoring: true,
        enableTalkTimeAlerts: true,
        enableQuestionSuggestions: true,
        competitors: ['Salesforce', 'HubSpot', 'Gong', 'Chorus'],
        maxRepTalkRatio: 0.65,
        sentimentThreshold: -0.3,
        suggestionCooldownMs: 30000,
      },
    };

    this.sessions.set(sessionId, session);

    // Store session in Redis
    this.storeSessionInRedis(session);

    // Send session started confirmation
    this.sendToSession(sessionId, {
      type: 'session_started',
      payload: {
        sessionId,
        meetingId,
        config: session.config,
      },
    });

    // Set up message handler
    ws.on('message', (data) => this.handleMessage(sessionId, ws, data));

    // Set up close handler
    ws.on('close', (code, reason) => {
      logger.info('Coaching WebSocket closed', {
        sessionId,
        code,
        reason: reason.toString(),
      });
      this.handleDisconnect(sessionId);
    });

    // Set up error handler
    ws.on('error', (error) => {
      logger.error('Coaching WebSocket error', {
        sessionId,
        error: error.message,
      });
    });

    // Set up ping/pong for connection health
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });
    (ws as any).isAlive = true;
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(sessionId: string, ws: WebSocket, data: RawData): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'transcript_chunk':
          await this.processTranscriptChunk(sessionId, message.payload);
          break;

        case 'request_suggestion':
          await this.generateOnDemandSuggestion(sessionId, message.payload);
          break;

        case 'request_talk_time':
          await this.sendTalkTimeAnalysis(sessionId);
          break;

        case 'request_patterns':
          await this.sendPatternAnalysis(sessionId);
          break;

        case 'update_config':
          await this.updateSessionConfig(sessionId, message.payload);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
          break;

        default:
          logger.warn('Unknown message type', { sessionId, type: message.type });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;

      // Update Redis with final session state
      await this.redis.setex(
        `coaching:session:${sessionId}`,
        3600 * 24, // Keep for 24 hours after disconnect
        JSON.stringify({
          ...session,
          ws: undefined,
          endedAt: new Date(),
        })
      );

      this.sessions.delete(sessionId);
      this.lastSuggestionTime.delete(sessionId);

      logger.info('Coaching session ended', { sessionId });
    }
  }

  /**
   * Process incoming transcript chunk and generate coaching
   */
  async processTranscriptChunk(
    sessionId: string,
    chunk: TranscriptChunk
  ): Promise<CoachingSuggestion | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      logger.warn('Session not found or inactive', { sessionId });
      return null;
    }

    try {
      // Store transcript chunk in Redis for context
      await this.redis.lpush(
        `coaching:${sessionId}:transcript`,
        JSON.stringify({
          ...chunk,
          receivedAt: Date.now(),
        })
      );

      // Trim to keep only last 50 chunks
      await this.redis.ltrim(`coaching:${sessionId}:transcript`, 0, 49);

      // Update talk time metrics
      await this.updateTalkTime(sessionId, chunk);

      // Check for competitor mentions
      if (session.config.enableCompetitorAlerts) {
        const competitorAlert = this.detectCompetitorMention(chunk, session.config.competitors);
        if (competitorAlert) {
          this.sendToSession(sessionId, {
            type: 'competitor_alert',
            payload: competitorAlert,
          });
        }
      }

      // Analyze sentiment periodically
      if (session.config.enableSentimentMonitoring) {
        await this.analyzeSentimentAsync(sessionId, chunk);
      }

      // Check rate limiting for suggestions
      const lastTime = this.lastSuggestionTime.get(sessionId) || 0;
      const now = Date.now();

      if (now - lastTime < session.config.suggestionCooldownMs) {
        return null;
      }

      // Generate AI coaching suggestion
      const suggestion = await this.generateCoachingSuggestion(sessionId, chunk);

      if (suggestion && suggestion.confidence >= 0.7) {
        this.lastSuggestionTime.set(sessionId, now);

        // Send to client
        this.sendToSession(sessionId, {
          type: 'coaching_suggestion',
          payload: suggestion,
        });

        // Store suggestion in database
        await this.storeSuggestionInDatabase(sessionId, session.meetingId, suggestion);

        return suggestion;
      }

      return null;
    } catch (error) {
      logger.error('Error processing transcript chunk', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Generate coaching suggestion using GPT-4
   */
  private async generateCoachingSuggestion(
    sessionId: string,
    currentChunk: TranscriptChunk
  ): Promise<CoachingSuggestion | null> {
    try {
      // Get recent context from Redis
      const context = await this.getSessionContext(sessionId);

      if (context.length < 3) {
        // Not enough context yet
        return null;
      }

      const conversationHistory = context
        .map((c) => `${c.speaker}: ${c.text}`)
        .join('\n');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: COACHING_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Recent conversation context:\n${conversationHistory}\n\nLatest statement:\n${currentChunk.speaker}: ${currentChunk.text}\n\nProvide a coaching suggestion if appropriate:`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content);

      if (!parsed.suggestion || parsed.suggestion === null) {
        return null;
      }

      return {
        id: `suggestion-${uuidv4()}`,
        type: parsed.suggestion.type,
        content: parsed.suggestion.content,
        reasoning: parsed.suggestion.reasoning,
        confidence: parsed.suggestion.confidence,
        priority: parsed.suggestion.priority,
        timestamp: new Date(),
        relatedContext: currentChunk.text,
      };
    } catch (error) {
      logger.error('Error generating coaching suggestion', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Generate on-demand suggestion based on specific request
   */
  private async generateOnDemandSuggestion(
    sessionId: string,
    request: { topic?: string; type?: string }
  ): Promise<void> {
    try {
      const context = await this.getSessionContext(sessionId);
      const conversationHistory = context
        .map((c) => `${c.speaker}: ${c.text}`)
        .join('\n');

      const prompt = request.topic
        ? `Generate a helpful suggestion about: ${request.topic}\n\nConversation context:\n${conversationHistory}`
        : `Generate a helpful next-step suggestion based on:\n${conversationHistory}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: COACHING_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return;
      }

      const parsed = JSON.parse(content);

      if (parsed.suggestion) {
        const suggestion: CoachingSuggestion = {
          id: `suggestion-${uuidv4()}`,
          type: parsed.suggestion.type,
          content: parsed.suggestion.content,
          reasoning: parsed.suggestion.reasoning,
          confidence: parsed.suggestion.confidence,
          priority: parsed.suggestion.priority,
          timestamp: new Date(),
        };

        this.sendToSession(sessionId, {
          type: 'coaching_suggestion',
          payload: suggestion,
        });
      }
    } catch (error) {
      logger.error('Error generating on-demand suggestion', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get session context from Redis
   */
  private async getSessionContext(sessionId: string): Promise<TranscriptChunk[]> {
    try {
      const chunks = await this.redis.lrange(`coaching:${sessionId}:transcript`, 0, 19);
      return chunks
        .map((c) => {
          try {
            return JSON.parse(c);
          } catch {
            return null;
          }
        })
        .filter((c): c is TranscriptChunk => c !== null)
        .reverse(); // Oldest first
    } catch (error) {
      logger.error('Error getting session context', { sessionId, error });
      return [];
    }
  }

  /**
   * Analyze talk time and update metrics
   */
  private async updateTalkTime(sessionId: string, chunk: TranscriptChunk): Promise<void> {
    const key = `coaching:${sessionId}:talktime`;

    // Estimate duration based on word count (average 150 WPM)
    const wordCount = chunk.text.split(/\s+/).length;
    const estimatedSeconds = chunk.duration || Math.ceil((wordCount / 150) * 60);

    await this.redis.hincrby(key, chunk.speaker, estimatedSeconds);
    await this.redis.expire(key, 3600 * 4); // 4 hour TTL
  }

  /**
   * Analyze talk time balance
   */
  async analyzeTalkTime(sessionId: string): Promise<TalkTimeAnalysis> {
    const key = `coaching:${sessionId}:talktime`;
    const data = await this.redis.hgetall(key);

    const participants: TalkTimeAnalysis['participants'] = {};
    let totalTime = 0;

    // Calculate totals
    for (const [speaker, time] of Object.entries(data)) {
      const seconds = parseInt(time, 10) || 0;
      totalTime += seconds;
      participants[speaker] = {
        name: speaker,
        talkTimeSeconds: seconds,
        percentage: 0,
        role: this.inferSpeakerRole(speaker),
      };
    }

    // Calculate percentages
    for (const speaker of Object.keys(participants)) {
      participants[speaker].percentage =
        totalTime > 0 ? (participants[speaker].talkTimeSeconds / totalTime) * 100 : 0;
    }

    // Calculate balance (0-1)
    const speakerCount = Object.keys(participants).length;
    const idealPercentage = speakerCount > 0 ? 100 / speakerCount : 0;
    let totalDeviation = 0;

    for (const p of Object.values(participants)) {
      totalDeviation += Math.abs(p.percentage - idealPercentage);
    }

    const balance = Math.max(0, 1 - totalDeviation / 200);

    // Generate recommendation
    let recommendation: string | undefined;
    const repTalkTime = Object.values(participants).find((p) => p.role === 'rep');

    if (repTalkTime && repTalkTime.percentage > 65) {
      recommendation = 'You are talking more than 65% of the time. Consider asking more open-ended questions to engage the prospect.';
    } else if (repTalkTime && repTalkTime.percentage < 30) {
      recommendation = 'Great listening! Make sure to add value by sharing relevant insights when appropriate.';
    }

    return {
      sessionId,
      participants,
      balance,
      recommendation,
      timestamp: new Date(),
    };
  }

  /**
   * Send talk time analysis to client
   */
  private async sendTalkTimeAnalysis(sessionId: string): Promise<void> {
    const analysis = await this.analyzeTalkTime(sessionId);
    this.sendToSession(sessionId, {
      type: 'talk_time_analysis',
      payload: analysis,
    });
  }

  /**
   * Detect conversation patterns
   */
  async detectPatterns(sessionId: string): Promise<PatternAnalysis> {
    const context = await this.getSessionContext(sessionId);
    const patterns: PatternAnalysis['patterns'] = [];

    let lastSpeaker = '';
    let consecutiveCount = 0;
    let lastTimestamp = 0;

    for (let i = 0; i < context.length; i++) {
      const chunk = context[i];

      // Detect monologues (same speaker for 5+ consecutive chunks)
      if (chunk.speaker === lastSpeaker) {
        consecutiveCount++;
        if (consecutiveCount >= 5) {
          patterns.push({
            type: 'monologue',
            description: `${chunk.speaker} has been speaking for an extended period`,
            timestamp: chunk.timestamp,
            participants: [chunk.speaker],
            severity: consecutiveCount >= 8 ? 'warning' : 'info',
          });
        }
      } else {
        consecutiveCount = 1;

        // Detect rapid exchange
        if (lastTimestamp && chunk.timestamp - lastTimestamp < 2) {
          patterns.push({
            type: 'rapid_exchange',
            description: 'Quick back-and-forth exchange detected',
            timestamp: chunk.timestamp,
            participants: [lastSpeaker, chunk.speaker],
            severity: 'info',
          });
        }

        // Detect potential interruption
        if (lastTimestamp && chunk.timestamp - lastTimestamp < 0.5 && context[i - 1]) {
          const prevChunk = context[i - 1];
          if (!prevChunk.text.endsWith('.') && !prevChunk.text.endsWith('?') && !prevChunk.text.endsWith('!')) {
            patterns.push({
              type: 'interruption',
              description: `${chunk.speaker} may have interrupted ${lastSpeaker}`,
              timestamp: chunk.timestamp,
              participants: [lastSpeaker, chunk.speaker],
              severity: 'warning',
            });
          }
        }
      }

      // Detect questions
      if (chunk.text.includes('?')) {
        patterns.push({
          type: 'question_asked',
          description: `${chunk.speaker} asked a question`,
          timestamp: chunk.timestamp,
          participants: [chunk.speaker],
          severity: 'info',
        });
      }

      // Detect objection keywords
      const objectionKeywords = ['concern', 'worried', 'not sure', 'expensive', 'budget', 'competitor'];
      if (objectionKeywords.some((kw) => chunk.text.toLowerCase().includes(kw))) {
        patterns.push({
          type: 'objection_raised',
          description: 'Potential objection or concern detected',
          timestamp: chunk.timestamp,
          participants: [chunk.speaker],
          severity: 'warning',
        });
      }

      lastSpeaker = chunk.speaker;
      lastTimestamp = chunk.timestamp;
    }

    // Determine overall engagement
    const questionCount = patterns.filter((p) => p.type === 'question_asked').length;
    const rapidExchangeCount = patterns.filter((p) => p.type === 'rapid_exchange').length;
    const monologueCount = patterns.filter((p) => p.type === 'monologue').length;

    let overallEngagement: 'low' | 'medium' | 'high' = 'medium';
    if (questionCount > 3 && rapidExchangeCount > 2 && monologueCount < 2) {
      overallEngagement = 'high';
    } else if (monologueCount > 3 || questionCount < 1) {
      overallEngagement = 'low';
    }

    return {
      sessionId,
      patterns: patterns.slice(-20), // Return last 20 patterns
      overallEngagement,
      timestamp: new Date(),
    };
  }

  /**
   * Send pattern analysis to client
   */
  private async sendPatternAnalysis(sessionId: string): Promise<void> {
    const analysis = await this.detectPatterns(sessionId);
    this.sendToSession(sessionId, {
      type: 'pattern_analysis',
      payload: analysis,
    });
  }

  /**
   * Analyze sentiment using GPT-4
   */
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: SENTIMENT_SYSTEM_PROMPT },
          { role: 'user', content: `Analyze sentiment:\n"${text}"` },
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.getDefaultSentiment();
      }

      const parsed = JSON.parse(content);

      return {
        score: parsed.score ?? 0,
        label: parsed.label ?? 'neutral',
        confidence: parsed.confidence ?? 0.5,
        emotions: parsed.emotions ?? [],
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error analyzing sentiment', { error });
      return this.getDefaultSentiment();
    }
  }

  /**
   * Async sentiment analysis that sends results to client
   */
  private async analyzeSentimentAsync(sessionId: string, chunk: TranscriptChunk): Promise<void> {
    // Only analyze every 5th chunk to reduce API calls
    const chunkCount = await this.redis.llen(`coaching:${sessionId}:transcript`);
    if (chunkCount % 5 !== 0) {
      return;
    }

    const sentiment = await this.analyzeSentiment(chunk.text);
    const session = this.sessions.get(sessionId);

    if (!session) return;

    // Store sentiment
    await this.redis.lpush(
      `coaching:${sessionId}:sentiment`,
      JSON.stringify(sentiment)
    );
    await this.redis.ltrim(`coaching:${sessionId}:sentiment`, 0, 19);

    // Alert if negative
    if (sentiment.score < session.config.sentimentThreshold) {
      this.sendToSession(sessionId, {
        type: 'sentiment_alert',
        payload: {
          sentiment,
          message: 'Negative sentiment detected. Consider addressing any concerns.',
        },
      });
    }

    // Periodic sentiment update
    this.sendToSession(sessionId, {
      type: 'sentiment_update',
      payload: sentiment,
    });
  }

  /**
   * Generate question suggestions
   */
  async suggestQuestions(sessionId: string, topic?: string): Promise<string[]> {
    try {
      const context = await this.getSessionContext(sessionId);
      const conversationHistory = context
        .slice(-10)
        .map((c) => `${c.speaker}: ${c.text}`)
        .join('\n');

      const prompt = topic
        ? `Based on the conversation about "${topic}", suggest 3 insightful follow-up questions:\n\n${conversationHistory}`
        : `Based on this conversation, suggest 3 insightful follow-up questions:\n\n${conversationHistory}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a sales coach. Generate 3 strategic, open-ended questions to move the conversation forward. Return a JSON array of strings.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      const parsed = JSON.parse(content);
      return Array.isArray(parsed.questions) ? parsed.questions : [];
    } catch (error) {
      logger.error('Error suggesting questions', { sessionId, error });
      return [];
    }
  }

  /**
   * Detect competitor mentions
   */
  private detectCompetitorMention(
    chunk: TranscriptChunk,
    competitors: string[]
  ): { competitor: string; context: string } | null {
    const lowerText = chunk.text.toLowerCase();

    for (const competitor of competitors) {
      if (lowerText.includes(competitor.toLowerCase())) {
        return {
          competitor,
          context: chunk.text,
        };
      }
    }

    return null;
  }

  /**
   * Send message to session via WebSocket
   */
  private sendToSession(sessionId: string, message: WebSocketMessage): void {
    const session = this.sessions.get(sessionId);
    if (session && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Store session in Redis
   */
  private async storeSessionInRedis(session: CoachingSession): Promise<void> {
    const sessionData = {
      sessionId: session.sessionId,
      meetingId: session.meetingId,
      organizationId: session.organizationId,
      userId: session.userId,
      startedAt: session.startedAt.toISOString(),
      isActive: session.isActive,
      config: session.config,
    };

    await this.redis.setex(
      `coaching:session:${session.sessionId}`,
      3600 * 4, // 4 hour TTL
      JSON.stringify(sessionData)
    );
  }

  /**
   * Store suggestion in database
   */
  private async storeSuggestionInDatabase(
    sessionId: string,
    meetingId: string,
    suggestion: CoachingSuggestion
  ): Promise<void> {
    try {
      await prisma.liveInsight.create({
        data: {
          liveSessionId: sessionId,
          insightType: 'coaching_suggestion',
          content: suggestion.content,
          confidence: suggestion.confidence,
          timestampSeconds: Math.floor(suggestion.timestamp.getTime() / 1000),
          metadata: {
            suggestionType: suggestion.type,
            reasoning: suggestion.reasoning,
            priority: suggestion.priority,
            relatedContext: suggestion.relatedContext,
          },
        },
      });
    } catch (error) {
      logger.error('Error storing suggestion in database', { sessionId, error });
    }
  }

  /**
   * Update session configuration
   */
  private async updateSessionConfig(
    sessionId: string,
    config: Partial<CoachingConfig>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.config = { ...session.config, ...config };
      await this.storeSessionInRedis(session);

      this.sendToSession(sessionId, {
        type: 'config_updated',
        payload: session.config,
      });

      logger.info('Session config updated', { sessionId, config });
    }
  }

  /**
   * Infer speaker role based on name heuristics
   */
  private inferSpeakerRole(speaker: string): 'rep' | 'prospect' | 'unknown' {
    const lowerSpeaker = speaker.toLowerCase();

    // Common rep indicators
    if (lowerSpeaker.includes('sales') || lowerSpeaker.includes('rep') || lowerSpeaker.includes('ae')) {
      return 'rep';
    }

    // Default to unknown - in production this would use org data
    return 'unknown';
  }

  /**
   * Get default sentiment for fallback
   */
  private getDefaultSentiment(): SentimentAnalysis {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0.5,
      emotions: [],
      timestamp: new Date(),
    };
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CoachingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {
      activeSessions: this.sessions.size,
      websocketServer: this.wss ? 'running' : 'not_initialized',
    };

    try {
      // Check Redis
      const redisPing = await this.redis.ping();
      details.redis = redisPing === 'PONG' ? 'connected' : 'disconnected';
    } catch {
      details.redis = 'error';
    }

    try {
      // Check OpenAI (lightweight)
      details.openai = process.env.OPENAI_API_KEY ? 'configured' : 'not_configured';
    } catch {
      details.openai = 'error';
    }

    const isHealthy = details.redis === 'connected' && details.openai === 'configured';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      details,
    };
  }

  /**
   * Update coaching configuration for organization
   */
  async updateCoachingConfiguration(
    organizationId: string,
    config: Partial<CoachingConfig>,
    userId: string
  ): Promise<CoachingConfig> {
    try {
      const configKey = `coaching:config:${organizationId}`;
      const existingConfig = await this.redis.get(configKey);

      const defaultConfig: CoachingConfig = {
        enableCompetitorAlerts: true,
        enableObjectionDetection: true,
        enableSentimentMonitoring: true,
        enableTalkTimeAlerts: true,
        enableQuestionSuggestions: true,
        competitors: ['Salesforce', 'HubSpot', 'Gong', 'Chorus'],
        maxRepTalkRatio: 0.65,
        sentimentThreshold: -0.3,
        suggestionCooldownMs: 30000,
      };

      const currentConfig = existingConfig ? JSON.parse(existingConfig) : defaultConfig;
      const updatedConfig = { ...currentConfig, ...config };

      await this.redis.set(configKey, JSON.stringify(updatedConfig));

      logger.info('Coaching configuration updated', { organizationId, userId });
      return updatedConfig;
    } catch (error) {
      logger.error('Error updating coaching configuration', { error, organizationId });
      throw error;
    }
  }

  /**
   * Get coaching configuration for organization
   */
  async getCoachingConfiguration(
    organizationId: string,
    userId: string
  ): Promise<CoachingConfig> {
    try {
      const configKey = `coaching:config:${organizationId}`;
      const config = await this.redis.get(configKey);

      if (config) {
        return JSON.parse(config);
      }

      // Return default configuration
      return {
        enableCompetitorAlerts: true,
        enableObjectionDetection: true,
        enableSentimentMonitoring: true,
        enableTalkTimeAlerts: true,
        enableQuestionSuggestions: true,
        competitors: ['Salesforce', 'HubSpot', 'Gong', 'Chorus'],
        maxRepTalkRatio: 0.65,
        sentimentThreshold: -0.3,
        suggestionCooldownMs: 30000,
      };
    } catch (error) {
      logger.error('Error getting coaching configuration', { error, organizationId });
      throw error;
    }
  }

  /**
   * Start a coaching session (HTTP-based, for pre-WebSocket setup)
   */
  async startCoachingSession(
    meetingId: string,
    organizationId: string,
    userId: string
  ): Promise<{ sessionId: string; wsUrl: string; config: CoachingConfig }> {
    try {
      const sessionId = `coaching-${meetingId}-${Date.now()}`;
      const config = await this.getCoachingConfiguration(organizationId, userId);

      // Store session metadata in Redis
      await this.redis.setex(
        `coaching:pending:${sessionId}`,
        600, // 10 minute TTL for pending sessions
        JSON.stringify({
          meetingId,
          organizationId,
          userId,
          config,
          createdAt: new Date().toISOString(),
        })
      );

      const wsHost = process.env.WS_HOST || 'localhost:3001';
      const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';

      logger.info('Coaching session created', { sessionId, meetingId, organizationId });

      return {
        sessionId,
        wsUrl: `${wsProtocol}://${wsHost}/ws/coaching?meetingId=${meetingId}&organizationId=${organizationId}`,
        config,
      };
    } catch (error) {
      logger.error('Error starting coaching session', { error, meetingId });
      throw error;
    }
  }

  /**
   * End a coaching session
   */
  async endCoachingSession(sessionId: string): Promise<{ success: boolean }> {
    try {
      const session = this.sessions.get(sessionId);

      if (session) {
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.close(1000, 'Session ended by user');
        }
        await this.handleDisconnect(sessionId);
      }

      // Also clean up any pending session
      await this.redis.del(`coaching:pending:${sessionId}`);

      logger.info('Coaching session ended', { sessionId });
      return { success: true };
    } catch (error) {
      logger.error('Error ending coaching session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down RealtimeCoachingService');

    // Close all WebSocket connections
    for (const [sessionId, session] of this.sessions) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close(1001, 'Server shutting down');
      }
      await this.handleDisconnect(sessionId);
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close Redis connection
    await this.redis.quit();

    logger.info('RealtimeCoachingService shutdown complete');
  }
}

// Export singleton instance
export const realtimeCoachingService = new RealtimeCoachingService();
export default RealtimeCoachingService;
