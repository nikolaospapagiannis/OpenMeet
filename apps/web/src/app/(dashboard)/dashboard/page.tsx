'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckSquare,
  Sparkles,
  Video,
  Plus,
  ExternalLink,
  MoreHorizontal,
  ChevronRight,
  Globe,
} from 'lucide-react';

import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { EmptyDashboard, EmptyRecentMeetings, EmptyTopics } from '@/components/empty-states';

interface Meeting {
  id: string;
  title: string;
  scheduledStartAt: string;
  platform: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlimitedTranscripts, setUnlimitedTranscripts] = useState(true);

  // Setup progress tracking for onboarding
  const [setupProgress, setSetupProgress] = useState({
    profileComplete: false,
    calendarConnected: false,
    firstMeeting: false,
    teamInvited: false,
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const meetingsData = await apiClient.getMeetings({ limit: 10 });
      const meetingsList = meetingsData?.meetings || [];
      setMeetings(meetingsList);

      // Update setup progress based on actual user data
      setSetupProgress({
        profileComplete: !!(user?.firstName && user?.lastName),
        calendarConnected: false, // TODO: Check for calendar integration
        firstMeeting: meetingsList.length > 0,
        teamInvited: false, // TODO: Check for team members
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setMeetings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserFirstName = () => {
    if (!user) return 'there';
    const firstName = user.firstName || user.email?.split('@')[0] || 'there';
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Determine if user is brand new (no meetings at all)
  const isNewUser = meetings.length === 0 && !setupProgress.firstMeeting;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding empty state for brand new users
  if (isNewUser) {
    return (
      <div className="flex">
        <div className="flex-1">
          <EmptyDashboard
            userName={getUserFirstName()}
            setupProgress={setupProgress}
          />
        </div>

        {/* Right Sidebar - Keep for consistency */}
        <div className="w-80 bg-slate-900/30 backdrop-blur-sm border-l border-white/10 p-6 space-y-6 overflow-y-auto relative">
          {/* Ambient glow for sidebar */}
          <div className="fixed right-0 top-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          {/* Unlimited Transcripts Widget */}
          <CardGlass
            variant="default"
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Unlimited Transcripts</span>
                <Badge className="text-xs bg-emerald-500 text-white border-0 px-2 py-0.5">
                  FREE
                </Badge>
              </div>
              <Switch
                checked={unlimitedTranscripts}
                onCheckedChange={setUnlimitedTranscripts}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-300">
              Enable to get unlimited meeting transcriptions
            </p>
          </CardGlass>

          {/* Upgrade Prompt Widget */}
          <CardGlass
            variant="elevated"
            gradient
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">Unlock Pro Features</span>
            </div>

            <ul className="space-y-3 mb-4">
              {[
                'Unlimited transcripts & AI notes',
                'AskFred AI assistant',
                'Download recordings',
                'Analytics & insights',
                '50+ integrations'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckSquare className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-200">{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/pricing" className="w-full">
              <Button variant="gradient-secondary" className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </CardGlass>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Main Dashboard Area */}
      <div className="flex-1 p-6">
        {/* Hero Section */}
        <CardGlass
          variant="elevated"
          padding="none"
          className="bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-slate-900/50 border-purple-500/30 rounded-2xl p-8 mb-6 relative overflow-hidden"
        >
          <div className="relative z-10">
            <h1 className="text-3xl font-semibold mb-2 text-white">
              {getGreeting()}, {getUserFirstName()}
            </h1>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input type="checkbox" className="rounded bg-slate-800/50 border-purple-500/30" />
              <span className="text-sm text-slate-300">Share Feedback</span>
            </label>
          </div>
          {/* Decorative orbs with purple theme */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-teal-500/10 rounded-full translate-y-1/2 blur-2xl"></div>
          <div className="absolute right-1/4 top-1/2 w-32 h-32 bg-pink-500/10 rounded-full blur-xl"></div>
        </CardGlass>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <CardGlass
            variant="default"
            padding="none"
            hover
            className="border-orange-500/30 hover:border-orange-500/50 transition-all group"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="h-5 w-5 text-orange-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold mb-1 text-white">0</div>
              <div className="text-sm text-slate-300">Meeting Preps</div>
              <div className="text-xs text-slate-500 mt-1">No preps scheduled</div>
            </CardContent>
          </CardGlass>

          <CardGlass
            variant="default"
            padding="none"
            hover
            className="border-emerald-500/30 hover:border-emerald-500/50 transition-all group"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckSquare className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold mb-1 text-white">0</div>
              <div className="text-sm text-slate-300">Tasks</div>
              <div className="text-xs text-slate-500 mt-1">All tasks complete</div>
            </CardContent>
          </CardGlass>

          <CardGlass
            variant="default"
            padding="none"
            hover
            className="border-purple-500/30 hover:border-purple-500/50 transition-all group"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold mb-1 text-white">0</div>
              <div className="text-sm text-slate-300">AI Apps</div>
              <div className="text-xs text-slate-500 mt-1">Browse AI marketplace</div>
            </CardContent>
          </CardGlass>
        </div>

        {/* Popular Topics */}
        <div className="mb-6">
          <EmptyTopics />
        </div>

        {/* Recent Meetings */}
        {meetings.length === 0 ? (
          <EmptyRecentMeetings />
        ) : (
          <CardGlass variant="default" padding="none" className="border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Recent Meetings</h3>
                <Link href="/meetings">
                  <Button variant="ghost-glass" size="sm" className="text-teal-400 hover:text-teal-300">
                    View More <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                    <div className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors border border-white/10 hover:border-teal-500/30">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        {meeting.platform === 'zoom' && (
                          <div className="w-5 h-5 bg-blue-500 rounded"></div>
                        )}
                        {meeting.platform === 'google_meet' && (
                          <Video className="h-5 w-5 text-emerald-400" />
                        )}
                        {meeting.platform === 'microsoft_teams' && (
                          <div className="w-5 h-5 bg-purple-500 rounded"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">
                          {meeting.title}
                        </h4>
                        <p className="text-sm text-slate-400">
                          {new Date(meeting.scheduledStartAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost-glass" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost-glass" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </CardGlass>
        )}
      </div>

      {/* Right Sidebar - Glassmorphism */}
      <div className="w-80 bg-slate-900/30 backdrop-blur-sm border-l border-white/10 p-6 space-y-6 overflow-y-auto relative">
        {/* Ambient glow for sidebar */}
        <div className="fixed right-0 top-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* OpenMeet Notetaker Widget */}
        <CardGlass variant="subtle" hover className="group">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">OpenMeet Notetaker</h4>
                <p className="text-xs text-slate-400">AI Assistant Active</p>
              </div>
            </div>
            <Button variant="ghost-glass" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-800/50 rounded-full overflow-hidden">
              <div className="h-full w-[87%] bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"></div>
            </div>
            <span className="text-xs font-mono text-slate-300">87%</span>
          </div>
        </CardGlass>

        {/* Unlimited Transcripts Widget */}
        <CardGlass
          variant="default"
          className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Unlimited Transcripts</span>
              <Badge className="text-xs bg-emerald-500 text-white border-0 px-2 py-0.5">
                FREE
              </Badge>
            </div>
            <Switch
              checked={unlimitedTranscripts}
              onCheckedChange={setUnlimitedTranscripts}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
          <p className="text-xs text-slate-300">
            Enable to get unlimited meeting transcriptions
          </p>
        </CardGlass>

        {/* Calendar Settings Widget */}
        <CardGlass variant="subtle" hover className="group">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">Calendar Settings</span>
                <ExternalLink className="w-3 h-3 text-teal-400" />
              </div>
              <p className="text-xs text-slate-400">
                Choose auto-join and share settings
              </p>
            </div>
          </div>
        </CardGlass>

        {/* Meeting Language Widget */}
        <CardGlass variant="subtle" hover>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-400 mb-1">Meeting Language</div>
              <div className="text-sm font-semibold text-white">English (Global)</div>
            </div>
            <Button variant="ghost-glass" size="icon" className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardGlass>

        {/* Upcoming Meetings Widget */}
        <CardGlass variant="default" hover>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-white">Upcoming Meetings</h4>
            <Button variant="ghost-glass" size="sm" className="text-xs h-7">
              Join All
            </Button>
          </div>

          <EmptyState
            icon={Calendar}
            title="No Meetings"
            description="No meetings in the next week"
            variant="no-data"
            size="sm"
          />

          <Link href="/meetings/new" className="w-full mt-4">
            <Button variant="gradient-primary" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Capture
            </Button>
          </Link>
        </CardGlass>

        {/* Upgrade Prompt Widget */}
        <CardGlass
          variant="elevated"
          gradient
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">Unlock Pro Features</span>
          </div>

          <ul className="space-y-3 mb-4">
            {[
              'Unlimited transcripts & AI notes',
              'AskFred AI assistant',
              'Download recordings',
              'Analytics & insights',
              '50+ integrations'
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckSquare className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">{feature}</span>
              </li>
            ))}
          </ul>

          <Link href="/pricing" className="w-full">
            <Button variant="gradient-secondary" className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </Link>
        </CardGlass>
      </div>
    </div>
  );
}