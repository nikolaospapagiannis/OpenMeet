/**
 * Live Sentiment Service
 *
 * Real-time sentiment analysis during active meetings
 * Competitive Feature: Chorus.ai's Conversation Intelligence
 *
 * Features:
 * - Live sentiment analysis display
 * - Real-time emotion detection
 * - Engagement scoring
 * - Alert on negative sentiment
 * - Speaker-level sentiment tracking
 * - Trend analysis
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { WebSocket } from 'ws';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export interface SentimentScore {
  overall: number; // -1 to 1 (negative to positive)
  positive: number; // 0 to 1
  negative: number; // 0 to 1
  neutral: number; // 0 to 1
  compound: number; // -1 to 1
}

export interface EmotionScores {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  trust: number;
  anticipation: number;
  disgust: number;
}

export interface SentimentAnalysis {
  id: string;
  sessionId: string;
  timestamp: number;
  timestampSeconds: number;
  speaker?: string;
  text: string;
  sentiment: SentimentScore;
  emotions: EmotionScores;
  engagement: number; // 0 to 1
  tone: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  triggers?: string[]; // Words that influenced sentiment
}

export interface SentimentAlert {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'negative_trend' | 'sudden_drop' | 'disengagement' | 'anger_detected' | 'concern_raised';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  relatedAnalysis: SentimentAnalysis;
  acknowledged: boolean;
}

export interface SentimentSession {
  sessionId: string;
  ws?: WebSocket;
  analyses: SentimentAnalysis[];
  alerts: SentimentAlert[];
  speakerSentiments: Map<string, SentimentAnalysis[]>;
  overallTrend: number[];
  lastAnalysisTime: number;
  settings: {
    alertOnNegative: boolean;
    negativeThreshold: number;
    disengagementThreshold: number;
    analysisInterval: number; // milliseconds
  };
}

class LiveSentimentService {
  private sessions: Map<string, SentimentSession> = new Map();

  /**
   * Start sentiment analysis session
   */
  async startSession(
    sessionId: string,
    ws?: WebSocket,
    options: {
      alertOnNegative?: boolean;
      negativeThreshold?: number;
      disengagementThreshold?: number;
      analysisInterval?: number;
    } = {}
  ): Promise<void> {
    try {
      logger.info('Starting sentiment analysis session', { sessionId });

      const session: SentimentSession = {
        sessionId,
        ws,
        analyses: [],
        alerts: [],
        speakerSentiments: new Map(),
        overallTrend: [],
        lastAnalysisTime: Date.now(),
        settings: {
          alertOnNegative: options.alertOnNegative ?? true,
          negativeThreshold: options.negativeThreshold ?? -0.3,
          disengagementThreshold: options.disengagementThreshold ?? 0.3,
          analysisInterval: options.analysisInterval ?? 10000, // 10 seconds
        },
      };

      this.sessions.set(sessionId, session);

      if (ws) {
        ws.send(JSON.stringify({
          type: 'sentiment_session_started',
          sessionId,
          settings: session.settings,
        }));
      }

      logger.info('Sentiment analysis session started', { sessionId });
    } catch (error) {
      logger.error('Error starting sentiment session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Analyze sentiment of transcript
   */
  async analyzeTranscript(
    sessionId: string,
    transcript: { speaker?: string; text: string; timestamp: number }
  ): Promise<SentimentAnalysis | null> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return null;
      }

      // Rate limiting check
      const timeSinceLastAnalysis = Date.now() - session.lastAnalysisTime;
      if (timeSinceLastAnalysis < session.settings.analysisInterval) {
        return null;
      }

      session.lastAnalysisTime = Date.now();

      // Analyze sentiment using AI
      const analysis = await this.performSentimentAnalysis(sessionId, transcript);

      // Add to session
      session.analyses.push(analysis);

      // Track by speaker
      if (transcript.speaker) {
        if (!session.speakerSentiments.has(transcript.speaker)) {
          session.speakerSentiments.set(transcript.speaker, []);
        }
        session.speakerSentiments.get(transcript.speaker)!.push(analysis);
      }

      // Update overall trend
      session.overallTrend.push(analysis.sentiment.compound);
      if (session.overallTrend.length > 50) {
        session.overallTrend.shift();
      }

      // Check for alerts
      await this.checkForAlerts(session, analysis);

      // Send to client via WebSocket
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'sentiment_analysis',
          analysis,
        }));
      }

      // Store in database
      await prisma.liveInsight.create({
        data: {
          liveSessionId: sessionId,
          insightType: 'sentiment_analysis',
          content: `Sentiment: ${analysis.tone} (${(analysis.sentiment.compound * 100).toFixed(1)}%)`,
          confidence: analysis.confidence,
          timestampSeconds: analysis.timestampSeconds,
          speaker: transcript.speaker,
          metadata: {
            sentiment: analysis.sentiment as any,
            emotions: analysis.emotions as any,
            engagement: analysis.engagement,
            tone: analysis.tone,
            triggers: analysis.triggers,
          } as any,
        },
      });

      logger.debug('Sentiment analyzed', {
        sessionId,
        tone: analysis.tone,
        compound: analysis.sentiment.compound,
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing sentiment', { error, sessionId });
      return null;
    }
  }

  /**
   * Perform sentiment analysis using AI
   */
  private async performSentimentAnalysis(
    sessionId: string,
    transcript: { speaker?: string; text: string; timestamp: number }
  ): Promise<SentimentAnalysis> {
    try {
      const systemPrompt = `You are a sentiment and emotion analysis AI. Analyze the sentiment and emotions in the given text.

Return a JSON object with this structure:
{
  "sentiment": {
    "overall": -1 to 1 (negative to positive),
    "positive": 0 to 1,
    "negative": 0 to 1,
    "neutral": 0 to 1,
    "compound": -1 to 1
  },
  "emotions": {
    "joy": 0 to 1,
    "sadness": 0 to 1,
    "anger": 0 to 1,
    "fear": 0 to 1,
    "surprise": 0 to 1,
    "trust": 0 to 1,
    "anticipation": 0 to 1,
    "disgust": 0 to 1
  },
  "engagement": 0 to 1 (level of engagement/enthusiasm),
  "tone": "positive" | "negative" | "neutral" | "mixed",
  "confidence": 0 to 1,
  "triggers": ["word1", "word2"] (words that influenced sentiment)
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze this text:\n\nSpeaker: ${transcript.speaker || 'Unknown'}\nText: ${transcript.text}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');

      const analysis: SentimentAnalysis = {
        id: `sentiment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        timestamp: Date.now(),
        timestampSeconds: transcript.timestamp,
        speaker: transcript.speaker,
        text: transcript.text,
        sentiment: result.sentiment || {
          overall: 0,
          positive: 0.33,
          negative: 0.33,
          neutral: 0.34,
          compound: 0,
        },
        emotions: result.emotions || {
          joy: 0,
          sadness: 0,
          anger: 0,
          fear: 0,
          surprise: 0,
          trust: 0,
          anticipation: 0,
          disgust: 0,
        },
        engagement: result.engagement || 0.5,
        tone: result.tone || 'neutral',
        confidence: result.confidence || 0.8,
        triggers: result.triggers || [],
      };

      return analysis;
    } catch (error) {
      logger.error('Error performing sentiment analysis', { error });

      // Return neutral sentiment on error
      return {
        id: `sentiment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        timestamp: Date.now(),
        timestampSeconds: transcript.timestamp,
        speaker: transcript.speaker,
        text: transcript.text,
        sentiment: {
          overall: 0,
          positive: 0.33,
          negative: 0.33,
          neutral: 0.34,
          compound: 0,
        },
        emotions: {
          joy: 0,
          sadness: 0,
          anger: 0,
          fear: 0,
          surprise: 0,
          trust: 0,
          anticipation: 0,
          disgust: 0,
        },
        engagement: 0.5,
        tone: 'neutral',
        confidence: 0.5,
      };
    }
  }

  /**
   * Check for sentiment alerts
   */
  private async checkForAlerts(
    session: SentimentSession,
    analysis: SentimentAnalysis
  ): Promise<void> {
    try {
      if (!session.settings.alertOnNegative) {
        return;
      }

      const alerts: SentimentAlert[] = [];

      // Check for sudden negative sentiment
      if (analysis.sentiment.compound < session.settings.negativeThreshold) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: session.sessionId,
          timestamp: Date.now(),
          type: 'sudden_drop',
          severity: analysis.sentiment.compound < -0.6 ? 'critical' : 'high',
          message: `Negative sentiment detected from ${analysis.speaker || 'speaker'}: ${(analysis.sentiment.compound * 100).toFixed(1)}%`,
          relatedAnalysis: analysis,
          acknowledged: false,
        });
      }

      // Check for disengagement
      if (analysis.engagement < session.settings.disengagementThreshold) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: session.sessionId,
          timestamp: Date.now(),
          type: 'disengagement',
          severity: 'medium',
          message: `Low engagement detected from ${analysis.speaker || 'speaker'}: ${(analysis.engagement * 100).toFixed(1)}%`,
          relatedAnalysis: analysis,
          acknowledged: false,
        });
      }

      // Check for anger
      if (analysis.emotions.anger > 0.6) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: session.sessionId,
          timestamp: Date.now(),
          type: 'anger_detected',
          severity: 'high',
          message: `Anger detected in conversation from ${analysis.speaker || 'speaker'}`,
          relatedAnalysis: analysis,
          acknowledged: false,
        });
      }

      // Check for negative trend (last 5 analyses)
      if (session.overallTrend.length >= 5) {
        const recentTrend = session.overallTrend.slice(-5);
        const avgTrend = recentTrend.reduce((a, b) => a + b, 0) / recentTrend.length;

        if (avgTrend < -0.2) {
          alerts.push({
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: session.sessionId,
            timestamp: Date.now(),
            type: 'negative_trend',
            severity: 'medium',
            message: `Negative sentiment trend detected over last 5 interactions`,
            relatedAnalysis: analysis,
            acknowledged: false,
          });
        }
      }

      // Add alerts to session
      session.alerts.push(...alerts);

      // Send alerts via WebSocket
      if (session.ws && alerts.length > 0) {
        for (const alert of alerts) {
          if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'sentiment_alert',
              alert,
            }));
          }
        }
      }

      // Store high severity alerts in database
      for (const alert of alerts) {
        if (alert.severity === 'high' || alert.severity === 'critical') {
          await prisma.liveInsight.create({
            data: {
              liveSessionId: session.sessionId,
              insightType: 'sentiment_alert',
              content: alert.message,
              confidence: 0.9,
              timestampSeconds: analysis.timestampSeconds,
              speaker: analysis.speaker,
              metadata: {
                alertType: alert.type,
                severity: alert.severity,
              },
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error checking for sentiment alerts', { error });
    }
  }

  /**
   * Get current sentiment overview
   */
  async getSentimentOverview(sessionId: string): Promise<{
    currentSentiment: SentimentScore | null;
    averageSentiment: SentimentScore;
    trend: 'improving' | 'declining' | 'stable';
    speakerBreakdown: Record<string, { average: number; count: number }>;
    alerts: SentimentAlert[];
  }> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const currentSentiment = session.analyses.length > 0
        ? session.analyses[session.analyses.length - 1].sentiment
        : null;

      // Calculate average sentiment
      const avgSentiment = this.calculateAverageSentiment(session.analyses);

      // Determine trend
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (session.overallTrend.length >= 10) {
        const firstHalf = session.overallTrend.slice(0, Math.floor(session.overallTrend.length / 2));
        const secondHalf = session.overallTrend.slice(Math.floor(session.overallTrend.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (secondAvg > firstAvg + 0.1) trend = 'improving';
        else if (secondAvg < firstAvg - 0.1) trend = 'declining';
      }

      // Speaker breakdown
      const speakerBreakdown: Record<string, { average: number; count: number }> = {};
      const speakerEntries = Array.from(session.speakerSentiments.entries());
      for (const [speaker, analyses] of speakerEntries) {
        const avg = analyses.reduce((sum, a) => sum + a.sentiment.compound, 0) / analyses.length;
        speakerBreakdown[speaker] = {
          average: avg,
          count: analyses.length,
        };
      }

      return {
        currentSentiment,
        averageSentiment: avgSentiment,
        trend,
        speakerBreakdown,
        alerts: session.alerts.filter((a) => !a.acknowledged),
      };
    } catch (error) {
      logger.error('Error getting sentiment overview', { error, sessionId });
      throw error;
    }
  }

  /**
   * Calculate average sentiment
   */
  private calculateAverageSentiment(analyses: SentimentAnalysis[]): SentimentScore {
    if (analyses.length === 0) {
      return {
        overall: 0,
        positive: 0.33,
        negative: 0.33,
        neutral: 0.34,
        compound: 0,
      };
    }

    const sum = analyses.reduce(
      (acc, analysis) => ({
        overall: acc.overall + analysis.sentiment.overall,
        positive: acc.positive + analysis.sentiment.positive,
        negative: acc.negative + analysis.sentiment.negative,
        neutral: acc.neutral + analysis.sentiment.neutral,
        compound: acc.compound + analysis.sentiment.compound,
      }),
      { overall: 0, positive: 0, negative: 0, neutral: 0, compound: 0 }
    );

    return {
      overall: sum.overall / analyses.length,
      positive: sum.positive / analyses.length,
      negative: sum.negative / analyses.length,
      neutral: sum.neutral / analyses.length,
      compound: sum.compound / analyses.length,
    };
  }

  /**
   * Get sentiment history
   */
  async getSentimentHistory(
    sessionId: string,
    options?: {
      speaker?: string;
      limit?: number;
    }
  ): Promise<SentimentAnalysis[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return [];
      }

      let analyses = [...session.analyses];

      if (options?.speaker) {
        analyses = analyses.filter((a) => a.speaker === options.speaker);
      }

      if (options?.limit) {
        analyses = analyses.slice(-options.limit);
      }

      return analyses;
    } catch (error) {
      logger.error('Error getting sentiment history', { error, sessionId });
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(sessionId: string, alertId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const alert = session.alerts.find((a) => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        logger.info('Alert acknowledged', { sessionId, alertId });
      }
    } catch (error) {
      logger.error('Error acknowledging alert', { error, sessionId, alertId });
      throw error;
    }
  }

  /**
   * Update session settings
   */
  async updateSettings(
    sessionId: string,
    settings: Partial<SentimentSession['settings']>
  ): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.settings = { ...session.settings, ...settings };

      logger.info('Sentiment settings updated', { sessionId, settings });
    } catch (error) {
      logger.error('Error updating sentiment settings', { error, sessionId });
      throw error;
    }
  }

  /**
   * End sentiment session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'sentiment_session_ended',
          sessionId,
          totalAnalyses: session.analyses.length,
          totalAlerts: session.alerts.length,
        }));
      }

      // Clean up after 5 minutes
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 300000);

      logger.info('Sentiment session ended', {
        sessionId,
        totalAnalyses: session.analyses.length,
        totalAlerts: session.alerts.length,
      });
    } catch (error) {
      logger.error('Error ending sentiment session', { error, sessionId });
    }
  }
}

export const liveSentimentService = new LiveSentimentService();
