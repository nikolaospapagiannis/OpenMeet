'use client';

import React, { useState } from 'react';
import { ActivityEntry } from '@/hooks/useRevenueIntelligence';
import { format, parseISO } from 'date-fns';

interface DealTimelineProps {
  activities: ActivityEntry[];
  onActivityClick?: (activity: ActivityEntry) => void;
}

const ACTIVITY_ICONS = {
  meeting: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  call: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  note: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  competitor_mention: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  objection: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
};

const ACTIVITY_COLORS = {
  meeting: 'bg-blue-500',
  email: 'bg-green-500',
  call: 'bg-purple-500',
  note: 'bg-gray-500',
  competitor_mention: 'bg-orange-500',
  objection: 'bg-red-500',
};

const SENTIMENT_COLORS = {
  positive: 'text-green-400 bg-green-500/20',
  neutral: 'text-gray-400 bg-gray-500/20',
  negative: 'text-red-400 bg-red-500/20',
};

export function DealTimeline({ activities, onActivityClick }: DealTimelineProps) {
  const [filter, setFilter] = useState<ActivityEntry['type'] | 'all'>('all');
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter);

  const toggleExpanded = (id: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = format(parseISO(activity.date), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityEntry[]>);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          All Activities
        </button>
        {(['meeting', 'email', 'call', 'competitor_mention', 'objection'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedActivities)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, dayActivities]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </h3>

              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />

                {/* Activities */}
                <div className="space-y-4">
                  {dayActivities.map((activity, idx) => (
                    <div key={activity.id} className="relative flex items-start">
                      {/* Icon Circle */}
                      <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${ACTIVITY_COLORS[activity.type]} text-white`}>
                        {ACTIVITY_ICONS[activity.type]}
                      </div>

                      {/* Content */}
                      <div className="ml-4 flex-1">
                        <div
                          className="bg-gray-900 rounded-lg border border-gray-700 p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
                          onClick={() => {
                            toggleExpanded(activity.id);
                            onActivityClick?.(activity);
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">
                                  {activity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                {activity.sentiment && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${SENTIMENT_COLORS[activity.sentiment]}`}>
                                    {activity.sentiment}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {format(parseISO(activity.date), 'h:mm a')}
                              </p>
                            </div>

                            {/* Critical Indicators */}
                            {(activity.type === 'competitor_mention' || activity.type === 'objection') && (
                              <span className="text-orange-400">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                          </div>

                          <p className={`text-sm text-gray-300 ${expandedActivities.has(activity.id) ? '' : 'line-clamp-2'}`}>
                            {activity.description}
                          </p>

                          {activity.participants && activity.participants.length > 0 && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Participants:</span>
                              <div className="flex flex-wrap gap-1">
                                {activity.participants.map((participant, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                                    {participant}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {expandedActivities.has(activity.id) && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <button className="text-xs text-purple-400 hover:text-purple-300">
                                View in transcript →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No activities found</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Total Activities</p>
            <p className="text-xl font-bold text-white">{activities.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Meetings</p>
            <p className="text-xl font-bold text-blue-400">
              {activities.filter(a => a.type === 'meeting').length}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Competitors</p>
            <p className="text-xl font-bold text-orange-400">
              {activities.filter(a => a.type === 'competitor_mention').length}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Objections</p>
            <p className="text-xl font-bold text-red-400">
              {activities.filter(a => a.type === 'objection').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}