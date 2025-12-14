/**
 * Topic Tracker Service
 *
 * Topic/keyword tracker over time
 * Features:
 * - Trend analysis for topics
 * - Topic frequency charts
 * - Alert on topic mentions
 * - Topic correlation analysis
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface TopicTracker {
  id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string;
  keywords: string[]; // Keywords to track
  isActive: boolean;
  alertEnabled: boolean;
  alertThreshold?: number; // Number of mentions to trigger alert
  alertRecipients: string[]; // User IDs or emails
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicMention {
  id: string;
  trackerId: string;
  meetingId: string;
  keyword: string;
  context: string; // Text snippet around the mention
  timestamp: Date; // When in the meeting
  sentiment?: 'positive' | 'neutral' | 'negative';
  speaker?: string;
  createdAt: Date;
}

export interface TopicTrend {
  trackerId: string;
  trackerName: string;
  keyword: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  mentions: Array<{
    date: Date;
    count: number;
    meetingIds: string[];
  }>;
  totalMentions: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  peakDate?: Date;
  peakCount?: number;
}

export interface TopicAnalytics {
  trackerId: string;
  totalMeetings: number;
  totalMentions: number;
  averageMentionsPerMeeting: number;
  topKeywords: Array<{
    keyword: string;
    count: number;
    percentage: number;
  }>;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topSpeakers: Array<{
    speaker: string;
    mentionCount: number;
  }>;
  correlatedTopics: Array<{
    topic: string;
    correlation: number;
  }>;
}

class TopicTrackerService {
  /**
   * Create a topic tracker
   */
  async createTracker(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      keywords: string[];
      alertEnabled?: boolean;
      alertThreshold?: number;
      alertRecipients?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<TopicTracker> {
    try {
      const trackerId = `tracker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const tracker: TopicTracker = {
        id: trackerId,
        organizationId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        keywords: data.keywords.map(k => k.toLowerCase()),
        isActive: true,
        alertEnabled: data.alertEnabled || false,
        alertThreshold: data.alertThreshold,
        alertRecipients: data.alertRecipients || [],
        metadata: data.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in Organization.settings.topicTrackers
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const settings = (org?.settings as any) || {};
      const topicTrackers = settings.topicTrackers || [];
      topicTrackers.push(tracker);
      settings.topicTrackers = topicTrackers;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { settings: settings as any },
      });

      logger.info('Topic tracker created', { trackerId: tracker.id, name: data.name });

      return tracker;
    } catch (error) {
      logger.error('Error creating topic tracker', { error });
      throw error;
    }
  }

  /**
   * Get all trackers for organization
   */
  async getTrackers(
    organizationId: string,
    filters?: {
      isActive?: boolean;
      createdBy?: string;
    }
  ): Promise<TopicTracker[]> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const settings = (org?.settings as any) || {};
      let trackers: TopicTracker[] = settings.topicTrackers || [];

      // Apply filters
      if (filters?.isActive !== undefined) {
        trackers = trackers.filter(t => t.isActive === filters.isActive);
      }

      if (filters?.createdBy) {
        trackers = trackers.filter(t => t.createdBy === filters.createdBy);
      }

      // Sort by createdAt descending
      trackers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return trackers;
    } catch (error) {
      logger.error('Error getting topic trackers', { error });
      throw error;
    }
  }

  /**
   * Get tracker by ID
   */
  async getTracker(trackerId: string): Promise<TopicTracker | null> {
    try {
      // Search all organizations for the tracker
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const settings = (org.settings as any) || {};
        const topicTrackers: TopicTracker[] = settings.topicTrackers || [];
        const tracker = topicTrackers.find(t => t.id === trackerId);

        if (tracker) {
          return tracker;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting topic tracker', { error, trackerId });
      return null;
    }
  }

  /**
   * Update tracker
   */
  async updateTracker(
    trackerId: string,
    data: Partial<{
      name: string;
      description: string;
      keywords: string[];
      isActive: boolean;
      alertEnabled: boolean;
      alertThreshold: number;
      alertRecipients: string[];
      metadata: Record<string, any>;
    }>
  ): Promise<TopicTracker> {
    try {
      // Normalize keywords to lowercase
      if (data.keywords) {
        data.keywords = data.keywords.map(k => k.toLowerCase());
      }

      // Find and update the tracker
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const settings = (org.settings as any) || {};
        const topicTrackers: TopicTracker[] = settings.topicTrackers || [];
        const trackerIndex = topicTrackers.findIndex(t => t.id === trackerId);

        if (trackerIndex >= 0) {
          topicTrackers[trackerIndex] = {
            ...topicTrackers[trackerIndex],
            ...data,
            updatedAt: new Date(),
          };

          settings.topicTrackers = topicTrackers;

          await prisma.organization.update({
            where: { id: org.id },
            data: { settings: settings as any },
          });

          logger.info('Topic tracker updated', { trackerId });

          return topicTrackers[trackerIndex];
        }
      }

      throw new Error('Topic tracker not found');
    } catch (error) {
      logger.error('Error updating topic tracker', { error, trackerId });
      throw error;
    }
  }

  /**
   * Delete tracker
   */
  async deleteTracker(trackerId: string): Promise<boolean> {
    try {
      // Find and delete the tracker
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const settings = (org.settings as any) || {};
        const topicTrackers: TopicTracker[] = settings.topicTrackers || [];
        const trackerIndex = topicTrackers.findIndex(t => t.id === trackerId);

        if (trackerIndex >= 0) {
          topicTrackers.splice(trackerIndex, 1);
          settings.topicTrackers = topicTrackers;

          await prisma.organization.update({
            where: { id: org.id },
            data: { settings: settings as any },
          });

          logger.info('Topic tracker deleted', { trackerId });

          // Also delete all mentions from meetings
          const meetings = await prisma.meeting.findMany({
            where: { organizationId: org.id },
          });

          for (const meeting of meetings) {
            const metadata = (meeting.metadata as any) || {};
            const topicMentions: TopicMention[] = metadata.topicMentions || [];
            const filteredMentions = topicMentions.filter(m => m.trackerId !== trackerId);

            if (filteredMentions.length !== topicMentions.length) {
              metadata.topicMentions = filteredMentions;
              await prisma.meeting.update({
                where: { id: meeting.id },
                data: { metadata: metadata as any },
              });
            }
          }

          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error deleting topic tracker', { error, trackerId });
      throw error;
    }
  }

  /**
   * Track topics in meeting transcript
   */
  async trackMeetingTopics(
    meetingId: string,
    transcript: string,
    organizationId: string
  ): Promise<void> {
    try {
      const trackers = await this.getTrackers(organizationId, { isActive: true });

      if (trackers.length === 0) {
        return;
      }

      const transcriptLower = transcript.toLowerCase();
      const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

      for (const tracker of trackers) {
        let mentionCount = 0;
        const mentions: TopicMention[] = [];

        for (const keyword of tracker.keywords) {
          const keywordLower = keyword.toLowerCase();
          const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
          const matches = transcriptLower.match(regex);

          if (matches) {
            mentionCount += matches.length;

            // Find context for each mention
            for (let i = 0; i < sentences.length; i++) {
              const sentence = sentences[i];
              if (sentence.toLowerCase().includes(keywordLower)) {
                // Get context (sentence + surrounding sentences)
                const contextStart = Math.max(0, i - 1);
                const contextEnd = Math.min(sentences.length, i + 2);
                const context = sentences.slice(contextStart, contextEnd).join('. ');

                // Simple sentiment analysis
                const sentiment = this.analyzeSentiment(sentence);

                mentions.push({
                  id: `mention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  trackerId: tracker.id,
                  meetingId,
                  keyword,
                  context: context.trim(),
                  timestamp: new Date(), // Could be more precise with transcript timestamps
                  sentiment,
                  createdAt: new Date(),
                });
              }
            }
          }
        }

        // Save mentions to Meeting.metadata.topicMentions
        if (mentions.length > 0) {
          const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
          });

          const metadata = (meeting?.metadata as any) || {};
          const topicMentions = metadata.topicMentions || [];
          topicMentions.push(...mentions);
          metadata.topicMentions = topicMentions;

          await prisma.meeting.update({
            where: { id: meetingId },
            data: { metadata: metadata as any },
          });

          logger.info('Topic mentions tracked', {
            trackerId: tracker.id,
            meetingId,
            mentionCount: mentions.length,
          });

          // Check if alert should be triggered
          if (tracker.alertEnabled && tracker.alertThreshold) {
            if (mentionCount >= tracker.alertThreshold) {
              await this.triggerAlert(tracker, meetingId, mentionCount);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error tracking meeting topics', { error, meetingId });
    }
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const textLower = text.toLowerCase();

    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'fantastic', 'wonderful',
      'success', 'happy', 'love', 'best', 'perfect', 'awesome',
    ];

    const negativeWords = [
      'bad', 'poor', 'terrible', 'awful', 'horrible', 'worst',
      'problem', 'issue', 'concern', 'fail', 'wrong', 'difficult',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (textLower.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (textLower.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Trigger alert for topic mentions
   */
  private async triggerAlert(
    tracker: TopicTracker,
    meetingId: string,
    mentionCount: number
  ): Promise<void> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return;
      }

      // Create notification
      for (const recipient of tracker.alertRecipients) {
        await prisma.notification.create({
          data: {
            userId: recipient,
            type: 'email',
            channel: 'topic_tracker',
            recipient,
            subject: `Topic Alert: ${tracker.name}`,
            content: `The topic "${tracker.name}" was mentioned ${mentionCount} times in the meeting "${meeting.title}".`,
            metadata: {
              trackerId: tracker.id,
              meetingId,
              mentionCount,
            },
          },
        });
      }

      logger.info('Topic alert triggered', {
        trackerId: tracker.id,
        meetingId,
        mentionCount,
      });
    } catch (error) {
      logger.error('Error triggering topic alert', { error });
    }
  }

  /**
   * Get topic mentions
   */
  async getMentions(
    trackerId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      meetingId?: string;
      sentiment?: 'positive' | 'neutral' | 'negative';
      limit?: number;
    }
  ): Promise<TopicMention[]> {
    try {
      // Get all meetings and filter mentions
      const meetings = await prisma.meeting.findMany();

      let allMentions: TopicMention[] = [];

      for (const meeting of meetings) {
        const metadata = (meeting.metadata as any) || {};
        const topicMentions: TopicMention[] = metadata.topicMentions || [];

        // Filter by trackerId
        const filteredMentions = topicMentions.filter(m => m.trackerId === trackerId);
        allMentions.push(...filteredMentions);
      }

      // Apply additional filters
      if (filters?.meetingId) {
        allMentions = allMentions.filter(m => m.meetingId === filters.meetingId);
      }

      if (filters?.sentiment) {
        allMentions = allMentions.filter(m => m.sentiment === filters.sentiment);
      }

      if (filters?.startDate || filters?.endDate) {
        allMentions = allMentions.filter(m => {
          const createdAt = new Date(m.createdAt);
          if (filters.startDate && createdAt < filters.startDate) return false;
          if (filters.endDate && createdAt > filters.endDate) return false;
          return true;
        });
      }

      // Sort by createdAt descending
      allMentions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply limit
      const limit = filters?.limit || 100;
      allMentions = allMentions.slice(0, limit);

      return allMentions;
    } catch (error) {
      logger.error('Error getting topic mentions', { error, trackerId });
      throw error;
    }
  }

  /**
   * Get topic trend analysis
   */
  async getTopicTrend(
    trackerId: string,
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<TopicTrend | null> {
    try {
      const tracker = await this.getTracker(trackerId);

      if (!tracker) {
        return null;
      }

      const mentions = await this.getMentions(trackerId, { startDate, endDate });

      // Group mentions by time interval
      const mentionsByDate: Map<string, { count: number; meetingIds: Set<string> }> = new Map();

      mentions.forEach(mention => {
        let dateKey: string;
        const date = new Date(mention.timestamp);

        switch (interval) {
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            dateKey = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default: // day
            dateKey = date.toISOString().split('T')[0];
        }

        if (!mentionsByDate.has(dateKey)) {
          mentionsByDate.set(dateKey, { count: 0, meetingIds: new Set() });
        }

        const entry = mentionsByDate.get(dateKey)!;
        entry.count++;
        entry.meetingIds.add(mention.meetingId);
      });

      // Convert to array and calculate trend
      const mentionsArray = Array.from(mentionsByDate.entries())
        .map(([dateStr, data]) => ({
          date: new Date(dateStr),
          count: data.count,
          meetingIds: Array.from(data.meetingIds),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const totalMentions = mentions.length;

      // Calculate trend
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let changePercent = 0;

      if (mentionsArray.length >= 2) {
        const firstHalf = mentionsArray.slice(0, Math.floor(mentionsArray.length / 2));
        const secondHalf = mentionsArray.slice(Math.floor(mentionsArray.length / 2));

        const firstHalfAvg =
          firstHalf.reduce((sum, m) => sum + m.count, 0) / firstHalf.length;
        const secondHalfAvg =
          secondHalf.reduce((sum, m) => sum + m.count, 0) / secondHalf.length;

        changePercent = firstHalfAvg > 0
          ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
          : 0;

        if (changePercent > 10) {
          trend = 'increasing';
        } else if (changePercent < -10) {
          trend = 'decreasing';
        }
      }

      // Find peak
      const peak = mentionsArray.reduce(
        (max, m) => (m.count > max.count ? m : max),
        { date: new Date(), count: 0, meetingIds: [] }
      );

      return {
        trackerId: tracker.id,
        trackerName: tracker.name,
        keyword: tracker.keywords[0], // Primary keyword
        timeRange: { start: startDate, end: endDate },
        mentions: mentionsArray,
        totalMentions,
        trend,
        changePercent: Math.round(changePercent),
        peakDate: peak.count > 0 ? peak.date : undefined,
        peakCount: peak.count > 0 ? peak.count : undefined,
      };
    } catch (error) {
      logger.error('Error getting topic trend', { error, trackerId });
      return null;
    }
  }

  /**
   * Get comprehensive topic analytics
   */
  async getTopicAnalytics(
    trackerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TopicAnalytics | null> {
    try {
      const tracker = await this.getTracker(trackerId);

      if (!tracker) {
        return null;
      }

      const mentions = await this.getMentions(trackerId, { startDate, endDate });

      if (mentions.length === 0) {
        return {
          trackerId: tracker.id,
          totalMeetings: 0,
          totalMentions: 0,
          averageMentionsPerMeeting: 0,
          topKeywords: [],
          sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
          topSpeakers: [],
          correlatedTopics: [],
        };
      }

      // Count unique meetings
      const uniqueMeetings = new Set(mentions.map(m => m.meetingId));
      const totalMeetings = uniqueMeetings.size;
      const totalMentions = mentions.length;
      const averageMentionsPerMeeting = totalMentions / totalMeetings;

      // Top keywords
      const keywordCounts: Record<string, number> = {};
      mentions.forEach(m => {
        keywordCounts[m.keyword] = (keywordCounts[m.keyword] || 0) + 1;
      });

      const topKeywords = Object.entries(keywordCounts)
        .map(([keyword, count]) => ({
          keyword,
          count,
          percentage: Math.round((count / totalMentions) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Sentiment distribution
      const sentimentDistribution = {
        positive: mentions.filter(m => m.sentiment === 'positive').length,
        neutral: mentions.filter(m => m.sentiment === 'neutral').length,
        negative: mentions.filter(m => m.sentiment === 'negative').length,
      };

      // Top speakers
      const speakerCounts: Record<string, number> = {};
      mentions.forEach(m => {
        if (m.speaker) {
          speakerCounts[m.speaker] = (speakerCounts[m.speaker] || 0) + 1;
        }
      });

      const topSpeakers = Object.entries(speakerCounts)
        .map(([speaker, mentionCount]) => ({ speaker, mentionCount }))
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 10);

      // Find correlated topics (topics mentioned in same meetings)
      const correlatedTopics: Array<{ topic: string; correlation: number }> = [];

      // Get all other trackers from Organization.settings
      const org = await prisma.organization.findUnique({
        where: { id: tracker.organizationId },
      });

      const settings = (org?.settings as any) || {};
      const allTrackers: TopicTracker[] = settings.topicTrackers || [];
      const otherTrackers = allTrackers.filter(t =>
        t.id !== trackerId && t.isActive
      );

      for (const otherTracker of otherTrackers) {
        // Get mentions for this tracker from the same meetings
        const meetings = await prisma.meeting.findMany({
          where: { id: { in: Array.from(uniqueMeetings) } },
        });

        let otherMentionsCount = 0;

        for (const meeting of meetings) {
          const metadata = (meeting.metadata as any) || {};
          const topicMentions: TopicMention[] = metadata.topicMentions || [];
          const otherTrackerMentions = topicMentions.filter(m => m.trackerId === otherTracker.id);
          if (otherTrackerMentions.length > 0) {
            otherMentionsCount++;
          }
        }

        if (otherMentionsCount > 0) {
          const correlation = otherMentionsCount / totalMeetings;
          if (correlation > 0.2) {
            // At least 20% correlation
            correlatedTopics.push({
              topic: otherTracker.name,
              correlation: Math.round(correlation * 100),
            });
          }
        }
      }

      correlatedTopics.sort((a, b) => b.correlation - a.correlation);

      return {
        trackerId: tracker.id,
        totalMeetings,
        totalMentions,
        averageMentionsPerMeeting: Math.round(averageMentionsPerMeeting * 10) / 10,
        topKeywords,
        sentimentDistribution,
        topSpeakers,
        correlatedTopics: correlatedTopics.slice(0, 5),
      };
    } catch (error) {
      logger.error('Error getting topic analytics', { error, trackerId });
      return null;
    }
  }

  /**
   * Search topics across all trackers
   */
  async searchTopics(
    organizationId: string,
    query: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      sentiment?: 'positive' | 'neutral' | 'negative';
    }
  ): Promise<TopicMention[]> {
    try {
      // Get all meetings for this organization
      const meetings = await prisma.meeting.findMany({
        where: { organizationId },
      });

      let allMentions: TopicMention[] = [];

      for (const meeting of meetings) {
        const metadata = (meeting.metadata as any) || {};
        const topicMentions: TopicMention[] = metadata.topicMentions || [];
        allMentions.push(...topicMentions);
      }

      // Apply filters
      if (filters?.sentiment) {
        allMentions = allMentions.filter(m => m.sentiment === filters.sentiment);
      }

      if (filters?.startDate || filters?.endDate) {
        allMentions = allMentions.filter(m => {
          const createdAt = new Date(m.createdAt);
          if (filters.startDate && createdAt < filters.startDate) return false;
          if (filters.endDate && createdAt > filters.endDate) return false;
          return true;
        });
      }

      // Filter by query in context
      const queryLower = query.toLowerCase();
      const filtered = allMentions.filter(m =>
        m.context.toLowerCase().includes(queryLower) ||
        m.keyword.toLowerCase().includes(queryLower)
      );

      // Sort by createdAt descending
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Limit to 100 results
      return filtered.slice(0, 100);
    } catch (error) {
      logger.error('Error searching topics', { error });
      throw error;
    }
  }
}

export const topicTrackerService = new TopicTrackerService();
