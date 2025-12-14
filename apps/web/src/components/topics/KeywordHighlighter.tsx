'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Download, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface Keyword {
  id: string;
  text: string;
  color: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

interface HighlightMatch {
  start: number;
  end: number;
  keyword: Keyword;
  context?: string;
}

interface KeywordHighlighterProps {
  text: string;
  keywords: Keyword[];
  onKeywordClick?: (keyword: Keyword, matches: HighlightMatch[]) => void;
  showControls?: boolean;
  maxHeight?: number;
  contextWindow?: number;
}

export default function KeywordHighlighter({
  text,
  keywords: initialKeywords,
  onKeywordClick,
  showControls = true,
  maxHeight = 600,
  contextWindow = 30
}: KeywordHighlighterProps) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [activeKeywords, setActiveKeywords] = useState<Set<string>>(
    new Set(initialKeywords.map(k => k.id))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showStats, setShowStats] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Calculate all matches
  const { highlightedText, matches, stats } = useMemo(() => {
    const allMatches: HighlightMatch[] = [];
    const keywordStats = new Map<string, number>();

    // Find all matches
    keywords.forEach(keyword => {
      if (!activeKeywords.has(keyword.id)) return;

      let regex: RegExp;
      if (keyword.regex) {
        try {
          regex = new RegExp(keyword.text, keyword.caseSensitive ? 'g' : 'gi');
        } catch (e) {
          return;
        }
      } else {
        let pattern = keyword.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (keyword.wholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        regex = new RegExp(pattern, keyword.caseSensitive ? 'g' : 'gi');
      }

      const matchArray = Array.from(text.matchAll(regex));
      matchArray.forEach(match => {
        if (match.index !== undefined) {
          const contextStart = Math.max(0, match.index - contextWindow);
          const contextEnd = Math.min(text.length, match.index + match[0].length + contextWindow);
          const context = text.substring(contextStart, contextEnd);

          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            keyword,
            context
          });
        }
      });

      keywordStats.set(keyword.id, matchArray.length);
    });

    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);

    // Build highlighted text
    let highlightedHtml = '';
    let lastIndex = 0;

    allMatches.forEach((match, index) => {
      // Add text before match
      const beforeText = text.substring(lastIndex, match.start);
      highlightedHtml += escapeHtml(beforeText);

      // Add highlighted match
      const matchText = text.substring(match.start, match.end);
      const matchId = `match-${index}`;
      highlightedHtml += `<span
        id="${matchId}"
        class="highlighted-keyword cursor-pointer transition-all hover:brightness-110"
        style="background-color: ${match.keyword.color}40; color: ${match.keyword.color}; padding: 2px 4px; border-radius: 3px; border: 1px solid ${match.keyword.color}60;"
        data-keyword-id="${match.keyword.id}"
        data-match-index="${index}"
      >${escapeHtml(matchText)}</span>`;

      lastIndex = match.end;
    });

    // Add remaining text
    highlightedHtml += escapeHtml(text.substring(lastIndex));

    return {
      highlightedText: highlightedHtml,
      matches: allMatches,
      stats: keywordStats
    };
  }, [text, keywords, activeKeywords, contextWindow]);

  // Search functionality
  const searchMatches = useMemo(() => {
    if (!searchTerm) return [];

    const regex = new RegExp(searchTerm, 'gi');
    const searchResults: HighlightMatch[] = [];
    const matchArray = Array.from(text.matchAll(regex));

    matchArray.forEach(match => {
      if (match.index !== undefined) {
        searchResults.push({
          start: match.index,
          end: match.index + match[0].length,
          keyword: { id: 'search', text: searchTerm, color: '#FFD700' }
        });
      }
    });

    return searchResults;
  }, [text, searchTerm]);

  const totalMatches = searchTerm ? searchMatches : matches;

  // Navigation functions
  const scrollToMatch = (index: number) => {
    const matchId = `match-${index}`;
    const element = document.getElementById(matchId);
    if (element && contentRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight current match
      element.style.transform = 'scale(1.2)';
      element.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.boxShadow = 'none';
      }, 500);
    }
  };

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (totalMatches.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % totalMatches.length;
    } else {
      newIndex = currentMatchIndex === 0 ? totalMatches.length - 1 : currentMatchIndex - 1;
    }

    setCurrentMatchIndex(newIndex);
    scrollToMatch(newIndex);
  };

  // Toggle keyword visibility
  const toggleKeyword = (keywordId: string) => {
    setActiveKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keywordId)) {
        newSet.delete(keywordId);
      } else {
        newSet.add(keywordId);
      }
      return newSet;
    });
  };

  // Export matches
  const exportMatches = () => {
    const exportData = {
      text: text.substring(0, 1000) + '...',
      keywords: keywords.map(k => ({
        text: k.text,
        matches: stats.get(k.id) || 0
      })),
      matches: matches.map(m => ({
        keyword: m.keyword.text,
        position: m.start,
        context: m.context
      })),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyword-matches-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle keyword clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('highlighted-keyword')) {
        const keywordId = target.getAttribute('data-keyword-id');
        const keyword = keywords.find(k => k.id === keywordId);
        if (keyword && onKeywordClick) {
          const keywordMatches = matches.filter(m => m.keyword.id === keywordId);
          onKeywordClick(keyword, keywordMatches);
        }
      }
    };

    if (contentRef.current) {
      contentRef.current.addEventListener('click', handleClick);
      return () => {
        contentRef.current?.removeEventListener('click', handleClick);
      };
    }
  }, [keywords, matches, onKeywordClick]);

  return (
    <div className="keyword-highlighter">
      {showControls && (
        <div className="mb-4 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentMatchIndex(0);
                }}
                className="input-field w-full pl-10 pr-24"
                placeholder="Search in transcript..."
              />
              {searchTerm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {currentMatchIndex + 1} / {searchMatches.length}
                  </span>
                  <button
                    onClick={() => navigateMatch('prev')}
                    className="text-gray-400 hover:text-white"
                    disabled={searchMatches.length === 0}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => navigateMatch('next')}
                    className="text-gray-400 hover:text-white"
                    disabled={searchMatches.length === 0}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className="button-secondary"
            >
              {showStats ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={exportMatches}
              className="button-secondary"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Keyword Controls */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {keywords.map(keyword => {
                const count = stats.get(keyword.id) || 0;
                const isActive = activeKeywords.has(keyword.id);

                return (
                  <button
                    key={keyword.id}
                    onClick={() => toggleKeyword(keyword.id)}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                      isActive ? 'bg-white/10' : 'bg-white/5 opacity-50'
                    } hover:bg-white/15`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: keyword.color }}
                      />
                      <span className="text-sm text-white truncate">
                        {keyword.text}
                      </span>
                    </div>
                    <span className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Statistics Summary */}
          {showStats && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Total Keywords: {keywords.length}</span>
              <span>Active: {activeKeywords.size}</span>
              <span>Total Matches: {matches.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Highlighted Content */}
      <div
        ref={contentRef}
        className="highlighted-content p-4 bg-white/5 rounded-lg overflow-auto"
        style={{ maxHeight: `${maxHeight}px` }}
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />

      {/* Match Context Panel */}
      {matches.length > 0 && showStats && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg">
          <h3 className="font-medium text-white mb-3">Match Contexts</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {matches.slice(0, 10).map((match, index) => (
              <div
                key={index}
                className="p-2 bg-white/5 rounded text-sm cursor-pointer hover:bg-white/10"
                onClick={() => {
                  setCurrentMatchIndex(index);
                  scrollToMatch(index);
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: match.keyword.color }}
                  />
                  <span className="text-gray-400">
                    {match.keyword.text} at position {match.start}
                  </span>
                </div>
                <div className="text-gray-300 text-xs truncate">
                  ...{match.context}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}