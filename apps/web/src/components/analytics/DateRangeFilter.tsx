'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { DatePreset, getDateRangeFromPreset } from '@/hooks/useAnalyticsData';

interface DateRangeFilterProps {
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
  onRangeChange: (preset: DatePreset, start: Date, end: Date) => void;
}

const presetOptions: Array<{ value: DatePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export function DateRangeFilter({ preset, startDate, endDate, onRangeChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(format(startDate, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endDate, 'yyyy-MM-dd'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetChange = (newPreset: DatePreset) => {
    if (newPreset === 'custom') {
      setShowCustomPicker(true);
      return;
    }

    const { start, end } = getDateRangeFromPreset(newPreset);
    onRangeChange(newPreset, start, end);
    setIsOpen(false);
    setShowCustomPicker(false);
  };

  const handleCustomApply = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    onRangeChange('custom', start, end);
    setIsOpen(false);
    setShowCustomPicker(false);
  };

  const getCurrentLabel = () => {
    if (preset === 'custom') {
      return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
    }
    return presetOptions.find(opt => opt.value === preset)?.label || 'Select Range';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#0a0a1a] border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors text-white"
      >
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium">{getCurrentLabel()}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-[#0f0f1f] border border-slate-700 rounded-lg shadow-xl z-50">
          {!showCustomPicker ? (
            <div className="p-1">
              {presetOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePresetChange(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    preset === option.value
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a1a] border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a1a] border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowCustomPicker(false);
                    setIsOpen(false);
                  }}
                  className="flex-1 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomApply}
                  className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}