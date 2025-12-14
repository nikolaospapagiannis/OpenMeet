/**
 * Highlight Card Component
 * Individual highlight display with category badge and actions
 */

import React, { useState } from 'react';
import { LiveHighlight } from '../../hooks/useLiveHighlights';

interface HighlightCardProps {
  highlight: LiveHighlight;
  onJumpToTime?: (timestamp: number) => void;
  onShare?: (highlightId: string) => void;
  onCopyLink?: (highlightId: string, timestamp: number) => void;
  onDelete?: (highlightId: string) => void;
  showActions?: boolean;
}

// Category colors matching the design system
const CATEGORY_CONFIG = {
  action_item: {
    label: 'Action Item',
    color: '#f97316', // orange
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    textClass: 'text-orange-500',
  },
  decision: {
    label: 'Decision',
    color: '#22c55e', // green
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/20',
    textClass: 'text-green-500',
  },
  question: {
    label: 'Question',
    color: '#3b82f6', // blue
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    textClass: 'text-blue-500',
  },
  key_moment: {
    label: 'Key Moment',
    color: '#7a5af8', // purple
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20',
    textClass: 'text-purple-500',
  },
  manual: {
    label: 'Manual',
    color: '#94a3b8', // gray
    bgClass: 'bg-gray-500/10',
    borderClass: 'border-gray-500/20',
    textClass: 'text-gray-400',
  },
};

export const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  onJumpToTime,
  onShare,
  onCopyLink,
  onDelete,
  showActions = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const config = CATEGORY_CONFIG[highlight.type] || CATEGORY_CONFIG.manual;

  // Format timestamp to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink(highlight.id, highlight.timestampSeconds);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleJumpToTime = () => {
    if (onJumpToTime) {
      onJumpToTime(highlight.timestampSeconds);
    }
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg border transition-all duration-200
        ${config.bgClass} ${config.borderClass}
        hover:shadow-lg hover:shadow-purple-500/5
        ${isExpanded ? 'mb-4' : 'mb-2'}
      `}
      style={{ backgroundColor: 'rgba(10, 10, 26, 0.5)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Category Badge and Time */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${config.textClass}
              `}
              style={{
                backgroundColor: `${config.color}15`,
                border: `1px solid ${config.color}30`,
              }}
            >
              {config.label}
            </span>
            <button
              onClick={handleJumpToTime}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Jump to this moment"
            >
              {formatTime(highlight.timestampSeconds)}
            </button>
            {highlight.autoDetected && (
              <span className="text-xs text-gray-500" title="AI Detected">
                <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                AI
                {highlight.confidence && (
                  <span className="ml-1">({Math.round(highlight.confidence * 100)}%)</span>
                )}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-white mb-1">
            {highlight.title}
          </h4>

          {/* Description or Transcript Snippet */}
          {(highlight.description || highlight.transcriptSnippet) && (
            <div className={`${isExpanded ? '' : 'line-clamp-2'}`}>
              <p className="text-sm text-gray-400">
                {highlight.description || highlight.transcriptSnippet}
              </p>
            </div>
          )}

          {/* Show more/less button */}
          {(highlight.description || highlight.transcriptSnippet) &&
            (highlight.description?.length || highlight.transcriptSnippet?.length || 0) > 100 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-purple-400 hover:text-purple-300 mt-1"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}

          {/* Tags */}
          {highlight.tags && highlight.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {highlight.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-block px-2 py-0.5 text-xs rounded bg-gray-800 text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1">
            {/* Share Button */}
            {onShare && (
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-1.5 rounded hover:bg-white/5 transition-colors"
                  title="Share highlight"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-2.732-2.732m0 0a3 3 0 00-2.732 2.732M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-gray-900 border border-gray-800 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onShare(highlight.id);
                          setShowShareMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                      >
                        Share with team
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Copy Link Button */}
            {onCopyLink && (
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded hover:bg-white/5 transition-colors"
                title="Copy link to highlight"
              >
                {isCopied ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={() => onDelete(highlight.id)}
                className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                title="Delete highlight"
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      {highlight.sharedWith && highlight.sharedWith.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            Shared with {highlight.sharedWith.length} {highlight.sharedWith.length === 1 ? 'person' : 'people'}
          </span>
        </div>
      )}

      {/* Created time */}
      <div className="mt-2 text-xs text-gray-500">
        {formatDate(highlight.createdAt)}
      </div>
    </div>
  );
};

export default HighlightCard;