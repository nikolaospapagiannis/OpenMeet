'use client';

import { useState, useEffect } from 'react';
import { Languages, Globe2, Check, Loader2, Search } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
  beta?: boolean;
}

interface LanguageSelectorProps {
  currentLanguage?: string;
  userId: string;
  onLanguageChange?: (language: string) => void;
}

const LANGUAGES: Language[] = [
  // Major Languages
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'zh-tw', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', beta: true },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', beta: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', beta: true },
];

export function LanguageSelector({
  currentLanguage = 'en',
  userId,
  onLanguageChange
}: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBeta, setShowBeta] = useState(false);

  const filteredLanguages = LANGUAGES.filter(lang => {
    const matchesSearch = searchQuery
      ? lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesBeta = showBeta || !lang.beta;

    return matchesSearch && matchesBeta;
  });

  const getCurrentLanguage = () => {
    return LANGUAGES.find(lang => lang.code === selectedLanguage);
  };

  const handleSave = async () => {
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
            language: selectedLanguage,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save language');
      }

      setSaveSuccess(true);

      if (onLanguageChange) {
        onLanguageChange(selectedLanguage);
      }

      // In a real app, trigger i18n locale change here
      // i18n.changeLanguage(selectedLanguage);

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving language:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTranslationStatus = (langCode: string) => {
    // Simulated translation completion percentages
    const translationStatus: Record<string, number> = {
      'en': 100,
      'es': 95,
      'fr': 92,
      'de': 90,
      'it': 88,
      'pt': 85,
      'ru': 80,
      'zh': 75,
      'zh-tw': 73,
      'ja': 78,
      'ko': 76,
      'ar': 70,
      'hi': 65,
      'nl': 82,
      'pl': 79,
      'tr': 77,
      'sv': 81,
      'no': 80,
      'da': 79,
      'fi': 78,
      'he': 72,
      'th': 60,
      'vi': 58,
      'id': 55,
    };

    return translationStatus[langCode] || 50;
  };

  const currentLang = getCurrentLanguage();

  return (
    <CardGlass variant="default" className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-2">
          <Languages className="w-5 h-5 text-purple-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-white">Language & Region</h3>
            <p className="text-sm text-slate-400 mt-1">
              Choose your preferred language for the interface
            </p>
          </div>
        </div>
      </div>

      {/* Current Selection */}
      {currentLang && (
        <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentLang.flag}</span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {currentLang.name}
                </p>
                <p className="text-xs text-slate-500">{currentLang.nativeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentLang.beta && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                  Beta
                </Badge>
              )}
              {currentLang.rtl && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                  RTL
                </Badge>
              )}
              <div className="text-right">
                <p className="text-xs text-slate-400">Translation</p>
                <p className="text-xs font-semibold text-purple-300">
                  {getTranslationStatus(currentLang.code)}% Complete
                </p>
              </div>
            </div>
          </div>

          {/* Translation Progress Bar */}
          <div className="mt-3">
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                style={{ width: `${getTranslationStatus(currentLang.code)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search languages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
        />
      </div>

      {/* Show Beta Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-slate-300">Show beta languages</span>
        </div>
        <button
          onClick={() => setShowBeta(!showBeta)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showBeta ? 'bg-amber-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showBeta ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Language Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto custom-scrollbar mb-6">
        {filteredLanguages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setSelectedLanguage(lang.code)}
            className={`p-3 rounded-xl text-left transition-all ${
              selectedLanguage === lang.code
                ? 'bg-purple-500/20 border border-purple-500/30'
                : 'bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{lang.flag}</span>
                <div>
                  <p className={`text-sm font-medium ${
                    selectedLanguage === lang.code ? 'text-purple-300' : 'text-slate-200'
                  }`}>
                    {lang.name}
                  </p>
                  <p className="text-xs text-slate-500">{lang.nativeName}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {lang.beta && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                    Beta
                  </Badge>
                )}
                <span className="text-xs text-slate-500">
                  {getTranslationStatus(lang.code)}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Regional Settings Note */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-6">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> Changing the language will update all interface text. Date, time, and number formats will follow your selected region settings.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="gradient-primary"
          size="default"
          onClick={handleSave}
          disabled={isSaving || selectedLanguage === currentLanguage}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Applied
            </>
          ) : (
            'Apply Language'
          )}
        </Button>
      </div>
    </CardGlass>
  );
}