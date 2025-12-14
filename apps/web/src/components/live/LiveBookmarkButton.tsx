/**
 * Live Bookmark Button
 * Quick bookmark creation with keyboard shortcut (B) and recent bookmarks panel
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  Check,
  X,
  Edit3,
  Tag,
  AlertCircle,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { LiveBookmark } from '@/hooks/useLiveTranscription';

interface LiveBookmarkButtonProps {
  bookmarks: LiveBookmark[];
  onCreateBookmark: (title: string, description?: string, type?: LiveBookmark['type'], tags?: string[]) => Promise<LiveBookmark | null>;
  className?: string;
}

const BOOKMARK_TYPES = [
  { value: 'manual', label: 'Manual', icon: Bookmark, color: 'blue' },
  { value: 'action_item', label: 'Action Item', icon: CheckCircle, color: 'green' },
  { value: 'decision', label: 'Decision', icon: AlertCircle, color: 'purple' },
  { value: 'question', label: 'Question', icon: HelpCircle, color: 'orange' },
  { value: 'key_moment', label: 'Key Moment', icon: Lightbulb, color: 'yellow' }
] as const;

export default function LiveBookmarkButton({
  bookmarks,
  onCreateBookmark,
  className = ''
}: LiveBookmarkButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showRecentBookmarks, setShowRecentBookmarks] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<LiveBookmark['type']>('manual');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [editingBookmark, setEditingBookmark] = useState<LiveBookmark | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle keyboard shortcut (B)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if B is pressed (not in input fields)
      if (e.key === 'b' || e.key === 'B') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (showDialog && !editingBookmark) {
      setTitle('');
      setDescription('');
      setSelectedType('manual');
      setTags([]);
      setCurrentTag('');
      setError(null);
    }
  }, [showDialog, editingBookmark]);

  // Handle bookmark creation
  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await onCreateBookmark(
        title.trim(),
        description.trim() || undefined,
        selectedType,
        tags.length > 0 ? tags : undefined
      );

      if (result) {
        setShowDialog(false);
        setTitle('');
        setDescription('');
        setTags([]);
        setCurrentTag('');
      } else {
        setError('Failed to create bookmark. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while creating the bookmark.');
      console.error('Bookmark creation error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle tag addition
  const handleAddTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      if (!tags.includes(currentTag.trim())) {
        setTags([...tags, currentTag.trim()]);
      }
      setCurrentTag('');
    }
  }, [currentTag, tags]);

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Get recent bookmarks (last 5)
  const recentBookmarks = bookmarks.slice(-5).reverse();

  // Get type config
  const getTypeConfig = (type: LiveBookmark['type']) => {
    return BOOKMARK_TYPES.find(t => t.value === type) || BOOKMARK_TYPES[0];
  };

  // Format timestamp
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Bookmark Button */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                   bg-yellow-500 hover:bg-yellow-600 text-white
                   shadow-md hover:shadow-lg transition-all duration-200
                   focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
          title="Create bookmark (Press B)"
        >
          <BookmarkPlus className="w-4 h-4" />
          <span>Bookmark</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono bg-yellow-600 rounded">
            B
          </kbd>
        </button>

        {/* Recent Bookmarks Toggle */}
        {bookmarks.length > 0 && (
          <button
            onClick={() => setShowRecentBookmarks(!showRecentBookmarks)}
            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                     text-gray-700 dark:text-gray-300 transition-all duration-200"
            title="View recent bookmarks"
          >
            <Bookmark className="w-4 h-4" />
            <span className="ml-1 text-xs font-semibold">{bookmarks.length}</span>
          </button>
        )}
      </div>

      {/* Recent Bookmarks Panel */}
      {showRecentBookmarks && recentBookmarks.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Recent Bookmarks</h4>
              <button
                onClick={() => setShowRecentBookmarks(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-2 space-y-2">
            {recentBookmarks.map((bookmark) => {
              const typeConfig = getTypeConfig(bookmark.type);
              const Icon = typeConfig.icon;

              return (
                <div
                  key={bookmark.id}
                  className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/20`}>
                      <Icon className={`w-4 h-4 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {bookmark.title}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatTime(bookmark.timestampSeconds)}
                        </span>
                      </div>
                      {bookmark.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {bookmark.description}
                        </p>
                      )}
                      {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {bookmark.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Bookmark Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Create Bookmark
              </h3>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Bookmark Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BOOKMARK_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.value;

                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-200
                        ${isSelected
                          ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? `text-${type.color}-600 dark:text-${type.color}-400` : 'text-gray-400'}`} />
                      <span className={`text-xs font-medium ${isSelected ? `text-${type.color}-700 dark:text-${type.color}-300` : 'text-gray-600 dark:text-gray-400'}`}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title Input */}
            <div className="mb-4">
              <label htmlFor="bookmark-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                id="bookmark-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter bookmark title..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
              />
            </div>

            {/* Description Input */}
            <div className="mb-4">
              <label htmlFor="bookmark-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note (optional)
              </label>
              <textarea
                id="bookmark-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500 resize-none"
              />
            </div>

            {/* Tags Input */}
            <div className="mb-6">
              <label htmlFor="bookmark-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                id="bookmark-tags"
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type and press Enter to add tags..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDialog(false)}
                disabled={isCreating}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-sm
                         bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                         text-gray-900 dark:text-gray-100 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !title.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                         bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Bookmark
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
