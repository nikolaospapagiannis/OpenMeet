'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Calendar, MessageSquare, Download, Activity } from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle, CardGlassDescription } from '@/components/ui/card-glass';
import { useAnalyticsData, getDateRangeFromPreset } from '@/hooks/useAnalyticsData';
import { MeetingVolumeChart } from '@/components/analytics/MeetingVolumeChart';
import { ParticipantLeaderboard } from '@/components/analytics/ParticipantLeaderboard';
import { EngagementMetrics } from '@/components/analytics/EngagementMetrics';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { ExportReportModal } from '@/components/analytics/ExportReportModal';

export default function AnalyticsPage() {
  const { data, meetingData, engagementData, loading, error, dateRange, setDateRange, refresh } = useAnalyticsData();
  const [showExportModal, setShowExportModal] = useState(false);

  const handleDateRangeChange = (preset: any, start: Date, end: Date) => {
    setDateRange({ start, end, preset });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate percentage changes (mock data for now)
  const changes = {
    meetings: '+12',
    duration: '+8',
    participants: '+5',
    transcripts: '+15',
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-6">
      {/* Header with Date Filter and Export */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-slate-400 mt-1">Track meeting trends, participation, and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeFilter
              preset={dateRange.preset}
              startDate={dateRange.start}
              endDate={dateRange.end}
              onRangeChange={handleDateRangeChange}
            />
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CardGlass padding="none">
          <CardGlassContent className="p-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <span className={`text-xs font-medium ${changes.meetings.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                {changes.meetings}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : data?.overview.totalMeetings || 0}
            </p>
            <p className="text-sm text-slate-400">Total Meetings</p>
          </CardGlassContent>
        </CardGlass>

        <CardGlass padding="none">
          <CardGlassContent className="p-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <span className={`text-xs font-medium ${changes.duration.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                {changes.duration}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : formatDuration(data?.overview.totalDurationMinutes || 0)}
            </p>
            <p className="text-sm text-slate-400">Total Duration</p>
          </CardGlassContent>
        </CardGlass>

        <CardGlass padding="none">
          <CardGlassContent className="p-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <span className={`text-xs font-medium ${changes.participants.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                {changes.participants}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : data?.overview.activeUsers || 0}
            </p>
            <p className="text-sm text-slate-400">Active Users</p>
          </CardGlassContent>
        </CardGlass>

        <CardGlass padding="none">
          <CardGlassContent className="p-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-orange-400" />
              </div>
              <span className={`text-xs font-medium ${changes.transcripts.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                {changes.transcripts}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : data?.overview.totalTranscripts || 0}
            </p>
            <p className="text-sm text-slate-400">Transcripts</p>
          </CardGlassContent>
        </CardGlass>
      </div>

      {/* Meeting Volume Chart */}
      <div className="mb-6">
        <MeetingVolumeChart
          data={data?.trends.meetingsByDay || []}
          loading={loading}
        />
      </div>

      {/* Two Column Layout for Leaderboard and Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ParticipantLeaderboard
          participants={data?.topParticipants || []}
          loading={loading}
        />
        <EngagementMetrics
          data={engagementData}
          loading={loading}
        />
      </div>

      {/* Meeting Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Status */}
        <CardGlass padding="none">
          <CardGlassHeader className="p-6 pb-4">
            <CardGlassTitle>Meeting Status</CardGlassTitle>
            <CardGlassDescription>Breakdown by status</CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent className="p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              </div>
            ) : meetingData?.byStatus && meetingData.byStatus.length > 0 ? (
              <div className="space-y-3">
                {meetingData.byStatus.map((item) => {
                  const total = meetingData.byStatus.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (item.count / total * 100).toFixed(1) : '0';
                  const statusColors: Record<string, string> = {
                    completed: 'bg-emerald-500',
                    in_progress: 'bg-blue-500',
                    scheduled: 'bg-purple-500',
                    cancelled: 'bg-red-500',
                  };
                  return (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${statusColors[item.status] || 'bg-gray-500'}`} />
                        <span className="text-sm text-slate-300 capitalize">{item.status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white font-medium">{item.count}</span>
                        <span className="text-xs text-slate-500">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No data available</p>
              </div>
            )}
          </CardGlassContent>
        </CardGlass>

        {/* By Platform */}
        <CardGlass padding="none">
          <CardGlassHeader className="p-6 pb-4">
            <CardGlassTitle>Platform Usage</CardGlassTitle>
            <CardGlassDescription>Meetings by platform</CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent className="p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              </div>
            ) : meetingData?.byPlatform && meetingData.byPlatform.length > 0 ? (
              <div className="space-y-3">
                {meetingData.byPlatform.map((item) => {
                  const total = meetingData.byPlatform.reduce((sum, p) => sum + p.count, 0);
                  const percentage = total > 0 ? (item.count / total * 100).toFixed(1) : '0';
                  const platformColors: Record<string, string> = {
                    zoom: 'bg-blue-500',
                    teams: 'bg-purple-500',
                    meet: 'bg-green-500',
                    webex: 'bg-orange-500',
                  };
                  return (
                    <div key={item.platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${platformColors[item.platform] || 'bg-gray-500'}`} />
                        <span className="text-sm text-slate-300 capitalize">{item.platform}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white font-medium">{item.count}</span>
                        <span className="text-xs text-slate-500">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No data available</p>
              </div>
            )}
          </CardGlassContent>
        </CardGlass>

        {/* Quick Stats */}
        <CardGlass padding="none">
          <CardGlassHeader className="p-6 pb-4">
            <CardGlassTitle>Quick Stats</CardGlassTitle>
            <CardGlassDescription>Average metrics</CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent className="p-6 pt-0">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Avg Meeting Duration</p>
                <p className="text-xl font-bold text-white">
                  {loading ? '...' : formatDuration(data?.overview.averageMeetingDuration || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Avg Participants</p>
                <p className="text-xl font-bold text-white">
                  {loading ? '...' : meetingData?.averageParticipants || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Comments per Meeting</p>
                <p className="text-xl font-bold text-white">
                  {loading ? '...' :
                    (data?.overview.totalMeetings > 0
                      ? (data.overview.totalComments / data.overview.totalMeetings).toFixed(1)
                      : '0')}
                </p>
              </div>
            </div>
          </CardGlassContent>
        </CardGlass>
      </div>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={{
          overview: data?.overview,
          trends: data?.trends,
          topParticipants: data?.topParticipants,
          meetingData,
          engagementData,
        }}
        dateRange={dateRange}
      />
    </div>
  );
}