'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Smile, Meh, Frown } from 'lucide-react';

interface SentimentAnalysisCardProps {
  positive: number;
  neutral: number;
  negative: number;
}

export function SentimentAnalysisCard({ positive, neutral, negative }: SentimentAnalysisCardProps) {
  const total = positive + neutral + negative;
  const positivePercent = (positive / total) * 100;
  const neutralPercent = (neutral / total) * 100;
  const negativePercent = (negative / total) * 100;

  return (
    <CardGlass variant="elevated" gradient>
      <h3 className="text-lg font-semibold text-white mb-6">Sentiment Analysis</h3>

      <div className="space-y-6">
        {/* Positive */}
        <div className="group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Smile className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Positive</div>
                <div className="text-xs text-slate-400">{positive} instances</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {positivePercent.toFixed(0)}%
            </div>
          </div>
          <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
              style={{ width: `${positivePercent}%` }}
            />
          </div>
        </div>

        {/* Neutral */}
        <div className="group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Meh className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Neutral</div>
                <div className="text-xs text-slate-400">{neutral} instances</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-400">
              {neutralPercent.toFixed(0)}%
            </div>
          </div>
          <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-slate-500 to-slate-600 rounded-full"
              style={{ width: `${neutralPercent}%` }}
            />
          </div>
        </div>

        {/* Negative */}
        <div className="group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/20 border border-rose-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Frown className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Negative</div>
                <div className="text-xs text-slate-400">{negative} instances</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-400">
              {negativePercent.toFixed(0)}%
            </div>
          </div>
          <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full"
              style={{ width: `${negativePercent}%` }}
            />
          </div>
        </div>
      </div>
    </CardGlass>
  );
}
