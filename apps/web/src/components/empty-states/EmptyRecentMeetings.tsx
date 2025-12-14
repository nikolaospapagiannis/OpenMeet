'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import {
  Video,
  Upload,
  Calendar,
  FileText,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

/**
 * EmptyRecentMeetings Component
 * Displays when user has no meetings recorded yet
 * Shows benefits and clear CTAs to upload or schedule
 */
export function EmptyRecentMeetings() {
  const benefits = [
    'AI-powered transcription with speaker identification',
    'Automatic summaries and key takeaways',
    'Action items extracted and tracked',
    'Search across all your meeting content',
    'Share notes with your team instantly',
  ];

  return (
    <div className="py-12 px-4">
      <CardGlass variant="default" padding="none" className="max-w-2xl mx-auto border-slate-700/50">
        <div className="p-8 text-center">
          {/* Illustration */}
          <div className="relative mb-6 inline-block">
            {/* Main icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto relative z-10">
              <Video className="w-12 h-12 text-blue-400" />
            </div>

            {/* Floating decorative elements */}
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center animate-bounce">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-gradient-to-br from-teal-500/20 to-teal-600/20 border border-teal-500/30 rounded-lg flex items-center justify-center animate-pulse">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
          </div>

          {/* Title & Description */}
          <h3 className="text-2xl font-bold text-white mb-3">
            No Meetings Yet
          </h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Start capturing your meetings with AI-powered transcription and summaries.
            Upload a recording or connect your calendar to get started.
          </p>

          {/* Benefits List */}
          <div className="mb-8 text-left max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-white mb-4 text-center">
              What you'll get with OpenMeet:
            </h4>
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-gradient-to-br from-teal-500/20 to-teal-600/20 border border-teal-500/30 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-sm text-slate-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/meetings/upload">
              <Button variant="gradient-primary" className="w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                Upload Recording
              </Button>
            </Link>
            <Link href="/meetings/new">
              <Button variant="ghost-glass" className="w-full sm:w-auto">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </Link>
          </div>

          {/* Help text */}
          <p className="text-xs text-slate-500 mt-6">
            Supported formats: MP4, MP3, WAV, M4A (up to 4 hours)
          </p>
        </div>
      </CardGlass>
    </div>
  );
}
