/**
 * Keyword Alert Service
 *
 * Real-time keyword detection and alerts during active meetings
 * Competitive Feature: Gong.io's Keyword Tracking
 *
 * Features:
 * - Real-time keyword detection alerts
 * - Competitor mention alerts
 * - Custom keyword tracking
 * - Alert notifications (WebSocket)
 * - Keyword categories and groups
 * - Contextual alerts with surrounding text
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { WebSocket } from 'ws';

const prisma = new PrismaClient();

export interface Keyword {
  id: string;
  term: string;
  category: string;
  caseSensitive: boolean;
  matchWholeWord: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notificationEnabled: boolean;
  metadata?: Record<string, any>;
}

export interface KeywordMatch {
  id: string;
  sessionId: string;
  keyword: Keyword;
  matchedText: string;
  contextBefore: string;
  contextAfter: string;
  speaker?: string;
  timestamp: number;
  timestampSeconds: number;
  position: number;
  alertSent: boolean;
}

export interface KeywordAlert {
  id: string;
  sessionId: string;
  match: KeywordMatch;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface KeywordCategory {
  name: string;
  keywords: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface KeywordSession {
  sessionId: string;
  ws?: WebSocket;
  trackedKeywords: Keyword[];
  matches: KeywordMatch[];
  alerts: KeywordAlert[];
  categories: KeywordCategory[];
  settings: {
    alertOnMatch: boolean;
    contextLength: number; // characters before/after match
    maxAlertsPerMinute: number;
    dedupWindow: number; // milliseconds to prevent duplicate alerts
  };
  lastAlertTimes: Map<string, number>;
}

class KeywordAlertService {
  private sessions: Map<string, KeywordSession> = new Map();
  private defaultCategories: KeywordCategory[] = [
    {
      name: 'competitors',
      keywords: [
        'competitor',
        'alternative',
        'other solution',
        'salesforce',
        'hubspot',
        'zoom',
        'microsoft teams',
        'google meet',
      ],
      priority: 'high',
      enabled: true,
    },
    {
      name: 'pricing',
      keywords: ['price', 'cost', 'budget', 'expensive', 'cheap', 'discount', 'roi', 'value'],
      priority: 'medium',
      enabled: true,
    },
    {
      name: 'objections',
      keywords: [
        'concern',
        'worried',
        'hesitant',
        'not sure',
        'doubt',
        'problem',
        'issue',
        'challenge',
      ],
      priority: 'high',
      enabled: true,
    },
    {
      name: 'decision_makers',
      keywords: ['ceo', 'cto', 'cfo', 'vp', 'director', 'manager', 'decision maker', 'stakeholder'],
      priority: 'medium',
      enabled: true,
    },
    {
      name: 'buying_signals',
      keywords: [
        'timeline',
        'when can we start',
        'next steps',
        'contract',
        'agreement',
        'purchase',
        'implement',
        'onboard',
      ],
      priority: 'critical',
      enabled: true,
    },
    {
      name: 'risks',
      keywords: [
        'cancel',
        'postpone',
        'delay',
        'not interested',
        'not ready',
        'maybe later',
        'think about it',
      ],
      priority: 'critical',
      enabled: true,
    },
  ];

  /**
   * Start keyword tracking session
   */
  async startSession(
    sessionId: string,
    ws?: WebSocket,
    options: {
      customKeywords?: Keyword[];
      categories?: KeywordCategory[];
      alertOnMatch?: boolean;
      contextLength?: number;
    } = {}
  ): Promise<void> {
    try {
      logger.info('Starting keyword tracking session', { sessionId });

      const session: KeywordSession = {
        sessionId,
        ws,
        trackedKeywords: options.customKeywords || [],
        matches: [],
        alerts: [],
        categories: options.categories || [...this.defaultCategories],
        settings: {
          alertOnMatch: options.alertOnMatch ?? true,
          contextLength: options.contextLength || 100,
          maxAlertsPerMinute: 5,
          dedupWindow: 10000, // 10 seconds
        },
        lastAlertTimes: new Map(),
      };

      // Add keywords from enabled categories
      for (const category of session.categories) {
        if (category.enabled) {
          for (const term of category.keywords) {
            session.trackedKeywords.push({
              id: `keyword_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              term,
              category: category.name,
              caseSensitive: false,
              matchWholeWord: true,
              priority: category.priority,
              notificationEnabled: true,
            });
          }
        }
      }

      this.sessions.set(sessionId, session);

      if (ws) {
        ws.send(JSON.stringify({
          type: 'keyword_tracking_started',
          sessionId,
          trackedKeywordsCount: session.trackedKeywords.length,
          categories: session.categories.map((c) => c.name),
        }));
      }

      logger.info('Keyword tracking session started', {
        sessionId,
        keywordsCount: session.trackedKeywords.length,
      });
    } catch (error) {
      logger.error('Error starting keyword tracking session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Process transcript for keyword matches
   */
  async processTranscript(
    sessionId: string,
    transcript: { speaker?: string; text: string; timestamp: number }
  ): Promise<KeywordMatch[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn('Session not found for keyword processing', { sessionId });
        throw new Error(`Session ${sessionId} not found`);
      }

      const matches: KeywordMatch[] = [];

      for (const keyword of session.trackedKeywords) {
        const keywordMatches = this.findKeywordMatches(
          transcript.text,
          keyword,
          session.settings.contextLength
        );

        for (const match of keywordMatches) {
          const keywordMatch: KeywordMatch = {
            id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            keyword,
            matchedText: match.matchedText,
            contextBefore: match.contextBefore,
            contextAfter: match.contextAfter,
            speaker: transcript.speaker,
            timestamp: Date.now(),
            timestampSeconds: transcript.timestamp,
            position: match.position,
            alertSent: false,
          };

          matches.push(keywordMatch);
          session.matches.push(keywordMatch);

          // Create alert if enabled
          if (session.settings.alertOnMatch && keyword.notificationEnabled) {
            await this.createAlert(session, keywordMatch);
          }

          // Store in database
          await prisma.liveInsight.create({
            data: {
              liveSessionId: sessionId,
              insightType: 'keyword_alert',
              content: `Keyword detected: "${keyword.term}" in category "${keyword.category}"`,
              confidence: 1.0,
              timestampSeconds: transcript.timestamp,
              speaker: transcript.speaker,
              metadata: {
                keyword: keyword.term,
                category: keyword.category,
                priority: keyword.priority,
                matchedText: match.matchedText,
                contextBefore: match.contextBefore,
                contextAfter: match.contextAfter,
              },
            },
          });
        }
      }

      logger.debug('Processed transcript for keywords', {
        sessionId,
        matchesFound: matches.length,
      });

      return matches;
    } catch (error) {
      logger.error('Error processing transcript for keywords', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to process transcript for keywords in session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find keyword matches in text
   */
  private findKeywordMatches(
    text: string,
    keyword: Keyword,
    contextLength: number
  ): Array<{
    matchedText: string;
    contextBefore: string;
    contextAfter: string;
    position: number;
  }> {
    const matches: Array<{
      matchedText: string;
      contextBefore: string;
      contextAfter: string;
      position: number;
    }> = [];

    const searchText = keyword.caseSensitive ? text : text.toLowerCase();
    const searchTerm = keyword.caseSensitive ? keyword.term : keyword.term.toLowerCase();

    let position = 0;
    while (true) {
      position = searchText.indexOf(searchTerm, position);
      if (position === -1) break;

      // Check for whole word match if required
      if (keyword.matchWholeWord) {
        const beforeChar = position > 0 ? searchText[position - 1] : ' ';
        const afterChar = position + searchTerm.length < searchText.length
          ? searchText[position + searchTerm.length]
          : ' ';

        const isWordBoundary = /\W/.test(beforeChar) && /\W/.test(afterChar);
        if (!isWordBoundary) {
          position += searchTerm.length;
          continue;
        }
      }

      // Extract context
      const contextStart = Math.max(0, position - contextLength);
      const contextEnd = Math.min(text.length, position + searchTerm.length + contextLength);

      const contextBefore = text.substring(contextStart, position).trim();
      const contextAfter = text.substring(position + searchTerm.length, contextEnd).trim();
      const matchedText = text.substring(position, position + searchTerm.length);

      matches.push({
        matchedText,
        contextBefore,
        contextAfter,
        position,
      });

      position += searchTerm.length;
    }

    return matches;
  }

  /**
   * Create alert for keyword match
   */
  private async createAlert(
    session: KeywordSession,
    match: KeywordMatch
  ): Promise<void> {
    try {
      // Check rate limiting
      const currentMinute = Math.floor(Date.now() / 60000);
      const recentAlerts = session.alerts.filter(
        (a) => Math.floor(a.timestamp / 60000) === currentMinute
      );

      if (recentAlerts.length >= session.settings.maxAlertsPerMinute) {
        logger.debug('Alert rate limit reached', { sessionId: session.sessionId });
        return;
      }

      // Check deduplication window
      const lastAlertTime = session.lastAlertTimes.get(match.keyword.term) || 0;
      if (Date.now() - lastAlertTime < session.settings.dedupWindow) {
        logger.debug('Alert deduplicated', {
          sessionId: session.sessionId,
          keyword: match.keyword.term,
        });
        return;
      }

      // Determine severity based on priority
      let severity: 'info' | 'warning' | 'critical' = 'info';
      if (match.keyword.priority === 'critical') severity = 'critical';
      else if (match.keyword.priority === 'high') severity = 'warning';

      const alert: KeywordAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: session.sessionId,
        match,
        severity,
        message: `"${match.keyword.term}" mentioned by ${match.speaker || 'speaker'} (${match.keyword.category})`,
        timestamp: Date.now(),
        acknowledged: false,
      };

      session.alerts.push(alert);
      session.lastAlertTimes.set(match.keyword.term, Date.now());
      match.alertSent = true;

      // Send via WebSocket
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'keyword_alert',
          alert,
        }));
      }

      logger.info('Keyword alert created', {
        sessionId: session.sessionId,
        keyword: match.keyword.term,
        category: match.keyword.category,
        severity,
      });
    } catch (error) {
      logger.error('Error creating keyword alert', { error });
    }
  }

  /**
   * Add custom keyword to track
   */
  async addKeyword(
    sessionId: string,
    keyword: Omit<Keyword, 'id'>
  ): Promise<Keyword> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const newKeyword: Keyword = {
        id: `keyword_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...keyword,
      };

      session.trackedKeywords.push(newKeyword);

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'keyword_added',
          keyword: newKeyword,
        }));
      }

      logger.info('Keyword added to tracking', {
        sessionId,
        term: newKeyword.term,
        category: newKeyword.category,
      });

      return newKeyword;
    } catch (error) {
      logger.error('Error adding keyword', { error, sessionId });
      throw error;
    }
  }

  /**
   * Remove keyword from tracking
   */
  async removeKeyword(sessionId: string, keywordId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.trackedKeywords = session.trackedKeywords.filter((k) => k.id !== keywordId);

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'keyword_removed',
          keywordId,
        }));
      }

      logger.info('Keyword removed from tracking', { sessionId, keywordId });
    } catch (error) {
      logger.error('Error removing keyword', { error, sessionId, keywordId });
      throw error;
    }
  }

  /**
   * Enable/disable keyword category
   */
  async toggleCategory(sessionId: string, categoryName: string, enabled: boolean): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const category = session.categories.find((c) => c.name === categoryName);
      if (!category) {
        throw new Error('Category not found');
      }

      category.enabled = enabled;

      // Update tracked keywords
      if (enabled) {
        // Add keywords from category
        for (const term of category.keywords) {
          const exists = session.trackedKeywords.some(
            (k) => k.term === term && k.category === categoryName
          );
          if (!exists) {
            session.trackedKeywords.push({
              id: `keyword_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              term,
              category: categoryName,
              caseSensitive: false,
              matchWholeWord: true,
              priority: category.priority,
              notificationEnabled: true,
            });
          }
        }
      } else {
        // Remove keywords from category
        session.trackedKeywords = session.trackedKeywords.filter(
          (k) => k.category !== categoryName
        );
      }

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'category_toggled',
          categoryName,
          enabled,
        }));
      }

      logger.info('Category toggled', { sessionId, categoryName, enabled });
    } catch (error) {
      logger.error('Error toggling category', { error, sessionId, categoryName });
      throw error;
    }
  }

  /**
   * Get all keyword matches
   */
  async getMatches(
    sessionId: string,
    filters?: {
      category?: string;
      keyword?: string;
      speaker?: string;
      limit?: number;
    }
  ): Promise<KeywordMatch[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn('Session not found for getting keyword matches', { sessionId });
        throw new Error(`Session ${sessionId} not found`);
      }

      let matches = [...session.matches];

      if (filters?.category) {
        matches = matches.filter((m) => m.keyword.category === filters.category);
      }

      if (filters?.keyword) {
        matches = matches.filter((m) => m.keyword.term === filters.keyword);
      }

      if (filters?.speaker) {
        matches = matches.filter((m) => m.speaker === filters.speaker);
      }

      if (filters?.limit) {
        matches = matches.slice(-filters.limit);
      }

      return matches.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error('Error getting keyword matches', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to get keyword matches for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get keyword statistics
   */
  async getStatistics(sessionId: string): Promise<{
    totalMatches: number;
    byCategory: Record<string, number>;
    byKeyword: Record<string, number>;
    topKeywords: Array<{ term: string; count: number; category: string }>;
    totalAlerts: number;
    unacknowledgedAlerts: number;
  }> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const byCategory: Record<string, number> = {};
      const byKeyword: Record<string, number> = {};

      for (const match of session.matches) {
        byCategory[match.keyword.category] = (byCategory[match.keyword.category] || 0) + 1;
        byKeyword[match.keyword.term] = (byKeyword[match.keyword.term] || 0) + 1;
      }

      const topKeywords = Object.entries(byKeyword)
        .map(([term, count]) => {
          const match = session.matches.find((m) => m.keyword.term === term);
          return {
            term,
            count,
            category: match?.keyword.category || 'unknown',
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalMatches: session.matches.length,
        byCategory,
        byKeyword,
        topKeywords,
        totalAlerts: session.alerts.length,
        unacknowledgedAlerts: session.alerts.filter((a) => !a.acknowledged).length,
      };
    } catch (error) {
      logger.error('Error getting keyword statistics', { error, sessionId });
      throw error;
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
        logger.info('Keyword alert acknowledged', { sessionId, alertId });
      }
    } catch (error) {
      logger.error('Error acknowledging alert', { error, sessionId, alertId });
      throw error;
    }
  }

  /**
   * Get all alerts
   */
  async getAlerts(
    sessionId: string,
    filters?: {
      acknowledged?: boolean;
      severity?: 'info' | 'warning' | 'critical';
    }
  ): Promise<KeywordAlert[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn('Session not found for getting alerts', { sessionId });
        throw new Error(`Session ${sessionId} not found`);
      }

      let alerts = [...session.alerts];

      if (filters?.acknowledged !== undefined) {
        alerts = alerts.filter((a) => a.acknowledged === filters.acknowledged);
      }

      if (filters?.severity) {
        alerts = alerts.filter((a) => a.severity === filters.severity);
      }

      return alerts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error('Error getting alerts', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to get alerts for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * End keyword tracking session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'keyword_tracking_ended',
          sessionId,
          totalMatches: session.matches.length,
          totalAlerts: session.alerts.length,
        }));
      }

      // Clean up after 5 minutes
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 300000);

      logger.info('Keyword tracking session ended', {
        sessionId,
        totalMatches: session.matches.length,
        totalAlerts: session.alerts.length,
      });
    } catch (error) {
      logger.error('Error ending keyword tracking session', { error, sessionId });
    }
  }
}

export const keywordAlertService = new KeywordAlertService();
