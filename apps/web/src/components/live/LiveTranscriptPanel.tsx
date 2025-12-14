/**
 * Live Transcript Panel
 * Auto-scrolling real-time transcript display with search and speaker identification
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Search, ChevronDown, Clock } from 'lucide-react';
import { TranscriptSegment } from '@/hooks/useLiveTranscription';

interface LiveTranscriptPanelProps {
  transcripts: TranscriptSegment[];
  currentSegment: TranscriptSegment | null;
  isScrolledToBottom: boolean;
  newContentAvailable: boolean;
  onScrollPositionChange: (isAtBottom: boolean) => void;
  onScrollToBottom: () => void;
  className?: string;
}

export default function LiveTranscriptPanel({
  transcripts,
  currentSegment,
  isScrolledToBottom,
  newContentAvailable,
  onScrollPositionChange,
  onScrollToBottom,
  className = ''
}: LiveTranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedSegments, setHighlightedSegments] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousTranscriptsLengthRef = useRef(0);

  // Format timestamp to HH:MM:SS
  const formatTimestamp = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }, []);

  // Format duration from seconds
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Handle scroll to detect if user scrolled away from bottom
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom < threshold;

    onScrollPositionChange(isAtBottom);
  }, [onScrollPositionChange]);

  // Auto-scroll to bottom when new content arrives and user is at bottom
  useEffect(() => {
    if (isScrolledToBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts.length, currentSegment, isScrolledToBottom]);

  // Highlight new segments briefly
  useEffect(() => {
    if (transcripts.length > previousTranscriptsLengthRef.current) {
      const newSegments = transcripts.slice(previousTranscriptsLengthRef.current);
      const newIds = new Set(newSegments.map(s => s.id));

      setHighlightedSegments(newIds);

      // Remove highlight after animation
      const timer = setTimeout(() => {
        setHighlightedSegments(new Set());
      }, 2000);

      previousTranscriptsLengthRef.current = transcripts.length;

      return () => clearTimeout(timer);
    }
  }, [transcripts]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedSegments(new Set());
      return;
    }

    const query = searchQuery.toLowerCase();
    const matchingIds = new Set(
      transcripts
        .filter(t => t.text.toLowerCase().includes(query) || t.speaker.toLowerCase().includes(query))
        .map(t => t.id)
    );

    setHighlightedSegments(matchingIds);
  }, [searchQuery, transcripts]);

  // Get speaker color for consistency
  const getSpeakerColor = useCallback((speaker: string): string => {
    const colors = [
      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
    ];

    // Simple hash function for consistent color per speaker
    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
      hash = ((hash << 5) - hash) + speaker.charCodeAt(i);
      hash = hash & hash;
    }

    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Highlight search matches in text
  const highlightText = useCallback((text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-300 dark:bg-yellow-700 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Transcript Display */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-900 scroll-smooth"
      >
        {transcripts.length === 0 && !currentSegment ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Waiting for transcript...</p>
              <p className="text-sm mt-1">Speech will appear here in real-time</p>
            </div>
          </div>
        ) : (
          <>
            {/* Final Segments */}
            {transcripts.map((segment) => {
              const isHighlighted = highlightedSegments.has(segment.id);
              const isSearchMatch = searchQuery && segment.text.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <div
                  key={segment.id}
                  className={`
                    group relative p-4 rounded-lg border transition-all duration-300
                    ${isHighlighted ? 'animate-pulse-subtle bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''}
                    ${isSearchMatch ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' :
                      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
                    hover:shadow-md
                  `}
                >
                  {/* Speaker Badge & Timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSpeakerColor(segment.speaker)}`}>
                      {segment.speaker || 'Unknown Speaker'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(segment.timestamp)}
                      {segment.endTime && segment.startTime && (
                        <span className="ml-1">({formatDuration((segment.endTime - segment.startTime) / 1000)})</span>
                      )}
                    </span>
                  </div>

                  {/* Transcript Text */}
                  <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                    {highlightText(segment.text, searchQuery)}
                  </p>

                  {/* Confidence Indicator */}
                  {segment.confidence < 0.8 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                      Low confidence ({Math.round(segment.confidence * 100)}%)
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current Segment (interim) */}
            {currentSegment && !currentSegment.isFinal && (
              <div className="p-4 rounded-lg border border-dashed border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 animate-pulse-subtle">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSpeakerColor(currentSegment.speaker)}`}>
                    {currentSegment.speaker || 'Unknown Speaker'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Speaking...
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                  {currentSegment.text}
                </p>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* New Content Indicator */}
      {newContentAvailable && !isScrolledToBottom && (
        <button
          onClick={onScrollToBottom}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2
                   px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg
                   flex items-center gap-2 text-sm font-medium transition-all duration-200
                   hover:shadow-xl animate-bounce-subtle"
        >
          <ChevronDown className="w-4 h-4" />
          New messages
        </button>
      )}

      {/* Stats Footer */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{transcripts.length} segments</span>
          {searchQuery && (
            <span>{highlightedSegments.size} matches</span>
          )}
        </div>
      </div>
    </div>
  );
}
