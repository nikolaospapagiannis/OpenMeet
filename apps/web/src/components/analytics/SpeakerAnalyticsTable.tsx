'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

interface Speaker {
  name: string;
  talkTime: number;
  percentage: number;
  words: number;
  questionsAsked: number;
  trend: 'up' | 'down' | 'stable';
}

interface SpeakerAnalyticsTableProps {
  speakers: Speaker[];
}

export function SpeakerAnalyticsTable({ speakers }: SpeakerAnalyticsTableProps) {
  return (
    <CardGlass variant="elevated" gradient>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Speaker Analytics</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Speaker
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Talk Time
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Share
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Words
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Questions
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {speakers.map((speaker, idx) => (
              <tr
                key={idx}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-teal-400">
                        {speaker.name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-white">{speaker.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-slate-300 font-mono">
                    {Math.floor(speaker.talkTime / 60)}:{String(speaker.talkTime % 60).padStart(2, '0')}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 max-w-[100px] h-2 bg-slate-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                        style={{ width: `${speaker.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-300 w-12">
                      {speaker.percentage}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-slate-300">{speaker.words.toLocaleString()}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {speaker.questionsAsked}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-center">
                    {speaker.trend === 'up' && (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    )}
                    {speaker.trend === 'down' && (
                      <TrendingDown className="w-5 h-5 text-rose-400" />
                    )}
                    {speaker.trend === 'stable' && (
                      <div className="w-5 h-0.5 bg-slate-400"></div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardGlass>
  );
}
