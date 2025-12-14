'use client';

import React, { useState } from 'react';
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import apiClient from '@/lib/api';

export interface Topic {
  id: string;
  keyword: string;
  name?: string;
  mentionCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercent: number;
  lastMentioned?: Date;
  isActive: boolean;
  alertEnabled: boolean;
  alertThreshold?: number;
}

interface TopicTableProps {
  topics: Topic[];
  onTopicSelect: (topic: Topic) => void;
  onTopicDelete: (id: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function TopicTable({
  topics,
  onTopicSelect,
  onTopicDelete,
  onRefresh,
  loading = false
}: TopicTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<'mentions' | 'trend' | 'recent'>('mentions');

  const getTrendIcon = (trend: string, percent: number) => {
    if (trend === 'increasing') {
      return (
        <div className="flex items-center gap-1 text-green-500">
          <TrendingUp size={16} />
          <span className="text-sm font-medium">+{percent}%</span>
        </div>
      );
    } else if (trend === 'decreasing') {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown size={16} />
          <span className="text-sm font-medium">{percent}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Minus size={16} />
        <span className="text-sm font-medium">0%</span>
      </div>
    );
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const filteredTopics = topics
    .filter(topic => {
      const matchesSearch = topic.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (topic.name && topic.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesActive = filterActive === null || topic.isActive === filterActive;
      return matchesSearch && matchesActive;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'mentions':
          return b.mentionCount - a.mentionCount;
        case 'trend':
          return Math.abs(b.trendPercent) - Math.abs(a.trendPercent);
        case 'recent':
          return (b.lastMentioned ? new Date(b.lastMentioned).getTime() : 0) -
                 (a.lastMentioned ? new Date(a.lastMentioned).getTime() : 0);
        default:
          return 0;
      }
    });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this topic tracker?')) {
      try {
        await apiClient.deleteTopic(id);
        onTopicDelete(id);
        onRefresh();
      } catch (error) {
        console.error('Error deleting topic:', error);
      }
    }
  };

  return (
    <div className="card-ff">
      {/* Header with Search and Filters */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-s text-white">Tracked Topics</h2>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-ff pl-10 w-64"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button className="button-secondary button-small flex items-center gap-2">
              <Filter size={16} />
              Filter
              <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg shadow-lg opacity-0 invisible hover:opacity-100 hover:visible transition-all">
              <button
                onClick={() => setFilterActive(null)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors"
              >
                All Topics
              </button>
              <button
                onClick={() => setFilterActive(true)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors"
              >
                Active Only
              </button>
              <button
                onClick={() => setFilterActive(false)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors"
              >
                Inactive Only
              </button>
              <hr className="my-2 border-[var(--ff-border)]" />
              <button
                onClick={() => setSortBy('mentions')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors"
              >
                Sort by Mentions
              </button>
              <button
                onClick={() => setSortBy('trend')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors"
              >
                Sort by Trend
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors"
              >
                Sort by Recent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ff-purple-500)]"></div>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchTerm || filterActive !== null
              ? 'No topics match your filters'
              : 'No topics tracked yet. Add your first topic to get started.'
            }
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--ff-border)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Topic</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Mentions</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Trend</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Last Mentioned</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Alerts</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map((topic) => (
                <tr
                  key={topic.id}
                  onClick={() => onTopicSelect(topic)}
                  className="border-b border-[var(--ff-border)] hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-white">{topic.keyword}</p>
                      {topic.name && (
                        <p className="text-sm text-gray-400 mt-1">{topic.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-white font-medium">{topic.mentionCount}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      {getTrendIcon(topic.trend, topic.trendPercent)}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-400">
                    {formatDate(topic.lastMentioned)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      topic.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {topic.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      topic.alertEnabled
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {topic.alertEnabled ? 'On' : 'Off'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={(e) => handleDelete(e, topic.id)}
                      className="ml-auto p-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}