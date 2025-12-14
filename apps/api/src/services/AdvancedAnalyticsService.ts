/**
 * Advanced Analytics Dashboard Service
 *
 * Comprehensive analytics and insights across all meetings
 * Competitive Feature: Advanced reporting and data visualization
 *
 * Features:
 * - Meeting trends and patterns
 * - Speaker analytics (talk time, participation)
 * - Topic modeling and trending topics
 * - Sentiment analysis over time
 * - Action item completion rates
 * - Custom date ranges and filters
 * - Exportable reports
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AnalyticsDashboard {
  timeRange: {
    start: Date;
    end: Date;
  };
  overview: {
    totalMeetings: number;
    totalDuration: number;
    totalParticipants: number;
    avgMeetingDuration: number;
    meetingsThisPeriod: number;
    changeFromPrevious: number;
  };
  meetingTrends: {
    daily: Array<{ date: string; count: number; duration: number }>;
    weekly: Array<{ week: string; count: number; duration: number }>;
    monthly: Array<{ month: string; count: number; duration: number }>;
  };
  speakerAnalytics: Array<{
    speaker: string;
    totalMeetings: number;
    totalTalkTime: number;
    avgTalkTime: number;
    participationRate: number;
  }>;
  topicAnalytics: {
    trendingTopics: Array<{ topic: string; count: number; trend: 'up' | 'down' | 'stable' }>;
    topicDistribution: Array<{ topic: string; percentage: number }>;
  };
  sentimentAnalytics: {
    overall: { positive: number; neutral: number; negative: number };
    trend: Array<{ date: string; sentiment: number }>;
  };
  actionItemAnalytics: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
    avgTimeToComplete: number;
  };
  platformAnalytics: {
    platformBreakdown: Array<{ platform: string; count: number; percentage: number }>;
  };
}

export interface CustomReport {
  id: string;
  name: string;
  organizationId: string;
  createdBy: string;
  filters: {
    dateRange?: { start: Date; end: Date };
    platforms?: string[];
    participants?: string[];
    tags?: string[];
  };
  metrics: string[];
  schedule?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  format: 'pdf' | 'csv' | 'json';
  createdAt: Date;
}

class AdvancedAnalyticsService {
  /**
   * Get comprehensive analytics dashboard
   */
  async getDashboard(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard> {
    try {
      const [
        overview,
        meetingTrends,
        speakerAnalytics,
        topicAnalytics,
        sentimentAnalytics,
        actionItemAnalytics,
        platformAnalytics,
      ] = await Promise.all([
        this.getOverview(organizationId, startDate, endDate),
        this.getMeetingTrends(organizationId, startDate, endDate),
        this.getSpeakerAnalytics(organizationId, startDate, endDate),
        this.getTopicAnalytics(organizationId, startDate, endDate),
        this.getSentimentAnalytics(organizationId, startDate, endDate),
        this.getActionItemAnalytics(organizationId, startDate, endDate),
        this.getPlatformAnalytics(organizationId, startDate, endDate),
      ]);

      return {
        timeRange: { start: startDate, end: endDate },
        overview,
        meetingTrends,
        speakerAnalytics,
        topicAnalytics,
        sentimentAnalytics,
        actionItemAnalytics,
        platformAnalytics,
      };
    } catch (error) {
      logger.error('Error getting analytics dashboard', { error });
      throw error;
    }
  }

  /**
   * Get overview statistics
   */
  private async getOverview(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard['overview']> {
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      include: {
        participants: true,
      },
    });

    // Calculate previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodLength);
    const prevEnd = new Date(startDate);

    const prevMeetings = await prisma.meeting.count({
      where: {
        organizationId,
        scheduledStartAt: { gte: prevStart, lte: prevEnd },
        status: 'completed',
      },
    });

    const totalDuration = meetings.reduce((sum, m) => sum + (m.durationSeconds || 0), 0);
    const totalParticipants = meetings.reduce(
      (sum, m) => sum + m.participants.length,
      0
    );

    const change = prevMeetings > 0
      ? ((meetings.length - prevMeetings) / prevMeetings) * 100
      : 100;

    return {
      totalMeetings: meetings.length,
      totalDuration,
      totalParticipants,
      avgMeetingDuration: meetings.length ? Math.floor(totalDuration / meetings.length) : 0,
      meetingsThisPeriod: meetings.length,
      changeFromPrevious: Math.round(change),
    };
  }

  /**
   * Get meeting trends
   */
  private async getMeetingTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard['meetingTrends']> {
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        scheduledStartAt: true,
        durationSeconds: true,
      },
    });

    // Daily trends
    const dailyMap = new Map<string, { count: number; duration: number }>();
    meetings.forEach(m => {
      const date = m.scheduledStartAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { count: 0, duration: 0 };
      dailyMap.set(date, {
        count: existing.count + 1,
        duration: existing.duration + (m.durationSeconds || 0),
      });
    });

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      duration: data.duration,
    }));

    // Weekly trends
    const weeklyMap = new Map<string, { count: number; duration: number }>();
    meetings.forEach(m => {
      const week = this.getWeekIdentifier(m.scheduledStartAt);
      const existing = weeklyMap.get(week) || { count: 0, duration: 0 };
      weeklyMap.set(week, {
        count: existing.count + 1,
        duration: existing.duration + (m.durationSeconds || 0),
      });
    });

    const weekly = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      count: data.count,
      duration: data.duration,
    }));

    // Monthly trends
    const monthlyMap = new Map<string, { count: number; duration: number }>();
    meetings.forEach(m => {
      const month = m.scheduledStartAt.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { count: 0, duration: 0 };
      monthlyMap.set(month, {
        count: existing.count + 1,
        duration: existing.duration + (m.durationSeconds || 0),
      });
    });

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      duration: data.duration,
    }));

    return { daily, weekly, monthly };
  }

  /**
   * Get speaker analytics
   */
  private async getSpeakerAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard['speakerAnalytics']> {
    // Get meeting participants instead of transcripts
    const participants = await prisma.meetingParticipant.findMany({
      where: {
        meeting: {
          organizationId,
          scheduledStartAt: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      },
      select: {
        name: true,
        email: true,
        talkTimeSeconds: true,
        meetingId: true,
      },
    });

    const speakerMap = new Map<string, {
      meetings: Set<string>;
      totalTalkTime: number;
      segments: number;
    }>();

    participants.forEach(p => {
      const speakerName = p.name || p.email || 'Unknown';
      const talkTime = p.talkTimeSeconds || 0;

      const existing = speakerMap.get(speakerName) || {
        meetings: new Set(),
        totalTalkTime: 0,
        segments: 0,
      };

      existing.meetings.add(p.meetingId);
      existing.totalTalkTime += talkTime;
      existing.segments += 1;

      speakerMap.set(speakerName, existing);
    });

    return Array.from(speakerMap.entries())
      .map(([speaker, data]) => ({
        speaker,
        totalMeetings: data.meetings.size,
        totalTalkTime: Math.floor(data.totalTalkTime),
        avgTalkTime: data.meetings.size ? Math.floor(data.totalTalkTime / data.meetings.size) : 0,
        participationRate: data.meetings.size ? data.segments / data.meetings.size : 0,
      }))
      .sort((a, b) => b.totalTalkTime - a.totalTalkTime)
      .slice(0, 20); // Top 20 speakers
  }

  /**
   * Get topic analytics
   */
  private async getTopicAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard['topicAnalytics']> {
    // Simple implementation - can be enhanced with NLP
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        metadata: true,
      },
    });

    const topicCounts = new Map<string, number>();
    meetings.forEach(m => {
      const tags = ((m.metadata as any)?.tags || []) as string[];
      tags.forEach((tag: string) => {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      });
    });

    const sortedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const total = Array.from(topicCounts.values()).reduce((sum, count) => sum + count, 0);

    return {
      trendingTopics: sortedTopics.map(([topic, count]) => ({
        topic,
        count,
        trend: 'stable' as const, // Would need historical comparison
      })),
      topicDistribution: sortedTopics.map(([topic, count]) => ({
        topic,
        percentage: Math.round((count / total) * 100),
      })),
    };
  }

  /**
   * Get sentiment analytics
   */
  private async getSentimentAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard['sentimentAnalytics']> {
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        scheduledStartAt: true,
        metadata: true,
      },
    });

    // Overall sentiment distribution
    let positive = 0, neutral = 0, negative = 0;
    meetings.forEach(m => {
      const sentiment = (m as any).sentiment || 'neutral';
      if (sentiment === 'positive') positive++;
      else if (sentiment === 'negative') negative++;
      else neutral++;
    });

    const total = meetings.length || 1;

    // Sentiment trend over time
    const trendMap = new Map<string, number[]>();
    meetings.forEach(m => {
      const date = m.scheduledStartAt.toISOString().split('T')[0];
      const sentimentScore = (m as any).sentiment === 'positive' ? 1 : (m as any).sentiment === 'negative' ? -1 : 0;

      const existing = trendMap.get(date) || [];
      existing.push(sentimentScore);
      trendMap.set(date, existing);
    });

    const trend = Array.from(trendMap.entries()).map(([date, scores]) => ({
      date,
      sentiment: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    }));

    return {
      overall: {
        positive: Math.round((positive / total) * 100),
        neutral: Math.round((neutral / total) * 100),
        negative: Math.round((negative / total) * 100),
      },
      trend,
    };
  }

  /**
   * Get action item analytics
   */
  private async getActionItemAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard['actionItemAnalytics']> {
    // Get action items from meeting summaries
    const summaries = await prisma.meetingSummary.findMany({
      where: {
        meeting: {
          organizationId,
          scheduledStartAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        actionItems: true,
        createdAt: true,
      },
    });

    // Extract and flatten action items from JSON
    const actionItems: Array<{
      status: string;
      dueDate?: Date;
      completedAt?: Date;
      createdAt: Date;
    }> = [];

    summaries.forEach(summary => {
      const items = (summary.actionItems as any) || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          actionItems.push({
            status: item.status || 'pending',
            dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
            createdAt: summary.createdAt,
          });
        });
      }
    });

    const total = actionItems.length;
    const completed = actionItems.filter(a => a.status === 'completed').length;
    const pending = actionItems.filter(a => a.status === 'pending').length;
    const overdue = actionItems.filter(
      a => a.status !== 'completed' && a.dueDate && a.dueDate < new Date()
    ).length;

    // Calculate avg time to complete
    const completedItems = actionItems.filter(a => a.completedAt);
    const totalTime = completedItems.reduce((sum, item) => {
      if (item.completedAt) {
        return sum + (item.completedAt.getTime() - item.createdAt.getTime());
      }
      return sum;
    }, 0);

    const avgTimeToComplete = completedItems.length
      ? Math.floor(totalTime / completedItems.length / (24 * 60 * 60 * 1000)) // days
      : 0;

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      avgTimeToComplete,
    };
  }

  /**
   * Get platform analytics
   */
  private async getPlatformAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDashboard['platformAnalytics']> {
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        platform: true,
      },
    });

    const platformCounts = new Map<string, number>();
    meetings.forEach(m => {
      platformCounts.set(m.platform, (platformCounts.get(m.platform) || 0) + 1);
    });

    const total = meetings.length || 1;

    const platformBreakdown = Array.from(platformCounts.entries()).map(([platform, count]) => ({
      platform,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    return { platformBreakdown };
  }

  /**
   * Create custom report
   */
  async createCustomReport(
    organizationId: string,
    userId: string,
    report: Omit<CustomReport, 'id' | 'organizationId' | 'createdBy' | 'createdAt'>
  ): Promise<CustomReport> {
    try {
      // Store custom report in organization metadata
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const reportId = `report_${Date.now()}`;
      const customReport = {
        id: reportId,
        organizationId,
        createdBy: userId,
        name: report.name,
        filters: report.filters,
        metrics: report.metrics,
        schedule: report.schedule,
        recipients: report.recipients,
        format: report.format,
        createdAt: new Date(),
      };

      const existingReports = ((org?.metadata as any)?.customReports || []) as any[];
      existingReports.push(customReport);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          metadata: {
            ...(org?.metadata as any),
            customReports: existingReports,
          } as any,
        },
      });

      logger.info('Custom report created', { reportId });

      return customReport as any;
    } catch (error) {
      logger.error('Error creating custom report', { error });
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportData(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json' | 'pdf'
  ): Promise<string> {
    try {
      const dashboard = await this.getDashboard(organizationId, startDate, endDate);

      if (format === 'json') {
        return JSON.stringify(dashboard, null, 2);
      }

      if (format === 'csv') {
        return this.convertToCSV(dashboard);
      }

      // PDF export would require additional library
      throw new Error('PDF export not yet implemented');
    } catch (error) {
      logger.error('Error exporting analytics data', { error });
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get week identifier (YYYY-Www format)
   */
  private getWeekIdentifier(date: Date): string {
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + oneJan.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Convert dashboard data to CSV
   */
  private convertToCSV(dashboard: AnalyticsDashboard): string {
    let csv = 'OpenMeet Analytics Report\n\n';

    // Overview
    csv += 'Overview\n';
    csv += 'Metric,Value\n';
    csv += `Total Meetings,${dashboard.overview.totalMeetings}\n`;
    csv += `Total Duration (seconds),${dashboard.overview.totalDuration}\n`;
    csv += `Total Participants,${dashboard.overview.totalParticipants}\n`;
    csv += `Average Meeting Duration,${dashboard.overview.avgMeetingDuration}\n\n`;

    // Speaker Analytics
    csv += 'Speaker Analytics\n';
    csv += 'Speaker,Meetings,Talk Time,Avg Talk Time\n';
    dashboard.speakerAnalytics.forEach(s => {
      csv += `${s.speaker},${s.totalMeetings},${s.totalTalkTime},${s.avgTalkTime}\n`;
    });

    return csv;
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
