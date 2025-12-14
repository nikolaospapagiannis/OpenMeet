'use client';

import React from 'react';
import {
  FileText,
  Sparkles,
  Target,
  MessageSquare,
  Scissors,
  TrendingUp,
  Bot,
  LayoutTemplate,
} from 'lucide-react';

export type TabType = 'transcript' | 'summary' | 'action-items' | 'ask-ai' | 'templates' | 'comments' | 'clips' | 'insights';

interface MeetingTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts?: {
    actionItems?: number;
    comments?: number;
    clips?: number;
  };
}

export function MeetingTabs({ activeTab, onTabChange, counts = {} }: MeetingTabsProps) {
  const tabs = [
    {
      id: 'transcript' as TabType,
      label: 'Transcript',
      icon: FileText,
      description: 'Full transcript with timestamps',
    },
    {
      id: 'summary' as TabType,
      label: 'Summary',
      icon: Sparkles,
      description: 'AI-generated summary',
    },
    {
      id: 'action-items' as TabType,
      label: 'Action Items',
      icon: Target,
      description: 'Tasks and action items',
      count: counts.actionItems,
    },
    {
      id: 'ask-ai' as TabType,
      label: 'Ask AI',
      icon: Bot,
      description: 'Ask questions about this meeting',
    },
    {
      id: 'templates' as TabType,
      label: 'Templates',
      icon: LayoutTemplate,
      description: 'Apply note templates',
    },
    {
      id: 'comments' as TabType,
      label: 'Comments',
      icon: MessageSquare,
      description: 'Comments and notes',
      count: counts.comments,
    },
    {
      id: 'clips' as TabType,
      label: 'Clips',
      icon: Scissors,
      description: 'Video clips and highlights',
      count: counts.clips,
    },
    {
      id: 'insights' as TabType,
      label: 'Insights',
      icon: TrendingUp,
      description: 'Analytics and insights',
    },
  ];

  return (
    <div className="border-b border-slate-800">
      <div className="flex space-x-1 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap
                ${
                  isActive
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }
              `}
              title={tab.description}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>

              {/* Badge Count */}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-purple-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { MeetingTabs as default };
