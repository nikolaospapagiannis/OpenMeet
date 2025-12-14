'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Command, Clock, X, SlidersHorizontal } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { SearchResults } from './SearchResults';
import { SearchFilters, FilterState } from './SearchFilters';
import { cn } from '@/lib/utils';

export function GlobalSearchModal() {
  const {
    isOpen,
    query,
    results,
    isSearching,
    recentSearches,
    closeSearch,
    setQuery,
    navigateToResult,
    searchWithFilters,
    useRecentSearch,
    clearRecentSearches,
  } = useGlobalSearch();

  const [showFilters, setShowFilters] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setActiveResultIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showFilters) {
          setShowFilters(false);
        } else {
          closeSearch();
        }
        return;
      }

      // Navigate results with Arrow keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveResultIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveResultIndex((prev) => Math.max(prev - 1, 0));
      }

      // Select result with Enter
      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selectedResult = results[activeResultIndex];
        if (selectedResult) {
          navigateToResult(selectedResult);
        }
      }

      // Toggle filters with Cmd/Ctrl + F
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowFilters((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, activeResultIndex, navigateToResult, closeSearch, showFilters]);

  // Reset active index when results change
  useEffect(() => {
    setActiveResultIndex(0);
  }, [results]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4 pt-[10vh]"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl animate-in zoom-in-95 slide-in-from-top-4 duration-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        {/* Search Input */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="relative">
            {/* Search Icon / Loading Spinner */}
            {isSearching ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 animate-spin" />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            )}

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search meetings, transcripts, participants..."
              className={cn(
                'w-full pl-12 pr-32 py-3 rounded-lg',
                'bg-slate-800/50 border border-slate-700',
                'text-white placeholder:text-slate-500',
                'focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
                'outline-none transition-all'
              )}
            />

            {/* Right Actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'px-3 py-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5',
                  showFilters
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700 hover:text-white'
                )}
                title="Toggle filters (Cmd+F)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
              </button>

              {/* Keyboard Shortcut Hint */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">
                <Command className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-500">K</span>
              </div>
            </div>
          </div>

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent Searches</span>
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => useRecentSearch(recentQuery)}
                    className="px-3 py-1.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all"
                  >
                    {recentQuery}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-slate-800/30 border-b border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
            <SearchFilters
              onFilterChange={(filters: FilterState) => searchWithFilters(filters)}
            />
          </div>
        )}

        {/* Results */}
        <div className="max-h-[60vh] overflow-hidden">
          {query ? (
            <SearchResults
              results={results}
              activeIndex={activeResultIndex}
              onResultClick={navigateToResult}
              className="p-4"
            />
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-white font-medium mb-2">Search everything</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Find meetings, transcript moments, participants, and topics across your entire
                workspace
              </p>
            </div>
          )}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  ↵
                </kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  Esc
                </kbd>
                <span>Close</span>
              </div>
            </div>
            <div className="text-slate-600">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
