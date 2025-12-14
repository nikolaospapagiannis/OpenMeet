/**
 * DateRangeFilter Component
 * Date range filtering with presets and custom calendar picker
 */

import { useState, useEffect } from 'react';
import { Calendar, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateRangeFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onChange: (dateFrom?: string, dateTo?: string) => void;
  onClear: () => void;
}

type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'last90' | 'custom';

interface PresetOption {
  value: DatePreset;
  label: string;
  getDates: () => { from: Date; to: Date };
}

const DATE_PRESETS: PresetOption[] = [
  {
    value: 'today',
    label: 'Today',
    getDates: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      };
    },
  },
  {
    value: 'yesterday',
    label: 'Yesterday',
    getDates: () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0),
        to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59),
      };
    },
  },
  {
    value: 'last7',
    label: 'Last 7 days',
    getDates: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return {
        from: new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      };
    },
  },
  {
    value: 'last30',
    label: 'Last 30 days',
    getDates: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return {
        from: new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      };
    },
  },
  {
    value: 'last90',
    label: 'Last 90 days',
    getDates: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      return {
        from: new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      };
    },
  },
  {
    value: 'custom',
    label: 'Custom range',
    getDates: () => ({ from: new Date(), to: new Date() }),
  },
];

export function DateRangeFilter({ dateFrom, dateTo, onChange, onClear }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Initialize custom dates if they exist
  useEffect(() => {
    if (dateFrom) {
      setCustomFrom(dateFrom.split('T')[0]);
    }
    if (dateTo) {
      setCustomTo(dateTo.split('T')[0]);
    }
  }, [dateFrom, dateTo]);

  // Handle preset selection
  const handlePresetSelect = (preset: PresetOption) => {
    setSelectedPreset(preset.value);

    if (preset.value === 'custom') {
      // Don't auto-apply for custom, wait for user to pick dates
      return;
    }

    const { from, to } = preset.getDates();
    onChange(from.toISOString(), to.toISOString());
    setIsOpen(false);
  };

  // Handle custom date application
  const handleApplyCustom = () => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999); // End of day

      onChange(from.toISOString(), to.toISOString());
      setIsOpen(false);
    }
  };

  // Handle clear
  const handleClear = () => {
    setSelectedPreset(null);
    setCustomFrom('');
    setCustomTo('');
    onClear();
  };

  // Get display text
  const getDisplayText = () => {
    if (!dateFrom || !dateTo) return 'All dates';

    // Check if it matches a preset
    for (const preset of DATE_PRESETS) {
      if (preset.value === 'custom') continue;
      const { from, to } = preset.getDates();
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      // Compare dates (ignoring time component)
      if (
        fromDate.toDateString() === from.toDateString() &&
        toDate.toDateString() === to.toDateString()
      ) {
        return preset.label;
      }
    }

    // Custom range
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return `${formatDate(from)} - ${formatDate(to)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasActiveFilter = dateFrom || dateTo;

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
          <Calendar className="h-4 w-4 mr-2" />
          {getDisplayText()}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Clear date filter"
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
          <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Presets */}
            <div className="p-2 border-b border-slate-700">
              <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">Quick Select</div>
              {DATE_PRESETS.slice(0, -1).map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedPreset === preset.value
                      ? 'bg-purple-600/20 text-purple-300'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            <div className="p-4">
              <div className="text-xs font-medium text-slate-400 mb-3">Custom Range</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    max={customTo || undefined}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    min={customFrom || undefined}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                  />
                </div>
                <Button
                  onClick={handleApplyCustom}
                  disabled={!customFrom || !customTo}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
