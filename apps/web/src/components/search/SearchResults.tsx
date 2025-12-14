'use client';

import React, { useMemo } from 'react';
import { Video, MessageSquare, User, Hash, Search } from 'lucide-react';
import { SearchResult } from '@/contexts/SearchContext';
import { SearchResultItem } from './SearchResultItem';
import { cn } from '@/lib/utils';

interface SearchResultsProps {
  results: SearchResult[];
  activeIndex: number;
  onResultClick: (result: SearchResult) => void;
  className?: string;
}

interface GroupedResults {
  meetings: SearchResult[];
  transcripts: SearchResult[];
  participants: SearchResult[];
  topics: SearchResult[];
}

export function SearchResults({
  results,
  activeIndex,
  onResultClick,
  className,
}: SearchResultsProps) {
  // Group results by type
  const groupedResults = useMemo(() => {
    const grouped: GroupedResults = {
      meetings: [],
      transcripts: [],
      participants: [],
      topics: [],
    };

    results.forEach((result) => {
      switch (result.type) {
        case 'meeting':
          grouped.meetings.push(result);
          break;
        case 'transcript':
          grouped.transcripts.push(result);
          break;
        case 'participant':
          grouped.participants.push(result);
          break;
        case 'topic':
          grouped.topics.push(result);
          break;
      }
    });

    return grouped;
  }, [results]);

  // Calculate active item's group and index within that group
  const getActiveInfo = (flatIndex: number) => {
    let count = 0;

    // Check meetings
    if (flatIndex < groupedResults.meetings.length) {
      return { type: 'meetings', index: flatIndex };
    }
    count += groupedResults.meetings.length;

    // Check transcripts
    if (flatIndex < count + groupedResults.transcripts.length) {
      return { type: 'transcripts', index: flatIndex - count };
    }
    count += groupedResults.transcripts.length;

    // Check participants
    if (flatIndex < count + groupedResults.participants.length) {
      return { type: 'participants', index: flatIndex - count };
    }
    count += groupedResults.participants.length;

    // Check topics
    return { type: 'topics', index: flatIndex - count };
  };

  const activeInfo = getActiveInfo(activeIndex);

  const renderGroup = (
    title: string,
    items: SearchResult[],
    Icon: React.ElementType,
    iconColor: string,
    groupType: string
  ) => {
    if (items.length === 0) return null;

    let baseIndex = 0;
    if (groupType === 'transcripts') {
      baseIndex = groupedResults.meetings.length;
    } else if (groupType === 'participants') {
      baseIndex = groupedResults.meetings.length + groupedResults.transcripts.length;
    } else if (groupType === 'topics') {
      baseIndex =
        groupedResults.meetings.length +
        groupedResults.transcripts.length +
        groupedResults.participants.length;
    }

    return (
      <div className="mb-6 last:mb-0">
        {/* Group Header */}
        <div className="flex items-center gap-2 mb-3 px-3">
          <Icon className={cn('w-4 h-4', iconColor)} />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            {title}
          </h3>
          <span className="text-xs text-slate-500">({items.length})</span>
        </div>

        {/* Group Items */}
        <div className="space-y-1">
          {items.map((result, index) => {
            const itemIndex = baseIndex + index;
            return (
              <SearchResultItem
                key={result.id}
                result={result}
                isActive={activeInfo.type === groupType && activeInfo.index === index}
                onClick={() => onResultClick(result)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (results.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-slate-400 text-sm">No results found</p>
        <p className="text-slate-500 text-xs mt-1">Try a different search term or filters</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-y-auto', className)}>
      {renderGroup('Meetings', groupedResults.meetings, Video, 'text-teal-400', 'meetings')}
      {renderGroup(
        'Transcripts',
        groupedResults.transcripts,
        MessageSquare,
        'text-purple-400',
        'transcripts'
      )}
      {renderGroup(
        'Participants',
        groupedResults.participants,
        User,
        'text-blue-400',
        'participants'
      )}
      {renderGroup('Topics', groupedResults.topics, Hash, 'text-orange-400', 'topics')}
    </div>
  );
}
