'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User, Clock } from 'lucide-react';
import { TranscriptSegment } from './VideoPlayer';

interface TranscriptSidebarProps {
  segments: TranscriptSegment[];
  activeSegment: TranscriptSegment | null;
  onSegmentClick: (segment: TranscriptSegment) => void;
  currentTime: number;
}

export const TranscriptSidebar: React.FC<TranscriptSidebarProps> = ({
  segments,
  activeSegment,
  onSegmentClick,
  currentTime
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>(segments);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter segments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSegments(segments);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = segments.filter(segment =>
      segment.text.toLowerCase().includes(query) ||
      segment.speaker.toLowerCase().includes(query)
    );
    setFilteredSegments(filtered);
  }, [searchQuery, segments]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeSegmentRef.current;

      const elementTop = element.offsetTop;
      const elementBottom = elementTop + element.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      if (elementTop < containerTop || elementBottom > containerBottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegment]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="bg-[var(--ff-purple-500)] bg-opacity-30 text-white">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const getSpeakerColor = (speaker: string): string => {
    const colors = [
      'text-blue-400',
      'text-green-400',
      'text-yellow-400',
      'text-pink-400',
      'text-indigo-400',
      'text-orange-400'
    ];

    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="w-full lg:w-96 bg-[var(--ff-bg-layer)] border-l border-[var(--ff-border)] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--ff-border)]">
        <h2 className="text-lg font-semibold text-white mb-4">Transcript</h2>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--ff-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="mt-2 text-sm text-[var(--ff-text-muted)]">
            {filteredSegments.length} result{filteredSegments.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Transcript Segments */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {filteredSegments.length === 0 ? (
          <div className="text-center text-[var(--ff-text-muted)] py-8">
            {searchQuery ? 'No results found' : 'No transcript available'}
          </div>
        ) : (
          filteredSegments.map((segment) => {
            const isActive = activeSegment?.id === segment.id;
            const isPast = segment.endTime < currentTime;

            return (
              <div
                key={segment.id}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSegmentClick(segment)}
                className={`
                  relative p-3 rounded-lg cursor-pointer transition-all duration-200
                  ${isActive
                    ? 'bg-[var(--ff-purple-500)] bg-opacity-10 border border-[var(--ff-purple-500)]'
                    : 'hover:bg-gray-800 border border-transparent'
                  }
                  ${isPast && !isActive ? 'opacity-60' : ''}
                `}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ff-purple-500)] rounded-l-lg" />
                )}

                {/* Speaker and Time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--ff-text-muted)]" />
                    <span className={`text-sm font-medium ${getSpeakerColor(segment.speaker)}`}>
                      {segment.speaker}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--ff-text-muted)]">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(segment.startTime)}</span>
                  </div>
                </div>

                {/* Transcript Text */}
                <p className="text-sm text-[var(--ff-text-secondary)] leading-relaxed">
                  {highlightText(segment.text, searchQuery)}
                </p>

                {/* Confidence Score (if available) */}
                {segment.confidence !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          segment.confidence > 0.8
                            ? 'bg-green-500'
                            : segment.confidence > 0.6
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${segment.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--ff-text-muted)]">
                      {Math.round(segment.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-[var(--ff-border)] bg-gray-900">
        <div className="flex justify-between text-xs text-[var(--ff-text-muted)]">
          <span>{segments.length} segments</span>
          <span>{formatTime(currentTime)} / {segments.length > 0 ? formatTime(segments[segments.length - 1].endTime) : '0:00'}</span>
        </div>
      </div>
    </div>
  );
};