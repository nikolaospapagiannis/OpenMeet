/**
 * Participants List Component
 * Shows current participants with speaking indicators, talk time, and muted status
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Mic,
  MicOff,
  Clock,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import { Participant } from '@/hooks/useLiveTranscription';

interface ParticipantsListProps {
  participants: Participant[];
  className?: string;
  defaultExpanded?: boolean;
}

export default function ParticipantsList({
  participants,
  className = '',
  defaultExpanded = true
}: ParticipantsListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [sortBy, setSortBy] = useState<'name' | 'talkTime'>('name');

  // Format talk time in minutes and seconds
  const formatTalkTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color for participant
  const getParticipantColor = (id: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500'
    ];

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }

    return colors[Math.abs(hash) % colors.length];
  };

  // Sort participants
  const sortedParticipants = [...participants].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return b.talkTimeSeconds - a.talkTimeSeconds;
    }
  });

  // Calculate total talk time
  const totalTalkTime = participants.reduce((sum, p) => sum + p.talkTimeSeconds, 0);

  // Get speaking participant
  const speakingParticipant = participants.find(p => p.isSpeaking);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Participants
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {participants.length} {participants.length === 1 ? 'person' : 'people'}
              {speakingParticipant && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {speakingParticipant.name} speaking
                </span>
              )}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Participants List */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Sort Controls */}
          {participants.length > 1 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortBy === 'name'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Name
                </button>
                <button
                  onClick={() => setSortBy('talkTime')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortBy === 'talkTime'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Talk Time
                </button>
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="max-h-96 overflow-y-auto">
            {participants.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No participants yet</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sortedParticipants.map((participant) => {
                  const talkTimePercentage = totalTalkTime > 0
                    ? (participant.talkTimeSeconds / totalTalkTime) * 100
                    : 0;

                  return (
                    <div
                      key={participant.id}
                      className={`
                        p-3 rounded-lg transition-all duration-200
                        ${participant.isSpeaking
                          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700'
                          : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {participant.avatar ? (
                            <img
                              src={participant.avatar}
                              alt={participant.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full ${getParticipantColor(participant.id)} flex items-center justify-center`}>
                              <span className="text-white font-semibold text-sm">
                                {getInitials(participant.name)}
                              </span>
                            </div>
                          )}

                          {/* Speaking Indicator */}
                          {participant.isSpeaking && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            </div>
                          )}
                        </div>

                        {/* Participant Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {participant.name}
                            </p>
                            {participant.isMuted && (
                              <MicOff className="w-3 h-3 text-red-500 flex-shrink-0" />
                            )}
                            {!participant.isMuted && !participant.isSpeaking && (
                              <Mic className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            )}
                          </div>

                          {participant.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                              {participant.email}
                            </p>
                          )}

                          {/* Talk Time Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTalkTime(participant.talkTimeSeconds)}
                              </span>
                              {totalTalkTime > 0 && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {talkTimePercentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {totalTalkTime > 0 && (
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    participant.isSpeaking
                                      ? 'bg-green-500'
                                      : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(talkTimePercentage, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          {participants.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Total talk time</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatTalkTime(totalTalkTime)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
