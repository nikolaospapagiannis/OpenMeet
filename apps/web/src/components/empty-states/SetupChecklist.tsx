'use client';

import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import {
  CheckCircle2,
  Circle,
  User,
  Calendar,
  Video,
  Users,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SetupChecklistProps {
  setupProgress: {
    profileComplete: boolean;
    calendarConnected: boolean;
    firstMeeting: boolean;
    teamInvited: boolean;
  };
}

interface ChecklistItem {
  id: keyof SetupChecklistProps['setupProgress'];
  title: string;
  description: string;
  icon: React.ElementType;
  actionLabel: string;
  actionLink: string;
  color: {
    icon: string;
    bg: string;
    border: string;
    text: string;
  };
}

/**
 * SetupChecklist Component
 * Displays an interactive checklist for user onboarding
 * Tracks completion status and provides action links
 */
export function SetupChecklist({ setupProgress }: SetupChecklistProps) {
  const checklistItems: ChecklistItem[] = [
    {
      id: 'profileComplete',
      title: 'Complete Your Profile',
      description: 'Add your name, photo, and preferences',
      icon: User,
      actionLabel: 'Complete Profile',
      actionLink: '/settings/profile',
      color: {
        icon: 'text-blue-400',
        bg: 'from-blue-500/20 to-blue-600/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
      },
    },
    {
      id: 'calendarConnected',
      title: 'Connect Your Calendar',
      description: 'Auto-join meetings from Google, Outlook, or Teams',
      icon: Calendar,
      actionLabel: 'Connect Calendar',
      actionLink: '/settings/integrations',
      color: {
        icon: 'text-purple-400',
        bg: 'from-purple-500/20 to-purple-600/20',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
      },
    },
    {
      id: 'firstMeeting',
      title: 'Record Your First Meeting',
      description: 'Upload a recording or schedule a new meeting',
      icon: Video,
      actionLabel: 'Upload Meeting',
      actionLink: '/meetings/upload',
      color: {
        icon: 'text-teal-400',
        bg: 'from-teal-500/20 to-teal-600/20',
        border: 'border-teal-500/30',
        text: 'text-teal-400',
      },
    },
    {
      id: 'teamInvited',
      title: 'Invite Team Members',
      description: 'Collaborate and share meeting insights',
      icon: Users,
      actionLabel: 'Invite Team',
      actionLink: '/settings/team',
      color: {
        icon: 'text-emerald-400',
        bg: 'from-emerald-500/20 to-emerald-600/20',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
      },
    },
  ];

  const completedItems = checklistItems.filter((item) => setupProgress[item.id]);
  const nextIncompleteItem = checklistItems.find((item) => !setupProgress[item.id]);

  return (
    <CardGlass variant="default" padding="none" className="border-slate-700/50">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Setup Checklist</h2>
            <p className="text-sm text-slate-400">
              {completedItems.length} of {checklistItems.length} completed
            </p>
          </div>
          {completedItems.length === checklistItems.length && (
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-teal-600/20 border border-teal-500/30 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-teal-400" />
            </div>
          )}
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {checklistItems.map((item, index) => {
            const isCompleted = setupProgress[item.id];
            const isNext = item === nextIncompleteItem;
            const Icon = item.icon;
            const CheckIcon = isCompleted ? CheckCircle2 : Circle;

            return (
              <div
                key={item.id}
                className={cn(
                  'group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300',
                  isCompleted
                    ? 'bg-slate-800/20 border-white/10 opacity-75 hover:opacity-100'
                    : isNext
                    ? 'bg-gradient-to-r from-teal-500/5 to-cyan-600/5 border-teal-500/30 hover:border-teal-500/50'
                    : 'bg-slate-800/30 border-white/5 hover:border-white/10'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                    `bg-gradient-to-br ${item.color.bg} border ${item.color.border}`
                  )}
                >
                  <Icon className={cn('w-5 h-5', item.color.icon)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    {isNext && (
                      <span className="px-2 py-0.5 bg-teal-500/20 border border-teal-500/30 rounded-full text-xs text-teal-400 font-medium">
                        Next
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-teal-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium hidden sm:inline">Complete</span>
                    </div>
                  ) : (
                    <Link href={item.actionLink}>
                      <Button
                        variant="ghost-glass"
                        size="sm"
                        className={cn(
                          'text-xs',
                          isNext && 'border-teal-500/30 hover:border-teal-500/50'
                        )}
                      >
                        {item.actionLabel}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Completion checkmark overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/50 backdrop-blur-sm rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-teal-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {completedItems.length === checklistItems.length && (
          <div className="mt-6 p-4 bg-gradient-to-r from-teal-500/10 to-cyan-600/10 border border-teal-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Setup Complete!</h4>
                <p className="text-xs text-slate-300">
                  You're all set! Start recording meetings to unlock the full power of OpenMeet.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </CardGlass>
  );
}
