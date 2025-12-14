'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid, List, Search, Filter, Calendar, Clock, Play,
  Share2, Download, Trash2, Edit2, Star, StarOff,
  ChevronDown, X, MoreVertical, Tag
} from 'lucide-react';
import { ClipPreview } from './ClipPreview';
import { ClipShareModal } from './ClipShareModal';

interface VideoClip {
  id: string;
  title: string;
  description?: string;
  meetingId: string;
  meetingTitle: string;
  videoUrl: string;
  thumbnailUrl?: string;
  startTime: number;
  endTime: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  tags: string[];
  views: number;
  shares: number;
  transcript?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    speaker?: string;
  }>;
}

interface ClipLibraryProps {
  userId: string;
  authToken: string;
  onClipSelect?: (clip: VideoClip) => void;
  className?: string;
}

export const ClipLibrary: React.FC<ClipLibraryProps> = ({
  userId,
  authToken,
  onClipSelect,
  className = ''
}) => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [filteredClips, setFilteredClips] = useState<VideoClip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'duration' | 'views'>('recent');
  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareClip, setShareClip] = useState<VideoClip | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingClip, setEditingClip] = useState<VideoClip | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Fetch clips from API
  const fetchClips = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clips?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clips');
      }

      const data = await response.json();
      setClips(data.clips || []);

      // Extract unique tags
      const tags = new Set<string>();
      data.clips?.forEach((clip: VideoClip) => {
        clip.tags?.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));

    } catch (err) {
      console.error('Error fetching clips:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, authToken]);

  // Initial fetch
  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  // Filter and sort clips
  useEffect(() => {
    let filtered = [...clips];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(clip =>
        clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(clip =>
        selectedTags.every(tag => clip.tags.includes(tag))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'duration':
          return b.duration - a.duration;
        case 'views':
          return b.views - a.views;
        default:
          return 0;
      }
    });

    setFilteredClips(filtered);
  }, [clips, searchQuery, selectedTags, sortBy]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Toggle favorite
  const toggleFavorite = async (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    try {
      const response = await fetch(`/api/clips/${clipId}/favorite`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isFavorite: !clip.isFavorite })
      });

      if (response.ok) {
        setClips(clips.map(c =>
          c.id === clipId ? { ...c, isFavorite: !c.isFavorite } : c
        ));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Delete clip
  const deleteClip = async (clipId: string) => {
    if (!confirm('Are you sure you want to delete this clip?')) return;

    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        setClips(clips.filter(c => c.id !== clipId));
        if (selectedClip?.id === clipId) {
          setSelectedClip(null);
        }
      }
    } catch (err) {
      console.error('Error deleting clip:', err);
    }
  };

  // Download clip
  const downloadClip = async (clip: VideoClip) => {
    try {
      const response = await fetch(`/api/clips/${clip.id}/download`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clip.title}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading clip:', err);
    }
  };

  // Update clip metadata
  const updateClip = async (clipId: string, updates: Partial<VideoClip>) => {
    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedClip = await response.json();
        setClips(clips.map(c =>
          c.id === clipId ? { ...c, ...updatedClip } : c
        ));
        setEditingClip(null);
      }
    } catch (err) {
      console.error('Error updating clip:', err);
    }
  };

  // Render clip card for grid view
  const renderClipCard = (clip: VideoClip) => (
    <div
      key={clip.id}
      className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg overflow-hidden hover:border-[var(--ff-purple-500)] transition-all group"
    >
      {/* Thumbnail with overlay controls */}
      <div className="relative aspect-video bg-gray-900">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={clip.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-600" />
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded">
          {formatDuration(clip.duration)}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setSelectedClip(clip);
              onClipSelect?.(clip);
            }}
            className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
          >
            <Play className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => {
              setShareClip(clip);
              setShowShareModal(true);
            }}
            className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => downloadClip(clip)}
            className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Favorite button */}
        <button
          onClick={() => toggleFavorite(clip.id)}
          className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-lg hover:bg-opacity-75 transition-all"
        >
          {clip.isFavorite ? (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          ) : (
            <StarOff className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-medium truncate">{clip.title}</h3>
        {clip.description && (
          <p className="text-sm text-[var(--ff-text-muted)] mt-1 line-clamp-2">
            {clip.description}
          </p>
        )}

        {/* Tags */}
        {clip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {clip.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-800 text-xs text-[var(--ff-text-secondary)] rounded"
              >
                {tag}
              </span>
            ))}
            {clip.tags.length > 3 && (
              <span className="text-xs text-[var(--ff-text-muted)]">
                +{clip.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between mt-3 text-xs text-[var(--ff-text-muted)]">
          <span>{formatDate(clip.createdAt)}</span>
          <div className="flex items-center gap-3">
            <span>{clip.views} views</span>
            <button
              onClick={() => setEditingClip(clip)}
              className="hover:text-white transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => deleteClip(clip.id)}
              className="hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render clip row for list view
  const renderClipRow = (clip: VideoClip) => (
    <div
      key={clip.id}
      className="flex items-center gap-4 p-4 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg hover:border-[var(--ff-purple-500)] transition-all"
    >
      {/* Thumbnail */}
      <div className="w-32 h-20 flex-shrink-0 bg-gray-900 rounded overflow-hidden relative">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={clip.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-600" />
          </div>
        )}
        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black bg-opacity-75 text-white text-xs rounded">
          {formatDuration(clip.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-medium truncate flex items-center gap-2">
              {clip.title}
              {clip.isFavorite && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              )}
            </h3>
            <p className="text-sm text-[var(--ff-text-secondary)] mt-1">
              {clip.meetingTitle}
            </p>
            {clip.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {clip.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-800 text-xs text-[var(--ff-text-secondary)] rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--ff-text-muted)]">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(clip.createdAt)}
          </span>
          <span>{clip.views} views</span>
          <span>{clip.shares} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setSelectedClip(clip);
            onClipSelect?.(clip);
          }}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-white"
        >
          <Play className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setShareClip(clip);
            setShowShareModal(true);
          }}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-white"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => downloadClip(clip)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-white"
        >
          <Download className="w-4 h-4" />
        </button>
        <div className="relative group">
          <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-white">
            <MoreVertical className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <button
              onClick={() => toggleFavorite(clip.id)}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
            >
              {clip.isFavorite ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
              {clip.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            </button>
            <button
              onClick={() => setEditingClip(clip)}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => deleteClip(clip.id)}
              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--ff-purple-500)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`bg-[var(--ff-bg-dark)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">My Clips</h2>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--ff-text-muted)]" />
            <input
              type="text"
              placeholder="Search clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)] w-64"
            />
          </div>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-[var(--ff-purple-500)] text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--ff-purple-500)]"
          >
            <option value="recent">Most Recent</option>
            <option value="duration">Duration</option>
            <option value="views">Most Viewed</option>
          </select>

          {/* View mode */}
          <div className="flex bg-gray-800 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-l-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[var(--ff-purple-500)] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-r-lg transition-colors ${
                viewMode === 'list' ? 'bg-[var(--ff-purple-500)] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">Filter by tags:</span>
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-[var(--ff-purple-500)] hover:text-[var(--ff-purple-400)]"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'bg-gray-800 text-[var(--ff-text-secondary)] hover:bg-gray-700'
                }`}
              >
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {filteredClips.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--ff-text-muted)]">
            {searchQuery || selectedTags.length > 0
              ? 'No clips found matching your filters'
              : 'No clips yet. Create your first clip!'}
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredClips.map(renderClipCard)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClips.map(renderClipRow)}
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {selectedClip && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl max-w-4xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">{selectedClip.title}</h3>
              <button
                onClick={() => setSelectedClip(null)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-[var(--ff-text-muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <ClipPreview
                videoUrl={selectedClip.videoUrl}
                startTime={selectedClip.startTime}
                endTime={selectedClip.endTime}
                title={selectedClip.title}
                transcript={selectedClip.transcript}
                onShare={() => {
                  setShareClip(selectedClip);
                  setShowShareModal(true);
                }}
                onDownload={() => downloadClip(selectedClip)}
                className="aspect-video"
              />
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && shareClip && (
        <ClipShareModal
          clipId={shareClip.id}
          clipTitle={shareClip.title}
          clipUrl={`${window.location.origin}/clips/${shareClip.id}`}
          duration={shareClip.duration}
          thumbnailUrl={shareClip.thumbnailUrl}
          onClose={() => {
            setShowShareModal(false);
            setShareClip(null);
          }}
          authToken={authToken}
        />
      )}

      {/* Edit modal */}
      {editingClip && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-white mb-4">Edit Clip</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editingClip.title}
                  onChange={(e) => setEditingClip({ ...editingClip, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--ff-purple-500)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  value={editingClip.description || ''}
                  onChange={(e) => setEditingClip({ ...editingClip, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--ff-purple-500)]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingClip(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateClip(editingClip.id, {
                    title: editingClip.title,
                    description: editingClip.description
                  })}
                  className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};