'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Calendar,
  User,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter
} from 'lucide-react';
import apiClient from '@/lib/api';

interface Mention {
  id: string;
  meetingId: string;
  meetingTitle: string;
  keyword: string;
  context: string;
  timestamp: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  speaker?: string;
  speakerRole?: string;
}

interface MentionListProps {
  topicId: string;
  topicName: string;
  onMeetingClick?: (meetingId: string) => void;
}

export default function MentionList({ topicId, topicName, onMeetingClick }: MentionListProps) {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'relevance'>('recent');

  useEffect(() => {
    fetchMentions();
  }, [topicId, page, filter, sortBy]);

  const fetchMentions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getTopicMentions(topicId, {
        page,
        limit: 20
      });

      if (page === 1) {
        setMentions(response.mentions);
      } else {
        setMentions(prev => [...prev, ...response.mentions]);
      }

      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error fetching mentions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="text-green-500" size={16} />;
      case 'negative':
        return <TrendingDown className="text-red-500" size={16} />;
      default:
        return <Minus className="text-gray-400" size={16} />;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500/20 text-green-400';
      case 'negative':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const highlightKeyword = (text: string, keyword: string) => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-[var(--ff-purple-500)]/30 text-white px-1 rounded"
        >
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredMentions = mentions.filter(mention => {
    if (filter === 'all') return true;
    return mention.sentiment === filter;
  });

  return (
    <div className="card-ff">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="heading-s text-white">Recent Mentions</h2>
          <p className="text-sm text-gray-400 mt-1">
            Found {mentions.length} mentions of "{topicName}"
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sentiment Filter */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            {['all', 'positive', 'neutral', 'negative'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded capitalize transition-colors ${
                  filter === f
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'relevance')}
            className="input-ff w-32"
          >
            <option value="recent">Recent</option>
            <option value="relevance">Relevance</option>
          </select>
        </div>
      </div>

      {/* Mentions List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ff-purple-500)]"></div>
          </div>
        ) : filteredMentions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {filter !== 'all'
              ? `No ${filter} mentions found`
              : 'No mentions found for this topic'
            }
          </div>
        ) : (
          <>
            {filteredMentions.map((mention) => (
              <div
                key={mention.id}
                className="p-4 bg-white/5 rounded-lg border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/50 transition-all cursor-pointer group"
                onClick={() => onMeetingClick?.(mention.meetingId)}
              >
                {/* Mention Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-white group-hover:text-[var(--ff-purple-500)] transition-colors">
                        {mention.meetingTitle}
                      </h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getSentimentBadge(mention.sentiment)}`}>
                        {getSentimentIcon(mention.sentiment)}
                        {mention.sentiment || 'neutral'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(mention.timestamp)}
                      </span>
                      {mention.speaker && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {mention.speaker}
                          {mention.speakerRole && (
                            <span className="text-xs">({mention.speakerRole})</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="text-gray-400 group-hover:text-[var(--ff-purple-500)] transition-colors" size={18} />
                </div>

                {/* Context */}
                <div className="relative">
                  <MessageSquare className="absolute left-0 top-1 text-gray-400" size={14} />
                  <blockquote className="pl-6 text-sm text-gray-300 italic">
                    "...{highlightKeyword(mention.context, mention.keyword)}..."
                  </blockquote>
                </div>

                {/* Meeting Metadata */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--ff-border)]">
                  <span className="text-xs text-gray-400">
                    Meeting ID: {mention.meetingId.slice(0, 8)}
                  </span>
                  <span className="text-xs text-gray-400">
                    Click to view full transcript
                  </span>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={loading}
                  className="button-secondary button-small"
                >
                  {loading ? 'Loading...' : 'Load More Mentions'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Stats */}
      {mentions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--ff-border)] grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {mentions.filter(m => m.sentiment === 'positive').length}
            </p>
            <p className="text-sm text-gray-400 mt-1">Positive</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {mentions.filter(m => m.sentiment === 'neutral' || !m.sentiment).length}
            </p>
            <p className="text-sm text-gray-400 mt-1">Neutral</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {mentions.filter(m => m.sentiment === 'negative').length}
            </p>
            <p className="text-sm text-gray-400 mt-1">Negative</p>
          </div>
        </div>
      )}
    </div>
  );
}