'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import {
  Video,
  Calendar,
  Users,
  Chrome,
  CheckCircle2,
  Circle,
  Sparkles,
  Upload,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { SetupChecklist } from './SetupChecklist';

interface EmptyDashboardProps {
  userName?: string;
  setupProgress: {
    profileComplete: boolean;
    calendarConnected: boolean;
    firstMeeting: boolean;
    teamInvited: boolean;
  };
}

/**
 * EmptyDashboard Component
 * Displays a welcoming onboarding experience for new users
 * with actionable steps to get started with OpenMeet
 */
export function EmptyDashboard({ userName = 'there', setupProgress }: EmptyDashboardProps) {
  const completedSteps = Object.values(setupProgress).filter(Boolean).length;
  const totalSteps = Object.keys(setupProgress).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Welcome Hero Section */}
      <CardGlass
        variant="elevated"
        padding="none"
        className="bg-gradient-to-br from-teal-500/20 via-cyan-600/10 to-slate-900/50 border-teal-500/30 rounded-2xl p-8 mb-8 relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome to OpenMeet, {userName}!
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Let's get you set up in just a few simple steps
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300 font-medium">Setup Progress</span>
              <span className="text-sm text-teal-400 font-bold">{progressPercent}% Complete</span>
            </div>
            <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-teal-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-cyan-500/10 rounded-full translate-y-1/2 blur-2xl"></div>
      </CardGlass>

      {/* Setup Checklist */}
      <div className="mb-8">
        <SetupChecklist setupProgress={setupProgress} />
      </div>

      {/* Quick Action Cards */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          Quick Actions
          <ArrowRight className="w-5 h-5 text-teal-400" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upload First Meeting Card */}
          <CardGlass variant="default" hover className="group border-blue-500/30 hover:border-blue-500/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Upload Your First Meeting</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Get AI-powered transcriptions, summaries, and action items from your recorded meetings.
                </p>
                <Link href="/meetings/upload">
                  <Button variant="gradient-primary" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Recording
                  </Button>
                </Link>
              </div>
            </div>
          </CardGlass>

          {/* Connect Calendar Card */}
          <CardGlass variant="default" hover className="group border-purple-500/30 hover:border-purple-500/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <Calendar className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Connect Your Calendar</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Automatically join and record meetings from Google Calendar, Outlook, or Microsoft Teams.
                </p>
                <Link href="/settings/integrations">
                  <Button variant="ghost-glass" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Connect Calendar
                  </Button>
                </Link>
              </div>
            </div>
          </CardGlass>

          {/* Invite Team Members Card */}
          <CardGlass variant="default" hover className="group border-emerald-500/30 hover:border-emerald-500/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Invite Team Members</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Collaborate with your team. Share meeting notes, insights, and action items effortlessly.
                </p>
                <Link href="/settings/team">
                  <Button variant="ghost-glass" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Invite Team
                  </Button>
                </Link>
              </div>
            </div>
          </CardGlass>

          {/* Install Chrome Extension Card */}
          <CardGlass variant="default" hover className="group border-orange-500/30 hover:border-orange-500/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <Chrome className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Install Chrome Extension</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Capture meetings directly from your browser with one-click recording for Zoom, Meet, and Teams.
                </p>
                <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost-glass" size="sm">
                    <Chrome className="w-4 h-4 mr-2" />
                    Get Extension
                  </Button>
                </a>
              </div>
            </div>
          </CardGlass>
        </div>
      </div>

      {/* Help Section */}
      <CardGlass variant="subtle" className="border-slate-700/50">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border border-teal-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1">Need Help Getting Started?</h3>
            <p className="text-sm text-slate-400 mb-3">
              Check out our documentation, watch tutorial videos, or reach out to our support team.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/docs">
                <Button variant="ghost-glass" size="sm">
                  View Docs
                </Button>
              </Link>
              <Link href="/support">
                <Button variant="ghost-glass" size="sm">
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardGlass>
    </div>
  );
}
