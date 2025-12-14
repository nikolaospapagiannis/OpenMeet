'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  MoreVertical,
  Video,
  Bot
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle,
  CardGlassDescription
} from '@/components/ui/card-glass';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { formatDateTime, formatDuration, getPlatformIcon, getSentimentEmoji } from '@/lib/utils';
import { EmptyMeetingsList } from '@/components/meetings/EmptyMeetingsList';
import { GettingStartedChecklist } from '@/components/meetings/GettingStartedChecklist';
import { QuickUploadCard } from '@/components/meetings/QuickUploadCard';
import { MeetingFilters } from '@/components/meetings/MeetingFilters';
import { useMeetingFilters } from '@/hooks/useMeetingFilters';

interface Meeting {
  id: string;
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  duration: number;
  status: string;
  platform: string;
  attendeesCount: number;
  transcript?: {
    id: string;
    wordCount: number;
    speakerCount: number;
  };
  analysis?: {
    summary: string;
    actionItemsCount: number;
    sentiment: number;
    topicsCount: number;
  };
  recording?: {
    id: string;
    size: number;
    downloadUrl: string;
  };
}

export default function MeetingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const filterState = useMeetingFilters();
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const pageSize = 20;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchMeetings();
    }
  }, [user, authLoading, router, currentPage, filterState.filters]);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      // Convert filter duration to API format if needed
      const apiFilters = { ...filterState.filters };

      // Handle duration filter conversion
      if (apiFilters.duration) {
        // Duration filter is informational only in UI, backend handles via durationSeconds
        delete apiFilters.duration;
      }

      const data = await apiClient.getMeetings({
        search: searchQuery,
        page: currentPage,
        limit: pageSize,
        ...apiFilters
      });

      setMeetings(data?.meetings || []);
      setTotalCount(data?.total || 0);

      // Check if this is a first-time user (no meetings and no filters/search)
      const hasNoMeetings = !data?.meetings || data.meetings.length === 0;
      const hasNoFilters = !searchQuery && filterState.activeFilterCount === 0;
      setIsFirstTimeUser(hasNoMeetings && hasNoFilters && data?.total === 0);

      // Update completed steps based on user progress
      const steps: string[] = [];
      if (data?.total > 0 && data?.meetings?.length > 0) {
        steps.push('upload-meeting');

        // Check if any meeting has transcripts or analysis
        const hasAnalysis = data.meetings.some((m: Meeting) => m.transcript || m.analysis);
        if (hasAnalysis) {
          steps.push('review-summary');
        }
      }
      setCompletedSteps(steps);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setMeetings([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchMeetings();
  };

  const handleSelectMeeting = (meetingId: string) => {
    const newSelection = new Set(selectedMeetings);
    if (newSelection.has(meetingId)) {
      newSelection.delete(meetingId);
    } else {
      newSelection.add(meetingId);
    }
    setSelectedMeetings(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedMeetings.size === meetings.length) {
      setSelectedMeetings(new Set());
    } else {
      setSelectedMeetings(new Set(meetings.map(m => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMeetings.size === 0) {
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete ${selectedMeetings.size} meetings?`);
    if (confirmed) {
      try {
        await Promise.all(
          Array.from(selectedMeetings).map(id => apiClient.deleteMeeting(id))
        );
        setSelectedMeetings(new Set());
        fetchMeetings();
      } catch (error) {
        console.error('Failed to delete meetings:', error);
      }
    }
  };

  const handleExport = async () => {
    try {
      const data = await apiClient.exportMeetings({
        meetingIds: Array.from(selectedMeetings),
        format: 'csv'
      });

      // Create download link
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meetings-export-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Failed to export meetings:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleUploadClick = () => {
    router.push('/meetings/upload');
  };

  const handleConnectCalendar = () => {
    router.push('/settings/integrations');
  };

  const handleStartRecording = () => {
    router.push('/meetings/live');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <header className="bg-slate-900/40 backdrop-blur-sm border-b border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-white">All Meetings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/meetings/new')}
                className="bg-gradient-to-r from-[#7a5af8] to-[#a855f7] hover:from-[#6b4ce0] hover:to-[#9333ea] text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show Empty State for First-Time Users */}
        {isFirstTimeUser ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <EmptyMeetingsList
                onUploadClick={handleUploadClick}
                onConnectCalendar={handleConnectCalendar}
                onStartRecording={handleStartRecording}
              />
            </div>
            <div className="lg:w-80">
              <div className="sticky top-6 space-y-6">
                <GettingStartedChecklist completedSteps={completedSteps} />
                <QuickUploadCard
                  onUploadComplete={(file) => {
                    console.log('File uploaded:', file);
                    // Handle upload completion
                  }}
                  onOpenFullModal={handleUploadClick}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Getting Started Sidebar for Users with Meetings */}
        {!isFirstTimeUser && totalCount > 0 && completedSteps.length < 4 && (
          <div className="mb-6 flex justify-end">
            <GettingStartedChecklist completedSteps={completedSteps} />
          </div>
        )}

        {/* Search Bar */}
        <CardGlass variant="default" padding="md" className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by title, attendees, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>
            <div className="flex gap-2">
              {selectedMeetings.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBulkDelete}
                    className="border-red-900/50 bg-red-900/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 hover:border-red-800"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedMeetings.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardGlass>

        {/* Advanced Filters */}
        <CardGlass variant="default" padding="md" className="mb-6">
          <MeetingFilters
            filterState={filterState}
            isExpanded={showFilters}
            onToggle={() => setShowFilters(!showFilters)}
            resultCount={totalCount}
          />
        </CardGlass>

        {/* Meetings List */}
        <CardGlass variant="default" padding="none">
          <CardGlassHeader className="p-6 lg:p-8">
            <div className="flex justify-between items-center">
              <div>
                <CardGlassTitle>Meetings</CardGlassTitle>
                <CardGlassDescription>
                  {totalCount} total meetings
                </CardGlassDescription>
              </div>
              {meetings.length > 0 && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedMeetings.size === meetings.length}
                    onChange={handleSelectAll}
                    className="mr-2 rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500/20"
                  />
                  <span className="text-sm text-slate-400">Select All</span>
                </div>
              )}
            </div>
          </CardGlassHeader>
          <CardGlassContent className="p-6 lg:p-8 pt-0 lg:pt-0">
            {meetings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No meetings found</p>
                <p className="text-sm text-slate-500 mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center p-4 border border-[#1e293b] rounded-lg bg-slate-900/30 hover:bg-slate-800/50 hover:border-slate-700 transition-all duration-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMeetings.has(meeting.id)}
                      onChange={() => handleSelectMeeting(meeting.id)}
                      className="mr-4 rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500/20"
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div
                      className="flex-1 flex items-center justify-between cursor-pointer"
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {getPlatformIcon(meeting.platform)}
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{meeting.title}</h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-slate-400">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {formatDateTime(meeting.scheduledStartAt)}
                            </span>
                            <span className="text-sm text-slate-400">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {formatDuration(meeting.duration)}
                            </span>
                            <span className="text-sm text-slate-400">
                              <Users className="inline h-3 w-3 mr-1" />
                              {meeting.attendeesCount}
                            </span>
                            {meeting.analysis && (
                              <span className="text-sm text-slate-400">
                                {getSentimentEmoji(meeting.analysis.sentiment)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {meeting.transcript && (
                            <div className="flex items-center text-sm text-slate-400">
                              <FileText className="h-4 w-4" />
                            </div>
                          )}
                          {meeting.recording && (
                            <div className="flex items-center text-sm text-slate-400">
                              <Video className="h-4 w-4" />
                            </div>
                          )}
                          {meeting.analysis && (
                            <div className="flex items-center text-sm text-purple-400">
                              <Bot className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <StatusBadge status={meeting.status} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-white hover:bg-slate-800/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle menu
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardGlassContent>
        </CardGlass>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </Button>
            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

/**
 * Status badge component with dark theme styling
 */
function StatusBadge({ status }: { status: string }) {
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50';
      case 'in_progress':
        return 'bg-blue-900/30 text-blue-400 border-blue-700/50';
      case 'scheduled':
        return 'bg-purple-900/30 text-purple-400 border-purple-700/50';
      case 'cancelled':
        return 'bg-red-900/30 text-red-400 border-red-700/50';
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusStyles(status)}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
