'use client';

import { useState, useEffect } from 'react';
import { Globe, Clock, MapPin, Loader2, Check } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';

interface Timezone {
  value: string;
  label: string;
  offset: string;
  region: string;
  isDST?: boolean;
}

interface TimezoneSelectorProps {
  currentTimezone?: string;
  userId: string;
  onTimezoneChange?: (timezone: string) => void;
}

// Common timezones organized by region
const TIMEZONES: Timezone[] = [
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5', region: 'Americas' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6', region: 'Americas' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', offset: 'UTC-9', region: 'Americas' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto', offset: 'UTC-5', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: 'UTC-8', region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: 'UTC-6', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', offset: 'UTC-3', region: 'Americas' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: 'UTC-3', region: 'Americas' },

  // Europe & Africa
  { value: 'Europe/London', label: 'London (GMT)', offset: 'UTC+0', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens', offset: 'UTC+2', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3', region: 'Europe' },
  { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+2', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: 'UTC+1', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: 'UTC+2', region: 'Africa' },

  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: 'UTC+5:30', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: 'UTC+7', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+8', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 'UTC+8', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Beijing/Shanghai', offset: 'UTC+8', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'UTC+9', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+9', region: 'Asia' },

  // Pacific
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)', offset: 'UTC+11', region: 'Pacific' },
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: 'UTC+11', region: 'Pacific' },
  { value: 'Australia/Perth', label: 'Perth', offset: 'UTC+8', region: 'Pacific' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: 'UTC+13', region: 'Pacific' },
];

export function TimezoneSelector({
  currentTimezone,
  userId,
  onTimezoneChange
}: TimezoneSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone || 'America/New_York');
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    detectUserTimezone();
  }, []);

  const detectUserTimezone = () => {
    setIsDetecting(true);

    try {
      // Use Intl API to detect timezone
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(detectedTz);

      // Auto-select if it matches a known timezone
      const matchingTimezone = TIMEZONES.find(tz => tz.value === detectedTz);
      if (matchingTimezone && !currentTimezone) {
        setSelectedTimezone(detectedTz);
      }
    } catch (error) {
      console.error('Failed to detect timezone:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAutoDetect = () => {
    if (detectedTimezone) {
      setSelectedTimezone(detectedTimezone);
      handleSave(detectedTimezone);
    }
  };

  const handleSave = async (timezone?: string) => {
    const timezoneToSave = timezone || selectedTimezone;
    setIsSaving(true);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          preferences: {
            timezone: timezoneToSave,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save timezone');
      }

      setSaveSuccess(true);

      if (onTimezoneChange) {
        onTimezoneChange(timezoneToSave);
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving timezone:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTimezones = TIMEZONES.filter(tz => {
    const matchesSearch = searchQuery
      ? tz.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tz.value.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesRegion = selectedRegion === 'all' || tz.region === selectedRegion;

    return matchesSearch && matchesRegion;
  });

  const regions = ['all', ...Array.from(new Set(TIMEZONES.map(tz => tz.region)))];

  const getCurrentTime = (timezone: string) => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '--:--';
    }
  };

  const getTimezoneInfo = () => {
    return TIMEZONES.find(tz => tz.value === selectedTimezone);
  };

  const selectedTimezoneInfo = getTimezoneInfo();

  return (
    <CardGlass variant="default" className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-2">
          <Globe className="w-5 h-5 text-cyan-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-white">Timezone Settings</h3>
            <p className="text-sm text-slate-400 mt-1">
              Set your timezone for accurate meeting times and schedules
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Detect Section */}
      {detectedTimezone && detectedTimezone !== selectedTimezone && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-sm font-medium text-cyan-300">Detected Timezone</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {detectedTimezone} • {getCurrentTime(detectedTimezone)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={handleAutoDetect}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Use This'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Current Selection Display */}
      {selectedTimezoneInfo && (
        <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">
                  {selectedTimezoneInfo.label}
                </p>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                  {selectedTimezoneInfo.offset}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Current time: {getCurrentTime(selectedTimezone)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-cyan-500/30" />
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="Search timezones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
        />

        <div className="flex gap-2 flex-wrap">
          {regions.map(region => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                selectedRegion === region
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:border-white/10'
              }`}
            >
              {region === 'all' ? 'All Regions' : region}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone List */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar mb-6">
        {filteredTimezones.map(timezone => (
          <button
            key={timezone.value}
            onClick={() => setSelectedTimezone(timezone.value)}
            className={`w-full p-3 rounded-xl text-left transition-all ${
              selectedTimezone === timezone.value
                ? 'bg-cyan-500/20 border border-cyan-500/30'
                : 'bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  selectedTimezone === timezone.value ? 'text-cyan-300' : 'text-slate-200'
                }`}>
                  {timezone.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {timezone.value} • {getCurrentTime(timezone.value)}
                </p>
              </div>
              <Badge className={`text-xs ${
                selectedTimezone === timezone.value
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-white/10'
              }`}>
                {timezone.offset}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="gradient-primary"
          size="default"
          onClick={() => handleSave()}
          disabled={isSaving || selectedTimezone === currentTimezone}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            'Save Timezone'
          )}
        </Button>
      </div>
    </CardGlass>
  );
}