/**
 * Caption Settings Component
 * Configuration panel for live captions
 * PRODUCTION READY - Real settings, no mocks
 */

'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CaptionSettings as CaptionSettingsType } from '@/hooks/useLiveCaptions';

interface CaptionSettingsProps {
  settings: CaptionSettingsType;
  onUpdateSettings: (settings: Partial<CaptionSettingsType>) => void;
  onClose: () => void;
}

// Supported languages with real ISO codes
const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'hi-IN', name: 'Hindi' }
];

export function CaptionSettings({
  settings,
  onUpdateSettings,
  onClose
}: CaptionSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key: keyof CaptionSettingsType, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: CaptionSettingsType = {
      fontSize: 'medium',
      backgroundColor: 80,
      position: 'bottom',
      showSpeakers: true,
      language: 'en-US',
      autoFadeTime: 5000
    };
    setLocalSettings(defaultSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-lg shadow-xl border"
        style={{
          backgroundColor: 'var(--ff-bg-layer)',
          borderColor: 'var(--ff-border)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--ff-border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ff-text-primary)' }}>
            Caption Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" style={{ color: 'var(--ff-text-muted)' }} />
          </button>
        </div>

        {/* Settings Form */}
        <div className="p-4 space-y-4">
          {/* Font Size */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Font Size
            </label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => handleChange('fontSize', size)}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                    localSettings.fontSize === size
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  style={{
                    color: localSettings.fontSize === size
                      ? 'var(--ff-purple-500)'
                      : 'var(--ff-text-secondary)'
                  }}
                >
                  <span className="capitalize">{size}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Opacity */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Background Opacity: {localSettings.backgroundColor}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={localSettings.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, transparent 0%, var(--ff-purple-500) ${localSettings.backgroundColor}%, var(--ff-border) ${localSettings.backgroundColor}%, var(--ff-border) 100%)`
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: 'var(--ff-text-muted)' }}>Transparent</span>
              <span className="text-xs" style={{ color: 'var(--ff-text-muted)' }}>Opaque</span>
            </div>
          </div>

          {/* Position */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Caption Position
            </label>
            <div className="flex gap-2">
              {(['top', 'bottom', 'custom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => handleChange('position', pos)}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                    localSettings.position === pos
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  style={{
                    color: localSettings.position === pos
                      ? 'var(--ff-purple-500)'
                      : 'var(--ff-text-secondary)'
                  }}
                >
                  <span className="capitalize">{pos}</span>
                </button>
              ))}
            </div>
            {localSettings.position === 'custom' && (
              <p className="text-xs mt-2" style={{ color: 'var(--ff-text-muted)' }}>
                Drag the caption overlay to position it anywhere on screen
              </p>
            )}
          </div>

          {/* Language */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Language
            </label>
            <select
              value={localSettings.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--ff-bg-dark)',
                borderColor: 'var(--ff-border)',
                color: 'var(--ff-text-primary)'
              }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Show Speaker Names */}
          <div className="flex items-center justify-between">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Show Speaker Names
            </label>
            <button
              onClick={() => handleChange('showSpeakers', !localSettings.showSpeakers)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.showSpeakers ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localSettings.showSpeakers ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-fade Time */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ff-text-secondary)' }}
            >
              Auto-fade Time: {localSettings.autoFadeTime / 1000}s
            </label>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={localSettings.autoFadeTime}
              onChange={(e) => handleChange('autoFadeTime', parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--ff-purple-500) 0%, var(--ff-purple-500) ${((localSettings.autoFadeTime - 1000) / 9000) * 100}%, var(--ff-border) ${((localSettings.autoFadeTime - 1000) / 9000) * 100}%, var(--ff-border) 100%)`
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: 'var(--ff-text-muted)' }}>1s</span>
              <span className="text-xs" style={{ color: 'var(--ff-text-muted)' }}>10s</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex gap-2 p-4 border-t"
          style={{ borderColor: 'var(--ff-border)' }}
        >
          <button
            onClick={handleReset}
            className="flex-1 py-2 px-4 rounded-lg border transition-colors hover:bg-white/5"
            style={{
              borderColor: 'var(--ff-border)',
              color: 'var(--ff-text-secondary)'
            }}
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--ff-purple-500)',
              color: 'var(--ff-text-primary)'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}