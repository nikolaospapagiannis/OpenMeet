'use client';

import { useState } from 'react';
import { Upload, Calendar, Video, CheckCircle, Sparkles, Play } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';

interface EmptyMeetingsListProps {
  onUploadClick: () => void;
  onConnectCalendar: () => void;
  onStartRecording: () => void;
}

/**
 * EmptyMeetingsList Component
 * Displays a welcoming empty state with multiple paths to create first meeting
 */
export function EmptyMeetingsList({
  onUploadClick,
  onConnectCalendar,
  onStartRecording
}: EmptyMeetingsListProps) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="max-w-5xl mx-auto">
      <CardGlass variant="default" padding="lg" className="text-center">
        {/* Hero Section */}
        <div className="mb-12">
          {/* Large Illustration Area */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-3xl rounded-full" />
            <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-16 flex items-center justify-center min-h-[280px]">
              <div className="text-center space-y-6">
                <div className="flex justify-center space-x-4">
                  <div className="bg-purple-500/20 p-4 rounded-2xl border border-purple-500/30 animate-pulse">
                    <Video className="h-12 w-12 text-purple-400" />
                  </div>
                  <div className="bg-cyan-500/20 p-4 rounded-2xl border border-cyan-500/30 animate-pulse delay-75">
                    <Calendar className="h-12 w-12 text-cyan-400" />
                  </div>
                  <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 animate-pulse delay-150">
                    <Sparkles className="h-12 w-12 text-emerald-400" />
                  </div>
                </div>
                <div className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Your Meeting Hub
                </div>
              </div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Welcome to Your Meeting Intelligence Platform
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Transform your meetings with AI-powered insights, automated transcripts,
            and actionable analytics. Get started in seconds.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Upload Meeting */}
          <button
            onClick={onUploadClick}
            className="group relative bg-gradient-to-br from-purple-600/20 to-purple-800/20 hover:from-purple-600/30 hover:to-purple-800/30 border border-purple-500/30 hover:border-purple-400/50 rounded-xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20"
          >
            <div className="bg-purple-500/20 p-4 rounded-xl border border-purple-500/30 inline-block mb-4 group-hover:bg-purple-500/30 transition-colors">
              <Upload className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Upload Recording</h3>
            <p className="text-slate-400 text-sm mb-4">
              Upload audio or video files from past meetings and get instant AI analysis
            </p>
            <div className="text-xs text-purple-400 font-medium">
              Supports MP4, MP3, WAV, and more
            </div>
          </button>

          {/* Connect Calendar */}
          <button
            onClick={onConnectCalendar}
            className="group relative bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 hover:from-cyan-600/30 hover:to-cyan-800/30 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20"
          >
            <div className="bg-cyan-500/20 p-4 rounded-xl border border-cyan-500/30 inline-block mb-4 group-hover:bg-cyan-500/30 transition-colors">
              <Calendar className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Connect Calendar</h3>
            <p className="text-slate-400 text-sm mb-4">
              Sync with Google Calendar or Outlook for automatic meeting capture
            </p>
            <div className="text-xs text-cyan-400 font-medium">
              Auto-record upcoming meetings
            </div>
          </button>

          {/* Start Live Recording */}
          <button
            onClick={onStartRecording}
            className="group relative bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 hover:from-emerald-600/30 hover:to-emerald-800/30 border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20"
          >
            <div className="bg-emerald-500/20 p-4 rounded-xl border border-emerald-500/30 inline-block mb-4 group-hover:bg-emerald-500/30 transition-colors">
              <Video className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Start Live Recording</h3>
            <p className="text-slate-400 text-sm mb-4">
              Record a meeting in real-time with live transcription and captions
            </p>
            <div className="text-xs text-emerald-400 font-medium">
              Real-time AI insights
            </div>
          </button>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 mb-8">
          <h3 className="text-xl font-semibold text-white mb-6">What You'll Get</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">AI Transcripts</h4>
                <p className="text-xs text-slate-400">Accurate, searchable meeting transcripts</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">Smart Summaries</h4>
                <p className="text-xs text-slate-400">Key points and action items extracted</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">Speaker Analytics</h4>
                <p className="text-xs text-slate-400">Talk time, sentiment, and engagement</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">Highlight Clips</h4>
                <p className="text-xs text-slate-400">Create and share key moments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Video Section (Optional) */}
        <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
          {!showVideo ? (
            <button
              onClick={() => setShowVideo(true)}
              className="group w-full relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-12 hover:from-slate-800/90 hover:to-slate-900/90 transition-all duration-300"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 blur-2xl" />
                <div className="relative flex flex-col items-center justify-center space-y-4">
                  <div className="bg-white/10 group-hover:bg-white/20 p-6 rounded-full border border-white/20 group-hover:border-white/30 transition-all duration-300 group-hover:scale-110">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Watch How It Works</h4>
                    <p className="text-sm text-slate-400">2-minute product demo</p>
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div className="aspect-video bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <Video className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">Demo video would play here</p>
                <button
                  onClick={() => setShowVideo(false)}
                  className="text-sm text-purple-400 hover:text-purple-300 mt-2"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 pt-8 border-t border-slate-700/50">
          <p className="text-sm text-slate-400 mb-4">
            Need help getting started? Check out our{' '}
            <a href="/docs" className="text-purple-400 hover:text-purple-300 underline">
              documentation
            </a>{' '}
            or{' '}
            <a href="/support" className="text-purple-400 hover:text-purple-300 underline">
              contact support
            </a>
          </p>
        </div>
      </CardGlass>
    </div>
  );
}
