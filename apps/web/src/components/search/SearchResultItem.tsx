'use client';

import React from 'react';
import { Clock, User, Video, MessageSquare, Hash, Users } from 'lucide-react';
import { SearchResult } from '@/contexts/SearchContext';
import { cn } from '@/lib/utils';

interface SearchResultItemProps {
  result: SearchResult;
  isActive: boolean;
  onClick: () => void;
}

export function SearchResultItem({ result, isActive, onClick }: SearchResultItemProps) {
  const formatDate = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  };

  const getIcon = () => {
    switch (result.type) {
      case 'meeting':
        return <Video className="w-4 h-4" />;
      case 'transcript':
        return <MessageSquare className="w-4 h-4" />;
      case 'participant':
        return <User className="w-4 h-4" />;
      case 'topic':
        return <Hash className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = () => {
    switch (result.type) {
      case 'meeting':
        return 'text-teal-400 bg-teal-500/10';
      case 'transcript':
        return 'text-purple-400 bg-purple-500/10';
      case 'participant':
        return 'text-blue-400 bg-blue-500/10';
      case 'topic':
        return 'text-orange-400 bg-orange-500/10';
      default:
        return 'text-slate-400 bg-slate-500/10';
    }
  };

  // Render highlighted text
  const renderHighlights = () => {
    if (!result.highlights || result.highlights.length === 0) {
      return <p className="text-sm text-slate-400 line-clamp-2">{result.description}</p>;
    }

    // Use the first highlight
    const highlight = result.highlights[0];
    return (
      <p
        className="text-sm text-slate-400 line-clamp-2"
        dangerouslySetInnerHTML={{ __html: highlight }}
      />
    );
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg text-left transition-all duration-200',
        'hover:bg-slate-800/50 group',
        isActive && 'bg-slate-800/60 ring-2 ring-teal-500/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('p-2 rounded-lg mt-0.5', getTypeColor())}>{getIcon()}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-white font-medium line-clamp-1 group-hover:text-teal-400 transition-colors">
              {result.title}
            </h4>
            {result.timestamp && (
              <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                <Clock className="w-3 h-3" />
                <span>{formatDate(result.timestamp)}</span>
              </div>
            )}
          </div>

          {/* Description / Highlights */}
          {renderHighlights()}

          {/* Metadata */}
          {result.metadata && (
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              {result.metadata.speaker && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{result.metadata.speaker}</span>
                </div>
              )}
              {result.metadata.meetingTitle && (
                <div className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span className="line-clamp-1">{result.metadata.meetingTitle}</span>
                </div>
              )}
              {result.metadata.participantCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{result.metadata.participantCount} participants</span>
                </div>
              )}
              {result.metadata.meetingCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span>{result.metadata.meetingCount} meetings</span>
                </div>
              )}
              {result.metadata.platform && (
                <div className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                  {result.metadata.platform}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
