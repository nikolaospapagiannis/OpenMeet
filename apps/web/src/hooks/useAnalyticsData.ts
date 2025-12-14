'use client';

import { useState, useEffect, useCallback } from 'react';
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

export type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | '30days' | '90days' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
  preset: DatePreset;
}

interface AnalyticsOverview {
  totalMeetings: number;
  completedMeetings: number;
  totalDurationMinutes: number;
  totalTranscripts: number;
  totalSummaries: number;
  totalComments: number;
  activeUsers: number;
  averageMeetingDuration: number;
}

interface MeetingTrend {
  date: string;
  count: number;
}

interface TopParticipant {
  email: string;
  meetingCount: number;
  totalTalkTimeMinutes: number;
}

interface AnalyticsData {
  period: { start: Date; end: Date };
  overview: AnalyticsOverview;
  trends: {
    meetingsByDay: MeetingTrend[];
  };
  topParticipants: TopParticipant[];
}

interface MeetingAnalytics {
  period: { start: Date; end: Date };
  byStatus: Array<{ status: string; count: number }>;
  byPlatform: Array<{ platform: string; count: number }>;
  averageParticipants: number;
}

interface EngagementAnalytics {
  period: { start: Date; end: Date };
  totalComments: number;
  totalSoundbites: number;
  mostCommentedMeetings: Array<{
    id: string;
    title: string;
    commentCount: number;
  }>;
  mostClippedMeetings: Array<{
    id: string;
    title: string;
    clipCount: number;
  }>;
}

interface UseAnalyticsDataReturn {
  data: AnalyticsData | null;
  meetingData: MeetingAnalytics | null;
  engagementData: EngagementAnalytics | null;
  loading: boolean;
  error: Error | null;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  refresh: () => void;
}

export function getDateRangeFromPreset(preset: DatePreset, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case '30days':
      return { start: subDays(now, 30), end: now };
    case '90days':
      return { start: subDays(now, 90), end: now };
    case 'custom':
      return {
        start: customStart || subDays(now, 30),
        end: customEnd || now
      };
    default:
      return { start: subDays(now, 30), end: now };
  }
}

export function useAnalyticsData(): UseAnalyticsDataReturn {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [meetingData, setMeetingData] = useState<MeetingAnalytics | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    ...getDateRangeFromPreset('30days'),
    preset: '30days',
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      // Fetch all analytics data in parallel
      const [dashboardRes, meetingsRes, engagementRes] = await Promise.all([
        fetch(`/api/analytics/dashboard?${params}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/analytics/meetings?${params}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/analytics/engagement?${params}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!dashboardRes.ok) {
        throw new Error(`Dashboard API error: ${dashboardRes.status}`);
      }
      if (!meetingsRes.ok) {
        throw new Error(`Meetings API error: ${meetingsRes.status}`);
      }
      if (!engagementRes.ok) {
        throw new Error(`Engagement API error: ${engagementRes.status}`);
      }

      const [dashboardData, meetingAnalytics, engagementAnalytics] = await Promise.all([
        dashboardRes.json(),
        meetingsRes.json(),
        engagementRes.json(),
      ]);

      setData(dashboardData);
      setMeetingData(meetingAnalytics);
      setEngagementData(engagementAnalytics);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));

      // Set mock data for development
      setData({
        period: { start: dateRange.start, end: dateRange.end },
        overview: {
          totalMeetings: 124,
          completedMeetings: 118,
          totalDurationMinutes: 3720,
          totalTranscripts: 118,
          totalSummaries: 98,
          totalComments: 256,
          activeUsers: 42,
          averageMeetingDuration: 31,
        },
        trends: {
          meetingsByDay: generateMockTrends(dateRange.start, dateRange.end),
        },
        topParticipants: [
          { email: 'john.doe@example.com', meetingCount: 45, totalTalkTimeMinutes: 890 },
          { email: 'jane.smith@example.com', meetingCount: 38, totalTalkTimeMinutes: 720 },
          { email: 'mike.wilson@example.com', meetingCount: 32, totalTalkTimeMinutes: 615 },
          { email: 'sarah.johnson@example.com', meetingCount: 28, totalTalkTimeMinutes: 540 },
          { email: 'robert.brown@example.com', meetingCount: 24, totalTalkTimeMinutes: 450 },
        ],
      });

      setMeetingData({
        period: { start: dateRange.start, end: dateRange.end },
        byStatus: [
          { status: 'completed', count: 118 },
          { status: 'in_progress', count: 3 },
          { status: 'scheduled', count: 3 },
        ],
        byPlatform: [
          { platform: 'zoom', count: 68 },
          { platform: 'teams', count: 42 },
          { platform: 'meet', count: 14 },
        ],
        averageParticipants: 5,
      });

      setEngagementData({
        period: { start: dateRange.start, end: dateRange.end },
        totalComments: 256,
        totalSoundbites: 89,
        mostCommentedMeetings: [
          { id: '1', title: 'Q4 Planning Session', commentCount: 24 },
          { id: '2', title: 'Product Roadmap Review', commentCount: 18 },
          { id: '3', title: 'Team Retrospective', commentCount: 15 },
        ],
        mostClippedMeetings: [
          { id: '1', title: 'All Hands Meeting', clipCount: 12 },
          { id: '2', title: 'Customer Success Review', clipCount: 8 },
          { id: '3', title: 'Engineering Sync', clipCount: 6 },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    meetingData,
    engagementData,
    loading,
    error,
    dateRange,
    setDateRange,
    refresh: fetchAnalytics,
  };
}

// Helper function to generate mock trend data
function generateMockTrends(start: Date, end: Date): MeetingTrend[] {
  const trends: MeetingTrend[] = [];
  const current = new Date(start);

  while (current <= end) {
    trends.push({
      date: current.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 8) + 1,
    });
    current.setDate(current.getDate() + 1);
  }

  return trends;
}