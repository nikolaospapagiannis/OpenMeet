/**
 * ParticipantFilter Component
 * Autocomplete search for filtering meetings by participants
 */

import { useState, useEffect, useRef } from 'react';
import { Users, X, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api';

interface Participant {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface ParticipantFilterProps {
  selectedParticipants?: string[];
  onChange: (participants: string[]) => void;
  onClear: () => void;
}

export function ParticipantFilter({
  selectedParticipants = [],
  onChange,
  onClear,
}: ParticipantFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Participant[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch participants based on search
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setParticipants([]);
        return;
      }

      setIsLoading(true);
      try {
        // Search for participants across all meetings
        const response = await apiClient.get('/meetings/participants/search', {
          params: { q: searchQuery, limit: 10 },
        });
        setParticipants(response.data || []);
      } catch (error) {
        console.error('Failed to fetch participants:', error);
        setParticipants([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchParticipants, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Load selected participants on mount
  useEffect(() => {
    const loadSelectedParticipants = async () => {
      if (!selectedParticipants || selectedParticipants.length === 0) {
        setSelectedItems([]);
        return;
      }

      try {
        // Fetch details for selected participant IDs
        const response = await apiClient.post('/meetings/participants/batch', {
          ids: selectedParticipants,
        });
        setSelectedItems(response.data || []);
      } catch (error) {
        console.error('Failed to load selected participants:', error);
      }
    };

    loadSelectedParticipants();
  }, [selectedParticipants.join(',')]);

  // Handle participant selection
  const handleSelectParticipant = (participant: Participant) => {
    const isSelected = selectedItems.some((p) => p.id === participant.id);

    let newSelection: Participant[];
    if (isSelected) {
      newSelection = selectedItems.filter((p) => p.id !== participant.id);
    } else {
      newSelection = [...selectedItems, participant];
    }

    setSelectedItems(newSelection);
    onChange(newSelection.map((p) => p.id));
    setSearchQuery('');
  };

  // Handle remove participant
  const handleRemoveParticipant = (participantId: string) => {
    const newSelection = selectedItems.filter((p) => p.id !== participantId);
    setSelectedItems(newSelection);
    onChange(newSelection.map((p) => p.id));
  };

  // Handle clear all
  const handleClearAll = () => {
    setSelectedItems([]);
    onClear();
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const hasActiveFilter = selectedItems.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className={`border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600 ${
            hasActiveFilter ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-slate-800/30'
          }`}
        >
          <Users className="h-4 w-4 mr-2" />
          {hasActiveFilter ? `${selectedItems.length} participant${selectedItems.length > 1 ? 's' : ''}` : 'All participants'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
        {hasActiveFilter && (
          <button
            onClick={handleClearAll}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Clear participant filter"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                />
              </div>
            </div>

            {/* Selected Participants */}
            {selectedItems.length > 0 && (
              <div className="p-3 border-b border-slate-700 max-h-32 overflow-y-auto">
                <div className="text-xs font-medium text-slate-400 mb-2">Selected ({selectedItems.length})</div>
                <div className="flex flex-wrap gap-2">
                  {selectedItems.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-2 px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-sm"
                    >
                      {participant.avatarUrl ? (
                        <img
                          src={participant.avatarUrl}
                          alt={participant.name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-purple-300">{participant.name}</span>
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="text-purple-400 hover:text-purple-200 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  Searching...
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  Type at least 2 characters to search
                </div>
              ) : participants.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No participants found
                </div>
              ) : (
                <div className="p-2">
                  {participants.map((participant) => {
                    const isSelected = selectedItems.some((p) => p.id === participant.id);
                    return (
                      <button
                        key={participant.id}
                        onClick={() => handleSelectParticipant(participant)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                          isSelected
                            ? 'bg-purple-600/20 text-purple-300'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        {participant.avatarUrl ? (
                          <img
                            src={participant.avatarUrl}
                            alt={participant.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm text-white">
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium">{participant.name}</div>
                          <div className="text-xs text-slate-400">{participant.email}</div>
                        </div>
                        {isSelected && (
                          <div className="text-purple-400">✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
