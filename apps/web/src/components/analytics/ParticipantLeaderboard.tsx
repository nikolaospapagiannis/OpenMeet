'use client';

import { useState } from 'react';
import { Trophy, Clock, Calendar, TrendingUp, ChevronDown, ChevronUp, User } from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';

interface TopParticipant {
  email: string;
  meetingCount: number;
  totalTalkTimeMinutes: number;
}

interface ParticipantLeaderboardProps {
  participants: TopParticipant[];
  loading?: boolean;
}

type SortField = 'meetings' | 'talkTime' | 'avgTalkTime';
type SortOrder = 'asc' | 'desc';

export function ParticipantLeaderboard({ participants, loading }: ParticipantLeaderboardProps) {
  const [sortField, setSortField] = useState<SortField>('meetings');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Sort participants based on current sort field and order
  const sortedParticipants = [...participants].sort((a, b) => {
    let aValue: number, bValue: number;

    switch (sortField) {
      case 'meetings':
        aValue = a.meetingCount;
        bValue = b.meetingCount;
        break;
      case 'talkTime':
        aValue = a.totalTalkTimeMinutes;
        bValue = b.totalTalkTimeMinutes;
        break;
      case 'avgTalkTime':
        aValue = a.meetingCount > 0 ? a.totalTalkTimeMinutes / a.meetingCount : 0;
        bValue = b.meetingCount > 0 ? b.totalTalkTimeMinutes / b.meetingCount : 0;
        break;
    }

    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleRowExpansion = (email: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedRows(newExpanded);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getParticipantName = (email: string): string => {
    const namePart = email.split('@')[0];
    return namePart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-4 h-4 text-yellow-400" />;
    if (index === 1) return <Trophy className="w-4 h-4 text-slate-400" />;
    if (index === 2) return <Trophy className="w-4 h-4 text-orange-400" />;
    return <span className="text-xs text-slate-500 font-mono">{(index + 1).toString().padStart(2, '0')}</span>;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="w-3 h-3 text-slate-600" />;
    }
    return sortOrder === 'desc' ? (
      <ChevronDown className="w-3 h-3 text-blue-400" />
    ) : (
      <ChevronUp className="w-3 h-3 text-blue-400" />
    );
  };

  return (
    <CardGlass padding="none">
      <CardGlassHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardGlassTitle>Participant Leaderboard</CardGlassTitle>
            <p className="text-sm text-slate-400 mt-1">Most active meeting participants</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-4 h-4" />
            <span>{participants.length} participants</span>
          </div>
        </div>
      </CardGlassHeader>

      <CardGlassContent className="p-6 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p className="text-slate-300">Loading participants...</p>
            </div>
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-teal-500/20 border border-teal-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-teal-400" />
            </div>
            <p className="text-slate-300">No participant data yet</p>
            <p className="text-sm text-slate-500">Participant statistics will appear here</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">Participant</div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('meetings')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Meetings
                  <SortIcon field="meetings" />
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('talkTime')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Talk Time
                  <SortIcon field="talkTime" />
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('avgTalkTime')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Avg/Meeting
                  <SortIcon field="avgTalkTime" />
                </button>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-800">
              {sortedParticipants.map((participant, index) => {
                const avgTalkTime = participant.meetingCount > 0
                  ? Math.round(participant.totalTalkTimeMinutes / participant.meetingCount)
                  : 0;
                const isExpanded = expandedRows.has(participant.email);

                return (
                  <div key={participant.email}>
                    <div
                      className="grid grid-cols-12 gap-4 py-3 items-center hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => toggleRowExpansion(participant.email)}
                    >
                      <div className="col-span-1 flex items-center">
                        {getRankIcon(index)}
                      </div>
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-white">
                          {getParticipantName(participant.email)}
                        </p>
                        <p className="text-xs text-slate-500">{participant.email}</p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span className="text-sm text-slate-300">{participant.meetingCount}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="text-sm text-slate-300">
                            {formatTime(participant.totalTalkTimeMinutes)}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-slate-300">{formatTime(avgTalkTime)}</span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-slate-800/20 border-t border-slate-700">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Participation Rate</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                                  style={{ width: `${Math.min((participant.meetingCount / 50) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400">
                                {Math.min((participant.meetingCount / 50) * 100, 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Engagement Level</p>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">High</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Last Active</p>
                            <span className="text-slate-300">2 days ago</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Total Meetings</p>
                  <p className="text-lg font-bold text-white">
                    {sortedParticipants.reduce((sum, p) => sum + p.meetingCount, 0)}
                  </p>
                </div>
                <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Total Talk Time</p>
                  <p className="text-lg font-bold text-white">
                    {formatTime(sortedParticipants.reduce((sum, p) => sum + p.totalTalkTimeMinutes, 0))}
                  </p>
                </div>
                <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Avg per Person</p>
                  <p className="text-lg font-bold text-white">
                    {formatTime(Math.round(
                      sortedParticipants.reduce((sum, p) => sum + p.totalTalkTimeMinutes, 0) /
                      sortedParticipants.length
                    ))}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}