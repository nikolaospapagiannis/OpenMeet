/**
 * SavedFilters Component
 * Save and quickly apply filter presets
 */

import { useState } from 'react';
import { Star, Trash2, Plus, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SavedFilter } from '@/hooks/useMeetingFilters';

interface SavedFiltersProps {
  savedFilters: SavedFilter[];
  onApply: (filterId: string) => void;
  onDelete: (filterId: string) => void;
  onSave: (name: string) => void;
  hasActiveFilters: boolean;
}

export function SavedFilters({
  savedFilters,
  onApply,
  onDelete,
  onSave,
  hasActiveFilters,
}: SavedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterName, setFilterName] = useState('');

  const handleSave = () => {
    if (filterName.trim()) {
      onSave(filterName.trim());
      setFilterName('');
      setIsSaving(false);
    }
  };

  const handleApply = (filterId: string) => {
    onApply(filterId);
    setIsOpen(false);
  };

  const handleDelete = (filterId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this saved filter?')) {
      onDelete(filterId);
    }
  };

  const formatFilterSummary = (filter: SavedFilter) => {
    const parts: string[] = [];
    const { filters } = filter;

    if (filters.status) parts.push(filters.status);
    if (filters.platform) parts.push(filters.platform);
    if (filters.dateFrom && filters.dateTo) parts.push('Date range');
    if (filters.participants && filters.participants.length > 0) {
      parts.push(`${filters.participants.length} participant${filters.participants.length > 1 ? 's' : ''}`);
    }
    if (filters.duration) parts.push(filters.duration);
    if (filters.hasTranscript) parts.push('Has transcript');
    if (filters.hasRecording) parts.push('Has recording');

    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600"
      >
        <Star className="h-4 w-4 mr-2" />
        Saved Filters
        {savedFilters.length > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded-full text-xs">
            {savedFilters.length}
          </span>
        )}
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsSaving(false);
            }}
          />
          <div className="absolute left-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Save Current Filters */}
            {hasActiveFilters && (
              <div className="p-3 border-b border-slate-700 bg-slate-800/50">
                {isSaving ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-400">Save current filters</label>
                      <button
                        onClick={() => setIsSaving(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter filter name..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') setIsSaving(false);
                      }}
                      autoFocus
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                    />
                    <Button
                      onClick={handleSave}
                      disabled={!filterName.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      size="sm"
                    >
                      Save Filter
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSaving(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-purple-400 hover:bg-purple-600/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Save current filters
                  </button>
                )}
              </div>
            )}

            {/* Saved Filters List */}
            <div className="max-h-96 overflow-y-auto">
              {savedFilters.length === 0 ? (
                <div className="p-8 text-center">
                  <Star className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm mb-1">No saved filters yet</p>
                  <p className="text-slate-500 text-xs">
                    Apply filters and save them for quick access
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className="group mb-2 p-3 border border-slate-700 rounded-lg hover:border-purple-500/50 hover:bg-slate-800/50 transition-all cursor-pointer"
                      onClick={() => handleApply(filter.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <h4 className="font-medium text-white">{filter.name}</h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatFilterSummary(filter)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(filter.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                          title="Delete filter"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500">
                        Saved on {formatDate(filter.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
