'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Hash, TrendingUp } from 'lucide-react';

interface Topic {
  name: string;
  count: number;
  trend: number;
  color: string;
}

interface TopicTrendsWidgetProps {
  topics: Topic[];
}

export function TopicTrendsWidget({ topics }: TopicTrendsWidgetProps) {
  const maxCount = Math.max(...topics.map(t => t.count));

  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Trending Topics</h3>
        </div>
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
          Last 30 days
        </Badge>
      </div>

      <div className="space-y-4">
        {topics.map((topic, idx) => (
          <div key={idx} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium text-${topic.color}-400`}>
                  {topic.name}
                </span>
                {topic.trend > 0 && (
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{topic.trend}%</span>
                  </div>
                )}
              </div>
              <span className="text-sm font-mono text-slate-400">
                {topic.count} mentions
              </span>
            </div>
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-${topic.color}-500 to-${topic.color}-600 rounded-full transition-all duration-500 group-hover:opacity-100 opacity-80`}
                style={{ width: `${(topic.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardGlass>
  );
}
