/**
 * Live Highlights Panel Component
 * Real-time highlights management during active meetings
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveHighlights, LiveHighlight } from '../../hooks/useLiveHighlights';
import HighlightCard from './HighlightCard';
import CreateHighlightForm from './CreateHighlightForm';

interface LiveHighlightsPanelProps {
  meetingId: string;
  currentTime?: number;
  onJumpToTime?: (timestamp: number) => void;
  className?: string;
}

export const LiveHighlightsPanel: React.FC<LiveHighlightsPanelProps> = ({
  meetingId,
  currentTime = 0,
  onJumpToTime,
  className = '',
}) => {
  const {
    highlights,
    isLoading,
    error,
    isConnected,
    autoDetectionEnabled,
    createHighlight,
    shareHighlight,
    deleteHighlight,
    toggleAutoDetection,
    copyHighlightLink,
    exportHighlights,
    refetch,
  } = useLiveHighlights({ meetingId, autoDetection: true });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'recent'>('time');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Filter and sort highlights
  const filteredHighlights = highlights
    .filter(h => {
      // Category filter
      if (filterCategory !== 'all' && h.type !== filterCategory) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          h.title?.toLowerCase().includes(query) ||
          h.description?.toLowerCase().includes(query) ||
          h.transcriptSnippet?.toLowerCase().includes(query) ||
          h.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'time') {
        return a.timestampSeconds - b.timestampSeconds;
      } else {
        const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
        const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
        return dateB.getTime() - dateA.getTime();
      }
    });

  // Handle share highlight
  const handleShareHighlight = async (highlightId: string) => {
    try {
      // In a real app, this would open a user selector modal
      // For now, we'll just show a notification
      await shareHighlight(highlightId, ['team']);
      console.log('Highlight shared with team');
    } catch (err) {
      console.error('Failed to share highlight:', err);
    }
  };

  // Handle export
  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
    try {
      await exportHighlights(format);
      setShowExportMenu(false);
    } catch (err) {
      console.error('Failed to export highlights:', err);
    }
  };

  // Scroll to latest highlight
  useEffect(() => {
    if (highlights.length > 0 && panelRef.current) {
      const lastHighlight = panelRef.current.querySelector('.highlight-card:last-child');
      if (lastHighlight) {
        lastHighlight.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [highlights.length]);

  return (
    <div
      className={`flex flex-col h-full bg-[var(--ff-bg-layer)] rounded-lg border border-[var(--ff-border)] ${className}`}
      style={{ backgroundColor: '#0a0a1a' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--ff-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Live Highlights</h2>
            <span className="text-xs text-gray-500">
              ({highlights.length})
            </span>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
            {!isConnected && !isLoading && (
              <span className="flex items-center gap-1 text-xs text-yellow-500">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Offline
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                title="Export highlights"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-32 rounded-md shadow-lg bg-gray-900 border border-gray-800 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('json')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                    >
                      Export as JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => handleExport('markdown')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                    >
                      Export as Markdown
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={refetch}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
              title="Refresh highlights"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Auto-Detection Toggle */}
        <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded-md">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            <span className="text-sm text-gray-300">Auto-Detection</span>
          </div>
          <button
            onClick={() => toggleAutoDetection(!autoDetectionEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoDetectionEnabled ? 'bg-purple-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoDetectionEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Create Form */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--ff-border)]">
        {showCreateForm ? (
          <CreateHighlightForm
            onCreateHighlight={createHighlight}
            currentTime={currentTime}
            isCompact={false}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Mark Highlight (Ctrl+H)
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--ff-border)] space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search highlights..."
            className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Filter & Sort */}
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Categories</option>
            <option value="action_item">Action Items</option>
            <option value="decision">Decisions</option>
            <option value="question">Questions</option>
            <option value="key_moment">Key Moments</option>
            <option value="manual">Manual Notes</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'recent')}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="time">By Time</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>
      </div>

      {/* Highlights List */}
      <div
        ref={panelRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-purple-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-400">Loading highlights...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 text-xs text-purple-400 hover:text-purple-300"
              >
                Try again
              </button>
            </div>
          </div>
        ) : filteredHighlights.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-sm text-gray-400">
                {searchQuery || filterCategory !== 'all'
                  ? 'No highlights match your filters'
                  : 'No highlights yet'}
              </p>
              {!searchQuery && filterCategory === 'all' && (
                <p className="text-xs text-gray-500 mt-1">
                  Press Ctrl+H to create your first highlight
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-2">
              {filteredHighlights.length} highlight{filteredHighlights.length !== 1 ? 's' : ''}
            </div>
            {filteredHighlights.map((highlight) => (
              <div key={highlight.id} className="highlight-card">
                <HighlightCard
                  highlight={highlight}
                  onJumpToTime={onJumpToTime}
                  onShare={handleShareHighlight}
                  onCopyLink={copyHighlightLink}
                  onDelete={deleteHighlight}
                  showActions={true}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Inline Quick Create (Always visible at bottom) */}
      {!showCreateForm && (
        <div className="flex-shrink-0 border-t border-[var(--ff-border)]">
          <CreateHighlightForm
            onCreateHighlight={createHighlight}
            currentTime={currentTime}
            isCompact={true}
          />
        </div>
      )}
    </div>
  );
};

export default LiveHighlightsPanel;