'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Calendar, Clock, Users, CheckCircle, Circle, AlertCircle, Video } from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle, CardGlassDescription } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api';

interface Meeting {
  id: string;
  title: string;
  platform: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  attendees?: any[];
}

export default function MeetingStatusPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getMeetings({ limit: 50 });
      setMeetings(response?.meetings || []);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setMeetings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'in_progress':
        return <Circle className="h-5 w-5 text-blue-400 animate-pulse" />;
      case 'scheduled':
        return <Clock className="h-5 w-5 text-orange-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      completed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      scheduled: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
      failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
    return badges[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Completed',
      in_progress: 'In Progress',
      scheduled: 'Scheduled',
      cancelled: 'Cancelled',
      failed: 'Failed',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ff-bg-dark)] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-[var(--ff-text-secondary)]">Loading meeting status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="heading-l text-[var(--ff-text-primary)] mb-2">Meeting Status</h1>
              <p className="paragraph-l text-[var(--ff-text-secondary)]">
                Track the status of all your meetings in real-time
              </p>
            </div>
            <Button
              onClick={fetchMeetings}
              className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] text-[var(--ff-text-primary)] hover:bg-[var(--ff-border)] transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CardGlass variant="elevated" hover>
            <CardGlassContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--ff-text-secondary)] mb-1">Total Meetings</p>
                  <p className="text-3xl font-bold text-[var(--ff-text-primary)]">{meetings.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>

          <CardGlass variant="elevated" hover>
            <CardGlassContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--ff-text-secondary)] mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {meetings.filter((m) => m.status === 'in_progress').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                  <Circle className="h-6 w-6 text-blue-400 animate-pulse" />
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>

          <CardGlass variant="elevated" hover>
            <CardGlassContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--ff-text-secondary)] mb-1">Scheduled</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {meetings.filter((m) => m.status === 'scheduled').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>

          <CardGlass variant="elevated" hover>
            <CardGlassContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--ff-text-secondary)] mb-1">Completed</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {meetings.filter((m) => m.status === 'completed').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>
        </div>

        {/* Meetings List */}
        <CardGlass>
          <CardGlassHeader>
            <CardGlassTitle>All Meetings</CardGlassTitle>
            <CardGlassDescription>View and track the status of all your meetings</CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent>
            {meetings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-[var(--ff-text-primary)] mb-2">No meetings found</h3>
                <p className="text-[var(--ff-text-secondary)]">Your meetings will appear here once scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl hover:bg-white/5 hover:border-purple-500/30 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {getStatusIcon(meeting.status)}
                      <div className="flex-1">
                        <h4 className="font-medium text-[var(--ff-text-primary)]">{meeting.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[var(--ff-text-secondary)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(meeting.scheduledStartAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(meeting.scheduledStartAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          {meeting.attendees && meeting.attendees.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.attendees.length} attendees
                            </span>
                          )}
                          <span className="capitalize text-[var(--ff-text-muted)]">{meeting.platform}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          meeting.status
                        )}`}
                      >
                        {getStatusLabel(meeting.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardGlassContent>
        </CardGlass>
      </div>
    </div>
  );
}
