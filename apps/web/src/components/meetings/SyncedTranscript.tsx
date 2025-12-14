'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User, Clock, Copy, Check, Download } from 'lucide-react';
import { TranscriptSegment, useTranscriptExport } from '@/hooks/useSyncedPlayback';

interface SyncedTranscriptProps {
  segments: TranscriptSegment[];
  currentSegment: TranscriptSegment | null;
  activeSegmentIndex: number;
  onSegmentClick: (segmentId: string) => void;
  meetingTitle: string;
}

export function SyncedTranscript({
  segments,
  currentSegment,
  activeSegmentIndex,
  onSegmentClick,
  meetingTitle,
}: SyncedTranscriptProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>(segments);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { exportAsText, exportAsSRT, exportAsVTT, exportAsJSON } = useTranscriptExport(
    segments,
    meetingTitle
  );

  // Filter segments based on search query and speaker
  useEffect(() => {
    if (!searchQuery.trim() && !selectedSpeaker) {
      setFilteredSegments(segments);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = segments.filter((segment) => {
      const matchesSearch =
        !searchQuery ||
        segment.text.toLowerCase().includes(query) ||
        segment.speaker.toLowerCase().includes(query);
      const matchesSpeaker = !selectedSpeaker || segment.speaker === selectedSpeaker;
      return matchesSearch && matchesSpeaker;
    });

    setFilteredSegments(filtered);
  }, [searchQuery, selectedSpeaker, segments]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current && !searchQuery) {
      const container = containerRef.current;
      const element = activeSegmentRef.current;

      const elementTop = element.offsetTop;
      const elementBottom = elementTop + element.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      // Only scroll if element is not in view
      if (elementTop < containerTop || elementBottom > containerBottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegmentIndex, searchQuery]);

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
        <mark key={index} className="bg-purple-500/30 text-purple-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      )
    );
  };

  const getSpeakerColor = (speaker: string): string => {
    const colors = [
      'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-300',
      'from-green-500/20 to-green-600/20 border-green-500/30 text-green-300',
      'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-300',
      'from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-300',
      'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30 text-indigo-300',
      'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-300',
    ];

    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleCopySegment = async (segment: TranscriptSegment) => {
    try {
      await navigator.clipboard.writeText(
        `${segment.speaker} (${formatTime(segment.startTime)}):\n${segment.text}`
      );
      setCopiedId(segment.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const speakers = Array.from(new Set(segments.map((s) => s.speaker)));

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-sm border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Transcript</h2>

          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-sm text-slate-300 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-10">
                <button
                  onClick={() => {
                    exportAsText();
                    setShowExportMenu(false);
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 transition-colors"
                >
                  Export as TXT
                </button>
                <button
                  onClick={() => {
                    exportAsSRT();
                    setShowExportMenu(false);
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 transition-colors"
                >
                  Export as SRT
                </button>
                <button
                  onClick={() => {
                    exportAsVTT();
                    setShowExportMenu(false);
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 transition-colors"
                >
                  Export as VTT
                </button>
                <button
                  onClick={() => {
                    exportAsJSON();
                    setShowExportMenu(false);
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 transition-colors"
                >
                  Export as JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-10 pr-10 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Speaker Filter */}
        <select
          value={selectedSpeaker || ''}
          onChange={(e) => setSelectedSpeaker(e.target.value || null)}
          className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors"
        >
          <option value="" className="bg-slate-900">
            All Speakers ({speakers.length})
          </option>
          {speakers.map((speaker) => (
            <option key={speaker} value={speaker} className="bg-slate-900">
              {speaker} ({segments.filter((s) => s.speaker === speaker).length})
            </option>
          ))}
        </select>

        {/* Search Results Count */}
        {(searchQuery || selectedSpeaker) && (
          <div className="mt-2 text-sm text-slate-400">
            {filteredSegments.length} of {segments.length} segments
          </div>
        )}
      </div>

      {/* Transcript Segments */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {filteredSegments.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            {searchQuery || selectedSpeaker ? 'No results found' : 'No transcript available'}
          </div>
        ) : (
          filteredSegments.map((segment, index) => {
            const isActive = currentSegment?.id === segment.id;
            const originalIndex = segments.findIndex((s) => s.id === segment.id);

            return (
              <div
                key={segment.id}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSegmentClick(segment.id)}
                className={`
                  relative p-4 rounded-lg cursor-pointer transition-all duration-200 border
                  ${
                    isActive
                      ? 'bg-purple-500/10 border-purple-500/50 shadow-lg shadow-purple-500/10'
                      : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600'
                  }
                `}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-purple-600 rounded-l-lg" />
                )}

                {/* Speaker Badge and Time */}
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r border ${getSpeakerColor(
                      segment.speaker
                    )}`}
                  >
                    <User className="w-3 h-3" />
                    <span className="text-xs font-medium">{segment.speaker}</span>
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(segment.startTime)}</span>
                  </div>
                </div>

                {/* Transcript Text */}
                <p className="text-sm text-slate-200 leading-relaxed mb-2">
                  {highlightText(segment.text, searchQuery)}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  {segment.confidence !== undefined && (
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
                      <span className="text-xs text-slate-500">
                        {Math.round(segment.confidence * 100)}%
                      </span>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopySegment(segment);
                    }}
                    className="flex items-center space-x-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-purple-400 hover:bg-slate-700/50 transition-colors"
                  >
                    {copiedId === segment.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <div className="flex justify-between text-xs text-slate-500">
          <span>
            {segments.length} segment{segments.length !== 1 ? 's' : ''}
          </span>
          <span>
            {speakers.length} speaker{speakers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export { SyncedTranscript as default };
