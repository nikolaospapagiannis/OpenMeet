'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import {
  Sparkles,
  Tag,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  Upload,
} from 'lucide-react';
import Link from 'next/link';

/**
 * EmptyTopics Component
 * Displays when user has no tracked topics yet
 * Explains the topic tracking feature
 */
export function EmptyTopics() {
  return (
    <div className="py-8 px-4">
      <CardGlass variant="default" padding="none" className="border-slate-700/50">
        <div className="p-8 text-center">
          {/* Illustration - Topic Tags */}
          <div className="relative mb-6 inline-block">
            {/* Main icon container */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                <Tag className="w-8 h-8 text-purple-400" />
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-teal-600/20 border border-teal-500/30 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-teal-400" />
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-orange-400" />
              </div>
            </div>

            {/* Sample topic tags */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
              <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-400 font-medium">
                Product Launch
              </div>
              <div className="px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full text-xs text-teal-400 font-medium">
                Q4 Strategy
              </div>
              <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400 font-medium">
                Team Sync
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <h3 className="text-xl font-bold text-white mb-3">
            No Topics Tracked Yet
          </h3>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Topics will appear after your first meeting. OpenMeet automatically identifies and tracks
            recurring themes, subjects, and discussion points across all your conversations.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto text-left">
            <div className="flex flex-col items-center text-center p-4 bg-slate-800/30 rounded-xl border border-white/5">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Auto-Detection</h4>
              <p className="text-xs text-slate-400">
                AI identifies key topics from your meeting content
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 bg-slate-800/30 rounded-xl border border-white/5">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500/20 to-teal-600/20 border border-teal-500/30 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-teal-400" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Track Trends</h4>
              <p className="text-xs text-slate-400">
                See which topics come up most frequently
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 bg-slate-800/30 rounded-xl border border-white/5">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg flex items-center justify-center mb-3">
                <Lightbulb className="w-5 h-5 text-orange-400" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Get Insights</h4>
              <p className="text-xs text-slate-400">
                Discover patterns and connections across meetings
              </p>
            </div>
          </div>

          {/* CTA */}
          <Link href="/meetings/upload">
            <Button variant="gradient-primary">
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Meeting
            </Button>
          </Link>

          {/* Info text */}
          <p className="text-xs text-slate-500 mt-4">
            Topics are automatically generated from your meeting transcripts
          </p>
        </div>
      </CardGlass>
    </div>
  );
}
