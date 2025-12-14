'use client';

import { useState } from 'react';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string, filters: string[]) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = "Search meetings, transcripts...",
  className,
  autoFocus = false,
  isLoading = false
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const filterOptions = [
    'This Week',
    'Last Month',
    'This Year',
    'Zoom Only',
    'Teams Only',
    'Google Meet',
    'Transcribed',
    'Not Transcribed',
    'Analyzed',
    'Pending'
  ];

  const handleSearch = () => {
    onSearch(query, activeFilters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setQuery('');
      setShowFilters(false);
    }
  };

  const toggleFilter = (filter: string) => {
    if (activeFilters.includes(filter)) {
      const newFilters = activeFilters.filter(f => f !== filter);
      setActiveFilters(newFilters);
      onSearch(query, newFilters);
    } else {
      const newFilters = [...activeFilters, filter];
      setActiveFilters(newFilters);
      onSearch(query, newFilters);
    }
  };

  const clearAll = () => {
    setQuery('');
    setActiveFilters([]);
    onSearch('', []);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none z-10 animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={isLoading}
          className={cn(
            "w-full pl-12 pr-24 py-4 rounded-xl",
            "bg-slate-900/50 backdrop-blur-xl border border-white/10",
            "text-white placeholder:text-slate-500",
            "focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50",
            "outline-none transition-all duration-300",
            "hover:bg-slate-900/60 hover:border-white/20",
            isLoading && "opacity-70 cursor-wait"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {activeFilters.length > 0 && (
            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 px-2 py-0.5">
              {activeFilters.length}
            </Badge>
          )}
          <Button
            variant="ghost-glass"
            size="icon"
            className={cn(
              "h-8 w-8 transition-colors",
              showFilters && "bg-teal-500/20 text-teal-400"
            )}
            onClick={() => setShowFilters(!showFilters)}
            type="button"
            disabled={isLoading}
          >
            <Filter className="w-4 h-4" />
          </Button>
          {(query || activeFilters.length > 0) && (
            <Button
              variant="ghost-glass"
              size="icon"
              className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
              onClick={clearAll}
              type="button"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading indicator bar */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
          <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 animate-pulse" />
        </div>
      )}

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {activeFilters.map((filter) => (
            <Badge
              key={filter}
              className={cn(
                "bg-teal-500/20 text-teal-300 border-teal-500/30",
                "cursor-pointer hover:bg-teal-500/30 transition-all",
                "flex items-center gap-1.5 pr-1.5"
              )}
              onClick={() => toggleFilter(filter)}
            >
              {filter}
              <X className="w-3 h-3 hover:scale-110 transition-transform" />
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Dropdown */}
      {showFilters && (
        <CardGlass
          variant="elevated"
          className={cn(
            "absolute top-full mt-2 left-0 right-0 z-50 p-4",
            "animate-in fade-in slide-in-from-top-2 duration-300"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">Filters</h4>
            {activeFilters.length > 0 && (
              <button
                onClick={() => {
                  setActiveFilters([]);
                  onSearch(query, []);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => {
              const isActive = activeFilters.includes(filter);
              return (
                <Badge
                  key={filter}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    isActive
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/30 scale-105"
                      : "bg-slate-500/20 text-slate-300 border-slate-500/30 hover:bg-slate-500/30 hover:text-white"
                  )}
                  onClick={() => toggleFilter(filter)}
                >
                  {filter}
                </Badge>
              );
            })}
          </div>
        </CardGlass>
      )}
    </div>
  );
}
