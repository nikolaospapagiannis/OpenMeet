'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  presets?: { label: string; value: DateRange }[];
  isLoading?: boolean;
  disabled?: boolean;
}

const defaultPresets = [
  {
    label: 'Today',
    value: {
      start: new Date(),
      end: new Date()
    }
  },
  {
    label: 'Last 7 days',
    value: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  },
  {
    label: 'Last 30 days',
    value: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  },
  {
    label: 'Last 90 days',
    value: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  },
  {
    label: 'This month',
    value: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date()
    }
  },
  {
    label: 'Last month',
    value: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
    }
  },
];

export function DateRangePicker({
  value = { start: null, end: null },
  onChange,
  placeholder = "Select date range",
  className,
  presets = defaultPresets,
  isLoading = false,
  disabled = false
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempRange, setTempRange] = useState<DateRange>(value);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDisplayValue = (): string => {
    if (isLoading) return 'Loading...';
    if (!value.start && !value.end) return placeholder;
    if (value.start && !value.end) return formatDate(value.start);
    if (value.start && value.end) {
      return `${formatDate(value.start)} - ${formatDate(value.end)}`;
    }
    return placeholder;
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding days from previous month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add padding days from next month
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const isSameDay = (d1: Date | null, d2: Date | null): boolean => {
    if (!d1 || !d2) return false;
    return d1.toDateString() === d2.toDateString();
  };

  const isInRange = (day: Date): boolean => {
    if (!tempRange.start || !tempRange.end) return false;
    return day >= tempRange.start && day <= tempRange.end;
  };

  const handleDayClick = (day: Date) => {
    if (selecting === 'start') {
      setTempRange({ start: day, end: null });
      setSelecting('end');
    } else {
      if (tempRange.start && day < tempRange.start) {
        setTempRange({ start: day, end: tempRange.start });
      } else {
        setTempRange({ ...tempRange, end: day });
      }
      setSelecting('start');
    }
  };

  const handleApply = () => {
    onChange(tempRange);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared = { start: null, end: null };
    setTempRange(cleared);
    onChange(cleared);
  };

  const handlePreset = (preset: { label: string; value: DateRange }) => {
    setTempRange(preset.value);
    onChange(preset.value);
    setIsOpen(false);
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl",
          "bg-slate-900/50 backdrop-blur-xl border border-white/10",
          "text-white transition-all duration-300",
          "hover:bg-slate-900/60 hover:border-white/20",
          "focus:outline-none focus:ring-2 focus:ring-teal-500/50",
          isOpen && "ring-2 ring-teal-500/50 border-teal-500/50",
          (disabled || isLoading) && "opacity-70 cursor-not-allowed"
        )}
        aria-expanded={isOpen}
        aria-label="Select date range"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
        ) : (
          <Calendar className="w-5 h-5 text-slate-400" />
        )}
        <span className={cn("text-sm", isLoading && "text-slate-400")}>
          {formatDisplayValue()}
        </span>
        {(value.start || value.end) && !isLoading && !disabled && (
          <Button
            variant="ghost-glass"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            aria-label="Clear date selection"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <>
          <CardGlass
            variant="elevated"
            className={cn(
              "absolute top-full left-0 mt-2 z-50",
              "animate-in fade-in slide-in-from-top-4 duration-300"
            )}
          >
            <div className="flex">
              {/* Presets */}
              <div className="w-40 p-3 border-r border-white/10 space-y-1">
                <div className="text-xs font-semibold text-slate-400 mb-2 px-2">
                  Quick Select
                </div>
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm",
                      "transition-all duration-200",
                      "hover:bg-white/5 text-slate-300 hover:text-white",
                      "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-inset"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Calendar */}
              <div className="p-4">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost-glass"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm font-semibold text-white">
                    {monthYear}
                  </div>
                  <Button
                    variant="ghost-glass"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Selection indicator */}
                <div className="mb-3 text-xs text-slate-400 text-center">
                  {selecting === 'start' ? 'Select start date' : 'Select end date'}
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
                  {days.map((day, idx) => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isStart = isSameDay(day, tempRange.start);
                    const isEnd = isSameDay(day, tempRange.end);
                    const inRange = isInRange(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayClick(day)}
                        disabled={!isCurrentMonth}
                        aria-label={`${day.toLocaleDateString()}${isStart ? ', selected as start date' : ''}${isEnd ? ', selected as end date' : ''}`}
                        aria-selected={isStart || isEnd}
                        className={cn(
                          "w-9 h-9 rounded-lg text-sm transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-teal-500/50",
                          !isCurrentMonth && "text-slate-700 cursor-not-allowed",
                          isCurrentMonth && "text-slate-300 hover:bg-white/5 hover:text-white",
                          (isStart || isEnd) && "bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-semibold shadow-lg",
                          inRange && !isStart && !isEnd && "bg-teal-500/20 text-teal-300",
                          isToday && !isStart && !isEnd && "border border-teal-500/50"
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="gradient-primary"
                    size="sm"
                    onClick={handleApply}
                    className="flex-1"
                    disabled={!tempRange.start && !tempRange.end}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </CardGlass>

          {/* Backdrop */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
